/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/SfvSpielerZuordnung.tsx

   Warteschlange: welcher SFV-Spieler ist welches Mitglied?

   Der Verband liefert zu jedem Einsatz eine `personId` — und den Namen
   gleich mit, in drei Feldern (`firstname`, `name`, `secondName`).
   Gespeichert wird er nicht: `bildeAufstellung()` verwirft ihn, und im
   ganzen Schema gibt es keine Spalte, die ihn aufnehmen könnte.

   ⚠ Das ist eine ENTSCHEIDUNG, keine Grenze der Schnittstelle. Wer sie
   für eine Grenze hält, sucht die Lösung an der falschen Stelle.

   ⚠ SEIT 21.08.2026 IST DER NAME TROTZDEM ZU SEHEN — für EIGENE Spieler
   und nur zur Zuordnung. Er wird über die Aktion `namen` geholt, hier im
   Speicher gehalten, und beim Neuladen ist er weg. Gespeichert wird er
   nicht: eine Spalte an `spiel_aufstellung` läse der ganze Verein, und
   nach der Zuordnung wäre der Wert zwecklos — ein Bestand, den jemand
   löschen müsste und vergässe.

   ⚠ DIE AKTION IST NICHT DER SYNC, und das war der Fehler vom 21.08.: der
   Knopf löste einen Sync-Lauf aus, und der holt zehn Spiele nach
   Zeitplan. Von 177 offenen Spielern waren darüber **48 gar nicht
   erreichbar** — ihre Spiele sind älter als sieben Tage und längst
   geholt. Bei der 3. Mannschaft standen 15 offen und genau EINER mit
   Namen, und nochmal drücken half nicht. Die Aktion `namen` wählt die
   Spiele nach der FRAGE: genau die, in denen ein offener Spieler vorkommt.

   ⚠ Ein Token, viele GETs — deshalb beansprucht die Aktion dieselbe
   Laufsperre wie der Sync. Läuft sie, fällt der stündliche Lauf aus und
   wird eine Stunde später nachgeholt. Absicht, kein Fehler.

   Gegner bleiben, wie sie sind: `bildeAufstellung()` verwirft ihren Namen
   weiterhin, und `spiel_ereignisse_fremde_anonym_check` steht unberührt.

   Automatisch über den Namen zuzuordnen schiede ohnehin aus: der Verein
   hat zwei Adrian Schmid und zwei Adrian Jenni. Also einmal von Hand,
   danach erkennt der Sync die Person selbst wieder.

   ⚠ NACH MANNSCHAFT GRUPPIERT. Beim ersten Lauf standen 129
   verschiedene Spieler in zehn Spielen; über die Saison werden es mehr.
   Zweihundert Namen am Stück sortiert man schlechter als fünfzehn pro
   Mannschaft.

   Was hier fehlt, ist Absicht: der Name des Spielers. Er steht nicht in
   unserer Datenbank. Erkannt wird über Mannschaft, Rückennummer und
   Zahl der Einsätze — das reicht, wer die Mannschaft kennt.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { Btn, Card, InfoBox } from "../../theme.ts";
import { holeNamen, leseNamenAntwort, leseNamenJahrgaenge, leseNamenTeile }
  from "../../domains/sfv/sfvService.ts";
import type { NamensTeile } from "../../domains/sfv/sfvService.ts";
import { schlageAlleVor } from "../../domains/sfv/spielerVorschlag.ts";
import type { VorschlagKandidat } from "../../domains/sfv/spielerVorschlag.ts";
import { TI } from "../../icons.tsx";
import {
  baueSpielerZeilen, alsTextliste, alsWxr, alsMannschaftsliste,
} from "../../domains/spiele/spielerAusgabe.ts";
import { dateiDownload, inZwischenablage } from "../../shared/list/exportUtils.ts";
import { BL } from "../../constants.ts";
import {
  gruppiereNachTeam, offeneZuordnungen, OHNE_MANNSCHAFT,
} from "../../domains/spiele/matchdatenAnzeige.ts";
import {
  fetchAlleAufstellungen, fetchZuordnungen, loescheZuordnung, speichereZuordnung,
} from "../../domains/spiele/matchdatenService.ts";
import type { AufstellungMitZeit, ZuordnungZeile } from "../../domains/spiele/matchdatenService.ts";
import type { Mitglied, Sb, Team } from "../../types.ts";

interface Props {
  sb: Sb;
  vereinId: string | null;
  benutzerId: string | null;
  dbMitglieder: Mitglied[];
  dbTeams: Team[];
  onZurueck?: () => void;
}

export function SfvSpielerZuordnung({ sb, vereinId, benutzerId, dbMitglieder, dbTeams, onZurueck }: Props) {
  /* sfv_person_id → Name, NUR für diese Sitzung. Nirgends abgelegt: nicht in
     der Datenbank, nicht im localStorage. Wer den Tab schliesst, sieht
     wieder Nummern — und die Maske sagt ihm, wie er sie zurückholt. Das ist
     der Preis dafür, dass hinterher nichts aufzuräumen ist. */
  const [namen, setNamen] = useState<Record<number, string>>({});
  /**
   * Vorname und Nachname getrennt, wie der Verband sie liefert.
   *
   * ⚠ ⚠  NUR IM ZUSTAND, wie die Namen — und genau deshalb brauchte die
   * Trennung keine Spalte in der Datenbank und keinen Nachlauf. Der
   * Verband liefert `firstname` und `name` getrennt; bis zum 24.09.2026
   * wurden sie zusammengesetzt und die Teile verworfen.
   *
   * ⚠ Leer, solange „Namen holen" nicht gedrückt ist — dann bleibt die
   * Spalte `Vorname` im Export leer, und der ganze Name steht unter
   * `Name`. Nicht geraten.
   */
  const [namensTeile, setNamensTeile] = useState<Record<number, NamensTeile>>({});
  const [namenLaeuft, setNamenLaeuft] = useState(false);
  const [namenFehler, setNamenFehler] = useState<string | null>(null);
  const [ohneNamen, setOhneNamen] = useState(0);
  /* ⚠ NUR IM ZUSTAND, wie die Namen. Der Jahrgang wird nirgends gespeichert;
     beim Neuladen ist er weg. Dieselbe Entscheidung wie am 21.08.2026 beim
     Namen, und aus einem schaerferen Grund — ein Geburtsjahr veraltet nicht. */
  const [jahrgaenge, setJahrgaenge] = useState<Record<number, number>>({});
  /* `null` heisst NICHT GEFRAGT (aeltere Fassung der Function), `0` heisst
     alle lesbar. Die zwei duerfen nicht dieselbe Anzeige bekommen. */
  const [jahrgangUnlesbar, setJahrgangUnlesbar] = useState<number | null>(null);
  /* Wurde in dieser Sitzung schon geholt? Nicht dasselbe wie „es gibt
     Namen": ein Lauf, der nichts fand, hat trotzdem stattgefunden, und der
     Knopf soll dann nicht aussehen, als wäre er nie gedrückt worden. */
  const [geholt, setGeholt] = useState(false);
  /* Rückmeldung der Ausgabe — verschwindet nicht von selbst, weil sie eine
     Zahl nennt („273 von 287"), die jemand lesen soll. */
  const [ausgabeMeldung, setAusgabeMeldung] = useState<string | null>(null);
  const [aufstellung, setAufstellung] = useState<AufstellungMitZeit[]>([]);
  const [zuordnungen, setZuordnungen] = useState<ZuordnungZeile[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  /* ⚠ EIGENER ZUSTAND, NICHT `fehler`. Der dort wird als „Nicht
     gespeichert: …" angezeigt — ein Ladefehler darunter hiesse „Nicht
     gespeichert: 1000 von 2400 gelesen", und das nennt das falsche Glied
     der Kette. Zwei Aussagen, zwei Orte. */
  const [ladefehler, setLadefehler] = useState<string | null>(null);
  const [offenesTeam, setOffenesTeam] = useState<string | null>(null);
  /* ══ Welche Mannschaften in die Excel-Liste gehen ═══════════════════
     ⚠ ⚠  DER SCHLÜSSEL `String(sfv_team_id ?? "-")`, NICHT DER NAME.

     ⚠ ⚠  HIER STAND BIS ZUM 24.09.2026 DAS GEGENTEIL („DER NAME IST DER
     SCHLÜSSEL") — und der Vermerk am `alleTeamSchluessel` weiter unten
     widersprach ihm, seit die Sache am selben Tag berichtigt wurde. Zwei
     Kommentare über dieselbe Entscheidung, und der obere sagte das
     Falsche: wer ihn liest, sieht nicht nach.

     Beides ist `ReadonlySet<string>`: der Typ passt, die Bedeutung nicht.
     Mit dem Namen als Schlüssel war `typecheck` grün, der Download lief,
     und die Datei trug nur die Kopfzeile — während die Meldung daneben
     „1 Spieler geladen" behauptete.

     ⚠ Übersetzt wird deshalb NICHT. Zwei Schlüsselräume in einer Maske,
     zwischen denen jemand hin- und herrechnet, sind die Stelle, an der
     es still auseinanderläuft; gespeichert wird gleich das, was die
     Ausgabe versteht. Das Aufklappen behält seinen eigenen Schlüssel —
     es hat mit der Auswahl nichts zu tun.

     ⚠ Leer heisst leer, nicht „alle". Wer nichts wählt, bekommt keine
     Datei — siehe `mannschaftslisteHerunterladen()`.

     ⚠ ⚠  UND SEIT DEM 24.09.2026 TRIFFT DIE AUSWAHL DAS STAMMTEAM. Die
     Liste führt eine Zeile je Person, nicht je Person und Mannschaft;
     `alsMannschaftsliste()` filtert gegen `stammteamSchluessel`.

     ⚠ ⚠  HIER STAND BIS ZUM NACHMITTAG DESSELBEN TAGES, DIE KÄSTCHEN
     KÄMEN WEITER AUS DER ERSTEN GESCHRIEBENEN ZEILE — und dass die zwei
     deshalb auseinanderfallen können. Das galt für einen halben Tag und
     ist behoben: `offeneZuordnungen()` bestimmt das Team seither über
     `bestimmeStammteam()`, also über DIESELBE Regel wie die Ausgabe. Die
     Kästchen und die Datei gruppieren damit gleich, und jede Person der
     Liste ist über genau ein Kästchen erreichbar — auch die ohne
     Team-Id, über `"-"`.

     ⚠ Der Satz bleibt als Verlauf stehen und nicht als Warnung: im
     Präsens gelesen behauptete er eine Lücke, die es nicht mehr gibt,
     und wer ihn liest, sucht dann nach etwas, das behoben ist. */
  const [teamsGewaehlt, setTeamsGewaehlt] = useState<ReadonlySet<string>>(new Set());

  async function laden() {
    setLaedt(true);
    /* ⚠ ⚠  GEBUNDEN, SEIT DIE DIENSTE PAGEN (23.09.2026).
       `alleSeiten()` wirft, wenn die Zählprobe nicht aufgeht — statt
       still eine gekürzte Liste zu liefern. Ohne dieses `catch` bliebe
       `laedt` dann auf `true` und die Maske hängt: aus einem Fehler
       würde ein Ladebalken, und das ist dieselbe Ununterscheidbarkeit
       wie vorher, nur an anderer Stelle. */
    try {
      const [a, z] = await Promise.all([
        fetchAlleAufstellungen(sb, vereinId),
        fetchZuordnungen(sb, vereinId),
      ]);
      setAufstellung(a); setZuordnungen(z); setLadefehler(null);
    } catch (e) {
      /* ⚠ Nicht `[]` setzen. Eine leere Liste hiesse „nichts offen" —
         genau die Falschaussage, gegen die das Pagen gebaut ist. */
      setLadefehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  }
  useEffect(() => { laden(); }, [vereinId]);

  /* teams.sfv_team_id ist die Brücke zwischen Aufstellung und unserem
     Mannschaftsnamen. Fehlt die Zuordnung, heisst die Gruppe
     "Ohne Mannschaft" — dann ist zuerst die Team-Zuordnung dran. */
  const teamNamen = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of dbTeams || []) {
      const id = (t as unknown as { sfv_team_id?: number | null }).sfv_team_id;
      if (id != null) m.set(Number(id), t.name);
    }
    return m;
  }, [dbTeams]);

  const bekannt = useMemo(
    () => new Set(zuordnungen.map(z => Number(z.sfv_person_id))), [zuordnungen]);

  const gruppen = useMemo(
    () => gruppiereNachTeam(offeneZuordnungen(aufstellung, bekannt), teamNamen),
    [aufstellung, bekannt, teamNamen]);

  const offenGesamt = gruppen.reduce((n, g) => n + g.offen.length, 0);
  const anzahlNamen = Object.keys(namen).length;

  async function namenHolen() {
    if (!sb || namenLaeuft) return;
    setNamenLaeuft(true); setNamenFehler(null);
    const { daten, fehler } = await holeNamen(sb);
    setNamenLaeuft(false);
    if (fehler) { setNamenFehler(fehler); return; }
    setNamen(leseNamenAntwort(daten));
    /* ⚠ Aus DERSELBEN Antwort, mit einer zweiten Funktion — nicht aus
       dem Namen zurueckgerechnet. Wer den zusammengesetzten Namen wieder
       zerlegt, misst seine eigene Formatierung; genau das ist die Familie,
       in der am 05.09.2026 ein Zaehler 431 Klarnamen meldete, wo null
       waren. */
    setNamensTeile(leseNamenTeile(daten));
    setJahrgaenge(leseNamenJahrgaenge(daten));
    /* ⚠ `undefined` heisst NICHT GEFRAGT, nicht „alle lesbar". Eine Fassung
       vor dem 13.09.2026 schickt das Feld nicht — dann bleibt es `null` und
       die Karte sagt das, statt eine Null zu zeigen. */
    setJahrgangUnlesbar(daten?.jahrgang_unlesbar ?? null);
    setOhneNamen(Math.max(0, (daten?.offen_gesamt ?? 0) - (daten?.namen_gefunden ?? 0)));
    setGeholt(true);
  }

  /* ══ Ausgabe für WordPress ═══════════════════════════════════════
     ⚠ BEIDE AUSGABEN ENTSTEHEN IM BROWSER und gehen nirgendwo hin. Sie bauen
     auf `namen` — dem Zustand dieser Maske —, und der Name wird bewusst nicht
     gespeichert. Kein Aufruf, kein Protokolleintrag, keine Datei auf dem
     Server. (Bedingung Didi, 25.08.2026.)

     ⚠ UND SIE MÜSSEN VOR DER ZUORDNUNGSARBEIT GEZOGEN WERDEN. Die Aktion
     `namen` liefert nur die OFFENEN Spieler; mit jedem zugeordneten schrumpft
     die Liste. Wer erst zuordnet und dann exportiert, bekommt eine kürzere
     Liste und käme nicht darauf, dass die eigene Arbeit der Grund ist. */
  const spielerZeilen = useMemo(
    () => baueSpielerZeilen(aufstellung, namen, teamNamen, namensTeile),
    [aufstellung, namen, teamNamen]);

  async function listeKopieren() {
    const text = alsTextliste(spielerZeilen);
    const ok = await inZwischenablage(text);
    setAusgabeMeldung(ok
      ? `${spielerZeilen.length} Spieler in die Zwischenablage kopiert.`
      /* ⚠ Kein „kopiert ✓", wenn nichts kopiert wurde. Die Zwischenablage
         kann fehlschlagen (Erlaubnis, unsicherer Kontext) — dann bekommt der
         Benutzer den anderen Weg genannt statt einer Behauptung. */
      : "Die Zwischenablage ist nicht verfügbar. Bitte die Datei herunterladen.");
  }

  function listeHerunterladen() {
    dateiDownload(alsTextliste(spielerZeilen), "spieler-zuordnung.txt", "text/plain;charset=utf-8");
    setAusgabeMeldung(`${spielerZeilen.length} Spieler als Textdatei geladen.`);
  }

  /* ══ Die Auswahl der Mannschaften ═══════════════════════════════════
     ⚠ ⚠  KEIN DREIWERTIGER SCHALTER, UND DAS IST DIE REGEL AUS CLAUDE.MD
     („Zwei Zustände für EINEN Schlüssel sind ehrlich. Zwei Zustände für
     eine SAMMLUNG sind es nicht", 21.08.2026).

     Ein Kästchen JE MANNSCHAFT ist richtig — ein Schlüssel, zwei
     Zustände. Über der Sammlung wäre dasselbe Kästchen falsch: eine
     Sammlung hat drei Tatsachen (alles · gemischt · nichts), und ab drei
     Mannschaften ist „gemischt" der Normalfall — der Schalter stünde
     also meistens falsch.

     ⚠ „Gemischt" ist kein Wert, den man SETZEN kann, nur einer, den man
     ANZEIGT. Deshalb hier zwei HANDLUNGEN statt eines Zustands —
     „Alle auswählen" und „Auswahl aufheben". Jede sagt, was sie tut,
     und keine kann etwas Falsches behaupten. Die Mischung steht als
     ZAHL daneben („n von m gewählt"): angezeigt, nicht bedienbar. */
  /* ⚠ Eine MENGE, keine Liste. Zwei `sfv_team_id`, die in `dbTeams` auf
     denselben Namen zeigen, sind für die Ausgabe eine Mannschaft — als
     Liste gezählt stünde nach „Alle auswählen" „1 von 2 gewählt", und die
     Anzeige behauptete eine unvollständige Auswahl. */
  /* ⚠ ⚠  DIE SCHLUESSEL, NICHT DIE NAMEN — berichtigt am 24.09.2026.
     Hier standen Teamnamen, weil der Auftrag sie verlangte. Die Ausgabe
     filtert aber gegen `SpielerZeile.teamSchluessel` (`String(sfv_team_id)`),
     und **beides ist `string`: der Typ passt, die Bedeutung nicht.**
     Gemessen: Kaestchen setzbar, Download laeuft, Datei mit nur der
     Kopfzeile. `key` ist genau die Form, die `gruppiereNachTeam()` bildet. */
  const alleTeamSchluessel = useMemo(
    () => new Set(gruppen.map(g => String(g.sfv_team_id ?? "-"))), [gruppen]);

  function teamUmschalten(schluessel: string) {
    setTeamsGewaehlt(alt => {
      const neu = new Set(alt);
      if (neu.has(schluessel)) neu.delete(schluessel); else neu.add(schluessel);
      return neu;
    });
  }

  /* ⚠ Gegen die HEUTIGEN Gruppen gezählt, nicht `teamsGewaehlt.size`.
     Verschwindet eine Mannschaft aus der Liste (alle zugeordnet), bleibt
     ihr Name im Satz stehen — die Zahl behauptete dann eine Mannschaft
     mehr, als es zu wählen gibt. */
  const anzahlGewaehlt = [...alleTeamSchluessel]
    .filter(k => teamsGewaehlt.has(k)).length;

  /* ⚠ AUS DER ENTSCHEIDUNG GEZÄHLT, NICHT AUS DER AUSGABE. Die Zeilen des
     erzeugten CSV zu zählen wäre der Umweg, an dem am 05.09.2026 ein
     Zähler 431 Klarnamen meldete, wo null waren: wer seinen eigenen
     Ausgabetext wieder zerlegt, misst seine Formatierung mit.

     Gezählt wird dieselbe Liste mit demselben Satz, den die Funktion
     bekommt — die Zahl kann der Datei deshalb nicht widersprechen. */
  /* ⚠ ⚠  UEBER DAS STAMMTEAM, NICHT UEBER ALLE MANNSCHAFTEN DER PERSON
     (24.09.2026). Die Liste fuehrt seither EINE Zeile je Person, unter
     ihrem Stammteam, und `alsMannschaftsliste()` filtert genau danach.
     Wer hier weiter `some()` ueber `teamSchluessel` rechnete, zaehlte
     jede Person mit, die fuer eine gewaehlte Mannschaft gespielt hat —
     und die Meldung behauptete mehr Zeilen, als in der Datei stehen.
     Zwei Zahlen fuer dieselbe Sache, und die falsche steht an der
     Stelle, an die der Benutzer schaut. */
  const anzahlGewaehlteSpieler = useMemo(
    () => spielerZeilen.filter(z => teamsGewaehlt.has(z.stammteamSchluessel)).length,
    [spielerZeilen, teamsGewaehlt]);

  function mannschaftslisteHerunterladen() {
    /* ⚠ NICHTS GEWÄHLT HEISST NICHTS GELADEN. Eine leere Datei sieht aus
       wie ein Fehlschlag und ist einer, den niemand meldet — sie landet
       im Download-Ordner und fällt erst auf, wenn jemand sie öffnet.
       Stattdessen der Satz, der sagt, was zu tun ist. */
    if (anzahlGewaehlt === 0) {
      setAusgabeMeldung("Keine Mannschaft gewählt — bitte mindestens ein Kästchen "
        + "an einer Mannschaft setzen. Es wurde nichts geladen.");
      return;
    }
    dateiDownload(alsMannschaftsliste(spielerZeilen, teamsGewaehlt),
      "spieler-nach-mannschaft.csv", "text/csv;charset=utf-8");
    setAusgabeMeldung(`${anzahlGewaehlteSpieler} Spieler aus ${anzahlGewaehlt} `
      + `Mannschaft${anzahlGewaehlt === 1 ? "" : "en"} geladen.`);
  }

  function wxrHerunterladen() {
    const { xml, aufgenommen, uebergangen } = alsWxr(spielerZeilen);
    dateiDownload(xml, "clubcampus-spieler.xml", "application/xml;charset=utf-8");
    /* ⚠ Die Übergangenen werden GENANNT. Ein Import mit 273 statt 287
       Beiträgen, ohne dass jemand die Differenz erfährt, ist genau die stille
       Sorte, die dieses Projekt abbaut. */
    setAusgabeMeldung(uebergangen > 0
      ? `${aufgenommen} Spieler in der Importdatei. ⚠ ${uebergangen} ohne Namen sind NICHT dabei — `
        + "ein WordPress-Entwurf ohne Titel wäre unbrauchbar. Sie stehen in der Textliste."
      : `${aufgenommen} Spieler in der Importdatei.`);
  }

  /* Mitglieder, die für eine Zuordnung in Frage kommen. Bereits
     zugeordnete bleiben wählbar: ein Mitglied darf mehrere personId
     tragen (Saisonwechsel des Verbands). */
  const mitgliedOpts = useMemo(
    () => (dbMitglieder || [])
      .filter(m => m.aktiv !== false)
      .map(m => ({ id: m.id, name: `${m.nachname ?? ""} ${m.vorname ?? ""}`.trim() || `#${m.id}` }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [dbMitglieder]);

  /* ══ Der Vorschlag ══════════════════════════════════════════════════
     ⚠ Er ist eine VORAUSWAHL im Auswahlfeld und nichts weiter. Es gibt
     bewusst keinen Knopf, der alle Vorschlaege auf einmal speichert — das
     ist der Punkt, an dem aus einem Vorschlag eine Behauptung wird.
     (Bedingung Didi, 13.09.2026.)

     ⚠ Und er entsteht nur, wenn die Namen geholt sind: ohne Namen gibt es
     nichts zu vergleichen, und eine Zuordnung ueber die Rueckennummer waere
     genau der Fehler, der am 11.09.2026 unsere Spieler beim Gegner
     erscheinen liess. */
  const kandidaten = useMemo<VorschlagKandidat[]>(
    () => (dbMitglieder || []).filter(m => m.aktiv !== false).map(m => ({
      id: m.id,
      vorname: m.vorname ?? null,
      nachname: m.nachname ?? null,
      geburtsdatum: (m as unknown as { geburtsdatum?: string | null }).geburtsdatum ?? null,
      teams: ((m as unknown as { kader_teams?: { name: string }[] }).kader_teams || [])
        .map(t => t.name),
    })),
    [dbMitglieder]);

  const vorschlag = useMemo(() => {
    if (!anzahlNamen) return { vorschlaege: new Map(), mit: 0, ohne: 0 };
    const spieler = gruppen.flatMap(g => g.offen.map(o => ({
      sfv_person_id: o.sfv_person_id,
      name: namen[o.sfv_person_id] ?? "",
      jahrgang: jahrgaenge[o.sfv_person_id] ?? null,
      /* „Ohne Mannschaft" ist unsere Gruppenbezeichnung, kein Teamname —
         sie darf nicht als Mannschaft in den Vergleich gehen. */
      team: g.teamName === OHNE_MANNSCHAFT ? null : g.teamName,
    })));
    return schlageAlleVor(spieler, kandidaten);
  }, [gruppen, namen, jahrgaenge, kandidaten, anzahlNamen]);

  /* Die vorgewählte Id — leer, wenn es keinen Vorschlag gibt.
     ⚠ Sie ist eine VORAUSWAHL. Gespeichert wird erst, wenn jemand das Feld
     bedient; `onChange` feuert bei einem `defaultValue` nicht. */
  function vorschlagId(sfvPersonId: number): string {
    const v = vorschlag.vorschlaege.get(sfvPersonId);
    return v && v.art === "treffer" ? v.mitglied_id : "";
  }

  async function zuordnen(sfvPersonId: number, mitgliedId: string) {
    if (!vereinId || !mitgliedId) return;
    setFehler(null);
    const msg = await speichereZuordnung(sb, vereinId, sfvPersonId, Number(mitgliedId), benutzerId);
    if (msg) { setFehler(msg); return; }
    await laden();
  }

  async function loesen(id: string) {
    setFehler(null);
    const msg = await loescheZuordnung(sb, id);
    if (msg) { setFehler(msg); return; }
    await laden();
  }

  return (
    <div className="cc-col cc-gap-12">
      <Card>
        <div className="cc-section-title-row">
          <div className="cc-section-title">
            <TI n="users" size={14}/> Spieler zuordnen
          </div>
          {onZurueck && <Btn onClick={onZurueck}>Zurück</Btn>}
        </div>

        <InfoBox color={BL} text={
          <div>
            {/* ⚠ Hier stand bis zum 21.08.2026 „Wer dahinter steckt, sagt
                niemand". Das war falsch: der Verband liefert den Namen mit.
                Wir speichern ihn nicht — das ist unsere Entscheidung, nicht
                seine. Der Unterschied ist nicht kosmetisch: „der SFV weiss es
                nicht" beendet jedes Gespraech, „wir speichern es bewusst
                nicht" darf jemand hinterfragen. */}
            Der SFV kennt jeden Einsatz unter einer <strong>personId</strong>. Den Namen
            liefert er mit — <strong>wir speichern ihn nicht</strong>. Er wird nur für
            diese Ansicht geholt und ist beim nächsten Öffnen wieder weg. Einmal
            zugeordnet, erkennt der Sync die Person in jedem weiteren Spiel selbst.
            <div className="cc-mt-8">
              Ohne Namen erkennbar an Mannschaft, Rückennummer und Zahl der Einsätze.
              Automatisch über den Namen ginge ohnehin nicht: der Verein hat zwei
              Adrian Schmid.
            </div>
          </div>
        }/>

        {/* Die Zustände der Namen. Der Knopf sagt, was er tut, und die
            Meldung danach sagt die WAHRHEIT — beide Zahlen, und ob noch
            etwas zu holen ist.

            ⚠ Bis zum 22.08.2026 stand hier „Namen holen (Sync-Lauf, ~1
            Minute)" und danach „129 Namen aus dem letzten Lauf". Wahr und
            trotzdem irreführend: 48 Spieler waren auf diesem Weg gar nicht
            erreichbar, und nochmal drücken brachte exakt dieselben Namen.
            Ein Text, der „weitere Läufe bringen mehr" verspricht, lässt
            jemanden fünfmal drücken. */}
        {offenGesamt > 0 && (
          namenLaeuft ? (
            <div className="cc-text-sm cc-mt-8 cc-text-sub">
              Namen werden geholt — der Verband wird zu jedem betroffenen Spiel einmal
              gefragt. Zuordnen über Nummer und Mannschaft geht in der Zwischenzeit weiter.
            </div>
          ) : !geholt ? (
            <div className="cc-mt-8">
              <Btn small variant="outline" color={BL} onClick={namenHolen}>
                Namen holen ({offenGesamt} offen)
              </Btn>
              {/* ⚠ ⚠  DIESER TEXT WAR SEIT DEM 10.09.2026 FALSCH, EINEN
                  HALBEN TAG LANG. Er sagte „Sie werden nicht gespeichert
                  und sind beim nächsten Öffnen wieder weg" — das galt bis
                  zu dem Entscheid, die SFV-Namen zu speichern
                  (migration_sfv_personen.sql). Seither schreibt die
                  Aktion nach `sfv_personen`, und der Satz behauptete das
                  Gegenteil dessen, was geschieht.

                  ⚠ Ein Text an einer Schaltfläche ist eine Zusage über
                  das, was gleich passiert. Wer einen Entscheid umdreht,
                  sucht die Texte, die ihn festhalten — dieselbe Regel wie
                  bei den Prüfregeln, nur trifft sie hier einen Menschen
                  statt eine Prüfkette. */}
              <div className="cc-inline-hint">
                Holt die Klarnamen beim Verband und speichert sie. Sie erscheinen
                danach auch auf der Website, wo bisher „Nr. 13" stand — bis jemand
                den Spieler zuordnet, dann gewinnt der eigene Name.
                <br/>
                {/* ⚠ Hier stand bis zum 10.09.2026: „Nur die Startelf … 207 von
                    207 Eingewechselten stehen in keiner Aufstellung." BEIDES
                    war falsch. Gemessen an einer echten Antwort: /players
                    fuehrt die Bank mit (7 von 20 eigenen Spielern tragen dort
                    „Ersatz"), und die Deckung ist vollstaendig — 80 Spiele mit
                    Aufstellung, 0 Wechsel ohne. Die 207 zaehlten fehlende
                    NAMEN, nicht fehlende Zeilen; ich hatte eine Messung ueber
                    das eine als Aussage ueber das andere gelesen. Der Satz
                    stand hier als Abschreckung vor einem Knopf, der in
                    Wahrheit hilft. */}
                Er kostet einen Abruf je Spiel mit offenen Spielern.
              </div>
            </div>
          ) : (
            <>
            <div className="cc-inline-hint cc-mt-8">
              {/* ⚠ Zweite Stelle mit derselben ueberholten Zusage, am
                  10.09.2026 mitberichtigt. Sie stand zehn Zeilen unter der
                  ersten — wer nur eine sucht, findet nur eine. */}
              {anzahlNamen} von {anzahlNamen + ohneNamen} Namen geholt und gespeichert.
              {ohneNamen > 0 && (
                <> Für {ohneNamen} Spieler liefert der Verband keinen Namen; ein weiterer
                Lauf ändert daran nichts.</>
              )}
            </div>

            {/* ══ Was der Vorschlag leistet — und was er nicht weiss ══════
                ⚠ DREI ZAHLEN, UND DIE AUFTEILUNG MUSS AUFGEHEN. Eine
                einzelne Zahl kann nur behauptet werden; eine Aufteilung
                rechnet sich nach. */}
            <div className="cc-inline-hint cc-mt-8">
              {vorschlag.mit} von {vorschlag.mit + vorschlag.ohne} Spielern haben einen
              Vorschlag. Er ist vorgewählt und <strong>nicht gespeichert</strong> — erst
              „Übernehmen" oder eine eigene Auswahl schreibt ihn.
              {vorschlag.ohne > 0 && (
                <> Bei den übrigen {vorschlag.ohne} steht der Grund an der Zeile.</>
              )}
              <br/>
              {/* ⚠ `null` heisst NICHT GEFRAGT, `0` heisst alle lesbar. Die
                  zwei dürfen nicht dieselbe Anzeige bekommen — genau diese
                  Einebnung hat am 11.09.2026 eine Karte drei Nullen zeigen
                  lassen, wo 129 Personen standen. */}
              {jahrgangUnlesbar === null
                ? <>Der Jahrgang wird nicht gemeldet — die Edge Function ist älter als
                   der 13.09.2026. Ohne ihn bleiben Namensgleiche ohne Vorschlag.</>
                : jahrgangUnlesbar === 0
                ? <>Der Jahrgang ist bei allen lesbar; damit sind auch Namensgleiche
                   unterscheidbar.</>
                : <>Bei {jahrgangUnlesbar} Spielern ist der Jahrgang nicht lesbar. Die Form
                   von <code>birthDate</code> beim Verband ist ungemessen — diese Zahl ist
                   die Messung. Namensgleiche bleiben dort ohne Vorschlag.</>}
            </div>

            {/* ⚠ Die Ausgabe für WordPress. Sie steht HIER, direkt unter der
                Namensmeldung, und nicht an einer eigenen Stelle: sie ist nur
                brauchbar, solange die Namen geholt sind, und sie verschwindet
                mit ihnen beim nächsten Öffnen. */}
            <div className="cc-row cc-gap-8 cc-mt-8" style={{flexWrap:"wrap"}}>
              <Btn small variant="outline" onClick={listeKopieren}>
                Liste kopieren
              </Btn>
              <Btn small variant="outline" onClick={listeHerunterladen}>
                Liste als Textdatei
              </Btn>
              <Btn small variant="outline" onClick={wxrHerunterladen}>
                WordPress-Importdatei (XML)
              </Btn>
              <Btn small variant="outline" onClick={mannschaftslisteHerunterladen}>
                Liste nach Mannschaft (Excel)
              </Btn>
            </div>

            {/* ⚠ ZWEI HANDLUNGEN, KEIN SCHALTER. Ein Kästchen „alle" über
                einer Sammlung müsste drei Tatsachen auf zwei Stellungen
                abbilden und stünde bei jeder Teilauswahl falsch — die
                Regel steht bei `alleTeamSchluessel`. Ein Knopf beschreibt,
                was er tut, und kann nichts Falsches behaupten.

                Die Mischung steht als Zahl daneben: angezeigt, nicht
                bedienbar. */}
            <div className="cc-row cc-gap-8 cc-mt-8" style={{flexWrap:"wrap"}}>
              <Btn small variant="outline"
                onClick={() => setTeamsGewaehlt(new Set(alleTeamSchluessel))}>
                Alle auswählen
              </Btn>
              <Btn small variant="outline"
                onClick={() => setTeamsGewaehlt(new Set())}>
                Auswahl aufheben
              </Btn>
              <span className="cc-text-sm cc-text-sub">
                {anzahlGewaehlt} von {alleTeamSchluessel.size} Mannschaften gewählt
              </span>
            </div>
            <div className="cc-inline-hint">
              Für „Liste nach Mannschaft (Excel)“: das Kästchen steht an jeder
              Mannschaft weiter unten. Ohne Auswahl wird nichts geladen — eine
              leere Datei sähe aus wie ein Fehlschlag.
            </div>
            <div className="cc-inline-hint">
              Nummer, Name, Mannschaft und Rückennummern der {spielerZeilen.length} Spieler
              — zum Übertragen nach WordPress. Die Datei entsteht im Browser und wird
              nirgends gespeichert.
              {" "}⚠ Jetzt ziehen, nicht später: die Liste zeigt nur die noch nicht
              zugeordneten Spieler und schrumpft mit jeder Zuordnung.
            </div>
            {/* ⚠ ⚠  DER SATZ, DER DEN FEHLER VOM 24.09.2026 VERHINDERT HÄTTE.

                Vier Profile trugen Nummern, die in keiner Aufstellung
                vorkommen. Sie sind nicht erfunden: die vier standen wegen
                eines Lesefehlers nicht in dieser Liste, also hat jemand
                die Zahl dort geholt, wo sie sichtbar war — beim Verband.

                ⚠ Und dessen Seite führt mehrere Nummern nebeneinander.
                `passportNumber` steht im selben Datensatz wie `personId`,
                ist ebenfalls eine sechs- bis siebenstellige Zahl und heisst
                auf dem Matchblatt „Passnummer". Eine davon ist die
                richtige, und man sieht es ihr nicht an.

                Der Lesefehler ist behoben; dieser Satz ist die zweite
                Hälfte. Er steht hier und nicht in einem Kommentar, weil
                ihn genau der braucht, der gerade überträgt. */}
            <div className="cc-inline-hint cc-mt-8">
              ⚠ <strong>Diese Nummern und keine anderen.</strong> Sie stammen aus
              der Aufstellung des Verbands (<code>personId</code>). Auf der
              Verbandswebsite und auf dem Matchblatt stehen weitere Zahlen
              daneben — unter anderem die <em>Passnummer</em>, die genauso
              aussieht. Wer eine Person hier vermisst, hat sie nicht falsch
              eingetragen, sondern <strong>noch keinen Einsatz von ihr</strong>:
              dann gehört keine Nummer ins Profil.
            </div>
            {ausgabeMeldung && (
              <div className="cc-text-sm cc-mt-8">{ausgabeMeldung}</div>
            )}
            </>
          )
        )}

        {namenFehler && (
          <div className="cc-text-sm cc-text-danger cc-mt-8">
            Namen nicht geholt: {namenFehler}
          </div>
        )}

        {fehler && <div className="cc-text-sm cc-text-danger cc-mt-8">Nicht gespeichert: {fehler}</div>}

        {/* ⚠ ⚠  DER LADEFEHLER STEHT VOR DER ZAHL, UND ZWAR ZWINGEND.
            Schlägt das Laden fehl, sind beide Listen leer — und die Zeile
            darunter meldete dann „Alle zugeordnet — 0 Spieler bekannt."
            Das ist die Falschaussage, gegen die das Pagen ueberhaupt
            gebaut ist: eine leere Liste sieht aus wie eine vollständige.
            Deshalb wird die Zahl bei einem Ladefehler NICHT gezeigt. */}
        {ladefehler
          ? (
            <div className="cc-text-sm cc-text-danger cc-mt-8">
              Die Liste konnte nicht vollständig geladen werden: {ladefehler}
              {" "}— es wird nichts angezeigt, weil eine unvollständige Liste
              aussieht wie eine vollständige.
            </div>
          )
          : (
            <div className="cc-text-sm cc-mt-8">
              {laedt ? "Lädt…"
                : offenGesamt === 0
                  ? `Alle zugeordnet — ${zuordnungen.length} Spieler bekannt.`
                  : `${offenGesamt} offen, ${zuordnungen.length} bereits zugeordnet.`}
            </div>
          )}
      </Card>

      {gruppen.map(g => {
        const key = String(g.sfv_team_id ?? "-");
        const auf = offenesTeam === key;
        return (
          <Card key={key}>
            <div className="cc-section-title-row">
              <div className="cc-row cc-gap-6">
                {/* ⚠ ⚠  DAS KÄSTCHEN STEHT NEBEN DEM AUSLÖSER, NICHT DARIN.
                    Die Überschrift ist der Knopf fürs Aufklappen; ein
                    Kästchen INNERHALB wäre nicht nur ungültiges Markup,
                    sondern ein Klick, der ZWEI Dinge tut — auswählen und
                    aufklappen. Zwei Wirkungen auf einen Klick sind von
                    einer falschen Wirkung nicht zu unterscheiden.

                    Als Geschwister blubbert der Klick heute nirgends hin.
                    `stopPropagation` steht trotzdem da: es kostet nichts
                    und hält, wenn jemand die Zeile später anklickbar
                    macht — der naheliegendste nächste Umbau. Ein Fall in
                    `spielerVorschlagEinbau.test.jsx` hält die Zusage fest,
                    damit sie nicht still bricht. */}
                {/* ⚠ `key` ist der Gruppenschluessel (`String(sfv_team_id ?? "-")`),
                    nicht der Anzeigename — siehe `alleTeamSchluessel`. Das
                    `aria-label` nennt weiter den Namen: es spricht zum
                    Menschen, der Schluessel zur Ausgabe. */}
                <input type="checkbox" checked={teamsGewaehlt.has(key)}
                  aria-label={`${g.teamName} für die Liste wählen`}
                  title="Für „Liste nach Mannschaft (Excel)“ auswählen"
                  onClick={ev => ev.stopPropagation()}
                  onChange={() => teamUmschalten(key)}/>
                <button className="cc-section-title cc-row cc-gap-6"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => setOffenesTeam(auf ? null : key)}>
                  <TI n={auf ? "chevron-down" : "chevron-right"} size={14}/>
                  {g.teamName}
                </button>
              </div>
              <span className="cc-text-sm cc-text-sub">{g.offen.length} offen</span>
            </div>

            {auf && g.offen.map(o => (
              <div key={o.sfv_person_id} className="cc-list-item-row cc-between">
                <div>
                  <div>
                    {namen[o.sfv_person_id]
                      ? <strong>{namen[o.sfv_person_id]}</strong>
                      : <>Nr. {o.rueckennummern.length ? o.rueckennummern.join(", ") : "—"}</>}
                    <span className="cc-text-sub"> · {o.einsaetze} Einsatz{o.einsaetze === 1 ? "" : "e"}</span>
                  </div>
                  <div className="cc-inline-hint">
                    {namen[o.sfv_person_id] && `Nr. ${o.rueckennummern.length ? o.rueckennummern.join(", ") : "—"} · `}
                    SFV-personId {o.sfv_person_id}
                    {jahrgaenge[o.sfv_person_id] ? ` · Jahrgang ${jahrgaenge[o.sfv_person_id]}` : ""}
                  </div>
                  {/* ⚠ DER GRUND STEHT IMMER DA, auch wenn nichts
                      vorgeschlagen wird. Eine Zeile, die bloss schweigt, ist
                      von einer nicht geprüften nicht zu unterscheiden — und
                      genau diese Ununterscheidbarkeit kostet hier sonst die
                      meiste Zeit. */}
                  {vorschlag.vorschlaege.get(o.sfv_person_id) && (
                    <div className="cc-inline-hint">
                      {vorschlag.vorschlaege.get(o.sfv_person_id)!.art === "treffer"
                        ? <>Vorschlag: {vorschlag.vorschlaege.get(o.sfv_person_id)!.grund}</>
                        : <>Kein Vorschlag: {vorschlag.vorschlaege.get(o.sfv_person_id)!.grund}</>}
                    </div>
                  )}
                </div>
                {/* ⚠ `key` mit dem Vorschlag darin: React setzt `defaultValue`
                    nur beim ersten Rendern. Ohne den wechselnden Schlüssel
                    stünde das Feld weiter auf „— Mitglied wählen —", nachdem
                    die Namen geholt sind — der Vorschlag wäre berechnet,
                    geliefert und nicht gezeigt. */}
                <div className="cc-row">
                  <select key={`${o.sfv_person_id}-${vorschlagId(o.sfv_person_id)}`}
                    className="cc-input" style={{ width: "auto", minWidth: 220 }}
                    defaultValue={vorschlagId(o.sfv_person_id)}
                    onChange={ev => zuordnen(o.sfv_person_id, ev.target.value)}>
                    <option value="">— Mitglied wählen —</option>
                    {mitgliedOpts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {/* ⚠ DIESER KNOPF IST NICHT BEQUEMLICHKEIT, SONDERN NOTWENDIG.
                      `onChange` feuert bei einem `defaultValue` nicht — ohne ihn
                      wäre ein zutreffender Vorschlag vorgewählt und NICHT
                      speicherbar: man müsste jemand anderen wählen und zurück.
                      Berechnet, geliefert, nicht übernehmbar.

                      ⚠ Und er gilt für EINE Person. Ein Knopf, der alle
                      Vorschläge auf einmal speichert, gibt es bewusst nicht —
                      das ist der Punkt, an dem aus einem Vorschlag eine
                      Behauptung wird. (Bedingung Didi, 13.09.2026.) */}
                  {vorschlagId(o.sfv_person_id) !== "" && (
                    <Btn variant="outline"
                      onClick={() => zuordnen(o.sfv_person_id, vorschlagId(o.sfv_person_id))}>
                      Übernehmen
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </Card>
        );
      })}

      {zuordnungen.length > 0 && (
        <Card>
          <div className="cc-section-title"><TI n="check" size={14}/> Bereits zugeordnet</div>
          <div className="cc-inline-hint">
            Ein Mitglied darf mehrere personId tragen — wechselt der Verband die IDs zur
            neuen Saison, kommt eine dazu, statt eine zu ersetzen.
          </div>
          {zuordnungen.map(z => {
            const m = mitgliedOpts.find(x => Number(x.id) === Number(z.mitglied_id));
            return (
              <div key={z.id} className="cc-list-item-row cc-between">
                <div>
                  <div>{m?.name ?? `Mitglied #${z.mitglied_id}`}</div>
                  <div className="cc-inline-hint">personId {z.sfv_person_id}</div>
                </div>
                <button className="cc-icon-btn-danger" onClick={() => loesen(z.id)} title="Zuordnung lösen">
                  <TI n="trash" size={14}/>
                </button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
