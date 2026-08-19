-- ═══════════════════════════════════════════════════════════════════════════
-- SPIELINFO — SFV-Spielnummer und Schiedsrichter
-- 20.08.2026
--
-- Zwei Felder, die in der Spielinfo leer stehen, weil sie in der
-- VEREIN-Spalte der Feldhoheit stehen und deshalb nie geschrieben wurden.
-- Beides sind Vertragsaenderungen an api_verbindungen.sync_felder, keine
-- Fehlerkorrekturen — deshalb eine eigene Migration mit Begruendung.
--
--
-- 1) DIE SPIELNUMMER BEKOMMT EINE EIGENE SPALTE
--
-- migration_sfv_spielplan.sql haelt fest:
--   "spiel_nr ist NICHT die SFV-Nummer. Der SFV liefert zwei Zahlen pro
--    Spiel: matchId und matchNumber. Keine davon steht heute in
--    spiele.spiel_nr — die Spalte ist ein freies Textfeld und wird von Hand
--    gepflegt. Sie bleibt unangetastet und gehoert dem Verein."
--
-- Diese Entscheidung bleibt. Dass die Spalte heute leer ist, ist kein Grund,
-- sie umzuwidmen: waere je etwas von Hand eingetragen, ueberschriebe es der
-- naechste Lauf. Stattdessen `sfv_spiel_nr` daneben, vom Sync geschrieben.
-- Die Anzeige zeigt die eigene, wenn es eine gibt, sonst die des Verbands.
--
--
-- 2) SCHIEDSRICHTER — EINE AUSNAHME, DIE AUSGESPROCHEN GEHOERT
--
-- docs/auftrag_matchdaten.md hatte /referees ausdruecklich ausgenommen:
-- "liefert dieselbe Sorte Personendaten und hat fuer Spielbericht und
-- Statistik keinen Nutzen". Aufgehoben am 20.08.2026 (Didi), mit dieser
-- Begruendung:
--
--   Ein Schiedsrichter ist eine Amtsfunktion, keine Privatperson. Sein Name
--   steht auf jedem Spielbericht und ist der Zweck seiner Anwesenheit. Von
--   gegnerischen SPIELERN wird weiterhin nichts gespeichert — das ist keine
--   Aufweichung der Regel, sondern eine Unterscheidung zwischen Teilnehmer
--   und Amtstraeger.
--
-- UEBERNOMMEN WIRD NUR DER NAME. Die Probe vom 20.08.2026 zeigt, dass der
-- Endpunkt deutlich mehr liefert:
--
--   clubNumber, clubName   Verein des Schiedsrichters (im Beispiel FC Thalwil)
--   personId, refereeId    Kennungen
--   gender, birthDate      Personendaten
--   name, secondName, firstname
--   refereeRoleId, refereeRoleName
--
-- Nichts davon ausser dem Namen wird gespeichert. Auch nicht personId:
-- bei Spielern haelt sie die Wiedererkennung ueber Saisons, hier gaebe es
-- keinen Zweck dafuer — und eine Kennung ohne Zweck ist eine Kennung zu viel.
-- Die Allowlist in logos.ts/matchdaten.ts hat dieselbe Bauweise: aufgezaehlt
-- wird, was durchkommt.
--
--
-- ⚠ 3) EINEN DELEGIERTEN LIEFERT DER ENDPUNKT NICHT
--
-- Ueber alle 21 ausgetragenen Spiele der Saison kommen genau drei Rollen vor:
--
--   refereeRoleId 1  Schiedsrichter   19x
--   refereeRoleId 2  Assistent 1       4x
--   refereeRoleId 5  Assistent 2       4x
--
-- Kein Delegierter. Bei zwei Spielen kommt ueberhaupt kein Eintrag.
-- `spiele.delegierter` bleibt deshalb in der VEREIN-Spalte und wird weiter
-- von Hand gepflegt — der Verband gibt in unseren Ligen nichts her.
--
-- Auch die Assistenten werden NICHT gespeichert. `schiedsrichter` ist EIN
-- Textfeld; drei Namen hineinzuschreiben hiesse, eine Liste in eine
-- Zeichenkette zu pressen. Wer sie spaeter braucht, bekommt eine eigene
-- Tabelle wie spiel_aufstellung — nicht ein Feld mit Kommas darin.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_spalte int;
  v_sfv    jsonb;
begin

  -- ─── A) Die Spalte ───────────────────────────────────────────────────────

  alter table public.spiele
    add column if not exists sfv_spiel_nr text;

  execute $q$
    comment on column public.spiele.sfv_spiel_nr is
      'matchNumber des SFV. NICHT spiel_nr — die gehoert dem Verein und wird von Hand gepflegt (siehe migration_sfv_spielplan.sql). Die Anzeige zeigt spiel_nr, wenn gesetzt, sonst diese.'
  $q$;

  execute $q$
    comment on column public.spiele.schiedsrichter is
      'Name des Schiedsrichters (refereeRoleId 1) aus /api/match/{id}/referees. Nur der Name — kein Geburtsdatum, kein Geschlecht, keine personId, kein Verein. Ein Schiedsrichter ist eine Amtsfunktion, keine Privatperson; von gegnerischen SPIELERN wird weiterhin nichts gespeichert. Assistenten stehen nicht hier: ein Textfeld traegt keine Liste.'
  $q$;

  execute $q$
    comment on column public.spiele.delegierter is
      'Gehoert dem Verein, wird von Hand gepflegt. Der SFV liefert in unseren Ligen keinen Delegierten — ueber alle 21 ausgetragenen Spiele der Saison 2026/27 kamen nur die Rollen Schiedsrichter, Assistent 1 und Assistent 2 vor (Probe 20.08.2026).'
  $q$;


  -- ─── B) Feldhoheit ───────────────────────────────────────────────────────
  -- sfv_spiel_nr und schiedsrichter wandern in die SFV-Spalte, spiel_nr und
  -- delegierter bleiben beim Verein. Die Liste ist Vertrag: der Sync schreibt
  -- nur, was darin steht (schneideAufFeldhoheit in sync.ts).

  select sync_felder into v_sfv from public.api_verbindungen where key = 'football_ch' limit 1;
  if v_sfv is null then
    raise exception 'UNVOLLSTAENDIG: kein Anschluss football_ch — laeuft diese Migration vor migration_sfv_spielplan.sql?';
  end if;

  update public.api_verbindungen a
     set sync_felder = jsonb_set(
           jsonb_set(a.sync_felder, '{spiele,sfv}',
             (a.sync_felder->'spiele'->'sfv') || '["sfv_spiel_nr","schiedsrichter"]'::jsonb),
           '{spiele,verein}',
           (select jsonb_agg(v)
              from jsonb_array_elements(a.sync_felder->'spiele'->'verein') v
             where v <> '"schiedsrichter"'::jsonb))
   where a.key = 'football_ch';


  -- ─── C) Pruefung ─────────────────────────────────────────────────────────

  select count(*) into v_spalte from information_schema.columns
   where table_schema = 'public' and table_name = 'spiele' and column_name = 'sfv_spiel_nr';
  if v_spalte <> 1
  then raise exception 'UNVOLLSTAENDIG: spiele.sfv_spiel_nr fehlt'; end if;

  select sync_felder into v_sfv from public.api_verbindungen where key = 'football_ch' limit 1;

  if not (v_sfv->'spiele'->'sfv' @> '["sfv_spiel_nr"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: sfv_spiel_nr steht nicht in der SFV-Spalte'; end if;
  if not (v_sfv->'spiele'->'sfv' @> '["schiedsrichter"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: schiedsrichter steht nicht in der SFV-Spalte'; end if;
  if v_sfv->'spiele'->'verein' @> '["schiedsrichter"]'::jsonb
  then raise exception 'UNVOLLSTAENDIG: schiedsrichter steht noch in der Verein-Spalte'; end if;

  /* Die drei, die dem Verein bleiben. Faellt einer davon heraus,
     ueberschriebe der naechste Lauf eine Eingabe von Hand. */
  if not (v_sfv->'spiele'->'verein' @> '["spiel_nr","delegierter","treffpunkt"]'::jsonb)
  then raise exception 'UNVOLLSTAENDIG: spiel_nr, delegierter oder treffpunkt aus der Verein-Spalte verloren'; end if;

  raise notice 'Fertig: sfv_spiel_nr angelegt, schiedsrichter in die SFV-Spalte, spiel_nr und delegierter beim Verein.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

select jsonb_pretty(sync_felder->'spiele') from public.api_verbindungen where key = 'football_ch';
-- erwartet: sfv enthaelt sfv_spiel_nr und schiedsrichter,
--           verein enthaelt weiterhin treffpunkt, notes, venue_addr,
--                             spiel_nr, zuschauer, delegierter

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'Spalte sfv_spiel_nr', 1,
         (select count(*) from information_schema.columns
           where table_schema='public' and table_name='spiele' and column_name='sfv_spiel_nr')::int
  union all
  select 2, 'schiedsrichter in sfv', 1,
         (select case when sync_felder->'spiele'->'sfv' @> '["schiedsrichter"]'::jsonb then 1 else 0 end
            from public.api_verbindungen where key='football_ch')::int
  union all
  select 3, 'spiel_nr bleibt beim Verein', 1,
         (select case when sync_felder->'spiele'->'verein' @> '["spiel_nr"]'::jsonb then 1 else 0 end
            from public.api_verbindungen where key='football_ch')::int
  union all
  select 4, 'delegierter bleibt beim Verein', 1,
         (select case when sync_felder->'spiele'->'verein' @> '["delegierter"]'::jsonb then 1 else 0 end
            from public.api_verbindungen where key='football_ch')::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- begin;
--   update public.api_verbindungen a
--      set sync_felder = jsonb_set(
--            jsonb_set(a.sync_felder, '{spiele,sfv}',
--              (select jsonb_agg(v) from jsonb_array_elements(a.sync_felder->'spiele'->'sfv') v
--                where v not in ('"sfv_spiel_nr"'::jsonb,'"schiedsrichter"'::jsonb))),
--            '{spiele,verein}',
--            (a.sync_felder->'spiele'->'verein') || '["schiedsrichter"]'::jsonb)
--    where a.key = 'football_ch';
--   alter table public.spiele drop column if exists sfv_spiel_nr;
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Dump und Typen nachziehen. Zaehlprobe: alle vier Kategorien +/- 0 —
--   es kommt nur eine Spalte dazu, und Spalten werden nicht gezaehlt.
--   Dann einen Lauf: die Nummern und Schiedsrichter kommen mit dem naechsten
--   Spielplan-Abgleich, der ohnehin alle 268 Zeilen anfasst.
-- ═══════════════════════════════════════════════════════════════════════════
