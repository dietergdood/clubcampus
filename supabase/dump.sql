


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




ALTER SCHEMA "public" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_my_mitglied_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT mitglied_id FROM benutzer WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_mitglied_id"() OWNER TO "postgres";


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
    AS $$
DECLARE
  v_rollen  text[];
  v_funktion text;
  v_name    text;
  v_ist_eltern boolean := false;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));

  -- Rolle aus mitglieder.funktion ableiten
  BEGIN
    SELECT funktion INTO v_funktion
    FROM public.mitglieder
    WHERE email = NEW.email AND aktiv = true
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_funktion := NULL;
  END;

  -- Standardrolle basierend auf Funktion
  IF v_funktion ILIKE '%trainer%' OR v_funktion ILIKE '%coach%' THEN
    v_rollen := ARRAY['trainer'];
  ELSIF v_funktion ILIKE '%vorstand%' OR v_funktion ILIKE '%präsident%' OR v_funktion ILIKE '%kassier%' THEN
    v_rollen := ARRAY['funktionaer'];
  ELSIF v_funktion ILIKE '%administration%' OR v_funktion ILIKE '%sekretariat%' THEN
    v_rollen := ARRAY['administration'];
  ELSIF v_funktion IS NOT NULL THEN
    v_rollen := ARRAY['spieler'];
  ELSE
    v_rollen := ARRAY[]::text[]; -- kein Mitglied gefunden
  END IF;

  -- Elternkontakt prüfen
  BEGIN
    IF EXISTS (SELECT 1 FROM public.elternkontakte WHERE email = NEW.email AND benutzer_id IS NULL) THEN
      v_ist_eltern := true;
      IF NOT ('eltern' = ANY(v_rollen)) THEN
        v_rollen := array_append(v_rollen, 'eltern');
      END IF;
      UPDATE public.elternkontakte
        SET benutzer_id = NEW.id
        WHERE email = NEW.email AND benutzer_id IS NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Fallback: wenn keine Rolle gefunden
  IF array_length(v_rollen, 1) IS NULL THEN
    v_rollen := ARRAY['spieler'];
  END IF;

  BEGIN
    INSERT INTO public.benutzer (id, email, name, role, rollen, active)
    VALUES (NEW.id, NEW.email, v_name, v_rollen[1], v_rollen, true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(role IN ('administrator','administration'), false)
  FROM benutzer WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_above"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    (select role in ('administrator','administration') from benutzer where id = auth.uid()),
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


CREATE OR REPLACE FUNCTION "public"."pe_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."pe_updated_at"() OWNER TO "postgres";


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
    "mitglied_id" "uuid",
    "benutzer_id" "uuid",
    "eingetragen_von" "uuid",
    "event_type" "text" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."anwesenheiten" OWNER TO "postgres";


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
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."api_verbindungen" OWNER TO "postgres";


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
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "teams_kontext" "jsonb" DEFAULT '[]'::"jsonb",
    "rollen" "text"[] DEFAULT '{}'::"text"[],
    "profil_geprueft_at" timestamp with time zone,
    "aktiv" boolean DEFAULT true,
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."benutzer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."benutzer_funktionen" (
    "benutzer_id" "uuid" NOT NULL,
    "funktion_id" bigint NOT NULL,
    "seit" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."benutzer_funktionen" OWNER TO "postgres";


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
    "verein_id" "uuid" NOT NULL
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
    "mitglied_id" "uuid" NOT NULL,
    "saison" "text" NOT NULL,
    "min_einsaetze" integer NOT NULL,
    "notes" "text",
    "gesetzt_von" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."helper_einsatz_pflicht_mitglied" OWNER TO "postgres";


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
    "mitglied_id" "uuid",
    "mitglied_name" "text",
    "eingetragen_von" "uuid",
    "als_stellvertreter" boolean DEFAULT false,
    "status" "text" DEFAULT 'eingetragen'::"text",
    "freigabe_angefragt" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."helper_zuteilungen" OWNER TO "postgres";


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
    "vorname" "text" NOT NULL,
    "nachname" "text" NOT NULL,
    "geburtsdatum" "date",
    "nationalitaet" "text" DEFAULT 'CH'::"text",
    "heimatort" "text",
    "geschlecht" "text",
    "strasse" "text",
    "plz" "text",
    "ort" "text",
    "kanton" "text",
    "land" "text" DEFAULT 'Schweiz'::"text",
    "email" "text",
    "telefon" "text",
    "mitgliedtyp" "text" DEFAULT 'Aktivmitglied'::"text",
    "rolle" "text",
    "position" "text",
    "aktiv" boolean DEFAULT true,
    "spielerpass" "text",
    "ahv_nr" "text",
    "js_nr" "text",
    "fairgate_id" "text",
    "eltern" "jsonb" DEFAULT '[]'::"jsonb",
    "hat_portal_zugang" boolean DEFAULT false,
    "datenstatus" "text" DEFAULT 'Vollständig'::"text",
    "notizen" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fairgate_sync_at" timestamp with time zone,
    "profil_geprueft_at" timestamp with time zone,
    "foto_url" "text",
    "rueckennr" "text",
    "funktionen" "text"[] DEFAULT '{}'::"text"[],
    "deaktiviert_am" timestamp with time zone,
    "deaktiviert_von" "text",
    "nationalitaet2" "text",
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitglieder" OWNER TO "postgres";


COMMENT ON COLUMN "public"."mitglieder"."rolle" IS 'Veraltet – wird durch funktion ersetzt. Nicht mehr verwenden.';



CREATE TABLE IF NOT EXISTS "public"."mitglieder_ansichten" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verein_id" "uuid",
    "benutzer_id" "uuid",
    "name" "text" NOT NULL,
    "spalten" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "filter" "jsonb" DEFAULT '{}'::"jsonb",
    "gruppierung" "text" DEFAULT 'none'::"text",
    "ist_standard" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mitglieder_ansichten" OWNER TO "postgres";


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
    "mitglied_id" bigint NOT NULL,
    "text" "text" NOT NULL,
    "autor_id" "uuid",
    "autor_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
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
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."mitgliedtypen" OWNER TO "postgres";


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
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."spiele" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_helfer_zuteilungen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aufgabe_id" "uuid" NOT NULL,
    "mitglied_id" "uuid",
    "eingetragen_von" "uuid",
    "als_stellvertreter" boolean DEFAULT false,
    "status" "text" DEFAULT 'eingetragen'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."team_helfer_zuteilungen" OWNER TO "postgres";


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
    "verein_id" "uuid" NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


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
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vereine" OWNER TO "postgres";


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
    ADD CONSTRAINT "anwesenheiten_mitglied_id_event_type_event_id_key" UNIQUE ("mitglied_id", "event_type", "event_id");



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_verbindungen"
    ADD CONSTRAINT "api_verbindungen_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."api_verbindungen"
    ADD CONSTRAINT "api_verbindungen_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_mitglied_email_unique" UNIQUE ("mitglied_id", "email");



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feldsichtbarkeit"
    ADD CONSTRAINT "feldsichtbarkeit_feld_key_role_key" UNIQUE ("feld_key", "role");



ALTER TABLE ONLY "public"."feldsichtbarkeit"
    ADD CONSTRAINT "feldsichtbarkeit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_einsaetze"
    ADD CONSTRAINT "helper_einsaetze_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht_mitglied"
    ADD CONSTRAINT "helper_einsatz_pflicht_mitglied_mitglied_id_saison_key" UNIQUE ("mitglied_id", "saison");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht_mitglied"
    ADD CONSTRAINT "helper_einsatz_pflicht_mitglied_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_einsatz_pflicht"
    ADD CONSTRAINT "helper_einsatz_pflicht_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_events"
    ADD CONSTRAINT "helper_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_schichten"
    ADD CONSTRAINT "helper_schichten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_schicht_id_mitglied_id_key" UNIQUE ("schicht_id", "mitglied_id");



ALTER TABLE ONLY "public"."kader"
    ADD CONSTRAINT "kader_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kader_rollen"
    ADD CONSTRAINT "kader_rollen_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."kader_rollen"
    ADD CONSTRAINT "kader_rollen_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."mitglieder_ansichten"
    ADD CONSTRAINT "mitglieder_ansichten_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_fairgate_id_key" UNIQUE ("fairgate_id");



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_mitglied_id_team_name_key" UNIQUE ("mitglied_id", "team_name");



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitgliedtyp_pflichtfelder"
    ADD CONSTRAINT "mitgliedtyp_pflichtfelder_mitgliedtyp_feld_key" UNIQUE ("mitgliedtyp", "feld");



ALTER TABLE ONLY "public"."mitgliedtyp_pflichtfelder"
    ADD CONSTRAINT "mitgliedtyp_pflichtfelder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mitgliedtypen"
    ADD CONSTRAINT "mitgliedtypen_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."mitgliedtypen"
    ADD CONSTRAINT "mitgliedtypen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_modul_id_benutzer_id_key" UNIQUE ("modul_id", "benutzer_id");



ALTER TABLE ONLY "public"."modul_benutzer"
    ADD CONSTRAINT "modul_benutzer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modul_rechte"
    ADD CONSTRAINT "modul_rechte_pkey" PRIMARY KEY ("modul", "rolle");



ALTER TABLE ONLY "public"."modul_rollen"
    ADD CONSTRAINT "modul_rollen_modul_id_rolle_key" UNIQUE ("modul_id", "role");



ALTER TABLE ONLY "public"."modul_rollen"
    ADD CONSTRAINT "modul_rollen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_berechtigungen"
    ADD CONSTRAINT "module_berechtigungen_modul_id_role_key" UNIQUE ("modul_id", "role");



ALTER TABLE ONLY "public"."module_berechtigungen"
    ADD CONSTRAINT "module_berechtigungen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_config"
    ADD CONSTRAINT "module_config_pkey" PRIMARY KEY ("modul");



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_modul_id_benutzer_id_key" UNIQUE ("modul_id", "benutzer_id");



ALTER TABLE ONLY "public"."module_delegationen"
    ADD CONSTRAINT "module_delegationen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module"
    ADD CONSTRAINT "module_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."module"
    ADD CONSTRAINT "module_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."portal_einstellungen"
    ADD CONSTRAINT "portal_einstellungen_pkey" PRIMARY KEY ("schluessel");



ALTER TABLE ONLY "public"."portal_funktionen"
    ADD CONSTRAINT "portal_funktionen_name_gruppe_id_key" UNIQUE ("name", "gruppe_id");



ALTER TABLE ONLY "public"."portal_funktionen"
    ADD CONSTRAINT "portal_funktionen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_gruppen"
    ADD CONSTRAINT "portal_gruppen_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."portal_gruppen"
    ADD CONSTRAINT "portal_gruppen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_gruppen_teams"
    ADD CONSTRAINT "portal_gruppen_teams_gruppe_id_team_id_key" UNIQUE ("gruppe_id", "team_id");



ALTER TABLE ONLY "public"."portal_gruppen_teams"
    ADD CONSTRAINT "portal_gruppen_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_rollen"
    ADD CONSTRAINT "portal_rollen_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."portal_rollen"
    ADD CONSTRAINT "portal_rollen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rolle_pflichtfelder"
    ADD CONSTRAINT "rolle_pflichtfelder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rolle_pflichtfelder"
    ADD CONSTRAINT "rolle_pflichtfelder_rolle_feld_key" UNIQUE ("rolle", "feld");



ALTER TABLE ONLY "public"."rollen"
    ADD CONSTRAINT "rollen_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."rollen"
    ADD CONSTRAINT "rollen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spiele"
    ADD CONSTRAINT "spiele_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_aufgabe_id_mitglied_id_key" UNIQUE ("aufgabe_id", "mitglied_id");



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



ALTER TABLE ONLY "public"."termine"
    ADD CONSTRAINT "termine_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplaetze"
    ADD CONSTRAINT "trainingsplaetze_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."trainingsplaetze"
    ADD CONSTRAINT "trainingsplaetze_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplan_ausnahmen"
    ADD CONSTRAINT "trainingsplan_ausnahmen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplan_slots"
    ADD CONSTRAINT "trainingsplan_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainingsplan_vorlagen"
    ADD CONSTRAINT "trainingsplan_vorlagen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vereine"
    ADD CONSTRAINT "vereine_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wiki_artikel"
    ADD CONSTRAINT "wiki_artikel_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_anwesenheiten_event" ON "public"."anwesenheiten" USING "btree" ("event_type", "event_id");



CREATE INDEX "idx_anwesenheiten_mitglied" ON "public"."anwesenheiten" USING "btree" ("mitglied_id");



CREATE INDEX "idx_ausnahmen_kw_typ" ON "public"."trainingsplan_ausnahmen" USING "btree" ("week_nr", "year", "type");



CREATE INDEX "idx_ausnahmen_slot_kw" ON "public"."trainingsplan_ausnahmen" USING "btree" ("slot_id", "week_nr", "year");



CREATE INDEX "idx_benachricht_benutzer" ON "public"."benachrichtigungen" USING "btree" ("benutzer_id", "gelesen");



CREATE INDEX "idx_benutzer_aktiv" ON "public"."benutzer" USING "btree" ("aktiv");



CREATE INDEX "idx_benutzer_mitglied" ON "public"."benutzer" USING "btree" ("mitglied_id");



CREATE INDEX "idx_benutzer_profil_geprueft" ON "public"."benutzer" USING "btree" ("profil_geprueft_at");



CREATE INDEX "idx_benutzer_verein" ON "public"."benutzer" USING "btree" ("verein_id");



CREATE INDEX "idx_bf_bid" ON "public"."benutzer_funktionen" USING "btree" ("benutzer_id");



CREATE INDEX "idx_bf_fid" ON "public"."benutzer_funktionen" USING "btree" ("funktion_id");



CREATE INDEX "idx_kader_verein" ON "public"."kader" USING "btree" ("verein_id");



CREATE INDEX "idx_mitglieder_aktiv" ON "public"."mitglieder" USING "btree" ("aktiv");



CREATE INDEX "idx_mitglieder_ansichten_benutzer" ON "public"."mitglieder_ansichten" USING "btree" ("benutzer_id");



CREATE INDEX "idx_mitglieder_ansichten_verein" ON "public"."mitglieder_ansichten" USING "btree" ("verein_id");



CREATE INDEX "idx_mitglieder_email" ON "public"."mitglieder" USING "btree" ("email");



CREATE INDEX "idx_mitglieder_fairgate" ON "public"."mitglieder" USING "btree" ("fairgate_id");



CREATE INDEX "idx_mitglieder_nachname" ON "public"."mitglieder" USING "btree" ("nachname");



CREATE INDEX "idx_mitglieder_portal" ON "public"."mitglieder" USING "btree" ("hat_portal_zugang");



CREATE INDEX "idx_mitglieder_profil_geprueft" ON "public"."mitglieder" USING "btree" ("profil_geprueft_at");



CREATE INDEX "idx_mitglieder_rolle" ON "public"."mitglieder" USING "btree" ("rolle");



CREATE INDEX "idx_mitglieder_verein" ON "public"."mitglieder" USING "btree" ("verein_id");



CREATE INDEX "idx_modul_rechte_verein" ON "public"."modul_rechte" USING "btree" ("verein_id");



CREATE INDEX "idx_mtd_mitglied" ON "public"."mitglieder_team_details" USING "btree" ("mitglied_id");



CREATE INDEX "idx_nachrichten_verein" ON "public"."nachrichten" USING "btree" ("verein_id");



CREATE INDEX "idx_news_publiziert" ON "public"."news" USING "btree" ("publiziert");



CREATE INDEX "idx_portal_einstellungen_verein" ON "public"."portal_einstellungen" USING "btree" ("verein_id");



CREATE INDEX "idx_slots_gueltig_ab" ON "public"."trainingsplan_slots" USING "btree" ("valid_from_week_year", "valid_from_week_nr");



CREATE INDEX "idx_slots_vorlage" ON "public"."trainingsplan_slots" USING "btree" ("template_id");



CREATE INDEX "idx_slots_wochentag" ON "public"."trainingsplan_slots" USING "btree" ("weekday");



CREATE INDEX "idx_spiele_datum" ON "public"."spiele" USING "btree" ("date");



CREATE INDEX "idx_spiele_team" ON "public"."spiele" USING "btree" ("team");



CREATE INDEX "idx_spiele_verein" ON "public"."spiele" USING "btree" ("verein_id");



CREATE INDEX "idx_stufen_ebene" ON "public"."team_stufen" USING "btree" ("ebene");



CREATE INDEX "idx_stufen_parent" ON "public"."team_stufen" USING "btree" ("parent_id");



CREATE INDEX "idx_teams_aktiv" ON "public"."teams" USING "btree" ("aktiv");



CREATE INDEX "idx_teams_kategorie" ON "public"."teams" USING "btree" ("kategorie");



CREATE INDEX "idx_teams_verein" ON "public"."teams" USING "btree" ("verein_id");



CREATE INDEX "idx_termine_verein" ON "public"."termine" USING "btree" ("verein_id");



CREATE INDEX "idx_trainings_datum" ON "public"."trainings" USING "btree" ("date");



CREATE INDEX "idx_trainings_slot_id" ON "public"."trainings" USING "btree" ("trainingsplan_slot_id");



CREATE INDEX "idx_trainings_team" ON "public"."trainings" USING "btree" ("team");



CREATE INDEX "idx_trainings_verein" ON "public"."trainings" USING "btree" ("verein_id");



CREATE OR REPLACE TRIGGER "mc_updated_at" BEFORE UPDATE ON "public"."module_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "mitglieder_updated_at" BEFORE UPDATE ON "public"."mitglieder" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "mr_updated_at" BEFORE UPDATE ON "public"."modul_rechte" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "pe_ts" BEFORE UPDATE ON "public"."portal_einstellungen" FOR EACH ROW EXECUTE FUNCTION "public"."pe_updated_at"();



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
    ADD CONSTRAINT "anwesenheiten_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."anwesenheiten"
    ADD CONSTRAINT "anwesenheiten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_gestartet_von_fkey" FOREIGN KEY ("gestartet_von") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_verbindung_id_fkey" FOREIGN KEY ("verbindung_id") REFERENCES "public"."api_verbindungen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_sync_log"
    ADD CONSTRAINT "api_sync_log_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."api_verbindungen"
    ADD CONSTRAINT "api_verbindungen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id");



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



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elternkontakte"
    ADD CONSTRAINT "elternkontakte_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."feldsichtbarkeit"
    ADD CONSTRAINT "feldsichtbarkeit_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."benutzer"("id");



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



ALTER TABLE ONLY "public"."helper_schichten"
    ADD CONSTRAINT "helper_schichten_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "public"."helper_einsaetze"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."helper_schichten"
    ADD CONSTRAINT "helper_schichten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."helper_zuteilungen"
    ADD CONSTRAINT "helper_zuteilungen_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id");



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



ALTER TABLE ONLY "public"."mitglieder_ansichten"
    ADD CONSTRAINT "mitglieder_ansichten_benutzer_id_fkey" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_ansichten"
    ADD CONSTRAINT "mitglieder_ansichten_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_notizen"
    ADD CONSTRAINT "mitglieder_notizen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_mitglied_id_fkey" FOREIGN KEY ("mitglied_id") REFERENCES "public"."mitglieder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mitglieder_team_details"
    ADD CONSTRAINT "mitglieder_team_details_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitglieder"
    ADD CONSTRAINT "mitglieder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."mitgliedtyp_pflichtfelder"
    ADD CONSTRAINT "mitgliedtyp_pflichtfelder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



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
    ADD CONSTRAINT "module_berechtigungen_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."benutzer"("id");



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



ALTER TABLE ONLY "public"."rolle_pflichtfelder"
    ADD CONSTRAINT "rolle_pflichtfelder_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."rollen"
    ADD CONSTRAINT "rollen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."spiele"
    ADD CONSTRAINT "spiele_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_aufgabe_id_fkey" FOREIGN KEY ("aufgabe_id") REFERENCES "public"."team_helferaufgaben"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_helfer_zuteilungen"
    ADD CONSTRAINT "team_helfer_zuteilungen_eingetragen_von_fkey" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id");



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
    ADD CONSTRAINT "trainingsplan_vorlagen_erstellt_von_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."trainingsplan_vorlagen"
    ADD CONSTRAINT "trainingsplan_vorlagen_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE ONLY "public"."wiki_artikel"
    ADD CONSTRAINT "wiki_artikel_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."benutzer"("id");



ALTER TABLE ONLY "public"."wiki_artikel"
    ADD CONSTRAINT "wiki_artikel_verein_id_fkey" FOREIGN KEY ("verein_id") REFERENCES "public"."vereine"("id");



ALTER TABLE "public"."abstimmung_antworten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "abstimmung_antworten_select" ON "public"."abstimmung_antworten" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "abstimmung_antworten_write" ON "public"."abstimmung_antworten" USING (("verein_id" = "public"."get_my_verein_id"()));



ALTER TABLE "public"."abstimmungen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "abstimmungen_select" ON "public"."abstimmungen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "abstimmungen_write" ON "public"."abstimmungen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "ansichten_select" ON "public"."mitglieder_ansichten" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("benutzer_id" = "auth"."uid"()) OR ("ist_standard" = true) OR "public"."is_admin"())));



CREATE POLICY "ansichten_write" ON "public"."mitglieder_ansichten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("benutzer_id" = "auth"."uid"()) OR "public"."is_admin"())));



ALTER TABLE "public"."anwesenheiten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anwesenheiten_select" ON "public"."anwesenheiten" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("benutzer_id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"])))));



CREATE POLICY "anwesenheiten_write" ON "public"."anwesenheiten" USING ((("verein_id" = "public"."get_my_verein_id"()) AND (("benutzer_id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text"])))));



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



ALTER TABLE "public"."elternkontakte" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "elternkontakte_select" ON "public"."elternkontakte" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."is_admin"() OR ("benutzer_id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['trainer'::"text", 'funktionaer'::"text"])))));



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


ALTER TABLE "public"."mitglieder_ansichten" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitglieder_delete_admin" ON "public"."mitglieder" FOR DELETE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "mitglieder_insert_admin" ON "public"."mitglieder" FOR INSERT WITH CHECK ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."mitglieder_notizen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitglieder_select_priv" ON "public"."mitglieder" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));



CREATE POLICY "mitglieder_select_self" ON "public"."mitglieder" FOR SELECT USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("id" = "public"."get_my_mitglied_id"())));



ALTER TABLE "public"."mitglieder_team_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mitglieder_team_details_select" ON "public"."mitglieder_team_details" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "mitglieder_team_details_write" ON "public"."mitglieder_team_details" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "mitglieder_update_admin" ON "public"."mitglieder" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



CREATE POLICY "mitglieder_update_self" ON "public"."mitglieder" FOR UPDATE USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("id" = "public"."get_my_mitglied_id"())));



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



CREATE POLICY "push_own" ON "public"."push_subscriptions" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("benutzer_id" = "auth"."uid"())));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rolle_pflichtfelder" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rolle_pflichtfelder_select" ON "public"."rolle_pflichtfelder" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "rolle_pflichtfelder_write" ON "public"."rolle_pflichtfelder" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



ALTER TABLE "public"."rollen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rollen_select" ON "public"."rollen" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "rollen_write" ON "public"."rollen" USING ((("verein_id" = "public"."get_my_verein_id"()) AND "public"."is_admin"()));



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



ALTER TABLE "public"."wiki_artikel" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wiki_artikel_select" ON "public"."wiki_artikel" FOR SELECT USING (("verein_id" = "public"."get_my_verein_id"()));



CREATE POLICY "wiki_artikel_write" ON "public"."wiki_artikel" USING ((("verein_id" = "public"."get_my_verein_id"()) AND ("public"."get_my_role"() = ANY (ARRAY['administrator'::"text", 'administration'::"text", 'trainer'::"text", 'funktionaer'::"text"]))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."nachrichten";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."nachrichten_antworten";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";






















































































































































GRANT ALL ON FUNCTION "public"."add_eltern_rolle"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_eltern_rolle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_eltern_rolle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_mitglied_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_mitglied_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_mitglied_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_verein_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_verein_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_verein_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pe_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."pe_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pe_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."abstimmung_antworten" TO "authenticated";
GRANT SELECT ON TABLE "public"."abstimmung_antworten" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."abstimmungen" TO "authenticated";
GRANT SELECT ON TABLE "public"."abstimmungen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."anwesenheiten" TO "authenticated";
GRANT SELECT ON TABLE "public"."anwesenheiten" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."api_sync_log" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."api_sync_log" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."api_sync_log" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."api_verbindungen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."api_verbindungen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."api_verbindungen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_log" TO "authenticated";
GRANT SELECT ON TABLE "public"."audit_log" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."aufgebote" TO "authenticated";
GRANT SELECT ON TABLE "public"."aufgebote" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benachrichtigungen" TO "authenticated";
GRANT SELECT ON TABLE "public"."benachrichtigungen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benutzer" TO "authenticated";
GRANT SELECT ON TABLE "public"."benutzer" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benutzer_funktionen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benutzer_funktionen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benutzer_funktionen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benutzer_teams" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benutzer_teams" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."benutzer_teams" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."bus_anmeldungen" TO "authenticated";
GRANT SELECT ON TABLE "public"."bus_anmeldungen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."busse" TO "authenticated";
GRANT SELECT ON TABLE "public"."busse" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."dokumente" TO "authenticated";
GRANT SELECT ON TABLE "public"."dokumente" TO "anon";



GRANT ALL ON TABLE "public"."elternkontakte" TO "authenticated";
GRANT ALL ON TABLE "public"."elternkontakte" TO "anon";
GRANT ALL ON TABLE "public"."elternkontakte" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feldsichtbarkeit" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feldsichtbarkeit" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feldsichtbarkeit" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."helper_einsaetze" TO "authenticated";
GRANT SELECT ON TABLE "public"."helper_einsaetze" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."helper_einsatz_pflicht" TO "authenticated";
GRANT SELECT ON TABLE "public"."helper_einsatz_pflicht" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."helper_einsatz_pflicht_mitglied" TO "authenticated";
GRANT SELECT ON TABLE "public"."helper_einsatz_pflicht_mitglied" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."helper_events" TO "authenticated";
GRANT SELECT ON TABLE "public"."helper_events" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."helper_schichten" TO "authenticated";
GRANT SELECT ON TABLE "public"."helper_schichten" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."helper_zuteilungen" TO "authenticated";
GRANT SELECT ON TABLE "public"."helper_zuteilungen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kader" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kader" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kader" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."kader_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."kader_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."kader_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kader_rollen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kader_rollen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kader_rollen" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."kader_rollen_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."kader_rollen_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."kader_rollen_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kommunikationsgruppen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kommunikationsgruppen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kommunikationsgruppen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kommunikationsgruppen_mitglieder" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kommunikationsgruppen_mitglieder" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kommunikationsgruppen_mitglieder" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."material" TO "authenticated";
GRANT SELECT ON TABLE "public"."material" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."material_ausleihen" TO "authenticated";
GRANT SELECT ON TABLE "public"."material_ausleihen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."medien" TO "authenticated";
GRANT SELECT ON TABLE "public"."medien" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_ansichten" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_ansichten" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_ansichten" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_notizen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_notizen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_notizen" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_notizen_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_notizen_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_notizen_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_team_details" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_team_details" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitglieder_team_details" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_team_details_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_team_details_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."mitglieder_team_details_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitgliedtyp_pflichtfelder" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitgliedtyp_pflichtfelder" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitgliedtyp_pflichtfelder" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitgliedtypen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitgliedtypen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."mitgliedtypen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modul_benutzer" TO "authenticated";
GRANT SELECT ON TABLE "public"."modul_benutzer" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modul_rechte" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modul_rechte" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modul_rechte" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modul_rollen" TO "authenticated";
GRANT SELECT ON TABLE "public"."modul_rollen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module" TO "authenticated";
GRANT SELECT ON TABLE "public"."module" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_berechtigungen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_berechtigungen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_berechtigungen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_config" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_config" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_config" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_delegationen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_delegationen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_delegationen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_antworten" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_antworten" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_antworten" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_dateien" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_dateien" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_dateien" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_gelesen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_gelesen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nachrichten_gelesen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."news" TO "authenticated";
GRANT SELECT ON TABLE "public"."news" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."news_kategorien" TO "authenticated";
GRANT SELECT ON TABLE "public"."news_kategorien" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."news_lesestatus" TO "authenticated";
GRANT SELECT ON TABLE "public"."news_lesestatus" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_einstellungen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_einstellungen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_einstellungen" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_funktionen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_funktionen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_funktionen" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."portal_funktionen_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."portal_funktionen_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."portal_funktionen_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_gruppen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_gruppen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_gruppen" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."portal_gruppen_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."portal_gruppen_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."portal_gruppen_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_gruppen_teams" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_gruppen_teams" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_gruppen_teams" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_rollen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_rollen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_rollen" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."portal_rollen_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."portal_rollen_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."portal_rollen_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT SELECT ON TABLE "public"."push_subscriptions" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rolle_pflichtfelder" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rolle_pflichtfelder" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rolle_pflichtfelder" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rollen" TO "authenticated";
GRANT SELECT ON TABLE "public"."rollen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."spiele" TO "authenticated";
GRANT SELECT ON TABLE "public"."spiele" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_helfer_zuteilungen" TO "authenticated";
GRANT SELECT ON TABLE "public"."team_helfer_zuteilungen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_helferaufgaben" TO "authenticated";
GRANT SELECT ON TABLE "public"."team_helferaufgaben" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_module" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_module" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_module" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_stufen" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_stufen" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_stufen" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."team_stufen_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."team_stufen_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."team_stufen_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teams" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teams" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teams" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."termine" TO "authenticated";
GRANT SELECT ON TABLE "public"."termine" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."trainings" TO "authenticated";
GRANT SELECT ON TABLE "public"."trainings" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."trainingsplaetze" TO "authenticated";
GRANT SELECT ON TABLE "public"."trainingsplaetze" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."trainingsplan_ausnahmen" TO "authenticated";
GRANT SELECT ON TABLE "public"."trainingsplan_ausnahmen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."trainingsplan_slots" TO "authenticated";
GRANT SELECT ON TABLE "public"."trainingsplan_slots" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."trainingsplan_vorlagen" TO "authenticated";
GRANT SELECT ON TABLE "public"."trainingsplan_vorlagen" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vereine" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vereine" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vereine" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."wiki_artikel" TO "authenticated";
GRANT SELECT ON TABLE "public"."wiki_artikel" TO "anon";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "service_role";




























