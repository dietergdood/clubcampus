import { describe, it, expect } from 'vitest';
import { SUPPORTER_TYP } from '../memberConstants.ts';

/* Ein Supporter ist Gönner, nicht Mitglied im sportlichen Sinn: kein
   Spielerpass, keine J+S-Nummer, kein Team, keine Vereinsfunktion. InfoTab
   blendet die drei Bereiche deshalb aus — sie sind bei ihm nicht nur leer,
   sie bleiben es, und eine leere Karte mit "Zuweisen"-Knopf lädt zu etwas
   ein, das nicht vorgesehen ist. */
describe('SUPPORTER_TYP', () => {
  it('ist der Mitgliedtyp, nach dem getrennt wird', () => {
    expect(SUPPORTER_TYP).toBe('Supporter');
  });

  it('trennt Gönner von Mitgliedern', () => {
    const istSupporter = (typ) => typ === SUPPORTER_TYP;
    expect(istSupporter('Supporter')).toBe(true);
    expect(istSupporter('Aktivmitglied')).toBe(false);
    expect(istSupporter('Passivmitglied')).toBe(false);
    expect(istSupporter(null)).toBe(false);
  });

  it('greift nicht auf Schreibvarianten', () => {
    /* Der Name ist der Schlüssel — es gibt kein strukturelles Merkmal.
       Beim zweiten Verein, der seinen Typ anders nennt, greift das nicht
       mehr. Siehe die offene Frage in CLAUDE.md. */
    const istSupporter = (typ) => typ === SUPPORTER_TYP;
    expect(istSupporter('supporter')).toBe(false);
    expect(istSupporter('Supporter/in')).toBe(false);
  });
});
