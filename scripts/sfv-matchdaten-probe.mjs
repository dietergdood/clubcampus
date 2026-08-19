#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   ClubCampus — scripts/sfv-matchdaten-probe.mjs

   Holt EIN ausgetragenes Spiel von der SFV Club API und legt die drei
   Antworten als Beispiel ab — /api/match/{id}, /players, /events.

   ANLASS. `docs/auftrag_matchdaten.md` sagt, unterschieden werde ueber
   `clubNumber` pro Eintrag. Belegt ist das bislang nur fuer die Ranglisten
   (`sfv-sync/sync.ts` liest dort `r.clubNumber`). Ob die Zahl in der
   Aufstellung an JEDEM Eintrag haengt oder nur auf Match-Ebene in `teams[]`,
   entscheidet, wie die Erkennung eigener Spieler gebaut wird. Diese Probe
   beantwortet das an echten Daten statt an einer Annahme.

   ⚠ PERSONENDATEN. Die Endpunkte liefern `personName`, `birthDate` und
   `passportNumber` — auch von Spielern anderer Vereine, darunter
   Minderjaehrige. Genau diese Daten sollen laut Auftrag NIE gespeichert
   werden. Eine rohe Antwort ins Repo zu legen waere derselbe Fehler in
   gross: git vergisst nichts, ein spaeteres Loeschen entfernt sie nicht
   aus der Historie.

   Deshalb schwaerzt dieses Skript, BEVOR es schreibt, und meldet jeden
   geschwaerzten Schluessel. Was durchkommt, ist die Struktur — Schluessel,
   Typen, Zahlen — und die beantwortet die Frage vollstaendig.

   ZUGANG. Nichts davon steht im Repo. Vor dem Lauf setzen:

     export SFV_API_URL=https://…            (api_verbindungen.api_url)
     export SFV_APPLICATION_KEY=…
     export SFV_APPLICATION_PASS=…
     export SFV_CLUB_ID=1516

   EIN TOKEN PRO LAUF. Die API kennt pro Anwendung genau einen gueltigen
   Token; ein zweiter POST /api/token macht den ersten sofort ungueltig
   (13.08.2026 gemessen). Dieses Skript holt genau einen — und macht damit
   waehrend seines Laufs den Token eines gleichzeitig laufenden Syncs
   ungueltig. Nicht parallel zum stuendlichen cron-Auftrag starten.

   Aufruf:  node scripts/sfv-matchdaten-probe.mjs [zielordner] [matchId]
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ZIEL = process.argv[2] || ".";
const MATCH_ID_ARG = process.argv[3] ? Number(process.argv[3]) : null;

const BASIS = (process.env.SFV_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.SFV_APPLICATION_KEY;
const PASS = process.env.SFV_APPLICATION_PASS;
const CLUB_ID = process.env.SFV_CLUB_ID;

if (!BASIS || !KEY || !PASS || !CLUB_ID) {
  console.error("Zugangsdaten fehlen. Erwartet: SFV_API_URL, SFV_APPLICATION_KEY, SFV_APPLICATION_PASS, SFV_CLUB_ID");
  process.exit(1);
}

/* ── Schwaerzen: was nicht ausdruecklich erlaubt ist, faellt ──────────────
   Erster Anlauf am 19.08.2026 war eine Denylist per Regex
   (/person|player|birth|passport|…/). Sie war gleichzeitig zu streng und zu
   lasch: sie schwaerzte `personId` und `isPlayer`, liess aber `firstname`,
   `name`, `secondName` und `gender` durch — die Klarnamen aller 32 Spieler.
   Ein Ausdruck, der Schluesselnamen raet, kann das nicht leisten.

   Deshalb umgekehrt: ERLAUBT ist, was hier steht. Alles andere wird
   geschwaerzt und am Ende einzeln gemeldet. Liefert der SFV eines Tages ein
   neues Feld, ist es im Zweifel geschwaerzt und faellt in der Meldung auf —
   statt still in einer Datei zu landen, die ins Repo wandert.

   Aufgenommen wird nur, was die Struktur zeigt oder fuer den Sync gebraucht
   wird. IDs bleiben: sie zeigen keine Person, sondern nur, dass es eine
   stabile Kennung gibt — genau der Punkt, den die Probe klaeren soll. */
const ERLAUBT = new Set([
  /* Zuordnung und Herkunft */
  "personId", "playerId", "substitutePlayerId", "clubNumber", "clubName",
  "teamId", "teamName", "teamFullname", "isHomeTeam", "isNotRegisteredPlayer",
  /* Aufstellung */
  "jerseyNumber", "substitutePlayerJerseyNumber", "positionId", "positionName",
  "assignmentRoleId", "assignmentRoleName",
  "playFromMinute", "playUntilMinute", "totalPlayTime",
  /* Ereignisse */
  "eventId", "eventTypeId", "eventTypeName", "eventSubTypeId", "eventSubTypeName",
  "minute", "additionalMinute", "seconds", "exactEventTime",
  "isEventTemporary", "isPlayer", "roleId", "roleCategoryId", "roleCategoryName",
  /* Match-Ebene (/api/match/{id}) — Spielangaben, kein Personenbezug.
     Nach der ersten Probe vom 19.08.2026 aufgenommen; vorher standen sie
     unter "nicht in ERLAUBT" und wurden vorsichtshalber geschwaerzt. */
  "matchId", "matchNumber", "matchDate", "matchState", "matchStateName",
  "matchType", "matchTypeName", "hasMatchStarted", "hasMatchEnded", "isMatchPause",
  "scoreTeamA", "scoreTeamB", "resultTypeId", "resultTypeName",
  "championshipName", "cupId", "cupName", "divisionId", "divisionName",
  "groupId", "groupName", "leagueId", "leagueName", "leagueNumber",
  "organisationId", "organisationName", "playDay", "playDayName", "roundNbr",
  "seasonId", "seasonName", "stadiumFieldId", "stadiumFieldName",
  "isUnkownStadiumField", "isTeamActive",
  "teamDivisionName", "teamLeagueId", "teamLeagueName", "teamOrganisationId",
]);

/* Nur zur Einordnung im Bericht — geschwaerzt wird beides gleich. */
const BEKANNT_PERSONENBEZOGEN = new Set([
  "firstname", "name", "secondName", "personName", "substitutePlayerName",
  "birthDate", "substitutePlayerBirthDate",
  "passportNumber", "substitutePlayerPassportNumber", "gender",
]);

const geschwaerzt = new Map();
const unbekannt = new Set();

/* Schluessel auf Match-Ebene (/api/match/{id}) sind Spielangaben, keine
   Personendaten — sie stehen nicht in ERLAUBT, weil ihre Liste erst mit der
   Probe bekannt wird. Der Bericht zeigt sie, dann werden sie aufgenommen. */
function schwaerze(wert, pfad = "") {
  if (Array.isArray(wert)) return wert.map((v, i) => schwaerze(v, `${pfad}[${i}]`));
  if (wert && typeof wert === "object") {
    const out = {};
    for (const [k, v] of Object.entries(wert)) {
      if (ERLAUBT.has(k)) { out[k] = schwaerze(v, `${pfad}.${k}`); continue; }
      if (v && typeof v === "object") { out[k] = schwaerze(v, `${pfad}.${k}`); continue; }
      geschwaerzt.set(k, (geschwaerzt.get(k) || 0) + 1);
      if (!BEKANNT_PERSONENBEZOGEN.has(k)) unbekannt.add(k);
      /* Typ und Vorhandensein bleiben erkennbar, der Inhalt nicht. */
      out[k] = v === null ? null : `«${typeof v} geschwaerzt»`;
    }
    return out;
  }
  return wert;
}

/* ── Struktur-Bericht ──────────────────────────────────────────────────────
   Jeder Pfad einmal, mit Typ. Das ist der eigentliche Ertrag: er zeigt, auf
   welcher Ebene `clubNumber` steht. */
function pfade(wert, pfad = "", raus = new Map()) {
  if (Array.isArray(wert)) {
    raus.set(`${pfad}[]`, `array(${wert.length})`);
    if (wert.length > 0) pfade(wert[0], `${pfad}[]`, raus);
    return raus;
  }
  if (wert && typeof wert === "object") {
    for (const [k, v] of Object.entries(wert)) pfade(v, pfad ? `${pfad}.${k}` : k, raus);
    return raus;
  }
  raus.set(pfad, wert === null ? "null" : typeof wert);
  return raus;
}

/* ── API ───────────────────────────────────────────────────────────────────
   Bewusst dieselbe Bauweise wie supabase/functions/sfv-sync/sfvApi.ts:
   kein Antwortkoerper und kein Token in einer Fehlermeldung. */
async function holeToken() {
  const a = await fetch(`${BASIS}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationKey: KEY, applicationPass: PASS }),
  });
  if (!a.ok) throw new Error(`Token abgelehnt (HTTP ${a.status})`);
  return (await a.text()).trim().replace(/^"|"$/g, "");
}

async function hole(token, pfad) {
  const a = await fetch(`${BASIS}${pfad}`, {
    headers: { "X-User-Token": token, "X-User-Language": "1", Accept: "application/json" },
  });
  if (!a.ok) return { fehler: `HTTP ${a.status}`, daten: null };
  let d;
  try { d = JSON.parse(await a.text()); } catch { return { fehler: "kein JSON", daten: null }; }
  if (typeof d === "string") { try { d = JSON.parse(d); } catch { /* dann eben der String */ } }
  return { fehler: null, daten: d };
}

/* ── Lauf ──────────────────────────────────────────────────────────────── */
const token = await holeToken();
console.log("Token geholt.");

/* Saison wie im Sync: aus dem Datum abgeleitet, gegen die Liste geprueft. */
const { daten: ids } = await hole(token, `/api/common/ids?ClubId=${CLUB_ID}&Language=1`);
const saisons = ids?.sfv_ids?.seasons ?? [];
const jetzt = new Date();
const gewuenscht = jetzt.getUTCMonth() + 1 >= 7 ? jetzt.getUTCFullYear() + 1 : jetzt.getUTCFullYear();
const saison = saisons.find((s) => s.id === gewuenscht) ?? saisons.slice().sort((a, b) => b.id - a.id)[0];
if (!saison) { console.error("Keine Saison gefunden."); process.exit(1); }
console.log(`Saison ${saison.id} (${saison.name}).`);

let matchId = MATCH_ID_ARG;
let spielInfo = null;
if (!matchId) {
  const { daten: plan } = await hole(token, `/api/club/schedule?SeasonId=${saison.id}&ClubId=${CLUB_ID}&Language=1`);
  const ausgetragen = (plan || []).filter((s) => s.matchState === 2);
  console.log(`Spielplan: ${(plan || []).length} Spiele, davon ${ausgetragen.length} ausgetragen.`);
  if (ausgetragen.length === 0) { console.error("Kein ausgetragenes Spiel in dieser Saison."); process.exit(1); }
  /* Das juengste ausgetragene: am ehesten vollstaendig erfasst. */
  ausgetragen.sort((a, b) => String(b.matchDateTime ?? "").localeCompare(String(a.matchDateTime ?? "")));
  spielInfo = ausgetragen[0];
  matchId = spielInfo.matchId;
}
console.log(`Spiel ${matchId}.`);

const endpunkte = {
  match: `/api/match/${matchId}?Language=1`,
  players: `/api/match/${matchId}/players?Language=1`,
  events: `/api/match/${matchId}/events?Language=1`,
};

const roh = {};
for (const [name, pfad] of Object.entries(endpunkte)) {
  const { fehler, daten } = await hole(token, pfad);
  roh[name] = fehler ? { _fehler: fehler } : daten;
  console.log(`  ${name.padEnd(8)} ${fehler ?? "ok"}`);
}

/* ── Auswertung: wo steht clubNumber? ──────────────────────────────────── */
console.log("\n── clubNumber ──");
for (const [name, daten] of Object.entries(roh)) {
  const alle = [...pfade(daten).keys()].filter((p) => /clubnumber/i.test(p));
  console.log(`  ${name.padEnd(8)} ${alle.length ? alle.join(", ") : "— nicht vorhanden —"}`);
}

const sauber = {};
for (const [name, daten] of Object.entries(roh)) sauber[name] = schwaerze(daten);

console.log("\n── geschwaerzt, weil personenbezogen ──");
const bekannt = [...geschwaerzt].filter(([k]) => BEKANNT_PERSONENBEZOGEN.has(k));
for (const [k, n] of bekannt.sort((a, b) => b[1] - a[1])) console.log(`  ${k} (${n}×)`);

console.log("\n── geschwaerzt, weil nicht in ERLAUBT ──");
if (unbekannt.size === 0) console.log("  (keine)");
for (const k of [...unbekannt].sort()) {
  console.log(`  ${k} (${geschwaerzt.get(k)}×)  → ansehen und ggf. in ERLAUBT aufnehmen`);
}

const struktur = {};
for (const [name, daten] of Object.entries(roh)) {
  struktur[name] = Object.fromEntries([...pfade(daten)].sort());
}

mkdirSync(ZIEL, { recursive: true });
const kopf = {
  _hinweis: "Geschwaerzte Beispielantworten der SFV Club API. Personendaten sind durch «typ geschwaerzt» ersetzt — siehe scripts/sfv-matchdaten-probe.mjs.",
  _erhoben_am: new Date().toISOString().slice(0, 10),
  _match_id: matchId,
  _saison: saison,
};
writeFileSync(join(ZIEL, "matchdaten_beispiel.json"), JSON.stringify({ ...kopf, antworten: sauber }, null, 2), "utf8");
writeFileSync(join(ZIEL, "matchdaten_struktur.json"), JSON.stringify({ ...kopf, pfade: struktur }, null, 2), "utf8");
console.log(`\nGeschrieben nach ${ZIEL}: matchdaten_beispiel.json, matchdaten_struktur.json`);
