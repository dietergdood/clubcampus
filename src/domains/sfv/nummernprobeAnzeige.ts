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
  nennt_gesuchte_nummer?: unknown;
  parameter_offenbar_ignoriert?: unknown;
  traegt_spielplanzeilen?: unknown;
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

  /* ══ DAS ZEITFENSTER — die gefährlichste der zehn ungenutzten Fragen ══
     ⚠ ⚠ `/api/club/schedule` nimmt dreizehn Parameter, wir setzen drei.
     Ein Filter, den man nicht setzt, heisst normalerweise „nicht filtern" —
     aber `DateFrom`/`DateUntil` könnten eine VORGABE haben. Dann fährt
     jeder Lauf gegen ein Fenster, das niemand gewählt hat.

     ⚠ `null` heisst „nicht gemessen", nicht „gleich viele". */
  const mitFenster = d.spielplan_mit_datumsfenster;
  if (mitFenster === undefined) {
    zeilen.push("Zeitfenster: nicht geprüft — die Edge Function ist älter als "
      + "der 14.09.2026.");
  } else if (mitFenster === null) {
    zeilen.push("⚠ Zeitfenster: der Aufruf mit Datumsbereich hat keine Zeilenzahl "
      + "geliefert — nicht feststellbar.");
  } else {
    const ohne = z("spielplan_gesamt");
    const mit = Number(mitFenster);
    zeilen.push(mit === ohne
      ? `Zeitfenster: mit ausdrücklichem Datumsbereich ebenfalls ${mit} Zeilen — `
        + "keine Vorgabe, der ungefilterte Aufruf liefert alles"
      : `⚠ ⚠ Zeitfenster: ${mit} Zeilen mit Datumsbereich gegen ${ohne} ohne — `
        + "der Endpunkt hat eine VORGABE, die wir nie gewählt haben. Das ist ein "
        + "Befund weit über die Turnierfrage hinaus.");
  }

  /* ══ JEDER VERSUCH EINE ZEILE, auch der erfolglose ══════════════════ */
  const versuche = (d.versuche ?? []) as Versuch[];
  zeilen.push("Gezielte Abfragen:");
  for (const v of versuche) {
    const k = v.schluessel as { anzahl?: number; alle?: string[] } | null | undefined;
    const felder = k?.alle?.length ? ` · Felder: ${k.alle.join(", ")}` : "";
    zeilen.push(`   ${String(v.weg ?? "")} — ${String(v.ausgang ?? "?")}${felder}`);
    /* ⚠ ⚠ EIN 200 MIT DER UNVERÄNDERTEN LISTE IST KEINE ANTWORT AUF DIE
       GESTELLTE FRAGE. Am 14.09.2026 zählte die Schlusszeile genau das als
       „Weg mit Daten" — und behauptete, das Problem sei gelöst, während
       jede Zeile darüber das Gegenteil sagte. */
    if (v.parameter_offenbar_ignoriert === true) {
      zeilen.push("      ⚠ Der Parameter wurde offenbar IGNORIERT — dieselbe "
        + "Anzahl wie ohne Filter, und die gesuchte Nummer steht nicht darin.");
    } else if (v.nennt_gesuchte_nummer === false) {
      zeilen.push("      Die Antwort nennt die gesuchte Nummer nicht.");
    }
  }

  /* ══ DIE EINE ZAHL, DIE ALLES ENTSCHEIDET ═══════════════════════════
     ⚠ Ein Weg mit Daten löst das ganze Problem — dann gibt es die
     Mannschaften über die Schnittstelle, nur nicht über die Liste. */
  /* ⚠ ⚠ DREI ZAHLEN, WEIL ES DREI FRAGEN SIND. Bis zum 14.09.2026 stand
     hier eine, die alle drei zusammenwarf — und deshalb „das löst das
     Problem" meldete, während darunter siebenmal das Gegenteil stand. */
  const mitPlan = z("wege_mit_spielplanzeilen");
  const kennen = z("wege_die_die_nummer_kennen");
  const ignoriert = z("wege_mit_ignoriertem_parameter");

  if (d.wege_mit_spielplanzeilen === undefined) {
    zeilen.push("Ergebnis: nicht gemeldet — die Edge Function ist älter als "
      + "der 14.09.2026 — sie zählte Wege mit Daten und meinte etwas anderes.");
    return zeilen;
  }

  zeilen.push(mitPlan > 0
    ? `✓ ${mitPlan} Weg(e) liefern SPIELPLANZEILEN für ${nummer} — die `
      + "Schnittstelle kennt den Spielplan, sie nennt ihn nur nicht von selbst. "
      + "Das löst das Problem."
    : `⚠ KEIN Weg liefert Spielplanzeilen für ${nummer}.`);

  /* ⚠ Getrennt, weil es eine andere Auskunft ist. Ein Bild belegt, dass die
     Nummer beim Verband EXISTIERT — und sonst nichts. Das mit „Problem
     gelöst" zu verwechseln war der Fehler. */
  if (kennen > 0) {
    zeilen.push(`   ${kennen} Weg(e) kennen die Nummer überhaupt (z. B. ein Wappen) `
      + "— das belegt, dass sie beim Verband existiert, und ist kein Spielplan.");
  }
  if (ignoriert > 0) {
    zeilen.push(`   ⚠ ${ignoriert} Weg(e) haben den Filter offenbar ignoriert — `
      + "sie antworten mit 200 und derselben Menge wie ohne Parameter.");
  }
  if (mitPlan === 0) {
    zeilen.push("   Damit bleibt nur die Anfrage beim Verband — und sie ist mit "
      + "diesem Ergebnis stärker als ohne.");
  }
  return zeilen;
}
