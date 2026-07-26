/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/personTypes.ts
   Normalisiert Supabase-Zeilen zu einheitlichem Person-Objekt
   ═══════════════════════════════════════════════════════════════ */
import { vollname, initials, age } from './personUtils.ts';

export interface Person {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  geburtsdatum: string | null;
  nationalitaet: string;
  nationalitaet2: string | null;
  heimatort: string;
  /* DB-Spalte ist ein freier String; die App kennt m/w/d */
  geschlecht: string | null;
  strasse: string;
  plz: string;
  ort: string;
  kanton: string;
  land: string;
  fotoUrl: string | null;
  spielerpass: string;
  jsNr: string;
  ahvNr: string | null;
  fairgateId: string;
  mitgliedtyp: string | null;
  rolle: string | null;
  funktionen: unknown[];
  aktiv: boolean;
  notizen: string | null;
  // Computed
  name: string;
  initials: string;
  age: number | null;
}

/* Eingabeform von toPerson. Deckt sowohl die Spalten aus mitglieder als
   auch die abweichenden Feldnamen ab, die ältere Aufrufer liefern
   (firstName, dob, tel, street, city, pass, js, fairgate, avatar_url).
   Dadurch braucht die Normalisierung unten keine Type Assertions. */
export interface PersonInput {
  id: number;
  vorname?: string | null;
  firstName?: string | null;
  nachname?: string | null;
  lastName?: string | null;
  email?: string | null;
  telefon?: string | null;
  tel?: string | null;
  geburtsdatum?: string | null;
  dob?: string | null;
  nationalitaet?: string | null;
  nat?: string | null;
  nationalitaet2?: string | null;
  heimatort?: string | null;
  geschlecht?: string | null;
  strasse?: string | null;
  street?: string | null;
  plz?: string | null;
  ort?: string | null;
  city?: string | null;
  kanton?: string | null;
  land?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  spielerpass?: string | null;
  pass?: string | null;
  js_nr?: string | null;
  js?: string | null;
  ahv_nr?: string | null;
  fairgate_id?: string | null;
  fairgate?: string | null;
  mitgliedtyp?: string | null;
  rolle?: string | null;
  funktionen?: unknown[] | null;
  aktiv?: boolean | null;
  notizen?: string | null;
}

export function toPerson(raw: PersonInput | null | undefined): Person | null {
  if (!raw) return null;
  const m: Person = {
    id:             raw.id,
    vorname:        raw.vorname || raw.firstName || '',
    nachname:       raw.nachname || raw.lastName || '',
    email:          raw.email || '',
    telefon:        raw.telefon || raw.tel || '',
    geburtsdatum:   raw.geburtsdatum || raw.dob || null,
    nationalitaet:  raw.nationalitaet || raw.nat || '',
    nationalitaet2: raw.nationalitaet2 || null,
    heimatort:      raw.heimatort || '',
    geschlecht:     raw.geschlecht || null,
    strasse:        raw.strasse || raw.street || '',
    plz:            raw.plz || '',
    ort:            raw.ort || raw.city || '',
    kanton:         raw.kanton || '',
    land:           raw.land || '',
    fotoUrl:        raw.foto_url || raw.avatar_url || null,
    spielerpass:    raw.spielerpass || raw.pass || '',
    jsNr:           raw.js_nr || raw.js || '',
    ahvNr:          raw.ahv_nr || null,
    fairgateId:     raw.fairgate_id || raw.fairgate || '',
    mitgliedtyp:    raw.mitgliedtyp || null,
    rolle:          raw.rolle || null,
    funktionen:     raw.funktionen || [],
    aktiv:          raw.aktiv !== false,
    notizen:        raw.notizen || null,
    name:           '',
    initials:       '',
    age:            null,
  };
  m.name     = vollname(m);
  m.initials = initials(m);
  m.age      = age(m.geburtsdatum);
  return m;
}
