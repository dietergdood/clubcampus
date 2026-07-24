/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberMapper.ts
   Rohe DB-Mitglieder in UI-Objekte transformieren
   ═══════════════════════════════════════════════════════════════ */
import type { Mitglied, PortalRolle } from "../../types.ts";

/* ⚠ geprueft, eintrittsdatum und teams haben KEINE Spalte in mitglieder
   und sind auch keine der von loadDbMitglieder ergänzten Felder. Der Code
   unten liest sie trotzdem; sie sind zur Laufzeit immer undefined.
   Siehe offene Punkte der Migration. */
interface MitgliedRoh extends Mitglied {
  geprueft?: boolean;
  eintrittsdatum?: string | null;
  teams?: string[];
}

export interface KaderRolleOption {
  name: string;
  label?: string | null;
}

export function mapMembers(
  dbMitglieder: MitgliedRoh[],
  dbPortalRollen: Pick<PortalRolle, "name" | "label">[],
  _dbKaderRollen?: KaderRolleOption[],
) {
  const ROLLE_LABEL: Record<string, string> = Object.fromEntries([
    ...dbPortalRollen.map(r=>[r.name,r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]);
  return dbMitglieder.map(m => {
    const rollenSet=new Set<string>();
    (m.kader_rollen||[]).forEach(r=>rollenSet.add(ROLLE_LABEL[r]||r));
    if(rollenSet.size===0&&m.rolle&&m.rolle!=="-") rollenSet.add(ROLLE_LABEL[m.rolle]||m.rolle);
    const portalStatus=m.hat_portal_zugang?"Aktiv":(m.hat_benutzer?"Deaktiviert":"Kein Zugang");
    const dpStatus=(!m.datenstatus||m.datenstatus==="Vollstandig"||m.datenstatus==="Vollständig"||m.datenstatus==="geprüft"||m.datenstatus==="Geprueft")&&m.geprueft===true?"Geprueft":m.geprueft===false||!m.geprueft?"Ausstehend":m.datenstatus||"Ausstehend";
    return {
      id:m.id,
      name:(`${m.vorname||""} ${m.nachname||""}`).trim()||"?",
      vorname:m.vorname, nachname:m.nachname,
      mitgliedschaft:m.mitgliedtyp||"-", type:m.mitgliedtyp||"-",
      rollen:[...rollenSet], kader_rollen_raw:m.kader_rollen||[], kader_eintraege:m.kader_eintraege||[],
      role:m.rolle||"-",
      teams:m.kader_teams&&m.kader_teams.length>0?m.kader_teams.map(t=>typeof t==="object"?t:{name:t,kurz:t}):(m.teams||[]).map(t=>({name:t,kurz:t})),
      team:(m.teams||[]).join(", ")||"-",
      datenpruefung:dpStatus, status:m.datenstatus||"Ausstehend",
      portal:portalStatus, hat_portal_zugang:m.hat_portal_zugang, hat_benutzer:m.hat_benutzer,
      ort:m.ort||"-", location:m.ort||"-", plz:m.plz||null,
      wohnort:m.plz&&m.ort?`${m.plz} ${m.ort}`:(m.ort||null),
      email:m.email, telefon:m.telefon, geburtsdatum:m.geburtsdatum,
      alter:m.geburtsdatum?Math.floor((Date.now()-new Date(m.geburtsdatum).getTime())/(365.25*24*3600*1000)):null,
      geschlecht:m.geschlecht||null,
      nationalitaet:m.nationalitaet||"-", nationalitaet2:m.nationalitaet2||null,
      position:m.position, fairgate_id:m.fairgate_id, js_nr:m.js_nr,
      spielerpass:m.spielerpass, eintritt:m.eintrittsdatum, rueckennr:m.rueckennr,
      foto_url:m.foto_url||null, funktionen:m.funktionen||[],
      strasse:m.strasse, heimatort:m.heimatort, ahv_nr:m.ahv_nr,
    };
  });
}

/* Ergebnisform von mapMembers — direkt abgeleitet, damit sie nicht
   auseinanderlaufen kann. */
export type MappedMember = ReturnType<typeof mapMembers>[number];

/* Was MitgliederModul daraus macht: funktionsgruppen wird dort aus
   funktionen + funktionenGruppenMap nachgereicht. */
export interface MemberRow extends MappedMember {
  funktionsgruppen?: string[];
}

/* Dynamischer Feldzugriff (Filter, Gruppierung, Export lesen Spalten über
   ihren Key). Über Object.entries statt Index-Zugriff, damit es ohne Cast
   auf einem Interface-Typ funktioniert. */
export function memberFeld(m: MemberRow, key: string): unknown {
  for (const [k, v] of Object.entries(m)) if (k === key) return v;
  return undefined;
}
