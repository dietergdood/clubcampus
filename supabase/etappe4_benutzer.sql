-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 4 — Benutzer an die Person
-- 05.08.2026
--
-- ZWEI DINGE AUF EINMAL, weil sie dieselbe Ursache haben:
--
-- 1. `benutzer` verliert vorname/nachname/telefon — die stehen an der Person.
--
-- 2. Der Registrierungsablauf wird repariert. Er steht auf zwei Funktionen,
--    und BEIDE suchen an Orten, die heute stillgelegt sind:
--
--      mitglieder.email   seit Etappe 2b eine ALTSPALTE. Wer seine Adresse
--                         im Portal aendert, landet in `personen` — in
--                         `mitglieder` steht weiterhin die alte. Diese
--                         Person wird bei der Registrierung nicht gefunden.
--      elternkontakte     seit Etappe 3 abgeloest. Neue Elternteile stehen
--                         dort nicht mehr und koennen sich nicht anmelden.
--
--    Dazu setzt handle_new_user() role = 'mitglied' — einen Wert, den es in
--    der Rollenliste gar nicht gibt (administrator, administration, vorstand,
--    funktionaer, trainer, spieler, eltern, supporter).
--
-- ─── WER SICH REGISTRIEREN DARF ────────────────────────────────────────────
-- Nur wer bereits als Person erfasst ist. Die Administration legt die Person
-- an, danach kann sie sich anmelden — nicht umgekehrt.
--
-- Bisher lief das halbherzig: Bei unbekannter E-Mail brach der Trigger still
-- ab (RETURN NEW). Die Zeile in `auth.users` blieb trotzdem stehen — ein
-- Anmeldekonto ohne Portal-Zeile, das nirgends auftaucht. Genau die
-- verwaisten Auth-User aus der TODO-Liste.
--
-- AB JETZT WIRFT DER TRIGGER. Supabase rollt die auth.users-Zeile dann mit
-- zurueck, es bleibt nichts liegen. Das wirkt auch, wenn jemand am Formular
-- vorbei direkt gegen /auth/v1/signup registriert — der anon-Schluessel
-- steht im ausgelieferten JavaScript und ist oeffentlich.
--
-- Das Formular blockt zusaetzlich freundlich ueber check_email_bekannt.
-- Zwei Riegel: einer erklaert, einer haelt.
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Sperrabfragen                                                 ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- A1: Benutzer ohne Person. Muss LEER sein — sonst verlieren diese Konten
--     mit Block D ihren Namen ersatzlos.
select id, email, name, vorname, nachname, telefon
  from public.benutzer
 where person_id is null;

-- A2: Stehen in den Altspalten Werte, die NICHT an der Person stehen?
--     Muss leer sein, sonst gingen sie mit Block D verloren.
select b.email,
       b.vorname  as benutzer_vorname,  p.vorname  as person_vorname,
       b.nachname as benutzer_nachname, p.nachname as person_nachname,
       b.telefon  as benutzer_telefon,  p.telefon  as person_telefon
  from public.benutzer b
  join public.personen p on p.id = b.person_id
 where (nullif(btrim(coalesce(b.vorname,'')),'')  is not null
        and coalesce(b.vorname,'')  is distinct from coalesce(p.vorname,''))
    or (nullif(btrim(coalesce(b.nachname,'')),'') is not null
        and coalesce(b.nachname,'') is distinct from coalesce(p.nachname,''))
    or (nullif(btrim(coalesce(b.telefon,'')),'')  is not null
        and coalesce(b.telefon,'')  is distinct from coalesce(p.telefon,''));


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — check_email_bekannt auf `personen`     >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Das Formular fragt hier an, waehrend jemand tippt. Antwortet die        ║
-- ║ Funktion „unbekannt", kommt es gar nicht erst zum Anlegen.              ║
-- ║                                                                         ║
-- ║ Rueckgabe bleibt gleich aufgebaut (bekannt, name, mitglied_id,          ║
-- ║ eltern_id) — der Anwendungscode muss nicht angefasst werden. `eltern_id`║
-- ║ traegt jetzt die Personen-Id statt der elternkontakte-Id.               ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.check_email_bekannt(p_email text, p_verein_id uuid)
RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path = public
    AS $$
  with p as (
    select id, vorname, nachname
      from public.personen
     where verein_id = p_verein_id
       and lower(btrim(email)) = lower(btrim(p_email))
     limit 1
  )
  select json_build_object(
    'bekannt',     exists (select 1 from p),
    'name',        coalesce((select vorname || ' ' || nachname from p),
                            split_part(p_email, '@', 1)),
    'person_id',   (select id from p),
    'mitglied_id', (select m.id from public.mitglieder m
                     where m.person_id = (select id from p)
                       and m.aktiv limit 1),
    /* Altname beibehalten: das Formular liest ihn. Traegt jetzt die
       Personen-Id, nicht mehr die elternkontakte-Id. */
    'eltern_id',   (select id from p)
  );
$$;

ALTER FUNCTION public.check_email_bekannt(text, uuid) OWNER TO postgres;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — handle_new_user auf `personen`         >>> SCHREIBT <<<       ║
-- ║                                                                         ║
-- ║ Setzt person_id statt vorname/nachname/telefon, findet das Mitglied     ║
-- ║ ueber die Person, und WIRFT bei unbekannter E-Mail.                     ║
-- ║                                                                         ║
-- ║ ROLLE nach derselben Kette wie ableitRolle() im Frontend:               ║
-- ║   Mitgliedschaft      -> mitgliedtypen.standard_rolle                   ║
-- ║   sonst mit Kind      -> 'eltern'                                       ║
-- ║   sonst               -> 'supporter'                                    ║
-- ║ Beim ersten Login rechnet useDbUser sie ohnehin neu — hier geht es nur  ║
-- ║ darum, keinen Unsinn hineinzuschreiben.                                 ║
-- ║                                                                         ║
-- ║ ⚠ Das frühere `EXCEPTION WHEN OTHERS THEN RETURN NEW` ist weg. Es hätte ║
-- ║   die neue Ausnahme gleich wieder verschluckt. Nur der Verlaufseintrag  ║
-- ║   am Schluss bleibt gekapselt — er darf keine Registrierung verhindern. ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
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
  /* Die Person ist die Wahrheit. personen.email ist pro Verein eindeutig
     (personen_email_pro_verein), es gibt also hoechstens einen Treffer. */
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
    (SELECT vorname || ' ' || nachname FROM public.personen WHERE id = v_person_id),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.benutzer (id, email, name, role, aktiv, verein_id, person_id, mitglied_id)
  VALUES (NEW.id, NEW.email, v_name, v_rolle, true, v_verein_id, v_person_id, v_mitglied_id)
  ON CONFLICT (id) DO UPDATE SET
    person_id   = COALESCE(EXCLUDED.person_id,   benutzer.person_id),
    mitglied_id = COALESCE(EXCLUDED.mitglied_id, benutzer.mitglied_id);

  /* Nebenwirkungen gekapselt: ein Fehler im Verlaufseintrag darf die
     Registrierung nicht scheitern lassen. */
  IF v_mitglied_id IS NOT NULL THEN
    BEGIN
      UPDATE public.mitglieder
         SET hat_portal_zugang = true, updated_at = now()
       WHERE id = v_mitglied_id;
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

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Altspalten streichen                   >>> STRUKTUR <<<       ║
-- ║                                                                         ║
-- ║ Erst ausfuehren, wenn A1 und A2 leer waren UND der Code umgestellt ist  ║
-- ║ (getProfilCheck liest dbUser.vorname/nachname/telefon).                 ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- begin;
--
-- alter table public.benutzer drop column vorname;
-- alter table public.benutzer drop column nachname;
-- alter table public.benutzer drop column telefon;
--
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATION
-- ═══════════════════════════════════════════════════════════════════════════

-- V1: Bekannte E-Mail — muss bekannt=true liefern, mit Person und Mitglied.
select public.check_email_bekannt(
  (select email from public.personen p
    join public.mitglieder m on m.person_id = p.id
   where p.email is not null limit 1),
  (select id from public.vereine limit 1));

-- V2: Unbekannte E-Mail — muss bekannt=false liefern, ohne zu scheitern.
select public.check_email_bekannt('gibtsnicht@example.invalid',
                                  (select id from public.vereine limit 1));

-- V3: Der harte Riegel. Muss mit der Meldung aus Block C scheitern.
--     Nur zum Ausprobieren — bewusst mit rollback.
-- begin;
-- insert into auth.users (id, email, aud, role, instance_id)
-- values (gen_random_uuid(), 'gibtsnicht@example.invalid', 'authenticated',
--         'authenticated', '00000000-0000-0000-0000-000000000000');
-- rollback;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Code liefern, dann Block D, dann:
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
--
--   supabase/auth_triggers.sql muss NICHT angefasst werden — die Trigger
--   selbst bleiben, nur die aufgerufenen Funktionen aendern sich. Der
--   Kommentar dort beschreibt aber noch das alte Verhalten und gehoert
--   nachgefuehrt.
-- ═══════════════════════════════════════════════════════════════════════════
