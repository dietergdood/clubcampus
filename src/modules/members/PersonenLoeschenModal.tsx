/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/PersonenLoeschenModal.tsx

   „Personen löschen (DSGVO)" für mehrere — der Ablauf ist derselbe
   wie einzeln, die Absicherungen sind es nicht:

       messen  →  zurückstellen  →  bestätigen  →  laufen  →  Liste

   ⚠ WARUM ES EIN ZWEITES MODAL IST UND KEIN ERWEITERTES.
   Der Einzelfall hat eine Sperre, die für zwanzig nicht taugt: das
   Eintippen des Namens. Zwanzig Namen tippt niemand, und eine Zahl
   („20") tippt sich von selbst.

   ⚠ Diese Fassung zeigt deshalb PERSONEN, nicht Tabellen: bei n
   Personen ist die Frage „wer faellt?", nicht „welche Zeilen". Die
   Tabellen-Aufstellung samt `LESBAR` bleibt dort, wo sie hingehoert
   — im Einzelmodal, wo man sie auch lesen kann. Eine zweite Kopie
   davon waere die Sorte Dublette, die heute schon dreimal der Fehler
   war.

   ⚠ ZURÜCKSTELLEN STATT ZWEITER RÜCKFRAGE. (Entscheidung 24.08.2026.)
   Gemessen: die Sammelaktion trifft praktisch nur Eltern, und 389 von
   393 Kindern haben genau EINEN Elternteil. Eine zweite Rückfrage
   verlangte allen zwanzig denselben Zoll wie den drei heiklen — und
   genau daran gewöhnt man sich ab. Ausserdem ist sie ein Ja/Nein auf
   eine MENGE, während der Schaden pro KIND entsteht.

   Deshalb sind die heiklen von Anfang an NICHT dabei; wer sie
   trotzdem will, nimmt sie einzeln dazu. Der bequemste Weg ist damit
   der sichere, und der zweite Akt lässt sich nicht wegklicken, weil
   die Vorgabe schon das Sichere getan hat.

   ⚠ UND DAS ZURÜCKSTELLEN IST LAUT. Eine Aktion, die stillschweigend
   weniger tut als angefordert, ist von einer, die versagt hat, nicht
   zu unterscheiden — die Falle dieses ganzen Projekts. Die
   Zurückgestellten stehen oben, namentlich, mit dem Grund, und sie
   stehen hinterher noch einmal im Ergebnis.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { ModalOrSheet, Btn, InfoBox, Label } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { AM, BL, R, GN, GB, SPACE, TEXT } from "../../constants.ts";
import {
  holeLoeschVorschauMehrere, rechneStapel, loeschePerson, istLoeschFehler,
} from "../../domains/person/loeschService.ts";
import type {
  StapelEintrag, StapelBefund, StapelErgebnis,
} from "../../domains/person/loeschService.ts";
import type { Sb } from "../../types.ts";

export interface PersonenLoeschenModalProps {
  open: boolean;
  onClose: () => void;
  sb: Sb;
  /** Die Auswahl aus der Liste. `id` ist die `person_id`. */
  personen: { id: string; name: string }[];
  /** Läuft, sobald mindestens eine Person gefallen ist — auch bei Teillauf. */
  onGeloescht?: () => void;
}

/** Eine Zeile der Personenliste: Name links, Gewicht rechts. */
function PersonZeile({ name, zeilen, warnung }: {
  name: string; zeilen: number; warnung?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "3px 0", fontSize: TEXT.sm,
    }}>
      <span>{warnung ? "⚠ " : ""}{name}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: warnung ? 700 : 400 }}>
        {zeilen} {zeilen === 1 ? "Zeile" : "Zeilen"}
      </span>
    </div>
  );
}

export function PersonenLoeschenModal({
  open, onClose, sb, personen, onGeloescht,
}: PersonenLoeschenModalProps) {
  const [laedt, setLaedt]           = useState(true);
  const [fortschritt, setFortschritt] = useState(0);
  const [eintraege, setEintraege]   = useState<StapelEintrag[]>([]);
  const [dazu, setDazu]             = useState<Set<string>>(new Set());
  const [alleZeigen, setAlleZeigen] = useState(false);
  const [laeuft, setLaeuft]         = useState(false);
  const [ergebnis, setErgebnis]     = useState<StapelErgebnis[] | null>(null);
  const [offen, setOffen]           = useState<StapelEintrag[]>([]);

  useEffect(() => {
    if (!open) return;
    setLaedt(true); setFortschritt(0); setEintraege([]); setDazu(new Set());
    setAlleZeigen(false); setErgebnis(null); setOffen([]);
    let abgebrochen = false;
    holeLoeschVorschauMehrere(sb, personen, f => { if (!abgebrochen) setFortschritt(f); })
      .then(raus => { if (!abgebrochen) { setEintraege(raus); setLaedt(false); } });
    return () => { abgebrochen = true; };
    /* `personen` bewusst nicht in der Liste: eine neue Array-Instanz beim
       Rendern des Elternteils löste sonst die Messung erneut aus. Der Stapel
       steht fest, sobald das Modal offen ist. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sb]);

  const befund: StapelBefund | null = eintraege.length > 0 ? rechneStapel(eintraege, dazu) : null;

  /* ⚠ DER LAUF HÄLT NACH DEM ERSTEN HARTEN FEHLER AN.
     Weiterlaufen hiesse, den Grund zwanzigmal zu wiederholen — und bei einem
     Fehler, der an der Function liegt statt an der Person, wären hinterher
     alle weg oder keine, ohne dass jemand dazwischen hinsehen konnte.
     Ein übersprungener Fingerabdruck ist KEIN harter Fehler: er betrifft
     genau eine Person, und die übrigen laufen weiter. */
  async function ausfuehren() {
    if (!befund || befund.loeschbar.length === 0) return;
    setLaeuft(true);
    const bisher: StapelErgebnis[] = [];
    const liste = befund.loeschbar;

    for (let i = 0; i < liste.length; i++) {
      const e = liste[i];
      const raus = await loeschePerson(sb, e.personId, e.vorschau!, e.abdruck!);
      if (istLoeschFehler(raus)) {
        const abweichung = (raus.unterschiede?.length ?? 0) > 0;
        bisher.push({
          personId: e.personId, name: e.vorschau!.person.name,
          stand: abweichung ? "uebersprungen" : "fehlgeschlagen",
          meldung: raus.fehler,
        });
        if (!abweichung) {
          /* Harter Fehler: anhalten und die Restliste benennen. */
          setOffen(liste.slice(i + 1));
          setErgebnis(bisher);
          setLaeuft(false);
          if (bisher.some(b => b.stand === "geloescht") && onGeloescht) onGeloescht();
          return;
        }
        continue;
      }
      bisher.push({ personId: e.personId, name: e.vorschau!.person.name, stand: "geloescht" });
      setErgebnis([...bisher]);   // Fortschritt sichtbar, nicht erst am Ende
    }
    setOffen([]);
    setErgebnis(bisher);
    setLaeuft(false);
    if (bisher.some(b => b.stand === "geloescht") && onGeloescht) onGeloescht();
  }

  const gefaehrdet = befund?.kinder.filter(k => k.verbleibende_eltern === 0) ?? [];
  const schwer = befund
    ? [...befund.loeschbar].map(e => ({
        e, z: e.vorschau!.faellt.reduce((s, p) => s + p.anzahl, 0),
      })).sort((a, b) => b.z - a.z)
    : [];
  const AUSREISSER = 20;   // ab hier gilt eine Person als hinsehenswert

  return (
    <ModalOrSheet open={open} onClose={laeuft ? () => {} : onClose} maxWidth={620}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">
          {personen.length} {personen.length === 1 ? "Person" : "Personen"} löschen
        </div>
        {!laeuft && <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14} /></Btn>}
      </div>

      <div className="cc-modal-body">
        {laedt && (
          <div className="cc-text-muted" style={{ padding: SPACE[5] }}>
            Wird gemessen … {fortschritt} von {personen.length}
          </div>
        )}

        {/* ══ ERGEBNIS ══════════════════════════════════════════════ */}
        {ergebnis ? (
          <>
            {(() => {
              const g = ergebnis.filter(r => r.stand === "geloescht").length;
              const u = ergebnis.filter(r => r.stand === "uebersprungen").length;
              const f = ergebnis.filter(r => r.stand === "fehlgeschlagen").length;
              const zurueck = befund?.zurueckgestellt.length ?? 0;
              return (
                <>
                  <InfoBox color={f > 0 || offen.length > 0 ? R : GN} text={
                    <>
                      <strong>gelöscht: {g}</strong>
                      {u > 0 && <> · übersprungen: {u}</>}
                      {f > 0 && <> · <strong>FEHLGESCHLAGEN: {f}</strong></>}
                      {/* ⚠ DIE ZEILE, DIE SONST FEHLEN WÜRDE. Ein Lauf, der bei
                          5 von 20 anhält und „Fertig" meldet, ist genau das,
                          was diese Aktion nicht tun darf. */}
                      {offen.length > 0 && <> · <strong>offen: {offen.length}</strong></>}
                      {zurueck > 0 && <> · zurückgestellt: {zurueck}</>}
                    </>} />

                  {offen.length > 0 && (
                    <InfoBox color={AM} text={
                      <>⚠ Der Lauf wurde nach dem Fehler angehalten. Diese {offen.length}{" "}
                        {offen.length === 1 ? "Person ist" : "Personen sind"} unverändert:{" "}
                        {offen.map(e => e.vorschau?.person.name ?? e.name).join(", ")}.
                        Weitermachen ist ein neuer Durchgang, keine Fortsetzung — die
                        Vorschau wird dabei neu gemessen.</>} />
                  )}

                  <div style={{ marginTop: SPACE[4] }}>
                    {ergebnis.map(r => (
                      <div key={r.personId} style={{ padding: "3px 0", fontSize: TEXT.sm }}>
                        {r.stand === "geloescht" ? "✓ " : r.stand === "uebersprungen" ? "→ " : "✗ "}
                        <strong>{r.name}</strong>
                        {r.stand === "uebersprungen" && " — übersprungen: die Daten haben sich seit der Vorschau geändert"}
                        {r.stand === "fehlgeschlagen" && ` — ${r.meldung}`}
                      </div>
                    ))}
                  </div>

                  {/* Die Zurückgestellten stehen auch hier noch, sonst sähe der
                      Lauf aus, als wäre die ganze Auswahl erledigt. */}
                  {zurueck > 0 && (
                    <div style={{ marginTop: SPACE[4] }}>
                      <Label>Nicht angefasst (zurückgestellt)</Label>
                      {befund!.zurueckgestellt.map(z => (
                        <div key={z.eintrag.personId} className="cc-text-muted"
                             style={{ padding: "2px 0", fontSize: TEXT.sm }}>
                          {z.eintrag.vorschau?.person.name ?? z.eintrag.name} — {z.grund}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            <div className="cc-modal-ftr">
              <Btn variant="primary" onClick={onClose}>Schliessen</Btn>
            </div>
          </>
        ) : befund && (
          <>
            {/* ══ 1 · DIE WARNZONE ════════════════════════════════════
                Steht ganz oben und ist nicht eingeklappt. Was hier steht,
                ist keine Zeilenzahl, sondern eine Folge. */}
            {gefaehrdet.length > 0 && (
              <>
                <InfoBox color={R} text={
                  <>⚠ <strong>{gefaehrdet.length} {gefaehrdet.length === 1 ? "Kind verliert" : "Kinder verlieren"} den
                    einzigen Kontakt.</strong> Die zugehörigen Personen sind deshalb{" "}
                    <strong>nicht im Stapel</strong> — sie lassen sich einzeln dazunehmen.</>} />
                <div style={{ marginBottom: SPACE[4] }}>
                  {gefaehrdet.map(k => (
                    <div key={k.mitglied_id} style={{ padding: "3px 0", fontSize: TEXT.sm }}>
                      <strong>{k.name}</strong> — danach ohne Elternteil
                      {k.im_stapel > 1 && ` (${k.im_stapel} Elternteile im Stapel)`}
                      {k.war_hauptkontakt && " ⚠ Hauptkontakt"}
                      <span className="cc-text-muted"> · über {k.eltern.map(p => p.name).join(", ")}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ 2 · ZURÜCKGESTELLT ══════════════════════════════════ */}
            {befund.zurueckgestellt.length > 0 && (
              <>
                <Label>Zurückgestellt ({befund.zurueckgestellt.length})</Label>
                <div style={{ marginBottom: SPACE[4] }}>
                  {befund.zurueckgestellt.map(z => {
                    /* Nur die kindbedingte Zurückstellung lässt sich aufheben.
                       Blockiert bleibt blockiert, und eine fehlgeschlagene
                       Vorschau kann man nicht übergehen. */
                    const aufhebbar = !z.eintrag.fehler
                      && (z.eintrag.vorschau?.blockiert.length ?? 0) === 0;
                    return (
                      <div key={z.eintrag.personId} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        gap: SPACE[3], padding: "4px 0", fontSize: TEXT.sm,
                      }}>
                        <span>
                          <strong>{z.eintrag.vorschau?.person.name ?? z.eintrag.name}</strong>
                          <span className="cc-text-muted"> — {z.grund}</span>
                        </span>
                        {aufhebbar && (
                          <Btn small variant="outline" onClick={() => {
                            const n = new Set(dazu); n.add(z.eintrag.personId); setDazu(n);
                          }}>Trotzdem löschen</Btn>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ══ 3 · DER STAPEL ══════════════════════════════════════
                ⚠ Sortiert nach Gewicht, nicht alphabetisch. Gemessen am
                24.08.2026: Median 1 Zeile, p95 = 2, Maximum 103. Eine Summe
                verbürge also fast immer nichts — und genau deshalb fällt die
                eine Person mit 103 Zeilen in ihr nicht auf. */}
            <Label>Wird gelöscht ({befund.loeschbar.length})</Label>
            <div style={{ marginBottom: SPACE[4] }}>
              {befund.loeschbar.length === 0
                ? <div className="cc-text-muted" style={{ fontSize: TEXT.sm }}>
                    Niemand — alle Ausgewählten sind zurückgestellt.
                  </div>
                : <>
                    {(alleZeigen ? schwer : schwer.filter(x => x.z >= AUSREISSER)).map(x => (
                      <PersonZeile key={x.e.personId} name={x.e.vorschau!.person.name}
                                   zeilen={x.z} warnung={x.z >= AUSREISSER} />
                    ))}
                    {!alleZeigen && schwer.some(x => x.z < AUSREISSER) && (
                      <Btn variant="ghost" small onClick={() => setAlleZeigen(true)}>
                        ▸ {schwer.filter(x => x.z < AUSREISSER).length} weitere,
                        je {Math.min(...schwer.filter(x => x.z < AUSREISSER).map(x => x.z))}–
                        {Math.max(...schwer.filter(x => x.z < AUSREISSER).map(x => x.z))} Zeilen
                      </Btn>
                    )}
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      borderTop: `1px solid ${GB}`, marginTop: 6, paddingTop: 6,
                      fontSize: TEXT.sm, fontWeight: 700,
                    }}>
                      <span>Zeilen insgesamt</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{befund.zeilen}</span>
                    </div>
                  </>}
            </div>

            {/* Kinder, die einen Elternteil behalten — kein Alarm, aber eine Tatsache. */}
            {befund.kinder.some(k => k.verbleibende_eltern > 0) && (
              <div className="cc-text-muted" style={{ fontSize: TEXT.xs, marginBottom: SPACE[3] }}>
                {befund.kinder.filter(k => k.verbleibende_eltern > 0).length} weitere
                {" "}Kinder behalten mindestens einen Elternteil.
              </div>
            )}

            <InfoBox color={BL} text={
              <>Jede Person wird einzeln geprüft und einzeln protokolliert. Weicht bei
                einer etwas von der Vorschau ab, wird nur sie übersprungen — die
                übrigen laufen. Beim ersten harten Fehler hält der Lauf an, und was
                offen blieb, steht hinterher da.</>} />

            <div className="cc-modal-ftr">
              <Btn onClick={onClose} disabled={laeuft}>Abbrechen</Btn>
              <Btn variant="danger" disabled={befund.loeschbar.length === 0 || laeuft}
                   onClick={ausfuehren}>
                {laeuft
                  ? `Wird gelöscht … ${(ergebnis as StapelErgebnis[] | null)?.length ?? 0}/${befund.loeschbar.length}`
                  : `${befund.loeschbar.length} endgültig löschen`}
              </Btn>
            </div>
          </>
        )}
      </div>
    </ModalOrSheet>
  );
}
