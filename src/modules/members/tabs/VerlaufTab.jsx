/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/VerlaufTab.jsx
   Änderungshistorie + Aktivitäten — kombiniert, chronologisch,
   mit Datum-Trennern.

   Zwei Quellen:
   - mitglieder_aenderungen: echte Wert-zu-Wert-Änderungen
   - mitglieder_aktivitaeten: strukturierte Ereignisse

   Darstellung:
   - Änderungen: Feld · alt → neu
   - Aktivitäten: Icon + Beschreibung (z.B. "Team zugewiesen")
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Card, EmptyState } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { fetchAenderungen, fetchAktivitaeten, FELD_LABEL, AKTIVITAET_TYP } from "../../../domains/members/memberService.js";

const SENSITIV_FELDER = ["ahv_nr"];

const ROLLE_LABEL = {
  administrator: "Administrator", administration: "Verwaltung",
  funktionaer: "Funktionär", trainer: "Trainer/in",
  spieler: "Spieler/in", eltern: "Elternteil",
  mitglied: "Mitglied", supporter: "Supporter",
};

function formatWert(feld, wert) {
  if (!wert) return null;
  if (SENSITIV_FELDER.includes(feld)) return "••• •• ••••";
  if (feld === "rolle") return ROLLE_LABEL[wert] || wert;
  if (feld === "geschlecht") return wert === "m" ? "Männlich" : wert === "w" ? "Weiblich" : wert;
  return wert;
}

function aktivitaetIcon(typ) {
  switch(typ) {
    case AKTIVITAET_TYP.ANGELEGT:            return "user-plus";
    case AKTIVITAET_TYP.FELD_ERFASST:        return "plus";
    case AKTIVITAET_TYP.FELD_GELEERT:        return "minus";
    case AKTIVITAET_TYP.TEAM_HINZUGEFUEGT:   return "users-plus";
    case AKTIVITAET_TYP.TEAM_ENTFERNT:       return "users-minus";
    case AKTIVITAET_TYP.KADERROLLE_GEAENDERT:return "refresh";
    case AKTIVITAET_TYP.FUNKTION_GEAENDERT:  return "briefcase";
    case AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT: return "heart-plus";
    case AKTIVITAET_TYP.ELTERN_ENTFERNT:     return "heart-minus";
    case AKTIVITAET_TYP.ELTERN_GEAENDERT:    return "edit";
    default:                                  return "activity";
  }
}

function datumLabel(ts) {
  const d = new Date(ts);
  const heute = new Date();
  const gestern = new Date(); gestern.setDate(gestern.getDate()-1);
  if (d.toDateString() === heute.toDateString()) return "Heute";
  if (d.toDateString() === gestern.toDateString()) return "Gestern";
  return d.toLocaleDateString("de-CH", { day:"2-digit", month:"2-digit", year:"numeric" });
}

function uhrzeit(ts) {
  return new Date(ts).toLocaleTimeString("de-CH", { hour:"2-digit", minute:"2-digit" });
}

function VerlaufTab({ raw, sb }) {
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sb || !raw?.id) return;
    setLoading(true);
    Promise.all([
      fetchAenderungen(sb, raw.id),
      fetchAktivitaeten(sb, raw.id),
    ]).then(([aenderungen, aktivitaeten]) => {
      // Kombinieren und chronologisch sortieren (neueste zuerst)
      const alle = [
        ...aenderungen.map(a => ({ ...a, _typ: "aenderung" })),
        ...aktivitaeten.map(a => ({ ...a, _typ: "aktivitaet" })),
      ].sort((a, b) => new Date(b.geaendert_at) - new Date(a.geaendert_at));
      setEintraege(alle);
      setLoading(false);
    });
  }, [raw?.id]);

  // Nach Datum gruppieren
  const nachDatum = eintraege.reduce((acc, e) => {
    const label = datumLabel(e.geaendert_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(e);
    return acc;
  }, {});

  return (
    <div className="cc-col cc-gap-12">
      <Card>
        <div className="cc-section-title">
          <TI n="history" size={14}/> Änderungshistorie
        </div>

        {loading ? (
          <EmptyState icon="loader" title="Wird geladen…"/>
        ) : eintraege.length === 0 ? (
          <EmptyState icon="history" title="Noch keine Einträge" subtitle="Änderungen und Aktivitäten werden hier protokolliert."/>
        ) : (
          <div className="cc-verlauf-list">
            {Object.entries(nachDatum).map(([datum, items]) => (
              <div key={datum}>
                {/* Datum-Trenner */}
                <div className="cc-verlauf-date-sep">
                  <div className="cc-verlauf-date-line"/>
                  <div className="cc-verlauf-date-label">{datum}</div>
                  <div className="cc-verlauf-date-line"/>
                </div>

                {items.map((e, i) => (
                  <div key={e.id} className={`cc-verlauf-item${i < items.length-1 ? " cc-verlauf-item-border" : ""}`}>
                    {e._typ === "aenderung" ? (
                      /* Änderung: alt → neu */
                      <>
                        <div className="cc-verlauf-header">
                          <span className="cc-verlauf-feld">{FELD_LABEL[e.feld] || e.feld}</span>
                          <span className="cc-verlauf-meta">
                            {e.geaendert_von && <span className="cc-verlauf-user"><TI n="user" size={11}/> {e.geaendert_von}</span>}
                            <span className="cc-verlauf-datum">{uhrzeit(e.geaendert_at)}</span>
                          </span>
                        </div>
                        <div className="cc-verlauf-werte">
                          <span className="cc-verlauf-alt">{SENSITIV_FELDER.includes(e.feld) ? "••• •• ••••" : (formatWert(e.feld, e.alter_wert) || "—")}</span>
                          <TI n="arrow-right" size={12} style={{color:"var(--sub)"}}/>
                          <span className="cc-verlauf-neu">{SENSITIV_FELDER.includes(e.feld) ? "••• •• ••••" : (formatWert(e.feld, e.neuer_wert) || "—")}</span>
                        </div>
                      </>
                    ) : (
                      /* Aktivität: Icon + Beschreibung */
                      <div className="cc-verlauf-header">
                        <span className="cc-verlauf-aktivitaet">
                          <span className="cc-verlauf-aktivitaet-icon"><TI n={aktivitaetIcon(e.typ)} size={12}/></span>
                          {e.beschreibung}
                        </span>
                        <span className="cc-verlauf-meta">
                          {e.geaendert_von && <span className="cc-verlauf-user"><TI n="user" size={11}/> {e.geaendert_von}</span>}
                          <span className="cc-verlauf-datum">{uhrzeit(e.geaendert_at)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export { VerlaufTab };
