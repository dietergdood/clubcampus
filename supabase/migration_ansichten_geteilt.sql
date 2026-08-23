-- ClubCampus — supabase/migration_ansichten_geteilt.sql
-- 23.08.2026
--
-- ⚠ „TEILEN" HAT HEUTE KEINE WIRKUNG — die Policy liest eine andere Spalte
--   als die Funktion.
--
--     ansichten_select   … OR (ist_standard = true) OR is_admin()
--     der Code           .or("benutzer_id.eq.<ich>,geteilt.eq.true")
--
--   Die Liste FRAGT nach geteilten Ansichten (`memberService.ts:345`), und
--   `useListView.ts:372` rendert dafür eine eigene Gruppe „Geteilte
--   Ansichten" mit allen, die jemand anders geteilt hat. RLS filtert sie
--   vorher weg. Kein Fehler, keine leere Meldung — nur eine Gruppe, die nie
--   erscheint.
--
--   Gemessen am 23.08.2026: 3 Ansichten, davon **2 mit `geteilt = true`**,
--   **keine** mit `ist_standard = true`.
--
-- ⚠ `ist_standard` WIRD ERSETZT, NICHT ERGÄNZT. Die Spalte hat im ganzen
--   Portal keinen Leser und keinen Schreiber — `grep` findet sie nur in
--   `database.types.ts`. Eine Bedingung, die nie zutrifft und die niemand
--   setzt, bleibt sonst als vermeintlicher Teilen-Schalter stehen, und der
--   Nächste baut darauf. Siehe CLAUDE.md → „Wer eine Spalte anlegt, nennt im
--   selben Auftrag die Stelle, die sie liest."
--
--   Die Spalte selbst bleibt (sie fällt mit einem eigenen Durchgang über die
--   verwaisten Spalten); nur die Policy hört auf, sie zu lesen.
--
-- ⚠ NUR `SELECT`. Dass ein Nicht-Autor eine geteilte Ansicht auch ÄNDERN
--   oder LÖSCHEN darf, ist eine andere Frage — `ansichten_write` lässt heute
--   nur den Autor und Admins, und das gehört zu den Gruppenrechten
--   (`docs/auftrag_rls_gruppenrechte.md`). Sehen ist die Hälfte, die heute
--   fehlt und die niemanden gefährdet.

begin;

do $mig$
declare
  v_vorher   int;
  v_nachher  int;
  v_qual     text;
begin
  select count(*) into v_vorher
    from pg_policies where schemaname = 'public' and tablename = 'mitglieder_ansichten';

  drop policy if exists "ansichten_select" on public.mitglieder_ansichten;
  create policy "ansichten_select" on public.mitglieder_ansichten
    for select
    using (
      verein_id = public.get_my_verein_id()
      and (
        benutzer_id = auth.uid()
        or geteilt = true
        or public.is_admin()
      )
    );

  -- ── Zählprobe ──────────────────────────────────────────────────────────
  select count(*) into v_nachher
    from pg_policies where schemaname = 'public' and tablename = 'mitglieder_ansichten';

  select coalesce(qual, '') into v_qual
    from pg_policies
   where schemaname = 'public' and tablename = 'mitglieder_ansichten'
     and policyname = 'ansichten_select';

  if v_nachher <> v_vorher then
    raise exception 'Policies: erwartet % (ersetzt, nicht ergaenzt), gezaehlt %', v_vorher, v_nachher;
  end if;
  if v_qual not like '%geteilt%' then
    raise exception 'Die neue Bedingung nennt geteilt nicht: %', v_qual;
  end if;
  if v_qual like '%ist_standard%' then
    raise exception 'ist_standard steht noch in der Bedingung: %', v_qual;
  end if;

  raise notice 'OK — Policies unveraendert bei %, Bedingung liest jetzt geteilt', v_nachher;
end
$mig$;

commit;

-- ── Nachher zum Nachsehen ────────────────────────────────────────────────
-- Ein Nicht-Autor muss die geteilten Ansichten jetzt sehen:
--
-- select count(*) from public.mitglieder_ansichten;   -- als anderer Benutzer
--
-- Erwartet: 2 statt 0 (Stand 23.08.2026 — „Adressliste Global", „Trainers").
