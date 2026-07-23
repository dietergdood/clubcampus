/* ═══════════════════════════════════════════════════════════════
   ClubCampus — __tests__/useInlineEdit.test.jsx
   Unit-Tests für useInlineEdit Hook
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInlineEdit } from '../../../domains/members/useInlineEdit.js';

// ── Mock updateMitglied ──────────────────────────────────────────
vi.mock('../../../domains/members/memberService.js', () => ({
  updateMitglied: vi.fn().mockResolvedValue(true),
}));
import { updateMitglied } from '../../../domains/members/memberService.js';

const sb = {};
const mitgliedId = 'test-id-123';

describe('useInlineEdit', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('Initialzustand', () => {
    it('startet mit leerem State', () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      expect(result.current.editing).toBeNull();
      expect(result.current.editVal).toBe('');
      expect(result.current.saving).toBe(false);
      expect(result.current.feedback).toBeNull();
    });
  });

  describe('startEdit', () => {
    it('setzt editing und editVal', () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', 'test@fch.ch'));
      expect(result.current.editing).toBe('email');
      expect(result.current.editVal).toBe('test@fch.ch');
    });

    it('setzt leeren String wenn kein Wert', () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', null));
      expect(result.current.editVal).toBe('');
    });

    it('löscht feedback beim Start', () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', 'test@fch.ch'));
      expect(result.current.feedback).toBeNull();
    });
  });

  describe('cancelEdit', () => {
    it('setzt editing und editVal zurück', () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', 'test@fch.ch'));
      act(() => result.current.cancelEdit());
      expect(result.current.editing).toBeNull();
      expect(result.current.editVal).toBe('');
    });
  });

  describe('saveEdit', () => {
    it('ruft updateMitglied mit korrekten Argumenten auf', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      await act(async () => result.current.saveEdit('email', 'neu@fch.ch'));
      expect(updateMitglied).toHaveBeenCalledWith(sb, mitgliedId, { email: 'neu@fch.ch' });
    });

    it('setzt leeren String als null', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      await act(async () => result.current.saveEdit('email', ''));
      expect(updateMitglied).toHaveBeenCalledWith(sb, mitgliedId, { email: null });
    });

    it('setzt feedback.ok=true nach Erfolg', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      await act(async () => result.current.saveEdit('email', 'test@fch.ch'));
      expect(result.current.feedback).toEqual({ field: 'email', ok: true });
    });

    it('löscht feedback nach 1500ms', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      await act(async () => result.current.saveEdit('email', 'test@fch.ch'));
      expect(result.current.feedback).not.toBeNull();
      act(() => vi.advanceTimersByTime(1500));
      expect(result.current.feedback).toBeNull();
    });

    it('setzt feedback.ok=false bei Fehler', async () => {
      updateMitglied.mockResolvedValueOnce(false);
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      await act(async () => result.current.saveEdit('email', 'test@fch.ch'));
      expect(result.current.feedback).toEqual({ field: 'email', ok: false });
    });

    it('ruft onReload nach Erfolg auf', async () => {
      const onReload = vi.fn();
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId, onReload }));
      await act(async () => result.current.saveEdit('email', 'test@fch.ch'));
      expect(onReload).toHaveBeenCalledTimes(1);
    });

    it('ruft onReload nicht auf bei Fehler', async () => {
      updateMitglied.mockResolvedValueOnce(false);
      const onReload = vi.fn();
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId, onReload }));
      await act(async () => result.current.saveEdit('email', 'test@fch.ch'));
      expect(onReload).not.toHaveBeenCalled();
    });

    it('setzt editing nach Save zurück', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', 'test@fch.ch'));
      await act(async () => result.current.saveEdit('email', 'neu@fch.ch'));
      expect(result.current.editing).toBeNull();
    });

    it('tut nichts wenn kein sb', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb: null, mitgliedId }));
      await act(async () => result.current.saveEdit('email', 'test@fch.ch'));
      expect(updateMitglied).not.toHaveBeenCalled();
    });

    it('tut nichts wenn kein mitgliedId', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId: null }));
      await act(async () => result.current.saveEdit('email', 'test@fch.ch'));
      expect(updateMitglied).not.toHaveBeenCalled();
    });
  });

  describe('handleKey', () => {
    it('ruft saveEdit bei Enter auf', async () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', 'test@fch.ch'));
      act(() => result.current.setEditVal('neu@fch.ch'));
      const e = { key: 'Enter', preventDefault: vi.fn() };
      await act(async () => result.current.handleKey(e, 'email'));
      expect(e.preventDefault).toHaveBeenCalled();
      expect(updateMitglied).toHaveBeenCalledWith(sb, mitgliedId, { email: 'neu@fch.ch' });
    });

    it('ruft cancelEdit bei Escape auf', () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', 'test@fch.ch'));
      const e = { key: 'Escape', preventDefault: vi.fn() };
      act(() => result.current.handleKey(e, 'email'));
      expect(e.preventDefault).toHaveBeenCalled();
      expect(result.current.editing).toBeNull();
    });

    it('tut nichts bei anderen Tasten', () => {
      const { result } = renderHook(() => useInlineEdit({ sb, mitgliedId }));
      act(() => result.current.startEdit('email', 'test@fch.ch'));
      const e = { key: 'Tab', preventDefault: vi.fn() };
      act(() => result.current.handleKey(e, 'email'));
      expect(result.current.editing).toBe('email');
      expect(updateMitglied).not.toHaveBeenCalled();
    });
  });
});
