/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/sfv/sfvService.ts
   SFV Club API: Teamliste holen und Zuordnung speichern.

   Die Teamliste kommt NICHT aus der Datenbank, sondern bei jedem
   Öffnen frisch aus der Edge Function `sfv-sync`. Grund: sie ist der
   Massstab, gegen den die gespeicherte Zuordnung geprüft wird. Läge
   sie gespiegelt in der DB, prüfte man die Kopie gegen sich selbst.
   ═══════════════════════════════════════════════════════════════ */
import type { Sb, Team } from "../../types.ts";

/* Eine Zeile aus /api/team/list, auf das reduziert, was die Zuordnung
   braucht. Enthält keine Personendaten — der Endpunkt liefert keine. */
export interface SfvTeam {
  sfv_team_id: number;
  name: string;
  voller_name: string;
  liga_id: number | null;
  liga_name: string;
  division: string;
  aktiv: boolean;
}

export interface SfvTeamAntwort {
  saison: { id: number; name: string };
  teams: SfvTeam[];
}

/* Eine Zeile der Zuordnungsansicht: ein SFV-Team und das ClubCampus-Team,
   das darauf zeigt (oder keines). */
export interface ZuordnungZeile {
  sfv: SfvTeam;
  team: Team | null;
}

export interface Zuordnung {
  zeilen: ZuordnungZeile[];
  /* ClubCampus-Teams, die eine sfv_team_id tragen, welche in der aktuellen
     Saisonliste nicht mehr vorkommt. Entsteht, wenn ein Team aufgelöst wird
     oder eine neue SFV-Id bekommt. Sie dürfen in der Auswahl nicht als
     „frei" erscheinen, sonst überschreibt man eine Zuordnung, ohne es zu
     merken. */
  veraltet: Team[];
  /* Noch gar nicht zugeordnete ClubCampus-Teams. */
  offen: Team[];
}

/* ── Reine Logik, ohne sb — damit prüfbar ────────────────────────── */
export function baueZuordnung(sfvTeams: SfvTeam[], teams: Team[]): Zuordnung {
  const bekannt = new Set(sfvTeams.map((s) => s.sfv_team_id));
  const nachSfvId = new Map<number, Team>();
  for (const t of teams) {
    const id = (t as Team & { sfv_team_id?: number | null }).sfv_team_id;
    if (id != null) nachSfvId.set(Number(id), t);
  }

  const zeilen = sfvTeams.map((sfv) => ({ sfv, team: nachSfvId.get(sfv.sfv_team_id) ?? null }));

  const veraltet: Team[] = [];
  const offen: Team[] = [];
  for (const t of teams) {
    const id = (t as Team & { sfv_team_id?: number | null }).sfv_team_id;
    if (id == null) offen.push(t);
    else if (!bekannt.has(Number(id))) veraltet.push(t);
  }
  return { zeilen, veraltet, offen };
}

/* Welche ClubCampus-Teams stehen für ein bestimmtes SFV-Team zur Auswahl?
   Alle, die noch keine Zuordnung haben — plus das bereits zugeordnete, damit
   es in seinem eigenen Auswahlfeld sichtbar bleibt. Verwaiste bleiben
   draussen: sie hängen an einer anderen, wenn auch toten Id. */
export function auswahlFuer(zuordnung: Zuordnung, sfvTeamId: number): Team[] {
  const eigenes = zuordnung.zeilen.find((z) => z.sfv.sfv_team_id === sfvTeamId)?.team;
  return eigenes ? [eigenes, ...zuordnung.offen] : zuordnung.offen;
}

/* ── Zugriffe ────────────────────────────────────────────────────── */

/** Teamliste der laufenden Saison über die Edge Function. */
export async function fetchSfvTeams(sb: Sb): Promise<{ daten: SfvTeamAntwort | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", { body: { aktion: "teams" } });
  if (error) return { daten: null, fehler: data?.fehler || error.message || "Abruf fehlgeschlagen" };
  if (data?.fehler) return { daten: null, fehler: String(data.fehler) };
  if (!data?.teams) return { daten: null, fehler: "Antwort ohne Teamliste" };
  return { daten: data as SfvTeamAntwort, fehler: null };
}

/** Zuordnung setzen oder (mit sfv = null) lösen.
    Kein verein_id nötig: update ist davon nicht betroffen, die Spalte steht. */
export async function setzeTeamZuordnung(sb: Sb, teamId: number, sfv: SfvTeam | null): Promise<string | null> {
  if (!sb) return "Keine Verbindung";
  const felder = sfv
    ? { sfv_team_id: sfv.sfv_team_id, sfv_liga_id: sfv.liga_id, sfv_liga_name: sfv.liga_name, sfv_division: sfv.division }
    : { sfv_team_id: null, sfv_liga_id: null, sfv_liga_name: null, sfv_division: null };

  const { error } = await sb.from("teams").update(felder).eq("id", teamId);
  if (!error) return null;
  /* teams_verein_sfv_team_key: ein SFV-Team kann nicht an zwei Teams hängen. */
  if (error.code === "23505") return "Dieses SFV-Team ist bereits einem anderen Team zugeordnet.";
  return error.message || "Speichern fehlgeschlagen";
}

/** Ergebnis eines Laufs, wie index.ts es zurückgibt. Bewusst locker
    typisiert: die Zusammensetzung steht in sync.ts und wächst dort. */
export interface SyncAntwort {
  laeufe?: Array<Record<string, unknown>>;
  hinweis?: string;
  fehler?: string;
}

/** Antwort der Aktion `namen`. */
export interface NamenAntwort {
  namen: { sfv_person_id: number; name: string; jahrgang?: number | null }[];
  spiele_abgefragt: number;
  namen_gefunden: number;
  offen_gesamt: number;
  fehler: number;
  /**
   * Wie viele der gefundenen Spieler **keinen lesbaren Jahrgang** haben.
   *
   * ⚠ Optional, weil eine Fassung vor dem 13.09.2026 sie nicht schickt —
   * und `undefined` heisst dann **nicht gefragt**, nicht „alle lesbar".
   * Genau diese Verwechslung hat am 11.09.2026 eine Karte drei Nullen
   * zeigen lassen, wo 129 Personen standen.
   */
  jahrgang_unlesbar?: number;
}

/**
 * Die Klarnamen der noch nicht zugeordneten eigenen Spieler holen.
 *
 * ⚠ EIGENE AKTION, NICHT DER SYNC. Der stündliche Lauf holt zehn Spiele und
 * bei leerem ersten Topf immer dieselben — am 22.08.2026 waren dadurch von
 * 177 offenen Spielern **48 gar nicht erreichbar**. Diese Aktion wählt die
 * Spiele nach der Frage statt nach dem Zeitplan.
 *
 * ⚠ Sie kann mit 409 antworten: solange ein Sync unterwegs ist, gibt es
 * kein zweites gültiges Token. Das ist kein Fehler, sondern die Sperre —
 * die Meldung sagt das auch so.
 *
 * ⚠ Nichts davon wird gespeichert. Der Rückgabewert lebt im Zustand der
 * Maske; beim Neuladen ist er weg.
 */
export async function holeNamen(
  sb: Sb,
): Promise<{ daten: NamenAntwort | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", { body: { aktion: "namen" } });
  if (error) {
    /* Wie bei starteSync: bei non-2xx liegt die Meldung in error.context,
       nicht in data. Ohne dieses Auslesen steht dort nur „non-2xx status". */
    let ausKoerper: string | null = null;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const j = JSON.parse(await ctx.clone().text());
        ausKoerper = j?.fehler ?? null;
      } catch { /* kein JSON — dann bleibt die Meldung des Clients */ }
    }
    return { daten: null, fehler: ausKoerper || error.message || "Namen konnten nicht geholt werden" };
  }
  if (data?.fehler) return { daten: null, fehler: String(data.fehler) };
  return { daten: data as NamenAntwort, fehler: null };
}

/**
 * Die Namen aus einer `namen`-Antwort — dieselbe Allowlist wie bei
 * `leseOffeneNamen`, nur eine Ebene flacher, weil diese Aktion ein eigenes
 * Ergebnis hat und nicht in `laeufe` steckt.
 */
export function leseNamenAntwort(daten: NamenAntwort | null): Record<number, string> {
  const raus: Record<number, string> = {};
  for (const e of daten?.namen ?? []) {
    const id = Number(e?.sfv_person_id);
    const name = e?.name;
    if (Number.isFinite(id) && typeof name === "string" && name.trim()) raus[id] = name.trim();
  }
  return raus;
}

/**
 * Einen Sync-Lauf von Hand anstossen.
 *
 * Läuft über den Admin-JWT-Pfad der Edge Function — der ignoriert
 * `auto_sync` (das filtert nur den Zeitplan) und bearbeitet genau den
 * eigenen Verein. So lässt sich ein Lauf gezielt auslösen, während der
 * stündliche Auftrag abgeschaltet ist.
 *
 * ⚠ Die Antwort kommt direkt zurück, nicht nur nach `api_sync_log` — wer
 * von Hand anstösst, will sehen, was herauskam, und nicht nachschlagen.
 */
export async function starteSync(
  sb: Sb, nur?: "spielplan" | "rangliste",
): Promise<{ daten: SyncAntwort | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", {
    body: nur ? { aktion: "sync", nur } : { aktion: "sync" },
  });
  if (error) {
    /* ⚠ Bei non-2xx liefert functions.invoke `data = null` — der
       Antwortkoerper mit der eigentlichen Meldung steckt in error.context,
       einer Response. Ohne dieses Auslesen sah ein Fehler am 20.08.2026 nur
       als "Edge Function returned a non-2xx status code" aus, waehrend der
       Grund ungelesen daneben lag. */
    let ausKoerper: string | null = null;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const roh = await ctx.clone().text();
        const j = JSON.parse(roh);
        ausKoerper = j?.fehler
          ?? (Array.isArray(j?.laeufe) ? j.laeufe.map((l: {meldung?: string}) => l?.meldung).filter(Boolean).join(" · ") : null)
          ?? roh.slice(0, 500);
      } catch { /* kein JSON — dann bleibt die Meldung des Clients */ }
    }
    return { daten: null, fehler: ausKoerper || data?.fehler || error.message || "Lauf fehlgeschlagen" };
  }
  if (data?.fehler) return { daten: null, fehler: String(data.fehler) };
  return { daten: data as SyncAntwort, fehler: null };
}

/* ══════════════════════════════════════════════════════════════════════
   Zwei Auskunfts-Aufrufe fuer die API-Kachel (10.09.2026)

   ⚠ WARUM SIE ES UEBERHAUPT BRAUCHT. Gemessen: `supabase` liegt NICHT
   am Fensterobjekt — App.tsx legt den Client in ein modul-lokales
   `const` und reicht ihn per Prop durch. Aus der Browser-Konsole ist er
   damit nicht erreichbar, und die Edge Functions verlangen einen
   angemeldeten Administrator (kein Schluessel kommt daran vorbei).

   **Ohne Knopf gibt es keinen Weg zu diesen Aktionen.** Das ist der
   ganze Grund; es geht nicht um Bequemlichkeit.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Den Antwortkoerper aus einem non-2xx holen.
 *
 * ⚠ `functions.invoke` liefert bei non-2xx `data = null`; die eigentliche
 * Meldung steckt in `error.context`. Ohne dieses Auslesen sah ein Fehler
 * am 20.08.2026 nur als „non-2xx status code" aus, waehrend der Grund
 * ungelesen danebenlag. Dieselbe Mechanik wie in starteSync().
 */
async function fehlerText(error: unknown, data: unknown): Promise<string> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try {
      const roh = await ctx.clone().text();
      const j = JSON.parse(roh);
      if (j?.fehler) return String(j.fehler);
      return roh.slice(0, 500);
    } catch { /* kein JSON — dann bleibt die Meldung des Clients */ }
  }
  const d = data as { fehler?: unknown } | null;
  if (d?.fehler) return String(d.fehler);
  return (error as { message?: string })?.message || "Aufruf fehlgeschlagen";
}

/** Die Vorschau des WordPress-Exports — liest, sendet nichts. */
export async function holeVorschau(
  sb: Sb,
): Promise<{ daten: Record<string, unknown> | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("wp-export", { body: { aktion: "probe" } });
  if (error) return { daten: null, fehler: await fehlerText(error, data) };
  if ((data as { fehler?: unknown })?.fehler) {
    return { daten: null, fehler: String((data as { fehler: unknown }).fehler) };
  }
  return { daten: data as Record<string, unknown>, fehler: null };
}

/** Die Feldnamen einer echten SFV-Rohantwort — nur Namen, keine Werte. */
/**
 * Was der Verband je Gruppe liefert — Leseprobe, schreibt nichts.
 *
 * ⚠ ⚠ ANLASS, 13.09.2026: bei fünf Gruppen fehlen Spiele vom 9. bis 12.09.
 * im gelieferten Tabellenstand. Die Frage ist nicht, welche Zahl bei uns
 * steht, sondern welche ankommt — und die beantwortet keine Abfrage auf
 * unsere Tabelle, sondern nur ein Abruf.
 *
 * ⚠ ⚠ UND SIE HAT EINEN TAG LANG KEINEN AUFRUFER GEHABT. Die Aktion war in
 * der Function gebaut, geprüft und deployt — und von der Oberfläche nicht
 * erreichbar. **Gebaut, nicht angeschlossen**, an demselben Tag, an dem
 * dieser Fehler dreimal ins Papier geschrieben wurde. Die Frage dagegen
 * kostet nichts: *wer ruft das?*
 */
export async function holeRangprobe(
  sb: Sb,
): Promise<{ daten: Record<string, unknown> | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", { body: { aktion: "rangprobe" } });
  if (error) return { daten: null, fehler: await fehlerText(error, data) };
  if ((data as { fehler?: unknown })?.fehler) {
    return { daten: null, fehler: String((data as { fehler: unknown }).fehler) };
  }
  return { daten: data as Record<string, unknown>, fehler: null };
}

/**
 * Die Teamprobe — welche Mannschaften kennt der Verband, und was steht im
 * rohen Spielplan?
 *
 * ⚠ Sie gibt es seit dem 10.09.2026 und war bis zum 14.09.2026 **nicht
 * angeschlossen**: kein Dienst, kein Knopf, nur ein direkter Aufruf der
 * Function. Gebaut, nicht angeschlossen — derselbe Fall wie `rangprobe`,
 * `leseHalbzeit()` und `merkmale_nutzbar`.
 *
 * ⚠ Sie liest und schreibt nichts.
 */
export async function holeTeamprobe(
  sb: Sb,
): Promise<{ daten: Record<string, unknown> | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", { body: { aktion: "teamprobe" } });
  if (error) return { daten: null, fehler: await fehlerText(error, data) };
  if ((data as { fehler?: unknown })?.fehler) {
    return { daten: null, fehler: String((data as { fehler: unknown }).fehler) };
  }
  return { daten: data as Record<string, unknown>, fehler: null };
}

/**
 * Die Nummernprobe — antwortet die Schnittstelle auf eine Mannschaftsnummer,
 * die sie von sich aus nicht nennt?
 *
 * ⚠ ANLASS, 14.09.2026: die Teamseite einer Turniermannschaft beim Verband
 * trägt `t=38315`. **Die Mannschaften ohne Rangliste haben eine Nummer** —
 * sie stehen nur nicht in `/api/team/list`.
 *
 * > Eine Liste, die eine Mannschaft nicht nennt, muss sie nicht ablehnen.
 *
 * ⚠ Sie liest und schreibt nichts.
 */
export async function holeNummernprobe(
  sb: Sb, team?: number,
): Promise<{ daten: Record<string, unknown> | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", {
    body: team === undefined ? { aktion: "nummernprobe" }
      : { aktion: "nummernprobe", team },
  });
  if (error) return { daten: null, fehler: await fehlerText(error, data) };
  if ((data as { fehler?: unknown })?.fehler) {
    return { daten: null, fehler: String((data as { fehler: unknown }).fehler) };
  }
  return { daten: data as Record<string, unknown>, fehler: null };
}

export async function holeRohschluessel(
  sb: Sb,
): Promise<{ daten: Record<string, unknown> | null; fehler: string | null }> {
  if (!sb) return { daten: null, fehler: "Keine Verbindung" };
  const { data, error } = await sb.functions.invoke("sfv-sync", { body: { aktion: "rohschluessel" } });
  if (error) return { daten: null, fehler: await fehlerText(error, data) };
  if ((data as { fehler?: unknown })?.fehler) {
    return { daten: null, fehler: String((data as { fehler: unknown }).fehler) };
  }
  return { daten: data as Record<string, unknown>, fehler: null };
}

/**
 * Die Jahrgänge aus einer `namen`-Antwort — **dieselbe Allowlist wie
 * `leseNamenAntwort`, nur das andere Feld.**
 *
 * ⚠ WARUM EIN ZWEITER LESER UND NICHT EIN REICHERES `namen`: die Namensmap
 * hat einen zweiten Verwender (`TermineModul`, der Spielverlauf), und der
 * braucht ausschliesslich Namen. Beide entstehen aus **einem** Aufruf an
 * **einer** Stelle — sie können also nicht auseinanderlaufen, und das ist
 * der Unterschied zu zwei Rechnungen für dieselbe Frage.
 *
 * ⚠ NICHTS DAVON WIRD GESPEICHERT. Der Jahrgang lebt im Zustand der Maske,
 * wie der Name; beim Neuladen ist er weg. Dieselbe Entscheidung wie am
 * 21.08.2026, und aus einem schärferen Grund — **ein Geburtsjahr veraltet
 * nicht.**
 */
export function leseNamenJahrgaenge(daten: NamenAntwort | null): Record<number, number> {
  const raus: Record<number, number> = {};
  for (const e of daten?.namen ?? []) {
    const id = Number(e?.sfv_person_id);
    const j = Number(e?.jahrgang);
    /* ⚠ `Number(null)` ist 0, `Number(undefined)` ist NaN — beides muss
       hier fallen. Ein Jahrgang 0 wäre kein Jahrgang, sondern ein
       fehlender, der wie einer aussieht. */
    if (Number.isFinite(id) && Number.isInteger(j) && j >= 1930) raus[id] = j;
  }
  return raus;
}
