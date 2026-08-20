-- ═══════════════════════════════════════════════════════════════════════════
-- ARTEN OHNE MITGLIEDSCHAFT — Etappe 1
-- 20.08.2026 · Auftrag docs/auftrag_arten_austritt_loeschen.md
--
-- Rund 400 von 914 Personen haben keine Mitgliedschaft: 394 Elternteile,
-- 7 Supporter. Fuer sie gab es bisher EINEN Wert in der Feldkonfiguration
-- (`gilt_fuer = 'ohne_mitgliedschaft'`) und damit zwangslaeufig DENSELBEN
-- Feldsatz. Vom Elternteil will der Verein aber mehr wissen als vom Goenner.
--
-- Aus dem einen Wert wird eine pflegbare Liste. Es kommen weitere dazu:
-- Ehemalige, externe Trainer, Sponsoren als Person.
--
--
-- ⚠ ZWEI SORTEN, UND DAS IST DER KERN
--
--   gesetzt      Supporter, Ehemalige — die Verwaltung bestimmt sie.
--                Stehen in `personenart_pro_person`.
--   abgeleitet   Elternteil — ergibt sich aus einer Zeile in `eltern_kinder`.
--                Steht NIE in `personenart_pro_person`.
--
-- Ohne diese Trennung koennte jemand „Elternteil" von Hand vergeben, und die
-- Ableitung ueberschriebe es still — derselbe Fehler wie bei den von Hand
-- gesetzten Portalrollen, der seit dem 05.08.2026 als offener Punkt steht.
--
-- ⚠ ABGELEITET HEISST: ES KIPPT. Tritt das letzte Kind aus, ist die Person
-- kein Elternteil mehr, und ihr Feldsatz aendert sich mit. Das ist
-- beabsichtigt — sie IST dann keiner mehr. Wer das als Fehler meldet, hat
-- die Sorte verwechselt.
--
--
-- ⚠ KEINE SPALTE `herkunft`
--
-- Die Sorte steht in `ableitung`: NULL heisst gesetzt, sonst der Name der
-- Regel. Eine zweite Spalte `herkunft` waere dieselbe Aussage an einem
-- zweiten Ort und koennte veralten — dasselbe Muster wie
-- `hat_portal_zugang` gegen den Join (Etappe 6c) und wie
-- `api_verbindungen.active` gegen die Edge Function.
--
-- ⚠ Und die Regel heisst NICHT „Elternteil". Die Sicht unten schluesselt auf
-- `ableitung = 'eltern_kinder'`, nicht auf den Namen: ein Name als Schluessel
-- hat in `mitgliedtyp_pflichtfelder` siebzehn Zeilen verwaisen lassen, sobald
-- jemand einen Mitgliedtyp umbenannte. Der Verein darf „Elternteil" in
-- „Erziehungsberechtigte" umbenennen, ohne dass die Ableitung ausfaellt.
--
--
-- ⚠ EINE ART BESTIMMT DIE FELDKONFIGURATION — DIE MIT DER KLEINSTEN
--    `sort_order`. NICHT DIE VEREINIGUNG ALLER ARTEN.
--
-- Eine Person kann mehreres sein: ein Ehemaliger mit Kind im Verein ist auch
-- Elternteil. Verlockend waere „Pflicht, wenn irgendeine Art es verlangt".
-- Genau das war `rolle_pflichtfelder`, und die ist am 19.08.2026 gestrichen
-- worden, weil sie NUR ADDIEREN, NIE WEGNEHMEN konnte: „Gibt es nicht" liesse
-- sich damit nie durchsetzen. Eine Art gewinnt — wie beim Mitgliedtyp.
--
-- Der Rang ist `sort_order`, weil er im Vorbild `mitgliedtypen` schon
-- existiert, in der Portalverwaltung sichtbar ist und dort geaendert werden
-- kann. Kein zweites Konzept.
--
--
-- ⚠ EIN FENSTER ZWISCHEN MIGRATION UND DEPLOYMENT
--
-- `gilt_fuer` faellt in diesem Skript. `fetchFeldkonfig()` selektiert die
-- Spalte noch, bis der zugehoerige Code deployt ist — PostgREST antwortet
-- dann mit 400/42703, die Funktion liest `error` und gibt eine leere Liste
-- zurueck. In diesem Fenster ist die Feldkonfiguration WIRKUNGSLOS (alles
-- freiwillig, alles sichtbar), nicht falsch. Deshalb: Migration und Push in
-- derselben Sitzung, Reihenfolge Migration → gen:types → Code → Push.
--
--
-- ⚠ DIE SICHT IST SO BREIT WIE `eltern_kinder` — SIE VERURSACHT DAS NICHT
--
-- Probe vom 20.08.2026 als `authenticated` mit dem Testkonto eines
-- Elternteils: die Sicht liefert die eigene Art korrekt (`security_invoker`
-- greift), aber auch die Arten aller 402 Personen des Vereins. Grund ist die
-- BESTEHENDE Policy `eltern_kinder_verein` (`verein_id = get_my_verein_id()`),
-- die schon heute jedem eingeloggten Benutzer alle Eltern-Kind-Verknuepfungen
-- zeigt. Der abgeleitete Zweig der Sicht kann nicht enger sein als seine
-- Quelle.
--
-- Preisgegeben werden `person_id` und der Name der Art, keine Personendaten.
-- Das ist dieselbe Breite wie bisher, nur sichtbarer. Enger zu stellen hiesse,
-- `eltern_kinder` anzufassen — das gehoert zu
-- `docs/auftrag_rls_gruppenrechte.md` und NICHT in diese Etappe. Als offener
-- Punkt eingetragen, damit niemand die Sicht fuer geprueft-eng haelt.
--
--
-- ZAEHLPROBE — Erwartungswerte aus `supabase/schema.sql` abgeleitet, nicht
-- aus diesem Skript:
--
--   CREATE TABLE              89 → 91    (+2)
--   CREATE POLICY            170 → 174   (+4)
--   CREATE INDEX              57 → 60    (+3)
--   ADD CONSTRAINT           300 → 310   (+10)
--   CREATE OR REPLACE VIEW     1 → 2     (+1)
--   CONSTRAINT … CHECK        12 → 12    (±0)
--
-- ⚠ Die letzte Zeile sieht aus, als waere nichts passiert, und ist trotzdem
-- richtig: pg_dump schreibt CHECKs INLINE ins `CREATE TABLE`. Hier fallen
-- zwei (`gilt_fuer_check`, `achse_check`) und es kommen zwei dazu (der neue
-- Achsen-CHECK und `personenarten_ableitung_check`). Wer nur die Summe
-- vergleicht, sieht die Bewegung nicht.
--
-- ⚠ EINE ERWARTUNG WAR FALSCH, und das gehoert hierhin statt weggewischt:
-- der Probelauf ergab 395 abgeleitete Zeilen, erwartet hatte ich 394. Die
-- Differenz ist die EINE Person, die Mitglied UND Elternteil ist — 394 sind
-- die Elternteile OHNE Mitgliedschaft. Sie ist beides, also gehoert ihr die
-- abgeleitete Art auch; welche Konfiguration gilt, entscheidet der Code und
-- nicht diese Sicht. Die Zaehlprobe unten misst deshalb gegen
-- `count(distinct person_id) from eltern_kinder` statt gegen eine Zahl aus
-- dem Kopf.
--
-- ⚠ Die +10 bei ADD CONSTRAINT im Einzelnen:
--   personenarten            PK, UNIQUE(verein_id,name), UNIQUE(id,verein_id),
--                            FK verein_id                                  = 4
--   personenart_pro_person   PK, UNIQUE(verein_id,person_id,art_id),
--                            FK verein_id, FK person_id, FK (art_id,verein_id) = 5
--   mitgliedtyp_feldkonfig   −1 altes UNIQUE, +1 neues UNIQUE, +1 FK art_id = 1
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_verein   uuid;
  v_eltern   uuid;
  v_supp     uuid;
  v_anz      int;
  v_gesamt   int := 0;
begin

  -- ─── A · Die Liste ──────────────────────────────────────────────────────
  create table if not exists public.personenarten (
    id         uuid primary key default gen_random_uuid(),
    verein_id  uuid not null references public.vereine(id),
    name       text not null,
    sort_order integer not null default 0,
    aktiv      boolean not null default true,
    /* NULL = gesetzt. Sonst der Name der Ableitungsregel — NICHT der Name der
       Art: ein Name als Schluessel verwaist beim Umbenennen. */
    ableitung  text,
    created_at timestamptz default now(),
    constraint personenarten_ableitung_check
      check (ableitung is null or ableitung in ('eltern_kinder'))
  );

  -- Schluessel auf Vereinsdaten immer MIT verein_id (ARCHITECTURE.md):
  -- sonst nimmt der erste Verein dem zweiten den Namen weg.
  alter table public.personenarten
    add constraint personenarten_verein_name_key unique (verein_id, name);
  -- Ziel des zusammengesetzten Fremdschluessels weiter unten.
  alter table public.personenarten
    add constraint personenarten_id_verein_key unique (id, verein_id);

  -- ⚠ RLS AN, IMMER. Eine neue Tabelle in `public` ist ueber PostgREST fuer
  --   jeden eingeloggten Benutzer lesbar, bis eine Policy es einschraenkt.
  alter table public.personenarten enable row level security;

  create policy personenarten_select on public.personenarten
    for select using (verein_id = get_my_verein_id());
  /* WITH CHECK zusaetzlich zu USING — `mitgliedtypen_write` hat nur USING und
     erlaubt damit einem Admin, eine Zeile mit FREMDER verein_id anzulegen.
     Hier nicht wiederholen. */
  create policy personenarten_write on public.personenarten
    for all using (verein_id = get_my_verein_id() and is_admin())
            with check (verein_id = get_my_verein_id() and is_admin());


  -- ─── B · Wer welche gesetzte Art hat ────────────────────────────────────
  create table if not exists public.personenart_pro_person (
    id         uuid primary key default gen_random_uuid(),
    verein_id  uuid not null references public.vereine(id),
    person_id  uuid not null references public.personen(id) on delete cascade,
    art_id     uuid not null,
    created_at timestamptz default now()
  );

  alter table public.personenart_pro_person
    add constraint personenart_pro_person_art_fkey
    foreign key (art_id, verein_id) references public.personenarten(id, verein_id)
    on delete cascade;

  alter table public.personenart_pro_person
    add constraint personenart_pro_person_key unique (verein_id, person_id, art_id);

  /* Nachschlagen geschieht nach Person; der Unique-Schluessel oben beginnt mit
     verein_id und deckt das nicht ab. Und ein Fremdschluessel ohne Index macht
     jedes Loeschen der Zielzeile langsam. */
  create index if not exists personenart_pro_person_person_idx
    on public.personenart_pro_person (person_id);
  create index if not exists personenart_pro_person_art_idx
    on public.personenart_pro_person (art_id);

  alter table public.personenart_pro_person enable row level security;

  create policy personenart_pro_person_select on public.personenart_pro_person
    for select using (verein_id = get_my_verein_id());
  create policy personenart_pro_person_write on public.personenart_pro_person
    for all using (verein_id = get_my_verein_id() and is_admin())
            with check (verein_id = get_my_verein_id() and is_admin());


  -- ─── C · Die Arten anlegen, pro Verein ──────────────────────────────────
  for v_verein in select id from public.vereine loop
    insert into public.personenarten (verein_id, name, sort_order, ableitung)
    values (v_verein, 'Elternteil', 10, 'eltern_kinder')
    on conflict (verein_id, name) do nothing;

    insert into public.personenarten (verein_id, name, sort_order, ableitung)
    values (v_verein, 'Supporter', 20, null)
    on conflict (verein_id, name) do nothing;
  end loop;


  -- ─── D · Die Supporter zuweisen ─────────────────────────────────────────
  /* Wer heute weder Mitgliedschaft noch Kind hat, IST ein Supporter — genau
     die zwei Ausschluesse aus dem Rueckbau vom 20.08.2026. Ohne diese
     Zuweisung fielen die sieben auf „keine Art" und verloeren ihre
     Konfiguration. */
  insert into public.personenart_pro_person (verein_id, person_id, art_id)
  select p.verein_id, p.id, a.id
    from public.personen p
    join public.personenarten a
      on a.verein_id = p.verein_id and a.name = 'Supporter'
   where not exists (select 1 from public.mitglieder m    where m.person_id = p.id)
     and not exists (select 1 from public.eltern_kinder k where k.person_id = p.id)
  on conflict (verein_id, person_id, art_id) do nothing;

  get diagnostics v_anz = row_count;
  raise notice 'D: % Supporter zugewiesen.', v_anz;


  -- ─── E · Die Sicht: gesetzte und abgeleitete Arten in einer Quelle ──────
  /* ⚠ `security_invoker = true`. Ohne das umgeht eine Sicht die RLS
     VOLLSTAENDIG und zeigte jedem alle Personen jedes Vereins.
     `portal_zugang` ist die eine begruendete Ausnahme im Projekt und soll
     eine bleiben (ARCHITECTURE.md). */
  create or replace view public.personenarten_effektiv
    with (security_invoker = true) as
    select z.person_id, a.id as art_id, a.verein_id,
           a.name, a.sort_order, a.ableitung
      from public.personenart_pro_person z
      join public.personenarten a on a.id = z.art_id
     where a.aktiv
    union
    /* Abgeleitet ueber die REGEL, nicht ueber den Namen. `union` statt
       `union all`: ein Elternteil mit zwei Kindern hat zwei Zeilen in
       `eltern_kinder` und soll trotzdem einmal als Elternteil erscheinen. */
    select k.person_id, a.id, a.verein_id,
           a.name, a.sort_order, a.ableitung
      from public.eltern_kinder k
      join public.personenarten a
        on a.verein_id = k.verein_id and a.ableitung = 'eltern_kinder'
     where a.aktiv;

  grant select on public.personenarten_effektiv to authenticated;


  -- ─── F · Die Feldkonfiguration auf die Arten umstellen ──────────────────
  alter table public.mitgliedtyp_feldkonfig
    add column if not exists art_id uuid;

  alter table public.mitgliedtyp_feldkonfig
    add constraint mitgliedtyp_feldkonfig_art_fkey
    foreign key (art_id, verein_id) references public.personenarten(id, verein_id)
    on delete cascade;

  create index if not exists mitgliedtyp_feldkonfig_art_idx
    on public.mitgliedtyp_feldkonfig (art_id);

  /* ⚠ Die alten CHECKs ZUERST weg, dann umhaengen. `achse_check` verlangt
     „gilt_fuer = mitgliedtyp UND mitgliedtyp_id gesetzt" oder
     „gilt_fuer = ohne_mitgliedschaft UND mitgliedtyp_id NULL" — eine neue
     Zeile mit `art_id` und ohne beides faellt durch. Beim Probelauf am
     20.08.2026 genau daran gescheitert: die Zeile fuer den Supporter
     verletzte einen CHECK, den dieselbe Migration zwanzig Zeilen spaeter
     abbaut. Die Reihenfolge ist hier kein Geschmack. */
  alter table public.mitgliedtyp_feldkonfig
    drop constraint if exists mitgliedtyp_feldkonfig_achse_check;
  alter table public.mitgliedtyp_feldkonfig
    drop constraint if exists mitgliedtyp_feldkonfig_gilt_fuer_check;

  /* ⚠ Und der alte Unique-Schluessel ebenso, aus demselben Grund. Er lautet
     `(verein_id, mitgliedtyp_id, schluessel)` mit NULLS NOT DISTINCT und kennt
     die Achse nicht. „Elternteil.ahv_nr" und „Supporter.ahv_nr" haben beide
     `mitgliedtyp_id IS NULL` und kollidierten — das war im Plan als Grund
     genannt, den Schluessel zu erneuern, und trifft die Migration selbst.
     Innerhalb dieser Transaktion ist die Tabelle kurz ohne Schluessel; der
     neue kommt am Ende des Blocks. */
  alter table public.mitgliedtyp_feldkonfig
    drop constraint if exists mitgliedtyp_feldkonfig_verein_key;

  /* Die drei Seed-Zeilen bekommen ein Ziel.

       telefon Pflicht → Elternteil    der Verein muss ein Elternteil
       email   Pflicht → Elternteil    erreichen: Aufgebot, Notfall. Die
                                       E-Mail ist zugleich der Login-Name.
       ahv_nr  aus     → beide         ohne Spielbetrieb kein Zweck.

     Beim Supporter KEINE Pflichtfelder: ein Goenner, den man nicht per Mail
     erreicht, ist kein Problem des Vereins, und ein Pflichtfeld, das niemand
     erzwingen kann, blockiert nur die Maske.

     Nicht loeschen — das lockerte fuer 394 Elternteile die Anforderung, ohne
     dass jemand darum gebeten hat. */
  update public.mitgliedtyp_feldkonfig f
     set art_id = a.id
    from public.personenarten a
   where f.gilt_fuer = 'ohne_mitgliedschaft'
     and a.verein_id = f.verein_id and a.name = 'Elternteil';

  get diagnostics v_anz = row_count;
  raise notice 'F: % Zeilen auf Elternteil umgehaengt.', v_anz;

  -- `ahv_nr = aus` gilt fuer den Supporter genauso — als eigene Zeile.
  insert into public.mitgliedtyp_feldkonfig (verein_id, art_id, schluessel, modus)
  select f.verein_id, a.id, f.schluessel, f.modus
    from public.mitgliedtyp_feldkonfig f
    join public.personenarten e on e.id = f.art_id and e.name = 'Elternteil'
    join public.personenarten a on a.verein_id = f.verein_id and a.name = 'Supporter'
   where f.schluessel = 'ahv_nr';

  get diagnostics v_anz = row_count;
  raise notice 'F: % Zeilen fuer Supporter ergaenzt.', v_anz;

  -- Rest der alten Achse abbauen (CHECKs und Schluessel sind oben gefallen).
  alter table public.mitgliedtyp_feldkonfig
    drop column if exists gilt_fuer;

  /* Genau eines von beiden. Die Achse steht damit in den Daten selbst und
     nicht in einer dritten Spalte, die dazu passen muesste. */
  alter table public.mitgliedtyp_feldkonfig
    add constraint mitgliedtyp_feldkonfig_achse_check
    check (num_nonnulls(mitgliedtyp_id, art_id) = 1);

  /* ⚠ `NULLS NOT DISTINCT` und BEIDE Achsenspalten im Schluessel. Ohne
     `art_id` haetten „Elternteil.telefon" und „Supporter.telefon" beide
     `mitgliedtyp_id IS NULL` und kollidierten; ohne `NULLS NOT DISTINCT`
     entstuende bei jedem Speichern eine weitere Zeile statt einer
     Aktualisierung, und zwar ohne Fehlermeldung.
     ⚠ Die fuenf `onConflict`-Angaben in `feldkonfigService.ts` muessen mit. */
  alter table public.mitgliedtyp_feldkonfig
    add constraint mitgliedtyp_feldkonfig_verein_key
    unique nulls not distinct (verein_id, mitgliedtyp_id, art_id, schluessel);


  -- ─── G · Zaehlprobe ─────────────────────────────────────────────────────
  select count(*) into v_anz from public.personenarten;
  raise notice 'G1: % Arten (erwartet: 2 je Verein).', v_anz;

  select count(*) into v_anz from public.personenart_pro_person;
  raise notice 'G2: % Zuweisungen (erwartet: 7).', v_anz;

  select count(*) into v_anz from public.mitgliedtyp_feldkonfig where art_id is not null;
  raise notice 'G3: % Konfigzeilen auf einer Art (erwartet: 4).', v_anz;

  select count(*) into v_anz from public.mitgliedtyp_feldkonfig where mitgliedtyp_id is not null;
  raise notice 'G4: % Konfigzeilen auf einem Mitgliedtyp (erwartet: 62 — unveraendert).', v_anz;

  /* ⚠ Gegen einen GEMESSENEN Wert, nicht gegen eine Zahl im Kommentar. Beim
     Probelauf am 20.08.2026 stand hier 394 als Erwartung und 395 kam heraus —
     die Differenz ist die EINE Person, die Mitglied UND Elternteil ist. Sie
     ist beides, also gehoert ihr die abgeleitete Art auch. Dass eine
     Mitgliedschaft fuer die Feldkonfiguration gewinnt, entscheidet der Code
     (MemberDetail: `mitgliedId == null ? ... : fuerMitgliedtyp(...)`), nicht
     diese Sicht. Eine Zahl aus dem Kopf haette hier einen Fehler behauptet,
     wo keiner ist. */
  select count(distinct person_id) into v_gesamt from public.eltern_kinder;
  select count(*) into v_anz from public.personenarten_effektiv
   where ableitung = 'eltern_kinder';
  if v_anz <> v_gesamt then
    raise exception 'ABBRUCH: % abgeleitete Zeilen, aber % Personen mit Kind. Je Person eine, nicht je Kind.', v_anz, v_gesamt;
  end if;
  raise notice 'G5: % abgeleitete Zeilen = % Personen mit Kind. OK', v_anz, v_gesamt;

  select count(distinct z.person_id) into v_gesamt from public.personenart_pro_person z;
  select count(distinct person_id) into v_anz from public.personenarten_effektiv;
  raise notice 'G6: % Personen mit mindestens einer Art (% gesetzt, Rest abgeleitet).', v_anz, v_gesamt;

  /* ⚠ Die harte Probe: keine Person darf eine ABGELEITETE Art als Zuweisung
     tragen. Faende sich eine, waere die Trennung schon beim Anlegen verletzt. */
  select count(*) into v_anz
    from public.personenart_pro_person z
    join public.personenarten a on a.id = z.art_id
   where a.ableitung is not null;
  if v_anz > 0 then
    raise exception 'ABBRUCH: % gesetzte Zuweisungen auf eine abgeleitete Art.', v_anz;
  end if;
  raise notice 'G7: keine gesetzte Zuweisung auf eine abgeleitete Art. OK';

end $mig$;
