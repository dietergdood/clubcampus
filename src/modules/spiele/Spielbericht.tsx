/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/spiele/Spielbericht.tsx

   Aufstellung und Spielverlauf eines Spiels.

   ⚠ DER STAND KOMMT AUS `spiele.resultat`, NIE AUS DEN EREIGNISSEN.
   Der Trockenlauf vom 19.08.2026 hat gezeigt, warum: bei vier von zehn
   Spielen liefert der Verband gar keine Ereignisse — auch nicht bei
   sieben oder acht Toren. Aus den Ereignissen gerechnet stünde dort
   0:0.

   Und ein leerer Verlauf bei einem 3:2 sieht aus wie ein Fehler in
   ClubCampus. Dabei liegt es am Verband, und wer das nicht weiss,
   sucht an der falschen Stelle. Deshalb wird es gesagt.

   Vom Gegner steht hier nur der Verein. Nicht aus Nachlässigkeit:
   Namen, Geburtsdaten und Passnummern fremder Spieler werden gar nicht
   erst gespeichert (siehe migration_matchdaten.sql).
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { Btn, Card, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import {
  beschreibeEreignis, beschreibeWer, hatVerlauf, mischeEreignisse, OHNE_VERLAUF_TEXT,
  unzugeordnetLabel,
  TYP_AUSSCHLUSS, TYP_TOR, TYP_VERWARNUNG,
} from "../../domains/spiele/matchdatenAnzeige.ts";
import type { AnzeigeEreignis } from "../../domains/spiele/matchdatenAnzeige.ts";
import { fetchSpielMatchdaten, verwerfeKorrektur } from "../../domains/spiele/matchdatenService.ts";
import { EreignisKorrektur } from "./EreignisKorrektur.tsx";
import type { AufstellungMitZeit } from "../../domains/spiele/matchdatenService.ts";
import type { EreignisZeile } from "../../domains/spiele/matchdatenAnzeige.ts";
import type { Sb } from "../../types.ts";

interface Props {
  sb: Sb;
  spielId: string;
  /** Aus `spiele.resultat` — die einzige verlässliche Quelle für den Stand. */
  resultat?: string | null;
  htResultat?: string | null;
  /** sfv_person_id → Anzeigename, aus sfv_zuordnung + mitglieder. */
  namen?: Map<number, string>;
  /** Korrigieren dürfen Trainer, Admin und Funktionäre mit mindestens
      Trainer-Rechten — dieselbe Bedingung wie in der RLS-Policy
      spiel_ereignisse_write. */
  canEdit?: boolean;
  vereinId?: string | null;
  benutzerId?: string | null;
  gegnerName?: string | null;
}

/* Die Icon-Namen sind gegen src/icons.tsx geprueft — `square` und
   `square-x` gibt es dort nicht, obwohl sie fuer Karten naheliegen. Statt
   eine neue Icon-Datei anzulegen die vorhandenen nehmen: flag fuer die
   Verwarnung, alert-triangle fuer den Ausschluss. */
const EREIGNIS_ICON: Record<number, string> = {
  [TYP_TOR]: "ball-football",
  [TYP_VERWARNUNG]: "flag",
  [TYP_AUSSCHLUSS]: "alert-triangle",
  2: "refresh",       // Aus-/Einwechslung
  9: "arrow-right",   // Assist
};

export function Spielbericht({
  sb, spielId, resultat, htResultat, namen,
  canEdit = false, vereinId = null, benutzerId = null, gegnerName = null,
}: Props) {
  const [confirm, confirmDialog] = useConfirm();
  const [maske, setMaske] = useState<{ ereignis: AnzeigeEreignis | null } | null>(null);
  const [aufstellung, setAufstellung] = useState<AufstellungMitZeit[]>([]);
  const [roh, setRoh] = useState<EreignisZeile[]>([]);
  const [laedt, setLaedt] = useState(true);

  async function laden() {
    setLaedt(true);
    const d = await fetchSpielMatchdaten(sb, spielId);
    setAufstellung(d.aufstellung); setRoh(d.ereignisse); setLaedt(false);
  }
  useEffect(() => { laden(); }, [spielId]);

  /* ⚠ Der Dialog sagt, WAS DANACH GILT. "Korrektur verwerfen?" allein
     liesse offen, wohin man zurueckfaellt — und der SFV-Wert ist genau
     das, was der Verein einmal fuer falsch gehalten hat. */
  async function verwerfen(e: AnzeigeEreignis) {
    const zurueck = e.original
      ? `Es gilt wieder der SFV-Wert: ${beschreibeEreignis(e.original, namen)}`
      : "Der Eintrag verschwindet aus dem Spielbericht. Der SFV hat dazu nichts geliefert.";
    const ok = await confirm({
      title: "Korrektur verwerfen?",
      message: `${zurueck}

Die Korrektur bleibt im Verlauf nachvollziehbar, wirkt aber nicht mehr.`,
      confirmLabel: "Verwerfen",
      danger: true,
    });
    if (!ok) return;
    await verwerfeKorrektur(sb, e.id);
    await laden();
  }

  const ereignisse = useMemo(() => mischeEreignisse(roh), [roh]);
  const verlaufDa = useMemo(() => hatVerlauf(roh), [roh]);

  if (laedt) return <Card><div className="cc-text-sm cc-text-sub">Lädt…</div></Card>;

  return (
    <div className="cc-col cc-gap-12">
      {confirmDialog}
      {maske && vereinId && benutzerId && (
        <EreignisKorrektur
          sb={sb} vereinId={vereinId} benutzerId={benutzerId} spielId={spielId}
          ereignis={maske.ereignis} aufstellung={aufstellung}
          namen={namen} gegnerName={gegnerName}
          onFertig={() => { setMaske(null); laden(); }}
          onAbbrechen={() => setMaske(null)}
        />
      )}
      <Card>
        <div className="cc-section-title-row">
          <div className="cc-section-title"><TI n="ball-football" size={14}/> Spielverlauf</div>
          {canEdit && (
            <Btn onClick={() => setMaske({ ereignis: null })}>
              <TI n="plus" size={13}/> Nachtragen
            </Btn>
          )}
        </div>

        {/* Der Stand steht ueber dem Verlauf, damit klar ist, dass er nicht
            aus ihm stammt. */}
        <div className="cc-list-item-row cc-between">
          <span className="cc-text-sub">Resultat</span>
          <span className="cc-text-bold">
            {resultat || "—"}
            {htResultat && <span className="cc-text-sub"> (HZ {htResultat})</span>}
          </span>
        </div>

        {!verlaufDa ? (
          <div className="cc-info-hint cc-mt-8">
            <TI n="info-circle" size={13}/> {OHNE_VERLAUF_TEXT}
          </div>
        ) : ereignisse.map(e => (
          <div key={e.id} className="cc-list-item-row cc-between">
            <div className="cc-row cc-gap-6">
              <span className="cc-text-sub" style={{ minWidth: 34, textAlign: "right" }}>
                {e.minute ?? "?"}{e.zusatzminute ? `+${e.zusatzminute}` : ""}'
              </span>
              <TI n={EREIGNIS_ICON[e.typ_id] ?? "circle"} size={13}/>
              <span>{e.typ ?? "Ereignis"}</span>
              {e.subtyp && e.subtyp !== "-" && <span className="cc-text-sub">· {e.subtyp}</span>}
            </div>
            <div className="cc-row cc-gap-6">
              <span className={e.ist_eigener ? undefined : "cc-text-sub"}>{beschreibeWer(e, namen)}</span>
              {/* Was der Verein geaendert hat, wird als solches gezeigt —
                  sonst sieht es aus, als haette der Verband es so erfasst. */}
              {e.vomVerein && (
                <span className="cc-badge cc-badge-warning" title={
                  e.original ? "Vom Verein korrigiert — der SFV meldet etwas anderes"
                             : "Vom Verein nachgetragen"}>
                  {e.original ? "korrigiert" : "nachgetragen"}
                </span>
              )}
              {canEdit && (
                <button className="cc-icon-btn" title="Korrigieren"
                  onClick={() => setMaske({ ereignis: e })}>
                  <TI n="pencil" size={13}/>
                </button>
              )}
              {canEdit && e.vomVerein && (
                <button className="cc-icon-btn-danger" title="Korrektur verwerfen"
                  onClick={() => verwerfen(e)}>
                  <TI n="x" size={13}/>
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div className="cc-section-title"><TI n="users" size={14}/> Aufstellung</div>
        <div className="cc-inline-hint">
          Nur unsere Mannschaft. Vom Gegner speichert ClubCampus keine Spielerdaten.
        </div>
        {aufstellung.length === 0
          ? <div className="cc-text-sm cc-text-sub cc-mt-8">Keine Aufstellung erfasst.</div>
          : aufstellung.map(a => (
            <div key={a.sfv_person_id} className="cc-list-item-row cc-between">
              <div className="cc-row cc-gap-6">
                <span className="cc-text-sub" style={{ minWidth: 28, textAlign: "right" }}>
                  {a.rueckennr ?? "—"}
                </span>
                {/* Ohne Zuordnung ein Platzhalter, der sagt was fehlt — nicht
                    die rohe personId. Die steht klein daneben, fuer den Fall,
                    dass jemand sie beim Zuordnen braucht. */}
                {namen?.get(a.sfv_person_id)
                  ? <span>{namen.get(a.sfv_person_id)}</span>
                  : <span className="cc-text-sub">
                      {unzugeordnetLabel(a.rueckennr)}
                      <span className="cc-inline-hint"> personId {a.sfv_person_id}</span>
                    </span>}
              </div>
              <span className="cc-text-sm cc-text-sub">
                {a.position_name ?? "—"}
                {a.spielzeit != null && ` · ${a.spielzeit}'`}
              </span>
            </div>
          ))}
      </Card>
    </div>
  );
}
