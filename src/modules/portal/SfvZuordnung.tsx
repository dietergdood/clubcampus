/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/SfvZuordnung.tsx
   Ordnet die Teams des SFV den Teams von ClubCampus zu.

   Einmalige Einrichtung, kein Tagesgeschäft. Ohne sie steht jedes
   geholte Spiel ohne Team da.

   Über den Namen geht die Zuordnung nicht: von den 21 SFV-Teams des
   FCH heissen fünf „FC Herrliberg a" und drei „Team Herrliberg-
   Küsnacht". Eindeutig ist allein die teamId — deshalb wird
   vorgeschlagen, aber nie automatisch gesetzt.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { Btn, Card, Chip } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { FONT, GN } from "../../constants.ts";
import { fetchSfvTeams, setzeTeamZuordnung, baueZuordnung, auswahlFuer } from "../../domains/sfv/sfvService.ts";
import type { SfvTeam, Zuordnung } from "../../domains/sfv/sfvService.ts";
import type { Sb, Team } from "../../types.ts";

interface SfvZuordnungProps {
  sb: Sb;
  dbTeams: Team[];
  setDbTeams?: ((f: (prev: Team[]) => Team[]) => void) | null;
  onZurueck: () => void;
}

export function SfvZuordnung({sb,dbTeams,setDbTeams,onZurueck}: SfvZuordnungProps) {
  /* Nach dem Muster von PortalverwaltungModul: die Prop füllt den lokalen
     Stand, gerendert wird der lokale. */
  const [teams,setTeams]=useState<Team[]>(dbTeams);
  useEffect(()=>{if(dbTeams.length>0)setTeams(dbTeams);},[dbTeams]);

  const [sfvTeams,setSfvTeams]=useState<SfvTeam[]>([]);
  const [saison,setSaison]=useState<string>("");
  const [laedt,setLaedt]=useState(true);
  const [fehler,setFehler]=useState<string|null>(null);
  const [speichert,setSpeichert]=useState<number|null>(null);

  useEffect(()=>{
    let abgebrochen=false;
    (async()=>{
      setLaedt(true);setFehler(null);
      const {daten,fehler:f}=await fetchSfvTeams(sb);
      if(abgebrochen)return;
      if(f){setFehler(f);setLaedt(false);return;}
      setSfvTeams(daten?.teams||[]);
      setSaison(daten?.saison?.name||"");
      setLaedt(false);
    })();
    return()=>{abgebrochen=true;};
  },[sb]);

  const zuordnung: Zuordnung = baueZuordnung(sfvTeams,teams);

  async function waehle(sfv: SfvTeam, teamId: number|null) {
    setSpeichert(sfv.sfv_team_id);setFehler(null);
    const bisher=zuordnung.zeilen.find(z=>z.sfv.sfv_team_id===sfv.sfv_team_id)?.team||null;

    /* Erst die alte Zuordnung lösen, sonst greift teams_verein_sfv_team_key:
       dieselbe SFV-Id darf nicht an zwei Teams hängen. */
    if(bisher&&bisher.id!==teamId){
      const f=await setzeTeamZuordnung(sb,bisher.id,null);
      if(f){setFehler(f);setSpeichert(null);return;}
      anwenden(bisher.id,null);
    }
    if(teamId!=null){
      const f=await setzeTeamZuordnung(sb,teamId,sfv);
      if(f){setFehler(f);setSpeichert(null);return;}
      anwenden(teamId,sfv);
    }
    setSpeichert(null);
  }

  function anwenden(teamId: number, sfv: SfvTeam|null) {
    const felder=sfv
      ?{sfv_team_id:sfv.sfv_team_id,sfv_liga_id:sfv.liga_id,sfv_liga_name:sfv.liga_name,sfv_division:sfv.division}
      :{sfv_team_id:null,sfv_liga_id:null,sfv_liga_name:null,sfv_division:null};
    const abbilden=(prev: Team[])=>prev.map(t=>t.id===teamId?{...t,...felder}:t);
    setTeams(abbilden);
    if(setDbTeams)setDbTeams(abbilden);
  }

  const zugeordnet=zuordnung.zeilen.filter(z=>z.team).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Btn small variant="outline" color="#888" onClick={onZurueck}>
          <TI n="arrow-left" size={14}/> Zurück
        </Btn>
        <div className="cc-section-title" style={{margin:0}}>
          <TI n="link" size={14}/> Team-Zuordnung Football.ch
        </div>
        {saison&&<Chip text={`Saison ${saison}`} color="var(--sub)" bg="var(--surface2)"/>}
      </div>

      <Card>
        <p style={{fontSize:14,color:"var(--sub)",margin:"0 0 12px",lineHeight:1.5}}>
          Links die Teams, die der SFV für diese Saison führt, rechts das Team in ClubCampus.
          Die Zuordnung gilt über Saisons hinweg — sie ist nur nötig, wenn ein Team neu dazukommt
          oder eine neue SFV-Nummer bekommt.
        </p>

        {laedt&&<div className="cc-empty">Teams werden beim SFV abgefragt …</div>}

        {fehler&&(
          <div className="cc-hint-box" style={{marginBottom:12}}>
            <TI n="alert-triangle" size={14}/> {fehler}
          </div>
        )}

        {!laedt&&!fehler&&sfvTeams.length===0&&(
          <div className="cc-empty">Der SFV führt für diese Saison keine Teams zu dieser ClubID.</div>
        )}

        {!laedt&&sfvTeams.length>0&&(
          <>
            <div style={{fontSize:13,color:"var(--sub)",marginBottom:8}}>
              {zugeordnet} von {sfvTeams.length} zugeordnet
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <th className="cc-th" style={{textAlign:"left"}}>SFV-Team</th>
                <th className="cc-th" style={{textAlign:"left"}}>Liga</th>
                <th className="cc-th" style={{textAlign:"left"}}>Team in ClubCampus</th>
                <th className="cc-th cc-th-center">Status</th>
              </tr></thead>
              <tbody>
                {zuordnung.zeilen.map(({sfv,team})=>(
                  <tr key={sfv.sfv_team_id} className="cc-tr">
                    <td className="cc-td" style={{fontWeight:500}}>
                      {sfv.name}
                      <div style={{fontSize:11,color:"var(--sub)"}}>Nr. {sfv.sfv_team_id}</div>
                    </td>
                    <td className="cc-td">
                      {sfv.liga_name}
                      {sfv.division&&sfv.division!=="-"&&(
                        <div style={{fontSize:11,color:"var(--sub)"}}>{sfv.division}</div>
                      )}
                    </td>
                    <td className="cc-td">
                      <select
                        value={team?.id??""}
                        disabled={speichert!==null}
                        onChange={e=>waehle(sfv,e.target.value?Number(e.target.value):null)}
                        style={{width:"100%",padding:"5px 8px",borderRadius:8,border:"1px solid var(--border)",
                                background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:FONT}}>
                        <option value="">— nicht zugeordnet —</option>
                        {auswahlFuer(zuordnung,sfv.sfv_team_id).map(t=>(
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="cc-td" style={{textAlign:"center"}}>
                      {speichert===sfv.sfv_team_id
                        ?<span style={{fontSize:11,color:"var(--sub)"}}>speichert …</span>
                        :team
                          ?<TI n="check" size={16} style={{color:GN}}/>
                          :<span style={{fontSize:11,color:"var(--sub)"}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {zuordnung.veraltet.length>0&&(
              <div className="cc-hint-box" style={{marginTop:12}}>
                <TI n="alert-triangle" size={14}/>{" "}
                {zuordnung.veraltet.length} Team(s) tragen eine SFV-Nummer, die es in dieser Saison
                nicht mehr gibt: {zuordnung.veraltet.map(t=>t.name).join(", ")}. Sie stehen oben nicht
                zur Auswahl, bis die alte Zuordnung gelöst ist.
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
