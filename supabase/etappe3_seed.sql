-- ═══════════════════════════════════════════════════════════════════════════
-- SEED FÜR ETAPPE 3 — die Fälle, die im Testbestand fehlen
-- 05.08.2026
--
-- ANLASS
-- Vier Prüfungen am 05.08.2026 haben dasselbe ergeben: Der Zufallsgenerator
-- hat einen Bestand erzeugt, in dem die schwierigen Fälle nicht vorkommen.
--
--   Etappe 1  : 0 gemeinsame E-Mails zwischen Mitglied und Elternteil
--   E-Mail-Index: 905 von 905 Personen haben eine E-Mail — kein Junior ohne
--   Abfrage 3-1: kein Elternteil mit zwei Kindern — keine Geschwister
--   Abfrage 3-2: 395 von 395 Elternkontakten haben eine E-Mail
--
-- Ein Umbau, der gegen diesen Bestand läuft, prüft nichts. Der Merge-Schritt
-- für Geschwister würde durchlaufen, ohne je einen Treffer zu haben — und
-- beim Fairgate-Import zum ersten Mal scharf laufen.
--
-- Derselbe Grund wie beim Seed in Etappe 1 (Martin Wyss, Sandra Vogt,
-- Familie Brunner, Peter Frei).
--
-- ─── WAS ENTSTEHT ──────────────────────────────────────────────────────────
--
-- FALL 5 — GESCHWISTER. Familie Odermatt: zwei Kinder, EIN Vater, EINE
--   E-Mail. In `elternkontakte` sind das ZWEI Zeilen (mitglied_id ist dort
--   NOT NULL) — und Etappe 1 hätte daraus zwei Personen gemacht. Genau das
--   muss Etappe 3 zusammenführen.
--
-- FALL 6 — ELTERNTEIL OHNE E-MAIL. Die Grossmutter eines Kindes, erreichbar
--   nur per Telefon. Sie kann sich nicht anmelden und darf beim Merge über
--   E-Mail-Gleichheit nicht mit anderen adresslosen Zeilen verschmelzen.
--
-- FALL 7 — KIND OHNE EIGENE E-MAIL. Der Normalfall bei Junioren: das Feld
--   bleibt leer, der Zugang läuft über den Elternteil. Prüft, dass der
--   partielle Unique-Index das zulässt und die Datenprüfung nicht anschlägt.
--
-- Alle Namen tragen den Zusatz „(Seed)" im Nachnamen NICHT — sie sollen sich
-- wie echte Daten verhalten. Erkennbar sind sie an der E-Mail-Domäne
-- @seed.example und am Kommentar hier.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

do $$
declare
  v_verein uuid;
  m_luca bigint; m_mia bigint; m_jonas bigint;
  e_odermatt_luca uuid; e_odermatt_mia uuid; e_grossmutter uuid;
  p_luca uuid; p_mia uuid; p_jonas uuid;
begin
  select id into v_verein from public.vereine order by created_at limit 1;
  if v_verein is null then raise exception 'Kein Verein gefunden'; end if;

  -- ── FALL 5: Geschwister Odermatt ────────────────────────────────────────
  -- Zwei Kinder, ein Vater, eine E-Mail. In elternkontakte zwangsläufig
  -- zwei Zeilen — das ist der Fall, den Etappe 3 auflösen muss.

  insert into public.personen (verein_id, vorname, nachname, email, strasse, plz, ort, kanton,
                               geburtsdatum, geschlecht, nationalitaet)
  values (v_verein,'Luca','Odermatt','luca.odermatt@seed.example',
          'Seestrasse 44','8703','Erlenbach','ZH','2013-03-14','m','CH')
  returning id into p_luca;

  insert into public.mitglieder (person_id, vorname, nachname, email, strasse, plz, ort, kanton,
                                 geburtsdatum, geschlecht, nationalitaet, mitgliedtyp, aktiv, verein_id)
  values (p_luca,'Luca','Odermatt','luca.odermatt@seed.example',
          'Seestrasse 44','8703','Erlenbach','ZH','2013-03-14','m','CH','Juniorenmitglied',true,v_verein)
  returning id into m_luca;

  insert into public.personen (verein_id, vorname, nachname, email, strasse, plz, ort, kanton,
                               geburtsdatum, geschlecht, nationalitaet)
  values (v_verein,'Mia','Odermatt','mia.odermatt@seed.example',
          'Seestrasse 44','8703','Erlenbach','ZH','2015-09-02','w','CH')
  returning id into p_mia;

  insert into public.mitglieder (person_id, vorname, nachname, email, strasse, plz, ort, kanton,
                                 geburtsdatum, geschlecht, nationalitaet, mitgliedtyp, aktiv, verein_id)
  values (p_mia,'Mia','Odermatt','mia.odermatt@seed.example',
          'Seestrasse 44','8703','Erlenbach','ZH','2015-09-02','w','CH','Juniorenmitglied',true,v_verein)
  returning id into m_mia;

  -- Derselbe Vater, zweimal erfasst — einmal pro Kind.
  insert into public.elternkontakte (mitglied_id,name,vorname,nachname,email,telefon,beziehung,hauptkontakt,verein_id)
  values (m_luca,'Stefan Odermatt','Stefan','Odermatt','stefan.odermatt@seed.example','+41 79 300 10 01','Vater',true,v_verein)
  returning id into e_odermatt_luca;

  insert into public.elternkontakte (mitglied_id,name,vorname,nachname,email,telefon,beziehung,hauptkontakt,verein_id)
  values (m_mia,'Stefan Odermatt','Stefan','Odermatt','stefan.odermatt@seed.example','+41 79 300 10 01','Vater',true,v_verein)
  returning id into e_odermatt_mia;

  insert into public.eltern_kinder (verein_id,eltern_id,mitglied_id,hauptkontakt,beziehung)
  values (v_verein,e_odermatt_luca,m_luca,true,'Vater'),
         (v_verein,e_odermatt_mia, m_mia, true,'Vater');

  -- ── FALL 6+7: Kind ohne eigene E-Mail, Grossmutter ohne E-Mail ──────────
  -- Der Normalfall bei Junioren. Beide Felder bleiben leer — der partielle
  -- Unique-Index auf personen.email muss das zulassen.

  insert into public.personen (verein_id, vorname, nachname, email, strasse, plz, ort, kanton,
                               geburtsdatum, geschlecht, nationalitaet)
  values (v_verein,'Jonas','Steiner',null,
          'Kirchweg 2','8704','Herrliberg','ZH','2016-01-20','m','CH')
  returning id into p_jonas;

  insert into public.mitglieder (person_id, vorname, nachname, email, strasse, plz, ort, kanton,
                                 geburtsdatum, geschlecht, nationalitaet, mitgliedtyp, aktiv, verein_id)
  values (p_jonas,'Jonas','Steiner',null,
          'Kirchweg 2','8704','Herrliberg','ZH','2016-01-20','m','CH','Juniorenmitglied',true,v_verein)
  returning id into m_jonas;

  insert into public.elternkontakte (mitglied_id,name,vorname,nachname,email,telefon,beziehung,hauptkontakt,verein_id)
  values (m_jonas,'Rosmarie Steiner','Rosmarie','Steiner',null,'+41 44 915 22 33','Grossmutter',true,v_verein)
  returning id into e_grossmutter;

  insert into public.eltern_kinder (verein_id,eltern_id,mitglied_id,hauptkontakt,beziehung)
  values (v_verein,e_grossmutter,m_jonas,true,'Grossmutter');

  raise notice 'Seed gesetzt: Luca %, Mia %, Jonas %', m_luca, m_mia, m_jonas;
end $$;

commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATION — die Fälle müssen jetzt VORKOMMEN
-- ═══════════════════════════════════════════════════════════════════════════

-- S1: Geschwister — muss ab jetzt eine Zeile liefern (Stefan Odermatt, 2 Kinder)
select lower(btrim(email)) as mail, count(*) as zeilen,
       array_agg(mitglied_id order by mitglied_id) as kinder
  from public.elternkontakte
 where email is not null and btrim(email) <> ''
 group by verein_id, lower(btrim(email))
having count(*) > 1;

-- S2: ohne E-Mail — muss ab jetzt >0 sein (Rosmarie Steiner, Jonas Steiner)
select (select count(*) from public.elternkontakte where email is null or btrim(email)='') as eltern_ohne_mail,
       (select count(*) from public.personen       where email is null or btrim(email)='') as personen_ohne_mail;

-- S3: der Unique-Index stört die leeren E-Mails nicht
select count(*) as personen_gesamt from public.personen;
