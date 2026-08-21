-- ═══════════════════════════════════════════════════════════════════════════
-- ETAPPE 2 · AUSTRITT
-- 22.08.2026
--
-- WOZU
--   Statuten Artikel 8: der Austritt ist ein ZEITPUNKT. Was danach gilt, ist
--   eine eigene Frage — und die Antwort stand bisher als Zeichenkette im
--   Code (AustrittsZiel = "supporter"). Sie zieht in die Datenbank, damit
--   der Verein sie einstellen kann.
--
-- ⚠ DER EIGENTLICHE DEFEKT, DEN DAS BEHEBT: „Supporter" beim Austritt hat
--   bisher NIEMANDEN zum Supporter gemacht. Drei Stellen beantworten die
--   Frage, und sie sagten nach einem Austritt Verschiedenes:
--
--     fetchSupporter()          nein — die beendete Mitgliedschaftszeile
--                               bleibt stehen und schliesst aus
--     personenarten_effektiv    nein — die Zeile schrieb NIEMAND. Kein
--                               Schreiber im ganzen Quelltext; die sieben
--                               vorhandenen stammen aus dem Seed
--     benutzer.role             ja
--
--   Dasselbe Muster wie hat_portal_zugang und api_verbindungen.active:
--   mehrere Orte behaupten dieselbe Sache, einer veraltet, und es schlaegt
--   nichts fehl. Ab Schritt 3 des Umbaus schreibt der Austritt die ART, und
--   die drei sagen dasselbe.
--
-- WAS DIESE MIGRATION TUT
--   A  personenarten.standard_rolle   welche Portalrolle die Art mitbringt
--   B  vereine.austritt_art_id        wozu eine Person beim Austritt wird
--
-- ⚠ WARUM standard_rolle EINEN FREMDSCHLUESSEL BEKOMMT und
--   mitgliedtypen.standard_rolle keinen hat: weil das Fehlen dort ein
--   belegter Defekt ist. Am 05.08.2026 standen zwei Zeilen mit
--   rolle = 'Spieler' (grosses S) in mitglieder — ein Wert, den
--   portal_rollen nicht kennt und mit dem weder getPermissions noch
--   NAV_BY_ROLE etwas anfangen. portal_rollen hat
--   UNIQUE (verein_id, name), der Schluessel ist also zu haben. Hier wird
--   er gesetzt; mitgliedtypen nachzuziehen ist ein eigener, kleiner
--   Auftrag und steht als offener Punkt.
--
-- ⚠ „NUR GESETZTE ARTEN" STEHT NICHT ALS CHECK IN DER DATENBANK.
--   personenarten.ableitung IS NULL bedeutet „gesetzt"; eine abgeleitete
--   Art als Austrittsziel waere eine Zusage, die die Ableitung im naechsten
--   Moment ueberschreibt. Ein CHECK koennte das nicht ausdruecken — er darf
--   nicht in eine andere Tabelle sehen. Ein Trigger koennte es, waere aber
--   eine dritte Stelle mit Rechtelogik fuer eine Auswahl, die genau eine
--   Oberflaeche hat. Die Pruefung steht deshalb in der Portalverwaltung,
--   und dieser Absatz sagt, warum sie dort steht und nicht hier.
--
-- ZAEHLPROBE — Ausgangswerte aus supabase/schema.sql:
--
--   CREATE TABLE                     91 -> 91   (+-0)
--   CREATE POLICY                   174 -> 174  (+-0)
--   CREATE (UNIQUE )?INDEX           65 -> 65   (+-0)
--   ADD CONSTRAINT                  310 -> 312  (+2)
--
-- ⚠ Der Dump ist EINE Migration im Rueckstand (wache_zuletzt vom
--   21.08.2026 fehlt darin). Das bewegt keinen der vier Zaehler — eine
--   Spalte ohne Constraint, Index und Default kommt in keinem davon vor —,
--   ist aber beim Nachziehen zu wissen. Nach dieser Migration gehoeren Dump
--   UND npm run gen:types nachgezogen; dann stimmt beides wieder.
--
--   Die +2 sind die beiden Fremdschluessel (vereine -> personenarten,
--   personenarten -> portal_rollen). Die Spalten selbst zaehlen nirgends
--   mit; geprueft werden sie unten ueber information_schema.columns.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz    int;
  v_mit    int;
  v_ohne   int;
begin

  -- ─── A · Welche Portalrolle eine Art mitbringt ──────────────────────────
  alter table public.personenarten
    add column if not exists standard_rolle text;

  comment on column public.personenarten.standard_rolle is
    'Portalrolle, die diese Art mitbringt. Vorbild mitgliedtypen.standard_rolle — nur mit Fremdschluessel, weil dessen Fehlen dort am 05.08.2026 zwei Zeilen mit einer unbekannten Rolle zugelassen hat.';

  /* Vorbelegen, BEVOR der Fremdschluessel greift: eine Zeile mit einem Wert,
     den portal_rollen nicht kennt, liesse das ALTER scheitern. */
  update public.personenarten a set standard_rolle = 'supporter'
   where a.ableitung is null and lower(a.name) = 'supporter' and a.standard_rolle is null;

  update public.personenarten a set standard_rolle = 'eltern'
   where a.ableitung = 'eltern_kinder' and a.standard_rolle is null;

  /* ⚠ Erst pruefen, dann verknuepfen. Bricht das ALTER an einer Zeile, nennt
     die Meldung von Postgres sie nicht. Diese Abfrage nennt sie. */
  select count(*) into v_anz
    from public.personenarten a
    left join public.portal_rollen r
      on r.verein_id = a.verein_id and r.name = a.standard_rolle
   where a.standard_rolle is not null and r.name is null;
  if v_anz > 0 then
    raise exception
      'ABBRUCH: % Art(en) tragen eine Rolle, die portal_rollen nicht kennt. Zum Nachsehen: select a.name, a.standard_rolle from public.personenarten a left join public.portal_rollen r on r.verein_id=a.verein_id and r.name=a.standard_rolle where a.standard_rolle is not null and r.name is null;',
      v_anz;
  end if;

  alter table public.personenarten
    drop constraint if exists personenarten_standard_rolle_fkey;
  alter table public.personenarten
    add constraint personenarten_standard_rolle_fkey
    foreign key (verein_id, standard_rolle)
    references public.portal_rollen (verein_id, name)
    on update cascade on delete set null;

  -- ─── B · Wozu eine Person beim Austritt wird ────────────────────────────
  alter table public.vereine
    add column if not exists austritt_art_id uuid;

  comment on column public.vereine.austritt_art_id is
    'Personenart, zu der eine Person beim Austritt wird. Nur GESETZTE Arten (personenarten.ableitung IS NULL) sind zulaessig — geprueft in der Portalverwaltung, nicht per CHECK; Begruendung im Kopf von migration_austritt.sql.';

  /* Vorbelegen mit dem, was bisher fest im Code stand: Supporter. */
  update public.vereine v
     set austritt_art_id = (
       select a.id from public.personenarten a
        where a.verein_id = v.id and a.ableitung is null
          and lower(a.name) = 'supporter' and a.aktiv
        order by a.sort_order limit 1)
   where v.austritt_art_id is null;

  /* ⚠ Der Fremdschluessel geht ueber (austritt_art_id, id) — vereine.id IST
     die verein_id. Damit kann kein Verein die Art eines anderen eintragen;
     ohne die zweite Spalte waere genau das moeglich. */
  alter table public.vereine
    drop constraint if exists vereine_austritt_art_fkey;
  alter table public.vereine
    add constraint vereine_austritt_art_fkey
    foreign key (austritt_art_id, id)
    references public.personenarten (id, verein_id)
    on delete set null;

  -- ─── Zaehlprobe ─────────────────────────────────────────────────────────
  select count(*) into v_anz from information_schema.columns
   where table_schema='public' and table_name='personenarten' and column_name='standard_rolle';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: personenarten.standard_rolle fehlt.'; end if;

  select count(*) into v_anz from information_schema.columns
   where table_schema='public' and table_name='vereine' and column_name='austritt_art_id';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: vereine.austritt_art_id fehlt.'; end if;

  select count(*) into v_anz from pg_constraint
   where conname in ('personenarten_standard_rolle_fkey','vereine_austritt_art_fkey');
  if v_anz <> 2 then raise exception 'UNVOLLSTAENDIG: % von 2 Fremdschluesseln.', v_anz; end if;

  /* ⚠ Gemessen statt behauptet: wie viele Vereine haben jetzt ein Ziel und
     wie viele nicht. „Keines" ist kein Fehler — ein Verein ohne Art
     Supporter bekommt eben keines und stellt es selbst ein. Es soll nur
     nicht unbemerkt bleiben. */
  select count(*) into v_mit  from public.vereine where austritt_art_id is not null;
  select count(*) into v_ohne from public.vereine where austritt_art_id is null;

  raise notice 'Fertig. % Verein(e) mit Austrittsziel, % ohne.', v_mit, v_ohne;
end $mig$;
