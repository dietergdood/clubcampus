/* ═══════════════════════════════════════════════════════════════════
   Die Deutung der Antwort von `aktion: "nummernprobe"`.

   ⚠ ⚠  ANLASS, 14.09.2026. Die Teamseite einer Turniermannschaft beim
   Verband trägt `t=38315` — dieselbe Vereinskennung 1516, und die Nummer
   liegt im selben Bereich wie unsere (38301–38312). **Kein anderer
   Nummernkreis: sie steht schlicht nicht in der Liste.**

   > **Eine Liste, die eine Mannschaft nicht nennt, muss sie nicht
   > ablehnen.** Das sind zwei verschiedene Dinge, und gemessen war bis
   > zum 14.09.2026 nur das erste.

   ⚠ Ein 404 ist hier eine ANTWORT und kein Fehler: „der Endpunkt kennt
   die Nummer nicht" ist genau das, was die Probe wissen will.
   ═══════════════════════════════════════════════════════════════════ */

/** Ein Versuch, wie `nummernprobe` ihn meldet. */
export interface Versuch {
  weg?: unknown;
  status?: unknown;
  ausgang?: unknown;
  schluessel?: unknown;
}

export function deuteNummernprobe(d: Record<string, unknown>): string[] {
  const z = (k: string) => Number(d[k] ?? 0);
  const nummer = z("gesucht");
  const zeilen: string[] = [];

  /* ══ DER SUCHRAUM ZUERST ════════════════════════════════════════════
     ⚠ „Nichts gefunden" und „nicht gesucht" sehen sonst gleich aus —
     und ein Ergebnis ohne Suchraum ist kein Befund. */
  const sr = d.suchraum as Record<string, unknown> | undefined;
  if (sr) {
    zeilen.push(`${Number(sr.pfade_in_der_spezifikation ?? 0)} Pfade in der `
      + `Spezifikation · ${Number(sr.pfade_mit_teamnummer ?? 0)} nehmen eine `
      + `Mannschaftsnummer · ${Number(sr.versuche_gesamt ?? 0)} Versuche gemacht`);
    if (sr.begriffe_geprueft) zeilen.push(`   ${String(sr.begriffe_geprueft)}`);
  }

  /* ══ DIE ZWEI GRUNDMESSUNGEN ════════════════════════════════════════
     ⚠ Steht die Nummer im ROHEN Spielplan, kippt der Befund vom
     14.09.2026: dann kommt sie an, und wir werfen sie weg. */
  zeilen.push(d.steht_in_teamliste === true
    ? `⚠ ${nummer} STEHT in der Teamliste (${z("teamliste_gesamt")} Mannschaften) — `
      + "dann ist die Ausgangsannahme falsch, und die Zuordnung fehlt bei uns"
    : `${nummer} steht NICHT in der Teamliste (${z("teamliste_gesamt")} Mannschaften) `
      + "— wie erwartet");

  const imPlan = z("zeilen_im_rohen_spielplan");
  zeilen.push(imPlan > 0
    ? `⚠ ⚠ ${imPlan} Zeilen im rohen Spielplan (${z("spielplan_gesamt")}) nennen `
      + `${nummer} — DANN KOMMT SIE AN, und bildeSpiel() verwirft sie. Ein `
      + "FILTERproblem, und der Befund vom 14.09.2026 kippt."
    : `0 von ${z("spielplan_gesamt")} Spielplanzeilen nennen ${nummer} — `
      + "der ungefilterte Spielplan kennt sie nicht");

  /* ══ JEDER VERSUCH EINE ZEILE, auch der erfolglose ══════════════════ */
  const versuche = (d.versuche ?? []) as Versuch[];
  zeilen.push("Gezielte Abfragen:");
  for (const v of versuche) {
    const k = v.schluessel as { anzahl?: number; alle?: string[] } | null | undefined;
    const felder = k?.alle?.length ? ` · Felder: ${k.alle.join(", ")}` : "";
    zeilen.push(`   ${String(v.weg ?? "")} — ${String(v.ausgang ?? "?")}${felder}`);
  }

  /* ══ DIE EINE ZAHL, DIE ALLES ENTSCHEIDET ═══════════════════════════
     ⚠ Ein Weg mit Daten löst das ganze Problem — dann gibt es die
     Mannschaften über die Schnittstelle, nur nicht über die Liste. */
  const mitDaten = z("wege_mit_daten");
  zeilen.push(mitDaten > 0
    ? `✓ ${mitDaten} Weg(e) antworten mit Daten — die Schnittstelle KENNT die `
      + "Mannschaft, sie nennt sie nur nicht von selbst. Das löst das Problem."
    : "⚠ Kein Weg antwortet mit Daten. Die Schnittstelle lehnt die Nummer ab "
      + "oder hat nichts zu ihr — dann bleibt nur die Anfrage beim Verband, "
      + "und sie ist mit diesem Ergebnis stärker als ohne.");
  return zeilen;
}
