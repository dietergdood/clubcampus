/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonFunktionen.jsx
   Vereinsfunktionen-Card + Funktion hinzufügen Modal
   Wiederverwendbar in: MitgliederModul, KaderModul etc.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, ModalOrSheet, ModalTitle, DropMenu } from "../../theme.jsx";
import { TI } from "../../icons.jsx";
import { updateMitglied, logAenderung, logAktivitaet, AKTIVITAET_TYP } from "../../domains/members/memberService.js";

function PersonFunktionen({ raw, sb, canEdit, canDelete, assignFunktionen, onReload, vereinId=null, account=null }) {
  const [showFunkAssign, setShowFunkAssign] = useState(false);
  const [funkSearch, setFunkSearch] = useState("");
  const [funkSelected, setFunkSelected] = useState([]);

  function openFunkModal() {
    setFunkSelected(raw.funktionen || []);
    setFunkSearch("");
    setShowFunkAssign(true);
  }

  async function saveFunktionen() {
    if (!sb) return;
    await updateMitglied(sb, raw.id, { funktionen: funkSelected });
    if (vereinId) {
      const alterSet = new Set(raw.funktionen || []);
      const neuerSet = new Set(funkSelected);
      const hinzugefuegt = funkSelected.filter(f => !alterSet.has(f));
      const entfernt = (raw.funktionen || []).filter(f => !neuerSet.has(f));
      const von = account?.name||account?.email||"Administrator";
      for (const f of hinzugefuegt) logAktivitaet(sb, raw.id, vereinId, AKTIVITAET_TYP.FUNKTION_GEAENDERT, `Vereinsfunktion hinzugefügt: ${f}`, "funktionen", f, von);
      for (const f of entfernt)      logAktivitaet(sb, raw.id, vereinId, AKTIVITAET_TYP.FUNKTION_GEAENDERT, `Vereinsfunktion entfernt: ${f}`, "funktionen", f, von);
    }
    setShowFunkAssign(false);
    if (onReload) onReload();
  }

  const filtered = assignFunktionen.filter(f =>
    !(raw.funktionen||[]).includes(f.name) && (
    !funkSearch ||
    f.name.toLowerCase().includes(funkSearch.toLowerCase()) ||
    (f.portal_gruppen?.name || "").toLowerCase().includes(funkSearch.toLowerCase()))
  );
  const groups = [...new Set(filtered.map(f => f.portal_gruppen?.name || "Weitere"))];

  return (
    <>
      <Card>
        <div className="cc-section-title cc-between">
          <span className="cc-row cc-gap-6"><TI n="briefcase" size={14}/> Vereinsfunktionen</span>
          {canEdit && <button className="cc-btn-ghost" onClick={openFunkModal}><TI n="plus" size={13}/> Hinzufügen</button>}
        </div>
        {(raw.funktionen || []).length === 0 && (
          <div className="cc-text-sm cc-text-sub">Keine Vereinsfunktionen.</div>
        )}
        {(raw.funktionen || []).map((f, i) => {
          const funkObj = assignFunktionen.find(x => x.name === f);
          const gruppe = funkObj?.portal_gruppen?.name || null;
          return (
            <div key={i} className="cc-team-position-row">
              <div className="cc-list-item-icon"><TI n="briefcase" size={13}/></div>
              <div className="cc-team-position-body">
                <div className="cc-team-position-name">{f}</div>
                {gruppe && (
                  <div className="cc-team-position-chips">
                    <span
                      className="cc-funk-gruppe-badge"
                      style={funkObj?.portal_gruppen?.farbe ? {
                        background: funkObj.portal_gruppen.farbe + "20",
                        color: funkObj.portal_gruppen.farbe,
                        borderColor: funkObj.portal_gruppen.farbe + "40",
                      } : {}}
                    >{gruppe}</span>
                  </div>
                )}
              </div>
              {canEdit && (
                <DropMenu items={[
                  {label:"Entfernen", icon:"trash", danger:true, hidden:!canDelete, onClick:async()=>{
                    const next=(raw.funktionen||[]).filter(x=>x!==f);
                    await updateMitglied(sb,raw.id,{funktionen:next});
                    if(vereinId) logAktivitaet(sb,raw.id,vereinId,AKTIVITAET_TYP.FUNKTION_GEAENDERT,`Vereinsfunktion entfernt: ${f}`,"funktionen",f,account?.name||account?.email||"Administrator");
                    if(onReload) onReload();
                  }},
                ]}/>
              )}
            </div>
          );
        })}

      </Card>

      {/* Funktion hinzufügen Modal */}
      <ModalOrSheet open={showFunkAssign} onClose={() => setShowFunkAssign(false)} maxWidth={420}>
        <div className="cc-modal-hdr">
          <ModalTitle>Funktion hinzufügen</ModalTitle>
          <button className="cc-icon-btn" onClick={() => setShowFunkAssign(false)}><TI n="x" size={14}/></button>
        </div>
        <div className="cc-modal-body cc-col">
          <input
            className="cc-input"
            placeholder="Suchen…"
            value={funkSearch}
            onChange={e => setFunkSearch(e.target.value)}
            autoFocus
          />
          <div className="cc-list-scroll">
            {groups.map(g => (
              <div key={g}>
                <div className="cc-hk-sub-label">{g}</div>
                {filtered.filter(f => (f.portal_gruppen?.name || "Weitere") === g).map(f => {
                  const on = funkSelected.includes(f.name);
                  return (
                    <div
                      key={f.id}
                      className="cc-multiselect-item"
                      onClick={() => setFunkSelected(prev => on ? prev.filter(x => x !== f.name) : [...prev, f.name])}
                    >
                      <div className={on ? "cc-multiselect-cb-on" : "cc-multiselect-cb"}>
                        {on && <TI n="check" size={10} className="cc-check-icon"/>}
                      </div>
                      <span>{f.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="cc-modal-ftr">
          <Btn onClick={() => setShowFunkAssign(false)}>Abbrechen</Btn>
          <Btn variant="primary" onClick={saveFunktionen}>Speichern</Btn>
        </div>
      </ModalOrSheet>
    </>
  );
}

export { PersonFunktionen };
