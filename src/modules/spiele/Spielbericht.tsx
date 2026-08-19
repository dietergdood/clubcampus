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
import { Card } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import {
  hatVerlauf, mischeEreignisse, OHNE_VERLAUF_TEXT,
  TYP_AUSSCHLUSS, TYP_TOR, TYP_VERWARNUNG,
} from "../../domains/spiele/matchdatenAnzeige.ts";
import { fetchSpielMatchdaten } from "../../domains/spiele/matchdatenService.ts";
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
}

/* Die Icon-Namen sind gegen src/icons.tsx geprueft — `square` und
   `square-x` gibt es dort nicht, obwohl sie fuer Karten naheliegen. Statt
   eine neue Icon-Datei anzulegen die vorhandenen nehmen: flag fuer die
   Verwarnung, alert-triangle fuer den Ausschluss. */
const ICON: Record<number, string> = {
  [TYP_TOR]: "ball-football",
  [TYP_VERWARNUNG]: "flag",
  [TYP_AUSSCHLUSS]: "alert-triangle",
  2: "refresh",       // Aus-/Einwechslung
  9: "arrow-right",   // Assist
};

export function Spielbericht({ sb, spielId, resultat, htResultat, namen }: Props) {
  const [aufstellung, setAufstellung] = useState<AufstellungMitZeit[]>([]);
  const [roh, setRoh] = useState<EreignisZeile[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    let abgebrochen = false;
    setLaedt(true);
    fetchSpielMatchdaten(sb, spielId).then(d => {
      if (abgebrochen) return;
      setAufstellung(d.aufstellung); setRoh(d.ereignisse); setLaedt(false);
    });
    return () => { abgebrochen = true; };
  }, [spielId]);

  const ereignisse = useMemo(() => mischeEreignisse(roh), [roh]);
  const verlaufDa = useMemo(() => hatVerlauf(roh), [roh]);

  /* Wer hinter einer personId steckt, weiss nur die Zuordnung. Ohne sie
     bleibt die Rückennummer — der Bericht bleibt lesbar, nur unpersönlich. */
  const wer = (e: { ist_eigener: boolean; sfv_person_id: number | null; rueckennr: number | null; gegner_club_name: string | null }) => {
    if (!e.ist_eigener) return e.gegner_club_name ?? "Gegner";
    const name = e.sfv_person_id != null ? namen?.get(e.sfv_person_id) : null;
    if (name) return name;
    return e.rueckennr != null ? `Nr. ${e.rueckennr}` : "Unser Team";
  };

  if (laedt) return <Card><div className="cc-text-sm cc-text-sub">Lädt…</div></Card>;

  return (
    <div className="cc-col cc-gap-12">
      <Card>
        <div className="cc-section-title"><TI n="ball-football" size={14}/> Spielverlauf</div>

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
              <TI n={ICON[e.typ_id] ?? "circle"} size={13}/>
              <span>{e.typ ?? "Ereignis"}</span>
              {e.subtyp && e.subtyp !== "-" && <span className="cc-text-sub">· {e.subtyp}</span>}
            </div>
            <div className="cc-row cc-gap-6">
              <span className={e.ist_eigener ? undefined : "cc-text-sub"}>{wer(e)}</span>
              {/* Was der Verein geaendert hat, wird als solches gezeigt —
                  sonst sieht es aus, als haette der Verband es so erfasst. */}
              {e.vomVerein && (
                <span className="cc-badge cc-badge-warning" title={
                  e.original ? "Vom Verein korrigiert — der SFV meldet etwas anderes"
                             : "Vom Verein nachgetragen"}>
                  {e.original ? "korrigiert" : "nachgetragen"}
                </span>
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
                <span>{namen?.get(a.sfv_person_id) ?? `personId ${a.sfv_person_id}`}</span>
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
