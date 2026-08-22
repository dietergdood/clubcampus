-- ═══════════════════════════════════════════════════════════════════════════
-- MITGLIEDTYP-FELDKONFIGURATION — eine Stelle statt vier
-- 19.08.2026
--
-- ANLASS
-- Was ein Mitgliedsprofil zeigt, entscheiden heute vier Stellen:
--   mitgliedtyp_pflichtfelder      Pflicht ja/nein pro Typ        (lebt)
--   rolle_pflichtfelder            Pflicht ja/nein pro Portalrolle
--   getFieldVisibility()           acht Zeilen ueber ein Rollen-Level
--   InfoTab.tsx                    fv.showPass, fv.showFairgateId,
--                                  fv.showNotizen, istSupporter
--
-- Diese Migration legt die Datengrundlage fuer EINE Quelle: pro Mitgliedtyp
-- bekommt jeder Schluessel einen von drei Werten — pflicht, freiwillig, aus.
-- "aus" ist neu und bedeutet "gibt es nicht": das Feld verschwindet aus
-- Profil, Neuanlage und Datenpruefung, auch fuer die Verwaltung.
--
-- KEIN CODE AENDERT SICH MIT. Die App liest weiterhin
-- mitgliedtyp_pflichtfelder; beide Tabellen stehen nebeneinander, bis
-- Schritt 3 und 4 des Auftrags geliefert sind. Genau deshalb eine neue
-- Tabelle statt einer neuen Spalte: Migration und Codelieferung muessen
-- nicht am selben Tag stattfinden.
--
--
-- WAS AUS DEN ABFRAGEN VOM 19.08.2026 HERVORGING
--
-- 1) 89 Zeilen in mitgliedtyp_pflichtfelder, davon 17 VERWAIST — sie zeigen
--    auf Mitgliedtypen, die es nicht (mehr) gibt:
--
--      Juniormitglied   6   fest verdrahteter Spaltenkopf, behoben 05.08.2026
--      Funktionaer      6   derselbe Defekt
--      Supporter          5   vermutlich der Name vor Etappe 5
--
--    Wirkung heute: keine, nichts trifft auf diese Namen zu. Sie kommen
--    NICHT mit. Der Block zaehlt sie und nennt sie beim Namen, statt sie
--    still zu verlieren.
--
-- 2) Der Grund fuer beide Ursachen faellt hier weg. mitgliedtyp_feldkonfig
--    zeigt ueber mitgliedtyp_id auf mitgliedtypen(id), nicht ueber den
--    Namen. Ein Haekchen auf einen nicht existierenden Typ wird von der
--    Datenbank abgelehnt statt geschrieben, und eine Umbenennung beruehrt
--    die Zeilen nicht mehr.
--
-- 3) rolle_pflichtfelder kommt NICHT mit. Ihr Nettobeitrag sind drei Felder
--    — spielerpass, js_nr, fairgate_id — und alle drei sind als pauschale
--    Pflicht falsch: fairgate_id kann nur der Sync schreiben, js_nr hat ein
--    Neunjaehriger nicht, spielerpass gilt nicht fuer Trainer. Die uebrigen
--    sechs Felder der Rollen-Matrix stehen ohnehin in der Typ-Matrix.
--    Die Tabelle bleibt stehen wie elternkontakte und faellt spaeter.
--
-- 4) Die Typ-Matrix ist zu eng gestellt: Ehrenmitglied, Pausenmitglied,
--    Juniorenmitglied und Funktionaer/in verlangen alle zehn Felder,
--    inklusive AHV-Nummer, Nationalitaet und Heimatort. Das wandert
--    trotzdem WOERTLICH mit — Lockern ist eine Pflicht/Freiwillig-Frage
--    und gehoert in einem Durchgang in die neue Oberflaeche, nicht in
--    diese Migration.
--
--
-- ABBILDUNG
--   pflicht = true    ->  'pflicht'
--   pflicht = false   ->  'freiwillig'
--   pflicht = null    ->  'freiwillig'   (case when null faellt in else)
--   fehlende Zeile    ->  'freiwillig'   (nicht gespeichert)
--
-- Die letzte Zeile ist der Kern: gespeichert wird nur die Abweichung.
-- Ein neuer Mitgliedtyp braucht keine einzige Zeile und zeigt trotzdem ein
-- vollstaendiges Profil. Das ist exakt das heutige Verhalten — es gibt
-- keine Rueckfallliste, ohne Zeile ist nichts Pflicht (pflichtfelder.ts).
-- Damit ist die Uebernahme verlustfrei UND verhaltensneutral.
--
--
-- DIE EINE AUSNAHME: der Supporter
-- Sieben Schluessel gehen bei Typen, die keine Mitgliedschaft sind, auf
-- 'aus'. Fuenf davon sind neu (spielerpass, js_nr, fairgate_id, teams,
-- funktionen) und ersetzen die drei istSupporter-Abfragen in InfoTab.
-- Zwei ueberschreiben die Uebernahme: geburtsdatum und geschlecht standen
-- beim Supporter auf Pflicht. Ein Supporter gibt sein Geburtsdatum nicht her,
-- und der Verein braucht es nicht.
--
-- strasse/plz/ort und telefon bleiben Pflicht: wer Bandenwerbung zahlt,
-- bekommt eine Rechnung, und dafuer braucht es eine Adresse.
--
-- ahv_nr, nationalitaet und heimatort stehen beim Supporter gar nicht in
-- der Matrix. Sie sind damit 'freiwillig' — sichtbar, aber nicht verlangt.
-- Wenn sie ganz verschwinden sollen, ist das ein Klick in der neuen
-- Oberflaeche, kein Migrationsschritt.
--
-- Gesteuert wird das ueber zaehlt_als_mitgliedschaft, NICHT ueber den
-- Namen 'Supporter'. Der Name faellt genau einmal, im update in Block A —
-- das ist die einzige Stelle, an der die heutigen Daten benannt werden
-- muessen. Beim zweiten Verein, der seinen Typ 'Supporter' nennt, greift
-- alles Weitere trotzdem.
--
--
-- ERWARTETE ZAHLEN (Stand der Abfragen vom 19.08.2026)
--   uebernommen          72
--   verwaist, bleibt     17
--   Supporter-Seed neu      5   (spielerpass, js_nr, fairgate_id,
--                              teams, funktionen)
--   Supporter-Seed Update   2   (geburtsdatum, geschlecht: pflicht -> aus)
--   Zeilen danach        77
--
-- Der Block prueft die Beziehung (uebernommen + verwaist = alt), nicht die
-- absoluten Zahlen — sonst schluege er fehl, wenn zwischen Abfrage und Lauf
-- noch jemand ein Haekchen setzt. Die Zahlen stehen in der Prueftabelle am
-- Dateiende, zum Hinschauen.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_alt_gesamt    int;
  v_verwaist      int;
  v_verwaist_wer  text;
  v_migriert      int;
  v_gesamt_neu    int;
  v_policies      int;
  v_rls           boolean;
  v_nichtmitglied int;
  v_ohne_seed     int;
begin

  -- ─── 0) Ausgangslage, vor jeder Aenderung festhalten ─────────────────────

  select count(*) into v_alt_gesamt from public.mitgliedtyp_pflichtfelder;

  select count(*), coalesce(string_agg(distinct p.mitgliedtyp, ', '), '(keine)')
    into v_verwaist, v_verwaist_wer
    from public.mitgliedtyp_pflichtfelder p
   where not exists (select 1 from public.mitgliedtypen mt
                      where mt.verein_id = p.verein_id
                        and mt.name      = p.mitgliedtyp);

  raise notice 'Ausgangslage: % Zeilen alt, davon % verwaist (%)',
    v_alt_gesamt, v_verwaist, v_verwaist_wer;


  -- ─── A) mitgliedtypen.zaehlt_als_mitgliedschaft ──────────────────────────
  -- Loest den Namensvergleich auf "Supporter" ab, der heute an zwei Stellen
  -- steht: MitgliederModul trennt die Liste damit, InfoTab blendet damit
  -- Bereiche aus. Die zweite Stelle uebernimmt die Feldkonfiguration, die
  -- erste diese Spalte.
  --
  -- Beruehrt NICHT die offene Frage, ob ein Supporter ueberhaupt eine Zeile in
  -- `mitglieder` haben soll (CLAUDE.md). Im Gegenteil: wird das je
  -- zurueckgebaut, haengt die Listentrennung dann nicht mehr am Namen.

  alter table public.mitgliedtypen
    add column if not exists zaehlt_als_mitgliedschaft boolean not null default true;

  -- execute, weil plpgsql Anweisungen vorab plant und die Spalte beim Planen
  -- noch nicht existiert (ARCHITECTURE.md -> Migrationen pruefen sich selbst).
  execute $q$
    comment on column public.mitgliedtypen.zaehlt_als_mitgliedschaft is
      'False = dieser Typ ist keine Mitgliedschaft (eine Person ohne Mitgliedschaft): kein Beitrag, kein Stimmrecht an der GV, kein Spielbetrieb, eigener Tab in der Mitgliederliste. Ersetzt den Namensvergleich auf "Supporter" im Frontend.'
  $q$;

  execute $q$
    update public.mitgliedtypen
       set zaehlt_als_mitgliedschaft = false
     where name = 'Supporter'
  $q$;

  -- Zusammengesetzter Schluessel, damit der Fremdschluessel unten BEIDE
  -- Spalten pruefen kann. Ohne ihn liesse sich eine Konfigurationszeile mit
  -- einer verein_id anlegen, die nicht zu ihrem Mitgliedtyp gehoert — genau
  -- die Sorte stiller Fehlzuordnung, die das Projekt schon zweimal hatte.
  -- (id ist Primaerschluessel, (id, verein_id) ist damit trivial eindeutig.)
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.mitgliedtypen'::regclass
                    and conname  = 'mitgliedtypen_id_verein_key') then
    alter table public.mitgliedtypen
      add constraint mitgliedtypen_id_verein_key unique (id, verein_id);
  end if;


  -- ─── B) Die neue Tabelle ─────────────────────────────────────────────────
  -- schluessel statt feld: dort stehen auch Bereiche (teams, funktionen,
  -- notizen) und die Profil-Tabs (tab_eltern, tab_verlauf, ...). Welche
  -- Schluessel es gibt und welche Modi je Schluessel sinnvoll sind, haelt die
  -- Registry in domains/members/feldkonfig.ts — die Datenbank prueft nur den
  -- Wertebereich. Stuende die Schluesselliste auch in SQL, stuende sie an
  -- zwei Stellen.

  -- In execute, weil der Fremdschluessel unten auf mitgliedtypen_id_verein_key
  -- zeigt — einen Schluessel, den dieser Block zwanzig Zeilen weiter oben erst
  -- anlegt.
  execute $q$
    create table if not exists public.mitgliedtyp_feldkonfig (
      id             uuid primary key default gen_random_uuid(),
      verein_id      uuid        not null references public.vereine(id),
      mitgliedtyp_id uuid        not null,
      schluessel     text        not null,
      modus          text        not null,
      created_at     timestamptz default now(),

      constraint mitgliedtyp_feldkonfig_modus_check
        check (modus in ('pflicht','freiwillig','aus')),

      constraint mitgliedtyp_feldkonfig_verein_key
        unique (verein_id, mitgliedtyp_id, schluessel),

      constraint mitgliedtyp_feldkonfig_typ_fkey
        foreign key (mitgliedtyp_id, verein_id)
        references public.mitgliedtypen (id, verein_id)
        on delete cascade
    )
  $q$;

  -- Kein eigener Index auf (verein_id): der UNIQUE-Schluessel oben fuehrt
  -- verein_id als erste Spalte und erfuellt die Regel aus ARCHITECTURE.md.
  -- Ein zweiter Index waere reine Schreiblast.

  execute $q$
    comment on table public.mitgliedtyp_feldkonfig is
      'Was ein Mitgliedtyp hat: pro Schluessel einer von drei Werten — pflicht, freiwillig, aus ("gibt es nicht", auch fuer die Verwaltung). Fehlende Zeile bedeutet freiwillig; gespeichert wird nur die Abweichung. Loest mitgliedtyp_pflichtfelder und rolle_pflichtfelder ab.'
  $q$;

  execute $q$
    comment on column public.mitgliedtyp_feldkonfig.schluessel is
      'Feld (geburtsdatum, ahv_nr, ...), Bereich (teams, funktionen, notizen) oder Profil-Tab (tab_eltern, ...). Die gueltige Liste steht in domains/members/feldkonfig.ts, nicht hier.'
  $q$;

  execute $q$
    comment on column public.mitgliedtyp_feldkonfig.modus is
      'pflicht = wird gezeigt und verlangt; freiwillig = wird gezeigt, darf leer bleiben; aus = gibt es nicht, verschwindet aus Profil, Neuanlage und Datenpruefung.'
  $q$;

  execute $q$alter table public.mitgliedtyp_feldkonfig enable row level security$q$;

  execute $q$grant all on table public.mitgliedtyp_feldkonfig to anon$q$;
  execute $q$grant all on table public.mitgliedtyp_feldkonfig to authenticated$q$;
  execute $q$grant all on table public.mitgliedtyp_feldkonfig to service_role$q$;

  -- Vereinskonfiguration: alle im Verein duerfen lesen (Profil und Neuanlage
  -- brauchen die Antwort), schreiben nur is_admin().
  -- using UND with check — ohne with check koennte ein Admin eine Zeile mit
  -- fremder verein_id einfuegen.
  --
  -- Auch diese vier stehen in execute: sie greifen auf ein Objekt zu, das in
  -- diesem Block entsteht, und die using-Ausdruecke nennen dessen Spalte.
  execute $q$drop policy if exists mitgliedtyp_feldkonfig_select on public.mitgliedtyp_feldkonfig$q$;
  execute $q$
    create policy mitgliedtyp_feldkonfig_select on public.mitgliedtyp_feldkonfig
      for select
      using (verein_id = public.get_my_verein_id())
  $q$;

  execute $q$drop policy if exists mitgliedtyp_feldkonfig_write on public.mitgliedtyp_feldkonfig$q$;
  execute $q$
    create policy mitgliedtyp_feldkonfig_write on public.mitgliedtyp_feldkonfig
      for all
      using      (verein_id = public.get_my_verein_id() and public.is_admin())
      with check (verein_id = public.get_my_verein_id() and public.is_admin())
  $q$;


  -- ─── C) Uebernahme der gueltigen Zeilen ──────────────────────────────────
  -- Der join ueber (verein_id, name) laesst die 17 verwaisten Zeilen liegen.
  -- pflicht ist nullable; `case when null` faellt in den else-Zweig und wird
  -- damit 'freiwillig' — dieselbe Auslegung wie `p.pflicht` in JS.

  execute $q$
    insert into public.mitgliedtyp_feldkonfig (verein_id, mitgliedtyp_id, schluessel, modus)
    select p.verein_id, mt.id, p.feld,
           case when p.pflicht then 'pflicht' else 'freiwillig' end
      from public.mitgliedtyp_pflichtfelder p
      join public.mitgliedtypen mt
        on mt.verein_id = p.verein_id
       and mt.name      = p.mitgliedtyp
    on conflict (verein_id, mitgliedtyp_id, schluessel) do nothing
  $q$;


  -- ─── D) Supporter: sieben Schluessel auf 'aus' ─────────────────────────────
  -- Ersetzt die drei istSupporter-Abfragen in InfoTab.tsx (Vereinsdaten,
  -- PersonTeams, PersonFunktionen) plus die zwei Angaben, die ein Supporter
  -- nicht hergibt. do update, weil geburtsdatum und geschlecht aus Block C
  -- bereits als 'pflicht' dastehen.
  --
  -- mitgliedtyp und eintrittsdatum bleiben bewusst aussen vor: die Karte
  -- Vereinsdaten behaelt zwei Zeilen. Ein Typ, den man im Profil nicht
  -- aendern kann, ist eine Sackgasse — dasselbe Muster wie bei 'aus', wo
  -- die Zeile sichtbar bleiben muss, um sie zurueckholen zu koennen.

  execute $q$
    insert into public.mitgliedtyp_feldkonfig (verein_id, mitgliedtyp_id, schluessel, modus)
    select mt.verein_id, mt.id, s.schluessel, 'aus'
      from public.mitgliedtypen mt
     cross join (values ('spielerpass'), ('js_nr'), ('fairgate_id'),
                        ('teams'), ('funktionen'),
                        ('geburtsdatum'), ('geschlecht')) as s(schluessel)
     where mt.zaehlt_als_mitgliedschaft = false
    on conflict (verein_id, mitgliedtyp_id, schluessel)
      do update set modus = 'aus'
  $q$;


  -- ─── E) Pruefung, im selben Block ────────────────────────────────────────

  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public'
                    and table_name   = 'mitgliedtyp_feldkonfig')
  then raise exception 'UNVOLLSTAENDIG: Tabelle mitgliedtyp_feldkonfig fehlt'; end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public'
                    and table_name   = 'mitgliedtypen'
                    and column_name  = 'zaehlt_als_mitgliedschaft')
  then raise exception 'UNVOLLSTAENDIG: mitgliedtypen.zaehlt_als_mitgliedschaft fehlt'; end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'mitgliedtyp_feldkonfig_typ_fkey')
  then raise exception 'UNVOLLSTAENDIG: Fremdschluessel auf mitgliedtypen fehlt'; end if;

  -- Ueber pg_class/pg_namespace statt ::regclass. Ein Cast einer Konstante auf
  -- regclass wird beim Planen aufgeloest, nicht beim Ausfuehren — bei einer
  -- Tabelle, die dieser Block selbst anlegt, ist das die falsche Reihenfolge.
  -- `is distinct from true`, damit auch ein NULL (Tabelle nicht gefunden) als
  -- Fehler zaehlt und nicht still durchgeht.
  select c.relrowsecurity into v_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'mitgliedtyp_feldkonfig';
  if v_rls is distinct from true
  then raise exception 'UNVOLLSTAENDIG: RLS auf mitgliedtyp_feldkonfig nicht aktiv'; end if;

  select count(*) into v_policies from pg_policies
   where schemaname = 'public' and tablename = 'mitgliedtyp_feldkonfig';
  if v_policies <> 2
  then raise exception 'UNVOLLSTAENDIG: % Policies statt 2', v_policies; end if;

  -- Jede alte Zeile hat entweder ein Zuhause gefunden oder ist als verwaist
  -- bekannt. Keine darf unbemerkt verschwinden.
  execute $q$
    select count(*)
      from public.mitgliedtyp_pflichtfelder p
      join public.mitgliedtypen mt
        on mt.verein_id = p.verein_id and mt.name = p.mitgliedtyp
      join public.mitgliedtyp_feldkonfig k
        on k.verein_id      = p.verein_id
       and k.mitgliedtyp_id = mt.id
       and k.schluessel     = p.feld
  $q$ into v_migriert;

  if v_migriert + v_verwaist <> v_alt_gesamt then
    raise exception 'UNVOLLSTAENDIG: % uebernommen + % verwaist ergibt nicht % alte Zeilen',
      v_migriert, v_verwaist, v_alt_gesamt;
  end if;

  -- Der Supporter-Seed muss jemanden getroffen haben. Heisst der Typ anders
  -- als 'Supporter', laeuft Block A ins Leere und Block D ebenso — das darf
  -- nicht still bleiben.
  execute $q$
    select count(*) from public.mitgliedtypen where zaehlt_als_mitgliedschaft = false
  $q$ into v_nichtmitglied;

  if v_nichtmitglied = 0 then
    raise exception 'UNVOLLSTAENDIG: kein Mitgliedtyp auf zaehlt_als_mitgliedschaft = false. Heisst der Supporter-Typ anders als "Supporter"?';
  end if;

  execute $q$
    select count(*) from public.mitgliedtypen mt
     where mt.zaehlt_als_mitgliedschaft = false
       and (select count(*) from public.mitgliedtyp_feldkonfig k
             where k.mitgliedtyp_id = mt.id
               and k.modus          = 'aus'
               and k.schluessel in ('spielerpass','js_nr','fairgate_id',
                                    'teams','funktionen',
                                    'geburtsdatum','geschlecht')) <> 7
  $q$ into v_ohne_seed;

  if v_ohne_seed <> 0 then
    raise exception 'UNVOLLSTAENDIG: % Typ(en) ohne vollstaendigen Supporter-Seed', v_ohne_seed;
  end if;

  execute $q$select count(*) from public.mitgliedtyp_feldkonfig$q$ into v_gesamt_neu;

  raise notice 'Fertig: % uebernommen, % verwaist (bleiben liegen), % Zeilen in mitgliedtyp_feldkonfig, % Typ(en) ohne Mitgliedschaft.',
    v_migriert, v_verwaist, v_gesamt_neu, v_nichtmitglied;

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- Bestaetigung fuer den Menschen. Die Absicherung ist der Block oben.

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'Zeilen uebernommen', 72,
         (select count(*) from public.mitgliedtyp_pflichtfelder p
            join public.mitgliedtypen mt
              on mt.verein_id = p.verein_id and mt.name = p.mitgliedtyp
            join public.mitgliedtyp_feldkonfig k
              on k.verein_id = p.verein_id and k.mitgliedtyp_id = mt.id
             and k.schluessel = p.feld)::int
  union all
  select 2, 'verwaist, bleibt liegen', 17,
         (select count(*) from public.mitgliedtyp_pflichtfelder p
           where not exists (select 1 from public.mitgliedtypen mt
                              where mt.verein_id = p.verein_id
                                and mt.name = p.mitgliedtyp))::int
  union all
  select 3, 'Zeilen in mitgliedtyp_feldkonfig', 77,
         (select count(*) from public.mitgliedtyp_feldkonfig)::int
  union all
  select 4, 'davon aus', 7,
         (select count(*) from public.mitgliedtyp_feldkonfig where modus = 'aus')::int
  union all
  select 5, 'Typen ohne Mitgliedschaft', 1,
         (select count(*) from public.mitgliedtypen
           where zaehlt_als_mitgliedschaft = false)::int
  union all
  select 6, 'Policies', 2,
         (select count(*) from pg_policies
           where schemaname = 'public' and tablename = 'mitgliedtyp_feldkonfig')::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;


-- Der Supporter im Ergebnis — fuenf Pflicht, sieben aus, sonst nichts.

select mt.name, k.modus, array_agg(k.schluessel order by k.schluessel) as schluessel
  from public.mitgliedtypen mt
  join public.mitgliedtyp_feldkonfig k on k.mitgliedtyp_id = mt.id
 where mt.zaehlt_als_mitgliedschaft = false
 group by mt.name, k.modus
 order by mt.name, k.modus;


-- Die 17, die liegenbleiben. Zum Nachlesen, nicht zum Handeln.

select p.mitgliedtyp, count(*) as zeilen,
       array_agg(p.feld order by p.feld) as felder
  from public.mitgliedtyp_pflichtfelder p
 where not exists (select 1 from public.mitgliedtypen mt
                    where mt.verein_id = p.verein_id and mt.name = p.mitgliedtyp)
 group by p.mitgliedtyp order by p.mitgliedtyp;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Gefahrlos: mitgliedtyp_pflichtfelder und rolle_pflichtfelder sind
-- unberuehrt, die App liest sie weiterhin. Es geht nur verloren, was nach
-- der Migration in der neuen Oberflaeche eingestellt wurde.
--
-- begin;
--   drop table if exists public.mitgliedtyp_feldkonfig;
--   alter table public.mitgliedtypen
--     drop constraint if exists mitgliedtypen_id_verein_key,
--     drop column     if exists zaehlt_als_mitgliedschaft;
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--
--   Strukturaenderung — Dump UND Typen nachziehen:
--     npx supabase db dump --linked -f supabase/schema.sql
--     npx supabase gen types typescript --linked > src/database.types.ts
--
--   Zaehlprobe gegen die alte Fassung von schema.sql:
--     CREATE TABLE     +1   (mitgliedtyp_feldkonfig)
--     CREATE POLICY    +2
--     CREATE INDEX     +0   (der UNIQUE-Schluessel bringt seinen Index mit)
--     ADD CONSTRAINT   +5   pkey, verein_key, typ_fkey, verein_id_fkey,
--                           mitgliedtypen_id_verein_key
--
--   NICHT +6: mitgliedtyp_feldkonfig_modus_check ist ein CHECK und steht im
--   Dump INLINE im CREATE TABLE, nicht als eigenes ADD CONSTRAINT. Wer die
--   Zaehlprobe fuer eine Tabelle mit CHECK macht, rechnet sonst eins zu viel.
--   (Nachgetragen am 19.08.2026 nach dem Dump — Zaehlprobe war +5.)
--
--   Beim Uebertragen in den SQL-Editor: `wc -c` dieser Datei gegen die
--   Zeichenzahl im Editor. Stimmen sie nicht, geht schon beim Einfuegen
--   etwas verloren.
--
-- WAS DANACH NOCH OFFEN IST
--   Schritt 3  Domain (domains/members/feldkonfig.ts) und die Seite in
--              Portalverwaltung -> Benutzer & Rollen.
--   Schritt 4  Die vier Codestellen abloesen; SUPPORTER_TYP entfaellt,
--              istMatrixLeer() entfaellt, rolle_pflichtfelder wird nicht
--              mehr gelesen.
--   Spaeter    mitgliedtyp_pflichtfelder und rolle_pflichtfelder fallen,
--              sobald Schritt 4 in Betrieb ist. Erst dann, nicht frueher.
-- ═══════════════════════════════════════════════════════════════════════════
