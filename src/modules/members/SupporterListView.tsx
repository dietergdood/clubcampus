/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/SupporterListView.tsx

   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT: kein
   Beitrag, kein Stimmrecht an der GV, kein Spielbetrieb, und in
   Artikel 6 der Statuten kommt er nicht vor. Er bleibt erreichbar,
   trägt sich für Helferschichten ein und bekommt bestimmte News.
   ⚠ Der Helferteil ist ZIEL, nicht Ist-Stand: helper_zuteilungen führt
   heute mitglied_id. Im Nutzertext steht er deshalb nicht.

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
import { spalte, spalten, personGruppe } from "../../shared/person/personSpalten.ts";
import { filterMembers, sortMembers } from "./memberFilter.ts";
import { buildGroups } from "./memberGrouping.ts";
import { exportData } from "./memberExportUtils.ts";
import type { MemberRow } from "./memberMapper.ts";
import type { ColDef, ColGroup, FilterDef, GroupOption, RenderCell, RowId } from "../../shared/list/types.ts";
import type { Account, Sb } from "../../types.ts";

/* Aus ALL_COLS gezogen statt neu deklariert: gleiche Keys, gleiche
   Beschriftungen, gleiche Zellen-Renderer wie in der Mitgliederliste.

   ⚠ `eintritt` ist hier entfallen. Es kommt aus `mitglieder.eintrittsdatum`
   und ist bei einer Person ohne Mitgliedschaft strukturell leer — die Spalte
   haette in JEDER Zeile "-" gezeigt und damit ausgesehen wie ein Datenloch,
   das jemand fuellen koennte. Wenn ein Goenner ein "dabei seit" bekommen
   soll, braucht das eine eigene Angabe; siehe den offenen Punkt
   „Supporter-Liste ueberarbeiten". */
/* ⚠ ALLE ZWANZIG PERSONENSPALTEN, nicht mehr fuenf. Was einer Person
   gehoert, gilt auch fuer einen Goenner — bis zum 22.08.2026 bot diese
   Liste nur Name, E-Mail, Telefon, Ort und Portal an, und wer die Adresse
   oder das Geburtsdatum brauchte, musste jedes Profil einzeln oeffnen.

   Die acht Mitgliedschafts-Spalten fehlen weiterhin, und zwar strukturell:
   ein Goenner hat keinen Mitgliedtyp, kein Eintrittsdatum, keinen Kader.
   Sie waeren nicht leer, sondern gegenstandslos. */
const STANDARD_KEYS = ["name", "art", "email", "telefon", "ort", "portal"];

const COL_GROUPS: ColGroup[] = [
  { group: "Person", cols: [
    spalte("name", { default: true, alwaysOn: true }),
    /* „Art" ist bei einem Goenner die einzige Einteilung, die es gibt —
       Goenner, Ehemaliger, spaeter externer Trainer. Deshalb vorgegeben. */
    { key: "art", label: "Art", default: true },
    ...spalten(["nachname", "vorname", "geburtsdatum", "alter", "geschlecht",
                "nationalitaet", "nationalitaet2", "heimatort", "ahv_nr"]),
  ]},
  personGruppe("Kontakt", ["email", "telefon"], { default: true }),
  personGruppe("Adresse", ["strasse", "ort"], {}, { ort: { default: true } }),
  personGruppe("Portal", ["portal", "rollen", "datenpruefung"],
    {}, { portal: { default: true } }),
  personGruppe("Verein", ["funktionen", "funktionsgruppen"]),
];

const COL_DEFS: ColDef[] = COL_GROUPS.flatMap(g => g.cols);

/* Nur die Filter und Gruppierungen, die bei einem Goenner etwas bedeuten:
   eine Mitgliedschaft hat er nicht, Teams und Kaderrollen ebenso wenig. */
const FILTER_DEFS: FilterDef[] = [
  { key: "art",    label: "Art" },
  { key: "portal", label: "Portal-Zugang", vals: ["Aktiv", "Kein Zugang"] },
  { key: "wohnort", label: "Wohnort" },
  { key: "geschlecht", label: "Geschlecht" },
  { key: "funktionen", label: "Vereinsfunktion" },
];

const GROUP_OPTIONS: GroupOption[] = [
  { val: "art",    label: "Art" },
  { val: "portal", label: "Portal-Zugang" },
  { val: "ort",    label: "Wohnort" },
  { val: "geschlecht", label: "Geschlecht" },
  { val: "funktionen", label: "Vereinsfunktion" },
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
  /* ⚠ ZWEI Sammelaktionen, und beide sind KEIN Loeschen. Archivieren setzt
     eine Mitgliedschaft auf inaktiv — ein Goenner hat keine. Und geloescht
     wird eine Person nie: sie ist der Bezugspunkt von Konto,
     Helfereinsaetzen und Verlauf. Das Loeschen kommt mit Etappe 3, und ein
     Knopf, der bis dahin „Loeschen" hiesse und die Person stehen liesse,
     waere genau die Beschriftung, die am 22.08.2026 beim Archiv berichtigt
     wurde. */
  onMitgliedWerden?: ((personIds: string[]) => void) | null;
  onArtAendern?: ((personIds: string[]) => void) | null;
}

function SupporterListView({
  supporter, renderCell, rolleLabel, renderMobile, sb, account = null, vereinId = null,
  isAdmin = false, canExport = false, onOeffnen = null,
  onMitgliedWerden = null, onArtAendern = null,
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
      defaultCols={STANDARD_KEYS}
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

         Die Auswahl gibt es seit dem 22.08.2026: mit „Mitglied werden" und
         „Art aendern" fuehren die Kaestchen jetzt irgendwohin. */
      selectable={isAdmin && Boolean(onMitgliedWerden || onArtAendern)}
      bulkActions={[
        { icon: "user-plus", label: "Mitglied werden", requiresSelection: true,
          hidden: !onMitgliedWerden,
          onClick: (sel: Set<RowId>) => onMitgliedWerden?.([...sel].map(String)) },
        { icon: "bookmark", label: "Art ändern", requiresSelection: true,
          hidden: !onArtAendern,
          onClick: (sel: Set<RowId>) => onArtAendern?.([...sel].map(String)) },
      ].filter(a => !a.hidden)}
      footerLabel={(f, t) => `${f} von ${t} Personen`}
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
