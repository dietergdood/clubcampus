// ClubCampus — supabase/functions/sfv-sync/logos.ts
// Vereinswappen der Gegner holen und im Bucket ablegen. Kein console.*.
//
// DER ENDPUNKT LIEFERT BASE64 ALS text/plain, nicht das Bild selbst — und
// das Format wechselt je nach dem, was der Verein hochgeladen hat (bei FCH
// ein GIF, bei FC Oberland United ein JPEG). Deshalb kommt der Typ aus den
// Magic Bytes und nicht aus einer Annahme; danach richtet sich auch die
// Dateiendung.
//
// UNSER EIGENES WAPPEN WIRD NIE GEHOLT. Es steht in vereine.theme, in
// besserer Qualitaet als die 80x80 vom Verband.

export const LOGO_BUCKET = "sfv-logos";

/* Fruehestens nach 30 Tagen erneut fragen. Herleitung in
   migration_sfv_logos.sql: das Wiederholen kostet unter einem Aufruf pro
   Tag, das Warten kostet nichts Dringendes — aber "einmal pro Saison"
   liesse ein im September nachgetragenes Wappen bis Juli verschwinden. */
export const WIEDERHOLUNG_TAGE = 30;

export interface LogoZeile {
  sfv_team_id: number;
  pfad: string | null;
  fehlt_seit: string | null;
}

/**
 * Welche Team-Ids sollen in diesem Lauf geholt werden?
 *
 * Nie geholt → sofort. Als fehlend vermerkt → erst nach der Frist. Bereits
 * abgelegt → nie wieder; ein Wappen, das liegt, wird nicht neu geholt.
 */
export function offeneLogos(
  gebraucht: number[], bekannt: LogoZeile[], jetzt: Date,
): number[] {
  const grenze = jetzt.getTime() - WIEDERHOLUNG_TAGE * 24 * 60 * 60 * 1000;
  const nachId = new Map(bekannt.map((z) => [Number(z.sfv_team_id), z]));

  const raus: number[] = [];
  for (const id of new Set(gebraucht)) {
    if (!Number.isFinite(id)) continue;
    const z = nachId.get(id);
    if (!z) { raus.push(id); continue; }        // nie versucht
    if (z.pfad) continue;                        // liegt schon
    if (!z.fehlt_seit) { raus.push(id); continue; }
    if (new Date(z.fehlt_seit).getTime() < grenze) raus.push(id);
  }
  return raus;
}

/**
 * Bildtyp aus den ersten Bytes. Gibt null zurueck, wenn es kein bekanntes
 * Bild ist — dann wird nichts abgelegt.
 *
 * ⚠ NICHT aus dem Content-Type des SFV: der sagt `text/plain`, weil der
 * Koerper Base64 ist. Und nicht geraten: derselbe Endpunkt liefert je nach
 * Verein GIF oder JPEG.
 */
export function erkenneBild(bytes: Uint8Array): { mime: string; endung: string } | null {
  const hat = (...bs: number[]) => bs.every((b, i) => bytes[i] === b);
  if (hat(0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", endung: "png" };
  if (hat(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", endung: "jpg" };
  if (hat(0x47, 0x49, 0x46, 0x38)) return { mime: "image/gif", endung: "gif" };
  /* WEBP: "RIFF" … "WEBP" */
  if (hat(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45
      && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: "image/webp", endung: "webp" };
  }
  return null;
}

/** Base64 → Bytes. Der Koerper kommt ohne data:-Praefix und ohne
    Anfuehrungszeichen, beides wird trotzdem abgeschnitten: eine Antwort,
    die sich morgen anders verpackt, soll nicht still Unsinn ablegen. */
export function ausBase64(text: string): Uint8Array | null {
  const roh = text.trim().replace(/^"|"$/g, "").replace(/^data:[^,]+,/, "");
  if (roh.length < 16) return null;
  try {
    const bin = atob(roh);
    const raus = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) raus[i] = bin.charCodeAt(i);
    return raus;
  } catch {
    return null;
  }
}

/** Pfad im Bucket. Mit verein_id davor, damit zwei Mandanten sich nicht
    gegenseitig eine Datei anderen Formats ueberschreiben. */
export function logoPfad(vereinId: string, sfvTeamId: number, endung: string): string {
  return `${vereinId}/${sfvTeamId}.${endung}`;
}
