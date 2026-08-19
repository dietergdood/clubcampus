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
          : <ModusSchalter eintrag={eintrag} nurAnAus={nurAnAus}/>}
      </div>
    );
  }

  /* `schluessel` ist vom Aufrufer bereits auf das gefiltert, was einen
     "aus"-Wert kennt — vorname/nachname sind fest und bleiben vom
     Sammelschalter unberührt. */
  function BereichAusSchalter({ schluessel }: { schluessel: readonly string[] }) {
    const an = schluessel.some(s => istSichtbar(konfig, s));
    return (
      <button
        className={"cc-toggle" + (an ? " cc-toggle-on" : "")}
        title={an ? "Bereich ausschalten" : "Bereich einschalten"}
        onClick={() => aendern(schluessel, an ? "aus" : "freiwillig")}>
        <div className={"cc-toggle-knob" + (an ? " cc-toggle-knob-on" : "")}/>
      </button>
    );
  }

  /* ── Seite ── */

  if (typen.length === 0) return null;

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

        return (
          <Card key={b.key}>
            <div className="cc-section-title-row">
              <div className="cc-section-title"><TI n={b.icon} size={14}/> {b.label}</div>
              {schaltbar.length > 0 && <BereichAusSchalter schluessel={schaltbar}/>}
            </div>

            {ohneAdresse.map(e => <Zeile key={e.schluessel} eintrag={e}/>)}

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
                  <button
                    className={"cc-toggle" + (istSichtbar(konfig, "strasse") ? " cc-toggle-on" : "")}
                    title={istSichtbar(konfig, "strasse") ? "Adresse ausschalten" : "Adresse einschalten"}
                    onClick={() => aendern(ADRESS_FELDER, istSichtbar(konfig, "strasse") ? "aus" : "freiwillig")}>
                    <div className={"cc-toggle-knob" + (istSichtbar(konfig, "strasse") ? " cc-toggle-knob-on" : "")}/>
                  </button>
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
