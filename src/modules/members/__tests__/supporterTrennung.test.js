/* ═══════════════════════════════════════════════════════════════
   Supporter und Mitglied in derselben Liste — ohne sich zu
   vermischen.

   Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT (Statuten
   Artikel 6, Rueckbau vom 20.08.2026). Er steht in `personen`,
   ein Mitglied in `mitglieder`. Beide werden trotzdem zur selben
   MemberRow, damit Suche, Sortierung und Gruppierung dieselben
   Funktionen benutzen — ein zweiter Satz waere ein zweiter Ort,
   an dem dieselbe Mechanik auseinanderlaeuft.

   Bezahlt wird das mit einem Schluessel, der zwei Herkuenfte hat.
   Genau darum geht es hier.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import { mapMembers, mapSupporter } from '../memberMapper.ts';
import { filterMembers, sortMembers } from '../memberFilter.ts';

const DB_PORTAL_ROLLEN = [
  { name: 'spieler',   label: 'Spieler/in' },
  { name: 'supporter', label: 'Supporter/in' },
];

const mitglied = (id, mitgliedtyp) => ({
  id, person_id: `p-${id}`, mitgliedtyp,
  vorname: 'A', nachname: `Nr${id}`, aktiv: true,
  kader_rollen: [], kader_teams: [], kader_eintraege: [], teams: [],
  hat_benutzer: false, benutzer_deaktiviert: false,
});

const goenner = (id, over = {}) => ({
  id, vorname: 'G', nachname: `Nr${id}`, rolle: 'supporter',
  hat_benutzer: true, benutzer_deaktiviert: false, funktionen: [], ...over,
});

describe('id ist der Schluessel der Zeile, mitglied_id die Mitgliedschaft', () => {
  const [m] = mapMembers([mitglied(7, 'Aktivmitglied')], DB_PORTAL_ROLLEN);
  const [s] = mapSupporter([goenner('u-9')], DB_PORTAL_ROLLEN);

  it('beim Mitglied ist beides dasselbe — deshalb fiel es nie auf', () => {
    expect(m.id).toBe(7);
    expect(m.mitglied_id).toBe(7);
    expect(m.person_id).toBe('p-7');
  });

  it('beim Supporter faellt es auseinander', () => {
    expect(s.id).toBe('u-9');
    expect(s.person_id).toBe('u-9');
    expect(s.mitglied_id).toBeNull();
  });

  it('⚠ jede Zeile hat eine id — auch die ohne Mitgliedschaft', () => {
    /* ListView.getRowId schluesselt darueber (`typeof id === "number" ? id
       : String(id)`). Es vertraegt beide Typen, braucht aber einen Wert:
       ohne id verliert die Zeile React-Key, Auswahl und Sammelaktionen.
       „person_id dazu, id bleibt leer" waere deshalb der falsche Weg. */
    for (const row of [m, s]) {
      expect(row.id === null || row.id === undefined).toBe(false);
      expect(['string', 'number']).toContain(typeof row.id);
    }
  });

  it('mitglied_id ist null und nicht etwa die uuid', () => {
    /* Eine uuid an dieser Stelle liefe still durch jede Stelle, die eine
       Zahl erwartet — MemberDetail liest sie rund siebzigmal als `number`.
       Null zwingt den Compiler, den Fall zu behandeln. */
    expect(typeof s.mitglied_id).not.toBe('string');
  });
});

describe('ein Supporter hat nichts, was an der Mitgliedschaft haengt', () => {
  const [s] = mapSupporter([goenner('u-1')], DB_PORTAL_ROLLEN);

  it('kein Mitgliedtyp — und auch nicht der erfundene Wert "Supporter"', () => {
    /* Bis zum Rueckbau stand hier der Mitgliedtyp „Supporter". Ihn als Wert
       stehenzulassen, haette ihn in Filter, Gruppierung und Export wieder wie
       eine Mitgliedschaft aussehen lassen. */
    expect(s.mitgliedschaft).toBe('-');
    expect(s.type).toBe('-');
  });

  it('kein Team, kein Kader, kein Pass, kein Eintritt', () => {
    expect(s.teams).toEqual([]);
    expect(s.kader_eintraege).toEqual([]);
    expect(s.spielerpass).toBeNull();
    expect(s.js_nr).toBeNull();
    expect(s.fairgate_id).toBeNull();
    expect(s.eintritt).toBeNull();
  });

  it('die Portalrolle bleibt — sie ist eine Berechtigung, keine Mitgliedschaft', () => {
    expect(s.role).toBe('supporter');
    expect(s.rollen).toHaveLength(1);
  });

  /* Bis zum 20.08.2026 war dieser Test rot: `rolleLabelMap` setzte die acht
     fest verdrahteten Beschriftungen HINTER die aus `portal_rollen`, und
     `Object.fromEntries` laesst den letzten Eintrag gewinnen — die Konstanten
     ueberschrieben also die Datenbank, statt sie aufzufangen.

     Er stand bewusst rot da und nicht andersherum: ein Test, der den
     Ist-Zustand festhaelt, obwohl der falsch ist, zementiert den Fehler und
     faellt ausgerechnet dann um, wenn ihn jemand behebt.

     Die Reihenfolge ist jetzt getauscht. Bleibt er gruen, gewinnt
     `portal_rollen`. */
  it('portal_rollen gewinnt gegen die fest verdrahtete Beschriftung', () => {
    const [m] = mapMembers([{ ...mitglied(1, 'Aktivmitglied'), rolle: 'supporter' }], DB_PORTAL_ROLLEN);
    /* mapSupporter und mapMembers teilen sich rolleLabelMap — dieselbe
       Zuordnung, damit sie nicht auseinanderlaufen. Das gilt unabhaengig
       davon, welche Seite gewinnt, und ist deshalb schon heute gruen. */
    expect(s.rollen).toEqual(m.rollen);
    /* Das hier ist der Sollzustand: der Wert aus portal_rollen. */
    expect(s.rollen).toEqual(['Supporter/in']);
  });
});

describe('dieselben Listenfunktionen greifen', () => {
  const rows = mapSupporter([
    goenner('u-1', { nachname: 'Zwahlen', ort: 'Herrliberg', plz: '8704' }),
    goenner('u-2', { nachname: 'Amsler',  ort: 'Erlenbach',  plz: '8703' }),
  ], DB_PORTAL_ROLLEN);

  it('sortMembers ordnet Supporter wie Mitglieder', () => {
    const sortiert = sortMembers([...rows], 'name', 'asc');
    expect(sortiert.map(r => r.nachname)).toEqual(['Amsler', 'Zwahlen']);
  });

  it('filterMembers findet ueber die Suche', () => {
    const treffer = filterMembers(rows, 'Amsler', {}, {});
    expect(treffer.map(r => r.id)).toEqual(['u-2']);
  });

  it('der Wohnort ist zusammengesetzt wie bei einem Mitglied', () => {
    expect(rows[0].wohnort).toBe('8704 Herrliberg');
  });
});
