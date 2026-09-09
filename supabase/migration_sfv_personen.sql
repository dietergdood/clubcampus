-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — public.sfv_personen
-- 10.09.2026
--
-- ⚠ ⚠  HIER WIRD EIN FRUEHERER ENTSCHEID UMGEDREHT  ⚠ ⚠
--
--   Der Entscheid vom 22.08.2026 lautete: die SFV-Namen werden NICHT
--   gespeichert. Er steht im Wortlaut in supabase/functions/sfv-sync/
--   matchdaten.ts, ueber bildeOffeneNamen():
--
--     „⚠ SIE WERDEN NICHT GESPEICHERT. … Speichern: eine Spalte an
--      spiel_aufstellung liest JEDER … Und nach der Zuordnung ist der Name
--      ueberfluessig: ein Bestand ohne Zweck, den jemand loeschen muesste
--      und vergessen wuerde."
--
--   Er war richtig fuer seine Frage. Die Frage hat sich geaendert.
--
--   DAMALS  dienten die Namen der Zuordnung. Danach waeren sie ein Bestand
--           ohne Zweck gewesen.
--   HEUTE   sollen sie auf die Website. Ein Torschuetze heisst dort mit
--           Namen oder „Nr. 13", und 308 Spielerprofile von Hand anzulegen
--           ist keine Option. Damit haben sie einen dauerhaften Zweck: sie
--           sind der RUECKFALL, wenn keine Zuordnung besteht.
--
--   DAS DATENSCHUTZARGUMENT TRAEGT NICHT MEHR. Dieselben Namen mit denselben
--   Toren stehen oeffentlich auf fvrz.ch — bestaetigt von Didi am
--   10.09.2026 fuer ALLE Altersklassen, kein Jahrgang faellt heraus. Wir
--   veroeffentlichen nichts, was nicht schon veroeffentlicht ist.
--
-- ⚠ WAS NICHT UMGEDREHT WIRD — und das ist der wichtigere Teil:
--
--   • Die ZUORDNUNG bleibt der bessere Weg. Steht eine echte Person in
--     ClubCampus und ist zugeordnet, gewinnt UNSER Name, in unserer
--     Schreibweise. Der SFV-Name ist der Rueckfall, nicht die Wahrheit.
--   • GEGNER BLEIBEN ANONYM. istEigener() filtert nach clubNumber, und
--     spiel_ereignisse_fremde_anonym_check prueft es ein zweites Mal in der
--     Datenbank. Diese Migration beruehrt davon nichts.
--   • Die ALLOWLIST bleibt das erste Netz. bildeSfvPerson() nennt jedes
--     Feld einzeln; birthDate, passportNumber, gender und secondName werden
--     weiterhin nicht gelesen — nicht gefiltert, sondern gar nicht erst
--     angefasst.
--
-- ⚠ WER DAS HIER LIEST UND ZURUECKBAUEN WILL: der Grund fuer den alten
--   Entscheid war nicht falsch, er ist WEGGEFALLEN. Faellt der Zweck weg
--   (die Website zeigt keine Namen mehr), faellt auch diese Tabelle.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── Die Tabelle ────────────────────────────────────────────────────────────
--
-- ⚠ WARUM EINE EIGENE TABELLE UND KEINE SPALTE AN spiel_aufstellung.
--   Zwei Gruende, und nur einer war der Datenschutz:
--
--   1 · KORNGROESSE. spiel_aufstellung fuehrt eine Zeile je Spieler UND
--       Spiel — 640 Zeilen fuer 308 Personen (gemessen 29.08.2026). Der
--       Name stuende dort im Schnitt doppelt, als unabhaengige Kopien.
--       Schreibt der Verband ihn in Spiel A anders als in Spiel B, gibt es
--       zwei Wahrheiten und keine Meldung. Ein Name gehoert zur PERSON,
--       nicht zu ihrem Auftritt.
--
--   2 · RECHTE. spiel_aufstellung_select gilt fuer den ganzen Verein. Eine
--       eigene Tabelle kann eine eigene Policy tragen; eine Spalte erbt die
--       der Tabelle und laesst keine Wahl.
create table if not exists public.sfv_personen (
  verein_id        uuid    not null references public.vereine(id),
  sfv_person_id    integer not null,
  name             text    not null,
  sfv_team_id      integer,
  rueckennr        integer,
  erstmals_gesehen timestamptz not null default now(),
  zuletzt_gesehen  timestamptz not null default now(),
  primary key (verein_id, sfv_person_id)
);

-- ⚠ DER SCHLUESSEL IST (verein_id, sfv_person_id), NICHT sfv_person_id
--   ALLEIN. Die Personennummer des Verbands ist schweizweit eindeutig —
--   aber dieselbe Person kann in zwei Vereinen im Portal stehen, und global
--   unique naehme der zweite Verein dem ersten die Zeile weg. Genau der
--   Fehler, der bei mitglieder_fairgate_id_key durchgerutscht ist und dort
--   bis heute offen steht.
comment on table public.sfv_personen is
  'Klarnamen eigener Spieler aus der SFV Club API. RUECKFALL fuer die Anzeige, wenn keine sfv_zuordnung besteht — die Zuordnung gewinnt immer. Nur eigene Spieler: Gegner bleiben anonym.';

comment on column public.sfv_personen.name is
  'firstname + name des Verbands. Wird bei JEDEM Lauf ueberschrieben (Entscheid Didi, 10.09.2026): korrigiert der Verband eine Schreibweise, soll sie ankommen. Ein Abzug von damals ist genau das, was in die Irre fuehrt.';

-- ⚠ MOMENTAUFNAHME, KEIN STAMMDATUM. Beide Spalten stehen richtig an
--   spiel_aufstellung und dienen hier nur dem Wiedererkennen in der
--   Zuordnungsmaske („Nr. 13, De-Junioren"). Wer daraus rechnet, rechnet
--   falsch — eine Rueckennummer gehoert der Kaderzeile, nicht der Person.
comment on column public.sfv_personen.rueckennr is
  'Momentaufnahme aus dem zuletzt gesehenen Spiel — nur zum Wiedererkennen in der Maske. Nicht als Stammdatum verwenden.';
comment on column public.sfv_personen.sfv_team_id is
  'Momentaufnahme aus dem zuletzt gesehenen Spiel — nur zum Wiedererkennen in der Maske. Nicht als Stammdatum verwenden.';

create index if not exists sfv_personen_verein_idx
  on public.sfv_personen (verein_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.sfv_personen enable row level security;

-- ⚠ SELECT FUER DEN GANZEN VEREIN, nicht nur fuer Admins.
--
--   Der Website-Export laeuft als service_role; fuer ihn gilt RLS ohnehin
--   nicht. Die Frage betrifft also allein das Portal — und dort gibt es
--   genau eine Stelle, an der es sichtbar wird: Spielbericht.tsx zeigt
--   beschreibeWer() jedem, der ein Spiel oeffnet.
--
--   Mit is_admin() saehe ein Trainer im EIGENEN Spielbericht „Nr. 13",
--   waehrend auf der oeffentlichen Website der Name steht. Sobald der Name
--   oeffentlich ist, ist eine engere Policy im Portal kein Schutz mehr,
--   sondern eine Ungereimtheit — und Ungereimtheiten werden spaeter
--   „aufgeraeumt", von jemandem, der den Grund nicht kennt.
--
--   ⚠ Empfehlung von Claude, von Didi nicht ausdruecklich bestaetigt
--     (10.09.2026). Enger zu stellen ist eine Zeile: USING (...) durch
--     (verein_id = get_my_verein_id() and is_admin()) ersetzen.
create policy sfv_personen_select on public.sfv_personen
  for select using (verein_id = public.get_my_verein_id());

-- Schreiben tut nur der Sync (service_role, umgeht RLS). Die Policy steht
-- fuer den Fall, dass jemand von Hand korrigiert — und ist bewusst eng.
create policy sfv_personen_write on public.sfv_personen
  using (verein_id = public.get_my_verein_id() and public.is_admin())
  with check (verein_id = public.get_my_verein_id() and public.is_admin());

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
-- Nach dem naechsten Matchdaten-Lauf sollte hier eine Zeile je gesehenem
-- eigenen Spieler stehen. Die Zahl gehoert gegen die offenen Zuordnungen
-- gehalten — sie muessen zusammenpassen:
--
--   select (select count(*) from public.sfv_personen)                     as namen,
--          (select count(distinct sfv_person_id) from public.spiel_aufstellung) as gesehen,
--          (select count(*) from public.sfv_zuordnung)                    as zugeordnet;
--
-- ⚠ `namen` kann kleiner sein als `gesehen`, und das ist kein Fehler: der
--   stuendliche Lauf holt zehn Spiele, die Aktion `namen` holt den Rest.
--   Bleibt die Differenz nach einem Lauf von `namen` bestehen, ist es einer.
