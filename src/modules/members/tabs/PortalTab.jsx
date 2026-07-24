/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/PortalTab.jsx
   Portal-Zugang Tab: Status, Rolle editierbar, Deaktivieren
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, Chip } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { GN, R, RL } from "../../../constants.ts";
import { updateMitgliedRolle, logAenderung } from "../../../domains/members/memberService.js";

function PortalTab({
  raw, benutzer, sb, dbPortalRollen,
  portalMsg, portalLoading,
  handleUnlink, handleReactivate, onReload, setBenutzer,
  vereinId=null, account=null,
}) {
  const aktiv = raw.hat_portal_zugang && benutzer;
  const deaktiviert = !raw.hat_portal_zugang && benutzer;
  const [rolleEditing, setRolleEditing] = useState(false);
  const [rolleVal, setRolleVal] = useState("");
  const [rolleSaving, setRolleSaving] = useState(false);

  const portalRollen = dbPortalRollen?.length > 0
    ? dbPortalRollen
    : [
        { name: "administrator",  label: "Administrator" },
        { name: "administration", label: "Verwaltung" },
        { name: "funktionaer",   label: "Funktionär" },
        { name: "trainer",       label: "Trainer/in" },
        { name: "spieler",       label: "Spieler/in" },
        { name: "eltern",        label: "Elternteil" },
        { name: "mitglied",      label: "Mitglied" },
        { name: "supporter",     label: "Supporter" },
      ];

  async function saveRolle() {
    if (!sb) return;
    setRolleSaving(true);
    const alterRolle = benutzer?.role || raw.rolle || null;
    await updateMitgliedRolle(sb, raw.id, rolleVal, benutzer?.id);
    if (vereinId) {
      const von = account?.name||account?.email||"Administrator";
      logAenderung(sb, raw.id, vereinId, "rolle", alterRolle, rolleVal||null, von);
    }
    setRolleSaving(false);
    setRolleEditing(false);
    if (setBenutzer) setBenutzer(prev => prev ? { ...prev, role: rolleVal } : prev);
    if (onReload) onReload();
  }

  function RolleField({ currentRole }) {
    const label = portalRollen.find(r => r.name === currentRole)?.label || currentRole || "—";
    if (!rolleEditing) return (
      <span className="cc-inline-field cc-info-val" onClick={()=>{ setRolleVal(currentRole||""); setRolleEditing(true); }}>
        {label}
        <span className="cc-inline-pencil"><TI n="pencil" size={11}/></span>
      </span>
    );
    return (
      <div className="cc-col cc-flex-1">
        <select className="cc-inline-select" value={rolleVal} autoFocus
          onChange={e=>setRolleVal(e.target.value)}
          onBlur={saveRolle}
          onKeyDown={e=>{ if(e.key==="Escape"){ setRolleEditing(false); } if(e.key==="Enter") saveRolle(); }}>
          <option value="">— keine —</option>
          {portalRollen.map(r=><option key={r.name} value={r.name}>{r.label}</option>)}
        </select>
        <div className="cc-inline-hint">Esc abbrechen</div>
      </div>
    );
  }

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
              <div className="cc-info-row">
                <span className="cc-info-key">E-Mail</span>
                <span className="cc-info-val">{benutzer.email || "—"}</span>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Rolle</span>
                <RolleField currentRole={benutzer.role}/>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Erstellt</span>
                <span className="cc-info-val">{benutzer.created_at ? new Date(benutzer.created_at).toLocaleDateString("de-CH") : "—"}</span>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Letztes Login</span>
                <span className="cc-info-val">{benutzer.last_sign_in_at ? new Date(benutzer.last_sign_in_at).toLocaleString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Noch nie"}</span>
              </div>
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
              <div className="cc-info-row">
                <span className="cc-info-key">E-Mail</span>
                <span className="cc-info-val">{benutzer.email || "—"}</span>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Rolle</span>
                <RolleField currentRole={benutzer.role}/>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Letztes Login</span>
                <span className="cc-info-val">{benutzer.last_sign_in_at ? new Date(benutzer.last_sign_in_at).toLocaleString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Noch nie"}</span>
              </div>
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
