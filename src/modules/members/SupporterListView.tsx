/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/SupporterListView.tsx

   Supporter sind KEINE Mitglieder: kein Beitrag, kein Stimmrecht
   an der GV, kein Spielbetrieb. Sie stehen technisch in
   `mitglieder` mit `mitgliedtyp = 'Supporter'` (Etappe 5, damit
   sie überhaupt auffindbar sind), gehören aber nicht in die
   Mitgliederliste — sonst stimmt der Zähler nicht, Auswertungen
   zählen sie mit, und beim Anschreiben landen sie in Gruppen, in
   die sie nicht gehören.

   Deshalb ein eigener Tab mit eigenen Spalten. Kein Mitgliedtyp
   (er ist für alle derselbe), kein Spielerpass, keine Teams —
   die gibt es bei einem Gönner nicht.
   ═══════════════════════════════════════════════════════════════ */
import { ListView } from "../../shared/list/ListView.tsx";
import { exportData } from "./memberExportUtils.ts";
import type { MemberRow } from "./memberMapper.ts";
import type { Account, Sb } from "../../types.ts";

const COL_DEFS = [
  { key: "name",     label: "Name",    default: true },
  { key: "email",    label: "E-Mail",  default: true },
  { key: "telefon",  label: "Telefon", default: true },
  { key: "ort",      label: "Ort",     default: true },
  { key: "eintritt", label: "Seit",    default: true },
  { key: "portal",   label: "Portal",  default: true },
];

const COL_GROUPS = [{ group: "Supporter", cols: COL_DEFS }];

interface SupporterListViewProps {
  supporter: MemberRow[];
  sb?: Sb;
  account?: Account | null;
  vereinId?: string | null;
  isAdmin?: boolean;
  onOpen?: ((row: MemberRow) => void) | null;
}

function SupporterListView({
  supporter, sb, account = null, vereinId = null, isAdmin = false, onOpen = null,
}: SupporterListViewProps) {
  return (
    <ListView<MemberRow>
      emptyIcon="heart-handshake"
      emptyTitle="Noch keine Supporter"
      emptySubtitle="Ein Supporter entsteht, wenn ein Elternteil sein letztes Kind verliert und der Verein den Kontakt behalten will."
      rows={supporter}
      filterFn={(rows, search) => {
        const q = (search || "").trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
          [r.name, r.email, r.telefon, r.ort]
            .some(v => String(v ?? "").toLowerCase().includes(q)));
      }}
      colDefs={COL_DEFS}
      colGroups={COL_GROUPS}
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
