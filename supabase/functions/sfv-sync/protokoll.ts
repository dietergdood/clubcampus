// ClubCampus — supabase/functions/sfv-sync/protokoll.ts
//
// Die einzige Stelle in diesem Ordner, die console.* benutzen darf.
//
// ⚠ WARUM ES SIE GIBT. Die Regel "kein console.* im sfv-sync-Ordner" war
// gegen ZUGANGSDATEN gerichtet: kein Token, kein Antwortkoerper des SFV, kein
// Geheimnis im Log. Sie hat aber auch die FEHLER verschluckt. Am 20.08.2026
// scheiterte ein Lauf mit non-2xx, und die Supabase-Logs zeigten nur "booted"
// und "shutdown" — die Ursache (sync_felder nannte zwei Spalten, die der Sync
// nicht berechnet) war nirgends zu sehen.
//
// Das ist dasselbe Problem wie ein leerer catch: etwas, das aussieht wie ein
// Zustand, obwohl es ein Ausfall ist. Ein Fehler ohne Spur ist schlimmer als
// einer, der laut abbricht.
//
// DIE REGEL BLEIBT, sie wird nur genau gefasst:
//   Fehlermeldungen JA — Zugangsdaten NIE.
//
// Deshalb geht nichts direkt an console. Alles laeuft durch schwaerze(),
// und was auch nur nach einem Geheimnis aussieht, wird ersetzt.

/* Was nie im Log stehen darf. Wie ueberall in diesem Projekt eine
   Allowlist waere hier falsch — es geht nicht um Struktur, sondern um
   Zeichenketten, deren Form man kennt. Deshalb ausnahmsweise Muster, dafuer
   grosszuegig geschnitten: lieber ein Wort zu viel geschwaerzt als ein
   Token zu wenig. */
const GEHEIM: Array<[RegExp, string]> = [
  /* JWT: drei base64-Abschnitte mit Punkten. */
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "«token»"],
  /* Der SFV-Token und aehnliche lange Zeichenketten ohne Leerzeichen. */
  [/\b[A-Za-z0-9_-]{40,}\b/g, "«lang»"],
  /* Alles, was wie ein Schluessel-Wert-Paar aussieht. */
  [/(applicationKey|applicationPass|X-User-Token|X-Sync-Key|apikey|authorization|password|secret)\s*[:=]\s*\S+/gi,
   "$1=«geheim»"],
  /* Verbindungszeichenketten. */
  [/\b\w+:\/\/[^\s@]+@\S+/g, "«verbindung»"],
];

export function schwaerze(text: string): string {
  let raus = text;
  for (const [muster, ersatz] of GEHEIM) raus = raus.replace(muster, ersatz);
  return raus;
}

/**
 * Eine Zeile ins Log. NUR Text, nie ein Objekt — ein Objekt zu serialisieren
 * ist der Weg, auf dem ein Antwortkoerper des SFV mitkaeme.
 *
 * Der Aufrufer entscheidet, was gesagt wird; diese Funktion sorgt nur dafuer,
 * dass kein Geheimnis darin steht.
 */
export function protokoll(bereich: string, meldung: string): void {
  console.log(`[sfv-sync/${bereich}] ${schwaerze(meldung)}`);
}

/** Ein Fehler mit seiner Meldung — der Fall, fuer den es diese Datei gibt.
    Der Stack bleibt draussen: er nennt Dateipfade, keine Ursachen. */
export function protokollFehler(bereich: string, e: unknown): string {
  const meldung = e instanceof Error ? e.message : String(e);
  const sauber = schwaerze(meldung);
  console.error(`[sfv-sync/${bereich}] FEHLER: ${sauber}`);
  return sauber;
}
