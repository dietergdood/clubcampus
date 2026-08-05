/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/SupporterListView.tsx

   Supporter sind KEINE Mitglieder: kein Beitrag, kein Stimmrecht
   an der GV, kein Spielbetrieb. Sie stehen technisch in
   `mitglieder` mit `mitgliedtyp = 'Supporter'` (Etappe 5, damit
   sie überhaupt auffindbar sind), gehören aber nicht in die
   Mitgliederliste — sonst stimmt der Zähler nicht, Auswertungen
   zählen sie mit, und beim Anschreiben landen sie in Gruppen, in
   die sie nicht gehören.

   Deshalb ein eigener Tab — aber DIESELBE Darstellung: Spalten,
   Zellen und Mobilansicht kommen aus denselben Bausteinen wie die
   Mitgliederliste (`ALL_COLS`, `makeMemberRenderCell`). Nur die
   Auswahl der Spalten ist eine andere: Mitgliedtyp ist für alle
   derselbe, Spielerpass, Teams und Kaderrollen gibt es bei einem
   Gönner nicht.
   ═══════════════════════════════════════════════════════════════ */
import { ListView } from "../../shared/list/ListView.tsx";
import { ALL_COLS } from "./memberConstants.ts";
import { exportData } from "./memberExportUtils.ts";
import type { MemberRow } from "./memberMapper.ts";
import type { ColDef, FilterDef, GroupOption, ListGroup, RenderCell } from "../../shared/list/types.ts";
import type { Account, Sb } from "../../types.ts";

/* Aus ALL_COLS gezogen statt neu deklariert: gleiche Keys, gleiche
   Beschriftungen, gleiche Zellen-Renderer wie in der Mitgliederliste. */
const SUPPORTER_KEYS = ["name", "email", "telefon", "ort", "eintritt", "portal"];

const COL_DEFS: ColDef[] = SUPPORTER_KEYS
  .map(k => ALL_COLS.find(c => c.key === k))
  .filter(Boolean)
  .map(c => ({ ...(c as ColDef), default: true }));

const COL_GROUPS = [{ group: "Supporter", cols: COL_DEFS }];

const FILTER_DEFS: FilterDef[] = [
  { key: "portal", label: "Portal-Zugang", vals: ["Aktiv", "Kein Zugang"] },
];

const GROUP_OPTIONS: GroupOption[] = [
  { val: "", label: "Keine" },
  { val: "portal", label: "Portal-Zugang" },
  { val: "ort", label: "Ort" },
];

interface SupporterListViewProps {
  supporter: MemberRow[];
  renderCell: RenderCell<MemberRow>;
  renderMobile?: (row: MemberRow) => React.ReactNode;
  sb?: Sb;
  account?: Account | null;
  vereinId?: string | null;
  isAdmin?: boolean;
  onOpen?: ((row: MemberRow) => void) | null;
}

function SupporterListView({
  supporter, renderCell, renderMobile, sb, account = null, vereinId = null,
  isAdmin = false, onOpen = null,
}: SupporterListViewProps) {
  return (
    <ListView<MemberRow>
      emptyIcon="heart-handshake"
      emptyTitle="Noch keine Supporter"
      emptySubtitle="Ein Supporter entsteht, wenn ein Elternteil sein letztes Kind verliert und der Verein den Kontakt behalten will."
      rows={supporter}
      filterFn={(rows, search, filterVals) => {
        const q = (search || "").trim().toLowerCase();
        let result = q
          ? rows.filter(r => [r.name, r.email, r.telefon, r.ort]
              .some(v => String(v ?? "").toLowerCase().includes(q)))
          : rows;
        const portalVals = Array.isArray(filterVals["portal"]) ? filterVals["portal"] : [];
        if (portalVals.length > 0) result = result.filter(r => portalVals.includes(String(r.portal)));
        return result;
      }}
      buildGroupsFn={(rows, groupBy) => {
        const key = groupBy?.[0];
        if (!key) return [] as ListGroup<MemberRow>[];
        const map = new Map<string, MemberRow[]>();
        for (const r of rows) {
          const k = String((r as unknown as Record<string, unknown>)[key] ?? "—") || "—";
          if (!map.has(k)) map.set(k, []);
          map.get(k)!.push(r);
        }
        return [...map.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], "de"))
          .map(([label, members]) => ({ key: label, label, type: key, members, children: null }));
      }}
      colDefs={COL_DEFS}
      colGroups={COL_GROUPS}
      defaultCols={SUPPORTER_KEYS}
      filterDefs={FILTER_DEFS}
      groupOptions={GROUP_OPTIONS}
      renderCell={renderCell}
      renderMobile={renderMobile}
      onRowClick={onOpen ?? undefined}
      sb={sb}
      account={account}
      vereinId={vereinId}
      viewTyp="supporter"
      isAdmin={isAdmin}
      footerLabel={(f, t) => `${f} von ${t} Supportern`}
      exportFn={(rows, cols, groups, format) => exportData(rows, cols, format, groups)}
    />
  );
}

export { SupporterListView };
