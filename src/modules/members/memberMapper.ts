/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberMapper.ts
   Rohe DB-Mitglieder in UI-Objekte transformieren
   ═══════════════════════════════════════════════════════════════ */
import { vollname, age } from "../../domains/person/personUtils.ts";
import type { Mitglied, PortalRolle } from "../../types.ts";

/* ⚠ eintrittsdatum und teams haben KEINE Spalte in mitglieder und sind auch
   keine der von loadDbMitglieder ergänzten Felder. Der Code unten liest sie
   trotzdem; sie sind zur Laufzeit immer undefined. Siehe offene Punkte. */
interface MitgliedRoh extends Mitglied {
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
    /* Datenprüfung hängt an profil_geprueft_at (seit Session 17). Die alte
       Bedingung prüfte ein Feld `geprueft`, das es in mitglieder nicht gibt —
       dadurch stand hier für jedes Mitglied konstant "Ausstehend".
       datenstatus ist veraltet und wird nicht mehr ausgewertet. */
    const dpStatus=m.profil_geprueft_at?"Geprueft":"Ausstehend";
    return {
      id:m.id,
      name:vollname(m),
      vorname:m.vorname, nachname:m.nachname,
      mitgliedschaft:m.mitgliedtyp||"-", type:m.mitgliedtyp||"-",
      rollen:[...rollenSet], kader_rollen_raw:m.kader_rollen||[], kader_eintraege:m.kader_eintraege||[],
      role:m.rolle||"-",
      teams:m.kader_teams&&m.kader_teams.length>0?m.kader_teams.map(t=>typeof t==="object"?t:{name:t,kurz:t}):(m.teams||[]).map(t=>({name:t,kurz:t})),
      team:(m.teams||[]).join(", ")||"-",
      datenpruefung:dpStatus, status:m.datenstatus||"Ausstehend",
      /* Wird vom Export gelesen und fehlte bisher im UI-Objekt */
      profil_geprueft_at:m.profil_geprueft_at||null,
      portal:portalStatus, hat_portal_zugang:m.hat_portal_zugang, hat_benutzer:m.hat_benutzer,
      ort:m.ort||"-", location:m.ort||"-", plz:m.plz||null,
      wohnort:m.plz&&m.ort?`${m.plz} ${m.ort}`:(m.ort||null),
      email:m.email, telefon:m.telefon, geburtsdatum:m.geburtsdatum,
      alter:age(m.geburtsdatum),
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
/* Type-Alias statt Interface: nur so erfuellt der Typ die Constraint
   T extends ListRow (Index-Signatur) von ListView. */
export type MemberRow = MappedMember & {
  funktionsgruppen?: string[];
};

/* Dynamischer Feldzugriff (Filter, Gruppierung, Export lesen Spalten über
   ihren Key). Über Object.entries statt Index-Zugriff, damit es ohne Cast
   auf einem Interface-Typ funktioniert. */
export function memberFeld(m: MemberRow, key: string): unknown {
  for (const [k, v] of Object.entries(m)) if (k === key) return v;
  return undefined;
}
