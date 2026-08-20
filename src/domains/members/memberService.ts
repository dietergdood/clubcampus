/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/memberService.ts
   Alle Supabase-Calls für Mitglieder, Notizen, Elternkontakte,
   Kader, Benutzer (Portal-Zugang), Ansichten
   ═══════════════════════════════════════════════════════════════ */
import type { PostgrestError } from "@supabase/supabase-js";
import { flacheZeile, flacheZeilen, verteileFelder } from "../person/personService.ts";
import type { Ansicht, AnsichtSortDef, MitgliedInsert, MitgliedUpdate, SbClient, TablesInsert, TablesUpdate } from "../../types.ts";

/* ── Fehler-Vertrag der Write-Funktionen ──────────────────────────
   Reine Schreiboperationen (insert/update/delete/upsert ohne Rückgabe-
   daten) geben einheitlich `PostgrestError | null` zurück: null = ok,
   sonst der Fehler. Aufrufer koennen so konsistent `if (await fn())`
   pruefen (wie in elternService). Funktionen, die Daten zurueckgeben
   (fetch*, insertMitglied, insertAnsicht …), behalten ihren Rückgabetyp. */

/* ── Mitglieder ──
   Gelesen wird seit Etappe 2b per Join über `personen`, zurückgegeben
   wird weiterhin eine flache Zeile (siehe domains/person/personService).
   `personen` ist die Wahrheit; die gleichnamigen Spalten in `mitglieder`
   sind Altlast und verschwinden in Etappe 6. */

export async function fetchMitglied(sb: SbClient, id: number) {
  const { data } = await sb.from("mitglieder")
    /* MITGLIED_SELECT als Literal, nicht als Konstante: der Typparser von
       PostgREST liest den Select-Ausdruck zur Übersetzungszeit und kann mit
       einem Template-Literal nichts anfangen. */
    .select("*, personen(*), eltern_kinder(id)")
    .eq("id", id)
    .single();
  return flacheZeile(data as never) as typeof data;
}

export async function deleteMitglied(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder").delete().eq("id", id);
  return error;
}

export async function archiviereMitglied(sb: SbClient, id: number | number[], deaktiviertVon: string | null): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder").update({
    aktiv: false,
    deaktiviert_am: new Date().toISOString(),
    deaktiviert_von: deaktiviertVon,
  }).in("id", Array.isArray(id) ? id : [id]);
  return error;
}

export async function reaktiviereMitglied(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder").update({
    aktiv: true,
    deaktiviert_am: null,
    deaktiviert_von: null,
  }).eq("id", id);
  return error;
}

/* Eine Zeile der Archivliste. Explizit deklariert, weil die Abfrage die
   Namen verschachtelt liefert (personen(...)) und flacheZeilen() sie flach
   macht — der aus der Abfrage abgeleitete Typ träfe also nicht zu. */
export interface ArchivZeile {
  id: number;
  mitgliedtyp: string | null;
  deaktiviert_am: string | null;
  deaktiviert_von: string | null;
  vorname: string | null;
  nachname: string | null;
}

export async function fetchArchiv(sb: SbClient): Promise<ArchivZeile[]> {
  const { data } = await sb.from("mitglieder")
    .select("id,mitgliedtyp,deaktiviert_am,deaktiviert_von,personen(id,vorname,nachname)")
    .eq("aktiv", false)
    .order("deaktiviert_am", { ascending: false });
  return flacheZeilen(data as never) as unknown as ArchivZeile[];
}

export async function fetchArchivCount(sb: SbClient): Promise<number> {
  const { count } = await sb.from("mitglieder")
    .select("id", { count: "exact", head: true })
    .eq("aktiv", false);
  return count || 0;
}

/* ── Mitglieder Ansichten ── */

export async function fetchAnsichten(sb: SbClient, benutzerId: string, typ = "mitglieder"): Promise<Ansicht[]> {
  const { data } = await sb.from("mitglieder_ansichten")
    .select("*")
    .eq("typ", typ)
    .or(`benutzer_id.eq.${benutzerId},geteilt.eq.true`)
    .order("created_at", { ascending: true });
  return (data || []) as Ansicht[];
}

/* sortierung liegt in der DB als jsonb — hier eng typisiert, damit die
   Aufrufer keine beliebige Json-Struktur hineinschreiben.
   verein_id ist bewusst ausgeschlossen: es kommt als eigener Pflichtparameter,
   damit der Aufrufer es nicht vergessen kann (siehe insertMitglied). */
export type AnsichtInsert = Omit<TablesInsert<"mitglieder_ansichten">, "sortierung" | "verein_id"> & {
  sortierung?: AnsichtSortDef[];
};

export async function insertAnsicht(sb: SbClient, ansicht: AnsichtInsert, vereinId: string): Promise<Ansicht | null> {
  const { data, error } = await sb.from("mitglieder_ansichten")
    .insert({ ...ansicht, verein_id: vereinId })
    .select().single();
  if (error) console.error("insertAnsicht error:", error);
  return (data as Ansicht | null) ?? null;
}

export async function deleteAnsicht(sb: SbClient, id: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_ansichten").delete().eq("id", id);
  return error;
}

/* ── Notizen ── */

export async function fetchNotizen(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("mitglieder_notizen")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("created_at", { ascending: false });
  return data || [];
}

/* verein_id als Pflichtparameter statt Feld im Objekt — siehe insertAnsicht. */
export async function insertNotiz(
  sb: SbClient,
  notiz: Omit<TablesInsert<"mitglieder_notizen">, "verein_id">,
  vereinId: string,
): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen")
    .insert({ ...notiz, verein_id: vereinId });
  return error;
}

export async function updateNotiz(sb: SbClient, id: number, text: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen").update({
    text,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  return error;
}

export async function deleteNotiz(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("mitglieder_notizen").delete().eq("id", id);
  return error;
}

/* ── Elternkontakte ── */

// Eltern-Funktionen → elternService.ts
export * from "./elternService.ts";

/* ── Kader ── */

export async function fetchKaderFuerMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("kader")
    .select("*, teams(id,name,kurzname)")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function fetchKaderEintraege(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("kader")
    .select("team_id, rollen")
    .eq("mitglied_id", mitgliedId)
    .eq("aktiv", true);
  return data || [];
}

export async function upsertKader(sb: SbClient, eintrag: TablesInsert<"kader">): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").upsert(eintrag, { onConflict: "mitglied_id,team_id,saison" });
  return error;
}

export async function updateKader(sb: SbClient, id: number, fields: TablesUpdate<"kader">): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").update(fields).eq("id", id);
  return error;
}

export async function deaktiviereKader(sb: SbClient, id: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("kader").update({ aktiv: false }).eq("id", id);
  return error;
}

/* ── Benutzer (Portal-Zugang) ── */

export async function fetchBenutzerFuerMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role,created_at,last_sign_in_at,aktiv")
    .eq("mitglied_id", mitgliedId)
    .maybeSingle();
  return data;
}

export async function fetchBenutzerByEmail(sb: SbClient, email: string) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role")
    .eq("email", email)
    .maybeSingle();
  return data;
}

export async function updateBenutzer(sb: SbClient, id: string, fields: TablesUpdate<"benutzer">): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update(fields).eq("id", id);
  return error;
}

/* Der Portal-Zugang haengt allein an der Verknuepfung `benutzer.mitglied_id`.
   Das fruehere Kennzeichen `mitglieder.hat_portal_zugang` war eine Kopie
   derselben Aussage und konnte veralten — wurde ein Konto ausserhalb des
   Portals geloescht, blieb es auf true stehen. Gestrichen in Etappe 6c. */
export async function portalZugangAktivieren(sb: SbClient, mitgliedId: number, benutzerId: string, neueRolle: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update({ mitglied_id: mitgliedId, role: neueRolle }).eq("id", benutzerId);
  return error;
}

export async function portalZugangDeaktivieren(sb: SbClient, mitgliedId: number): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update({ mitglied_id: null }).eq("mitglied_id", mitgliedId);
  return error;
}

/* ── Portal Funktionen ── */

export async function fetchPortalFunktionen(sb: SbClient) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name,farbe)")
    .order("name");
  return data || [];
}

export async function fetchPortalFunktionenMitGruppe(sb: SbClient) {
  const { data } = await sb.from("portal_funktionen")
    .select("id,name,portal_gruppen(name)")
    .order("name");
  return data || [];
}

/* ── Teams ── */

export async function fetchAktiveTeams(sb: SbClient) {
  const { data } = await sb.from("teams")
    .select("id,name,kurzname")
    .eq("aktiv", true)
    .order("name");
  return data || [];
}

/**
 * Ändert ein Mitglied. Die Aufrufer (InfoTab, Datenprüfung,
 * Inline-Bearbeitung) übergeben flache Felder; die Zuordnung auf
 * `personen` und `mitglieder` passiert hier.
 *
 * Personenfelder gehen ausschliesslich nach `personen` — die
 * gleichnamigen Spalten in `mitglieder` werden ab Etappe 2b bewusst
 * NICHT mehr mitgeschrieben. Zwei Wahrheiten laufen sonst auseinander,
 * und man sucht den Fehler dort, wo er nicht ist.
 */
export async function updateMitglied(sb: SbClient, id: number, fields: MitgliedUpdate): Promise<boolean> {
  const { person, mitgliedschaft } = verteileFelder(fields as Record<string, unknown>);
  const jetzt = new Date().toISOString();

  if (Object.keys(person).length > 0) {
    const { data: zeile } = await sb.from("mitglieder")
      .select("person_id").eq("id", id).maybeSingle();
    const personId = zeile?.person_id;
    if (!personId) {
      /* ⚠ HIER STAND EIN AUSWEICHPFAD: „Mitglied ohne Person — schreibe in
         die Altspalten". Beides ist seit dem 21.08.2026 nachweislich falsch:

         `mitglieder.person_id` ist NOT NULL (seit Etappe 2b), und in der
         Datenbank steht keine einzige Zeile mit NULL. „Mitglied ohne Person"
         KANN nicht mehr entstehen. Und die Altspalten, in die der Zweig
         schrieb, gibt es seit Etappe 6a nicht mehr — der Schreibversuch wäre
         ohnehin gescheitert.

         Kommt hier nichts zurück, hat das genau zwei mögliche Gründe: die
         Zeile ist für diesen Benutzer nicht sichtbar (RLS) oder es gibt sie
         nicht. Beides ist ein Fehler und kein Grund für einen Umweg.

         ⚠ Am `error` ist das nicht zu erkennen: RLS liefert keine Meldung,
         sondern ein leeres Ergebnis. Die Unterscheidung ist auch nicht nötig
         — in beiden Fällen darf nicht geschrieben werden. */
      console.error(
        `updateMitglied: Mitgliedschaft ${id} nicht lesbar — RLS oder gelöscht. Es wurde nichts geschrieben.`);
      return false;
    } else {
      const { error } = await sb.from("personen")
        .update({ ...person, updated_at: jetzt })
        .eq("id", personId);
      if (error) { console.error("updateMitglied (personen) error:", error); return false; }
    }
  }

  if (Object.keys(mitgliedschaft).length === 0) return true;

  const { error } = await sb.from("mitglieder").update({
    ...mitgliedschaft,
    updated_at: jetzt,
  }).eq("id", id);
  if (error) console.error("updateMitglied error:", error);
  return !error;
}

export async function updateMitgliedRolle(sb: SbClient, id: number, rolle: string | null, benutzerId: string | null = null) {
  await sb.from("mitglieder").update({ rolle: rolle||null }).eq("id", id);
  if (rolle && benutzerId) {
    await sb.from("benutzer").update({ role: rolle }).eq("id", benutzerId);
  }
}

export async function updateMitgliedFoto(sb: SbClient, id: number, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const path = `${id}/foto.${ext}`;
  const { error: upErr } = await sb.storage.from("mitglieder-fotos").upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = sb.storage.from("mitglieder-fotos").getPublicUrl(path);
  /* foto_url gehoert zur Person (PERSON_FELDER) — seit Etappe 6a gibt es die
     Spalte in `mitglieder` nicht mehr. Ueber updateMitglied(), damit die
     Aufteilung an einer Stelle bleibt. */
  const ok = await updateMitglied(sb, id, { foto_url: data.publicUrl + "?t=" + Date.now() });
  if (!ok) throw new Error("Foto konnte nicht gespeichert werden.");
  return data.publicUrl;
}

export async function deleteMitgliedFoto(sb: SbClient, id: number): Promise<boolean> {
  return updateMitglied(sb, id, { foto_url: null });
}

export async function fetchBenutzerByMitglied(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("benutzer").select("id,role").eq("mitglied_id", mitgliedId).maybeSingle();
  return data;
}

/**
 * Legt Person UND Mitgliedschaft an. Zwei Schreibvorgänge, feste
 * Reihenfolge: erst die Person, dann die Mitgliedschaft mit ihrer
 * `person_id`.
 *
 * Scheitert der zweite Schritt, bleibt eine Person ohne Mitgliedschaft
 * zurück. Das ist die harmlosere Hälfte — sie taucht nirgends auf und
 * lässt sich beim nächsten Anlegen derselben E-Mail wiederverwenden.
 * Umgekehrt wäre eine Mitgliedschaft ohne Person ein Datensatz, der
 * durch die Fassade fällt.
 */
export async function insertMitglied(
  sb: SbClient,
  fields: MitgliedInsert,
  vereinId: string,
): Promise<number | null> {
  const jetzt = new Date().toISOString();
  const { person, mitgliedschaft } = verteileFelder(fields as Record<string, unknown>);

  const { data: neuePerson, error: personErr } = await sb.from("personen").insert({
    ...person,
    verein_id: vereinId,
    created_at: jetzt,
    updated_at: jetzt,
  } as never).select("id").single();
  if (personErr) { console.error("insertMitglied (personen) error:", personErr); return null; }

  const { data, error } = await sb.from("mitglieder").insert({
    ...mitgliedschaft,
    person_id: neuePerson?.id,
    verein_id: vereinId,
    aktiv: true,
    created_at: jetzt,
    updated_at: jetzt,
  } as never).select("id").single();
  if (error) { console.error("insertMitglied error:", error); return null; }
  return data?.id ?? null;
}

/* fetchMitgliedtypPflichtfelder und fetchRollePflichtfelder standen hier bis
   zum 19.08.2026. Beide Tabellen werden nicht mehr gelesen — die Quelle ist
   `mitgliedtyp_feldkonfig` (domains/members/feldkonfigService.ts). */

export const FELD_LABEL: Record<string, string> = {
  vorname: "Vorname", nachname: "Nachname", email: "E-Mail",
  telefon: "Telefon", geburtsdatum: "Geburtsdatum", geschlecht: "Geschlecht",
  nationalitaet: "Nationalität 1", nationalitaet2: "Nationalität 2",
  heimatort: "Heimatort", ahv_nr: "AHV-Nr.", strasse: "Strasse",
  plz: "PLZ", ort: "Ort", kanton: "Kanton",
  mitgliedtyp: "Mitgliedtyp", rolle: "Portalrolle",
  /* Fehlte bis 19.08.2026: `eintrittsdatum` ist seit der Migration vom
     26.07.2026 eine echte Spalte und im Profil bearbeitbar — in der
     Aenderungshistorie stand deshalb der Spaltenname statt einer
     Beschriftung. Aufgefallen ueber den Registry-Test in feldkonfig. */
  eintrittsdatum: "Eintrittsdatum",
  spielerpass: "Spielerpass", js_nr: "J+S Nr.", fairgate_id: "Fairgate-ID",
  teams: "Teams", kaderrollen: "Kaderrollen",
  funktionen: "Vereinsfunktionen", elternkontakte: "Elternkontakte",
};

/* Werte, die in der Historie landen — die Aufrufer geben auch Zahlen
   oder Arrays weiter, deshalb bewusst weit gefasst. */
export type LogWert = string | number | boolean | null | undefined;

export async function logAenderung(
  sb: SbClient,
  mitgliedId: number | string,
  vereinId: string,
  feld: string,
  alterWert: LogWert,
  neuerWert: LogWert,
  geaendertVon?: string | null,
): Promise<void> {
  if (alterWert === neuerWert) return; // Keine Änderung

  const feldLabel = FELD_LABEL[feld] || feld;
  const von = geaendertVon || "Administrator";

  if (alterWert && neuerWert) {
    // Echter Wechsel: Wert A → Wert B → in mitglieder_aenderungen
    await sb.from("mitglieder_aenderungen").insert({
      mitglied_id:   parseInt(String(mitgliedId)),
      verein_id:     vereinId,
      feld,
      alter_wert:    String(alterWert),
      neuer_wert:    String(neuerWert),
      geaendert_von: von,
    });
  } else if (!alterWert && neuerWert) {
    // Erstmalig erfasst: null → Wert → in mitglieder_aktivitaeten
    await logAktivitaet(sb, mitgliedId, vereinId,
      AKTIVITAET_TYP.FELD_ERFASST,
      `${feldLabel} erfasst`,
      feld, String(neuerWert), von
    );
  } else if (alterWert && !neuerWert) {
    // Geleert: Wert → null → in mitglieder_aktivitaeten
    await logAktivitaet(sb, mitgliedId, vereinId,
      AKTIVITAET_TYP.FELD_GELEERT,
      `${feldLabel} geleert`,
      feld, String(alterWert), von
    );
  }
}

export async function fetchAenderungen(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("mitglieder_aenderungen")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("geaendert_at", { ascending: false })
    .limit(50);
  return data || [];
}

// ── Aktivitäten-Typen ─────────────────────────────────────────
export const AKTIVITAET_TYP = {
  ANGELEGT:            "angelegt",
  FELD_ERFASST:        "feld_erfasst",
  FELD_GELEERT:        "feld_geleert",
  TEAM_HINZUGEFUEGT:   "team_hinzugefuegt",
  TEAM_ENTFERNT:       "team_entfernt",
  KADERROLLE_GEAENDERT:"kaderrolle_geaendert",
  FUNKTION_GEAENDERT:  "funktion_geaendert",
  ELTERN_HINZUGEFUEGT: "eltern_hinzugefuegt",
  ELTERN_ENTFERNT:     "eltern_entfernt",
  ELTERN_GEAENDERT:    "eltern_geaendert",
  PORTAL_AKTIVIERT:    "portal_aktiviert",
  PORTAL_DEAKTIVIERT:  "portal_deaktiviert",
  PORTAL_REAKTIVIERT:  "portal_reaktiviert",
  ARCHIVIERT:          "archiviert",
  REAKTIVIERT:         "reaktiviert",
} as const;

export type AktivitaetTyp = typeof AKTIVITAET_TYP[keyof typeof AKTIVITAET_TYP];

export async function logAktivitaet(
  sb: SbClient,
  mitgliedId: number | string,
  vereinId: string,
  typ: AktivitaetTyp,
  beschreibung: string,
  feld: string | null = null,
  wert: LogWert = null,
  geaendertVon: string | null = null,
): Promise<void> {
  await sb.from("mitglieder_aktivitaeten").insert({
    mitglied_id:   parseInt(String(mitgliedId)),
    verein_id:     vereinId,
    typ,
    beschreibung,
    feld:          feld || null,
    wert:          wert == null ? null : String(wert),
    geaendert_von: geaendertVon || null,
  });
}

export async function fetchAktivitaeten(sb: SbClient, mitgliedId: number) {
  const { data } = await sb.from("mitglieder_aktivitaeten")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("geaendert_at", { ascending: false })
    .limit(100);
  return data || [];
}
