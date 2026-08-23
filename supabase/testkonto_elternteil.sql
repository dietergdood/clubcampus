-- ═══════════════════════════════════════════════════════════════════════════
-- TESTKONTO ELTERNTEIL — anlegen, nachweisen, entfernen
-- 21.08.2026
--
-- Kein Elternteil hat heute ein Portal-Konto (0 von 394, gemessen am
-- 21.08.2026). Der Nachweis aus `auftrag_elternseite.md` — „mit einem echten
-- Elternkonto in der Oberflaeche zeigen, dass eine AHV-Nummer ankommt" —
-- braucht deshalb erst eines.
--
-- ⚠ EIN GRUENER TEST ERSETZT DIESEN NACHWEIS NICHT. Alle fuenf
-- Unterbrechungen der Kette waren ohne Fehlermeldung: gesperrtes Lesen ergab
-- eine leere Liste, gesperrtes Schreiben eine falsche Diagnose, und die
-- Erfolgsmeldung stand ohne Deckung da. Was so ausfaellt, faellt auch im Test
-- so aus, wenn der Test dieselbe Annahme trifft.
--
--
-- KEINE ERFUNDENEN MITGLIEDER
--
-- Die Testperson bekommt KEINE Mitgliedschaft und wird mit einem BESTEHENDEN
-- Junior verknuepft. Damit verschieben sich weder die 388 aktiven Junioren
-- noch die 372 ohne AHV-Nummer — die Zahlen, an denen der Fortschritt
-- gemessen wird, bleiben vergleichbar.
--
-- ⚠ UND SIE DARF KEINE BEKOMMEN. `handle_new_user()` liest bei einer aktiven
-- Mitgliedschaft `mitgliedtypen.standard_rolle` und nimmt sie VOR `eltern`.
-- Eine Testperson mit Mitgliedschaft bekaeme also `spieler` und liefe nie in
-- den Elternzweig, den es zu pruefen gilt.
--
-- Verknuepft wird mit einem Junior, der SCHON einen Elternteil hat. Sonst
-- verschwaende einer der drei Junioren ohne Elternteil (665 Andreas Herzig,
-- 680 Leon Ulrich, 936 Anna Vogt) aus der Liste, die die Verwaltung abarbeiten
-- soll.
--
--
-- ABLAUF
--
--   1. Diesen Block ausfuehren (die Adresse steht im Block).
--   2. Ueber die normale Anmeldemaske registrieren. `handle_new_user()` findet
--      die Person ueber die E-Mail und setzt die Rolle `eltern`, weil eine
--      Zeile in `eltern_kinder` steht und keine Mitgliedschaft.
--   3. Nachweis fuehren: AHV-Nummer des Kindes erfassen, speichern, in der
--      Verwaltung gegenlesen.
--   4. Rueckbau am Ende dieser Datei.
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠ KEIN `\set` MEHR. Es ist eine Anweisung an das Programm psql, keine an
--    die Datenbank — der SQL-Editor im Supabase-Dashboard kennt sie nicht und
--    bricht daran ab. Die Adresse steht deshalb unten direkt im Block; sie zu
--    aendern ist genau eine Zeile.
--
-- PROBELAUF vom 21.08.2026 (BEGIN … ROLLBACK ueber den Session-Pooler):
--
--   gewaehlter Junior   #633 Stefan Wenger
--   AHV fehlt           ja  — der Nachweis beweist also etwas
--   Elternteile am Kind 2 nach dem Lauf, hatte also schon einen: die Liste
--                       der drei ohne Elternteil (665, 680, 936) bleibt bei 3
--   Mitgliedschaften    0, Kinder 1 — handle_new_user() nimmt den `eltern`-
--                       Zweig und nicht `mitgliedtypen.standard_rolle`
--   388 / 372 / 3       unveraendert, gemessen NACH dem Insert
--   nach dem ROLLBACK   nichts stehengeblieben


-- ═══════════════════════════════════════════════════════════════════════════
-- DIE FUENF KONTEN — Bestandsaufnahme vom 23.08.2026
--
-- Gemessen, weil vor dem ersten scharfen Loeschlauf die Frage aufkam, welches
-- Konto man dafuer ausgeben kann.
--
--   Person              Rolle           Mitgl.  Kinder  Kader
--   Dieter Good         administrator     0       0       0    (ist_admin)
--   Test Elternteil     eltern            0       1       0
--   Funktionaer Tester  funktionaer       0       0       0
--   Adrian Kaiser       spieler           1       0       7    echtes Mitglied
--   Trainer Tester      supporter         0       0       0
--
-- ⚠ JEDES DER FUENF IST DAS EINZIGE SEINER ROLLE. Es gibt keinen zweiten
--   Zugang, mit dem sich eine Rolle pruefen liesse — wer eines loescht, gibt
--   die Pruefbarkeit dieser Rolle auf, bis es neu angelegt ist.
--
-- ⚠ BERICHTIGT AM 23.08.2026, NACH DEM ERSTEN SCHARFEN LOESCHLAUF: BEIDE
--   TESTKONTEN WAREN NIE ANMELDEFAEHIG. `trainer@fch-test.ch` und
--   `funktionaer@fch-test.ch` haben je NULL Zeilen in `auth.identities` —
--   von Hand angelegt, nie angemeldet. Ohne Identity kann sich niemand
--   anmelden, und `auth.admin.deleteUser` scheitert mit „Database error
--   loading user".
--
--   Der Absatz darunter stimmt also nur zur Haelfte: es fehlt nicht nur der
--   Trainer-ZUGANG, es fehlen BEIDE. Wer eines der zwei fuer eine Pruefung
--   einplant, plant mit etwas, das es nicht gibt.
--
--   ⚠ Deshalb entstehen neue Testkonten NUR ueber die Anmeldemaske, nie per
--   SQL-Insert in `auth.users`. Ein von Hand angelegter Eintrag sieht in
--   jeder Tabelle richtig aus und ist trotzdem keiner.
--
-- ⚠ UND „TRAINER TESTER" HAT DIE ROLLE `supporter`, NICHT `trainer`. Einen
--   Trainer-Zugang gibt es ueberhaupt nicht. Der Name verspricht etwas, das
--   die Rolle nicht haelt: wer damit Trainer-Verhalten prueft, prueft
--   Supporter-Verhalten — und alles, was ein Trainer MEHR darf (`team`,
--   `training`, `events` auf `verwalten`), faellt dabei nicht auf, weil es
--   schlicht fehlt statt falsch zu sein.
--
--   Dieselbe Familie wie ein Filter auf einen Namen statt auf ein Merkmal:
--   der Name steht in `personen`, die Rolle in `benutzer`, und niemand haelt
--   sie gegeneinander.
--
-- ⚠ TEST ELTERNTEIL IST DER EINZIGE ELTERNTEIL MIT KONTO — 393 weitere
--   Elternteile haben keines (gemessen 23.08.2026). Was ohne ihn nicht mehr
--   von innen zu pruefen ist: `DatenpruefungEltern`, `personenStand()`, der
--   „Mein Kind"-Befund und der Portal-Status einer Person ohne
--   Mitgliedschaft. Alle vier stehen offen.
--
--
-- LAEUFT DER BLOCK UNTEN NOCH? — Probelauf vom 23.08.2026
--
-- Gegen die laufende Datenbank, mit BEGIN … ROLLBACK und dem Zustand NACH
-- einem Loeschen von Test Elternteil hergestellt:
--
--   Person angelegt      ja
--   gewaehlter Junior    #634 Raphael Koch   ← NICHT mehr #633 Stefan Wenger
--   Zahlen danach        388 / 371 / 3
--
-- ⚠ Dass ein ANDERER Junior gewaehlt wird, ist kein Fehler, sondern der
--   Filter bei der Arbeit: Stefan Wenger hat inzwischen eine AHV-Nummer —
--   erfasst beim Nachweis vom 20.08.2026 — und faellt damit aus
--   `ahv_nr is null` heraus. Deshalb steht `ohne_ahv` jetzt bei 371 statt
--   372. Der Block sucht sich das naechste Kind, dem der Nachweis noch etwas
--   beweisen kann.
--
-- ⚠ WAS DER BLOCK NICHT TUT: das Anmeldekonto anlegen. Er legt die PERSON an;
--   das Konto entsteht erst bei der Registrierung ueber die normale
--   Anmeldemaske, und die verlangt die Bestaetigungsmail an die Adresse im
--   Block. Nach einem Loeschen ist die Adresse in `auth.users` wieder frei.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_verein   uuid;
  -- ⚠ DIE ADRESSE. Sie muss ein Postfach sein, das erreichbar ist: die
  --   Registrierung schickt eine Bestaetigungsmail, und ohne sie kommt der
  --   Nachweis nicht ueber Schritt 2 hinaus.
  v_email    text := 'dieter.good@gmail.com';
  v_person   uuid;
  v_kind     bigint;
  v_kindname text;
  v_anz      int;
begin

  select id into v_verein from public.vereine where slug = 'fcherrliberg';
  if v_verein is null then raise exception 'ABBRUCH: Verein fcherrliberg nicht gefunden'; end if;

  /* Die Adresse darf noch niemandem gehoeren — `personen_email_pro_verein`
     liesse es ohnehin nicht zu, aber die Meldung waere ein 23505 statt eines
     Satzes. */
  select count(*) into v_anz from public.personen
   where verein_id = v_verein and lower(btrim(email)) = lower(btrim(v_email));
  if v_anz > 0 then
    raise exception 'ABBRUCH: % gehoert bereits einer Person in diesem Verein.', v_email;
  end if;

  /* Ein Junior, der die AHV-Nummer noch braucht UND schon einen Elternteil
     hat — damit der Nachweis etwas beweist und die Liste der drei ohne
     Elternteil unveraendert bleibt. Aeltester zuerst, damit die Auswahl
     wiederholbar ist und nicht bei jedem Lauf eine andere trifft. */
  select m.id, p.vorname || ' ' || p.nachname
    into v_kind, v_kindname
    from public.mitglieder m
    join public.personen p on p.id = m.person_id
    join public.mitgliedtypen t on t.name = m.mitgliedtyp and t.verein_id = m.verein_id
   where m.aktiv and t.hauptkontakt_pflicht
     and nullif(btrim(coalesce(p.ahv_nr, '')), '') is null
     and exists (select 1 from public.eltern_kinder k where k.mitglied_id = m.id)
   order by m.id
   limit 1;

  if v_kind is null then
    raise exception 'ABBRUCH: kein Junior gefunden, dem die AHV-Nummer fehlt und der schon einen Elternteil hat.';
  end if;

  insert into public.personen (verein_id, vorname, nachname, email, telefon)
  values (v_verein, 'Test', 'Elternteil', v_email, '+41 79 000 00 00')
  returning id into v_person;

  insert into public.eltern_kinder (verein_id, person_id, mitglied_id, beziehung, hauptkontakt)
  values (v_verein, v_person, v_kind, 'Testkontakt', false);

  raise notice 'Testperson % angelegt (%), verknuepft mit Junior #% (%).', v_person, v_email, v_kind, v_kindname;
  raise notice 'Jetzt ueber die normale Anmeldemaske registrieren. Erwartete Rolle: eltern.';
  raise notice 'Zum Rueckbau die Person-Id notieren: %', v_person;

end $mig$;


-- ═══════════════════════════════════════════════════════════════════════════
-- AUSGEFUEHRT am 20.08.2026 — von Hand, nicht ueber diesen Block.
--
--   Person    c26bc2b8-0f17-4bc7-b34e-55a4d81476dd   Test Elternteil
--   Konto     4ea12646-024b-4e2c-9357-2ea1689d1ac2   role = eltern, mitglied_id = NULL
--   Kind      #633 Stefan Wenger (Juniorenmitglied), AHV fehlt, 2 Elternteile
--   Zahlen    388 / 372 / 3 unveraendert
--
-- ⚠ Ein erneuter Lauf bricht jetzt korrekt ab („gehoert bereits einer
--   Person"). Das ist kein Fehler, sondern der Waechter.
--
--
-- DIE RLS-KETTE, gegen die Datenbank geprueft (BEGIN … ROLLBACK, als
-- `authenticated` mit dem sub des Testkontos):
--
--   A  eigene Person lesen                        1 Zeile
--   B  Mitgliedschaft des Kindes lesen            1 Zeile   mitglieder_select_kind
--   C  Person des Kindes lesen                    1 Zeile
--   D  AHV-Nummer des Kindes SCHREIBEN            UPDATE 1  personen_update_kind
--   E  fremdes Kind (#665) schreiben              UPDATE 0  ← die Gegenprobe
--   F  eltern_kinder lesen (Kinderliste)          1 Zeile
--   G  eigenes profil_geprueft_at setzen          UPDATE 1  personen_update_self
--   H  eigene E-Mail aendern                      UPDATE 1  ← ⚠ siehe unten
--
-- ⚠ E meldet KEINEN Fehler, es trifft nur nichts. Genau deshalb liest
--   `updateKindDurchElternteil()` nach dem Schreiben gegen: ohne das stuende
--   eine Erfolgsmeldung ueber einer Aenderung, die nie ankam.
--
-- ⚠ H ist der Beleg dafuer, dass RLS KEINE SPALTEN KENNT. Die Datenbank
--   laesst das Elternteil seine eigene E-Mail — den Login-Namen — ueber-
--   schreiben. Der einzige Schutz ist die Allowlist `ELTERN_DUERFEN` in
--   `domains/members/kindService.ts`. Wer einen zweiten Schreibpfad auf
--   `personen` baut, hat sie nicht automatisch.


-- ─── Nach der Registrierung gegenlesen ─────────────────────────────────────

select b.email, b.role, b.person_id, b.mitglied_id, b.aktiv
  from public.benutzer b
  join public.personen p on p.id = b.person_id
 where p.nachname = 'Elternteil' and p.vorname = 'Test';
-- erwartet: role = 'eltern', mitglied_id = NULL
-- ⚠ mitglied_id MUSS null sein: waere sie gesetzt, griffe mitglieder_select_self
--   und der Nachweis liefe ueber die falsche Policy.


-- ═══════════════════════════════════════════════════════════════════════════
-- RUECKBAU — und zugleich die Vorschau auf das DSGVO-Loeschen
--
-- Was eine Person alles beruehrt, zeigt sich erst beim Entfernen. Drei
-- Fremdschluessel auf `personen` haben KEIN `on delete`, sind also NO ACTION:
-- `benutzer_person_id_fkey`, `eltern_kinder_person_id_fkey` und
-- `mitglieder_person_id_fkey`. Ein `delete from personen` scheitert mit 23503,
-- solange eines davon zeigt. Die Reihenfolge ist deshalb nicht Geschmack.
--
--   1. eltern_kinder      die Verknuepfung zum Kind
--   2. mitglieder         entfaellt hier — die Testperson hat keine
--   3. benutzer           die Portal-Zeile
--   4. auth.users         ⚠ DAS AUTH-KONTO. Es faellt NICHT mit `benutzer`.
--                         E-Mail und Login blieben sonst in auth.users stehen,
--                         und eine erneute Registrierung mit derselben Adresse
--                         scheiterte an einem Konto, das niemand mehr sieht.
--   5. personen           zuletzt
--
-- Was per CASCADE mitgeht, sobald die Person faellt: `helper_zuteilungen` und
-- `team_helfer_zuteilungen` (beide ON DELETE CASCADE seit 20.08.2026). Bei
-- der Testperson leer; bei einem echten Loeschbegehren ist es der Punkt, an
-- dem der Verein den Nachweis verliert, dass eine Schicht besetzt war.
--
-- ⚠ Fuer das echte DSGVO-Loeschen kommt hinzu, was die Testperson nicht hat:
-- Mitgliedschaften samt ihren acht Kaskaden — darunter die gesamte
-- Aenderungshistorie (`mitglieder_aenderungen`, `mitglieder_aktivitaeten`).
-- Und Schritt 4 braucht die Auth-Admin-API, also eine Edge Function wie
-- `invite-user`; aus SQL heraus geht es nur mit erhoehten Rechten.
-- ═══════════════════════════════════════════════════════════════════════════

-- do $rueckbau$
-- declare
--   v_person uuid;
--   v_user   uuid;
-- begin
--   select p.id into v_person from public.personen p
--    where p.vorname = 'Test' and p.nachname = 'Elternteil';
--   if v_person is null then raise notice 'Keine Testperson gefunden.'; return; end if;
--
--   select b.id into v_user from public.benutzer b where b.person_id = v_person;
--
--   delete from public.eltern_kinder where person_id = v_person;
--   delete from public.benutzer      where person_id = v_person;
--   delete from public.personen      where id        = v_person;
--
--   if v_user is not null then
--     raise warning 'auth.users-Zeile % bleibt stehen — ueber das Supabase-Dashboard oder die Admin-API loeschen. Sonst blockiert sie die Adresse fuer eine erneute Registrierung.', v_user;
--   end if;
--   raise notice 'Testperson entfernt.';
-- end $rueckbau$;

-- Gegenprobe nach dem Rueckbau:
-- select count(*) from public.personen where vorname='Test' and nachname='Elternteil';  -- 0
-- select count(*) from public.mitglieder m join public.mitgliedtypen t
--    on t.name=m.mitgliedtyp and t.verein_id=m.verein_id
--  where m.aktiv and t.hauptkontakt_pflicht;                                            -- weiterhin 388
