/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/PersonenartenSektion.tsx

   Die pflegbare Liste der Arten ohne Mitgliedschaft — und die
   Einstellung, wozu eine Person beim Austritt wird.

   ⚠ NACHZUG AUS ETAPPE 1. Dort entstanden Tabelle, Sicht, Seed und
   alle Leser; „gepflegt in der Portalverwaltung" stand im Auftrag
   und wurde nicht gebaut. Aufgefallen ist es erst in Etappe 2:
   die Einstellung „Beim Austritt wird die Person zu → …" hätte
   genau zwei Zeilen zur Auswahl gehabt, und „Ehemalige" — das
   naheliegendste Austrittsziel überhaupt — liesse sich nicht
   anlegen.

   ⚠ ZWEI SORTEN, UND DER UNTERSCHIED IST DER KERN:

     gesetzt      die Verwaltung vergibt sie (Supporter, Ehemalige)
     abgeleitet   sie ergibt sich aus Daten (Elternteil aus
                  `eltern_kinder`) und KIPPT: tritt das letzte Kind
                  aus, ist die Person keiner mehr

   Deshalb ist die Sorte beim Anlegen nicht wählbar — eine neue Art
   ist immer gesetzt. Eine Ableitung ist eine Regel im Code, kein
   Häkchen im Formular. Wäre sie wählbar, könnte jemand „Elternteil"
   von Hand vergeben, und die Ableitung überschriebe es im nächsten
   Moment still — derselbe Fehler wie bei den von Hand gesetzten
   Rollen, der seit dem 05.08.2026 als offener Punkt steht.

   ⚠ GELÖSCHT WIRD NICHT, ABGESCHALTET SCHON. An einer Art hängen
   `mitgliedtyp_feldkonfig` und `personenart_pro_person` mit
   `ON DELETE CASCADE` — ein Löschen nähme die ganze Feldkonfiguration
   dieser Art mit, ohne Rückfrage und ohne Spur.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { Btn, Card, ModalOrSheet, ModalTitle, InfoBox } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { BTN_COLOR as BTN, BTN_TXT, FONT, BL, AM } from "../../constants.ts";
import {
  fetchPersonenarten, insertPersonart, updatePersonart,
  fetchAustrittsziel, setzeAustrittsziel,
} from "../../domains/person/personArtService.ts";
import type { PersonArt } from "../../domains/person/personArtService.ts";
import type { Sb } from "../../types.ts";

interface Props {
  supabase: Sb;
  vereinId: string | null;
  /** Damit der Tab seine Spaltenliste neu laden kann, wenn sich hier etwas
      ändert — die Feldkonfiguration hat eine Spalte je Art. */
  onArtenGeaendert?: () => void;
}

interface Formular {
  name: string;
  sort_order: string;
  standard_rolle: string;
}

const LEER: Formular = { name: "", sort_order: "", standard_rolle: "" };

/** Eine Portalrolle, wie `portal_rollen` sie führt. */
interface RolleOpt { name: string; label: string }

/* ⚠ Modul-Ebene, nicht in der Komponente. Eine Komponente, die INNERHALB
   einer anderen deklariert wird, wird bei jedem Render neu erzeugt — React
   hängt den Teilbaum ab und neu an, und Fokus wie Auswahlposition gehen
   verloren. Am 21.08.2026 hat genau das in `PortalTab` das Rollen-Auswahlfeld
   nach jedem Tastendruck den Fokus verlieren lassen. */
function SortenChip({ art }: { art: PersonArt }) {
  const abgeleitet = art.ableitung !== null;
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
      background: abgeleitet ? "#EFF6FF" : "var(--surface2)",
      color: abgeleitet ? "#1d4ed8" : "var(--sub)",
    }}>
      {abgeleitet ? `abgeleitet · ${art.ableitung}` : "gesetzt"}
    </span>
  );
}

export function PersonenartenSektion({ supabase, vereinId, onArtenGeaendert }: Props) {
  const [arten, setArten] = useState<PersonArt[]>([]);
  const [rollen, setRollen] = useState<RolleOpt[]>([]);
  const [ziel, setZiel] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const [offen, setOffen] = useState(false);
  const [bearbeitet, setBearbeitet] = useState<PersonArt | null>(null);
  const [form, setForm] = useState<Formular>(LEER);
  const [speichert, setSpeichert] = useState(false);

  async function laden() {
    if (!supabase || !vereinId) { setLaedt(false); return; }
    setLaedt(true);
    /* Auch die inaktiven: sonst liesse sich keine wieder einschalten. */
    const [a, z] = await Promise.all([
      fetchPersonenarten(supabase, false),
      fetchAustrittsziel(supabase, vereinId),
    ]);
    /* ⚠ Die Rollen aus der DATENBANK, nicht aus einer Konstante.
       `STANDARD_ROLLE_OPTS` im Nachbartab ist eine feste Liste — dieselbe
       Bauart wie `rolleLabelMap`, die am 20.08.2026 die Beschriftungen aus
       `portal_rollen` überschrieben hat. Hier kommt dazu, dass ein
       Fremdschlüssel jeden Wert ablehnt, den `portal_rollen` nicht führt:
       eine erfundene Auswahl liefe direkt in einen Speicherfehler. */
    const { data: rollenRoh, error: rFehler } = await supabase
      .from("portal_rollen").select("name, label").eq("aktiv", true).order("prioritaet");
    if (rFehler) console.error("portal_rollen error:", rFehler);
    setRollen((rollenRoh || []).map(r => ({
      name: (r.name as string) || "", label: (r.label as string) || (r.name as string) || "",
    })));
    setArten(a); setZiel(z); setLaedt(false);
  }
  useEffect(() => { laden(); }, [supabase, vereinId]);

  function oeffneNeu() {
    setBearbeitet(null);
    /* Ans Ende einsortieren — die kleinste sort_order gewinnt bei der
       Feldkonfiguration, und eine neue Art soll keiner bestehenden den Rang
       ablaufen, ohne dass jemand es entschieden hat. */
    const max = Math.max(0, ...arten.map(a => a.sort_order || 0));
    setForm({ ...LEER, sort_order: String(max + 10) });
    setOffen(true);
  }

  function oeffneBearbeiten(a: PersonArt) {
    setBearbeitet(a);
    setForm({
      name: a.name,
      sort_order: String(a.sort_order ?? 0),
      standard_rolle: a.standard_rolle || "",
    });
    setOffen(true);
  }

  async function speichern() {
    if (!supabase || !vereinId || !form.name.trim()) return;
    setSpeichert(true); setFehler(null);
    const felder = {
      name: form.name.trim(),
      sort_order: Number(form.sort_order) || 0,
      standard_rolle: form.standard_rolle || null,
    };
    const msg = bearbeitet
      ? await updatePersonart(supabase, bearbeitet.art_id, felder)
      : (await insertPersonart(supabase, felder, vereinId)).fehler;
    setSpeichert(false);
    if (msg) { setFehler(msg); return; }
    setOffen(false); setBearbeitet(null); setForm(LEER);
    await laden();
    if (onArtenGeaendert) onArtenGeaendert();
  }

  async function umschalten(a: PersonArt) {
    if (!supabase) return;
    setFehler(null);
    const msg = await updatePersonart(supabase, a.art_id, { aktiv: !a.aktiv });
    if (msg) { setFehler(msg); return; }
    await laden();
    if (onArtenGeaendert) onArtenGeaendert();
  }

  async function zielSetzen(artId: string) {
    if (!supabase || !vereinId) return;
    setFehler(null);
    const msg = await setzeAustrittsziel(supabase, vereinId, artId || null);
    if (msg) { setFehler(msg); return; }
    setZiel(artId || null);
  }

  /* ⚠ NUR GESETZTE UND AKTIVE stehen als Austrittsziel zur Wahl. Eine
     abgeleitete Art zu wählen wäre eine Zusage, die die Ableitung im
     nächsten Moment überschreibt — „Elternteil beim Austritt" hielte genau
     so lange, bis das letzte Kind austritt. Die Datenbank prüft das NICHT
     (ein CHECK darf nicht in eine andere Tabelle sehen); die Auswahl hier
     ist die Prüfung. Begründung im Kopf von migration_austritt.sql. */
  const zielOptionen = arten.filter(a => a.ableitung === null && a.aktiv);

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="cc-section-title"><TI n="users" size={14} /> Arten ohne Mitgliedschaft</div>
        <button onClick={oeffneNeu}
          style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: BTN, color: BTN_TXT, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          + Neu
        </button>
      </div>

      <InfoBox color={BL} text={
        <div>
          Wer keine Mitgliedschaft hat, ist trotzdem etwas: Elternteil, Supporter,
          Ehemaliger. Die Art bestimmt den <strong>Feldsatz</strong> im Profil und den
          Chip im Kopf.
          <div className="cc-mt-8">
            <strong>Gesetzt</strong> vergibt die Verwaltung. <strong>Abgeleitet</strong> ergibt
            sich aus den Daten und kippt von selbst — tritt das letzte Kind aus, ist die
            Person kein Elternteil mehr. Neue Arten sind immer gesetzt.
          </div>
        </div>
      } />

      {fehler && <div className="cc-text-sm cc-text-danger cc-mt-8">{fehler}</div>}

      {laedt ? (
        <div className="cc-text-sm cc-mt-8 cc-text-sub">Lädt…</div>
      ) : arten.length === 0 ? (
        /* Keine Komponente, die bei fehlenden Daten null zurückgibt: eine
           Sektion, die still verschwindet, ist von einer nicht gerenderten
           nicht zu unterscheiden. */
        <div className="cc-text-sm cc-mt-8 cc-text-sub">
          Noch keine Art angelegt. Über „+ Neu" entsteht die erste — üblich sind
          Supporter und Ehemalige.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead><tr>
            <th className="cc-th" style={{ textAlign: "left" }}>Name</th>
            <th className="cc-th" style={{ textAlign: "left" }}>Sorte</th>
            <th className="cc-th" style={{ textAlign: "left" }}>Portal-Rolle</th>
            <th className="cc-th cc-th-center">Rang</th>
            <th className="cc-th cc-th-center">Aktiv</th>
            <th className="cc-th"></th>
          </tr></thead>
          <tbody>
            {arten.map(a => (
              <tr key={a.art_id} className="cc-tr">
                <td className="cc-td" style={{ fontWeight: 500 }}>{a.name}</td>
                <td className="cc-td"><SortenChip art={a} /></td>
                <td className="cc-td">
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--surface2)", color: "var(--sub)" }}>
                    {rollen.find(r => r.name === a.standard_rolle)?.label || a.standard_rolle || "—"}
                  </span>
                </td>
                <td className="cc-td" style={{ textAlign: "center", fontSize: 12, color: "var(--sub)" }}>{a.sort_order}</td>
                <td className="cc-td" style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: a.aktiv ? "#ECFDF5" : "var(--surface2)", color: a.aktiv ? "#15803d" : "var(--sub)", fontWeight: 500 }}>
                    {a.aktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="cc-td" style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button onClick={() => oeffneBearbeiten(a)} className="cc-icon-btn" style={{ width: 26, height: 26, borderRadius: 6 }} title="Bearbeiten">
                      <TI n="edit" size={12} />
                    </button>
                    {/* ⚠ Abschalten statt löschen: an einer Art hängen
                        Feldkonfiguration und Zuweisungen mit ON DELETE
                        CASCADE. Ein Löschen nähme sie mit — ohne Rückfrage
                        und ohne Spur. */}
                    <button onClick={() => umschalten(a)} className="cc-icon-btn" style={{ width: 26, height: 26, borderRadius: 6 }}
                      title={a.aktiv ? "Abschalten" : "Wieder einschalten"}>
                      <TI n={a.aktiv ? "eye-off" : "eye"} size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Das Austrittsziel ── */}
      <div className="cc-section-title" style={{ marginTop: 20 }}>
        <TI n="logout" size={14} /> Beim Austritt
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14 }}>Wer austritt, wird zu</span>
        <select className="cc-input" style={{ width: "auto", minWidth: 200 }}
          value={ziel || ""} onChange={e => zielSetzen(e.target.value)}>
          <option value="">– nichts, nur Archiv –</option>
          {zielOptionen.map(a => <option key={a.art_id} value={a.art_id}>{a.name}</option>)}
        </select>
      </div>
      <div className="cc-inline-hint">
        Gilt für die Antwort „Mitgliedschaft beendet, Kontakt bleibt" im Austrittsdialog.
        Abgeleitete Arten stehen nicht zur Wahl: sie ergeben sich aus den Daten und
        liessen sich nicht zusagen.
      </div>

      {/* ── Anlegen und bearbeiten ── */}
      <ModalOrSheet open={offen} onClose={() => { setOffen(false); setBearbeitet(null); }} maxWidth={420}>
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <ModalTitle>{bearbeitet ? "Art bearbeiten" : "Neue Art"}</ModalTitle>
            <button onClick={() => { setOffen(false); setBearbeitet(null); }}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--sub)", lineHeight: 1 }}>×</button>
          </div>
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {bearbeitet?.ableitung && (
            <InfoBox color={AM} text={
              `Diese Art wird abgeleitet (${bearbeitet.ableitung}) und von selbst vergeben. `
              + "Name, Rang und Portal-Rolle lassen sich ändern, die Zuordnung nicht — "
              + "sie ergibt sich aus den Daten."} />
          )}
          <div>
            <label className="cc-label">Name *</label>
            <input className="cc-input" value={form.name} autoFocus
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="z.B. Ehemalige" />
          </div>
          <div>
            <label className="cc-label">Rang</label>
            <input className="cc-input" type="number" value={form.sort_order}
              onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
            <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>
              Hat jemand mehrere Arten, bestimmt die mit der <strong>kleinsten</strong> Zahl
              den Feldsatz — nicht die Summe aller.
            </div>
          </div>
          <div>
            <label className="cc-label">Portal-Rolle</label>
            <select className="cc-input" value={form.standard_rolle}
              onChange={e => setForm(p => ({ ...p, standard_rolle: e.target.value }))}>
              <option value="">– keine –</option>
              {rollen.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
            </select>
            <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>
              Wird beim Austritt gesetzt, wenn diese Art das Ziel ist. Ohne Angabe bleibt
              die bisherige Rolle stehen.
            </div>
          </div>
          {fehler && <div className="cc-text-sm cc-text-danger">{fehler}</div>}
          <div style={{ display: "flex", gap: 10, paddingTop: 4, borderTop: "0.5px solid var(--border)" }}>
            <button onClick={speichern} disabled={speichert || !form.name.trim()}
              style={{ flex: 1, padding: 10, borderRadius: 10, background: BTN, color: BTN_TXT, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: speichert || !form.name.trim() ? 0.6 : 1 }}>
              {speichert ? "Wird gespeichert …" : bearbeitet ? "Speichern" : "Erstellen"}
            </button>
            <Btn onClick={() => { setOffen(false); setBearbeitet(null); }}>Abbrechen</Btn>
          </div>
        </div>
      </ModalOrSheet>
    </Card>
  );
}
