/* ═══════════════════════════════════════════════════════════════
   ClubCampus — MitgliederModul.tsx
   State, Logik und Koordination — Render via MembersView
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useMemo } from "react";
import { TI } from "../icons.tsx";
import { Av, useConfirm } from "../theme.ts";
import { archiviereMitglied, deleteMitglied, fetchArchiv, fetchArchivCount, fetchMitglied, fetchAlleElternkontakte, fetchPortalFunktionen, logAktivitaet, AKTIVITAET_TYP } from "../domains/members/memberService.ts";
import { SAVED_VIEWS, COL_GROUPS, ALL_COLS, GROUP_OPTIONS, GROUP_OPTIONS_MORE } from "./members/memberConstants.ts";
import { fetchFeldkonfig } from "../domains/members/feldkonfigService.ts";
import type { FeldkonfigZeile } from "../domains/members/feldkonfig.ts";
import { mapMembers, filterMembers, sortMembers, buildGroups, exportData as exportDataUtil } from "./members/memberDataUtils.ts";
import { mapSupporter } from "./members/memberMapper.ts";
import { fetchSupporter, macheZuMitglied, beendeMitgliedschaft } from "../domains/members/supporterService.ts";
import type { AustrittsZiel } from "../domains/members/supporterService.ts";
import { AustrittModal } from "./members/AustrittModal.tsx";
import type { SupporterRoh } from "../domains/members/supporterService.ts";
import { updatePerson } from "../domains/person/personService.ts";
import { SupporterModal } from "../shared/person/SupporterModal.tsx";
import { MitgliedWerdenModal } from "./members/MitgliedWerdenModal.tsx";
import { ableitUndSaveRolle } from "../domains/roles/roleUtils.ts";
import type { MemberRow } from "./members/memberDataUtils.ts";
import { ArchivView } from "./members/ArchivView.tsx";
import { MemberKPIs } from "./members/MemberKPIs.tsx";
import { makeMemberRenderCell } from "./members/MemberListCell.tsx";
import { useMemberMeta } from "../domains/members/useMemberMeta.ts";
import { ElternListView } from "./members/ElternListView.tsx";
import { SupporterListView } from "./members/SupporterListView.tsx";
import { ListView } from "../shared/list/ListView.tsx";
import { MemberDetail } from "./members/MemberDetail.tsx";
import type { SelectedMember } from "./members/MemberDetail.tsx";
import { NeuesMitgliedModal } from "./members/NeuesMitgliedModal.tsx";
import type { ColDef, ExportFormat, FilterDef, FilterVals, RowId } from "../shared/list/types.ts";
import type { MemberGroup } from "./members/memberGrouping.ts";
import type { Account, Mitglied, Mitgliedtyp, PortalRolle, Sb } from "../types.ts";
import type { KaderRolleDb } from "../domains/roles/roleUtils.ts";
import { vollname } from "../domains/person/personUtils.ts";

/* Vereinsfunktionen mit Gruppe und Farbe — dieselbe Auswahl, die
   MemberListCell für die Funktionsgruppen-Badges braucht. */
type PortalFunktionMitFarbe = Awaited<ReturnType<typeof fetchPortalFunktionen>>[number];

/* mitgliedtypen.hauptkontakt_pflicht steuert, ob ein Elternkontakt nötig
   ist. Mitgliedtyp aus types.ts kennt die Spalte nicht. */
interface MitgliederModulProps {
  role: string;
  account?: Account | null;
  dbMitglieder?: Mitglied[];
  dbMitgliedtypen?: Mitgliedtyp[];
  dbPortalRollen?: PortalRolle[];
  dbKaderRollen?: KaderRolleDb[];
  kannSchreiben?: (modul: string) => boolean;
  kannVerwalten: (modul: string) => boolean;
  sb?: Sb;
  onReload: () => void;
  onUpdatePortalZugang?: ((mitgliedId: number, aktiv: boolean) => Promise<void> | void) | null;
  /* ID aus dem Kader-Modul — öffnet direkt das Detail des Mitglieds */
  navToMember?: number | null;
  onNavToMemberDone?: (() => void) | null;
  onNavToTeam?: ((teamId: number) => void) | null;
  vereinId?: string | null;
}

function MitgliederModul({role,account=null,dbMitglieder=[],dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],kannSchreiben,kannVerwalten,sb=null,onReload,onUpdatePortalZugang=null,navToMember=null,onNavToMemberDone=null,onNavToTeam=null,vereinId=null}: MitgliederModulProps){
  const [confirm,confirmDialog]=useConfirm();
  const [expandedTeams,setExpandedTeams]=useState<Set<RowId>>(new Set());
  const [portalFunktionen,setPortalFunktionen]=useState<PortalFunktionMitFarbe[]>([]);
  const [selectedMember,setSelectedMember]=useState<SelectedMember|null>(null);
  const [showNeuesMitglied,setShowNeuesMitglied]=useState(false);
  const [feldkonfig,setFeldkonfig]=useState<FeldkonfigZeile[]>([]);
  const [supporterRoh,setSupporterRoh]=useState<SupporterRoh[]>([]);
  const [supporterOffen,setSupporterOffen]=useState<SupporterRoh|null>(null);
  const [mitgliedWerdenFuer,setMitgliedWerdenFuer]=useState<SupporterRoh|null>(null);
  const [austrittFuer,setAustrittFuer]=useState<Mitglied|null>(null);


  const [archivTab,setArchivTab]=useState(false);
  const [elternTab,setElternTab]=useState(false);
  const [supporterTab,setSupporterTab]=useState(false);
  const [archivData,setArchivData]=useState<Awaited<ReturnType<typeof fetchArchiv>>>([]);
  const [archivLoaded,setArchivLoaded]=useState(false);
  const [archivCount,setArchivCount]=useState<number|null>(null);
  const [elternCount,setElternCount]=useState<number|null>(null);

  // Direkte Navigation vom Kader-Modul
  useEffect(()=>{
    if(navToMember&&dbMitglieder.length>0){
      const m=dbMitglieder.find(x=>x.id===navToMember);
      if(m) setSelectedMember({
        mitgliedId:m.id,
        personId:m.person_id,
        name:vollname(m),
        role:m.rolle||"-",
        type:m.mitgliedtyp||"-",
        /* ⚠ mitglieder hat keine Spalte teams (siehe MitgliedRoh in
           memberMapper), der frühere Zugriff ergab immer "-". MemberDetail
           liest das Feld ohnehin nicht. */
        team:"-",
        _tab:"info",
      });
      if(onNavToMemberDone) onNavToMemberDone();
    }
  },[navToMember,dbMitglieder]);
  const canExport=role==="administrator"||role==="administration";
  /* Dieselbe Bedingung wie canExport, aber eine andere Aussage: „darf
     verwalten" gegen „darf exportieren". Sie stehen getrennt, damit eine von
     beiden sich aendern kann, ohne die andere mitzunehmen. */
  const istVerwaltung=role==="administrator"||role==="administration";

  const { ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap } = useMemberMeta(dbPortalRollen, dbKaderRollen, portalFunktionen);
  /* Memoized: allMembers ist Dependency mehrerer useMemos (FILTER_DEFS,
     JAHRGANG/ALTER). Ohne useMemo entstuende bei jedem Render ein neues
     Array -> alle abhaengigen useMemos wuerden jedes Mal neu rechnen. */
  const alleZeilen: MemberRow[]=useMemo(()=>mapMembers(dbMitglieder,dbPortalRollen,dbKaderRollen).map(m=>({
    ...m,
    funktionsgruppen:[...new Set((m.funktionen||[]).map(f=>funktionenGruppenMap[f]).filter((g): g is string => Boolean(g)))],
  })),[dbMitglieder,dbPortalRollen,dbKaderRollen,funktionenGruppenMap]);

  /* Seit dem Supporter-Rueckbau (20.08.2026) steht in `mitglieder` NUR NOCH,
     was eine Mitgliedschaft ist — jede Zeile zaehlt, es gibt nichts mehr
     herauszufiltern.

     Vorher lief hier ein Filter ueber `mitgliedtypen.zaehlt_als_mitgliedschaft`
     und davor ein Vergleich gegen den Namen "Supporter". Beides ist entfallen:
     ein Supporter ist keine Mitgliedschaft (Statuten Artikel 6) und deshalb
     auch keine Zeile in dieser Tabelle. Er kommt aus `personen` — siehe
     `fetchSupporter` weiter unten.

     Der Filter darf NICHT als Sicherheitsnetz stehenbleiben: eine Zeile, die
     er wegnimmt, waere jetzt nirgends mehr zu sehen — nicht in der
     Mitgliederliste und nicht im Supporter-Tab, der ja gar nicht mehr aus
     `mitglieder` liest. Sie verschwaende, ohne dass etwas fehlschlaegt. */
  const allMembers: MemberRow[]=alleZeilen;

  /* Supporter kommen aus `personen`, nicht aus `mitglieder` — sie haben keine
     Mitgliedschaft. mapSupporter macht daraus dieselbe MemberRow-Form, damit
     Suche, Sortierung und Gruppierung dieselben Funktionen benutzen koennen.
     Was ein Supporter nicht hat (Mitgliedtyp, Teams, Spielerpass, Eintritt),
     steht dort leer. */
  const supporter: MemberRow[]=useMemo(
    ()=>mapSupporter(supporterRoh,dbPortalRollen).map(m=>({
      ...m,
      funktionsgruppen:[...new Set((m.funktionen||[]).map(f=>funktionenGruppenMap[f]).filter((g): g is string => Boolean(g)))],
    })),[supporterRoh,dbPortalRollen,funktionenGruppenMap]);

  const filterRef = useRef<((vals: FilterVals) => void) | null>(null);
  function exportData(rows: MemberRow[], cols: ColDef[], groups: MemberGroup[], format: ExportFormat){ exportDataUtil(rows, cols, format, groups); }



  useEffect(()=>{
    if(!sb||!account?.id) return;
    if(portalFunktionen.length===0)
      fetchPortalFunktionen(sb).then(data=>setPortalFunktionen(data));
    fetchFeldkonfig(sb).then(data=>setFeldkonfig(data));
    /* Gleich mitladen, nicht erst beim Klick: an der Anzahl haengt, ob der
       Tab ueberhaupt erscheint. */
    if(vereinId) ladeSupporter();
  },[account?.id,vereinId]);

  async function ladeSupporter(){
    if(!sb||!vereinId) return;
    setSupporterRoh(await fetchSupporter(sb,vereinId));
  }

  /* Personenfelder eines Supporters schreiben.
     ⚠ NICHT updateMitglied(): das findet die Person ueber mitglieder.person_id,
     und genau die Zeile gibt es hier nicht. */
  async function speichereSupporter(personId: string, felder: Record<string, unknown>){
    if(!sb) return false;
    const ok=await updatePerson(sb,personId,felder);
    if(ok) await ladeSupporter();
    return ok;
  }

  /* Austritt — die Gegenrichtung. Die Rueckfrage stellt AustrittModal; hier
     wird nur ausgefuehrt und protokolliert. */
  async function fuehreAustrittAus(ziel: AustrittsZiel, am: string){
    if(!sb||!vereinId||!austrittFuer) return { fehler:"Keine Verbindung zur Datenbank.", hinweise:[] };
    const benutzerId=await holeBenutzerId(austrittFuer.person_id);
    const { ok, fehler, hinweise } = await beendeMitgliedschaft(sb,{
      mitgliedId:austrittFuer.id, vereinId, ziel, benutzerId, am,
    });
    if(!ok||fehler) return { fehler: fehler ?? "Der Austritt konnte nicht eingetragen werden.", hinweise };

    const wer=account?.name||account?.email||"Administrator";
    const bleibt=ziel==="ehrenmitglied"||ziel==="aktivmitglied";
    await logAktivitaet(sb,austrittFuer.id,vereinId,
      bleibt?AKTIVITAET_TYP.ANGELEGT:AKTIVITAET_TYP.ARCHIVIERT,
      bleibt?`Mitgliedtyp gewechselt auf ${ziel==="ehrenmitglied"?"Ehrenmitglied":"Aktivmitglied"}`
            :`Austritt per ${am} — danach: ${ziel==="supporter"?"Supporter":"Archiv"}`,
      null,null,wer);

    /* Beide Listen: die Person verlaesst die Mitgliederliste und erscheint —
       bei „Supporter" — im Goenner-Tab. */
    await ladeSupporter();
    if(onReload) onReload();
    setSelectedMember(null);
    return { fehler:null, hinweise };
  }

  /* Das Konto haengt an der PERSON (seit Etappe 4), nicht am Mitglied. */
  async function holeBenutzerId(personId: string|null|undefined): Promise<string|null>{
    if(!sb||!personId) return null;
    const { data, error } = await sb.from("benutzer").select("id").eq("person_id",personId).maybeSingle();
    if(error){ console.error("holeBenutzerId error:",error); return null; }
    return data?.id ?? null;
  }

  /* Aus einem Supporter wird ein Mitglied. Die Person bleibt dieselbe. */
  async function supporterWirdMitglied(
    person: SupporterRoh,
    felder: { mitgliedtyp: string; eintrittsdatum: string | null },
  ): Promise<string|null>{
    if(!sb||!vereinId) return "Keine Verbindung zur Datenbank.";
    const { mitgliedId, fehler } = await macheZuMitglied(sb,person.id,vereinId,felder);
    if(fehler||mitgliedId==null) return fehler ?? "Die Mitgliedschaft konnte nicht angelegt werden.";

    /* Die Rolle wird ABGELEITET, nicht gewaehlt — sonst hielte sie nur bis zur
       naechsten Kader- oder Funktionsaenderung. Ohne diesen Aufruf stuende in
       der Liste ein "-", bis das erste Mal etwas anderes geaendert wird. */
    await ableitUndSaveRolle(sb,mitgliedId,dbKaderRollen,felder.mitgliedtyp,person.funktionen||[]);
    await logAktivitaet(sb,mitgliedId,vereinId,AKTIVITAET_TYP.ANGELEGT,
      `Mitgliedschaft angelegt (${felder.mitgliedtyp}) — vorher Supporter`,
      null,null,account?.name||null);

    /* Beide Listen neu laden: die Person verlaesst den Supporter-Tab und
       erscheint in der Mitgliederliste. Ohne das Erste stuende sie in beiden. */
    setSupporterOffen(null);
    await ladeSupporter();
    if(onReload) onReload();
    return null;
  }


  async function handleBulkDelete(selected: Set<RowId>){
    if(!sb||!selected||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitgliedschaften löschen?`,message:"Die Mitgliedschaft samt Kadereinträgen, Notizen und Verlauf wird entfernt. Die Person bleibt mit Namen, Adresse und Konto bestehen — sie zu löschen ist eine eigene Aktion.",danger:true,confirmLabel:"Löschen"});if(!ok) return;
    const ids=[...selected].map(Number);
    /* Pro Zeile Fehler auswerten — Löschen kann an FK-Verknüpfungen (Kader/
       Eltern) oder RLS scheitern; sonst meldete die UI faelschlich Erfolg. */
    const results=await Promise.allSettled(ids.map(id=>deleteMitglied(sb,id)));
    const failed=results.filter(r=>r.status==="rejected"||r.value!==null).length;
    if(onReload) onReload();
    if(failed>0) await confirm({title:"Nicht alle gelöscht",message:`${failed} von ${ids.length} Mitgliedern konnten nicht gelöscht werden — vermutlich bestehende Verknüpfungen (Kader/Eltern) oder fehlende Rechte.`,confirmLabel:"OK"});
  }
  async function handleBulkDeactivate(selected: Set<RowId>){
    if(!sb||!selected||selected.size===0) return;
    const ok=await confirm({title:`${selected.size} Mitglieder archivieren?`,message:"Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok) return;
    const ids=[...selected].map(Number);
    const deaktiviertVon=account?.name||account?.email||"Administrator";
    const error=await archiviereMitglied(sb,ids,deaktiviertVon);
    if(error){
      await confirm({title:"Archivierung fehlgeschlagen",message:"Die ausgewählten Mitglieder konnten nicht archiviert werden — bitte erneut versuchen.",confirmLabel:"OK"});
      return;
    }
    if(onUpdatePortalZugang) await Promise.all(ids.map(id=>onUpdatePortalZugang(id,false)));
    refreshArchivCount();
    setArchivLoaded(false);
    if(onReload) onReload();
  }




  useEffect(()=>{
    if(!sb) return;
    fetchArchivCount(sb).then(count=>setArchivCount(count));
  },[sb,archivLoaded]);
  useEffect(()=>{
    if(!sb||!vereinId) return;
    fetchAlleElternkontakte(sb,vereinId).then(data=>setElternCount(data.length));
  },[sb,vereinId]);
  useEffect(()=>{
    if(!sb||!archivTab||archivLoaded) return;
    fetchArchiv(sb).then(data=>{setArchivData(data);setArchivLoaded(true);});
  },[sb,archivTab,archivLoaded]);

  /* Filter */
  /* computed values are in MembersView */
  /* ── Render ── */

  const JAHRGANG_MIN=useMemo(()=>{const jgs=allMembers.map(m=>m.geburtsdatum?new Date(m.geburtsdatum).getFullYear():null).filter((j): j is number => j!==null);return jgs.length?Math.min(...jgs):1940;},[allMembers]);
  const JAHRGANG_MAX=useMemo(()=>{const jgs=allMembers.map(m=>m.geburtsdatum?new Date(m.geburtsdatum).getFullYear():null).filter((j): j is number => j!==null);return jgs.length?Math.max(...jgs):new Date().getFullYear();},[allMembers]);
  const ALTER_MAX=useMemo(()=>{const alters=allMembers.map(m=>m.alter).filter((v): v is number => v!=null);return alters.length?Math.max(...alters):90;},[allMembers]);

  const FILTER_DEFS=useMemo<FilterDef[]>(()=>[
    {key:"__und_1",         type:"und-divider"},
    {key:"mitgliedschaft",  label:"Mitgliedschaft",  vals:[...new Set(allMembers.map(m=>m.mitgliedschaft).filter(Boolean))]},
    {key:"geschlecht",      label:"Geschlecht",      vals:["Männlich","Weiblich","Divers"]},
    {key:"teams",           label:"Teams",           vals:[...new Set(allMembers.flatMap(m=>(m.teams||[]).map(t=>t.name)).filter(Boolean))].sort()},
    {key:"__or_divider",    type:"or-divider"},
    {key:"kaderrollen",     label:"Kaderrollen",     vals:[...new Set(allMembers.flatMap(m=>(m.kader_rollen_raw||[])).filter(Boolean))].sort()},
    {key:"funktionen",      label:"Funktion",        vals:[...new Set(allMembers.flatMap(m=>m.funktionen||[]).filter(Boolean))].sort()},
    {key:"funktionsgruppen",label:"Funktionsgruppe", vals:[...new Set(allMembers.flatMap(m=>m.funktionsgruppen||[]).filter(Boolean))].sort()},
    {key:"__und_2",         type:"und-divider"},
    {key:"wohnort",         label:"Wohnort",         vals:[...new Set(allMembers.map(m=>m.wohnort).filter((o): o is string => Boolean(o)))].sort()},
    {key:"jahrgang",        label:"Jahrgang",        type:"range", min:JAHRGANG_MIN, max:JAHRGANG_MAX},
    {key:"alter",           label:"Alter",           type:"range", min:0, max:ALTER_MAX, suffix:" J."},
    {key:"rollen",          label:"Portalrollen",    vals:[...new Set(allMembers.map(m=>m.role&&m.role!=="-"?(ROLLE_LABEL[m.role]||m.role):null).filter((r): r is string => r!==null))].sort()},
    {key:"portal",          label:"Portal-Zugang",   vals:[...new Set(allMembers.map(m=>m.portal).filter(Boolean))]},
    {key:"datenpruefung",   label:"Datenprüfung",    vals:[...new Set(allMembers.map(m=>m.datenpruefung).filter(Boolean))]},
  ],[allMembers,ROLLE_LABEL,JAHRGANG_MIN,JAHRGANG_MAX,ALTER_MAX]);


  /* ── Detail-Modal ── */
  async function refreshArchivCount(){
    if(!sb) return;
    fetchArchivCount(sb).then(count=>setArchivCount(count));
  }

  async function reloadMember(id: number){
    if(!sb) return;
    const data=await fetchMitglied(sb,id);
    if(data) setSelectedMember(prev=>prev?{...prev,...data}:prev);
    if(onReload) onReload();
  }

  const brauchtEltern=(mitgliedtyp: string|null|undefined)=>
    dbMitgliedtypen.some(t=>t.name===mitgliedtyp&&t.hauptkontakt_pflicht);

  /* Dieselbe Regel als Liste — fuer die Kind-Auswahl in der Elternliste. */
  const pflichtTypen = dbMitgliedtypen.filter(t=>t.hauptkontakt_pflicht).map(t=>t.name);



  if(selectedMember) return (
    <MemberDetail
      m={selectedMember} onClose={()=>setSelectedMember(null)} onNavToTeam={onNavToTeam}
      onAustritt={istVerwaltung?(id=>{const mm=dbMitglieder.find(x=>x.id===id);if(mm)setAustrittFuer(mm);}):null}
      onMitgliedWerden={istVerwaltung?(pid=>{const p=supporterRoh.find(x=>x.id===pid);if(p)setMitgliedWerdenFuer(p);}):null}
      onReaktiviert={(id)=>{setArchivLoaded(false);if(id)reloadMember(id);}}
      sb={sb} role={role} account={account} feldkonfig={feldkonfig}
      dbMitglieder={dbMitglieder} dbMitgliedtypen={dbMitgliedtypen}
      dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
      kannVerwalten={kannVerwalten} onReload={onReload} onUpdatePortalZugang={onUpdatePortalZugang}
      setSelectedMember={setSelectedMember} selectedMember={selectedMember}
      reloadMember={reloadMember} refreshArchivCount={refreshArchivCount} brauchtEltern={brauchtEltern}
      vereinId={vereinId}
    />
  );




  /* Eine Listenzeile im Detail oeffnen.

     ⚠ MemberDetail arbeitet mit einer MITGLIEDSCHAFT: `SelectedMember.id` ist
     die bigint aus `mitglieder`, und rund siebzig Zugriffe in den Tabs lesen
     sie als Zahl. Eine MemberRow traegt dort seit dem Supporter-Rueckbau
     (20.08.2026) den Schluessel der ZEILE — beim Mitglied dieselbe Zahl, beim
     Supporter dessen person_id. Deshalb kommt die Id hier aus `mitglied_id`
     und nicht aus `id`.

     Der Supporter-Tab bietet diesen Weg gar nicht erst an (kein onRowClick).
     Der Guard ist das Netz darunter — und er meldet sich, statt still nichts
     zu tun: ein Klick, der wirkungslos verpufft, waere von einem kaputten
     Detail nicht zu unterscheiden. */
  function oeffneMitglied(row: MemberRow & { _tab?: string }){
    /* ⚠ Der Guard bleibt vorerst. Die Seite TRAEGT eine Person ohne
       Mitgliedschaft seit Schritt 1 des Personenseiten-Auftrags, aber der Weg
       dorthin — Hero, Tabs, „Mitglied werden" — kommt erst in Schritt 2/3.
       Bis dahin waere es ein halbes Bild, und ein halbes Bild ist schlechter
       als keines. Er faellt mit Schritt 3. */
    if(row.mitglied_id==null){
      console.warn("oeffneMitglied: Zeile ohne Mitgliedschaft — die Personenseite kommt in Schritt 3.",{id:row.id,name:row.name});
      return;
    }
    setSelectedMember({...row, mitgliedId: row.mitglied_id, personId: row.person_id ?? ""});
  }

  /* Portal-Zugang Zelle */
  const renderCell = makeMemberRenderCell({ portalFunktionen, TRAINER_KEYS, ROLLE_LABEL, expandedTeams, setExpandedTeams, setSelectedMember: oeffneMitglied });

  return(
    <>{confirmDialog}
      <SupporterModal
        open={supporterOffen!==null}
        onClose={()=>setSupporterOffen(null)}
        supporter={supporterOffen}
        canEdit={istVerwaltung}
        onSpeichern={speichereSupporter}
        onMitgliedWerden={istVerwaltung?(p=>setMitgliedWerdenFuer(p)):null}
      />
      <AustrittModal
        open={austrittFuer!==null}
        onClose={()=>setAustrittFuer(null)}
        name={austrittFuer?vollname(austrittFuer):""}
        mitgliedtyp={austrittFuer?.mitgliedtyp}
        hatKonto={Boolean(austrittFuer?.hat_benutzer)}
        onAustritt={fuehreAustrittAus}
      />
      <MitgliedWerdenModal
        open={mitgliedWerdenFuer!==null}
        onClose={()=>setMitgliedWerdenFuer(null)}
        supporter={mitgliedWerdenFuer}
        mitgliedtypen={dbMitgliedtypen}
        onAnlegen={supporterWirdMitglied}
      />
      <NeuesMitgliedModal
        open={showNeuesMitglied}
        onClose={()=>setShowNeuesMitglied(false)}
        sb={sb}
        dbMitgliedtypen={dbMitgliedtypen}
        feldkonfig={feldkonfig}
        vereinId={vereinId}
        account={account}
        onSuccess={()=>{ if(onReload) onReload(); }}
      />
    <div className="cc-page-wide">
      {/* Header + Tabs */}
      <div className="cc-page-hdr">
        <div className="cc-row cc-gap-0">
          <h1 className="cc-page-title cc-page-title-mr">Mitglieder</h1>
          {istVerwaltung&&(
            <div className="cc-ml-tabs-bar">
              <button className={`cc-ml-tab${!archivTab&&!elternTab&&!supporterTab?" cc-ml-tab-active":""}`} onClick={()=>{setArchivTab(false);setElternTab(false);setSupporterTab(false);}}>
                Aktive <span className="cc-ml-tab-count">{(allMembers||[]).length}</span>
              </button>
              <button className={`cc-ml-tab${archivTab?" cc-ml-tab-active":""}`} onClick={()=>{
                setArchivTab(true);setElternTab(false);setSupporterTab(false);
                if(!archivLoaded&&sb){
                  fetchArchiv(sb).then(data=>{setArchivData(data);setArchivLoaded(true);});
                }
              }}>
                Archiv {archivCount!==null&&<span className="cc-ml-tab-count">{archivCount}</span>}
              </button>
              <button className={`cc-ml-tab${elternTab?" cc-ml-tab-active":""}`} onClick={()=>{setElternTab(true);setArchivTab(false);setSupporterTab(false);}}>
                Eltern {elternCount!==null&&<span className="cc-ml-tab-count">{elternCount}</span>}
              </button>
              {supporter.length>0&&(
                <button className={`cc-ml-tab${supporterTab?" cc-ml-tab-active":""}`} onClick={()=>{setSupporterTab(true);setArchivTab(false);setElternTab(false);}}>
                  Supporter <span className="cc-ml-tab-count">{supporter.length}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {supporterTab?(
        <SupporterListView supporter={supporter} renderCell={renderCell} rolleLabel={ROLLE_LABEL} canExport={canExport}
          renderMobile={m=>(
            <div key={m.id} className="cc-members-item" onClick={()=>{
              const p=supporterRoh.find(x=>x.id===m.id);
              if(p) setSupporterOffen(p);
            }}>
              {m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-lg"/>:<Av name={m.name||"?"} size={38}/>}
              <div className="cc-members-item-body">
                <div className="cc-members-item-name">{m.name}</div>
                <div className="cc-members-item-sub">{m.email||m.telefon||""}</div>
              </div>
            </div>
          )}
          sb={sb} account={account} vereinId={vereinId}
          isAdmin={istVerwaltung}
          /* Oeffnet das schlanke Supporter-Modal, NICHT MemberDetail: das
             arbeitet mit einer Mitgliedschaft, die es hier nicht gibt. */
          onOeffnen={row=>{
            const p=supporterRoh.find(x=>x.id===row.id);
            if(p) setSupporterOffen(p);
          }}
        />
      ):elternTab?(
        <ElternListView sb={sb} vereinId={vereinId} account={account} isAdmin={istVerwaltung}
          pflichtTypen={pflichtTypen}
          onNavToMember={id=>{
            setElternTab(false);
            const m=dbMitglieder.find(x=>x.id===id);
            if(m) setSelectedMember({mitgliedId:m.id,personId:m.person_id,name:vollname(m),role:m.rolle||"-",type:m.mitgliedtyp||"-",team:"-",_tab:"info"});
          }}
        />
      ):archivTab?(
        <ArchivView archivData={archivData} setArchivData={setArchivData} archivLoaded={archivLoaded} sb={sb} onUpdatePortalZugang={onUpdatePortalZugang} onReload={()=>{setArchivLoaded(false);if(onReload)onReload();}} onOpenMember={async m=>{
          if(!sb) return;
          const data=await fetchMitglied(sb,m.id);
          /* fetchMitglied liefert die flache Zeile (Fassade); der aus der
             Abfrage abgeleitete Typ kennt die Personenfelder nicht. */
          if(data) setSelectedMember({...data,name:vollname(data as never),_tab:"info",_readonly:true} as never);
        }}/>
      ):(
      <>
      <MemberKPIs allMembers={allMembers} dbMitgliedtypen={dbMitgliedtypen} onFilter={vals=>filterRef.current&&filterRef.current(vals)}/>


      {/* Gespeicherte Ansichten - nur Desktop */}

      <ListView<MemberRow>
        emptyIcon="users"
        emptyTitle="Noch keine Mitglieder"
        emptySubtitle="Füge das erste Mitglied hinzu, um loszulegen."
        rows={allMembers}
        filterFn={(rows,search,filterVals)=>filterMembers(rows,search,filterVals,ROLLE_LABEL)}
        sortFn={sortMembers}
        buildGroupsFn={(rows,groupBy,groupOrder,filterVals)=>buildGroups(rows,groupBy,ROLLE_LABEL,{...filterVals,__portalFunktionen:portalFunktionen},null,groupOrder)}
        colDefs={ALL_COLS}
        colGroups={COL_GROUPS}
        defaultCols={SAVED_VIEWS.standard.cols}
        savedViews={SAVED_VIEWS}
        filterDefs={FILTER_DEFS}
        groupOptions={GROUP_OPTIONS}
        groupOptionsMore={GROUP_OPTIONS_MORE}
        multiGroup
        renderCell={(col,m,gc,filterVals)=>renderCell(col,m,gc,filterVals)}
        renderMobile={m=>(
          <div key={m.id} className="cc-members-item" onClick={()=>oeffneMitglied({...m,_tab:"info"})}>
            {m.foto_url?<img src={m.foto_url} alt={m.name} className="cc-avatar-foto-lg"/>:<Av name={m.name||"?"} size={38}/>}
            <div className="cc-members-item-body">
              <div className="cc-members-item-name">{m.name}</div>
              <div className="cc-members-item-sub">{m.mitgliedschaft||""}{m.role&&m.role!=="-"?" · "+(ROLLE_LABEL[m.role]||m.role):""}</div>
            </div>
            <div className="cc-members-item-right"><TI n="chevron-right" size={14} className="cc-members-item-chevron"/></div>
          </div>
        )}
        sb={sb}
        account={account}
        vereinId={vereinId}
        viewTyp="mitglieder"
        isAdmin={istVerwaltung}
        selectable
        bulkActions={[
          {icon:"archive",  label:"Archivieren", onClick:handleBulkDeactivate},
          {icon:"trash",    label:"Mitgliedschaft löschen", onClick:handleBulkDelete, danger:true, requiresSelection:true},
        ]}
        exportFn={canExport ? exportData : undefined}
        exportFormats={canExport ? [
          {label:"Liste als CSV (flach)",                format:"csv"},
          {label:"Liste als CSV (mit Gruppen)",          format:"csv-gruppen"},
          {label:"Liste als Excel (pro Gruppe ein Sheet)",format:"excel-sheets", icon:"table"},
        ] : []}
        externalSetFilter={filterRef}
        footerLabel={(f,t)=>`${f} von ${t} Mitgliedern`}
        moreActions={kannVerwalten("members") ? [
          { icon:"user-plus", label:"Mitglied hinzufügen", onClick:()=>setShowNeuesMitglied(true) },
        ] : []}
      />
      </>
      )}

      {/* Teams Popover / Sheet */}
    </div>
  </>
  );
}

export { MitgliederModul };
export const MembersView = MitgliederModul;
export default MitgliederModul;
