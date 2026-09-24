/* ══════════════════════════════════════════════════════════════════════
   Wer ruft `export_wartet()` — und ALS WER?  (24.09.2026)

   Die Funktion ist `security definer` und heute an `anon`,
   `authenticated` und `service_role` vergeben (`schema.sql:5753-5755`).
   Eine Migration entzieht PUBLIC und `anon` den Aufruf. Diese Datei ist
   die andere Haelfte: **keine Aufrufstelle darf dabei ausgesperrt
   werden.**

   ⚠ ⚠  DIE FRAGE IST NICHT „WER RUFT SIE?", SONDERN „ALS WER?".
   Derselbe Quelltext laeuft je nach Weg unter einer anderen
   Datenbankrolle — Browser mit Sitzung als `authenticated`, ohne
   Sitzung als `anon`, eine Edge Function als das, was in ihrem
   Schluessel steckt, ein cron-Auftrag als die Rolle, unter der er
   angelegt wurde. **Ein Entzug, der eine davon trifft, faellt nicht
   auf:** der Abholer laeuft dann schlicht nicht mehr, und „es wartet
   nichts" sieht genauso aus wie „ich darf nicht nachsehen".

   ── Was hier gehalten wird ───────────────────────────────────────────

     1. die Suche findet JEDE Aufrufstelle, die das Register nennt
        (sonst prueft das Register gegen eine leere Menge)
     2. es gibt KEINE Aufrufstelle, die das Register nicht kennt
        (eine neue ist rot, bis jemand ihre Rolle benennt)
     3. jede gemessene Rolle steht in der Rollenliste der Migration
     4. die offene Frage (cron) ist in der Migration benannt
     5. ohne Client geht kein RPC hinaus — die Kachel kann nicht
        als `anon` rufen
     6. das Anmelde-Gate steht, das genau das verhindert

   ⚠ NICHT gehalten wird, ob ein Aufruf als `anon` wirklich abgewiesen
   wird. Das ist eine Rechtelage in der Datenbank, kein Verhalten von
   Code — in vitest ist sie nicht pruefbar, und ein Test, der so tut als
   ob, waere schlimmer als keiner. **Diese Haelfte traegt die Gegenprobe
   IN der Migration**, nicht die Pruefkette.

   ── Warum die SQL-Haelfte als Text gelesen wird ──────────────────────

   Fuer TS gibt es den Syntaxbaum (`test-helpers/quelltext.ts`), fuer SQL
   keinen — das ist die bekannte Luecke, die dort im Kopf steht. Der
   Ersatz ist ein Abstreifer, der Blockkommentare, Zeilenkommentare und
   einfach gequotete Textliterale entfernt, bevor gesucht wird. Ohne ihn
   zaehlte die Suche neunmal, was zweimal dasteht: `cron_wp_export.sql`
   nennt `'public.export_wartet(uuid)'` in einem `to_regprocedure`, und
   die Abfragendatei traegt den Namen in Meldungstexten. Der Abstreifer
   hat deshalb eine eigene Positivkontrolle, wie jede Suche hier.
   ══════════════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { suche, jederKnoten, zeileVon } from "../../../test-helpers/quelltext.ts";
import { holeExportWartet } from "../exportWartetService.ts";

/** Die Datei des Kollegen. Gibt es sie nicht, ist die Liste nicht da. */
const MIGRATION = "supabase/migration_export_wartet_rechte.sql";

/* ══════════════════════════════════════════════════════════════════
   Das Register — Aufrufstelle → Rolle
   ══════════════════════════════════════════════════════════════════ */

/**
 * ⚠ `gemessen` heisst: im Repository belegt. `offen` heisst: das
 * Repository kann es NICHT sagen, und die Antwort steht in der
 * Datenbank. Die zwei auseinanderzuhalten ist der ganze Zweck — eine
 * Vermutung, die als Messung im Register steht, wird beim naechsten Mal
 * zitiert.
 */
type Stand = "gemessen" | "offen";

interface Stelle {
  /** Pfad mit Schraegstrichen, so wie die Suche ihn liefert. */
  datei: string;
  /** Unter welcher Datenbankrolle der Aufruf laeuft. */
  rolle: string;
  stand: Stand;
  /** Woran das abzulesen ist. */
  beleg: string;
  /**
   * Was ein Entzug kostet. `betrieb` heisst: es laeuft stuendlich und
   * faellt still aus. `handgriff` heisst: jemand fuehrt es von Hand aus
   * und sieht den Fehler sofort.
   *
   * ⚠ `probe` ist die dritte Art, und sie ist keine Feinheit: dort SOLL
   * der Aufruf unter manchen Rollen scheitern. Wer sie mit den anderen
   * zusammenwirft, liest „Aufrufstelle unter `anon`" und vergibt das
   * Recht zurueck, das die Migration gerade entzogen hat.
   */
  wirkung: "betrieb" | "handgriff" | "probe";
}

const REGISTER: Stelle[] = [
  {
    datei: "src/domains/spiele/exportWartetService.ts",
    rolle: "authenticated",
    stand: "gemessen",
    beleg:
      "sb.rpc() in exportWartetService.ts:61; der Client kommt aus App.tsx:9 "
      + "mit VITE_SUPABASE_ANON_KEY. Der publishable key ergibt `anon` NUR ohne "
      + "Sitzung — und die Kachel steht hinter dem Anmelde-Gate in "
      + "clubcampus.tsx:403, das ohne Sitzung den LoginScreen zurückgibt. "
      + "Mit Sitzung traegt jede Anfrage das JWT, also `authenticated`.",
    wirkung: "betrieb",
  },
  {
    datei: "supabase/cron_wp_export.sql",
    rolle: "unbekannt",
    stand: "offen",
    beleg:
      "cron_wp_export.sql:98, im Befehl des Auftrags `wp-export-abholer`. "
      + "cron.schedule (Zeile 72) bekommt KEIN username — pg_cron fuehrt den "
      + "Auftrag dann unter der Rolle aus, die ihn angelegt hat, und die steht "
      + "in keiner Datei des Repositorys.",
    wirkung: "betrieb",
  },
  {
    datei: "supabase/cron_sync_waechter.sql",
    rolle: "unbekannt",
    stand: "offen",
    beleg:
      "cron_sync_waechter.sql:309, im Befehl des Auftrags `sync-waechter`. "
      + "Ebenfalls cron.schedule ohne username (Zeile 255).",
    wirkung: "betrieb",
  },
  {
    datei: "supabase/migration_export_scharf.sql",
    rolle: "unbekannt",
    stand: "offen",
    beleg:
      "migration_export_scharf.sql:28, ein `returning`-Ausdruck. Wird von Hand "
      + "im SQL-Editor ausgefuehrt; unter welcher Rolle, ist eine Eigenschaft "
      + "der Plattform und keine des Repositorys.",
    wirkung: "handgriff",
  },
  {
    datei: "supabase/abfragen_2026-09-24_altbestand_rolle.sql",
    rolle: "unbekannt",
    stand: "offen",
    beleg:
      "abfragen_2026-09-24_altbestand_rolle.sql:627 und :643, eine Leseabfrage "
      + "von Hand. Dieselbe Lage wie migration_export_scharf.sql.",
    wirkung: "handgriff",
  },
  {
    datei: MIGRATION,
    rolle: "jede der vier — nacheinander",
    stand: "offen",
    beleg:
      "Die Gegenprobe der Migration selbst (Abschnitt 3): sie schaltet per "
      + "`set local role` auf anon, authenticated, service_role und postgres "
      + "und ruft die Funktion unter jeder. ⚠ Bei `anon` MUSS der Aufruf "
      + "scheitern — das ist der Beleg, dass der Entzug wirkt. Wer diesen "
      + "Eintrag als Aufrufer liest, der Rechte braucht, dreht die Migration "
      + "um. Der ganze Block endet auf `rollback`.",
    wirkung: "probe",
  },
];

/* ══════════════════════════════════════════════════════════════════
   Die Suche — TypeScript
   ══════════════════════════════════════════════════════════════════ */

/** Jede Datei unter `wurzel` mit einer dieser Endungen. */
function alleDateien(wurzel: string, endungen: string[]): string[] {
  const raus: string[] = [];
  for (const eintrag of readdirSync(wurzel)) {
    const pfad = join(wurzel, eintrag);
    if (statSync(pfad).isDirectory()) raus.push(...alleDateien(pfad, endungen));
    else if (endungen.some((e) => eintrag.endsWith(e))) raus.push(pfad.split("\\").join("/"));
  }
  return raus;
}

/**
 * ⚠ Der Textfilter vorweg ist eine Abkuerzung, und sie ist sicher: eine
 * Datei, die `.rpc("export_wartet")` ruft, MUSS die Zeichenkette
 * enthalten. Er kann also nur zu viele Dateien durchlassen, nie eine zu
 * wenig — und entschieden wird danach am Baum. Ohne ihn wuerden rund 250
 * Dateien geparst, und der Lauf liefe in den Deckel.
 */
function tsKandidaten(): string[] {
  return [...alleDateien("src", [".ts", ".tsx"]),
          ...alleDateien("supabase/functions", [".ts"])]
    .filter((d) => !d.includes("/__tests__/"))
    .filter((d) => readFileSync(d, "utf8").includes("export_wartet"));
}

/** `x.rpc("export_wartet", …)` — am Baum, nicht am Text. */
function rpcAufrufe(baum: ts.SourceFile): number[] {
  const zeilen: number[] = [];
  jederKnoten(baum, (n) => {
    if (!ts.isCallExpression(n)) return;
    const z = n.expression;
    if (!ts.isPropertyAccessExpression(z) || z.name.text !== "rpc") return;
    const erstes = n.arguments[0];
    if (!erstes) return;
    if ((ts.isStringLiteral(erstes) || ts.isNoSubstitutionTemplateLiteral(erstes))
        && erstes.text === "export_wartet") {
      zeilen.push(zeileVon(n));
    }
  });
  return zeilen;
}

/* ══════════════════════════════════════════════════════════════════
   Die Suche — SQL
   ══════════════════════════════════════════════════════════════════ */

/**
 * Blockkommentare, Zeilenkommentare und einfach gequotete Textliterale
 * raus. Dollar-Marken (`$job$`) werden entfernt, ihr INHALT bleibt — dort
 * stehen die cron-Befehle, also genau die Aufrufe, um die es geht.
 */
export function ohneKommentareUndTexte(sql: string): string {
  let raus = "";
  let i = 0;
  while (i < sql.length) {
    const zwei = sql.slice(i, i + 2);
    if (zwei === "/*") { const e = sql.indexOf("*/", i + 2); i = e < 0 ? sql.length : e + 2; raus += " "; continue; }
    if (zwei === "--") { const e = sql.indexOf("\n", i); i = e < 0 ? sql.length : e; raus += " "; continue; }
    if (sql[i] === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'") { if (sql[i + 1] === "'") { i += 2; continue; } i++; break; }
        i++;
      }
      raus += " ''";
      continue;
    }
    const marke = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
    if (marke) { raus += " "; i += marke[0].length; continue; }
    raus += sql[i];
    i++;
  }
  return raus;
}

/**
 * ⚠ Eine Definition ist kein Aufruf. `create … function
 * public.export_wartet(` und `comment on function public.export_wartet(`
 * sehen sonst wie Aufrufer aus — und dann stuenden die beiden
 * Migrationen, die die Funktion ANLEGEN, als ihre Verwender im Register.
 */
const SQL_MUSTER = /(function|procedure)?(\s+)?(?:[A-Za-z_]+\.)?export_wartet\s*\(/gi;

export function sqlAufrufe(sql: string): number {
  let n = 0;
  for (const treffer of ohneKommentareUndTexte(sql).matchAll(SQL_MUSTER)) if (!treffer[1]) n++;
  return n;
}

/* ══════════════════════════════════════════════════════════════════
   Die Rollenliste der Migration
   ══════════════════════════════════════════════════════════════════ */

/**
 * Welche Rollen nach dieser Migration noch `EXECUTE` haben.
 *
 * Ausgangslage ist der Dump (`schema.sql`), darauf werden die
 * GRANT/REVOKE der Migration der Reihe nach angewendet.
 *
 * ⚠ GRENZEN, damit niemand mehr erwartet als drinsteht:
 *   · `public` gilt als Ausgangsrecht, obwohl im Dump keine Zeile dafuer
 *     steht. PostgreSQL vergibt `EXECUTE` an PUBLIC als Vorgabe, und
 *     pg_dump laesst Vorgaben weg — das Fehlen ist kein Beleg dafuer,
 *     dass es nicht vergeben ist.
 *   · Rollenvererbung kennt diese Rechnung nicht.
 *   · Der EIGENTUEMER darf immer, unabhaengig von jedem GRANT. Wer als
 *     `postgres` laeuft, ist hier gar nicht betroffen — und genau das
 *     ist die Frage, die das Repository fuer cron nicht beantwortet.
 */
export function rollenMitAusfuehrrecht(migration: string, ausgangslage: string[]): Set<string> {
  const rollen = new Set(ausgangslage);
  for (const satz of ohneKommentareUndTexte(migration).split(";")) {
    if (!/export_wartet/i.test(satz)) continue;
    const istGrant = /^\s*grant\b/i.test(satz);
    const istRevoke = /^\s*revoke\b/i.test(satz);
    if (!istGrant && !istRevoke) continue;
    const teil = istGrant ? /\bto\b([\s\S]*)$/i.exec(satz) : /\bfrom\b([\s\S]*)$/i.exec(satz);
    if (!teil) continue;
    for (const roh of teil[1].split(",")) {
      const name = roh.replace(/"/g, "").trim().toLowerCase().split(/\s+/)[0];
      if (!name) continue;
      if (istGrant) rollen.add(name);
      else rollen.delete(name);
    }
  }
  return rollen;
}

/** Die Ausgangslage, aus dem Dump gelesen statt behauptet. */
function ausgangslageAusDump(): string[] {
  const dump = readFileSync("supabase/schema.sql", "utf8");
  const rollen = new Set<string>(["public"]);
  for (const zeile of dump.split("\n")) {
    if (!zeile.includes("export_wartet") || !/^GRANT/.test(zeile)) continue;
    const t = /TO\s+"?([A-Za-z_]+)"?/.exec(zeile);
    if (t) rollen.add(t[1].toLowerCase());
  }
  return [...rollen];
}

/* ══════════════════════════════════════════════════════════════════
   1 · Die Suche findet, was das Register nennt
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ die Aufrufstellen von export_wartet()", () => {
  /* ⚠ Ohne diesen Fall waeren alle folgenden ueber einer leeren Menge
     gruen. Genau so ist in diesem Projekt schon viermal eine Pruefung
     durchgelaufen, die ihren Gegenstand nicht mehr gefunden hat. */
  it("der SQL-Abstreifer trennt Aufruf von Kommentar, Text und Definition", () => {
    const probe = [
      "-- public.export_wartet(x) im Kommentar",
      "/* auch public.export_wartet(x) im Block */",
      "select 'ein Text mit export_wartet(y) darin' as t;",
      "select to_regprocedure('public.export_wartet(uuid)');",
      "create or replace function public.export_wartet(p uuid) returns integer as $$ select 1 $$;",
      "comment on function public.export_wartet(uuid) is 'x';",
      "select public.export_wartet(v.verein_id) from v;",
    ].join("\n");
    expect(sqlAufrufe(probe),
      "Der Abstreifer zählt nicht genau den einen echten Aufruf. Solange das "
      + "so ist, sagt jedes Ergebnis der SQL-Suche nichts.").toBe(1);
  });

  it("jede Stelle im Register ruft die Funktion auch wirklich", () => {
    for (const stelle of REGISTER) {
      expect(existsSync(stelle.datei),
        `Das Register nennt ${stelle.datei}, die Datei gibt es nicht mehr.`).toBe(true);
      const anzahl = stelle.datei.endsWith(".sql")
        ? sqlAufrufe(readFileSync(stelle.datei, "utf8"))
        : rpcAufrufe(ts.createSourceFile(stelle.datei, readFileSync(stelle.datei, "utf8"),
            ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)).length;
      expect(anzahl,
        `${stelle.datei} ruft export_wartet() nicht mehr. Dann ist der Eintrag `
        + "im Register veraltet — und ein veraltetes Register prüft die "
        + "übrigen Stellen gegen eine kleinere Menge, als es gibt.")
        .toBeGreaterThan(0);
    }
  });

  /* ══════════════════════════════════════════════════════════════════
     2 · Keine Aufrufstelle, die niemand eingeordnet hat
     ══════════════════════════════════════════════════════════════════ */

  it("kein TypeScript-Aufruf ausserhalb des Registers", () => {
    const gefunden = suche({
      frage: "ruft jemand sb.rpc(\"export_wartet\")?",
      dateien: tsKandidaten(),
      finde: (baum) => rpcAufrufe(baum),
      /* ⚠ Pflicht: findet die Abfrage hier nichts, ist SIE kaputt und
         nicht der geprueste Code — und waere fuer immer gruen. */
      positivkontrolle: 'const x = await sb.rpc("export_wartet", { p_verein_id: id });',
    });
    const bekannt = new Set(REGISTER.map((s) => s.datei));
    const neu = [...new Set(gefunden.map((t) => t.datei))].filter((d) => !bekannt.has(d));
    expect(neu,
      "Neue Aufrufstelle(n) von export_wartet(). Bevor die Migration Rechte "
      + "entzieht, gehört jede ins Register — mit der Frage, ALS WER sie "
      + "ruft. Ein Aufruf aus einer Edge Function läuft als das, was in "
      + "ihrem Schluessel steckt (service_role oder der Ausweis des "
      + "Aufrufers), einer aus dem Browser als authenticated oder anon.")
      .toEqual([]);
  });

  it("kein SQL-Aufruf ausserhalb des Registers", () => {
    const bekannt = new Set(REGISTER.map((s) => s.datei));
    const neu = alleDateien("supabase", [".sql"])
      .filter((d) => readFileSync(d, "utf8").includes("export_wartet"))
      .filter((d) => sqlAufrufe(readFileSync(d, "utf8")) > 0)
      .filter((d) => !bekannt.has(d));
    expect(neu,
      "Neue SQL-Aufrufstelle(n). Bei einem cron-Auftrag ist die Rolle die "
      + "des Anlegenden — das ist der Fall, bei dem ein Entzug still "
      + "ausfaellt.").toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════
   3 · Jede Rolle steht in der Liste der Migration
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ die Migration sperrt keine Aufrufstelle aus", () => {
  /** ⚠ Wirft, wenn die Datei fehlt — ein Ueberspringen waere gruen. */
  function migrationLesen(): string {
    if (!existsSync(MIGRATION)) {
      throw new Error(
        `${MIGRATION} gibt es nicht. Dieser Test haelt die Aufrufstellen von `
        + "export_wartet() gegen die Rollenliste jener Migration — ohne sie "
        + "gibt es keine Liste, und ein grüner Lauf hier wäre die Aussage "
        + "„niemand wird ausgesperrt“, ohne dass irgendetwas geprüft wurde. "
        + "Rot ist hier die ehrliche Farbe, bis die Datei liegt.",
      );
    }
    return readFileSync(MIGRATION, "utf8");
  }

  /* Die Rechnung prueft sich zuerst an einem Beispiel, dessen Ergebnis
     feststeht — sonst waere eine kaputte Rechnung nicht von einer
     harmlosen Migration zu unterscheiden. */
  it("die Rollenrechnung stimmt an einem Beispiel", () => {
    const beispiel = [
      "revoke all on function public.export_wartet(uuid) from public, anon;",
      "grant execute on function public.export_wartet(uuid) to authenticated, service_role;",
    ].join("\n");
    const raus = rollenMitAusfuehrrecht(beispiel, ["public", "anon", "authenticated", "service_role"]);
    expect([...raus].sort()).toEqual(["authenticated", "service_role"]);
  });

  it("die Ausgangslage kommt aus dem Dump, nicht aus einer Behauptung", () => {
    const start = ausgangslageAusDump();
    expect(start,
      "schema.sql nennt für export_wartet() keine GRANT-Zeile mehr. Dann ist "
      + "die Ausgangslage dieser Rechnung geraten.").toContain("authenticated");
  });

  it("jede gemessene Rolle behaelt das Ausfuehrrecht", () => {
    const behalten = rollenMitAusfuehrrecht(migrationLesen(), ausgangslageAusDump());
    for (const stelle of REGISTER.filter((s) => s.stand === "gemessen")) {
      expect(behalten.has(stelle.rolle),
        `${stelle.datei} läuft als \`${stelle.rolle}\` — und diese Rolle `
        + `verliert durch ${MIGRATION} das Ausführrecht. Beleg der Rolle: `
        + stelle.beleg).toBe(true);
    }
  });

  /* ⚠ Der schwaechste Fall dieser Datei, und er sagt es selbst. Er kann
     nicht pruefen, ob cron durchkommt — nur, dass die Frage dort
     aufgeschrieben ist, wo der Entzug passiert. Wer sie erst nach dem
     Einspielen stellt, stellt sie an einem stillen Ausfall. */
  it("die offene cron-Frage ist in der Migration benannt", () => {
    const text = migrationLesen();
    const betroffen = REGISTER.filter((s) => s.stand === "offen" && s.wirkung === "betrieb");
    expect(betroffen.length,
      "Kein cron-Auftrag ruft export_wartet() mehr — dann ist dieser Fall "
      + "gegenstandslos und gehört entfernt statt grün gelassen.")
      .toBeGreaterThan(0);
    expect(/cron\.job|cron_wp_export|pg_cron/i.test(text),
      `${MIGRATION} erwaehnt cron mit keinem Wort. ${betroffen.length} `
      + "cron-Aufrufstellen laufen unter der Rolle, die den Auftrag angelegt "
      + "hat; das Repository sagt nicht welche (kein `username` in irgendeiner "
      + "cron-Datei). Beantwortet wird es nur von:\n"
      + "  select jobname, username from cron.job order by jobid;\n"
      + "Solange das nicht in der Migration steht, entzieht sie Rechte, ohne "
      + "dass jemand den teuersten Fall angesehen hat.").toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════
   4 · Die Kachel kann nicht als `anon` rufen
   ══════════════════════════════════════════════════════════════════ */

describe("⚠ der Weg aus dem Browser laeuft nie als anon", () => {
  /* Die eine Haelfte ist ausfuehrbar: ohne Client geht nichts hinaus. */
  it("ohne Client wird gar kein RPC abgesetzt", async () => {
    const erg = await holeExportWartet(null as never, "v-1");
    expect(erg.wartet).toBeNull();
    expect(erg.grund).toBe("keine Verbindung");
  });

  it("ohne Verein wird gar kein RPC abgesetzt", async () => {
    let gerufen = 0;
    const sb = { rpc: async () => { gerufen++; return { data: 0, error: null }; } };
    const erg = await holeExportWartet(sb as never, null);
    expect(gerufen,
      "holeExportWartet ruft ohne vereinId trotzdem — dann ginge ein Aufruf "
      + "hinaus, bevor feststeht, wofür.").toBe(0);
    expect(erg.grund).toBe("kein Verein bekannt");
  });

  /* Die andere Haelfte ist strukturell: die Kachel steht hinter einem
     Gate, das ohne Sitzung den LoginScreen zurueckgibt. Faellt es, kann
     ein Unangemeldeter das Portal rendern — und dann rufe die Kachel als
     `anon`, also als genau die Rolle, der die Migration das Recht
     entzieht. */
  it("clubcampus.tsx gibt ohne Sitzung den LoginScreen zurueck", () => {
    const gefunden = suche({
      frage: "gibt es ein `if (… !session …) return <LoginScreen/>`?",
      dateien: ["src/clubcampus.tsx"],
      finde: (baum) => {
        const raus: number[] = [];
        jederKnoten(baum, (n) => {
          if (!ts.isIfStatement(n)) return;
          if (!/(^|[^A-Za-z_])!\s*session([^A-Za-z_]|$)/.test(n.expression.getText())) return;
          let hatLogin = false;
          jederKnoten(n.thenStatement, (k) => {
            if ((ts.isJsxSelfClosingElement(k) || ts.isJsxOpeningElement(k))
                && k.tagName.getText() === "LoginScreen") hatLogin = true;
          });
          if (hatLogin) raus.push(zeileVon(n));
        });
        return raus;
      },
      positivkontrolle:
        "function P(){ if(sb && !session){ return <LoginScreen sb={sb}/>; } return <X/>; }",
    });
    expect(gefunden.length,
      "clubcampus.tsx hat kein Gate mehr, das ohne Sitzung den LoginScreen "
      + "zurückgibt. Damit kann die Portalverwaltung — und mit ihr die "
      + "Kachel — von einem Unangemeldeten gerendert werden, und dann läuft "
      + "der RPC als `anon`. Genau diese Rolle entzieht "
      + `${MIGRATION}.`).toBeGreaterThan(0);
  });
});
