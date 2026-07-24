# ClubCampus — Architektur

## Prinzip
Module sind fachlich getrennt, aber über gemeinsame Domains verbunden.
Keine Isolation — Verbindung über Services und Hooks.

## Aktuelle Ordnerstruktur

```
src/
  domains/                          ← Business-Logik, Services, Hooks
    members/
      memberService.js              ← fetchMitglieder, updateMitglied, logAenderung, logAktivitaet, fetchAenderungen, fetchAktivitaeten, FELD_LABEL, AKTIVITAET_TYP, insertMitglied etc.
      useMemberMeta.js              ← Hook: ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap
      useInlineEdit.js              ← Hook für Inline Cell Editing (startEdit, saveEdit, cancelEdit, handleKey, feedback)
    permissions/
      permissions.js                ← canEdit/canDelete/canExport pro Modul
    person/
      personTypes.js                ← toPerson() Normalisierer
      personUtils.js                ← vollname(), initials(), age(), formatDatum(), LAENDER, getLandName
    roles/
      roleUtils.js                  ← ableitRolle(), ROLLE_PRIORITAET, ROLLE_LABEL
    season/
      seasonUtils.js                ← currentSeason(), formatSaison()
    teams/
      teamService.js                ← fetchTeams(), createTeam(), updateTeam()
      useTeams.js                   ← Hook: teams, loading, reload

  shared/                           ← Wiederverwendbare UI-Bausteine
    list/
      ListView.jsx                  ← Zentrale Listenkomponente (Filter, Gruppierung, Ansichten, Export)
      exportUtils.js                ← exportListData(), buildFilterDefs(), csvDownload()
    person/
      PersonAvatar.jsx              ← Av + Kamera-Overlay
      PersonFunktionen.jsx          ← Vereinsfunktionen-Ansicht
      PersonKontakt.jsx             ← Kontaktdaten-Ansicht
      PersonPersonalien.jsx         ← Personalien-Ansicht
      PersonSelector.jsx            ← Suche + Auswahl
      PersonSummary.jsx             ← Name + Subtitle + Right-Slot
      PersonTeams.jsx               ← Teams-Ansicht
      RolleChip.jsx                 ← Rollen-Badge (wiederverwendbar in allen Modulen)

  modules/                          ← Alle Modul-Dateien
    members/                        ← MitgliederModul aufgeteilt
      ArchivView.jsx                ← Archiv-Tab (reaktivieren, löschen) — nutzt ListView
      ElternListView.jsx            ← Eltern-Tab (Liste) — nutzt ListView
      FotoUpload.jsx                ← Foto-Upload Komponente (ausgelagert aus MemberHero)
      MemberDetail.jsx              ← Detailansicht mit allen Tabs
      MemberHero.jsx                ← Hero-Banner mit Avatar + FotoUpload
      MemberKPIs.jsx                ← KPI-Cards + Aufschlüsselung
      MemberListCell.jsx            ← makeMemberRenderCell() Factory für ListView
      NeuesMitgliedModal.jsx        ← Neues Mitglied anlegen (Mitgliedtyp → Pflichtfelder)
      NotizenVerlauf.jsx            ← Notizen-Komponente
      memberConstants.js            ← COL_GROUPS, SAVED_VIEWS, GROUP_OPTIONS, GROUP_OPTIONS_MORE
      memberDataUtils.js            ← Re-Exports (mapMembers, filterMembers etc.)
      memberMapper.js               ← DB→UI Transformation
      memberFilter.js               ← Filter + Sort mit UND/ODER-Logik
      memberGrouping.js             ← Gruppierungslogik
      memberExportUtils.js          ← mitglieder-spezifischer Export
      memberUtils.jsx               ← getFieldVisibility; re-exportiert LAENDER, getLandName, RolleChip
      tabs/
        DatenpruefungTab.jsx
        ElternTab.jsx
        InfoTab.jsx
        PortalTab.jsx               ← Portalrolle inline editierbar
        VerlaufTab.jsx              ← Änderungshistorie (aenderungen + aktivitaeten kombiniert)
      __tests__/
        memberFilter.test.js (18)
        memberGrouping.test.js (18)
        memberMapper.test.js (23)
        memberListCell.test.jsx (21)
        useInlineEdit.test.jsx (18)
        neuesMitgliedModal.test.jsx (13)
        verlaufTab.test.jsx (12)
        elternTab.test.jsx (11)
        portalTab.test.jsx (13, 2 skip)
        personFunktionen.test.jsx (12)
        personTeams.test.jsx (8)
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
    HelferModul.jsx                 ← ⚠️ Phase 4: noch demoData (2164Z), RolleChip dupliziert → shared nutzen
    KaderModul.jsx                  ← ⚠️ Phase 4: Supabase-Migration offen
    MitgliederModul.jsx             ← State + Koordination (305Z)
    NachrichtenModul.jsx
    NavigationModul.jsx
    PlatzhalterModul.jsx
    PortalverwaltungModul.jsx       ← State + Tab-Routing
    TeamModul.jsx                   ← ⚠️ Phase 4: noch demoData
    TeamsVerwaltungModul.jsx        ← ⚠️ Phase 4: noch demoData; verein_id bei INSERT fehlt (Zeilen 273+979)
    TermineModul.jsx                ← ⚠️ Phase 4: noch demoData
    TrainingsplanModul.jsx          ← ⚠️ Phase 4: noch demoData

  App.jsx
  clubcampus.jsx                    ← Haupt-Entry
  constants.js
  demoData.js                       ← ⚠️ TEMPORÄR — löschen wenn Phase 4 fertig
  icons.jsx
  main.jsx
  supabase.js
  theme.jsx                         ← Design-System + COMPONENT_REGISTRY + PortalBadge + DpBadge
```

## Prinzip: Auslagern und Wiederverwenden

**Vor jedem neuen Feature oder Komponente:**
1. Prüfen ob etwas Ähnliches bereits in `shared/`, `domains/` oder `theme.jsx` existiert
2. Prüfen ob bestehende Logik in `memberService.js`, `exportUtils.js`, `personUtils.js` etc. genutzt werden kann
3. Nie duplizieren — lieber zentralisieren und importieren

**Wann auslagern?**
- Komponente ist >80 Zeilen und hat einen klar abgrenzbaren Zweck → eigene Datei
- Logik wird in mehr als einem Modul genutzt oder könnte genutzt werden → `shared/` oder `domains/`
- Service-Calls (`sb.from()`) in einer Komponente → in `memberService.js` (oder jeweiligen Service)
- Render-Logik mischt sich mit State-Logik → trennen

**Konkrete Checkliste beim Bauen:**
- [ ] Gibt es bereits eine `cc-*` CSS-Klasse für dieses Styling? → nutzen, nicht inline
- [ ] Gibt es bereits eine Komponente in `theme.jsx`? → importieren
- [ ] Gibt es bereits eine Komponente in `shared/`? → importieren
- [ ] Gibt es bereits eine Service-Funktion in `memberService.js`? → nutzen
- [ ] Gibt es bereits einen Hook in `domains/`? → nutzen
- [ ] Ist diese Logik auch für KaderModul / HelferModul nützlich? → in `shared/` oder `domains/`

**Bekannte wiederverwendbare Bausteine:**
- `ListView.jsx` — für jede tabellarische Liste mit Filter/Gruppierung/Export
- `exportListData()` — für generischen CSV/Excel Export
- `buildFilterDefs()` — für automatische Filter-Definitionen aus Daten
- `PortalBadge`, `DpBadge` — Portal-Zugang und Datenprüfungs-Status
- `RolleChip` — Rollen-Badge
- `useMemberMeta()` — ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap
- `LAENDER`, `getLandName` — Länderliste und Ländername
- `PersonPersonalien`, `PersonKontakt`, `PersonTeams`, `PersonFunktionen` — Detail-Ansichten



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
- [ ] `PersonSummary`/`PersonAvatar` aus `shared/person/` nutzen — Inline CSS dort zuerst bereinigen (6 Stellen PersonSelector, 4 PersonSummary, 2 PersonAvatar)
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

## Session 17 — ListView-Zentralisierung + MitgliederModul Refactoring (23.07.2026)

### Zentrale ListView-Architektur
- `ListView.jsx` — Default filterFn, sortFn, buildGroupsFn, renderCell eingebaut
- `exportUtils.js` — `exportListData()`, `buildFilterDefs()`, `csvDownload()` zentral
- `ArchivView` + `ElternListView` nutzen jetzt ListView-Defaults (keine eigenen filterFn/sortFn mehr)
- Geteilte Ansichten: `geteilt boolean` in `mitglieder_ansichten`, Admin kann freigeben
- `effectiveCtx` / `parentCtx` Propagierung durch alle Rekursionsebenen von `renderGroupsTable`

### Storage Policy (nachträglich)
- `mitglieder-fotos` Bucket: `WITH CHECK` für UPDATE Policy fehlte → manuell ergänzt

### Neue Files
- `src/modules/members/FotoUpload.jsx` — Foto-Upload (ausgelagert aus MemberHero)
- `src/domains/members/memberService.js` — +updateMitglied, +updateMitgliedRolle, +updateMitgliedFoto, +deleteMitgliedFoto, +fetchBenutzerByMitglied


- `src/modules/members/MemberListCell.jsx` — makeMemberRenderCell() Factory
- `src/modules/members/MemberKPIs.jsx` — KPI-Cards + Aufschlüsselung
- `src/shared/person/RolleChip.jsx` — shared RolleChip (war in memberUtils + HelferModul dupliziert)
- `src/domains/person/personUtils.js` — +LAENDER, +getLandName (war in memberUtils, shared importiert falsch)
- `theme.jsx` — +PortalBadge, +DpBadge, cc-teams-rollen-more CSS komplett

### SQL-Migrationen (alle ausgeführt ✅)
- `mitglieder_ansichten_geteilt_migration.sql` — `geteilt boolean DEFAULT false`
- `gruppenreihenfolge jsonb` — fehlte noch in mitglieder_ansichten

### Kritische Bugfixes (reparierte Regressionen)
- `getGroupKey` für Teams: Kaderrolle-Filter berücksichtigt → nur Teams zeigen wo Rolle zutrifft
- `getGroupKey` für Kaderrollen: `__parentTeam` aus `buildGroups` genutzt → nur Rollen im übergeordneten Team
- `buildGroups`: `__parentTeam` bei Team-Gruppen weitergegeben (analog zu `__parentGruppe`)
- `effectiveCtx` in ListView: bei Team+Kaderrolle Mehrfachgruppierung `subType`/`subKey` weitergeben
- `renderCell` teams_rollen: `rolleFilter` aus `subType/subKey` bei Mehrfachgruppierung

### MitgliederModul Zeilenzahlen
| File | Vorher | Nachher |
|------|--------|---------|
| MitgliederModul.jsx | 571 | 305 |
| MemberListCell.jsx | — | 181 (neu) |
| MemberKPIs.jsx | — | 89 (neu) |
| useMemberMeta.js | — | 26 (neu) |
| memberDataUtils.js | 428 | 407 |
| memberUtils.jsx | 136 | 33 |

### Offene TODOs (Session 18+)
- Inline Cell Editing (MitgliederModul)
- Portalrollenfarben konsequent im ganzen Portal
- Kader+Termine → Supabase Migration
- HelferModul: RolleChip Duplikat → `src/shared/person/RolleChip.jsx` nutzen
- Elternkontakte: n:m Verknüpfung, "Supporter" wenn kein Kind mehr



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


## Bewertungs-Prompt

Folgenden Prompt am Anfang einer Session einfügen um ein Modul oder das Gesamtprodukt zu bewerten:

```
Bewerte [MODUL / Gesamtprodukt] von ClubCampus anhand des folgenden Rahmens.
Gib für jeden Bereich eine Punktzahl von 0–10 und berechne die gewichtete Gesamtpunktzahl.
Prüfe zusätzlich die Ausschlusskriterien — ein Treffer begrenzt die Gesamtbewertung unabhängig vom Resultat.

Bewertungsbereiche (Gewichtung × Punktzahl ÷ 10 = Beitrag):
1.  Produktnutzen & Problemlösung         10% — Löst es echte Vereinsprobleme besser als Excel/WhatsApp/Fairgate?
2.  Zielgruppen- & Rollenfit               6% — Passt es für Admin, Trainer, Spieler, Eltern, Funktionär, Mehrfachrollen?
3.  Informationsarchitektur & Navigation   7% — Findet der Benutzer schnell was er sucht? Max. 3 Klicks zu Kernfunktionen.
4.  Usability & Arbeitsabläufe            12% — ★ KRITISCH — Kann der Benutzer ohne Erklärung seine Aufgabe erledigen?
5.  Visuelles Design & Markenqualität      7% — Konsistenz, Hierarchie, Mandanten-Branding ohne Farbmischmasch.
6.  Mobile & Barrierefreiheit              7% — PWA, einhändig bedienbar, Kontrast, Fokuszustände.
7.  Funktionale Qualität & Vollständigkeit 10% — Module vollständig durchdacht und untereinander verknüpft?
8.  Rollen, Berechtigungen & Mandanten     9% — ★ KRITISCH — Min. 8/10 für Marktreife. verein_id, RLS, Datentrennung.
9.  Datenqualität & Integrationen          7% — Fairgate, SFV, Kalender, Export. Klare Datenhoheit.
10. Datenschutz & Informationssicherheit   8% — ★ KRITISCH — Min. 8/10. DSGVO, nDSG, RLS, Secrets, Audit-Log.
11. Performance & Stabilität               6% — <0.2s Reaktion, <2s Seitenlade, <5s komplexe Auswertung.
12. Administration & Skalierbarkeit        5% — Mandant-Setup ohne Code, Betrieb, Migration, Rollback.
13. Onboarding & Akzeptanz                 3% — Erster Login verständlich, ohne Schulung nutzbar.
14. Marktfähigkeit & Geschäftsmodell       3% — SaaS-Reife, USP vs. Fairgate/ClubDesk, Positionierung.

Ausschlusskriterien (bei Treffer: Gesamtbewertung max. 60%, unabhängig vom Resultat):
- Benutzer kann Daten anderer Vereine sehen
- RLS oder Zugriffskontrollen unvollständig
- Kernprozesse auf Smartphone nicht nutzbar
- Trainer/Eltern können fremde Mitgliederdaten abrufen
- Daten können ohne Wiederherstellung verloren gehen
- Neuer Verein nur durch Codeanpassungen einrichtbar
- Sensible Daten in URLs, Logs oder frei zugänglichen Dateien

Zielwerte:
- ≥ 75% → stabiler FCH-Einsatz
- ≥ 82% → externe Pilotvereine
- ≥ 88% → professioneller Marktstart

Detailgrad: [Kurzfassung / Standard / Ausführlich mit Verbesserungsvorschlägen]
Fokus: [optional]
```

---

## Session 17 — 23.07.2026

### Abgeschlossene Arbeiten

#### Inline Editing
- `useInlineEdit` Hook (`src/domains/members/useInlineEdit.js`) — zentraler Hook für alle Inline-Felder
- `InlineField` Komponente in `theme.jsx` — klickbares Feld mit Input/Dropdown + Hint
- `PersonPersonalien.jsx` — alle Felder inline editierbar inkl. Nationalität (kombiniert, zwei Dropdowns)
- `PersonKontakt.jsx` — E-Mail, Telefon, Adresse inline editierbar
- `InfoTab.jsx` — Vereinsdaten Card inline editierbar
- `PortalTab.jsx` — Portalrolle inline editierbar mit sofortigem State-Update
- AHV-Nr. maskiert aber editierbar
- `MemberEditModal.jsx` entfernt — kein Modal mehr für Stammdaten

#### Neues Mitglied anlegen
- `NeuesMitgliedModal.jsx` — Mitgliedtyp zuerst → dynamische Pflichtfelder aus DB
- `insertMitglied` + `fetchMitgliedtypPflichtfelder` in `memberService.js`
- Unbekannte Felder (z.B. `vorname_nachname`) werden in Validierung übersprungen
- `FELD_LABEL` aus `memberService` für Fehlermeldungen
- Button "Mitglied hinzufügen" in `MitgliederModul` (nur Admins, `<Btn variant="primary">`)

#### Änderungshistorie — vollständig
**Zwei Tabellen:**
- `mitglieder_aenderungen` — echte Wert-zu-Wert-Änderungen (beide Seiten nicht null)
- `mitglieder_aktivitaeten` — strukturierte Ereignisse

**Logging eingebaut in:**
- `useInlineEdit` — alle Inline-Felder (Personalien, Kontakt, Vereinsdaten)
- `PersonTeams` — Team zuweisen/entfernen, Kaderrollen ändern
- `PersonFunktionen` — Funktion hinzufügen/entfernen (Modal + DropMenu)
- `ElternTab` — Elternkontakt hinzufügen/bearbeiten/löschen/Hauptkontakt
- `PortalTab` — Portalrolle ändern
- `MemberHero` — Archivieren/Reaktivieren (loggt VOR der Aktion)
- `MemberDetail` — Portal deaktivieren/reaktivieren
- `NeuesMitgliedModal` — "Mitglied angelegt"
- `PlatzhalterModul` — Mitglied-Selbständerungen via Datenprüfung
- Supabase Trigger `handle_new_user` — Portal-Aktivierung

**`logAenderung` Entscheidungslogik:**
- `Wert A → Wert B` → `mitglieder_aenderungen`
- `null → Wert` → `mitglieder_aktivitaeten` (FELD_ERFASST)
- `Wert → null` → `mitglieder_aktivitaeten` (FELD_GELEERT)

**`AKTIVITAET_TYP` Konstanten:** ANGELEGT, FELD_ERFASST, FELD_GELEERT, TEAM_HINZUGEFUEGT, TEAM_ENTFERNT, KADERROLLE_GEAENDERT, FUNKTION_GEAENDERT, ELTERN_HINZUGEFUEGT, ELTERN_ENTFERNT, ELTERN_GEAENDERT, PORTAL_AKTIVIERT, PORTAL_DEAKTIVIERT, PORTAL_REAKTIVIERT, ARCHIVIERT, REAKTIVIERT

#### VerlaufTab
- Zwei Quellen kombiniert, chronologisch, Datum-Trenner
- Änderungen: Feld + alt→neu; Aktivitäten: Icon + Beschreibung
- AHV-Nr. beide Seiten maskiert; Rollen übersetzt; Geschlecht übersetzt
- Auto-Reload via Key (`raw.id + raw.aktiv + raw.updated_at`)

#### CSS/Icons
- Neue Klassen: `cc-label-req`, `cc-hint-sub`, `cc-info-hint`, `cc-text-right`, `cc-relative`, `cc-cursor-pointer`, `cc-verlauf-*`, `cc-land-badge`
- `cc-info-grid`: `align-items:stretch`; `cc-info-row`: `flex-direction:column;justify-content:center`
- Neue Icons: `pencil`, `history`, `user-plus`, `users-plus`, `users-minus`, `heart-plus`, `heart-minus`, `activity`, `loader`

#### SQL-Migrationen (alle ausgeführt)
- `mitglieder_aenderungen_migration.sql` ✅
- `mitglieder_aktivitaeten_migration.sql` ✅
- `portal_aktivierung_log_migration.sql` ✅

#### Tests — 167/167 grün (11 Files)
- `useInlineEdit.test.jsx` (18), `neuesMitgliedModal.test.jsx` (13)
- `verlaufTab.test.jsx` (12), `elternTab.test.jsx` (11), `portalTab.test.jsx` (13, 2 skip)
- `personFunktionen.test.jsx` (12), `personTeams.test.jsx` (8)

#### Bewertung Session 17: 9.7/10

---

### OFFENE ARBEIT (nächste Session)

**Priorität 1:**
- Kader + Termine → Supabase Migration
  - MemberHero + MemberDetail → `src/shared/person/` verschieben
  - `src/shared/list/MemberListView.jsx` erstellen
  - `PersonSummary`/`PersonAvatar` aus `shared/person/` nutzen — Inline CSS zuerst bereinigen (6 Stellen PersonSelector, 4 PersonSummary, 2 PersonAvatar)
  - TeamsVerwaltungModul Zeilen 273+979: `verein_id: tenant.id` fehlt

**Priorität 2:**
- Eltern-Tab: n:m Struktur (mehrere Kinder pro Elternteil)
- Demo-Daten entfernen aus `portal_pwa.jsx`/`demoData.js`
- ARCHITECTURE.md Phase 1 (Foundation/domains refactor) nicht gestartet
- Portalverwaltung Mitglieder-Konfiguration Tab (CRUD + Matrizen)

## Post-Refactoring Pflicht-Workflow

Nach **jedem** grossen Refactoring (Auslagern von Komponenten, Hooks, Dateien verschieben):

```bash
# 1. Fehlende Konstanten-Imports prüfen
python3 scripts/check_imports.py

# 2. Automatisch fixen
python3 scripts/check_imports_fix.py

# 3. Build verifizieren
npm run build
```

**Warum:** Konstanten aus `constants.js` (GB, ACCENT, FONT, R, etc.) wurden früher implizit
durch `clubcampus.jsx` geerbt. Seit dem Refactoring ist jedes Modul eigenständig und muss
Konstanten explizit importieren. Das Skript findet fehlende Imports automatisch.

**Scripts:** `scripts/check_imports.py` (prüfen) und `scripts/check_imports_fix.py` (auto-fix)

**Claude macht dies automatisch** am Ende jeder Session die ein Refactoring enthält.
