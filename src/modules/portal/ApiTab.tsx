/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/ApiTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { Btn, Card, Chip, Row, InfoBox } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { GN, R, RL, BL, AM, BK } from "../../constants.ts";
import { API_INFOS } from "./portalUtils.ts";

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
}

export function ApiTab({loading,isMobile,mobileKachel,apiVerbindungen,tab}: ApiTabProps) {
  return (
    <div style={{display:'contents'}}>
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&(
        <div>
          <InfoBox text="API-Keys werden aus Sicherheitsgründen nicht in der Datenbank gespeichert. Sie werden als Vercel Environment Variables konfiguriert." color={AM}/>
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
                    {api.active&&<Btn small variant="primary" color={BL} onClick={()=>{}}>Sync starten</Btn>}
                    <Btn small variant="outline" color="#888" onClick={()=>{}}>Konfigurieren</Btn>
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
