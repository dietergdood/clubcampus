/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/_mockSb.ts
   Mock-Supabase-Client für Service-Unit-Tests.

   Kein echtes Supabase: `makeSb()` liefert einen chainbaren, awaitbaren
   Query-Builder, der Insert/Update/Upsert-Payloads + Filter mitschreibt
   und pro (Tabelle, Operation) ein konfigurierbares Ergebnis liefert.

   Keine Test-Datei (kein `.test.`-Suffix) -> wird von vitest nicht als
   Suite eingesammelt, nur importiert.
   ═══════════════════════════════════════════════════════════════ */
import { vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any -- Mock spiegelt die
   dynamischen Supabase-Query-Rückgaben; präzise Typen brächten hier keinen
   Testwert. */

export type SbOp = "select" | "insert" | "update" | "upsert" | "delete";

export interface OpResult {
  data?: any;
  error?: any;
  count?: number | null;
}

export interface CallRecord {
  table: string;
  op: SbOp;
  payload?: any;          // Argument von insert/update/upsert
  upsertOptions?: any;    // 2. Argument von upsert (z.B. { onConflict })
  selectArgs?: any[];     // Argumente von select(...)
  filters: Array<{ method: string; args: any[] }>;
}

export interface MockSb {
  from: (table: string) => any;
  storage: any;
  /** Alle from()-Aufrufe in Reihenfolge, mit Payloads + Filtern. */
  calls: CallRecord[];
  /** Alle Records für eine Tabelle. */
  opsOn: (table: string) => CallRecord[];
  /** Erster Record für (Tabelle, Operation). */
  find: (table: string, op: SbOp) => CallRecord | undefined;
}

/**
 * @param results Map "tabelle.operation" -> Ergebnis, z.B.
 *   { "mitglieder.insert": { data: { id: 42 }, error: null },
 *     "kader.upsert":      { error: pgError } }
 *   Fehlt ein Key, gilt der Default { data: null, error: null, count: 0 }.
 */
export function makeSb(results: Record<string, OpResult | OpResult[]> = {}): MockSb {
  const calls: CallRecord[] = [];
  const def: OpResult = { data: null, error: null, count: 0 };

  /* ⚠ AUSSERHALB von builder(): jeder `from()`-Aufruf erzeugt einen neuen
     Builder. Stuende der Zaehler darin, finge jede Abfrage wieder bei 0 an
     und ein Array haette keine Wirkung. */
  const zaehler: Record<string, number> = {};

  function builder(table: string): any {
    const rec: CallRecord = { table, op: "select", filters: [] };
    let opLocked = false; // insert/update/upsert/delete gewinnt gegen select
    calls.push(rec);

    /* ⚠ EIN ARRAY WIRD DER REIHE NACH VERBRAUCHT. Eine Funktion darf
       dieselbe Tabelle zweimal mit VERSCHIEDENEN Fragen lesen — etwa „wer
       sind die Eltern dieser Kinder?" und danach „hat einer von ihnen noch
       ein aktives Kind?". Bis zum 23.08.2026 gab die Attrappe beide Male
       dasselbe zurueck; ein Test darauf prueft eine Funktion, die es so
       nicht gibt, und schlaegt fehl, obwohl der Code stimmt.

       Ein einzelner Wert verhaelt sich unveraendert und gilt fuer jeden
       Aufruf. Ist das Array erschoepft, gilt der letzte Eintrag weiter —
       sonst muesste jeder Test die genaue Zahl der Aufrufe kennen, und
       das waere eine Kopplung an die Umsetzung statt an das Verhalten. */
    const resolve = (): Promise<OpResult> => {
      const key = `${table}.${rec.op}`;
      const roh = results[key];
      let hit: OpResult;
      if (Array.isArray(roh)) {
        const i = zaehler[key] ?? 0;
        zaehler[key] = i + 1;
        hit = roh[Math.min(i, roh.length - 1)] ?? {};
      } else {
        hit = roh ?? {};
      }
      const erg: OpResult = { ...def, ...hit };

      /* ⚠ ⚠  EINE ZAEHLABFRAGE ZAEHLT — seit dem 11.09.2026.

         `select("id", { count: "exact", head: true })` gibt in echt KEINE
         Zeilen und DAFUER eine Zahl zurueck. Die Attrappe lieferte dort
         den Vorgabewert `count: 0` — und damit schlug die Zaehlprobe in
         `alleSeiten()` bei jedem Test an, obwohl der Code richtig ist.

         ⚠ Das ist genau die Falle aus CLAUDE.md: **eine Attrappe kennt
         kein Schema.** Sie prueft dann etwas anderes als das, was laeuft —
         hier in der lauten Richtung (rot, also harmlos), aber die stille
         waere dieselbe Zeile: eine Zaehlung, die IMMER passt, machte die
         Zaehlprobe wertlos, ohne dass ein Test rot wuerde.

         Deshalb wird abgeleitet statt geraten: so viele Zeilen, wie die
         Attrappe fuer dieselbe Frage liefert. Wer eine KUERZUNG
         nachstellen will, setzt `count` ausdruecklich — und genau das tut
         der Fall in `alleSeiten.test.ts`. */
      const kopf = (rec.selectArgs ?? []).some(
        (a: any) => a && typeof a === "object" && a.head === true,
      );
      if (kopf && hit.count === undefined) {
        erg.count = Array.isArray(erg.data) ? erg.data.length : 0;
        erg.data = null;
      }
      return Promise.resolve(erg);
    };

    const b: any = {};
    const chain = (method: string) => (...args: any[]) => {
      rec.filters.push({ method, args });
      return b;
    };
    for (const m of ["eq", "neq", "in", "or", "is", "match", "order", "limit", "gte", "lte", "ilike", "contains", "not", "range"]) {
      b[m] = chain(m);
    }
    b.select = (...args: any[]) => { rec.selectArgs = args; if (!opLocked) rec.op = "select"; return b; };
    b.insert = (payload: any) => { rec.op = "insert"; opLocked = true; rec.payload = payload; return b; };
    b.update = (payload: any) => { rec.op = "update"; opLocked = true; rec.payload = payload; return b; };
    b.upsert = (payload: any, opts?: any) => { rec.op = "upsert"; opLocked = true; rec.payload = payload; rec.upsertOptions = opts; return b; };
    b.delete = () => { rec.op = "delete"; opLocked = true; return b; };
    b.single = () => resolve();
    b.maybeSingle = () => resolve();
    // Thenable: erlaubt `await sb.from(...).update(...).eq(...)` ohne single().
    b.then = (onF?: (v: OpResult) => any, onR?: (e: any) => any) => resolve().then(onF, onR);
    b.catch = (onR?: (e: any) => any) => resolve().catch(onR);
    b.finally = (onF?: () => void) => resolve().finally(onF);
    return b;
  }

  const storage: any = {
    from: vi.fn(() => ({
      upload: vi.fn(async () => ({ error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.test/foto" } })),
    })),
  };

  return {
    from: vi.fn(builder),
    storage,
    calls,
    opsOn: (table: string) => calls.filter(c => c.table === table),
    find: (table: string, op: SbOp) => calls.find(c => c.table === table && c.op === op),
  };
}

/** Bequemer PostgrestError-Stub für Fehlerpfad-Tests. */
export function pgError(message = "boom", code = "23503"): any {
  return { message, code, details: "", hint: "", name: "PostgrestError" };
}
