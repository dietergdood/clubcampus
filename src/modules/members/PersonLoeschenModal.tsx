/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/PersonLoeschenModal.tsx

   „Person löschen (DSGVO)" — mit Vorschau, in dieser Reihenfolge:

       zeigen  →  bestätigen  →  löschen

   ⚠ DIES IST DER EINZIGE VORGANG IM PROJEKT OHNE ROLLBACK. Alles
   andere lässt sich zurücknehmen; hier gibt es hinterher niemanden
   mehr, den man fragen könnte.

   ⚠ UND DIE ABSICHERUNG IST NICHT DIESES MODAL. Eine Rückfrage in
   der Oberfläche schützt vor dem Verklicken, nicht vor dem Irrtum:
   wer die falsche Person geöffnet hat, bestätigt die falsche Person
   genauso überzeugt. Die eigentliche Sperre ist der FINGERABDRUCK —
   die Function misst beim Löschen neu und vergleicht mit dem, was
   die Vorschau gezeigt hat. Weicht etwas ab, geschieht nichts, und
   die Meldung nennt WAS.

   Das Eingeben des Namens ist deshalb ausdrücklich die ZWEITE Sperre
   und wird hier auch so beschriftet. (Anforderung Didi, 23.08.2026.)
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { ModalOrSheet, Btn, Input, InfoBox, Label } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { AM, BL, R, GN, GB, SPACE, TEXT } from "../../constants.ts";
import {
  holeLoeschVorschau, loeschePerson, istLoeschFehler,
} from "../../domains/person/loeschService.ts";
import type { Vorschau, Posten } from "../../domains/person/loeschService.ts";
import type { Sb } from "../../types.ts";

export interface PersonLoeschenModalProps {
  open: boolean;
  onClose: () => void;
  sb: Sb;
  personId: string;
  /** Nur für die Überschrift, bevor die Vorschau da ist. Der Name, gegen den
      geprüft wird, kommt aus der VORSCHAU — also aus der Datenbank. */
  name: string;
  /** Läuft nach erfolgreichem Löschen; die Person gibt es dann nicht mehr. */
  onGeloescht?: () => void;
}

/** Eine Zeile der Aufstellung. Eingerückt, wenn sie an der Mitgliedschaft
    hängt statt an der Person — das erklärt, warum sie überhaupt dasteht. */
function PostenZeile({ p }: { p: Posten }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "3px 0", paddingLeft: p.unter ? 18 : 0, fontSize: TEXT.sm,
    }}>
      <span className={p.unter ? "cc-text-muted" : undefined}>
        {p.unter ? "↳ " : ""}{LESBAR[p.tabelle] ?? p.tabelle}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{p.anzahl}</span>
    </div>
  );
}

/* Tabellennamen sind für die Datenbank, nicht für den Menschen davor.
   ⚠ Was hier fehlt, erscheint als Tabellenname — sichtbar unschön, aber
   nicht falsch. Ein Rückfall auf „Sonstiges" würde verbergen, dass eine
   neue Tabelle in der Kette steht. */
const LESBAR: Record<string, string> = {
  mitglieder: "Mitgliedschaften",
  kader: "Kadereinträge",
  anwesenheiten: "Anwesenheiten",
  mitglieder_team_details: "Team-Angaben",
  sfv_zuordnung: "SFV-Zuordnungen",
  eltern_kinder_als_elternteil: "Verknüpfungen zu Kindern",
  eltern_kinder_als_kind: "Verknüpfung zu den Eltern",
  benutzer: "Portal-Konto (samt Anmeldung)",
  personenart_pro_person: "Personenarten",
  mitglieder_notizen: "Notizen",
  mitglieder_aenderungen: "Änderungen im Verlauf",
  mitglieder_aktivitaeten: "Ereignisse im Verlauf",
  helper_zuteilungen: "Helfereinsätze",
  team_helfer_zuteilungen: "Helfereinsätze im Team",
  spiel_ereignisse_korrigiert_von: "Von ihr korrigierte Spielereignisse",
  audit_log_benutzer_id: "Protokolleinträge",
  nachrichten_autor: "Von ihr verfasste Nachrichten",
  nachrichten_antworten_autor: "Von ihr verfasste Antworten",
  nachrichten_gelesen_user: "Lesebestätigungen",
};

export function PersonLoeschenModal({
  open, onClose, sb, personId, name, onGeloescht,
}: PersonLoeschenModalProps) {
  const [laedt, setLaedt]       = useState(true);
  const [vorschau, setVorschau] = useState<Vorschau | null>(null);
  const [abdruck, setAbdruck]   = useState("");
  const [tippen, setTippen]     = useState("");
  const [fehler, setFehler]     = useState<string | null>(null);
  const [unterschiede, setUnterschiede] = useState<string[]>([]);
  const [laeuft, setLaeuft]     = useState(false);
  const [fertig, setFertig]     = useState<{ zahlen: Record<string, number>; nicht_geprueft: string[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLaedt(true); setVorschau(null); setAbdruck(""); setTippen("");
    setFehler(null); setUnterschiede([]); setFertig(null);
    let abgebrochen = false;
    holeLoeschVorschau(sb, personId).then(raus => {
      if (abgebrochen) return;
      setLaedt(false);
      if (istLoeschFehler(raus)) { setFehler(raus.fehler); return; }
      setVorschau(raus.vorschau);
      setAbdruck(raus.abdruck);
    });
    return () => { abgebrochen = true; };
  }, [open, sb, personId]);

  /* Der erwartete Name kommt aus der VORSCHAU, nicht aus der Prop. Sonst
     prüfte die Eingabe gegen das, was die Liste anzeigt — und wenn die Liste
     eine andere Person meint als die Id, bestätigte man den Irrtum. */
  const echterName = vorschau?.person.name ?? "";
  const stimmt = tippen.trim().toLowerCase() === echterName.trim().toLowerCase() && echterName !== "";
  const blockiert = (vorschau?.blockiert.length ?? 0) > 0;

  async function ausfuehren() {
    if (!vorschau || !stimmt || blockiert) return;
    setLaeuft(true); setFehler(null); setUnterschiede([]);
    const raus = await loeschePerson(sb, personId, vorschau, abdruck);
    setLaeuft(false);
    if (istLoeschFehler(raus)) {
      setFehler(raus.fehler);
      setUnterschiede(raus.unterschiede ?? []);
      return;
    }
    setFertig({ zahlen: raus.zahlen, nicht_geprueft: raus.nicht_geprueft });
    if (onGeloescht) onGeloescht();
  }

  const gesamt = vorschau
    ? vorschau.faellt.reduce((s, p) => s + p.anzahl, 0)
    : 0;

  return (
    <ModalOrSheet open={open} onClose={onClose} maxWidth={560}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">{vorschau?.person.name || name} — Person löschen</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14} /></Btn>
      </div>

      <div className="cc-modal-body">
        {laedt && <div className="cc-text-muted" style={{ padding: SPACE[5] }}>Wird gemessen …</div>}

        {!laedt && !vorschau && fehler && <InfoBox color={R} text={fehler} />}

        {fertig ? (
          <>
            <InfoBox color={GN} text="Gelöscht. Was entfernt wurde:" />
            {Object.entries(fertig.zahlen).filter(([, v]) => v > 0).map(([k, v]) => (
              <PostenZeile key={k} p={{ tabelle: k, anzahl: v }} />
            ))}
            <div style={{ marginTop: SPACE[4] }}>
              <InfoBox color={AM} text={
                <>⚠ Nicht aufgeräumt, weil nicht prüfbar: {fertig.nicht_geprueft.join(", ")}.
                  Diese Tabellen verweisen auf ein Mitglied über einen Typ, der keinen
                  Abgleich erlaubt. Sie sind heute leer.</>} />
            </div>
            <div className="cc-modal-ftr">
              <Btn variant="primary" onClick={onClose}>Schliessen</Btn>
            </div>
          </>
        ) : vorschau && (
          <>
            <div className="cc-text-muted" style={{ marginBottom: SPACE[4], fontSize: TEXT.sm }}>
              {vorschau.person.email || "keine E-Mail"}
              {" · "}
              {vorschau.person.aktive_mitgliedschaften > 0
                ? `${vorschau.person.aktive_mitgliedschaften} aktive Mitgliedschaft(en)`
                : "keine aktive Mitgliedschaft"}
              {vorschau.person.hat_konto ? " · Portal-Konto vorhanden" : " · kein Portal-Konto"}
            </div>

            {blockiert && (
              <InfoBox color={R} text={
                <>Diese Person lässt sich nicht löschen — es hängt noch etwas daran:{" "}
                  {vorschau.blockiert.map(p => `${LESBAR[p.tabelle] ?? p.tabelle} (${p.anzahl})`).join(", ")}.</>} />
            )}

            <Label>Wird unwiderruflich entfernt</Label>
            <div style={{ marginBottom: SPACE[4] }}>
              {vorschau.faellt.length === 0
                ? <div className="cc-text-muted" style={{ fontSize: TEXT.sm }}>Nur die Person selbst.</div>
                : vorschau.faellt.map(p => <PostenZeile key={p.tabelle} p={p} />)}
              <div style={{
                display: "flex", justifyContent: "space-between",
                borderTop: `1px solid ${GB}`, marginTop: 6, paddingTop: 6,
                fontSize: TEXT.sm, fontWeight: 700,
              }}>
                <span>Zeilen insgesamt</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{gesamt}</span>
              </div>
            </div>

            {/* ⚠ EINE ZAHL IST KEINE FOLGE. „Verknüpfungen zu Kindern 1" sagt
                nicht, ob das Kind danach noch einen Elternteil hat — und beide
                Fälle sehen in der Zahl gleich aus. Gefragt am 23.08.2026 von
                Didi vor dem ersten scharfen Lauf; die Vorschau konnte es bis
                dahin nicht beantworten. */}
            {vorschau.kinder.length > 0 && (
              <>
                <Label>Was mit den Kindern geschieht</Label>
                <div style={{ marginBottom: SPACE[4] }}>
                  {vorschau.kinder.map(k => (
                    <div key={k.mitglied_id} style={{ padding: "3px 0", fontSize: TEXT.sm }}>
                      <strong>{k.name}</strong>{" "}
                      {k.verbleibende_eltern > 0
                        ? `behält ${k.verbleibende_eltern} ${k.verbleibende_eltern === 1 ? "Elternteil" : "Elternteile"}.`
                        : "bleibt danach OHNE Elternteil."}
                      {k.war_hauptkontakt && " ⚠ Dies war der Hauptkontakt."}
                    </div>
                  ))}
                </div>
                {vorschau.kinder.some(k => k.verbleibende_eltern === 0) && (
                  <InfoBox color={R} text={
                    <>⚠ Mindestens ein Kind bleibt ohne Elternteil. Das Löschen wird
                      dadurch nicht verhindert — aber niemand ist danach für dieses Kind
                      erreichbar.</>} />
                )}
                {vorschau.kinder.some(k => k.war_hauptkontakt) && (
                  <InfoBox color={AM} text={
                    <>⚠ Ein Hauptkontakt fällt weg. Bitte danach beim Kind einen neuen
                      setzen.</>} />
                )}
              </>
            )}

            {vorschau.anonym.length > 0 && (
              <>
                <Label>Bleibt, ohne Verweis auf die Person</Label>
                <div style={{ marginBottom: SPACE[4] }}>
                  {vorschau.anonym.map(p => <PostenZeile key={p.tabelle} p={p} />)}
                </div>
              </>
            )}

            {/* ⚠ Die geprüften Leerzeilen werden GENANNT, nicht weggelassen.
                Eine Aufstellung mit drei Zeilen sieht sonst aus wie eine, die
                nur drei Tabellen kennt. */}
            <div className="cc-text-muted" style={{ fontSize: TEXT.xs, marginBottom: SPACE[2] }}>
              {vorschau.geprueft_leer} weitere Tabellen geprüft, alle leer.
            </div>

            {/* ⚠ Der einzige Punkt, an dem die Vorschau etwas NICHT weiss —
                und deshalb steht er da, auch wenn die Tabellen leer sind. */}
            <InfoBox color={AM} text={
              <>⚠ <strong>Nicht prüfbar:</strong> {vorschau.nicht_pruefbar.join(", ")}. Diese
                Tabellen verweisen auf ein Mitglied über einen Typ, der keinen Abgleich
                erlaubt — sie werden weder gezählt noch aufgeräumt. Heute sind sie leer.</>} />

            {fehler && (
              <InfoBox color={R} text={
                <>{fehler}
                  {unterschiede.length > 0 && (
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {unterschiede.map(u => <li key={u}>{u}</li>)}
                    </ul>
                  )}
                </>} />
            )}

            {!blockiert && (
              <>
                <InfoBox color={BL} text={
                  <>Die Sperre gegen die falsche Person ist nicht diese Eingabe, sondern
                    der Abgleich beim Ausführen: es wird noch einmal gemessen, und weicht
                    etwas ab, geschieht nichts.</>} />
                <Label>Zum Bestätigen den Namen eingeben: <strong>{echterName}</strong></Label>
                <Input value={tippen} onChange={e => setTippen(e.target.value)}
                       placeholder={echterName} />
              </>
            )}

            <div className="cc-modal-ftr">
              <Btn onClick={onClose}>Abbrechen</Btn>
              <Btn variant="danger" disabled={!stimmt || blockiert || laeuft} onClick={ausfuehren}>
                {laeuft ? "Wird gelöscht …" : "Endgültig löschen"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </ModalOrSheet>
  );
}
