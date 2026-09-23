/* ══════════════════════════════════════════════════════════════════════
   JEDE PERSON MIT EINER EIGENEN AUFSTELLUNGSZEILE KOMMT AN

   ⚠ ⚠  DER GEMELDETE FEHLER WAR NICHT DER VERMUTETE, UND DAS IST DER
   GRUND FÜR DIESE DATEI.

   Gemeldet war: vier Spielerinnen fehlen in der Zuordnungsliste und im
   Export, obwohl sie Einsätze haben. Lianne Rechberger in fünf Spielen.
   Vermutet wurde ein Filter — auf Kader, auf Lizenz, auf Team.

   **Es gibt keinen.** Gemessen: `offeneZuordnungen()` hat genau eine
   Bedingung (`bekannt.has(...)`), `baueAufstellung()` kein einziges
   `continue`, und `spiel_aufstellung` wird nur über `verein_id`
   gefiltert. Die vier waren nie gefiltert — **sie sind nie im Browser
   angekommen**:

     matchdatenService.ts:34   .select("*").eq("verein_id", …)

   ungepagt und **ohne `order()`**. PostgREST gibt höchstens 1000 Zeilen
   heraus und meldet das nicht; `spiel_aufstellung` stand am 11.09.2026
   bei 2282 und ist seither um die Gegnerzeilen gewachsen. Ohne
   Sortierung ist nicht definiert, WELCHE 1000 kommen — deshalb kamen
   zwölf von sechzehn Spielerinnen desselben Spiels an und vier nicht.

   ── WAS HIER FESTGEHALTEN WIRD, SIND ZWEI VERSCHIEDENE ZUSAGEN ───────

   1. **Es kommt alles an** — auch jenseits der ersten Seite.
   2. **Es wird nichts nach Kader gefiltert** — die Zusage, die der
      Auftrag bestellt hat. Sie gilt heute; der Fall hält sie fest,
      damit sie nicht später „aus Ordnungsliebe" eingebaut wird.

   ⚠ Die zweite ist ohne die erste wertlos, und die erste ohne die
   zweite auch. Deshalb stehen beide hier und nicht an zwei Orten.
   ══════════════════════════════════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import { makeSb } from "../../members/__tests__/_mockSb.ts";
import { fetchAlleAufstellungen, fetchZuordnungen } from "../matchdatenService.ts";
import { offeneZuordnungen, gruppiereNachTeam, OHNE_MANNSCHAFT } from "../matchdatenAnzeige.ts";
import ts from "typescript";
import { suche, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";

const VEREIN = "v-1";

/** n Aufstellungszeilen, fortlaufend nummeriert. */
function zeilen(n: number, ab = 1) {
  return Array.from({ length: n }, (_, i) => ({
    id: `a-${ab + i}`,
    sfv_person_id: 1000000 + ab + i,
    sfv_team_id: 58655,
    rueckennr: (ab + i) % 30,
    name: `Person ${ab + i}`,
    ist_eigener: true,
    position_name: null, von_minute: 1, bis_minute: 90, spielzeit: 90,
  }));
}

describe("fetchAlleAufstellungen — es kommt alles an", () => {
  it("⚠ liest über die erste Seite hinaus — 1200 Zeilen, nicht 1000", async () => {
    /* Die Zahl ist mit Absicht grösser als eine Seite: bei 1000 genau
       wäre nicht zu sehen, ob eine zweite Seite geholt wird.

       ⚠ ⚠  ER BEWACHT SIE JETZT — UND TAT ES AM MORGEN DESSELBEN TAGES
       NOCH NICHT. Hier stand: *„nimmt man das Pagen heraus, bleibt er
       GRÜN. Die Attrappe kürzt nicht bei 1000."* Das war richtig gemessen
       und ist seit dem Nachmittag falsch: `makeSb` kürzt seither wie
       PostgREST, ohne `range()` bei 1000 Zeilen — **und zwar ohne
       Fehlermeldung, genau wie das Original.**

       Gegengeprobt nach der Änderung: Pagen entfernt → dieser Fall rot,
       zusammen mit der Zählprobe. Vorher fiel nur die Zählprobe um.

       ⚠ Der Satz steht hier als Verlauf und nicht als Warnung, weil er
       sonst beim nächsten Lesen eine Lücke behauptet, die es nicht mehr
       gibt — eine Messung von damals, im Präsens zitiert. */
    const alle = zeilen(1200);
    const sb = makeSb({
      "spiel_aufstellung.select": { data: alle, count: alle.length },
    });
    const raus = await fetchAlleAufstellungen(sb as never, VEREIN);
    expect(raus.length).toBe(1200);
  });

  it("⚠ ⚠ eine gekürzte Antwort wirft, statt still weniger zu liefern", async () => {
    /* Das ist die ganze Absicht des Pagens. Eine unvollständige Liste
       sieht aus wie eine vollständige — und genau daran sind vier
       Spielerinnen fünf Spiele lang unsichtbar geblieben. */
    const sb = makeSb({
      "spiel_aufstellung.select": { data: zeilen(3), count: 2282 },
    });
    await expect(fetchAlleAufstellungen(sb as never, VEREIN)).rejects.toThrow(/2282/);
  });

  it("ein Lesefehler wirft ebenfalls — er darf nicht als leere Liste durchgehen", async () => {
    const sb = makeSb({
      "spiel_aufstellung.select": { data: null, error: { message: "42501" } },
    });
    await expect(fetchAlleAufstellungen(sb as never, VEREIN)).rejects.toThrow(/42501/);
  });

  it("fetchZuordnungen pagt genauso — die Tabelle wächst mit jeder Zuordnung", async () => {
    const z = Array.from({ length: 1100 }, (_, i) => ({
      id: `z-${i}`, sfv_person_id: 2000000 + i, mitglied_id: i, zugeordnet_am: null,
    }));
    const sb = makeSb({ "sfv_zuordnung.select": { data: z, count: z.length } });
    expect((await fetchZuordnungen(sb as never, VEREIN)).length).toBe(1100);
  });
});

describe("⚠ Kein Kaderfilter — die bestellte Zusage", () => {
  const OHNE_KADER = {
    sfv_person_id: 1132270, sfv_team_id: 58655, rueckennr: 13,
    name: "Nur in einer Aufstellung", ist_eigener: true,
  };

  it("eine Person, die nur in einer Aufstellung steht und in keinem Kader, ist offen", () => {
    /* ⚠ `offeneZuordnungen` bekommt die Kaderlage gar nicht erst — sie
       kennt nur die Aufstellung und die bekannten Zuordnungen. Genau das
       hält dieser Fall fest: eine Kaderprüfung liesse sich hier nur
       einbauen, indem jemand der Funktion ein neues Argument gibt. */
    const offen = offeneZuordnungen([OHNE_KADER] as never, new Set<number>());
    expect(offen.length).toBe(1);
    expect(offen[0].sfv_person_id).toBe(1132270);
  });

  it("sie verschwindet auch dann nicht, wenn ihr Team unbekannt ist", () => {
    /* Eine Aufstellungszeile mit einer Teamnummer, die `teams` nicht
       kennt, landet unter „Ohne Mannschaft" — sie fällt NICHT weg. */
    const offen = offeneZuordnungen([{ ...OHNE_KADER, sfv_team_id: 99999 }] as never,
      new Set<number>());
    const gruppen = gruppiereNachTeam(offen, new Map());
    expect(gruppen.length).toBe(1);
    expect(gruppen[0].teamName).toBe(OHNE_MANNSCHAFT);
    expect(gruppen[0].offen.length).toBe(1);
  });

  it("nur eine bereits zugeordnete Person fällt heraus — und sonst nichts", () => {
    const offen = offeneZuordnungen([OHNE_KADER] as never, new Set([1132270]));
    expect(offen.length).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   ⚠ ⚠  DIE SORTIERUNG IST TEIL DER PAGINIERUNG, NICHT ZIERRAT

   „Ohne feste Reihenfolge kann auch das Blättern Zeilen doppelt liefern
   oder überspringen." (Didi, 23.09.2026)

   Der Punkt ist schärfer, als er klingt: eine Stelle mit `range()` und
   OHNE `order()` gilt für jede Prüfung als „gepagt" — und ist trotzdem
   kaputt. Postgres darf zwei Seiten verschieden anordnen, wenn nichts
   die Reihenfolge festlegt; dann fehlt Zeile 999 und Zeile 1001 kommt
   zweimal.

   ⚠ Und ein nicht-EINDEUTIGER Sortierwert genügt nicht. `order("date")`
   über zwölf Spiele desselben Tages legt innerhalb dieses Tages gar
   nichts fest.

   ── WARUM DAS HIER EINE STRUKTURPRÜFUNG IST ──────────────────────────

   Eine Attrappe kann den Fall nicht ehrlich nachstellen: sie schneidet
   mit `slice` aus einem festen Array, und daraus kann nichts verloren
   gehen. Man müsste sie absichtlich mischen lassen — dann prüfte der
   Fall die Mischung und nicht den Code.

   Deshalb wird gefragt, was DASTEHT: jede `range()`-Kette trägt ein
   `order()`. Das ist am Syntaxbaum entscheidbar und altert nicht mit
   einer erfundenen Datenlage.
   ══════════════════════════════════════════════════════════════════════ */

describe("⚠ jede gepagte Abfrage sortiert", () => {
  it("keine range()-Kette ohne order()", () => {
    const treffer = suche<{ zeile: number; text: string }>({
      frage: "gibt es eine range()-Kette ohne order()?",
      dateien: [
        "src/domains/spiele/matchdatenService.ts",
        "src/domains/db/alleSeiten.ts",
      ],
      /* ⚠ Die kaputte Form in genau der Gestalt, in der sie gefunden
         werden MUSS. Fände die Abfrage hier nichts, wäre jedes
         «bestanden» wertlos. */
      positivkontrolle: `
        const x = sb.from("t").select("*").eq("a", 1).range(0, 999);`,
      finde: (baum) => {
        const raus: { zeile: number; text: string }[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isCallExpression(n)) return;
          if (!ts.isPropertyAccessExpression(n.expression)) return;
          if (n.expression.name.text !== "range") return;
          /* Die ganze Kette links von `.range(…)` einsammeln und nach
             `order` fragen. */
          let k: ts.Node = n.expression.expression;
          let hatOrder = false;
          while (ts.isCallExpression(k) || ts.isPropertyAccessExpression(k)) {
            if (ts.isPropertyAccessExpression(k) && k.name.text === "order") hatOrder = true;
            k = ts.isCallExpression(k) ? k.expression : k.expression;
          }
          if (!hatOrder) raus.push({ zeile: zeileVon(n), text: n.getText().slice(0, 60) });
        });
        return raus;
      },
    });

    expect(
      treffer.map((t) => `${t.datei}:${t.fund.zeile}  ${t.fund.text}`),
      "Eine range()-Kette ohne order() ist nicht gepagt, sondern zufällig: "
      + "Postgres darf zwei Seiten verschieden anordnen, dann fehlt eine "
      + "Zeile und eine andere kommt doppelt.",
    ).toEqual([]);
  });
});
