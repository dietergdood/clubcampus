/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonPersonalien.jsx
   Personalien-Card: Name, Geburtsdatum, Geschlecht, Nationalität,
   Heimatort, AHV-Nr.
   Wiederverwendbar in: MitgliederModul, KaderModul, Anlässe etc.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { getLandName } from "../../modules/members/memberUtils.jsx";

function PersonPersonalien({ raw, fv, canEdit }) {
  const [ahvVisible, setAhvVisible] = useState(false);

  const age = raw.geburtsdatum
    ? Math.floor((new Date() - new Date(raw.geburtsdatum)) / 31557600000)
    : null;

  const felder = [
    { l: "Nachname",     v: raw.nachname || null },
    { l: "Vorname",      v: raw.vorname || null },
    ...(age ? [{ l: "Alter", v: `${age} Jahre` }] : []),
    ...(fv.showGebdat ? [{ l: "Geburtsdatum", v: raw.geburtsdatum ? new Date(raw.geburtsdatum).toLocaleDateString("de-CH") : null }] : []),
    { l: "Geschlecht",   v: raw.geschlecht === "m" ? "Männlich" : raw.geschlecht === "w" ? "Weiblich" : raw.geschlecht || null },
    {
      l: "Nationalität", v: raw.nationalitaet || null,
      flag: raw.nationalitaet ? raw.nationalitaet.toUpperCase() : null,
      flagName: raw.nationalitaet ? getLandName(raw.nationalitaet) : null,
      flag2: raw.nationalitaet2 ? raw.nationalitaet2.toUpperCase() : null,
      flagName2: raw.nationalitaet2 ? getLandName(raw.nationalitaet2) : null,
    },
    { l: "Heimatort",    v: raw.heimatort || null },
    ...(fv.showAhv ? [{ l: "AHV-Nr.", v: raw.ahv_nr || null, masked: true }] : []),
  ].filter(r => canEdit || r.v);

  return (
    <Card>
      <div className="cc-section-title"><TI n="id-badge-2" size={14}/> Personalien</div>
      <div className="cc-info-grid">
        {felder.map((r, i) => (
          <div key={i} className="cc-info-row">
            <span className="cc-info-key">{r.l}</span>
            {r.flag ? (
              <span className="cc-info-val cc-row cc-gap-6" style={{ flexWrap: "wrap" }}>
                <span className="cc-row cc-gap-4">
                  <span className="cc-land-badge">{r.flag}</span>
                  <span>{r.flagName}</span>
                </span>
                {r.flag2 && (
                  <>
                    <span style={{ color: "var(--sub)" }}>·</span>
                    <span className="cc-row cc-gap-4">
                      <span className="cc-land-badge">{r.flag2}</span>
                      <span>{r.flagName2}</span>
                    </span>
                  </>
                )}
              </span>
            ) : r.masked && r.v ? (
              <span className="cc-ahv-row">
                {ahvVisible
                  ? <span className="cc-info-val">{r.v}</span>
                  : <span className="cc-ahv-mask">••• •• ••••</span>
                }
                <button
                  className="cc-ahv-toggle"
                  onClick={() => setAhvVisible(v => !v)}
                  title={ahvVisible ? "Verbergen" : "Anzeigen"}
                >
                  <TI n={ahvVisible ? "eye-off" : "eye"} size={14}/>
                </button>
              </span>
            ) : (
              <span className={r.v ? "cc-info-val" : "cc-info-val-empty"}>{r.v || "—"}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export { PersonPersonalien };
