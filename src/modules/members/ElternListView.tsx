/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternListView.tsx
   Eltern-Liste mit Kind+Team Anzeige, Fold-out, Filter, Gruppierung
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { useConfirm, Av } from "../../theme.ts";
import { fetchAlleElternkontakte, entferneElternVerknuepfung } from "../../domains/members/memberService.ts";
import { ListView } from "../../shared/list/ListView.tsx";
import { exportListData, buildFilterDefs } from "../../shared/list/exportUtils.ts";
import type { ColDef, ColGroup, GroupOption, RowId } from "../../shared/list/types.ts";
import { spalte, personGruppe } from "../../shared/person/personSpalten.ts";
import { sortMembers } from "./memberDataUtils.ts";
import type { Account, Sb } from "../../types.ts";
import { mapEltern, buildElternGroups, makeElternRenderCell } from "./elternListUtils.tsx";
import type { ElternRow } from "./elternListUtils.tsx";

/* ⚠ DIE PERSONENSPALTEN KOMMEN AUS DEM GEMEINSAMEN KATALOG. Bis zum
   22.08.2026 deklarierte diese Liste acht eigene — dieselben Schluessel,
   dieselben Beschriftungen, nur ein zweites Mal. Ein Elternteil IST eine
   Person; was fuer ein Mitglied gilt, gilt hier auch.

   ⚠ WAS HIER EIGEN BLEIBT, sind die drei Spalten, die an der VERKNUEPFUNG
   haengen (Beziehung, Kind) bzw. an der Art. Sie gibt es bei keiner anderen
   Liste. */
const EIGEN = (key: string, label: string, flags: Partial<ColDef> = {}): ColDef =>
  ({ key, label, ...flags });

const COL_GROUPS: ColGroup[] = [
  { group:"Verknüpfung", cols:[
    spalte("name", { default:true, alwaysOn:true }),
    EIGEN("art",       "Art",       {default:true}),
    EIGEN("beziehung", "Beziehung", {default:true}),
    EIGEN("kind_name", "Kind",      {default:true}),
  ]},
  personGruppe("Personendaten",
    ["nachname","vorname","geburtsdatum","geschlecht",
     "nationalitaet","nationalitaet2","heimatort","ahv_nr"],
    { default:false }),
  personGruppe("Kontakt", ["email","telefon"], { default:true }),
  personGruppe("Adresse", ["strasse","ort"], { default:false }),
  personGruppe("Portal", ["portal","rollen","datenpruefung"],
    { default:false }, { portal: { default:true } }),
  personGruppe("Verein", ["funktionen"], { default:false }),
];

const COL_DEFS: ColDef[] = COL_GROUPS.flatMap(g => g.cols);

const GROUP_OPTIONS: GroupOption[] = [
  /* ⚠ „Art" steht vorn: sie trennt Elternteil von Ehemaligem, und das ist
     die Gruppierung, nach der man in dieser Liste zuerst sucht. */
  { val:"art",       label:"Art"        },
  { val:"kind_name", label:"Kind"       },
  { val:"teams",     label:"Team"       },
  { val:"beziehung", label:"Beziehung"  },
  { val:"portal",    label:"Portal"     },
  { val:"wohnort",   label:"Wohnort"    },
  { val:"geschlecht",label:"Geschlecht" },
];

interface ElternListViewProps {
  sb: Sb;
  vereinId: string | null;
  account?: Account | null;
  isAdmin?: boolean;
  onNavToMember?: ((id: number) => void) | null;
  /**
   * Klick auf den Namen — oeffnet die Personenseite.
   *
   * ⚠ Bis zum 21.08.2026 stand hier ein `ElternkontaktModal`. Es zeigte
   * Kontaktdaten, Portal-Zugang und die verknuepften Kinder — alles Dinge,
   * die eine Person hat, nicht ein Kontakt. Ein Elternteil IST seit dem
   * Personen-Umbau dieselbe Zeile wie ein Mitglied; deshalb dieselbe Seite.
   */
  onOeffnen?: ((row: ElternRow) => void) | null;
  /** „Mitglied werden" — dieselbe Aktion wie im Supporter-Tab. Die Person
      bleibt dieselbe, es entsteht nur eine Mitgliedschaft daneben. */
  onMitgliedWerden?: ((personIds: string[]) => void) | null;
  /** „Art ändern" — nur GESETZTE Arten sind wählbar. */
  onArtAendern?: ((personIds: string[]) => void) | null;
  /** ⚠ Sammelaktion „Person löschen (DSGVO)". Bekommt Id UND Name, weil das
      Modal die Namen zeigt, bevor seine eigene Vorschau da ist. */
  onLoeschen?: ((personen: { id: string; name: string }[]) => void) | null;
  /**
   * Die Zeilen — von `MitgliederModul` geladen, nicht hier.
   *
   * ⚠ SEIT DEM 25.08.2026 EINE QUELLE. Vorher holte diese Komponente die
   * Liste selbst UND das Modul holte sie noch einmal fuer die Zahl im Tab.
   * Zwei Abfragen ueber 395 Zeilen, zwei Staende — und sie liefen
   * auseinander: „Entfernen" raeumte hier lokal auf und meldete nichts nach
   * oben, also stand im Tab weiter 395, waehrend die Liste 393 zeigte.
   *
   * ⚠ Die Zahl MUSS im Modul liegen, nicht hier: der Tab zeigt sie, bevor er
   * geoeffnet wird — dann gibt es diese Komponente noch gar nicht.
   */
  rows: ElternRow[];
  /** Nach einer Aktion, die Zeilen entfernt: laesst das Modul neu laden. */
  onNeuLaden?: (() => void) | null;
}

export function ElternListView({
  sb, vereinId, account, isAdmin = false,
  onNavToMember = null, onOeffnen = null,
  onMitgliedWerden = null, onArtAendern = null,
  onLoeschen = null, rows, onNeuLaden = null,
}: ElternListViewProps) {
  const [confirm, confirmDialog] = useConfirm();
  const [expandedKinder, setExpandedKinder] = useState<Set<string>>(new Set());

  const alleTeams = [...new Set(rows.flatMap(r => r.teams))].sort();

  const filterDefs = buildFilterDefs(rows, [
    /* ⚠ „Art" aus den DATEN, nicht als feste Liste: kommt eine Art dazu,
       steht sie hier von selbst. Eine aufgezaehlte Liste veraltete mit der
       naechsten Migration — am 22.08.2026 kam eine Art dazu und verschwand
       noch am selben Tag wieder. */
    { key:"art",       label:"Art" },
    { key:"beziehung", label:"Beziehung" },
    { key:"portal",    label:"Portal", vals:["Aktiv","Kein Zugang"] },
    { key:"teams",     label:"Team",   vals:alleTeams },
    { key:"wohnort",   label:"Wohnort" },
    { key:"geschlecht",label:"Geschlecht" },
  ]);

  function filterEltern(elternRows: ElternRow[], search: string): ElternRow[] {
    if (!search) return elternRows;
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    return elternRows.filter(e => {
      const haystack = [
        e.name, e.vorname, e.nachname,
        e.email, e.telefon, e.beziehung,
        e.kind_name,
        ...e.kinder.map(k => k.name),
        ...e.teams,
      ].join(" ").toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }

  const renderCell = makeElternRenderCell({ expandedKinder, setExpandedKinder, onNavToMember, onOeffnen });

  async function loeschen(selected: Set<RowId>) {
    if (!selected?.size) return;
    const namen = [...selected].map(id => rows.find(r => r.id === id)?.name).filter(Boolean);
    const ok = await confirm({
      title: `${selected.size} Elternkontakte entfernen?`,
      message: `Die Verknüpfungen zu allen Kindern werden getrennt: ${namen.join(", ")}. Die Personen selbst bleiben bestehen — sie sind womöglich auch Mitglieder.`,
      danger: true, confirmLabel: "Entfernen",
    });
    if (!sb || !ok) return;
    for (const id of selected) await entferneElternVerknuepfung(sb, String(id));
    /* ⚠ NEU LADEN, NICHT LOKAL WEGRAEUMEN. Bis zum 25.08.2026 stand hier
       `setRows(prev => prev.filter(...))`. Die Zeilen verschwanden dann aus
       DIESER Liste, und die Zahl im Tab wusste nichts davon — 393 gegen 395.
       Der Zustand liegt jetzt im Modul; wer ihn aendert, sagt es dorthin. */
    if (onNeuLaden) onNeuLaden();
  }

  return (
    <>
      {confirmDialog}
      <ListView<ElternRow>
        emptyIcon="heart"
        emptyTitle="Noch keine Elternkontakte"
        emptySubtitle="Elternkontakte werden beim Mitglied erfasst."
        rows={rows}
        filterFn={(elternRows, search, filterVals) => {
          let result = filterEltern(elternRows, search);
          const teamVals: string[] = Array.isArray(filterVals["teams"]) ? filterVals["teams"] : [];
          if (teamVals.length > 0) {
            result = result.filter(r => r.teams.some(t => teamVals.includes(t)));
          }
          return result;
        }}
        colDefs={COL_DEFS}
        colGroups={COL_GROUPS}
        defaultCols={COL_DEFS.filter(c => c.default).map(c => c.key)}
        /* ⚠ Dieselbe Sortierung wie die Mitgliederliste. Ohne `sortFn` fiel
           `sortiereMehrstufig` auf einen reinen `localeCompare` des Rohwerts
           zurück — bei „Alter" und „Geburtsdatum" also auf eine
           Zeichenkettensortierung. */
        sortFn={(rows, key, dir) => sortMembers(rows as never, key, dir) as never}
        filterDefs={filterDefs}
        groupOptions={GROUP_OPTIONS}
        buildGroupsFn={buildElternGroups}
        renderCell={renderCell}
        sb={sb}
        account={account}
        vereinId={vereinId}
        viewTyp="eltern"
        isAdmin={isAdmin}
        selectable={isAdmin}
        /* ⚠ KEIN „Löschen". Eine Person zu löschen ist Etappe 3 — und ein
           Knopf, der die Verknüpfung kappt und die Person stehen lässt,
           hiesse „Löschen" und täte etwas anderes. Genau die Sorte
           Beschriftung, die am 22.08.2026 beim Archiv berichtigt wurde. */
        bulkActions={isAdmin ? [
          { icon:"user-plus", label:"Mitglied werden", requiresSelection:true,
            hidden: !onMitgliedWerden,
            onClick: (sel: Set<RowId>) => onMitgliedWerden?.([...sel].map(String)) },
          { icon:"bookmark", label:"Art ändern", requiresSelection:true,
            hidden: !onArtAendern,
            onClick: (sel: Set<RowId>) => onArtAendern?.([...sel].map(String)) },
          { icon:"unlink", label:"Entfernen", danger:true, requiresSelection:true, onClick:loeschen },
          /* ⚠ „Entfernen" kappt die VERKNUEPFUNG, „Person löschen" entfernt den
             MENSCHEN. Zwei Knoepfe nebeneinander, deren Namen sich aehneln und
             deren Wirkung nicht — deshalb steht die Folge im Namen und nicht
             nur im Symbol. */
          { icon:"trash", label:"Person löschen (DSGVO)", danger:true, requiresSelection:true,
            hidden: !onLoeschen,
            onClick: (sel: Set<RowId>) => onLoeschen?.([...sel].map(id => ({
              id: String(id),
              name: rows.find(r => String(r.id) === String(id))?.name || "?",
            }))) },
        ].filter(a => !a.hidden) : []}
        footerLabel={(f,t) => `${f} von ${t} Einträgen`}
        renderMobile={e => (
          <div key={e.id} className="cc-members-item" onClick={()=>onOeffnen?.(e)}>
            <Av name={e.name||"?"} size={38}/>
            <div className="cc-members-item-body">
              <div className="cc-text-bold">{e.name}</div>
              <div className="cc-members-item-chips">
                <span className="cc-role-chip cc-role-chip-sm">{e.art}</span>
                {e.beziehung && <span className="cc-members-td-sub">{e.beziehung}</span>}
              </div>
              <div className="cc-members-td-sub">{e.kind_name}</div>
            </div>
          </div>
        )}
        exportFn={(rows,cols,groups,format) => exportListData(rows,cols,groups,format,{filename:"eltern",sheetName:"Eltern"})}
        exportFormats={[
          {label:"E-Mail-Liste als CSV (flach)",        format:"csv"},
          {label:"E-Mail-Liste als CSV (mit Gruppen)",  format:"csv-gruppen"},
          {label:"Excel (pro Gruppe ein Sheet)",         format:"excel-sheets", icon:"table"},
        ]}
      />

    </>
  );
}
