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
  fetchPortalFunktionen, fetchMitglied,
  logAktivitaet, AKTIVITAET_TYP,
} from "../../domains/members/memberService.ts";
import { fetchPerson } from "../../domains/person/personService.ts";
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
import { getFeldkonfig, fuerMitgliedtyp, fuerPersonenart, istSichtbar, pflichtfelderAus, IMMER_PFLICHT_KEYS } from "../../domains/members/feldkonfig.ts";
import { bestimmendeArt } from "../../domains/person/personArtService.ts";
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
     nimmt auch jedes Feld an, das jemand vergisst.

     ⚠ DIE REIHENFOLGE IST UMGEDREHT (22.08.2026), und das war ein Defekt.
     Sie lautete `{...dbRaw, ...daten}` mit einem Filter, der jeden
     NICHT-NULL-Wert aus `daten` gewinnen liess. Der Zweck der Regel steht im
     Ursprungskommentar vom 08.07.2026: „m ueberschreibt die DB-Zeile dort, wo
     es einen Wert mitbringt" — gemeint war, dass das Ziel FUELLT, was `dbRaw`
     nicht hat (Navigations- und Archivobjekte, bei denen `dbRaw` leer ist).
     Gebaut war das Gegenteil: das Ziel SCHLUG die DB-Zeile.

     Solange `m` selbst frisch war, fiel das nicht auf. Seit dem
     Identitaets-Umbau (beee9bb, 21.08.2026) ist `m.daten` eine
     MOMENTAUFNAHME vom Oeffnen — und `reloadMember` legt die frischen Werte
     auf die oberste Ebene des Ziels, wo sie niemand liest. Damit war jedes
     Feld ab dem Oeffnen eingefroren. Gemeldet hat es niemand, weil nichts
     fehlschlug: die Datenbank war korrekt, nur die offene Seite zeigte den
     alten Stand. Aufgefallen an den Vereinsfunktionen, weil dort ein leeres
     Array (`[]`) den frischen Wert schlug — `[]` ist nicht null.

     Jetzt gewinnt `dbRaw`, WO ES DEN SCHLUESSEL HAT. Berechnete
     Anzeigefelder (`teams`, `alter`, `portal`, `datenpruefung`) ueberleben,
     weil `dbRaw` sie gar nicht fuehrt; bei Archivzeilen und Personen ohne
     Mitgliedschaft ist `dbRaw` leer und die Regel wirkungslos — fuer die
     sorgt `aktualisiere()`. */
  const raw = {
    ...(m.daten ?? {}),
    ...dbRaw,
    /* ⚠ DIE IDENTITAET KOMMT AUS DEM ZIEL, NICHT AUS DEN DATEN.
       Acht Stellen lesen `raw.person_id` — das Inline-Bearbeiten des ganzen
       Profils (InfoTab), der Foto-Upload, „Datenpruefung anfordern". Bei einer
       Zeile aus `mitglieder` steht sie als Spalte darin; bei einer Zeile aus
       `personen` NICHT: dort heisst die Id `id`, und `zielAusPerson` nimmt
       sie bewusst heraus, damit sie nicht als zweite Wahrheit im Datenblob
       landet.

       Ohne diese Zeile ginge auf der Personenseite jeder Schreibvorgang an
       `.eq("id", undefined)` — kein Absturz, keine Meldung, nur eine Eingabe,
       die nicht ankommt. Aufgefallen beim Durchgehen der Tabs, die eine
       Person seit Schritt 4 erreicht; ausgeliefert war es nie, weil
       `zielAusPerson` bis dahin keinen Aufrufer hatte.

       Sie steht NACH dem Spread und ueberschreibt damit auch einen Wert aus
       `daten`. Das ist der Punkt: `m.personId` ist die Wahrheit. */
    person_id: personId,
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
  /* ⚠ Ohne Mitgliedschaft entscheidet die ART, nicht mehr ein einziger
     Sammelwert. Seit dem 20.08.2026 gibt es eine pflegbare Liste: vom
     Elternteil will der Verein mehr wissen als vom Supporter. Welche Art
     gewinnt, sagt `bestimmendeArt()` — die mit der kleinsten sort_order,
     NICHT die Vereinigung aller (siehe dort). Ohne jede Art bleibt der
     strukturelle Standard. */
  const arten = m.arten ?? [];
  const konfig = getFeldkonfig(
    mitgliedId == null
      ? fuerPersonenart(bestimmendeArt(arten)?.art_id ?? null)
      : fuerMitgliedtyp(raw.mitgliedtyp),
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

  /**
   * Die geoeffnete Zeile neu holen — und in `daten` schreiben, also DORT,
   * WO DIE SEITE LIEST.
   *
   * ⚠ Das war die Luecke. `reloadMember` des Parents macht
   * `setSelectedMember(prev => ({...prev, ...data}))` — das legt die frischen
   * Werte auf die OBERSTE Ebene des Ziels, und die liest niemand; gelesen
   * wird `m.daten`. Ausserdem laeuft es nur `if (mitgliedId != null)`, half
   * einer Person ohne Mitgliedschaft also ohnehin nie.
   *
   * ⚠ ZWEI QUELLEN, EINE FRAGE: eine Mitgliedschaft kommt aus `fetchMitglied`
   * (flache Fassade inkl. Personenfeldern), eine Person aus `fetchPerson`.
   * Welche gilt, sagt `mitgliedId` — nicht der Aufrufer.
   *
   * `error` wird gelesen: ein fehlgeschlagenes Nachladen darf nicht aussehen
   * wie „es hat sich nichts geaendert".
   */
  /**
   * Der eine Nachladeweg der Seite: die Zeile selbst UND die Listen des
   * Parents. Fuenf Stellen riefen vorher jeweils eine eigene Kombination —
   * und keine davon frischte `daten` auf.
   */
  async function neuLaden() {
    /* ⚠ DARF NIE ABLEHNEN. Die Funktion wird an mehreren Stellen ohne `await`
       gerufen (`onReload={neuLaden}`, in Klick-Handlern) — ein Wurf darin
       waere eine unbehandelte Rejection, und die Seite bliebe still auf dem
       alten Stand. Gebunden und gemeldet statt verschluckt. */
    try {
      await aktualisiere();
    } catch (e) {
      console.error("neuLaden: Auffrischen fehlgeschlagen:", e);
    }
    if (reloadMember && mitgliedId != null) reloadMember(mitgliedId);
    if (onReload) onReload();
  }

  async function aktualisiere() {
    if (!sb) return;
    if (mitgliedId != null) {
      const frisch = await fetchMitglied(sb, mitgliedId);
      if (!frisch) { console.error("aktualisiere: Mitglied nicht ladbar", mitgliedId); return; }
      setSelectedMember(prev => prev ? { ...prev, daten: { ...prev.daten, ...frisch } } : prev);
      return;
    }
    const { person, fehler } = await fetchPerson(sb, personId);
    if (fehler || !person) { console.error("aktualisiere: Person nicht ladbar", personId, fehler); return; }
    setSelectedMember(prev => prev ? { ...prev, daten: { ...prev.daten, ...person } } : prev);
  }


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
    if (vereinId && mitgliedId != null) logAktivitaet(sb, { personId, mitgliedId }, vereinId, AKTIVITAET_TYP.PORTAL_DEAKTIVIERT, "Portal-Zugang deaktiviert", null, null, account?.name||account?.email||"Administrator");
    setPortalMsg({ ok: true, text: "Zugang deaktiviert" });
    setPortalLoading(false);
    neuLaden();
  }

  async function handleReactivate() {
    if (!sb || !benutzer) return;
    setPortalLoading(true);
    /* Ueber die PERSON und nur `aktiv`. Die Rolle wurde beim Abschalten nicht
       angefasst, also gibt es auch nichts wiederherzustellen. */
    await portalZugangReaktivieren(sb, personId);
    setBenutzer((prev: PortalBenutzer | null) => prev ? { ...prev, aktiv: true } : prev);
    if (vereinId && mitgliedId != null) logAktivitaet(sb, { personId, mitgliedId }, vereinId, AKTIVITAET_TYP.PORTAL_REAKTIVIERT, "Portal-Zugang reaktiviert", null, null, account?.name||account?.email||"Administrator");
    setPortalMsg({ ok: true, text: "Zugang reaktiviert ✓" });
    setPortalLoading(false);
    neuLaden();
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
        /* ⚠ `neuLaden`, ohne Fallunterscheidung. Hier stand
           `id => id ? neuLaden() : onReload()` — und `id` ist bei einer
           Person OHNE Mitgliedschaft `undefined`, also lief genau dort der
           blosse Listen-Reload, wo `dbRaw` leer ist und nichts auffrischt.
           Die Unterscheidung sah nach Ermessen aus und war keine. */
        sb={sb} onReload={neuLaden} onClose={onClose}
        onReaktiviert={onReaktiviert} onRefreshCount={refreshArchivCount}
        account={account} onUpdatePortalZugang={onUpdatePortalZugang}
        dbMitgliedtypen={dbMitgliedtypen} dbPortalRollen={dbPortalRollen} dbKaderRollen={dbKaderRollen}
        benutzer={benutzer} teamDetails={teamDetails}
        vereinId={vereinId} onAustritt={onAustritt}
        mitgliedId={mitgliedId} konfig={konfig} arten={arten}
        onMitgliedWerden={onMitgliedWerden ? (() => onMitgliedWerden(personId)) : null}
        darfPersonLoeschen={role === "administrator" || role === "administration"}
        onPersonGeloescht={() => { onClose(); onReload(); }}
      />

      {/* Tab-Bar */}
      <MemberTabBar tabs={allTabs} activeTab={sichtbarerTab} onTabChange={setTab}/>

      {/* Tab-Routing */}
      {sichtbarerTab === "info" && (
        <InfoTab
          mitgliedId={mitgliedId}
          darfMarkieren={role === "administrator" || role === "administration"}
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
          /* ⚠ `neuLaden`, NICHT `onReload`. Berichtigt am 23.08.2026: der
             Kopf von InfoTab behauptete seit dem 22.08., hier stehe
             `neuLaden` — hier stand das aeussere `onReload`, das nur die
             LISTE laedt. Fuer ein Mitglied fiel das nicht auf, weil `dbRaw`
             aus der Liste kommt und in der Mischung gewinnt; fuer eine Person
             OHNE Mitgliedschaft ist `dbRaw` leer, und dann frischt gar nichts
             auf. Genau diese Gruppe traegt die „offenen Punkte". */
          onReload={neuLaden} reloadMember={reloadMember} ableitRolle={ableitRolle}
          vereinId={vereinId}
        />
      )}

      {sichtbarerTab === "eltern" && (
        <ElternTab
          mitgliedId={mitgliedId!}
          eltern={eltern} canEdit={canEdit} sb={sb}
          onReload={neuLaden}
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
          onReload={neuLaden}
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
          /* ⚠ `neuLaden`, nicht `onReload`. Die Datenpruefung schreibt
             `profil_geprueft_at` und Personenfelder; mit dem blossen
             Listen-Reload frischte bei einer Person ohne Mitgliedschaft
             nichts auf. Gefunden am 23.08.2026 beim AUSZAEHLEN der
             Rueckrufe, nicht durch eine Meldung. */
          onReload={neuLaden}
        />
      )}

      {sichtbarerTab === "verlauf" && (
        <VerlaufTab raw={raw} sb={sb} personId={personId} key={`verlauf-${personId}-${raw.aktiv}-${raw.updated_at}`}/>
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
