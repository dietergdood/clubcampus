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
      memberConstants.js            ← ROLES, FIELD_VIS, COL_GROUPS, GROUP_OPTIONS, GROUP_OPTIONS_MORE
      memberDataUtils.js            ← mapMembers, filterMembers, sortMembers, buildGroups, exportData (3 Varianten)
      memberUtils.jsx               ← LAENDER, getLandName, RolleChip, getFieldVisibility
      tabs/
        InfoTab.jsx
        PortalTab.jsx
        ElternTab.jsx
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
3. Factory-Funktionen (`makeXxx`) → geben sie das Objekt/die Funktion zurück (`return ...`)?
4. Build-Check reicht nicht — er findet keine fehlenden Runtime-Props oder fehlende Return-Statements
5. Prop-Audit mit Script prüfen bevor Files geliefert werden

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

## Session 15 — MitgliederModul Grossüberarbeitung (10.07.2026)

### Neue Spalten (memberConstants.js)
- `teams_rollen` — "Teams & Kaderrollen": Teamname semibold · Rolle grau, kein Chip
- `funktionen_gruppen` — "Funktionen": Gruppenname semibold · Funktion normal, kein Chip
- `teams`, `kaderrollen`, `funktionen`, `funktionsgruppen` — `hidden:true` (nicht in Spaltenauswahl, für Export)

### Daten (clubcampus.jsx)
- `kader_eintraege`: Array von `{team, rollen}` Paaren — korrekte Team-Rollen Zuordnung
- `hat_benutzer` + `benutzer_deaktiviert` aus `benutzer`-Tabelle beim Laden berechnet
- `benutzer`-Tabelle in Promise.all mitgeladen

### Design-Entscheide
- Portalrollen farblich: Admin=Slate, Trainer=Orange, Spieler=Blau, Funktionär=Lila, Eltern=Grau
- Portal-Zugang: Punkt + Text (Aktiv=grün, Deaktiviert=orange, Kein Zugang=grau)
- Datenprüfung: Punkt + Text (Geprüft=grün, Ausstehend=gedämpft-orange)
- Sortier-Icon: aktiv=gelb, inaktiv=nur bei Hover (↕ ausgeblendet)
- Tabellenkopf: 1px gelbe Linie, normale Schrift (kein uppercase+spacing)
- Zeilenhöhe: `padding:5px 14px; vertical-align:top`

### Gruppierung
- `groupContext` (`{type:"team"|"gruppe"|"funktion"|"kaderrolle"|"none", key}`) an `renderCell` weitergegeben
- `type` in `getGroupKey` für alle Gruppierungstypen gesetzt
- `filterVals.__parentGruppe` für kontextuelle Untergruppierung (Funktionsgruppe → Vereinsfunktion)
- `filterVals.__portalFunktionen` für Funktionszuordnung im rekursiven buildGroups
- Leere Team-Gruppen ausgeblendet wenn Kaderrolle-Filter aktiv
- `filterVals` wird an rekursiven `buildGroups` Aufruf weitergegeben

### Export (3 Varianten)
- CSV flach: `teams_rollen` → Teams + Kaderrollen Spalten, `funktionen_gruppen` → Funktionsgruppe + Vereinsfunktionen
- CSV mit Gruppen: kombinierte Spalten behalten
- Excel pro Sheet: expandierte Spalten

### Mobile Bottom Sheet (theme.jsx)
- Zweistufiges Bottom Sheet: Stufe 1 = Hauptmenü (Filter/Gruppieren/Ansichten/Export), Stufe 2 = jeweiliges Untermenü
- Neue CSS-Klassen: `cc-sheet-nav-item`, `cc-sheet-nav-left`, `cc-sheet-subhdr`, `cc-sheet-subhdr-title`, `cc-sheet-scroll`, `cc-sheet-trash`

### Neue CSS-Klassen (theme.jsx)
- `cc-portal-status`, `cc-portal-dot`, `cc-portal-status-aktiv/deaktiviert/kein`
- `cc-dp-status`, `cc-dp-dot`, `cc-dp-status-warn/ok/err`
- `cc-teams-rollen-row`, `cc-teams-rollen-team`, `cc-teams-rollen-sep`, `cc-teams-rollen-rolle`, `cc-teams-rollen-more`
- `cc-funk-row`, `cc-funk-gruppe-badge-sm`
- `cc-role-chip-admin/trainer/spieler/funktionaer/eltern`
- `cc-members-td-mitglied`, `cc-kpi-breakdown-label/value`, `cc-sort-hover-icon`

### SQL ausgeführt (10.07.2026)
- `last_sign_in_at` Spalte + Trigger auf `benutzer` Tabelle → `supabase/migrations/last_sign_in_migration.sql`
- `gruppierung` Spalte in `mitglieder_ansichten` auf `jsonb` geändert → `supabase/migrations/gruppierung_jsonb_migration.sql`

### Offene TODOs (für Session 16+)
- Inline-Editing (Klick auf Zelle → direkt bearbeiten)
- Portalrollenfarben konsequent im ganzen Portal (NavigationModul, PortalTab etc.)
- Funktionär Rollenname in DB evtl. anpassen
- `@tanstack/react-virtual` installiert aber nicht implementiert (Infinite Scroll als Lösung)

## Refactoring-Regeln

**Vor jedem Refactoring einer bestehenden Komponente:**
1. Alle bestehenden Features dokumentieren — was macht die Komponente, welche Edge Cases sind implementiert
2. Besonders kritisch: Filter-Kontext, Gruppen-Kontext, `effectiveGc`/`parentContext` Propagierung bei rekursiven Strukturen
3. Nach dem Refactoring jeden Feature-Punkt einzeln verifizieren — Build grün ≠ Feature funktioniert
4. Konkret testen: alle Gruppierungsoptionen × alle Filterkombinationen
5. Nie annehmen dass eine vereinfachte Version dasselbe tut wie die Original-Implementation

**Bekannte Fallgruben bei MitgliederModul:**
- `effectiveCtx` / `parentContext` muss durch alle Rekursionsebenen von `renderGroupsTable` propagiert werden — Zeilen bekommen sonst falschen Gruppenkontext
- `getGroupKey` für Teams muss `kaderrollen` Filter berücksichtigen — sonst erscheinen Mitglieder in Teams ohne die gefilterte Rolle
- `filterVals` muss an `buildGroups` und `renderCell` weitergegeben werden — Kontext-sensitives Rendering funktioniert sonst nicht
- `__portalFunktionen` und `__parentGruppe` in `filterVals` sind spezielle interne Schlüssel für rekursive Gruppierung



1. ZIP des aktuellen Repos hochladen
2. Diese ARCHITECTURE.md erwähnen
3. Claude kennt damit sofort die Regeln und den aktuellen Stand

## Session-Abschluss Routine

1. Schema, Policies und Rollen vom Zürich-Projekt dumpen (keine Daten):
```bash
npx supabase db dump --db-url "postgresql://postgres.otiyvvxoqghtkcgsjmrv:PASSWORT@aws-1-eu-central-2.pooler.supabase.com:5432/postgres" > supabase/schema.sql
```
2. `supabase/schema.sql` auf GitHub committen (enthält: Tabellen, Policies, RLS, Funktionen, Rollen — keine Nutzdaten)


## Datenbankregeln (Supabase)

### Pflicht für jede neue Tabelle

```sql
CREATE TABLE neue_tabelle (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verein_id   uuid NOT NULL REFERENCES vereine(id),  -- IMMER
  -- ... Felder ...
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX ON neue_tabelle(verein_id);              -- IMMER
ALTER TABLE neue_tabelle ENABLE ROW LEVEL SECURITY;   -- IMMER

-- Minimale Policies (anpassen je nach Tabelle):
CREATE POLICY "neue_tabelle_select" ON neue_tabelle
  FOR SELECT USING (verein_id = get_my_verein_id());

CREATE POLICY "neue_tabelle_write_admin" ON neue_tabelle
  FOR ALL USING (verein_id = get_my_verein_id() AND is_admin());
```

### Pflicht beim INSERT in der App

```javascript
await sb.from("neue_tabelle").insert({
  verein_id: tenant.id,  // IMMER mitgeben
  // ... Felder ...
});
```

### Hilfsfunktionen (bereits in DB definiert)

- `get_my_verein_id()` — gibt verein_id des eingeloggten Users zurück
- `get_my_role()` — gibt Rolle des eingeloggten Users zurück
- `is_admin()` — true wenn administrator oder administration
- `is_trainer()` — true wenn trainer

### Policy-Muster nach Zugriffstyp

| Typ | SELECT | INSERT/UPDATE/DELETE |
|-----|--------|----------------------|
| Vereinskonfiguration | alle im Verein | nur is_admin() |
| Mitgliederdaten | admin/trainer/funktionaer | nur is_admin() |
| Persönliche Daten | benutzer_id = auth.uid() | benutzer_id = auth.uid() |
| Veranstaltungen | alle im Verein | admin/trainer/funktionaer |
| Audit/Log | nur is_admin() | System (kein Check) |

