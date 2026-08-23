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
import { PersonLoeschenModal } from "./PersonLoeschenModal.tsx";
import type { PersonArt } from "../../domains/person/personArtService.ts";
import { heroChips } from "../../domains/roles/roleUtils.ts";
import { updatePersonFoto, deletePersonFoto, reaktiviereMitglied, logAktivitaet, AKTIVITAET_TYP, fetchKaderFuerMitglied } from "../../domains/members/memberService.ts";
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
  /**
   * Zeigt den Eintrag „Person löschen (DSGVO)".
   *
   * ⚠ DIES IST KEINE RECHTEPRÜFUNG, sondern Sichtbarkeit. Geprüft wird
   * serverseitig in der Edge Function gegen `benutzer.ist_admin` und die
   * `verein_id` der Zielperson. Wer den Eintrag nicht sieht, kommt trotzdem
   * nicht durch — und wer ihn fälschlich sieht, auch nicht.
   */
  darfPersonLoeschen?: boolean;
  /** Läuft nach dem Löschen — die Person gibt es dann nicht mehr, der
      Aufrufer muss die Detailansicht schliessen und die Liste neu laden. */
  onPersonGeloescht?: (() => void) | null;
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

function MemberHero({m,raw,initials,arten=[],canEdit,canDelete=false,sb,onReload,onClose,onReaktiviert=null,onRefreshCount=null,account=null,onUpdatePortalZugang=null,dbMitgliedtypen=[],dbPortalRollen=[],dbKaderRollen=[],benutzer=null,teamDetails=null,vereinId=null,onAustritt=null,onMitgliedWerden=null,mitgliedId,konfig,darfPersonLoeschen=false,onPersonGeloescht=null}: MemberHeroProps){
  const [confirm,confirmDialog]=useConfirm();
  const isMobile=useIsMobile();
  const fotoInputRef=useRef<HTMLInputElement>(null);
  const [fotoOverlay,setFotoOverlay]=useState(false);
  const [loeschenOffen,setLoeschenOffen]=useState(false);

  async function handleHeroFotoUpload(e: ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file||!sb) return;
    await updatePersonFoto(sb, raw.person_id, file);
    if(onReload) onReload(mitgliedId ?? undefined);
  }



  return(
    <>{confirmDialog}
      {darfPersonLoeschen&&(
        <PersonLoeschenModal
          open={loeschenOffen}
          onClose={()=>setLoeschenOffen(false)}
          sb={sb}
          personId={raw.person_id}
          name={m.name}
          onGeloescht={()=>{
            /* Erst schliessen, dann melden: die Detailansicht zeigt sonst
               eine Person, die es nicht mehr gibt. */
            setLoeschenOffen(false);
            if(onPersonGeloescht) onPersonGeloescht();
            else if(onClose) onClose();
          }}/>
      )}
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
              /* ⚠ KEINE DREI PUNKTE MEHR, seit dem 24.08.2026. Sie sollten
                 sagen „hier kommt ein Dialog" — nur oeffnet JEDER Eintrag hier
                 einen, also unterschieden sie nichts. Und „Reaktivieren" trug
                 sie nie, obwohl es ebenfalls fragt: es war keine Regel, nur
                 eine Gewohnheit an vier von sechs Stellen. Eine Konvention,
                 die an der Haelfte der Stellen gilt, ist keine. */
              <div className="cc-hero-menu-trigger"><DropMenu items={[
                /* „Austritt" ist der Weg hinaus, und seit dem 23.08.2026 der
                   EINZIGE: er fragt, was danach gilt, was noch offen ist und
                   ob der Zugang endet. „Mitgliedschaft löschen" daneben ist
                   kein zweiter Austritt, sondern der Weg fuer einen
                   Fehleintrag oder eine Dublette — da war nie jemand Mitglied.

                   ⚠ Der Kommentar hier beschrieb bis heute „Archivieren", das
                   es nicht mehr gibt. Ein Kommentar, der einen entfernten
                   Knopf erklaert, ist schlimmer als keiner: er laesst den
                   Leser suchen. */
                /* Ohne Mitgliedschaft steht hier der Weg hinein statt der
                   Wege hinaus. Kein ausgegrauter Knopf: was es nicht gibt,
                   erscheint nicht. */
                ...(canEdit&&mitgliedId==null&&onMitgliedWerden?[{icon:"user-plus",label:"Mitglied werden",onClick:onMitgliedWerden}]:[]),
                /* ⚠ ZWEI EINTRAEGE, ZWEI UNTERTITEL. Seit dem 24.08.2026 hat das
                   Menue genau zwei Wege hinaus, und beide heissen nach der
                   HANDLUNG. Was sie unterscheidet, ist die FOLGE — und die
                   stand nirgends. Bei zwei Eintraegen traegt der Untertitel
                   erst recht: der Unterschied ist dann der einzige, den
                   jemand verstehen muss. (Entscheidung Didi, 24.08.2026.) */
                ...(canEdit&&mitgliedId!=null&&raw.aktiv!==false&&onAustritt?[{icon:"door-exit",label:"Austritt",sub:"Er war Mitglied und geht jetzt. Bleibt als Ehemaliger im System.",onClick:()=>onAustritt(mitgliedId)}]:[]),
                /* ⚠ „ARCHIVIEREN" IST AM 23.08.2026 WEGGEFALLEN. Es tat seit
                   dem 22.08. dasselbe wie der Austritt — dieselbe Funktion
                   `beendeVerknuepfungen()`, nur ohne waehlbares Datum und
                   ohne die Frage, was danach gilt. Zwei Knoepfe fuer einen
                   Vorgang, von denen einer weniger fragt, sind keine Wahl,
                   sondern eine Falle: man klickt den kuerzeren.

                   Was er allein konnte, ist in den Austritt gewandert: das
                   Haekchen „Portal-Zugang beenden". Und was er BEDEUTETE —
                   „noch etwas offen" — ist die Markierung. */
                ...(mitgliedId!=null&&raw.aktiv===false?["sep" as const,{icon:"user-check",label:"Reaktivieren",onClick:async()=>{const ok=await confirm({title:`${m.name} reaktivieren?`,confirmLabel:"Reaktivieren"});if(!ok||!sb)return;const n=account?.name||account?.email||"Administrator";if(vereinId) await logAktivitaet(sb,{ personId: raw.person_id, mitgliedId },vereinId,AKTIVITAET_TYP.REAKTIVIERT,"Mitglied reaktiviert",null,null,n);await reaktiviereMitglied(sb, mitgliedId);if(onUpdatePortalZugang)await onUpdatePortalZugang(mitgliedId,true);if(onRefreshCount)onRefreshCount();if(onReaktiviert)onReaktiviert(mitgliedId);else if(onReload)onReload(mitgliedId);}}]:[]),
/* ⚠ ZWEI EINTRAEGE HABEN HIER GESTANDEN UND SIND BEIDE GEFALLEN.

                   „Mitgliedschaft löschen" (23.08.2026): 0 von 515 Personen
                   haben mehr als eine Mitgliedschaft, und eine Dublette ist
                   eine doppelt angelegte PERSON. Er loeschte ausserdem per
                   KASKADE statt per Entscheidung — am schlimmsten
                   `eltern_kinder`, 399 Zeilen an 393 Mitgliedschaften: wer die
                   Mitgliedschaft eines Juniors loeschte, entfernte die
                   Verknuepfungen zu seinen Eltern, und die stehen in keinem
                   Verlauf.

                   „Mitgliedschaft zurücknehmen" (24.08.2026) war sein Ersatz
                   und deckte EINEN Fall ab: ein versehentliches „Mitglied
                   werden" umkehren. ⚠ Er ist nicht gefallen, weil er falsch
                   war — er tat genau das Richtige und weigerte sich, sobald
                   etwas daranhing. Er ist gefallen, weil DREIMAL gefragt
                   wurde, was ihn vom Austritt unterscheidet.

                   Ein Menueeintrag, den man sich erklaeren lassen muss, kostet
                   mehr als er einbringt. Was er verhinderte, ist eine
                   Mitgliedschaft von zwei Minuten in der Historie — ein
                   Schoenheitsfehler in einem Datensatz. Passiert es doch, wird
                   die Zeile von Hand weggeraeumt. (Entscheidung Didi,
                   24.08.2026.)

                   Damit hat das Menue zwei Wege hinaus, und beide tragen
                   ihre Folge als Untertitel. */
                /* ⚠ DER TRENNER GEHOERT ZWISCHEN DIE ZWEI LOESCHZEILEN, nicht
                   davor. Sie unterscheiden sich nur im Substantiv, beide rot,
                   beide mit Papierkorb — die Trennung muss aus dem ABSTAND
                   kommen, nicht aus dem Lesen zweier aehnlicher Woerter.
                   (Entscheidung Didi, 23.08.2026.) */
                ...(mitgliedId!=null&&darfPersonLoeschen?["sep" as const]:[]),
                /* ⚠ DIE ZWEITE, ECHTE LÖSCHAKTION — und sie steht bewusst
                   NEBEN der ersten, nicht statt ihr. „Mitgliedschaft löschen"
                   ist der Alltag (Fehleintrag, Dublette); dies hier ist das
                   Löschbegehren nach DSGVO und entfernt die Person samt
                   Anmeldekonto. Zwei Namen für zwei Vorgänge — bis zum
                   21.08.2026 hiess der obere „Löschen (DSGVO)" und tat das
                   Kleine unter dem Namen des Grossen. */
                ...(darfPersonLoeschen?[{icon:"trash",label:"Person löschen (DSGVO)",sub:"Alle Daten weg. Kein Zurück.",danger:true,onClick:()=>setLoeschenOffen(true)}]:[]),
              ]}/></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export { MemberHero };
