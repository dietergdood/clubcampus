/* ══════════════════════════════════════════════════════════════════════
   Jeder SCHREIBENDE Lauf hinterlässt eine Spur (10.09.2026)

   ⚠ ANLASS. `api_sync_log` bekam bei der Aktion `namen` seine Zeile am
   ENDE, und `wechselnachtrag` schrieb überhaupt keine — obwohl er
   `spiel_ereignisse` ändert. Wirft ein solcher Lauf vorher, steht nichts
   da, und **„gescheitert" sieht aus wie „nichts zu tun"**.

   ⚠ UND MEIN BEFUND DAZU WAR ZUR HÄLFTE FALSCH. Ich hatte geschrieben,
   `api_sync_log` bekomme seine Zeile am Ende und `wp-export` mache es
   besser. Gemessen: **der Sync machte es schon richtig** — `insert` mit
   `status: "laeuft"` vor dem Lauf, `update` danach und im `catch`.
   Falsch war es nur bei `namen`. Ein erschlossener Befund, zum zweiten
   Mal an einem Tag.

   ── Warum als Strukturprüfung ────────────────────────────────────────
   Die Aktionen liegen in einer Edge Function mit `esm.sh`-Importen; sie
   lässt sich von hier weder ausführen noch typprüfen. Was prüfbar
   bleibt, ist die Zusage über den Quelltext — und die ist genau die, die
   das Produkt braucht: *wer schreibt, protokolliert, und zwar vorher.*
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  AKTION_SYNC, AKTION_NAMEN, AKTION_WECHSELNACHTRAG,
} from "../protokollStatus.ts";

const DATEI = "supabase/functions/sfv-sync/index.ts";
const quelle = () => readFileSync(DATEI, "utf8");

/** Der Abschnitt einer Aktion, von ihrem `if` bis zum nächsten. */
function abschnitt(roh: string, aktion: string): string {
  const start = roh.indexOf(`if (aktion === "${aktion}")`);
  if (start < 0) return "";
  const naechste = roh.indexOf('if (aktion === "', start + 10);
  return roh.slice(start, naechste > 0 ? naechste : roh.length);
}

/* Die Aktionen, die etwas ÄNDERN. Leseproben stehen bewusst nicht hier —
   siehe den Fall darunter. */
const SCHREIBEND = [AKTION_NAMEN, AKTION_WECHSELNACHTRAG];

/* ⚠ Geprueft wird der KONSTANTENNAME, nicht der Wert. Seit dem
   10.09.2026 steht `laeuft` nur noch in protokollStatus.ts; wer im Code
   wieder ein Literal schriebe, faellt hier auf — und der Wert selbst
   bleibt aus `src/` heraus, wo check:quotes ihn als Ersatzschreibung
   melden wuerde. */
const LAEUFT_IM_CODE = "status: LAUF_LAEUFT";

describe("Schreibende Aktionen protokollieren — und zwar vorher", () => {
  for (const a of SCHREIBEND) {
    it(`${a}: schreibt die Zeile mit status "laeuft"`, () => {
      const t = abschnitt(quelle(), a);
      expect(t).not.toBe("");
      expect(t).toContain(LAEUFT_IM_CODE);
      expect(t).toContain(`aktion: AKTION_${a.toUpperCase()}`);
    });

    it(`${a}: setzt sie im catch auf "fehler"`, () => {
      const t = abschnitt(quelle(), a);
      const c = t.slice(t.indexOf("} catch"));
      expect(c).toContain("status: LAUF_FEHLER");
    });
  }

  it("⚠ die LESEPROBEN protokollieren NICHT — das ist kein Versehen", () => {
    /* Sie ändern nichts. Eine Zeile je Auskunft wäre Rauschen in einer
       Tabelle, die von Änderungen handelt — und ein Protokoll, das
       Rauschen enthält, wird nicht mehr gelesen.

       ⚠ ⚠ DIE LISTE WIRD AUS DER QUELLE ABGELEITET, nicht getippt. Bis zum
       13.09.2026 standen hier vier Namen von Hand — und `vertragsprobe`
       und `rangprobe` fehlten beide. **Eine Leseprobe, die protokolliert,
       wäre durchgekommen**, weil die Prüfung sie nicht kannte.

       Dieselbe Familie wie eine Regel, die einen Bezeichner sucht: der
       Zuschnitt der Prüfung war schmaler als die Wirklichkeit, und die
       Differenz war von aussen nicht zu sehen. Seither kann die Liste
       nicht mehr hinter dem Code zurückbleiben. */
    const roh = quelle();
    const gefunden = [...roh.matchAll(/aktion === "([a-z]+)"/g)].map((m) => m[1]);
    const lesend = [...new Set(gefunden)].filter((a) => !SCHREIBEND.includes(a) && a !== "sync");

    /* ⚠ Findet die Ableitung nichts, ist das ROT und nicht grün — eine
       Prüfung über eine leere Menge ist in diesem Papier viermal
       vorgekommen. */
    expect(lesend.length).toBeGreaterThanOrEqual(4);

    for (const a of lesend) {
      const t = abschnitt(roh, a);
      expect(t).not.toBe("");
      /* ⚠ ⚠ VERBOTEN IST DAS SCHREIBEN, NICHT DER NAME. Bis zum 14.09.2026
         stand hier `not.toContain("api_sync_log")` — und das traf, sobald
         eine Leseprobe das Protokoll LIEST. `rangprobe` tut genau das, seit
         sie den letzten ok-Lauf gegen `ranglisten.stand_vom` hält; das ist
         der Sinn der Probe und kein Verstoss.

         **Eine Regel, die einen Bezeichner sucht, prüft eine Schreibweise.**
         Dieselbe Familie wie `name !== "Elternteil"` — und diesmal im
         Prüfwerkzeug selbst, also an der Stelle, an der niemand mehr
         nachsieht. Der Zuschnitt ist jetzt der VORGANG: ein `insert` oder
         `update` auf `api_sync_log`. */
      const schreibt = /\.from\(\s*["'`]api_sync_log["'`]\s*\)[\s\S]{0,200}?\.(insert|update|upsert|delete)\(/
        .test(t);
      expect(schreibt, `${a} SCHREIBT ins Protokoll, obwohl es nur liest`).toBe(false);
    }
  });

  it("Positivkontrolle: ein schreibender Zugriff in einer Leseprobe wäre rot", () => {
    /* ⚠ PFLICHT, und hier besonders: die verengte Regel könnte zu weit
       gelockert sein und gar nichts mehr treffen. Ohne diesen Fall wäre
       „keine Leseprobe schreibt" von „die Abfrage findet nichts mehr"
       nicht zu unterscheiden. */
    const schreibt = /\.from\(\s*["'`]api_sync_log["'`]\s*\)[\s\S]{0,200}?\.(insert|update|upsert|delete)\(/;
    expect(schreibt.test('db.from("api_sync_log").insert({ status: "ok" })')).toBe(true);
    expect(schreibt.test('db.from("api_sync_log").update({ status: "ok" }).eq("id", x)')).toBe(true);
    /* Und ein reines Lesen trifft sie NICHT — sonst wäre die Verengung
       wirkungslos. */
    expect(schreibt.test('db.from("api_sync_log").select("beendet_am").limit(1)')).toBe(false);
  });

  it("⚠ der Sync trägt seine Aktion ebenfalls", () => {
    /* Ohne sie ist eine Zeile mit `status: ok` und ohne `details.spiele`
       nicht deutbar — genau der Eintrag um 08:26:15, der den Umbau
       ausgelöst hat. */
    expect(quelle()).toContain(`aktion: AKTION_${AKTION_SYNC.toUpperCase()}`);
  });

  it("Positivkontrolle: ohne den Vorher-Insert wäre sie rot", () => {
    const ohne = 'if (aktion === "namen") { try { const x = 1; } catch (e) { } }';
    expect(abschnitt(ohne, AKTION_NAMEN)).not.toContain(LAEUFT_IM_CODE);
    /* ⚠ Und die Gegenrichtung: mit dem Insert findet sie ihn. Ohne diese
       Zeile pruefte der Fall nur, dass eine Attrappe etwas NICHT enthaelt
       — das kann jede Zeichenkette. */
    const mit = `if (aktion === "namen") { insert({ ${LAEUFT_IM_CODE} }); }`;
    expect(abschnitt(mit, AKTION_NAMEN)).toContain(LAEUFT_IM_CODE);
  });

  it("Positivkontrolle: eine protokollierende Leseprobe wäre rot", () => {
    const mit = 'if (aktion === "cupprobe") { await db.from("api_sync_log").insert({}); }';
    expect(abschnitt(mit, "cupprobe")).toContain("api_sync_log");
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Jeder Protokoll-Eintrag nennt seine Aktion (11.09.2026)

   ⚠ ANLASS: `migration_api_sync_log_aktion.sql` legte die Spalte am
   10.09.2026 an, damit niemand mehr ABLEITEN muss, welcher Lauf es war.
   Eingetragen wurde sie nur in `sfv-sync` — `wp-export` blieb stehen.

   Folge: `where aktion = 'export'` fand nichts, obwohl vier Läufe
   protokolliert waren. **Das Fehlen wurde als Aussage gelesen: „es hat
   kein Lauf stattgefunden."** Fünfter Fall derselben Klasse an zwei
   Tagen — und diesmal in der Spalte, die genau dagegen gebaut wurde.

   ⚠ Die alte Prüfung sah nur `sfv-sync/index.ts`. Sie war richtig und
   zu eng: **eine Regel, die nur eine von zwei Stellen kennt, sagt über
   die andere nichts — und liest sich, als sagte sie es.**
   ══════════════════════════════════════════════════════════════════════ */
describe("api_sync_log — jeder Einfüger nennt seine Aktion", () => {
  const DATEIEN = [
    "supabase/functions/sfv-sync/index.ts",
    "supabase/functions/wp-export/index.ts",
  ];

  it("kein insert ohne aktion", () => {
    const ohne: string[] = [];
    for (const d of DATEIEN) {
      const zeilen = readFileSync(d, "utf8").split(/\r?\n/);
      zeilen.forEach((z, i) => {
        if (!z.includes('from("api_sync_log")') || !z.includes(".insert(")) return;
        /* Das Objektliteral steht in den nächsten Zeilen. */
        const umfeld = zeilen.slice(i, i + 12).join(" ");
        if (!/aktion:/.test(umfeld)) ohne.push(`${d}:${i + 1}`);
      });
    }
    expect(ohne).toEqual([]);
  });

  it("findet überhaupt Einfüger (sonst prüft der Fall nichts)", () => {
    /* ⚠ Ohne diesen Fall wäre die Prüfung darüber grün, sobald jemand
       den Aufruf umbaut oder eine Datei umbenennt — eine Prüfung, die
       nicht scheitern KANN. */
    let n = 0;
    for (const d of DATEIEN) {
      const t = readFileSync(d, "utf8");
      n += (t.match(/from\("api_sync_log"\)[\s\S]{0,40}?\.insert\(/g) ?? []).length;
    }
    expect(n).toBeGreaterThanOrEqual(4);
  });
});
