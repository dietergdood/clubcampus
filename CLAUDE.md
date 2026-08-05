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

Stand 04.08.2026: 254 grün, 2 skipped, 0 rot (18 Testdateien).

**`npm run typecheck` braucht vollständige `node_modules`.** `tsconfig.json` setzt `"types": ["node", "vite/client"]`. Sobald `types` gesetzt ist, gilt **nur noch**, was dort steht — alle anderen `@types/*` werden nicht mehr automatisch geladen. Beide Einträge sind deshalb Pflicht: `node` für Tests, die den Quelltext lesen (`icons.test.ts`), `vite/client` für `import.meta.env` (ohne den Eintrag verschwindet `import.meta.env.DEV` aus dem Typsystem und der Build bricht an Stellen, die es lesen). Fehlt `@types/node` in `node_modules`, meldet `tsc` `error TS2688: Cannot find type definition file for 'node'` — das ist ein Installationsloch, kein Codefehler; `npm install` behebt es.

> **`npm install` auf Windows verändert `package-lock.json`.** Es entfernt die plattformfremden esbuild-Binärpakete (`@esbuild/linux-x64`, `darwin-arm64`, …) aus dem Lockfile — zuletzt 27 Einträge. Deployment läuft auf Vercel/Linux und braucht genau die. Die Änderung **nicht** committen (`git checkout -- package-lock.json`), oder gleich `npm ci` benutzen: das installiert aus dem Lockfile, ohne es zu schreiben.

**Häufigste Testfalle:** Die Tests mocken `theme.ts` mit einer Factory, die die benötigten Exporte einzeln auflistet. Nutzt eine Komponente eine weitere Komponente aus `theme.ts`, wirft Vitest bereits bei der blossen Referenz (`No "X" export is defined on the mock`) — und zwar für die ganze Testdatei, nicht nur den betroffenen Fall. Wer einen Import in einer getesteten Komponente ergänzt, ergänzt den Mock mit.

**Env-Variablen** (`.env`, gitignored) sind Pflicht — ohne sie bleibt `supabaseClient` `null` und die App zeigt nur den Login-Screen:

```
VITE_SUPABASE_URL=…
VITE_SUPABASE_ANON_KEY=…
```

## Architektur — Gesamtbild

**Kein Router.** `src/clubcampus.tsx` (`Portal`) ist Root-Komponente, Datenlader und Router in einem. Das Pfadsegment wird davon nicht berührt — es wählt nur den Verein (siehe Slug-Routing unten), die Navigation innerhalb der App läuft weiterhin über den Hash:

- `active` (String-Key) steuert die Ansicht über einen `switch` in `getView()`; persistiert in `window.location.hash` + `sessionStorage`, `popstate` für Browser-Zurück. Sub-Navigation (z.B. Team-Detail) registriert einen `customBack`-Callback.
- Alle App-Daten (`dbUser`, `dbTeams`, `dbMitglieder`, `dbStufen`, `dbMitgliedtypen`, `dbPortalRollen`, `dbKaderRollen`, `dbFunktionen`, `tenant`) werden nach Login in `Portal` geladen und per **Prop-Drilling** in die Module gereicht — inklusive des Supabase-Clients `sb`.
- Ladefunktionen liegen in `src/domains/app/useAppData.js` (`loadDbMitglieder` reichert Mitglieder z.B. mit `kader_eintraege`, `hat_benutzer`, `benutzer_deaktiviert` an). `useDbUser` leitet zusätzlich aus `kader.rollen` die höchste Portalrolle ab und **schreibt sie in `benutzer.role` zurück**.
- Module importieren sich nie gegenseitig. Wo ein Modul ein anderes rendern muss, übergibt `Portal` es als Prop (`TeamViewComponent`, `KaderModulComponent`, …).

**Mandantenfähigkeit.** Alle Vereine teilen eine Supabase-DB; Trennung über `verein_id` + RLS. Jede neue Tabelle braucht zwingend `verein_id`, Index, RLS und Policies; jedes `insert()` braucht `verein_id: tenant.id`. DB-Helper: `get_my_verein_id()`, `get_my_role()`, `is_admin()`, `is_trainer()`. Policy-Vorlagen: `ARCHITECTURE.md` → Datenbankregeln.

**Slug-Routing** (Session 21). Der Verein kommt aus dem ersten Pfadsegment: `/fcherrliberg` → `slug = "fcherrliberg"`. `getSlugFromPath()` in `src/App.tsx` liest ihn und reicht ihn als Prop an `Portal` → `useAppData({sb, slug, …})`. `loadTenant()` lädt damit gezielt über `.eq("slug", slug).single()`; Quelle ist die Spalte `vereine.slug` (mit `UNIQUE`-Constraint `vereine_slug_unique`).

**Ohne Slug wird kein Verein geraten.** Früher lief hier ein `.single()` ohne Filter — das lag nur zufällig richtig, solange genau ein Verein in der DB stand, und hätte ab dem zweiten einen beliebigen geliefert, samt fremdem Branding und fremder `verein_id` in jedem folgenden `insert()`. Stattdessen setzt `loadTenant()` jetzt eine Meldung über den Fehler-Screen in `clubcampus.tsx` (dafür nimmt `useAppData` ein `setError` entgegen); ein unbekannter Slug bekommt eine eigene Meldung.

`vercel.json` erledigt zwei Dinge: alle Pfade werden auf `/index.html` umgeschrieben, damit ein Deep-Link wie `/fcherrliberg/…` nicht im 404 landet, und die blosse Wurzel wird auf `/fcherrliberg` umgeleitet, damit alte Lesezeichen ohne Slug nicht in die Meldung laufen. Der Redirect ist bewusst `permanent: false` (307): ein 308 würde dauerhaft im Browser gecacht und wäre kaum zurückzudrehen, sobald dieses Deployment mehr als einen Verein bedient. `redirects` laufen bei Vercel vor `rewrites`. **Lokal greift der Redirect nicht** — `vite dev` liest `vercel.json` nicht, dort landet `/` weiterhin in der Meldung.

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
- `src/theme.ts` — **Barrel-Datei**, die fast alles aus `shared/` re-exportiert (`Btn`, `Card`, `Modal`, `Toolbar`, `InlineField`, `useConfirm`, `COMPONENT_REGISTRY`, …). Neue Komponenten als eigene Datei unter `shared/` anlegen **und** in `theme.ts` re-exportieren; Module importieren aus `theme.ts`.
- `src/styles/cc.css` — das komplette Design-System als `cc-*`-Klassen (eingebunden über `styles/index.css`).
- `src/constants.ts` — Design-Tokens (`FONT`, `TEXT`, `SPACE`, `RADIUS`, Farben). Module erben nichts implizit: fehlende Konstanten explizit importieren.

### Listen: ListView

Jede tabellarische Liste läuft über `shared/list/ListView.tsx` (State/Logik in `useListView.ts`): Suche, Filter, Mehrfach-Gruppierung, Spaltenauswahl mit Drag&Drop, Stufensortierung, Bulk-Aktionen, gespeicherte Ansichten (`mitglieder_ansichten`, teilbar via `geteilt`), Export über `exportUtils.ts`. Nicht neu bauen — `colDefs`, `filterDefs`, `groupOptions`, `renderCell` übergeben.

`Toolbar.tsx` hält nur noch Buttons und Öffnen/Schliessen-State; die Panel-Inhalte liegen daneben und bedienen Desktop wie Mobile über ein `mobile`-Flag: `SortPanel`, `GroupPanel`, `FilterPanel`, `FilterChips`, `MoreMenu`, `MoreSheet`. `MoreSheet` bekommt die drei Panels als fertig gerenderte Slots (`panels={{filter,sort,group}}`) und weiss dadurch nichts über Filter, Sortierung oder Gruppierung.

**Stufensortierung** (Session 21). `sortDefs: SortDef[]` statt `sortCol`/`sortDir` — beide bleiben als abgeleitete Werte erhalten. Desktop: Klick sortiert einstufig, Shift+Klick hängt eine Ebene an. Mobile: eigenes Panel im Bottom Sheet, Reihenfolge über ↑/↓ (HTML5-`draggable` greift auf Touch nicht). Der Kern steht in `sortUtils.ts`: `Array.prototype.sort` ist stabil, deshalb ergibt das Anwenden der Ebenen **von hinten nach vorne** die mehrstufige Ordnung — die modulspezifische `sortFn` behält ihren einstufigen Vertrag `(rows, key, dir)` und muss für neue Ebenen nicht angefasst werden. Persistiert in `mitglieder_ansichten.sortierung` (jsonb, `[{key,dir}, …]`); Ansichten mit `null` fallen auf die Ausgangssortierung zurück.

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
- Kein `window.confirm` → `useConfirm` aus `theme.ts`.
- Kein Inline-CSS, wenn eine `cc-*`-Klasse existiert. Neue CSS-Klassen nur mit `cc-`-Prefix in `cc.css` — und laut `ARCHITECTURE.md` nur nach Rücksprache mit Dieter. **Zwei Prüfungen vorher, in dieser Reihenfolge** — siehe unten.
- Saison nie hardcoden → `currentSeason()` aus `domains/season/seasonUtils.ts`.
- Rollenableitung nie duplizieren → `ableitRolle()` / `ROLLE_PRIORITAET` aus `domains/roles/roleUtils.ts`.
- **Verengungen als `Pick<Basistyp, "feld">`**, nicht als eigenes Interface. Ein handgeschriebenes Interface mit denselben Feldern läuft still auseinander, sobald der Basistyp sich ändert. Der Name muss den Inhalt tragen: `KaderRolleMitLabel` sagt, was drin ist — `RolleOption` sagt es nicht. (Die vier fast gleichen Kaderrollen-Typen unter „Bekannte Defekte" sind genau dieser Fehler, viermal.)
- **`verein_id` bei Service-Inserts als eigener Pflichtparameter**, nicht als optionales Feld im Objekt: `insertMitglied(sb, fields, vereinId)`, wobei `fields` den Typ `Omit<TablesInsert<"mitglieder">, "verein_id">` hat. Als Objektfeld ist es vergessbar, und die DB lehnt die Zeile dann still ab (siehe verein_id-Regel oben). Als Parameter kann der Compiler es erzwingen. So gebaut: `insertMitglied`, `insertAnsicht`, `insertNotiz`, `insertElternkontakt`.
- Neue UI-Komponenten in `COMPONENT_REGISTRY` (`src/shared/componentRegistry.js`) eintragen — daraus generiert sich der Design-System-Tab in der Portalverwaltung.
- Nach dem Auslagern einer Komponente: alle Props gegen den Parent prüfen und Factory-Funktionen (`makeXxx`) auf `return` kontrollieren — der Build findet fehlende Runtime-Props nicht.

### Bevor eine neue CSS-Klasse entsteht

Zwei Prüfungen, in dieser Reihenfolge. Beide Fehler sind am 04.08.2026 an einem Tag passiert.

**1. Nach dem Muster suchen, nicht nach dem Namen.** Die Frage ist nicht „gibt es `cc-section-label`?", sondern „stellt das Portal irgendwo schon dasselbe dar?". Konkret: eine Abschnittsüberschrift wurde als `cc-section-label` neu erfunden, obwohl `cc-section-title` seit langem existiert und an einem Dutzend Stellen benutzt wird (`InfoTab`, `VerlaufTab`, `KaderRollenTab`, `MitgliederKonfigTab`, `ElternKinderSektion`, `ElternPortalSection`). Ergebnis: zwei Klassen für dasselbe, die auseinanderdriften. Also erst im Code nach der Darstellung suchen — `grep -rn "cc-section" src --include=*.tsx` —, dann entscheiden.

**2. Erst dann prüfen, ob der Name frei ist:**

```bash
grep -n "^\.cc-<name>{" src/styles/cc.css
```

CSS hat keine Kollisionswarnung: ist der Name schon vergeben, **überschreibt die spätere Definition die frühere lautlos**. Kein Fehler, kein Hinweis im Build — nur ein Element, das anderswo plötzlich anders aussieht. Der Bug erscheint dann an einer Stelle, die niemand angefasst hat.

## Datenbank-Workflow

`supabase/schema.sql` ist der Schema-Dump (Tabellen, Policies, RLS, Funktionen — keine Nutzdaten) und beim Nachschlagen von Spalten/Policies die verlässlichste Quelle. Nach DB-Änderungen neu dumpen und committen — das Projekt ist verlinkt, es genügt:

```bash
npx supabase db dump --linked -f supabase/schema.sql
```

Der Dump ersetzt die Datei komplett. Vorher gegenprüfen, dass er nichts verliert: Zahl der `CREATE TABLE`, `CREATE POLICY`, `CREATE INDEX` und `ADD CONSTRAINT` gegen die alte Fassung vergleichen — ein abgebrochener Dump fällt sonst erst auf, wenn jemand das Schema nachbaut.

> **Die Zählprüfung hat zwei blinde Flecken.** Sie zählt nur Objekte in `public`, und genau zwei wichtige Dinge liegen woanders — beide fallen durch jede Zählung, weil sie in *keiner* der vier Kategorien vorkommen:
> - `ALTER PUBLICATION "supabase_realtime" ADD TABLE …` für `nachrichten` und `nachrichten_antworten`. Die Publication ist global, nicht schemagebunden. Ohne diese Zeilen bekommt ein nachgebautes Portal keine Live-Nachrichten — und weil nichts fehlschlägt, merkt es niemand.
> - Die Trigger auf `auth.users` (`on_auth_user_created`, `on_auth_user_login`). Sie stehen in **keinem** `public`-Dump; `schema.sql` enthält nur die Funktionen `handle_new_user`/`handle_user_login`, ohne jeden Aufrufer. Deshalb liegen sie separat in **`supabase/auth_triggers.sql`** und müssen nach `schema.sql` eingespielt werden — sonst kann sich nach einem Nachbau niemand registrieren.
>
> Beim regulären `supabase db dump --linked` sind die `ALTER PUBLICATION` enthalten; ein `pg_dump --schema=public` verliert sie. Die auth-Trigger fehlen in beiden Fällen. Wird der Dump länger nicht gepflegt, läuft er auseinander: am 27.07.2026 fehlten ihm `elternkontakte.profil_geprueft_at`, `vereine.slug` samt `vereine_slug_unique` und die Funktion `check_email_bekannt()` — alle drei erst durch eine Regenerierung von `database.types.ts` aufgefallen. Edge Function `supabase/functions/invite-user` versendet Einladungs-Mails über die Auth-Admin-API.

**`supabase/schema.sql` deckt nur das Schema `public` ab.** Zwei Dinge stehen deshalb nicht darin und gehen beim Nachbauen verloren, wenn man sie nicht kennt:

- **Trigger auf `auth.users`** → `supabase/auth_triggers.sql`. Dort liegen `on_auth_user_created` (ruft `handle_new_user`) und `on_auth_user_login` (ruft `handle_user_login`). In `schema.sql` stehen nur die Funktionen, ohne jeden Aufrufer — ohne diese Datei kann sich nach einem Nachbau niemand registrieren. Nach `schema.sql` einspielen.
- **Extensions und die Realtime-Publication.** `CREATE EXTENSION` liegt in den Schemas `extensions`/`vault`, `ALTER PUBLICATION "supabase_realtime" ADD TABLE …` (für `nachrichten` und `nachrichten_antworten`) ist global. `supabase db dump` nimmt beides mit, ein blosses `pg_dump --schema=public` **nicht** — wer ohne Docker dumpt, verliert diese sieben Zeilen still und damit die Live-Zustellung der Nachrichten.

Ohne Docker (z.B. wenn Docker Desktop nicht läuft) geht ein Dump auch direkt über den Session-Pooler mit lokalem `pg_dump`; die Verbindungsdaten stehen in `supabase/.temp/pooler-url`. Das Ergebnis ist dann aber um die oben genannten sieben Zeilen ärmer und in der Schreibweise abweichend (kein `IF NOT EXISTS`/`OR REPLACE`) — als Ersatz für den regulären Dump nur mit Gegenprüfung verwenden.

## Weitere Dokumente

- `ARCHITECTURE.md` — Regeln, Checklisten, das **Personen-Modell** (Anlass, Zielstruktur, Zuordnungsentscheidungen, sechs Etappen), Datenbankregeln, Session-Historie. Ordnerstruktur und Regeln sind am 04.08.2026 auf den Ist-Stand gebracht worden. Die **Session-Abschnitte ab „Session 17" sind Archiv**: sie beschreiben Stände von damals (noch `.jsx`, `theme.jsx` als Design-System) und werden bewusst nicht rückwirkend korrigiert. Bei Widerspruch gilt der Code.
- `ELTERN_LOGIK.md` — n:m-Modell `elternkontakte`/`eltern_kinder` und die Entknüpfungs-/Supporter-Logik (teilweise noch nicht implementiert). **Wird vom Personen-Umbau abgelöst** — siehe `ARCHITECTURE.md` → Personen-Modell.
- `supabase/etappe1_personen.sql` — Etappe 1 des Personen-Umbaus, blockweise ausführbar. Die Blockfolge ist absichtlich **nicht** alphabetisch (A → D → B → C): `LANGUAGE sql`-Funktionen werden bei `CREATE` validiert, und die Funktionen aus B greifen auf `person_id` zu, das erst D anlegt.
- `supabase/etappe2a_merge.sql` — Etappe 2a (Merge über E-Mail-Gleichheit), ausgeführt am 05.08.2026. Reihenfolge `0 → A → B → C → D`; Block C schreibt und löscht, ein Rückbau wie in Etappe 1 ist **nicht** möglich. Enthält die Sperrabfrage 2a-0, die vor jedem künftigen Merge (Fairgate-Import) erneut leer sein muss.
- `supabase/auth_triggers.sql` — die zwei Trigger auf `auth.users`, die in keinem `public`-Dump stehen.
- `README.md` — Produktüberblick, Rollen, Einrichtung eines neuen Vereins.

## Bekannte Defekte

- `Mitgliedtyp` in `types.ts` bildet `mitgliedtypen` nur teilweise ab — es fehlen `id`, `hauptkontakt_pflicht`, `standard_rolle` und `beitragsinfo`. `MitgliederModul` ergänzt `hauptkontakt_pflicht` lokal.
- Vier fast gleiche Kaderrollen-Typen nebeneinander: `KaderRolle` (`types.ts`), `KaderRolleDb` (`roleUtils`), `KaderRolleOption` (`useMemberMeta`), `RolleOption` (`RollenAuswahlListe`).
- **Mitglied anlegen prüft nicht auf Dubletten.** `NeuesMitgliedModal` → `insertMitglied()` schreibt ohne Abgleich gegen den Bestand; zweimal abgeschickt heisst zweimal in der Datenbank. Nachweis: zwei Zeilen „Test User" <test@fch-test.ch>, angelegt am 26.07.2026 fünf Sekunden auseinander, in Etappe 2a entfernt. Der Unique-Index `personen_email_pro_verein` fängt das **noch nicht** ab — die App schreibt nach `mitglieder`, nicht nach `personen`. Erst ab Etappe 3, wenn der Schreibpfad über die Person läuft, greift er. Dann muss der Service zusätzlich den Postgres-Fehlercode `23505` abfangen und in „Diese E-Mail ist bereits vergeben" übersetzen; roh durchgereicht landet er höchstens in einer `saveMsg` und der Benutzer sieht nichts. Bis dahin bleibt ein Doppelklick-Schutz im Formular offen.

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
