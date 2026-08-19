-- ═══════════════════════════════════════════════════════════════════════════
-- SFV-VEREINSWAPPEN — Bucket, Tabelle, Wiederholregel
-- 20.08.2026
--
-- ANLASS. Im Spielbericht und im Spielplan soll neben dem Resultat das Wappen
-- des Gegners stehen — berichtende Verwendung, dieselbe, die jede
-- Sportzeitung macht. Entschieden am 20.08.2026: erlaubt, aber NUR dort.
-- Nicht als Schmuck anderswo, und fuer die oeffentliche Vereinswebsite wird
-- vorher neu gefragt.
--
--
-- WAS DIE PROBE ERGAB (20.08.2026, /api/team/picture/{teamId})
--
--   HTTP 200, Content-Type text/plain, Koerper BASE64 — ohne data:-Praefix
--   und ohne Anfuehrungszeichen. 80x80 px, 5-7 KB dekodiert.
--   Unbekannte teamId: 404 mit application/problem+json.
--
--   ⚠ DAS FORMAT IST NICHT EINHEITLICH. Der SFV gibt durch, was der Verein
--   hochgeladen hat:
--     FC Herrliberg       R0lGODlhUABQ…  -> GIF89a
--     FC Oberland United  /9j/4AAQSkZJ…  -> JPEG
--   Wer image/jpeg annimmt, zeigt bei manchen Vereinen nichts. Der Typ kommt
--   aus den Magic Bytes, und danach richtet sich auch die Dateiendung.
--
--   ⚠ ES IST DAS VEREINSWAPPEN, NICHT DAS TEAMBILD. Vier FCH-Teams mit vier
--   verschiedenen teamId liefern dieselbe Pruefsumme (0241b7db42, 6859 B).
--   Der Endpunkt heisst team/picture, ist aber pro Verein.
--
--   Geschluesselt wird trotzdem nach sfv_team_id: die steht an `spiele`
--   (sfv_gegner_team_id), die clubNumber des Gegners nicht. Die
--   Mehrfachablage kostet ein paar Kilobyte und spart eine Aufloesung.
--
--
-- UNSER EIGENES WAPPEN KOMMT NICHT VON HIER. 80x80 ist zu wenig, und im
-- Verein liegt es besser: `vereine.theme`. Die Anzeige greift nur beim
-- Gegner auf den Bucket zu.
--
--
-- WARUM STORAGE UND NICHT EINE SPALTE. Base64 in der Tabelle hiesse, dass
-- jede Spielplan-Abfrage saemtliche Wappen mitschickt — bei zwanzig Spielen
-- gut 160 KB, bei JEDEM Oeffnen des Moduls, ohne Browser-Cache. Wappen
-- aendern sich alle zehn Jahre; genau dafuer ist der Cache da.
--
--
-- WIEDERHOLREGEL: 30 TAGE. Hergeleitet, nicht geraten.
--   Kosten des Wiederholens: ein Aufruf je fehlendem Wappen. Bei ~20 ohne
--   Bild also unter einem Aufruf pro Tag — neben 35 pro Lauf nicht messbar.
--   Kosten des Wartens: nichts Dringendes, ein fehlendes Wappen ist eine
--   Luecke, kein Fehler.
--   Nicht kuerzer: sieben Tage vervierfachen die Aufrufe fuer einen
--   Unterschied, den niemand bemerkt.
--   Nicht "einmal pro Saison": ein Verein, der im September nachtraegt,
--   erschiene erst im naechsten Juli. Zehn Monate blank, obwohl das Bild da
--   ist.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_bucket   int;
  v_tabelle  int;
  v_policies int;
  v_rls      boolean;
begin

  -- ─── A) Der Bucket ───────────────────────────────────────────────────────
  -- public = true: die Wappen sind ohne Anmeldung lesbar, damit der Browser
  -- sie wie jedes andere Bild cachen kann. Das ist der ganze Zweck der
  -- Uebung — ein Bild hinter einer Anmeldung waere in jedem Aufruf neu zu
  -- holen.
  --
  -- SCHREIBEN KANN NUR DER SYNC. Auf storage.objects liegt fuer diesen
  -- Bucket KEINE Insert-Policy; die Edge Function schreibt ueber die Service
  -- Role und umgeht RLS. Kein angemeldeter Benutzer kann etwas ablegen —
  -- das ist Absicht und braucht deshalb gerade keine Policy.

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('sfv-logos', 'sfv-logos', true, 262144,
          array['image/jpeg','image/png','image/gif','image/webp'])
  on conflict (id) do update
     set public = true,
         file_size_limit = 262144,
         allowed_mime_types = array['image/jpeg','image/png','image/gif','image/webp'];

  /* 256 KB Obergrenze: die Wappen sind 5-7 KB. Wer eines Tages etwas
     anderes hochlaedt, faellt auf, statt still Platz zu belegen. */


  -- ─── B) Was liegt schon, und was fehlt ───────────────────────────────────

  execute $q$
    create table if not exists public.sfv_team_logos (
      id          uuid primary key default gen_random_uuid(),
      /* Der Fremdschluessel steht UNTEN als benannter Constraint. Hier
         nur der Typ — `references` zusaetzlich anzugeben legte einen
         zweiten, identischen an (Nachtrag am Dateiende). */
      verein_id   uuid    not null,
      sfv_team_id integer not null,

      /* Pfad im Bucket, null solange kein Bild vorliegt. */
      pfad        text,
      mime        text,
      geholt_am   timestamptz,

      /* Seit wann liefert der SFV kein Bild? Ohne diese Spalte fragte jeder
         Lauf erneut nach einem Wappen, das der Verein nie hochgeladen hat. */
      fehlt_seit  timestamptz,

      constraint sfv_team_logos_verein_key unique (verein_id, sfv_team_id),
      constraint sfv_team_logos_verein_fkey
        foreign key (verein_id) references public.vereine(id)
    )
  $q$;

  execute $q$
    comment on table public.sfv_team_logos is
      'Vereinswappen der Gegner, geholt ueber /api/team/picture/{teamId}. Geschluesselt nach sfv_team_id, obwohl das Bild dem VEREIN gehoert (alle Teams eines Vereins liefern dasselbe) — die teamId steht an spiele.sfv_gegner_team_id, die clubNumber nicht. Das eigene Wappen steht NICHT hier, sondern in vereine.theme.'
  $q$;

  execute $q$
    comment on column public.sfv_team_logos.fehlt_seit is
      'Seit wann der SFV kein Bild liefert (404). Der Sync fragt fruehestens 30 Tage danach erneut: kuerzer bringt nichts, das niemand bemerkt, und einmal pro Saison hiesse, dass ein im September nachgetragenes Wappen erst im Juli erscheint.'
  $q$;

  execute $q$
    comment on column public.sfv_team_logos.mime is
      'Aus den Magic Bytes bestimmt, NICHT angenommen: der SFV liefert durch, was der Verein hochgeladen hat — bei FCH ein GIF, bei FC Oberland United ein JPEG.'
  $q$;

  execute $q$create index if not exists sfv_team_logos_verein_idx on public.sfv_team_logos (verein_id)$q$;

  execute $q$alter table public.sfv_team_logos enable row level security$q$;
  execute $q$grant all on table public.sfv_team_logos to anon, authenticated, service_role$q$;

  /* Lesen: alle im Verein — die Anzeige braucht den Pfad. Schreiben: nur der
     Sync ueber die Service Role, also gar keine Policy dafuer. */
  execute $q$drop policy if exists sfv_team_logos_select on public.sfv_team_logos$q$;
  execute $q$create policy sfv_team_logos_select on public.sfv_team_logos
              for select using (verein_id = public.get_my_verein_id())$q$;


  -- ─── C) Pruefung ─────────────────────────────────────────────────────────

  select count(*) into v_bucket from storage.buckets where id = 'sfv-logos' and public;
  if v_bucket <> 1
  then raise exception 'UNVOLLSTAENDIG: Bucket sfv-logos fehlt oder ist nicht oeffentlich'; end if;

  select count(*) into v_tabelle from information_schema.tables
   where table_schema = 'public' and table_name = 'sfv_team_logos';
  if v_tabelle <> 1
  then raise exception 'UNVOLLSTAENDIG: Tabelle sfv_team_logos fehlt'; end if;

  select c.relrowsecurity into v_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'sfv_team_logos';
  if v_rls is distinct from true
  then raise exception 'UNVOLLSTAENDIG: RLS auf sfv_team_logos nicht aktiv'; end if;

  select count(*) into v_policies from pg_policies
   where schemaname = 'public' and tablename = 'sfv_team_logos';
  if v_policies <> 1
  then raise exception 'UNVOLLSTAENDIG: % Policies statt 1 (nur select, Schreiben laeuft ueber die Service Role)', v_policies; end if;

  raise notice 'Fertig: Bucket sfv-logos (oeffentlich, 256 KB), Tabelle sfv_team_logos, 1 Policy.';

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'Bucket oeffentlich', 1,
         (select count(*) from storage.buckets where id='sfv-logos' and public)::int
  union all
  select 2, 'Tabelle', 1,
         (select count(*) from information_schema.tables
           where table_schema='public' and table_name='sfv_team_logos')::int
  union all
  select 3, 'Policies (nur select)', 1,
         (select count(*) from pg_policies
           where schemaname='public' and tablename='sfv_team_logos')::int
  union all
  select 4, 'Wappen abgelegt', 0,
         (select count(*) from public.sfv_team_logos where pfad is not null)::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;

-- Nach dem naechsten Lauf: was liegt, was fehlt.
-- select sfv_team_id, mime, pfad, geholt_am, fehlt_seit from public.sfv_team_logos
--  order by fehlt_seit nulls first, sfv_team_id;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- begin;
--   delete from storage.objects where bucket_id = 'sfv-logos';
--   delete from storage.buckets where id = 'sfv-logos';
--   drop table if exists public.sfv_team_logos;
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Dump und Typen nachziehen. Zaehlprobe:
--     CREATE TABLE +1, CREATE POLICY +1, CREATE INDEX +1, ADD CONSTRAINT +4
--   Der Bucket steht im Schema `storage` und taucht im public-Dump NICHT auf
--   — wie die auth-Trigger und der cron-Auftrag. Diese Datei ist die einzige
--   Stelle, an der er festgehalten ist; beim Nachbauen zuerst hier nachsehen.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- NACHTRAG 20.08.2026 — ein Fremdschluessel zu viel
--
-- Die Spalte stand als `verein_id uuid not null references public.vereine(id)`
-- UND unten nochmals als benannter `sfv_team_logos_verein_fkey`. Postgres legt
-- daraufhin ZWEI identische Fremdschluessel an:
--
--   sfv_team_logos_verein_id_fkey   FOREIGN KEY (verein_id) -> vereine(id)
--   sfv_team_logos_verein_fkey      FOREIGN KEY (verein_id) -> vereine(id)
--
-- Aufgefallen an der Zaehlprobe: ADD CONSTRAINT +5 statt der erwarteten +4.
-- Folgenlos fuer die Daten, aber jede Einfuegung prueft zweimal dasselbe, und
-- wer die Tabelle liest, sucht den Unterschied zwischen den beiden.
--
-- Der Block oben ist korrigiert (kein inline `references` mehr). Fuer eine
-- Datenbank, in der die Tabelle schon steht, raeumt das hier auf:

do $mig$
declare v_fk int;
begin
  alter table public.sfv_team_logos drop constraint if exists sfv_team_logos_verein_id_fkey;

  select count(*) into v_fk from pg_constraint
   where conrelid = 'public.sfv_team_logos'::regclass and contype = 'f';
  if v_fk <> 1
  then raise exception 'UNVOLLSTAENDIG: % Fremdschluessel statt 1', v_fk; end if;

  raise notice 'Fertig: ein Fremdschluessel auf verein_id, nicht zwei.';
end $mig$;

select conname, pg_get_constraintdef(oid)
  from pg_constraint
 where conrelid = 'public.sfv_team_logos'::regclass and contype = 'f';
-- erwartet: genau eine Zeile, sfv_team_logos_verein_fkey
-- ═══════════════════════════════════════════════════════════════════════════
