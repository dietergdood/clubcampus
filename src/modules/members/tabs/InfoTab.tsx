/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/InfoTab.tsx
   Profil-Tab: StatusTiles, Personalien, Kontakt, Vereinsdaten,
   Teams, Vereinsfunktionen, Notizen
   ═══════════════════════════════════════════════════════════════ */
import { useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Card, StatusTile, useIsMobile, InlineField } from "../../../theme.ts";
import { updatePerson } from "../../../domains/person/personService.ts";
import { TI } from "../../../icons.tsx";
import { PersonPersonalien } from "../../../shared/person/PersonPersonalien.tsx";
import { PersonKontakt } from "../../../shared/person/PersonKontakt.tsx";
import { PersonTeams } from "../../../shared/person/PersonTeams.tsx";
import { PersonFunktionen } from "../../../shared/person/PersonFunktionen.tsx";
import { NotizenVerlauf } from "../NotizenVerlauf.tsx";
import { useInlineEdit } from "../../../domains/members/useInlineEdit.ts";
import {
  updateMitglied, logAenderung, logAktivitaet, AKTIVITAET_TYP,
  fetchKaderFuerMitglied, fetchAktiveTeams, fetchPortalFunktionenMitGruppe,
  upsertKader, updateKader, deaktiviereKader,
} from "../../../domains/members/memberService.ts";
import { formatDatum } from "../../../domains/person/personUtils.ts";
import type { PersonTeamsService } from "../../../shared/person/PersonTeams.tsx";
import type { Account, Mitglied, Mitgliedtyp, Sb, PersonZeile } from "../../../types.ts";
import type { Sichtbarkeit } from "../../../shared/person/types.ts";
import { istBereichSichtbar } from "../../../domains/members/feldkonfig.ts";
import type { FeldModus } from "../../../domains/members/feldkonfig.ts";

/* Service-Buendel fuer PersonTeams — hier (modules -> domains erlaubt)
   gebuendelt und der shared-Komponente injiziert. */
const personTeamsSvc: PersonTeamsService = {
  fetchKaderFuerMitglied, fetchAktiveTeams, fetchPortalFunktionenMitGruppe,
  upsertKader, updateKader, deaktiviereKader, logAenderung, logAktivitaet, AKTIVITAET_TYP,
};

/* Die Teams-/Funktionen-Karten sind reines Durchreichen — ihre Formen
   direkt von den Kindern ableiten, statt sie hier zu wiederholen. */
type TeamsProps   = ComponentProps<typeof PersonTeams>;
type KontaktProps = ComponentProps<typeof PersonKontakt>;

interface InfoTabProps {
  raw: PersonZeile;
  /**
   * Die MITGLIEDSCHAFT, oder `null`.
   *
   * ⚠ Was daran haengt, ist Gruppe 2: Kaderzeilen (PersonTeams) und die
   * Aenderungshistorie. Die Personenfelder selbst gehen ueber `personId` —
   * `useInlineEdit` entscheidet nach dem FELD, nicht nach dem Aufrufer.
   */
  mitgliedId: number | null;
  fv: Sichtbarkeit;
  /* Modus je Schluessel fuer den Mitgliedtyp dieses Mitglieds —
     entscheidet, welche Bereiche es ueberhaupt gibt. */
  konfig: Record<string, FeldModus>;
  canEdit?: boolean;
  canDelete?: boolean;
  sb: Sb;
  account?: Account | null;
  dbKaderRollen?: TeamsProps["dbKaderRollen"];
  dbMitgliedtypen?: Mitgliedtyp[];
  eltern?: KontaktProps["eltern"];
  /* Ob ein Portal-Konto existiert und aktiv ist. Kommt aus `benutzer`, nicht
     mehr aus dem Kennzeichen mitglieder.hat_portal_zugang (Etappe 6c). */
  hatPortalZugang?: boolean;
  brauchtEltern: KontaktProps["brauchtEltern"];
  setTab: (tab: string) => void;
  teamDetails?: TeamsProps["teamDetails"];
  setTeamDetails: TeamsProps["setTeamDetails"];
  allTeams?: TeamsProps["allTeams"];
  setAllTeams: TeamsProps["setAllTeams"];
  assignFunktionen: NonNullable<TeamsProps["assignFunktionen"]>;
  setAssignFunktionen: TeamsProps["setAssignFunktionen"];
  onNavToTeam?: ((teamId: number) => void) | null;
  notizenCount?: number | null;
  setNotizenCount: (anzahl: number) => void;
  onReload?: (() => void) | null;
  reloadMember?: ((id: number) => void) | null;
  ableitRolle: () => Promise<void> | void;
  vereinId?: string | null;
}

function InfoTab({ mitgliedId,
  raw, fv, konfig, canEdit, canDelete, sb, account,
  dbKaderRollen, dbMitgliedtypen,
  eltern, brauchtEltern, setTab, hatPortalZugang = false,
  teamDetails, setTeamDetails,
  allTeams, setAllTeams,
  assignFunktionen, setAssignFunktionen,
  onNavToTeam,
  notizenCount, setNotizenCount,
  onReload, reloadMember=null, ableitRolle,
  vereinId,
}: InfoTabProps) {
  const isMobile = useIsMobile();
  const notizAddRef = useRef<(() => void) | null>(null);
  /* ⚠ `onReload` ist seit dem 22.08.2026 `neuLaden` aus MemberDetail: es
     frischt `m.daten` auf — DORT, wo die Seite liest. Vorher lief hier nur
     `reloadMember(mitgliedId)`, und das legte die frischen Werte auf die
     oberste Ebene des Ziels, wo sie niemand las. Jedes Feld war damit ab dem
     Oeffnen eingefroren; bei einer Person ohne Mitgliedschaft lief es wegen
     `mitgliedId != null` ohnehin ins Leere. */
  const reloadMemberFull = ()=>{ if(onReload)onReload(); };
  /* ie: Vereinsdaten-Felder (kein Aenderungslog). iePerson: Personalien/
     Kontakt — mit vereinId/account/rawData fuer die Aenderungshistorie. Beide
     hier erzeugt (modules -> domains erlaubt) und den shared-Komponenten
     als Prop injiziert, damit diese den Hook nicht selbst importieren. */
  const ie = useInlineEdit({ sb, personId: raw.person_id, mitgliedId, onReload: reloadMemberFull });
  const iePerson = useInlineEdit({ sb, personId: raw.person_id, mitgliedId, onReload: reloadMemberFull, vereinId, account, rawData: raw });
  const [editModeVerein, setEditModeVerein] = useState(false);
  const ieProps = { editing: ie.editing, editVal: ie.editVal, setEditVal: ie.setEditVal, startEdit: ie.startEdit, saveEdit: ie.saveEdit, cancelEdit: ie.cancelEdit, handleKey: ie.handleKey, feedback: ie.feedback, saving: ie.saving, canEdit: canEdit && editModeVerein };

  /* Persistenz + Aenderungslog fuer PersonFunktionen (frueher in der shared-
     Komponente). */
  const [funkFehler, setFunkFehler] = useState<string | null>(null);

  async function onSaveFunktionen(funktionen: string[]) {
    if (!sb) return;
    /* ⚠ DER RUECKGABEWERT WIRD GELESEN. `updatePerson` liefert `boolean` und
       meldet Fehler nur an `console.error`; bis zum 22.08.2026 warf diese
       Stelle ihn weg. Heute scheitert hier nichts — aber wenn es scheiterte,
       saehe der Bediener genau dasselbe wie bei Erfolg: das Modal geht zu,
       die Karte bleibt, wie sie war. Ein Fehler ohne Meldung ist von einer
       Datenlage nicht zu unterscheiden. */
    const ok = await updatePerson(sb as never, raw.person_id, { funktionen });
    if (!ok) {
      setFunkFehler("Die Vereinsfunktionen konnten nicht gespeichert werden.");
      return;
    }
    setFunkFehler(null);
    if (vereinId) {
      const alt = new Set(raw.funktionen || []);
      const neu = new Set(funktionen);
      const von = account?.name||account?.email||"Administrator";
      for (const f of funktionen.filter(f=>!alt.has(f))) if (mitgliedId != null) logAktivitaet(sb, { personId: raw.person_id, mitgliedId }, vereinId, AKTIVITAET_TYP.FUNKTION_GEAENDERT, `Vereinsfunktion hinzugefügt: ${f}`, "funktionen", f, von);
      for (const f of (raw.funktionen||[]).filter(f=>!neu.has(f))) if (mitgliedId != null) logAktivitaet(sb, { personId: raw.person_id, mitgliedId }, vereinId, AKTIVITAET_TYP.FUNKTION_GEAENDERT, `Vereinsfunktion entfernt: ${f}`, "funktionen", f, von);
    }
    reloadMemberFull();
  }

  const MITGLIEDTYP_OPTS = (dbMitgliedtypen||[]).map(t=>({v:t.name,l:t.name}));
  const eintrittsdatum = raw.eintrittsdatum;

  /* Welche Bereiche es gibt, sagt die Mitgliedtyp-Konfiguration. Bis zum
     19.08.2026 stand hier `raw.mitgliedtyp === "Supporter"` — ein
     Namensvergleich, der beim zweiten Verein mit einem anders benannten
     Typ nicht mehr griff und beim naechsten Sonderfall eine fuenfte Stelle
     gebraucht haette, an der im Code ueber ein Profil entschieden wird.

     Eine Karte, deren Eintraege alle auf "Gibt es nicht" stehen, darf ihre
     leere Huelle nicht rendern — sonst bliebe beim Supporter eine Karte mit
     einem "Zuweisen"-Knopf stehen, der zu etwas einlaedt, das nicht
     vorgesehen ist. Das entscheidet istBereichSichtbar(). */
  const zeigeVereinsdaten = istBereichSichtbar(konfig, "vereinsdaten");
  const zeigeTeams        = istBereichSichtbar(konfig, "teams");
  const zeigeFunktionen   = istBereichSichtbar(konfig, "funktionen");
  const zeigeNotizen      = istBereichSichtbar(konfig, "notizen") && fv.notizen;

  return (
    <div className="cc-col cc-gap-12">
      {/* StatusTiles */}
      <div className="cc-member-stats">
        <StatusTile
          label="Mitgliedschaft"
          value={raw.mitgliedtyp || "—"}
          icon="id-badge-2"
          semantic="neutral"
        />
        {/* Datenprüfung hängt an profil_geprueft_at — das früher hier
            gelesene Feld `geprueft` gibt es in mitglieder nicht, die Kachel
            stand dadurch immer auf "Ausstehend". Gleiche Korrektur wie in
            memberMapper, DatenpruefungTab und MemberHero. */}
        <StatusTile
          label="Datenprüfung"
          value={raw.profil_geprueft_at ? "Geprüft" : "Ausstehend"}
          icon={raw.profil_geprueft_at ? "shield-check" : "alert-circle"}
          semantic={raw.profil_geprueft_at ? "ok" : "warn"}
          action={!raw.profil_geprueft_at && canEdit ? { label: "Prüfung starten", onClick: () => setTab("datenpruefung") } : null}
        />
        <StatusTile
          label="Portal-Zugang"
          value={hatPortalZugang ? (isMobile ? "OK" : "Eingerichtet") : (isMobile ? "Fehlt" : "Nicht eingerichtet")}
          icon="key"
          semantic={hatPortalZugang ? "ok" : "warn"}
          action={!hatPortalZugang && canEdit ? { label: "Zugang erstellen", onClick: () => setTab("portal") } : null}
        />
        <StatusTile
          label="Fairgate"
          value={raw.fairgate_id ? (isMobile ? "Sync" : "Synchronisiert") : "—"}
          icon="refresh"
          semantic={raw.fairgate_id ? "ok" : "neutral"}
        />
      </div>

      {/* Grid: Personalien + Kontakt + Vereinsdaten + Teams + Funktionen + Notizen */}
      <div className="cc-grid-2">
        <PersonPersonalien raw={raw} fv={fv} canEdit={canEdit} ie={iePerson}/>

        <PersonKontakt
          raw={raw} fv={fv} canEdit={canEdit} ie={iePerson}
          eltern={eltern} brauchtEltern={brauchtEltern} setTab={setTab}
        />

        {/* Vereinsdaten */}
        {zeigeVereinsdaten && <Card className="cc-card-full">
          <div className="cc-section-title-row">
            <div className="cc-section-title"><TI n="building-community" size={14}/> Vereinsdaten</div>
            {canEdit && (
              <button className={`cc-card-edit-btn${editModeVerein?" cc-card-edit-btn-active":""}`}
                onClick={()=>setEditModeVerein(m=>!m)} title={editModeVerein?"Bearbeiten beenden":"Bearbeiten"}>
                <TI n={editModeVerein?"x":"pencil"} size={16}/>
              </button>
            )}
          </div>
          <div className="cc-info-grid">
            {/* Der Mitgliedtyp bleibt beim Supporter bewusst stehen: ein Typ,
                den man im Profil nicht ändern kann, ist eine Sackgasse —
                dasselbe Muster wie bei "Gibt es nicht", wo die Zeile
                sichtbar bleiben muss, um sie zurückholen zu können. */}
            {fv.mitgliedtyp&&(
              <InlineField label="Mitgliedtyp" field="mitgliedtyp" value={raw.mitgliedtyp||null}
                opts={MITGLIEDTYP_OPTS} {...ieProps}
                startEdit={()=>ie.startEdit("mitgliedtyp", raw.mitgliedtyp||"")}
                saveEdit={(f,v)=>ie.saveEdit(f,v)}/>
            )}
            {/* Spielerpass und J+S-Nr. hingen bis zum 19.08.2026 an EINEM
                Schalter (fv.showPass). Sie sind zwei Angaben: ein Junior hat
                einen Pass und keine J+S-Nummer, ein Trainer umgekehrt. */}
            {fv.spielerpass&&(
              <InlineField label="Spielerpass" field="spielerpass" value={raw.spielerpass||null} {...ieProps}/>
            )}
            {fv.js_nr&&(
              <InlineField label="J+S Nr."     field="js_nr"       value={raw.js_nr||null}       {...ieProps}/>
            )}
            {fv.fairgate_id&&(
              <InlineField label="Fairgate-ID" field="fairgate_id" value={raw.fairgate_id||null} {...ieProps}/>
            )}
            {/* eintrittsdatum ist seit der SQL-Migration vom 26.07.2026 eine
                echte Spalte (siehe Bridge-Typ in types.ts). */}
            {fv.eintrittsdatum&&(
              <div className="cc-info-row">
                <span className="cc-info-key">Eintritt</span>
                <span className={eintrittsdatum?"cc-info-val":"cc-info-val-empty"}>
                  {formatDatum(eintrittsdatum)}
                </span>
              </div>
            )}
          </div>
        </Card>}

        {/* PersonTeams und PersonFunktionen verlangen einen echten Client.
            Statt einer sb!-Assertion nur rendern, wenn sb gesetzt ist —
            das narrowt sb auf SbClient und faellt ohne Client sicher weg. */}
        {sb && zeigeTeams && <PersonTeams
          mitgliedId={mitgliedId}
          raw={raw} sb={sb} svc={personTeamsSvc} canEdit={canEdit}
          dbKaderRollen={dbKaderRollen}
          teamDetails={teamDetails} setTeamDetails={setTeamDetails}
          allTeams={allTeams} setAllTeams={setAllTeams}
          assignFunktionen={assignFunktionen} setAssignFunktionen={setAssignFunktionen}
          onNavToTeam={onNavToTeam}
          onReload={()=>{if(reloadMember&&mitgliedId!=null)reloadMember(mitgliedId);if(onReload)onReload();}} ableitRolle={ableitRolle}
          vereinId={vereinId} account={account}
        />}

        {sb && zeigeFunktionen && <PersonFunktionen
          raw={raw} canEdit={canEdit} canDelete={canDelete}
          assignFunktionen={assignFunktionen}
          onSaveFunktionen={onSaveFunktionen}
          fehler={funkFehler}
        />}

        {/* Notizen */}
        {zeigeNotizen && (
          <Card className="cc-card-full">
            <div className="cc-section-title cc-between">
              <span className="cc-row cc-gap-6">
                <TI n="notes" size={14}/> Notizen
                {notizenCount != null && notizenCount > 0 && <span className="cc-notiz-count-badge">{notizenCount}</span>}
              </span>
              {canEdit && (
                <button className="cc-btn-ghost" onClick={() => notizAddRef.current?.()}>
                  <TI n="plus" size={13}/> Notiz hinzufügen
                </button>
              )}
            </div>
            {/* ⚠ Notizen haengen seit dem 21.08.2026 an der PERSON, nicht
                mehr an der Mitgliedschaft. Sie galten als
                `nur_mitgliedschaft`, weil `mitglieder_notizen.mitglied_id`
                NOT NULL war — eine technische Grenze, als fachliche Regel
                behandelt. Ein Verein will ueber einen Supporter oder ein
                Elternteil sehr wohl etwas notieren koennen.

                Deshalb auch kein `mitgliedId != null` mehr davor: der Block
                erscheint jetzt fuer jede Person, und ob es ihn gibt,
                entscheidet allein die Feldkonfiguration. */}
            <NotizenVerlauf
              personId={raw.person_id}
              mitgliedId={mitgliedId}
              canEdit={canEdit}
              sb={sb}
              dbUser={account}
              onCount={setNotizenCount}
              vereinId={vereinId}
              onAddRef={notizAddRef}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export { InfoTab };
