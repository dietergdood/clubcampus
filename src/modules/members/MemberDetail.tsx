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
  fetchBenutzerFuerMitglied, fetchBenutzerByEmail,
  portalZugangAktivieren, portalZugangDeaktivieren,
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
import { getFieldVisibility } from "./memberUtils.tsx";
import type { Account, Mitglied, Mitgliedtyp, PortalRolle, Sb, SetState } from "../../types.ts";
import type { FunktionMitGruppe } from "../../shared/person/types.ts";

/* Aus den Service-Rückgaben abgeleitet */
type KaderDetail  = Awaited<ReturnType<typeof fetchKaderFuerMitglied>>[number];
type Elternkontakt = Awaited<ReturnType<typeof fetchElternkontakte>>[number];
type TeamOption   = NonNullable<ComponentProps<typeof InfoTab>["allTeams"]>;

/* Das ausgewählte Mitglied kommt je nach Einstieg in einer anderen Form:
   als gemappte Listenzeile, als schlankes Navigationsobjekt aus dem
   Kader-Modul oder als Archivzeile. Verlässlich sind nur id und name. */
export interface SelectedMember {
  id: number;
  name: string;
  /* Aktiver Tab, von der Liste beim Öffnen gesetzt */
  _tab?: string;
  /* Archiv öffnet Mitglieder schreibgeschützt */
  _readonly?: boolean;
  [key: string]: unknown;
}

interface MemberDetailProps {
  m: SelectedMember;
  onClose: () => void;
  onNavToTeam?: ((teamId: number) => void) | null;
  onReaktiviert?: ((id: number) => void) | null;
  sb: Sb;
  role: string;
  account?: Account | null;
  dbMitglieder?: Mitglied[];
  dbMitgliedtypen?: Mitgliedtyp[];
  dbPortalRollen?: PortalRolle[];
  dbKaderRollen?: KaderRolleDb[];
  kannVerwalten: (modul: string) => boolean;
  onReload: () => void;
  onUpdatePortalZugang?: ((mitgliedId: number, aktiv: boolean) => Promise<void> | void) | null;
  setSelectedMember: SetState<SelectedMember | null>;
  selectedMember: SelectedMember | null;
  reloadMember: (id: number) => void;
  refreshArchivCount: () => void;
  brauchtEltern: (mitgliedtyp: string | null | undefined) => boolean;
  onProfilGeprueft?: (() => void) | null;
  vereinId?: string | null;
}

function MemberDetail({
  m, onClose, onNavToTeam = null, onReaktiviert = null,
  sb, role, account,
  dbMitglieder = [], dbMitgliedtypen = [], dbPortalRollen = [], dbKaderRollen = [],
  kannVerwalten, onReload, onUpdatePortalZugang = null,
  setSelectedMember, selectedMember,
  reloadMember, refreshArchivCount, brauchtEltern, onProfilGeprueft = null,
  vereinId = null,
}: MemberDetailProps) {
  const dbRaw: Partial<Mitglied> = dbMitglieder.find(d => d.id === m.id) || {};
  /* m überschreibt die DB-Zeile dort, wo es einen Wert mitbringt. Bei
     Navigations-/Archivobjekten ist dbRaw leer und das Ergebnis nur teilweise
     gefüllt; die Tabs lesen solche Felder aber defensiv (|| "—" etc.).
     `as Mitglied` ist ein bewusster Boundary-Cast: die 11 abnehmenden Tabs
     erwarten `Mitglied` (u. a. ~70 `raw.id`-Zugriffe als `number`), ein
     `Partial<Mitglied>` würde dort ueberall Guards erzwingen — unverhaeltnis-
     maessig fuer den seltenen Teil-Fall. */
  const raw = {
    ...dbRaw,
    ...Object.fromEntries(
      Object.entries(m).filter(([k, v]) => v !== undefined && v !== null || !(dbRaw as Record<string, unknown>)[k])
    ),
  } as Mitglied;
  const fv = getFieldVisibility(role);
  const tab = selectedMember?._tab || "info";
  const setTab = (t: string) => setSelectedMember(prev => prev ? { ...prev, _tab: t } : prev);
  const canEdit = kannVerwalten("members") && !m._readonly;
  const canDelete = kannVerwalten("members");
  const initials = computeInitials(m);

  /* ── State ── */
  const [benutzer, setBenutzer] = useState<PortalBenutzer | null>(null);
  const [portalMsg, setPortalMsg] = useState<StatusMeldung | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [linkEmail, setLinkEmail] = useState(raw.email || "");
  const [notizenCount, setNotizenCount] = useState<number | null>(null);
  const [elternLoaded, setElternLoaded] = useState<Elternkontakt[] | null>(null);
  const eltern = elternLoaded !== null ? elternLoaded : (raw.eltern || []);
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
    if (!sb || !raw.id) return;
    if (benutzer !== null && tab !== "portal") return;
    if (tab === "portal") setPortalLoading(true);
    fetchBenutzerFuerMitglied(sb, raw.id).then(data => { setBenutzer(data); setPortalLoading(false); });
  }, [tab, raw.id]);

  useEffect(() => {
    if ((tab === "eltern" || (tab === "info" && brauchtEltern(raw.mitgliedtyp))) && sb && raw.id && elternLoaded === null) {
      fetchElternkontakte(sb, raw.id).then(data => setElternLoaded(data));
    }
  }, [tab, raw.id]);

  useEffect(() => {
    if (sb && raw.id) {
      fetchKaderFuerMitglied(sb, raw.id).then(data => setTeamDetails(data));
    }
  }, [raw.id]);

  useEffect(() => {
    if (sb && (assignFunktionen || []).length === 0) {
      fetchPortalFunktionen(sb).then(data => setAssignFunktionen(data));
    }
  }, [raw.id]);


  /* ── Aktionen ── */
  /* ── Portal-Zugang Logik ─────────────────────────────────────
     ableitRolle: leitet Portalrolle aus Kaderrolle/Mitgliedtyp ab
     handleLink:  verknüpft Mitglied mit bestehendem Benutzer via E-Mail
     handleUnlink: deaktiviert Portalzugang (Benutzer bleibt erhalten)
     handleReactivate: reaktiviert deaktivierten Portalzugang
  ── */
  async function ableitRolle() {
    if (!sb || !raw.id) return;
    const neueRolle = await ableitUndSaveRolle(sb, raw.id, dbKaderRollen, raw.mitgliedtyp, raw.funktionen ?? []);
    /* Optimistisch nur die Rolle aktualisieren, wenn bereits ein Benutzer
       geladen ist. Ohne Benutzer gab es hier frueher einen als PortalBenutzer
       gecasteten Platzhalter mit lauter undefined-Feldern — der wurde beim
       gleich folgenden onReload() ohnehin durch die echte (ggf. leere) Zeile
       ersetzt. */
    setBenutzer(prev => prev ? { ...prev, role: neueRolle } : prev);
    if (onReload) onReload();
  }

  async function handleLink() {
    if (!sb || !linkEmail) return;
    setPortalLoading(true); setPortalMsg(null);
    const existing = await fetchBenutzerByEmail(sb, linkEmail);
    if (existing) {
      const neueRolle = await ableitUndSaveRolle(sb, raw.id, dbKaderRollen, raw.mitgliedtyp, raw.funktionen ?? []);
      await portalZugangAktivieren(sb, raw.id, existing.id, neueRolle);
      setPortalMsg({ ok: true, text: `Verknüpft ✓ — Rolle: ${neueRolle}` });
      if (reloadMember) reloadMember(raw.id);
      else if (onReload) onReload();
    } else {
      setPortalMsg({ ok: false, text: "Kein Benutzer mit dieser E-Mail gefunden." });
    }
    setPortalLoading(false);
  }

  async function handleUnlink() {
    if (!sb) return;
    setPortalLoading(true);
    await portalZugangDeaktivieren(sb, raw.id);
    if (vereinId) logAktivitaet(sb, raw.id, vereinId, AKTIVITAET_TYP.PORTAL_DEAKTIVIERT, "Portal-Zugang deaktiviert", null, null, account?.name||account?.email||"Administrator");
    setPortalMsg({ ok: true, text: "Zugang deaktiviert" });
    setPortalLoading(false);
    if (reloadMember) reloadMember(raw.id);
    else if (onReload) onReload();
  }

  async function handleReactivate() {
    if (!sb || !benutzer) return;
    setPortalLoading(true);
    await portalZugangAktivieren(sb, raw.id, benutzer.id, benutzer.role);
    if (vereinId) logAktivitaet(sb, raw.id, vereinId, AKTIVITAET_TYP.PORTAL_REAKTIVIERT, "Portal-Zugang reaktiviert", null, null, account?.name||account?.email||"Administrator");
    setPortalMsg({ ok: true, text: "Zugang reaktiviert ✓" });
    setPortalLoading(false);
    if (reloadMember) reloadMember(raw.id);
    else if (onReload) onReload();
  }

  /* ── Tab-Definitionen ── */
  const allTabs = [
    { key: "info",          label: "Profil",         icon: "user" },
    { key: "eltern",        label: `Eltern (${(eltern || []).length})`, icon: "heart" },
    { key: "stats",         label: "Statistik",      icon: "chart-bar" },
    { key: "portal",        label: "Portal-Zugang",  icon: "key" },
    { key: "datenpruefung", label: "Datenprüfung",   icon: "shield-check" },
    { key: "verlauf",       label: "Verlauf",         icon: "history" },
  ];
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
        vereinId={vereinId}
      />

      {/* Tab-Bar */}
      <MemberTabBar tabs={allTabs} activeTab={tab} onTabChange={setTab}/>

      {/* Tab-Routing */}
      {tab === "info" && (
        <InfoTab
          raw={raw} fv={fv} canEdit={canEdit} canDelete={canDelete}
          sb={sb} account={account}
          dbKaderRollen={dbKaderRollen} dbMitgliedtypen={dbMitgliedtypen}
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

      {tab === "eltern" && (
        <ElternTab
          eltern={eltern} canEdit={canEdit} raw={raw} sb={sb}
          onReload={() => { if (reloadMember) reloadMember(raw.id); if (onReload) onReload(); }}
          setElternLoaded={setElternLoaded}
          vereinId={vereinId} account={account}
        />
      )}

      {tab === "portal" && (
        <PortalTab
          raw={raw} benutzer={benutzer} sb={sb}
          dbPortalRollen={dbPortalRollen}
          portalMsg={portalMsg} portalLoading={portalLoading}
          handleUnlink={handleUnlink} handleReactivate={handleReactivate}
          setBenutzer={setBenutzer}
          vereinId={vereinId} account={account}
          onReload={()=>{ if(reloadMember) reloadMember(raw.id); if(onReload) onReload(); }}
        />
      )}

      {tab === "datenpruefung" && (
        <DatenpruefungTab
          raw={raw} sb={sb}
          portalMsg={portalMsg} setPortalMsg={setPortalMsg}
          onReload={onReload}
        />
      )}

      {tab === "verlauf" && (
        <VerlaufTab raw={raw} sb={sb} key={`verlauf-${raw.id}-${raw.aktiv}-${raw.updated_at}`}/>
      )}

      {(tab === "stats" || tab === "comments" || tab === "ratings") && (
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
