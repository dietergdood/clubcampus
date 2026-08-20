-- ═══════════════════════════════════════════════════════════════════════════
-- EINE AUSSAGE, EIN ORT: profil_geprueft_at gehoert der Person
-- 20.08.2026
--
-- `profil_geprueft_at` stand an ZWEI Stellen, und die beiden Schreiber
-- gingen auseinander:
--
--   markiereProfilGeprueft()   schrieb nach  benutzer.profil_geprueft_at
--   DatenpruefungMitglied      schrieb nach  personen.profil_geprueft_at
--                              (ueber updateMitglied → verteileFelder)
--   sollProfilPruefen()        LAS BEIDE, mit Rueckfall
--
-- Der Rueckfall ist das Tueckische daran: er hat die Abweichung nicht
-- ausgeglichen, sondern VERDECKT. Wer ueber den Overlay bestaetigte, schrieb
-- nach `benutzer` — die Mitgliederliste liest `personen` und zeigte weiter
-- „Ausstehend", waehrend sollProfilPruefen() zufrieden war und den Hinweis
-- nicht mehr zeigte. Beide Seiten hielten sich fuer richtig.
--
-- Dasselbe Muster wie `mitglieder.hat_portal_zugang` neben dem Join auf
-- `benutzer` (in Etappe 6c aufgeloest) und wie `helper_zuteilungen.
-- mitglied_name` neben `mitglied_id` (heute frueher aufgeloest). Es ist in
-- Etappe 6c durchgerutscht, weil dort nach Spalten in `mitglieder` gesucht
-- wurde — diese hier steht in `benutzer`.
--
-- `personen.profil_geprueft_at` ist die Wahrheit: das Feld steht in
-- PERSON_FELDER, und ein Elternteil ohne Mitgliedschaft hat es ebenso wie
-- ein Mitglied. Der Code liest und schreibt seit dem 20.08.2026 nur noch
-- dort.
--
--
-- ⚠ VORHER WIRD UEBERTRAGEN, NICHT VERWORFEN
--
-- In `benutzer` koennen Bestaetigungen stehen, die es in `personen` nicht
-- gibt — jede, die ueber den Overlay lief. Block B traegt sie nach, aber nur
-- wo `personen` LEER ist oder AELTER: eine Bestaetigung ist eine Aussage
-- ueber einen Zeitpunkt, und die juengere gilt. Ohne diesen Schritt wuerden
-- Nutzer erneut zur Datenpruefung aufgefordert, die sie gerade erledigt
-- haben.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_spalte      int;
  v_uebertragen int;
  v_offen       int;
begin

  -- ─── A) Gibt es die Altspalte ueberhaupt noch? ───────────────────────────

  select count(*) into v_spalte from information_schema.columns
   where table_schema = 'public' and table_name = 'benutzer'
     and column_name = 'profil_geprueft_at';

  if v_spalte = 0 then
    raise notice 'benutzer.profil_geprueft_at ist bereits weg — nichts zu tun.';
    return;
  end if;


  -- ─── B) Nachtragen, wo die Person nichts oder Aelteres weiss ─────────────

  update public.personen p
     set profil_geprueft_at = b.profil_geprueft_at,
         updated_at = now()
    from public.benutzer b
   where b.person_id = p.id
     and b.profil_geprueft_at is not null
     and (p.profil_geprueft_at is null
          or p.profil_geprueft_at < b.profil_geprueft_at);
  get diagnostics v_uebertragen = row_count;
  raise notice '% Bestaetigung(en) aus benutzer nach personen uebertragen.', v_uebertragen;

  /* Konten ohne person_id koennen nichts uebertragen. Seit Etappe 4 sollte
     es keine geben; wenn doch, ist das eine eigene Baustelle und gehoert
     genannt statt stillschweigend verloren. */
  select count(*) into v_offen from public.benutzer
   where profil_geprueft_at is not null and person_id is null;
  if v_offen > 0 then
    raise warning '% Benutzerkonto(en) mit Bestaetigung, aber ohne person_id — ihre Bestaetigung geht verloren. Seit Etappe 4 sollte es keine geben.', v_offen;
  end if;


  -- ─── C) Die Altspalte faellt ─────────────────────────────────────────────
  -- ⚠ Vorher pruefen, ob eine Policy daran haengt: eine Policy blockiert
  -- DROP COLUMN mit 2BP01, ein Index faellt stillschweigend mit
  -- (ARCHITECTURE.md → „Eine Policy blockiert DROP COLUMN, ein Index nicht").

  select count(*) into v_spalte from pg_policies
   where schemaname = 'public' and tablename = 'benutzer'
     and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ 'profil_geprueft_at';
  if v_spalte > 0 then
    raise exception 'ABBRUCH: % Policy/Policies auf benutzer nennen profil_geprueft_at. Sie gehoeren in diese Migration aufgenommen — nicht per CASCADE weggeraeumt.', v_spalte;
  end if;

  alter table public.benutzer drop column profil_geprueft_at;

  execute $q$ comment on column public.personen.profil_geprueft_at is
    'Wann die Person ihre Daten zuletzt bestaetigt hat. DIE einzige Stelle — die Altspalte benutzer.profil_geprueft_at ist am 20.08.2026 gefallen. Sie war eine zweite Aussage ueber dieselbe Sache: wer ueber den Overlay bestaetigte, schrieb dorthin, die Mitgliederliste las hier, und der Rueckfall in sollProfilPruefen() verdeckte die Abweichung.' $q$;


  -- ─── D) Pruefung ─────────────────────────────────────────────────────────

  select count(*) into v_spalte from information_schema.columns
   where table_schema='public' and table_name='benutzer' and column_name='profil_geprueft_at';
  if v_spalte <> 0
  then raise exception 'UNVOLLSTAENDIG: benutzer.profil_geprueft_at steht noch'; end if;

  select count(*) into v_spalte from information_schema.columns
   where table_schema='public' and table_name='personen' and column_name='profil_geprueft_at';
  if v_spalte <> 1
  then raise exception 'UNVOLLSTAENDIG: personen.profil_geprueft_at fehlt'; end if;

  raise notice 'Fertig. profil_geprueft_at steht nur noch an der Person.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'benutzer.profil_geprueft_at ist weg', 0,
         (select count(*) from information_schema.columns
           where table_schema='public' and table_name='benutzer' and column_name='profil_geprueft_at')::int
  union all
  select 2, 'personen.profil_geprueft_at steht', 1,
         (select count(*) from information_schema.columns
           where table_schema='public' and table_name='personen' and column_name='profil_geprueft_at')::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;

/* Wie viele aktive Mitglieder haben ihre Daten nie bestaetigt?
   ⚠ Die Zahl heisst „noch nie bestaetigt", NICHT „unvollstaendig" — auch
   nach dem Anschliessen der Pflichtfelder. Wer sie als Mass fuer
   Datenqualitaet liest, liest etwas anderes, als er denkt. */
select count(*) as nie_bestaetigt
  from public.mitglieder m
  join public.personen p on p.id = m.person_id
 where m.aktiv and p.profil_geprueft_at is null;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Dump und Typen nachziehen (`npm run gen:types`).
--   ZAEHLPROBE (gemessen): CREATE INDEX **−1**, die anderen drei ±0.
--
--   ⚠ Vorhergesagt war ±0 in allen vier — falsch, und zwar zum dritten Mal
--   am selben Tag aus demselben Grund: mit `benutzer.profil_geprueft_at`
--   fiel `idx_benutzer_profil_geprueft` STILLSCHWEIGEND MIT.
--
--   Beim Vorhersagen einer Zaehlprobe fuer eine gestrichene Spalte gehoeren
--   deshalb IHRE Indizes und Fremdschluessel abgezogen:
--
--     select indexname from pg_indexes
--      where schemaname='public' and tablename='<tabelle>' and indexdef ~ '<spalte>';
--     select conname from pg_constraint c join pg_class t on t.oid=c.conrelid
--      where t.relname='<tabelle>' and pg_get_constraintdef(c.oid) ~ '<spalte>';
-- ═══════════════════════════════════════════════════════════════════════════
