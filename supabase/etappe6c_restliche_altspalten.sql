-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 6c — die restlichen Altspalten aus `mitglieder`
-- 05.08.2026
--
-- Fuenf Spalten, jede aus einem anderen Grund ueberfluessig:
--
--   hat_portal_zugang   Kopie derselben Aussage wie die Verknuepfung
--                       `benutzer.mitglied_id`. Konnte veralten: wurde ein
--                       Konto ausserhalb des Portals geloescht, blieb das
--                       Kennzeichen auf true stehen. Der Join kann das nicht.
--
--   eltern (jsonb)      Momentaufnahme der Elternkontakte. Wurde NIE
--                       befuellt — deshalb bekamen Eltern nie einen
--                       Datenpruefungs-Hinweis fuer ihre Kinder. Seit
--                       Etappe 3 doppelt tot, die Verknuepfung steht in
--                       `eltern_kinder`.
--
--   datenstatus         Ersetzt durch `profil_geprueft_at`. Im Code seit
--                       Session 17 als veraltet markiert und nicht mehr
--                       ausgewertet.
--
--   notizen             Ersetzt durch die Tabelle `mitglieder_notizen`
--                       (mehrere Notizen mit Verfasser und Datum).
--
--   fairgate_sync_at    Null Fundstellen im Code. Der Fairgate-Umzug ist
--                       als einmaliger CSV-Import geplant, nicht als Sync.
--
-- ⚠ KEIN ROLLBACK. Block B legt vorher eine Sicherheitskopie an.
--
-- ─── EINE LUECKE BLEIBT, BEWUSST ───────────────────────────────────────────
-- Mit `eltern` faellt eine Abfrage weg, die ohnehin immer leer war: welche
-- Kinder gehoeren zum angemeldeten Elternteil. Sie steckt jetzt an EINER
-- Stelle als `kinderVonElternteil()` in getProfilCheck und liefert eine
-- leere Liste — mit Begruendung im Kommentar.
--
-- Sie ueber `eltern_kinder` richtig zu lesen ist eine VERHALTENSAENDERUNG:
-- Eltern saehen plotzlich Datenpruefungs-Hinweise fuer ihre Kinder, die sie
-- nie gesehen haben. Das ist ein eigener Schritt.
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK A — Bestandsaufnahme                                              ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

select count(*) filter (where hat_portal_zugang) as hat_portal_zugang,
       count(*) filter (where eltern is not null and eltern::text <> '[]'
                          and eltern::text <> 'null')            as eltern_gefuellt,
       count(*) filter (where datenstatus is not null)           as datenstatus,
       count(*) filter (where notizen is not null)               as notizen,
       count(*) filter (where fairgate_sync_at is not null)      as fairgate_sync_at,
       count(*) as gesamt
  from public.mitglieder;

-- A2: Stimmt das Kennzeichen mit der Wirklichkeit ueberein? Jede Zeile hier
--     ist ein Beleg dafuer, dass es veralten konnte.
select m.id, p.vorname, p.nachname,
       m.hat_portal_zugang as kennzeichen,
       (b.id is not null)  as konto_vorhanden,
       b.aktiv             as konto_aktiv
  from public.mitglieder m
  join public.personen p on p.id = m.person_id
  left join public.benutzer b on b.mitglied_id = m.id
 where coalesce(m.hat_portal_zugang, false) <> (b.id is not null and coalesce(b.aktiv, true));


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK B — Sicherheitskopie                       >>> SCHREIBT <<<       ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

create table if not exists public._etappe6c_altspalten_mitglieder as
select id, person_id, hat_portal_zugang, eltern, datenstatus, notizen,
       fairgate_sync_at, now() as gesichert_am
  from public.mitglieder;

commit;

select count(*) as gesicherte_zeilen from public._etappe6c_altspalten_mitglieder;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK C — Der Registrierungs-Trigger              >>> SCHREIBT <<<      ║
-- ║                                                                         ║
-- ║ handle_new_user() setzt hat_portal_zugang. Muss VOR Block D raus,      ║
-- ║ sonst scheitert jede Registrierung an einer Spalte, die es nicht mehr  ║
-- ║ gibt — und zwar erst zur Laufzeit.                                     ║
-- ║                                                                         ║
-- ║ Der Verlaufseintrag bleibt: dass ein Zugang eingerichtet wurde, gehoert ║
-- ║ in die Historie.                                                        ║
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

  /* Kein hat_portal_zugang mehr (Etappe 6c): der Zugang haengt allein an
     benutzer.mitglied_id, das oben gesetzt wird. Der Verlaufseintrag bleibt. */
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

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK D — Die Spalten streichen                  >>> STRUKTUR <<<       ║
-- ║                                                                         ║
-- ║ ERST ausfuehren, wenn Block C gelaufen UND der Code eingespielt ist.    ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

begin;

alter table public.mitglieder
  drop column hat_portal_zugang,
  drop column eltern,
  drop column datenstatus,
  drop column notizen,
  drop column fairgate_sync_at;

commit;


-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ BLOCK E — Verifikation                                                  ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- Muss leer sein.
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mitglieder'
   and column_name in ('hat_portal_zugang','eltern','datenstatus','notizen','fairgate_sync_at');

-- Was von `mitglieder` uebrig ist: die reine Mitgliedschaft.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mitglieder'
 order by ordinal_position;

-- Der Trigger nennt die Spalte nicht mehr.
select pg_get_functiondef('public.handle_new_user()'::regprocedure) like '%hat_portal_zugang%'
       as nennt_die_spalte_noch;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   npm run typecheck && npm run build && npm test   -> 362 gruen
--   npx supabase db dump --linked -f supabase/schema.sql
--   npx supabase gen types typescript --linked > src/database.types.ts
--
--   Sicherheitskopien loeschen, wenn ein paar Wochen nichts auffaellt:
--     drop table public._etappe6_altspalten_mitglieder;
--     drop table public._etappe6b_position_mitglieder;
--     drop table public._etappe6c_altspalten_mitglieder;
-- ═══════════════════════════════════════════════════════════════════════════
