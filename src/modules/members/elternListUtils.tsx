/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/elternListUtils.tsx
   Hilfsfunktionen für ElternListView: Mapping, Gruppierung, RenderCell
   ═══════════════════════════════════════════════════════════════ */
import { Av } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { fetchAlleElternkontakte } from "../../domains/members/memberService.ts";
import type { ColDef, GroupContext, ListGroup, ListRow } from "../../shared/list/types.ts";
import { bestimmendeArt } from "../../domains/person/personArtService.ts";
import type { SetState } from "../../types.ts";

/* ── Typen ── */
type ElternkontaktRoh = Awaited<ReturnType<typeof fetchAlleElternkontakte>>[number];
type KindVerknuepfung = ElternkontaktRoh["_alle_kinder"][number];

export interface KindTeamRolle {
  team: string;
  rolle: string;
}

export interface KindMitTeams {
  name: string;
  teams: string[];
  teamRollen: KindTeamRolle[];
  mitglied_id: number;
}

export interface ElternRenderCellDeps {
  expandedKinder: Set<string>;
  setExpandedKinder: SetState<Set<string>>;
  onNavToMember?: ((id: number) => void) | null;
  /** Klick auf den Namen — oeffnet die Personenseite. Hiess bis zum
      21.08.2026 `onEditKontakt` und oeffnete ein Bearbeiten-Modal. */
  onOeffnen?: ((row: ElternRow) => void) | null;
}

/* ── Mapping ── */
export function getKinderMitTeams(alleKinder: KindVerknuepfung[]): KindMitTeams[] {
  return (alleKinder||[]).map(k => {
    const m = k.mitglieder;
    const name = m ? `${m.vorname||""} ${m.nachname||""}`.trim() : "?";
    const kaderArr = Array.isArray(m?.kader) ? m.kader : (m?.kader ? [m.kader] : []);
    const teamRollen: KindTeamRolle[] = kaderArr
      .filter(ka => ka.aktiv === true)
      .map(ka => {
        const tArr = Array.isArray(ka.teams) ? ka.teams : (ka.teams ? [ka.teams] : []);
        const t = tArr[0] as {kurzname?: string | null; name?: string} | undefined;
        const team = t?.kurzname || t?.name || "";
        const rollen = Array.isArray(ka.rollen) ? ka.rollen as string[] : (ka.rollen ? [String(ka.rollen)] : []);
        const rolle = rollen[0] || "";
        return { team, rolle };
      })
      .filter((tr: KindTeamRolle) => Boolean(tr.team));
    const teams = teamRollen.map(tr => tr.team);
    return { name, teams, teamRollen, mitglied_id: k.mitglied_id };
  });
}

export function mapEltern(raw: ElternkontaktRoh[] | null | undefined) {
  return (raw||[]).map(e => {
    const kinder = getKinderMitTeams(e._alle_kinder||[]);
    const alleTeams = [...new Set(kinder.flatMap(k => k.teams))];
    return {
      id:          e.id,
      mitglied_id: e.mitglied_id,
      name:        `${e.vorname||""} ${e.nachname||""}`.trim()||e.name||"—",
      vorname:     e.vorname||"",
      nachname:    e.nachname||"",
      email:       e.email||"",
      telefon:     e.telefon||"",
      beziehung:   e.beziehung||"",
      /* hat_zugang statt benutzer_id: die Sicht portal_zugang ist auch fuer
         Trainer lesbar, die Tabelle benutzer nicht. */
      portal:      e.hat_zugang?"Aktiv":"Kein Zugang",
      benutzer_id: e.benutzer_id||null,
      hauptkontakt:e.hauptkontakt||false,
      kind_id:     kinder[0]?.mitglied_id||null,
      kind_name:   kinder.map(k=>k.name).join(", ")||"—",
      kinder,
      teams:       alleTeams,
      /* ⚠ DIE ART KOMMT AUS DER SICHT, nicht aus einer Rechnung hier.
         Seit dem 22.08.2026 kippt „Elternteil" auf „Ehemaliges Elternteil",
         sobald das letzte Kind austritt. Die Liste selbst nachrechnen zu
         lassen hiesse, in einem Monat eine Zeile auf „ehemalig" und einen
         Chip im Profil auf „Elternteil" zu haben — und niemand wuesste,
         welcher stimmt. Dieselbe Quelle wie `heroChips()`. */
      arten:       e.arten || [],
      art:         bestimmendeArt(e.arten || [])?.name || "—",
      /* Die uebrigen Personenfelder — die Abfrage holt sie seit dem
         22.08.2026 mit, vorher waren es nur Name, E-Mail und Telefon. */
      strasse:     e.strasse||"",
      plz:         e.plz||"",
      ort:         [e.plz, e.ort].filter(Boolean).join(" ")||"",
      wohnort:     e.ort||"",
      geburtsdatum: e.geburtsdatum||null,
      geschlecht:  e.geschlecht||"",
      nationalitaet: e.nationalitaet||"",
      nationalitaet2: e.nationalitaet2||"",
      heimatort:   e.heimatort||"",
      ahv_nr:      e.ahv_nr||"",
      funktionen:  e.funktionen||[],
      role:        e.rolle||null,
      datenpruefung: e.profil_geprueft_at ? "Geprüft" : "Ausstehend",
    };
  });
}

export type ElternRow = ListRow & ReturnType<typeof mapEltern>[number];

/* ── Gruppierung ── */
export function buildElternGroups(rows: ElternRow[], groupBy: string[] | string, groupOrder: Record<string, string[]>): ListGroup<ElternRow>[] {
  const levels = Array.isArray(groupBy) ? groupBy : [groupBy];
  return buildElternLevel(rows, levels, groupOrder, null);
}

function buildElternLevel(
  rows: ElternRow[],
  levels: string[],
  groupOrder: Record<string, string[]>,
  parentCtx: { type: string; key: string } | null
): ListGroup<ElternRow>[] {
  const firstLevel = levels[0];
  const restLevels = levels.slice(1);
  if(!firstLevel || firstLevel === "none") return [{ key:"__all", label:"", type:"none", members:rows, children:null }];

  /* Kind-Gruppierung: nach mitglied_id aufteilen, bei Team-Kontext nur passende Kinder */
  if(firstLevel === "kind_name") {
    const map: Record<string, ElternRow[]> = {};
    rows.forEach(r => {
      const kinder = parentCtx?.type === "team"
        ? r.kinder.filter(k => k.teams.includes(parentCtx.key))
        : r.kinder;
      kinder.forEach(k => {
        const key = String(k.mitglied_id);
        if(!map[key]) map[key] = [];
        if(!map[key].find(x => x.id === r.id)) map[key].push(r);
      });
    });
    const allKinder = rows.flatMap(r => r.kinder);
    const allKeys = Object.keys(map).sort((a,b) => {
      const na = allKinder.find(k=>String(k.mitglied_id)===a)?.name||"";
      const nb = allKinder.find(k=>String(k.mitglied_id)===b)?.name||"";
      return na.localeCompare(nb, "de");
    });
    const orderedKeys = groupOrder[firstLevel]
      ? [...groupOrder[firstLevel].filter(k => allKeys.includes(k)), ...allKeys.filter(k => !groupOrder[firstLevel].includes(k))]
      : allKeys;
    return orderedKeys.map(key => {
      const kindName = allKinder.find(k=>String(k.mitglied_id)===key)?.name||key;
      const members = map[key];
      const ctx = { type: "kind", key };
      return {
        key, label:kindName, type:"kind",
        members: restLevels.length > 0 && restLevels[0] !== "none" ? null : members,
        children: restLevels.length > 0 && restLevels[0] !== "none" ? buildElternLevel(members, restLevels, groupOrder, ctx) : null,
      };
    });
  }

  /* Standard-Gruppierung */
  const map: Record<string, ElternRow[]> = {};
  rows.forEach(r => {
    const val = r[firstLevel];
    const keys = Array.isArray(val) && val.length > 0 ? val.map(v => String(v)) : [String(val ?? "—")];
    keys.forEach(k => {
      if(!map[k]) map[k] = [];
      if(!map[k].find(x => x.id === r.id)) map[k].push(r);
    });
  });

  const groupType = firstLevel === "teams" ? "team" : "none";
  const allKeys = Object.keys(map).sort((a,b) => String(a).localeCompare(String(b), "de"));
  const orderedKeys = groupOrder[firstLevel]
    ? [...groupOrder[firstLevel].filter(k => allKeys.includes(k)), ...allKeys.filter(k => !groupOrder[firstLevel].includes(k))]
    : allKeys;

  return orderedKeys.map(k => {
    const members = map[k];
    const ctx = { type: groupType, key: k };
    return {
      key:k, label:k, type:groupType,
      members: restLevels.length > 0 && restLevels[0] !== "none" ? null : members,
      children: restLevels.length > 0 && restLevels[0] !== "none" ? buildElternLevel(members, restLevels, groupOrder, ctx) : null,
    };
  });
}

/* ── RenderCell ── */
export function makeElternRenderCell({ expandedKinder, setExpandedKinder, onNavToMember, onOeffnen }: ElternRenderCellDeps) {
  return function renderElternCell(col: ColDef, e: ElternRow, groupCtx?: GroupContext) {
    switch(col.key) {
      case "name":
        return <td key="name" className="cc-members-td">
          <div className="cc-row cc-gap-8">
            <Av name={e.name||"?"} size={26}/>
            {onOeffnen
              ? <span className="cc-text-bold cc-members-name-link"
                  onClick={ev=>{ev.stopPropagation();onOeffnen(e);}}>{e.name}</span>
              : <span className="cc-text-bold">{e.name}</span>
            }
          </div>
        </td>;
      case "portal":
        return <td key="portal" className="cc-members-td">
          {e.hat_zugang
            ?<span className="cc-portal-status cc-portal-status-aktiv"><span className="cc-portal-dot"/> Aktiv</span>
            :<span className="cc-portal-status cc-portal-status-kein"><span className="cc-portal-dot"/> Kein Zugang</span>
          }
        </td>;
      case "kind_name": {
        const teamGruppe = groupCtx?.type === "team" ? groupCtx.key : null;
        const kindGruppe = groupCtx?.type === "kind" ? groupCtx.key : null;
        const kinder = kindGruppe
          ? e.kinder.filter(k => String(k.mitglied_id) === kindGruppe)
          : teamGruppe
            ? e.kinder.filter(k => k.teams.includes(teamGruppe))
            : e.kinder;
        const isExp = expandedKinder.has(e.id);
        const visible = isExp ? kinder : kinder.slice(0, 2);
        const rest = kinder.length - 2;
        return <td key="kind_name" className="cc-members-td" onClick={ev=>ev.stopPropagation()}>
          <div className="cc-col cc-gap-4">
            {visible.map((k,i) => {
              const teamRollen = teamGruppe
                ? k.teamRollen.filter(tr => tr.team === teamGruppe)
                : k.teamRollen;
              return (
                <div key={i} className="cc-teams-rollen-row">
                  {onNavToMember
                    ? <button className="cc-eltern-kind-link" onClick={ev=>{ev.stopPropagation();onNavToMember(k.mitglied_id);}}>{k.name}</button>
                    : <span className="cc-teams-rollen-team">{k.name}</span>
                  }
                  {teamRollen.map((tr, j) => (
                    <span key={j}>
                      <span className="cc-teams-rollen-sep">·</span>
                      <span className="cc-teams-rollen-rolle">
                        {tr.team}{tr.rolle && <span className="cc-teams-rollen-klammer"> ({tr.rolle})</span>}
                      </span>
                    </span>
                  ))}
                </div>
              );
            })}
            {rest>0&&(
              <button className="cc-teams-rollen-more" onClick={ev=>{
                ev.stopPropagation();
                setExpandedKinder(prev=>{const n=new Set(prev);n.has(e.id)?n.delete(e.id):n.add(e.id);return n;});
              }}>
                {isExp
                  ?<><TI n="chevron-up" size={10}/>weniger</>
                  :<><TI n="chevron-down" size={10}/>+{rest} weitere</>
                }
              </button>
            )}
          </div>
        </td>;
      }
      case "art": {
        /* ⚠ AUS DER ART, NICHT AUS EINER RECHNUNG. `e.art` kommt aus
           `personenarten_effektiv` — derselben Quelle wie der Chip im
           Profil. Waere hier eine eigene Pruefung „hat das Kind noch eine
           aktive Mitgliedschaft", stuenden Zeile und Chip irgendwann
           auseinander, und niemand wuesste, welcher stimmt. */
        /* ⚠ KEINE NEUE CSS-KLASSE. `cc-role-chip` ist bereits das Muster
           „Statuschip in einer Listenzelle" (Portalrolle). Farblich getrennt
           wird NICHT: die Unterscheidung steht im Wort — „Elternteil" gegen
           „Ehemaliges Elternteil" —, und eine zweite Farbe waere eine
           Aussage, die dasselbe nochmal sagt. Ob es eine eigene Farbe geben
           soll, entscheidet Didi; bis dahin traegt der Text sie. */
        return <td key="art" className="cc-members-td">
          {e.art && e.art !== "—"
            ? <span className="cc-role-chip cc-role-chip-sm">{e.art}</span>
            : <span className="cc-members-td-sub">—</span>}
        </td>;
      }
      case "funktionen":
        return <td key="funktionen" className="cc-members-td cc-members-td-sub">
          {(e.funktionen||[]).join(", ")||"—"}
        </td>;
      case "geburtsdatum":
        return <td key="geburtsdatum" className="cc-members-td cc-members-td-sub">
          {e.geburtsdatum ? new Date(String(e.geburtsdatum)).toLocaleDateString("de-CH") : "—"}
        </td>;
      default:
        return <td key={col.key} className="cc-members-td cc-members-td-sub">{String(e[col.key]||"—")}</td>;
    }
  };
}
