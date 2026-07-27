-- ═══════════════════════════════════════════════════════════════
-- ClubCampus — Migration 27.07.2026
-- Stufensortierung: Sortierebenen in gespeicherten Ansichten
--
-- Vor dem Deploy des zugehoerigen Frontends ausfuehren — der Code
-- schreibt mitglieder_ansichten.sortierung beim Speichern einer
-- Ansicht. Fehlt die Spalte, lehnt Postgres den Insert ab und
-- "Als neue Ansicht speichern" scheitert still.
--
-- Idempotent: mehrfaches Ausfuehren ist unschaedlich.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "public"."mitglieder_ansichten"
  ADD COLUMN IF NOT EXISTS "sortierung" "jsonb" DEFAULT '[]'::"jsonb";

COMMENT ON COLUMN "public"."mitglieder_ansichten"."sortierung" IS
  'Sortierebenen der Ansicht: [{"key":"name","dir":"asc"}, …]. sortDefs[0] ist die primaere Ebene. Leeres Array/NULL = Ausgangssortierung der Liste.';

-- Keine neue Policy noetig: RLS haengt an der Zeile (verein_id /
-- benutzer_id), nicht an einzelnen Spalten.
