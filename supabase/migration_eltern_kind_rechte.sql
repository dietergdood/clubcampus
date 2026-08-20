-- ═══════════════════════════════════════════════════════════════════════════
-- DER ELTERNTEIL DARF DIE PERSON SEINES KINDES PFLEGEN
-- 21.08.2026
--
-- Seit dem 20.08. sperrt die Datenpruefung bei fehlenden Pflichtfeldern.
-- 372 aktive Junioren haengen an der AHV-Nummer — bewusst Pflicht, ohne sie
-- keine Lizenz. Beim Kind selbst ist niemand angemeldet; erfassen muss sie
-- der Elternteil. Er kann es heute nicht, und zwar an fuenf Stellen
-- gleichzeitig. Zwei davon sind Rechte und stehen hier.
--
--
-- ⚠ DER AUSFALL SIEHT AUS WIE EINE DATENLAGE
--
-- `fetchKinderVollstaendigFuerElternteil()` liest `eltern_kinder` und dazu
-- eingebettet `mitglieder:mitglied_id(...)`. Auf `mitglieder` gibt es nur
-- `mitglieder_select_priv` (Verwaltung/Trainer/Funktionaer) und
-- `mitglieder_select_self` (`id = get_my_mitglied_id()`). Ein Elternteil hat
-- weder die Rolle noch eine mitglied_id.
--
-- RLS liefert dann KEINEN Fehler, sondern eine leere Einbettung: der Embed
-- kommt als null, `flacheZeile(null)` gibt null, `.filter(Boolean)` wirft es
-- weg. Ergebnis: leere Liste. Fuer den Aufrufer nicht zu unterscheiden von
-- „dieses Elternteil hat keine Kinder erfasst".
--
-- Dieselbe Familie wie der leere `catch` und wie `.eq(spalte, null)`: ein
-- Ausfall, der sich als Zustand ausgibt.
--
--
-- ASYMMETRISCH, UND DAS IST DER KERN
--
--   mitglieder_select_kind   JA    lesen
--   personen_update_kind     JA    schreiben
--   mitglieder_update_kind   NEIN
--
-- Der Elternteil pflegt die PERSON seines Kindes, nicht dessen
-- MITGLIEDSCHAFT. `mitgliedtyp`, `spielerpass`, `js_nr`, `fairgate_id`,
-- `aktiv` und `eintrittsdatum` bleiben bei der Verwaltung.
--
-- Warum `mitglieder` ueberhaupt lesbar sein muss: ohne `mitgliedtyp` gibt es
-- keine Feldkonfiguration fuer das Kind — und damit weder die Liste der
-- Pflichtfelder noch die Entscheidung, welche Felder ueberhaupt erscheinen.
-- Die Tabelle traegt seit Etappe 6a nur noch 14 Spalten, nichts Heikles:
-- Personendaten stehen in `personen` und sind ueber `personen_select_kind`
-- ohnehin schon sichtbar.
--
--
-- ⚠ RLS KENNT KEINE SPALTEN
--
-- `personen_update_kind` erlaubt die ZEILE, nicht einzelne Felder. Der
-- Elternteil koennte damit auch `funktionen` (Vereinsaemter), `email`
-- (Login-Name) oder `profil_geprueft_at` seines Kindes setzen.
--
-- Die Spaltensperre sitzt deshalb in der Anwendung, als ALLOWLIST und nicht
-- als Denylist (CLAUDE.md → Fremddaten): `updateKindDurchElternteil()` in
-- `domains/members/kindService.ts` zaehlt auf, was durchkommt, und MELDET,
-- was es abweist. Eine Denylist waere nur so gut wie die Fantasie dessen,
-- der sie geschrieben hat — und beim naechsten Feld in `personen` waere sie
-- still zu kurz.
--
-- Diese Migration allein macht das Portal also nicht sicher; sie macht es
-- moeglich. Wer die Policies einspielt und die Allowlist weglaesst, gibt dem
-- Elternteil die ganze Zeile.
--
--
-- WITH CHECK IST NICHT OPTIONAL
--
-- Ohne `with check` prueft Postgres bei UPDATE nur die Zeile VOR der
-- Aenderung. Der Elternteil koennte die `verein_id` seines Kindes auf einen
-- fremden Verein umschreiben — die Zeile waere danach weg und in einem
-- anderen Mandanten wieder da. `personen_update_self` und
-- `mitglieder_update_self` haben heute keins; dort faellt der `using`-
-- Ausdruck ersatzweise ein, was zufaellig genuegt. Hier wird es
-- ausgeschrieben.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz   int;
  v_eltern int;
begin

  -- ─── A) Vorpruefung ──────────────────────────────────────────────────────
  -- Das Vorbild muss stehen: `person_ist_mein_kind` und `get_my_person_id`.
  -- Fehlt eines, ist die Etappe 4 nicht eingespielt und die neue Funktion
  -- liefe ins Leere.

  select count(*) into v_anz from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname='public' and p.proname in ('person_ist_mein_kind','get_my_person_id');
  if v_anz < 2 then
    raise exception 'ABBRUCH: person_ist_mein_kind oder get_my_person_id fehlt (% von 2 gefunden). Etappe 4 nicht eingespielt?', v_anz;
  end if;

  select count(distinct person_id) into v_eltern from public.eltern_kinder;
  raise notice 'Betrifft % Elternteil(e) mit mindestens einem verknuepften Kind.', v_eltern;


  -- ─── B) Die Hilfsfunktion ────────────────────────────────────────────────
  -- SECURITY DEFINER wie das Vorbild: sie muss `eltern_kinder` und
  -- `mitglieder` lesen, und genau das darf der Elternteil noch nicht — die
  -- Funktion waere sonst ein Henne-Ei-Problem mit sich selbst.
  --
  -- `search_path` fest auf public, pg_temp: ohne das koennte jemand mit einem
  -- eigenen Schema eine Tabelle `eltern_kinder` unterschieben und die Funktion
  -- fuer sich entscheiden lassen.

  create or replace function public.mitglied_ist_mein_kind(p_mitglied_id bigint)
    returns boolean
    language sql stable security definer
    set search_path to 'public', 'pg_temp'
  as $fn$
    select exists (
      select 1
      from public.eltern_kinder ek
      where ek.mitglied_id = p_mitglied_id
        and ek.person_id   = public.get_my_person_id()
    );
  $fn$;

  alter function public.mitglied_ist_mein_kind(bigint) owner to postgres;

  execute $q$ comment on function public.mitglied_ist_mein_kind(bigint) is
    'Ist diese Mitgliedschaft die eines Kindes des angemeldeten Elternteils? Gegenstueck zu person_ist_mein_kind, nur ueber die Mitgliedschaft statt ueber die Person. Braucht SECURITY DEFINER, weil ein Elternteil eltern_kinder und mitglieder sonst nicht lesen darf — die Funktion soll die Frage beantworten, nicht selbst an ihr scheitern.' $q$;

  /* Die Funktion muss aufrufbar sein — sonst schlaegt jede Policy, die sie
     benutzt, fuer normale Nutzer fehl. Dieselben Rollen wie beim Vorbild. */
  grant execute on function public.mitglied_ist_mein_kind(bigint) to anon, authenticated, service_role;


  -- ─── C) Lesen: die Mitgliedschaft des eigenen Kindes ─────────────────────

  drop policy if exists mitglieder_select_kind on public.mitglieder;
  create policy mitglieder_select_kind on public.mitglieder for select
    using (verein_id = public.get_my_verein_id()
           and public.mitglied_ist_mein_kind(id));


  -- ─── D) Schreiben: die Person des eigenen Kindes ─────────────────────────
  -- ⚠ `with check` mit derselben Bedingung: sonst koennte die Zeile so
  -- veraendert werden, dass sie danach nicht mehr sichtbar waere.

  drop policy if exists personen_update_kind on public.personen;
  create policy personen_update_kind on public.personen for update
    using      (verein_id = public.get_my_verein_id() and public.person_ist_mein_kind(id))
    with check (verein_id = public.get_my_verein_id() and public.person_ist_mein_kind(id));


  -- ─── E) Pruefung ─────────────────────────────────────────────────────────

  select count(*) into v_anz from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname='public' and p.proname = 'mitglied_ist_mein_kind';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: mitglied_ist_mein_kind fehlt'; end if;

  select count(*) into v_anz from pg_policies
   where schemaname='public' and policyname in ('mitglieder_select_kind','personen_update_kind');
  if v_anz <> 2 then raise exception 'UNVOLLSTAENDIG: nur % von 2 Policies angelegt', v_anz; end if;

  /* ⚠ Ohne with_check waere die Mandantengrenze offen — ausdruecklich
     nachgesehen und nicht darauf vertraut, dass `create policy` es uebernimmt. */
  select count(*) into v_anz from pg_policies
   where schemaname='public' and policyname='personen_update_kind'
     and coalesce(with_check,'') <> '';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: personen_update_kind hat kein WITH CHECK'; end if;

  /* Die neue Lesepolicy darf die bestehenden nicht ersetzt haben: RLS
     verknuepft mehrere SELECT-Policies mit ODER, es kommt also etwas dazu und
     nichts faellt weg. Waere eine verschwunden, saehe die Verwaltung ploetzlich
     weniger — und niemand suchte den Grund in dieser Migration. */
  select count(*) into v_anz from pg_policies
   where schemaname='public' and tablename='mitglieder' and cmd='SELECT';
  if v_anz <> 3 then raise exception 'UNVOLLSTAENDIG: % SELECT-Policies auf mitglieder, erwartet 3 (priv, self, kind)', v_anz; end if;

  select count(*) into v_anz from pg_policies
   where schemaname='public' and tablename='personen' and cmd='UPDATE';
  if v_anz <> 3 then raise exception 'UNVOLLSTAENDIG: % UPDATE-Policies auf personen, erwartet 3 (admin, self, kind)', v_anz; end if;

  raise notice 'Fertig. Lesen der Mitgliedschaft und Schreiben der Person des eigenen Kindes sind freigegeben.';
  raise notice 'ACHTUNG: die Spaltensperre fehlt noch. Ohne updateKindDurchElternteil() darf ein Elternteil die GANZE Personenzeile seines Kindes schreiben.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'Funktion mitglied_ist_mein_kind', 1,
         (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='mitglied_ist_mein_kind')::int
  union all
  select 2, 'Policy mitglieder_select_kind', 1,
         (select count(*) from pg_policies where schemaname='public' and policyname='mitglieder_select_kind')::int
  union all
  select 3, 'Policy personen_update_kind', 1,
         (select count(*) from pg_policies where schemaname='public' and policyname='personen_update_kind')::int
  union all
  select 4, 'personen_update_kind hat WITH CHECK', 1,
         (select count(*) from pg_policies where schemaname='public'
            and policyname='personen_update_kind' and coalesce(with_check,'') <> '')::int
  union all
  select 5, 'SELECT-Policies auf mitglieder', 3,
         (select count(*) from pg_policies where schemaname='public' and tablename='mitglieder' and cmd='SELECT')::int
  union all
  select 6, 'UPDATE-Policies auf personen', 3,
         (select count(*) from pg_policies where schemaname='public' and tablename='personen' and cmd='UPDATE')::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;

/* Die Funktion gegen den Bestand: fuer ein Elternteil mit Kindern muss sie
   true liefern. Ohne Sitzung ist get_my_person_id() leer, deshalb hier nur
   die Gegenprobe, dass sie ueberhaupt aufrufbar ist und false gibt. */
select public.mitglied_ist_mein_kind(1) as ohne_sitzung_erwartet_false;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- begin;
--   drop policy if exists mitglieder_select_kind on public.mitglieder;
--   drop policy if exists personen_update_kind   on public.personen;
--   drop function if exists public.mitglied_ist_mein_kind(bigint);
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Dump und `npm run gen:types` nachziehen.
--
--   ZAEHLPROBE:
--     CREATE TABLE   ±0
--     CREATE POLICY  +2
--     CREATE INDEX   ±0
--     ADD CONSTRAINT ±0
--
--   Die Funktion zaehlt in KEINER der vier Kategorien — sie steht als
--   CREATE FUNCTION im Dump. Gegenprobe:
--     grep -c "^CREATE OR REPLACE FUNCTION" supabase/schema.sql   → +1
--
--   ⚠ UND DANN DIE ALLOWLIST. Zwischen dieser Migration und
--   `updateKindDurchElternteil()` ist die Personenzeile des Kindes fuer den
--   Elternteil vollstaendig schreibbar. Heute faellt das nicht auf, weil kein
--   einziger Elternteil ein Portal-Konto hat (0 von 394, gemessen am
--   21.08.2026) — das ist ein Zufall der Datenlage und keine Absicherung.
-- ═══════════════════════════════════════════════════════════════════════════
