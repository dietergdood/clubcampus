-- ═══════════════════════════════════════════════════════════════════════════
-- RUECKBAU: „EHEMALIGES ELTERNTEIL" ENTFAELLT
-- 22.08.2026
--
-- WOZU
--   Heute frueh entstand eine dritte, ABGELEITETE Art: wer verknuepft war,
--   aber kein aktives Kind mehr hatte, galt als „Ehemaliges Elternteil". Das
--   war die Antwort auf einen Zustand ohne Namen.
--
--   Der Ablauf ist seither entschieden (Didi, 22.08.2026), und er kennt
--   diesen Zustand nicht. Er ist EINHEITLICH, mit zwei Ausloesern:
--
--     Ein Mitglied tritt aus                    -> sofort die eingestellte
--                                                  Art (Supporter)
--     Das letzte Kind eines Elternteils tritt    -> ebenfalls sofort
--     aus, und der Elternteil hat keine eigene      Supporter
--     Mitgliedschaft
--
--   Danach in beiden Faellen die Mail: bleiben oder loeschen. Keine Antwort
--   heisst bleiben. **Es gibt keinen Zwischenzustand** — also auch keine Art
--   dafuer.
--
-- ⚠ DIE ART WIRD GESETZT, NICHT ABGELEITET. Das ist der Kern des Rueckbaus:
--   „Ehemaliges Elternteil" ergab sich aus den Daten, „Supporter" wird vom
--   Ausloeser geschrieben. Eine gesetzte Art ueberlebt, was der Verein
--   entscheidet; eine abgeleitete kippt zurueck, sobald sich die Datenlage
--   aendert.
--
-- ⚠ WAS BLEIBT: `m.aktiv is true` IM ELTERNTEIL-ZWEIG.
--   Das ist der einzige Teil der Migration von heute frueh, der stehen
--   bleibt — und er ist die Bedingung dafuer, dass der neue Ablauf ueberhaupt
--   sichtbar wird. Ohne ihn gilt naemlich:
--
--     letztes Kind tritt aus -> Ausloeser setzt Supporter (sort_order 20)
--     die Ableitung Elternteil (10) gilt weiter, weil die Zeile in
--     `eltern_kinder` steht
--     `bestimmendeArt()` nimmt die kleinste sort_order -> Elternteil gewinnt
--
--   Der Ausloeser haette gearbeitet, und man saehe nichts davon. Mit dem
--   Check verschwindet die Ableitung in demselben Moment, in dem die
--   gesetzte Art kommt: ein Zustand, ein Uebergang, kein Zwischenstand.
--   (Entscheidung Didi, 22.08.2026.)
--
-- ⚠ FURRER UND FREI WERDEN RUECKWIRKEND GESETZT.
--   Beide sind seit Juli 2026 in dem Zustand, den der Ablauf herstellen soll
--   — nur ist der Ausloeser fuer sie nie gelaufen, es gab ihn noch nicht.
--   Ohne diesen Block haetten sie nach dem Rueckbau GAR KEINE Art: die
--   dritte faellt weg, die Ableitung kippt wegen `m.aktiv`, und gesetzt hat
--   ihnen niemand etwas. Das waere schlechter als heute.
--
--   Sie bekommen damit die Vorbelegung, ohne je gefragt worden zu sein. Das
--   ist vertretbar, weil die Art ausdruecklich KEIN Endzustand ist, sondern
--   der Vorschlag, gegen den die Mail in Etappe 3 zu widersprechen erlaubt.
--   Der Nachtrag dieser Mail steht dort als offener Punkt.
--
-- ⚠ RECHTE AENDERN SICH NICHT, und das ist gemessen (22.08.2026):
--   NULL Policies nennen die Art — die Datenbank kennt `personenarten`
--   ueberhaupt nicht. Der Zugriff des Elternteils auf sein Kind haengt an
--   `person_ist_mein_kind()`, und die joint `eltern_kinder` auf `mitglieder`
--   OHNE `aktiv`-Pruefung. Ein Elternteil mit offener Datenpruefung eines
--   ausgetretenen Kindes kann sie weiterhin abschliessen. Rechte haengen an
--   der Verknuepfung, Darstellung an der Art.
--
-- ZAEHLPROBE — Ausgangswerte aus supabase/schema.sql:
--
--   CREATE TABLE                     91 -> 91   (+-0)
--   CREATE POLICY                   174 -> 174  (+-0)
--   CREATE (UNIQUE )?INDEX           68 -> 68   (+-0)
--   ADD CONSTRAINT                  315 -> 315  (+-0)
--
-- ⚠ Auch der CHECK bewegt nichts: `pg_dump` schreibt CHECK-Constraints
--   INLINE in das `CREATE TABLE`. Er wird hier VERENGT, nicht entfernt.
--   Der Fremdschluessel von Punkt 4 (315) bleibt unberuehrt.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz        int;
  v_supporter  uuid;
  v_gesetzt    int;
  v_verknuepft int;
  v_eltern     int;
  v_ohne       int;
begin

  -- ─── A · Die zwei Altlasten auf die Austritts-Art setzen ────────────────
  /* ZUERST — vor dem Loeschen der dritten Art. Sonst waeren sie zwischen den
     Bloecken ohne jede Art, und ein Abbruch in der Mitte liesse sie so
     zurueck. */
  select v.austritt_art_id into v_supporter
    from public.vereine v where v.austritt_art_id is not null limit 1;
  if v_supporter is null then
    raise exception 'ABBRUCH: kein Austrittsziel eingestellt (vereine.austritt_art_id).';
  end if;

  insert into public.personenart_pro_person (verein_id, person_id, art_id)
  select p.verein_id, p.id, v_supporter
    from public.personen p
   where exists (select 1 from public.eltern_kinder k where k.person_id = p.id)
     and not exists (
       select 1 from public.eltern_kinder k2
         join public.mitglieder m2 on m2.id = k2.mitglied_id
        where k2.person_id = p.id and m2.aktiv is true)
     and not exists (
       select 1 from public.mitglieder m3 where m3.person_id = p.id and m3.aktiv is true)
  on conflict (verein_id, person_id, art_id) do nothing;
  get diagnostics v_gesetzt = row_count;
  raise notice 'A: % Altlast(en) auf die Austritts-Art gesetzt.', v_gesetzt;

  -- ─── B · Die Sicht auf zwei Zweige zurueckbauen ─────────────────────────
  create or replace view public.personenarten_effektiv
    with (security_invoker = true) as
    select z.person_id, a.id as art_id, a.verein_id,
           a.name, a.sort_order, a.ableitung
      from public.personenart_pro_person z
      join public.personenarten a on a.id = z.art_id
     where a.aktiv
    union
    /* Elternteil: mindestens EIN Kind mit aktiver Mitgliedschaft.
       ⚠ `m.aktiv is true` BLEIBT — siehe Kopf. */
    select k.person_id, a.id, a.verein_id,
           a.name, a.sort_order, a.ableitung
      from public.eltern_kinder k
      join public.mitglieder m
        on m.id = k.mitglied_id and m.aktiv is true
      join public.personenarten a
        on a.verein_id = k.verein_id and a.ableitung = 'eltern_kinder'
     where a.aktiv;

  grant select on public.personenarten_effektiv to authenticated;

  -- ─── C · Die dritte Art loeschen ────────────────────────────────────────
  /* Erst jetzt: die Sicht nennt sie nicht mehr, und niemand haengt daran —
     an einer ABGELEITETEN Art gibt es keine Zuweisungen (die stuenden in
     personenart_pro_person, und dort landen nur gesetzte). Feldkonfiguration
     wuerde `on delete cascade` mitnehmen; fuer diese Art wurde nie eine
     angelegt, was der Block darunter prueft. */
  select count(*) into v_anz from public.mitgliedtyp_feldkonfig k
    join public.personenarten a on a.id = k.art_id
   where a.ableitung = 'eltern_kinder_ehemalig';
  if v_anz > 0 then
    raise exception 'ABBRUCH: % Feldkonfigurations-Zeile(n) haengen an der Art. Erst pruefen, was verloren ginge.', v_anz;
  end if;

  delete from public.personenarten where ableitung = 'eltern_kinder_ehemalig';
  get diagnostics v_anz = row_count;
  raise notice 'C: % Art(en) geloescht.', v_anz;

  -- ─── D · Den CHECK wieder verengen ──────────────────────────────────────
  /* Er ist kein Formalismus: er verhindert, dass jemand eine Ableitungsregel
     eintraegt, die es im Code nicht gibt — eine Art, die sich nie ableitet
     und deshalb niemandem gehoert. Genau deshalb muss er MIT zurueck. */
  alter table public.personenarten
    drop constraint if exists personenarten_ableitung_check;
  alter table public.personenarten
    add constraint personenarten_ableitung_check
    check (ableitung is null or ableitung = 'eltern_kinder');

  -- ─── Zaehlprobe ─────────────────────────────────────────────────────────
  select count(*) into v_anz from public.personenarten where ableitung = 'eltern_kinder_ehemalig';
  if v_anz <> 0 then raise exception 'UNVOLLSTAENDIG: die dritte Art steht noch.'; end if;

  select count(*) into v_anz from pg_constraint
   where conrelid = 'public.personenarten'::regclass
     and conname = 'personenarten_ableitung_check'
     and pg_get_constraintdef(oid) not like '%ehemalig%';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: CHECK nicht verengt.'; end if;

  /* ⚠ DIE PROBE, AUF DIE ES ANKOMMT: niemand darf ohne Art dastehen. Genau
     das war die Gefahr des Rueckbaus — die dritte faellt, die Ableitung
     kippt, und wer nichts Gesetztes hat, ist nichts. */
  select count(distinct person_id) into v_verknuepft from public.eltern_kinder;
  select count(*) into v_eltern from public.personenarten_effektiv
   where ableitung = 'eltern_kinder';
  select count(*) into v_ohne
    from (select distinct k.person_id from public.eltern_kinder k) s
   where not exists (select 1 from public.personenarten_effektiv e
                      where e.person_id = s.person_id);
  if v_ohne <> 0 then
    raise exception 'VERLUST: % verknuepfte Person(en) haben gar keine Art.', v_ohne;
  end if;

  raise notice 'Fertig. % verknuepft, davon % Elternteil, % ohne Art (erwartet 0).',
    v_verknuepft, v_eltern, v_ohne;
end $mig$;
