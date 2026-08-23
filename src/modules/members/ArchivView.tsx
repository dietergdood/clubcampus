/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ArchivView.tsx
   Archiv-Tab — nutzt zentrale ListView
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Av, useConfirm, EmptyState } from "../../theme.ts";
import { setzeOffenePunkte } from "../../domains/person/offenePunkteService.ts";
import { TI } from "../../icons.tsx";
import { reaktiviereMitglied, deleteMitglied, fetchArchiv } from "../../domains/members/memberService.ts";
import { ListView } from "../../shared/list/ListView.tsx";
import { sortMembers } from "./memberDataUtils.ts";
import { exportListData, buildFilterDefs } from "../../shared/list/exportUtils.ts";
import { formatDatum } from "../../domains/person/personUtils.ts";
import type { ColDef, ColGroup, GroupOption, ListGroup, ListRow, RowId } from "../../shared/list/types.ts";
import type { Account, Sb, SetState } from "../../types.ts";

/* Archivierte Mitglieder kommen aus fetchArchiv — nur eine Teilauswahl
   der Spalten, deshalb direkt vom Service abgeleitet. */
type ArchivMitglied = Awaited<ReturnType<typeof fetchArchiv>>[number];

const COL_DEFS: ColDef[] = [
  { key:"name",           label:"Name",          default:true, alwaysOn:true },
  /* Standardmässig aus — "Name" fasst beide zusammen. Einblendbar für
     Sortierung nach Nachname und für den Export. */
  { key:"vorname",        label:"Vorname",       default:false },
  { key:"nachname",       label:"Nachname",      default:false },
  { key:"mitgliedtyp",    label:"Mitgliedschaft", default:true },
  { key:"deaktiviert_am", label:"Archiviert am",  default:true },
  { key:"deaktiviert_von",label:"Archiviert von", default:true },
  /* ⚠ Der Vermerk steht als SPALTE, nicht nur im Profil. Wer die Liste
     oeffnet, liest die Gruende, ohne zu fragen — das ist die Deckung dafuer,
     dass ein Freitextfeld nicht zum toten Schalter wird. */
  { key:"offene_punkte",  label:"Offene Punkte",  default:true },
  { key:"actions",        label:"",               default:true, alwaysOn:true },
];

const COL_GROUPS: ColGroup[] = [{ group:"Archiv", cols:COL_DEFS.filter(c=>c.key!=="actions") }];

const GROUP_OPTIONS: GroupOption[] = [
  { val:"mitgliedtyp",     label:"Mitgliedschaft"     },
  { val:"deaktiviert_von", label:"Archiviert von"     },
  { val:"deaktiviert_am",  label:"Archiviert im Jahr" },
];

function mapArchivRow(m: ArchivMitglied) {
  return {
    id:                 m.id,
    name:               `${m.vorname||""} ${m.nachname||""}`.trim(),
    /* Einzeln mitgeführt, damit nach Nachname sortiert und gefiltert
       werden kann — "name" beginnt mit dem Vornamen. */
    vorname:            m.vorname||"",
    nachname:           m.nachname||"",
    mitgliedtyp:        m.mitgliedtyp||"—",
    deaktiviert_am:     m.deaktiviert_am ? String(new Date(m.deaktiviert_am).getFullYear()) : "—",
    deaktiviert_am_fmt: formatDatum(m.deaktiviert_am),
    deaktiviert_von:    m.deaktiviert_von||"—",
    person_id:          m.person_id||"",
    offene_punkte:      m.offene_punkte||"",
    _raw:               m,
  };
}

/* Aus mapArchivRow abgeleitet, damit die Zeilenform nicht auseinanderläuft.
   Der Schnitt mit ListRow liefert die Index-Signatur, die ListView (T extends
   ListRow) verlangt und die renderCell für m[col.key] braucht. */
type ArchivRow = ListRow & ReturnType<typeof mapArchivRow>;

// buildGroupsFn nur für deaktiviert_am (Jahr) nötig — Rest via Default
function buildArchivGroups(
  rows: ArchivRow[],
  groupBy: string[] | string,
  groupOrder?: Record<string, string[]>,
): ListGroup<ArchivRow>[] {
  const levels = Array.isArray(groupBy) ? groupBy : [groupBy];
  const firstLevel = levels[0] || "none";
  const restLevels = levels.slice(1);
  if (!firstLevel || firstLevel === "none") return [{ key:"__all", label:"", type:"none", members:rows, children:null }];
  const map: Record<string, ArchivRow[]> = {};
  rows.forEach(r => {
    const k = firstLevel === "deaktiviert_am" ? r.deaktiviert_am : String(r[firstLevel] || "—");
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  const orderForLevel = groupOrder?.[firstLevel];
  let entries = Object.entries(map);
  if (orderForLevel?.length) {
    entries = entries.sort(([a],[b]) => {
      const ai = orderForLevel.indexOf(a), bi = orderForLevel.indexOf(b);
      if (ai === -1 && bi === -1) return String(a).localeCompare(String(b), "de");
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    entries = entries.sort(([a],[b]) => String(a).localeCompare(String(b), "de"));
  }
  return entries.map(([k, members]) => ({
    key: k, label: k, type: "none", members,
    children: restLevels.length > 0 && restLevels[0] !== "none"
      ? buildArchivGroups(members, restLevels, groupOrder)
      : null,
  }));
}

interface ArchivViewProps {
  archivData: ArchivMitglied[];
  setArchivData: SetState<ArchivMitglied[]>;
  archivLoaded: boolean;
  sb: Sb;
  /* Setzt den Portal-Zugang beim Reaktivieren wieder aktiv */
  onUpdatePortalZugang?: ((mitgliedId: number, aktiv: boolean) => Promise<void> | void) | null;
  onReload?: (() => void) | null;
  onOpenMember?: ((m: ArchivMitglied) => void) | null;
  /* ⚠ Fuer gespeicherte Ansichten. Bis zum 22.08.2026 fehlten sie hier als
     einziger der vier Listen — nicht aus einem Grund, sondern weil niemand
     hinsah. Der Vorrat ist ueber `viewTyp` getrennt: eine Ansicht mit
     „Archiviert am" ergibt in der Mitgliederliste nichts. */
  account?: Account | null;
  vereinId?: string | null;
  isAdmin?: boolean;
}

export function ArchivView({ archivData, setArchivData, archivLoaded, sb, onUpdatePortalZugang, onReload, onOpenMember, account = null, vereinId = null, isAdmin = false }: ArchivViewProps) {
  const [confirm, confirmDialog] = useConfirm();
  const rows: ArchivRow[] = (archivData || []).map(mapArchivRow);

  /* ⚠ Nur ENTFERNEN, nicht setzen. Setzen verlangt einen Text und bleibt
     deshalb im Profil; „Erledigt" braucht keinen und gehoert dorthin, wo man
     die Liste durchgeht. Ohne diesen Knopf waeren fuenf abgehakte Punkte
     fuenf Profilaufrufe. */
  const [erledigtLaeuft, setErledigtLaeuft] = useState<string | null>(null);

  async function erledige(personId: string, name: string) {
    const ok = await confirm({
      title: `Vermerk bei ${name} entfernen?`,
      message: "Der Vermerk wird entfernt. Die Person bleibt, wo sie ist.",
      confirmLabel: "Erledigt",
    });
    if (!ok || !sb) return;
    setErledigtLaeuft(personId);
    const { ok: erfolg, fehler } = await setzeOffenePunkte(sb, personId, null);
    setErledigtLaeuft(null);
    if (!erfolg) { console.error("erledige:", fehler); return; }
    /* Die Zeile bleibt in der Liste, bis der Aufrufer neu laedt — sonst
       verschwaende sie unter der Hand und man saehe nicht, was man getan hat. */
    if (onReload) onReload();
  }

  async function reaktivieren(selected: Set<RowId>) {
    if (!selected?.size) return;
    const ok = await confirm({ title:`${selected.size} Mitglieder reaktivieren?`, confirmLabel:"Reaktivieren" });
    if (!sb || !ok) return;
    for (const id of selected) {
      await reaktiviereMitglied(sb, Number(id));
      if (onUpdatePortalZugang) await onUpdatePortalZugang(Number(id), true);
    }
    setArchivData(prev => prev.filter(m => !selected.has(m.id)));
    if (onReload) onReload();
  }

  async function loeschen(selected: Set<RowId>) {
    if (!selected?.size) return;
    const ok = await confirm({ title:`${selected.size} Mitgliedschaften löschen?`, message:"Die Mitgliedschaft samt Kadereinträgen, Notizen und Verlauf wird entfernt. Die Person bleibt mit Namen, Adresse und Konto bestehen — sie zu löschen ist eine eigene Aktion.", danger:true, confirmLabel:"Löschen" });
    if (!sb || !ok) return;
    for (const id of selected) await deleteMitglied(sb, Number(id));
    setArchivData(prev => prev.filter(m => !selected.has(m.id)));
    if (onReload) onReload();
  }

  const filterDefs = buildFilterDefs(rows, [
    { key:"mitgliedtyp",     label:"Mitgliedschaft" },
    { key:"deaktiviert_von", label:"Archiviert von" },
  ]);

  function renderCell(col: ColDef, m: ArchivRow) {
    switch(col.key) {
      case "name":
        return <td key="name" className="cc-members-td">
          <div className="cc-row cc-gap-8">
            <Av name={m.name||"?"} size={26}/>
            <span className="cc-text-bold cc-members-name-link" onClick={e=>{e.stopPropagation();onOpenMember&&onOpenMember(m._raw);}}>{m.name}</span>
          </div>
        </td>;
      case "deaktiviert_am":
        return <td key="deaktiviert_am" className="cc-members-td cc-members-td-sub">{m.deaktiviert_am_fmt}</td>;
      case "offene_punkte":
        /* Ein leerer Vermerk ist kein Fehler — er heisst „nichts offen". */
        return <td key="offene_punkte" className="cc-members-td">
          {m.offene_punkte || <span className="cc-text-muted">—</span>}
        </td>;
      case "actions":
        return <td key="actions" className="cc-members-td cc-text-right">
          <div className="cc-row cc-gap-6" onClick={e=>e.stopPropagation()}>
            {/* ⚠ „Erledigt" GEHOERT IN DIE LISTE, nicht nur ins Profil.
                Stuende es nur dort, waeren fuenf abgehakte Punkte fuenf
                Profilaufrufe — und die Sammelaktion, die wir bewusst nicht
                gebaut haben, waere doch wieder noetig. Setzen verlangt einen
                Text und bleibt deshalb im Profil; ENTFERNEN braucht keinen
                und kann hier stehen. (Didi, 23.08.2026.) */}
            {m.offene_punkte && m.person_id && (
              <Btn small disabled={erledigtLaeuft===m.person_id}
                   onClick={()=>erledige(m.person_id, m.name)}>
                <TI n="check" size={13}/> {erledigtLaeuft===m.person_id ? "…" : "Erledigt"}
              </Btn>
            )}
            <Btn small onClick={()=>reaktivieren(new Set([m.id]))}><TI n="user-check" size={13}/> Reaktivieren</Btn>
            <Btn small variant="danger" onClick={()=>loeschen(new Set([m.id]))}><TI n="trash" size={13}/></Btn>
          </div>
        </td>;
      default:
        return <td key={col.key} className="cc-members-td cc-members-td-sub">{String(m[col.key]||"—")}</td>;
    }
  }

  return (
    <>
      {confirmDialog}
      <div className="cc-info-box cc-info-box-warn cc-mb-16">
        <TI n="info-circle" size={15}/> Archivierte Mitglieder — Daten sind noch vorhanden und können reaktiviert werden.
      </div>
      {!archivLoaded ? (
        <EmptyState icon="loader" title="Wird geladen…"/>
      ) : (
        <ListView<ArchivRow>
          rows={rows}
          buildGroupsFn={buildArchivGroups}
          colDefs={COL_DEFS}
          colGroups={COL_GROUPS}
          defaultCols={COL_DEFS.map(c=>c.key)}
          filterDefs={filterDefs}
          groupOptions={GROUP_OPTIONS}
          renderCell={renderCell}
          /* ⚠ Dieselbe Sortierung wie die anderen Listen. Ohne `sortFn` fiel
             `sortiereMehrstufig` auf einen `localeCompare` des Rohwerts
             zurueck — „Archiviert am" waere als Zeichenkette sortiert
             worden, und das faellt bei ISO-Daten zufaellig richtig aus. */
          sortFn={(rows, key, dir) => sortMembers(rows as never, key, dir) as never}
          sb={sb}
          account={account}
          vereinId={vereinId}
          viewTyp="archiv"
          isAdmin={isAdmin}
          selectable
          bulkActions={[
            { icon:"user-check", label:"Reaktivieren", requiresSelection:true, onClick:reaktivieren },
            { icon:"trash", label:"Mitgliedschaft löschen", danger:true, requiresSelection:true, onClick:loeschen },
          ]}
          exportFn={(rows,cols,groups,format) => exportListData(rows,cols,groups,format,{
            filename:"archiv", sheetName:"Archiv",
            getCellValue:(col,row) => col.key==="deaktiviert_am" ? row.deaktiviert_am_fmt : col.key==="actions" ? "" : String(row[col.key]||""),
          })}
          exportFormats={[
            {label:"Als CSV (flach)",        format:"csv"},
            {label:"Als CSV (mit Gruppen)",  format:"csv-gruppen"},
            {label:"Excel (pro Gruppe)",     format:"excel-sheets", icon:"table"},
          ]}
          footerLabel={(f,t) => `${f} von ${t} archivierten Mitgliedern`}
        />
      )}
    </>
  );
}
