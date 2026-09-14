/* ═══════════════════════════════════════════════════════════════════
   Die Deutung der Antwort von `aktion: "rangprobe"`.

   ⚠ ⚠  WARUM SIE HIER STEHT UND NICHT IN DER KACHEL. Dieselbe
   Begründung wie bei `deuteBestand()`: eine Entscheidung, die man nicht
   gegen eine erfundene Antwort halten kann, ist nur zu belegen, indem
   man sie ausführt. Die Kachel bräuchte dafür einen jsdom-Lauf — und
   genau die flackern unter Last.

   ⚠ ⚠  DER ANLASS, 14.09.2026. `gruppen_ohne_spiele` meldete **0**,
   während auf sieben Teamseiten die Tabelle nachhinkte: FC Herrliberg 1
   kennt drei Spiele bei vier gespielten, Senioren 40+ null bei zwei.

   **Die Zahl war nicht falsch.** Sie zählt Gruppen, in denen JEDE
   Mannschaft auf null steht — in „Senioren 40+" haben dreizehn Gegner
   Spiele und wir keine, also ist die Gruppe nicht leer. Sie beantwortet
   „führt der Verband den Stand dieser Gruppe überhaupt?"; gefragt war
   „hinkt UNSERE Zeile nach?".

   > **Eine Zahl ohne Bezugsgrösse ist ein Artefakt. „0 Gruppen ohne
   > Spiele" kann heissen „alle Gruppen haben Spiele" oder „keine Gruppe
   > wurde geprüft."** (Theme-Chat, 14.09.2026)

   ⚠ ⚠  BERICHTIGT AM 14.09.2026. Hier stand: „die Auskunft lag schon in
   der Antwort — `spiele_min` stand bei diesen Gruppen auf 0."

   **Das war falsch, und zwar derselbe Fehler noch einmal.** `spiele_min`
   ist ein `Math.min` über ALLE Zeilen der Gruppe. Steht dort 0, hat die
   schwächste Mannschaft der Gruppe null Spiele — über unsere Zeile sagt
   es nichts. Für „2. Liga Gruppe 2" führt die Verbandsseite FC Herrliberg 1
   mit vier Spielen; `spiele_min: 0` wäre dort vollständig damit
   verträglich.

   ⚠ **Die alte Probe trug also GAR KEINE Auskunft über unsere Zeile** —
   weder als Kopfzahl noch im Detail. Ich habe ein Gruppenaggregat als
   Aussage über eine Zeile gelesen, in demselben Absatz, der genau davor
   warnt. Das macht den Umbau nötiger, nicht weniger nötig.

   **Was bleibt, ist die Regel:** die eigene Zeile steht VOR der
   Gruppenzahl, und die Gruppenzahl nennt ihren eigenen Zuschnitt.
   ═══════════════════════════════════════════════════════════════════ */

/** Eine eigene Ranglistenzeile, wie `rangprobe` sie meldet. */
export interface EigeneRangzeile {
  liga?: unknown;
  gruppe?: unknown;
  team?: unknown;
  anzahl_spiele?: unknown;
  punkte?: unknown;
  /** Was in unserer Tabelle `ranglisten` steht — `null` heisst „wir haben
      dazu keine Zeile", nicht „null Spiele". */
  bestand_spiele?: unknown;
  /** Wie viele Meisterschaftsspiele dieser Mannschaft bei uns als
      ausgetragen stehen. Die Gegenprobe aus einem ANDEREN Endpunkt
      desselben Absenders. */
  gespielt_laut_spielplan?: unknown;
  /**
   * Alle Spiele dieser Mannschaft nach `sfv_status`, roh gezählt.
   *
   * ⚠ Sie löst auf, was `gespielt_laut_spielplan` allein offenlässt: der
   * Zähler nimmt nur Status 2, der Verband führt zwölf, und mehrere zählen
   * für seine Tabelle mit (3 forfait, 4 Null-zu-Null, 5 abgebrochen, 8/9
   * nicht gespielt). Ohne diese Aufschlüsselung ist „2 statt 3" nicht von
   * „uns fehlt ein Spiel" zu unterscheiden.
   */
  spielplan_nach_status?: unknown;
  /** Dieselbe Menge, aber Status 2 UND 3 — die zweite Lesart, nicht der
      Ersatz für die erste. */
  gespielt_mit_forfait?: unknown;
}

/**
 * Die Status des Verbands im Klartext — aus `sfv_stammdaten.json`, nicht
 * geraten.
 *
 * ⚠ Nur die, die für die Tabelle zählen können, plus 1 zur Abgrenzung.
 * Eine Zahl allein („3× Status 3") sagt niemandem etwas; der Name macht
 * aus der Aufschlüsselung eine Auskunft.
 */
const STATUS_NAME: Record<string, string> = {
  1: "noch nicht ausgetragen", 2: "ausgetragen", 3: "forfait",
  4: "Null zu Null", 5: "abgebrochen", 6: "verschoben", 7: "neu angesetzt",
  8: "nicht gespielt (SR)", 9: "nicht gespielt (Gegner)",
  10: "findet nicht statt", 11: "Abbruch der Saison", 12: "ohne Austragung",
};

/** Wie viele eigene Zeilen namentlich erscheinen, bevor gekürzt wird. */
const ZEIGE = 8;

/**
 * ⚠ DREI LAGEN, NICHT ZWEI — und keine davon darf wie eine andere
 * aussehen:
 *
 * | | heisst |
 * |---|---|
 * | `eigene_erkennbar === false` | `vereine.sfv_club_nummer` ist leer — die Probe kann unsere Zeilen gar nicht finden |
 * | `eigene_zeilen_gesamt` fehlt | die Edge Function ist älter als der 14.09.2026 — **nicht gefragt** |
 * | `eigene_ohne_spiele === 0` | gefragt, und alle tragen Spiele |
 *
 * Die erste als „0 ohne Spiele" auszugeben wäre die glatte Lüge; genau
 * diese Einebnung hat am 11.09.2026 drei Nullen für 129 Personen stehen
 * lassen.
 */
export function deuteRangprobe(d: Record<string, unknown>): string[] {
  const z = (k: string) => Number(d[k] ?? 0);
  const gruppenGes = z("gruppen_gesamt");
  const zeilenGes = z("zeilen_gesamt");
  const jeGruppe = z("zeilen_je_gruppe");
  const ohneNr = z("zeilen_ohne_gruppennummer");

  const zeilen: string[] = [
    `${gruppenGes} Gruppen beim Verband · ${zeilenGes} Zeilen · ${jeGruppe} je Gruppe`,
    /* ⚠ ⚠ DIE GEGENPROBE ZUM SCHLÜSSEL. Eine Tabelle hat zehn bis
       vierzehn Mannschaften. Liegt der Wert weit darüber, kollabiert die
       Gruppenkennung — und die Gruppenzahl ist dann ein Befund über den
       Schlüssel, nicht über die Daten. Genau so ist die dreiteilige erste
       Fassung aufgefallen: 232 / 8 ist keine Tabelle. */
    jeGruppe > 20
      ? `⚠ ${jeGruppe} Mannschaften je Gruppe — das ist keine Tabelle. `
        + "Die Gruppenkennung kollabiert; die Gruppenzahl sagt nichts."
      : `${jeGruppe} je Gruppe — in der Grösse einer Tabelle, der Schlüssel trägt`,
    ohneNr === 0
      ? "0 Zeilen ohne Gruppennummer"
      : `⚠ ${ohneNr} von ${zeilenGes} Zeilen ohne Gruppennummer — `
        + "dort ruht die Gruppenidentität auf Liga und Division allein",
  ];

  /* ══ UNSERE EIGENEN ZEILEN — die Zahl, die die Frage beantwortet ══ */
  const eigene = (d.eigene ?? []) as EigeneRangzeile[];
  if (d.eigene_erkennbar === false) {
    zeilen.push("⚠ Unsere eigenen Zeilen sind NICHT erkennbar — "
      + "vereine.sfv_club_nummer ist leer. Alles Folgende gilt nur für Gruppen.");
  } else if (d.eigene_zeilen_gesamt === undefined) {
    zeilen.push("Unsere eigenen Zeilen: nicht gemeldet — die Edge Function ist älter "
      + "als der 14.09.2026. Die Gruppenzahl darunter sagt nichts über uns.");
  } else {
    const ges = z("eigene_zeilen_gesamt");
    const ohne = z("eigene_ohne_spiele");
    const ohneZahl = z("eigene_ohne_zahl");
    zeilen.push(ohne === 0
      ? `${ges} eigene Mannschaften in der Tabelle, 0 davon auf null Spielen`
      : `⚠ ${ohne} von ${ges} eigenen Mannschaften stehen auf null Spielen — `
        + "beim VERBAND, nicht bei uns. Seine Tabelle hinkt seiner eigenen Quelle nach.");
    /* ⚠ `null` heisst „der Verband nennt keine Zahl", `0` heisst „null
       Spiele". Die zwei zusammenzuwerfen wäre genau der Fehler, gegen den
       die ganze Umstellung gebaut ist. */
    if (ohneZahl > 0) {
      zeilen.push(`   ⚠ ${ohneZahl} eigene Zeilen ohne jede Spielzahl — `
        + "das ist nicht dasselbe wie null Spiele");
    }
    /* ══ WELCHE SEITE HINKT — die Frage vom 14.09.2026 ══════════════════
       ⚠ ⚠ Zwei Zähler, die sich gegenseitig ausschliessen können, und die
       Kombination ist selbst die Auskunft. Vorher sah „die Tabelle zeigt 3"
       für beide Ursachen gleich aus. */
    const bH = z("bestand_hinkt");
    const vH = z("verband_hinkt");
    if (d.bestand_hinkt === undefined) {
      zeilen.push("Welche Seite nachhinkt: nicht gemessen — die Edge Function "
        + "ist älter als der 14.09.2026.");
    } else if (bH === 0 && vH === 0) {
      zeilen.push("Frischer Abruf, unser Bestand und unser Spielplan sind sich einig");
    } else {
      if (bH > 0) {
        zeilen.push(`⚠ ${bH} Mannschaften: UNSER Bestand ist älter als der frische `
          + "Abruf — ein Sync-Lauf genügt");
      }
      if (vH > 0) {
        zeilen.push(`⚠ ${vH} Mannschaften: der VERBAND führt in seiner Tabelle weniger `
          + "Spiele, als sein eigener Spielplan als ausgetragen nennt");
      }
    }

    /* ⚠ Die eigenen namentlich, auch die gesunden. Eine Liste, die nur
       Befunde zeigt, lässt offen, ob überhaupt gemessen wurde — und die
       Reihenfolge ist aufsteigend, also stehen die nachhinkenden oben.

       ⚠ DREI ZAHLEN NEBENEINANDER, nicht eine: frisch · Bestand · Spielplan.
       Eine allein zeigt immer auf die andere Seite. */
    for (const e of eigene.slice(0, ZEIGE)) {
      const n = e.anzahl_spiele;
      const frisch = n === null || n === undefined ? "keine Spielzahl" : `${Number(n)}`;
      const best = e.bestand_spiele === null || e.bestand_spiele === undefined
        ? "keine Zeile" : `${Number(e.bestand_spiele)}`;
      const plan = e.gespielt_laut_spielplan === undefined
        ? "?" : `${Number(e.gespielt_laut_spielplan)}`;
      zeilen.push(`   ${String(e.team ?? "")} · ${String(e.liga ?? "")} — `
        + `frisch ${frisch} · bei uns ${best} · Spielplan ${plan}`);
      /* ⚠ ⚠ NUR BEI ABWEICHUNG, und dann NAMENTLICH. Eine Zahl, die von der
         Nachbarzahl abweicht, ist ohne die Aufschlüsselung nicht auflösbar —
         „2 statt 3" kann heissen „ein Forfait, das unser Zähler auslässt"
         oder „uns fehlt ein Spiel". Das sind zwei verschiedene Befunde, und
         nur der zweite ist einer. */
      const n2 = Number(n), p2 = Number(e.gespielt_laut_spielplan);
      const nachStatus = e.spielplan_nach_status as Record<string, number> | undefined;
      if (Number.isFinite(n2) && Number.isFinite(p2) && n2 !== p2 && nachStatus) {
        const teile = Object.entries(nachStatus)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([st, anz]) => `${anz}× Status ${st}${STATUS_NAME[st] ? ` (${STATUS_NAME[st]})` : ""}`);
        zeilen.push(`      ⚠ Verband ${n2}, unser Zähler ${p2} — im Spielplan: `
          + (teile.length ? teile.join(", ") : "kein Spiel"));
        /* ⚠ Der Satz, der die zwei Befunde trennt. Ohne ihn liest jemand
           die Aufschlüsselung und schliesst selbst — und die Hälfte der
           Fehlschlüsse dieser Woche entstand genau so. */
        const nurZwei = Object.keys(nachStatus).every((k) => k === "2");
        zeilen.push(nurZwei
          ? "      ⚠ Nur Status 2 — dann fehlt uns wirklich ein Spiel"
          : "      Andere Status dabei — sie zählen für die Tabelle des Verbands"
            + " mit, unser Zähler lässt sie aus. Kein fehlendes Spiel.");
      }
    }
    /* ⚠ Was weggelassen wird, wird GENANNT. Eine stille Kürzung liest
       sich wie Vollständigkeit. */
    if (eigene.length > ZEIGE) {
      zeilen.push(`   … und ${eigene.length - ZEIGE} weitere (siehe Rohantwort)`);
    }
  }

  /* ══ Erst jetzt die Gruppenzahl, und sie nennt ihren Zuschnitt ══ */
  const ohneGr = z("gruppen_ohne_spiele");
  zeilen.push(ohneGr === 0
    ? `0 von ${gruppenGes} Gruppen, in denen JEDE Mannschaft auf null steht `
      + "— diese Zahl sagt nichts darüber, ob wir nachhinken"
    : `⚠ ${ohneGr} von ${gruppenGes} Gruppen ohne Spiele — dort führt der VERBAND `
      + "keinen Stand. Wir bilden ihn korrekt ab; dieselbe Lage wie bei den "
      + "Spielen ohne Verlauf.");

  /* ══ WELCHE LESART GEHT AUF? ════════════════════════════════════════
     ⚠ ⚠ DIE SCHWELLE STEHT HIER, NICHT IM GESPRÄCH — und sie ist vor den
     Daten festgelegt. Eine Zahl, die jemand im Nachhinein nennt, wenn ihm
     das Ergebnis passt, ist keine Schwelle. (Bedingung Didi, 14.09.2026.)

     ⚠ SIE IST ASYMMETRISCH, weil die Frage es ist. Ob ein Forfait für die
     Tabelle zählt, ist eine REGEL des Verbands, keine verrauschte Grösse:

     | | |
     |---|---|
     | **widerlegt** | EINE Mannschaft, bei der die enge Lesart aufgeht und die weite nicht. Ein Gegenbeispiel genügt |
     | **bestätigt** | DREI VERSCHIEDENE Mannschaften, alle mit der weiten Lesart, und kein Gegenbeispiel |
     | **uneinheitlich** | beides zugleich — dann taugt KEIN Filter, und das ist ein eigener Befund |

     ⚠ ⚠ DREI MANNSCHAFTEN, NICHT DREISSIG BEOBACHTUNGEN. Dieselbe
     Mannschaft über zehn Läufe ist **n=1**, nicht n=10 — das Forfait ist
     dasselbe, der Abruf nur wiederholt. Deshalb nennt die Probe die Namen
     und nicht bloss eine Zahl: nur an ihnen ist zu sehen, ob eine NEUE
     dazugekommen ist.

     ⚠ Und drei statt einer, weil eine Liga eine örtliche Eigenheit haben
     kann. Drei verschiedene decken das ab; mehr zu verlangen hiesse, auf
     ein Ereignis zu warten, das vielleicht nie eintritt — ein Forfait ist
     selten.

     ⚠ ⚠ NICHT ENTSCHIEDEN, SONDERN GEZÄHLT. Beim ersten Treffer der
     Gegenprobe (Juniorinnen C, 14.09.2026) ging 2× Status 2 plus ein
     Forfait genau auf die 3 des Verbands auf — bei EINER Mannschaft. Aus
     n=1 eine Regel zu machen ist der Fehlschluss, der in dieser Woche
     dreimal passiert ist.

     Also laufen beide Lesarten nebeneinander, und diese Zeile sagt nach
     jedem Lauf, welche über alle Mannschaften aufgeht. Nach einem Lauf ist
     n=21, nach zehn n=210. **Die Frage beantwortet sich, statt entschieden
     zu werden.** */
  if (d.treffer_grundmenge !== undefined) {
    const g = z("treffer_grundmenge");
    const ent = (d.entscheidend ?? []) as Array<Record<string, unknown>>;
    /* ⚠ ⚠ DIE UNTERSCHEIDENDE MENGE ZUERST, und die Gesamtzahl daneben.
       „21 von 21" liest sich wie eine grosse Stichprobe — die Zeilen ohne
       Forfait erfüllen aber BEIDE Lesarten und können nichts trennen. */
    if (ent.length === 0) {
      zeilen.push(`Lesart Forfait: keine der ${g} Zeilen unterscheidet — `
        + "ohne ein Forfait erfüllen beide Lesarten dasselbe. Dieser Lauf trägt nichts bei.");
    } else {
      const weit = ent.filter((e) => e.passt === "weit");
      const eng = ent.filter((e) => e.passt === "eng");
      const keine = ent.filter((e) => e.passt === "keine");
      zeilen.push(`Lesart Forfait: ${ent.length} von ${g} Zeilen unterscheiden — `
        + `${weit.length} für die weite, ${eng.length} für die enge, `
        + `${keine.length} für keine von beiden`);
      /* Namentlich, weil dieselbe Mannschaft über zehn Läufe n=1 ist. */
      for (const e of ent) {
        zeilen.push(`   ${String(e.team ?? "")} — Verband ${Number(e.verband)}, `
          + `eng ${Number(e.eng)}, weit ${Number(e.weit)} → ${String(e.passt)}`);
      }
      /* ⚠ Die Schwelle wird ANGEWENDET, nicht bloss dokumentiert — sonst
         entscheidet sie doch jemand im Nachhinein. */
      zeilen.push(eng.length > 0 && weit.length > 0
        ? "   ⚠ WIDERSPRÜCHLICH — dann taugt kein Filter, und das ist der Befund."
        : eng.length > 0
        ? "   ⚠ WIDERLEGT — das Forfait zählt NICHT mit. Ein Gegenbeispiel genügt."
        : keine.length > 0
        ? "   ⚠ Keine der beiden Lesarten geht auf — es fehlt ein Spiel oder ein dritter Status."
        : weit.length >= 3
        ? "   ✓ Schwelle erreicht, WENN es drei VERSCHIEDENE Mannschaften sind — "
          + "dieselbe über mehrere Läufe ist n=1. Die Namen oben entscheiden es."
        : `   Für die weite Lesart, aber erst ${weit.length} von 3 Mannschaften — `
          + "dieselbe über mehrere Läufe zählt einmal.");
    }
  }

  /* ══ WAR DER RANGLISTEN-BLOCK ÜBERSPRUNGEN? ═════════════════════════
     ⚠ ⚠ Der Befund vom 14.09.2026: der Block lag hinter vier Würfen des
     Spielplans, die ihn nichts angehen. Lief einer davon, wurde keine
     Ranglistenzeile geschrieben — und auf der Website stand eine Tabelle,
     die einen Spieltag nachhinkte, ohne dass etwas fehlschlug.

     ⚠ `null` heisst NICHT FESTSTELLBAR, nicht „0 Minuten". Ohne einen
     `ok`-Lauf im Protokoll gibt es nichts, wogegen man halten könnte. */
  const rueck = d.ranglisten_rueckstand_minuten;
  if (rueck === undefined) {
    zeilen.push("Rückstand des Ranglisten-Stands: nicht gemeldet — die Edge "
      + "Function ist älter als der 14.09.2026.");
  } else if (rueck === null) {
    zeilen.push("Rückstand des Ranglisten-Stands: nicht feststellbar — es gibt "
      + "keinen abgeschlossenen ok-Lauf oder keine Ranglistenzeile.");
  } else {
    const m = Number(rueck);
    /* ⚠ Die Grenze ist eine Zahl, die niemand gemessen hat — deshalb weit
       und mit Begründung: der Sync läuft stündlich, also ist alles unter
       zwei Stunden der Normalfall. Enger gezogen wäre sie ein
       Fehlalarm-Erzeuger, und ein Melder, der grundlos anschlägt, wird
       abgeschaltet. */
    zeilen.push(m <= 120
      ? `Der Ranglisten-Stand ist ${m} Minuten älter als der letzte ok-Lauf — `
        + "der Block läuft"
      : `⚠ Der Ranglisten-Stand ist ${m} Minuten älter als der letzte ok-Lauf — `
        + "der Block wurde übersprungen, nicht bloss nichts geliefert");
  }

  /* ══ VOLLSTÄNDIGKEIT DER LIEFERUNG ══════════════════════════════════
     ⚠ Kommt zu JEDER Mannschaft, die wir kennen, eine Tabellenzeile? Eine
     Gruppe, die der Verband nicht mehr liefert, fällt im Sync heraus — und
     auf der Website bliebe eine Tabelle stehen oder verschwände, ohne dass
     etwas fehlschlägt.

     ⚠ Verglichen wird über `sfv_team_id`, nie über den Namen: am
     10.09.2026 ergab ein Namensvergleich 13 fehlende statt 8, fünf davon
     waren Schreibweisen. */
  const ohneZeile = (d.teams_ohne_tabellenzeile ?? []) as string[];
  if (d.teams_ohne_tabellenzeile === undefined) {
    zeilen.push("Vollständigkeit: nicht gemessen — die Edge Function ist älter "
      + "als der 14.09.2026.");
  } else if (ohneZeile.length === 0) {
    zeilen.push(`Alle ${z("teams_mit_nummer_gesamt")} zugeordneten Mannschaften `
      + "stehen in einer Tabelle");
  } else {
    zeilen.push(`⚠ ${ohneZeile.length} von ${z("teams_mit_nummer_gesamt")} zugeordneten `
      + "Mannschaften stehen in KEINER Tabelle — dort liefert der Verband keine Gruppe");
    /* Namentlich: bei acht sucht sonst jemand 21 durch. */
    for (const t of ohneZeile.slice(0, ZEIGE)) zeilen.push(`   ⚠ ${t}`);
    if (ohneZeile.length > ZEIGE) {
      zeilen.push(`   … und ${ohneZeile.length - ZEIGE} weitere (siehe Rohantwort)`);
    }
  }

  const gruppen = (d.gruppen ?? []) as Record<string, unknown>[];
  for (const g of gruppen.filter((x) => Number(x.zeilen) === Number(x.spiele_null))) {
    zeilen.push(`   ⚠ ${String(g.liga ?? "")} · ${String(g.gruppe ?? "")} — `
      + `${Number(g.zeilen)} Mannschaften, alle auf 0 Spielen`);
  }
  return zeilen;
}
