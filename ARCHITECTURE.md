# ClubCampus — Architektur

## Prinzip
Module sind fachlich getrennt, aber über gemeinsame Domains verbunden.
Keine Isolation — Verbindung über Services und Hooks.

## Ordnerstruktur

```
src/
  domains/          ← Business-Logik, Services, Hooks
    person/         ← Personen-Normalisierung, Utilities
    roles/          ← Rollen-Ableitung, Prioritäten
    permissions/    ← Berechtigungen pro Modul und Rolle
    season/         ← Saison-Utilities (nie hardcoden!)
    members/        ← Mitglieder-Service
    kader/          ← Kader-Service + Hook
    teams/          ← Teams-Service + Hook
    termine/        ← Termine-Service
    helfer/         ← Helfer-Service

  shared/           ← Wiederverwendbare UI-Bausteine
    person/
      PersonAvatar.jsx    ← Av + Kamera-Overlay
      PersonSummary.jsx   ← Name + Subtitle + Right-Slot
      PersonSelector.jsx  ← Suche + Auswahl

  modules/          ← Alle Modul-Dateien
    MitgliederModul.jsx
    KaderModul.jsx
    TermineModul.jsx
    HelferModul.jsx
    TrainingsplanModul.jsx
    TeamsVerwaltungModul.jsx
    PortalverwaltungModul.jsx
    NachrichtenModul.jsx
    DashboardModul.jsx
    TeamModul.jsx
    NavigationModul.jsx
    PlatzhalterModul.jsx
    portal/               ← PortalverwaltungModul aufgeteilt
      DesignTokensTab.jsx
      RollenTab.jsx
      ModuleTab.jsx
      MitgliederKonfigTab.jsx
    members/              ← MitgliederModul aufgeteilt
      MemberDetail.jsx
      MemberHero.jsx
      ElternTab.jsx

  theme.jsx         ← Design-System (bleibt im Root)
  constants.js      ← Design-Tokens, Konstanten
  icons.jsx         ← Icon-Definitionen
  supabase.js       ← Supabase-Client
  clubcampus.jsx    ← Haupt-Entry
  main.jsx
  App.jsx
```

## Die eine Regel

```
Module  →  dürfen Domains verwenden       ✓
Domains →  dürfen Shared verwenden        ✓
Shared  →  kennt keine Module             ✗
Module  →  importieren sich nie gegenseitig ✗
```

## Checkliste für neue Module

Vor jedem neuen Modul:

- [ ] Service in `domains/[modul]/[modul]Service.js` erstellen
- [ ] Hook in `domains/[modul]/use[Modul].js` erstellen (wenn State nötig)
- [ ] Permissions in `domains/permissions/permissions.js` ergänzen
- [ ] `PersonSummary`/`PersonAvatar` aus `shared/person/` nutzen
- [ ] `ableitRolle` aus `domains/roles/roleUtils.js` nutzen
- [ ] `currentSeason()` aus `domains/season/seasonUtils.js` nutzen
- [ ] Kein `window.confirm` → `useConfirm` aus `theme.jsx`
- [ ] Kein `demoData` Import
- [ ] Kein `sb.from()` direkt in Komponenten → Service nutzen
- [ ] Modul-Datei in `src/modules/` ablegen

## Verbotene Patterns

```js
// ✗ FALSCH — window.confirm
if (window.confirm("Löschen?")) { ... }

// ✓ RICHTIG — useConfirm
const ok = await confirm({ title: "Löschen?" });
if (!ok) return;

// ✗ FALSCH — sb.from() in Komponente
const { data } = await sb.from("mitglieder").select("*");

// ✓ RICHTIG — Service nutzen
const data = await memberService.fetchAll(sb);

// ✗ FALSCH — Saison hardcoden
const saison = "2025/26";

// ✓ RICHTIG — seasonUtils nutzen
const saison = currentSeason();

// ✗ FALSCH — ableitRolle duplizieren
const PRIORITAET = ["administrator", "administration", ...];

// ✓ RICHTIG — aus roleUtils importieren
import { ableitRolle } from "../../domains/roles/roleUtils";

// ✗ FALSCH — demoData importieren
import { ROSTER } from "../demoData.js";

// ✓ RICHTIG — Supabase Service nutzen
import { fetchKader } from "../../domains/kader/kaderService";

// ✗ FALSCH — Module gegenseitig importieren
import { MemberDetail } from "../MitgliederModul";

// ✓ RICHTIG — shared Komponente nutzen
import { PersonSummary } from "../../shared/person/PersonSummary";
```

## Aktueller Stand

| Phase | Inhalt | Status |
|-------|--------|--------|
| 1 | Foundation (domains/person, domains/roles, domains/permissions, shared/person) | ✅ Fertig |
| 2 | MitgliederModul + KaderModul aufteilen | ✅ Fertig |
| 3 | Teams Domain erstellt, PortalverwaltungModul State zu verflochten → Phase 4 | ✅ Fertig |
| 4 | Termine + Helfer + Dashboard → Supabase, demoData.js löschen | ⏳ Offen |

## Session-Start Routine

1. ZIP des aktuellen Repos hochladen
2. Diese ARCHITECTURE.md erwähnen
3. Claude kennt damit sofort die Regeln und den aktuellen Stand
