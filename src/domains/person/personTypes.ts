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
  geschlecht: 'm' | 'w' | 'd' | null;
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

export function toPerson(raw: Record<string, unknown> | null | undefined): Person | null {
  if (!raw) return null;
  const m = {
    id:             raw.id as number,
    vorname:        (raw.vorname || raw.firstName || '') as string,
    nachname:       (raw.nachname || raw.lastName || '') as string,
    email:          (raw.email || '') as string,
    telefon:        (raw.telefon || raw.tel || '') as string,
    geburtsdatum:   (raw.geburtsdatum || raw.dob || null) as string | null,
    nationalitaet:  (raw.nationalitaet || raw.nat || '') as string,
    nationalitaet2: (raw.nationalitaet2 || null) as string | null,
    heimatort:      (raw.heimatort || '') as string,
    geschlecht:     (raw.geschlecht || null) as 'm' | 'w' | 'd' | null,
    strasse:        (raw.strasse || raw.street || '') as string,
    plz:            (raw.plz || '') as string,
    ort:            (raw.ort || raw.city || '') as string,
    kanton:         (raw.kanton || '') as string,
    land:           (raw.land || '') as string,
    fotoUrl:        (raw.foto_url || raw.avatar_url || null) as string | null,
    spielerpass:    (raw.spielerpass || raw.pass || '') as string,
    jsNr:           (raw.js_nr || raw.js || '') as string,
    ahvNr:          (raw.ahv_nr || null) as string | null,
    fairgateId:     (raw.fairgate_id || raw.fairgate || '') as string,
    mitgliedtyp:    (raw.mitgliedtyp || null) as string | null,
    rolle:          (raw.rolle || null) as string | null,
    funktionen:     (raw.funktionen || []) as unknown[],
    aktiv:          raw.aktiv !== false,
    notizen:        (raw.notizen || null) as string | null,
    name:           '',
    initials:       '',
    age:            null as number | null,
  };
  m.name     = vollname(m);
  m.initials = initials(m);
  m.age      = age(m.geburtsdatum);
  return m;
}
