/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/SfvSpielerZuordnung.tsx

   Warteschlange: welcher SFV-Spieler ist welches Mitglied?

   Der Verband liefert zu jedem Einsatz eine `personId` — und den Namen
   gleich mit, in drei Feldern (`firstname`, `name`, `secondName`).
   Gespeichert wird er nicht: `bildeAufstellung()` verwirft ihn, und im
   ganzen Schema gibt es keine Spalte, die ihn aufnehmen könnte.

   ⚠ Das ist eine ENTSCHEIDUNG, keine Grenze der Schnittstelle. Wer sie
   für eine Grenze hält, sucht die Lösung an der falschen Stelle.

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
import { TI } from "../../icons.tsx";
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
            liefert er mit — <strong>wir speichern ihn nicht</strong>. Einmal zugeordnet,
            erkennt der Sync die Person in jedem weiteren Spiel selbst.
            <div className="cc-mt-8">
              Erkennbar an Mannschaft, Rückennummer und Zahl der Einsätze. Automatisch
              über den Namen ginge nicht: der Verein hat zwei Adrian Schmid.
            </div>
          </div>
        }/>

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
                    Nr. {o.rueckennummern.length ? o.rueckennummern.join(", ") : "—"}
                    <span className="cc-text-sub"> · {o.einsaetze} Einsatz{o.einsaetze === 1 ? "" : "e"}</span>
                  </div>
                  <div className="cc-inline-hint">SFV-personId {o.sfv_person_id}</div>
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
