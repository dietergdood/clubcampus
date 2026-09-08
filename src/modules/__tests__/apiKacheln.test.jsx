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
  { key: 'football_ch', label: 'Football.ch', active: true, sync_status: 'ok',
    api_url: 'https://api.football.ch/v1', sync_meldung: '12 Spiele aktualisiert',
    letzter_sync: '2026-09-05T17:00:00.000Z', wache_zuletzt: '2026-09-05T17:05:00.000Z' },
  /* ⚠ api_url ist hier absichtlich null — die Adresse steht im Secret. */
  { key: 'wordpress', label: 'WordPress-Export', active: false, sync_status: 'warnung',
    api_url: null, sync_meldung: 'dev.fcherrliberg.ch · 0 neu, 0 aktualisiert',
    letzter_sync: '2026-09-05T17:20:00.000Z', wache_zuletzt: null },
];

function zeigeKacheln(verbindungen = VERBINDUNGEN) {
  render(
    <ApiTab loading={false} isMobile={false} mobileKachel={null}
      apiVerbindungen={verbindungen} tab="api" />,
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

  /* ── Ziel und Meldung (07.09.2026) ───────────────────────────── */

  it('zeigt das konfigurierte Ziel', () => {
    zeigeKacheln();
    expect(screen.getByText(/https:\/\/api\.football\.ch\/v1/)).toBeTruthy();
  });

  /* Der eigentliche Fall: `null` ist eine Aussage, kein Fehlen. Eine Zeile,
     die bei leerem Wert verschwände, wäre von einer nicht gerenderten nicht
     zu unterscheiden. */
  it('sagt beim leeren Ziel, dass es leer ist — statt die Zeile wegzulassen', () => {
    zeigeKacheln([{ key: 'wordpress', label: 'WordPress-Export', active: false, api_url: null }]);
    expect(screen.getByText(/^Ziel:/)).toBeTruthy();
    expect(screen.getByText(/in den Secrets der Edge Function/)).toBeTruthy();
  });

  /* Die Meldung ist die einzige Stelle, an der der echte Ziel-Host steht. */
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
    zeigeKacheln([{ key: 'wordpress', label: 'WordPress-Export', active: false }]);
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