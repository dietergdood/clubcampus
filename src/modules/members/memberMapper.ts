/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/memberMapper.ts
   Rohe DB-Mitglieder in UI-Objekte transformieren
   ═══════════════════════════════════════════════════════════════ */
import { vollname, age } from "../../domains/person/personUtils.ts";
import type { KaderRolle, Mitglied, PortalRolle } from "../../types.ts";
/* Die Rohform kommt aus dem Service — modules darf aus domains lesen,
   umgekehrt nicht (Schichtenregel). Sie steht dort, wo sie entsteht. */
import type { SupporterRoh } from "../../domains/members/supporterService.ts";

/* ⚠ eintrittsdatum und teams haben KEINE Spalte in mitglieder und sind auch
   keine der von loadDbMitglieder ergänzten Felder. Der Code unten liest sie
   trotzdem; sie sind zur Laufzeit immer undefined. Siehe offene Punkte. */
interface MitgliedRoh extends Mitglied {
  teams?: string[];
}

/* Verengung von KaderRolle fuer die Anzeige: Name und Beschriftung.
   Siehe KaderRolleMitTrainerFlag in useMemberMeta fuer die andere Sicht. */
export type KaderRolleMitLabel = Pick<KaderRolle, "name"> & {
  label?: string | null;
};

/* Beschriftungen der Portalrollen. Steht hier, weil mapMembers und
   mapSupporter dieselbe Zuordnung brauchen — zwei Kopien liefen auseinander,
   sobald jemand eine Rolle ergaenzt. */
function rolleLabelMap(
  dbPortalRollen: Pick<PortalRolle, "name" | "label">[],
): Record<string, string> {
  return Object.fromEntries([
    ...dbPortalRollen.map(r=>[r.name,r.label]),
    ["administrator","Administrator"],["administration","Verwaltung"],
    ["funktionaer","Funktionär"],["trainer","Trainer/in"],
    ["spieler","Spieler/in"],["eltern","Elternteil"],
    ["mitglied","Mitglied"],["supporter","Supporter"],
  ]);
}

export function mapMembers(
  dbMitglieder: MitgliedRoh[],
  dbPortalRollen: Pick<PortalRolle, "name" | "label">[],
  _dbKaderRollen?: KaderRolleMitLabel[],
) {
  const ROLLE_LABEL = rolleLabelMap(dbPortalRollen);
  return dbMitglieder.map(m => {
    const rollenSet=new Set<string>();
    (m.kader_rollen||[]).forEach(r=>rollenSet.add(ROLLE_LABEL[r]||r));
    if(rollenSet.size===0&&m.rolle&&m.rolle!=="-") rollenSet.add(ROLLE_LABEL[m.rolle]||m.rolle);
    /* Der Portal-Status kommt aus dem Join auf `benutzer`, den useAppData
       ohnehin macht — nicht mehr aus dem Kennzeichen mitglieder.hat_portal_zugang
       (gestrichen in Etappe 6c). Das Kennzeichen war eine Kopie derselben
       Aussage und konnte veralten: Wurde ein Konto ausserhalb des Portals
       geloescht, blieb es auf true stehen. Der Join kann das nicht. */
    const portalStatus=m.hat_benutzer
      ?(m.benutzer_deaktiviert?"Deaktiviert":"Aktiv")
      :"Kein Zugang";
    /* Datenprüfung hängt an profil_geprueft_at (seit Session 17). Die alte
       Bedingung prüfte ein Feld `geprueft`, das es in mitglieder nicht gibt —
       dadurch stand hier für jedes Mitglied konstant "Ausstehend".
       datenstatus ist veraltet und wird nicht mehr ausgewertet. */
    const dpStatus=m.profil_geprueft_at?"Geprueft":"Ausstehend";
    return {
      /* ⚠ id ist der SCHLUESSEL DER ZEILE, nicht die Id der Mitgliedschaft.
         Bis zum Supporter-Rueckbau (20.08.2026) war beides dasselbe, weil
         jede Zeile aus `mitglieder` kam. Ein Supporter hat keine
         Mitgliedschaft und traegt hier seine person_id — deshalb `string |
         number` in MemberRow und deshalb `mitglied_id` daneben.
         Wer eine Mitgliedschaft braucht, liest mitglied_id und prueft auf
         null; der Compiler erzwingt es. Eine uuid, die still an eine Stelle
         flieesst, die eine Zahl erwartet, wuerde niemand bemerken. */
      id:m.id,
      mitglied_id:m.id as number|null,
      person_id:m.person_id ?? null,
      name:vollname(m),
      vorname:m.vorname, nachname:m.nachname,
      mitgliedschaft:m.mitgliedtyp||"-", type:m.mitgliedtyp||"-",
      rollen:[...rollenSet], kader_rollen_raw:m.kader_rollen||[], kader_eintraege:m.kader_eintraege||[],
      role:m.rolle||"-",
      teams:m.kader_teams&&m.kader_teams.length>0?m.kader_teams.map(t=>typeof t==="object"?t:{name:t,kurz:t}):(m.teams||[]).map(t=>({name:t,kurz:t})),
      team:(m.teams||[]).join(", ")||"-",
      datenpruefung:dpStatus,
      /* Wird vom Export gelesen und fehlte bisher im UI-Objekt */
      profil_geprueft_at:m.profil_geprueft_at||null,
      portal:portalStatus, hat_portal_zugang:m.hat_benutzer&&!m.benutzer_deaktiviert, hat_benutzer:m.hat_benutzer,
      ort:m.ort||"-", location:m.ort||"-", plz:m.plz||null,
      wohnort:m.plz&&m.ort?`${m.plz} ${m.ort}`:(m.ort||null),
      email:m.email, telefon:m.telefon, geburtsdatum:m.geburtsdatum,
      alter:age(m.geburtsdatum),
      geschlecht:m.geschlecht||null,
      nationalitaet:m.nationalitaet||"-", nationalitaet2:m.nationalitaet2||null,
      /* position und rueckennr hingen bis Etappe 6b am Mitglied und galten
         damit fuer ALLE Teams — ein Spieler in zwei Mannschaften hatte
         zwangslaeufig dieselbe Position. Sie stehen jetzt an der Kaderzeile
         (`kader.position`, `kader.rueckennr`), pro Team und Saison. */
      fairgate_id:m.fairgate_id, js_nr:m.js_nr,
      spielerpass:m.spielerpass, eintritt:m.eintrittsdatum,
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
   T extends ListRow (Index-Signatur) von ListView.

   `id` wird gegenueber MappedMember GEWEITET: mapMembers liefert immer eine
   Zahl, mapSupporter eine uuid. ListView.getRowId vertraegt beides
   (`typeof id === "number" ? id : String(id)`), braucht aber einen Wert —
   eine Zeile ohne id verliert React-Key, Auswahl und Sammelaktionen. */
export type MemberRow = Omit<MappedMember, "id"> & {
  id: string | number;
  funktionsgruppen?: string[];
};

/* ── Supporter ────────────────────────────────────────────────────────────
   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT (Statuten Artikel 6 —
   siehe migration_supporter_rueckbau.sql). Er steht in `personen`, nicht in
   `mitglieder`, und hat deshalb weder Mitgliedtyp noch Kader, Teams,
   Spielerpass oder Eintrittsdatum.

   Trotzdem eine MemberRow: Suche, Sortierung und Gruppierung laufen ueber
   dieselben Funktionen wie in der Mitgliederliste (`filterMembers`,
   `sortMembers`, `buildGroups`). Ein zweiter Satz waere ein zweiter Ort, an
   dem dieselbe Mechanik auseinanderlaufen kann. Was ein Supporter nicht hat,
   steht hier leer — nicht falsch. */
export function mapSupporter(
  rohe: SupporterRoh[],
  dbPortalRollen: Pick<PortalRolle, "name" | "label">[],
): MemberRow[] {
  const ROLLE_LABEL = rolleLabelMap(dbPortalRollen);
  return rohe.map(p => ({
    /* Der Schluessel ist die person_id — und mitglied_id bleibt null, weil
       es keine Mitgliedschaft gibt. Genau das ist die Aussage. */
    id: p.id,
    mitglied_id: null,
    person_id: p.id,
    name: vollname(p),
    vorname: p.vorname,
    nachname: p.nachname,
    /* Kein Mitgliedtyp. "-" statt "Supporter": ein Supporter IST kein
       Mitgliedtyp mehr, und ein erfundener Wert wuerde in Filter, Gruppierung
       und Export wieder wie eine Mitgliedschaft aussehen. */
    mitgliedschaft: "-",
    type: "-",
    rollen: p.rolle ? [ROLLE_LABEL[p.rolle] || p.rolle] : [],
    kader_rollen_raw: [],
    kader_eintraege: [],
    role: p.rolle || "-",
    teams: [],
    team: "-",
    datenpruefung: p.profil_geprueft_at ? "Geprueft" : "Ausstehend",
    profil_geprueft_at: p.profil_geprueft_at || null,
    portal: p.hat_benutzer ? (p.benutzer_deaktiviert ? "Deaktiviert" : "Aktiv") : "Kein Zugang",
    hat_portal_zugang: Boolean(p.hat_benutzer && !p.benutzer_deaktiviert),
    hat_benutzer: p.hat_benutzer,
    ort: p.ort || "-",
    location: p.ort || "-",
    plz: p.plz || null,
    wohnort: p.plz && p.ort ? `${p.plz} ${p.ort}` : (p.ort || null),
    email: p.email,
    telefon: p.telefon,
    geburtsdatum: p.geburtsdatum,
    alter: age(p.geburtsdatum),
    geschlecht: p.geschlecht || null,
    nationalitaet: p.nationalitaet || "-",
    nationalitaet2: p.nationalitaet2 || null,
    /* Gibt es bei einem Supporter nicht — sie haengen an der Mitgliedschaft. */
    fairgate_id: null,
    js_nr: null,
    spielerpass: null,
    eintritt: null,
    foto_url: p.foto_url || null,
    funktionen: p.funktionen || [],
    strasse: p.strasse,
    heimatort: p.heimatort,
    ahv_nr: p.ahv_nr,
  }));
}

/* Dynamischer Feldzugriff (Filter, Gruppierung, Export lesen Spalten über
   ihren Key). Über Object.entries statt Index-Zugriff, damit es ohne Cast
   auf einem Interface-Typ funktioniert. */
export function memberFeld(m: MemberRow, key: string): unknown {
  for (const [k, v] of Object.entries(m)) if (k === key) return v;
  return undefined;
}
