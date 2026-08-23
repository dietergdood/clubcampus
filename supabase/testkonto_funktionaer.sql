-- ═══════════════════════════════════════════════════════════════════════════
-- TESTKONTO FUNKTIONAER — fuer den Gruppenrechte-Auftrag
-- 23.08.2026
--
-- ⚠ DAS ALTE KONTO `funktionaer@fch-test.ch` WAR NIE ANMELDEFAEHIG: null
--   Zeilen in `auth.identities`, per SQL in `auth.users` eingetragen. Es sah
--   in jeder Tabelle richtig aus und war keines. Siehe
--   `supabase/testkonto_trainer.sql` fuer die ausfuehrliche Begruendung —
--   und ⚠ KEIN `insert into auth.users`, NIE.
--
-- WOZU ER GEBRAUCHT WIRD
--
--   `kader_write` fuehrt `administrator`, `administration`, `trainer` — aber
--   NICHT `funktionaer`, waehrend `trainings_write` ihn fuehrt. Ein
--   Funktionaer, der ueber die Gruppenrechte an die Kader-Maske kommt,
--   speichert dort ins Leere. Das ist heute eine Behauptung aus dem Schema;
--   mit diesem Zugang wird es eine Messung.
--
-- ⚠ DIE ROLLE KOMMT VOM MITGLIEDTYP, NICHT VOM KADER. `handle_new_user()`
--   liest bei der Registrierung nur `mitgliedtypen.standard_rolle`. Deshalb
--   bekommt diese Person den Typ mit `standard_rolle = 'funktionaer'` und
--   KEINEN Kadereintrag.
--
-- ⚠ WAS DER BLOCK NICHT KANN: die Gruppenzugehoerigkeit. `benutzer_funktionen`
--   braucht die `benutzer_id`, und die entsteht erst bei der Registrierung.
--   Schritt 3 unten holt das nach — ohne ihn hat der Funktionaer keine
--   Modulrechte und die Kader-Maske bleibt unerreichbar.
--
-- ABLAUF
--   1. Diesen Block ausfuehren.
--   2. Ueber die Anmeldemaske registrieren (dieter.good+funktionaer@gmail.com).
--   3. Gruppe zuweisen — siehe Block am Ende dieser Datei.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_verein  uuid;
  v_email   text := 'dieter.good+funktionaer@gmail.com';
  v_person  uuid;
  v_typ     text;
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

  /* ⚠ DER MITGLIEDTYP ENTSCHEIDET DIE ROLLE, NICHT DIE KADERROLLE.
     `handle_new_user()` liest bei der Registrierung AUSSCHLIESSLICH
     `mitgliedtypen.standard_rolle` — Kadereintraege sieht der Trigger nicht.
     Gesucht wird deshalb der Typ ueber sein MERKMAL (standard_rolle), nicht
     ueber seinen Namen: „Funktionaer/in" koennte morgen anders heissen. */
  select name into v_typ from public.mitgliedtypen
   where verein_id = v_verein and aktiv
     and standard_rolle = 'funktionaer'
     and not coalesce(hauptkontakt_pflicht, false)
   order by name limit 1;
  if v_typ is null then
    raise exception 'ABBRUCH: kein aktiver Mitgliedtyp mit standard_rolle = funktionaer.';
  end if;

  /* ⚠ KEIN KADEREINTRAG. Ein Kadereintrag mit `ist_trainer` liesse
     `ableitRolle()` spaeter `trainer` ergeben und wuerde den Funktionaer beim
     naechsten Aufraeumen zum Trainer machen. Ein Funktionaer hat kein Kader.
  */

  insert into public.personen (verein_id, vorname, nachname, email)
  values (v_verein, 'Funktionaer', 'Zugang', v_email)
  returning id into v_person;

  insert into public.mitglieder (verein_id, person_id, mitgliedtyp, aktiv, eintrittsdatum)
  values (v_verein, v_person, v_typ, true, current_date)
  returning id into v_mitgl;

  raise notice 'Person %  (%)', v_person, v_email;
  raise notice 'Mitgliedschaft % als % (standard_rolle funktionaer)', v_mitgl, v_typ;
  raise notice 'Jetzt ueber die Anmeldemaske registrieren. Erwartete Rolle: funktionaer.';
  raise notice 'Zum Rueckbau notieren: person=%  mitglied=%', v_person, v_mitgl;
end
$mig$;


-- ═══════════════════════════════════════════════════════════════════════════
-- AUSGEFUEHRT am 23.08.2026
--
--   Person          0a7d8743-38d1-49f2-9a67-cf9909aeba6c   Funktionaer Zugang
--   Mitgliedschaft  3532   Funktionaer/in, aktiv, KEIN Kadereintrag
--   Zaehlstand      personen 915
--
--   Im selben Lauf entfernt: das alte Konto `funktionaer@fch-test.ch`
--   (benutzer-Zeile e1af5517-… und auth.users). Danach: 3 Konten, 3
--   auth.users, 0 Waisen — die zwei Zahlen stehen erstmals gleichauf.
--
-- ⚠ Die Person „Funktionaer Tester" (ohne Konto) steht noch. Sie ist jetzt
--   eine Person ohne Mitgliedschaft und ohne Kind — also ein Supporter — und
--   laesst sich ueber „Person loeschen (DSGVO)" entfernen. Der Weg
--   funktioniert jetzt, weil kein kaputtes Anmeldekonto mehr daranhaengt.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- STAND 23.08.2026, 21:10 — SCHRITT 2 STEHT AUS
--
-- Die Person steht, das KONTO fehlt. Gemessen, damit niemand an der falschen
-- Stelle sucht:
--
--   personen                    Zeile da, E-Mail exakt, ohne Leerzeichen (33)
--   check_email_bekannt         {"bekannt":true,"name":"Funktionaer Zugang",
--                                "mitglied_id":3532}
--   handle_new_user() ergaebe   funktionaer  (Mitgliedtyp Funktionaer/in)
--   auth.users                  KEINE Zeile mit dieser Adresse
--
-- ⚠ Es liegt also nicht am Portal und nicht an der Plus-Adresse — die
--   Registrierung hat den Auth-Server nicht erreicht oder wurde davor
--   abgewiesen. `auth.audit_log_entries` ist LEER (auch fuer die gelungene
--   Trainer-Registrierung), das Protokoll hilft hier nicht weiter.
--
-- ⚠ SCHRITT 3 IST GEPRUEFT UND WARTET. Ausgefuehrt am 23.08.2026 lief er in
--   seinen eigenen Waechter: `ABBRUCH: noch nicht registriert.` — genau
--   richtig, und ein Beleg, dass der Block traegt.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- SCHRITT 3 — NACH der Registrierung: die Gruppe zuweisen
--
-- Ohne sie hat der Funktionaer keine Modulrechte: `getEffektiveStufeForFunktionaer`
-- liest `benutzer_funktionen -> portal_funktionen -> portal_gruppen`.
-- Gewaehlt wird eine Funktion in einer Gruppe, die `team` fuehrt — das ist
-- die Voraussetzung dafuer, dass die Kader-Maske ueberhaupt erreichbar ist
-- und der `kader_write`-Befund messbar wird.
--
-- do $mig$
-- declare
--   v_benutzer uuid;
--   v_funktion bigint;
-- begin
--   select b.id into v_benutzer from public.benutzer b
--     join public.personen p on p.id = b.person_id
--    where p.email = 'dieter.good+funktionaer@gmail.com';
--   if v_benutzer is null then raise exception 'ABBRUCH: noch nicht registriert.'; end if;
--
--   select f.id into v_funktion
--     from public.portal_funktionen f
--     join public.portal_gruppen g on g.id = f.gruppe_id
--    where g.aktiv and 'team' = any(g.module)
--    order by f.name limit 1;
--   if v_funktion is null then raise exception 'ABBRUCH: keine Funktion in einer team-Gruppe.'; end if;
--
--   insert into public.benutzer_funktionen (verein_id, benutzer_id, funktion_id, seit)
--   values ((select verein_id from public.benutzer where id = v_benutzer),
--           v_benutzer, v_funktion, current_date);
--   raise notice 'Funktion % zugewiesen.', v_funktion;
-- end
-- $mig$;
--
--
-- GEGENPROBE nach der Registrierung
--
--   select b.role, p.email from public.benutzer b
--     join public.personen p on p.id = b.person_id
--    where p.email = 'dieter.good+funktionaer@gmail.com';
--
--   Erwartet: role = 'funktionaer'.
--
-- RUECKBAU: ueber „Person loeschen (DSGVO)" in der Oberflaeche.
-- ═══════════════════════════════════════════════════════════════════════════
