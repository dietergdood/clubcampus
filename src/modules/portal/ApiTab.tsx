/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/ApiTab.tsx
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, Chip, Row, InfoBox, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { GN, R, RL, BL, AM, BK } from "../../constants.ts";
import { API_INFOS, hostVon, zielAusLauf, hatLaufProtokolliert } from "./portalUtils.ts";
import type { SyncLogZeile } from "./portalUtils.ts";
import { SfvZuordnung } from "./SfvZuordnung.tsx";
import { SfvSpielerZuordnung } from "./SfvSpielerZuordnung.tsx";
import { starteSync, holeVorschau, holeRohschluessel } from "../../domains/sfv/sfvService.ts";
import { starteWpExport, fasseExportZusammen, holeEmpfaengerStatus } from "../../domains/spiele/wpExportService.ts";
import type { Mitglied, Sb, Team } from "../../types.ts";

/* Zeile aus api_verbindungen. Fehlt die Tabelle, baut der Tab aus
   API_INFOS Platzhalter derselben Form. */
export interface ApiVerbindung {
  /** Primärschlüssel — die Protokollzeilen hängen daran (`verbindung_id`). */
  id?: string | null;
  key: string;
  label?: string | null;
  active?: boolean | null;
  konfiguriert?: boolean | null;
  sync_status?: string | null;
  letzter_sync?: string | null;
  /**
   * Die konfigurierte Zieladresse — oder `null`.
   *
   * ⚠ `null` IST EINE AUSSAGE UND KEIN FEHLEN. Beim WordPress-Export steht
   * die Adresse absichtlich nur im Secret (`WP_BASIS_URL`), damit ein Wechsel
   * dev → Produktion EIN Befehl ist und nicht zwei Orte, die auseinander
   * laufen können. Die Kachel zeigt die Zeile deshalb auch dann, wenn nichts
   * darin steht — sie sagt dann, dass nichts darin steht.
   */
  api_url?: string | null;
  /**
   * Was der letzte Lauf gemeldet hat.
   *
   * ⚠ Wurde bis zum 07.09.2026 geschrieben und NIRGENDS gerendert — die
   * Spalte hatte keinen Leser. Sie ist die einzige Stelle, an der der
   * tatsächliche Ziel-Host steht (der Export stellt ihn seiner Meldung
   * voran): **Konfiguration kann veralten, eine Beobachtung nicht.**
   */
  sync_meldung?: string | null;
  /**
   * Wann der Sync-Waechter zuletzt geprueft hat (cron: sync-waechter-stuendlich).
   *
   * ⚠ Der Leser dieser Spalte — sie steht nur hier. Ein Waechter, der
   * ausfaellt, schweigt, und Schweigen ist von Zufriedenheit nicht zu
   * unterscheiden. Dieser Zeitstempel macht seinen Ausfall wenigstens
   * SICHTBAR, sobald jemand hinschaut. Er loest es nicht — dafuer gibt es
   * den Totmannschalter bei healthchecks.io (cron_sync_waechter.sql).
   */
  wache_zuletzt?: string | null;
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
  /* Nach einem Lauf von Hand muss die Kachel neu geladen werden — sonst
     zeigt "Letzter Sync" weiter den Stand vom Oeffnen des Tabs. Die Zeile
     wird von der Edge Function geschrieben (index.ts, beide Pfade), nicht
     von hier; nur gelesen wird sie zu selten. */
  onReload?: (() => void | Promise<void>) | null;
  vereinId?: string | null;
  benutzerId?: string | null;
  dbMitglieder?: Mitglied[];
  /**
   * Die letzten Protokollzeilen — daraus kommt, WOHIN zuletzt geschrieben
   * wurde. ⚠ Das Modul lädt sie ohnehin für den Audit-Tab; sie kamen nur
   * nie hier an, und deshalb zeigte die Kachel stattdessen `api_url`.
   */
  syncLogs?: SyncLogZeile[];
}

export function ApiTab({loading,isMobile,mobileKachel,apiVerbindungen,tab,sb=null,dbTeams=[],setDbTeams,onReload=null,vereinId=null,benutzerId=null,dbMitglieder=[],syncLogs=[]}: ApiTabProps) {
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
  const [confirm,confirmDialog]=useConfirm();
  /* ⚠ Zwei Auskunfts-Knoepfe, seit 11.09.2026. Gemessen: `supabase` liegt
     NICHT am Fensterobjekt, und die Edge Functions verlangen einen
     angemeldeten Administrator. Ohne diese Knoepfe gibt es zu `probe` und
     `rohschluessel` ueberhaupt keinen Weg — es geht nicht um Bequemlichkeit.

     ⚠ `export` bekommt hier KEINEN zweiten Weg: er ist der einzige Aufruf,
     der auf der oeffentlichen Website schreibt, und steht bereits als
     eigener, abgesetzter Knopf mit Zielangabe da. Ein zweiter Weg dorthin
     waere ein Weg zu wenig Nachdenken. */
  const [auskunft,setAuskunft]=useState<{titel: string; zeilen: string[]; fehler?: boolean}|null>(null);
  const [auskunftLaeuft,setAuskunftLaeuft]=useState<string|null>(null);

  /** Was vom Lauf angezeigt wird — aufgezaehlt, nicht ausgeschlossen. */
  function fasseZusammen(daten: unknown): string {
    const laeufe = (daten as {laeufe?: Record<string, unknown>[]})?.laeufe;
    if (!Array.isArray(laeufe)) return "Lauf beendet.";
    const ERLAUBT = ["status", "meldung"] as const;
    /* Mit " / " verbunden statt mit einem Zeilenumbruch: die Meldung steht
       einzeilig unter der Kachel, und mehr als einen Lauf je Verein gibt es
       ohnehin selten. */
    return laeufe
      .map(l => ERLAUBT.map(k => l[k]).filter(Boolean).join(" · ") || "Lauf beendet.")
      .join(" / ");
  }

  /* ⚠ NEBEN DEN ZAHLEN STEHT, WAS SIE BEDEUTEN. Ein Kasten mit zwoelf
     Zahlen ist eine Tabelle, die niemand liest — und dann haette der Knopf
     nichts gespart. Die Deutung ist die halbe Auskunft. */
  function deuteVorschau(z: Record<string, unknown>): string[] {
    const n=(k: string)=>Number(z[k]??0);
    /* ⚠ ⚠  JEDE ZAHL STEHT DA, AUCH WENN SIE NULL IST — berichtigt am
       11.09.2026 auf Didis Einwand.

       Bis dahin erschienen `zaehlung_stimmt` und
       `wechsel_ohne_ersatzkennung` NUR im schlechten Fall. Ihre
       Abwesenheit hiess „alles gut" — und genau diese Lesart ist heute
       Morgen schon einmal schiefgegangen, als ich aus einer fehlenden
       Protokollzeile auf gescheiterte Laeufe geschlossen habe.

       > Eine Zahl, deren Fehlen etwas bedeuten soll, ist keine Auskunft.

       Eine Zeile mehr kostet nichts; eine Abwesenheit, die gedeutet
       werden muss, kostet eine Rueckfrage. */
    const zeilen: string[]=[
      `${n("spiele_gebaut")} von ${n("spiele_gesamt")} Spielen gebaut, ${n("verlauf_zeilen")} Verlaufszeilen`,
      `Aufteilung stimmt: ${z.zaehlung_stimmt===true?"ja":z.zaehlung_stimmt===false?"NEIN":"unbekannt"}`,
      `Namen: ${n("zeilen_mit_eigenem_namen")} eigene · ${n("zeilen_mit_sfv_namen")} vom Verband · ${n("zeilen_mit_rueckennummer")} nur Nummer`,
      /* ⚠ Der zweite Mensch einer Wechselzeile — er steht AUSSERHALB der
         Aufteilung und fehlte bis heute ganz. Ohne ihn ist „207 ohne
         Namen" gegen nichts zu halten. */
      `Wechsel, zweiter Spieler: ${n("zeilen_mit_zweitem_namen")} mit Namen · `
        +`${n("wechsel_ohne_ersatzname")} ohne Namen · ${n("wechsel_ohne_ersatzkennung")} ohne Kennung`,
    ];
    if(z.zaehlung_stimmt===false){
      zeilen.push("⚠ Die Aufteilung geht nicht auf — die Zahlen sind unbrauchbar.");
    }
    /* Und die Wege, die daraus folgen — nur wenn sie gebraucht werden. */
    if(n("wechsel_ohne_ersatzkennung")>0){
      zeilen.push('→ Wechsel ohne Kennung: Aktion „wechselnachtrag" holt sie nach');
    }
    if(n("wechsel_ohne_ersatzname")>0){
      zeilen.push('→ Wechsel ohne Namen: „Namen holen" in der Maske „Spieler zuordnen"');
    }
    if(n("cup_ohne_runde")>0){
      zeilen.push(`${n("cup_ohne_runde")} Cupspiele ohne Runde — der Verband nennt keine`);
    }
    if(n("ohne_liga")>0){
      zeilen.push(`⚠ ${n("ohne_liga")} Spiele ohne Liga — dann fehlt drüben die Wettbewerbsbezeichnung`);
    }
    zeilen.push(`${n("gegner_teams_verschieden")} verschiedene Gegner-Mannschaften (Teams, nicht Vereine)`);
    return zeilen;
  }

  /* ⚠ Die Auskunft ueber die GEGENSTELLE, nicht ueber unsere Daten.
     Deutet wird sie nur an einer Stelle: ob ACF jedes Feld kennt. Alles
     andere steht roh da — wer antwortet, mit welcher Fassung, gegen
     welchen Schluessel. Genau die vier Angaben, die am 09.09.2026 drei
     Anlaeufe gekostet haben. */
  function deuteEmpfaenger(d: Record<string, unknown>): string[] {
    const sf=(d.spielfelder??{}) as Record<string,string>;
    const ohneFeld=Object.entries(sf).filter(([,v])=>v!=="feld");
    const zeilen=[
      `${String(d.empfaenger??"?")} · Fassung ${String(d.version??"?")} · bereit: ${d.bereit===true?"ja":"NEIN"}`,
      `Sucht Teams über: ${String(d.meta_schluessel??"?")}`,
      `WordPress: ${Number(d.wp_teams??0)} Team-Beiträge, davon ${Number(d.wp_teams_mit_sfv_id??0)} mit SFV-Nummer`
        +`${Number(d.wp_teams_sfv_id_doppelt??0)?` · ⚠ ${Number(d.wp_teams_sfv_id_doppelt)} doppelt`:""}`,
      `${Number(d.spiele_gesamt??0)} Spiel-Beiträge, ${Number(d.spiele_abgleich??0)} davon vom Abgleich`,
    ];
    if(Array.isArray(d.fehlt)&&d.fehlt.length){
      zeilen.push(`⚠ Voraussetzungen fehlen: ${(d.fehlt as string[]).join(", ")}`);
    }
    /* ⚠ Beide Richtungen: „alle bekannt" gehoert genauso hin wie eine
       Fehlliste. Eine Zeile, die nur im schlechten Fall erscheint, laesst
       ihr Fehlen deuten — und genau das ist heute dreimal schiefgegangen. */
    zeilen.push(ohneFeld.length
      ? `⚠ ACF kennt diese Feldnamen am fch_spiel NICHT: `
        +ohneFeld.map(([k,v])=>`${k} (${v})`).join(", ")
        +" — dorthin wird ins Leere geschrieben"
      : `ACF kennt alle ${Object.keys(sf).length} Feldnamen am fch_spiel`);
    return zeilen;
  }

  async function auskunftHolen(was: "vorschau"|"rohschluessel"|"empfaenger"){
    if(!sb||auskunftLaeuft) return;
    setAuskunftLaeuft(was); setAuskunft(null);
    const {daten,fehler}= was==="vorschau" ? await holeVorschau(sb)
      : was==="empfaenger" ? await holeEmpfaengerStatus(sb)
      : await holeRohschluessel(sb);
    setAuskunftLaeuft(null);
    if(fehler||!daten){
      const t= was==="vorschau"?"Vorschau":was==="empfaenger"?"Empfänger":"Rohschlüssel";
      setAuskunft({titel:t, zeilen:[fehler??"Keine Antwort"], fehler:true});
      return;
    }
    if(was==="vorschau"){
      const z=(daten.zusammenfassung??{}) as Record<string, unknown>;
      setAuskunft({titel:"Vorschau", zeilen: deuteVorschau(z)});
      return;
    }
    if(was==="empfaenger"){
      setAuskunft({titel:"Empfänger", zeilen: deuteEmpfaenger(daten)});
      return;
    }
    /* ⚠ Rohschluessel UNGEDEUTET anzeigen — das Filtern hat den Befund
       erzeugt, der damit gerade ueberprueft wird.

       ⚠ UND `nicht_ueberall` GEHOERT DAZU. Sie fehlte bis zum
       11.09.2026 in der Anzeige, obwohl sie in der Antwort stand — zum
       dritten Mal an einem Tag dieselbe Luecke: berechnet, geliefert,
       nicht gezeigt. Sie ist der GRUND fuer die Doppelmessung: ein Feld,
       das nur manche Objekte tragen, faellt durch eine Stichprobe von
       einem. Ohne sie ist die Probe schwaecher als geplant. */
    const teil = (t: {anzahl?: number; alle?: string[]; nicht_ueberall?: string[]} | undefined,
                  was: string): string[] => {
      const alle = t?.alle ?? [];
      const nur = t?.nicht_ueberall ?? [];
      return [
        `${was} (${t?.anzahl ?? 0} Objekte): ${alle.join(", ") || "(leer)"}`,
        nur.length
          ? `⚠ ${was}, nicht in jedem Objekt: ${nur.join(", ")}`
          : `${was}: alle Objekte tragen dieselben Schlüssel`,
      ];
    };
    /* ⚠ Die Bank steht dabei, auch wenn sie fehlschlaegt — ein 404 heisst
       „diesen Endpunkt gibt es nicht", ein Netzfehler etwas ganz anderes,
       und als leere Zeile saehen beide gleich aus. */
    const bank = daten.bank as {alle?: string[]; anzahl?: number} | null;
    const bankZeile = daten.bank_fehler
      ? `⚠ Bank (Spiel ${daten.bank_spiel}): ${daten.bank_fehler}`
      : bank
        ? `Bank (Spiel ${daten.bank_spiel}, ${bank.anzahl ?? 0} Objekte): `
          +`${(bank.alle ?? []).join(", ") || "(leer)"}`
        : "Bank: nicht abgefragt — kein Spiel mit Matchnummer gefunden";
    setAuskunft({titel:"Rohschlüssel", zeilen:[
      ...teil(daten.team_liste as never, "Teamliste"),
      ...teil(daten.spielplan as never, "Spielplan"),
      bankZeile,
      String(daten.bildfeld_team??""),
      String(daten.bildfeld_spielplan??""),
    ].filter(Boolean)});
  }

  async function syncStarten(){
    if(!sb||laeuft) return;
    setLaeuft(true); setErgebnis(null);
    const {daten,fehler}=await starteSync(sb);
    setLaeuft(false);
    if(fehler){ setErgebnis({ok:false,text:fehler}); return; }
    /* ⚠ KEIN rohes JSON.stringify. Der Lauf trug vom 21. bis 22.08.2026
       die Klarnamen offener Spieler in seiner Antwort — in einem rohen
       Abzug stuenden sie damit auf dem Schirm und in jedem Screenshot.
       Sie sind inzwischen ganz aus dem Lauf-Ergebnis verschwunden.

       Deshalb eine ALLOWLIST: aufgezaehlt wird, was angezeigt wird. Ein
       neues Feld der Antwort ist damit im Zweifel unsichtbar und faellt auf,
       statt still mitzureisen — dieselbe Regel wie bei der SFV-Schwaerzung
       (CLAUDE.md → Fremddaten). */
    setErgebnis({ok:true,text:fasseZusammen(daten)});
    /* Erst jetzt neu laden: letzter_sync, sync_status und sync_meldung
       stehen danach in der Kachel, statt den Stand vom Oeffnen zu zeigen. */
    if(onReload) await onReload();
  }

  /**
   * Den WordPress-Export von Hand auslösen — ab Etappe 5 (09.09.2026).
   *
   * ⚠ MIT RÜCKFRAGE, und die Rückfrage sagt, WOHIN geschrieben wird.
   *   Der Knopf ist der einzige im Portal, der auf eine öffentliche
   *   Website schreibt; die Adresse steht im Secret und ist von hier aus
   *   nicht lesbar. Deshalb nennt die Rückfrage den Host, den der letzte
   *   Lauf protokolliert hat — eine Beobachtung, keine Behauptung. Ist
   *   noch keiner gelaufen, sagt sie genau das.
   */
  async function exportStarten(zielHost: string|null){
    if(!sb||laeuft) return;
    const wohin=zielHost
      ? `Geschrieben wird nach ${zielHost} — das ist der Host des letzten Laufs.`
      : "Wohin geschrieben wird, steht im Secret WP_BASIS_URL; "
        +"es ist noch kein Lauf protokolliert, an dem man es ablesen könnte.";
    const ja=await confirm({
      title:"Spielplan auf die Website schreiben?",
      /* ⚠ Ohne Zeilenumbrüche: der Dialog rendert den Text ohne
         `white-space`, ein \n würde zu einem Leerzeichen. */
      message:"Alle Mannschaften mit Spielen gehen hinaus — Spielplan, Resultate "
        +"und Verlauf. Beiträge werden angelegt, aktualisiert oder auf Entwurf "
        +`gesetzt. ${wohin}`,
      danger:true,
      confirmLabel:"Jetzt schreiben",
    });
    if(!ja) return;
    setLaeuft(true); setErgebnis(null);
    const {daten,fehler}=await starteWpExport(sb);
    setLaeuft(false);
    if(fehler){ setErgebnis({ok:false,text:fehler}); return; }
    /* Dieselbe Regel wie oben: eine Allowlist, kein roher Abzug. */
    setErgebnis({ok:daten?.status!=="fehler",text:fasseExportZusammen(daten)});
    if(onReload) await onReload();
  }

  return (
    <div style={{display:'contents'}}>
      {confirmDialog}
      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&offen==="football_ch"&&(
        <SfvZuordnung sb={sb} dbTeams={dbTeams} setDbTeams={setDbTeams} onZurueck={()=>setOffen(null)}/>
      )}

      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&offen==="sfv_spieler"&&(
        <SfvSpielerZuordnung sb={sb} vereinId={vereinId} benutzerId={benutzerId}
          dbMitglieder={dbMitglieder} dbTeams={dbTeams} onZurueck={()=>setOffen(null)}/>
      )}

      {!loading&&(!isMobile||mobileKachel!==null)&&tab==="api"&&offen===null&&(
        <div>
          <InfoBox text="Zugangsdaten stehen nicht in der Datenbank, sondern in den Supabase-Secrets der Edge Function (npx supabase secrets set). Die Adresse steht je nach Anschluss in api_verbindungen.api_url — beim WordPress-Export ebenfalls nur im Secret (WP_BASIS_URL). Wohin ein Lauf tatsächlich geschrieben hat, sagt seine Meldung, nicht die Konfiguration." color={AM}/>
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
          {/* ⚠ EIGENER BEREICH, nicht derselbe wie „Ergebnis des Laufs".
              Ein Lauf VERAENDERT etwas, eine Auskunft nicht — die zwei in
              einen Kasten zu legen hiesse, dass niemand mehr sieht, ob
              gerade geschrieben wurde. */}
          {auskunft&&(
            <>
              <div style={{height:12}}/>
              <Card>
                <div className="cc-section-title">
                  <TI n={auskunft.fehler?"alert-circle":"info-circle"} size={14}/> {auskunft.titel}
                  <span className="cc-text-sub" style={{marginLeft:8,fontWeight:400}}>
                    liest nur, schreibt nichts
                  </span>
                </div>
                <pre style={{fontSize:12,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,
                             color:auskunft.fehler?"var(--danger,#ef4444)":"var(--text)"}}>
                  {auskunft.zeilen.join(String.fromCharCode(10))}
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
                      {/* ⚠ „Synchronisierte Daten" stand hier bis zum 07.09.2026 über
                          jeder Liste — und war damit für den ersten ausgehenden
                          Anschluss die Umkehrung der Wahrheit. Bei `wordpress` ist
                          „Spielplan, Resultate" nicht das, was hereinkommt, sondern
                          das, was auf eine öffentliche Website hinausgeht. */}
                      <div style={{fontSize:14,color:"var(--sub)",fontWeight:600,marginBottom:4}}>
                        {info.richtung==="aus"?"Gesendete Daten:":"Empfangene Daten:"}
                      </div>
                      {info.felder.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:"var(--sub)",padding:"2px 0"}}>
                          <TI n="check" style={{fontSize:14,color:api.active?GN:"#ccc"}}/>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* ⚠ ⚠  ZIEL — BEOBACHTET, NICHT BEHAUPTET  ⚠ ⚠

                      Bis zum 08.09.2026 stand hier `api_url`, also die
                      KONFIGURATION. Am selben Tag zeigte die Kachel damit
                      `https://www.fcherrliberg.ch/wp-json`, während der Export
                      nach `dev.fcherrliberg.ch` schrieb — der Wert war von Hand
                      eingetragen worden, und `migration_wp_export.sql` hatte
                      genau diesen Ausgang vorhergesagt: „zwei Orte für eine
                      Aussage laufen auseinander … ohne dass etwas fehlschlägt".

                      Ein Feld, das „Ziel" heisst und die Konfiguration zeigt,
                      ist dieselbe abgeleitete Behauptung wie zuvor, nur an
                      einer anderen Stelle. Deshalb steht oben, was ein LAUF
                      getan hat (`api_sync_log.details.ziel_host`), und die
                      Konfiguration darunter — mit eigener Beschriftung.

                      ⚠ Und wo beide etwas sagen und sich widersprechen, sagt
                      die Kachel DAS. Zwei Quellen sind dann keine Schwäche
                      mehr, sondern eine Gegenprobe. */}
                  {(()=>{
                    const gelaufen=zielAusLauf(syncLogs,api.id);
                    const eingestellt=hostVon(api.api_url);
                    const uneinig=Boolean(gelaufen&&eingestellt&&gelaufen!==eingestellt);
                    /* ⚠ DREI Zustände, nicht zwei. „Kein Host bekannt" hat zwei
                       ganz verschiedene Gründe, und sie zusammenzufassen war der
                       Defekt vom 08.09.2026: die Kachel sagte „kein Lauf", während
                       der SFV-Anschluss stündlich lief — er protokolliert nur
                       keinen Ziel-Host. Wer das liest, sucht den Fehler beim
                       Anschluss statt beim Protokoll. */
                    const jeGelaufen=hatLaufProtokolliert(syncLogs,api.id);
                    return(
                      <>
                        <div style={{fontSize:14,color:"var(--sub)",marginBottom:4,wordBreak:"break-all"}}>
                          Zuletzt geschrieben nach: {gelaufen
                            ? <b>{gelaufen}</b>
                            : <span style={{fontStyle:"italic"}}>
                                {jeGelaufen
                                  ? "— dieser Anschluss protokolliert kein Ziel"
                                  : "— noch kein Lauf protokolliert"}
                              </span>}
                        </div>
                        <div style={{fontSize:14,color:"var(--sub)",marginBottom:uneinig?4:10,
                                     wordBreak:"break-all"}}>
                          Eingestellt (api_url): {api.api_url
                            ? api.api_url
                            : <span style={{fontStyle:"italic"}}>
                                — nicht in der Datenbank, sondern in den Secrets der Edge Function
                              </span>}
                        </div>
                        {uneinig&&(
                          <div style={{fontSize:14,color:R,marginBottom:10,fontWeight:600}}>
                            ⚠ Eingestellte Adresse und letzter Lauf nennen verschiedene Hosts.
                            Geschrieben wird nach {gelaufen}.
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {api.letzter_sync&&(
                    <div style={{fontSize:14,color:"var(--sub)",marginBottom:10}}>
                      Letzter Sync: {new Date(api.letzter_sync).toLocaleString("de-CH")}
                      {/* ⚠ „zuletzt FERTIG GEWORDEN", nicht „zuletzt gelungen":
                          letzter_sync wird auch bei status='fehler' gesetzt.
                          Deshalb steht der Status daneben und nicht dahinter
                          versteckt. */}
                      {/* ⚠ Die einzige Stelle, an der der ECHTE Ziel-Host steht.
                          Wortwörtlich übernommen, nicht zerlegt: den eigenen
                          Ausgabetext wieder zu parsen, um zu erfahren, was man
                          selbst hineingeschrieben hat, ist immer der Umweg —
                          und er misst die Formatierung mit. Ein Mensch liest
                          den Host als erstes Wort. */}
                      <div style={{marginTop:4,wordBreak:"break-word"}}>
                        Meldung: {api.sync_meldung || "— keine"}
                      </div>
                    </div>
                  )}
                  {/* Der Waechter. Steht auch dann da, wenn er NICHT gelaufen
                      ist — „—" ist die Auskunft, die zaehlt: ein stiller
                      Waechter sieht sonst aus wie ein zufriedener. */}
                  {api.active&&(
                    <div style={{fontSize:14,color:"var(--sub)",marginBottom:10}}>
                      Wächter: {api.wache_zuletzt
                        ? new Date(api.wache_zuletzt).toLocaleString("de-CH")
                        : "— noch nie gelaufen"}
                    </div>
                  )}
                  {/* ⚠ KEIN KNOPF OHNE WIRKUNG — bis zum 07.09.2026 standen hier zwei
                      Attrappen mit `onClick={()=>{}}`: ein zweiter „Sync starten" für
                      jeden aktiven Anschluss ausser football_ch, und „Konfigurieren"
                      für jeden. Sichtbar wurde es, als die zweite Zeile in
                      api_verbindungen dazukam: die WordPress-Kachel trug einen Knopf,
                      der nichts tat.

                      Ein Knopf, der nichts tut, ist schlimmer als keiner. Wer ihn
                      drückt und nichts passiert, sucht den Fehler beim Export —
                      dieselbe Familie wie ein Ausfall, der wie eine Datenlage
                      aussieht. Deshalb steht statt des Knopfes ein Satz, der sagt,
                      wo die Bedienung wirklich ist. */}
                  <Row align="flex-start">
                    {api.key==="football_ch"
                      ?<>
                        {api.active&&(
                          <Btn small variant="primary" color={BL} onClick={syncStarten} disabled={laeuft}>
                            {laeuft?"Läuft…":"Sync starten"}
                          </Btn>)}
                        <Btn small variant="outline" color="#888" onClick={()=>setOffen("football_ch")}>Teams zuordnen</Btn>
                        {/* Zwei Zuordnungen, zwei Ebenen: Mannschaften einmal
                            beim Einrichten, Spieler laufend beim ersten
                            Einsatz. */}
                        <Btn small variant="outline" color="#888" onClick={()=>setOffen("sfv_spieler")}>Spieler zuordnen</Btn>
                        <Btn small variant="outline" color="#888"
                             onClick={()=>auskunftHolen("vorschau")} disabled={!!auskunftLaeuft}>
                          {auskunftLaeuft==="vorschau"?"Läuft…":"Vorschau"}
                        </Btn>
                        <Btn small variant="outline" color="#888"
                             onClick={()=>auskunftHolen("rohschluessel")} disabled={!!auskunftLaeuft}>
                          {auskunftLaeuft==="rohschluessel"?"Läuft…":"Rohschlüssel"}
                        </Btn>
                      </>
                      :api.key==="wordpress"
                      ?<>
                        {/* ⚠ DER EINZIGE KNOPF IM PORTAL, DER AUF EINE
                            ÖFFENTLICHE WEBSITE SCHREIBT. Er steht hier erst
                            seit Etappe 5 (09.09.2026): davor verlangte
                            `export` eine SFV-Teamnummer, und ein Knopf, der
                            danach fragt, wäre eine Bedienung für den, der sie
                            ohnehin auswendig kann.

                            Die Rückfrage gehört dazu (entschieden 08.09.2026)
                            und nennt den Host aus dem letzten Lauf — die
                            eingestellte Adresse steht im Secret und ist von
                            hier aus nicht lesbar. */}
                        <Btn small variant="primary" color={BL} disabled={laeuft}
                          onClick={()=>exportStarten(zielAusLauf(syncLogs,api.id))}>
                          {laeuft?"Läuft…":"Export starten"}
                        </Btn>
                        {/* ⚠ FRAGT NUR, SCHREIBT NICHT — deshalb ein
                            Umriss-Knopf neben dem blauen und keine zweite
                            Bedienung im Export. Er beantwortet die vier
                            Fragen, die am 09.09.2026 drei Anläufe gekostet
                            haben: wer antwortet, mit welcher Fassung, gegen
                            welchen Schlüssel, mit wie vielen Treffern. */}
                        <Btn small variant="outline" color="#888"
                             onClick={()=>auskunftHolen("empfaenger")} disabled={!!auskunftLaeuft}>
                          {auskunftLaeuft==="empfaenger"?"Läuft…":"Empfänger"}
                        </Btn>
                        <span style={{fontSize:13,color:"var(--sub)",lineHeight:1.5}}>
                          Alle Mannschaften. Eingerichtet wird der Anschluss über die
                          Supabase-Secrets.
                        </span>
                      </>
                      :<span style={{fontSize:13,color:"var(--sub)",lineHeight:1.5}}>
                         Keine Bedienung im Portal. Eingerichtet wird dieser Anschluss
                         über die Supabase-Secrets, ausgelöst wird er von Hand oder
                         über den Zeitplan.
                       </span>}
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
