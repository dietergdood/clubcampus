/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonKontakt.jsx
   Kontakt-Card: E-Mail, Telefon, Adresse + Hauptkontakt Mini-Karte
   Wiederverwendbar in: MitgliederModul, KaderModul etc.
   ═══════════════════════════════════════════════════════════════ */
import { Av, Card } from "../../theme.jsx";
import { TI } from "../../icons.jsx";

function PersonKontakt({ raw, fv, canEdit, eltern, brauchtEltern, setTab }) {
  if (!fv.showEmail && !fv.showTelefon && !fv.showAdresse) return null;

  const hk = brauchtEltern(raw.mitgliedtyp) ? (eltern || []).find(e => e.hauptkontakt) : null;
  const hkName = hk ? (hk.name || `${hk.vorname || ""} ${hk.nachname || ""}`.trim() || "?") : null;
  const hkTel = hk ? (hk.telefon || hk.tel) : null;

  const felder = [
    ...(fv.showEmail   ? [{ l: "E-Mail",  v: raw.email || null,   link: raw.email ? `mailto:${raw.email}` : null }] : []),
    ...(fv.showTelefon ? [{ l: "Telefon", v: raw.telefon || null, link: raw.telefon ? `tel:${raw.telefon}` : null }] : []),
    ...(fv.showAdresse ? [
      { l: "Strasse", v: raw.strasse || null },
      { l: "PLZ/Ort", v: raw.plz && raw.ort ? `${raw.plz} ${raw.ort}` : null },
    ] : []),
  ].filter(r => canEdit || r.v);

  return (
    <Card>
      <div className="cc-section-title"><TI n="address-book" size={14}/> Kontakt</div>
      <div className="cc-info-grid">
        {felder.map((r, i) => (
          <div key={i} className="cc-info-row">
            <span className="cc-info-key">{r.l}</span>
            {r.link && r.v
              ? <a href={r.link} className={r.link.startsWith("tel:") ? "cc-contact-link-plain" : "cc-contact-link"}>{r.v}</a>
              : <span className={r.v ? "cc-info-val" : "cc-info-val-empty"}>{r.v || "—"}</span>
            }
          </div>
        ))}
      </div>

      {/* Hauptkontakt Mini-Karte */}
      {hk && (
        <>
          <div className="cc-hk-sub-label">
            <span className="cc-hk-sub-label-text"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
            <button className="cc-hk-tab-link" onClick={() => setTab("eltern")}>
              Eltern ({(eltern || []).length}) <TI n="chevron-right" size={12}/>
            </button>
          </div>
          <div className="cc-hk-card">
            <Av name={hkName} size="md" bg="rgba(255,191,0,0.15)"/>
            <div className="cc-hk-content">
              <div className="cc-text-bold">{hkName}</div>
              <div className="cc-text-sm cc-text-sub">{hk.beziehung || "—"}</div>
              {hk.email && <a href={`mailto:${hk.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{hk.email}</a>}
              {hkTel && <a href={`tel:${hkTel}`} className="cc-contact-link-muted"><TI n="phone" size={12}/>{hkTel}</a>}
            </div>
          </div>
        </>
      )}

      {brauchtEltern(raw.mitgliedtyp) && !hk && (
        <>
          <div className="cc-hk-sub-label">
            <span className="cc-hk-sub-label-text"><TI n="star" size={11}/> Hauptkontakt / Elternkontakt</span>
            <button className="cc-hk-tab-link" onClick={() => setTab("eltern")}>
              Eltern ({(eltern || []).length}) <TI n="chevron-right" size={12}/>
            </button>
          </div>
          <div className="cc-warn-box"><TI n="alert-triangle" size={14}/> Kein Hauptkontakt — bitte im Tab "Eltern" festlegen</div>
        </>
      )}
    </Card>
  );
}

export { PersonKontakt };
