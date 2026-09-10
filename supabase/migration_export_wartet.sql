-- ═══════════════════════════════════════════════════════════════════════════
-- ClubCampus — der WordPress-Export wird ueberwacht
-- 10.09.2026
--
-- ⚠ ⚠  DER ERSTE ENTWURF DIESER MIGRATION WAR WERTLOS, UND ZWAR STILL.
--
--   Vorgeschlagen war:
--
--     spiele.zuletzt_synchronisiert > api_verbindungen.letzter_sync
--
--   Gemessen im Quelltext, bevor sie lief:
--
--     sync.ts:114          zuletzt_synchronisiert: jetzt
--     matchdaten.ts:129    zuletzt_synchronisiert: jetzt
--     ranglisten           stand_vom: jetzt   (sync.ts:149)
--
--   **Diese Spalten halten fest, WANN EIN LAUF WAR — nicht, ob sich etwas
--   geaendert hat.** Sie werden bei jedem stuendlichen Lauf fuer ALLE 270
--   Spiele und ALLE 232 Ranglistenzeilen neu gesetzt, auch wenn kein Wert
--   anders ist.
--
--   Die Abfrage haette also nach jedem Sync „502 warten" gemeldet. Der
--   Export waere stuendlich gelaufen — genau der Takt, den er nicht haben
--   soll —, und der Waechter haette nie „nichts wartet" gesehen.
--
-- ⚠ **Und es waere nicht aufgefallen.** Ein Export, der stuendlich laeuft,
--   sieht gesund aus. Erst wer nachzaehlt, warum 270 Spiele „warten",
--   obwohl sich keines geaendert hat, findet es. Dieselbe Familie wie ein
--   Zaehler, dessen Name mehr behauptet als er misst.
--
-- ── Was daraus folgt ──────────────────────────────────────────────────────
--
--   Es gibt heute in `spiele` und `ranglisten` **keinen** Zeitstempel, der
--   eine AENDERUNG festhaelt. Er muss angelegt werden, und er darf nicht
--   vom schreibenden Code gesetzt werden — der weiss nicht, ob sich etwas
--   geaendert hat, weil `upsert` nicht vergleicht.
--
--   **Also ein Trigger, der die Zeile mit sich selbst vergleicht.**
--
-- ⚠ Er vergleicht dabei NICHT die ganze Zeile: `zuletzt_synchronisiert`
--   aendert sich bei jedem Lauf, und ein naiver Vergleich saehe deshalb
--   immer einen Unterschied — der Trigger haette denselben Defekt wie die
--   Abfrage, gegen die er gebaut wird. Verglichen wird der INHALT ohne die
--   Laufstempel.
--
-- ⚠ NEBENWIRKUNG, UND SIE IST ERWUENSCHT: der Trigger sieht auch
--   Aenderungen aus dem Portal (jemand traegt einen Treffpunkt ein). Die
--   gehoeren ebenfalls auf die Website, und eine Ableitung aus dem
--   Sync-Ergebnis haette sie uebersehen.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1 · Die Spalten ────────────────────────────────────────────────────────
alter table public.spiele
  add column if not exists zuletzt_geaendert timestamptz not null default now();

alter table public.ranglisten
  add column if not exists zuletzt_geaendert timestamptz not null default now();

comment on column public.spiele.zuletzt_geaendert is
  'Wann sich an dieser Zeile INHALTLICH etwas geaendert hat — gesetzt von einem Trigger, nicht vom schreibenden Code. ⚠ NICHT zu verwechseln mit zuletzt_synchronisiert: das haelt fest, wann ein Lauf war, und wird stuendlich fuer alle Zeilen neu gesetzt, auch ohne Aenderung.';

comment on column public.ranglisten.zuletzt_geaendert is
  'Wie bei spiele. ⚠ NICHT stand_vom: das ist der Laufstempel und aendert sich stuendlich fuer jede Zeile.';

-- ── 2 · Der Trigger ────────────────────────────────────────────────────────
--
-- ⚠ `to_jsonb(NEW) - '…'` entfernt die Laufstempel aus dem Vergleich.
--   Ohne das waere jeder Lauf eine Aenderung, und die ganze Migration
--   waere Zierrat.
create or replace function public.stempel_zuletzt_geaendert()
returns trigger
language plpgsql
as $fn$
declare
  alt_j jsonb;
  neu_j jsonb;
begin
  if tg_op = 'INSERT' then
    new.zuletzt_geaendert := now();
    return new;
  end if;

  alt_j := to_jsonb(old) - 'zuletzt_synchronisiert' - 'stand_vom'
                         - 'zuletzt_geaendert' - 'matchdaten_geholt_am';
  neu_j := to_jsonb(new) - 'zuletzt_synchronisiert' - 'stand_vom'
                         - 'zuletzt_geaendert' - 'matchdaten_geholt_am';

  if alt_j is distinct from neu_j then
    new.zuletzt_geaendert := now();
  else
    -- ⚠ AUSDRUECKLICH den alten Wert behalten. Ohne diese Zeile traegt
    --   `new` den Wert, den der Schreibende mitgeschickt hat — und ein
    --   `upsert`, der die Spalte nicht nennt, setzt sie auf den Default,
    --   also auf now(). Der Trigger repariert damit auch, was er nicht
    --   angefasst hat.
    new.zuletzt_geaendert := old.zuletzt_geaendert;
  end if;
  return new;
end
$fn$;

comment on function public.stempel_zuletzt_geaendert() is
  'Setzt zuletzt_geaendert nur bei INHALTLICHER Aenderung. Vergleicht die Zeile als jsonb OHNE die Laufstempel — sonst waere jeder stuendliche Sync-Lauf eine Aenderung. Angelegt 10.09.2026.';

drop trigger if exists spiele_zuletzt_geaendert on public.spiele;
create trigger spiele_zuletzt_geaendert
  before insert or update on public.spiele
  for each row execute function public.stempel_zuletzt_geaendert();

drop trigger if exists ranglisten_zuletzt_geaendert on public.ranglisten;
create trigger ranglisten_zuletzt_geaendert
  before insert or update on public.ranglisten
  for each row execute function public.stempel_zuletzt_geaendert();

-- ── 3 · Die Funktion, die beide Fragen beantwortet ─────────────────────────
--
-- ⚠ ZWEI QUELLEN, NICHT EINE. Der Export schickt Spiele UND Ranglisten.
--   Eine Abfrage nur auf `spiele` uebersaehe eine geaenderte Tabelle
--   vollstaendig — und zwar still, weil „nichts wartet" und „ich sehe
--   nicht nach" gleich aussehen. Die Luecke war beim Entwurf bekannt und
--   wird deshalb gleich mitgebaut, statt liegen zu bleiben (Entscheid
--   Didi, 10.09.2026).
create or replace function public.export_wartet(p_verein_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  with stand as (
    select coalesce(
             (select v.letzter_sync from public.api_verbindungen v
               where v.verein_id = p_verein_id and v.key = 'wordpress'),
             '-infinity'::timestamptz) as seit
  )
  select (
    (select count(*) from public.spiele s, stand
      where s.verein_id = p_verein_id and s.zuletzt_geaendert > stand.seit)
    +
    (select count(*) from public.ranglisten r, stand
      where r.verein_id = p_verein_id and r.zuletzt_geaendert > stand.seit)
  )::integer;
$fn$;

comment on function public.export_wartet(uuid) is
  'Wie viele Zeilen (Spiele + Ranglisten) haben sich seit dem letzten WordPress-Export INHALTLICH geaendert? ⚠ Sie ist AUSLOESER und WAECHTER zugleich: „soll er laufen?" und „haette er laufen muessen?" sind dieselbe Frage, eine Stunde auseinander. Angelegt 10.09.2026.';

commit;

-- ── Gegenprobe ─────────────────────────────────────────────────────────────
--
-- ⚠ DIE ERSTE IST DIE WICHTIGE, und sie ist genau die, die den ersten
--   Entwurf widerlegt haette: **bewegt sich die Zahl nach einem Sync-Lauf,
--   der nichts geaendert hat?**
--
-- 1 · Vor und nach einem stuendlichen Lauf:
--
--   select public.export_wartet(id) from public.vereine;
--   -- … Lauf abwarten …
--   select public.export_wartet(id) from public.vereine;
--
-- ⚠ Erwartung: **gleich**, solange der Verband nichts geaendert hat.
--   Springt sie auf 502, greift der Trigger nicht — dann steht die Zahl
--   fuer „ein Lauf war" statt fuer „etwas hat sich geaendert", und die
--   ganze Ueberwachung ist wieder wertlos.
--
-- 2 · Und sie reagiert, wenn sich wirklich etwas aendert:
--
--   update public.spiele set treffpunkt = coalesce(treffpunkt,'') || ' '
--    where id = (select id from public.spiele limit 1);
--   -- danach: um genau 1 groesser
--
--   ⚠ Danach zuruecknehmen — das Leerzeichen bliebe sonst stehen und
--   waere beim naechsten Hinsehen ein Raetsel.
--
-- 3 · Der Trigger stempelt NICHT bei einem reinen Laufstempel:
--
--   select zuletzt_geaendert from public.spiele where id = '…';
--   update public.spiele set zuletzt_synchronisiert = now() where id = '…';
--   select zuletzt_geaendert from public.spiele where id = '…';
--   -- erwartet: unveraendert
--
-- ⚠ Fall 3 ist die Positivkontrolle des Triggers. Ohne ihn weiss niemand,
--   ob die Ausnahmeliste (`- 'zuletzt_synchronisiert'` …) wirklich greift
--   — und eine Ausnahmeliste, die nicht greift, faellt nur dadurch auf,
--   dass alles immer „wartet".
