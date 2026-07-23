/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/VerlaufTab.jsx
   Änderungshistorie + Aktivitäten — kombiniert, chronologisch,
   mit Datum-Trennern. Einträge innerhalb 60s vom selben User
   werden gruppiert (z.B. Adressänderung = 1 Eintrag).
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Card, EmptyState } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { fetchAenderungen, fetchAktivitaeten, FELD_LABEL, AKTIVITAET_TYP } from "../../../domains/members/memberService.js";

const SENSITIV_FELDER = ["ahv_nr"];
const ADRESS_FELDER = ["strasse","plz","ort","kanton"];

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
    case AKTIVITAET_TYP.PORTAL_AKTIVIERT:    return "key";
    case AKTIVITAET_TYP.PORTAL_DEAKTIVIERT:  return "key";
    case AKTIVITAET_TYP.PORTAL_REAKTIVIERT:  return "key";
    case AKTIVITAET_TYP.ARCHIVIERT:          return "archive";
    case AKTIVITAET_TYP.REAKTIVIERT:         return "user-check";
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

// Einträge gruppieren: gleicher User + innerhalb 60s = eine Gruppe
function gruppiereEintraege(eintraege) {
  const gruppen = [];
  let aktGruppe = null;

  for (const e of eintraege) {
    const ts = new Date(e.geaendert_at).getTime();
    const user = e.geaendert_von || "";

    if (
      aktGruppe &&
      aktGruppe.user === user &&
      aktGruppe._typ === e._typ &&
      Math.abs(aktGruppe.ts - ts) < 60000
    ) {
      aktGruppe.items.push(e);
      aktGruppe.ts = Math.max(aktGruppe.ts, ts);
    } else {
      aktGruppe = { user, ts, _typ: e._typ, items: [e] };
      gruppen.push(aktGruppe);
    }
  }
  return gruppen;
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
      const alle = [
        ...aenderungen.map(a => ({ ...a, _typ: "aenderung" })),
        ...aktivitaeten.map(a => ({ ...a, _typ: "aktivitaet" })),
      ].sort((a, b) => new Date(b.geaendert_at) - new Date(a.geaendert_at));
      setEintraege(alle);
      setLoading(false);
    });
  }, [raw?.id]);

  const gruppen = gruppiereEintraege(eintraege);

  // Nach Datum gruppieren
  const nachDatum = gruppen.reduce((acc, g) => {
    const label = datumLabel(g.ts);
    if (!acc[label]) acc[label] = [];
    acc[label].push(g);
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
            {Object.entries(nachDatum).map(([datum, gruppen]) => (
              <div key={datum}>
                <div className="cc-verlauf-date-sep">
                  <div className="cc-verlauf-date-line"/>
                  <div className="cc-verlauf-date-label">{datum}</div>
                  <div className="cc-verlauf-date-line"/>
                </div>

                {gruppen.map((g, gi) => (
                  <div key={gi} className={`cc-verlauf-item${gi < gruppen.length-1 ? " cc-verlauf-item-border" : ""}`}>
                    {/* Header: Leer links, User+Zeit rechts — Mobile stapelt */}
                    <div className="cc-verlauf-header">
                      <span/>
                      <span className="cc-verlauf-meta">
                        {g.user && <span className="cc-verlauf-user"><TI n="user" size={11}/> {g.user}</span>}
                        <span className="cc-verlauf-datum">{uhrzeit(g.ts)}</span>
                      </span>
                    </div>

                    {g._typ === "aenderung" ? (
                      /* Änderungen: Adressfelder zusammenfassen */
                      <div className="cc-verlauf-felder">
                        {(()=>{
                          const adressItems = g.items.filter(e => ADRESS_FELDER.includes(e.feld));
                          const restItems   = g.items.filter(e => !ADRESS_FELDER.includes(e.feld));
                          const result = [];

                          // Adresse als Gruppe
                          if (adressItems.length > 0) {
                            result.push(
                              <div key="adresse" className="cc-verlauf-gruppe">
                                <span className="cc-verlauf-feld">Adresse</span>
                                {adressItems.map(e => (
                                  <div key={e.id} className="cc-verlauf-werte">
                                    <span className="cc-verlauf-feld-sub">{FELD_LABEL[e.feld]||e.feld}:</span>
                                    <span className="cc-verlauf-alt">{formatWert(e.feld, e.alter_wert)||"—"}</span>
                                    <TI n="arrow-right" size={11} style={{color:"var(--sub)",flexShrink:0}}/>
                                    <span className="cc-verlauf-neu">{formatWert(e.feld, e.neuer_wert)||"—"}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          // Restliche Felder einzeln
                          restItems.forEach(e => {
                            result.push(
                              <div key={e.id} className="cc-verlauf-gruppe">
                                <span className="cc-verlauf-feld">{FELD_LABEL[e.feld]||e.feld}</span>
                                <div className="cc-verlauf-werte">
                                  <span className="cc-verlauf-alt">{SENSITIV_FELDER.includes(e.feld)?"••• •• ••••":(formatWert(e.feld,e.alter_wert)||"—")}</span>
                                  <TI n="arrow-right" size={11} style={{color:"var(--sub)",flexShrink:0}}/>
                                  <span className="cc-verlauf-neu">{SENSITIV_FELDER.includes(e.feld)?"••• •• ••••":(formatWert(e.feld,e.neuer_wert)||"—")}</span>
                                </div>
                              </div>
                            );
                          });
                          return result;
                        })()}
                      </div>
                    ) : (
                      /* Aktivitäten */
                      <div className="cc-verlauf-felder">
                        {g.items.map(e => (
                          <div key={e.id} className="cc-verlauf-aktivitaet">
                            <span className="cc-verlauf-aktivitaet-icon"><TI n={aktivitaetIcon(e.typ)} size={12}/></span>
                            {e.beschreibung}
                          </div>
                        ))}
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
