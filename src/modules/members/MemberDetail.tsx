/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/MemberDetail.tsx
   State-Verwaltung, Tab-Bar, Tab-Routing
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import type { ComponentProps } from "react";
import { useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { ableitUndSaveRolle } from "../../domains/roles/roleUtils.ts";
import type { KaderRolleDb } from "../../domains/roles/roleUtils.ts";
import { initials as computeInitials } from "../../domains/person/personUtils.ts";
import {
  fetchBenutzerFuerPerson,
  portalZugangReaktivieren, portalZugangDeaktivieren,
  fetchElternkontakte, fetchKaderFuerMitglied,
  fetchPortalFunktionen,
  logAktivitaet, AKTIVITAET_TYP,
} from "../../domains/members/memberService.ts";
import { MemberHero } from "./MemberHero.tsx";
import { MemberTabBar } from "./MemberTabBar.tsx";
import { ElternTab } from "./tabs/ElternTab.tsx";
import { InfoTab } from "./tabs/InfoTab.tsx";
import { PortalTab } from "./tabs/PortalTab.tsx";
import type { PortalBenutzer } from "./tabs/PortalTab.tsx";
import { DatenpruefungTab } from "./tabs/DatenpruefungTab.tsx";
import type { StatusMeldung } from "./tabs/DatenpruefungTab.tsx";
import { VerlaufTab } from "./tabs/VerlaufTab.tsx";
import { getSichtbarkeit } from "./memberUtils.tsx";
import { getFeldkonfig, fuerMitgliedtyp, OHNE_MITGLIEDSCHAFT, istSichtbar, pflichtfelderAus, IMMER_PFLICHT_KEYS } from "../../domains/members/feldkonfig.ts";
import type { FeldkonfigZeile } from "../../domains/members/feldkonfig.ts";
import type { Account, Mitglied, Mitgliedtyp, PortalRolle, Sb, SetState , PersonZeile } from "../../types.ts";
import type { FunktionMitGruppe } from "../../shared/person/types.ts";

/* Aus den Service-Rückgaben abgeleitet */
type KaderDetail  = Awaited<ReturnType<typeof fetchKaderFuerMitglied>>[number];
type Elternkontakt = Awaited<ReturnType<typeof fetchElternkontakte>>[number];
type TeamOption   = NonNullable<ComponentProps<typeof InfoTab>["allTeams"]>;

/* Der Typ ist am 21.08.2026 nach `shared/person/personZiel.ts` gezogen und
   heisst dort `PersonZiel`. Der Grund steht in jener Datei: die Index-Signatur
   nahm jedes Objekt an, ein `as never` am Archiv-Einstieg nahm den Rest, und
   „keine Mitgliedschaft" wurde aus einem fehlenden Wert ABGELEITET.

   Der Alias bleibt, damit die Aufrufer ihren Import nicht anfassen muessen —
   er wandert mit der Seite nach shared/person/. */
export type { PersonZiel as SelectedMember } from "../../shared/person/personZiel.ts";
import type { PersonZiel } from "../../shared/person/personZiel.ts";
import { mitgliedIdVon } from "../../shared/person/personZiel.ts";

interface MemberDetailProps {
  m: PersonZiel;
  onClose: () => void;
  onNavToTeam?: ((teamId: number) => void) | null;
  onReaktiviert?: ((id: number) => void) | null;
  sb: Sb;
  role: string;
  /* Zeilen aus mitgliedtyp_feldkonfig, von Portal durchgereicht. */
  feldkonfig?: FeldkonfigZeile[];
  account?: Account | null;
  dbMitglieder?: Mitglied[];
  dbMitgliedtypen?: Mitgliedtyp[];
  dbPortalRollen?: PortalRolle[];
  dbKaderRollen?: KaderRolleDb[];
  kannVerwalten: (modul: string) => boolean;
  onReload: () => void;
  onUpdatePortalZugang?: ((mitgliedId: number, aktiv: boolean) => Promise<void> | void) | null;
  setSelectedMember: SetState<PersonZiel | null>;
  selectedMember: PersonZiel | null;
  reloadMember: (id: number) => void;
  refreshArchivCount: () => void;
  brauchtEltern: (mitgliedtyp: string | null | undefined) => boolean;
  onProfilGeprueft?: (() => void) | null;
  vereinId?: string | null;
  /** Öffnet den Austritt — die Rückfrage, was nach dem Austritt gilt. */
  onAustritt?: ((mitgliedId: number) => void) | null;
  /** Öffnet „Mitglied werden" für eine Person ohne Mitgliedschaft. */
  onMitgliedWerden?: ((personId: string) => void) | null;
  /** Öffnet die Personenseite einer ANDEREN Person — heute nur der Weg vom
      Kind zum Elternteil. Der Nachschlag in `personen` liegt beim Aufrufer,
      damit es nur einen Ort gibt, an dem eine Person geladen wird. */
  onOeffnePerson?: ((personId: string, name: string) => void) | null;
}

function MemberDetail({
  m, onClose, onNavToTeam = null, onReaktiviert = null,
  sb, role, account, feldkonfig = [],
  dbMitglieder = [], dbMitgliedtypen = [], dbPortalRollen = [], dbKaderRollen = [],
  kannVerwalten, onReload, onUpdatePortalZugang = null,
  setSelectedMember, selectedMember,
  reloadMember, refreshArchivCount, brauchtEltern, onProfilGeprueft = null,
  vereinId = null, onAustritt = null, onMitgliedWerden = null, onOeffnePerson = null,
}: MemberDetailProps) {
  /* Die beiden Identitäten, einmal ausgelesen. Ab hier steht im Code, welche
     gemeint ist — `raw.id` sagte das nicht. */
  const mitgliedId: number | null = mitgliedIdVon(m);
  const personId: string = m.personId;

  const dbRaw: Partial<Mitglied> = (mitgliedId != null
    ? dbMitglieder.find(d => d.id === mitgliedId)
    : undefined) || {};
  /* m überschreibt die DB-Zeile dort, wo es einen Wert mitbringt. Bei
     Navigations-/Archivobjekten ist dbRaw leer und das Ergebnis nur teilweise
     gefüllt; die Tabs lesen solche Felder aber defensiv (|| "—" etc.).
     `as PersonZeile` ist ein bewusster Boundary-Cast, aber ein ehrlicherer
     als frueher: bis zum 21.08.2026 stand hier `as Mitglied`, und darin war
     `id: number` enthalten. Damit las jede der ~75 Stellen `raw.id` als Zahl —
     bei einer Person ohne Mitgliedschaft waere sie `undefined` gewesen, ohne
     dass der Compiler ein Wort gesagt haette. `PersonZeile` laesst `id` weg;
     wer die Mitgliedschaft braucht, nimmt `mitgliedId`. */
  /* ⚠ Gemischt wird `m.daten`, nicht `m` selbst. Vorher lief hier
     `Object.entries(m)` ueber das ganze Ziel — moeglich nur, weil der Typ eine
     Index-Signatur hatte. Damit landete alles im `raw`, was ein Aufrufer
     mitgab, auch `_tab` und `_readonly`. Ein Objekt, das jedes Feld annimmt,
     nimmt auch jedes Feld an, das jemand vergisst. */
  const raw = {
    ...dbRaw,
    ...Object.fromEntries(
      Object.entries(m.daten ?? {}).filter(([k, v]) => v !== undefined && v !== null || !(dbRaw as Record<string, unknown>)[k])
    ),
  } as PersonZeile;
  /* Was es bei diesem Mitgliedtyp gibt (Konfiguration) UND wer es sehen
     darf (Rolle des Betrachters). "Gibt es nicht" gewinnt — siehe
     getSichtbarkeit in memberUtils. */
  /* MITGLIEDTYP: MemberDetail zeigt eine Mitgliedschaft. Die Fallunter-
     scheidung fuer Personen ohne Mitgliedschaft kommt mit der Personenseite —
     bis dahin erreicht diese Komponente niemanden ohne Mitgliedtyp. */
  /* ⚠ DAS IST DER SCHALTER DER GANZEN SEITE.
     Ohne Mitgliedschaft gilt die Achse `ohne_mitgliedschaft` (Migration vom
     21.08.2026). Daraus folgt von selbst, welche Felder und welche TABS
     erscheinen — `tab_stats`, `tab_verlauf` und `tab_eltern` tragen
     `nur_mitgliedschaft` und sind dort `aus`.

     Kein `if (istSupporter)` irgendwo auf dieser Seite: wo eine solche
     Abfrage nötig schiene, kennt die Konfiguration den Fall noch nicht. */
  const konfig = getFeldkonfig(
    mitgliedId == null ? OHNE_MITGLIEDSCHAFT : fuerMitgliedtyp(raw.mitgliedtyp),
    feldkonfig,
  );
  const fv = getSichtbarkeit(role, konfig);
  const tab = selectedMember?._tab || "info";
  const setTab = (t: string) => setSelectedMember(prev => prev ? { ...prev, _tab: t } : prev);
  const canEdit = kannVerwalten("members") && !m._readonly;
  const canDelete = kannVerwalten("members");
  const initials = computeInitials(m);

  /* ── State ── */
  const [benutzer, setBenutzer] = useState<PortalBenutzer | null>(null);
  const [portalMsg, setPortalMsg] = useState<StatusMeldung | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notizenCount, setNotizenCount] = useState<number | null>(null);
  const [elternLoaded, setElternLoaded] = useState<Elternkontakt[] | null>(null);
  /* Kein Rueckfall mehr auf `raw.eltern`: die Json-Altspalte wird von
     loadDbMitglieder() nie befuellt, der Zweig war immer leer. Geladen
     wird ausschliesslich ueber fetchElternkontakte() weiter unten. */
  const eltern = elternLoaded ?? [];
  const [teamDetails, setTeamDetails] = useState<KaderDetail[] | null>(null);
  const [allTeams, setAllTeams] = useState<TeamOption>([]);
  const [assignFunktionen, setAssignFunktionen] = useState<FunktionMitGruppe[]>([]);

  const [confirm, confirmDialog] = useConfirm();

  /* ── Daten laden ── */
  /* Benutzer: einmal beim Öffnen (fuer Hero + Tab-Zaehler) und erneut beim
     Wechsel auf den Portal-Tab (mit Ladeindikator, um Aenderungen zu sehen).
     Frueher zwei getrennte Effekte -> beim Direkteinstieg auf "portal"
     ein doppelter Request. */
  useEffect(() => {
    if (!sb) return;
    if (benutzer !== null && tab !== "portal") return;
    if (tab === "portal") setPortalLoading(true);
    fetchBenutzerFuerPerson(sb, personId).then(data => { setBenutzer(data); setPortalLoading(false); });
  }, [tab, personId]);

  useEffect(() => {
    if ((tab === "eltern" || (tab === "info" && brauchtEltern(raw.mitgliedtyp))) && sb && mitgliedId != null && elternLoaded === null) {
      fetchElternkontakte(sb, mitgliedId).then(data => setElternLoaded(data));
    }
  }, [tab, mitgliedId]);

  useEffect(() => {
    if (sb && mitgliedId != null) {
      fetchKaderFuerMitglied(sb, mitgliedId).then(data => setTeamDetails(data));
    }
  }, [mitgliedId]);

  useEffect(() => {
    if (sb && (assignFunktionen || []).length === 0) {
      fetchPortalFunktionen(sb).then(data => setAssignFunktionen(data));
    }
  }, [mitgliedId]);


  /* ── Aktionen ── */
  /* ── Portal-Zugang Logik ─────────────────────────────────────
     ableitRolle: leitet Portalrolle aus Kaderrolle/Mitgliedtyp ab
     handleUnlink: schaltet den Zugang ab (benutzer.aktiv = false)
     handleReactivate: schaltet ihn wieder an

     ⚠ Hier stand bis zum 21.08.2026 ein drittes, `handleLink` — „verknuepft
     Mitglied mit bestehendem Benutzer via E-Mail". Es wurde NIE gerendert:
     PortalTab zeigt im Fall „kein Zugang" nur den Hinweis, dass die Person
     sich selbst registriert und die Verknuepfung dabei automatisch entsteht
     (handle_new_user). Die Funktion rief `ableitUndSaveRolle(sb, mitgliedId!,
     …)` — mit einem Ausrufezeichen auf einem Wert, der bei einer Person ohne
     Mitgliedschaft null ist. Ein toter Zweig mit einer Luege darin.
  ── */
  async function ableitRolle() {
    if (!sb || mitgliedId == null) return;
    const neueRolle = await ableitUndSaveRolle(sb, mitgliedId, dbKaderRollen, raw.mitgliedtyp, raw.funktionen ?? []);
    /* Optimistisch nur die Rolle aktualisieren, wenn bereits ein Benutzer
       geladen ist. Ohne Benutzer gab es hier frueher einen als PortalBenutzer
       gecasteten Platzhalter mit lauter undefined-Feldern — der wurde beim
       gleich folgenden onReload() ohnehin durch die echte (ggf. leere) Zeile
       ersetzt. */
    setBenutzer((prev: PortalBenutzer | null) => prev ? { ...prev, role: neueRolle } : prev);
    if (onReload) onReload();
  }

  async function handleUnlink() {
    if (!sb) return;
    setPortalLoading(true);
    await portalZugangDeaktivieren(sb, personId);
    /* ⚠ Den Zustand mitfuehren. Der Tab laedt `benutzer` nur bei einem Wechsel
       von Tab oder Person nach ([tab, personId]) — ohne das bliebe das Abzeichen
       auf „Aktiv" stehen, waehrend darunter „Zugang deaktiviert" gemeldet wird.
       Solange das Abschalten nichts bewirkte, fiel der Widerspruch nicht auf. */
    setBenutzer((prev: PortalBenutzer | null) => prev ? { ...prev, aktiv: false } : prev);
    if (vereinId && mitgliedId != null) logAktivitaet(sb, mitgliedId, vereinId, AKTIVITAET_TYP.PORTAL_DEAKTIVIERT, "Portal-Zugang deaktiviert", null, null, account?.name||account?.email||"Administrator");
    setPortalMsg({ ok: true, text: "Zugang deaktiviert" });
    setPortalLoading(false);
    if (reloadMember && mitgliedId != null) reloadMember(mitgliedId);
    else if (onReload) onReload();
  }

  async function handleReactivate() {
    if (!sb || !benutzer) return;
    setPortalLoading(true);
    /* Ueber die PERSON und nur `aktiv`. Die Rolle wurde beim Abschalten nicht
       angefasst, also gibt es auch nichts wiederherzustellen. */
    await portalZugangReaktivieren(sb, personId);
    setBenutzer((prev: PortalBenutzer | null) => prev ? { ...prev, aktiv: true } : prev);
    if (vereinId && mitgliedId != null) logAktivitaet(sb, mitgliedId, vereinId, AKTIVITAET_TYP.PORTAL_REAKTIVIERT, "Portal-Zugang reaktiviert", null, null, account?.name||account?.email||"Administrator");
    setPortalMsg({ ok: true, text: "Zugang reaktiviert ✓" });
    setPortalLoading(false);
    if (reloadMember && mitgliedId != null) reloadMember(mitgliedId);
    else if (onReload) onReload();
  }

  /* ── Tab-Definitionen ── */
  const elternCount = elternLoaded !== null
    ? elternLoaded.length
    : (raw as any).eltern_kinder?.length ?? (eltern || []).length;
  /* "Profil" hat keinen Schalter — ohne ihn bliebe nichts. Die uebrigen
     fuenf kommen aus der Mitgliedtyp-Konfiguration (tab_*). */
  const allTabs = [
    { key: "info",          label: "Profil",                    icon: "user" },
    { key: "eltern",        label: `Eltern (${elternCount})`,   icon: "heart" },
    { key: "stats",         label: "Statistik",                 icon: "chart-bar" },
    { key: "portal",        label: "Portal-Zugang",             icon: "key" },
    { key: "datenpruefung", label: "Datenprüfung",              icon: "shield-check" },
    { key: "verlauf",       label: "Verlauf",                    icon: "history" },
  ].filter(t => t.key === "info" || istSichtbar(konfig, `tab_${t.key}`));

  /* Steht der gewaehlte Tab nicht mehr in der Liste — abgeschaltet, oder
     ueber einen Direkteinstieg angesteuert —, dann auf "Profil" zurueck.
     Ohne das bliebe die Tableiste leer und darunter der Inhalt eines Tabs,
     den es fuer diesen Mitgliedtyp nicht gibt. */
  const sichtbarerTab = allTabs.some(t => t.key === tab) ? tab : "info";
  return (
    <>{confirmDialog}
    <div className="cc-col cc-gap-12 cc-member-detail-wrap">

      {/* Hero */}
      <MemberHero
        m={m} raw={raw} initials={initials} canEdit={canEdit} canDelete={canDelete}
        sb={sb} onReload={id => id ? reloadMember(id) : onReload()} onClose={onClose}
        onReaktiviert={onReaktiviert} onRefreshCount={refreshArchivCount}
        account={account} onUpdatePortalZugang={onUpdatePortalZugang}
        dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
        benutzer={benutzer} teamDetails={teamDetails}
        vereinId={vereinId} onAustritt={onAustritt}
        mitgliedId={mitgliedId} konfig={konfig}
        onMitgliedWerden={onMitgliedWerden ? (() => onMitgliedWerden(personId)) : null}
      />

      {/* Tab-Bar */}
      <MemberTabBar tabs={allTabs} activeTab={sichtbarerTab} onTabChange={setTab}/>

      {/* Tab-Routing */}
      {sichtbarerTab === "info" && (
        <InfoTab
          mitgliedId={mitgliedId}
          raw={raw} fv={fv} canEdit={canEdit} canDelete={canDelete}
          sb={sb} account={account}
          dbKaderRollen={dbKaderRollen} dbMitgliedtypen={dbMitgliedtypen}
          hatPortalZugang={!!benutzer && benutzer.aktiv !== false}
          konfig={konfig}
          eltern={eltern} brauchtEltern={brauchtEltern} setTab={setTab}
          teamDetails={teamDetails} setTeamDetails={setTeamDetails}
          allTeams={allTeams} setAllTeams={setAllTeams}
          assignFunktionen={assignFunktionen} setAssignFunktionen={setAssignFunktionen}
          onNavToTeam={onNavToTeam}
          notizenCount={notizenCount} setNotizenCount={setNotizenCount}
          onReload={onReload} reloadMember={reloadMember} ableitRolle={ableitRolle}
          vereinId={vereinId}
        />
      )}

      {sichtbarerTab === "eltern" && (
        <ElternTab
          mitgliedId={mitgliedId!}
          eltern={eltern} canEdit={canEdit} sb={sb}
          onReload={() => { if (reloadMember && mitgliedId != null) reloadMember(mitgliedId); if (onReload) onReload(); }}
          setElternLoaded={setElternLoaded}
          vereinId={vereinId} account={account}
          onOeffnePerson={onOeffnePerson}
        />
      )}

      {sichtbarerTab === "portal" && (
        <PortalTab
          mitgliedId={mitgliedId}
          raw={raw} benutzer={benutzer} sb={sb}
          dbPortalRollen={dbPortalRollen}
          portalMsg={portalMsg} portalLoading={portalLoading}
          handleUnlink={handleUnlink} handleReactivate={handleReactivate}
          setBenutzer={setBenutzer}
          vereinId={vereinId} account={account}
          onReload={()=>{ if(reloadMember) if (mitgliedId != null) reloadMember(mitgliedId); if(onReload) onReload(); }}
        />
      )}

      {sichtbarerTab === "datenpruefung" && (
        <DatenpruefungTab
          raw={raw} sb={sb}
          role={role}
          /* Aus derselben Quelle wie der Hinweis im Portal: die
             Mitgliedtyp-Konfiguration. `konfig` steht hier schon, weil die
             Tab-Sichtbarkeit daran haengt. */
          pflichtfelder={[...IMMER_PFLICHT_KEYS, ...pflichtfelderAus(konfig)]}
          portalMsg={portalMsg} setPortalMsg={setPortalMsg}
          onReload={onReload}
        />
      )}

      {sichtbarerTab === "verlauf" && (
        <VerlaufTab raw={raw} sb={sb} mitgliedId={mitgliedId!} key={`verlauf-${mitgliedId}-${raw.aktiv}-${raw.updated_at}`}/>
      )}

      {(sichtbarerTab === "stats" || sichtbarerTab === "comments" || sichtbarerTab === "ratings") && (
        <div className="cc-empty-state">
          <div className="cc-empty-icon"><TI n="chart-bar" size={32}/></div>
          <div>Kommt bald</div>
        </div>
      )}

    </div>
    </>
  );
}

export { MemberDetail };
