-- ═══════════════════════════════════════════════════════════════════════════
-- TESTKONTO TRAINER — anlegen, damit die Trainer-Befunde pruefbar werden
-- 23.08.2026
--
-- ⚠ ES GIBT KEINEN TRAINER-ZUGANG. Das alte „Trainer Tester" trug die Rolle
--   `supporter`, nicht `trainer` — und war ausserdem nie anmeldefaehig (siehe
--   unten). Ohne einen echten Trainer sind drei Befunde aus
--   `docs/auftrag_rls_gruppenrechte.md` nicht pruefbar:
--
--     kader_write         fuehrt `trainer`, aber nicht `funktionaer`
--     personen_select_priv gibt einem Trainer 914 Adressen und AHV-Nummern
--     getFieldVisibility  erreicht keine Liste — `fv.` kommt in keiner vor
--
--   Alle drei sind heute BEHAUPTUNGEN aus dem Schema. Mit einem Zugang werden
--   sie Messungen.
--
--
-- ⚠ WARUM DIESER BLOCK KEIN KONTO ANLEGT — DIE LEHRE VOM 23.08.2026
--
--   Beide alten Testkonten (`trainer@fch-test.ch`, `funktionaer@fch-test.ch`)
--   waren per SQL in `auth.users` eingetragen worden. Sie sahen in jeder
--   Tabelle richtig aus und waren trotzdem keine Konten:
--
--     auth.identities   0 Zeilen   → Anmeldung unmoeglich
--     aud               NULL       → `auth.admin.deleteUser` scheitert mit
--                                    „Database error loading user"
--
--   Ein Konto ohne Identity ist WEDER ANMELDEFAEHIG NOCH LOESCHBAR. Es faellt
--   nicht auf, solange niemand es benutzt — und wer es dann benutzen will,
--   sucht den Fehler im Portal statt im Datensatz.
--
--   ⚠ DESHALB: KEIN `insert into auth.users`. NIE. Das Konto entsteht ueber
--   die normale Anmeldemaske; nur dort legt GoTrue Identity und `aud` mit an.
--   Dieser Block legt allein die PERSON an, die `handle_new_user()` bei der
--   Registrierung ueber die E-Mail findet.
--
--
-- DIE ADRESSE
--
--   dieter.good+trainer@gmail.com — Gmail reicht Plus-Adressen an dasselbe
--   Postfach durch, die Bestaetigungsmail kommt also an.
--
--   Gegen `personen_email_pro_verein` geprueft am 23.08.2026: 0 Treffer.
--   Der Index ist partiell und normalisiert:
--     UNIQUE (verein_id, lower(btrim(email))) WHERE email IS NOT NULL AND btrim(email) <> ''
--
--
-- ⚠ WARUM DIE PERSON EINE MITGLIEDSCHAFT BRAUCHT — anders als beim Elternteil
--
--   `ableitRolle()` bestimmt die Portalrolle aus den KADER-ROLLEN, ersatzweise
--   aus `mitgliedtypen.standard_rolle`, dann aus den Funktionen. Eine Person
--   ohne Mitgliedschaft und ohne Kadereintrag wird nie `trainer` — und eine
--   von Hand gesetzte Rolle ueberschreibt `ableitUndSaveRolle()` beim naechsten
--   Kader-, Team- oder Funktionswechsel wieder (siehe CLAUDE.md, „Von Hand
--   gesetzte Rollen werden still ueberschrieben").
--
--   Die Rolle muss also VERDIENT sein, nicht gesetzt: eine Mitgliedschaft plus
--   ein Kadereintrag mit einer Rolle, die `ist_trainer` traegt.
--
--
-- ABLAUF
--
--   1. Diesen Block ausfuehren.
--   2. Ueber die normale Anmeldemaske registrieren (Adresse siehe unten).
--   3. Gegenpruefen: `benutzer.role` muss `trainer` sein — NICHT von Hand
--      setzen. Steht dort etwas anderes, ist die Kaderrolle das Problem.
--   4. Rueckbau am Ende dieser Datei.
-- ═══════════════════════════════════════════════════════════════════════════

-- PROBELAUF vom 23.08.2026 (BEGIN … ROLLBACK ueber den Session-Pooler):
--
--   Person          Trainer Zugang   dieter.good+trainer@gmail.com
--   Mitgliedschaft  Aktivmitglied, aktiv
--   Kader           Team „1. Mannschaft" als Trainer/in
--   Zaehlstand      personen 914, aktive Mitgliedschaften 511 (je +1)
--   nach ROLLBACK   nichts stehengeblieben
--
-- ⚠ UND EINE WARNUNG ZUM PROBIEREN SELBST. Mein erstes Probe-Skript schnitt
--   den Block mit `indexOf("end $mig$;")` heraus — die Zeichenkette gibt es
--   in dieser Datei nicht, weil `end` und `$mig$;` auf zwei Zeilen stehen.
--   `indexOf` gab -1, die Scheibe war leer, und der Aufruf lief ohne Fehler
--   durch. Die Gegenprobe fand dann nichts und sah aus wie ein Befund am
--   Block: „legt nichts an".
--
--   Aufgefallen ist es nur, weil das Skript die LAENGE der Scheibe mitgedruckt
--   hat, und die war negativ. Dieselbe Familie wie alles andere an diesem Tag:
--   ein Werkzeug, das nichts tut, meldet nichts — und die Stille sieht aus wie
--   ein Ergebnis. Wer einen Block programmatisch herausschneidet, druckt seine
--   Laenge mit.

do $mig$
declare
  v_verein  uuid;
  v_email   text := 'dieter.good+trainer@gmail.com';
  v_person  uuid;
  v_typ     text;
  v_team    bigint;
  v_rolle   text;
  v_mitgl   bigint;
  v_anz     int;
begin
  select id into v_verein from public.vereine where slug = 'fcherrliberg';
  if v_verein is null then raise exception 'ABBRUCH: Verein fcherrliberg nicht gefunden'; end if;

  select count(*) into v_anz from public.personen
   where verein_id = v_verein and lower(btrim(email)) = lower(btrim(v_email));
  if v_anz > 0 then
    raise exception 'ABBRUCH: % gehoert bereits einer Person in diesem Verein.', v_email;
  end if;

  /* Ein Mitgliedtyp fuer Erwachsene ohne Hauptkontakt-Pflicht — sonst
     verlangt die Datenpruefung einen Elternteil fuer einen Trainer. */
  select name into v_typ from public.mitgliedtypen
   where verein_id = v_verein and aktiv and not coalesce(hauptkontakt_pflicht, false)
     and name = 'Aktivmitglied';
  if v_typ is null then raise exception 'ABBRUCH: Mitgliedtyp Aktivmitglied nicht gefunden.'; end if;

  /* ⚠ EINE KADERROLLE MIT `ist_trainer`, nicht eine mit dem Namen „Trainer".
     Ein Filter auf den Namen prueft eine Schreibweise, ein Filter auf das
     Merkmal prueft die Sache (CLAUDE.md). */
  select name into v_rolle from public.kader_rollen
   where verein_id = v_verein and coalesce(aktiv, true) and ist_trainer
   order by (name = 'Trainer/in') desc, name
   limit 1;
  if v_rolle is null then raise exception 'ABBRUCH: keine Kaderrolle mit ist_trainer gefunden.'; end if;

  select id into v_team from public.teams where verein_id = v_verein order by id limit 1;
  if v_team is null then raise exception 'ABBRUCH: kein Team gefunden.'; end if;

  insert into public.personen (verein_id, vorname, nachname, email)
  values (v_verein, 'Trainer', 'Zugang', v_email)
  returning id into v_person;

  insert into public.mitglieder (verein_id, person_id, mitgliedtyp, aktiv, eintrittsdatum)
  values (v_verein, v_person, v_typ, true, current_date)
  returning id into v_mitgl;

  insert into public.kader (verein_id, mitglied_id, team_id, rollen, aktiv)
  values (v_verein, v_mitgl, v_team, array[v_rolle], true);

  raise notice 'Person %  (%)', v_person, v_email;
  raise notice 'Mitgliedschaft % als %, Kader in Team % als %', v_mitgl, v_typ, v_team, v_rolle;
  raise notice 'Jetzt ueber die Anmeldemaske registrieren. Erwartete Rolle: trainer.';
  raise notice 'Zum Rueckbau notieren: person=%  mitglied=%', v_person, v_mitgl;
end
$mig$;


-- ═══════════════════════════════════════════════════════════════════════════
-- AUSGEFUEHRT am 23.08.2026
--
--   Person          84f0514a-080d-4a36-94c0-928b9743570d   Trainer Zugang
--   Mitgliedschaft  3530   Aktivmitglied, aktiv
--   Kader           Team 1 „1. Mannschaft" als Trainer/in
--   Zaehlstand      personen 914, aktive Mitgliedschaften 511, auth.users 4
--
-- ⚠ Ein erneuter Lauf bricht jetzt ab („gehoert bereits einer Person"). Das
--   ist kein Fehler, sondern der Waechter.
--
-- ⚠ OFFEN: die Registrierung. Ohne sie gibt es die Person, aber kein Konto —
--   und damit weiterhin keinen Trainer-Zugang.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- GEGENPROBE nach der Registrierung
--
--   select b.role, b.ist_admin, p.email
--     from public.benutzer b join public.personen p on p.id = b.person_id
--    where p.email = 'dieter.good+trainer@gmail.com';
--
--   Erwartet: role = 'trainer', ist_admin = false.
--
-- ⚠ Steht dort `spieler`, traegt die gewaehlte Kaderrolle kein `ist_trainer`.
--   Dann ist NICHT die Rolle von Hand zu setzen — sondern die Kaderrolle zu
--   berichtigen. Eine gesetzte Rolle ueberlebt den naechsten Kaderwechsel
--   nicht.
--
--
-- RUECKBAU (Person-Id aus der NOTICE einsetzen)
--
--   Ueber „Person loeschen (DSGVO)" in der Oberflaeche — der Weg, der auch
--   das Anmeldekonto mitnimmt. Von Hand geloescht bliebe `auth.users` stehen,
--   und die Adresse waere dauerhaft blockiert. Genau der Fall vom 23.08.2026.
-- ═══════════════════════════════════════════════════════════════════════════
