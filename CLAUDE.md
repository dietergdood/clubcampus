# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ClubCampus — mandantenfähige PWA für Sportvereine (React 18 + Vite + Supabase). **Code, UI-Texte, Kommentare und Domänenbegriffe sind Deutsch** (Schweiz) — das gilt auch für neuen Code (`mitglieder`, `kader`, `verein_id`, `kannSchreiben`, …).

## Befehle

```bash
npm install                # node_modules ist nicht eingecheckt
npm run dev                # Vite Dev-Server
npm run build              # Produktionsbuild — muss vor jeder Lieferung grün sein
npm test                   # vitest run (alle Tests)
npm run test:watch         # vitest watch

npm run typecheck          # tsc --noEmit
npm run check:imports      # fehlende Konstanten-Imports (--fix ergänzt sie)

npx vitest run src/modules/members/__tests__/memberFilter.test.js   # eine Datei
npx vitest run -t "filtert nach Team"                               # ein Testfall
```

ESLint ist konfiguriert (`eslint.config.js`, Flat Config; `npm run lint`, blockt in CI nur bei error-Level: `react-hooks/rules-of-hooks` + `import/no-restricted-paths`). Tests (vitest + Testing Library, jsdom, Setup in `src/test-setup.js`) liegen an zwei Orten: **Komponenten-Tests** unter `src/modules/members/__tests__/`, **Service-/Domain-Tests** co-lokalisiert unter `src/domains/members/__tests__/` (mit dem Mock-Supabase-Helfer `_mockSb.ts`). Service-Tests sind `.test.ts` und werden von `tsc` strict typgeprüft; Komponenten-Tests bleiben `.jsx` (via `checkJs:false` nicht typgeprüft).

Stand 26.07.2026: 181 grün, 2 skipped, 0 rot.

**Häufigste Testfalle:** Die Tests mocken `theme.jsx` mit einer Factory, die die benötigten Exporte einzeln auflistet. Nutzt eine Komponente eine weitere Komponente aus `theme.jsx`, wirft Vitest bereits bei der blossen Referenz (`No "X" export is defined on the mock`) — und zwar für die ganze Testdatei, nicht nur den betroffenen Fall. Wer einen Import in einer getesteten Komponente ergänzt, ergänzt den Mock mit.

**Env-Variablen** (`.env`, gitignored) sind Pflicht — ohne sie bleibt `supabaseClient` `null` und die App zeigt nur den Login-Screen:

```
VITE_SUPABASE_URL=…
VITE_SUPABASE_ANON_KEY=…
```

## Architektur — Gesamtbild

**Kein Router.** `src/clubcampus.tsx` (`Portal`) ist Root-Komponente, Datenlader und Router in einem:

- `active` (String-Key) steuert die Ansicht über einen `switch` in `getView()`; persistiert in `window.location.hash` + `sessionStorage`, `popstate` für Browser-Zurück. Sub-Navigation (z.B. Team-Detail) registriert einen `customBack`-Callback.
- Alle App-Daten (`dbUser`, `dbTeams`, `dbMitglieder`, `dbStufen`, `dbMitgliedtypen`, `dbPortalRollen`, `dbKaderRollen`, `dbFunktionen`, `tenant`) werden nach Login in `Portal` geladen und per **Prop-Drilling** in die Module gereicht — inklusive des Supabase-Clients `sb`.
- Ladefunktionen liegen in `src/domains/app/useAppData.js` (`loadDbMitglieder` reichert Mitglieder z.B. mit `kader_eintraege`, `hat_benutzer`, `benutzer_deaktiviert` an). `useDbUser` leitet zusätzlich aus `kader.rollen` die höchste Portalrolle ab und **schreibt sie in `benutzer.role` zurück**.
- Module importieren sich nie gegenseitig. Wo ein Modul ein anderes rendern muss, übergibt `Portal` es als Prop (`TeamViewComponent`, `KaderModulComponent`, …).

**Mandantenfähigkeit.** Alle Vereine teilen eine Supabase-DB; Trennung über `verein_id` + RLS. Der Verein wird aktuell mit `.single()` aus `vereine` geladen — **kein Slug-/Pfad-Routing**, ein Deployment sieht genau einen Verein. Jede neue Tabelle braucht zwingend `verein_id`, Index, RLS und Policies; jedes `insert()` braucht `verein_id: tenant.id`. DB-Helper: `get_my_verein_id()`, `get_my_role()`, `is_admin()`, `is_trainer()`. Policy-Vorlagen: `ARCHITECTURE.md` → Datenbankregeln.

> **`verein_id`-Regel (häufigster Defekt).** Fast jede Tabelle hat `verein_id NOT NULL` **ohne** DB-Default. Jedes `insert()`/`upsert()` muss `verein_id: tenant.id` (Komponenten: die `vereinId`/`tenant?.id`-Prop) mitgeben — sonst lehnt die DB die Zeile ab und die Aktion scheitert still (Fehler landet höchstens in einer `saveMsg`). `update()` ist nicht betroffen (die Spalte ist schon gesetzt). Bei `upsert()` gilt es trotzdem, weil der Insert-Zweig greifen kann. Die TS-Migration von `modules/portal/` (Session 18) hat so sechs tote Schreibpfade aufgedeckt (Users↔Funktionen, Team-Module, Mitgliedtyp + zwei Pflichtfeld-Matrizen, Modul-Rechte, Gruppen/Funktionen/Team-Zuordnung) — alle als JS unsichtbar. Wer einen Schreibpfad anfasst: `verein_id` prüfen.

**Branding/Theme.** `vereine.theme` (JSONB) → `applyThemeCss()` schreibt CSS-Variablen (`--cc-accent`, `--nav`, `--btn-primary`, …) mit `!important` in ein injiziertes `<style id="cc-theme-vars">`. `localStorage["cc-theme"]` wird zuerst angewendet (Flicker-Schutz), danach überschreibt Supabase. Eine Realtime-Subscription auf `UPDATE vereine` verteilt Branding-Änderungen live an alle Sessions.

**Zwei Berechtigungsschichten** — nicht verwechseln:
1. `domains/app/getPermissions.ts` — Zugriffstufen `lesen | schreiben | verwalten` pro Modul-Key. Quelle: DB (`module_config`, `modul_rechte`, via `localStorage` gecached) mit `APP_ZUGRIFF_DEFAULT` als Fallback. Liefert `kannLesen/kannSchreiben/kannVerwalten`, die als Props in die Module wandern. Für Rolle `funktionaer` kommt die Stufe stattdessen aus `portal_funktionen`/`portal_gruppen` (`getEffektiveStufeForFunktionaer` in `domains/permissions/funktionaerStufen.ts`).
2. `domains/permissions/permissions.js` — statische Prädikate pro Fachbereich (`memberPermissions.canEdit(role)` etc.).
Zusätzlich blendet `isModuleVisible()` in `clubcampus.tsx` Module global/rollenbasiert aus; `administrator` sieht immer alles.

**Rollen:** `administrator`, `administration`, `trainer`, `funktionaer`, `spieler`, `eltern` (+ `supporter`). Umlaute werden für Rollen-Keys normalisiert (`funktionär` → `funktionaer`).

### Schichten

```
modules/  →  domains/  →  shared/        erlaubt
shared/   kennt keine Module            verboten
Modul     importiert Modul              verboten
```

- `src/domains/` — Services (`sb` als erstes Argument: `updateMitglied(sb, id, fields)`) und Hooks.
- `src/shared/` — wiederverwendbare UI: `ui/`, `forms/`, `list/`, `person/`.
- `src/theme.jsx` — **Barrel-Datei**, die fast alles aus `shared/` re-exportiert (`Btn`, `Card`, `Modal`, `Toolbar`, `InlineField`, `useConfirm`, `COMPONENT_REGISTRY`, …). Neue Komponenten als eigene Datei unter `shared/` anlegen **und** in `theme.jsx` re-exportieren; Module importieren aus `theme.jsx`.
- `src/styles/cc.css` — das komplette Design-System als `cc-*`-Klassen (eingebunden über `styles/index.css`).
- `src/constants.ts` — Design-Tokens (`FONT`, `TEXT`, `SPACE`, `RADIUS`, Farben). Module erben nichts implizit: fehlende Konstanten explizit importieren.

### Listen: ListView

Jede tabellarische Liste läuft über `shared/list/ListView.jsx` (State/Logik in `useListView.js`): Suche, Filter, Mehrfach-Gruppierung, Spaltenauswahl mit Drag&Drop, Sortierung, Bulk-Aktionen, gespeicherte Ansichten (`mitglieder_ansichten`, teilbar via `geteilt`), Export über `exportUtils.js`. Nicht neu bauen — `colDefs`, `filterDefs`, `groupOptions`, `renderCell` übergeben.

Fallstricke bei rekursiver Gruppierung: `effectiveCtx`/`parentCtx` müssen durch **alle** Ebenen von `renderGroupsTable` propagiert werden, `filterVals` an `buildGroups` und `renderCell` weiterreichen; `__parentTeam`, `__parentGruppe`, `__portalFunktionen` sind interne Kontextschlüssel.

### Mitgliedermodul als Referenz

`src/modules/members/` ist das am weitesten refaktorierte und einzige getestete Modul — Vorlage für neue Module: `memberMapper.js` (DB→UI), `memberFilter.js`, `memberGrouping.js`, `memberExportUtils.js`, `memberConstants.js`, Detail-Tabs unter `tabs/`, Service in `domains/members/memberService.js`.

Inline-Editing läuft über `domains/members/useInlineEdit.js` + `InlineField`; es gibt kein Bearbeiten-Modal für Stammdaten.

**Änderungshistorie** — zwei Tabellen, Logik in `logAenderung()`:
- `Wert A → Wert B` → `mitglieder_aenderungen`
- `null → Wert` / `Wert → null` → `mitglieder_aktivitaeten` (`FELD_ERFASST` / `FELD_GELEERT`)
- Strukturierte Ereignisse (`AKTIVITAET_TYP`: Team, Kaderrolle, Eltern, Portal, Archiv …) → `logAktivitaet()`

`VerlaufTab` mischt beide Quellen chronologisch. Wer Mitgliederdaten schreibt, loggt.

## Migrationsstand

Nicht alle Module hängen an Supabase. `src/demoData.js` ist temporär und wird noch importiert von: `DashboardModul`, `TermineModul`, `TrainingsplanModul`, `HelferModul`, `TeamModul`, `PlatzhalterModul`, `NavigationModul` (`USER_ACCOUNTS`), `appConstants.js` und `clubcampus.tsx` (nur noch `USER_ACCOUNTS`). Neue Features nie gegen `demoData` bauen — Service + Supabase.

TypeScript-Migration **abgeschlossen**: `domains/`, `shared/`, alle `src/modules/*` (inkl. `modules/portal/`, `modules/members/`), `clubcampus.tsx` sowie `App.tsx`/`main.tsx` sind `.tsx`. Übrig als `.jsx` sind nur noch die Test-Dateien unter `src/modules/members/__tests__/`. `tsconfig` ist `strict`, aber `checkJs: false` und es gibt keine CI-Typprüfung — deshalb vor jeder Lieferung `npm run typecheck` laufen lassen.

Der frühere `JsComponent`-Brücken-Block in `clubcampus.tsx` (umging die Prop-Prüfung noch nicht migrierter JS-Komponenten) ist entfernt; alle von `clubcampus.tsx` gerenderten Module werden jetzt regulär typgeprüft.

**Muster aus der Migration** (falls ein Legacy-`.jsx` neu dazukommt): demoData-Importe (`ROSTER`, `SCHEDULE`, `TABLES`, `ATT_EVENTS`, `HELPERS`, …) sind stark inferiert und tragen Phantomfelder — beim Zugriff als `any` aliasieren (`import { ROSTER as ROSTER_SRC } …; const ROSTER: any[] = ROSTER_SRC;`). `window.storage` ist eine App-Bridge, kein Standard-Window-Feld → über einen lokalen `winStorage`-Cast kapseln. State-Objekte **nie** als `useState<any>(null)`/`useState({})` typisieren (dann kollabiert `SetStateAction<any>` und der Updater-Param wird implizit-`any`) — konkret als `useState<Record<string, any>>({})` o.ä.

## Konventionen

- Kein `sb.from()` direkt in Komponenten → Service in `domains/`. (Legacy-Module verletzen das noch; neuer Code nicht.)
- Kein `window.confirm` → `useConfirm` aus `theme.jsx`.
- Kein Inline-CSS, wenn eine `cc-*`-Klasse existiert. Neue CSS-Klassen nur mit `cc-`-Prefix in `cc.css` — und laut `ARCHITECTURE.md` nur nach Rücksprache mit Dieter.
- Saison nie hardcoden → `currentSeason()` aus `domains/season/seasonUtils.ts`.
- Rollenableitung nie duplizieren → `ableitRolle()` / `ROLLE_PRIORITAET` aus `domains/roles/roleUtils.ts`.
- Neue UI-Komponenten in `COMPONENT_REGISTRY` (`src/shared/componentRegistry.js`) eintragen — daraus generiert sich der Design-System-Tab in der Portalverwaltung.
- Nach dem Auslagern einer Komponente: alle Props gegen den Parent prüfen und Factory-Funktionen (`makeXxx`) auf `return` kontrollieren — der Build findet fehlende Runtime-Props nicht.

## Datenbank-Workflow

`supabase/schema.sql` ist ein manuell gepflegter Schema-Dump (Tabellen, Policies, RLS, Funktionen — keine Nutzdaten) und beim Nachschlagen von Spalten/Policies die verlässlichste Quelle. Nach DB-Änderungen neu dumpen und committen (Kommando in `ARCHITECTURE.md` → Session-Abschluss Routine). Edge Function `supabase/functions/invite-user` versendet Einladungs-Mails über die Auth-Admin-API.

## Weitere Dokumente

- `ARCHITECTURE.md` — Regeln, Checklisten, Session-Historie, Bewertungsrahmen. **Teils veraltet**: `domains/teams/` liegt heute unter `src/modules/teams/`, `theme.jsx` ist nur noch Barrel (Komponenten in `shared/`), `COMPONENT_REGISTRY` in `shared/componentRegistry.js`, CSS in `src/styles/cc.css`. Bei Widerspruch gilt der Code.
- `ELTERN_LOGIK.md` — n:m-Modell `elternkontakte`/`eltern_kinder` und die Entknüpfungs-/Supporter-Logik (teilweise noch nicht implementiert).
- `README.md` — Produktüberblick, Rollen, Einrichtung eines neuen Vereins.

## Bekannte Defekte

- `Mitgliedtyp` in `types.ts` bildet `mitgliedtypen` nur teilweise ab — es fehlen `id`, `hauptkontakt_pflicht`, `standard_rolle` und `beitragsinfo`. `MitgliederModul` ergänzt `hauptkontakt_pflicht` lokal.
- Vier fast gleiche Kaderrollen-Typen nebeneinander: `KaderRolle` (`types.ts`), `KaderRolleDb` (`roleUtils`), `KaderRolleOption` (`useMemberMeta`), `RolleOption` (`RollenAuswahlListe`).

Behoben in der TS-Migration (Session 18): das nicht importierte `supabase` in `clubcampus` (ReferenceError statt Login-Screen, sobald die Env-Variablen fehlten), das undefinierte `vereinId` an `ProfileView`, sowie das Phantomfeld `geprueft` in `MemberHero` und `InfoTab` (Datenprüfungs-Status stand konstant auf „offen"/„Ausstehend").

Behoben mit der SQL-Migration vom 26.07.2026 + Typ-Regenerierung: `mitglieder.eintrittsdatum`, `elternkontakte.supporter` und `benutzer.vorname/nachname/telefon` sind jetzt echte Spalten. `database.types.ts` wurde neu generiert; die früheren Bridge-/Extension-Typen in `types.ts` (Elternkontakt-`supporter`, DbUser-`vorname/nachname/telefon`, Mitglied-`eintrittsdatum`) sind entfernt. Damit greifen die früher stillen Schreibpfade (u. a. die Supporter-Logik beim Entknüpfen des letzten Kindes).

Behoben beim Abschluss der Modul-Migration (Sport-Module):
- **Acht tote `verein_id`-Schreibpfade** — die DB lehnt Zeilen ohne `verein_id` still ab (siehe verein_id-Regel oben): `KaderModul` (Kader-Upsert), `TrainingsplanModul` (`trainingsplaetze`, `trainings`, `trainingsplan_vorlagen`/`_slots`/`_ausnahmen`), `TeamsVerwaltungModul` (`teams`-Insert via `toDbData`, `team_module`-Upsert). `vereinId` wird jetzt via Prop durchgereicht (clubcampus → TeamView/TeamsVerwaltung → Modul), Guards ergänzt.
- **`TrainingsplanModul`**: der Slot-Upsert schrieb in die nicht existierende Spalte `end_haelfte` statt `end_half` → der ganze Slot-Upsert scheiterte, `end_half` wurde nie persistiert.
- **`TrainingsplanModul` / `TermineModul`**: KW-Berechnung rechnete `Date − Date` statt `getTime() − getTime()`.
- **`TermineModul`**: `toggleCancel` referenzierte das nicht existierende `week_nrAusnahmen` (statt `kwAusnahmen`) → ReferenceError beim Absagen eines Trainings (folgenlos nur, weil `ATT_EVENTS`/`window.storage` im Demo leer liefen).
- **`TeamModul`**: `parseEvDate` war gar nicht definiert (nur lokal in `TermineModul`) und `EventsList` las die nirgends definierten `kannVerwalten`/`meineTeams` → latente ReferenceErrors, bislang folgenlos weil `ATT_EVENTS` leer ist bzw. der Code-Pfad tot war. Helper ergänzt bzw. als Props geführt.
- **`DashboardModul`**: Eltern-Dashboard warf `ReferenceError` durch undefinierte `kannSchreiben`/`kannVerwalten`/`isTrainer`/`isAdmin`.
- **`TeamsVerwaltungModul`**: der exportierte, aber nirgends gerenderte `TeamsAdminView` las `navToTeam`/`onNavToTeamDone`, die nicht in seiner Prop-Liste standen.
- Diverse zur Laufzeit wirkungslose Props (nicht durchgereicht/gespreadet) bereinigt: `mb`/`title`/`className` auf `Row`/`Btn`/`PersonPicker`, tote `window.storage`-/`ROLLE_MAP`-Reste.
