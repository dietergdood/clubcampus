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
   `cc-text-muted`, `cc-seg`, `cc-toggle`, `cc-section-title`) — für
   diese Seite ist keine neue CSS-Klasse entstanden.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, InfoBox } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BL } from "../../constants.ts";
import {
  ADRESS_FELDER, BEREICHE, MODUS_LABEL,
  eintraegeFuerBereich, getFeldkonfig, istSichtbar, labelFuer,
} from "../../domains/members/feldkonfig.ts";
import type { FeldkonfigZeile, FeldModus, RegistryEintrag } from "../../domains/members/feldkonfig.ts";
import { setzeModus, setzeModusMehrere } from "../../domains/members/feldkonfigService.ts";
import type { Sb, SetState } from "../../types.ts";
import type { MitgliedtypZeile } from "./MitgliederKonfigTab.tsx";

interface Props {
  supabase: Sb;
  vereinId: string | null;
  dbMitgliedtypen: MitgliedtypZeile[];
  feldkonfig: FeldkonfigZeile[];
  setFeldkonfig: SetState<FeldkonfigZeile[]>;
}

export function MitgliedtypFelderSektion({
  supabase, vereinId, dbMitgliedtypen, feldkonfig, setFeldkonfig,
}: Props) {
  const typen = (dbMitgliedtypen || []).filter(t => t.aktiv !== false);
  const [gewaehlt, setGewaehlt] = useState<string>("");
  const [fehler, setFehler] = useState<string | null>(null);

  /* Erster Typ als Vorauswahl, sobald die Liste da ist. Als abgeleiteter
     Wert statt im Effekt — sonst flackert die Seite einmal leer. */
  const typ = typen.find(t => t.id === gewaehlt) || typen[0] || null;
  const konfig = getFeldkonfig(typ?.name, feldkonfig);

  /* Optimistisch im State nachziehen, damit der Schalter sofort
     umspringt; bei einem Fehler die Zeile zurückdrehen und melden.
     Ohne das wirkte ein fehlgeschlagenes Speichern wie ein Erfolg. */
  function lokalSetzen(schluessel: readonly string[], modus: FeldModus) {
    if (!typ?.id) return;
    setFeldkonfig(prev => {
      const ohne = prev.filter(z => !(z.mitgliedtyp_id === typ.id && schluessel.includes(z.schluessel)));
      if (modus === "freiwillig") return ohne;
      return [
        ...ohne,
        ...schluessel.map(s => ({
          mitgliedtyp_id: typ.id, mitgliedtyp: typ.name, schluessel: s, modus,
        })),
      ];
    });
  }

  async function aendern(schluessel: readonly string[], modus: FeldModus) {
    if (!supabase || !vereinId || !typ?.id) return;
    const vorher = feldkonfig;
    setFehler(null);
    lokalSetzen(schluessel, modus);
    const msg = schluessel.length === 1
      ? await setzeModus(supabase, vereinId, typ.id, schluessel[0], modus)
      : await setzeModusMehrere(supabase, vereinId, typ.id, schluessel, modus);
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
          <TI n="id-badge" size={14}/> Was ein Mitgliedtyp hat
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
          <select className="cc-input" style={{ width: "auto", minWidth: 190 }}
            value={typ?.id || ""} onChange={e => setGewaehlt(e.target.value)}>
            {typen.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <InfoBox color={BL} text={
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <strong>Pflicht</strong> — wird gezeigt und verlangt.{" "}
            <strong>Freiwillig</strong> — wird gezeigt, darf leer bleiben.{" "}
            <strong>Gibt es nicht</strong> — verschwindet aus Profil, Neuanlage und
            Datenprüfung, auch für die Verwaltung.
            <div style={{ marginTop: 6 }}>
              Nicht Gesetztes gilt als <strong>freiwillig</strong>; gespeichert wird nur
              die Abweichung. Ein neuer Mitgliedtyp zeigt deshalb ein vollständiges Profil.
            </div>
          </div>
        }/>

        {fehler && (
          <div className="cc-text-sm" style={{ color: "var(--danger,#ef4444)", marginTop: 8 }}>
            Nicht gespeichert: {fehler}
          </div>
        )}
      </Card>

      {BEREICHE.map(b => {
        const eintraege = eintraegeFuerBereich(b.key);
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
                <div className="cc-list-item-row cc-between" style={{ marginTop: 4 }}>
                  <div className={istSichtbar(konfig, "strasse") ? undefined : "cc-text-muted"}>
                    <div style={{ fontWeight: 500 }}>Adresse</div>
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
