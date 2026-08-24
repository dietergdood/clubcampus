// @vitest-environment jsdom
/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/list/__tests__/auswahlBestand.test.jsx

   ⚠ DIE AUSWAHL DARF KEINE ZEILEN FESTHALTEN, DIE ES NICHT MEHR GIBT.

   Befund vom 24.08.2026, nach dem ersten scharfen Lauf der
   Sammellöschung: zwei Personen wurden gelöscht, die Liste sprang von
   8 auf 6 — und in der Auswahlleiste stand weiterhin „2 ausgewählt".

   ⚠ Es betraf nicht nur das Löschen. Bis dahin räumte KEINE
   Sammelaktion die Auswahl ab; nur „Abbrechen" und das Beenden des
   Auswahlmodus taten es. Dasselbe stand nach „Entfernen", nach
   „Austritt", nach „Mitglied werden" und nach „Reaktivieren".

   Die zwei Fälle hier halten beide Richtungen fest, und die zweite ist
   die wichtigere: eine Auswahl, die eine SUCHE überlebt, ist gewollt —
   so wurden am 25.08.2026 drei Personen aus zwei verschiedenen Suchen
   zusammengestellt. Nur was es in den DATEN nicht mehr gibt, fällt
   heraus.
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../domains/members/memberService.ts', () => ({
  fetchAnsichten: vi.fn().mockResolvedValue([]),
  insertAnsicht: vi.fn(),
  deleteAnsicht: vi.fn(),
}));
vi.mock('../../ui/hooks.ts', () => ({ useIsMobile: () => false }));

const { useListView } = await import('../useListView.ts');

const ZEILEN = [
  { id: 1, name: 'Heidi Studer' },
  { id: 2, name: 'Peter Vogt' },
  { id: 3, name: 'Lukas Herzig' },
];

function baue(rows) {
  return renderHook(
    ({ rows }) => useListView({
      rows,
      colDefs: [{ key: 'name', label: 'Name' }],
      getRowId: r => r.id,
      selectable: true,
      sb: null, account: null, vereinId: null, viewTyp: 'test',
      moreActions: [], bulkActions: [], filterDefs: [], groupOptions: [],
      filterFn: (r, suche) => suche
        ? r.filter(x => x.name.toLowerCase().includes(suche.toLowerCase()))
        : r,
    }),
    { initialProps: { rows } },
  );
}

describe('⚠ Die Auswahl wird gegen die vorhandenen Zeilen gehalten', () => {
  it('gelöschte Zeilen fallen aus der Auswahl', () => {
    const { result, rerender } = baue(ZEILEN);
    act(() => { result.current.toggleSelectRow(1); result.current.toggleSelectRow(2); });
    expect(result.current.selected.size).toBe(2);

    /* Der gemessene Fall: zwei Personen gelöscht, die Liste lädt neu. */
    rerender({ rows: [ZEILEN[2]] });
    expect([...result.current.selected]).toEqual([]);
  });

  it('eine teilweise Löschung behält den Rest', () => {
    const { result, rerender } = baue(ZEILEN);
    act(() => { result.current.toggleSelectRow(1); result.current.toggleSelectRow(3); });
    rerender({ rows: [ZEILEN[1], ZEILEN[2]] });   // 1 ist weg, 3 bleibt
    expect([...result.current.selected]).toEqual([3]);
  });

  it('⚠ eine SUCHE lässt die Auswahl unangetastet — das ist der Unterschied', () => {
    /* Gegen `rows` wird geprüft, nicht gegen die gefilterte Liste. Sonst
       verschwände die Auswahl beim Tippen, und es liesse sich nie jemand
       aus zwei verschiedenen Suchen zusammenstellen. */
    const { result } = baue(ZEILEN);
    act(() => { result.current.toggleSelectRow(1); });
    act(() => { result.current.setSearch('Vogt'); });
    expect(result.current.selected.has(1)).toBe(true);
    act(() => { result.current.toggleSelectRow(2); });
    expect(result.current.selected.size).toBe(2);
  });

  it('ohne Änderung an den Daten bleibt die Auswahl dieselbe Referenz', () => {
    /* Sonst rendert die Liste bei jeder Datenaktualisierung neu. */
    const { result, rerender } = baue(ZEILEN);
    act(() => { result.current.toggleSelectRow(1); });
    const vorher = result.current.selected;
    rerender({ rows: [...ZEILEN] });
    expect(result.current.selected).toBe(vorher);
  });
});
