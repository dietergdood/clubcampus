/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/PortalTab.jsx
   Portal-Zugang Tab: Status, Deaktivieren, Reaktivieren
   ═══════════════════════════════════════════════════════════════ */
import { Card, Chip } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { GN, R, RL } from "../../../constants.js";

function PortalTab({
  raw, benutzer,
  portalMsg, portalLoading,
  handleUnlink, handleReactivate,
}) {
  const aktiv = raw.hat_portal_zugang && benutzer;
  const deaktiviert = !raw.hat_portal_zugang && benutzer;

  return (
    <div className="cc-col cc-gap-16">
      <Card>
        <div className="cc-between cc-mb-12">
          <div className="cc-text-bold cc-text-lg">Portal-Zugang</div>
          <Chip
            text={aktiv ? "Aktiv" : deaktiviert ? "Deaktiviert" : "Kein Zugang"}
            color={aktiv ? GN : R}
            bg={aktiv ? "#ECFDF5" : RL}
          />
        </div>

        {/* Aktiv */}
        {aktiv && (
          <>
            <div className="cc-info-grid cc-mb-12">
              {[
                { l: "E-Mail",        v: benutzer.email || "-" },
                { l: "Rolle",         v: benutzer.role || "-" },
                { l: "Erstellt",      v: benutzer.created_at ? new Date(benutzer.created_at).toLocaleDateString("de-CH") : "-" },
                { l: "Letztes Login", v: benutzer.last_sign_in_at ? new Date(benutzer.last_sign_in_at).toLocaleString("de-CH", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Noch nie" },
              ].map((r, i) => (
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  <span className="cc-info-val">{r.v}</span>
                </div>
              ))}
            </div>
            <button className="cc-btn-danger cc-w-full" onClick={handleUnlink} disabled={portalLoading}>
              {portalLoading ? "Wird deaktiviert…" : "Zugang deaktivieren"}
            </button>
          </>
        )}

        {/* Deaktiviert */}
        {deaktiviert && (
          <>
            <div className="cc-info-grid cc-mb-12">
              {[
                { l: "E-Mail",        v: benutzer.email || "-" },
                { l: "Rolle",         v: benutzer.role || "-" },
                { l: "Letztes Login", v: benutzer.last_sign_in_at ? new Date(benutzer.last_sign_in_at).toLocaleString("de-CH", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Noch nie" },
              ].map((r, i) => (
                <div key={i} className="cc-info-row">
                  <span className="cc-info-key">{r.l}</span>
                  <span className="cc-info-val">{r.v}</span>
                </div>
              ))}
            </div>
            <button className="cc-btn-success cc-w-full" onClick={handleReactivate} disabled={portalLoading}>
              {portalLoading ? "Wird reaktiviert…" : "Zugang reaktivieren"}
            </button>
          </>
        )}

        {/* Kein Zugang */}
        {!aktiv && !deaktiviert && (
          <div className="cc-warn-box">
            <TI n="info-circle" size={14}/>
            <span>
              {raw.email
                ? <>Das Mitglied kann sich mit <strong>{raw.email}</strong> unter "Registrieren" ein Konto erstellen. Die Verknüpfung erfolgt automatisch.</>
                : <>Keine E-Mail-Adresse hinterlegt. Bitte zuerst eine E-Mail im Kontakt-Tab erfassen.</>
              }
            </span>
          </div>
        )}

        {portalMsg && (
          <div className={`cc-badge ${portalMsg.ok ? "cc-badge-success" : "cc-badge-danger"} cc-mt-8`}>
            {portalMsg.text}
          </div>
        )}
      </Card>
    </div>
  );
}

export { PortalTab };
