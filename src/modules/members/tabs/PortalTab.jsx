/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/PortalTab.jsx
   Portal-Zugang Tab: Verknüpfung, Rolle, Link/Unlink
   ═══════════════════════════════════════════════════════════════ */
import { Card, Chip } from "../../../theme.jsx";
import { GN, R, RL } from "../../../constants.js";

function PortalTab({
  raw, benutzer,
  linkEmail, setLinkEmail,
  portalMsg, portalLoading,
  handleLink, handleUnlink,
}) {
  return (
    <div className="cc-col cc-gap-16">
      <Card>
        <div className="cc-between cc-mb-12">
          <div className="cc-text-bold cc-text-lg">Portal-Zugang</div>
          <Chip
            text={raw.hat_portal_zugang ? "Aktiv" : "Kein Zugang"}
            color={raw.hat_portal_zugang ? GN : R}
            bg={raw.hat_portal_zugang ? "#ECFDF5" : RL}
          />
        </div>
        {raw.hat_portal_zugang && benutzer && (
          <div className="cc-info-grid cc-mb-12">
            {[
              { l: "E-Mail",   v: benutzer.email || "-" },
              { l: "Rolle",    v: benutzer.role || "-" },
              { l: "Erstellt", v: benutzer.created_at ? new Date(benutzer.created_at).toLocaleDateString("de-CH") : "-" },
            ].map((r, i) => (
              <div key={i} className="cc-info-row">
                <span className="cc-info-key">{r.l}</span>
                <span className="cc-info-val">{r.v}</span>
              </div>
            ))}
          </div>
        )}
        {portalMsg && (
          <div className={`cc-badge ${portalMsg.ok ? "cc-badge-success" : "cc-badge-danger"} cc-mb-12`}>
            {portalMsg.text}
          </div>
        )}
        {raw.hat_portal_zugang
          ? <button className="cc-btn-danger cc-w-full" onClick={handleUnlink}>Verknüpfung aufheben</button>
          : (
            <div className="cc-col cc-gap-8">
              <label className="cc-label">E-Mail des Benutzers</label>
              <input
                className="cc-input"
                value={linkEmail}
                onChange={e => setLinkEmail(e.target.value)}
                placeholder="email@example.com"
              />
              <button
                className="cc-btn-success cc-w-full"
                onClick={handleLink}
                disabled={!linkEmail || portalLoading}
              >
                {portalLoading ? "Wird verknüpft…" : "Mit Portal verknüpfen"}
              </button>
            </div>
          )
        }
      </Card>
    </div>
  );
}

export { PortalTab };
