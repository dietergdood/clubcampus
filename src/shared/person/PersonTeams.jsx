/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonTeams.jsx
   Teams-Card + Team zuweisen / bearbeiten / entfernen Modals
   Wiederverwendbar in: MitgliederModul, KaderModul, Aufgebote etc.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, ModalOrSheet, ModalTitle, useConfirm, ConfirmDialog, useIsMobile } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { DropMenu } from "../../theme.jsx";
import { currentSeason } from "../../domains/season/seasonUtils.js";
import {
  fetchKaderFuerMitglied,
  fetchAktiveTeams,
  fetchPortalFunktionenMitGruppe,
  upsertKader,
  updateKader,
  deaktiviereKader,
} from "../../domains/members/memberService.js";

function PersonTeams({
  raw,
  sb,
  canEdit,
  vereinId,
  dbKaderRollen = [],
  teamDetails,
  setTeamDetails,
  allTeams,
  setAllTeams,
  assignFunktionen,
  setAssignFunktionen,
  onNavToTeam = null,
  onReload,
  ableitRolle,
}) {
  const isMobile = useIsMobile();
  const [confirm, confirmDialog] = useConfirm();
  const [showTeamAssign, setShowTeamAssign] = useState(false);
  const [teamAssignForm, setTeamAssignForm] = useState({ team_id: "", funktionen: ["Spieler/in"], rueckennr: "", position: "" });
  const [teamAssignRolleSearch, setTeamAssignRolleSearch] = useState("");
  const [teamAssignSaving, setTeamAssignSaving] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [editTeamForm, setEditTeamForm] = useState({ funktionen: [], rueckennr: "", position: "" });
  const [editTeamRolleSearch, setEditTeamRolleSearch] = useState("");
  const [editTeamSaving, setEditTeamSaving] = useState(false);
  const [editTeamFunkOpen, setEditTeamFunkOpen] = useState(false);

  async function openTeamAssign() {
    if ((allTeams || []).length === 0)
      fetchAktiveTeams(sb).then(data => setAllTeams(data));
    if ((assignFunktionen || []).length === 0)
      fetchPortalFunktionenMitGruppe(sb).then(data => setAssignFunktionen(data));
    setShowTeamAssign(true);
  }

  async function assignTeam() {
    if (!sb || !teamAssignForm.team_id) return;
    setTeamAssignSaving(true);
    await upsertKader(sb, {
      team_id: parseInt(teamAssignForm.team_id),
      mitglied_id: raw.id,
      verein_id: vereinId,
      rollen: teamAssignForm.funktionen || ["Spieler/in"],
      rueckennr: teamAssignForm.rueckennr || null,
      position: teamAssignForm.position || null,
      aktiv: true,
      saison: currentSeason(),
    });
    const data = await fetchKaderFuerMitglied(sb, raw.id);
    setTeamDetails(data);
    await ableitRolle();
    setShowTeamAssign(false);
    setTeamAssignForm({ team_id: "", funktionen: ["Spieler/in"], rueckennr: "", position: "" });
    setTeamAssignSaving(false);
    if (onReload) onReload();
  }

  async function removeFromTeam(kaderId) {
    const ok = await confirm({ title: "Aus Team entfernen?", danger: true, confirmLabel: "Entfernen" });
    if (!sb || !ok) return;
    await deaktiviereKader(sb, kaderId);
    setTeamDetails(prev => prev.filter(k => k.id !== kaderId));
    await ableitRolle();
  }

  async function saveEditTeam() {
    if (!sb || !editTeam) return;
    setEditTeamSaving(true);
    await updateKader(sb, editTeam.id, {
      rollen: editTeamForm.funktionen || [],
      rueckennr: editTeamForm.rueckennr || null,
      position: editTeamForm.position || null,
    });
    setTeamDetails(prev => prev.map(k => k.id === editTeam.id
      ? { ...k, rollen: editTeamForm.funktionen, rueckennr: editTeamForm.rueckennr, position: editTeamForm.position }
      : k
    ));
    await ableitRolle();
    setEditTeam(null);
    setEditTeamFunkOpen(false);
    setEditTeamSaving(false);
    if (onReload) onReload();
  }

  return (
    <>
      {confirmDialog}
      <Card>
        <div className="cc-section-title cc-between">
          <span className="cc-row cc-gap-6"><TI n="users" size={14}/> Teams</span>
          {canEdit && <button className="cc-btn-ghost" onClick={openTeamAssign}><TI n="plus" size={13}/> Zuweisen</button>}
        </div>
        {teamDetails === null && <div className="cc-text-sm cc-text-sub">Lade…</div>}
        {teamDetails !== null && teamDetails.length === 0 && (
          <div className="cc-text-sm cc-text-sub">Keinem Team zugewiesen.</div>
        )}
        {(teamDetails || []).map((k, i) => (
          <div
            key={i}
            className={`cc-team-position-row${isMobile && onNavToTeam ? " cc-team-position-row-mobile" : ""}`}
            onClick={isMobile && onNavToTeam ? () => onNavToTeam(k.team_id) : undefined}
          >
            <div className="cc-list-item-icon"><TI n="ball-football" size={13}/></div>
            <div className="cc-team-position-body">
              {!isMobile && onNavToTeam
                ? <span className="cc-team-position-name-link" onClick={e => { e.stopPropagation(); onNavToTeam(k.team_id); }}>{k.teams?.name || "—"}</span>
                : <div className="cc-team-position-name">{k.teams?.name || "—"}</div>
              }
              {(k.rollen || ["Spieler/in"]).length > 0 && (
                <div className="cc-team-role-chips">
                  {[...(k.rollen || ["Spieler/in"])].sort((a, b) => {
                    const aT = dbKaderRollen.some(kr => kr.name === a && kr.ist_trainer);
                    const bT = dbKaderRollen.some(kr => kr.name === b && kr.ist_trainer);
                    return aT === bT ? 0 : aT ? -1 : 1;
                  }).map((r, ri) => {
                    const isTrainer = dbKaderRollen.some(kr => kr.name === r && kr.ist_trainer);
                    return <span key={ri} className={isTrainer ? "cc-role-chip cc-role-chip-trainer" : "cc-role-chip"}>{r}</span>;
                  })}
                </div>
              )}
            </div>
            <DropMenu items={[
              ...(canEdit ? [
                { label: "Bearbeiten", icon: "edit", onClick: () => { setEditTeamForm({ funktionen: k.rollen || [], rueckennr: k.rueckennr || "", position: k.position || "" }); setEditTeam(k); } },
                "sep",
                { label: "Entfernen", icon: "trash", danger: true, onClick: () => removeFromTeam(k.id) },
              ] : []),
            ]}/>
          </div>
        ))}

      </Card>

      {/* Team zuweisen Modal */}
      <ModalOrSheet open={showTeamAssign} onClose={() => setShowTeamAssign(false)} maxWidth={560}>
        <div className="cc-modal-hdr">
          <ModalTitle>Team zuweisen</ModalTitle>
          <button className="cc-icon-btn" onClick={() => setShowTeamAssign(false)}><TI n="x" size={14}/></button>
        </div>
        <div className="cc-modal-body cc-col">
          <div>
            <label className="cc-label">Team</label>
            <select className="cc-input" value={teamAssignForm.team_id} onChange={e => setTeamAssignForm(p => ({ ...p, team_id: e.target.value }))}>
              <option value="">– wählen –</option>
              {(allTeams||[]).filter(t=>!(teamDetails||[]).some(k=>k.team_id===t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="cc-label">Rolle im Team</label>
            <div className="cc-search-input-wrap">
              <span className="cc-search-input-icon"><TI n="search" size={14}/></span>
              <input
                className="cc-search-input"
                placeholder="Suchen…"
                value={teamAssignRolleSearch || ""}
                onChange={e => setTeamAssignRolleSearch(e.target.value)}
              />
            </div>
            <div className="cc-role-list-wrap">
              {dbKaderRollen
                .filter(r => !teamAssignRolleSearch || r.name.toLowerCase().includes(teamAssignRolleSearch.toLowerCase()))
                .map(r => {
                  const sel = (teamAssignForm.funktionen || []).includes(r.name);
                  return (
                    <div
                      key={r.name}
                      className={`cc-role-list-item${sel ? " cc-role-list-item-selected" : ""}`}
                      onClick={() => setTeamAssignForm(p => ({ ...p, funktionen: sel ? p.funktionen.filter(x => x !== r.name) : [...(p.funktionen || []), r.name] }))}
                    >
                      <div className={sel ? "cc-multiselect-cb-on" : "cc-multiselect-cb"}>
                        {sel && <TI n="check" size={10} className="cc-check-icon"/>}
                      </div>
                      <span className="cc-role-name">{r.name}</span>
                      {r.ist_trainer && <span className="cc-trainer-badge">Trainer</span>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
        <div className="cc-modal-ftr">
          <Btn onClick={() => setShowTeamAssign(false)}>Abbrechen</Btn>
          <Btn variant="primary" onClick={assignTeam} disabled={!teamAssignForm.team_id || teamAssignSaving}>
            {teamAssignSaving ? "Wird zugewiesen…" : "Zuweisen"}
          </Btn>
        </div>
      </ModalOrSheet>

      {/* Team bearbeiten Modal */}
      <ModalOrSheet open={!!editTeam} onClose={() => { setEditTeam(null); setEditTeamFunkOpen(false); }} maxWidth={560}>
        {editTeam && (
          <>
            <div className="cc-modal-hdr">
              <div>
                <ModalTitle>{editTeam.teams?.name || "Team"} bearbeiten</ModalTitle>
                <div className="cc-text-sm cc-text-sub">Saison {currentSeason()}</div>
              </div>
              <button className="cc-icon-btn" onClick={() => { setEditTeam(null); setEditTeamFunkOpen(false); }}><TI n="x" size={14}/></button>
            </div>
            <div className="cc-modal-body cc-col">
              <div>
                <label className="cc-label">Rolle im Team</label>
                <div className="cc-search-input-wrap">
                  <span className="cc-search-input-icon"><TI n="search" size={14}/></span>
                  <input
                    className="cc-search-input"
                    placeholder="Suchen…"
                    value={editTeamRolleSearch || ""}
                    onChange={e => setEditTeamRolleSearch(e.target.value)}
                  />
                </div>
                <div className="cc-role-list-wrap">
                  {dbKaderRollen
                    .filter(r => !editTeamRolleSearch || r.name.toLowerCase().includes(editTeamRolleSearch.toLowerCase()))
                    .map(r => {
                      const sel = (editTeamForm.funktionen || []).includes(r.name);
                      return (
                        <div
                          key={r.name}
                          className={`cc-role-list-item${sel ? " cc-role-list-item-selected" : ""}`}
                          onClick={() => setEditTeamForm(p => ({ ...p, funktionen: sel ? p.funktionen.filter(x => x !== r.name) : [...(p.funktionen || []), r.name] }))}
                        >
                          <div className={sel ? "cc-multiselect-cb-on" : "cc-multiselect-cb"}>
                            {sel && <TI n="check" size={10} className="cc-check-icon"/>}
                          </div>
                          <span className="cc-role-name">{r.name}</span>
                          {r.ist_trainer && <span className="cc-trainer-badge">Trainer</span>}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
            <div className="cc-modal-ftr">
              <Btn onClick={() => { setEditTeam(null); setEditTeamFunkOpen(false); }}>Abbrechen</Btn>
              <Btn variant="primary" onClick={saveEditTeam} disabled={editTeamSaving}>
                {editTeamSaving ? "Speichert…" : "Speichern"}
              </Btn>
            </div>
          </>
        )}
      </ModalOrSheet>
    </>
  );
}

export { PersonTeams };
