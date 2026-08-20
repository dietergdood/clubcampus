/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberHero.tsx
   Hero-Header des Mitglied-Detailbereichs
   Kein Edit-Modal mehr — alle Felder inline editierbar in InfoTab
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import { Btn, useIsMobile, DropMenu, useConfirm } from "../../theme.ts";
import { istSichtbar } from "../../domains/members/feldkonfig.ts";
import type { FeldModus } from "../../domains/members/feldkonfig.ts";
import { TI } from "../../icons.tsx";
import type { PersonArt } from "../../domains/person/personArtService.ts";
import { heroChips } from "../../domains/roles/roleUtils.ts";
import { updatePersonFoto, deletePersonFoto, deleteMitglied, archiviereMitglied, reaktiviereMitglied, logAktivitaet, AKTIVITAET_TYP, fetchKaderFuerMitglied } from "../../domains/members/memberService.ts";
import type { Account, Mitglied, Mitgliedtyp, PortalRolle, Sb, PersonZeile } from "../../types.ts";
/* Nicht KaderRolle aus types.ts: dort ist aktiv Pflicht, MemberDetail reicht
   aber KaderRolleDb durch. KaderRolleMitTrainerFlag verlangt nur, was hier gelesen
   wird, und ist schon von useMemberMeta belegt. */
import type { KaderRolleMitTrainerFlag } from "../../domains/members/useMemberMeta.ts";

/* Kader-Einträge des Mitglieds inkl. Team — von fetchKaderFuerMitglied */
type KaderDetail = Awaited<ReturnType<typeof fetchKaderFuerMitglied>>[number];

interface MemberHeroProps {
  /* Gemapptes Anzeigeobjekt — gebraucht wird nur der Name */
  m: { name: string };
  raw: PersonZeile;
  initials: string;
  canEdit?: boolean;
  canDelete?: boolean;
  sb: Sb;
  /* Ohne ID lädt der Aufrufer die ganze Liste neu, mit ID nur das Mitglied */
  onReload?: ((id?: number) => void) | null;
  onClose?: (() => void) | null;
  onReaktiviert?: ((id: number) => void) | null;
  onRefreshCount?: (() => void) | null;
  account?: Account | null;
  onUpdatePortalZugang?: ((mitgliedId: number, aktiv: boolean) => Promise<void> | void) | null;
  /**
   * Die Arten einer Person ohne Mitgliedschaft — Elternteil, Supporter, …
   *
   * ⚠ Vom Aufrufer geladen, NICHT aus der Portalrolle abgeleitet.
   * `role === 'eltern'` ist schon zweimal falsch gewesen: ein Vater, der
   * selbst spielt, bekommt `spieler`.
   */
  arten?: PersonArt[];
  dbMitgliedtypen?: Mitgliedtyp[];
  dbPortalRollen?: PortalRolle[];
  dbKaderRollen?: KaderRolleMitTrainerFlag[];
  /* Der Portal-Benutzer des Mitglieds; gelesen wird nur die Rolle */
  benutzer?: { role?: string | null } | null;
  teamDetails?: KaderDetail[] | null;
  vereinId?: string | null;
  /** Öffnet den Austritt (Rückfrage: was gilt danach?). Ohne Callback
      erscheint der Eintrag nicht. */
  onAustritt?: ((mitgliedId: number) => void) | null;
  /** Öffnet „Mitglied werden" — erscheint NUR ohne Mitgliedschaft, an der
      Stelle von Austritt und Archivieren. */
  onMitgliedWerden?: (() => void) | null;
  /**
   * Die MITGLIEDSCHAFT dieser Person, oder `null`.
   *
   * ⚠ Alles im Menü darunter — Austritt, Archivieren, Reaktivieren, Löschen —
   * sind Mitgliedschaftssachen. Bei `null` erscheinen sie NICHT: sie hätten
   * kein Ziel. An ihre Stelle tritt „Mitglied werden" (Schritt 3).
   */
  mitgliedId: number | null;
  /**
   * Die Feldkonfiguration derselben Achse, die auch die Tabs und die Karten
   * steuert.
   *
   * ⚠ Der Kopf las sie bis zum 21.08.2026 NICHT. `heroChips()` nahm
   * `raw.mitgliedtyp` direkt — deshalb stand „Juniorenmitglied" neben „Ohne
   * Mitgliedschaft", waehrend die Kachel „Mitgliedschaft" schon verschwunden
   * war. Zwei Anzeigen derselben Sache aus zwei Quellen.
   */
  konfig: Record<string, FeldModus>;
}

function MemberHero({m,raw,initials,arten=[],canEdit,canDelete=false,sb,onReload,onClose,onReaktiviert=null,onRefreshCount=null,account=null,onUpdatePortalZugang=null,dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],benutzer=null,teamDetails=null,vereinId=null,onAustritt=null,onMitgliedWerden=null,mitgliedId,konfig}: MemberHeroProps){
  const [confirm,confirmDialog]=useConfirm();
  const isMobile=useIsMobile();
  const fotoInputRef=useRef<HTMLInputElement>(null);
  const [fotoOverlay,setFotoOverlay]=useState(false);

  async function handleHeroFotoUpload(e: ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file||!sb) return;
    await updatePersonFoto(sb, raw.person_id, file);
    if(onReload) onReload(mitgliedId ?? undefined);
  }

  async function handleLoeschen(){
    /* ⚠ Loescht die MITGLIEDSCHAFT, nicht die Person — der Knopf heisst seit
       jeher „Löschen" und tut genau das. Die Trennung von „Person löschen
       (DSGVO)" ist ein eigenes Vorhaben. Ohne Mitgliedschaft gibt es hier
       nichts zu loeschen, und der Eintrag erscheint gar nicht erst. */
    if(mitgliedId==null) return;
    const ok=await confirm({
      title:`Mitgliedschaft von ${m.name} löschen?`,
      message:"Die Mitgliedschaft samt Kadereinträgen, Notizen und Verlauf wird entfernt. Die Person bleibt mit Namen, Adresse und Konto bestehen — sie zu löschen ist eine eigene Aktion.",
      danger:true, confirmLabel:"Mitgliedschaft löschen"});
    if(!sb||!ok) return;
    await deleteMitglied(sb, mitgliedId);
    if(onClose) onClose();
    if(onReload) onReload(mitgliedId);
  }

  return(
    <>{confirmDialog}
      <div className="cc-member-hero">
        <div className="cc-member-hero-banner">
          <button className="cc-hero-banner-btn" onClick={()=>onClose&&onClose()}><TI n="arrow-left" size={16}/></button>
          <div className="cc-hero-av-wrap">
            <div className={`cc-member-hero-av cc-hero-av-hoverable${canEdit?" cc-cursor-pointer":""}`}
              onClick={()=>canEdit&&(raw.foto_url?setFotoOverlay(true):fotoInputRef.current?.click())}>
              {raw.foto_url
                ?<img src={raw.foto_url} className="cc-hero-av-img" alt=""/>
                :<span className="cc-hero-av-initials">{initials}</span>
              }
              {canEdit&&!raw.foto_url&&(
                <div className="cc-hero-av-cam-overlay"><TI n="camera" size={18}/></div>
              )}
            </div>
            {canEdit&&(
              <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="cc-hidden" onChange={handleHeroFotoUpload}/>
            )}
            {fotoOverlay&&raw.foto_url&&(
              <div className="cc-foto-overlay" onMouseDown={()=>setFotoOverlay(false)}>
                <div className="cc-foto-overlay-box" onMouseDown={e=>e.stopPropagation()}>
                  <img src={raw.foto_url} className="cc-foto-overlay-img" alt=""/>
                  <div className="cc-foto-overlay-actions">
                    <Btn onClick={()=>{setFotoOverlay(false);fotoInputRef.current?.click();}}>
                      <TI n="camera" size={14}/> Ändern
                    </Btn>
                    <Btn variant="danger" onClick={async()=>{
                      if(!sb) return;
                      await deletePersonFoto(sb, raw.person_id);
                      setFotoOverlay(false);
                      if(onReload) onReload();
                    }}>
                      <TI n="trash" size={14}/> Löschen
                    </Btn>
                    <button className="cc-foto-overlay-close" onMouseDown={()=>setFotoOverlay(false)}>
                      <TI n="x" size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="cc-member-hero-info">
            <h1 className="cc-page-title cc-member-hero-name">{m.name}</h1>
            <div className="cc-hero-chips">
              {(()=>{
                const ROLLE_LABEL: Record<string,string>=(dbPortalRollen||[]).length>0
                  ?Object.fromEntries(dbPortalRollen.map(r=>[r.name,r.label]))
                  :{administrator:"Administrator",administration:"Verwaltung",funktionaer:"Funktionär",trainer:"Trainer",spieler:"Spieler",eltern:"Elternteil",mitglied:"Mitglied",supporter:"Supporter"};
                const TRAINER_ROLLEN=dbKaderRollen.filter(r=>r.ist_trainer).map(r=>r.name);
                const hatTrainerKader=teamDetails&&teamDetails.some(k=>(k.rollen||[]).some(r=>TRAINER_ROLLEN.includes(r)));
                const hatSpielerKader=teamDetails&&teamDetails.some(k=>(k.rollen||[]).some(r=>!TRAINER_ROLLEN.includes(r)));
                /* Die Regel steht in domains/roles/roleUtils — dort ist sie
                   geprueft. Vereinsfunktionen kommen aus mitglieder.funktionen;
                   dort stand bis 05.08.2026 bei 487 Mitgliedern "Spieler", eine
                   Kaderrolle im Funktionenfeld. Bereinigt. */
                const chips=[...heroChips({
                  portalRolle: benutzer?.role||raw.rolle||null,
                  /* ⚠ Aus DERSELBEN Quelle wie die Kachel und die Tabs. Steht
                     `mitgliedtyp` in der Konfiguration auf „Gibt es nicht",
                     gibt es ihn auch im Kopf nicht — sonst widerspraeche sich
                     die Seite. Nicht `raw.mitgliedtyp` direkt lesen. */
                  mitgliedtyp: istSichtbar(konfig, "mitgliedtyp") ? (raw.mitgliedtyp||null) : null,
                  hatTrainerKader: !!hatTrainerKader,
                  hatSpielerKader: !!hatSpielerKader,
                  hatFunktion: (raw.funktionen||[]).length>0,
                  rolleLabel: ROLLE_LABEL,
                })];
                /* ⚠ Hier stand bis zum 20.08.2026 pauschal „Ohne
                   Mitgliedschaft" — fuer alle 401 dasselbe, obwohl 394 davon
                   ELTERNTEILE sind und 7 Supporter. Seit der Migration
                   `migration_personenarten.sql` steht dort die ART.

                   ⚠ Aus `personenarten_effektiv`, also aus DERSELBEN Quelle
                   wie die Feldkonfiguration — nicht aus der Portalrolle.
                   `role === "eltern"` ist zweimal falsch gewesen: ein Vater,
                   der selbst spielt, bekommt `spieler`.

                   Alle Arten werden gezeigt, die bestimmende zuerst (kleinste
                   sort_order). Ein Ehemaliger mit Kind im Verein IST beides;
                   dass nur die erste den Feldsatz bestimmt, ist eine Regel
                   der Konfiguration und keine Aussage ueber den Menschen.

                   Wer keine Art hat, behaelt „Ohne Mitgliedschaft" — eine
                   ehrliche Auskunft und kein Platzhalter. Weggelassen waere
                   sie nicht: `heroChips` liefert ohne Mitgliedtyp und ohne
                   Kader nur noch die Portalrolle, und eine Kopfzeile mit einem
                   einzigen Chip ist von einer kaputten nicht zu
                   unterscheiden. */
                if (mitgliedId == null) {
                  const nachRang = [...arten].sort((a,b)=>a.sort_order-b.sort_order);
                  if (nachRang.length > 0) {
                    nachRang.slice().reverse().forEach(a =>
                      chips.unshift({ label: a.name, type: "status" }));
                  } else {
                    chips.unshift({ label: "Ohne Mitgliedschaft", type: "status" });
                  }
                }
                const MAX=isMobile?2:(chips||[]).length;
                const visible=chips.slice(0,MAX);
                const hidden=(chips||[]).length-MAX;
                return(
                  <>
                    {visible.map((c,i)=>(<span key={i} className={c.type==="portal"?"cc-hero-chip cc-hero-chip-primary":"cc-hero-chip"}>{c.label}</span>))}
                    {hidden>0&&<span className="cc-hero-chip">+{hidden}</span>}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="cc-hero-banner-actions">
            <div className="cc-hero-status-strip">
              {/* ⚠ `raw.aktiv!==false` ist bei `undefined` WAHR. Ohne die
                  Mitgliedschafts-Bedingung behauptete die Kopfzeile bei einem
                  Supporter „Aktiv" — fuer eine Mitgliedschaft, die es nicht
                  gibt. Beide Pillen beschreiben `mitglieder.aktiv`. */}
              {mitgliedId!=null&&raw.aktiv!==false&&<span className="cc-hero-status-pill cc-hero-status-pill-ok"><TI n="circle-check" size={11}/>Aktiv</span>}
              {mitgliedId!=null&&raw.aktiv===false&&<span className="cc-hero-status-pill cc-hero-status-pill-err"><TI n="user-off" size={11}/>Inaktiv</span>}
              {raw.fairgate_id&&<span className="cc-hero-status-pill"><TI n="refresh" size={11}/>Fairgate OK</span>}
              {/* Datenprüfung hängt an profil_geprueft_at — das früher hier
                  gelesene Feld `geprueft` gibt es in mitglieder nicht, die
                  Pille stand dadurch bei jedem Mitglied. Gleiche Korrektur
                  wie in memberMapper und DatenpruefungTab. */}
              {!raw.profil_geprueft_at&&<span className="cc-hero-status-pill cc-hero-status-pill-warn"><TI n="alert-triangle" size={11}/>Prüfung offen</span>}
            </div>
            {(canEdit||canDelete)&&(
              <div className="cc-hero-menu-trigger"><DropMenu items={[
                /* „Austritt" steht VOR „Archivieren" und ist der gemeinte Weg:
                   er fragt, was danach gilt. Archivieren bleibt daneben, weil
                   es etwas anderes ist — eine Mitgliedschaft stilllegen, ohne
                   ueber den Kontakt zu entscheiden (Fehleintrag, Dublette). */
                /* Ohne Mitgliedschaft steht hier der Weg hinein statt der
                   Wege hinaus. Kein ausgegrauter Knopf: was es nicht gibt,
                   erscheint nicht. */
                ...(canEdit&&mitgliedId==null&&onMitgliedWerden?[{icon:"user-plus",label:"Mitglied werden…",onClick:onMitgliedWerden}]:[]),
                ...(canEdit&&mitgliedId!=null&&raw.aktiv!==false&&onAustritt?[{icon:"door-exit",label:"Austritt…",onClick:()=>onAustritt(mitgliedId)}]:[]),
                ...(canEdit&&mitgliedId!=null&&raw.aktiv!==false?[{icon:"archive",label:"Archivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} archivieren?`,message:"Stillegen ohne Austritt — für Fehleinträge und Dubletten. Kann jederzeit reaktiviert werden.",confirmLabel:"Archivieren"});if(!ok||!sb)return;const n=account?.name||account?.email||"Administrator";if(vereinId) await logAktivitaet(sb,{ personId: raw.person_id, mitgliedId },vereinId,AKTIVITAET_TYP.ARCHIVIERT,"Mitglied archiviert",null,null,n);await archiviereMitglied(sb, [mitgliedId], n);if(onUpdatePortalZugang)await onUpdatePortalZugang(mitgliedId,false);if(onReload)onReload(mitgliedId);if(onRefreshCount)onRefreshCount();}}]:[]),
                ...(mitgliedId!=null&&raw.aktiv===false?["sep" as const,{icon:"user-check",label:"Reaktivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} reaktivieren?`,confirmLabel:"Reaktivieren"});if(!ok||!sb)return;const n=account?.name||account?.email||"Administrator";if(vereinId) await logAktivitaet(sb,{ personId: raw.person_id, mitgliedId },vereinId,AKTIVITAET_TYP.REAKTIVIERT,"Mitglied reaktiviert",null,null,n);await reaktiviereMitglied(sb, mitgliedId);if(onUpdatePortalZugang)await onUpdatePortalZugang(mitgliedId,true);if(onRefreshCount)onRefreshCount();if(onReaktiviert)onReaktiviert(mitgliedId);else if(onReload)onReload(mitgliedId);}}]:[]),
                "sep" as const,
                /* ⚠ Hiess bis zum 21.08.2026 nur „Löschen" — und in den Sammelaktionen
                   sogar „Löschen (DSGVO)". Beides versprach etwas, das nicht
                   geschieht: `deleteMitglied()` entfernt die MITGLIEDSCHAFT, die
                   Person bleibt vollständig stehen (Name, Adresse, Geburtsdatum,
                   AHV-Nummer, Konto). Bei einem echten Löschbegehren ist das kein
                   Schönheitsfehler — wer den Knopf benutzt hat, glaubt es erledigt.
                   Nur der Text ist geändert; das echte Löschen ist ein eigenes
                   Vorhaben mit Vorschau und Edge Function fuer auth.users. */
                ...(mitgliedId!=null?[{icon:"trash",label:"Mitgliedschaft löschen",danger:true,onClick:handleLoeschen}]:[]),
              ]}/></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export { MemberHero };
