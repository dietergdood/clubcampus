/* ═══════════════════════════════════════════════════════════════
   deuteTeamprobe — Filterproblem oder Quellenproblem?

   ⚠ ANLASS, 14.09.2026. Junioren E spielt in Turnierform, elf von
   einundzwanzig Mannschaften. Kommen ihre Spiele über
   `/api/club/schedule` an?

   Der Kreis dahinter: `bildeSpiel()` verwirft eine Zeile, wenn
   keine der beiden Mannschaftsnummern in `eigene` steht — und
   `eigene` kommt aus `/api/team/list`, das nur Mannschaften MIT
   Rangliste liefert. Der Filter verwirft nicht wegen der
   Spielform, sondern wegen einer Liste, in der diese
   Mannschaften strukturell nicht vorkommen können.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from "vitest";
import { deuteTeamprobe } from "../teamprobeAnzeige.ts";

/* ⚠ Erfundene, runde Werte. In einer Attrappe ist das richtig — sie
   ist eine Vorgabe, keine Behauptung; sie soll nur nicht die echte
   Messreihe abschreiben. */
const MENGEN = {
  teams_tabelle_gesamt: 30, teams_tabelle_aktiv: 28,
  teams_mit_sfv_nummer: 20, teams_ohne_sfv_nummer: 10,
  ohne_nummer_namen: ["Ea-Junioren a", "Ea-Junioren b", "Ea-Junioren c",
    "Eb-Junioren a", "Eb-Junioren b", "Ec-Junioren a", "Ec-Junioren b",
    "Ed-Junioren a", "Junioren E Mini a", "Junioren E Mini b"],
  teamliste_des_verbands: 20,
  unsere_nummern_die_die_liste_kennt: 20,
  unsere_nummern_die_die_liste_NICHT_kennt: 0,
};
const PLAN = (ueber: Record<string, unknown> = {}) => ({
  gefragt: true, spiele: 300, teamnummern_im_plan: 400, nicht_in_teamliste: 380,
  aufteilung_stimmt: true, zeilen_ohne_bekannte_mannschaft: 0,
  zeilen_je_spieltyp: [
    { typ: 1, name: "Meisterschaft", zeilen: 260,
      beide_bekannt: 0, eine_bekannt: 260, keine_bekannt: 0, beispiele: [] },
  ],
  ...ueber,
});
const zus = (t: string[]) => t.join(" | ");

describe("die eine Zahl entscheidet Filter gegen Quelle", () => {
  it("null Zeilen ohne bekannte Mannschaft heisst QUELLENproblem", () => {
    /* ⚠ Der Verband liefert die Spiele dieser Mannschaften nicht — dann
       ist bei uns nichts zu reparieren, und das gehört gesagt, bevor
       jemand am Filter sucht. */
    const t = zus(deuteTeamprobe({ mengen: MENGEN, aus_spielplan: PLAN() }));
    expect(t).toMatch(/der Verband LIEFERT die Spiele dieser Mannschaften nicht/);
    expect(t).toMatch(/Quellenproblem, kein Filterproblem/);
  });

  it("Zeilen ohne bekannte Mannschaft heissen FILTERproblem", () => {
    const t = zus(deuteTeamprobe({ mengen: MENGEN, aus_spielplan: PLAN({
      zeilen_ohne_bekannte_mannschaft: 7,
      zeilen_je_spieltyp: [
        { typ: 6, name: "Turnier", zeilen: 7,
          beide_bekannt: 0, eine_bekannt: 0, keine_bekannt: 7,
          beispiele: ["FC Herrliberg a (79400) vs FC Witikon a (79401) am 2026-08-23"] },
      ],
    }) }));
    expect(t).toMatch(/7 Zeilen, in denen KEINE der beiden Mannschaften/);
    expect(t).toMatch(/bildeSpiel\(\) verwirft sie/);
    expect(t).toMatch(/Ein FILTERproblem/);
    /* Namentlich, sonst ist „7 Zeilen" nicht nachzusehen. */
    expect(t).toMatch(/FC Herrliberg a \(79400\)/);
  });

  it("nennt jeden Spieltyp mit seiner Aufteilung", () => {
    const t = zus(deuteTeamprobe({ mengen: MENGEN, aus_spielplan: PLAN() }));
    expect(t).toMatch(/Typ 1 Meisterschaft — 260 Zeilen: 0 beide bekannt, 260 eine, 0 keine/);
  });

  it("meldet eine Aufteilung, die NICHT aufgeht", () => {
    /* ⚠ Dann stimmt die Prämisse „in jeder Zeile ist eine Seite unsere"
       nicht, und alles Folgende bedeutet etwas anderes. */
    const t = zus(deuteTeamprobe({
      mengen: MENGEN, aus_spielplan: PLAN({ aufteilung_stimmt: false }),
    }));
    expect(t).toMatch(/Die Aufteilung geht NICHT auf/);
    expect(t).toMatch(/nicht zu deuten/);
  });
});

describe("die drei Mengen aus einem Lauf", () => {
  it("nennt Tabelle, Nummern und Teamliste nebeneinander", () => {
    const t = zus(deuteTeamprobe({ mengen: MENGEN, aus_spielplan: PLAN() }));
    expect(t).toMatch(/30 Zeilen, davon 28 aktiv · 20 mit SFV-Nummer, 10 ohne/);
    expect(t).toMatch(/Teamliste des Verbands kennt 20 Mannschaften/);
  });

  it("⚠ zwei gleich grosse Mengen sind nicht dieselbe Menge", () => {
    /* Ohne die Schnittmenge liest jemand „20 und 20" als
       Übereinstimmung. */
    const t = zus(deuteTeamprobe({
      mengen: { ...MENGEN, unsere_nummern_die_die_liste_kennt: 18,
                unsere_nummern_die_die_liste_NICHT_kennt: 2 },
      aus_spielplan: PLAN(),
    }));
    expect(t).toMatch(/⚠ 2 unserer Nummern kennt die Liste NICHT/);
  });

  it("nennt die ohne Nummer namentlich — sie können keinen Spielplan haben", () => {
    const t = zus(deuteTeamprobe({ mengen: MENGEN, aus_spielplan: PLAN() }));
    expect(t).toMatch(/10 Mannschaften ohne SFV-Nummer/);
    expect(t).toMatch(/Ea-Junioren a/);
  });

  it("schweigt bei einer aelteren Function, statt Nullen zu zeigen", () => {
    /* ⚠ „nicht gemeldet" ist nicht „0" — dieselbe Einebnung, die am
       11.09.2026 drei Nullen für 129 Personen stehen liess. */
    const t = zus(deuteTeamprobe({ aus_spielplan: { gefragt: true, spiele: 1 } }));
    expect(t).toMatch(/Mengen: nicht gemeldet/);
    expect(t).toMatch(/Spielplan nach Spieltyp: nicht gemeldet/);
    expect(t).not.toMatch(/0 Zeilen ohne bekannte Mannschaft/);
  });
});

describe("zwei Angaben ueber dieselbe Sache", () => {
  it("meldet es, wenn Zahl und Liste auseinandergehen", () => {
    /* ⚠ Dann ist die Abweichung selbst der Befund — nicht die eine
       oder die andere Zahl. Meine erste Fassung nahm stillschweigend
       die Listenlänge und hätte den Widerspruch verdeckt. */
    const t = deuteTeamprobe({
      mengen: { ...MENGEN, teams_ohne_sfv_nummer: 10,
                ohne_nummer_namen: ["nur einer"] },
      aus_spielplan: PLAN(),
    }).join(" | ");
    expect(t).toMatch(/10 ohne Nummer gezählt, aber 1 namentlich gemeldet/);
  });
});
