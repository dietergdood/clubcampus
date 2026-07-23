/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/VerlaufTab.jsx
   Änderungshistorie eines Mitglieds — wer hat was wann geändert
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Card, EmptyState } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { fetchAenderungen, FELD_LABEL } from "../../../domains/members/memberService.js";

const SENSITIV_FELDER = ["ahv_nr"];

const ROLLE_LABEL = {
  administrator: "Administrator", administration: "Verwaltung",
  funktionaer: "Funktionär", trainer: "Trainer/in",
  spieler: "Spieler/in", eltern: "Elternteil",
  mitglied: "Mitglied", supporter: "Supporter",
};

function formatWertAnzeige(feld, wert) {
  if (!wert) return null;
  if (SENSITIV_FELDER.includes(feld)) return "••• •• ••••";
  if (feld === "rolle") return ROLLE_LABEL[wert] || wert;
  if (feld === "geschlecht") return wert === "m" ? "Männlich" : wert === "w" ? "Weiblich" : wert;
  return wert;
}

function VerlaufTab({ raw, sb }) {
  const [aenderungen, setAenderungen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sb || !raw?.id) return;
    setLoading(true);
    fetchAenderungen(sb, raw.id).then(data => {
      setAenderungen(data);
      setLoading(false);
    });
  }, [raw?.id]);

  function formatDatum(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("de-CH", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatWert(feld, wert) {
    const anzeige = formatWertAnzeige(feld, wert);
    if (!anzeige) return <span className="cc-text-sub">—</span>;
    return anzeige;
  }

  return (
    <div className="cc-col cc-gap-12">
      <Card>
        <div className="cc-section-title">
          <TI n="history" size={14}/> Änderungshistorie
        </div>

        {loading ? (
          <EmptyState icon="loader" title="Wird geladen…"/>
        ) : aenderungen.length === 0 ? (
          <EmptyState icon="history" title="Noch keine Änderungen" subtitle="Alle Änderungen an diesem Mitglied werden hier protokolliert."/>
        ) : (
          <div className="cc-verlauf-list">
            {aenderungen.map((a, i) => (
              <div key={a.id} className={`cc-verlauf-item${i < aenderungen.length - 1 ? " cc-verlauf-item-border" : ""}`}>
                <div className="cc-verlauf-header">
                  <span className="cc-verlauf-feld">
                    {FELD_LABEL[a.feld] || a.feld}
                  </span>
                  <span className="cc-verlauf-meta">
                    {a.geaendert_von && <span className="cc-verlauf-user"><TI n="user" size={11}/> {a.geaendert_von}</span>}
                    <span className="cc-verlauf-datum">{formatDatum(a.geaendert_at)}</span>
                  </span>
                </div>
                <div className="cc-verlauf-werte">
                  <span className="cc-verlauf-alt">{formatWert(a.feld, a.alter_wert)}</span>
                  <TI n="arrow-right" size={12} style={{color:"var(--sub)"}}/>
                  <span className="cc-verlauf-neu">{formatWert(a.feld, a.neuer_wert)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export { VerlaufTab };
