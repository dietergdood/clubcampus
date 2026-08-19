#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   ClubCampus — scripts/sfv-matchdaten-probelauf.mjs

   TROCKENLAUF des Matchdaten-Syncs. Holt echte Spiele von der SFV Club API
   und schickt sie durch die ECHTEN reinen Funktionen aus
   supabase/functions/sfv-sync/matchdaten.ts — schreibt aber NICHTS in die
   Datenbank und deployt nichts.

   ANLASS. Die Trennung eigen/fremd ist im Test gruen. Der Test kennt aber
   nur die Faelle, die jemand sich ausgedacht hat. Dieser Lauf zeigt sie am
   echten Bestand: ueber zehn Spiele, mit allem, was der Verband tatsaechlich
   liefert.

   ⚠ Er prueft auch das, was ein Test nicht kann: ob in einer der erzeugten
   Zeilen ein Personendatum steht, das dort nicht hingehoert. Nicht gegen
   eine Liste verbotener Namen — sondern indem er JEDEN Wert der Rohantwort,
   der personenbezogen ist, in den erzeugten Zeilen sucht.

   Aufruf:  node --env-file=supabase/functions/.env scripts/sfv-matchdaten-probelauf.mjs [anzahl]
   ═══════════════════════════════════════════════════════════════════════════ */
import { bildeAufstellung, bildeEreignis, leseHalbzeit, waehleKandidaten }
  from "../supabase/functions/sfv-sync/matchdaten.ts";

const ANZAHL = Number(process.argv[2] ?? 10);
const BASIS = (process.env.SFV_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.SFV_APPLICATION_KEY;
const PASS = process.env.SFV_APPLICATION_PASS;
const CLUB_ID = process.env.SFV_CLUB_ID;
const UNSERE = 11057;   // vereine.sfv_club_nummer

if (!BASIS || !KEY || !PASS || !CLUB_ID) {
  console.error("Zugangsdaten fehlen (SFV_API_URL, SFV_APPLICATION_KEY, SFV_APPLICATION_PASS, SFV_CLUB_ID)");
  process.exit(1);
}

/* Felder der Rohantwort, deren WERTE nirgends in einer erzeugten Zeile
   auftauchen duerfen. Anders als eine Denylist beim Uebernehmen ist das
   hier zulaessig: geprueft wird gegen die tatsaechlich gelieferten Werte,
   nicht gegen geratene Schluesselnamen. */
/* Nur Werte, deren Uebereinstimmung etwas BEDEUTET. `gender` (0/1/2) steht
   bewusst nicht hier: es trifft auf jede Minute und jede Positions-ID und
   meldete beim ersten Anlauf 4557 Zufaelle. Dass es nicht gespeichert wird,
   sichert die Allowlist strukturell — der Test in matchdaten.test.ts prueft
   die SCHLUESSEL des Ergebnisses und braucht dafuer keinen Wertvergleich.

   min: kuerzere Werte kollidieren zu leicht. Passnummern sind sechsstellig,
   Namen und Geburtsdaten lang genug. */
const PERSONENFELDER = [
  { feld: "personName", min: 3 }, { feld: "firstname", min: 3 },
  { feld: "name", min: 3 }, { feld: "secondName", min: 3 },
  { feld: "birthDate", min: 8 }, { feld: "passportNumber", min: 4 },
  { feld: "substitutePlayerName", min: 3 },
  { feld: "substitutePlayerBirthDate", min: 8 },
  { feld: "substitutePlayerPassportNumber", min: 4 },
];

async function holeToken() {
  const a = await fetch(`${BASIS}/api/token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationKey: KEY, applicationPass: PASS }),
  });
  if (!a.ok) throw new Error(`Token abgelehnt (HTTP ${a.status})`);
  return (await a.text()).trim().replace(/^"|"$/g, "");
}

async function hole(token, pfad) {
  const a = await fetch(`${BASIS}${pfad}`, {
    headers: { "X-User-Token": token, "X-User-Language": "1", Accept: "application/json" },
  });
  if (!a.ok) return null;
  let d; try { d = JSON.parse(await a.text()); } catch { return null; }
  if (typeof d === "string") { try { d = JSON.parse(d); } catch { /* dann der String */ } }
  return d;
}

const token = await holeToken();
const ids = await hole(token, `/api/common/ids?ClubId=${CLUB_ID}&Language=1`);
const saisons = ids?.sfv_ids?.seasons ?? [];
const jetzt = new Date();
const soll = jetzt.getUTCMonth() + 1 >= 7 ? jetzt.getUTCFullYear() + 1 : jetzt.getUTCFullYear();
const saison = saisons.find((s) => s.id === soll) ?? saisons.slice().sort((a, b) => b.id - a.id)[0];

const plan = await hole(token, `/api/club/schedule?SeasonId=${saison.id}&ClubId=${CLUB_ID}&Language=1`);
const ausgetragen = (plan ?? []).filter((s) => s.matchState === 2);

/* Wie im echten Lauf: waehleKandidaten entscheidet, nicht dieses Skript.
   matchdaten_geholt_am ist hier ueberall null — es ist der erste Lauf. */
const kandidaten = waehleKandidaten(
  ausgetragen.map((s) => ({
    id: String(s.matchId), date: String(s.matchDate ?? "").slice(0, 10),
    matchdaten_geholt_am: null, sfv_match_id: s.matchId,
  })), jetzt, ANZAHL,
);

console.log(`Saison ${saison.name} · ${plan.length} Spiele, ${ausgetragen.length} ausgetragen`);
console.log(`Kandidaten dieses Laufs: ${kandidaten.length} (Obergrenze ${ANZAHL})\n`);

const summe = { spiele: 0, aufstellung: 0, ereignisEigen: 0, ereignisFremd: 0, fehler: 0 };
const personen = new Set();
const lecks = [];
const unvollstaendig = [];
let ersterBericht = null;

for (const k of kandidaten) {
  const id = k.sfv_match_id;
  const match = await hole(token, `/api/match/${id}?Language=1`);
  const rohP = await hole(token, `/api/match/${id}/players?Language=1`);
  const rohE = await hole(token, `/api/match/${id}/events?Language=1`);
  if (!match || !rohP || !rohE) { summe.fehler += 1; continue; }

  const jetztIso = new Date().toISOString();
  const aufstellung = rohP.map((p) => bildeAufstellung(p, UNSERE, "v1", String(id), jetztIso)).filter(Boolean);
  const ereignisse = rohE.map((e) => bildeEreignis(e, UNSERE, "v1", String(id), jetztIso)).filter(Boolean);

  /* Leckprüfung: jeder personenbezogene WERT der Rohantwort darf in keiner
     erzeugten Zeile vorkommen — ausser der personId eigener Spieler, die
     bewusst uebernommen wird. */
  /* Auf GLEICHHEIT der Feldwerte, nicht auf Teilstrings im JSON. Der erste
     Anlauf verglich per includes() — und meldete ein Leck, weil ein Spieler
     "Sturm" heisst und zwei erzeugte Zeilen position_name "Sturmspitze"
     tragen. Ein Teilstring-Vergleich meldet solche Zufaelle als Fund und
     entwertet damit jede echte Meldung. */
  for (const roh of [...rohP, ...rohE]) {
    for (const { feld, min } of PERSONENFELDER) {
      const wert = roh[feld];
      if (wert === null || wert === undefined || String(wert).length < min) continue;
      for (const zeile of [...aufstellung, ...ereignisse]) {
        for (const [k, v] of Object.entries(zeile)) {
          if (v !== null && v !== undefined && String(v) === String(wert)) {
            lecks.push({ spiel: id, feld, spalte: k, wert: String(wert).slice(0, 3) + "…" });
          }
        }
      }
    }
  }

  for (const a of aufstellung) personen.add(a.sfv_person_id);
  summe.spiele += 1;
  summe.aufstellung += aufstellung.length;
  summe.ereignisEigen += ereignisse.filter((e) => e.ist_eigener).length;
  summe.ereignisFremd += ereignisse.filter((e) => !e.ist_eigener).length;

  const teams = (match.teams ?? []).map((t) => `${t.clubName}${t.clubNumber === UNSERE ? " ←uns" : ""}`).join(" – ");
  console.log(`  ${String(k.date).padEnd(10)} Spiel ${id}  ${teams}`);
  console.log(`      ${match.scoreTeamA}:${match.scoreTeamB} (HZ ${leseHalbzeit(match) ?? "—"})  ·  `
            + `${aufstellung.length} eigene Spieler, ${ereignisse.length} Ereignisse `
            + `(${ereignisse.filter((e) => e.ist_eigener).length} uns / ${ereignisse.filter((e) => !e.ist_eigener).length} Gegner)`);

  /* Vollstaendigkeitsprobe: stimmt die Zahl der Tor-Ereignisse mit dem
     Endstand ueberein? Wenn nicht, ist die Ereignisliste des Verbands
     lueckenhaft — und ein Spielbericht darf den Stand dann nicht aus den
     Ereignissen rechnen, sondern muss ihn aus `spiele.resultat` nehmen. */
  const tore = ereignisse.filter((e) => e.typ_id === 1).length;
  const endstand = (Number(match.scoreTeamA) || 0) + (Number(match.scoreTeamB) || 0);
  if (tore !== endstand) unvollstaendig.push({ spiel: id, tore, endstand });

  if (!ersterBericht && ereignisse.length) ersterBericht = { id, teams, ereignisse, aufstellung };
}

console.log(`\n── Summe über ${summe.spiele} Spiele ──`);
console.log(`  Aufstellungszeilen (nur eigene)  ${summe.aufstellung}`);
console.log(`  Ereignisse eigen / fremd         ${summe.ereignisEigen} / ${summe.ereignisFremd}`);
console.log(`  verschiedene eigene Spieler      ${personen.size}  → so viele Zuordnungen von Hand`);
if (summe.fehler) console.log(`  Spiele ohne Matchdaten           ${summe.fehler}`);

console.log(`\n── Leckprüfung: Personendaten in erzeugten Zeilen ──`);
if (lecks.length === 0) {
  console.log("  keine — kein Name, kein Geburtsdatum, keine Passnummer ist durchgekommen");
} else {
  console.log(`  >>> ${lecks.length} LECK(S):`);
  for (const l of lecks.slice(0, 10)) console.log(`      Spiel ${l.spiel}  ${l.feld} → Spalte ${l.spalte} = ${l.wert}`);
}

console.log(`
── Vollständigkeit: Tor-Ereignisse gegen Endstand ──`);
if (unvollstaendig.length === 0) {
  console.log("  alle Spiele stimmen überein");
} else {
  console.log(`  ${unvollstaendig.length} von ${summe.spiele} Spielen weichen ab:`);
  for (const u of unvollstaendig) console.log(`      Spiel ${u.spiel}: ${u.tore} Tor-Ereignisse, Endstand ergibt ${u.endstand}`);
}

if (ersterBericht) {
  console.log(`\n── So sähe ein Spielbericht aus (Spiel ${ersterBericht.id}: ${ersterBericht.teams}) ──`);
  for (const e of [...ersterBericht.ereignisse].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))) {
    const wer = e.ist_eigener ? `wir · Nr ${e.rueckennr ?? "—"} (personId ${e.sfv_person_id})` : e.gegner_club_name;
    console.log(`  ${String(e.minute ?? "?").padStart(3)}.  ${String(e.typ ?? "?").padEnd(20)} ${wer}`);
  }
  console.log(`\n  Aufstellung (eigene), erste fünf:`);
  for (const a of ersterBericht.aufstellung.slice(0, 5)) {
    console.log(`      Nr ${String(a.rueckennr ?? "—").padStart(2)}  ${String(a.position_name ?? "—").padEnd(28)} `
              + `${a.von_minute}–${a.bis_minute}'  personId ${a.sfv_person_id}`);
  }
}
