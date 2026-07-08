# ClubCampus — Architektur

## Prinzip
Module sind fachlich getrennt, aber über gemeinsame Domains verbunden.
Keine Isolation — Verbindung über Services und Hooks.

## Aktuelle Ordnerstruktur

```
src/
  domains/                          ← Business-Logik, Services, Hooks
    permissions/
      permissions.js                ← canEdit/canDelete/canExport pro Modul
    person/
      personTypes.js                ← toPerson() Normalisierer
      personUtils.js                ← vollname(), initials(), age(), formatDatum()
    roles/
      roleUtils.js                  ← ableitRolle(), ROLLE_PRIORITAET, ROLLE_LABEL
    season/
      seasonUtils.js                ← currentSeason(), formatSaison()
    teams/
      teamService.js                ← fetchTeams(), createTeam(), updateTeam()
      useTeams.js                   ← Hook: teams, loading, reload

  shared/                           ← Wiederverwendbare UI-Bausteine
    person/
      PersonAvatar.jsx              ← Av + Kamera-Overlay
      PersonSelector.jsx            ← Suche + Auswahl
      PersonSummary.jsx             ← Name + Subtitle + Right-Slot
      MemberHero.jsx                ← TODO: hierher verschieben bei KaderModul-Migration
      MemberDetail.jsx              ← TODO: hierher verschieben bei KaderModul-Migration
    list/
      MemberListView.jsx            ← TODO: erstellen bei KaderModul-Migration

  modules/                          ← Alle Modul-Dateien
    members/                        ← MitgliederModul aufgeteilt
      ArchivView.jsx                ← Archiv-Tab (reaktivieren, löschen)
      ElternTab.jsx                 ← Elternkontakte-Tab
      MemberDetail.jsx              ← Detailansicht mit allen Tabs inline (796Z)
      MemberHero.jsx                ← Hero-Banner mit Avatar + FotoUpload
      NotizenVerlauf.jsx            ← Notizen-Komponente
      memberConstants.js            ← ROLES, FIELD_VIS, COL_GROUPS, GROUP_OPTIONS
      memberDataUtils.js            ← mapMembers, filterMembers, sortMembers, exportData
      memberUtils.jsx               ← LAENDER, getLandName, RolleChip, getFieldVisibility
    portal/                         ← PortalverwaltungModul aufgeteilt (1 Tab = 1 Datei)
      ApiTab.jsx
      AuditTab.jsx
      AussehenTab.jsx
      DesignSystemTab.jsx           ← Living Style Guide (auto aus COMPONENT_REGISTRY)
      FeldvisTab.jsx
      GruppenTab.jsx
      KaderRollenTab.jsx
      MitgliederKonfigTab.jsx
      ModuleRechteTab.jsx
      RollenTab.jsx
      TeamModuleMatrix.jsx
      TeamModuleTab.jsx
      UsersTab.jsx
      portalUtils.js                ← ZUGRIFF_*, ALLE_MODULE, ROLES, KAT_LABELS etc.
    DashboardModul.jsx
    HelferModul.jsx                 ← ⚠️ Phase 4: noch demoData (2164Z)
    KaderModul.jsx
    MitgliederModul.jsx             ← State + Logik + Render (702Z)
    NachrichtenModul.jsx
    NavigationModul.jsx
    PlatzhalterModul.jsx
    PortalverwaltungModul.jsx       ← State + Tab-Routing (687Z)
    TeamModul.jsx                   ← ⚠️ Phase 4: noch demoData
    TeamsVerwaltungModul.jsx        ← ⚠️ Phase 4: noch demoData
    TermineModul.jsx                ← ⚠️ Phase 4: noch demoData (1631Z)
    TrainingsplanModul.jsx          ← ⚠️ Phase 4: noch demoData (1804Z)

  App.jsx
  clubcampus.jsx                    ← Haupt-Entry (1184Z)
  constants.js
  demoData.js                       ← ⚠️ TEMPORÄR — löschen wenn Phase 4 fertig
  icons.jsx
  main.jsx
  supabase.js
  theme.jsx                         ← Design-System + COMPONENT_REGISTRY (1930Z)
```

## Die eine Regel

```
Module  →  dürfen Domains verwenden       ✓
Domains →  dürfen Shared verwenden        ✓
Shared  →  kennt keine Module             ✗
Module  →  importieren sich nie gegenseitig ✗
```

## Checkliste für neue theme.jsx Komponenten

Neue UI-Komponenten IMMER in COMPONENT_REGISTRY eintragen (theme.jsx, vor dem export):

```js
{
  name: "MeineKomponente",
  desc: "Was sie tut und wann man sie verwendet",
  category: "Basics|Listen|Navigation|Overlays|Feedback|Layout|Formulare",
  usedIn: ["ModulName"],
  props: ["prop1", "prop2+prop3"],
}
```

→ Erscheint automatisch im Portalverwaltung → System → Design-System Tab

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

## Pflege dieser Datei

Diese Datei wird automatisch aktualisiert wenn:
- Neue Dateien erstellt oder verschoben werden
- Phase-Status sich ändert (z.B. Modul auf Supabase migriert)
- Neue Komponenten in COMPONENT_REGISTRY eingetragen werden
- Eine Session abgeschlossen wird

**Manuell nie nötig** — Claude hält sie aktuell.

## Arbeitsweise

**Vor jeder Umsetzung:**
1. Gründlich analysieren — alle Abhängigkeiten, Props, Imports, CSS-Klassen
2. Plan vorlegen und Didi fragen
3. Erst bei explizitem OK umsetzen
4. Umsetzung konzentriert und vollständig — lieber länger als fehlerhaft
5. Build verifizieren (`npx vite build` grün) bevor Files geliefert werden
6. Alle Props/Imports/Abhängigkeiten prüfen bevor Code geliefert wird

**Keine Halbheiten:**
- Nie Annahmen über Props oder Signatures — immer prüfen
- Nie Files liefern ohne Build-Verifikation
- Nie Fehler auf "später" verschieben

**Pflicht nach jedem Auslagern einer Komponente:**
1. Alle Props die neue Komponente empfängt → werden sie vom Parent übergeben?
2. Alle Variablen die neue Komponente verwendet → lokal definiert oder als Prop?
3. Build-Check reicht nicht — er findet keine fehlenden Runtime-Props
4. Prop-Audit mit Script prüfen bevor Files geliefert werden

## CSS-Regeln

**Vor jedem Styling:**
1. Zuerst bestehende `cc-*` Klassen in `theme.jsx` prüfen
2. Bestehende Klasse verwenden wenn vorhanden
3. Kein Inline-CSS wenn eine `cc-*` Klasse existiert
4. Neue CSS-Klassen nur mit Rücksprache mit Didi
5. Falls neue Klasse nötig: in `theme.jsx` mit `cc-` Prefix, nie inline

```jsx
// ✗ FALSCH — Inline-CSS obwohl cc-Klasse existiert
<div style={{display:"flex",gap:8,alignItems:"center"}}>

// ✓ RICHTIG — bestehende Klasse nutzen
<div className="cc-row cc-gap-8">

// ✗ FALSCH — neue Klasse ohne Rücksprache
.meine-neue-klasse { ... }

// ✓ RICHTIG — erst fragen, dann in theme.jsx mit cc- Prefix
// → Rücksprache mit Didi → dann: .cc-meine-klasse { ... } in theme.jsx
```

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
