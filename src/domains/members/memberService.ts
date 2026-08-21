/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/memberService.ts
   Alle Supabase-Calls für Mitglieder, Notizen, Elternkontakte,
   Kader, Benutzer (Portal-Zugang), Ansichten
   ═══════════════════════════════════════════════════════════════ */
import type { PostgrestError } from "@supabase/supabase-js";
import { flacheZeile, flacheZeilen, verteileFelder, updatePerson } from "../person/personService.ts";
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

/* ── Was zu einer beendeten Mitgliedschaft dazugehoert ────────────────────
   Kadereintraege, Aemter und der Portal-Zugang.

   ⚠ EINE FUNKTION FUER BEIDE WEGE. Es gab bis zum 22.08.2026 zwei Wege ins
   Archiv — den Knopf „Archivieren" und die Antwort „Archiv" im
   Austrittsdialog —, und sie taten FUENF verschiedene Dinge:

     | | Knopf | Austritt |
     |---|---|---|
     | Kadereintraege | blieben aktiv | wurden beendet |
     | Aemter | blieben offen | bekamen ein Ende |
     | Portal-Konto | wurde deaktiviert | blieb aktiv |

   Nach der Klaerung vom 21.08.2026 („Archiv heisst: ausgetreten, aber noch
   etwas offen") sind das nicht zwei Bedeutungen, sondern ein vollstaendiger
   und ein unvollstaendiger Weg. Deshalb rufen jetzt beide DIESE Funktion —
   dieselbe Wirkung an einem Ort, nicht zweimal derselbe Inhalt, der
   auseinanderlaufen kann.

   ⚠ DER ERNSTERE TEIL WAR DAS KONTO. Ein ausgetretenes Mitglied blieb
   angemeldet; gesperrt wird der Login allein durch `benutzer.aktiv`. Dass
   es niemanden getroffen hat, lag an der Datenlage — keines der drei
   ausgetretenen Mitglieder hatte ein Konto. Das ist keine Absicherung. */
export async function beendeVerknuepfungen(
  sb: SbClient, mitgliedIds: number[], tag: string,
): Promise<string[]> {
  const hinweise: string[] = [];
  if (mitgliedIds.length === 0) return hinweise;

  /* Kadereintraege. Sie haengen am MITGLIED, nicht an der Person — ohne
     diesen Schritt stuende ein Ausgetretener weiter in der Aufstellung
     seines Teams. */
  const { data: kader, error: kaderErr } = await sb.from("kader")
    .select("id").in("mitglied_id", mitgliedIds).eq("aktiv", true);
  if (kaderErr) {
    hinweise.push("Die Kadereinträge konnten nicht gelesen werden — bitte im Team prüfen.");
  } else if ((kader || []).length > 0) {
    const { error } = await sb.from("kader").update({ aktiv: false })
      .in("id", (kader || []).map(k => k.id));
    if (error) hinweise.push("Die Kadereinträge konnten nicht beendet werden — bitte im Team prüfen.");
    else hinweise.push(`${kader!.length} Kadereintrag/-einträge beendet.`);
  }

  /* Das Konto haengt an der PERSON (seit Etappe 4), nicht am Mitglied. */
  const { data: personen, error: pErr } = await sb.from("mitglieder")
    .select("person_id").in("id", mitgliedIds);
  if (pErr) {
    hinweise.push("Die Personen konnten nicht ermittelt werden — Portal-Zugang und Ämter bitte prüfen.");
    return hinweise;
  }
  const personIds = (personen || []).map(m => m.person_id).filter(Boolean) as string[];
  if (personIds.length === 0) return hinweise;

  const { data: konten, error: kErr } = await sb.from("benutzer")
    .select("id").in("person_id", personIds);
  if (kErr) {
    hinweise.push("Die Portal-Konten konnten nicht gelesen werden — bitte prüfen.");
    return hinweise;
  }
  const kontoIds = (konten || []).map(b => b.id as string);
  if (kontoIds.length === 0) return hinweise;

  /* Aemter auf `bis` setzen statt sie zu loeschen: wer ein Amt hatte, HATTE
     es — die Zeile ist der Nachweis. */
  const { error: fErr, count } = await sb.from("benutzer_funktionen")
    .update({ bis: tag }, { count: "exact" })
    .in("benutzer_id", kontoIds).is("bis", null);
  if (fErr) hinweise.push("Die Vereinsfunktionen konnten nicht beendet werden.");
  else if (count) hinweise.push(`${count} Vereinsfunktion(en) auf ${tag} beendet.`);

  /* ⚠ `aktiv`, nicht die Verknuepfung. Gesperrt wird der Login allein
     dadurch — `useDbUser` meldet ab, wenn es false ist. `mitglied_id` auf
     null zu setzen loeste die Verbindung, ohne irgendjemanden auszusperren
     (Befund vom 21.08.2026). */
  const { error: aErr } = await sb.from("benutzer")
    .update({ aktiv: false }).in("id", kontoIds);
  if (aErr) hinweise.push("Der Portal-Zugang konnte nicht deaktiviert werden.");
  else hinweise.push(`${kontoIds.length} Portal-Zugang/-Zugänge deaktiviert.`);

  return hinweise;
}

/**
 * Eine Mitgliedschaft archivieren — die Abkuerzung.
 *
 * Tut dasselbe wie der Austritt mit dem Ziel „Archiv"; die zwei
 * Unterschiede, die bleiben, sind gewollt: das Datum ist HEUTE statt
 * waehlbar, und `deaktiviert_von` haelt fest, wer geklickt hat.
 */
export async function archiviereMitglied(sb: SbClient, id: number | number[], deaktiviertVon: string | null): Promise<PostgrestError | null> {
  const ids = Array.isArray(id) ? id : [id];
  const { error } = await sb.from("mitglieder").update({
    aktiv: false,
    deaktiviert_am: new Date().toISOString(),
    deaktiviert_von: deaktiviertVon,
  }).in("id", ids);
  if (error) return error;

  /* Erst nach dem Archivieren: schlaegt das fehl, soll nichts halb beendet
     dastehen. Die Hinweise gehen hier ins Leere — der Knopf hat keine
     Stelle, sie zu zeigen —, und das ist der Preis der Abkuerzung. Ein
     Fehler wird trotzdem nicht verschluckt: er steht in der Konsole. */
  const hinweise = await beendeVerknuepfungen(sb, ids, new Date().toISOString().slice(0, 10));
  const probleme = hinweise.filter(h => h.includes("konnten nicht") || h.includes("konnte nicht"));
  if (probleme.length) console.error("archiviereMitglied (Verknüpfungen):", probleme.join(" · "));
  return null;
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

/**
 * Notizen einer PERSON — ueber alle Mitgliedschaften hinweg.
 *
 * ⚠ Nicht mehr `.eq("mitglied_id", …)`. Notizen galten bis zum 21.08.2026 als
 * `nur_mitgliedschaft`, weil die Spalte NOT NULL war — eine technische Grenze,
 * als fachliche Regel behandelt. Ein Verein will ueber einen Supporter oder
 * ein Elternteil sehr wohl etwas notieren koennen.
 */
export async function fetchNotizen(sb: SbClient, personId: string) {
  const { data, error } = await sb.from("mitglieder_notizen")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchNotizen error:", error);
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

/**
 * Das Portal-Konto einer PERSON.
 *
 * ⚠ Suchte bis zum 21.08.2026 ueber `benutzer.mitglied_id`. Beim Supporter
 * steht dort seit dem Rueckbau vom 20.08. `null` — sein Konto wurde also
 * NICHT gefunden, und der Portal-Tab zeigte bei ihm „kein Zugang", ohne dass
 * irgendetwas fehlschlug. Wieder ein Ausfall, der wie eine Datenlage aussieht.
 *
 * Der Zugang haengt seit Etappe 4 an `benutzer.person_id`; `mitglied_id` ist
 * nur noch Bequemlichkeit. Der alte Weg ist ERSETZT, nicht ergaenzt.
 */
export async function fetchBenutzerFuerPerson(sb: SbClient, personId: string) {
  const { data } = await sb.from("benutzer")
    .select("id,email,role,created_at,last_sign_in_at,aktiv")
    .eq("person_id", personId)
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
/** ⚠ `mitglied_id` wird MITGESCHRIEBEN, wo es eine gibt — die Spalte ist
    Bequemlichkeit und kein Bezugspunkt, aber solange sie steht, soll sie
    stimmen. Ohne Mitgliedschaft bleibt sie null. */
/* ── Portal-Zugang an- und abschalten ────────────────────────────────────

   ⚠ GESCHALTET WIRD `benutzer.aktiv`, NICHT DIE VERKNUEPFUNG.

   Bis zum 21.08.2026 setzte das Deaktivieren `mitglied_id = null` — bei einer
   Person OHNE Mitgliedschaft (Supporter, Elternteil) stand dort aber laengst
   null. Geschrieben wurde null ueber null, gelesen wird der Status ueber
   `person_id` (fetchBenutzerFuerPerson), und der Tab meldete „Zugang
   deaktiviert" und zeigte danach unveraendert „Aktiv". Ein Knopf, der nichts
   tut und Erfolg meldet.

   Und selbst beim Mitglied traf es nicht, was das Wort sagt: gesperrt wird
   der Login allein durch `benutzer.aktiv` (useDbUser prueft `aktiv === false`
   und meldet ab). Das Loesen der Verknuepfung hat nur die Mitgliederliste
   umgestellt — der Betroffene konnte sich weiter anmelden.

   Deshalb jetzt: der Zustand wird geschaltet, die Verknuepfung bleibt. Ein
   Konto von seiner Person zu TRENNEN ist eine andere Aktion, und es gibt
   heute keine, die sie verlangt.

   Entschieden am 21.08.2026 (Didi).

   ⚠ Offen bleibt: die Mitgliederliste (`useAppData.loadDbMitglieder`) baut
   `hat_benutzer`/`benutzer_deaktiviert` weiterhin ueber `mitglied_id` auf.
   Eine Person ohne Mitgliedschaft steht dort gar nicht, `onUpdatePortalZugang`
   erreicht sie nicht — siehe den offenen Punkt in CLAUDE.md. */

export async function portalZugangDeaktivieren(sb: SbClient, personId: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update({ aktiv: false }).eq("person_id", personId);
  return error;
}

export async function portalZugangReaktivieren(sb: SbClient, personId: string): Promise<PostgrestError | null> {
  const { error } = await sb.from("benutzer").update({ aktiv: true }).eq("person_id", personId);
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
      /* ⚠ Ueber updatePerson() und nicht mit einem eigenen `update`: es soll
         genau EINEN Schreiber fuer `personen` geben. Zwei Wege zu demselben
         Feld sind das, was der Altspalten-Zweig hier schon einmal gekostet
         hat — der eine schrieb, der andere diagnostizierte falsch. */
      const ok = await updatePerson(sb, personId, person);
      if (!ok) return false;
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

/**
 * Foto einer PERSON setzen.
 *
 * ⚠ Hiess bis zum 21.08.2026 `updateMitgliedFoto` und war auf die
 * Mitgliedschaft geschluesselt — auch der Speicherpfad. `foto_url` gehoert
 * aber zur Person (PERSON_FELDER); ein Supporter oder Elternteil hat kein
 * Mitglied, an dem das Foto haengen koennte.
 *
 * ⚠ DER SPEICHERPFAD AENDERT SICH MIT: neue Bilder liegen unter
 * `<person_id>/foto.<ext>` statt `<mitglied_id>/foto.<ext>`. Bestehende
 * Bilder bleiben erreichbar, weil die vollstaendige URL in
 * `personen.foto_url` steht und nicht aus der Id errechnet wird. Die
 * Bucket-Policies pruefen nur `bucket_id`, nicht den Pfad (nachgesehen am
 * 21.08.2026) — der Wechsel ist also erlaubt.
 *
 * Der alte Weg ist ERSETZT, nicht ergaenzt: zwei Schluessel fuer dasselbe
 * Bild waeren zwei Orte, an denen es liegen kann.
 */
export async function updatePersonFoto(sb: SbClient, personId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const path = `${personId}/foto.${ext}`;
  const { error: upErr } = await sb.storage.from("mitglieder-fotos").upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = sb.storage.from("mitglieder-fotos").getPublicUrl(path);
  const ok = await updatePerson(sb, personId, { foto_url: data.publicUrl + "?t=" + Date.now() });
  if (!ok) throw new Error("Foto konnte nicht gespeichert werden.");
  return data.publicUrl;
}

/** ⚠ Leert nur `foto_url`. Die Datei bleibt im Bucket liegen — das war schon
    vorher so und gehoert zum DSGVO-Loeschen, nicht hierhin. */
export async function deletePersonFoto(sb: SbClient, personId: string): Promise<boolean> {
  return updatePerson(sb, personId, { foto_url: null });
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

/**
 * Woran ein Verlaufseintrag haengt.
 *
 * ⚠ DIE PERSON IST PFLICHT, DIE MITGLIEDSCHAFT IST KONTEXT.
 *
 * Seit `migration_verlauf_person.sql` (21.08.2026) fuehren
 * `mitglieder_aenderungen` und `mitglieder_aktivitaeten` `person_id NOT NULL`
 * und `mitglied_id` nullable mit `ON DELETE SET NULL`. Der Verlauf gehoert der
 * PERSON und ueberlebt Austritt und Rueckkehr; die Mitgliedschaft sagt nur,
 * in welchem Zusammenhang es passiert ist.
 *
 * Als eigener Typ und nicht als zwei Parameter: so kann keine Aufrufstelle
 * die Person weglassen, ohne dass der Compiler es sagt. Ein `mitgliedId`
 * allein war bis heute die Signatur — und genau deshalb hing der ganze
 * Verlauf an einer Zeile, die beim Loeschen der Mitgliedschaft verschwand.
 */
export type LogBezug =
  /** Der Normalfall: die Person ist bekannt, die Mitgliedschaft optional. */
  | { personId: string; mitgliedId?: number | string | null }
  /** Der Rueckfall: nur die Mitgliedschaft. Die Person wird nachgeschlagen. */
  | { mitgliedId: number | string; personId?: undefined };

/**
 * Die zwei Bezugsspalten fuer einen Verlaufseintrag.
 *
 * ⚠ Wo `personId` fehlt, wird sie NACHGESCHLAGEN — sichtbar, an einer
 * Stelle, mit Fehlerpfad. Das ist bewusst KEIN Datenbank-Trigger: der waere
 * robuster und zugleich unsichtbar, und man saehe im Code nicht mehr, wer
 * die Wahrheit setzt. Hier steht die Abfrage da, wo sie passiert.
 *
 * Aufrufstellen, die die Person ohnehin haben, geben sie mit und sparen die
 * Abfrage. Das ist der Normalfall und die bessere Form.
 *
 * ⚠ Findet sich keine Person, wird NICHTS geschrieben und laut gemeldet. Eine
 * Zeile ohne Bezug waere schlimmer als keine: `person_id` ist NOT NULL, der
 * Insert schluege ohnehin fehl — nur eben ohne Erklaerung.
 */
async function bezugFelder(
  sb: SbClient, bezug: LogBezug,
): Promise<{ person_id: string; mitglied_id: number | null } | null> {
  const roh = bezug.mitgliedId;
  const mitgliedId = roh === null || roh === undefined || roh === "" ? null : parseInt(String(roh));

  if (bezug.personId) return { person_id: bezug.personId, mitglied_id: mitgliedId };

  if (mitgliedId == null) {
    console.error("logEintrag: weder personId noch mitgliedId — nichts geschrieben.");
    return null;
  }
  const { data, error } = await sb.from("mitglieder")
    .select("person_id").eq("id", mitgliedId).maybeSingle();
  if (error) { console.error("logEintrag: person_id nicht lesbar:", error); return null; }
  if (!data?.person_id) {
    console.error(`logEintrag: Mitgliedschaft ${mitgliedId} hat keine person_id — nichts geschrieben.`);
    return null;
  }
  return { person_id: data.person_id, mitglied_id: mitgliedId };
}

export async function logAenderung(
  sb: SbClient,
  bezug: LogBezug,
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
    const felder = await bezugFelder(sb, bezug);
    if (!felder) return;
    const { error } = await sb.from("mitglieder_aenderungen").insert({
      ...felder,
      verein_id:     vereinId,
      feld,
      alter_wert:    String(alterWert),
      neuer_wert:    String(neuerWert),
      geaendert_von: von,
    });
    /* ⚠ `error` lesen. Ein verlorener Verlaufseintrag faellt sonst nirgends
       auf — er hinterlaesst keine Luecke, die jemand suchen wuerde. */
    if (error) console.error("logAenderung error:", error);
  } else if (!alterWert && neuerWert) {
    // Erstmalig erfasst: null → Wert → in mitglieder_aktivitaeten
    await logAktivitaet(sb, bezug, vereinId,
      AKTIVITAET_TYP.FELD_ERFASST,
      `${feldLabel} erfasst`,
      feld, String(neuerWert), von
    );
  } else if (alterWert && !neuerWert) {
    // Geleert: Wert → null → in mitglieder_aktivitaeten
    await logAktivitaet(sb, bezug, vereinId,
      AKTIVITAET_TYP.FELD_GELEERT,
      `${feldLabel} geleert`,
      feld, String(alterWert), von
    );
  }
}

/**
 * Der Verlauf einer PERSON — ueber alle Mitgliedschaften hinweg, ungefiltert.
 *
 * ⚠ Das aendert, was auf dem Schirm steht: wer austritt und wiederkommt, sieht
 * auch die Eintraege von davor. Genau das ist der Zweck (Entscheidung Didi,
 * 21.08.2026) — der Verlauf gehoert der Person, nicht der Mitgliedschaft.
 */
export async function fetchAenderungen(sb: SbClient, personId: string) {
  const { data, error } = await sb.from("mitglieder_aenderungen")
    .select("*")
    .eq("person_id", personId)
    .order("geaendert_at", { ascending: false })
    .limit(50);
  if (error) console.error("fetchAenderungen error:", error);
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
  bezug: LogBezug,
  vereinId: string,
  typ: AktivitaetTyp,
  beschreibung: string,
  feld: string | null = null,
  wert: LogWert = null,
  geaendertVon: string | null = null,
): Promise<void> {
  const felder = await bezugFelder(sb, bezug);
  if (!felder) return;
  const { error } = await sb.from("mitglieder_aktivitaeten").insert({
    ...felder,
    verein_id:     vereinId,
    typ,
    beschreibung,
    feld:          feld || null,
    wert:          wert == null ? null : String(wert),
    geaendert_von: geaendertVon || null,
  });
  if (error) console.error("logAktivitaet error:", error);
}

/** Aktivitaeten einer PERSON — siehe `fetchAenderungen`. */
export async function fetchAktivitaeten(sb: SbClient, personId: string) {
  const { data, error } = await sb.from("mitglieder_aktivitaeten")
    .select("*")
    .eq("person_id", personId)
    .order("geaendert_at", { ascending: false })
    .limit(100);
  if (error) console.error("fetchAktivitaeten error:", error);
  return data || [];
}
