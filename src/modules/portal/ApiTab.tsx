/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/ApiTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, Chip, Row, InfoBox } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { GN, R, RL, BL, AM, BK } from "../../constants.ts";
import { API_INFOS } from "./portalUtils.ts";
import { SfvZuordnung } from "./SfvZuordnung.tsx";
import { SfvSpielerZuordnung } from "./SfvSpielerZuordnung.tsx";
import { starteSync } from "../../domains/sfv/sfvService.ts";
import type { Mitglied, Sb, Team } from "../../types.ts";

/* Zeile aus api_verbindungen. Fehlt die Tabelle, baut der Tab aus
   API_INFOS Platzhalter derselben Form. */
export interface ApiVerbindung {
  key: string;
  label?: string | null;
  active?: boolean | null;
  konfiguriert?: boolean | null;
  sync_status?: string | null;
  letzter_sync?: string | null;
}

interface ApiTabProps {
  loading: boolean;
  isMobile: boolean;
  /* null = Kachel-Landingseite auf Mobile */
  mobileKachel: string | null;
  apiVerbindungen: ApiVerbindung[];
  tab: string;
  sb?: Sb;
  dbTeams?: Team[];
  setDbTeams?: ((f: (prev: Team[]) => Team[]) => void) | null;
  /* Fuer die Spieler-Warteschlange: welche SFV-personId gehoert zu welchem
     Mitglied. Einrichtung, kein Tagesgeschaeft — deshalb hier neben der
     Team-Zuordnung und nicht im Spielbetrieb. */
  vereinId?: string | null;
  benutzerId?: string | null;
  dbMitglieder?: Mitglied[];
}

export function ApiTab({loading,isMobile,mobileKachel,apiVerbindungen,tab,sb=null,dbTeams=[],setDbTeams,vereinId=null,benutzerId=null,dbMitglieder=[]}: ApiTabProps) {
  /* Welcher Anschluss ist gerade aufgeklappt. Nur Anzeigezustand, deshalb
     hier und nicht im Modul. */
  const [offen,setOffen]=useState<string|null>(null);
  /* Der Knopf "Sync starten" tat bis zum 20.08.2026 nichts (onClick={()=>{}}).
     Er laeuft ueber den Admin-JWT-Pfad der Edge Function: der ignoriert
     auto_sync und bearbeitet genau den eigenen Verein — so laesst sich ein
     Lauf gezielt ausloesen, waehrend der stuendliche Auftrag aus ist.
     Die Antwort wird ANGEZEIGT, nicht nur nach api_sync_log geschrieben. */
  const [laeuft,setLaeuft]=useState(false);
  const [ergebnis,setErgebnis]=useState<{ok: boolean; text: string}|null>(null);

  async function syncStarten(){
    if(!sb||laeuft) return;
    setLaeuft(true); setErgebnis(null);
    const {daten,fehler}=await starteSync(sb);
    setLaeuft(false);
    if(fehler){ setErgebnis({ok:false,text:fehler}); return; }
    setErgebnis({ok:true,text:JSON.stringify(daten,null,2)});
  }

  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&offen==="football_ch"&&(
        <SfvZuordnung sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} onZurueck={()=>setOffen(null)}/>
      )}

      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&offen==="sfv_spieler"&&(
        <SfvSpielerZuordnung sb={sb} vereinId={vereinId} benutzerId={benutzerId}
          dbMitglieder={dbMitglieder} dbTeams={dbTeams} onZurueck={()=>setOffen(null)}/>
      )}

      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&offen===null&&(
        <div>
          <InfoBox text="API-Keys werden aus Sicherheitsgründen nicht in der Datenbank gespeichert. Sie werden als Vercel Environment Variables konfiguriert." color={AM}/>
          {ergebnis&&(
            <>
              <div style={{height:12}}/>
              <Card>
                <div className="cc-section-title">
                  <TI n={ergebnis.ok?"check":"alert-circle"} size={14}/> Ergebnis des Laufs
                </div>
                <pre style={{fontSize:12,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,
                             color:ergebnis.ok?"var(--text)":"var(--danger,#ef4444)"}}>
                  {ergebnis.text}
                </pre>
              </Card>
            </>
          )}
          <div style={{height:16}}/>
          <div className="cc-grid-cards" style={{gap:14}}>
            {(apiVerbindungen.length>0?apiVerbindungen:Object.keys(API_INFOS).map((key): ApiVerbindung=>({key,label:key,active:false,konfiguriert:false,sync_status:"deaktiviert"}))).map(api=>{
              const info=API_INFOS[api.key];
              const statusColor=api.sync_status==="ok"?GN:api.sync_status==="fehler"?R:api.sync_status==="ausstehend"?AM:"#aaa";
              const statusBg=api.sync_status==="ok"?"#ECFDF5":api.sync_status==="fehler"?RL:api.sync_status==="ausstehend"?"#FFFBEB":"#f5f5f3";
              return(
                <Card key={api.key}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <Row>
                      <TI n="plug" style={{fontSize:18,color:api.active?BK:"#ccc"}}/>
                      <span style={{fontWeight:700,fontSize:14}}>{api.label||api.key}</span>
                    </Row>
                    <Chip text={api.sync_status||"deaktiviert"} color={statusColor} bg={statusBg}/>
                  </div>
                  <p style={{fontSize:14,color:"var(--sub)",margin:"0 0 10px",lineHeight:1.5}}>{info?.description||"Externe API-Verbindung"}</p>
                  {info?.felder&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,marginBottom:4}}>Synchronisierte Daten:</div>
                      {info.felder.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:"var(--sub)",padding:"2px 0"}}>
                          <TI n="check" style={{fontSize:14,color:api.active?GN:"#ccc"}}/>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {api.letzter_sync&&(
                    <div style={{fontSize:14,color:"var(--sub)",marginBottom:10}}>
                      Letzter Sync: {new Date(api.letzter_sync).toLocaleString("de-CH")}
                    </div>
                  )}
                  <Row align="flex-start">
                    {api.active&&api.key==="football_ch"
                      ?<Btn small variant="primary" color={BL} onClick={syncStarten} disabled={laeuft}>
                         {laeuft?"Läuft…":"Sync starten"}
                       </Btn>
                      :api.active&&<Btn small variant="primary" color={BL} onClick={()=>{}}>Sync starten</Btn>}
                    {api.key==="football_ch"
                      ?<>
                        <Btn small variant="outline" color="#888" onClick={()=>setOffen("football_ch")}>Teams zuordnen</Btn>
                        {/* Zwei Zuordnungen, zwei Ebenen: Mannschaften einmal
                            beim Einrichten, Spieler laufend beim ersten
                            Einsatz. */}
                        <Btn small variant="outline" color="#888" onClick={()=>setOffen("sfv_spieler")}>Spieler zuordnen</Btn>
                      </>
                      :<Btn small variant="outline" color="#888" onClick={()=>{}}>Konfigurieren</Btn>}
                  </Row>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: AUDIT-LOGS ── */}
    </div>
  );
}
