/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberDetail.jsx
   State-Verwaltung, Tab-Bar, Tab-Routing
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { useIsMobile, useConfirm, ConfirmDialog } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { ableitUndSaveRolle } from "../../domains/roles/roleUtils.js";
import {
  fetchBenutzerFuerMitglied, fetchBenutzerByEmail,
  portalZugangAktivieren, portalZugangDeaktivieren,
  fetchElternkontakte, fetchKaderFuerMitglied,
  fetchPortalFunktionen,
  updateMitglied,
} from "../../domains/members/memberService.js";
import { MemberHero } from "./MemberHero.jsx";
import { ElternTab } from "./tabs/ElternTab.jsx";
import { InfoTab } from "./tabs/InfoTab.jsx";
import { PortalTab } from "./tabs/PortalTab.jsx";
import { DatenpruefungTab } from "./tabs/DatenpruefungTab.jsx";
import { getFieldVisibility } from "./memberUtils.jsx";

function MemberDetail({
  m, onClose, onNavToTeam = null, onReaktiviert = null,
  sb, role, account,
  dbMitglieder = [], dbMitgliedtypen = [], dbPortalRollen = [], dbKaderRollen = [],
  kannVerwalten, onReload, onUpdatePortalZugang = null,
  setSelectedMember, selectedMember,
  reloadMember, refreshArchivCount, brauchtEltern, onProfilGeprueft = null,
  vereinId = null,
}) {
  const dbRaw = dbMitglieder.find(d => d.id === m.id) || {};
  const raw = { ...dbRaw, ...Object.fromEntries(Object.entries(m).filter(([k, v]) => v !== undefined && v !== null || !dbRaw[k])) };
  const fv = getFieldVisibility(role);
  const tab = selectedMember?._tab || "info";
  const setTab = t => setSelectedMember(prev => ({ ...prev, _tab: t }));
  const canEdit = kannVerwalten("members") && !m._readonly;
  const canDelete = kannVerwalten("members");
  const initials = (m.name || raw.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const isMobile = useIsMobile();

  /* ── State ── */
  const [benutzer, setBenutzer] = useState(null);
  const [portalMsg, setPortalMsg] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [linkEmail, setLinkEmail] = useState(raw.email || "");
  const [notizenCount, setNotizenCount] = useState(null);
  const [elternLoaded, setElternLoaded] = useState(null);
  const eltern = elternLoaded !== null ? elternLoaded : (raw.eltern || []);
  const [teamDetails, setTeamDetails] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [assignFunktionen, setAssignFunktionen] = useState([]);
  const [mehrOpen, setMehrOpen] = useState(false);
  const mehrRef = useRef(null);

  const [confirm, confirmDialog] = useConfirm();

  /* ── Mehr-Menü schliessen bei Klick aussen ── */
  useEffect(() => {
    if (!mehrOpen) return;
    const handler = e => { if (mehrRef.current && !mehrRef.current.contains(e.target)) setMehrOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mehrOpen]);

  /* ── Daten laden ── */
  useEffect(() => {
    if (tab === "portal" && sb && raw.id) {
      setPortalLoading(true);
      fetchBenutzerFuerMitglied(sb, raw.id).then(data => { setBenutzer(data); setPortalLoading(false); });
    }
  }, [tab, raw.id]);

  useEffect(() => {
    if ((tab === "eltern" || (tab === "info" && brauchtEltern(raw.mitgliedtyp))) && sb && raw.id && elternLoaded === null) {
      fetchElternkontakte(sb, raw.id).then(data => setElternLoaded(data));
    }
  }, [tab, raw.id]);

  useEffect(() => {
    if (sb && raw.id && teamDetails === null) {
      fetchKaderFuerMitglied(sb, raw.id).then(data => setTeamDetails(data));
    }
  }, [raw.id]);

  useEffect(() => {
    if (sb && (assignFunktionen || []).length === 0) {
      fetchPortalFunktionen(sb).then(data => setAssignFunktionen(data));
    }
  }, [raw.id]);

  useEffect(() => {
    if (sb && raw.id && benutzer === null) {
      fetchBenutzerFuerMitglied(sb, raw.id).then(data => setBenutzer(data));
    }
  }, [raw.id]);

  /* ── Aktionen ── */
  async function ableitRolle() {
    if (!sb || !raw.id) return;
    const neueRolle = await ableitUndSaveRolle(sb, raw.id, dbKaderRollen, raw.mitgliedtyp, raw.funktionen);
    setBenutzer(prev => prev ? { ...prev, role: neueRolle } : { role: neueRolle });
    if (onReload) onReload();
  }

  async function handleLink() {
    if (!sb || !linkEmail) return;
    setPortalLoading(true); setPortalMsg(null);
    const existing = await fetchBenutzerByEmail(sb, linkEmail);
    if (existing) {
      const neueRolle = await ableitUndSaveRolle(sb, raw.id, dbKaderRollen, raw.mitgliedtyp, raw.funktionen);
      await portalZugangAktivieren(sb, raw.id, existing.id, neueRolle);
      setPortalMsg({ ok: true, text: `Verknüpft ✓ — Rolle: ${neueRolle}` });
      if (reloadMember) reloadMember(raw.id);
      else if (onReload) onReload();
    } else {
      setPortalMsg({ ok: false, text: "Kein Benutzer mit dieser E-Mail gefunden." });
    }
    setPortalLoading(false);
  }

  async function handleUnlink() {
    if (!sb) return;
    await portalZugangDeaktivieren(sb, raw.id);
    setBenutzer(null); setPortalMsg({ ok: true, text: "Verknüpfung aufgehoben" });
    if (reloadMember) reloadMember(raw.id);
    else if (onReload) onReload();
  }

  /* ── Tab-Definitionen ── */
  const allTabs = [
    { key: "info",          label: "Profil",         icon: "user" },
    { key: "eltern",        label: `Eltern (${(eltern || []).length})`, icon: "heart" },
    { key: "stats",         label: "Statistik",      icon: "chart-bar" },
    { key: "portal",        label: "Portal-Zugang",  icon: "key" },
    { key: "datenpruefung", label: "Datenprüfung",   icon: "shield-check" },
  ];
  const MOBILE_VISIBLE = 3;
  const visibleTabs = isMobile ? allTabs.slice(0, MOBILE_VISIBLE) : allTabs;
  const moreTabs = isMobile ? allTabs.slice(MOBILE_VISIBLE) : [];
  const moreActive = moreTabs.some(t => t.key === tab);

  return (
    <>{confirmDialog}
    <div className="cc-col cc-gap-12 cc-member-detail-wrap">

      {/* Hero */}
      <MemberHero
        m={m} raw={raw} initials={initials} canEdit={canEdit}
        sb={sb} onReload={id => id ? reloadMember(id) : onReload()} onClose={onClose}
        onReaktiviert={onReaktiviert} onRefreshCount={refreshArchivCount}
        account={account} onUpdatePortalZugang={onUpdatePortalZugang}
        dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
        benutzer={benutzer} teamDetails={teamDetails}
      />

      {/* Tab-Bar */}
      <div className="cc-member-tabs">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            className={`cc-member-tab${tab === t.key ? " cc-member-tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon && <TI n={t.icon} size={13}/>}
            {t.label}
          </button>
        ))}
        {moreTabs.length > 0 && (
          <>
            <div ref={mehrRef} className="cc-mehr-btn-wrap">
              <button
                className={`cc-member-tab${moreActive ? " cc-member-tab-active" : ""}`}
                onClick={() => setMehrOpen(o => !o)}
              >
                <TI n="dots" size={13}/> Mehr
              </button>
              {mehrOpen && !isMobile && (
                <div className="cc-mehr-dropdown">
                  {moreTabs.map(t => (
                    <button
                      key={t.key}
                      className={`cc-mehr-item${tab === t.key ? " cc-mehr-item-active" : ""}`}
                      onClick={() => { setTab(t.key); setMehrOpen(false); }}
                    >
                      {t.icon && <TI n={t.icon} size={14}/>}
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isMobile && mehrOpen && (
              <div className="cc-mehr-sheet-overlay">
                <div className="cc-mehr-sheet-backdrop" onMouseDown={() => setMehrOpen(false)}/>
                <div className="cc-mehr-sheet-box">
                  <div className="cc-mehr-sheet-handle"/>
                  <div className="cc-mehr-sheet-title">Weitere Tabs</div>
                  {moreTabs.map(t => (
                    <button
                      key={t.key}
                      className={`cc-mehr-sheet-item${tab === t.key ? " cc-mehr-sheet-item-active" : ""}`}
                      onMouseDown={e => { e.stopPropagation(); setTab(t.key); setMehrOpen(false); }}
                    >
                      {t.icon && <TI n={t.icon} size={18}/>}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tab-Routing */}
      {tab === "info" && (
        <InfoTab
          raw={raw} fv={fv} canEdit={canEdit} canDelete={canDelete}
          sb={sb} account={account}
          dbKaderRollen={dbKaderRollen} dbMitgliedtypen={dbMitgliedtypen}
          eltern={eltern} brauchtEltern={brauchtEltern} setTab={setTab}
          teamDetails={teamDetails} setTeamDetails={setTeamDetails}
          allTeams={allTeams} setAllTeams={setAllTeams}
          assignFunktionen={assignFunktionen} setAssignFunktionen={setAssignFunktionen}
          onNavToTeam={onNavToTeam}
          notizenCount={notizenCount} setNotizenCount={setNotizenCount}
          onReload={onReload} reloadMember={reloadMember} ableitRolle={ableitRolle}
          vereinId={vereinId}
        />
      )}

      {tab === "eltern" && (
        <ElternTab
          eltern={eltern} canEdit={canEdit} raw={raw} sb={sb}
          onReload={() => { if (reloadMember) reloadMember(raw.id); if (onReload) onReload(); }}
          setElternLoaded={setElternLoaded}
          vereinId={vereinId}
        />
      )}

      {tab === "portal" && (
        <PortalTab
          raw={raw} benutzer={benutzer}
          linkEmail={linkEmail} setLinkEmail={setLinkEmail}
          portalMsg={portalMsg} portalLoading={portalLoading}
          handleLink={handleLink} handleUnlink={handleUnlink}
        />
      )}

      {tab === "datenpruefung" && (
        <DatenpruefungTab
          raw={raw} sb={sb}
          portalMsg={portalMsg} setPortalMsg={setPortalMsg}
          onReload={onReload}
        />
      )}

      {(tab === "stats" || tab === "comments" || tab === "ratings") && (
        <div className="cc-empty-state">
          <div className="cc-empty-icon"><TI n="chart-bar" size={32}/></div>
          <div>Kommt bald</div>
        </div>
      )}

    </div>
    </>
  );
}

export { MemberDetail };
export const MembersView = MemberDetail;
export default MemberDetail;
