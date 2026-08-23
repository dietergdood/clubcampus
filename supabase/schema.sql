


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_eltern_rolle"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.benutzer_id IS NOT NULL AND OLD.benutzer_id IS DISTINCT FROM NEW.benutzer_id THEN
    UPDATE public.benutzer
    SET rollen = array_append(rollen, 'eltern')
    WHERE id = NEW.benutzer_id
      AND NOT ('eltern' = ANY(COALESCE(rollen, '{}')));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_eltern_rolle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_bekannt"("p_email" "text", "p_verein_id" "uuid") RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    /* ⚠ NUR `bekannt`. Kein Name, keine `person_id`, keine `mitglied_id`.
       Die Funktion ist fuer `anon` freigegeben; alles, was sie zurueckgibt,
       gibt sie an jeden zurueck, der den oeffentlichen Schluessel hat — und
       der steht im JavaScript-Buendel jeder Seite. */
    select json_build_object(
      'bekannt',
      exists (
        select 1 from public.personen
         where verein_id = p_verein_id
           and lower(btrim(email)) = lower(btrim(p_email))
      )
    );
  $$;


ALTER FUNCTION "public"."check_email_bekannt"("p_email" "text", "p_verein_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_mitglied_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT mitglied_id FROM benutzer WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_mitglied_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_person_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select person_id from public.benutzer where id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."get_my_person_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM benutzer WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_verein_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT verein_id FROM benutzer WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_verein_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_person_id   uuid;
  v_verein_id   uuid;
  v_mitglied_id bigint;
  v_mitgliedtyp text;
  v_rolle       text;
  v_name        text;
  v_hat_kind    boolean;
BEGIN
  SELECT id, verein_id INTO v_person_id, v_verein_id
    FROM public.personen
   WHERE lower(btrim(email)) = lower(btrim(NEW.email))
   LIMIT 1;

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION
      'Diese E-Mail ist dem Verein nicht bekannt. Bitte wende dich an die Administration.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT m.id, m.mitgliedtyp INTO v_mitglied_id, v_mitgliedtyp
    FROM public.mitglieder m
   WHERE m.person_id = v_person_id AND m.aktiv
   LIMIT 1;

  SELECT exists(SELECT 1 FROM public.eltern_kinder ek WHERE ek.person_id = v_person_id)
    INTO v_hat_kind;

  IF v_mitglied_id IS NOT NULL THEN
    SELECT mt.standard_rolle INTO v_rolle
      FROM public.mitgliedtypen mt
     WHERE mt.verein_id = v_verein_id AND mt.name = v_mitgliedtyp
     LIMIT 1;
  END IF;

  v_rolle := coalesce(v_rolle, CASE WHEN v_hat_kind THEN 'eltern' ELSE 'supporter' END);

  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    (SELECT p.vorname || ' ' || p.nachname FROM public.personen p WHERE p.id = v_person_id),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.benutzer (id, email, name, role, aktiv, verein_id, person_id, mitglied_id)
  VALUES (NEW.id, NEW.email, v_name, v_rolle, true, v_verein_id, v_person_id, v_mitglied_id)
  ON CONFLICT (id) DO UPDATE SET
    person_id   = COALESCE(EXCLUDED.person_id,   benutzer.person_id),
    mitglied_id = COALESCE(EXCLUDED.mitglied_id, benutzer.mitglied_id);

  IF v_mitglied_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.mitglieder_aktivitaeten
        (mitglied_id, verein_id, typ, beschreibung, geaendert_von)
      VALUES
        (v_mitglied_id, v_verein_id, 'portal_aktiviert', 'Portal-Zugang aktiviert', v_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_login"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.benutzer
  SET last_sign_in_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hat_modul_recht"("p_modul" "text", "p_min_stufe" "text" DEFAULT 'lesen'::"text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with rang as (
    select case p_min_stufe when 'verwalten' then 3 when 'schreiben' then 2 else 1 end as noetig
  ),
  meine as (
    select coalesce(
             nullif(f.stufe_override ->> p_modul, ''),
             nullif(g.modul_stufen  ->> p_modul, ''),
             'lesen'
           ) as stufe
      from public.benutzer_funktionen bf
      join public.portal_funktionen f
        on f.id = bf.funktion_id and coalesce(f.aktiv, true)
      join public.portal_gruppen g
        on g.id = f.gruppe_id and coalesce(g.aktiv, true)
     where bf.benutzer_id = auth.uid()
       and f.verein_id = public.get_my_verein_id()
       /* module_override der Funktion schlägt die Modulliste der Gruppe —
          leeres Array heisst „keine Einschränkung", nicht „nichts". */
       and p_modul = any(
             case when coalesce(array_length(f.module_override, 1), 0) > 0
                  then f.module_override
                  else coalesce(g.module, '{}')
             end)
  )
  select coalesce(bool_or(
           case m.stufe when 'verwalten' then 3 when 'schreiben' then 2 else 1 end
           >= (select noetig from rang)
         ), false)
    from meine m;
$$;


ALTER FUNCTION "public"."hat_modul_recht"("p_modul" "text", "p_min_stufe" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."hat_modul_recht"("p_modul" "text", "p_min_stufe" "text") IS 'Hat der angemeldete Benutzer über seine Gruppen mindestens die verlangte Stufe im Modul? Gegenstueck zu getEffektiveStufeForFunktionaer() im Frontend. Ab Stufe 2 in den RLS-Policies verwendet.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(ist_admin OR role = 'administration', false)
  FROM benutzer WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_above"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    (select ist_admin or role = 'administration' from benutzer where id = auth.uid()),
    false
  )
$$;


ALTER FUNCTION "public"."is_admin_or_above"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_trainer_or_above"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    (select role in ('administrator','administration','funktionär','trainer')
     from benutzer where id = auth.uid()),
    false
  )
$$;


ALTER FUNCTION "public"."is_trainer_or_above"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mitglied_ist_mein_kind"("p_mitglied_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    select exists (
      select 1
      from public.eltern_kinder ek
      where ek.mitglied_id = p_mitglied_id
        and ek.person_id   = public.get_my_person_id()
    );
  $$;


ALTER FUNCTION "public"."mitglied_ist_mein_kind"("p_mitglied_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mitglied_ist_mein_kind"("p_mitglied_id" bigint) IS 'Ist diese Mitgliedschaft die eines Kindes des angemeldeten Elternteils? Gegenstueck zu person_ist_mein_kind, nur ueber die Mitgliedschaft statt ueber die Person. Braucht SECURITY DEFINER, weil ein Elternteil eltern_kinder und mitglieder sonst nicht lesen darf — die Funktion soll die Frage beantworten, nicht selbst an ihr scheitern.';



CREATE OR REPLACE FUNCTION "public"."pe_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."pe_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."person_ist_mein_kind"("p_person_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.eltern_kinder ek
    join public.mitglieder    m on m.id = ek.mitglied_id
    where m.person_id  = p_person_id
      and ek.person_id = public.get_my_person_id()
  );
$$;


ALTER FUNCTION "public"."person_ist_mein_kind"("p_person_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_etappe6_altspalten_mitglieder" (
    "id" bigint,
    "person_id" "uuid",
    "vorname" "text",
    "nachname" "text",
    "email" "text",
    "telefon" "text",
    "strasse" "text",
    "plz" "text",
    "ort" "text",
    "kanton" "text",
    "land" "text",
    "geburtsdatum" "date",
    "geschlecht" "text",
    "nationalitaet" "text",
    "nationalitaet2" "text",
    "heimatort" "text",
    "ahv_nr" "text",
    "foto_url" "text",
    "funktionen" "text"[],
    "profil_geprueft_at" timestamp with time zone,
    "gesichert_am" timestamp with time zone
);


ALTER TABLE "public"."_etappe6_altspalten_mitglieder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_etappe6b_position_mitglieder" (
    "id" bigint,
    "person_id" "uuid",
    "position" "text",
    "rueckennr" "text",
    "gesichert_am" timestamp with time zone
);


ALTER TABLE "public"."_etappe6b_position_mitglieder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_etappe6c_altspalten_mitglieder" (
    "id" bigint,
    "person_id" "uuid",
    "hat_portal_zugang" boolean,
    "eltern" "jsonb",
    "datenstatus" "text",
    "notizen" "text",
    "fairgate_sync_at" timestamp with time zone,
    "gesichert_am" timestamp with time zone
);


ALTER TABLE "public"."_etappe6c_altspalten_mitglieder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_supporter_rueckbau_aenderungen" (
    "id" "uuid",
    "mitglied_id" bigint,
    "verein_id" "uuid",
    "feld" "text",
    "alter_wert" "text",
    "neuer_wert" "text",
    "geaendert_von" "text",
    "geaendert_at" timestamp with time zone
);


ALTER TABLE "public"."_supporter_rueckbau_aenderungen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_supporter_rueckbau_aktivitaeten" (
    "id" "uuid",
    "mitglied_id" bigint,
    "verein_id" "uuid",
    "typ" "text",
    "beschreibung" "text",
    "feld" "text",
    "wert" "text",
    "geaendert_von" "text",
    "geaendert_at" timestamp with time zone
);


ALTER TABLE "public"."_supporter_rueckbau_aktivitaeten" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_supporter_rueckbau_mitglieder" (
    "id" bigint,
    "mitgliedtyp" "text",
    "rolle" "text",
    "aktiv" boolean,
    "spielerpass" "text",
    "js_nr" "text",
    "fairgate_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "deaktiviert_am" timestamp with time zone,
    "deaktiviert_von" "text",
    "verein_id" "uuid",
    "eintrittsdatum" "date",
    "person_id" "uuid",
    "vorname" "text",
    "nachname" "text",
    "email" "text"
);


ALTER TABLE "public"."_supporter_rueckbau_mitglieder" OWNER TO "postgres";


COMMENT ON TABLE "public"."_supporter_rueckbau_mitglieder" IS 'Sicherheitskopie des Supporter-Rueckbaus vom 20.08.2026. Die Personen selbst stehen unveraendert in personen; hier liegt nur, was an der geloeschten Mitgliedschaft hing. Kann geloescht werden, sobald der Rueckbau eine Saison ueberstanden hat.';



CREATE TABLE IF NOT EXISTS "public"."_supporter_rueckbau_notizen" (
    "id" integer,
    "mitglied_id" bigint,
    "text" "text",
    "autor_id" "uuid",
    "autor_name" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "verein_id" "uuid"
);


ALTER TABLE "public"."_supporter_rueckbau_notizen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abstimmung_antworten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "abstimmung_id" "uuid" NOT NULL,
    "mitglied_id" "uuid",
    "eingetragen_von" "uuid",
    "antwort" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."abstimmung_antworten" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abstimmungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "frage" "text" NOT NULL,
    "optionen" "jsonb" NOT NULL,
    "teams" "text"[] DEFAULT '{}'::"text"[],
    "rollen" "text"[] DEFAULT '{}'::"text"[],
    "active" boolean DEFAULT true,
    "ablauf_datum" "date",
    "erstellt_von" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."abstimmungen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anwesenheiten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "eingetragen_von" "uuid",
    "event_type" "text" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "mitglied_id" bigint
);


ALTER TABLE "public"."anwesenheiten" OWNER TO "postgres";


COMMENT ON COLUMN "public"."anwesenheiten"."mitglied_id" IS 'Wer anwesend war — die Mitgliedschaft. Training und Spiel setzen einen Kadereintrag voraus, und der haengt am Mitglied. Die fruehere Spalte benutzer_id ist am 20.08.2026 entfallen: sie hiess „hat ein Portal-Konto", und wer keines hat, kann trotzdem anwesend sein.';



CREATE TABLE IF NOT EXISTS "public"."api_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verbindung_id" "uuid" NOT NULL,
    "gestartet_am" timestamp with time zone DEFAULT "now"(),
    "beendet_am" timestamp with time zone,
    "status" "text",
    "datensaetze_neu" integer DEFAULT 0,
    "datensaetze_aktualisiert" integer DEFAULT 0,
    "datensaetze_fehler" integer DEFAULT 0,
    "meldung" "text",
    "details" "jsonb",
    "gestartet_von" "uuid",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."api_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_verbindungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "icon" "text",
    "active" boolean DEFAULT false,
    "konfiguriert" boolean DEFAULT false,
    "api_url" "text",
    "letzter_sync" timestamp with time zone,
    "sync_status" "text",
    "sync_meldung" "text",
    "auto_sync" boolean DEFAULT false,
    "sync_intervall" "text",
    "sync_uhrzeit" time without time zone,
    "sync_felder" "jsonb" DEFAULT '{}'::"jsonb",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "sync_laeuft_seit" timestamp with time zone,
    "wache_zuletzt" timestamp with time zone,
    "zuordnung_gemeldet_am" timestamp with time zone
);


ALTER TABLE "public"."api_verbindungen" OWNER TO "postgres";


COMMENT ON COLUMN "public"."api_verbindungen"."key" IS 'Name des Anschlusses (fairgate, football_ch, fvrz, clubdesk, sfa), kein Geheimnis. Eindeutig pro Verein, nicht global — Geheimnisse liegen in den Secrets der Edge Function.';



COMMENT ON COLUMN "public"."api_verbindungen"."sync_laeuft_seit" IS 'Zeitpunkt, zu dem der laufende Sync die Sperre beansprucht hat. NULL = kein Lauf. Aeltere Eintraege als 15 Minuten gelten als abgestuerzt und werden ueberschrieben.';



COMMENT ON COLUMN "public"."api_verbindungen"."wache_zuletzt" IS 'Wann der Sync-Waechter (cron: sync-waechter-stuendlich) zuletzt geprueft hat. Gelesen von ApiTab.';



COMMENT ON COLUMN "public"."api_verbindungen"."zuordnung_gemeldet_am" IS 'Marke fuer die Meldung neuer unzugeordneter Spieler. Neu = fruehestes spiel_aufstellung.erstmals_gesehen liegt nach dieser Marke. Beim Anlegen auf now() gesetzt: der damalige Rueckstand bleibt dauerhaft stumm. Gelesen von sfv-sync (meldeNeueUnzugeordnete).';



CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "benutzer_id" "uuid",
    "aktion" "text" NOT NULL,
    "tabelle" "text",
    "datensatz_id" "uuid",
    "vorher" "jsonb",
    "nachher" "jsonb",
    "ip_adresse" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aufgebote" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "spiel_id" "uuid" NOT NULL,
    "mitglied_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'nominiert'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."aufgebote" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."benachrichtigungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "benutzer_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "gelesen" boolean DEFAULT false,
    "referenz_typ" "text",
    "referenz_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."benachrichtigungen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."benutzer" (
    "id" "uuid" NOT NULL,
    "mitglied_id" bigint,
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" DEFAULT 'spieler'::"text" NOT NULL,
    "teams" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "teams_kontext" "jsonb" DEFAULT '[]'::"jsonb",
    "rollen" "text"[] DEFAULT '{}'::"text"[],
    "aktiv" boolean DEFAULT true,
    "verein_id" "uuid" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "person_id" "uuid",
    "ist_admin" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."benutzer" OWNER TO "postgres";


COMMENT ON COLUMN "public"."benutzer"."ist_admin" IS 'Systemzugang (Portalverwaltung, Rechte, Vereinsdaten). Wird NIE von ableitUndSaveRolle() ueberschrieben — anders als role, das ein berechneter Wert ist.';



CREATE TABLE IF NOT EXISTS "public"."benutzer_funktionen" (
    "benutzer_id" "uuid" NOT NULL,
    "funktion_id" bigint NOT NULL,
    "seit" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "bis" "date"
);


ALTER TABLE "public"."benutzer_funktionen" OWNER TO "postgres";


COMMENT ON COLUMN "public"."benutzer_funktionen"."bis" IS 'Tag, an dem das Amt endet. NULL heisst laufend. Statuten Artikel 8 spricht vom Zeitpunkt des Austritts, nicht von einem Zeitraum — deshalb date. Ein Amt wird beendet, indem hier ein Datum steht, nicht durch Loeschen der Zeile: sonst waere es danach nicht mehr nachweisbar.';



CREATE TABLE IF NOT EXISTS "public"."benutzer_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "benutzer_id" "uuid" NOT NULL,
    "team_id" bigint NOT NULL,
    "funktion" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."benutzer_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bus_anmeldungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bus_id" "uuid" NOT NULL,
    "mitglied_id" "uuid",
    "eingetragen_von" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."bus_anmeldungen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."busse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "spiel_id" "uuid",
    "termin_id" "uuid",
    "title" "text",
    "abfahrt_zeit" time without time zone,
    "abfahrt_ort" "text",
    "plaetze" integer DEFAULT 20,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."busse" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dokumente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text",
    "datei_url" "text" NOT NULL,
    "teams" "text"[] DEFAULT '{}'::"text"[],
    "rollen" "text"[] DEFAULT '{}'::"text"[],
    "publiziert" boolean DEFAULT false,
    "autor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."dokumente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eltern_kinder" (
    "id" bigint NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "eltern_id" "uuid",
    "mitglied_id" bigint NOT NULL,
    "hauptkontakt" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "person_id" "uuid" NOT NULL,
    "beziehung" "text"
);


ALTER TABLE "public"."eltern_kinder" OWNER TO "postgres";


COMMENT ON COLUMN "public"."eltern_kinder"."eltern_id" IS 'Altlast: zeigt auf elternkontakte. Seit Etappe 3 (05.08.2026) nullable und nicht mehr massgeblich — die Verknuepfung laeuft ueber person_id. Entfaellt mit elternkontakte in Etappe 6.';



COMMENT ON COLUMN "public"."eltern_kinder"."beziehung" IS 'Mutter/Vater/Vormund … — Eigenschaft der Verknuepfung, nicht der Person.';



ALTER TABLE "public"."eltern_kinder" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."eltern_kinder_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."elternkontakte" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mitglied_id" bigint NOT NULL,
    "benutzer_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text",
    "tel" "text",
    "beziehung" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "vorname" "text",
    "nachname" "text",
    "telefon" "text",
    "hauptkontakt" boolean DEFAULT false,
    "verein_id" "uuid" NOT NULL,
    "supporter" boolean DEFAULT false,
    "profil_geprueft_at" timestamp with time zone
);


ALTER TABLE "public"."elternkontakte" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feldsichtbarkeit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feld_key" "text" NOT NULL,
    "feld_label" "text" NOT NULL,
    "role" "text" NOT NULL,
    "sichtbar" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "sort_order" integer DEFAULT 0,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."feldsichtbarkeit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."helper_einsaetze" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "name" "text" NOT NULL,
    "date" "date",
    "zeit" "text",
    "location" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."helper_einsaetze" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."helper_einsatz_pflicht" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "saison" "text" NOT NULL,
    "min_einsaetze" integer DEFAULT 1 NOT NULL,
    "gilt_fuer" "text" NOT NULL,
    "gilt_fuer_wert" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."helper_einsatz_pflicht" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."helper_einsatz_pflicht_mitglied" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "saison" "text" NOT NULL,
    "min_einsaetze" integer NOT NULL,
    "notes" "text",
    "gesetzt_von" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "mitglied_id" bigint NOT NULL
);


ALTER TABLE "public"."helper_einsatz_pflicht_mitglied" OWNER TO "postgres";


COMMENT ON COLUMN "public"."helper_einsatz_pflicht_mitglied"."mitglied_id" IS 'Wer Einsaetze SCHULDET — die Mitgliedschaft, nicht die Person. Ein Supporter schuldet dem Verein nichts; wer mithelfen DARF, steht in helper_zuteilungen.person_id.';



CREATE TABLE IF NOT EXISTS "public"."helper_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "date" "date" NOT NULL,
    "location" "text",
    "color" "text" DEFAULT '#64748B'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."helper_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."helper_schichten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "einsatz_id" "uuid",
    "label" "text" NOT NULL,
    "max_helfer" integer DEFAULT 2,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."helper_schichten" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."helper_zuteilungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schicht_id" "uuid",
    "eingetragen_von" "uuid",
    "als_stellvertreter" boolean DEFAULT false,
    "status" "text" DEFAULT 'eingetragen'::"text",
    "freigabe_angefragt" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "person_id" "uuid"
);


ALTER TABLE "public"."helper_zuteilungen" OWNER TO "postgres";


COMMENT ON COLUMN "public"."helper_zuteilungen"."person_id" IS 'Wer die Schicht uebernimmt — eine PERSON, keine Mitgliedschaft. Eltern und Supporter helfen mit, ohne Mitglied zu sein. Die Pflicht zu Einsaetzen haengt dagegen an der Mitgliedschaft (helper_einsatz_pflicht_mitglied).';



CREATE TABLE IF NOT EXISTS "public"."kader" (
    "id" bigint NOT NULL,
    "team_id" bigint,
    "mitglied_id" bigint,
    "rueckennr" "text",
    "position" "text",
    "aktiv" boolean DEFAULT true,
    "saison" "text" DEFAULT '2025/26'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rollen" "text"[],
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."kader" OWNER TO "postgres";


ALTER TABLE "public"."kader" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."kader_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."kader_rollen" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "ist_trainer" boolean DEFAULT false NOT NULL,
    "aktiv" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 50 NOT NULL,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."kader_rollen" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."kader_rollen_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."kader_rollen_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."kader_rollen_id_seq" OWNED BY "public"."kader_rollen"."id";



CREATE TABLE IF NOT EXISTS "public"."kommunikationsgruppen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "role" "text",
    "funktion" "text",
    "team_ebene" integer,
    "active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    CONSTRAINT "kommunikationsgruppen_type_check" CHECK (("type" = ANY (ARRAY['role'::"text", 'function'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."kommunikationsgruppen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kommunikationsgruppen_mitglieder" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gruppe_id" "uuid" NOT NULL,
    "benutzer_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."kommunikationsgruppen_mitglieder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "anzahl" integer DEFAULT 0,
    "zustand" "text" DEFAULT 'gut'::"text",
    "team" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."material" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_ausleihen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "mitglied_id" "uuid",
    "von" "date" NOT NULL,
    "bis" "date",
    "status" "text" DEFAULT 'ausgeliehen'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."material_ausleihen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medien" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "title" "text",
    "url" "text" NOT NULL,
    "spiel_id" "uuid",
    "team" "text",
    "autor_id" "uuid",
    "publiziert" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."medien" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mitglieder" (
    "id" bigint NOT NULL,
    "mitgliedtyp" "text" DEFAULT 'Aktivmitglied'::"text",
    "rolle" "text",
    "aktiv" boolean DEFAULT true,
    "spielerpass" "text",
    "js_nr" "text",
    "fairgate_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deaktiviert_am" timestamp with time zone,
    "deaktiviert_von" "text",
    "verein_id" "uuid" NOT NULL,
    "eintrittsdatum" "date",
    "person_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitglieder" OWNER TO "postgres";


COMMENT ON COLUMN "public"."mitglieder"."rolle" IS 'Veraltet – wird durch funktion ersetzt. Nicht mehr verwenden.';



CREATE TABLE IF NOT EXISTS "public"."mitglieder_aenderungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mitglied_id" bigint,
    "verein_id" "uuid" NOT NULL,
    "feld" "text" NOT NULL,
    "alter_wert" "text",
    "neuer_wert" "text",
    "geaendert_von" "text",
    "geaendert_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "person_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitglieder_aenderungen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mitglieder_aktivitaeten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mitglied_id" bigint,
    "verein_id" "uuid" NOT NULL,
    "typ" "text" NOT NULL,
    "beschreibung" "text" NOT NULL,
    "feld" "text",
    "wert" "text",
    "geaendert_von" "text",
    "geaendert_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "person_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitglieder_aktivitaeten" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mitglieder_ansichten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid",
    "benutzer_id" "uuid",
    "name" "text" NOT NULL,
    "spalten" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "filter" "jsonb" DEFAULT '{}'::"jsonb",
    "gruppierung" "jsonb" DEFAULT '["none"]'::"jsonb",
    "ist_standard" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "zeilenreihenfolge" "jsonb" DEFAULT '{}'::"jsonb",
    "typ" "text" DEFAULT 'mitglieder'::"text",
    "geteilt" boolean DEFAULT false,
    "gruppenreihenfolge" "jsonb" DEFAULT '{}'::"jsonb",
    "sortierung" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."mitglieder_ansichten" OWNER TO "postgres";


COMMENT ON COLUMN "public"."mitglieder_ansichten"."sortierung" IS 'Sortierebenen der Ansicht: [{"key":"name","dir":"asc"}, …]. sortDefs[0] ist die primaere Ebene. Leeres Array/NULL = Ausgangssortierung der Liste.';



CREATE SEQUENCE IF NOT EXISTS "public"."mitglieder_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mitglieder_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mitglieder_id_seq" OWNED BY "public"."mitglieder"."id";



CREATE TABLE IF NOT EXISTS "public"."mitglieder_notizen" (
    "id" integer NOT NULL,
    "mitglied_id" bigint,
    "text" "text" NOT NULL,
    "autor_id" "uuid",
    "autor_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitglieder_notizen" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mitglieder_notizen_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mitglieder_notizen_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mitglieder_notizen_id_seq" OWNED BY "public"."mitglieder_notizen"."id";



CREATE TABLE IF NOT EXISTS "public"."mitglieder_team_details" (
    "id" bigint NOT NULL,
    "mitglied_id" bigint NOT NULL,
    "team_name" "text" NOT NULL,
    "rueckennr" "text",
    "position" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitglieder_team_details" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mitglieder_team_details_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mitglieder_team_details_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mitglieder_team_details_id_seq" OWNED BY "public"."mitglieder_team_details"."id";



CREATE TABLE IF NOT EXISTS "public"."mitgliedtyp_feldkonfig" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "mitgliedtyp_id" "uuid",
    "schluessel" "text" NOT NULL,
    "modus" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "art_id" "uuid",
    CONSTRAINT "mitgliedtyp_feldkonfig_achse_check" CHECK (("num_nonnulls"("mitgliedtyp_id", "art_id") = 1)),
    CONSTRAINT "mitgliedtyp_feldkonfig_modus_check" CHECK (("modus" = ANY (ARRAY['pflicht'::"text", 'freiwillig'::"text", 'aus'::"text"])))
);


ALTER TABLE "public"."mitgliedtyp_feldkonfig" OWNER TO "postgres";


COMMENT ON TABLE "public"."mitgliedtyp_feldkonfig" IS 'Was ein Mitgliedtyp hat: pro Schluessel einer von drei Werten — pflicht, freiwillig, aus ("gibt es nicht", auch fuer die Verwaltung). Fehlende Zeile bedeutet freiwillig; gespeichert wird nur die Abweichung. Loest mitgliedtyp_pflichtfelder und rolle_pflichtfelder ab.';



COMMENT ON COLUMN "public"."mitgliedtyp_feldkonfig"."schluessel" IS 'Feld (geburtsdatum, ahv_nr, ...), Bereich (teams, funktionen, notizen) oder Profil-Tab (tab_eltern, ...). Die gueltige Liste steht in domains/members/feldkonfig.ts, nicht hier.';



COMMENT ON COLUMN "public"."mitgliedtyp_feldkonfig"."modus" IS 'pflicht = wird gezeigt und verlangt; freiwillig = wird gezeigt, darf leer bleiben; aus = gibt es nicht, verschwindet aus Profil, Neuanlage und Datenpruefung.';



CREATE TABLE IF NOT EXISTS "public"."mitgliedtyp_pflichtfelder" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mitgliedtyp" "text" NOT NULL,
    "feld" "text" NOT NULL,
    "pflicht" boolean DEFAULT true,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitgliedtyp_pflichtfelder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mitgliedtypen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "beitragsinfo" "text",
    "hauptkontakt_pflicht" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "aktiv" boolean DEFAULT true,
    "standard_rolle" "text",
    "verein_id" "uuid" NOT NULL,
    "zaehlt_als_mitgliedschaft" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."mitgliedtypen" OWNER TO "postgres";


COMMENT ON COLUMN "public"."mitgliedtypen"."zaehlt_als_mitgliedschaft" IS 'False = dieser Typ ist keine Mitgliedschaft: kein Beitrag, kein Stimmrecht an der GV, kein Spielbetrieb, eigener Tab in der Mitgliederliste. Ersetzt den Namensvergleich auf "Supporter" im Frontend.';



CREATE TABLE IF NOT EXISTS "public"."modul_benutzer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modul_id" "uuid" NOT NULL,
    "benutzer_id" "uuid" NOT NULL,
    "active" boolean NOT NULL,
    "gesetzt_von" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."modul_benutzer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modul_rechte" (
    "modul" "text" NOT NULL,
    "rolle" "text" NOT NULL,
    "hat_zugriff" boolean DEFAULT true,
    "stufe" "text" DEFAULT 'lesen'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."modul_rechte" OWNER TO "postgres";


COMMENT ON COLUMN "public"."modul_rechte"."stufe" IS 'lesen = read-only | schreiben = eigene Daten ändern | verwalten = erstellen/löschen/für alle';



CREATE TABLE IF NOT EXISTS "public"."modul_rollen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modul_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."modul_rollen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "icon" "text",
    "category" "text",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."module" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_berechtigungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modul_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "kann_lesen" boolean DEFAULT false,
    "kann_schreiben" boolean DEFAULT false,
    "kann_verwalten" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."module_berechtigungen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_config" (
    "modul" "text" NOT NULL,
    "aktiv" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."module_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_delegationen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modul_id" "uuid" NOT NULL,
    "benutzer_id" "uuid" NOT NULL,
    "stufe" integer NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "delegiert_von" "uuid",
    "verein_id" "uuid" NOT NULL,
    CONSTRAINT "module_delegationen_stufe_check" CHECK (("stufe" = ANY (ARRAY[2, 3])))
);


ALTER TABLE "public"."module_delegationen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nachrichten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titel" "text" NOT NULL,
    "inhalt" "text" NOT NULL,
    "typ" "text" NOT NULL,
    "autor_id" "uuid",
    "autor_name" "text",
    "empfaenger_typ" "text" NOT NULL,
    "empfaenger_rolle" "text",
    "empfaenger_gruppe_id" bigint,
    "empfaenger_team" "text",
    "erstellt_am" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    CONSTRAINT "nachrichten_empfaenger_typ_check" CHECK (("empfaenger_typ" = ANY (ARRAY['rolle'::"text", 'gruppe'::"text", 'team'::"text"]))),
    CONSTRAINT "nachrichten_typ_check" CHECK (("typ" = ANY (ARRAY['broadcast'::"text", 'diskussion'::"text"])))
);


ALTER TABLE "public"."nachrichten" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nachrichten_antworten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nachricht_id" "uuid",
    "autor_id" "uuid",
    "autor_name" "text",
    "inhalt" "text" NOT NULL,
    "erstellt_am" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."nachrichten_antworten" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nachrichten_dateien" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nachricht_id" "uuid",
    "datei_name" "text" NOT NULL,
    "datei_url" "text" NOT NULL,
    "datei_groesse" integer,
    "erstellt_am" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."nachrichten_dateien" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nachrichten_gelesen" (
    "nachricht_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "gelesen_am" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."nachrichten_gelesen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "bild_url" "text",
    "kategorie_id" "uuid",
    "autor_id" "uuid",
    "publiziert" boolean DEFAULT false,
    "internal" boolean DEFAULT false,
    "teams" "text"[] DEFAULT '{}'::"text"[],
    "rollen" "text"[] DEFAULT '{}'::"text"[],
    "mitglied_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "push_senden" boolean DEFAULT false,
    "email_senden" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."news" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_kategorien" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#64748B'::"text",
    "icon" "text",
    "internal" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."news_kategorien" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_lesestatus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "news_id" "uuid" NOT NULL,
    "benutzer_id" "uuid" NOT NULL,
    "gelesen_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."news_lesestatus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "vorname" "text" NOT NULL,
    "nachname" "text" NOT NULL,
    "email" "text",
    "telefon" "text",
    "strasse" "text",
    "plz" "text",
    "ort" "text",
    "kanton" "text",
    "land" "text" DEFAULT 'Schweiz'::"text",
    "geburtsdatum" "date",
    "geschlecht" "text",
    "nationalitaet" "text" DEFAULT 'CH'::"text",
    "nationalitaet2" "text",
    "heimatort" "text",
    "ahv_nr" "text",
    "foto_url" "text",
    "funktionen" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "profil_geprueft_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offene_punkte" "text",
    CONSTRAINT "personen_offene_punkte_nicht_leer" CHECK ((("offene_punkte" IS NULL) OR ("btrim"("offene_punkte") <> ''::"text")))
);


ALTER TABLE "public"."personen" OWNER TO "postgres";


COMMENT ON TABLE "public"."personen" IS 'Ein Mensch, einmal pro Verein. mitglieder ist die Mitgliedschaft dieser Person.';



COMMENT ON COLUMN "public"."personen"."strasse" IS 'Adresse an der Person: getrennte Eltern und Kind koennen drei verschiedene Adressen haben.';



COMMENT ON COLUMN "public"."personen"."funktionen" IS 'Vereinsfunktionen. An der Person, nicht an der Mitgliedschaft: ein Materialwart muss kein Mitglied sein.';



COMMENT ON COLUMN "public"."personen"."profil_geprueft_at" IS 'Wann die Person ihre Daten zuletzt bestaetigt hat. DIE einzige Stelle — die Altspalte benutzer.profil_geprueft_at ist am 20.08.2026 gefallen. Sie war eine zweite Aussage ueber dieselbe Sache: wer ueber den Overlay bestaetigte, schrieb dorthin, die Mitgliederliste las hier, und der Rueckfall in sollProfilPruefen() verdeckte die Abweichung.';



COMMENT ON COLUMN "public"."personen"."offene_punkte" IS 'Von Hand gesetzte Markierung: was bei dieser Person noch offen ist (Beitrag, Rechnung, Material). NICHT LEER = markiert. Nie abgeleitet; der Archiv-Tab ist die gefilterte Ansicht darauf.';



CREATE TABLE IF NOT EXISTS "public"."personenart_pro_person" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "art_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."personenart_pro_person" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personenarten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "aktiv" boolean DEFAULT true NOT NULL,
    "ableitung" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "standard_rolle" "text",
    CONSTRAINT "personenarten_ableitung_check" CHECK ((("ableitung" IS NULL) OR ("ableitung" = 'eltern_kinder'::"text")))
);


ALTER TABLE "public"."personenarten" OWNER TO "postgres";


COMMENT ON COLUMN "public"."personenarten"."standard_rolle" IS 'Portalrolle, die diese Art mitbringt. Vorbild mitgliedtypen.standard_rolle — nur mit Fremdschluessel, weil dessen Fehlen dort am 05.08.2026 zwei Zeilen mit einer unbekannten Rolle zugelassen hat.';



CREATE OR REPLACE VIEW "public"."personenarten_effektiv" WITH ("security_invoker"='true') AS
 SELECT "z"."person_id",
    "a"."id" AS "art_id",
    "a"."verein_id",
    "a"."name",
    "a"."sort_order",
    "a"."ableitung"
   FROM ("public"."personenart_pro_person" "z"
     JOIN "public"."personenarten" "a" ON (("a"."id" = "z"."art_id")))
  WHERE "a"."aktiv"
UNION
 SELECT "k"."person_id",
    "a"."id" AS "art_id",
    "a"."verein_id",
    "a"."name",
    "a"."sort_order",
    "a"."ableitung"
   FROM (("public"."eltern_kinder" "k"
     JOIN "public"."mitglieder" "m" ON ((("m"."id" = "k"."mitglied_id") AND ("m"."aktiv" IS TRUE))))
     JOIN "public"."personenarten" "a" ON ((("a"."verein_id" = "k"."verein_id") AND ("a"."ableitung" = 'eltern_kinder'::"text"))))
  WHERE "a"."aktiv";


ALTER VIEW "public"."personenarten_effektiv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_einstellungen" (
    "schluessel" "text" NOT NULL,
    "wert" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."portal_einstellungen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_funktionen" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "beschreibung" "text",
    "gruppe_id" bigint,
    "module_override" "text"[] DEFAULT '{}'::"text"[],
    "teams" "text"[] DEFAULT '{}'::"text"[],
    "filter" "jsonb" DEFAULT '{}'::"jsonb",
    "aktiv" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stufe_override" "jsonb" DEFAULT '{}'::"jsonb",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."portal_funktionen" OWNER TO "postgres";


COMMENT ON COLUMN "public"."portal_funktionen"."stufe_override" IS 'Überschreibt Gruppen-Stufe für bestimmte Module (nur höher, nie tiefer)';



CREATE SEQUENCE IF NOT EXISTS "public"."portal_funktionen_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."portal_funktionen_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."portal_funktionen_id_seq" OWNED BY "public"."portal_funktionen"."id";



CREATE TABLE IF NOT EXISTS "public"."portal_gruppen" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "beschreibung" "text",
    "module" "text"[] DEFAULT '{}'::"text"[],
    "farbe" "text" DEFAULT '#8B5CF6'::"text",
    "aktiv" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "modul_stufen" "jsonb" DEFAULT '{}'::"jsonb",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."portal_gruppen" OWNER TO "postgres";


COMMENT ON COLUMN "public"."portal_gruppen"."modul_stufen" IS 'Default-Zugriffstufe pro Modul für alle Funktionäre in dieser Gruppe';



CREATE SEQUENCE IF NOT EXISTS "public"."portal_gruppen_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."portal_gruppen_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."portal_gruppen_id_seq" OWNED BY "public"."portal_gruppen"."id";



CREATE TABLE IF NOT EXISTS "public"."portal_gruppen_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gruppe_id" bigint,
    "team_id" bigint,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."portal_gruppen_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_rollen" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "label" "text" NOT NULL,
    "prioritaet" integer DEFAULT 50 NOT NULL,
    "aktiv" boolean DEFAULT true NOT NULL,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."portal_rollen" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."portal_rollen_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."portal_rollen_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."portal_rollen_id_seq" OWNED BY "public"."portal_rollen"."id";



CREATE OR REPLACE VIEW "public"."portal_zugang" WITH ("security_invoker"='false') AS
 SELECT "person_id",
    COALESCE("aktiv", true) AS "hat_zugang"
   FROM "public"."benutzer" "b"
  WHERE ("person_id" IS NOT NULL);


ALTER VIEW "public"."portal_zugang" OWNER TO "postgres";


COMMENT ON VIEW "public"."portal_zugang" IS 'Nur: hat diese Person einen Portal-Zugang? Laeuft bewusst OHNE security_invoker, damit auch Trainer die Spalte in der Elternliste sehen — wie vor Etappe 3 ueber elternkontakte.benutzer_id. Keine weiteren Spalten ergaenzen.';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "benutzer_id" "uuid",
    "endpoint" "text" NOT NULL,
    "p256dh" "text",
    "auth" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ranglisten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "sfv_saison_id" integer NOT NULL,
    "sfv_liga_id" integer NOT NULL,
    "sfv_liga_name" "text",
    "sfv_division_id" integer DEFAULT 0 NOT NULL,
    "sfv_division_name" "text",
    "sfv_gruppe_id" integer DEFAULT 0 NOT NULL,
    "sfv_gruppe" "text",
    "sfv_team_id" bigint NOT NULL,
    "team_name" "text",
    "club_nummer" integer,
    "position" integer,
    "anzahl_spiele" integer,
    "siege" integer,
    "unentschieden" integer,
    "niederlagen" integer,
    "tore" integer,
    "gegentore" integer,
    "punkte" integer,
    "fairplay_punkte" integer,
    "stand_vom" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ranglisten" OWNER TO "postgres";


COMMENT ON TABLE "public"."ranglisten" IS 'Ranglisten vom SFV, eine Zeile je Team je Gruppe. Wird vom Sync vollstaendig bewirtschaftet.';



COMMENT ON COLUMN "public"."ranglisten"."club_nummer" IS 'SFV clubNumber (FCH = 11057). NICHT die ClubId (1516) — in Ranglisten und Matchdaten steht ausschliesslich die clubNumber.';



COMMENT ON COLUMN "public"."ranglisten"."fairplay_punkte" IS 'SFV penaltyPoints. KEIN Punktabzug: die Punkte sind ungekuerzt, FCH hatte 2025/2026 deren 76 auf Rang 2. Es ist die Fairplay-/Bussenwertung. Nie als Abzug anzeigen.';



COMMENT ON COLUMN "public"."ranglisten"."stand_vom" IS 'Zeitpunkt des Abrufs, nicht des Spieltags.';



CREATE TABLE IF NOT EXISTS "public"."rolle_pflichtfelder" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rolle" "text" NOT NULL,
    "feld" "text" NOT NULL,
    "pflicht" boolean DEFAULT true,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."rolle_pflichtfelder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rollen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."rollen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sfv_team_logos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "sfv_team_id" integer NOT NULL,
    "pfad" "text",
    "mime" "text",
    "geholt_am" timestamp with time zone,
    "fehlt_seit" timestamp with time zone
);


ALTER TABLE "public"."sfv_team_logos" OWNER TO "postgres";


COMMENT ON TABLE "public"."sfv_team_logos" IS 'Vereinswappen der Gegner, geholt ueber /api/team/picture/{teamId}. Geschluesselt nach sfv_team_id, obwohl das Bild dem VEREIN gehoert (alle Teams eines Vereins liefern dasselbe) — die teamId steht an spiele.sfv_gegner_team_id, die clubNumber nicht. Das eigene Wappen steht NICHT hier, sondern in vereine.theme.';



COMMENT ON COLUMN "public"."sfv_team_logos"."mime" IS 'Aus den Magic Bytes bestimmt, NICHT angenommen: der SFV liefert durch, was der Verein hochgeladen hat — bei FCH ein GIF, bei FC Oberland United ein JPEG.';



COMMENT ON COLUMN "public"."sfv_team_logos"."fehlt_seit" IS 'Seit wann der SFV kein Bild liefert (404). Der Sync fragt fruehestens 30 Tage danach erneut: kuerzer bringt nichts, das niemand bemerkt, und einmal pro Saison hiesse, dass ein im September nachgetragenes Wappen erst im Juli erscheint.';



CREATE TABLE IF NOT EXISTS "public"."sfv_zuordnung" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "sfv_person_id" integer NOT NULL,
    "mitglied_id" bigint NOT NULL,
    "zugeordnet_von" "uuid",
    "zugeordnet_am" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notiz" "text"
);


ALTER TABLE "public"."sfv_zuordnung" OWNER TO "postgres";


COMMENT ON TABLE "public"."sfv_zuordnung" IS 'Welches Mitglied hinter einer SFV-personId steckt. Von Hand gesetzt. Mehrere sfv_person_id duerfen auf dasselbe Mitglied zeigen — falls der SFV die IDs zur neuen Saison wechselt, kommt eine dazu statt eine zu ersetzen.';



CREATE TABLE IF NOT EXISTS "public"."spiel_aufstellung" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "spiel_id" "uuid" NOT NULL,
    "sfv_person_id" integer NOT NULL,
    "sfv_team_id" integer,
    "rueckennr" integer,
    "position_id" integer,
    "position_name" "text",
    "von_minute" integer,
    "bis_minute" integer,
    "spielzeit" integer,
    "zuletzt_synchronisiert" timestamp with time zone DEFAULT "now"() NOT NULL,
    "erstmals_gesehen" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."spiel_aufstellung" OWNER TO "postgres";


COMMENT ON TABLE "public"."spiel_aufstellung" IS 'Aufstellung EIGENER Spieler aus /api/match/{id}/players. Fremde Zeilen werden nicht gespeichert. Nicht zu verwechseln mit `aufgebote`: das Aufgebot steht vor dem Spiel und deckt sich nie ganz mit der Aufstellung danach.';



COMMENT ON COLUMN "public"."spiel_aufstellung"."erstmals_gesehen" IS 'Wann diese Zeile ENTSTANDEN ist. Steht bewusst nicht in der Upsert-Nutzlast von bildeAufstellung() — was nicht mitgeschickt wird, laesst ON CONFLICT DO UPDATE unberuehrt. Nicht zu verwechseln mit zuletzt_synchronisiert, das bei jedem Lauf neu gesetzt wird.';



CREATE TABLE IF NOT EXISTS "public"."spiel_ereignisse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid" NOT NULL,
    "spiel_id" "uuid" NOT NULL,
    "herkunft" "text" NOT NULL,
    "sfv_event_id" integer,
    "ersetzt_ereignis_id" "uuid",
    "geaenderte_felder" "text"[],
    "korrigiert_von" "uuid",
    "korrigiert_am" timestamp with time zone,
    "verworfen_am" timestamp with time zone,
    "typ_id" integer NOT NULL,
    "typ" "text",
    "subtyp_id" integer,
    "subtyp" "text",
    "minute" integer,
    "zusatzminute" integer,
    "ist_eigener" boolean NOT NULL,
    "sfv_team_id" integer,
    "gegner_club_name" "text",
    "sfv_person_id" integer,
    "rueckennr" integer,
    "ein_sfv_person_id" integer,
    "ein_rueckennr" integer,
    "zuletzt_synchronisiert" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spiel_ereignisse_fremde_anonym_check" CHECK (("ist_eigener" OR (("sfv_person_id" IS NULL) AND ("rueckennr" IS NULL) AND ("ein_sfv_person_id" IS NULL) AND ("ein_rueckennr" IS NULL)))),
    CONSTRAINT "spiel_ereignisse_herkunft_check" CHECK (("herkunft" = ANY (ARRAY['sfv'::"text", 'verein'::"text"]))),
    CONSTRAINT "spiel_ereignisse_schicht_check" CHECK (((("herkunft" = 'sfv'::"text") AND ("sfv_event_id" IS NOT NULL) AND ("ersetzt_ereignis_id" IS NULL) AND ("geaenderte_felder" IS NULL) AND ("korrigiert_von" IS NULL)) OR (("herkunft" = 'verein'::"text") AND ("sfv_event_id" IS NULL) AND ("korrigiert_von" IS NOT NULL) AND ((("ersetzt_ereignis_id" IS NOT NULL) AND ("array_length"("geaenderte_felder", 1) > 0)) OR (("ersetzt_ereignis_id" IS NULL) AND ("geaenderte_felder" IS NULL))))))
);


ALTER TABLE "public"."spiel_ereignisse" OWNER TO "postgres";


COMMENT ON TABLE "public"."spiel_ereignisse" IS 'Spielverlauf. herkunft=sfv wird bei jedem Lauf fortgeschrieben, herkunft=verein nie. Eine Vereins-Zeile verdeckt ueber ersetzt_ereignis_id eine SFV-Zeile (Korrektur) oder steht fuer sich (nachgetragener Assist). Von fremden Spielern bleibt nur gegner_club_name — erzwungen durch spiel_ereignisse_fremde_anonym_check.';



COMMENT ON COLUMN "public"."spiel_ereignisse"."geaenderte_felder" IS 'Welche Felder diese Korrektur setzt. Nur diese werden beim Nachzug-Vergleich gegen die SFV-Zeile geprueft: wer den Torschuetzen korrigiert, hat zur Minute nichts gesagt.';



COMMENT ON COLUMN "public"."spiel_ereignisse"."typ_id" IS 'SFV Ereignistyp: 1 Tor, 2 Aus-/Einwechslung, 3 Verwarnung, 4 Ausschluss, 9 Assist. Vollstaendig in docs/sfv/sfv_stammdaten.json. Assist ist ein SFV-Typ wie jeder andere — woher die Zeile stammt, sagt herkunft, nicht der Typ.';



CREATE TABLE IF NOT EXISTS "public"."spiele" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team" "text" NOT NULL,
    "date" "date" NOT NULL,
    "zeit" time without time zone,
    "gegner" "text",
    "heimspiel" boolean DEFAULT true,
    "venue" "text",
    "venue_addr" "text",
    "treffpunkt" "text",
    "wettbewerb" "text",
    "liga" "text",
    "spiel_nr" "text",
    "status" "text" DEFAULT 'Angesetzt'::"text",
    "resultat" "text",
    "ht_resultat" "text",
    "zuschauer" integer,
    "schiedsrichter" "text",
    "delegierter" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "sfv_match_id" bigint,
    "sfv_saison_id" integer,
    "sfv_team_id" bigint,
    "sfv_gegner_team_id" bigint,
    "sfv_liga_id" integer,
    "sfv_gruppe_id" integer,
    "sfv_gruppe" "text",
    "sfv_spiel_typ" integer,
    "sfv_status" integer,
    "sfv_stand" "jsonb",
    "zuletzt_synchronisiert" timestamp with time zone,
    "matchdaten_geholt_am" timestamp with time zone,
    "sfv_spiel_nr" "text"
);


ALTER TABLE "public"."spiele" OWNER TO "postgres";


COMMENT ON COLUMN "public"."spiele"."schiedsrichter" IS 'Name des Schiedsrichters (refereeRoleId 1) aus /api/match/{id}/referees. Nur der Name — kein Geburtsdatum, kein Geschlecht, keine personId, kein Verein. Ein Schiedsrichter ist eine Amtsfunktion, keine Privatperson; von gegnerischen SPIELERN wird weiterhin nichts gespeichert. Assistenten stehen nicht hier: ein Textfeld traegt keine Liste.';



COMMENT ON COLUMN "public"."spiele"."delegierter" IS 'Gehoert dem Verein, wird von Hand gepflegt. Der SFV liefert in unseren Ligen keinen Delegierten — ueber alle 21 ausgetragenen Spiele der Saison 2026/27 kamen nur die Rollen Schiedsrichter, Assistent 1 und Assistent 2 vor (Probe 20.08.2026).';



COMMENT ON COLUMN "public"."spiele"."sfv_match_id" IS 'SFV matchId — Schluessel des Sync. NULL = manuell erfasstes Spiel, der Sync fasst es nie an.';



COMMENT ON COLUMN "public"."spiele"."sfv_saison_id" IS 'SFV seasonId, benannt nach dem Endjahr: 2027 = Saison 2026/2027.';



COMMENT ON COLUMN "public"."spiele"."sfv_team_id" IS 'SFV teamId des eigenen Teams (teamAId oder teamBId, je nach Heimrecht).';



COMMENT ON COLUMN "public"."spiele"."sfv_gegner_team_id" IS 'SFV teamId des Gegners — fuer /api/team/picture/{teamId}.';



COMMENT ON COLUMN "public"."spiele"."sfv_gruppe_id" IS 'SFV groupId; zusammen mit sfv_liga_id der Bezug zur Rangliste.';



COMMENT ON COLUMN "public"."spiele"."sfv_spiel_typ" IS 'SFV matchType: 1 Meisterschaft, 2 Cup, 3 Trainingsspiel, 9 Schweizer-Cup. Zum Filtern in der Anzeige — der Klartext steht in wettbewerb.';



COMMENT ON COLUMN "public"."spiele"."sfv_status" IS 'SFV matchState: 1 noch nicht ausgetragen, 2 ausgetragen, 6 verschoben, 7 neu angesetzt, 10 findet nicht statt. Zum Filtern — der Klartext steht in status.';



COMMENT ON COLUMN "public"."spiele"."sfv_stand" IS 'Rohe Antwortzeile des SFV, unveraendert. Damit ist jede Abweichung nachvollziehbar und neue Felder brauchen keinen erneuten Abruf.';



COMMENT ON COLUMN "public"."spiele"."matchdaten_geholt_am" IS 'Letzter erfolgreicher Abruf von /api/match/{id}(+players,+events). NULL = noch nie. Der Sync holt zuerst die noch nie geholten, danach zum Nachziehen die aus der Woche nach dem Spiel.';



COMMENT ON COLUMN "public"."spiele"."sfv_spiel_nr" IS 'matchNumber des SFV. NICHT spiel_nr — die gehoert dem Verein und wird von Hand gepflegt (siehe migration_sfv_spielplan.sql). Die Anzeige zeigt spiel_nr, wenn gesetzt, sonst diese.';



CREATE TABLE IF NOT EXISTS "public"."team_helfer_zuteilungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aufgabe_id" "uuid" NOT NULL,
    "eingetragen_von" "uuid",
    "als_stellvertreter" boolean DEFAULT false,
    "status" "text" DEFAULT 'eingetragen'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    "person_id" "uuid"
);


ALTER TABLE "public"."team_helfer_zuteilungen" OWNER TO "postgres";


COMMENT ON COLUMN "public"."team_helfer_zuteilungen"."person_id" IS 'Wer die Teamaufgabe uebernimmt — eine PERSON. Gerade hier sind es ueberwiegend Eltern, die selbst keine Mitgliedschaft haben.';



CREATE TABLE IF NOT EXISTS "public"."team_helferaufgaben" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team" "text" NOT NULL,
    "typ" "text" NOT NULL,
    "event_type" "text",
    "event_id" "uuid",
    "beschreibung" "text",
    "max_helfer" integer DEFAULT 1,
    "erstellt_von" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."team_helferaufgaben" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_module" (
    "team_id" bigint NOT NULL,
    "modul" "text" NOT NULL,
    "aktiv" boolean DEFAULT true,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."team_module" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_stufen" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "ebene" integer NOT NULL,
    "parent_id" bigint,
    "kurzname" "text",
    "stufenleitung" "text",
    "sortorder" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    CONSTRAINT "team_stufen_ebene_check" CHECK ((("ebene" >= 1) AND ("ebene" <= 3)))
);


ALTER TABLE "public"."team_stufen" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."team_stufen_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."team_stufen_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."team_stufen_id_seq" OWNED BY "public"."team_stufen"."id";



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "kategorie" "text" DEFAULT 'Junioren C'::"text" NOT NULL,
    "liga" "text",
    "saison" "text" DEFAULT '2024/25'::"text",
    "trainer" "text",
    "trainer2" "text",
    "aktiv" boolean DEFAULT true NOT NULL,
    "beschreibung" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "haupttrainer" "text"[] DEFAULT '{}'::"text"[],
    "staff" "text"[] DEFAULT '{}'::"text"[],
    "co_trainers" "text"[] DEFAULT '{}'::"text"[],
    "stufe_id" bigint,
    "kurzname" "text",
    "hauptbereich" "text",
    "vereinsstufe" "text",
    "verbandskategorie" "text",
    "stufenleitung" "text",
    "verein_id" "uuid" NOT NULL,
    "sfv_team_id" bigint,
    "sfv_liga_id" integer,
    "sfv_liga_name" "text",
    "sfv_division" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."teams"."sfv_team_id" IS 'SFV teamId. NULL = kein Pendant beim SFV (z.B. reine Trainingsgruppe). Von Hand zugeordnet, nie vom Sync geschrieben.';



COMMENT ON COLUMN "public"."teams"."sfv_liga_id" IS 'SFV teamLeagueId, z.B. 13010 = 2. Liga.';



COMMENT ON COLUMN "public"."teams"."sfv_division" IS 'SFV teamDivisionName, z.B. "Herbstrunde" oder "Staerkeklasse 2".';



CREATE SEQUENCE IF NOT EXISTS "public"."teams_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teams_id_seq" OWNED BY "public"."teams"."id";



CREATE TABLE IF NOT EXISTS "public"."termine" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "date" "date" NOT NULL,
    "end_datum" "date",
    "zeit" time without time zone,
    "end_zeit" time without time zone,
    "location" "text",
    "description" "text",
    "teams" "text"[] DEFAULT '{}'::"text"[],
    "rsvp" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."termine" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team" "text" NOT NULL,
    "date" "date" NOT NULL,
    "zeit_von" time without time zone,
    "zeit_bis" time without time zone,
    "location" "text",
    "end_ort" "text",
    "thema" "text",
    "notes" "text",
    "abgesagt" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "trainingsplan_slot_id" "uuid",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."trainings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainingsplaetze" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "haelften" "text"[] DEFAULT '{}'::"text"[],
    "active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."trainingsplaetze" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainingsplan_ausnahmen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slot_id" "uuid",
    "week_nr" integer NOT NULL,
    "year" integer NOT NULL,
    "type" "text" NOT NULL,
    "neue_start_zeit" numeric(4,2),
    "neue_end_zeit" numeric(4,2),
    "neuer_ort" "text",
    "neues_end_ort" "text",
    "neue_haelfte" "text",
    "neues_end_haelfte" "text",
    "neue_wechsel_zeit" numeric(4,2),
    "zusatz_wochentag" "text",
    "zusatz_team" "text",
    "zusatz_start_zeit" numeric(4,2),
    "zusatz_end_zeit" numeric(4,2),
    "zusatz_ort" "text",
    "zusatz_end_ort" "text",
    "zusatz_haelfte" "text",
    "zusatz_end_haelfte" "text",
    "zusatz_wechsel_zeit" numeric(4,2),
    "zusatz_farbe" "text",
    "begruendung" "text",
    "von_trainer" boolean DEFAULT false,
    "erstellt_von" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL,
    CONSTRAINT "chk_slot_id_required" CHECK ((("type" = 'zusatz'::"text") OR ("slot_id" IS NOT NULL)))
);


ALTER TABLE "public"."trainingsplan_ausnahmen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainingsplan_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "weekday" "text" NOT NULL,
    "team" "text" NOT NULL,
    "start_zeit" numeric(4,2) NOT NULL,
    "end_zeit" numeric(4,2) NOT NULL,
    "location" "text",
    "platz_id" "uuid",
    "half" "text",
    "wechsel_zeit" numeric(4,2),
    "end_ort" "text",
    "end_platz_id" "uuid",
    "end_half" "text",
    "valid_from_week" "text",
    "valid_from_week_year" integer,
    "valid_from_week_nr" integer,
    "color" "text" DEFAULT '#2563EB'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."trainingsplan_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainingsplan_vorlagen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "valid_from" "date" NOT NULL,
    "valid_until" "date",
    "active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."trainingsplan_vorlagen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vereine" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "theme" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "sfv_club_nummer" integer,
    "austritt_art_id" "uuid"
);


ALTER TABLE "public"."vereine" OWNER TO "postgres";


COMMENT ON COLUMN "public"."vereine"."sfv_club_nummer" IS 'SFV clubNumber des Vereins (FCH = 11057). NICHT die ClubId (1516) — in Ranglisten und Matchdaten steht ausschliesslich die clubNumber. Der Matchdaten-Sync trennt daran eigene von fremden Spielern.';



COMMENT ON COLUMN "public"."vereine"."austritt_art_id" IS 'Personenart, zu der eine Person beim Austritt wird. Nur GESETZTE Arten (personenarten.ableitung IS NULL) sind zulaessig — geprueft in der Portalverwaltung, nicht per CHECK; Begruendung im Kopf von migration_austritt.sql.';



CREATE TABLE IF NOT EXISTS "public"."wiki_artikel" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "category" "text",
    "autor_id" "uuid",
    "publiziert" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."wiki_artikel" OWNER TO "postgres";


ALTER TABLE ONLY "public"."kader_rollen" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."kader_rollen_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mitglieder" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mitglieder_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mitglieder_notizen" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mitglieder_notizen_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mitglieder_team_details" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mitglieder_team_details_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."portal_funktionen" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."portal_funktionen_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."portal_gruppen" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."portal_gruppen_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."portal_rollen" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."portal_rollen_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."team_stufen" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."team_stufen_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."abstimmung_antworten"
    ADD CONSTRAINT "abstimmung_antworten_abstimmung_id_mitglied_id_key" UNIQUE ("abstimmung_id", "mitglied_id");



ALTER TABLE ONLY "public"."abstimmung_antworten"
    ADD CONSTRAINT "abstimmung_antworten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abstimmungen"
    ADD CONSTRAINT "abstimmungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_mitglied_event_key" UNIQUE ("mitglied_id", "event_type", "event_id");



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_verbindungen"
    ADD CONSTRAINT "api_verbindungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_verbindungen"
    ADD CONSTRAINT "api_verbindungen_verein_key_key" UNIQUE ("verein_id", "key");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aufgebote"
    ADD CONSTRAINT "aufgebote_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aufgebote"
    ADD CONSTRAINT "aufgebote_spiel_id_mitglied_id_key" UNIQUE ("spiel_id", "mitglied_id");



ALTER TABLE ONLY "public"."benachrichtigungen"
    ADD CONSTRAINT "benachrichtigungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."benutzer_funktionen"
    ADD CONSTRAINT "benutzer_funktionen_pkey" PRIMARY KEY ("benutzer_id", "funktion_id");



ALTER TABLE ONLY "public"."benutzer"
    ADD CONSTRAINT "benutzer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."benutzer_teams"
    ADD CONSTRAINT "benutzer_teams_benutzer_id_team_id_key" UNIQUE ("benutzer_id", "team_id");



ALTER TABLE ONLY "public"."benutzer_teams"
    ADD CONSTRAINT "benutzer_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bus_anmeldungen"
    ADD CONSTRAINT "bus_anmeldungen_bus_id_mitglied_id_key" UNIQUE ("bus_id", "mitglied_id");



ALTER TABLE ONLY "public"."bus_anmeldungen"
    ADD CONSTRAINT "bus_anmeldungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."busse"
    ADD CONSTRAINT "busse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dokumente"
    ADD CONSTRAINT "dokumente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eltern_kinder"
    ADD CONSTRAINT "eltern_kinder_eltern_id_mitglied_id_verein_id_key" UNIQUE ("eltern_id", "mitglied_id", "verein_id");



ALTER TABLE ONLY "public"."eltern_kinder"
    ADD CONSTRAINT "eltern_kinder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_mitglied_email_unique" UNIQUE ("mitglied_id", "email");



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feldsichtbarkeit"
    ADD CONSTRAINT "feldsichtbarkeit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feldsichtbarkeit"
    ADD CONSTRAINT "feldsichtbarkeit_verein_key" UNIQUE ("verein_id", "feld_key", "role");



ALTER TABLE ONLY "public"."helper_einsaetze"
    ADD CONSTRAINT "helper_einsaetze_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht_mitglied"
    ADD CONSTRAINT "helper_einsatz_pflicht_mitglied_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht"
    ADD CONSTRAINT "helper_einsatz_pflicht_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_events"
    ADD CONSTRAINT "helper_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht_mitglied"
    ADD CONSTRAINT "helper_pflicht_m_mitglied_saison_key" UNIQUE ("mitglied_id", "saison");



ALTER TABLE ONLY "public"."helper_schichten"
    ADD CONSTRAINT "helper_schichten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_schicht_person_key" UNIQUE ("schicht_id", "person_id");



ALTER TABLE ONLY "public"."kader"
    ADD CONSTRAINT "kader_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kader_rollen"
    ADD CONSTRAINT "kader_rollen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kader_rollen"
    ADD CONSTRAINT "kader_rollen_verein_name_key" UNIQUE ("verein_id", "name");



ALTER TABLE ONLY "public"."kader"
    ADD CONSTRAINT "kader_team_id_mitglied_id_saison_key" UNIQUE ("team_id", "mitglied_id", "saison");



ALTER TABLE ONLY "public"."kommunikationsgruppen_mitglieder"
    ADD CONSTRAINT "kommunikationsgruppen_mitglieder_gruppe_id_benutzer_id_key" UNIQUE ("gruppe_id", "benutzer_id");



ALTER TABLE ONLY "public"."kommunikationsgruppen_mitglieder"
    ADD CONSTRAINT "kommunikationsgruppen_mitglieder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kommunikationsgruppen"
    ADD CONSTRAINT "kommunikationsgruppen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_ausleihen"
    ADD CONSTRAINT "material_ausleihen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medien"
    ADD CONSTRAINT "medien_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder_aenderungen"
    ADD CONSTRAINT "mitglieder_aenderungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder_aktivitaeten"
    ADD CONSTRAINT "mitglieder_aktivitaeten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder_ansichten"
    ADD CONSTRAINT "mitglieder_ansichten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_fairgate_id_key" UNIQUE ("fairgate_id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_id_verein_key" UNIQUE ("id", "verein_id");



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_mitglied_id_team_name_key" UNIQUE ("mitglied_id", "team_name");



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitgliedtyp_feldkonfig"
    ADD CONSTRAINT "mitgliedtyp_feldkonfig_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitgliedtyp_feldkonfig"
    ADD CONSTRAINT "mitgliedtyp_feldkonfig_verein_key" UNIQUE NULLS NOT DISTINCT ("verein_id", "mitgliedtyp_id", "art_id", "schluessel");



ALTER TABLE ONLY "public"."mitgliedtyp_pflichtfelder"
    ADD CONSTRAINT "mitgliedtyp_pflichtfelder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitgliedtyp_pflichtfelder"
    ADD CONSTRAINT "mitgliedtyp_pflichtfelder_verein_key" UNIQUE ("verein_id", "mitgliedtyp", "feld");



ALTER TABLE ONLY "public"."mitgliedtypen"
    ADD CONSTRAINT "mitgliedtypen_id_verein_key" UNIQUE ("id", "verein_id");



ALTER TABLE ONLY "public"."mitgliedtypen"
    ADD CONSTRAINT "mitgliedtypen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitgliedtypen"
    ADD CONSTRAINT "mitgliedtypen_verein_name_key" UNIQUE ("verein_id", "name");



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_modul_id_benutzer_id_key" UNIQUE ("modul_id", "benutzer_id");



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modul_rechte"
    ADD CONSTRAINT "modul_rechte_pkey" PRIMARY KEY ("verein_id", "modul", "rolle");



ALTER TABLE ONLY "public"."modul_rollen"
    ADD CONSTRAINT "modul_rollen_modul_id_rolle_key" UNIQUE ("modul_id", "role");



ALTER TABLE ONLY "public"."modul_rollen"
    ADD CONSTRAINT "modul_rollen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_berechtigungen"
    ADD CONSTRAINT "module_berechtigungen_modul_id_role_key" UNIQUE ("modul_id", "role");



ALTER TABLE ONLY "public"."module_berechtigungen"
    ADD CONSTRAINT "module_berechtigungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_config"
    ADD CONSTRAINT "module_config_pkey" PRIMARY KEY ("verein_id", "modul");



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_modul_id_benutzer_id_key" UNIQUE ("modul_id", "benutzer_id");



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module"
    ADD CONSTRAINT "module_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module"
    ADD CONSTRAINT "module_verein_key_key" UNIQUE ("verein_id", "key");



ALTER TABLE ONLY "public"."nachrichten_antworten"
    ADD CONSTRAINT "nachrichten_antworten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nachrichten_dateien"
    ADD CONSTRAINT "nachrichten_dateien_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nachrichten_gelesen"
    ADD CONSTRAINT "nachrichten_gelesen_pkey" PRIMARY KEY ("nachricht_id", "user_id");



ALTER TABLE ONLY "public"."nachrichten"
    ADD CONSTRAINT "nachrichten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_kategorien"
    ADD CONSTRAINT "news_kategorien_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_lesestatus"
    ADD CONSTRAINT "news_lesestatus_news_id_benutzer_id_key" UNIQUE ("news_id", "benutzer_id");



ALTER TABLE ONLY "public"."news_lesestatus"
    ADD CONSTRAINT "news_lesestatus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personen"
    ADD CONSTRAINT "personen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personenart_pro_person"
    ADD CONSTRAINT "personenart_pro_person_key" UNIQUE ("verein_id", "person_id", "art_id");



ALTER TABLE ONLY "public"."personenart_pro_person"
    ADD CONSTRAINT "personenart_pro_person_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personenarten"
    ADD CONSTRAINT "personenarten_id_verein_key" UNIQUE ("id", "verein_id");



ALTER TABLE ONLY "public"."personenarten"
    ADD CONSTRAINT "personenarten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personenarten"
    ADD CONSTRAINT "personenarten_verein_name_key" UNIQUE ("verein_id", "name");



ALTER TABLE ONLY "public"."portal_einstellungen"
    ADD CONSTRAINT "portal_einstellungen_pkey" PRIMARY KEY ("verein_id", "schluessel");



ALTER TABLE ONLY "public"."portal_funktionen"
    ADD CONSTRAINT "portal_funktionen_name_gruppe_id_key" UNIQUE ("name", "gruppe_id");



ALTER TABLE ONLY "public"."portal_funktionen"
    ADD CONSTRAINT "portal_funktionen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_gruppen"
    ADD CONSTRAINT "portal_gruppen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_gruppen_teams"
    ADD CONSTRAINT "portal_gruppen_teams_gruppe_id_team_id_key" UNIQUE ("gruppe_id", "team_id");



ALTER TABLE ONLY "public"."portal_gruppen_teams"
    ADD CONSTRAINT "portal_gruppen_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_gruppen"
    ADD CONSTRAINT "portal_gruppen_verein_name_key" UNIQUE ("verein_id", "name");



ALTER TABLE ONLY "public"."portal_rollen"
    ADD CONSTRAINT "portal_rollen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_rollen"
    ADD CONSTRAINT "portal_rollen_verein_name_key" UNIQUE ("verein_id", "name");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ranglisten"
    ADD CONSTRAINT "ranglisten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ranglisten"
    ADD CONSTRAINT "ranglisten_verein_zeile_key" UNIQUE ("verein_id", "sfv_saison_id", "sfv_liga_id", "sfv_division_id", "sfv_gruppe_id", "sfv_team_id");



ALTER TABLE ONLY "public"."rolle_pflichtfelder"
    ADD CONSTRAINT "rolle_pflichtfelder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rolle_pflichtfelder"
    ADD CONSTRAINT "rolle_pflichtfelder_verein_key" UNIQUE ("verein_id", "rolle", "feld");



ALTER TABLE ONLY "public"."rollen"
    ADD CONSTRAINT "rollen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rollen"
    ADD CONSTRAINT "rollen_verein_name_key" UNIQUE ("verein_id", "name");



ALTER TABLE ONLY "public"."sfv_team_logos"
    ADD CONSTRAINT "sfv_team_logos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sfv_team_logos"
    ADD CONSTRAINT "sfv_team_logos_verein_key" UNIQUE ("verein_id", "sfv_team_id");



ALTER TABLE ONLY "public"."sfv_zuordnung"
    ADD CONSTRAINT "sfv_zuordnung_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sfv_zuordnung"
    ADD CONSTRAINT "sfv_zuordnung_verein_key" UNIQUE ("verein_id", "sfv_person_id");



ALTER TABLE ONLY "public"."spiel_aufstellung"
    ADD CONSTRAINT "spiel_aufstellung_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spiel_aufstellung"
    ADD CONSTRAINT "spiel_aufstellung_verein_key" UNIQUE ("verein_id", "spiel_id", "sfv_person_id");



ALTER TABLE ONLY "public"."spiel_ereignisse"
    ADD CONSTRAINT "spiel_ereignisse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spiel_ereignisse"
    ADD CONSTRAINT "spiel_ereignisse_sfv_event_key" UNIQUE ("verein_id", "sfv_event_id");



COMMENT ON CONSTRAINT "spiel_ereignisse_sfv_event_key" ON "public"."spiel_ereignisse" IS 'Eine SFV-Zeile je Ereignis. BEWUSST NICHT partiell: ein partieller Index laesst sich von ON CONFLICT (spalten) nicht ableiten, und PostgREST kann das noetige Praedikat nicht mitgeben. Vereins-Zeilen tragen sfv_event_id = NULL und kollidieren nie, weil NULL in einem Unique-Index als verschieden gilt.';



ALTER TABLE ONLY "public"."spiele"
    ADD CONSTRAINT "spiele_id_verein_key" UNIQUE ("id", "verein_id");



ALTER TABLE ONLY "public"."spiele"
    ADD CONSTRAINT "spiele_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spiele"
    ADD CONSTRAINT "spiele_verein_sfv_match_key" UNIQUE ("verein_id", "sfv_match_id");



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_aufgabe_person_key" UNIQUE ("aufgabe_id", "person_id");



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_helferaufgaben"
    ADD CONSTRAINT "team_helferaufgaben_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_module"
    ADD CONSTRAINT "team_module_pkey" PRIMARY KEY ("team_id", "modul");



ALTER TABLE ONLY "public"."team_stufen"
    ADD CONSTRAINT "team_stufen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_verein_sfv_team_key" UNIQUE ("verein_id", "sfv_team_id");



ALTER TABLE ONLY "public"."termine"
    ADD CONSTRAINT "termine_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplaetze"
    ADD CONSTRAINT "trainingsplaetze_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplaetze"
    ADD CONSTRAINT "trainingsplaetze_verein_name_key" UNIQUE ("verein_id", "name");



ALTER TABLE ONLY "public"."trainingsplan_ausnahmen"
    ADD CONSTRAINT "trainingsplan_ausnahmen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplan_slots"
    ADD CONSTRAINT "trainingsplan_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplan_vorlagen"
    ADD CONSTRAINT "trainingsplan_vorlagen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vereine"
    ADD CONSTRAINT "vereine_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vereine"
    ADD CONSTRAINT "vereine_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."wiki_artikel"
    ADD CONSTRAINT "wiki_artikel_pkey" PRIMARY KEY ("id");



CREATE INDEX "benutzer_ist_admin_idx" ON "public"."benutzer" USING "btree" ("verein_id") WHERE "ist_admin";



CREATE INDEX "benutzer_person_idx" ON "public"."benutzer" USING "btree" ("person_id");



CREATE UNIQUE INDEX "eltern_kinder_ein_hauptkontakt" ON "public"."eltern_kinder" USING "btree" ("mitglied_id") WHERE "hauptkontakt";



CREATE INDEX "eltern_kinder_person_idx" ON "public"."eltern_kinder" USING "btree" ("person_id");



CREATE UNIQUE INDEX "eltern_kinder_person_mitglied_key" ON "public"."eltern_kinder" USING "btree" ("verein_id", "person_id", "mitglied_id");



CREATE INDEX "idx_anwesenheiten_event" ON "public"."anwesenheiten" USING "btree" ("event_type", "event_id");



CREATE INDEX "idx_anwesenheiten_mitglied" ON "public"."anwesenheiten" USING "btree" ("mitglied_id");



CREATE INDEX "idx_ausnahmen_kw_typ" ON "public"."trainingsplan_ausnahmen" USING "btree" ("week_nr", "year", "type");



CREATE INDEX "idx_ausnahmen_slot_kw" ON "public"."trainingsplan_ausnahmen" USING "btree" ("slot_id", "week_nr", "year");



CREATE INDEX "idx_benachricht_benutzer" ON "public"."benachrichtigungen" USING "btree" ("benutzer_id", "gelesen");



CREATE INDEX "idx_benutzer_aktiv" ON "public"."benutzer" USING "btree" ("aktiv");



CREATE INDEX "idx_benutzer_mitglied" ON "public"."benutzer" USING "btree" ("mitglied_id");



CREATE INDEX "idx_benutzer_verein" ON "public"."benutzer" USING "btree" ("verein_id");



CREATE INDEX "idx_bf_bid" ON "public"."benutzer_funktionen" USING "btree" ("benutzer_id");



CREATE INDEX "idx_bf_fid" ON "public"."benutzer_funktionen" USING "btree" ("funktion_id");



CREATE INDEX "idx_helper_zuteilungen_person" ON "public"."helper_zuteilungen" USING "btree" ("person_id");



CREATE INDEX "idx_kader_verein" ON "public"."kader" USING "btree" ("verein_id");



CREATE INDEX "idx_mitglieder_aktiv" ON "public"."mitglieder" USING "btree" ("aktiv");



CREATE INDEX "idx_mitglieder_ansichten_benutzer" ON "public"."mitglieder_ansichten" USING "btree" ("benutzer_id");



CREATE INDEX "idx_mitglieder_ansichten_verein" ON "public"."mitglieder_ansichten" USING "btree" ("verein_id");



CREATE INDEX "idx_mitglieder_fairgate" ON "public"."mitglieder" USING "btree" ("fairgate_id");



CREATE INDEX "idx_mitglieder_rolle" ON "public"."mitglieder" USING "btree" ("rolle");



CREATE INDEX "idx_mitglieder_verein" ON "public"."mitglieder" USING "btree" ("verein_id");



CREATE INDEX "idx_modul_rechte_verein" ON "public"."modul_rechte" USING "btree" ("verein_id");



CREATE INDEX "idx_mtd_mitglied" ON "public"."mitglieder_team_details" USING "btree" ("mitglied_id");



CREATE INDEX "idx_nachrichten_verein" ON "public"."nachrichten" USING "btree" ("verein_id");



CREATE INDEX "idx_news_publiziert" ON "public"."news" USING "btree" ("publiziert");



CREATE INDEX "idx_portal_einstellungen_verein" ON "public"."portal_einstellungen" USING "btree" ("verein_id");



CREATE INDEX "idx_ranglisten_gruppe" ON "public"."ranglisten" USING "btree" ("verein_id", "sfv_saison_id", "sfv_liga_id", "sfv_gruppe_id");



CREATE INDEX "idx_ranglisten_verein" ON "public"."ranglisten" USING "btree" ("verein_id");



CREATE INDEX "idx_slots_gueltig_ab" ON "public"."trainingsplan_slots" USING "btree" ("valid_from_week_year", "valid_from_week_nr");



CREATE INDEX "idx_slots_vorlage" ON "public"."trainingsplan_slots" USING "btree" ("template_id");



CREATE INDEX "idx_slots_wochentag" ON "public"."trainingsplan_slots" USING "btree" ("weekday");



CREATE INDEX "idx_spiele_datum" ON "public"."spiele" USING "btree" ("date");



CREATE INDEX "idx_spiele_sfv_saison" ON "public"."spiele" USING "btree" ("verein_id", "sfv_saison_id");



CREATE INDEX "idx_spiele_sfv_team" ON "public"."spiele" USING "btree" ("sfv_team_id");



CREATE INDEX "idx_spiele_team" ON "public"."spiele" USING "btree" ("team");



CREATE INDEX "idx_spiele_verein" ON "public"."spiele" USING "btree" ("verein_id");



CREATE INDEX "idx_stufen_ebene" ON "public"."team_stufen" USING "btree" ("ebene");



CREATE INDEX "idx_stufen_parent" ON "public"."team_stufen" USING "btree" ("parent_id");



CREATE INDEX "idx_team_helfer_zuteilungen_person" ON "public"."team_helfer_zuteilungen" USING "btree" ("person_id");



CREATE INDEX "idx_teams_aktiv" ON "public"."teams" USING "btree" ("aktiv");



CREATE INDEX "idx_teams_kategorie" ON "public"."teams" USING "btree" ("kategorie");



CREATE INDEX "idx_teams_verein" ON "public"."teams" USING "btree" ("verein_id");



CREATE INDEX "idx_termine_verein" ON "public"."termine" USING "btree" ("verein_id");



CREATE INDEX "idx_trainings_datum" ON "public"."trainings" USING "btree" ("date");



CREATE INDEX "idx_trainings_slot_id" ON "public"."trainings" USING "btree" ("trainingsplan_slot_id");



CREATE INDEX "idx_trainings_team" ON "public"."trainings" USING "btree" ("team");



CREATE INDEX "idx_trainings_verein" ON "public"."trainings" USING "btree" ("verein_id");



CREATE INDEX "mitglieder_aenderungen_mitglied_idx" ON "public"."mitglieder_aenderungen" USING "btree" ("mitglied_id", "geaendert_at" DESC);



CREATE INDEX "mitglieder_aenderungen_person_idx" ON "public"."mitglieder_aenderungen" USING "btree" ("person_id");



CREATE INDEX "mitglieder_aktivitaeten_mitglied_idx" ON "public"."mitglieder_aktivitaeten" USING "btree" ("mitglied_id", "geaendert_at" DESC);



CREATE INDEX "mitglieder_aktivitaeten_person_idx" ON "public"."mitglieder_aktivitaeten" USING "btree" ("person_id");



CREATE UNIQUE INDEX "mitglieder_eine_aktive_mitgliedschaft" ON "public"."mitglieder" USING "btree" ("person_id") WHERE "aktiv";



COMMENT ON INDEX "public"."mitglieder_eine_aktive_mitgliedschaft" IS 'Eine aktive Mitgliedschaft pro Person. Aktivmitglied und Supporter schliessen sich aus; beim Wechsel muss die alte auf aktiv = false. Archivierte Mitgliedschaften sind beliebig viele — sie sind die Historie.';



CREATE INDEX "mitglieder_notizen_person_idx" ON "public"."mitglieder_notizen" USING "btree" ("person_id");



CREATE INDEX "mitglieder_person_idx" ON "public"."mitglieder" USING "btree" ("person_id");



CREATE UNIQUE INDEX "mitglieder_spielerpass_aktiv_key" ON "public"."mitglieder" USING "btree" ("verein_id", "spielerpass") WHERE ("aktiv" AND ("spielerpass" IS NOT NULL) AND ("btrim"("spielerpass") <> ''::"text"));



CREATE INDEX "mitgliedtyp_feldkonfig_art_idx" ON "public"."mitgliedtyp_feldkonfig" USING "btree" ("art_id");



CREATE UNIQUE INDEX "personen_email_pro_verein" ON "public"."personen" USING "btree" ("verein_id", "lower"("btrim"("email"))) WHERE (("email" IS NOT NULL) AND ("btrim"("email") <> ''::"text"));



CREATE INDEX "personen_geprueft_idx" ON "public"."personen" USING "btree" ("profil_geprueft_at");



CREATE INDEX "personen_nachname_idx" ON "public"."personen" USING "btree" ("verein_id", "nachname");



CREATE INDEX "personen_verein_idx" ON "public"."personen" USING "btree" ("verein_id");



CREATE INDEX "personenart_pro_person_art_idx" ON "public"."personenart_pro_person" USING "btree" ("art_id");



CREATE INDEX "personenart_pro_person_person_idx" ON "public"."personenart_pro_person" USING "btree" ("person_id");



CREATE INDEX "sfv_team_logos_verein_idx" ON "public"."sfv_team_logos" USING "btree" ("verein_id");



CREATE INDEX "sfv_zuordnung_mitglied_idx" ON "public"."sfv_zuordnung" USING "btree" ("mitglied_id");



CREATE INDEX "spiel_ereignisse_ersetzt_idx" ON "public"."spiel_ereignisse" USING "btree" ("ersetzt_ereignis_id") WHERE ("ersetzt_ereignis_id" IS NOT NULL);



CREATE INDEX "spiel_ereignisse_spiel_idx" ON "public"."spiel_ereignisse" USING "btree" ("verein_id", "spiel_id");



CREATE OR REPLACE TRIGGER "mc_updated_at" BEFORE UPDATE ON "public"."module_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "mitglieder_updated_at" BEFORE UPDATE ON "public"."mitglieder" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "mr_updated_at" BEFORE UPDATE ON "public"."modul_rechte" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "pe_ts" BEFORE UPDATE ON "public"."portal_einstellungen" FOR EACH ROW EXECUTE FUNCTION "public"."pe_updated_at"();



CREATE OR REPLACE TRIGGER "personen_updated_at" BEFORE UPDATE ON "public"."personen" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_add_eltern_rolle" AFTER UPDATE OF "benutzer_id" ON "public"."elternkontakte" FOR EACH ROW EXECUTE FUNCTION "public"."add_eltern_rolle"();



CREATE OR REPLACE TRIGGER "vereine_updated_at" BEFORE UPDATE ON "public"."vereine" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "wiki_updated_at" BEFORE UPDATE ON "public"."wiki_artikel" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."abstimmung_antworten"
    ADD CONSTRAINT "abstimmung_antworten_abstimmung_id_fkey" FOREIGN KEY ("abstimmung_id") REFERENCES "public"."abstimmungen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abstimmung_antworten"
    ADD CONSTRAINT "abstimmung_antworten_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."abstimmung_antworten"
    ADD CONSTRAINT "abstimmung_antworten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."abstimmungen"
    ADD CONSTRAINT "abstimmungen_erstellt_von_fkey" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."abstimmungen"
    ADD CONSTRAINT "abstimmungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_mitglied_fkey" FOREIGN KEY ("mitglied_id", "verein_id") REFERENCES "public"."mitglieder"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_gestartet_von_fkey" FOREIGN KEY ("gestartet_von") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_verbindung_id_fkey" FOREIGN KEY ("verbindung_id") REFERENCES "public"."api_verbindungen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."api_verbindungen"
    ADD CONSTRAINT "api_verbindungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."aufgebote"
    ADD CONSTRAINT "aufgebote_spiel_id_fkey" FOREIGN KEY ("spiel_id") REFERENCES "public"."spiele"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aufgebote"
    ADD CONSTRAINT "aufgebote_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."benachrichtigungen"
    ADD CONSTRAINT "benachrichtigungen_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."benachrichtigungen"
    ADD CONSTRAINT "benachrichtigungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."benutzer_funktionen"
    ADD CONSTRAINT "benutzer_funktionen_funktion_id_fkey" FOREIGN KEY ("funktion_id") REFERENCES "public"."portal_funktionen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."benutzer_funktionen"
    ADD CONSTRAINT "benutzer_funktionen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."benutzer"
    ADD CONSTRAINT "benutzer_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."benutzer"
    ADD CONSTRAINT "benutzer_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id");



ALTER TABLE ONLY "public"."benutzer_teams"
    ADD CONSTRAINT "benutzer_teams_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."benutzer_teams"
    ADD CONSTRAINT "benutzer_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."benutzer_teams"
    ADD CONSTRAINT "benutzer_teams_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."benutzer"
    ADD CONSTRAINT "benutzer_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."bus_anmeldungen"
    ADD CONSTRAINT "bus_anmeldungen_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "public"."busse"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bus_anmeldungen"
    ADD CONSTRAINT "bus_anmeldungen_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."bus_anmeldungen"
    ADD CONSTRAINT "bus_anmeldungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."busse"
    ADD CONSTRAINT "busse_spiel_id_fkey" FOREIGN KEY ("spiel_id") REFERENCES "public"."spiele"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."busse"
    ADD CONSTRAINT "busse_termin_id_fkey" FOREIGN KEY ("termin_id") REFERENCES "public"."termine"("id");



ALTER TABLE ONLY "public"."busse"
    ADD CONSTRAINT "busse_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."dokumente"
    ADD CONSTRAINT "dokumente_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."dokumente"
    ADD CONSTRAINT "dokumente_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."eltern_kinder"
    ADD CONSTRAINT "eltern_kinder_eltern_id_fkey" FOREIGN KEY ("eltern_id") REFERENCES "public"."elternkontakte"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eltern_kinder"
    ADD CONSTRAINT "eltern_kinder_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eltern_kinder"
    ADD CONSTRAINT "eltern_kinder_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id");



ALTER TABLE ONLY "public"."eltern_kinder"
    ADD CONSTRAINT "eltern_kinder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."feldsichtbarkeit"
    ADD CONSTRAINT "feldsichtbarkeit_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feldsichtbarkeit"
    ADD CONSTRAINT "feldsichtbarkeit_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."benutzer"
    ADD CONSTRAINT "fk_benutzer_mitglied" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "fk_notizen_autor" FOREIGN KEY ("autor_id") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."helper_einsaetze"
    ADD CONSTRAINT "helper_einsaetze_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."helper_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."helper_einsaetze"
    ADD CONSTRAINT "helper_einsaetze_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht_mitglied"
    ADD CONSTRAINT "helper_einsatz_pflicht_mitglied_gesetzt_von_fkey" FOREIGN KEY ("gesetzt_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht_mitglied"
    ADD CONSTRAINT "helper_einsatz_pflicht_mitglied_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht"
    ADD CONSTRAINT "helper_einsatz_pflicht_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."helper_events"
    ADD CONSTRAINT "helper_events_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht_mitglied"
    ADD CONSTRAINT "helper_pflicht_m_mitglied_fkey" FOREIGN KEY ("mitglied_id", "verein_id") REFERENCES "public"."mitglieder"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."helper_schichten"
    ADD CONSTRAINT "helper_schichten_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "public"."helper_einsaetze"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."helper_schichten"
    ADD CONSTRAINT "helper_schichten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_person_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_schicht_id_fkey" FOREIGN KEY ("schicht_id") REFERENCES "public"."helper_schichten"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."kader"
    ADD CONSTRAINT "kader_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kader_rollen"
    ADD CONSTRAINT "kader_rollen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."kader"
    ADD CONSTRAINT "kader_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kader"
    ADD CONSTRAINT "kader_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."kommunikationsgruppen_mitglieder"
    ADD CONSTRAINT "kommunikationsgruppen_mitglieder_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kommunikationsgruppen_mitglieder"
    ADD CONSTRAINT "kommunikationsgruppen_mitglieder_gruppe_id_fkey" FOREIGN KEY ("gruppe_id") REFERENCES "public"."kommunikationsgruppen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kommunikationsgruppen_mitglieder"
    ADD CONSTRAINT "kommunikationsgruppen_mitglieder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."kommunikationsgruppen"
    ADD CONSTRAINT "kommunikationsgruppen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."material_ausleihen"
    ADD CONSTRAINT "material_ausleihen_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id");



ALTER TABLE ONLY "public"."material_ausleihen"
    ADD CONSTRAINT "material_ausleihen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."material"
    ADD CONSTRAINT "material_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."medien"
    ADD CONSTRAINT "medien_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."medien"
    ADD CONSTRAINT "medien_spiel_id_fkey" FOREIGN KEY ("spiel_id") REFERENCES "public"."spiele"("id");



ALTER TABLE ONLY "public"."medien"
    ADD CONSTRAINT "medien_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitglieder_aenderungen"
    ADD CONSTRAINT "mitglieder_aenderungen_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mitglieder_aenderungen"
    ADD CONSTRAINT "mitglieder_aenderungen_person_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_aenderungen"
    ADD CONSTRAINT "mitglieder_aenderungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_aktivitaeten"
    ADD CONSTRAINT "mitglieder_aktivitaeten_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mitglieder_aktivitaeten"
    ADD CONSTRAINT "mitglieder_aktivitaeten_person_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_aktivitaeten"
    ADD CONSTRAINT "mitglieder_aktivitaeten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_ansichten"
    ADD CONSTRAINT "mitglieder_ansichten_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_ansichten"
    ADD CONSTRAINT "mitglieder_ansichten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_person_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id");



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitgliedtyp_feldkonfig"
    ADD CONSTRAINT "mitgliedtyp_feldkonfig_art_fkey" FOREIGN KEY ("art_id", "verein_id") REFERENCES "public"."personenarten"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitgliedtyp_feldkonfig"
    ADD CONSTRAINT "mitgliedtyp_feldkonfig_typ_fkey" FOREIGN KEY ("mitgliedtyp_id", "verein_id") REFERENCES "public"."mitgliedtypen"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitgliedtyp_feldkonfig"
    ADD CONSTRAINT "mitgliedtyp_feldkonfig_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitgliedtyp_pflichtfelder"
    ADD CONSTRAINT "mitgliedtyp_pflichtfelder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitgliedtypen"
    ADD CONSTRAINT "mitgliedtypen_standard_rolle_fkey" FOREIGN KEY ("verein_id", "standard_rolle") REFERENCES "public"."portal_rollen"("verein_id", "name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mitgliedtypen"
    ADD CONSTRAINT "mitgliedtypen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_gesetzt_von_fkey" FOREIGN KEY ("gesetzt_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_modul_id_fkey" FOREIGN KEY ("modul_id") REFERENCES "public"."module"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."modul_rechte"
    ADD CONSTRAINT "modul_rechte_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."modul_rollen"
    ADD CONSTRAINT "modul_rollen_modul_id_fkey" FOREIGN KEY ("modul_id") REFERENCES "public"."module"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modul_rollen"
    ADD CONSTRAINT "modul_rollen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."module_berechtigungen"
    ADD CONSTRAINT "module_berechtigungen_modul_id_fkey" FOREIGN KEY ("modul_id") REFERENCES "public"."module"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_berechtigungen"
    ADD CONSTRAINT "module_berechtigungen_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."module_berechtigungen"
    ADD CONSTRAINT "module_berechtigungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."module_config"
    ADD CONSTRAINT "module_config_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_delegiert_von_fkey" FOREIGN KEY ("delegiert_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_modul_id_fkey" FOREIGN KEY ("modul_id") REFERENCES "public"."module"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."module"
    ADD CONSTRAINT "module_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."nachrichten_antworten"
    ADD CONSTRAINT "nachrichten_antworten_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nachrichten_antworten"
    ADD CONSTRAINT "nachrichten_antworten_nachricht_id_fkey" FOREIGN KEY ("nachricht_id") REFERENCES "public"."nachrichten"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nachrichten_antworten"
    ADD CONSTRAINT "nachrichten_antworten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."nachrichten"
    ADD CONSTRAINT "nachrichten_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nachrichten_dateien"
    ADD CONSTRAINT "nachrichten_dateien_nachricht_id_fkey" FOREIGN KEY ("nachricht_id") REFERENCES "public"."nachrichten"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nachrichten_dateien"
    ADD CONSTRAINT "nachrichten_dateien_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."nachrichten"
    ADD CONSTRAINT "nachrichten_empfaenger_gruppe_id_fkey" FOREIGN KEY ("empfaenger_gruppe_id") REFERENCES "public"."portal_gruppen"("id");



ALTER TABLE ONLY "public"."nachrichten_gelesen"
    ADD CONSTRAINT "nachrichten_gelesen_nachricht_id_fkey" FOREIGN KEY ("nachricht_id") REFERENCES "public"."nachrichten"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nachrichten_gelesen"
    ADD CONSTRAINT "nachrichten_gelesen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nachrichten_gelesen"
    ADD CONSTRAINT "nachrichten_gelesen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."nachrichten"
    ADD CONSTRAINT "nachrichten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_kategorie_id_fkey" FOREIGN KEY ("kategorie_id") REFERENCES "public"."news_kategorien"("id");



ALTER TABLE ONLY "public"."news_kategorien"
    ADD CONSTRAINT "news_kategorien_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."news_lesestatus"
    ADD CONSTRAINT "news_lesestatus_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_lesestatus"
    ADD CONSTRAINT "news_lesestatus_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_lesestatus"
    ADD CONSTRAINT "news_lesestatus_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."personen"
    ADD CONSTRAINT "personen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."personenart_pro_person"
    ADD CONSTRAINT "personenart_pro_person_art_fkey" FOREIGN KEY ("art_id", "verein_id") REFERENCES "public"."personenarten"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personenart_pro_person"
    ADD CONSTRAINT "personenart_pro_person_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personenart_pro_person"
    ADD CONSTRAINT "personenart_pro_person_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."personenarten"
    ADD CONSTRAINT "personenarten_standard_rolle_fkey" FOREIGN KEY ("verein_id", "standard_rolle") REFERENCES "public"."portal_rollen"("verein_id", "name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."personenarten"
    ADD CONSTRAINT "personenarten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."portal_einstellungen"
    ADD CONSTRAINT "portal_einstellungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."portal_funktionen"
    ADD CONSTRAINT "portal_funktionen_gruppe_id_fkey" FOREIGN KEY ("gruppe_id") REFERENCES "public"."portal_gruppen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_funktionen"
    ADD CONSTRAINT "portal_funktionen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."portal_gruppen_teams"
    ADD CONSTRAINT "portal_gruppen_teams_gruppe_id_fkey" FOREIGN KEY ("gruppe_id") REFERENCES "public"."portal_gruppen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_gruppen_teams"
    ADD CONSTRAINT "portal_gruppen_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_gruppen_teams"
    ADD CONSTRAINT "portal_gruppen_teams_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."portal_gruppen"
    ADD CONSTRAINT "portal_gruppen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."portal_rollen"
    ADD CONSTRAINT "portal_rollen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."ranglisten"
    ADD CONSTRAINT "ranglisten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."rolle_pflichtfelder"
    ADD CONSTRAINT "rolle_pflichtfelder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."rollen"
    ADD CONSTRAINT "rollen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."sfv_team_logos"
    ADD CONSTRAINT "sfv_team_logos_verein_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."sfv_zuordnung"
    ADD CONSTRAINT "sfv_zuordnung_mitglied_fkey" FOREIGN KEY ("mitglied_id", "verein_id") REFERENCES "public"."mitglieder"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sfv_zuordnung"
    ADD CONSTRAINT "sfv_zuordnung_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."sfv_zuordnung"
    ADD CONSTRAINT "sfv_zuordnung_zugeordnet_von_fkey" FOREIGN KEY ("zugeordnet_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."spiel_aufstellung"
    ADD CONSTRAINT "spiel_aufstellung_spiel_fkey" FOREIGN KEY ("spiel_id", "verein_id") REFERENCES "public"."spiele"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spiel_aufstellung"
    ADD CONSTRAINT "spiel_aufstellung_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."spiel_ereignisse"
    ADD CONSTRAINT "spiel_ereignisse_ersetzt_ereignis_id_fkey" FOREIGN KEY ("ersetzt_ereignis_id") REFERENCES "public"."spiel_ereignisse"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spiel_ereignisse"
    ADD CONSTRAINT "spiel_ereignisse_korrigiert_von_fkey" FOREIGN KEY ("korrigiert_von") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."spiel_ereignisse"
    ADD CONSTRAINT "spiel_ereignisse_spiel_fkey" FOREIGN KEY ("spiel_id", "verein_id") REFERENCES "public"."spiele"("id", "verein_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spiel_ereignisse"
    ADD CONSTRAINT "spiel_ereignisse_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."spiele"
    ADD CONSTRAINT "spiele_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_aufgabe_id_fkey" FOREIGN KEY ("aufgabe_id") REFERENCES "public"."team_helferaufgaben"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_person_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."team_helferaufgaben"
    ADD CONSTRAINT "team_helferaufgaben_erstellt_von_fkey" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."team_helferaufgaben"
    ADD CONSTRAINT "team_helferaufgaben_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."team_module"
    ADD CONSTRAINT "team_module_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_module"
    ADD CONSTRAINT "team_module_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."team_stufen"
    ADD CONSTRAINT "team_stufen_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."team_stufen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_stufen"
    ADD CONSTRAINT "team_stufen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_stufe_id_fkey" FOREIGN KEY ("stufe_id") REFERENCES "public"."team_stufen"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."termine"
    ADD CONSTRAINT "termine_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_trainingsplan_slot_id_fkey" FOREIGN KEY ("trainingsplan_slot_id") REFERENCES "public"."trainingsplan_slots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."trainingsplaetze"
    ADD CONSTRAINT "trainingsplaetze_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."trainingsplan_ausnahmen"
    ADD CONSTRAINT "trainingsplan_ausnahmen_erstellt_von_fkey" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."trainingsplan_ausnahmen"
    ADD CONSTRAINT "trainingsplan_ausnahmen_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."trainingsplan_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainingsplan_ausnahmen"
    ADD CONSTRAINT "trainingsplan_ausnahmen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."trainingsplan_slots"
    ADD CONSTRAINT "trainingsplan_slots_end_platz_id_fkey" FOREIGN KEY ("end_platz_id") REFERENCES "public"."trainingsplaetze"("id");



ALTER TABLE ONLY "public"."trainingsplan_slots"
    ADD CONSTRAINT "trainingsplan_slots_platz_id_fkey" FOREIGN KEY ("platz_id") REFERENCES "public"."trainingsplaetze"("id");



ALTER TABLE ONLY "public"."trainingsplan_slots"
    ADD CONSTRAINT "trainingsplan_slots_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."trainingsplan_slots"
    ADD CONSTRAINT "trainingsplan_slots_vorlage_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."trainingsplan_vorlagen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainingsplan_vorlagen"
    ADD CONSTRAINT "trainingsplan_vorlagen_erstellt_von_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."benutzer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trainingsplan_vorlagen"
    ADD CONSTRAINT "trainingsplan_vorlagen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."vereine"
    ADD CONSTRAINT "vereine_austritt_art_fkey" FOREIGN KEY ("austritt_art_id", "id") REFERENCES "public"."personenarten"("id", "verein_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wiki_artikel"
    ADD CONSTRAINT "wiki_artikel_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."wiki_artikel"
    ADD CONSTRAINT "wiki_artikel_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE "public"."_etappe6_altspalten_mitglieder" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_etappe6b_position_mitglieder" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_etappe6c_altspalten_mitglieder" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_supporter_rueckbau_aenderungen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_supporter_rueckbau_aktivitaeten" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_supporter_rueckbau_mitglieder" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_supporter_rueckbau_notizen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."abstimmung_antworten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "abstimmung_antworten_select" ON "public"."abstimmung_antworten" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "abstimmung_antworten_write" ON "public"."abstimmung_antworten" USING (("verein_id" = "public"."get_my_verein_id"()));



ALTER TABLE "public"."abstimmungen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "abstimmungen_select" ON "public"."abstimmungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "abstimmungen_write" ON "public"."abstimmungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "admin_all" ON "public"."mitglieder_aenderungen" TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "public"."get_my_verein_id"() AS "get_my_verein_id") = "verein_id"))) WITH CHECK ((( SELECT "public"."get_my_verein_id"() AS "get_my_verein_id") = "verein_id"));



CREATE POLICY "admin_all" ON "public"."mitglieder_aktivitaeten" TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "public"."get_my_verein_id"() AS "get_my_verein_id") = "verein_id"))) WITH CHECK ((( SELECT "public"."get_my_verein_id"() AS "get_my_verein_id") = "verein_id"));



CREATE POLICY "ansichten_select" ON "public"."mitglieder_ansichten" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("benutzer_id" = "auth"."uid"()) OR ("geteilt" = true) OR "public"."is_admin"())));



CREATE POLICY "ansichten_write" ON "public"."mitglieder_ansichten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("benutzer_id" = "auth"."uid"()) OR "public"."is_admin"())));



ALTER TABLE "public"."anwesenheiten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anwesenheiten_select" ON "public"."anwesenheiten" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("mitglied_id" = "public"."get_my_mitglied_id"()) OR ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"])))));



CREATE POLICY "anwesenheiten_write" ON "public"."anwesenheiten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("mitglied_id" = "public"."get_my_mitglied_id"()) OR ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text"])))));



ALTER TABLE "public"."api_sync_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_sync_log_select" ON "public"."api_sync_log" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "api_sync_log_write" ON "public"."api_sync_log" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."api_verbindungen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_verbindungen_select" ON "public"."api_verbindungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "api_verbindungen_write" ON "public"."api_verbindungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_insert" ON "public"."audit_log" FOR INSERT WITH CHECK (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "audit_log_select" ON "public"."audit_log" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."aufgebote" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "aufgebote_select" ON "public"."aufgebote" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "aufgebote_write" ON "public"."aufgebote" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text"]))));



ALTER TABLE "public"."benachrichtigungen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."benutzer" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "benutzer_delete_admin" ON "public"."benutzer" FOR DELETE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."benutzer_funktionen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "benutzer_funktionen_select" ON "public"."benutzer_funktionen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "benutzer_funktionen_write" ON "public"."benutzer_funktionen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "benutzer_insert_admin" ON "public"."benutzer" FOR INSERT WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "benutzer_select_admin" ON "public"."benutzer" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "benutzer_select_self" ON "public"."benutzer" FOR SELECT USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."benutzer_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "benutzer_teams_select" ON "public"."benutzer_teams" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "benutzer_teams_write" ON "public"."benutzer_teams" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "benutzer_update_admin" ON "public"."benutzer" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "benutzer_update_self" ON "public"."benutzer" FOR UPDATE USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."bus_anmeldungen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bus_anmeldungen_select" ON "public"."bus_anmeldungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "bus_anmeldungen_write" ON "public"."bus_anmeldungen" USING (("verein_id" = "public"."get_my_verein_id"()));



ALTER TABLE "public"."busse" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "busse_select" ON "public"."busse" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "busse_write" ON "public"."busse" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."dokumente" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dokumente_select" ON "public"."dokumente" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "dokumente_write" ON "public"."dokumente" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."eltern_kinder" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eltern_kinder_verein" ON "public"."eltern_kinder" USING (("verein_id" = "public"."get_my_verein_id"()));



ALTER TABLE "public"."elternkontakte" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "elternkontakte_select" ON "public"."elternkontakte" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."is_admin"() OR ("benutzer_id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['trainer'::"text", 'funktionaer'::"text"])))));



CREATE POLICY "elternkontakte_verein" ON "public"."elternkontakte" USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "elternkontakte_write" ON "public"."elternkontakte" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."feldsichtbarkeit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feldsichtbarkeit_select" ON "public"."feldsichtbarkeit" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "feldsichtbarkeit_write" ON "public"."feldsichtbarkeit" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."helper_einsaetze" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "helper_einsaetze_select" ON "public"."helper_einsaetze" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "helper_einsaetze_write" ON "public"."helper_einsaetze" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."helper_einsatz_pflicht" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."helper_einsatz_pflicht_mitglied" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "helper_einsatz_pflicht_select" ON "public"."helper_einsatz_pflicht" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "helper_einsatz_pflicht_write" ON "public"."helper_einsatz_pflicht" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."helper_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "helper_events_select" ON "public"."helper_events" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "helper_events_write" ON "public"."helper_events" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "helper_pflicht_m_select" ON "public"."helper_einsatz_pflicht_mitglied" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "helper_pflicht_m_write" ON "public"."helper_einsatz_pflicht_mitglied" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."helper_schichten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "helper_schichten_select" ON "public"."helper_schichten" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "helper_schichten_write" ON "public"."helper_schichten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."helper_zuteilungen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "helper_zuteilungen_select" ON "public"."helper_zuteilungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "helper_zuteilungen_write" ON "public"."helper_zuteilungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."kader" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kader_rollen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kader_rollen_select" ON "public"."kader_rollen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "kader_rollen_write" ON "public"."kader_rollen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "kader_select" ON "public"."kader" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "kader_write" ON "public"."kader" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text"]))));



ALTER TABLE "public"."kommunikationsgruppen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kommunikationsgruppen_mitglieder" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kommunikationsgruppen_mitglieder_select" ON "public"."kommunikationsgruppen_mitglieder" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "kommunikationsgruppen_mitglieder_write" ON "public"."kommunikationsgruppen_mitglieder" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "kommunikationsgruppen_select" ON "public"."kommunikationsgruppen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "kommunikationsgruppen_write" ON "public"."kommunikationsgruppen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."material" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_ausleihen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_ausleihen_select" ON "public"."material_ausleihen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "material_ausleihen_write" ON "public"."material_ausleihen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "material_select" ON "public"."material" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "material_write" ON "public"."material" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."medien" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "medien_select" ON "public"."medien" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "medien_write" ON "public"."medien" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."mitglieder" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mitglieder_aenderungen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mitglieder_aktivitaeten" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mitglieder_ansichten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitglieder_delete_admin" ON "public"."mitglieder" FOR DELETE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "mitglieder_insert_admin" ON "public"."mitglieder" FOR INSERT WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."mitglieder_notizen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitglieder_select_kind" ON "public"."mitglieder" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."mitglied_ist_mein_kind"("id")));



CREATE POLICY "mitglieder_select_priv" ON "public"."mitglieder" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "mitglieder_select_self" ON "public"."mitglieder" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("id" = "public"."get_my_mitglied_id"())));



ALTER TABLE "public"."mitglieder_team_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitglieder_team_details_select" ON "public"."mitglieder_team_details" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "mitglieder_team_details_write" ON "public"."mitglieder_team_details" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "mitglieder_update_admin" ON "public"."mitglieder" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "mitglieder_update_self" ON "public"."mitglieder" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("id" = "public"."get_my_mitglied_id"())));



ALTER TABLE "public"."mitgliedtyp_feldkonfig" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitgliedtyp_feldkonfig_select" ON "public"."mitgliedtyp_feldkonfig" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "mitgliedtyp_feldkonfig_write" ON "public"."mitgliedtyp_feldkonfig" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"())) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."mitgliedtyp_pflichtfelder" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitgliedtyp_pflichtfelder_select" ON "public"."mitgliedtyp_pflichtfelder" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "mitgliedtyp_pflichtfelder_write" ON "public"."mitgliedtyp_pflichtfelder" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."mitgliedtypen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitgliedtypen_select" ON "public"."mitgliedtypen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "mitgliedtypen_write" ON "public"."mitgliedtypen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."modul_benutzer" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modul_benutzer_select" ON "public"."modul_benutzer" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "modul_benutzer_write" ON "public"."modul_benutzer" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."modul_rechte" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modul_rechte_select" ON "public"."modul_rechte" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "modul_rechte_write" ON "public"."modul_rechte" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."modul_rollen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modul_rollen_select" ON "public"."modul_rollen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "modul_rollen_write" ON "public"."modul_rollen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."module" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."module_berechtigungen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_berechtigungen_select" ON "public"."module_berechtigungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "module_berechtigungen_write" ON "public"."module_berechtigungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."module_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_config_select" ON "public"."module_config" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "module_config_write" ON "public"."module_config" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."module_delegationen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_delegationen_select" ON "public"."module_delegationen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "module_delegationen_write" ON "public"."module_delegationen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "module_select" ON "public"."module" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "module_write" ON "public"."module" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."nachrichten" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nachrichten_antworten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nachrichten_antworten_select" ON "public"."nachrichten_antworten" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "nachrichten_antworten_write" ON "public"."nachrichten_antworten" USING (("verein_id" = "public"."get_my_verein_id"()));



ALTER TABLE "public"."nachrichten_dateien" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nachrichten_dateien_select" ON "public"."nachrichten_dateien" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "nachrichten_dateien_write" ON "public"."nachrichten_dateien" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."nachrichten_gelesen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nachrichten_gelesen_own" ON "public"."nachrichten_gelesen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "nachrichten_select" ON "public"."nachrichten" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "nachrichten_write" ON "public"."nachrichten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."news" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_kategorien" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "news_kategorien_select" ON "public"."news_kategorien" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "news_kategorien_write" ON "public"."news_kategorien" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."news_lesestatus" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "news_ls_own" ON "public"."news_lesestatus" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("benutzer_id" = "auth"."uid"())));



CREATE POLICY "news_select" ON "public"."news" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "news_write" ON "public"."news" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "notif_own" ON "public"."benachrichtigungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("benutzer_id" = "auth"."uid"())));



CREATE POLICY "notizen_select" ON "public"."mitglieder_notizen" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "notizen_write" ON "public"."mitglieder_notizen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text"]))));



ALTER TABLE "public"."personen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personen_delete_admin" ON "public"."personen" FOR DELETE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "personen_insert_admin" ON "public"."personen" FOR INSERT WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "personen_select_kind" ON "public"."personen" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."person_ist_mein_kind"("id")));



CREATE POLICY "personen_select_priv" ON "public"."personen" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "personen_select_self" ON "public"."personen" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("id" = "public"."get_my_person_id"())));



CREATE POLICY "personen_update_admin" ON "public"."personen" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "personen_update_kind" ON "public"."personen" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."person_ist_mein_kind"("id"))) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."person_ist_mein_kind"("id")));



CREATE POLICY "personen_update_self" ON "public"."personen" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("id" = "public"."get_my_person_id"())));



ALTER TABLE "public"."personenart_pro_person" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personenart_pro_person_select" ON "public"."personenart_pro_person" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "personenart_pro_person_write" ON "public"."personenart_pro_person" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"())) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."personenarten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personenarten_select" ON "public"."personenarten" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "personenarten_write" ON "public"."personenarten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"())) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."portal_einstellungen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_einstellungen_select" ON "public"."portal_einstellungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "portal_einstellungen_write" ON "public"."portal_einstellungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."portal_funktionen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_funktionen_select" ON "public"."portal_funktionen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "portal_funktionen_write" ON "public"."portal_funktionen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."portal_gruppen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_gruppen_select" ON "public"."portal_gruppen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



ALTER TABLE "public"."portal_gruppen_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_gruppen_teams_select" ON "public"."portal_gruppen_teams" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "portal_gruppen_teams_write" ON "public"."portal_gruppen_teams" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "portal_gruppen_write" ON "public"."portal_gruppen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."portal_rollen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_rollen_select" ON "public"."portal_rollen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "portal_rollen_write" ON "public"."portal_rollen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "public read vereine" ON "public"."vereine" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "push_own" ON "public"."push_subscriptions" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("benutzer_id" = "auth"."uid"())));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranglisten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ranglisten_select" ON "public"."ranglisten" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "ranglisten_write" ON "public"."ranglisten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"())) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."rolle_pflichtfelder" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rolle_pflichtfelder_select" ON "public"."rolle_pflichtfelder" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "rolle_pflichtfelder_write" ON "public"."rolle_pflichtfelder" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."rollen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rollen_select" ON "public"."rollen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "rollen_write" ON "public"."rollen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."sfv_team_logos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sfv_team_logos_select" ON "public"."sfv_team_logos" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



ALTER TABLE "public"."sfv_zuordnung" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sfv_zuordnung_select" ON "public"."sfv_zuordnung" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "sfv_zuordnung_write" ON "public"."sfv_zuordnung" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"())) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."spiel_aufstellung" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spiel_aufstellung_select" ON "public"."spiel_aufstellung" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "spiel_aufstellung_write" ON "public"."spiel_aufstellung" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"())) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."spiel_ereignisse" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spiel_ereignisse_select" ON "public"."spiel_ereignisse" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "spiel_ereignisse_write" ON "public"."spiel_ereignisse" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."is_admin"() OR ("public"."get_my_role"() = 'trainer'::"text") OR "public"."hat_modul_recht"('schedule'::"text", 'schreiben'::"text")))) WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."is_admin"() OR ("public"."get_my_role"() = 'trainer'::"text") OR "public"."hat_modul_recht"('schedule'::"text", 'schreiben'::"text"))));



ALTER TABLE "public"."spiele" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spiele_select" ON "public"."spiele" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "spiele_write" ON "public"."spiele" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "team_helfer_select" ON "public"."team_helfer_zuteilungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "team_helfer_write" ON "public"."team_helfer_zuteilungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."team_helfer_zuteilungen" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_helferaufgaben" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_helferaufgaben_select" ON "public"."team_helferaufgaben" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "team_helferaufgaben_write" ON "public"."team_helferaufgaben" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."team_module" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_module_select" ON "public"."team_module" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "team_module_write" ON "public"."team_module" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."team_stufen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_stufen_select" ON "public"."team_stufen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "team_stufen_write" ON "public"."team_stufen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_select" ON "public"."teams" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "teams_write" ON "public"."teams" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."termine" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "termine_select" ON "public"."termine" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "termine_write" ON "public"."termine" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."trainings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainings_select" ON "public"."trainings" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "trainings_write" ON "public"."trainings" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."trainingsplaetze" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainingsplaetze_select" ON "public"."trainingsplaetze" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "trainingsplaetze_write" ON "public"."trainingsplaetze" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."trainingsplan_ausnahmen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainingsplan_ausnahmen_select" ON "public"."trainingsplan_ausnahmen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "trainingsplan_ausnahmen_write" ON "public"."trainingsplan_ausnahmen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."trainingsplan_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainingsplan_slots_select" ON "public"."trainingsplan_slots" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "trainingsplan_slots_write" ON "public"."trainingsplan_slots" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."trainingsplan_vorlagen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainingsplan_vorlagen_select" ON "public"."trainingsplan_vorlagen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "trainingsplan_vorlagen_write" ON "public"."trainingsplan_vorlagen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



ALTER TABLE "public"."vereine" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vereine_select" ON "public"."vereine" FOR SELECT USING (("id" = "public"."get_my_verein_id"()));



CREATE POLICY "vereine_update" ON "public"."vereine" FOR UPDATE TO "authenticated" USING ((("id" = "public"."get_my_verein_id"()) AND "public"."is_admin"())) WITH CHECK ((("id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."wiki_artikel" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wiki_artikel_select" ON "public"."wiki_artikel" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "wiki_artikel_write" ON "public"."wiki_artikel" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."nachrichten";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."nachrichten_antworten";









REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON SCHEMA "public" TO PUBLIC;











































































































































































GRANT ALL ON FUNCTION "public"."add_eltern_rolle"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_eltern_rolle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_eltern_rolle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_bekannt"("p_email" "text", "p_verein_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_bekannt"("p_email" "text", "p_verein_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_bekannt"("p_email" "text", "p_verein_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_mitglied_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_mitglied_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_mitglied_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_person_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_person_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_person_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_verein_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_verein_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_verein_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hat_modul_recht"("p_modul" "text", "p_min_stufe" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hat_modul_recht"("p_modul" "text", "p_min_stufe" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hat_modul_recht"("p_modul" "text", "p_min_stufe" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_above"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_above"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_above"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_trainer_or_above"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_trainer_or_above"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_trainer_or_above"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mitglied_ist_mein_kind"("p_mitglied_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."mitglied_ist_mein_kind"("p_mitglied_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mitglied_ist_mein_kind"("p_mitglied_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."pe_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."pe_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pe_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."person_ist_mein_kind"("p_person_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."person_ist_mein_kind"("p_person_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."person_ist_mein_kind"("p_person_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."_etappe6_altspalten_mitglieder" TO "anon";
GRANT ALL ON TABLE "public"."_etappe6_altspalten_mitglieder" TO "authenticated";
GRANT ALL ON TABLE "public"."_etappe6_altspalten_mitglieder" TO "service_role";



GRANT ALL ON TABLE "public"."_etappe6b_position_mitglieder" TO "anon";
GRANT ALL ON TABLE "public"."_etappe6b_position_mitglieder" TO "authenticated";
GRANT ALL ON TABLE "public"."_etappe6b_position_mitglieder" TO "service_role";



GRANT ALL ON TABLE "public"."_etappe6c_altspalten_mitglieder" TO "anon";
GRANT ALL ON TABLE "public"."_etappe6c_altspalten_mitglieder" TO "authenticated";
GRANT ALL ON TABLE "public"."_etappe6c_altspalten_mitglieder" TO "service_role";



GRANT ALL ON TABLE "public"."_supporter_rueckbau_aenderungen" TO "anon";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_aenderungen" TO "authenticated";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_aenderungen" TO "service_role";



GRANT ALL ON TABLE "public"."_supporter_rueckbau_aktivitaeten" TO "anon";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_aktivitaeten" TO "authenticated";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_aktivitaeten" TO "service_role";



GRANT ALL ON TABLE "public"."_supporter_rueckbau_mitglieder" TO "anon";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_mitglieder" TO "authenticated";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_mitglieder" TO "service_role";



GRANT ALL ON TABLE "public"."_supporter_rueckbau_notizen" TO "anon";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_notizen" TO "authenticated";
GRANT ALL ON TABLE "public"."_supporter_rueckbau_notizen" TO "service_role";



GRANT ALL ON TABLE "public"."abstimmung_antworten" TO "anon";
GRANT ALL ON TABLE "public"."abstimmung_antworten" TO "authenticated";
GRANT ALL ON TABLE "public"."abstimmung_antworten" TO "service_role";



GRANT ALL ON TABLE "public"."abstimmungen" TO "anon";
GRANT ALL ON TABLE "public"."abstimmungen" TO "authenticated";
GRANT ALL ON TABLE "public"."abstimmungen" TO "service_role";



GRANT ALL ON TABLE "public"."anwesenheiten" TO "anon";
GRANT ALL ON TABLE "public"."anwesenheiten" TO "authenticated";
GRANT ALL ON TABLE "public"."anwesenheiten" TO "service_role";



GRANT ALL ON TABLE "public"."api_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."api_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."api_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."api_verbindungen" TO "anon";
GRANT ALL ON TABLE "public"."api_verbindungen" TO "authenticated";
GRANT ALL ON TABLE "public"."api_verbindungen" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."aufgebote" TO "anon";
GRANT ALL ON TABLE "public"."aufgebote" TO "authenticated";
GRANT ALL ON TABLE "public"."aufgebote" TO "service_role";



GRANT ALL ON TABLE "public"."benachrichtigungen" TO "anon";
GRANT ALL ON TABLE "public"."benachrichtigungen" TO "authenticated";
GRANT ALL ON TABLE "public"."benachrichtigungen" TO "service_role";



GRANT ALL ON TABLE "public"."benutzer" TO "anon";
GRANT ALL ON TABLE "public"."benutzer" TO "authenticated";
GRANT ALL ON TABLE "public"."benutzer" TO "service_role";



GRANT ALL ON TABLE "public"."benutzer_funktionen" TO "anon";
GRANT ALL ON TABLE "public"."benutzer_funktionen" TO "authenticated";
GRANT ALL ON TABLE "public"."benutzer_funktionen" TO "service_role";



GRANT ALL ON TABLE "public"."benutzer_teams" TO "anon";
GRANT ALL ON TABLE "public"."benutzer_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."benutzer_teams" TO "service_role";



GRANT ALL ON TABLE "public"."bus_anmeldungen" TO "anon";
GRANT ALL ON TABLE "public"."bus_anmeldungen" TO "authenticated";
GRANT ALL ON TABLE "public"."bus_anmeldungen" TO "service_role";



GRANT ALL ON TABLE "public"."busse" TO "anon";
GRANT ALL ON TABLE "public"."busse" TO "authenticated";
GRANT ALL ON TABLE "public"."busse" TO "service_role";



GRANT ALL ON TABLE "public"."dokumente" TO "anon";
GRANT ALL ON TABLE "public"."dokumente" TO "authenticated";
GRANT ALL ON TABLE "public"."dokumente" TO "service_role";



GRANT ALL ON TABLE "public"."eltern_kinder" TO "anon";
GRANT ALL ON TABLE "public"."eltern_kinder" TO "authenticated";
GRANT ALL ON TABLE "public"."eltern_kinder" TO "service_role";



GRANT ALL ON SEQUENCE "public"."eltern_kinder_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."eltern_kinder_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."eltern_kinder_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."elternkontakte" TO "anon";
GRANT ALL ON TABLE "public"."elternkontakte" TO "authenticated";
GRANT ALL ON TABLE "public"."elternkontakte" TO "service_role";



GRANT ALL ON TABLE "public"."feldsichtbarkeit" TO "anon";
GRANT ALL ON TABLE "public"."feldsichtbarkeit" TO "authenticated";
GRANT ALL ON TABLE "public"."feldsichtbarkeit" TO "service_role";



GRANT ALL ON TABLE "public"."helper_einsaetze" TO "anon";
GRANT ALL ON TABLE "public"."helper_einsaetze" TO "authenticated";
GRANT ALL ON TABLE "public"."helper_einsaetze" TO "service_role";



GRANT ALL ON TABLE "public"."helper_einsatz_pflicht" TO "anon";
GRANT ALL ON TABLE "public"."helper_einsatz_pflicht" TO "authenticated";
GRANT ALL ON TABLE "public"."helper_einsatz_pflicht" TO "service_role";



GRANT ALL ON TABLE "public"."helper_einsatz_pflicht_mitglied" TO "anon";
GRANT ALL ON TABLE "public"."helper_einsatz_pflicht_mitglied" TO "authenticated";
GRANT ALL ON TABLE "public"."helper_einsatz_pflicht_mitglied" TO "service_role";



GRANT ALL ON TABLE "public"."helper_events" TO "anon";
GRANT ALL ON TABLE "public"."helper_events" TO "authenticated";
GRANT ALL ON TABLE "public"."helper_events" TO "service_role";



GRANT ALL ON TABLE "public"."helper_schichten" TO "anon";
GRANT ALL ON TABLE "public"."helper_schichten" TO "authenticated";
GRANT ALL ON TABLE "public"."helper_schichten" TO "service_role";



GRANT ALL ON TABLE "public"."helper_zuteilungen" TO "anon";
GRANT ALL ON TABLE "public"."helper_zuteilungen" TO "authenticated";
GRANT ALL ON TABLE "public"."helper_zuteilungen" TO "service_role";



GRANT ALL ON TABLE "public"."kader" TO "anon";
GRANT ALL ON TABLE "public"."kader" TO "authenticated";
GRANT ALL ON TABLE "public"."kader" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kader_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kader_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kader_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kader_rollen" TO "anon";
GRANT ALL ON TABLE "public"."kader_rollen" TO "authenticated";
GRANT ALL ON TABLE "public"."kader_rollen" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kader_rollen_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kader_rollen_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kader_rollen_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kommunikationsgruppen" TO "anon";
GRANT ALL ON TABLE "public"."kommunikationsgruppen" TO "authenticated";
GRANT ALL ON TABLE "public"."kommunikationsgruppen" TO "service_role";



GRANT ALL ON TABLE "public"."kommunikationsgruppen_mitglieder" TO "anon";
GRANT ALL ON TABLE "public"."kommunikationsgruppen_mitglieder" TO "authenticated";
GRANT ALL ON TABLE "public"."kommunikationsgruppen_mitglieder" TO "service_role";



GRANT ALL ON TABLE "public"."material" TO "anon";
GRANT ALL ON TABLE "public"."material" TO "authenticated";
GRANT ALL ON TABLE "public"."material" TO "service_role";



GRANT ALL ON TABLE "public"."material_ausleihen" TO "anon";
GRANT ALL ON TABLE "public"."material_ausleihen" TO "authenticated";
GRANT ALL ON TABLE "public"."material_ausleihen" TO "service_role";



GRANT ALL ON TABLE "public"."medien" TO "anon";
GRANT ALL ON TABLE "public"."medien" TO "authenticated";
GRANT ALL ON TABLE "public"."medien" TO "service_role";



GRANT ALL ON TABLE "public"."mitglieder" TO "anon";
GRANT ALL ON TABLE "public"."mitglieder" TO "authenticated";
GRANT ALL ON TABLE "public"."mitglieder" TO "service_role";



GRANT ALL ON TABLE "public"."mitglieder_aenderungen" TO "anon";
GRANT ALL ON TABLE "public"."mitglieder_aenderungen" TO "authenticated";
GRANT ALL ON TABLE "public"."mitglieder_aenderungen" TO "service_role";



GRANT ALL ON TABLE "public"."mitglieder_aktivitaeten" TO "anon";
GRANT ALL ON TABLE "public"."mitglieder_aktivitaeten" TO "authenticated";
GRANT ALL ON TABLE "public"."mitglieder_aktivitaeten" TO "service_role";



GRANT ALL ON TABLE "public"."mitglieder_ansichten" TO "anon";
GRANT ALL ON TABLE "public"."mitglieder_ansichten" TO "authenticated";
GRANT ALL ON TABLE "public"."mitglieder_ansichten" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mitglieder_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mitglieder_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mitglieder_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mitglieder_notizen" TO "anon";
GRANT ALL ON TABLE "public"."mitglieder_notizen" TO "authenticated";
GRANT ALL ON TABLE "public"."mitglieder_notizen" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mitglieder_notizen_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mitglieder_notizen_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mitglieder_notizen_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mitglieder_team_details" TO "anon";
GRANT ALL ON TABLE "public"."mitglieder_team_details" TO "authenticated";
GRANT ALL ON TABLE "public"."mitglieder_team_details" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mitglieder_team_details_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mitglieder_team_details_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mitglieder_team_details_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mitgliedtyp_feldkonfig" TO "anon";
GRANT ALL ON TABLE "public"."mitgliedtyp_feldkonfig" TO "authenticated";
GRANT ALL ON TABLE "public"."mitgliedtyp_feldkonfig" TO "service_role";



GRANT ALL ON TABLE "public"."mitgliedtyp_pflichtfelder" TO "anon";
GRANT ALL ON TABLE "public"."mitgliedtyp_pflichtfelder" TO "authenticated";
GRANT ALL ON TABLE "public"."mitgliedtyp_pflichtfelder" TO "service_role";



GRANT ALL ON TABLE "public"."mitgliedtypen" TO "anon";
GRANT ALL ON TABLE "public"."mitgliedtypen" TO "authenticated";
GRANT ALL ON TABLE "public"."mitgliedtypen" TO "service_role";



GRANT ALL ON TABLE "public"."modul_benutzer" TO "anon";
GRANT ALL ON TABLE "public"."modul_benutzer" TO "authenticated";
GRANT ALL ON TABLE "public"."modul_benutzer" TO "service_role";



GRANT ALL ON TABLE "public"."modul_rechte" TO "anon";
GRANT ALL ON TABLE "public"."modul_rechte" TO "authenticated";
GRANT ALL ON TABLE "public"."modul_rechte" TO "service_role";



GRANT ALL ON TABLE "public"."modul_rollen" TO "anon";
GRANT ALL ON TABLE "public"."modul_rollen" TO "authenticated";
GRANT ALL ON TABLE "public"."modul_rollen" TO "service_role";



GRANT ALL ON TABLE "public"."module" TO "anon";
GRANT ALL ON TABLE "public"."module" TO "authenticated";
GRANT ALL ON TABLE "public"."module" TO "service_role";



GRANT ALL ON TABLE "public"."module_berechtigungen" TO "anon";
GRANT ALL ON TABLE "public"."module_berechtigungen" TO "authenticated";
GRANT ALL ON TABLE "public"."module_berechtigungen" TO "service_role";



GRANT ALL ON TABLE "public"."module_config" TO "anon";
GRANT ALL ON TABLE "public"."module_config" TO "authenticated";
GRANT ALL ON TABLE "public"."module_config" TO "service_role";



GRANT ALL ON TABLE "public"."module_delegationen" TO "anon";
GRANT ALL ON TABLE "public"."module_delegationen" TO "authenticated";
GRANT ALL ON TABLE "public"."module_delegationen" TO "service_role";



GRANT ALL ON TABLE "public"."nachrichten" TO "anon";
GRANT ALL ON TABLE "public"."nachrichten" TO "authenticated";
GRANT ALL ON TABLE "public"."nachrichten" TO "service_role";



GRANT ALL ON TABLE "public"."nachrichten_antworten" TO "anon";
GRANT ALL ON TABLE "public"."nachrichten_antworten" TO "authenticated";
GRANT ALL ON TABLE "public"."nachrichten_antworten" TO "service_role";



GRANT ALL ON TABLE "public"."nachrichten_dateien" TO "anon";
GRANT ALL ON TABLE "public"."nachrichten_dateien" TO "authenticated";
GRANT ALL ON TABLE "public"."nachrichten_dateien" TO "service_role";



GRANT ALL ON TABLE "public"."nachrichten_gelesen" TO "anon";
GRANT ALL ON TABLE "public"."nachrichten_gelesen" TO "authenticated";
GRANT ALL ON TABLE "public"."nachrichten_gelesen" TO "service_role";



GRANT ALL ON TABLE "public"."news" TO "anon";
GRANT ALL ON TABLE "public"."news" TO "authenticated";
GRANT ALL ON TABLE "public"."news" TO "service_role";



GRANT ALL ON TABLE "public"."news_kategorien" TO "anon";
GRANT ALL ON TABLE "public"."news_kategorien" TO "authenticated";
GRANT ALL ON TABLE "public"."news_kategorien" TO "service_role";



GRANT ALL ON TABLE "public"."news_lesestatus" TO "anon";
GRANT ALL ON TABLE "public"."news_lesestatus" TO "authenticated";
GRANT ALL ON TABLE "public"."news_lesestatus" TO "service_role";



GRANT ALL ON TABLE "public"."personen" TO "anon";
GRANT ALL ON TABLE "public"."personen" TO "authenticated";
GRANT ALL ON TABLE "public"."personen" TO "service_role";



GRANT ALL ON TABLE "public"."personenart_pro_person" TO "anon";
GRANT ALL ON TABLE "public"."personenart_pro_person" TO "authenticated";
GRANT ALL ON TABLE "public"."personenart_pro_person" TO "service_role";



GRANT ALL ON TABLE "public"."personenarten" TO "anon";
GRANT ALL ON TABLE "public"."personenarten" TO "authenticated";
GRANT ALL ON TABLE "public"."personenarten" TO "service_role";



GRANT ALL ON TABLE "public"."personenarten_effektiv" TO "anon";
GRANT ALL ON TABLE "public"."personenarten_effektiv" TO "authenticated";
GRANT ALL ON TABLE "public"."personenarten_effektiv" TO "service_role";



GRANT ALL ON TABLE "public"."portal_einstellungen" TO "anon";
GRANT ALL ON TABLE "public"."portal_einstellungen" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_einstellungen" TO "service_role";



GRANT ALL ON TABLE "public"."portal_funktionen" TO "anon";
GRANT ALL ON TABLE "public"."portal_funktionen" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_funktionen" TO "service_role";



GRANT ALL ON SEQUENCE "public"."portal_funktionen_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."portal_funktionen_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."portal_funktionen_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."portal_gruppen" TO "anon";
GRANT ALL ON TABLE "public"."portal_gruppen" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_gruppen" TO "service_role";



GRANT ALL ON SEQUENCE "public"."portal_gruppen_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."portal_gruppen_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."portal_gruppen_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."portal_gruppen_teams" TO "anon";
GRANT ALL ON TABLE "public"."portal_gruppen_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_gruppen_teams" TO "service_role";



GRANT ALL ON TABLE "public"."portal_rollen" TO "anon";
GRANT ALL ON TABLE "public"."portal_rollen" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_rollen" TO "service_role";



GRANT ALL ON SEQUENCE "public"."portal_rollen_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."portal_rollen_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."portal_rollen_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."portal_zugang" TO "anon";
GRANT ALL ON TABLE "public"."portal_zugang" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_zugang" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."ranglisten" TO "anon";
GRANT ALL ON TABLE "public"."ranglisten" TO "authenticated";
GRANT ALL ON TABLE "public"."ranglisten" TO "service_role";



GRANT ALL ON TABLE "public"."rolle_pflichtfelder" TO "anon";
GRANT ALL ON TABLE "public"."rolle_pflichtfelder" TO "authenticated";
GRANT ALL ON TABLE "public"."rolle_pflichtfelder" TO "service_role";



GRANT ALL ON TABLE "public"."rollen" TO "anon";
GRANT ALL ON TABLE "public"."rollen" TO "authenticated";
GRANT ALL ON TABLE "public"."rollen" TO "service_role";



GRANT ALL ON TABLE "public"."sfv_team_logos" TO "anon";
GRANT ALL ON TABLE "public"."sfv_team_logos" TO "authenticated";
GRANT ALL ON TABLE "public"."sfv_team_logos" TO "service_role";



GRANT ALL ON TABLE "public"."sfv_zuordnung" TO "anon";
GRANT ALL ON TABLE "public"."sfv_zuordnung" TO "authenticated";
GRANT ALL ON TABLE "public"."sfv_zuordnung" TO "service_role";



GRANT ALL ON TABLE "public"."spiel_aufstellung" TO "anon";
GRANT ALL ON TABLE "public"."spiel_aufstellung" TO "authenticated";
GRANT ALL ON TABLE "public"."spiel_aufstellung" TO "service_role";



GRANT ALL ON TABLE "public"."spiel_ereignisse" TO "anon";
GRANT ALL ON TABLE "public"."spiel_ereignisse" TO "authenticated";
GRANT ALL ON TABLE "public"."spiel_ereignisse" TO "service_role";



GRANT ALL ON TABLE "public"."spiele" TO "anon";
GRANT ALL ON TABLE "public"."spiele" TO "authenticated";
GRANT ALL ON TABLE "public"."spiele" TO "service_role";



GRANT ALL ON TABLE "public"."team_helfer_zuteilungen" TO "anon";
GRANT ALL ON TABLE "public"."team_helfer_zuteilungen" TO "authenticated";
GRANT ALL ON TABLE "public"."team_helfer_zuteilungen" TO "service_role";



GRANT ALL ON TABLE "public"."team_helferaufgaben" TO "anon";
GRANT ALL ON TABLE "public"."team_helferaufgaben" TO "authenticated";
GRANT ALL ON TABLE "public"."team_helferaufgaben" TO "service_role";



GRANT ALL ON TABLE "public"."team_module" TO "anon";
GRANT ALL ON TABLE "public"."team_module" TO "authenticated";
GRANT ALL ON TABLE "public"."team_module" TO "service_role";



GRANT ALL ON TABLE "public"."team_stufen" TO "anon";
GRANT ALL ON TABLE "public"."team_stufen" TO "authenticated";
GRANT ALL ON TABLE "public"."team_stufen" TO "service_role";



GRANT ALL ON SEQUENCE "public"."team_stufen_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."team_stufen_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."team_stufen_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."termine" TO "anon";
GRANT ALL ON TABLE "public"."termine" TO "authenticated";
GRANT ALL ON TABLE "public"."termine" TO "service_role";



GRANT ALL ON TABLE "public"."trainings" TO "anon";
GRANT ALL ON TABLE "public"."trainings" TO "authenticated";
GRANT ALL ON TABLE "public"."trainings" TO "service_role";



GRANT ALL ON TABLE "public"."trainingsplaetze" TO "anon";
GRANT ALL ON TABLE "public"."trainingsplaetze" TO "authenticated";
GRANT ALL ON TABLE "public"."trainingsplaetze" TO "service_role";



GRANT ALL ON TABLE "public"."trainingsplan_ausnahmen" TO "anon";
GRANT ALL ON TABLE "public"."trainingsplan_ausnahmen" TO "authenticated";
GRANT ALL ON TABLE "public"."trainingsplan_ausnahmen" TO "service_role";



GRANT ALL ON TABLE "public"."trainingsplan_slots" TO "anon";
GRANT ALL ON TABLE "public"."trainingsplan_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."trainingsplan_slots" TO "service_role";



GRANT ALL ON TABLE "public"."trainingsplan_vorlagen" TO "anon";
GRANT ALL ON TABLE "public"."trainingsplan_vorlagen" TO "authenticated";
GRANT ALL ON TABLE "public"."trainingsplan_vorlagen" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."vereine" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."vereine" TO "authenticated";
GRANT ALL ON TABLE "public"."vereine" TO "service_role";



GRANT UPDATE("theme") ON TABLE "public"."vereine" TO "authenticated";



GRANT UPDATE("austritt_art_id") ON TABLE "public"."vereine" TO "authenticated";



GRANT ALL ON TABLE "public"."wiki_artikel" TO "anon";
GRANT ALL ON TABLE "public"."wiki_artikel" TO "authenticated";
GRANT ALL ON TABLE "public"."wiki_artikel" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































