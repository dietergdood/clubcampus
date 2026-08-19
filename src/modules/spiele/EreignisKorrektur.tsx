/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/spiele/EreignisKorrektur.tsx

   Ein Ereignis korrigieren oder eines nachtragen.

   ⚠ DIE KORREKTUR ÜBERSCHREIBT NICHTS. Gespeichert wird eine zweite
   Zeile mit `herkunft = 'verein'`, die über `ersetzt_ereignis_id` auf
   die SFV-Zeile zeigt und sie in der Anzeige verdeckt. Die SFV-Zeile
   bleibt und wird vom Sync weiter fortgeschrieben — sonst könnte
   niemand mehr feststellen, ob der Verband später von sich aus
   nachzieht (siehe migration_matchdaten.sql).

   ⚠ `geaenderte_felder` hält fest, was angefasst wurde. Nur diese
   Felder werden beim Nachzug-Vergleich geprüft: wer den Torschützen
   korrigiert, hat zur Minute nichts gesagt.

   ⚠ DIE AUSWAHL BESCHRÄNKT SICH AUF UNSERE SPIELER DIESES SPIELS.
   Nicht auf alle Mitglieder — sonst trägt jemand versehentlich einen
   ein, der gar nicht gespielt hat. Grundlage ist die Aufstellung, die
   der Verband zu diesem Spiel geliefert hat.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { Btn, ModalOrSheet, ModalTitle } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import {
  beschreibeWer, geaenderteFelder, unzugeordnetLabel,
  TYP_AUSSCHLUSS, TYP_TOR, TYP_VERWARNUNG,
} from "../../domains/spiele/matchdatenAnzeige.ts";
import type { AnzeigeEreignis } from "../../domains/spiele/matchdatenAnzeige.ts";
import { speichereKorrektur } from "../../domains/spiele/matchdatenService.ts";
import type { AufstellungMitZeit } from "../../domains/spiele/matchdatenService.ts";
import type { Sb } from "../../types.ts";

/* Die Typen, die ein Mensch von Hand setzt. Die Codes stammen aus
   docs/sfv/sfv_stammdaten.json (Ereignistyp) — Assist ist dort 9 und
   damit ein SFV-Typ wie jeder andere, auch wenn der Verband ihn in
   unseren Ligen nicht befüllt. */
const TYPEN = [
  { id: TYP_TOR, label: "Tor" },
  { id: 9, label: "Assist" },
  { id: TYP_VERWARNUNG, label: "Verwarnung" },
  { id: TYP_AUSSCHLUSS, label: "Ausschluss" },
  { id: 2, label: "Aus-/Einwechslung" },
];

interface Props {
  sb: Sb;
  vereinId: string;
  benutzerId: string;
  spielId: string;
  /** Null = Nachtrag (neues Ereignis), sonst die zu korrigierende Zeile. */
  ereignis: AnzeigeEreignis | null;
  /** Unsere Spieler dieses Spiels — die einzige zulässige Auswahl. */
  aufstellung: AufstellungMitZeit[];
  namen?: Map<number, string>;
  gegnerName?: string | null;
  onFertig: () => void;
  onAbbrechen: () => void;
}

export function EreignisKorrektur({
  sb, vereinId, benutzerId, spielId, ereignis, aufstellung, namen,
  gegnerName, onFertig, onAbbrechen,
}: Props) {
  /* Bei einer Korrektur ist die SFV-Zeile der Ausgangspunkt, nicht die
     bereits korrigierte — sonst verglichen wir gegen uns selbst. */
  const basis = ereignis?.original ?? ereignis;

  const [typId, setTypId] = useState<number>(basis?.typ_id ?? TYP_TOR);
  const [minute, setMinute] = useState<string>(basis?.minute != null ? String(basis.minute) : "");
  const [eigen, setEigen] = useState<boolean>(basis?.ist_eigener ?? true);
  const [personId, setPersonId] = useState<string>(
    basis?.sfv_person_id != null ? String(basis.sfv_person_id) : "");
  const [saving, setSaving] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  /* Eine Zeile je Person, nach Rückennummer sortiert — so, wie sie auf
     dem Platz standen. */
  const spielerOpts = useMemo(() => {
    const proPerson = new Map<number, AufstellungMitZeit>();
    for (const a of aufstellung) if (!proPerson.has(a.sfv_person_id)) proPerson.set(a.sfv_person_id, a);
    return [...proPerson.values()]
      .sort((a, b) => (a.rueckennr ?? 99) - (b.rueckennr ?? 99))
      .map(a => ({
        id: a.sfv_person_id,
        /* Dieselbe Regel wie im Spielbericht: ohne Zuordnung ein
           Platzhalter, keine rohe Id. Die Rueckennummer traegt die Zeile —
           wer beim Spiel war, erkennt daran genug, um zu waehlen. */
        label: namen?.get(a.sfv_person_id)
          ? `${a.rueckennr != null ? `Nr. ${a.rueckennr} · ` : ""}${namen.get(a.sfv_person_id)}`
          : unzugeordnetLabel(a.rueckennr),
      }));
  }, [aufstellung, namen]);

  const neuerStand = {
    typ_id: typId,
    minute: minute === "" ? null : Number(minute),
    ist_eigener: eigen,
    sfv_person_id: eigen && personId ? Number(personId) : null,
    rueckennr: eigen
      ? aufstellung.find(a => String(a.sfv_person_id) === personId)?.rueckennr ?? null
      : null,
    gegner_club_name: eigen ? null : (gegnerName ?? "Gegner"),
  };

  const felder = basis ? geaenderteFelder(basis as unknown as Record<string, unknown>, neuerStand) : [];
  const nichtsGeaendert = Boolean(basis) && felder.length === 0;

  async function speichern() {
    if (!vereinId || !benutzerId) return;
    if (eigen && !personId) { setFehler("Bitte einen Spieler wählen."); return; }
    setSaving(true); setFehler(null);
    const msg = await speichereKorrektur(sb, vereinId, {
      spielId,
      ersetztEreignisId: basis?.id ?? null,
      typId,
      typ: TYPEN.find(t => t.id === typId)?.label ?? null,
      minute: neuerStand.minute,
      istEigener: eigen,
      sfvPersonId: neuerStand.sfv_person_id,
      rueckennr: neuerStand.rueckennr,
      gegnerClubName: neuerStand.gegner_club_name,
      geaenderteFelder: felder,
    }, benutzerId);
    setSaving(false);
    if (msg) { setFehler(msg); return; }
    onFertig();
  }

  return (
    <ModalOrSheet open onClose={onAbbrechen} maxWidth={460}>
      <div style={{ padding: "20px 20px 0" }}>
        <ModalTitle>{basis ? "Ereignis korrigieren" : "Ereignis nachtragen"}</ModalTitle>
      </div>
      <div style={{ padding: "0 20px 20px" }} className="cc-col cc-gap-12">

        {basis && (
          <div className="cc-info-hint">
            <TI n="info-circle" size={13}/> Der SFV meldet:{" "}
            <strong>{basis.typ ?? "Ereignis"}, {basis.minute ?? "?"}' · {beschreibeWer(basis, namen)}</strong>.
            Seine Zeile bleibt stehen — deine verdeckt sie nur.
          </div>
        )}

        <div>
          <label className="cc-label">Was</label>
          <select className="cc-input" value={typId} onChange={e => setTypId(Number(e.target.value))}>
            {TYPEN.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="cc-label">Minute</label>
          <input className="cc-input" type="number" min={0} max={130}
            value={minute} onChange={e => setMinute(e.target.value)} placeholder="34"/>
        </div>

        <div>
          <label className="cc-label">Wer</label>
          <div className="cc-seg cc-mb-8">
            <button className={"cc-seg-item" + (eigen ? " cc-seg-active" : "")}
              onClick={() => setEigen(true)}>Unsere Mannschaft</button>
            <button className={"cc-seg-item" + (!eigen ? " cc-seg-active" : "")}
              onClick={() => setEigen(false)}>Gegner</button>
          </div>

          {eigen ? (
            <>
              <select className="cc-input" value={personId} onChange={e => setPersonId(e.target.value)}>
                <option value="">— Spieler wählen —</option>
                {spielerOpts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              {/* Die Beschraenkung ist der Punkt, nicht eine Nebenbemerkung. */}
              <div className="cc-inline-hint">
                Nur Spieler, die laut Verband in diesem Spiel aufgelaufen sind
                {spielerOpts.length ? ` (${spielerOpts.length})` : ""}.
              </div>
              {spielerOpts.length === 0 && (
                <div className="cc-text-sm cc-text-danger">
                  Zu diesem Spiel liegt keine Aufstellung vor — ein eigener Spieler
                  lässt sich deshalb nicht auswählen.
                </div>
              )}
            </>
          ) : (
            <div className="cc-inline-hint">
              Vom Gegner wird nur der Verein festgehalten{gegnerName ? `: ${gegnerName}` : ""}.
              Namen fremder Spieler speichert ClubCampus nicht.
            </div>
          )}
        </div>

        {nichtsGeaendert && (
          <div className="cc-info-hint">
            <TI n="info-circle" size={13}/> Nichts geändert — es gibt nichts zu speichern.
          </div>
        )}
        {fehler && <div className="cc-text-sm cc-text-danger">{fehler}</div>}

        <div className="cc-save-row">
          <Btn variant="primary" onClick={speichern}
            disabled={saving || nichtsGeaendert || (eigen && spielerOpts.length === 0)}>
            {saving ? "Speichert…" : basis ? "Korrektur speichern" : "Nachtragen"}
          </Btn>
          <Btn onClick={onAbbrechen}>Abbrechen</Btn>
        </div>

        {basis && felder.length > 0 && (
          <div className="cc-inline-hint">
            Festgehalten wird, dass du {felder.length === 1 ? "ein Feld" : `${felder.length} Felder`} geändert
            hast. Zieht der Verband später von sich aus nach, wirst du benachrichtigt —
            verglichen wird dann nur, was du angefasst hast.
          </div>
        )}
      </div>
    </ModalOrSheet>
  );
}

