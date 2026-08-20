import { describe, it, expect } from "vitest";
import { schwaerze } from "../../../../supabase/functions/sfv-sync/protokoll.ts";

/* Die Regel "kein console.* im sfv-sync-Ordner" war gegen Zugangsdaten
   gerichtet und hat dabei auch die Fehler verschluckt. Sie ist jetzt genau
   gefasst: Fehlermeldungen ja, Geheimnisse nie. Diese Tests halten die
   zweite Hälfte fest. */
describe("schwaerze", () => {
  it("entfernt einen JWT", () => {
    const t = "Auth fehlgeschlagen: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(schwaerze(t)).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(schwaerze(t)).toContain("Auth fehlgeschlagen");
  });

  it("entfernt lange Zeichenketten ohne Leerzeichen", () => {
    /* Der SFV-Token hat diese Form — lieber ein Wort zu viel geschwärzt als
       ein Token zu wenig. */
    const t = "Token abgelehnt: aZ9_kQm3xP7vLd2Ns8Rt4Yb6Hc1Jf5Gw0Ue3Ip7Ox9Qa2";
    expect(schwaerze(t)).toContain("«lang»");
    expect(schwaerze(t)).not.toContain("aZ9_kQm3xP7vLd2Ns8Rt4Yb6Hc1Jf5Gw0Ue3Ip7Ox9Qa2");
  });

  it("entfernt Schlüssel-Wert-Paare, behält aber den Schlüsselnamen", () => {
    /* Der Name hilft beim Suchen, der Wert darf nie erscheinen. */
    const raus = schwaerze("body: applicationPass=geheim123 und X-Sync-Key: abc");
    expect(raus).toContain("applicationPass");
    expect(raus).not.toContain("geheim123");
    expect(raus).not.toContain(": abc");
  });

  it("entfernt Verbindungszeichenketten", () => {
    const raus = schwaerze("postgresql://user.ref:pw@host:5432/postgres nicht erreichbar");
    expect(raus).not.toContain("pw@host");
    expect(raus).toContain("nicht erreichbar");
  });

  it("lässt eine gewöhnliche Fehlermeldung unangetastet", () => {
    /* Der Fall, für den es die Datei gibt — genau diese Meldung fehlte
       am 20.08.2026 in den Logs. */
    const t = "sync_felder nennt Spalten, die der Sync nicht berechnet: sfv_spiel_nr, schiedsrichter";
    expect(schwaerze(t)).toBe(t);
  });

  it("lässt HTTP-Meldungen und Constraint-Namen stehen", () => {
    for (const t of ["SFV antwortet mit HTTP 502",
                     "duplicate key value violates unique constraint \"mitglieder_spielerpass_aktiv_key\"",
                     "42P10 there is no unique or exclusion constraint matching"]) {
      expect(schwaerze(t)).toBe(t);
    }
  });
});
