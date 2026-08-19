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
  | 'mitglied'
  | 'supporter';

export type Zugriffstufe = 'lesen' | 'schreiben' | 'verwalten';

// ── Tenant / Verein ───────────────────────────────────────────────
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  theme: Record<string, unknown> | null;
}

// ── Benutzer ─────────────────────────────────────────────────────
export interface DbUser extends Omit<Tables<'benutzer'>, 'role'> {
  /* '__kein_zugang' setzt useDbUser, wenn zur Auth-ID keine Zeile in
     benutzer existiert — das ist kein Wert aus der Datenbank. */
  role: Rolle | '__kein_zugang';
  /* vorname/nachname/telefon sind seit der SQL-Migration echte Spalten
     in benutzer und kommen aus Tables<'benutzer'>. */
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
/* Die Personenfelder, wie `flacheZeile()` sie in die Mitgliederzeile
   hineinschreibt (PERSON_FELDER in domains/person/personService).

   Einzeln aufgezaehlt statt die beiden Tabellentypen zu verschneiden:
   `id`, `verein_id` und `created_at` gibt es in BEIDEN, und im Schnitt
   wird aus `id?: never` (mitglieder) und `id?: string` (personen) ein
   `never` — jedes Objekt waere dann unzuweisbar. */
type PersonenFelder = Partial<Pick<Tables<'personen'>,
  'vorname' | 'nachname' | 'email' | 'telefon' |
  'strasse' | 'plz' | 'ort' | 'kanton' | 'land' |
  'geburtsdatum' | 'geschlecht' |
  'nationalitaet' | 'nationalitaet2' | 'heimatort' |
  'ahv_nr' | 'foto_url' | 'funktionen' | 'profil_geprueft_at'>>;

/* Die FLACHE Mitgliederzeile, wie sie aus der Fassade kommt: Mitgliedschaft
   plus Personenfelder in einem Objekt.

   Seit Etappe 6a (05.08.2026) stehen die Personenfelder NICHT mehr in
   `mitglieder` — `Tables<'mitglieder'>` allein trifft die Form also nicht
   mehr.

   Die Json-Altspalte `eltern` ist mit Etappe 6c verschwunden. Sie wurde nie
   befuellt — die Leser in getProfilCheck, PlatzhalterModul und TeamModul
   liefen ins Leere, und deshalb bekamen Eltern nie einen Datenpruefungs-
   Hinweis fuer ihre Kinder. Die Kinder stehen in `eltern_kinder`; sie dort
   zu lesen ist eine Verhaltensaenderung und ein eigener Schritt. */
export interface Mitglied extends Tables<'mitglieder'>, PersonenFelder {
  // Von der App berechnet, nicht in der Tabelle
  kader_rollen?: string[];
  kader_teams?: { name: string; kurz: string }[];
  kader_eintraege?: KaderEintrag[];
  hat_benutzer?: boolean;
  benutzer_deaktiviert?: boolean;
}

/* Aenderungs- und Einfuege-Objekte fuer ein Mitglied — FLACH, wie die
   Formulare sie liefern. `verteileFelder()` in personService teilt sie auf
   `personen` und `mitglieder` auf; die Aufrufer sollen davon nichts wissen. */
export type MitgliedUpdate = TablesUpdate<'mitglieder'> & PersonenFelder;
/* `verein_id` und `person_id` sind ausgenommen: beide setzt insertMitglied()
   selbst — verein_id als eigener Pflichtparameter, person_id erst, nachdem
   die Person angelegt ist. Die Formulare kennen weder das eine noch das
   andere. */
export type MitgliedInsert = Omit<TablesInsert<'mitglieder'>, 'verein_id' | 'person_id'> & PersonenFelder;

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
/* Der frühere Alias `Elternkontakt = Tables<'elternkontakte'>` ist mit
   Etappe 3 entfallen: ein Elternkontakt ist jetzt eine Person mit einer
   Verknüpfung in `eltern_kinder`. Die massgebliche Form ist
   `ElternkontaktMitLink` in domains/members/elternService.ts — dort, wo
   auch `beziehung` und `hauptkontakt` aus der Verknüpfung herkommen.
   Hier steht bewusst keine Kopie: ein zweiter Typ mit denselben Feldern
   liefe still auseinander (CLAUDE.md → Konventionen). */

// ── Kind ─────────────────────────────────────────────────────────
export interface Kind {
  id: number;
  name: string;
  team?: string;
}

// ── Mitgliedtyp ──────────────────────────────────────────────────
/* Verengte Sicht auf die Tabelle mitgliedtypen — nur die Felder, die im
   Portal ausserhalb der Verwaltung gebraucht werden. Wer weniger braucht,
   leitet mit Pick<> ab statt neu zu deklarieren; die Portalverwaltung nutzt
   MitgliedtypZeile mit allen Spalten. */
export interface Mitgliedtyp {
  id?: string;
  name: string;
  aktiv: boolean;
  sort_order?: number;
  /* Steuert, ob dieser Typ einen Elternkontakt verlangt (brauchtEltern) */
  hauptkontakt_pflicht?: boolean | null;
  /* Portalrolle, die beim Anlegen eines Mitglieds vorbelegt wird. In der
     Portalverwaltung pro Mitgliedtyp setzbar — bis 05.08.2026 gepflegt,
     aber von niemandem gelesen. */
  standard_rolle?: string | null;
  beitragsinfo?: string | null;
  /* False = keine Mitgliedschaft (Gönner/Supporter): kein Beitrag, kein
     Stimmrecht an der GV, eigener Tab in der Mitgliederliste. Ersetzt seit
     19.08.2026 den Namensvergleich `mitgliedtyp === "Supporter"`, der beim
     zweiten Verein mit einem anders benannten Typ nicht mehr griff. */
  zaehlt_als_mitgliedschaft?: boolean | null;
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
  'filter' | 'gruppierung' | 'gruppenreihenfolge' | 'zeilenreihenfolge' | 'sortierung'
> {
  /* Strukturgleich zu FilterVals aus shared/list: Auswahlliste oder Bereich */
  filter: Record<string, string[] | { von?: number | null; bis?: number | null }> | null;
  gruppierung: string[] | null;
  gruppenreihenfolge: Record<string, string[]> | null;
  zeilenreihenfolge: Record<string, (string | number)[]> | null;
  /* Mehrstufige Sortierung, [{key,dir}, …]. Ansichten aus der Zeit vor
     der Migration vom 27.07.2026 haben hier null. */
  sortierung: AnsichtSortDef[] | null;
}

/* Eine Sortierebene, wie sie in mitglieder_ansichten.sortierung liegt.
   Strukturgleich zu SortDef aus shared/list/types.ts — hier eigenständig,
   damit types.ts nichts aus shared/ importieren muss.
   Bewusst ein type-Alias und kein interface: nur Aliase bekommen von TS
   eine implizite Index-Signatur und sind damit dem jsonb-Typ Json
   zuweisbar (Interfaces nicht). */
export type AnsichtSortDef = {
  key: string;
  dir: 'asc' | 'desc';
};

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
