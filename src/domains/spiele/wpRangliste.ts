/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/wpRangliste.ts

   Die Ranglisten für den WordPress-Export: aus den Zeilen der Tabelle
   `ranglisten` werden Gruppen, wie die Vorlage sie liest. Reine Logik —
   kein HTTP, keine Datenbank.

   ⚠ DER VERTRAG IST GEMESSEN, NICHT AUSGEDACHT. Die elf Schlüssel je
   Zeile stehen in `themes/fch/inc/rangtabelle.php` und werden dort
   gelesen; diese Datei richtet sich danach, nicht umgekehrt.

     rang · team · spiele · siege · unentschieden · niederlagen
     fair · tore_plus · tore_minus · punkte · ist_wir

   ⚠ **Die Tordifferenz gehört NICHT dazu.** Die Vorlage rechnet sie aus
   `tore_plus - tore_minus`, „weil eine gespeicherte Differenz von ihren
   eigenen Summanden abweichen kann". Sie mitzuschicken wäre eine zweite
   Wahrheit — belegt am 09.09.2026: eine mitgelieferte `differenz: 99`
   erschien nicht auf der Seite.

   ⚠ `sfv_team_id` steht zusätzlich in jeder Zeile und ist KEIN
   Anzeigefeld. Der Empfänger sucht damit die Gruppe zu einem Team
   (`fch_cc_rangliste_fuer_team()`); ohne sie findet die Vorlage nichts.
   ═══════════════════════════════════════════════════════════════ */

/** Eine Zeile aus `public.ranglisten`, so weit der Export sie braucht. */
export interface RanglisteZeile {
  sfv_saison_id: number;
  sfv_liga_id: number;
  sfv_liga_name: string | null;
  sfv_division_id: number;
  sfv_division_name: string | null;
  sfv_gruppe_id: number;
  sfv_gruppe: string | null;
  sfv_team_id: number;
  team_name: string | null;
  position: number | null;
  anzahl_spiele: number | null;
  siege: number | null;
  unentschieden: number | null;
  niederlagen: number | null;
  tore: number | null;
  gegentore: number | null;
  punkte: number | null;
  fairplay_punkte: number | null;
  stand_vom: string | null;
}

/** Eine Zeile, wie die Vorlage sie liest. */
export interface WpRangZeile {
  rang: number;
  team: string;
  spiele: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  fair: number;
  tore_plus: number;
  tore_minus: number;
  punkte: number;
  ist_wir: boolean;
  /** Nicht zur Anzeige — der Empfänger findet damit die Gruppe. */
  sfv_team_id: number;
}

/** Eine Gruppe, wie sie in der Ablage `fch_cc_ranglisten` landet. */
export interface WpRangGruppe {
  sfv_gruppe_id: number;
  sfv_saison_id: number;
  sfv_liga_id: number;
  sfv_division_id: number;
  liga_name: string;
  gruppe_name: string;
  stand_vom: string;
  zeilen: WpRangZeile[];
}

const z = (n: number | null | undefined): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);

/**
 * Die Zeilen einer Gruppe in die Form der Vorlage bringen.
 *
 * ⚠ Sortiert nach `position`, nicht nach der Reihenfolge der Datenbank.
 * Eine Rangliste, deren Rang 3 über Rang 1 steht, ist keine Rangliste —
 * und `order by` in der Abfrage ist eine Zusage an einer anderen Stelle.
 */
export function baueGruppen(
  zeilen: RanglisteZeile[], unsereTeams: Set<string>,
): WpRangGruppe[] {
  const proGruppe = new Map<number, RanglisteZeile[]>();
  for (const r of zeilen) {
    const liste = proGruppe.get(r.sfv_gruppe_id) ?? [];
    liste.push(r);
    proGruppe.set(r.sfv_gruppe_id, liste);
  }

  const gruppen: WpRangGruppe[] = [];
  for (const [id, rohe] of proGruppe) {
    /* ⚠ NUR GRUPPEN, IN DENEN EINE EIGENE MANNSCHAFT STEHT. Eine fremde
       Gruppe gehört nicht auf die Vereinsseite — und sie hätte dort auch
       keinen Leser: die Vorlage sucht die Gruppe über die eigene
       Teamnummer. Sie mitzuschicken hiesse, die Ablage wachsen zu lassen
       für etwas, das niemand aufruft. */
    if (!rohe.some((r) => unsereTeams.has(String(r.sfv_team_id)))) continue;

    const sortiert = [...rohe].sort((a, b) => z(a.position) - z(b.position));
    const kopf = sortiert[0];
    gruppen.push({
      sfv_gruppe_id: id,
      sfv_saison_id: kopf.sfv_saison_id,
      sfv_liga_id: kopf.sfv_liga_id,
      sfv_division_id: kopf.sfv_division_id,
      liga_name: kopf.sfv_liga_name ?? "",
      gruppe_name: kopf.sfv_gruppe ?? "",
      stand_vom: kopf.stand_vom ?? "",
      zeilen: sortiert.map((r) => ({
        rang: z(r.position),
        team: r.team_name ?? "",
        spiele: z(r.anzahl_spiele),
        siege: z(r.siege),
        unentschieden: z(r.unentschieden),
        niederlagen: z(r.niederlagen),
        fair: z(r.fairplay_punkte),
        tore_plus: z(r.tore),
        tore_minus: z(r.gegentore),
        punkte: z(r.punkte),
        ist_wir: unsereTeams.has(String(r.sfv_team_id)),
        sfv_team_id: r.sfv_team_id,
      })),
    });
  }

  /* Stabile Reihenfolge, damit zwei Läufe vergleichbar sind. */
  return gruppen.sort((a, b) => a.sfv_gruppe_id - b.sfv_gruppe_id);
}

/**
 * Was die Nutzlast wiegt — und ob sie gewachsen ist.
 *
 * ⚠ ES GIBT KEINE GRENZE, GEGEN DIE MAN PRÜFEN KÖNNTE, und deshalb steht
 * hier keine erfundene. Die Ablage ist eine Option ohne `autoload`; ob sie
 * 60 KB wiegt oder 200, merkt beim Lesen niemand. **Was auffallen muss,
 * ist nicht eine Höhe, sondern ein SPRUNG** — und der ist nur zu sehen,
 * wenn die Zahl bei jedem Lauf mitgeschrieben wird.
 *
 * Die Zahl geht deshalb in `api_sync_log.details`. Zwei Läufe daneben
 * gehalten beantworten die Frage, die eine Schwelle nur zu beantworten
 * vorgäbe: *ist sie gewachsen, und warum?*
 */
export function wiegeGruppen(gruppen: WpRangGruppe[]): {
  gruppen: number; zeilen: number; bytes: number; groesste_gruppe: number;
} {
  const bytes = new TextEncoder().encode(JSON.stringify(gruppen)).length;
  const zeilen = gruppen.reduce((n, g) => n + g.zeilen.length, 0);
  const groesste = gruppen.reduce((n, g) => Math.max(n, g.zeilen.length), 0);
  return { gruppen: gruppen.length, zeilen, bytes, groesste_gruppe: groesste };
}

/**
 * Was die Antwort des Empfängers über den BESTAND sagt — nicht über den Lauf.
 *
 * ⚠ DER EMPFÄNGER ERSETZT NUR GELIEFERTE GRUPPEN UND ENTFERNT NIE EINE.
 * Das ist richtig (ein halber Ausfall darf nichts wegräumen) und hat eine
 * Folge, die sonst niemand bemerkt: **eine Gruppe aus einer vergangenen
 * Saison bleibt für immer in der Ablage.** Nach drei Saisons stehen dort
 * dreimal so viele Gruppen wie der Verein Mannschaften hat.
 *
 * Genau das ist das Wachstum, nach dem gefragt wird — und es ist zu sehen,
 * ohne eine einzige Byte-Schwelle: `gesamt` grösser als `geschrieben`
 * heisst, dass in der Ablage etwas liegt, das dieser Lauf nicht kennt.
 */
export function beurteileBestand(
  geschrieben: number, gesamt: number,
): { alt: number; hinweis: string | null } {
  const alt = Math.max(0, gesamt - geschrieben);
  if (!alt) return { alt: 0, hinweis: null };
  return {
    alt,
    hinweis: `${alt} Gruppe(n) liegen in der Ablage, die dieser Lauf nicht geliefert hat `
      + "— vermutlich aus einer vergangenen Saison. Der Empfänger entfernt nie eine.",
  };
}
