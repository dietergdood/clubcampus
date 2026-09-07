/* ═══════════════════════════════════════════════════════════════
   Der Zeitraum der Bestandsliste (07.09.2026)

   ⚠ Entscheidung Didi: Zeitraum, nicht Anzahl — „die Frage ist «was
   ist seit dem Anfang entstanden», und eine Anzahl beantwortet sie
   nur zufällig." Und der Anfang wird GELESEN (erster Eintrag in
   api_sync_log), nicht als Datum in den Code geschrieben.

   Die Fälle hier prüfen genau die zwei Stellen, an denen so eine
   Filterung still falsch wird: die Zeitform (WordPress liefert kein
   ISO) und die Zeilen ohne Datum.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import {
  zeitWert, waehleZeitraum, fassBestandZusammen,
  type BestandZeile,
} from '../wpBestand.ts';

function zeile(teil: Partial<BestandZeile> = {}): BestandZeile {
  return {
    beitrag_id: 1, titel: 'FCH 3 — FC Gegner', status: 'publish',
    sfv_match_id: '4393132', team: 'Cc-Junioren',
    angelegt: '2026-09-06 10:00:00',
    lauf_zuletzt: '', lauf_erst: '', ohne_laufstempel: true,
    bearbeiten_url: 'https://x/post.php?post=1&action=edit',
    ...teil,
  };
}

describe('zeitWert', () => {
  /* ⚠ Der Kern. WordPress liefert MySQL-Schreibweise, api_sync_log ISO.
     Ein Zeichenvergleich ginge schief: das Leerzeichen (0x20) sortiert vor
     dem T (0x54), also gälte jeder WordPress-Zeitpunkt als älter als jeder
     ISO-Zeitpunkt desselben Tages — und die Filterung liesse genau die
     Beiträge durchfallen, um die es geht. */
  it('liest MySQL- und ISO-Form auf denselben Zeitpunkt', () => {
    expect(zeitWert('2026-09-05 17:20:00')).toBe(zeitWert('2026-09-05T17:20:00.000Z'));
  });

  it('liest eine Angabe ohne Zone als UTC, nicht als Ortszeit', () => {
    expect(zeitWert('2026-09-05 17:20:00')).toBe(Date.UTC(2026, 8, 5, 17, 20, 0));
  });

  /* Die Gegenprobe zum Zeichenvergleich: er würde hier das Falsche sagen. */
  it('ordnet MySQL gegen ISO richtig — anders als ein Zeichenvergleich', () => {
    const wp = '2026-09-05 19:00:00';
    const log = '2026-09-05T17:20:00.000Z';
    expect(zeitWert(wp)! > zeitWert(log)!).toBe(true);
    expect(wp > log).toBe(false);            // ⚠ so hätte es dagestanden
  });

  it('gibt bei leer oder unlesbar null zurück', () => {
    for (const roh of ['', '   ', 'gestern', null, undefined]) {
      expect(zeitWert(roh)).toBeNull();
    }
  });
});

describe('waehleZeitraum', () => {
  it('nimmt den ersten Protokolleintrag, wenn nichts vorgegeben ist', () => {
    const z = waehleZeitraum({}, '2026-09-05T17:20:00.000Z');
    expect(z).toEqual({ von: '2026-09-05T17:20:00.000Z', bis: null, quelle: 'erster-lauf' });
  });

  it('lässt eine Vorgabe gewinnen', () => {
    const z = waehleZeitraum({ von: '2026-01-01', bis: '2026-12-31' }, '2026-09-05T17:20:00.000Z');
    expect(z).toEqual({ von: '2026-01-01', bis: '2026-12-31', quelle: 'vorgegeben' });
  });

  /* Kein Protokoll, keine Vorgabe: dann gibt es keinen Anfang zu lesen —
     und die Liste sagt das, statt einen zu erfinden. */
  it('bleibt offen, wenn es keinen Lauf gibt', () => {
    expect(waehleZeitraum({}, null).quelle).toBe('offen');
    expect(waehleZeitraum({}, null).von).toBeNull();
  });

  it('behandelt eine leere Vorgabe wie keine', () => {
    expect(waehleZeitraum({ von: '  ' }, '2026-09-05T17:20:00.000Z').quelle).toBe('erster-lauf');
  });
});

describe('fassBestandZusammen', () => {
  const START = '2026-09-05T17:20:00.000Z';

  it('lässt durch, was seit dem Anfang entstanden ist', () => {
    const zeilen = [
      zeile({ beitrag_id: 1, angelegt: '2026-09-06 10:00:00' }),
      zeile({ beitrag_id: 2, angelegt: '2026-09-05 19:00:00' }),
    ];
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, START), START);
    expect(e.im_zeitraum).toBe(2);
    expect(e.ausserhalb).toBe(0);
  });

  it('lässt weg, was davor war — und zählt es', () => {
    const zeilen = [
      zeile({ beitrag_id: 1, angelegt: '2026-09-06 10:00:00' }),
      zeile({ beitrag_id: 2, angelegt: '2026-08-01 09:00:00' }),
    ];
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, START), START);
    expect(e.im_zeitraum).toBe(1);
    expect(e.ausserhalb).toBe(1);
    expect(e.beitraege.map((z) => z.beitrag_id)).toEqual([1]);
  });

  /* ⚠ Der Befund, den niemand sucht: api_sync_log wird erst NACH der
     Antwort von WordPress geschrieben. Stürzt ein Lauf dazwischen ab,
     stehen Beiträge auf der Website, die älter sind als jeder
     Protokolleintrag — und die Vorbelegung verdeckt ausgerechnet sie. */
  it('meldet Beiträge, die älter sind als der erste Lauf', () => {
    const zeilen = [
      zeile({ beitrag_id: 1, angelegt: '2026-09-06 10:00:00' }),
      zeile({ beitrag_id: 2, angelegt: '2026-08-01 09:00:00' }),
    ];
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, START), START);
    expect(e.vor_erstem_lauf).toBe(1);
    expect(e.aeltester).toBe('2026-08-01T09:00:00.000Z');
  });

  /* ⚠ Unbekannt ist nicht abwesend. Ein Filter, der Zeilen ohne Datum
     wegnimmt, macht aus „ich weiss es nicht" ein „gibt es nicht" — und
     niemand sucht danach, weil die Liste vollständig aussieht. */
  it('behält Zeilen ohne Datum und zählt sie eigens', () => {
    const zeilen = [zeile({ beitrag_id: 9, angelegt: '' })];
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, START), START);
    expect(e.ohne_datum).toBe(1);
    expect(e.im_zeitraum).toBe(1);
    expect(e.beitraege.map((z) => z.beitrag_id)).toEqual([9]);
  });

  it('kürzt nicht und lässt die Reihenfolge, wie sie kam', () => {
    const zeilen = [5, 4, 3, 2, 1].map((n) => zeile({ beitrag_id: n }));
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, START), START);
    expect(e.beitraege.map((z) => z.beitrag_id)).toEqual([5, 4, 3, 2, 1]);
  });

  it('zeigt bei offenem Zeitraum alles', () => {
    const zeilen = [
      zeile({ beitrag_id: 1, angelegt: '2020-01-01 00:00:00' }),
      zeile({ beitrag_id: 2, angelegt: '2026-09-06 10:00:00' }),
    ];
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, null), null);
    expect(e.im_zeitraum).toBe(2);
    expect(e.vor_erstem_lauf).toBe(0);
  });

  /* Die Aufteilung muss aufgehen — und beide Seiten werden eigenständig
     gezählt, nicht als Differenz. Sonst wäre die Prüfung eine Tautologie. */
  it('liefert eine Aufteilung, die aufgeht', () => {
    const zeilen = [
      zeile({ beitrag_id: 1, angelegt: '2026-09-06 10:00:00' }),
      zeile({ beitrag_id: 2, angelegt: '2026-08-01 09:00:00' }),
      zeile({ beitrag_id: 3, angelegt: '' }),
    ];
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, START), START);
    expect(e.zaehlung_stimmt).toBe(true);
    expect(e.im_zeitraum + e.ausserhalb).toBe(e.gesamt);
  });

  it('zählt die veröffentlichten ohne Laufstempel getrennt', () => {
    const zeilen = [
      zeile({ beitrag_id: 1, status: 'publish', ohne_laufstempel: true }),
      zeile({ beitrag_id: 2, status: 'draft', ohne_laufstempel: true }),
      zeile({ beitrag_id: 3, status: 'publish', ohne_laufstempel: false }),
    ];
    const e = fassBestandZusammen(zeilen, waehleZeitraum({}, START), START);
    expect(e.ohne_laufstempel).toBe(2);
    expect(e.ohne_laufstempel_sichtbar).toBe(1);
  });

  it('achtet auf das Ende des Zeitraums', () => {
    const zeilen = [
      zeile({ beitrag_id: 1, angelegt: '2026-09-06 10:00:00' }),
      zeile({ beitrag_id: 2, angelegt: '2026-09-30 10:00:00' }),
    ];
    const e = fassBestandZusammen(
      zeilen, waehleZeitraum({ bis: '2026-09-10T00:00:00.000Z' }, START), START,
    );
    expect(e.beitraege.map((z) => z.beitrag_id)).toEqual([1]);
    expect(e.ausserhalb).toBe(1);
  });
});
