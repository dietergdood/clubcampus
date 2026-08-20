/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/ElternTab.tsx
   Elternkontakte-Tab im Mitglied-Detail (n:m via eltern_kinder)

   Logik:
   - Ein Elternteil kann mehrere Kinder haben
   - hauptkontakt ist pro Kind in eltern_kinder gesetzt
   - Entknüpfen des letzten Kindes → Supporter oder Löschen (entkoppleKind)

   ⚠ Bearbeitet wird hier nichts mehr. Bis zum 21.08.2026 öffnete
   „Bearbeiten" ein `ElternkontaktModal` mit denselben Feldern, die die
   Personenseite ohnehin zeigt — zwei Masken für dieselbe Zeile in
   `personen`. Der Eintrag heisst jetzt „Profil öffnen" und führt dorthin.

   Was hier bleibt, hängt an der VERKNÜPFUNG (`eltern_kinder`) und nicht an
   der Person: Hauptkontakt, Entknüpfen, Hinzufügen. Deshalb steht es beim
   Kind und nicht beim Elternteil.
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, DropMenu, EmptyState, useConfirm } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { ElternSucheModal } from "../ElternSucheModal.tsx";
import {
  entkoppleKind, setHauptkontakt, clearHauptkontaktFuerKind, fetchElternkontakte,
  updateBenutzerRolle, loeschePersonWennVerwaist,
  logAktivitaet, AKTIVITAET_TYP,
} from "../../../domains/members/memberService.ts";
import { vollname } from "../../../domains/person/personUtils.ts";
import type { ElternkontaktMitLink, EntkoppelWunsch } from "../../../domains/members/elternService.ts";
import { EntkopplungModal } from "../EntkopplungModal.tsx";
import type { Account, Sb, SetState } from "../../../types.ts";

export function elternAvColor(beziehung: string | null | undefined){
  const b=(beziehung||"").toLowerCase();
  if(b==="mutter"||b==="grossmutter") return {bg:"#FDF2F8",text:"#9D174D"};
  if(b==="vater"||b==="grossvater")   return {bg:"#EFF6FF",text:"#1E40AF"};
  return {bg:"var(--surface2)",text:"var(--sub)"};
}

interface ElternTabProps {
  eltern: ElternkontaktMitLink[];
  canEdit?: boolean;
  /* ⚠ `raw` stand hier und wurde NIE gelesen — schon vor dem 21.08.2026 nicht
     (git show HEAD~1). Beim Aufraeumen der Modal-Reste mitgefallen: ein
     Parameter, den niemand liest, ist eine Zusage, die niemand einloest. */
  /**
   * Die MITGLIEDSCHAFT, zu der die Elternkontakte gehören.
   *
   * ⚠ Gruppe 2 durchgehend: `eltern_kinder.mitglied_id` ist NOT NULL — eine
   * Elternverknüpfung hängt an einer Mitgliedschaft, nicht an einer Person.
   * Der Tab erscheint für Personen ohne Mitgliedschaft ohnehin nicht
   * (`tab_eltern` trägt `nur_mitgliedschaft`), die Prop ist deshalb nicht
   * nullbar: wer ihn rendert, hat eine.
   */
  mitgliedId: number;
  sb: Sb;
  onReload?: (() => void) | null;
  setElternLoaded: SetState<ElternkontaktMitLink[] | null>;
  vereinId?: string | null;
  account?: Account | null;
  /* Mitgliedtypen mit hauptkontakt_pflicht — fuer die Kind-Auswahl im Modal */
  /**
   * Öffnet die Personenseite des Elternteils.
   *
   * ⚠ Die Seite ERSETZT den Aufruf, sie kommt nicht daneben: von hier führt
   * kein Weg zurück zum Kind. Das ist der Preis dafür, dass eine Person eine
   * Seite hat und nicht zwei Masken.
   */
  onOeffnePerson?: ((personId: string, name: string) => void) | null;
}

function ElternTab({ mitgliedId,eltern, canEdit, sb, onReload, setElternLoaded, vereinId=null, account=null, onOeffnePerson=null}: ElternTabProps){
  const [confirm, confirmDialog] = useConfirm();
  const [showSuche, setShowSuche] = useState(false);
  /* Offene Rueckfrage nach dem letzten Kind — null heisst: keine offen. */
  const [frage, setFrage] = useState<{personId:string; benutzerId:string|null; name:string}|null>(null);
  const geaendertVon = account?.name||account?.email||"Administrator";

  async function reload(){
    if(!sb) return;
    const data = await fetchElternkontakte(sb, mitgliedId);
    setElternLoaded(data);
    if(onReload) onReload();
  }

  async function handleEntknuepfen(e: ElternkontaktMitLink){
    if(!sb||!e.id) return;
    const name = e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
    const ok = await confirm({
      title:`${name} entknüpfen?`,
      message:"Dieses Kind wird vom Elternkontakt getrennt.",
      danger:true,
      confirmLabel:"Entknüpfen"
    });
    if(!ok) return;

    const folge = await entkoppleKind(sb, e.id, mitgliedId, e.benutzer_id);
    if(vereinId) logAktivitaet(sb,{ mitgliedId },vereinId,AKTIVITAET_TYP.ELTERN_ENTFERNT,`Elternkontakt entknüpft: ${name}`,"elternkontakte",name,geaendertVon);
    reload();
    /* War es das letzte Kind dieses Elternteils, ist noch offen, ob der Verein
       den Kontakt behaelt. entkoppleKind() entscheidet das seit dem
       20.08.2026 nicht mehr selbst. */
    if(folge==="frage") setFrage({personId:e.id, benutzerId:e.benutzer_id??null, name});
  }

  async function entscheideNachEntkopplung(wunsch: EntkoppelWunsch): Promise<string|null>{
    if(!sb||!frage) return "Keine Verbindung zur Datenbank.";
    if(wunsch==="supporter"){
      if(frage.benutzerId) await updateBenutzerRolle(sb, frage.benutzerId, "supporter");
      /* Ohne Konto ist nichts zu tun — die Person steht bereits ohne
         Mitgliedschaft und ohne Kind da, und das IST ein Supporter. */
    } else {
      await loeschePersonWennVerwaist(sb, frage.personId);
    }
    reload();
    return null;
  }

  async function handleHauptkontakt(e: ElternkontaktMitLink){
    if(!sb||!e.id) return;
    const name = vollname(e);
    if(!e.hauptkontakt){
      await setHauptkontakt(sb, mitgliedId, e.id, vereinId);
      if(vereinId) logAktivitaet(sb,{ mitgliedId },vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Hauptkontakt gesetzt: ${name}`,"elternkontakte",name,geaendertVon);
    } else {
      await clearHauptkontaktFuerKind(sb, e.id, mitgliedId);
      if(vereinId) logAktivitaet(sb,{ mitgliedId },vereinId,AKTIVITAET_TYP.ELTERN_GEAENDERT,`Hauptkontakt entfernt: ${name}`,"elternkontakte",name,geaendertVon);
    }
    reload();
  }

  return(
    <div className="cc-col cc-gap-8">
      <EntkopplungModal
        open={frage!==null}
        onClose={()=>setFrage(null)}
        name={frage?.name||"Diese Person"}
        onEntscheiden={entscheideNachEntkopplung}
      />
      {canEdit&&(
        <div className="cc-between">
          <div className="cc-text-sm">{eltern.length} Elternkontakt{eltern.length!==1?"e":""}</div>
          <Btn small onClick={()=>setShowSuche(true)}>
            <TI n="plus"/> Hinzufügen
          </Btn>
        </div>
      )}
      <ElternSucheModal
        open={showSuche}
        onClose={()=>setShowSuche(false)}
        mitgliedId={mitgliedId} sb={sb} vereinId={vereinId}
        geaendertVon={geaendertVon}
        onVerknuepft={()=>{
          setShowSuche(false);
          reload();
        }}
      />
      {eltern.length===0&&<EmptyState icon="heart" title="Keine Elternkontakte" subtitle="Noch kein Elternkontakt für dieses Mitglied erfasst."/>}
      {eltern.map((e,i)=>{
        const name = e.name||`${e.vorname||""} ${e.nachname||""}`.trim()||"?";
        /* Nur noch `telefon`: die zweite Spalte `tel` gab es allein in
           `elternkontakte` und ist mit Etappe 3 weggefallen. */
        const tel = e.telefon;
        const ac = elternAvColor(e.beziehung);
        return(
          <Card key={e.id||i} className={e.hauptkontakt?"cc-eltern-card-haupt":""}>
            <div className="cc-row cc-gap-12 cc-items-center">
              <div className="cc-eltern-av" style={{background:ac.bg,color:ac.text}}>
                {(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div className="cc-flex-1 cc-col cc-gap-5">
                <div className="cc-row cc-gap-8 cc-items-center cc-flex-wrap">
                  <span className="cc-text-bold cc-text-lg">{name}</span>
                  {e.hauptkontakt&&<span className="cc-badge-haupt">Hauptkontakt</span>}
                </div>
                {e.beziehung&&<span className="cc-text-sm">{e.beziehung}</span>}
                {e.email&&<a href={`mailto:${e.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{e.email}</a>}
                {tel&&<a href={`tel:${tel}`} className="cc-contact-link-plain"><TI n="phone" size={12}/>{tel}</a>}
              </div>
              {canEdit&&(
                <DropMenu items={[
                  ...(onOeffnePerson&&e.id?[{label:"Profil öffnen", icon:"user", onClick:()=>onOeffnePerson(e.id!, name)}]:[]),
                  {label:e.hauptkontakt?"Hauptkontakt entfernen":"Als Hauptkontakt setzen", icon:"star", onClick:()=>handleHauptkontakt(e)},
                  "sep",
                  {label:"Entknüpfen", icon:"unlink", danger:true, onClick:()=>handleEntknuepfen(e)},
                ]}/>
              )}
            </div>
            {/* Portal-Zugang ist Systemzustand, kein Kontaktdatum — deshalb
                abgesetzt in einer eigenen Zeile. Einrichten kann der Admin
                nicht: das Elternteil registriert sich selbst mit seiner
                hinterlegten E-Mail. */}
            <div className="cc-kontakt-fuss">
              {e.benutzer_id
                ? <span className="cc-status-active">Portal-Zugang aktiv</span>
                : e.email
                  ? <span className="cc-text-xs cc-text-sub">Kein Portal-Zugang — Registrierung mit {e.email} möglich</span>
                  : <span className="cc-text-xs cc-text-sub">Kein Portal-Zugang — keine E-Mail hinterlegt</span>
              }
            </div>
          </Card>
        );
      })}

      {confirmDialog}
    </div>
  );
}

export { ElternTab };
