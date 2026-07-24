/* ═══════════════════════════════════════════════════════════════
   ClubCampus — src/types.ts
   Globale Typen für das gesamte Projekt
   ═══════════════════════════════════════════════════════════════ */
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Supabase ─────────────────────────────────────────────────────
export type Sb = SupabaseClient | null;

// ── Rollen ───────────────────────────────────────────────────────
export type Rolle =
  | 'administrator'
  | 'administration'
  | 'funktionaer'
  | 'trainer'
  | 'spieler'
  | 'eltern'
  | 'supporter';

export type Zugriffstufe = 'lesen' | 'schreiben' | 'verwalten';

// ── Tenant / Verein ───────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  theme: Record<string, unknown> | null;
}

// ── Benutzer ─────────────────────────────────────────────────────
export interface DbUser {
  id: string;
  email: string;
  name?: string;
  vorname?: string;
  nachname?: string;
  role: Rolle | '__kein_zugang';
  mitglied_id?: number | null;
  aktiv?: boolean;
  profil_geprueft_at?: string | null;
  telefon?: string | null;
  teams?: string[];
}

// ── Account (für Navigation/Rollenswitch) ────────────────────────
export interface Account {
  id: string;
  name: string;
  email?: string;
  rollen: Rolle[];
  primaryRole: Rolle;
  kinder: Kind[];
  teams: string[];
  rosterId?: number | null;
}

// ── Mitglied ─────────────────────────────────────────────────────
export interface Mitglied {
  id: number;
  vorname: string;
  nachname: string;
  mitgliedtyp: string;
  email?: string | null;
  telefon?: string | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  kanton?: string | null;
  land?: string | null;
  geburtsdatum?: string | null;
  geschlecht?: 'm' | 'w' | 'd' | null;
  nationalitaet?: string | null;
  heimatort?: string | null;
  ahv_nr?: string | null;
  aktiv: boolean;
  verein_id: string;
  created_at?: string;
  updated_at?: string;
  // Computed
  kader_rollen?: string[];
  kader_teams?: { name: string; kurz: string }[];
  kader_eintraege?: KaderEintrag[];
  hat_benutzer?: boolean;
  benutzer_deaktiviert?: boolean;
  profil_geprueft_at?: string | null;
  eltern?: Elternkontakt[];
}

export interface KaderEintrag {
  team: { name: string | null; kurz: string | null };
  rollen: string[];
}

// ── Team ─────────────────────────────────────────────────────────
export interface Team {
  id: number;
  name: string;
  kurzname?: string | null;
  hauptbereich?: string | null;
  aktiv: boolean;
  verein_id: string;
  module_aktiv?: string[];
}

// ── Elternkontakt ────────────────────────────────────────────────
export interface Elternkontakt {
  id: string;
  vorname?: string | null;
  nachname?: string | null;
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  tel?: string | null;
  beziehung?: string | null;
  hauptkontakt: boolean;
  benutzer_id?: string | null;
  verein_id?: string;
}

// ── Kind ─────────────────────────────────────────────────────────
export interface Kind {
  id: number;
  name: string;
  team?: string;
}

// ── Mitgliedtyp ──────────────────────────────────────────────────
export interface Mitgliedtyp {
  name: string;
  aktiv: boolean;
  sort_order?: number;
}

export interface MitgliedtypPflichtfeld {
  mitgliedtyp: string;
  feld: string;
  pflicht: boolean;
}

// ── Portal-Rollen ────────────────────────────────────────────────
export interface PortalRolle {
  name: string;
  label: string;
  aktiv: boolean;
  prioritaet?: number;
}

export interface KaderRolle {
  name: string;
  label?: string;
  aktiv: boolean;
  sort_order?: number;
}

// ── Theme ────────────────────────────────────────────────────────
export interface AppTheme {
  vereinsfarbe1?: string;
  vereinsfarbe2?: string;
  navBg?: string;
  navText?: string;
  navAccent?: string | null;
  navAccentText?: string | null;
  navHover?: string;
  avatarBg?: string | null;
  avatarText?: string | null;
  btnPrimary?: string;
  btnPrimaryText?: string;
  vereinsname?: string;
  logo?: string | null;
}

// ── Funktion ─────────────────────────────────────────────────────
export interface PortalFunktion {
  id: string;
  name: string;
  portal_gruppen?: PortalGruppe | null;
}

export interface PortalGruppe {
  id: string;
  name: string;
  modul?: string | null;
  stufe?: string | null;
}

// ── Änderungshistorie ────────────────────────────────────────────
export interface Aenderung {
  id: string;
  mitglied_id: number;
  feld: string;
  alter_wert: string | null;
  neuer_wert: string | null;
  geaendert_von?: string | null;
  geaendert_at: string;
  verein_id: string;
}

export interface Aktivitaet {
  id: string;
  mitglied_id: number;
  typ: string;
  beschreibung?: string | null;
  geaendert_von?: string | null;
  geaendert_at: string;
  verein_id: string;
}

// ── Ansicht (gespeicherte ListView-Konfiguration) ─────────────────
export interface Ansicht {
  id: string;
  benutzer_id: string;
  verein_id: string;
  name: string;
  spalten: string[];
  filter: Record<string, unknown>;
  gruppierung: string[];
  gruppenreihenfolge: Record<string, string[]>;
  zeilenreihenfolge: Record<string, number[]>;
  typ: string;
  geteilt: boolean;
}

// ── Kader ────────────────────────────────────────────────────────
export interface KaderEintragDb {
  mitglied_id: number;
  team_id: number;
  rollen: string[];
  aktiv: boolean;
  saison?: string | null;
  teams?: { id: number; name: string; kurzname?: string | null };
}

// ── Team-Rollen Map ───────────────────────────────────────────────
export type TeamRollenMap = Record<number, Rolle>;

// ── Modul-Konfiguration ───────────────────────────────────────────
export type ModuleAktiv = Record<string, boolean>;
export type ModuleRechte = Record<string, string[]>;

// ── Hilfstypes ───────────────────────────────────────────────────
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
export type Maybe<T> = T | null | undefined;
