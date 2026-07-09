/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/InfoTab.jsx
   Profil-Tab: StatusTiles, Personalien, Kontakt, Vereinsdaten,
   Teams, Vereinsfunktionen, Notizen
   ═══════════════════════════════════════════════════════════════ */
import { useRef } from "react";
import { Card, StatusTile, useIsMobile } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { PersonPersonalien } from "../../../shared/person/PersonPersonalien.jsx";
import { PersonKontakt } from "../../../shared/person/PersonKontakt.jsx";
import { PersonTeams } from "../../../shared/person/PersonTeams.jsx";
import { PersonFunktionen } from "../../../shared/person/PersonFunktionen.jsx";
import { NotizenVerlauf } from "../NotizenVerlauf.jsx";

function InfoTab({
  raw, fv, canEdit, canDelete, sb, account,
  dbKaderRollen, dbMitgliedtypen,
  eltern, brauchtEltern, setTab,
  teamDetails, setTeamDetails,
  allTeams, setAllTeams,
  assignFunktionen, setAssignFunktionen,
  onNavToTeam,
  notizenCount, setNotizenCount,
  onReload, reloadMember=null, ableitRolle,
  vereinId,
}) {
  const isMobile = useIsMobile();
  const notizAddRef = useRef(null);

  return (
    <div className="cc-col cc-gap-12">
      {/* StatusTiles */}
      <div className="cc-member-stats">
        <StatusTile
          label="Mitgliedschaft"
          value={raw.mitgliedtyp || "—"}
          icon="id-badge-2"
          semantic="neutral"
        />
        <StatusTile
          label="Datenprüfung"
          value={raw.geprueft ? "Geprüft" : "Ausstehend"}
          icon={raw.geprueft ? "shield-check" : "alert-circle"}
          semantic={raw.geprueft ? "ok" : "warn"}
          action={!raw.geprueft && canEdit ? { label: "Prüfung starten", onClick: () => setTab("datenpruefung") } : null}
        />
        <StatusTile
          label="Portal-Zugang"
          value={raw.hat_portal_zugang ? (isMobile ? "OK" : "Eingerichtet") : (isMobile ? "Fehlt" : "Nicht eingerichtet")}
          icon="key"
          semantic={raw.hat_portal_zugang ? "ok" : "warn"}
          action={!raw.hat_portal_zugang && canEdit ? { label: "Zugang erstellen", onClick: () => setTab("portal") } : null}
        />
        <StatusTile
          label="Fairgate"
          value={raw.fairgate_id ? (isMobile ? "Sync" : "Synchronisiert") : "—"}
          icon="refresh"
          semantic={raw.fairgate_id ? "ok" : "neutral"}
        />
      </div>

      {/* Grid: Personalien + Kontakt + Vereinsdaten + Teams + Funktionen + Notizen */}
      <div className="cc-grid-2">
        <PersonPersonalien raw={raw} fv={fv} canEdit={canEdit}/>

        <PersonKontakt
          raw={raw} fv={fv} canEdit={canEdit}
          eltern={eltern} brauchtEltern={brauchtEltern} setTab={setTab}
        />

        {/* Vereinsdaten */}
        <Card className="cc-card-full">
          <div className="cc-section-title"><TI n="building-community" size={14}/> Vereinsdaten</div>
          <div className="cc-info-grid">
            {[
              ...(fv.showPass ? [{ l: "Spielerpass", v: raw.spielerpass || null }, { l: "J+S Nr.", v: raw.js_nr || null }] : []),
              ...(fv.showFairgateId ? [{ l: "Fairgate-ID", v: raw.fairgate_id || null }] : []),
              { l: "Eintritt", v: raw.eintrittsdatum ? new Date(raw.eintrittsdatum).toLocaleDateString("de-CH") : null },
            ].filter(r => canEdit || r.v).map((r, i) => (
              <div key={i} className="cc-info-row">
                <span className="cc-info-key">{r.l}</span>
                <span className={r.v ? "cc-info-val" : "cc-info-val-empty"}>{r.v || "—"}</span>
              </div>
            ))}
          </div>
        </Card>

        <PersonTeams
          raw={raw} sb={sb} canEdit={canEdit}
          dbKaderRollen={dbKaderRollen}
          teamDetails={teamDetails} setTeamDetails={setTeamDetails}
          allTeams={allTeams} setAllTeams={setAllTeams}
          assignFunktionen={assignFunktionen} setAssignFunktionen={setAssignFunktionen}
          onNavToTeam={onNavToTeam}
          onReload={()=>{if(reloadMember)reloadMember(raw.id);if(onReload)onReload();}} ableitRolle={ableitRolle}
          vereinId={vereinId}
        />

        <PersonFunktionen
          raw={raw} sb={sb} canEdit={canEdit} canDelete={canDelete}
          assignFunktionen={assignFunktionen}
          onReload={()=>{if(reloadMember)reloadMember(raw.id);if(onReload)onReload();}}
        />

        {/* Notizen */}
        {fv.showNotizen && (
          <Card className="cc-card-full">
            <div className="cc-section-title cc-between">
              <span className="cc-row cc-gap-6">
                <TI n="notes" size={14}/> Notizen
                {notizenCount > 0 && <span className="cc-notiz-count-badge">{notizenCount}</span>}
              </span>
              {canEdit && (
                <button className="cc-btn-ghost" onClick={() => notizAddRef.current?.()}>
                  <TI n="plus" size={13}/> Notiz hinzufügen
                </button>
              )}
            </div>
            <NotizenVerlauf
              mitgliedId={raw.id}
              canEdit={canEdit}
              sb={sb}
              dbUser={account}
              onCount={setNotizenCount}
              vereinId={vereinId}
              onAddRef={notizAddRef}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export { InfoTab };
