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
import { holeNamen, leseNamenAntwort } from "../../domains/sfv/sfvService.ts";
import { TI } from "../../icons.tsx";
import { baueSpielerZeilen, alsTextliste, alsWxr } from "../../domains/spiele/spielerAusgabe.ts";
import { dateiDownload, inZwischenablage } from "../../shared/list/exportUtils.ts";
import { BL } from "../../constants.ts";
import {
  gruppiereNachTeam, offeneZuordnungen,
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
  const [namenLaeuft, setNamenLaeuft] = useState(false);
  const [namenFehler, setNamenFehler] = useState<string | null>(null);
  const [ohneNamen, setOhneNamen] = useState(0);
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
  const [offenesTeam, setOffenesTeam] = useState<string | null>(null);

  async function laden() {
    setLaedt(true);
    const [a, z] = await Promise.all([
      fetchAlleAufstellungen(sb, vereinId),
      fetchZuordnungen(sb, vereinId),
    ]);
    setAufstellung(a); setZuordnungen(z); setLaedt(false);
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
    () => baueSpielerZeilen(aufstellung, namen, teamNamen),
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
              <div className="cc-inline-hint">
                Holt die Klarnamen der offenen Spieler beim Verband. Sie werden nicht
                gespeichert und sind beim nächsten Öffnen wieder weg.
              </div>
            </div>
          ) : (
            <>
            <div className="cc-inline-hint cc-mt-8">
              {anzahlNamen} von {anzahlNamen + ohneNamen} Namen geholt — nur für diese
              Sitzung, nicht gespeichert.
              {ohneNamen > 0 && (
                <> Für {ohneNamen} Spieler liefert der Verband keinen Namen; ein weiterer
                Lauf ändert daran nichts.</>
              )}
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
            </div>
            <div className="cc-inline-hint">
              Nummer, Name, Mannschaft und Rückennummern der {spielerZeilen.length} Spieler
              — zum Übertragen nach WordPress. Die Datei entsteht im Browser und wird
              nirgends gespeichert.
              {" "}⚠ Jetzt ziehen, nicht später: die Liste zeigt nur die noch nicht
              zugeordneten Spieler und schrumpft mit jeder Zuordnung.
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

        <div className="cc-text-sm cc-mt-8">
          {laedt ? "Lädt…"
            : offenGesamt === 0
              ? `Alle zugeordnet — ${zuordnungen.length} Spieler bekannt.`
              : `${offenGesamt} offen, ${zuordnungen.length} bereits zugeordnet.`}
        </div>
      </Card>

      {gruppen.map(g => {
        const key = String(g.sfv_team_id ?? "-");
        const auf = offenesTeam === key;
        return (
          <Card key={key}>
            <div className="cc-section-title-row">
              <button className="cc-section-title cc-row cc-gap-6"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => setOffenesTeam(auf ? null : key)}>
                <TI n={auf ? "chevron-down" : "chevron-right"} size={14}/>
                {g.teamName}
              </button>
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
                  </div>
                </div>
                <select className="cc-input" style={{ width: "auto", minWidth: 220 }}
                  defaultValue=""
                  onChange={ev => zuordnen(o.sfv_person_id, ev.target.value)}>
                  <option value="">— Mitglied wählen —</option>
                  {mitgliedOpts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
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
