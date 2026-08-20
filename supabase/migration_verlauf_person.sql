-- ═══════════════════════════════════════════════════════════════════════════
-- VERLAUF UND NOTIZEN GEHOEREN DER PERSON
-- 21.08.2026 · Auftrag docs/auftrag_arten_austritt_loeschen.md, Punkt 1
--
-- `mitglieder_notizen`, `mitglieder_aenderungen` und `mitglieder_aktivitaeten`
-- haengen mit `mitglied_id bigint NOT NULL` und `ON DELETE CASCADE` an der
-- MITGLIEDSCHAFT. Zwei Folgen, beide falsch:
--
--   1. NOTIZEN GALTEN ALS `nur_mitgliedschaft`. Ein Verein will ueber einen
--      Supporter oder ein Elternteil sehr wohl etwas notieren koennen. Die
--      Einordnung kam aus der NOT-NULL-Spalte — eine technische Grenze, als
--      fachliche Regel behandelt.
--
--   2. DER VERLAUF STIRBT MIT DER MITGLIEDSCHAFT. Nicht beim Austritt:
--      `beendeMitgliedschaft()` setzt `aktiv = false` und loescht nichts.
--      Aber „Mitgliedschaft loeschen" (`deleteMitglied`) und die
--      Sammelaktion nehmen die gesamte Aenderungshistorie mit — und Etappe 3
--      baut mit „Person loeschen (DSGVO)" den dritten Weg dorthin.
--
-- Danach: der Verlauf gehoert der PERSON und ueberlebt Austritt und Rueckkehr.
-- `mitglied_id` bleibt als KONTEXT („in welcher Mitgliedschaft ist das
-- passiert") und faellt auf `SET NULL` — beim Loeschen der Mitgliedschaft
-- verliert der Eintrag seinen Kontext, nicht sich selbst.
--
--
-- ⚠ `person_id` IST NOT NULL, UND DAS IST ABSICHT
--
-- Ein vergesslicher Schreibpfad scheitert damit LAUT (23502) statt still eine
-- Zeile ohne Bezug anzulegen. Die Alternative — ein Trigger, der `person_id`
-- aus `mitglied_id` nachfuellt — waere robuster und zugleich unsichtbar: man
-- saehe im Code nicht mehr, wer die Wahrheit setzt. Dieses Projekt hat mehr
-- Zeit an stillen Ausfaellen verloren als an lauten.
--
--
-- ⚠ DER DOPPELTE FREMDSCHLUESSEL AUF `autor_id`
--
--   fk_notizen_autor                  autor_id -> benutzer(id) ON DELETE SET NULL
--   mitglieder_notizen_autor_id_fkey  autor_id -> benutzer(id)          (NO ACTION)
--
-- Weg muss der ZWEITE — nicht weil er juenger ist, sondern weil DIE STRENGERE
-- REGEL IMMER GEWINNT: solange er steht, ist `SET NULL` wirkungslos, und ein
-- `delete` auf `benutzer` scheitert mit 23503, obwohl `fk_notizen_autor` es
-- ausdruecklich vorgesehen hat. Die Absicht ist eindeutig die richtige — wird
-- ein Konto geloescht, soll die Notiz bleiben und nur ihren Autor verlieren.
-- Der Name sagt es mit: `fk_notizen_autor` ist von Hand benannt, der andere
-- ist der automatisch vergebene Name aus dem `references` in der
-- Spaltendefinition.
--
--
-- ⚠ REIHENFOLGE — KORRIGIERT GEGENUEBER DEM PLAN
--
-- Der Plan sagte „Edge Function zuerst deployen, dann migrieren". Das ist
-- FALSCH und faellt beim Bauen auf: die neue Function schreibt `person_id`,
-- und solange die Spalte fehlt, antwortet PostgREST mit 400/PGRST204. Sie
-- wuerde also genau das verlieren, was sie retten soll.
--
-- Richtig ist:
--
--   1. Diese Migration        (person_id dazu, backfill, NOT NULL)
--   2. npm run gen:types
--   3. Portal-Code UND Edge Function zusammen deployen
--
-- ⚠ Zwischen 1 und 3 bleibt ein Fenster: die ALTE Function schreibt ohne
-- `person_id` und scheitert am NOT NULL. Deshalb liest sie den Fehler seit
-- dieser Etappe und meldet ihn als Konflikt, statt ihn zu verschlucken —
-- ein verlorener Verlaufseintrag faellt dann auf. Der Spielerpass selbst
-- wird davor gespeichert und geht nicht verloren. Der Sync laeuft
-- stuendlich; wer zuegig deployt, trifft das Fenster nicht.
--
--
-- ZAEHLPROBE — Erwartungswerte aus `supabase/schema.sql` abgeleitet:
--
--   CREATE TABLE              91 -> 91    (+-0)
--   CREATE POLICY            174 -> 174   (+-0)
--   CREATE INDEX              60 -> 63    (+3, je Tabelle einer auf person_id)
--   ADD CONSTRAINT           310 -> 312   (+2)
--   CONSTRAINT ... CHECK      12 -> 12    (+-0)
--
-- ⚠ Die +2 bei ADD CONSTRAINT sind eine Rechnung mit vier Posten:
--     +3  FK person_id auf den drei Tabellen
--     -1  mitglieder_notizen_autor_id_fkey faellt (der doppelte)
--     +-0 die drei mitglied_id-FKs werden ERSETZT (drop + create) —
--         gleiche Anzahl, andere Regel
--   Wer nur die Summe vergleicht, sieht die Bewegung nicht.
--
-- Bestand vor dem Lauf: 3 Notizen, 39 Aenderungen, 133 Aktivitaeten.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz     int;
  v_waisen  int;
begin

  -- ─── A · Vorpruefung: gibt es Zeilen ohne Person? ───────────────────────
  /* Eine Mitgliedschaft ohne `person_id` waere ein Datenloch aus der Zeit vor
     Etappe 2b. Der Backfill koennte sie nicht fuellen, und `NOT NULL` schluege
     mitten im Block fehl — lieber vorher wissen, woran. */
  select count(*) into v_waisen
    from (
      /* `select 1` statt `id`: `mitglieder_notizen.id` ist integer, die
         beiden anderen fuehren uuid — die Union brach mit „UNION types
         integer and uuid cannot be matched". Gezaehlt werden Zeilen, nicht
         Schluessel. */
      select 1 from public.mitglieder_notizen n
        join public.mitglieder m on m.id = n.mitglied_id where m.person_id is null
      union all
      select 1 from public.mitglieder_aenderungen a
        join public.mitglieder m on m.id = a.mitglied_id where m.person_id is null
      union all
      select 1 from public.mitglieder_aktivitaeten k
        join public.mitglieder m on m.id = k.mitglied_id where m.person_id is null
    ) x;
  if v_waisen > 0 then
    raise exception 'ABBRUCH: % Zeilen haengen an einer Mitgliedschaft ohne person_id. Erst etappe2b_backfill_person_id.sql.', v_waisen;
  end if;
  raise notice 'A: keine Zeile ohne Person. OK';


  -- ─── B · Spalte, Backfill, NOT NULL ─────────────────────────────────────
  alter table public.mitglieder_notizen      add column if not exists person_id uuid;
  alter table public.mitglieder_aenderungen  add column if not exists person_id uuid;
  alter table public.mitglieder_aktivitaeten add column if not exists person_id uuid;

  update public.mitglieder_notizen n
     set person_id = m.person_id
    from public.mitglieder m where m.id = n.mitglied_id and n.person_id is null;
  get diagnostics v_anz = row_count;
  raise notice 'B1: % Notizen umgehaengt.', v_anz;

  update public.mitglieder_aenderungen a
     set person_id = m.person_id
    from public.mitglieder m where m.id = a.mitglied_id and a.person_id is null;
  get diagnostics v_anz = row_count;
  raise notice 'B2: % Aenderungen umgehaengt.', v_anz;

  update public.mitglieder_aktivitaeten k
     set person_id = m.person_id
    from public.mitglieder m where m.id = k.mitglied_id and k.person_id is null;
  get diagnostics v_anz = row_count;
  raise notice 'B3: % Aktivitaeten umgehaengt.', v_anz;

  alter table public.mitglieder_notizen      alter column person_id set not null;
  alter table public.mitglieder_aenderungen  alter column person_id set not null;
  alter table public.mitglieder_aktivitaeten alter column person_id set not null;


  -- ─── C · Fremdschluessel auf die Person ─────────────────────────────────
  /* ON DELETE CASCADE: faellt die Person, faellt ihre Geschichte mit. Das ist
     der DSGVO-Fall aus Etappe 3 und dort ausdruecklich so gewollt. */
  alter table public.mitglieder_notizen
    add constraint mitglieder_notizen_person_fkey
    foreign key (person_id) references public.personen(id) on delete cascade;
  alter table public.mitglieder_aenderungen
    add constraint mitglieder_aenderungen_person_fkey
    foreign key (person_id) references public.personen(id) on delete cascade;
  alter table public.mitglieder_aktivitaeten
    add constraint mitglieder_aktivitaeten_person_fkey
    foreign key (person_id) references public.personen(id) on delete cascade;

  create index if not exists mitglieder_notizen_person_idx
    on public.mitglieder_notizen (person_id);
  create index if not exists mitglieder_aenderungen_person_idx
    on public.mitglieder_aenderungen (person_id);
  create index if not exists mitglieder_aktivitaeten_person_idx
    on public.mitglieder_aktivitaeten (person_id);


  -- ─── D · `mitglied_id` wird Kontext ─────────────────────────────────────
  /* Nullable UND SET NULL statt CASCADE. Wer die Mitgliedschaft loescht,
     loescht den Zusammenhang — nicht die Geschichte. */
  alter table public.mitglieder_notizen      alter column mitglied_id drop not null;
  alter table public.mitglieder_aenderungen  alter column mitglied_id drop not null;
  alter table public.mitglieder_aktivitaeten alter column mitglied_id drop not null;

  alter table public.mitglieder_notizen
    drop constraint if exists mitglieder_notizen_mitglied_id_fkey;
  alter table public.mitglieder_notizen
    add constraint mitglieder_notizen_mitglied_id_fkey
    foreign key (mitglied_id) references public.mitglieder(id) on delete set null;

  alter table public.mitglieder_aenderungen
    drop constraint if exists mitglieder_aenderungen_mitglied_id_fkey;
  alter table public.mitglieder_aenderungen
    add constraint mitglieder_aenderungen_mitglied_id_fkey
    foreign key (mitglied_id) references public.mitglieder(id) on delete set null;

  alter table public.mitglieder_aktivitaeten
    drop constraint if exists mitglieder_aktivitaeten_mitglied_id_fkey;
  alter table public.mitglieder_aktivitaeten
    add constraint mitglieder_aktivitaeten_mitglied_id_fkey
    foreign key (mitglied_id) references public.mitglieder(id) on delete set null;


  -- ─── E · Der doppelte Fremdschluessel auf `autor_id` ────────────────────
  /* Die strengere Regel gewinnt: solange der NO-ACTION-Schluessel steht, ist
     das SET NULL des anderen wirkungslos. Siehe Kopf. */
  alter table public.mitglieder_notizen
    drop constraint if exists mitglieder_notizen_autor_id_fkey;
  raise notice 'E: doppelter Fremdschluessel auf autor_id entfernt.';


  -- ─── F · Zaehlprobe ─────────────────────────────────────────────────────
  select count(*) into v_anz from public.mitglieder_notizen where person_id is null;
  if v_anz > 0 then raise exception 'ABBRUCH: % Notizen ohne person_id.', v_anz; end if;

  select count(*) into v_anz from public.mitglieder_aenderungen where person_id is null;
  if v_anz > 0 then raise exception 'ABBRUCH: % Aenderungen ohne person_id.', v_anz; end if;

  select count(*) into v_anz from public.mitglieder_aktivitaeten where person_id is null;
  if v_anz > 0 then raise exception 'ABBRUCH: % Aktivitaeten ohne person_id.', v_anz; end if;
  raise notice 'F1: keine Zeile ohne person_id. OK';

  /* ⚠ Die harte Probe: person_id muss zur Mitgliedschaft PASSEN, solange
     mitglied_id noch gesetzt ist. Ein Backfill, der die falsche Person
     eintraegt, saehe sonst genauso aus wie ein richtiger. */
  select count(*) into v_anz
    from public.mitglieder_aenderungen a
    join public.mitglieder m on m.id = a.mitglied_id
   where a.person_id <> m.person_id;
  if v_anz > 0 then
    raise exception 'ABBRUCH: % Aenderungen zeigen auf eine andere Person als ihre Mitgliedschaft.', v_anz;
  end if;
  raise notice 'F2: person_id stimmt ueberall mit der Mitgliedschaft ueberein. OK';

  select count(*) into v_anz from pg_constraint
   where conrelid = 'public.mitglieder_notizen'::regclass and contype = 'f';
  raise notice 'F3: % Fremdschluessel auf mitglieder_notizen (erwartet 4: autor, mitglied, person, verein).', v_anz;

end $mig$;
