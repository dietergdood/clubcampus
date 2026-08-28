/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/heimAuswaerts.ts
   Heim- und Auswaertsbilanz eines eigenen Teams.
   Liegt neben spielMapper.ts statt darin: eigener Zweck, und der Mapper
   stand mit dem Block bei 301 Zeilen.
   ═══════════════════════════════════════════════════════════════ */
import type { SpielUi } from "./spielMapper.ts";

/* ── Heim- und Auswaertsbilanz ───────────────────────────────────────────
   Nur fuer EIGENE Teams, und das ist keine Sparmassnahme: fuer eine
   Gruppentabelle mit Heim-/Auswaertstrennung fehlen die Spiele ohne
   FCH-Beteiligung, und die sind nicht zu beschaffen. Gemessen am 28.08.2026:
   der Verband liefert ueber /api/club/schedule ausschliesslich Spiele mit
   eigener Beteiligung (`ohne_team` war in allen 185 Laeufen 0), einen
   gruppenweiten Endpunkt gibt es nicht (Swagger v26.7.10.1, 15 Endpunkte),
   und die ClubId fremder Vereine steht nirgends im Bestand — `club_nummer`
   ist die clubNumber, eine andere Zahl.

   ⚠ `resultat` steht IMMER in der Reihenfolge des Verbands, Heim:Gast.
   Belegt am 28.08.2026, zweifach:
     · matchId 4308382 — /api/match/{id} nennt FC Kuesnacht `isHomeTeam: true`,
       unsere Zeile fuehrt `heimspiel = false`; also ist Team A das Heimteam.
     · ueber alle 269 Spiele stimmt `heimspiel` mit dem Spielort ueberein.
       Die vier Ausnahmen sind Heimspiele der Senioren auf dem ausgelagerten
       Platz in Kuesnacht — erkennbar daran, dass der Gegner dort nicht der
       FC Kuesnacht ist.
   Wer diese Zuordnung dreht, dreht jede Bilanz. Sie ist nicht geraten.

   ⚠ EIN DERBY FEHLT DEM GASTTEAM. Treffen zwei eigene Teams aufeinander,
   gibt es nur eine Zeile, und sie gehoert dem Heimteam (sync.ts:60-62).
   Heute 0 von 269 Faellen — alle 21 FCH-Teams stehen in 21 verschiedenen
   Gruppen. Sobald zwei in dieselbe geraten, fehlt der Auswaertsseite eine
   Partie. Siehe CLAUDE.md, „Zwei eigene Teams gegeneinander ergeben EINE
   Zeile". */

export interface BilanzZeile {
  sp: number;
  s: number;
  u: number;
  n: number;
  tore: number;
  gegentore: number;
  diff: number;
  pts: number;
}

const LEER = (): BilanzZeile =>
  ({ sp: 0, s: 0, u: 0, n: 0, tore: 0, gegentore: 0, diff: 0, pts: 0 });

/** "3:1" → [3, 1]; alles andere → null. Ein Resultat, das sich nicht lesen
    laesst, wird uebersprungen und nicht als 0:0 gezaehlt — sonst erfaende
    die Bilanz ein Unentschieden. */
export function leseResultat(result: string | null): [number, number] | null {
  if (!result) return null;
  const teile = result.split(":");
  if (teile.length !== 2) return null;
  const h = Number(teile[0].trim()), g = Number(teile[1].trim());
  if (!Number.isInteger(h) || !Number.isInteger(g) || h < 0 || g < 0) return null;
  return [h, g];
}

/** Heim, auswaerts und zusammen — aus den Meisterschaftsspielen EINES Teams.
    Cup, Schweizer-Cup und Trainingsspiele bleiben draussen: eine Tabelle
    zeigt den Wettbewerb, in dem die Rangliste gefuehrt wird. */
export function heimAuswaertsBilanz(
  spiele: SpielUi[],
): { heim: BilanzZeile; auswaerts: BilanzZeile; gesamt: BilanzZeile } {
  const heim = LEER(), auswaerts = LEER();

  for (const s of spiele) {
    if (!s.meisterschaft || !s.ausgetragen) continue;
    const gelesen = leseResultat(s.result);
    if (!gelesen) continue;
    const [heimTore, gastTore] = gelesen;

    const b = s.home ? heim : auswaerts;
    const unsere = s.home ? heimTore : gastTore;
    const ihre = s.home ? gastTore : heimTore;

    b.sp += 1;
    b.tore += unsere;
    b.gegentore += ihre;
    if (unsere > ihre) { b.s += 1; b.pts += 3; }
    else if (unsere === ihre) { b.u += 1; b.pts += 1; }
    else { b.n += 1; }
  }

  for (const b of [heim, auswaerts]) b.diff = b.tore - b.gegentore;

  const gesamt: BilanzZeile = {
    sp: heim.sp + auswaerts.sp,
    s: heim.s + auswaerts.s,
    u: heim.u + auswaerts.u,
    n: heim.n + auswaerts.n,
    tore: heim.tore + auswaerts.tore,
    gegentore: heim.gegentore + auswaerts.gegentore,
    diff: heim.diff + auswaerts.diff,
    pts: heim.pts + auswaerts.pts,
  };

  return { heim, auswaerts, gesamt };
}
