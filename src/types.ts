/* ═══════════════════════════════════════════════════════════════
   ClubCampus — src/types.ts
   Globale Typen für das gesamte Projekt
   ═══════════════════════════════════════════════════════════════ */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';

// ── Supabase ─────────────────────────────────────────────────────
/* database.types.ts wird generiert:
     npx supabase gen types typescript --project-id <ref> > src/database.types.ts
   Nach jeder Schema-Änderung neu erzeugen. */
/* Verbundener Client. Services verlangen diesen Typ — die Aufrufer
   prüfen vorher auf null. */
export type SbClient = SupabaseClient<Database>;
/* Wie er in der App herumgereicht wird: vor dem Login noch nicht da. */
export type Sb = SbClient | null;

/* Zeilen-, Insert- und Update-Typen einer Tabelle bequem abgreifen:
     type Mitglied = Tables<'mitglieder'>  */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

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
export interface DbUser extends Omit<Tables<'benutzer'>, 'role'> {
  /* '__kein_zugang' setzt useDbUser, wenn zur Auth-ID keine Zeile in
     benutzer existiert — das ist kein Wert aus der Datenbank. */
  role: Rolle | '__kein_zugang';

  /* ⚠ Diese drei Felder haben KEINE Spalte in der Tabelle benutzer.
     useProfilCheck liest sie für Eltern-Konten, sie sind dort immer
     undefined. Siehe offener Punkt in der Migration. */
  vorname?: string;
  nachname?: string;
  telefon?: string | null;
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
/* Basis kommt aus dem generierten Schema — so kann der Typ nicht mehr von
   der Datenbank abdriften. Ergänzt werden nur Felder, die die App beim
   Laden dazurechnet (siehe loadDbMitglieder in domains/app/useAppData).

   eltern wird überschrieben: die gleichnamige DB-Spalte ist Json, die App
   befüllt das Feld aber aus elternkontakte/eltern_kinder. */
export interface Mitglied extends Omit<Tables<'mitglieder'>, 'eltern'> {
  eltern?: Elternkontakt[];
  // Von der App berechnet, nicht in der Tabelle
  kader_rollen?: string[];
  kader_teams?: { name: string; kurz: string }[];
  kader_eintraege?: KaderEintrag[];
  hat_benutzer?: boolean;
  benutzer_deaktiviert?: boolean;
}

export interface KaderEintrag {
  team: { name: string | null; kurz: string | null };
  rollen: string[];
}

// ── Team ─────────────────────────────────────────────────────────
export interface Team extends Tables<'teams'> {
  /* Von loadDbTeams aus team_module zusammengesetzt, keine Tabellenspalte */
  module_aktiv?: string[];
}

// ── Elternkontakt ────────────────────────────────────────────────
export interface Elternkontakt extends Tables<'elternkontakte'> {
  /* ⚠ Keine Spalte in elternkontakte. ElternTab schreibt supporter:true,
     wenn das letzte Kind entknüpft wird (siehe ELTERN_LOGIK.md) — das
     Update läuft heute ins Leere. Siehe offener Punkt in der Migration. */
  supporter?: boolean;
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
  /* Nullable in mitgliedtyp_pflichtfelder — Leser prüfen auf truthy */
  pflicht: boolean | null;
}

// ── Portal-Rollen ────────────────────────────────────────────────
export interface PortalRolle {
  /* Primärschlüssel aus portal_rollen — RollenTab bearbeitet darüber */
  id: number;
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
  /* Unterscheidet Trainer- von Spielerrollen (Spalte in kader_rollen).
     Fehlte hier, obwohl roleUtils und useMemberMeta darauf aufbauen. */
  ist_trainer: boolean;
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
/* Beide Formen sind an portal_funktionen/portal_gruppen ausgerichtet.
   Vorher standen hier id: string (beide Spalten sind bigint) sowie modul und
   stufe — Felder, die es nicht gibt. Gelesen werden von
   getEffektiveStufeForFunktionaer (NavigationModul) die Override-Felder der
   Funktion und module/modul_stufen der Gruppe. */
export interface PortalFunktion {
  id: number;
  name: string;
  /* Übersteuern die Angaben der Gruppe, wenn gesetzt */
  module_override?: string[] | null;
  stufe_override?: Record<string, string> | null;
  portal_gruppen?: PortalGruppe | null;
}

export interface PortalGruppe {
  id: number;
  name: string;
  farbe?: string | null;
  /* Module, die die Gruppe freischaltet, und die Zugriffstufe je Modul */
  module?: string[] | null;
  modul_stufen?: Record<string, string> | null;
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
/* Basis aus dem Schema. filter, gruppierung, gruppenreihenfolge und
   zeilenreihenfolge sind dort jsonb; die App legt eine engere Struktur
   hinein, die hier beschrieben wird. */
export interface Ansicht extends Omit<
  Tables<'mitglieder_ansichten'>,
  'filter' | 'gruppierung' | 'gruppenreihenfolge' | 'zeilenreihenfolge'
> {
  /* Strukturgleich zu FilterVals aus shared/list: Auswahlliste oder Bereich */
  filter: Record<string, string[] | { von?: number | null; bis?: number | null }> | null;
  gruppierung: string[] | null;
  gruppenreihenfolge: Record<string, string[]> | null;
  zeilenreihenfolge: Record<string, (string | number)[]> | null;
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
