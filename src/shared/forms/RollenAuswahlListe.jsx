/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/forms/RollenAuswahlListe.jsx
   Shared Rollenauswahl mit Suche + Checkboxen
   ═══════════════════════════════════════════════════════════════ */
import { TI } from "../../icons.jsx";

export function RollenAuswahlListe({rollen=[], selected=[], onChange, search="", onSearchChange}){
  function toggle(name){
    onChange(selected.includes(name)?selected.filter(x=>x!==name):[...selected,name]);
  }
  const filtered=search?rollen.filter(r=>r.name.toLowerCase().includes(search.toLowerCase())):rollen;
  return(
    <div>
      <div className="cc-search-input-wrap">
        <span className="cc-search-input-icon"><TI n="search" size={14}/></span>
        <input className="cc-search-input" placeholder="Suchen…" value={search} onChange={e=>onSearchChange(e.target.value)}/>
      </div>
      <div className="cc-role-list-wrap">
        {filtered.map(r=>{
          const sel=selected.includes(r.name);
          return(
            <div key={r.name} className={`cc-role-list-item${sel?" cc-role-list-item-selected":""}`} onClick={()=>toggle(r.name)}>
              <div className={sel?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                {sel&&<TI n="check" size={10} className="cc-check-icon"/>}
              </div>
              <span className="cc-role-name">{r.name}</span>
              {r.ist_trainer&&<span className="cc-trainer-badge">Trainer</span>}
            </div>
          );
        })}
      </div>
      {selected.length>0&&(
        <div className="cc-role-list-footer">
          <span>{selected.length} ausgewählt</span>
          <button className="cc-role-list-clear" onClick={()=>onChange([])}>Alle entfernen</button>
        </div>
      )}
    </div>
  );
}

