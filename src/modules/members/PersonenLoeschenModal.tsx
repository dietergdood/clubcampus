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

⚠ EINE REGEL, KEINE WARNUNG. (Entscheidung Didi, 25.08.2026.)
   Ein Kind ohne Kontakt zu hinterlassen ist nicht erlaubt. Es gibt kein
   „Trotzdem löschen".

   Der Weg dahin ging über zwei verworfene Entwürfe, und die Begründung
   gehört hierher, weil sonst der nächste denselben Weg noch einmal geht:

     · Eine zweite Rückfrage wäre gefallen, weil sie allen zwanzig
       denselben Zoll abverlangt wie den drei heiklen — und was bei jedem
       Stapel erscheint, wird weggeklickt. Ausserdem ist sie ein Ja/Nein
       auf eine MENGE, während der Schaden pro KIND entsteht.

     · Ein Zurückstellen mit „Trotzdem"-Knopf war der zweite Entwurf und
       hat einen Tag gehalten. Er ist an der MESSUNG gescheitert: 389 von
       393 Kindern hängen an genau EINEM Elternteil, und in zwei Proben
       hintereinander wurden drei von drei zufällig gewählten Eltern
       zurückgestellt. Wenn fast jeder Stapel bei „Wird gelöscht (0)"
       landet, wird „Trotzdem" zur Routine — die weiche Sperre hätte
       dasselbe Schicksal wie die Rückfrage, die sie ersetzen sollte.

   ⚠ DER AUSWEG IST HANDELN, NICHT BESTÄTIGEN. Das Kind bekommt einen
   Ersatzkontakt, im selben Fenster über `ElternSucheModal` (Suche ODER
   Neuanlage). Danach werden ALLE Vorschauen neu geholt — nicht aus
   Vorsicht, sondern weil der Fingerabdruck sonst nicht mehr passt.

   ⚠ UND GENAU DAS IST DIE GEGENPROBE. Die Sperre fällt nicht, weil ein
   Schreibvorgang „ok" meldete, sondern weil die neu gemessene Vorschau
   sagt, dass das Kind einen Kontakt hat. Schlägt das Verknüpfen still
   fehl — bei PostgREST ist ein Upsert ohne Treffer kein Fehler —, zeigt
   die neue Vorschau weiterhin 0 und die Person bleibt gesperrt.

   ⚠ NACH KIND GRUPPIERT, NICHT NACH PERSON. Lea Brunner sperrt beide
   Elternteile; EIN Kontakt für sie entsperrt beide. Nach Person
   gruppiert stünde derselbe Auftrag zweimal da, und man erledigte ihn
   zweimal.

   ⚠ UND DIE REGEL GILT NICHT FÜR JEDES KIND. Sie hängt an
   `braucht_kontakt` aus der Vorschau: aktive Mitgliedschaft UND ein
   Mitgliedtyp mit `hauptkontakt_pflicht`. Bei einem AUSGETRETENEN Kind
   ist „ohne Kontakt" kein Problem, sondern das Ziel — sonst verlangte
   die Regel einen Erreichbaren für jemanden, der den Verein verlassen
   hat. Im Bestand betrifft das zwei Kinder, deren Elternteile sonst
   dauerhaft unlöschbar wären.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from "react";
import { ModalOrSheet, Btn, InfoBox, Label } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { AM, BL, R, GN, GB, SPACE, TEXT } from "../../constants.ts";
import { ElternSucheModal } from "./ElternSucheModal.tsx";
import {
  holeLoeschVorschauMehrere, rechneStapel, loeschePerson, istLoeschFehler,
} from "../../domains/person/loeschService.ts";
import type {
  StapelEintrag, StapelBefund, StapelErgebnis, StapelKind,
} from "../../domains/person/loeschService.ts";
import type { Sb } from "../../types.ts";

export interface PersonenLoeschenModalProps {
  open: boolean;
  onClose: () => void;
  sb: Sb;
  vereinId: string | null;
  /** Fuer den Protokolleintrag beim Verknuepfen eines Ersatzkontakts. */
  geaendertVon: string;
  /** Die Auswahl aus der Liste. `id` ist die `person_id`. */
  personen: { id: string; name: string }[];
  /** Laeuft, sobald mindestens eine Person gefallen ist — auch bei Teillauf. */
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
  open, onClose, sb, vereinId, geaendertVon, personen, onGeloescht,
}: PersonenLoeschenModalProps) {
  const [laedt, setLaedt]             = useState(true);
  const [fortschritt, setFortschritt] = useState(0);
  const [eintraege, setEintraege]     = useState<StapelEintrag[]>([]);
  const [alleZeigen, setAlleZeigen]   = useState(false);
  const [laeuft, setLaeuft]           = useState(false);
  const [ergebnis, setErgebnis]       = useState<StapelErgebnis[] | null>(null);
  const [offen, setOffen]             = useState<StapelEintrag[]>([]);
  /** Fuer welches Kind gerade ein Ersatzkontakt gesucht wird. */
  const [kontaktFuer, setKontaktFuer] = useState<StapelKind | null>(null);

  const messen = useCallback(async () => {
    setLaedt(true); setFortschritt(0);
    const raus = await holeLoeschVorschauMehrere(sb, personen, f => setFortschritt(f));
    setEintraege(raus); setLaedt(false);
  }, [sb, personen]);

  useEffect(() => {
    if (!open) return;
    setAlleZeigen(false); setErgebnis(null); setOffen([]); setKontaktFuer(null);
    setLaedt(true); setFortschritt(0); setEintraege([]);
    let abgebrochen = false;
    holeLoeschVorschauMehrere(sb, personen, f => { if (!abgebrochen) setFortschritt(f); })
      .then(raus => { if (!abgebrochen) { setEintraege(raus); setLaedt(false); } });
    return () => { abgebrochen = true; };
    /* `personen` bewusst nicht in der Liste: eine neue Array-Instanz beim
       Rendern des Elternteils loeste sonst die Messung erneut aus. Der Stapel
       steht fest, sobald das Modal offen ist. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sb]);

  const befund: StapelBefund | null = eintraege.length > 0 ? rechneStapel(eintraege) : null;

  /* ⚠ DER LAUF HAELT NACH DEM ERSTEN HARTEN FEHLER AN.
     Weiterlaufen hiesse, den Grund zwanzigmal zu wiederholen — und bei einem
     Fehler, der an der Function liegt statt an der Person, waeren hinterher
     alle weg oder keine, ohne dass jemand dazwischen hinsehen konnte.
     Ein uebersprungener Fingerabdruck ist KEIN harter Fehler: er betrifft
     genau eine Person, und die uebrigen laufen weiter. */
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

  const schwer = befund
    ? [...befund.loeschbar].map(e => ({
        e, z: e.vorschau!.faellt.reduce((s, p) => s + p.anzahl, 0),
      })).sort((a, b) => b.z - a.z)
    : [];
  const AUSREISSER = 20;   // ab hier gilt eine Person als hinsehenswert
  const leicht = schwer.filter(x => x.z < AUSREISSER);

  return (
    <>
    {/* ⚠ Die Kontaktsuche liegt IM Fenster, nicht daneben: der Ausweg darf
        nicht heissen, dass jemand hier schliesst, in der Elternliste sucht und
        zurueckkommt. `ModalOrSheet` fuehrt einen Stapel, ein Modal im Modal ist
        vorgesehen. */}
    {kontaktFuer && (
      <ElternSucheModal
        open
        onClose={() => setKontaktFuer(null)}
        sb={sb}
        vereinId={vereinId}
        geaendertVon={geaendertVon}
        mitgliedId={kontaktFuer.mitglied_id}
        onVerknuepft={() => {
          /* ⚠ ALLE Vorschauen neu, nicht nur die betroffenen. Jede Person, an
             deren Kind sich etwas geaendert hat, traegt einen Fingerabdruck, der
             nicht mehr passt — und welche das sind, weiss nur die neue Messung.
             Sie ist zugleich die Gegenprobe: faellt die Sperre, dann weil die
             Datenbank es sagt, nicht weil ein Schreibvorgang ok meldete. */
          setKontaktFuer(null);
          void messen();
        }}
      />
    )}

    <ModalOrSheet open={open} onClose={laeuft ? () => {} : onClose} maxWidth={620}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">
          {personen.length} {personen.length === 1 ? "Person" : "Personen"} loeschen
        </div>
        {!laeuft && <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14} /></Btn>}
      </div>

      <div className="cc-modal-body">
        {laedt && (
          <div className="cc-text-muted" style={{ padding: SPACE[5] }}>
            Wird gemessen … {fortschritt} von {personen.length}
          </div>
        )}

        {/* ══ ERGEBNIS ══════════════════════ */}
        {!laedt && ergebnis ? (
          <>
            {(() => {
              const g = ergebnis.filter(r => r.stand === "geloescht").length;
              const u = ergebnis.filter(r => r.stand === "uebersprungen").length;
              const f = ergebnis.filter(r => r.stand === "fehlgeschlagen").length;
              const gesperrt = befund?.gesperrt.length ?? 0;
              return (
                <>
                  <InfoBox color={f > 0 || offen.length > 0 ? R : GN} text={
                    <>
                      <strong>geloescht: {g}</strong>
                      {u > 0 && <> · uebersprungen: {u}</>}
                      {f > 0 && <> · <strong>FEHLGESCHLAGEN: {f}</strong></>}
                      {/* ⚠ DIE ZEILE, DIE SONST FEHLEN WUERDE. Ein Lauf, der bei
                          5 von 20 anhaelt und Fertig meldet, ist genau das, was
                          diese Aktion nicht tun darf. */}
                      {offen.length > 0 && <> · <strong>offen: {offen.length}</strong></>}
                      {gesperrt > 0 && <> · gesperrt: {gesperrt}</>}
                    </>} />

                  {offen.length > 0 && (
                    <InfoBox color={AM} text={
                      <>⚠ Der Lauf wurde nach dem Fehler angehalten. Diese {offen.length}{" "}
                        {offen.length === 1 ? "Person ist" : "Personen sind"} unveraendert:{" "}
                        {offen.map(e => e.vorschau?.person.name ?? e.name).join(", ")}.
                        Weitermachen ist ein neuer Durchgang, keine Fortsetzung — die
                        Vorschau wird dabei neu gemessen.</>} />
                  )}

                  <div style={{ marginTop: SPACE[4] }}>
                    {ergebnis.map(r => (
                      <div key={r.personId} style={{ padding: "3px 0", fontSize: TEXT.sm }}>
                        {r.stand === "geloescht" ? "✓ " : r.stand === "uebersprungen" ? "→ " : "✗ "}
                        <strong>{r.name}</strong>
                        {r.stand === "uebersprungen" && " — uebersprungen: die Daten haben sich seit der Vorschau geaendert"}
                        {r.stand === "fehlgeschlagen" && ` — ${r.meldung}`}
                      </div>
                    ))}
                  </div>

                  {/* Die Gesperrten stehen auch hier noch, sonst saehe der Lauf
                      aus, als waere die ganze Auswahl erledigt. */}
                  {gesperrt > 0 && (
                    <div style={{ marginTop: SPACE[4] }}>
                      <Label>Nicht angefasst (gesperrt)</Label>
                      {befund!.gesperrt.map(z => (
                        <div key={z.eintrag.personId} className="cc-text-muted"
                             style={{ padding: "2px 0", fontSize: TEXT.sm }}>
                          {z.eintrag.vorschau?.person.name ?? z.eintrag.name} —{" "}
                          {z.grund.art === "kind_ohne_kontakt"
                            ? `${z.grund.kinder.map(k => k.name).join(", ")} ohne Kontakt`
                            : z.grund.text}
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
        ) : !laedt && befund && (
          <>
            {/* ══ 1 · DER AUFTRAG, nach KIND ══════════════
                Keine Warnung, sondern eine Aufgabe mit einem Knopf daran. */}
            {befund.ohneKontakt.length > 0 && (
              <>
                <InfoBox color={R} text={
                  <>⚠ <strong>{befund.ohneKontakt.length}{" "}
                    {befund.ohneKontakt.length === 1 ? "Kind haette" : "Kinder haetten"} danach
                    keinen Kontakt.</strong> Das ist nicht erlaubt. Die zugehoerigen Personen
                    sind gesperrt, bis das Kind einen Ersatzkontakt hat.</>} />
                <div style={{ marginBottom: SPACE[4] }}>
                  {befund.ohneKontakt.map(k => (
                    <div key={k.mitglied_id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: SPACE[3], padding: "5px 0", fontSize: TEXT.sm,
                    }}>
                      <span>
                        <strong>{k.name}</strong>
                        <span className="cc-text-muted">
                          {" "}— verliert {k.im_stapel === 1 ? "den einzigen Kontakt" : `alle ${k.im_stapel} Kontakte`}
                          {k.war_hauptkontakt && " (darunter den Hauptkontakt)"}
                          {" "}· {k.eltern.map(p => p.name).join(", ")}
                        </span>
                      </span>
                      <Btn small variant="primary" onClick={() => setKontaktFuer(k)}>
                        Kontakt setzen
                      </Btn>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ 2 · GESPERRT ═══════════════════════ */}
            {befund.gesperrt.length > 0 && (
              <>
                <Label>Gesperrt ({befund.gesperrt.length})</Label>
                <div style={{ marginBottom: SPACE[4] }}>
                  {befund.gesperrt.map(z => (
                    <div key={z.eintrag.personId} style={{ padding: "3px 0", fontSize: TEXT.sm }}>
                      <strong>{z.eintrag.vorschau?.person.name ?? z.eintrag.name}</strong>
                      <span className="cc-text-muted">
                        {" — "}
                        {z.grund.art === "kind_ohne_kontakt"
                          ? `${z.grund.kinder.map(k => k.name).join(", ")} haette danach keinen Kontakt`
                          : z.grund.art === "blockiert"
                            ? `daran haengt noch etwas: ${z.grund.text}`
                            : z.grund.text}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ 3 · DER STAPEL ═════════════════════
                ⚠ Sortiert nach Gewicht, nicht alphabetisch. Gemessen am
                24.08.2026: Median 1 Zeile, p95 = 2, Maximum 103. Eine Summe
                verbuerge also fast immer nichts — und genau deshalb faellt die
                eine Person mit 103 Zeilen in ihr nicht auf. */}
            <Label>Wird geloescht ({befund.loeschbar.length})</Label>
            <div style={{ marginBottom: SPACE[4] }}>
              {befund.loeschbar.length === 0
                ? <div className="cc-text-muted" style={{ fontSize: TEXT.sm }}>
                    Niemand — alle Ausgewaehlten sind gesperrt.
                  </div>
                : <>
                    {(alleZeigen ? schwer : schwer.filter(x => x.z >= AUSREISSER)).map(x => (
                      <PersonZeile key={x.e.personId} name={x.e.vorschau!.person.name}
                                   zeilen={x.z} warnung={x.z >= AUSREISSER} />
                    ))}
                    {!alleZeigen && leicht.length > 0 && (
                      <Btn variant="ghost" small onClick={() => setAlleZeigen(true)}>
                        ▸ {leicht.length} weitere, je {Math.min(...leicht.map(x => x.z))}–
                        {Math.max(...leicht.map(x => x.z))} Zeilen
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

            {/* Kinder, die einen Kontakt behalten — kein Alarm, aber eine Tatsache. */}
            {befund.kinder.some(k => k.verbleibende_eltern > 0) && (
              <div className="cc-text-muted" style={{ fontSize: TEXT.xs, marginBottom: SPACE[3] }}>
                {befund.kinder.filter(k => k.verbleibende_eltern > 0).length} weitere
                {" "}Kinder behalten mindestens einen Elternteil.
              </div>
            )}

            <InfoBox color={BL} text={
              <>Jede Person wird einzeln geprueft und einzeln protokolliert. Weicht bei
                einer etwas von der Vorschau ab, wird nur sie uebersprungen — die
                uebrigen laufen. Beim ersten harten Fehler haelt der Lauf an, und was
                offen blieb, steht hinterher da.</>} />

            <div className="cc-modal-ftr">
              <Btn onClick={onClose} disabled={laeuft}>Abbrechen</Btn>
              <Btn variant="danger" disabled={befund.loeschbar.length === 0 || laeuft}
                   onClick={ausfuehren}>
                {laeuft
                  ? `Wird geloescht … ${ergebnis ? (ergebnis as StapelErgebnis[]).length : 0}/${befund.loeschbar.length}`
                  : `${befund.loeschbar.length} endgueltig loeschen`}
              </Btn>
            </div>
          </>
        )}
      </div>
    </ModalOrSheet>
    </>
  );
}
