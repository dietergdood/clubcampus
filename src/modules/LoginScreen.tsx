/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/LoginScreen.tsx
   Login, Register, Reset Password
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { FONT, GB, ACCENT, GN } from "../constants.ts";
import { TI } from "../icons.tsx";
/* getVereinsnameStatic wurde bisher genutzt, aber nie importiert — der
   Fallback-Vereinsname lief in einen ReferenceError, sobald appTheme keinen
   Namen trug. */
import { getVereinsnameStatic } from "./NavigationModul.tsx";
import type { AppTheme, SbClient } from "../types.ts";

interface LoginScreenProps {
  onLogin: (session: Session) => void;
  sb: SbClient;
  appTheme?: AppTheme | null;
  vereinId?: string | null;
}

type Mode = "login" | "register" | "reset";

function LoginScreen({onLogin, sb, appTheme, vereinId}: LoginScreenProps){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [mode,setMode]=useState<Mode>("login");
  const [resetSent,setResetSent]=useState(false);
  const [regDone,setRegDone]=useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {data,error:err}=await sb.auth.signInWithPassword({email,password:pw});
      if(err) throw err;
      if(data.session) onLogin(data.session);
    }catch(err){
      const msg=err instanceof Error?err.message:"";
      setError(msg==="Invalid login credentials"?"E-Mail oder Passwort falsch.":msg||"Fehler beim Einloggen.");
    }
    setLoading(false);
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(pw!==pw2){ setError("Passwörter stimmen nicht überein."); return; }
    if(pw.length<6){ setError("Passwort muss mindestens 6 Zeichen haben."); return; }
    setLoading(true); setError("");
    try{
      const { data: rpcResult, error: rpcErr } = await (sb as any).rpc("check_email_bekannt", {
        p_email: email,
        p_verein_id: vereinId || "00000000-0000-0000-0000-000000000001",
      });
      if(rpcErr) console.error("[CC] check_email_bekannt fehlgeschlagen:", rpcErr);
      if(!rpcResult?.bekannt){
        setError("Diese E-Mail ist nicht im System hinterlegt. Bitte wende dich an deinen Verein.");
        setLoading(false);
        return;
      }
      /* ⚠ KEIN NAME MEHR IM AUFRUF, und das ist keine Einbusse, sondern
         eine Verbesserung. `check_email_bekannt` gibt seit dem 23.08.2026 nur
         noch `{bekannt}` zurueck — sie ist fuer `anon` freigegeben und nannte
         vorher Namen und `person_id` an jeden, der den oeffentlichen
         Schluessel hat.

         Ohne `options.data.name` greift in `handle_new_user()` der zweite
         Zweig des COALESCE und nimmt `vorname || ' ' || nachname` aus
         `personen` — den ECHTEN Namen. Der Rueckfall auf
         `email.split("@")[0]` haette aus „Trainer Zugang" ein
         „dieter.good+trainer" gemacht, weil der Trigger
         `raw_user_meta_data->>'name'` ZUERST liest. Weniger mitschicken
         ergibt hier das bessere Ergebnis. */
      const {data,error:err}=await sb.auth.signUp({email, password:pw});
      if(err) throw err;
      if(data.session){ onLogin(data.session); } else { setRegDone(true); }
    }catch(err){
      const msg = err instanceof Error ? err.message : "";
      const deutsch = msg === "User already registered"
        ? "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an."
        : msg === "Password should be at least 6 characters"
        ? "Passwort muss mindestens 6 Zeichen haben."
        : msg || "Fehler bei der Registrierung.";
      setError(deutsch);
    }
    setLoading(false);
  }

  async function handleReset(e: FormEvent<HTMLFormElement>){
    e.preventDefault();
    setLoading(true); setError("");
    try{
      const {error:err}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
      if(err) throw err;
      setResetSent(true);
    }catch(err){ setError(err instanceof Error?err.message:"Fehler beim Senden."); }
    setLoading(false);
  }

  const S_INPUT: CSSProperties={width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+GB,fontSize:14,outline:"none",boxSizing:"border-box",background:"var(--surface2)",color:"var(--text)"};
  const S_LABEL: CSSProperties={fontSize:14,fontWeight:600,color:"var(--sub)",display:"block",marginBottom:5};

  return(
    <div style={{minHeight:"100dvh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,WebkitFontSmoothing:"antialiased",color:"var(--text)"}}>
      <div style={{width:"100%",maxWidth:400,padding:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:16,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,overflow:"hidden"}}>
            <img src={appTheme?.logo||'/logo.png'} style={{width:64,height:64,objectFit:"cover"}} alt="Logo"/>
          </div>
          <div style={{fontWeight:800,fontSize:21,color:"var(--text)",marginTop:4}}>{appTheme?.vereinsname||getVereinsnameStatic()}</div>
          <div style={{fontSize:14,color:"var(--sub)",marginTop:3,fontWeight:600}}>ClubCampus</div>
        </div>
        <div style={{background:"var(--surface)",borderRadius:16,padding:28,boxShadow:"var(--card-shadow)",border:"1px solid var(--border)"}}>

          {/* LOGIN */}
          {mode==="login"&&(
            <>
              <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>Anmelden</div>
              <form onSubmit={handleLogin}>
                <div style={{marginBottom:14}}>
                  <label style={S_LABEL}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={S_INPUT} placeholder="name@mail.ch" autoComplete="email"/>
                </div>
                <div className="cc-mb-20">
                  <label style={S_LABEL}>Passwort</label>
                  <div style={{position:"relative"}}>
                    <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} required
                      style={{...S_INPUT,paddingRight:40}} placeholder="••••••••" autoComplete="current-password"/>
                    <button type="button" onClick={()=>setShowPw(p=>!p)}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--sub)",padding:4,display:"flex",alignItems:"center"}}>
                      <TI n={showPw?"eye-off":"eye"} size={16}/>
                    </button>
                  </div>
                </div>
                {error&&<div style={{fontSize:14,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
                  {loading?"Wird angemeldet…":"Anmelden"}
                </button>
              </form>
              <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
                <button onClick={()=>{setMode("reset");setError("");}}
                  style={{background:"none",border:"none",color:"var(--sub)",fontSize:14,cursor:"pointer"}}>
                  Passwort vergessen?
                </button>
                <div style={{width:"100%",height:"0.5px",background:"var(--border)"}}/>
                <div className="cc-text-sm">Noch kein Konto?</div>
                <button onClick={()=>{setMode("register");setError("");setPw("");}}
                  style={{width:"100%",padding:"10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                  Registrieren
                </button>
              </div>
            </>
          )}

          {/* REGISTRIEREN */}
          {mode==="register"&&!regDone&&(
            <>
              <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Konto erstellen</div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:20,lineHeight:1.5}}>
                Verwende die E-Mail-Adresse die der Verein bei dir hinterlegt hat. Nur bekannte E-Mail-Adressen können sich registrieren.
              </div>
              <form onSubmit={handleRegister}>
                <div style={{marginBottom:14}}>
                  <label style={S_LABEL}>E-Mail</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={S_INPUT} placeholder="name@mail.ch" autoComplete="email"/>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={S_LABEL}>Passwort</label>
                  <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required style={S_INPUT} placeholder="Mindestens 6 Zeichen" autoComplete="new-password"/>
                </div>
                <div className="cc-mb-20">
                  <label style={S_LABEL}>Passwort bestätigen</label>
                  <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} required style={S_INPUT} placeholder="••••••••" autoComplete="new-password"/>
                </div>
                {error&&<div style={{fontSize:14,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
                  {loading?"Wird registriert…":"Konto erstellen"}
                </button>
              </form>
              <button onClick={()=>{setMode("login");setError("");setPw("");setPw2("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"var(--sub)",fontSize:14,cursor:"pointer",textAlign:"center"}}>
                ← Zurück zum Login
              </button>
            </>
          )}

          {/* REGISTRIERUNG ERFOLGREICH */}
          {mode==="register"&&regDone&&(
            <div style={{textAlign:"center",padding:"8px 0"}}>
              <div style={{fontSize:40,marginBottom:16}}>📧</div>
              <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Fast geschafft!</div>
              <div style={{fontSize:14,color:"var(--sub)",lineHeight:1.6,marginBottom:20}}>
                Bestätigungs-E-Mail an <strong>{email}</strong> gesendet. Klicke auf den Link um dein Konto zu aktivieren.
              </div>
              <button onClick={()=>{setMode("login");setRegDone(false);setPw("");setPw2("");}}
                style={{width:"100%",padding:"10px",borderRadius:8,border:"0.5px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                Zum Login
              </button>
            </div>
          )}

          {/* PASSWORT RESET */}
          {mode==="reset"&&(
            <>
              <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Passwort zurücksetzen</div>
              <div style={{fontSize:14,color:"var(--sub)",marginBottom:20}}>Wir senden dir einen Link per E-Mail.</div>
              {resetSent?(
                <div style={{fontSize:14,color:GN,background:"#ECFDF5",padding:"12px",borderRadius:8,textAlign:"center"}}>
                  E-Mail gesendet! Bitte prüfe dein Postfach.
                </div>
              ):(
                <form onSubmit={handleReset}>
                  <div style={{marginBottom:14}}>
                    <label style={S_LABEL}>E-Mail</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={S_INPUT} placeholder="name@mail.ch"/>
                  </div>
                  {error&&<div style={{fontSize:14,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
                  <button type="submit" disabled={loading}
                    style={{width:"100%",padding:"8px 14px",borderRadius:8,border:"none",background:ACCENT,color:"var(--text)",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                    {loading?"Wird gesendet…":"Link senden"}
                  </button>
                </form>
              )}
              <button onClick={()=>{setMode("login");setResetSent(false);setError("");}}
                style={{marginTop:14,width:"100%",background:"none",border:"none",color:"var(--sub)",fontSize:14,cursor:"pointer",textAlign:"center"}}>
                ← Zurück zum Login
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}


export { LoginScreen };
