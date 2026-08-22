-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠ TEILWEISE ZURUECKGEBAUT AM SELBEN TAG — siehe migration_ehemalig_rueckbau.sql
--
--   Was BLEIBT:   `m.aktiv is true` im Elternteil-Zweig der Sicht. Ohne ihn
--                 gewaenne die Ableitung „Elternteil" (sort_order 10) gegen
--                 die vom Ausloeser gesetzte Art „Supporter" (20) — der
--                 Ausloeser haette gearbeitet, und man saehe nichts davon.
--   Was FIEL:     die dritte Art „Ehemaliges Elternteil", ihre Ableitung
--                 `eltern_kinder_ehemalig`, der erweiterte CHECK und der
--                 dritte Zweig der Sicht.
--
--   GRUND: der Ablauf ist einheitlich entschieden worden (Didi, 22.08.2026).
--   Ein Austritt SETZT die Art, er leitet sie nicht ab — es gibt keinen
--   Zwischenzustand, den eine eigene Art benennen muesste. Der Block unten
--   ist damit Protokoll, keine geltende Beschreibung.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- DIE ART „ELTERNTEIL" KIPPT, WENN DAS LETZTE KIND AUSTRITT
-- 22.08.2026
--
-- WOZU
--   `CLAUDE.md` sagt seit dem 20.08.2026: „Abgeleitet heisst: es kippt. Tritt
--   das letzte Kind aus, ist die Person kein Elternteil mehr." Die Sicht hat
--   das nie umgesetzt — ihr abgeleiteter Zweig fragt NUR, ob eine Zeile in
--   `eltern_kinder` steht, und nie, ob das Kind noch Mitglied ist. Der Satz
--   war eine Behauptung ohne Deckung.
--
--   Eingetreten ist es bereits zweimal (Frei Finn, Furrer Patrick): ihre
--   Kinder sind im Juli 2026 ausgetreten, die Verknuepfung blieb, und beide
--   gelten bis heute als Elternteil — samt Pflichtfeldern und Kinderliste in
--   der Datenpruefung. Die Wirkung ist rueckwirkend gewollt: eine Sicht
--   wertet bei jedem Lesen neu aus.
--
-- ⚠ DIE VERKNUEPFUNG BLEIBT. `eltern_kinder` ist die VERKNUEPFUNG, nicht die
--   Mitgliedschaft — sie zu loeschen waere der zweite Weg gewesen und haette
--   Historie zerstoert. Entschieden am 22.08.2026 (Didi): die Sicht prueft
--   mit, die Zeile bleibt.
--
-- ⚠ DIE ZUGRIFFSRECHTE AENDERN SICH NICHT, und das ist gemessen:
--   NULL Policies nennen die Art — die Datenbank kennt `personenarten`
--   ueberhaupt nicht. Der Zugriff des Elternteils auf sein Kind haengt an
--   `person_ist_mein_kind()`, und die joint `eltern_kinder` auf `mitglieder`
--   OHNE `aktiv`-Pruefung. Ein Elternteil sieht und bearbeitet sein
--   ausgetretenes Kind also weiter, und eine offene Datenpruefung bleibt
--   abschliessbar. Das ist Absicht: die Rechte haengen an der Verknuepfung,
--   die Darstellung an der Art.
--
-- ⚠ WARUM EINE ZWEITE ART UND KEIN TEXT IM CHIP.
--   Ohne sie entstuende ein Zustand ohne jede Art — der Chip zeigte nichts,
--   und die Feldkonfiguration fiele auf den strukturellen Standard („alles
--   freiwillig"). Ihn im Chip zu benennen waere eine ZWEITE ABLEITUNG neben
--   dem Art-System; genau das hat `heroChips()` am 21.08.2026 beseitigt, als
--   Kopf und Kachel einander widersprachen. Der Zustand ist keine Textluecke,
--   sondern eine fehlende Art — also bekommt er eine, aus derselben Quelle.
--
--   Sie ist ABGELEITET, nicht gesetzt: sie kippt in beide Richtungen. Tritt
--   das Kind wieder ein, ist die Person wieder Elternteil, ohne dass jemand
--   etwas aufraeumen muss.
--
-- ⚠ DIE ZWEI ZWEIGE SCHLIESSEN EINANDER AUS. Die Zaehlprobe unten prueft das
--   ausdruecklich: niemand darf beides tragen. Ohne diese Pruefung waere ein
--   Fehler im `not exists` nicht zu sehen — die Sicht laege einfach doppelt.
--
-- ZAEHLPROBE — Ausgangswerte aus supabase/schema.sql:
--
--   CREATE TABLE                     91 -> 91   (+-0)
--   CREATE POLICY                   174 -> 174  (+-0)
--   CREATE (UNIQUE )?INDEX           68 -> 68   (+-0)
--   ADD CONSTRAINT                  314 -> 314  (+-0)
--
-- ⚠ Auch der CHECK bewegt nichts: `pg_dump` schreibt CHECK-Constraints INLINE
--   in das `CREATE TABLE`, nicht als eigenes `ADD CONSTRAINT`. Er wird hier
--   ersetzt, nicht hinzugefuegt — die Zahl bliebe selbst dann gleich.
--   Gegengeprueft wird ueber `pg_constraint` und die Personenzahlen unten.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz        int;
  v_verknuepft int;
  v_eltern     int;
  v_ehemalig   int;
  v_doppelt    int;
begin

  -- ─── A · Die neue Ableitung zulassen ────────────────────────────────────
  /* Der CHECK ist kein Formalismus: er verhindert, dass jemand eine
     Ableitungsregel eintraegt, die es im Code nicht gibt — eine Art, die sich
     nie ableitet und deshalb niemandem gehoert. */
  alter table public.personenarten
    drop constraint if exists personenarten_ableitung_check;
  alter table public.personenarten
    add constraint personenarten_ableitung_check
    check (ableitung is null
        or ableitung = 'eltern_kinder'
        or ableitung = 'eltern_kinder_ehemalig');

  -- ─── B · Die Art anlegen, je Verein ─────────────────────────────────────
  /* Nach „Supporter" (20) einsortiert: wer Supporter UND ehemaliges Elternteil
     ist, wird als Supporter gefuehrt — das ist die Aussage, mit der der Verein
     etwas anfangen kann. Die kleinste sort_order gewinnt (bestimmendeArt).

     `standard_rolle` bleibt leer: sie wird nur beim Austritt eines MITGLIEDS
     ausgewertet, und diese Art entsteht nie dabei. */
  insert into public.personenarten (verein_id, name, sort_order, ableitung, aktiv)
  select v.id, 'Ehemaliges Elternteil', 30, 'eltern_kinder_ehemalig', true
    from public.vereine v
   where not exists (
     select 1 from public.personenarten a
      where a.verein_id = v.id and a.ableitung = 'eltern_kinder_ehemalig');

  -- ─── C · Die Sicht ──────────────────────────────────────────────────────
  create or replace view public.personenarten_effektiv
    with (security_invoker = true) as
    select z.person_id, a.id as art_id, a.verein_id,
           a.name, a.sort_order, a.ableitung
      from public.personenart_pro_person z
      join public.personenarten a on a.id = z.art_id
     where a.aktiv
    union
    /* Elternteil: mindestens EIN Kind mit aktiver Mitgliedschaft.
       `union` statt `union all` — zwei Kinder ergeben eine Zeile. */
    select k.person_id, a.id, a.verein_id,
           a.name, a.sort_order, a.ableitung
      from public.eltern_kinder k
      join public.mitglieder m
        on m.id = k.mitglied_id and m.aktiv is true
      join public.personenarten a
        on a.verein_id = k.verein_id and a.ableitung = 'eltern_kinder'
     where a.aktiv
    union
    /* Ehemaliges Elternteil: verknuepft, aber KEIN Kind mehr aktiv.
       Die Bedingung ist die exakte Verneinung der obigen — deshalb koennen
       die beiden Zweige niemanden gemeinsam treffen. */
    select k.person_id, a.id, a.verein_id,
           a.name, a.sort_order, a.ableitung
      from public.eltern_kinder k
      join public.personenarten a
        on a.verein_id = k.verein_id and a.ableitung = 'eltern_kinder_ehemalig'
     where a.aktiv
       and not exists (
         select 1 from public.eltern_kinder k2
           join public.mitglieder m2 on m2.id = k2.mitglied_id
          where k2.person_id = k.person_id and m2.aktiv is true);

  grant select on public.personenarten_effektiv to authenticated;

  -- ─── Zaehlprobe ─────────────────────────────────────────────────────────
  select count(*) into v_anz from pg_constraint
   where conrelid = 'public.personenarten'::regclass
     and conname = 'personenarten_ableitung_check';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: CHECK fehlt.'; end if;

  select count(*) into v_anz from public.personenarten
   where ableitung = 'eltern_kinder_ehemalig' and aktiv;
  if v_anz < 1 then raise exception 'UNVOLLSTAENDIG: Art nicht angelegt.'; end if;

  select count(distinct person_id) into v_verknuepft from public.eltern_kinder;

  select count(*) into v_eltern from public.personenarten_effektiv
   where ableitung = 'eltern_kinder';
  select count(*) into v_ehemalig from public.personenarten_effektiv
   where ableitung = 'eltern_kinder_ehemalig';

  /* ⚠ NIEMAND DARF BEIDES TRAGEN. Ohne diese Probe waere ein Fehler im
     `not exists` unsichtbar — die Sicht laege doppelt, und die Rangfolge
     entschiede zufaellig. */
  select count(*) into v_doppelt from (
    select person_id from public.personenarten_effektiv
     where ableitung in ('eltern_kinder','eltern_kinder_ehemalig')
     group by person_id having count(distinct ableitung) > 1) s;
  if v_doppelt <> 0 then
    raise exception 'WIDERSPRUCH: % Person(en) gelten als Elternteil UND als ehemaliges.', v_doppelt;
  end if;

  /* ⚠ UND NIEMAND DARF VERLOREN GEHEN. Die zwei Zweige zusammen muessen
     genau die verknuepften Personen ergeben — sonst faellt jemand aus beiden
     heraus, und das saehe aus wie „hat eben keine Art". */
  if v_eltern + v_ehemalig <> v_verknuepft then
    raise exception 'VERLUST: % verknuepft, aber % + % = % abgedeckt.',
      v_verknuepft, v_eltern, v_ehemalig, v_eltern + v_ehemalig;
  end if;

  raise notice 'Fertig. % verknuepft: % Elternteil, % ehemalig.',
    v_verknuepft, v_eltern, v_ehemalig;
end $mig$;
