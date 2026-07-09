/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/PortalTab.jsx
   Portal-Zugang Tab: Verknüpfung, Rolle, Link/Unlink, Einladung
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, Chip } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { GN, R, RL } from "../../../constants.js";

function PortalTab({
  raw, sb, benutzer,
  linkEmail, setLinkEmail,
  portalMsg, setPortalMsg, portalLoading,
  handleLink, handleUnlink,
}) {
  const [inviteLoading, setInviteLoading] = useState(false);

  async function handleInvite() {
    if (!linkEmail) return;
    setInviteLoading(true);
    setPortalMsg(null);
    try {
      const res = await sb.functions.invoke("invite-user", {
        body: {
          email: linkEmail,
          redirect_url: window.location.origin,
        },
      });
      if (res.error || res.data?.error) {
        setPortalMsg({ ok: false, text: res.data?.error || res.error.message });
      } else {
        setPortalMsg({ ok: true, text: `Einladung gesendet an ${linkEmail} ✓` });
      }
    } catch (e) {
      setPortalMsg({ ok: false, text: e.message });
    }
    setInviteLoading(false);
  }

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
                {portalLoading ? "Wird verknüpft…" : "Mit bestehendem Konto verknüpfen"}
              </button>
              <div className="cc-divider-label">oder</div>
              <button
                className="cc-btn-ghost cc-w-full"
                onClick={handleInvite}
                disabled={!linkEmail || inviteLoading}
              >
                <TI n="mail" size={14}/>
                {inviteLoading ? "Einladung wird gesendet…" : "Einladung per E-Mail senden"}
              </button>
            </div>
          )
        }
      </Card>
    </div>
  );
}

export { PortalTab };
