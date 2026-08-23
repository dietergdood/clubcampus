// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/memberDetail.test.jsx
   Unit-Tests für den MemberDetail-Orchestrator:
   - raw-Rekonstruktion (dbRaw + m; die LEBENDE DB-Zeile gewinnt)
   - Benutzer-Fetch beim Öffnen + Dedup (kein Refetch bei Nicht-Portal-Tab)

   MemberHero wird gemockt, um das rekonstruierte raw abzugreifen.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';
/* ⚠ Die Testziele kommen aus DENSELBEN Fabriken wie im Betrieb. Vorher waren
   es Objektliterale — moeglich nur, weil der Typ eine Index-Signatur hatte.
   Ein Test, der sein Ziel anders baut als der Produktionscode, prueft eine
   Form, die es nirgends gibt. */
import { zielAusMitglied, zielAusPerson } from '../../../shared/person/personZiel.ts';

const h = vi.hoisted(() => ({ heroRaw: null, heroMitgliedId: null, heroName: null, confirmMock: vi.fn(), portal: null, infoOnReload: null }));
const svc = vi.hoisted(() => ({
  fetchBenutzerFuerPerson: vi.fn(),
  portalZugangReaktivieren: vi.fn(),
  portalZugangDeaktivieren: vi.fn(),
  fetchElternkontakte: vi.fn(),
  fetchKaderFuerMitglied: vi.fn(),
  fetchPortalFunktionen: vi.fn(),
  fetchMitglied: vi.fn(),
  logAktivitaet: vi.fn(),
  /* ⚠ Hier statt inline in der Factory: nur so kann ein Fall den Rueckgabewert
     steuern und die Aufrufe zaehlen. Inline definiert ist die Attrappe zwar
     wirksam, aber fuer den Test unerreichbar. */
  fetchPerson: vi.fn(),
}));

vi.mock('../../../theme.ts', () => ({
  ModalOrSheet: ({children,open})=>open?<div>{children}</div>:null,
  InfoBox: ({text})=><div>{text}</div>,
  Col: ({children})=><div>{children}</div>,
  Label: ({children})=><span>{children}</span>,
  Input: (p)=><input {...p}/>, useConfirm: () => [h.confirmMock, null] }));
vi.mock('../../../icons.tsx', () => ({ TI: () => null }));
vi.mock('../../../domains/roles/roleUtils.ts', () => ({ ableitUndSaveRolle: vi.fn().mockResolvedValue('trainer') }));
vi.mock('../../../domains/person/personUtils.ts', () => ({ initials: () => 'XX' }));
/* ⚠ Die Attrappe liefert die ECHTE Form `{ person, fehler }`. `vi.fn()` ohne
   Rueckgabe liefert `undefined`, und die Destrukturierung im Produktionscode
   wirft — als unbehandelte Rejection, die keinen Test rot macht. Eine
   Attrappe, die den Vertrag nicht kennt, prueft etwas anderes als das, was
   laeuft. */
vi.mock('../../../domains/person/personService.ts', () => ({
  fetchPerson: svc.fetchPerson,
}));
vi.mock('../../../domains/members/memberService.ts', () => ({
  ...svc,
  AKTIVITAET_TYP: { PORTAL_DEAKTIVIERT: 'portal_deaktiviert', PORTAL_REAKTIVIERT: 'portal_reaktiviert' },
}));

vi.mock('../MemberHero.tsx', () => ({ MemberHero: (props) => { h.heroRaw = props.raw; h.heroMitgliedId = props.mitgliedId; h.heroName = props.m?.name; return null; } }));
vi.mock('../MemberTabBar.tsx', () => ({ MemberTabBar: () => null }));
vi.mock('../tabs/ElternTab.tsx', () => ({ ElternTab: () => null }));
/* ⚠ Die Attrappe greift `onReload` ab. Dass InfoTab den AUFFRISCHENDEN
   Rueckruf bekommt und nicht den Listen-Reload, war vom 22. bis 23.08.2026
   nur ein Kommentar — und der stand im Kopf von InfoTab, waehrend die
   Aufrufstelle etwas anderes uebergab. */
vi.mock('../tabs/InfoTab.tsx', () => ({
  InfoTab: (props) => { h.infoOnReload = props.onReload; return null; },
}));
/* Nicht `() => null`: der Tab traegt die zwei Schalter, um die es unten
   geht. Die Attrappe haelt seine Props fest, damit der Test sie aufrufen
   und danach nachsehen kann, was der Tab zu sehen bekommt. */
vi.mock('../tabs/PortalTab.tsx', () => ({ PortalTab: (props) => { h.portal = props; return null; } }));
vi.mock('../tabs/DatenpruefungTab.tsx', () => ({ DatenpruefungTab: () => null }));
vi.mock('../tabs/VerlaufTab.tsx', () => ({ VerlaufTab: () => null }));
/* Die Mock-Factory listet die benoetigten Exporte einzeln auf — fehlt einer,
   wirft Vitest schon bei der blossen Referenz, und zwar fuer die ganze
   Datei (CLAUDE.md, "Haeufigste Testfalle"). getSichtbarkeit ist seit dem
   19.08.2026 dazugekommen. */
vi.mock('../memberUtils.tsx', () => ({
  getFieldVisibility: () => ({}),
  getSichtbarkeit: () => ({}),
}));

import { MemberDetail } from '../MemberDetail.tsx';

const sb = { _tag: 'sb' };

function props(overrides = {}) {
  const { m = { mitgliedId: 1, personId: "p-1", name: 'X' }, tab = 'info', dbMitglieder = [], sb: sbProp = sb, ...rest } = overrides;
  return {
    m,
    onClose: vi.fn(),
    sb: sbProp,
    role: 'administrator',
    account: { name: 'Admin' },
    dbMitglieder,
    dbMitgliedtypen: [],
    dbPortalRollen: [],
    dbKaderRollen: [],
    kannVerwalten: () => true,
    onReload: vi.fn(),
    setSelectedMember: vi.fn(),
    selectedMember: { id: m.id, name: m.name, _tab: tab },
    reloadMember: vi.fn(),
    refreshArchivCount: vi.fn(),
    brauchtEltern: () => false,
    vereinId: 'verein-1',
    ...rest,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.fetchPerson.mockResolvedValue({ person: null, fehler: null });
  h.heroRaw = null;
  h.heroMitgliedId = null;
  h.heroName = null;
  h.portal = null;
  h.confirmMock.mockResolvedValue(true);
  svc.fetchBenutzerFuerPerson.mockResolvedValue({ id: 'u1', role: 'trainer' });
  svc.fetchElternkontakte.mockResolvedValue([]);
  svc.fetchKaderFuerMitglied.mockResolvedValue([]);
  svc.fetchPortalFunktionen.mockResolvedValue([]);
});
afterEach(cleanup);

describe('MemberDetail — raw-Rekonstruktion', () => {
  /* ⚠ DIESER FALL IST AM 22.08.2026 UMGEDREHT WORDEN, und zwar bewusst.
     Er hielt vorher fest: „m gewinnt bei eigenem Wert". Genau das WAR der
     Defekt — seit dem Identitaets-Umbau (beee9bb, 21.08.2026) ist `m.daten`
     eine Momentaufnahme vom Oeffnen, und sie schlug die laufend nachgeladene
     DB-Zeile. Jedes Feld war ab dem Oeffnen eingefroren.

     Der Test wird also nicht angepasst, bis er gruen ist — die REGEL hat sich
     geaendert, und er haelt jetzt die neue fest. Der Zweck der Mischung steht
     im Ursprungskommentar vom 08.07.2026: das Ziel FUELLT, was `dbRaw` nicht
     hat. Gebaut war das Gegenteil. */
  it('die lebende DB-Zeile gewinnt — das Ziel füllt nur, was ihr fehlt', async () => {
    const dbMitglieder = [{ id: 1, vorname: 'DBVor', nachname: 'DBNach', email: 'db@x.ch' }];
    const m = zielAusMitglied({ id: 1, person_id: 'p-1', vorname: 'MVor', spitzname: 'Nur im Ziel' }, 'X');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder })} />); });

    expect(h.heroRaw.vorname).toBe('DBVor');        // dbRaw gewinnt
    expect(h.heroRaw.nachname).toBe('DBNach');      // nur in dbRaw
    expect(h.heroRaw.spitzname).toBe('Nur im Ziel'); // nur im Ziel -> bleibt
  });

  it('⚠ ein leeres Array im Ziel verdeckt den frischen Wert NICHT', async () => {
    /* DER FALL, AN DEM ES AUFGEFALLEN IST. Wer keine Vereinsfunktion hat,
       traegt `daten.funktionen = []` — und `[]` ist nicht null, kam also
       durch den alten Filter und schlug die frisch geladene Liste. Deshalb
       traf es ausgerechnet „erste Funktion hinzufuegen": geschrieben wurde
       sie, die offene Seite zeigte sie nie. */
    const dbMitglieder = [{ id: 1, funktionen: ['Kassier'] }];
    const m = zielAusMitglied({ id: 1, person_id: 'p-1', funktionen: [] }, 'X');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder })} />); });

    expect(h.heroRaw.funktionen).toEqual(['Kassier']);
  });

  it('rekonstruiert aus m, wenn keine DB-Zeile existiert (Navigationsobjekt)', async () => {
    const m = zielAusMitglied({ id: 5, person_id: 'p-5', vorname: 'NV' }, 'Nav');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [] })} />); });

    /* ⚠ `raw.id` gibt es seit dem 21.08.2026 nicht mehr — `PersonZeile` laesst
       es weg. Die Zeile beschreibt einen MENSCHEN; welche Identitaet gemeint
       ist, steht daneben (`mitgliedId` als eigene Prop an den Hero).
       Frueher pruefte dieser Test genau die Zahl, die bei einer Person ohne
       Mitgliedschaft `undefined` gewesen waere. */
    expect(h.heroRaw.id).toBeUndefined();
    expect(h.heroMitgliedId).toBe(5);
    expect(h.heroRaw.vorname).toBe('NV');
    /* ⚠ `raw.name` gibt es NICHT mehr — und es hat nie eine Entsprechung
       gehabt: `mitglieder` hat keine Spalte `name`. Das Feld stand nur im
       `raw`, weil die Index-Signatur des alten Ziels jedes Feld durchliess.
       Der Name kommt aus `m.name` und geht als eigene Prop an den Hero. */
    expect(h.heroRaw.name).toBeUndefined();
    expect(h.heroName).toBe('Nav');
  });
});

describe('MemberDetail — Benutzer-Fetch', () => {
  it('lädt den Benutzer einmal beim Öffnen mit (sb, id)', async () => {
    await act(async () => { render(<MemberDetail {...props({ m: { mitgliedId: 1, personId: "p-1", name: 'X' } })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledWith(sb, "p-1"));
    expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledTimes(1);
  });

  it('lädt nicht ohne sb', async () => {
    await act(async () => { render(<MemberDetail {...props({ sb: null })} />); });
    expect(svc.fetchBenutzerFuerPerson).not.toHaveBeenCalled();
  });

  it('lädt beim direkten Einstieg auf den Portal-Tab', async () => {
    await act(async () => { render(<MemberDetail {...props({ tab: 'portal' })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledWith(sb, "p-1"));
  });

  it('kein Refetch beim Wechsel auf einen Nicht-Portal-Tab', async () => {
    const base = props({ tab: 'info' });
    const { rerender } = render(<MemberDetail {...base} />);
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledTimes(1));

    // Tab-Wechsel info -> eltern: Benutzer ist geladen -> kein erneuter Fetch
    await act(async () => {
      rerender(<MemberDetail {...base} selectedMember={{ mitgliedId: 1, personId: "p-1", name: 'X', _tab: 'eltern' }} />);
    });
    expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledTimes(1);
  });
});

/* ═══════════════════════════════════════════════════════════════
   Eine Person OHNE Mitgliedschaft (21.08.2026)

   Der Schalter der ganzen Seite ist EINE Zeile: welche Achse der
   Feldkonfiguration gilt. Alles andere folgt daraus — kein
   `if (istSupporter)` irgendwo.
   ═══════════════════════════════════════════════════════════════ */
describe('MemberDetail — ohne Mitgliedschaft', () => {
  const ohne = zielAusPerson({ id: 'p-9' }, 'Petra Muster');

  it('reicht mitgliedId=null an den Hero durch', async () => {
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    expect(h.heroMitgliedId).toBeNull();
  });

  it('⚠ sucht das Konto ueber die PERSON, nicht ueber die Mitgliedschaft', async () => {
    /* Beim Supporter steht benutzer.mitglied_id seit dem Rueckbau vom
       20.08. auf null — ueber sie waere das Konto nie gefunden worden. */
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    await waitFor(() => expect(svc.fetchBenutzerFuerPerson).toHaveBeenCalledWith(sb, 'p-9'));
  });

  it('laedt weder Kader noch Elternkontakte', async () => {
    /* Beides haengt an einer Mitgliedschaft. Frueher waere `raw.id`
       undefined an die Services gegangen — als number typisiert. */
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    expect(svc.fetchKaderFuerMitglied).not.toHaveBeenCalled();
    expect(svc.fetchElternkontakte).not.toHaveBeenCalled();
  });

  it('bei einem Mitglied wird der Kader sehr wohl geladen', async () => {
    /* Die Gegenprobe: sonst koennte der Test oben auch gruen sein, weil
       gar nichts mehr geladen wird. */
    const m = zielAusMitglied({ id: 1, person_id: 'p-1' }, 'X');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [{ id: 1 }] })} />); });
    await waitFor(() => expect(svc.fetchKaderFuerMitglied).toHaveBeenCalledWith(sb, 1));
  });
});

/* ═══════════════════════════════════════════════════════════════
   ⚠ Ein fehlender Wert ist keine Aussage (21.08.2026)

   Der Archiv-Einstieg baute sein Ziel mit `as never` und liess dabei
   `mitgliedId` und `personId` weg. `mitgliedId === undefined` las die
   Seite als „keine Mitgliedschaft": ein archiviertes Juniorenmitglied
   verlor Eltern-, Statistik- und Verlauf-Tab, die Teams-Karte und die
   Vereinsdaten — waehrend der Kopf weiterhin „Juniorenmitglied" zeigte.

   Der Cast war das Loch. Diese Faelle halten fest, dass ein Mitglied
   ein Mitglied bleibt, egal ueber welchen Einstieg es geoeffnet wird.
   ═══════════════════════════════════════════════════════════════ */
describe('MemberDetail — ein Mitglied bleibt ein Mitglied', () => {
  it('mit mitgliedId gilt die Mitgliedtyp-Achse, nicht „ohne Mitgliedschaft“', async () => {
    const m = zielAusMitglied({ id: 7, person_id: 'p-7', mitgliedtyp: 'Juniorenmitglied' }, 'Andrea Furrer');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [] })} />); });
    /* Der Hero bekommt die Zahl — daran haengt die Achse der Konfiguration. */
    expect(h.heroMitgliedId).toBe(7);
  });

  it('⚠ ohne mitgliedId waere es „ohne Mitgliedschaft“ — die Gegenprobe', async () => {
    /* Ohne diesen Fall koennte der Test darueber auch gruen sein, wenn die
       Unterscheidung gar nicht mehr stattfaende. */
    const m = zielAusPerson({ id: 'p-7' }, 'Petra Muster');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [] })} />); });
    expect(h.heroMitgliedId).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════
   Portal-Zugang an- und abschalten (21.08.2026)

   Bis hierher setzte „Zugang deaktivieren" `mitglied_id = null`.
   Bei einer Person OHNE Mitgliedschaft stand dort schon null: der
   Knopf schrieb null ueber null, meldete Erfolg und aenderte
   nichts. Gelesen wird der Status ueber `person_id`.

   Und beim Mitglied sperrte es den Login trotzdem nicht — das tut
   allein `benutzer.aktiv` (useDbUser meldet ab, wenn es false ist).
   ═══════════════════════════════════════════════════════════════ */
describe('MemberDetail — Portal-Zugang schalten', () => {
  const ohne = zielAusPerson({ id: 'p-9' }, 'Petra Muster');

  it('⚠ deaktiviert ueber die PERSON — auch ohne Mitgliedschaft', async () => {
    await act(async () => { render(<MemberDetail {...props({ m: ohne, tab: 'portal', dbMitglieder: [] })} />); });
    await waitFor(() => expect(h.portal).not.toBeNull());
    await act(async () => { await h.portal.handleUnlink(); });
    expect(svc.portalZugangDeaktivieren).toHaveBeenCalledWith(sb, 'p-9');
  });

  it('das Abzeichen folgt: der Tab sieht danach aktiv=false', async () => {
    /* Der Tab laedt `benutzer` nur bei einem Wechsel von Tab oder Person.
       Ohne das Mitfuehren stuende oben „Aktiv" und darunter „Zugang
       deaktiviert" — ein Widerspruch, der bisher niemandem auffiel, weil
       das Abschalten ohnehin nichts bewirkte. */
    await act(async () => { render(<MemberDetail {...props({ m: ohne, tab: 'portal', dbMitglieder: [] })} />); });
    await waitFor(() => expect(h.portal.benutzer).toMatchObject({ id: 'u1' }));
    await act(async () => { await h.portal.handleUnlink(); });
    expect(h.portal.benutzer.aktiv).toBe(false);
  });

  it('reaktiviert ueber die PERSON und schaltet das Abzeichen zurueck', async () => {
    svc.fetchBenutzerFuerPerson.mockResolvedValue({ id: 'u1', role: 'eltern', aktiv: false });
    await act(async () => { render(<MemberDetail {...props({ m: ohne, tab: 'portal', dbMitglieder: [] })} />); });
    await waitFor(() => expect(h.portal.benutzer).not.toBeNull());
    await act(async () => { await h.portal.handleReactivate(); });
    expect(svc.portalZugangReaktivieren).toHaveBeenCalledWith(sb, 'p-9');
    expect(h.portal.benutzer.aktiv).toBe(true);
  });

  it('⚠ bei einem Mitglied ebenfalls ueber die Person, nicht ueber die Id', async () => {
    /* Die Gegenprobe. `mitgliedId` liegt vor und wird trotzdem nicht
       verwendet: der Zugang haengt am Konto der Person. */
    const m = zielAusMitglied({ id: 7, person_id: 'p-7' }, 'Hans Beispiel');
    await act(async () => { render(<MemberDetail {...props({ m, tab: 'portal', dbMitglieder: [{ id: 7 }] })} />); });
    await waitFor(() => expect(h.portal).not.toBeNull());
    await act(async () => { await h.portal.handleUnlink(); });
    expect(svc.portalZugangDeaktivieren).toHaveBeenCalledWith(sb, 'p-7');
  });
});

/* ═══════════════════════════════════════════════════════════════
   Die Identität im `raw` (21.08.2026)

   Acht Stellen lesen `raw.person_id` — das Inline-Bearbeiten des
   ganzen Profils, der Foto-Upload, „Datenprüfung anfordern". Bei
   einer Zeile aus `mitglieder` steht sie als Spalte darin; bei
   einer aus `personen` heisst sie `id`, und `zielAusPerson` nimmt
   sie heraus, damit sie nicht als zweite Wahrheit im Datenblob
   landet.

   Ohne Nachziehen ginge jeder Schreibvorgang auf der Personenseite
   an `.eq("id", undefined)`: kein Absturz, keine Meldung, nur eine
   Eingabe, die nicht ankommt.
   ═══════════════════════════════════════════════════════════════ */
describe('MemberDetail — person_id im raw', () => {
  it('⚠ eine Person ohne Mitgliedschaft trägt ihre person_id', async () => {
    const ohne = zielAusPerson({ id: 'p-9', vorname: 'Petra' }, 'Petra Muster');
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    expect(h.heroRaw.person_id).toBe('p-9');
  });

  it('bei einem Mitglied unverändert', async () => {
    const m = zielAusMitglied({ id: 7, person_id: 'p-7' }, 'Hans Beispiel');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [{ id: 7, person_id: 'p-7' }] })} />); });
    expect(h.heroRaw.person_id).toBe('p-7');
  });

  it('⚠ das Ziel gewinnt gegen einen abweichenden Wert in den Daten', async () => {
    /* `m.personId` ist die Wahrheit. Stuende in `daten` eine veraltete
       person_id — etwa aus einer Listenzeile, die vor einem Merge geladen
       wurde —, schriebe das Profil in die falsche Zeile. */
    const m = { ...zielAusMitglied({ id: 7, person_id: 'p-alt' }, 'Hans Beispiel'), personId: 'p-7' };
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [] })} />); });
    expect(h.heroRaw.person_id).toBe('p-7');
  });
});

/* ═══════════════════════════════════════════════════════════════
   ⚠ Ein Kommentar ist keine Zusicherung — das hier ist eine.

   Im Kopf von InfoTab stand seit dem 22.08.2026, `onReload` sei
   `neuLaden`. Die Aufrufstelle uebergab das aeussere `onReload`, das
   nur die LISTE laedt. Vier solche Faelle an einem Tag (Archiv,
   auth_user_id, testkonto-Mail, dieser) haben eines gemeinsam: eine
   Behauptung ueber eine ANDERE Stelle, die niemand nachprueft.

   Die Gegenmassnahme ist nicht, den Kommentar zu pflegen, sondern
   ihn an der Grenze zwischen den Komponenten in eine Behauptung
   ueber VERHALTEN zu uebersetzen: ruft man den Rueckruf, den InfoTab
   bekommt, muss die Person NEU GELESEN werden.
   ═══════════════════════════════════════════════════════════════ */
describe('⚠ InfoTab bekommt den auffrischenden Rückruf, nicht den Listen-Reload', () => {
  it('bei einer Person OHNE Mitgliedschaft wird die Person neu gelesen', async () => {
    /* Der Fall, in dem es auffiel: `dbRaw` ist leer, also frischt der
       Listen-Reload NICHTS auf — der gespeicherte Wert erschien erst beim
       erneuten Oeffnen. */
    svc.fetchPerson.mockResolvedValue({ person: { id: 'p-9', vorname: 'Petra' }, fehler: null });
    const ohne = zielAusPerson({ id: 'p-9', vorname: 'Petra' }, 'Petra Muster');
    await act(async () => { render(<MemberDetail {...props({ m: ohne, dbMitglieder: [] })} />); });
    svc.fetchPerson.mockClear();

    await act(async () => { await h.infoOnReload(); });
    expect(svc.fetchPerson).toHaveBeenCalledWith(expect.anything(), 'p-9');
  });

  it('bei einem Mitglied wird die Mitgliedschaft neu gelesen', async () => {
    const m = zielAusMitglied({ id: 7, person_id: 'p-7' }, 'Hans Beispiel');
    await act(async () => { render(<MemberDetail {...props({ m, dbMitglieder: [{ id: 7, person_id: 'p-7' }] })} />); });
    svc.fetchMitglied.mockClear();

    await act(async () => { await h.infoOnReload(); });
    expect(svc.fetchMitglied).toHaveBeenCalledWith(expect.anything(), 7);
  });
});
