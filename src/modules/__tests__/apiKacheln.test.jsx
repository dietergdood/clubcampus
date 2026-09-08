// @vitest-environment jsdom
/* ══════════════════════════════════════════════════════════════
   Die Kacheln im API-Tab (07.09.2026)

   ⚠ WARUM ES DIESE DATEI GIBT

   Der Tab hatte zwei Knöpfe mit `onClick={()=>{}}` — „Sync starten"
   für jeden aktiven Anschluss ausser football_ch und „Konfigurieren"
   für jeden. Sie waren jahrelang unsichtbar, weil es nur EINE Zeile
   in api_verbindungen gab. Mit der zweiten (wordpress) standen sie
   plötzlich auf dem Schirm.

   Ein Knopf, der nichts tut, ist schlimmer als keiner: wer ihn
   drückt, sucht den Fehler danach beim Export. Und weder Build noch
   Typecheck noch Lint melden ihn — ein leerer Handler ist gültiger
   Code.

   Diese Datei rendert deshalb den TAB mit beiden echten Zeilen und
   prüft, was ein Mensch dort sieht. Der letzte Fall liest den
   Quelltext: er hält fest, dass die Attrappe nicht zurückkommt —
   die wichtigere Hälfte, denn ein Test auf den neuen Text allein
   hält beim nächsten Umbau nichts auf.
   ══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { suche, leereHandler } from '../../test-helpers/quelltext.ts';

/* Die zwei Unteransichten haben mit den Kacheln nichts zu tun und ziehen
   Dienste nach. Sie erscheinen erst nach einem Klick. */
vi.mock('../portal/SfvZuordnung.tsx', () => ({ SfvZuordnung: () => null }));
vi.mock('../portal/SfvSpielerZuordnung.tsx', () => ({ SfvSpielerZuordnung: () => null }));

import { ApiTab } from '../portal/ApiTab.tsx';

afterEach(cleanup);

/* Die zwei Zeilen, die am 07.09.2026 wirklich in api_verbindungen stehen.
   ⚠ wordpress ist active=false (Etappe 6 schaltet scharf) und hat nach
   dem ersten scharfen Lauf sync_status='warnung'. */
const VERBINDUNGEN = [
  { id: 'v-sfv', key: 'football_ch', label: 'Football.ch', active: true, sync_status: 'ok',
    api_url: 'https://api.football.ch/v1', sync_meldung: '12 Spiele aktualisiert',
    letzter_sync: '2026-09-05T17:00:00.000Z', wache_zuletzt: '2026-09-05T17:05:00.000Z' },
  /* ⚠ api_url ist hier absichtlich null — die Adresse steht im Secret. */
  { id: 'v-wp', key: 'wordpress', label: 'WordPress-Export', active: false, sync_status: 'warnung',
    api_url: null, sync_meldung: 'dev.fcherrliberg.ch · 0 neu, 0 aktualisiert',
    letzter_sync: '2026-09-05T17:20:00.000Z', wache_zuletzt: null },
];

/* Was ein Lauf tatsächlich getan hat — `ziel_host` ist ein Feld, das der
   Export schreibt, kein Text, den jemand zerlegt. */
const LOGS = [
  { verbindung_id: 'v-wp', gestartet_am: '2026-09-05T17:20:00.000Z',
    details: { ziel_host: 'dev.fcherrliberg.ch' } },
];

function zeigeKacheln(verbindungen = VERBINDUNGEN, logs = LOGS) {
  render(
    <ApiTab loading={false} isMobile={false} mobileKachel={null}
      apiVerbindungen={verbindungen} syncLogs={logs} tab="api" />,
  );
}

describe('API-Kacheln', () => {
  it('zeigt beide Anschlüsse', () => {
    zeigeKacheln();
    expect(screen.getByText('Football.ch')).toBeTruthy();
    expect(screen.getByText('WordPress-Export')).toBeTruthy();
  });

  /* Der Kern. „Konfigurieren" führte nirgendwohin — es gibt den Knopf
     nicht mehr, und ein zweiter „Sync starten" auch nicht. */
  it('trägt keinen Knopf „Konfigurieren" mehr', () => {
    zeigeKacheln();
    expect(screen.queryByText('Konfigurieren')).toBeNull();
  });

  it('zeigt „Sync starten" nur dort, wo er etwas auslöst', () => {
    zeigeKacheln([
      /* ⚠ Der Auslöser des alten Defekts: ein AKTIVER Anschluss, der nicht
         football_ch ist. Genau er bekam die Attrappe. */
      { key: 'wordpress', label: 'WordPress-Export', active: true, sync_status: 'ok' },
    ]);
    expect(screen.queryByText('Sync starten')).toBeNull();
    expect(screen.getByText(/Keine Bedienung im Portal/)).toBeTruthy();
  });

  it('lässt football_ch seine drei Knöpfe', () => {
    zeigeKacheln();
    expect(screen.getByText('Sync starten')).toBeTruthy();
    expect(screen.getByText('Teams zuordnen')).toBeTruthy();
    expect(screen.getByText('Spieler zuordnen')).toBeTruthy();
  });

  /* Die Richtung ist der Unterschied, auf den es ankommt: dieselbe
     Feldliste, entgegengesetzte Bedeutung. */
  it('unterscheidet empfangene von gesendeten Daten', () => {
    zeigeKacheln();
    expect(screen.getByText('Empfangene Daten:')).toBeTruthy();
    expect(screen.getByText('Gesendete Daten:')).toBeTruthy();
    expect(screen.queryByText('Synchronisierte Daten:')).toBeNull();
  });

  it('beschreibt den WordPress-Anschluss, statt „Externe API-Verbindung" zu zeigen', () => {
    zeigeKacheln();
    expect(screen.getByText(/an die Vereins-Website senden/)).toBeTruthy();
    expect(screen.queryByText('Externe API-Verbindung')).toBeNull();
  });

  /* ── Ziel: beobachtet, nicht behauptet (08.09.2026) ───────────── */

  it('zeigt, wohin der letzte Lauf tatsächlich geschrieben hat', () => {
    zeigeKacheln();
    expect(screen.getByText('dev.fcherrliberg.ch')).toBeTruthy();
  });

  /* ⚠ DER FALL, DER AM 08.09.2026 IN DER ECHTEN KACHEL STAND.
     `api_url` trug von Hand `https://www.fcherrliberg.ch/wp-json`, der
     Export schrieb nach dev. Vorher zeigte die Kachel den www-Wert und
     nannte ihn „Ziel" — jetzt nennt sie den Widerspruch. */
  it('meldet, wenn Konfiguration und letzter Lauf verschiedene Hosts nennen', () => {
    zeigeKacheln([{ ...VERBINDUNGEN[1], api_url: 'https://www.fcherrliberg.ch/wp-json' }]);
    expect(screen.getByText(/verschiedene Hosts/)).toBeTruthy();
    expect(screen.getByText(/Geschrieben wird nach dev\.fcherrliberg\.ch/)).toBeTruthy();
  });

  it('schweigt, wenn beide dasselbe sagen', () => {
    zeigeKacheln([{ ...VERBINDUNGEN[1], api_url: 'https://dev.fcherrliberg.ch/wp-json' }]);
    expect(screen.queryByText(/verschiedene Hosts/)).toBeNull();
  });

  /* `null` ist eine Aussage, kein Fehlen — die Zeile verschwindet nicht. */
  it('sagt beim leeren api_url, dass es leer ist', () => {
    zeigeKacheln();
    expect(screen.getByText(/in den Secrets der Edge Function/)).toBeTruthy();
  });

  /* ⚠ Kein Lauf in den geladenen Zeilen heisst NICHT „nie gelaufen" — die
     Kachel lädt nur die letzten 50. Der Text muss das offenlassen. */
  it('unterscheidet „kein Lauf geladen" von „nie gelaufen"', () => {
    zeigeKacheln(VERBINDUNGEN, []);
    expect(screen.getAllByText(/kein Lauf in den geladenen Protokollzeilen/).length)
      .toBeGreaterThan(0);
  });

  it('zeigt die Meldung des letzten Laufs samt Host', () => {
    zeigeKacheln();
    expect(screen.getByText(/dev\.fcherrliberg\.ch · 0 neu/)).toBeTruthy();
  });

  /* ⚠ KEIN HOST IN DER BESCHREIBUNG. Der Export zeigt heute auf dev und
     später auf die Produktionsadresse — ein Host im Text wäre dieselbe
     Aussage an einem zweiten Ort und beim Wechsel still falsch. */
  it('nennt in der BESCHREIBUNG keine Adresse', () => {
    /* ⚠ Ohne `letzter_sync` und ohne `api_url` darf nirgends ein Host
       stehen. Mit ihnen schon — aber dann als Beobachtung eines Laufs,
       nicht als Teil des Namens oder der Beschreibung. Genau diese Grenze
       hält der Fall fest. */
    zeigeKacheln([{ key: 'wordpress', label: 'WordPress-Export', active: false }], []);
    expect(screen.queryByText(/fcherrliberg\.ch/)).toBeNull();
  });
});

/* ── Die Hälfte, die den Umbau überlebt ─────────────────────────

   ⚠ UMGESTELLT AM 08.09.2026 VOM TEXT AUF DEN SYNTAXBAUM.

   Die erste Fassung suchte `onClick={()=>{}}` als Zeichenkette und war
   rot — mit zwei Treffern in genau der Datei, aus der die Attrappe
   gerade entfernt worden war. Beide standen in KOMMENTAREN, die den
   Defekt beschreiben; einer davon in dem Kommentar, der ihn behebt.

   Danach lief sie über einen Regex-Kommentarentferner. Der war die
   halbe Antwort und ausserdem selbst kaputt: `image/*` und ein
   Uhrzeit-Ausdruck im Bestand hätten ihn mitten im Code schneiden
   lassen — lautlos, und der Test wäre grün geblieben.

   Jetzt fragt sie den Baum. Kommentare sind darin Trivia und kommen
   als Knoten gar nicht vor; die Frage kann sie deshalb nicht mehr
   treffen. Die Regel dazu steht in `test-helpers/quelltext.ts`.
   ────────────────────────────────────────────────────────── */
describe('ApiTab.tsx als Quelltext', () => {
  /* Ein leerer Handler ist gültiger Code — kein Build, kein Typecheck und
     kein Lint melden ihn. Er fällt nur auf, wenn jemand danach sucht. */
  it('enthält keinen leeren Ereignis-Handler', () => {
    const treffer = suche({
      frage: 'leerer Ereignis-Handler in ApiTab',
      dateien: ['src/modules/portal/ApiTab.tsx'],
      finde: leereHandler,
      /* ⚠ Pflicht, und hier sieht man wofür: der Schnipsel ist genau die
         Attrappe, die am 07.09.2026 entfernt wurde. Findet die Abfrage sie
         nicht, bricht `suche` ab — statt grün zu melden. */
      positivkontrolle: 'const X = () => <button onClick={()=>{}}>Weg</button>;',
    });
    expect(treffer.map((t) => `${t.datei}:${t.fund.zeile} ${t.fund.attribut}`)).toEqual([]);
  });
});