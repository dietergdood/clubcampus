/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/SupporterListView.tsx

   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT: kein
   Beitrag, kein Stimmrecht an der GV, kein Spielbetrieb, und in
   Artikel 6 der Statuten kommt er nicht vor. Er bleibt erreichbar,
   trägt sich für Helferschichten ein und bekommt bestimmte News.

   Bis zum 20.08.2026 stand er als Mitgliedtyp in `mitglieder`
   (Etappe 5). Seither kommt die Liste aus `personen` — siehe
   `fetchSupporter` und `migration_supporter_rueckbau.sql`.

   Eigener Tab, aber DIESELBE Darstellung: Spalten, Zellen und
   Mobilansicht kommen aus denselben Bausteinen wie die
   Mitgliederliste (`ALL_COLS`, `makeMemberRenderCell`), und
   gefiltert, sortiert und gruppiert wird mit denselben Funktionen.
   Nur die Auswahl der Spalten ist eine andere: Mitgliedschaft,
   Eintritt, Spielerpass, Teams und Kaderrollen gibt es bei einem
   Gönner nicht.
   ═══════════════════════════════════════════════════════════════ */
import { ListView } from "../../shared/list/ListView.tsx";
import { ALL_COLS } from "./memberConstants.ts";
import { filterMembers, sortMembers } from "./memberFilter.ts";
import { buildGroups } from "./memberGrouping.ts";
import { exportData } from "./memberExportUtils.ts";
import type { MemberRow } from "./memberMapper.ts";
import type { ColDef, FilterDef, GroupOption, RenderCell } from "../../shared/list/types.ts";
import type { Account, Sb } from "../../types.ts";

/* Aus ALL_COLS gezogen statt neu deklariert: gleiche Keys, gleiche
   Beschriftungen, gleiche Zellen-Renderer wie in der Mitgliederliste.

   ⚠ `eintritt` ist hier entfallen. Es kommt aus `mitglieder.eintrittsdatum`
   und ist bei einer Person ohne Mitgliedschaft strukturell leer — die Spalte
   haette in JEDER Zeile "-" gezeigt und damit ausgesehen wie ein Datenloch,
   das jemand fuellen koennte. Wenn ein Goenner ein "dabei seit" bekommen
   soll, braucht das eine eigene Angabe; siehe den offenen Punkt
   „Supporter-Liste ueberarbeiten". */
const SUPPORTER_KEYS = ["name", "email", "telefon", "ort", "portal"];

const COL_DEFS: ColDef[] = SUPPORTER_KEYS
  .map(k => ALL_COLS.find(c => c.key === k))
  .filter(Boolean)
  .map(c => ({ ...(c as ColDef), default: true }));

const COL_GROUPS = [{ group: "Supporter", cols: COL_DEFS }];

/* Nur die Filter und Gruppierungen, die bei einem Goenner etwas bedeuten:
   eine Mitgliedschaft hat er nicht, Teams und Kaderrollen ebenso wenig. */
const FILTER_DEFS: FilterDef[] = [
  { key: "portal", label: "Portal-Zugang", vals: ["Aktiv", "Kein Zugang"] },
];

const GROUP_OPTIONS: GroupOption[] = [
  { val: "portal", label: "Portal-Zugang" },
  { val: "ort",    label: "Wohnort" },
];

interface SupporterListViewProps {
  supporter: MemberRow[];
  renderCell: RenderCell<MemberRow>;
  /** Beschriftungen der Portalrollen — dieselben wie in der Mitgliederliste. */
  rolleLabel: Record<string, string>;
  renderMobile?: (row: MemberRow) => React.ReactNode;
  sb?: Sb;
  account?: Account | null;
  vereinId?: string | null;
  isAdmin?: boolean;
  canExport?: boolean;
  /** Klick auf eine Zeile — oeffnet das schlanke Supporter-Modal. */
  onOeffnen?: ((row: MemberRow) => void) | null;
  /* ⚠ KEINE Sammelaktionen. Archivieren setzt eine Mitgliedschaft auf
     inaktiv — ein Supporter hat keine, es gaebe nichts zu archivieren. Und
     geloescht wird eine Person nie: sie ist der Bezugspunkt von Konto,
     Helfereinsaetzen und Verlauf. An ihre Stelle tritt „Mitglied werden"
     im Modal. */
}

function SupporterListView({
  supporter, renderCell, rolleLabel, renderMobile, sb, account = null, vereinId = null,
  isAdmin = false, canExport = false, onOeffnen = null,
}: SupporterListViewProps) {
  return (
    <ListView<MemberRow>
      emptyIcon="heart-handshake"
      emptyTitle="Noch keine Supporter"
      emptySubtitle="Ein Supporter ist eine Person ohne Mitgliedschaft, die erreichbar bleiben soll — etwa ein Elternteil, dessen letztes Kind den Verein verlassen hat."
      rows={supporter}
      /* Dieselben Funktionen wie die Mitgliederliste — ein Supporter IST eine
         MemberRow. Eigene Nachbauten waeren ein zweiter Ort, an dem Suche,
         Sortierung und Gruppierung auseinanderlaufen koennen. */
      filterFn={(rows, search, filterVals) => filterMembers(rows, search, filterVals, rolleLabel)}
      sortFn={sortMembers}
      buildGroupsFn={(rows, groupBy, groupOrder, filterVals) =>
        buildGroups(rows, groupBy, rolleLabel, filterVals, null, groupOrder)}
      multiGroup
      colDefs={COL_DEFS}
      colGroups={COL_GROUPS}
      defaultCols={SUPPORTER_KEYS}
      filterDefs={FILTER_DEFS}
      groupOptions={GROUP_OPTIONS}
      renderCell={renderCell}
      renderMobile={renderMobile}
      onRowClick={onOeffnen ?? undefined}
      sb={sb}
      account={account}
      vereinId={vereinId}
      viewTyp="supporter"
      isAdmin={isAdmin}
      /* Kein `savedViews`: die Vorlagen „Standard" und „Verwaltung" bestehen
         aus Spalten, die es hier nicht gibt (Mitgliedschaft, Teams,
         Kaderrollen). Eigene Ansichten speichern geht trotzdem — ListView
         legt sie unter viewTyp="supporter" ab.

         Auch keine Auswahl: ohne Sammelaktion waeren die Kaestchen ein
         Bedienelement, das zu nichts fuehrt. */
      footerLabel={(f, t) => `${f} von ${t} Supportern`}
      /* Ohne exportFormats blendet ListView den Knopf aus — exportFn allein
         genuegt nicht. Dieselben drei Formate wie in der Mitgliederliste. */
      exportFn={canExport ? ((rows, cols, groups, format) => exportData(rows, cols, format, groups)) : undefined}
      exportFormats={canExport ? [
        { label: "Liste als CSV (flach)",                 format: "csv" },
        { label: "Liste als CSV (mit Gruppen)",           format: "csv-gruppen" },
        { label: "Liste als Excel (pro Gruppe ein Sheet)", format: "excel-sheets", icon: "table" },
      ] : []}
    />
  );
}

export { SupporterListView };
