/* ═══════════════════════════════════════════════════════════════════
   Die Deutung der Antwort von `aktion: "teamprobe"`.

   ⚠ ⚠  DER ANLASS, 14.09.2026. Junioren E spielt in Turnierform, und es
   betrifft elf Mannschaften. Die Frage: kommen ihre Turniere über
   `/api/club/schedule` überhaupt an?

   **Der Kreis, der dabei sichtbar wurde, ist grösser als die Frage.**
   `bildeSpiel()` verwirft eine Spielplanzeile, wenn keine der beiden
   Mannschaftsnummern in `eigene` steht — und `eigene` kommt aus
   `/api/team/list`, das nur Mannschaften **mit Rangliste** herausgibt.

   > Der Filter verwirft nicht wegen der Spielform, sondern wegen einer
   > Liste, in der diese Mannschaften strukturell nicht vorkommen können.

   ⚠ Kein Regressionsdatum: so ist es, seit es `bildeSpiel()` gibt.

   ── DER DISKRIMINATOR, UND WARUM ER OHNE NAMEN AUSKOMMT ─────────────

   `nicht_in_teamliste` ist für diese Frage **stumpf**: unter den
   unbekannten Nummern steht jeder Gegner, und das sind hunderte. Eine
   Zahl, die die gesuchte Menge nicht von einer viel grösseren trennt,
   beantwortet die Frage nicht — dieselbe Form wie `gruppen_ohne_spiele`.

   `/api/club/schedule` ist ein **Klub**-Spielplan. In jeder Zeile ist
   damit eine Seite unsere. Ist **keine** der beiden Nummern in der
   Teamliste, dann ist unsere eigene Mannschaft eine, die die Liste nicht
   kennt — also eine ohne Rangliste. Kein Namensvergleich nötig; am
   10.09.2026 ergab einer 13 statt 8, und fünf davon waren Schreibweisen.

   ⚠ Die Prämisse ist eine Annahme, und sie wird mitgeliefert: geht
   `eine_bekannt` nicht als grosse Mehrheit auf, bedeutet `keine_bekannt`
   etwas anderes.
   ═══════════════════════════════════════════════════════════════════ */

/** Eine Spieltyp-Gruppe, wie `teamprobe` sie meldet. */
export interface SpieltypZeile {
  typ?: unknown;
  name?: unknown;
  zeilen?: unknown;
  beide_bekannt?: unknown;
  eine_bekannt?: unknown;
  keine_bekannt?: unknown;
  beispiele?: unknown;
}

/** Wie viele Namen erscheinen, bevor gekürzt wird. */
const ZEIGE = 6;

export function deuteTeamprobe(d: Record<string, unknown>): string[] {
  const zeilen: string[] = [];

  /* ══ DIE DREI MENGEN ════════════════════════════════════════════════
     ⚠ Aus DEMSELBEN Lauf, nicht aus drei Quellen zitiert. Am 14.09.2026
     standen „21 von 21", „21 von 34" und „31 Teamseiten, davon 21 mit
     Nummer" nebeneinander, und niemand wusste mehr, welche 21 gemeint
     war. Eine Zahl, die man nicht selbst gemessen hat, wird mit ihrer
     Quelle zitiert — oder gar nicht. */
  const m = d.mengen as Record<string, unknown> | undefined;
  if (!m) {
    zeilen.push("Mengen: nicht gemeldet — die Edge Function ist älter als "
      + "der 14.09.2026.");
  } else {
    const n = (k: string) => Number(m[k] ?? 0);
    zeilen.push(`Unsere teams-Tabelle: ${n("teams_tabelle_gesamt")} Zeilen, davon `
      + `${n("teams_tabelle_aktiv")} aktiv · ${n("teams_mit_sfv_nummer")} mit `
      + `SFV-Nummer, ${n("teams_ohne_sfv_nummer")} ohne`);
    zeilen.push(`Die Teamliste des Verbands kennt ${n("teamliste_des_verbands")} Mannschaften`);
    /* ⚠ ⚠ ZWEI GLEICH GROSSE MENGEN SIND NICHT DIESELBE MENGE. Ohne die
       Schnittmenge liest jemand „21 und 21" als Übereinstimmung. */
    const kennt = n("unsere_nummern_die_die_liste_kennt");
    const kenntNicht = n("unsere_nummern_die_die_liste_NICHT_kennt");
    zeilen.push(kenntNicht === 0
      ? `   Alle ${kennt} unserer Nummern stehen in der Liste des Verbands`
      : `   ⚠ ${kenntNicht} unserer Nummern kennt die Liste NICHT — dann ist `
        + "die Zuordnung veraltet oder die Saison hat die Nummern gekippt");
    /* ⚠ Die ohne Nummer namentlich: genau die können keinen Spielplan
       haben, weil `bildeSpiel()` über die Nummer filtert. */
    const ohne = (m.ohne_nummer_namen ?? []) as string[];
    const ohneZahl = n("teams_ohne_sfv_nummer");
    /* ⚠ ⚠ DIE GEZÄHLTE ZAHL, NICHT DIE LISTENLÄNGE. Zwei Angaben über
       dieselbe Sache können auseinandergehen — und dann ist die
       Abweichung selbst der Befund, nicht die eine oder die andere. */
    if (ohneZahl !== ohne.length) {
      zeilen.push(`   ⚠ ${ohneZahl} ohne Nummer gezählt, aber ${ohne.length} `
        + "namentlich gemeldet — die zwei Angaben gehen auseinander");
    }
    if (ohneZahl > 0) {
      zeilen.push(`   ⚠ ${ohneZahl} Mannschaften ohne SFV-Nummer — sie können `
        + "keinen Spielplan haben, weil der Sync über die Nummer filtert:");
      for (const t of ohne.slice(0, ZEIGE)) zeilen.push(`      ${t}`);
      if (ohne.length > ZEIGE) {
        zeilen.push(`      … und ${ohne.length - ZEIGE} weitere (siehe Rohantwort)`);
      }
    }
  }

  /* ══ DER ROHE SPIELPLAN, JE SPIELTYP ════════════════════════════════ */
  const sp = d.aus_spielplan as Record<string, unknown> | undefined;
  const typen = (sp?.zeilen_je_spieltyp ?? []) as SpieltypZeile[];
  if (!sp || sp.zeilen_je_spieltyp === undefined) {
    zeilen.push("Spielplan nach Spieltyp: nicht gemeldet — die Edge Function "
      + "ist älter als der 14.09.2026.");
    return zeilen;
  }

  /* ⚠ Die Aufteilung muss aufgehen. Tut sie es nicht, stimmt die
     Prämisse „in jeder Zeile ist eine Seite unsere" nicht, und alles
     Folgende bedeutet etwas anderes. */
  if (sp.aufteilung_stimmt === false) {
    zeilen.push("⚠ Die Aufteilung geht NICHT auf — beide + eine + keine ≠ Zeilen. "
      + "Die Zahlen darunter sind nicht zu deuten.");
  }

  zeilen.push(`Roher Spielplan: ${Number(sp.spiele ?? 0)} Zeilen in `
    + `${typen.length} Spieltyp(en)`);
  for (const t of typen) {
    zeilen.push(`   Typ ${String(t.typ ?? "?")} ${String(t.name ?? "")} — `
      + `${Number(t.zeilen ?? 0)} Zeilen: ${Number(t.beide_bekannt ?? 0)} beide bekannt, `
      + `${Number(t.eine_bekannt ?? 0)} eine, ${Number(t.keine_bekannt ?? 0)} keine`);
    for (const b of ((t.beispiele ?? []) as string[])) zeilen.push(`      ${b}`);
  }

  /* ══ DIE EINE ZAHL, DIE DIE FRAGE ENTSCHEIDET ═══════════════════════
     ⚠ Filterproblem oder Quellenproblem — und davon hängt alles Weitere
     ab. Deshalb steht der Satz hier und nicht als Kommentar im Code. */
  const ohneBekannte = Number(sp.zeilen_ohne_bekannte_mannschaft ?? 0);
  zeilen.push(ohneBekannte === 0
    ? "⚠ 0 Zeilen ohne bekannte Mannschaft — der Verband LIEFERT die Spiele "
      + "dieser Mannschaften nicht. Ein Quellenproblem, kein Filterproblem."
    : `⚠ ${ohneBekannte} Zeilen, in denen KEINE der beiden Mannschaften in der `
      + "Teamliste steht — die kommen an, und bildeSpiel() verwirft sie. "
      + "Ein FILTERproblem.");
  return zeilen;
}
