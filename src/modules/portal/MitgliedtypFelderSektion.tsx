/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/MitgliedtypFelderSektion.tsx

   Was ein Mitgliedtyp hat. Pro Schlüssel einer von drei Werten —
   Pflicht · Freiwillig · Gibt es nicht.

   Bewusst KEINE Matrix wie die Vorgängerin: bei acht Mitgliedtypen
   mal gut zwanzig Schlüsseln braucht jede Zelle ein Bedienelement mit
   drei Werten. Ein Häkchen verträgt hundertsechzig Zellen, ein
   Segment-Schalter nicht. Stattdessen: ein Mitgliedtyp gewählt,
   darunter seine Bereiche.

   ⚠ Zeilen auf "Gibt es nicht" bleiben sichtbar, nur optisch
   zurückgenommen. Sonst käme man nicht mehr heran, um sie wieder
   einzuschalten.

   Alle Klassen bestehen bereits (`cc-list-item-row`, `cc-between`,
   `cc-text-muted`, `cc-text-danger`, `cc-seg`, `cc-toggle`, `cc-mt-8`,
   `cc-section-title`) — für diese Seite ist keine neue CSS-Klasse
   entstanden.

   Ein einziges Inline-Style bleibt, mit Grund: `cc-input` ist
   `width:100%`, der Mitgliedtyp-Wähler steht aber in einer
   `cc-section-title-row` neben der Überschrift und darf sie nicht
   verdrängen. Dafür gibt es keine Klasse, und eine neue anzulegen
   wäre für einen Einzelfall zu viel.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, InfoBox } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BL } from "../../constants.ts";
import {
  ADRESS_FELDER, BEREICHE, MODUS_LABEL,
  eintraegeFuerBereich, getFeldkonfig, giltFuerZiel, fuerMitgliedtyp,
  fuerPersonenart, istSichtbar, labelFuer,
} from "../../domains/members/feldkonfig.ts";
import type { FeldkonfigZeile, FeldModus, RegistryEintrag } from "../../domains/members/feldkonfig.ts";
import { setzeModus, setzeModusMehrere } from "../../domains/members/feldkonfigService.ts";
import type { Sb, SetState } from "../../types.ts";
import type { MitgliedtypZeile } from "./MitgliederKonfigTab.tsx";
import type { PersonArt } from "../../domains/person/personArtService.ts";
import type { KonfigZielSchreiben } from "../../domains/members/feldkonfig.ts";

interface Props {
  supabase: Sb;
  vereinId: string | null;
  dbMitgliedtypen: MitgliedtypZeile[];
  feldkonfig: FeldkonfigZeile[];
  setFeldkonfig: SetState<FeldkonfigZeile[]>;
  /** Die pflegbaren Arten ohne Mitgliedschaft — eine Spalte je Art. */
  personenarten?: PersonArt[];
}

export function MitgliedtypFelderSektion({
  supabase, vereinId, dbMitgliedtypen, feldkonfig, setFeldkonfig, personenarten = [],
}: Props) {
  const typen = (dbMitgliedtypen || []).filter(t => t.aktiv !== false);
  /* Mitgliedtypen und Arten ohne Mitgliedschaft stehen in DERSELBEN Auswahl —
     eine Konfiguration, ein Ort. Die Arten sind seit dem 20.08.2026 eine
     eigene Tabelle (`personenarten`) und NICHT Zeilen in `mitgliedtypen`:
     dort erschienen sie in jedem Dropdown und in jeder Zaehlung und stellten
     die Falle wieder auf, die der Supporter-Rueckbau am 20.08. abgebaut hat.

     Der Schluessel im `<select>` traegt deshalb ein Praefix — ohne das waere
     eine Art-Id von einer Mitgliedtyp-Id nicht zu unterscheiden, und ein
     Klick landete auf der falschen Achse. */
  const ART = "art:";
  const [gewaehlt, setGewaehlt] = useState<string>("");
  const [fehler, setFehler] = useState<string | null>(null);

  /* Erster Typ als Vorauswahl, sobald die Liste da ist. Als abgeleiteter
     Wert statt im Effekt — sonst flackert die Seite einmal leer. */
  const istOhne = gewaehlt.startsWith(ART);
  const artId = istOhne ? gewaehlt.slice(ART.length) : null;
  const art = istOhne ? (personenarten.find(a => a.art_id === artId) || null) : null;
  const typ = istOhne ? null : (typen.find(t => t.id === gewaehlt) || typen[0] || null);

  const ziel = istOhne ? fuerPersonenart(artId) : fuerMitgliedtyp(typ?.name);
  const zielSchreiben: KonfigZielSchreiben = istOhne
    ? { achse: "personenart", artId: artId ?? "" }
    : { achse: "mitgliedtyp", mitgliedtypId: typ?.id ?? "" };
  const konfig = getFeldkonfig(ziel, feldkonfig);

  /* Optimistisch im State nachziehen, damit der Schalter sofort
     umspringt; bei einem Fehler die Zeile zurückdrehen und melden.
     Ohne das wirkte ein fehlgeschlagenes Speichern wie ein Erfolg. */
  function lokalSetzen(schluessel: readonly string[], modus: FeldModus) {
    if (istOhne ? !artId : !typ?.id) return;
    setFeldkonfig(prev => {
      /* Ueber die KENNUNG filtern, nicht ueber eine Achsenspalte: sonst
         raeumte ein Schalter bei „Elternteil" die gleichnamige Zeile von
         „Supporter" mit weg — beide haben `mitgliedtyp_id === null`. */
      const rest = prev.filter(z => !(
        (istOhne ? z.art_id === artId : z.mitgliedtyp_id === typ!.id)
        && schluessel.includes(z.schluessel)));
      if (modus === "freiwillig") return rest;
      return [
        ...rest,
        ...schluessel.map(s => ({
          mitgliedtyp_id: istOhne ? null : typ!.id,
          mitgliedtyp: istOhne ? "" : typ!.name,
          art_id: istOhne ? artId : null,
          art: istOhne ? (art?.name ?? "") : "",
          schluessel: s, modus,
        })),
      ];
    });
  }

  async function aendern(schluessel: readonly string[], modus: FeldModus) {
    /* ⚠ HIER STAND `!typ?.id` OHNE DEN istOhne-FALL — und damit war die
       Spalte „Ohne Mitgliedschaft" seit ihrem ersten Tag (21.08.2026) TOT:
       `typ` ist dort null, die Funktion kehrte um, kein Schalter bewegte
       sich, nichts wurde gespeichert, nichts gemeldet. Aufgefallen ist es
       nie, weil die drei Zeilen aus der Migration stammten — sie standen da,
       bevor jemand den ersten Schalter drueckte.

       `lokalSetzen()` hatte den Guard richtig. Zwei Bedingungen fuer
       dieselbe Sache, eine davon falsch: genau die Sorte Abweichung, die man
       nur findet, wenn ein Test sie festhaelt. Drei stehen jetzt unten. */
    if (!supabase || !vereinId) return;
    if (istOhne ? !artId : !typ?.id) return;
    const vorher = feldkonfig;
    setFehler(null);
    lokalSetzen(schluessel, modus);
    const msg = schluessel.length === 1
      ? await setzeModus(supabase, vereinId, zielSchreiben, schluessel[0], modus)
      : await setzeModusMehrere(supabase, vereinId, zielSchreiben, schluessel, modus);
    if (msg) { setFeldkonfig(vorher); setFehler(msg); }
  }

  /* ── Bausteine ── */

  function ModusSchalter({ eintrag, nurAnAus = false }: { eintrag: RegistryEintrag; nurAnAus?: boolean }) {
    const aktuell = konfig[eintrag.schluessel];
    /* Im Adressblock steht "Gibt es nicht" nur am Block, nicht an der
       einzelnen Zeile — siehe ADRESS_FELDER. */
    const modi = nurAnAus ? eintrag.modi.filter(m => m !== "aus") : eintrag.modi;
    return (
      <div className="cc-seg">
        {modi.map(m => (
          <button key={m}
            className={"cc-seg-item" + (aktuell === m ? " cc-seg-active" : "")}
            onClick={() => aendern([eintrag.schluessel], m)}>
            {MODUS_LABEL[m]}
          </button>
        ))}
      </div>
    );
  }

  /* Ein Schalter für "gibt es / gibt es nicht". Nimmt eine Liste, weil er
     drei Rollen bedient: Sammelschalter eines Bereichs, Adressblock (vier
     Felder, ein Schalter) und einzelne Zeilen, bei denen es nichts
     auszufüllen gibt. Eine Stelle statt dreier Kopien desselben Markups. */
  function AnAusSchalter({ schluessel, titel }: { schluessel: readonly string[]; titel: string }) {
    const an = schluessel.some(s => istSichtbar(konfig, s));
    return (
      <button
        className={"cc-toggle" + (an ? " cc-toggle-on" : "")}
        title={an ? `${titel} ausschalten` : `${titel} einschalten`}
        onClick={() => aendern(schluessel, an ? "aus" : "freiwillig")}>
        <div className={"cc-toggle-knob" + (an ? " cc-toggle-knob-on" : "")}/>
      </button>
    );
  }

  /* "Freiwillig" gegen "Gibt es nicht" ist keine Wahl zwischen drei Werten,
     sondern an oder aus — für einen Profil-Tab und für den Mitgliedtyp gibt
     es nichts auszufüllen. Ein Segment mit zwei Feldern würde einen dritten
     Zustand suggerieren, den es nicht gibt.

     Nicht dasselbe wie der Adressblock: dort bleiben zwei Werte übrig
     (Pflicht/Freiwillig), und die gehören ins Segment — ein Schiebeschalter
     liesse offen, welche Seite "Pflicht" ist. */
  const istAnAus = (modi: readonly FeldModus[]) =>
    modi.includes("aus") && !modi.includes("pflicht");

  function Zeile({ eintrag, nurAnAus = false }: { eintrag: RegistryEintrag; nurAnAus?: boolean }) {
    const aus = !istSichtbar(konfig, eintrag.schluessel);
    const fest = eintrag.modi.length === 0;
    return (
      <div className="cc-list-item-row cc-between">
        <div className={aus ? "cc-text-muted" : undefined}>
          <div>{labelFuer(eintrag.schluessel)}</div>
          {eintrag.hinweis && <div className="cc-inline-hint">{eintrag.hinweis}</div>}
        </div>
        {fest
          ? <span className="cc-text-sm cc-text-sub">Immer Pflicht</span>
          : istAnAus(eintrag.modi)
            ? <AnAusSchalter schluessel={[eintrag.schluessel]} titel={labelFuer(eintrag.schluessel)}/>
            : <ModusSchalter eintrag={eintrag} nurAnAus={nurAnAus}/>}
      </div>
    );
  }

  /* ── Seite ── */

  /* Kein `return null`. Eine Sektion, die still verschwindet, ist von einer
     nicht gerenderten nicht zu unterscheiden — genau das hat am 19.08.2026
     eine Stunde gekostet, als der Aufruf beim Entfernen der alten Matrizen
     mit herausgeschnitten wurde und niemand sagen konnte, ob sie fehlt oder
     leer ist. */
  if (typen.length === 0) {
    return (
      <Card>
        <div className="cc-section-title">
          <TI n="id-badge" size={14}/> Was ein Mitgliedtyp oder eine Art hat
        </div>
        <div className="cc-text-sm cc-text-sub">
          Noch kein aktiver Mitgliedtyp angelegt — oben anlegen, dann erscheint
          hier seine Konfiguration.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="cc-section-title-row">
          <div className="cc-section-title">
            <TI n="id-badge" size={14}/> Was ein Mitgliedtyp hat
          </div>
          <select className="cc-input" style={{ width: "auto", minWidth: 220 }}
            value={istOhne ? `${ART}${artId}` : (typ?.id || "")}
            onChange={e => setGewaehlt(e.target.value)}>
            <optgroup label="Mitgliedtypen">
              {typen.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
            {/* Kein `null` bei leerer Liste: eine Gruppe, die still
                verschwindet, ist von einer nicht gerenderten nicht zu
                unterscheiden (CLAUDE.md). */}
            <optgroup label="Ohne Mitgliedschaft">
              {personenarten.length > 0
                ? personenarten.map(a => (
                    <option key={a.art_id} value={`${ART}${a.art_id}`}>{a.name}</option>))
                : <option disabled>— keine Arten angelegt —</option>}
            </optgroup>
          </select>
        </div>

        <InfoBox color={BL} text={
          <div>
            <strong>Pflicht</strong> — wird gezeigt und verlangt.{" "}
            <strong>Freiwillig</strong> — wird gezeigt, darf leer bleiben.{" "}
            <strong>Gibt es nicht</strong> — verschwindet aus Profil, Neuanlage und
            Datenprüfung, auch für die Verwaltung.
            <div className="cc-mt-8">
              Nicht Gesetztes gilt als <strong>freiwillig</strong>; gespeichert wird nur
              die Abweichung. Ein neuer Mitgliedtyp zeigt deshalb ein vollständiges Profil.
            </div>
          </div>
        }/>

        {fehler && (
          <div className="cc-text-sm cc-text-danger cc-mt-8">
            Nicht gespeichert: {fehler}
          </div>
        )}
      </Card>

      {BEREICHE.map(b => {
        /* Was an einer Mitgliedschaft haengt, erscheint in der Spalte „Ohne
           Mitgliedschaft" gar nicht — als Schalter koennte die Verwaltung es
           auf Pflicht stellen und erzeugte eine Anforderung, die niemand je
           erfuellen kann. */
        const eintraege = eintraegeFuerBereich(b.key).filter(e => giltFuerZiel(e, ziel));
        const schaltbar = eintraege.filter(e => e.modi.includes("aus")).map(e => e.schluessel);
        const adresse = eintraege.filter(e => e.adresse);
        const ohneAdresse = eintraege.filter(e => !e.adresse);

        /* Teams, Vereinsfunktionen und Notizen bestehen aus genau einem
           Eintrag, der den Bereich selbst meint. Dort wäre die Zeile darunter
           eine zweite Bedienung derselben Entscheidung — und wenn beide
           auseinanderliefen, wüsste niemand, was gilt. Nur der Schalter im
           Kopf.

           Erkannt am Schlüssel statt an einer Liste von Bereichsnamen: kommt
           ein weiterer Ein-Eintrag-Bereich dazu, verhält er sich von selbst
           richtig. */
        const nurBereich = eintraege.length === 1 && eintraege[0].schluessel === b.key;

        return (
          <Card key={b.key}>
            <div className="cc-section-title-row">
              <div className="cc-section-title"><TI n={b.icon} size={14}/> {b.label}</div>
              {schaltbar.length > 0 && (
                <AnAusSchalter schluessel={schaltbar} titel={nurBereich ? b.label : "Bereich"}/>
              )}
            </div>

            {!nurBereich && ohneAdresse.map(e => <Zeile key={e.schluessel} eintrag={e}/>)}

            {adresse.length > 0 && (
              <>
                {/* Strasse, PLZ, Ort und Kanton hängen aneinander: der
                    PLZ-Lookup füllt Ort und Kanton, die Adresssuche alle
                    vier. Einzeln abschaltbar nähme das Formular sich selbst
                    die Eingabe — deshalb "Gibt es nicht" nur am Block. */}
                <div className="cc-list-item-row cc-between">
                  <div className={istSichtbar(konfig, "strasse") ? undefined : "cc-text-muted"}>
                    <div className="cc-text-bold">Adresse</div>
                    <div className="cc-inline-hint">
                      Vier Felder, ein Schalter — der PLZ-Lookup füllt Ort und Kanton
                      aus der PLZ.
                    </div>
                  </div>
                  <AnAusSchalter schluessel={ADRESS_FELDER} titel="Adresse"/>
                </div>
                {istSichtbar(konfig, "strasse") &&
                  adresse.map(e => <Zeile key={e.schluessel} eintrag={e} nurAnAus/>)}
              </>
            )}
          </Card>
        );
      })}
    </>
  );
}
