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
npm run check:selects      # Spalten in select()-Strings gegen database.types.ts

npx vitest run src/modules/members/__tests__/memberFilter.test.js   # eine Datei
npx vitest run -t "filtert nach Team"                               # ein Testfall
```

ESLint ist konfiguriert (`eslint.config.js`, Flat Config; `npm run lint`, blockt in CI nur bei error-Level: `react-hooks/rules-of-hooks` + `import/no-restricted-paths`).

> **⚠ Die 758 Warnungen sind selbst der Defekt.** Nicht weil Warnungen
> schlimm wären, sondern weil echte Funde darin untergehen. Beleg vom
> 20.08.2026: `getProfilFehlend` und `markiereProfilGeprueft` stehen seit
> Monaten als `is assigned a value but never used` in der Ausgabe — genau der
> tote Zweig der Datenprüfung, den eine eigene Analyse mühsam wieder gefunden
> hat. Die Meldung war die ganze Zeit da, nur nicht zu sehen.
>
> Ein ungenutzter Rückgabewert ist fast immer eine Absicht, die nie
> angeschlossen wurde. Wer die Liste einmal aufräumt, findet damit vermutlich
> weitere. Tests (vitest + Testing Library, jsdom, Setup in `src/test-setup.js`) liegen an zwei Orten: **Komponenten-Tests** unter `src/modules/members/__tests__/`, **Service-/Domain-Tests** co-lokalisiert unter `src/domains/members/__tests__/` (mit dem Mock-Supabase-Helfer `_mockSb.ts`). Service-Tests sind `.test.ts` und werden von `tsc` strict typgeprüft; Komponenten-Tests bleiben `.jsx` (via `checkJs:false` nicht typgeprüft).

Stand 20.08.2026 (Supporter-Rückbau Teil A): 530 grün, 2 skipped, 0 rot (35 Testdateien).

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
- **Ein Test, der nur Längen zählt, überlebt eine leere Konfiguration — Erwartungen nennen Feldnamen.** `expect(fehlend).toHaveLength(2)` besteht auch dann, wenn die zwei aus einem ganz anderen Grund entstehen. `expect(fehlend).toEqual(["Nachname", "Telefon"])` nicht.

  Beleg vom 21.08.2026: `mitgliedtyp_feldkonfig` bekam die Spalte `gilt_fuer`, und drei Testdateien führten Attrappen **ohne** dieses Feld. Zur Laufzeit ist es dann `undefined`, der Filter `z.gilt_fuer !== ziel.gilt_fuer` trifft, und **jede Zeile wird übersprungen** — die Konfiguration war leer, die Prüfung damit gegenstandslos. Rot geworden sind die Tests **allein deshalb**, weil ihre Erwartungen die Feldnamen nennen; mit `toHaveLength` wären alle drei Dateien grün geblieben und hätten ab da nichts mehr geprüft.

  Dasselbe gilt für den umgekehrten Fall: wer eine Attrappe um ein Pflichtfeld erweitert, prüft, ob die Testzahl steigt (`npx vitest list | sed 's/ > .*//' | sort | uniq -c`). Eine Attrappe ist Produktionscode für den Test — fehlt ihr eine Spalte, prüft er etwas anderes als das, was läuft.
  **⚠ Eine Attrappe kennt kein Schema — und der Fehler geht in beide Richtungen.**

  | | Beispiel | Folge |
  |---|---|---|
  | Ihr **fehlt** ein Feld, das es gibt | `gilt_fuer` (21.08.2026) | der Filter trifft, jede Zeile wird übersprungen — die Konfiguration ist leer |
  | Sie **nimmt** eines an, das es nicht mehr gibt | `vorname` in `mitglieder` (seit Etappe 6a) | der Test prüft einen Schreibpfad, der in der Datenbank einen Laufzeitfehler ergäbe |

  **Beide Male prüft der Test etwas anderes als das, was läuft. Und beide Male ist er grün.** Der zweite Fall stand ein halbes Jahr unbemerkt in `memberService.errors.test.ts` und schrieb den Altspalten-Ausweichpfad fest, den es längst nicht mehr gab.

  **Woran man es merkt — zwei Dinge:**

  1. **Erwartungen nennen Feldnamen statt Längen zu zählen** (siehe oben). Nur deshalb sind die `gilt_fuer`-Fälle rot geworden.
  2. **Wo eine Attrappe eine Tabellenzeile nachbildet, gehört ihr Typ aus `database.types.ts`** — nicht von Hand gepflegt:

     ```ts
     import type { Tables } from "../../../types.ts";
     const zeile: Partial<Tables<"mitglieder">> = { vorname: "Neu" };
     //                                            ^^^^^^^ TS2353 — gibt es nicht
     ```

     Für Fassadenzeilen (`flacheZeile()` mischt `personen`-Felder auf `mitglieder`) gibt es `Mitglied` aus `types.ts`, das genau diese Mischung beschreibt.

  **Wo es nicht geht, und warum:** die `results`-Map von `makeSb()` ist absichtlich `{ data?: any }`. Sie muss Join-Formen, `count`-Antworten und `PostgrestError` gleichermassen annehmen — ein Tabellentyp träfe darauf nicht zu. Ebenso ist `CallRecord.payload` untypisiert, weshalb `expect(rec.payload)` nichts erzwingt. **Die Prüfung greift also nur dort, wo der Test die Zeile selbst als Variable anlegt und annotiert.** Das ist der Ort, an dem die erfundene Spalte entsteht — für den Rest bleibt es beim Hinsehen.


- **Wo ein Text einen Ort nennt, gehört ein Test dazu, der den Ort kennt.**

  `PortalTab` sagte bis zum 21.08.2026: *„Keine E-Mail-Adresse hinterlegt. Bitte zuerst eine E-Mail im **Kontakt-Tab** erfassen."* Einen Kontakt-Tab gibt es nicht — die Tabs heissen Profil, Eltern, Statistik, Portal-Zugang, Datenprüfung und Verlauf; die Kontaktfelder stehen im Profil.

  **Eine Anleitung, die auf einen Ort zeigt, den es nicht gibt, trifft genau die Nutzer, die sie brauchen.** Wer den Satz zu sehen bekommt, ist der, dem die E-Mail fehlt — also der, der Hilfe sucht. Wer sie nicht braucht, liest ihn nie und meldet ihn deshalb auch nicht.

  Der Text ist Teil dessen, was ein Test absichern kann:

  ```jsx
  expect(screen.getByText(/im Profil erfassen/)).toBeTruthy();
  expect(screen.queryByText(/Kontakt-Tab/)).toBeNull();   // ← die zweite Hälfte
  ```

  Die zweite Zeile ist die wichtigere: sie hält fest, dass der falsche Ort **nicht** zurückkommt. Dasselbe gilt für Beschriftungen, auf die sich ein Ablauf beruft — „Mitgliedschaft löschen" ist aus demselben Grund in `mitgliederBulk.test.jsx` festgehalten.

- **Zwei Zustände für EINEN Schlüssel sind ehrlich. Zwei Zustände für eine SAMMLUNG sind es nicht.**

  Ein Schiebeschalter hat zwei Stellungen. Eine Sammlung hat drei Tatsachen: alles an · **gemischt** · alles aus. Wer sie über `some(...)` auf zwei abbildet, malt „gemischt" wie „alles an" — und bei mehr als zwei Elementen ist gemischt der Normalfall, der Schalter steht also meistens falsch.

  Befund vom 21.08.2026: der Bereichskopf in `MitgliedtypFelderSektion` trug denselben `AnAusSchalter` wie eine einzelne Zeile, aber für bis zu sechs Felder. Er stand auf „aus", während die Felder darunter bedienbar waren — **und beides war richtig**: er meinte „gerade ist nichts sichtbar", nicht „gesperrt". Nur sagte die Bildsprache das Gegenteil, denn ein Schiebeschalter ist die Darstellung eines RIEGELS.

  ⚠ **Ein dreiwertiger Schalter wäre die falsche Reparatur.** „Gemischt" ist kein Wert, den man *setzen* kann, nur einer, den man anzeigt. Die Lösung ist, aus dem Zustand eine **Handlung** zu machen: ein Knopf „Alle ausblenden" beschreibt, was er tut, und kann nichts Falsches behaupten.

  An einer einzelnen Zeile bleibt der Schiebeschalter richtig — ein Schlüssel, zwei Zustände. Die Grenze verläuft bei der Anzahl, nicht beim Ort.

- **Eine Komponente, die INNERHALB einer anderen deklariert wird, wird bei jedem Render neu erzeugt** — React hängt den Teilbaum ab und neu an. Zustand, Fokus und Auswahlposition gehen verloren.

  **Es fällt nirgends als Fehler auf.** Kein Build, kein Typecheck, keine Konsole; nur eine Bedienung, die sich falsch anfühlt, und die niemand meldet. In `PortalTab` verlor das `<select>` der Portalrolle bei jedem Tastendruck den Fokus — **gefunden hat es ein Test**, der genau deshalb seit Monaten auf `it.skip` stand: nach `fireEvent.change` war das `<select>` ein anderer DOM-Knoten.

  ⚠ **Nach dem Herausziehen liefen BEIDE übersprungenen Fälle UNVERÄNDERT grün.** Keine Zeile angepasst. Der Test hatte recht, die Komponente war falsch — er hielt `select` in einer Variablen fest und feuerte `keyDown` darauf, und dieser Knoten war zu dem Zeitpunkt bereits abgehängt.

  **Daraus die Regel: wer einen roten Test anpasst, bis er grün ist, löscht die Meldung statt den Fehler.** Ein Test, der auf `skip` gesetzt wird, tut dasselbe — nur langsamer. Rot ist ein Zustand für Stunden, nicht für Wochen; für einen Skip gilt dasselbe.

  Bekannte Fundstellen am 21.08.2026 (nur `RolleField` ist behoben):

  | Stelle | Art |
  |---|---|
  | `PortalTab` → `RolleField` | ✅ herausgezogen — hielt einen fokussierten `<select>` |
  | `MitgliedtypFelderSektion` → `ModusSchalter`, `AnAusSchalter`, `Zeile` | Schalter; Fokusverlust für Tastaturbedienung |
  | `TrainingsplanModul` → `Btn2` | Knopf; geringste Wirkung |

  `SortPanel` → `Suchfeld` ist **kein** Fall: es ist ein JSX-Wert, kein Komponententyp, und wird nicht neu montiert.

- **Zwei Anzeigen derselben Sache sind auch eine Gegenprobe — wer sie zusammenführt, verliert sie.**

  Am 21.08.2026 zeigte die Profilseite eines archivierten Juniorenmitglieds gleichzeitig **„Ohne Mitgliedschaft"** (neuer Chip) und **„Juniorenmitglied"** (Mitgliedtyp-Chip). Ursache war ein `as never` am Archiv-Einstieg, das `mitgliedId` weggelassen hatte; die Seite las das Fehlen als „keine Mitgliedschaft" und schaltete alle zehn `nur_mitgliedschaft`-Schlüssel ab: Eltern-, Statistik- und Verlauf-Tab, Teams-Karte, Notizen und die ganze Vereinsdaten-Karte.

  **Gemeldet hat den Fehler die Uneinigkeit**, nicht das Fehlen. `heroChips()` las `raw.mitgliedtyp` direkt, die Kachel las die Konfiguration — zwei Quellen, und deshalb ein sichtbarer Widerspruch. **Ein fehlender Tab fällt erst auf, wenn jemand ihn sucht; ein Widerspruch im Kopf fällt sofort auf.**

  Beide auf dieselbe Quelle zu legen ist trotzdem richtig — eine Anzeige, die einer anderen widerspricht, ist kein Prüfmittel, sondern ein Fehler mit Zusatznutzen. **Aber der Verlust gehört benannt:** danach gibt es diese Warnung nicht mehr, und was übrig bleibt, ist ein Zustand, der still falsch sein kann. Wer zwei Anzeigen zusammenlegt, ersetzt die verlorene Gegenprobe durch einen Test.

  Hier: `MemberHero` bekommt seither `konfig` und liest `mitgliedtyp` durch `istSichtbar()` — dazu zwei Fälle in `memberDetail.test.jsx`, die festhalten, dass ein Mitglied über **jeden** Einstieg ein Mitglied bleibt.

- **Ein Werkzeug, das nach Text sucht, trifft was gleich AUSSIEHT, nicht was gleich GEMEINT ist.** `.eq("mitglied_id", …)` steht in `memberService.ts` achtmal und meint achtmal etwas anderes: Notizen, Kader, Team-Details, Anwesenheiten, das Konto. Wer ersetzt, **nennt vorher die Zielfunktion** und **liest hinterher jeden Treffer der Datei einzeln gegen** — auch die, die er nicht angefasst zu haben glaubt.

  Beleg vom 21.08.2026: eine Ersetzung sollte `fetchBenutzerFuerMitglied` auf `person_id` umstellen und traf die **erste** Fundstelle der Datei — `fetchNotizen`. Aus `.eq("mitglied_id", mitgliedId)` wurde dort `.eq("person_id", personId)`. `mitglieder_notizen.mitglied_id` ist `NOT NULL`; die Abfrage wäre **immer leer** zurückgekommen. Keine Notizen, kein Fehler — wieder ein Ausfall, der aussieht wie eine Datenlage.

  ⚠ **Was ihn gefangen hat, war ein Zufall der Benennung, keine Absicherung:** `personId` existierte in `fetchNotizen` gar nicht, also gab es einen Compilerfehler. **Hätte die Funktion beide Werte im Sichtfeld gehabt — etwa weil sie ohnehin eine `personId` führt —, wäre der Fehler kompiliert und stumm geblieben.** Auf den Compiler ist hier kein Verlass; er hat nur diesmal geholfen.

  Dieselbe Familie wie der Regex-Schnitt vom 19.08. (der die neu eingefügte Sektion mitnahm) und wie `` in deutschen Bezeichnern. Gemeinsames Merkmal: das Werkzeug kennt die Bedeutung nicht, und das Ergebnis sieht richtig aus.

- **`cat > datei` truncatet ohne Rückfrage — für Dateien, die es vielleicht schon gibt, das Write-Werkzeug nehmen.** Es verweigert das Überschreiben einer ungelesenen Datei; die Shell tut es wortlos.

  Am 20.08.2026 so passiert: `src/domains/app/__tests__/getProfilCheck.test.ts` existierte mit **13 Fällen** und wurde von einer neuen Fassung mit 12 ersetzt. Build grün, Typecheck grün, alle 38 Testdateien grün — **nichts hat gemeldet, dass dreizehn Prüfungen verschwunden sind.**

  Aufgefallen ist es allein daran, dass die **Gesamtzahl der Tests um eins sank, obwohl zwölf dazukamen**. Deshalb lohnt es, die Zahl nach jedem Zulauf gegen die Erwartung zu halten — genau wie die Zählprobe beim Schema-Dump. Zum Nachrechnen:

  ```bash
  npx vitest list | sed 's/ > .*//' | sort | uniq -c   # Fälle pro Datei
  ```

  Wiederherstellen ging über `git show HEAD:pfad`, weil die Datei eingecheckt war. Dieselbe Familie wie der Regex-Schnitt vom 19.08.2026: **erst nachsehen, was da liegt, dann schreiben.**

- **Wer eine Spalte anlegt, nennt im selben Auftrag die Stelle, die sie liest.** Gibt es die noch nicht, steht das ausdrücklich dabei — als offener Punkt mit Datum, nicht als stille Lücke.

  **Warum das teuer ist: nach aussen sieht es aus wie fehlende Daten, nicht wie fehlender Code.** Man sucht in der Datenbank, im Sync, beim Verband — nur nicht dort, wo es liegt. Eine Spalte, die niemand ausliest, ist von einer Spalte, die niemand befüllt, an der Oberfläche nicht zu unterscheiden; beide zeigen ein leeres Feld.

  **Drei Fälle am 20.08.2026, und das ist kein Zufall:**

  | Spalte | angelegt für | gelesen von |
  |---|---|---|
  | `spiele.sfv_spiel_nr` | die Spielnummer des Verbands | **niemandem** — `spielMapper` las nur `spiel_nr`. Die Rückfallregel stand im Kommentar von `migration_sfv_spielinfo.sql` |
  | `mitgliedtypen.zaehlt_als_mitgliedschaft` | die Listentrennung | **niemandem mehr**, seit der Supporter-Rückbau nach Tabelle trennt statt nach Merkmal |
  | `personen.profil_geprueft_at` + die Pflichtfeld-Matrix | der Datenprüfung | `getProfilFehlend()` **wird nie aufgerufen** (`clubcampus.tsx:465`) |

  Dazu als viertes `api_verbindungen.active`: gelesen, aber nur von der Oberfläche, während die Edge Function es ignoriert — sechs Tage grauer Stecker für einen Anschluss, der stündlich lief.

  Das gemeinsame Merkmal ist immer dasselbe: **es schlägt nichts fehl.** Kein Fehler im Build, keine Meldung im Log, kein roter Test. Deshalb hilft hier keine Prüfung, sondern nur die Frage beim Anlegen — *wer liest das?* Fällt die Antwort schwer, ist die Spalte entweder verfrüht oder der Auftrag unvollständig.

- **Nach jeder Strukturänderung gehören Dump UND Typen nachgezogen** — `npx supabase db dump --linked -f supabase/schema.sql` *und* `npm run gen:types`. Am 05.08.2026 fehlten in `database.types.ts` gleich drei Dinge aus vorherigen Etappen: die ganze Tabelle `personen`, `mitglieder.person_id` und die Fremdschlüsselbeziehung, ohne die PostgREST den Join nicht typisiert. Der Dump allein reicht nicht.
- **Was „Supporter" in diesem Verein heisst — und was er NICHT heisst.** Ein Supporter ist jemand, der dem Verein **verbunden bleibt**: ehemalige Spieler, Eltern nach dem Austritt des Kindes, Leute die mithelfen. **Nicht finanziell.** „Gönner" ist ein Sponsoring-Begriff und meint etwas anderes; wenn Sponsoring einmal ein Thema wird, ist es ein eigenes Modul und darf das Wort behalten.

  **Woher der Fehler kam:** Didi hat ihn am 22.08.2026 korrigiert, nachdem ich das Wort eine Woche lang benutzt hatte — 86 Fundstellen in 40 Dateien, in Kommentaren, Aufträgen, Migrationsköpfen und der Doku. ⚠ **Ein Begriff, den zwei Beteiligte verschieden verstehen, fällt in keiner Prüfkette auf.** Kein Test wird rot, kein Typ passt nicht, der Build läuft. Er zeigt sich erst in einer **Begründung, die danebenliegt** — und zwar an der Stelle, an der jemand sie das nächste Mal anwendet.

  **Und genau das war der Fund.** Vier Stellen trugen denselben Satz, in `ARCHITECTURE.md`, `roleUtils.ts`, `getPermissions.ts` und der Session-Doku:

  > *„Ein Passiv-, Ehren- oder Freimitglied ist Mitglied des Vereins mit Stimmrecht an der GV, ein Supporter ist **Gönner von aussen**."*

  Er begründete, warum die Portalrolle `mitglied` nicht durch `supporter` ersetzt wurde. **Die Entscheidung ist richtig, die Begründung war es nicht.** Richtig ist der Unterschied **Mitgliedschaft ↔ keine Mitgliedschaft** (Statuten Artikel 6, Stimmrecht). Falsch ist „von aussen": ein Supporter ist das Gegenteil eines Aussenstehenden.

  ⚠ **Die Gefahr lag in der Zukunft, nicht in der Vergangenheit.** Nachgeprüft: keine bestehende Entscheidung ist dadurch falsch geworden — `supporter` hat `helpers: 'schreiben'` wie ein Mitglied, und der Ausschluss von Statuten und GV-Papieren folgt aus der fehlenden Mitgliedschaft, nicht aus „aussen". **Aber ein Satz, der Supporter zu Aussenstehenden erklärt, hätte beim nächsten Mal begründet, sie aus Helferanfragen oder News herauszuhalten — und Mithelfen ist gerade das, was einen Supporter ausmacht.**

  **Zwei Stellen bleiben absichtlich:**

  | | |
  |---|---|
  | `CLAUDE.md`, die 17 verwaisten Matrix-Zeilen (`Gönner` 5) | ein protokollierter **Datenwert**, keine Bezeichnung — er stand so in der Tabelle. Ihn zu „berichtigen" hiesse, den Befund zu fälschen |
  | `HelferModul` (bis 22.08.2026) | dort war `"Gönner"` ein Schlüssel in einer Farbtabelle, der **nie traf** — den Wert gibt es in keiner Tabelle. Rest desselben Spaltenkopf-Defekts; jetzt `"Supporter"` |

  ⚠ **Und eine Falle beim Ersetzen selbst:** `supabase/schema.sql` ist **erzeugt**. Die Ersetzung traf ihn mit und machte aus „Goenner/Supporter" ein „Supporter/Supporter" — sinnlos und ausserdem wirkungslos, denn der Text lebt als `COMMENT ON COLUMN` in `pg_description`. Zurückgenommen mit `git checkout`; die Änderung gehört in eine Migration (`migration_begriff_supporter.sql`). **Wer einen Dump von Hand ändert, ändert nichts — und der nächste Dump nimmt es zurück.**

- **Chips im Profilkopf nie selbst zusammenbauen** → `heroChips()` aus `domains/roles/roleUtils.ts`. Die Regel unterscheidet Rolle (was jemand tut) von Mitgliedtyp (wie er eingestuft ist) und ist mit 13 Tests abgesichert.
- **Datenbereinigungen an Personenfeldern treffen `personen`, nicht `mitglieder`.** Die Fassade (`flacheZeile`) überschreibt jedes Feld aus `PERSON_FELDER` mit dem Wert der Person — die gleichnamige Spalte in `mitglieder` wird gar nicht mehr gelesen. Am 05.08.2026 selbst darauf reingefallen: Ein `update` auf `mitglieder.funktionen` sah in zwei Kontrollabfragen sauber aus und wirkte trotzdem nicht, weil die Liste `personen.funktionen` liest. Solange beide Spalten nebeneinander existieren (bis Etappe 6), gilt: erst `PERSON_FELDER` prüfen, dann die richtige Tabelle wählen.
- **`mitglieder.funktionen` enthält Vereinsfunktionen, keine Kaderrollen.** Am 05.08.2026 stand dort bei 487 Mitgliedern „Spieler" — `ableitRolle()` prüft nur `funktionen.length > 0` und machte damit jeden ohne Kadereintrag zum Funktionär. Wer dort schreibt, prüft zweimal.
- **Der Portal-Zugang hängt allein an `benutzer.mitglied_id`.** Das Kennzeichen `mitglieder.hat_portal_zugang` ist gestrichen — es war eine Kopie derselben Aussage und konnte veralten. Im Frontend kommt der Status aus `hat_benutzer` / `benutzer_deaktiviert`, die `useAppData` aus dem Join berechnet.
- **`position` und `rueckennr` stehen an der Kaderzeile**, nicht am Mitglied: derselbe Spieler kann in zwei Teams zwei Nummern haben.
- **Die Personenfelder gibt es in `mitglieder` nicht mehr** (seit 06a, 05.08.2026). Wer `select("id,vorname,…")` auf `mitglieder` schreibt, bekommt einen Laufzeitfehler — und ein `.order("nachname")` ebenso, was beim Bauen nicht auffällt.
- **Personendaten nie direkt aus `mitglieder` lesen oder schreiben** → `domains/person/personService.ts`. Lesen per Join (`select("*, personen(*)")`) und durch `flacheZeile()`; Schreiben durch `verteileFelder()`. `personen` ist die Wahrheit, die gleichnamigen Spalten in `mitglieder` sind seit Etappe 2b Altlast und verschwinden in Etappe 6.
- **Pflichtfelder nie selbst herleiten** → `getEffektivePflichtfelder()` aus `domains/members/pflichtfelder.ts`. Es gibt keine Rückfallliste: was in der Matrix steht, gilt. `vorname`/`nachname` stehen nicht darin (`IMMER_PFLICHT`), weil sie in `mitglieder` NOT NULL sind. Und: **ein Feld, das Pflicht sein kann, braucht ein Eingabefeld** — sonst blockiert die Prüfung ein Formular, das den Wert gar nicht erfassen kann.
- **Unique-/Primärschlüssel auf Vereinsdaten immer mit `verein_id`** — sonst nimmt der erste Verein dem zweiten den Namen weg (siehe `ARCHITECTURE.md` → Mandantenfähigkeit). Wird ein Schlüssel geändert, müssen die `onConflict`-Angaben der `upsert()`-Aufrufe mit.
- Kein `window.confirm` → `useConfirm` aus `theme.ts`.
- Kein Inline-CSS, wenn eine `cc-*`-Klasse existiert. Neue CSS-Klassen nur mit `cc-`-Prefix in `cc.css` — und laut `ARCHITECTURE.md` nur nach Rücksprache mit Dieter. **Zwei Prüfungen vorher, in dieser Reihenfolge** — siehe unten.
- Saison nie hardcoden → `currentSeason()` aus `domains/season/seasonUtils.ts`.
- Rollenableitung nie duplizieren → `ableitRolle()` / `ROLLE_PRIORITAET` aus `domains/roles/roleUtils.ts`.
- **Verengungen als `Pick<Basistyp, "feld">`**, nicht als eigenes Interface. Ein handgeschriebenes Interface mit denselben Feldern läuft still auseinander, sobald der Basistyp sich ändert. Der Name muss den Inhalt tragen: `KaderRolleMitLabel` sagt, was drin ist — `RolleOption` sagt es nicht. (Die vier fast gleichen Kaderrollen-Typen unter „Bekannte Defekte" sind genau dieser Fehler, viermal.)
- **`verein_id` bei Service-Inserts als eigener Pflichtparameter**, nicht als optionales Feld im Objekt: `insertMitglied(sb, fields, vereinId)`, wobei `fields` den Typ `Omit<TablesInsert<"mitglieder">, "verein_id">` hat. Als Objektfeld ist es vergessbar, und die DB lehnt die Zeile dann still ab (siehe verein_id-Regel oben). Als Parameter kann der Compiler es erzwingen. So gebaut: `insertMitglied`, `insertAnsicht`, `insertNotiz`, `insertElternkontakt`.
- **Modale schliessen nicht mehr beim Klick daneben, sobald etwas eingegeben wurde.** `ModalOrSheet` merkt sich das selbst über `input`/`change`-Ereignisse, die bis zum Container blubbern — kein Modal muss etwas melden, und bei einem neuen kann es niemand vergessen. Ein reines Anzeige-Modal löst nie ein solches Ereignis aus und schliesst weiterhin. `immerSchliessbar` hebt die Sperre auf, wird im Normalfall nicht gebraucht. **Escape folgt derselben Regel** und wirkt nur auf das oberste Modal — das Modul führt dafür einen Stapel, sonst gingen bei einem Modal im Modal beide zu.
- Neue UI-Komponenten in `COMPONENT_REGISTRY` (`src/shared/componentRegistry.js`) eintragen — daraus generiert sich der Design-System-Tab in der Portalverwaltung.
- Nach dem Auslagern einer Komponente: alle Props gegen den Parent prüfen und Factory-Funktionen (`makeXxx`) auf `return` kontrollieren — der Build findet fehlende Runtime-Props nicht.
- **Beim Entfernen eines Bereichs erst zeigen, was darin liegt, dann schneiden.** Wer per Regex oder Index von A bis B schneidet statt gezielt zu ersetzen, nimmt alles mit, was seit dem letzten Hinsehen dazugekommen ist. Am 19.08.2026 so passiert: beim Herausnehmen der zwei alten Pflichtfeld-Matrizen aus `MitgliederKonfigTab` lag die neu eingefügte `<MitgliedtypFelderSektion/>` mitten im Schnittbereich und verschwand mit. **Kein Werkzeug meldet das** — ein ungenutzter Import ist für TypeScript kein Fehler, `tsc`, Build und Tests liefen grün, und der Tab war im Deployment ohne beide Hälften. Bei jeder Entfernung deshalb den Schnittbereich vorher ausgeben und gegenlesen.
- **Ein leerer `catch` macht aus einem Fehler eine Datenlage.** Das ist der Grund, warum er so gefährlich ist: er bricht nichts ab und meldet nichts, sondern lässt den Code weiterlaufen, als wäre schlicht nichts da gewesen. Am 20.08.2026 hat ein `catch {}` in `sfv-sync/matchdatenLauf.ts` ein **`42P10` der eigenen Datenbank** verschluckt (der Ereignis-Upsert traf einen partiellen Index, den `ON CONFLICT` nicht ableiten kann). Nach aussen sah das aus wie „der Verband hat zu diesem Spiel keinen Verlauf erfasst" — und darauf ist eine Produktentscheidung gebaut worden, samt Text in der Oberfläche und einem Nachtrag im Auftrag. Die Regel:

  ```js
  } catch (e) {                       // ✓ binden, auch wenn nur gezählt wird
    erg.fehler += 1;
    erg.fehlermeldungen.push(`Spiel ${id}: ${e instanceof Error ? e.message : String(e)}`);
  }
  ```

  Leer bleiben darf er nur, wo das Scheitern **keine Aussage über die Daten** ist: `localStorage`/`sessionStorage` (Quota, privater Modus), `JSON.parse` eines gespeicherten Werts mit Rückfall, `history.pushState`. Dort ist er richtig und steht im Projekt rund vierzigmal.

  ⚠ **Bei Supabase kommt der Fehler gar nicht als `throw`.** `sb.from(…).select()` liefert `{ data, error }` und wirft nur bei einem Netzwerkfehler. Ein `try { const { data } = await … } catch {}` fängt den Datenbankfehler deshalb **nicht** — er verschwindet schon davor, weil `error` niemand liest. Wer eine Abfrage schreibt, liest `error`; das `catch` ist dafür kein Ersatz.

  **Beleg vom 20.08.2026, und er hat zwei Wochen gehalten.** `fetchKinderVollstaendigFuerElternteil()` selektierte `profil_geprueft_at` auf `mitglieder` — seit Etappe 6a (05.08.2026) eine tote Spalte, sie steht in `personen`. PostgREST antwortete mit `400 / 42703 column mitglieder_1.profil_geprueft_at does not exist`. Gelesen wurde nur `data`:

  ```ts
  const { data } = await sb.from("eltern_kinder").select(…);
  return (data || []).map(…)          // aus 400 wird []
  ```

  Die Datenprüfung meldete daraufhin **„Keine Kinder verknüpft"** — bei einem Kind, das nachweislich verknüpft war. Ein Fehler, der wie eine Datenlage aussah, und die Suche ging in die Datenbank statt in den Code.

  ⚠ **`(data || [])` ist dabei der eigentliche Übeltäter.** Es macht aus `null` eine leere Liste und löscht damit die letzte Spur. Wo ein Rückfall auf `[]` steht, gehört `error` unmittelbar daneben — sonst ist der Rückfall eine Behauptung.

  Gegen die eine Hälfte läuft seither **`npm run check:selects`** (`scripts/check-selects.mjs`, in CI): es hält jede Spalte in einer `select()`-Zeichenkette gegen `database.types.ts`. Was es **nicht** findet, steht im Kopf des Skripts — dynamisch gebaute Selects, `rpc`, nicht auflösbare Embeds, und vor allem eine Spalte, die es GIBT, aber die falsche Bedeutung hat. Gegen die andere Hälfte hilft nichts als `error` zu lesen.

  ⚠ **UND BEIM SCHREIBEN REICHT `error` NICHT — das ist die andere Hälfte, und sie ist tückischer.** Ein `update`/`delete`, das **keine Zeile trifft**, ist kein Fehler: PostgREST antwortet `204 No Content`, `error` ist `null`. Wer die Regel oben befolgt und `error` liest, hat damit **nichts** gewonnen. RLS lehnt nicht ab — sie lässt die Zeile einfach nicht sehen.

  ```ts
  const { data, error } = await sb.from(t).update(felder).eq("id", id).select("id");
  if (error) return { ok: false, fehler: error.message };
  if (!data || data.length === 0) return { ok: false, fehler: "…nicht getroffen" };
  ```

  **`.select("id")` gehört an den Schreibvorgang selbst**, nicht als zweite Abfrage daneben. Der Unterschied ist die ganze Aussage:

  | | fragt | fängt den Fall |
  |---|---|---|
  | `.update(…).select("id")` | wurde **geschrieben**? | ✅ |
  | danach `select id where id = …` | ist **lesbar**? | ❌ |

  Lesen und Schreiben hängen an **verschiedenen Policies**. Eine Zeile, die man sehen aber nicht ändern darf, besteht die zweite Prüfung und ist trotzdem nicht geschrieben. **In `kindService.ts` stand genau diese zweite Fassung** — als Gegenprobe gebaut, gegen den Fall wirkungslos, für den sie gebaut war; berichtigt am 23.08.2026 samt eigenem Testfall.

  **Beleg vom 23.08.2026, gemessen:** `vereine` hatte RLS an und nur SELECT-Policies. `AussehenTab` meldete **„Theme gespeichert ✓"**, `setzeAustrittsziel()` gab `null` (= Erfolg) zurück — beide schrieben nichts. Der Code las `error` vorbildlich. Siehe „Zwei Schreibwege der Portalverwaltung treffen null Zeilen".

  Stand 20.08.2026: **49 Destrukturierungen von `await sb…` lassen `error` weg**, 76 lesen ihn. Nicht alle sind gefährlich (ein `maybeSingle()` auf eine eigene Zeile verkraftet es), aber jede, die einen Rückfall auf `[]` oder `null` hat, ist ein Kandidat für denselben Ausfall.
- **`\b` ist in dieser Codebasis unbrauchbar.** JavaScript zählt nur `[A-Za-z0-9_]` als Wortzeichen — `ä`, `ö`, `ü` gehören nicht dazu. Mitten in „Rückennummer" steht deshalb eine Wortgrenze hinter dem `R`, und `/\bR\b/.test("Rückennummer")` ist **`true`**. In einem Projekt, dessen Bezeichner, Kommentare und UI-Texte durchgehend deutsch sind, trifft das ständig. Wer nach Bezeichnern sucht, nimmt stattdessen:

  ```js
  const GRENZE = "[^\\p{L}\\p{N}_]";
  new RegExp(`(?<=^|${GRENZE})${name}(?=$|${GRENZE})`, "u")
  ```

  Der Fehler geht in **beide** Richtungen und ist deshalb doppelt tückisch. Am 19.08.2026 in `scripts/check-imports.mjs` beide Male erlebt: erst meldete `\bR\b` jede Datei mit dem Wort „Rückennummer" als fehlenden Import von `R` (Rot) — `--fix` hätte ihn ergänzt. Nach der Korrektur stand in derselben Datei noch ein `\b` in der Prüfung auf lokale Deklarationen, wodurch ein `const Rückennummer = …` einen **echt** fehlenden Import von `R` verdeckt hätte. Ein Fehlalarm fällt auf, eine unterdrückte Meldung nicht.

  Unbedenklich bleibt `\b` dort, wo nur ASCII geprüft wird — etwa `/<(path|circle|rect)\b/` gegen SVG-Markup in `icons.test.ts`.
- **`benutzer.id` IST die Auth-Id — es gibt keine Spalte `auth_user_id`.** `handle_new_user()` legt die Zeile mit der `auth.users`-Id als Primärschlüssel an; `useDbUser` liest sie mit `.eq("id", uid)` aus der Sitzung. Ein zweiter Schlüssel existiert nicht.

  **Ich habe am 23.08.2026 `auth_user_id` angenommen** und in zwei Stellen der Löschkette geschrieben. Der Fehler ist die Sorte, die man nicht bemerkt, **weil die eine Hälfte laut scheitert und die andere still durchläuft:**

  | Stelle | was passiert wäre |
  |---|---|
  | Aufrufer auflösen (`.eq("auth_user_id", …)`) | **laut** — PostgREST antwortet `42703 column does not exist`, 500 |
  | Auth-Konto löschen (`deleteUser(zeile.auth_user_id)`) | **still** — `undefined`, der Aufruf wird übersprungen |

  Die zweite Hälfte hätte die `benutzer`-Zeile entfernt und das Anmeldekonto stehen gelassen: **die E-Mail-Adresse dauerhaft für jede erneute Registrierung blockiert**, mit einer Zeile in der Konsole als einzigem Zeichen. Nach aussen sähe das aus wie „diese Adresse ist schon vergeben" — wieder ein Ausfall in der Verkleidung einer Datenlage.

  ⚠ **UND EIN AUTH-KONTO OHNE `auth.identities` IST FÜR DIE ADMIN-API NICHT LÖSCHBAR.** Gemessen am 23.08.2026 beim ersten scharfen Löschlauf: `auth.admin.deleteUser()` antwortete **„Database error loading user"**. Ursache war nicht der Code, sondern der Datensatz — das Konto war von Hand angelegt worden, hatte **null** Zeilen in `auth.identities` und ist für GoTrue damit unvollständig.

  ```sql
  select u.email, u.last_sign_in_at is not null as hat_login,
         (select count(*) from auth.identities i where i.user_id = u.id) as identities
    from auth.users u order by identities;
  ```

  ⚠ **Und `aud` war ebenfalls `NULL`** — bei einem gültigen GoTrue-Konto steht dort `authenticated`. Zwei Merkmale, beide Kennzeichen eines von Hand eingefügten Datensatzes.

  **Zwei der sechs Konten hatten null** — `trainer@fch-test.ch` und `funktionaer@fch-test.ch`, beide am 28.05.2026 angelegt, beide nie angemeldet. **Sie waren nie anmeldefähig**; als Prüfmittel haben sie nur so ausgesehen. Ein Konto, das man nicht benutzen kann, fällt nicht auf, solange niemand es benutzt.

  **Daraus die Reihenfolge in der Löschkette:** erst `auth.admin.deleteUser()`, dann die `benutzer`-Zeile. Scheitert der erste Schritt, ist **nichts** verloren; umgekehrt stünde die Waise da, vor der der Absatz oben warnt — und genau das ist beim ersten Lauf passiert.

  ⚠ **Ein solches Konto lässt sich auch im Dashboard nicht löschen** — es benutzt dieselbe Admin-API. Es geht nur mit SQL (`delete from auth.users`), und das ist ein Schreibvorgang im `auth`-Schema. **Wer per SQL ein Konto anlegt, baut eines, das nur aussieht wie eines** — und hinterlässt es dem Nächsten als etwas, das weder benutzbar noch abräumbar ist. Neue Testkonten entstehen deshalb ausschliesslich über die Anmeldemaske; das Muster liegt in `supabase/testkonto_trainer.sql`, das bewusst nur die **Person** anlegt.

  ⚠ **Die laute Hälfte ist kein Schutz für die stille.** Beide standen in derselben Datei, geschrieben in derselben Minute, aus derselben Annahme. Wäre die laute nicht dabei gewesen, hätte nichts gemeldet. Gefunden habe ich es beim Gegenlesen gegen das Schema und gegen `useDbUser` — nicht durch einen Lauf.

- **Ein `Authorization`-Header ist keine Anmeldung — und `verify_jwt` ist keine Rechteprüfung.** Bei Supabase steht in diesem Header im Normalfall der **publishable key** (früher: anon key). Der liegt im JavaScript-Bündel jeder Seite; er ist öffentlich, das ist sein Zweck. Der Gateway-Schalter `verify_jwt` prüft, ob der Schlüssel **gültig** ist, nicht ob ein **Mensch** dahintersteht — und der publishable key ist gültig.

  Beleg vom 23.08.2026, gemessen gegen die laufende Function, nicht vermutet:

  ```
  POST /functions/v1/invite-user   Authorization: Bearer sb_publishable_…
  → 400 {"error":"E-Mail fehlt"}      ← durch die Rechteprüfung, in der Rumpfprüfung
  ```

  `invite-user` prüfte `if (!authHeader) return 401`. Damit konnte **jeder, der die Seite aufruft**, Einladungs-E-Mails im Namen des Vereins an beliebige Adressen verschicken — abgeschickt vom Auth-Server des Projekts, mit Absender und Aussehen des Portals und einem gültigen Anmeldelink darin. Und `redirect_url` kam ebenfalls aus dem Aufruf, landete also als Link **in der Mail**.

  **Richtig ist, den Token aufzulösen statt ihn zu zählen:** `db.auth.getUser(token)` gegen den Auth-Server, dann `benutzer` über die zurückgegebene Id, dann `ist_admin` und `verein_id`. Ein publishable key ergibt dabei keinen Benutzer. Steht seit dem 23.08.2026 an **einer** Stelle — `supabase/functions/_shared/aufrufer.ts` —, weil zwei getrennte Rechteprüfungen still auseinanderlaufen; die Regeln selbst liegen ohne `esm.sh`-Import in `aufruferRegeln.ts` und haben 11 Testfälle.

  ⚠ **Und der Aufrufer nennt seither eine PERSON, keine Adresse.** Eine mitgeschickte E-Mail lässt sich gegen keinen Verein halten — die Mandantenprüfung wäre Zierrat. Die Adresse kommt aus `personen`, das Ziel des Links aus `vereine.slug`. Erlaubtes aufzählen, nicht Verbotenes: dieselbe Regel wie unten bei Fremddaten, nur für den Rückweg.

- **Bei Fremddaten immer Allowlist, nie Denylist.** Wer aus einer fremden Antwort etwas herausfiltert — Personendaten schwärzen, Felder übernehmen, Nutzlast begrenzen —, listet auf, was **durchkommt**, nicht was fällt. Ein neues Feld der Gegenseite ist damit im Zweifel geschwärzt und fällt auf, statt still mitzureisen. Umgekehrt ist jede Denylist nur so gut wie die Fantasie dessen, der sie geschrieben hat. Beleg vom 19.08.2026: eine Regex-Denylist `/person|player|birth|passport|…/` gegen die SFV-Matchdaten war zugleich zu streng (schwärzte `personId`, `isPlayer`) und zu lasch — `players[]` führt den Namen in **drei** Feldern, `firstname`, `name` und `secondName`, von denen keines „person" oder „player" heisst. Die Klarnamen von 32 Spielern, überwiegend gegnerische, gingen durch. Gefangen wurde es nur, weil die Datei zuerst in den Scratchpad geschrieben und dort gegengelesen wurde. Muster: `scripts/sfv-matchdaten-probe.mjs`, Konstante `ERLAUBT`.
- **Ein neues Feld erbt JEDEN Ausgang des Objekts, an dem es hängt.** Wer einem bestehenden Objekt ein Feld hinzufügt, muss alle Wege kennen, die dieses Objekt schon nimmt — nicht nur den, für den das Feld gedacht war. Das Feld ist neu, die Ausgänge sind alt, und deshalb schlägt nichts fehl.

  **Beleg vom 21.08.2026, selbst gebaut und am selben Abend aufgeflogen.** `MatchdatenErgebnis` bekam `offene_namen` — die Klarnamen eigener Spieler, ausdrücklich als Durchreiche an den Browser gedacht, mit einem langen Kommentar darüber, dass sie **nirgends gespeichert** werden. Gesichert war die Anzeige, mit einer Allowlist. Nur nahm das Objekt zwei weitere Wege, die seit Monaten bestanden:

  | Ausgang | Folge |
  |---|---|
  | `details: erg` → `api_sync_log` | **903 Klarnamen in sieben Läufen**, dauerhaft, +129 pro Stunde durch den Zeitplan |
  | Antwort des Cron-Laufs → `pg_net` | landet in `net._http_response.content` |

  Dazu liest `PortalverwaltungModul` die Protokolltabelle mit `select("*")` — die Namen reisten in den Browser jedes Admins, der den Audit-Tab öffnete, ohne dort je gerendert zu werden.

  ⚠ **Die Allowlist stand am falschen Ort.** Gesichert wurde der Weg, den der Autor im Blick hatte; hinaus ging es über den, den er nicht angesehen hat. Eine Allowlist schützt nur den Ausgang, an dem sie steht — die Frage ist nicht „ist dieses Feld gesichert?", sondern **„welche Ausgänge hat dieses Objekt?"**.

  **Die Prüfung dazu ist mechanisch und dauert eine Minute:**

  ```bash
  grep -n "erg" supabase/functions/sfv-sync/index.ts   # jeder Ausgang des Objekts
  ```

  Jede Zeile einzeln lesen: geht das Objekt dort in eine Tabelle, in ein Log, über HTTP hinaus? Für jeden dieser Ausgänge eine eigene Allowlist — hier `fuersProtokoll()` und `fuerZeitplanAntwort()` in `ergebnisTypen.ts`.

  **Dieselbe Familie wie der Regex-Schnitt und `.eq("mitglied_id", …)`:** das Werkzeug — hier das Spread `{...erg}` — kennt die Bedeutung nicht, und das Ergebnis sieht richtig aus.

  ⚠ **Und die Tests waren grün.** Beide Enden waren geprüft, gegen selbst erfundene Attrappen, in denen das Feld dort lag, wo der Autor es vermutete. **Eine Attrappe, die die Form abschreibt, prüft die Abschrift.** Wo eine Testattrappe die Form eines echten Objekts nachbildet, gehört ihr dessen Typ — und wenn der in einer Deno-Datei steht, die `tsc` nicht lesen kann, gehört die Form in eine eigene Datei, die beide Welten lesen (`ergebnisTypen.ts`, ohne `esm.sh`-Import).

- **Ein Filter auf einen NAMEN prüft eine Schreibweise. Ein Filter auf ein MERKMAL prüft die Sache.** Wo eine Regel lautet „alles ausser X", ist X fast nie ein Name — es ist eine Eigenschaft, die X zufällig auch hat. Der Namensfilter hält, solange es genau ein X gibt, und fällt beim zweiten.

  **Beleg vom 22.08.2026, und er hätte nie auffallen können.** „Art ändern" darf nur **gesetzte** Personenarten vergeben; eine abgeleitete ergibt sich aus den Daten, und die Sicht überschriebe die Zusage im nächsten Moment. Bis zum Morgen desselben Tages gab es **genau eine** abgeleitete Art — „Elternteil". Ein Filter `name !== "Elternteil"` wäre also durch jeden Test gekommen, den man ihm gestellt hätte.

  Am Vormittag kam „Ehemaliges Elternteil" dazu. Der Namensfilter hätte sie **durchgelassen**, die Zeile wäre in `personenart_pro_person` gelandet, und die Sicht hätte sie ignoriert — die Aktion hätte **scheinbar funktioniert**: kein Fehler, keine Meldung, nur eine Art, die nicht gilt. Richtig ist `ableitung === null`: das ist die Sache selbst.

  ⚠ **Das Beispiel ist seit dem Abend desselben Tages hypothetisch — die Regel nicht.** „Ehemaliges Elternteil" ist zurückgebaut worden, weil der Austritt die Art SETZT statt sie abzuleiten; heute gibt es wieder genau eine abgeleitete. Der Beleg steht hier trotzdem, und zwar absichtlich: **ohne ihn wäre die Regel eine Vorsichtsmassnahme ohne Anlass**, und der Nächste hielte sie für Umständlichkeit und vereinfachte sie weg. Der zugehörige Testfall trägt seither einen **erfundenen** Ableitungswert — er prüft die Regel („jede Ableitung wird abgewiesen") statt den einen Wert, den es gerade gibt, und ist damit strenger als das echte Beispiel es war.

  | | prüft | hält bis |
  |---|---|---|
  | `name !== "Elternteil"` | eine **Schreibweise** | zur zweiten abgeleiteten Art |
  | `ableitung === null` | das **Merkmal** | immer |

  **Dieselbe Familie wie `ilike 'junior%'` gegen `mitgliedtypen.hauptkontakt_pflicht`:** die Regel „Minderjährige brauchen einen Hauptkontakt" nach dem Namen des Mitgliedtyps zu prüfen funktioniert, bis jemand „Juniorenmitglied" in „U18" umbenennt oder einen zweiten Jugendtyp anlegt. Und wie die Spaltenköpfe der Pflichtfeld-Matrix, die am 05.08.2026 auf `Juniormitglied` und `Funktionär` zeigten, während die Typen `Juniorenmitglied` und `Funktionär/in` heissen.

  **Die Prüfung ist mechanisch:** wo ein Vergleich gegen eine Zeichenkette steht, die aus der Datenbank stammt, gehört die Frage dazu — *welche Eigenschaft meine ich eigentlich, und steht sie als Spalte da?* Steht sie nicht, ist das der eigentliche Befund.

- **Keine Komponente, die bei fehlenden Daten `null` zurückgibt.** Eine Sektion, die still verschwindet, ist von einer nicht gerenderten nicht zu unterscheiden — bei der Fehlersuche kostet genau diese Ununterscheidbarkeit die meiste Zeit. Stattdessen eine Karte mit einem Satz, der sagt, was fehlt und wo es herkommt. (`MitgliedtypFelderSektion` ohne Mitgliedtypen ist das Muster.) Gilt nicht für bewusste Sichtbarkeitsregeln — ein Feld auf „Gibt es nicht" verschwindet richtigerweise ganz.

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

> **Ein `CHECK` zählt dabei nicht mit.** `pg_dump` schreibt CHECK-Constraints **inline in das `CREATE TABLE`**, nicht als eigenes `ADD CONSTRAINT` — anders als Primär-, Fremd- und Unique-Schlüssel. Eine neue Tabelle mit einem CHECK ergibt deshalb ein `ADD CONSTRAINT` weniger, als man beim Zählen der Constraints im Skript erwartet. Wer das nicht weiss, vermutet einen Verlust, wo keiner ist. (Am 19.08.2026 bei `mitgliedtyp_feldkonfig` aufgelaufen: erwartet +6, gezählt +5, korrekt war +5 — der sechste ist `mitgliedtyp_feldkonfig_modus_check` und steht in Zeile 1174 mitten im `CREATE TABLE`.) Zum Gegenprüfen: `grep -c "CONSTRAINT .* CHECK" supabase/schema.sql`.

> **Die Zählprüfung hat vier blinde Flecken.** Sie zählt nur Objekte in `public`, und vier wichtige Dinge liegen woanders — alle fallen durch jede Zählung, weil sie in *keiner* der vier Kategorien vorkommen. **Die vollständige Liste samt Nachbau-Reihenfolge steht in `ARCHITECTURE.md` → „`schema.sql` baut die Datenbank NICHT nach"; hier nur die Kurzfassung:**
> - `ALTER PUBLICATION "supabase_realtime" ADD TABLE …` für `nachrichten` und `nachrichten_antworten`. Die Publication ist global, nicht schemagebunden. Ohne diese Zeilen bekommt ein nachgebautes Portal keine Live-Nachrichten — und weil nichts fehlschlägt, merkt es niemand.
> - Die Trigger auf `auth.users` (`on_auth_user_created`, `on_auth_user_login`). Sie stehen in **keinem** `public`-Dump; `schema.sql` enthält nur die Funktionen `handle_new_user`/`handle_user_login`, ohne jeden Aufrufer. Deshalb liegen sie separat in **`supabase/auth_triggers.sql`** und müssen nach `schema.sql` eingespielt werden — sonst kann sich nach einem Nachbau niemand registrieren.
> - **Der cron-Auftrag `sfv-sync-stuendlich`** (seit 15.08.2026). `cron.job` liegt im Schema `cron`. Ohne ihn läuft der SFV-Sync nie wieder, und auch das fällt nicht auf: die Anzeige zeigt schlicht den Stand vom Tag des Nachbaus. Liegt in **`supabase/cron_sfv_sync.sql`**.

  > ⚠ **`cron.schedule` PRUEFT DEN BEFEHL NICHT.** Es speichert eine
  > Zeichenkette. Der Einrichtungsblock kann fehlerfrei durchlaufen und einen
  > Befehl hinterlegen, der jede Stunde scheitert — am 21.08.2026 zweimal
  > hintereinander erlebt: eine Variable, die nur im äusseren Block deklariert
  > war (`v_anz is not a known variable`), und danach ein `Content-Type:
  > text/plain`, den `net.http_post` ablehnt. Beide Male meldete das
  > Einrichten „Wächter steht".
  >
  > **Den gespeicherten Befehl deshalb einmal ausführen, bevor man ihm glaubt:**
  >
  > ```sql
  > begin;
  >   do $probe$ declare c text; begin
  >     select command into c from cron.job where jobname = '…';
  >     execute c;
  >   end $probe$;
  > rollback;
  > ```
  >
  > `pg_net` stellt seine Anfragen transaktional in die Warteschlange — ein
  > Rollback nimmt einen Ping also mit zurück, es geht nichts nach draussen.
  >
  > ⚠ **Und der Tag des äusseren Dollar-Quotings darf im Befehl nirgends
  > vorkommen, auch nicht in einem Kommentar.** Ein `$waechter$` im Kommentartext
  > beendet den Block mittendrin; der Fehler zeigt dann auf eine Stelle, die
  > mit der Ursache nichts zu tun hat.

  > ⚠ **`cron.job_run_details.status = 'succeeded'` heisst NUR „abgesetzt".** Es ist das Ergebnis des `select net.http_post(…)` — also, dass die Anfrage in die Warteschlange gelegt wurde. Über die ANTWORT sagt es nichts. Die steht in **`net._http_response`**, und nur dort:
  >
  > ```sql
  > select status_code, left(content,120), created at time zone 'Europe/Zurich'
  >   from net._http_response order by created desc limit 5;
  > ```
  >
  > Beleg vom 21.08.2026: der Job meldete stündlich `succeeded` mit `1 row`, während jeder Aufruf mit **401 UNAUTHORIZED_NO_AUTH_HEADER** zurückkam — der Befehl schickt `X-Sync-Key`, aber keinen `Authorization`-Header, und Supabase weist das am Gateway ab, bevor die Function startet. Der Sync stand 14 Stunden, und `job_run_details` sah die ganze Zeit grün aus.
  >
  > ⚠ **Und `net._http_response` reicht nur ein paar Stunden zurück** — pg_net räumt selbst auf; am 21.08.2026 lagen dort sechs Zeilen, die älteste fünf Stunden alt. Die Tabelle sagt, ob es JETZT klemmt, nie seit wann. Dafür sind `api_sync_log` und `api_verbindungen.letzter_sync` die Quelle.
  >
  > **Das Eigentliche daran: es gibt keinen Alarm.** Ein ausgefallener Lauf schreibt keine Zeile in `api_sync_log` — und „keine neue Zeile" sieht genauso aus wie „es gab nichts zu tun".
> - **Der Storage-Bucket `sfv-logos`** (seit 20.08.2026). `storage.buckets` liegt im Schema `storage`. Ohne ihn erscheinen keine Vereinswappen, und der Sync legt sie ins Leere ab. Liegt in **`supabase/migration_sfv_logos.sql`**.
>
> **Das gemeinsame Merkmal: keines der vier bricht laut.** Registrierung, Live-Nachrichten, Sync, Wappen — alle hören einfach auf zu funktionieren. Wer etwas ausserhalb von `public` anlegt, trägt es in die Tabelle in `ARCHITECTURE.md` ein; eine Migrationsdatei allein genügt nicht, sie ist Protokoll und keine Quelle fürs Nachbauen.
>
> Beim regulären `supabase db dump --linked` sind die `ALTER PUBLICATION` enthalten; ein `pg_dump --schema=public` verliert sie. Die auth-Trigger fehlen in beiden Fällen. Wird der Dump länger nicht gepflegt, läuft er auseinander: am 27.07.2026 fehlten ihm `elternkontakte.profil_geprueft_at`, `vereine.slug` samt `vereine_slug_unique` und die Funktion `check_email_bekannt()` — alle drei erst durch eine Regenerierung von `database.types.ts` aufgefallen. Edge Function `supabase/functions/invite-user` versendet Einladungs-Mails über die Auth-Admin-API.

> **⚠ `>` in PowerShell 5.1 schreibt UTF-16LE.** Nicht nur bei `gen types` —
> bei **jedem** Befehl. Am 20.08.2026 lag `src/database.types.ts` so mit
> 300 KB statt 145 KB im Repository: Git hielt die Datei für binär
> (`Bin 140356 -> 300554 bytes` — kein Zeilendiff, keine Review, keine
> Konfliktauflösung), `grep` fand nichts darin, und Build wie Typecheck liefen
> trotzdem durch, weil TypeScript das BOM versteht. Nichts schlug fehl, und
> niemand sah es.
>
> **Deshalb gibt es `npm run gen:types`** (`scripts/gen-types.mjs`). Die
> Supabase-CLI kann nur nach stdout schreiben — sie hat kein Flag für eine
> Zieldatei —, also übernimmt das Skript die Umleitung und schreibt immer
> UTF-8, gleich aus welcher Shell es gestartet wird. Es prüft ausserdem, dass
> die Antwort `export type Database` enthält, bevor es die Datei überschreibt:
> ohne das machte ein Netzwerkfehler aus einem gescheiterten Aufruf eine leere
> Typdatei, und der nächste Typecheck meldete hunderte Fehler an Stellen, die
> niemand angefasst hat.
>
> **Für alles andere gilt die Regel weiter.** Wer in PowerShell eine Datei
> schreibt, die eingecheckt wird, nimmt `| Out-File -Encoding utf8` oder
> `| Set-Content -Encoding utf8` — oder führt den Befehl über Git Bash aus.
> Zum Nachsehen: `head -c 2 datei | od -c` → `FF FE` heisst falsch.
>
> Eine Regel, an die jemand denken muss, ist die schwächste Lösung. Wo ein
> Befehl wiederholt vorkommt, gehört die Umleitung ins Skript statt in die
> Anleitung.

**`supabase/schema.sql` deckt nur das Schema `public` ab.** Zwei Dinge stehen deshalb nicht darin und gehen beim Nachbauen verloren, wenn man sie nicht kennt:

- **Trigger auf `auth.users`** → `supabase/auth_triggers.sql`. Dort liegen `on_auth_user_created` (ruft `handle_new_user`) und `on_auth_user_login` (ruft `handle_user_login`). In `schema.sql` stehen nur die Funktionen, ohne jeden Aufrufer — ohne diese Datei kann sich nach einem Nachbau niemand registrieren. Nach `schema.sql` einspielen.
- **Extensions und die Realtime-Publication.** `CREATE EXTENSION` liegt in den Schemas `extensions`/`vault`, `ALTER PUBLICATION "supabase_realtime" ADD TABLE …` (für `nachrichten` und `nachrichten_antworten`) ist global. `supabase db dump` nimmt beides mit, ein blosses `pg_dump --schema=public` **nicht** — wer ohne Docker dumpt, verliert diese sieben Zeilen still und damit die Live-Zustellung der Nachrichten.

Ohne Docker (z.B. wenn Docker Desktop nicht läuft) geht ein Dump auch direkt über den Session-Pooler mit lokalem `pg_dump`; die Verbindungsdaten stehen in `supabase/.temp/pooler-url`. Das Ergebnis ist dann aber um die oben genannten sieben Zeilen ärmer und in der Schreibweise abweichend (kein `IF NOT EXISTS`/`OR REPLACE`) — als Ersatz für den regulären Dump nur mit Gegenprüfung verwenden.

## Weitere Dokumente

- `ARCHITECTURE.md` — Regeln, Checklisten, das **Personen-Modell** (Anlass, Zielstruktur, Zuordnungsentscheidungen, sechs Etappen), Datenbankregeln, Session-Historie. Ordnerstruktur und Regeln sind am 04.08.2026 auf den Ist-Stand gebracht worden. Die **Session-Abschnitte ab „Session 17" sind Archiv**: sie beschreiben Stände von damals (noch `.jsx`, `theme.jsx` als Design-System) und werden bewusst nicht rückwirkend korrigiert. Bei Widerspruch gilt der Code.
- `ELTERN_LOGIK.md` — n:m-Modell `elternkontakte`/`eltern_kinder` und die Entknüpfungs-/Supporter-Logik (teilweise noch nicht implementiert). **Wird vom Personen-Umbau abgelöst** — siehe `ARCHITECTURE.md` → Personen-Modell.
- `supabase/etappe1_personen.sql` — Etappe 1 des Personen-Umbaus, blockweise ausführbar. Die Blockfolge ist absichtlich **nicht** alphabetisch (A → D → B → C): `LANGUAGE sql`-Funktionen werden bei `CREATE` validiert, und die Funktionen aus B greifen auf `person_id` zu, das erst D anlegt.
- `supabase/etappe2b_backfill_person_id.sql` — legt Personen für Mitgliedschaften nach, die zwischen Etappe 1 und 2b entstanden sind. **Voraussetzung** für die Kindersuche, die mit `personen!inner` filtert.
- `supabase/etappe3_eltern.sql` — Etappe 3 (Elternkontakte auf `personen`), ausgeführt am 05.08.2026. Blockfolge A–G; **Block F ist der Kern**: `eltern_kinder.person_id` wird NOT NULL und Bezugspunkt, `eltern_id` nullable und Altlast. Seither gilt für den Code: `elternkontakte` wird weder gelesen noch geschrieben, `beziehung` und `hauptkontakt` hängen an `eltern_kinder`, der Portal-Zugang an `benutzer.person_id`. Die Tabelle `elternkontakte` steht noch und fällt erst in Etappe 6.
- `supabase/etappe2a_merge.sql` — Etappe 2a (Merge über E-Mail-Gleichheit), ausgeführt am 05.08.2026. Reihenfolge `0 → A → B → C → D`; Block C schreibt und löscht, ein Rückbau wie in Etappe 1 ist **nicht** möglich. Enthält die Sperrabfrage 2a-0, die vor jedem künftigen Merge (Fairgate-Import) erneut leer sein muss.
- `supabase/migration_mandant_schluessel.sql` — 13 Tabellen von global auf `(verein_id, …)` umgestellt, ausgeführt am 05.08.2026. **Enthält den Hinweis, dass fünf `onConflict`-Zeilen im Code mitgeändert werden mussten** — ohne sie schlägt jedes Speichern fehl. Am Ende ein Nachtrag vom 14.08.2026: eine der drei Ausnahmen war keine.
- `supabase/migration_portal_zugang.sql` — legt die Sicht `portal_zugang` an (`person_id`, `hat_zugang`) und gibt sie `authenticated` frei. Läuft bewusst **ohne** `security_invoker`, damit auch ein Trainer die Portal-Spalte der Elternliste sieht — mit RLS von `benutzer` bekäme er für alle „Kein Zugang", ohne Fehlermeldung. **Für jede andere Sicht gilt das Gegenteil:** ohne `security_invoker = true` umgeht eine Sicht die RLS vollständig. Begründung, Umfang der Preisgabe und die Regel, dass hier nie eine Spalte ohne Rechteprüfung dazukommt: `ARCHITECTURE.md` → „Die Sicht `portal_zugang` — die eine Ausnahme".
- `supabase/migration_api_verbindungen_mandant.sql` — `api_verbindungen.key` von global auf `(verein_id, key)`, ausgeführt am 14.08.2026. Nachtrag zur Migration darüber: die Spalte hält keinen Schlüssel, sondern den Namen des Anschlusses (`fairgate`, `football_ch`, …), und global eindeutig hätte der erste Verein ihn allen anderen weggenommen.
- `supabase/migration_sfv_spielplan.sql` — SFV Club API, Teil A: SFV-Spalten und Sync-Schlüssel auf `spiele`, Zuordnungsspalten auf `teams`, neue Tabelle `ranglisten`, Eintrag `football_ch` in `api_verbindungen`. Ausgeführt am 14.08.2026. **Läuft nach `migration_api_verbindungen_mandant.sql`.** Die Feldhoheit steht in `api_verbindungen.sync_felder` und ist Vertrag, nicht Dokumentation: der Sync schreibt nur, was unter `sfv` und `abgeleitet` steht — `treffpunkt`, `notes` und `venue_addr` gehören dem Verein und überleben jeden Lauf.
- `supabase/migration_pflichtfelder_fein.sql` — Pflichtfeld-Matrizen auf feine Feldnamen (`adresse` → `strasse`/`plz`/`ort`), `vorname_nachname` entfernt, Mitgliedtypen ohne Einträge befüllt. Ausgeführt am 05.08.2026.
- `supabase/migration_ist_admin.sql` — Adminstatus als Kennzeichen `benutzer.ist_admin` statt als Rollenwert, ausgeführt am 05.08.2026. Stellt auch `is_admin()` und `is_admin_or_above()` um. `database.types.ts` wurde dabei von Hand nachgezogen (`ist_admin`, und `person_id` aus Etappe 1, das ebenfalls fehlte) — das nächste `supabase gen types` erzeugt dieselben Zeilen, es ist also kein Sonderweg, sondern ein Vorziehen.
- `supabase/etappe4_vorbereitung.sql` / `etappe4_benutzer.sql` — Etappe 4: `benutzer` an die Person, Registrierung auf `personen` umgestellt, harter Riegel gegen verwaiste Auth-Konten.
- `supabase/etappe5_supporter.sql` — Etappe 5: Supporter als Mitgliedtyp, Portalrolle `mitglied` aktiviert, partieller Index `mitglieder_eine_aktive_mitgliedschaft`.
- `supabase/etappe6a_altspalten_mitglieder.sql` — Etappe 6a: 18 Personenfelder aus `mitglieder` gestrichen. Sicherheitskopie in `_etappe6_altspalten_mitglieder`. Enthält die Begründung, warum `rolle`, `position`/`rueckennr` und vier weitere Spalten bleiben.
- `supabase/etappe6b_position_rueckennr.sql` — `position` und `rueckennr` gehören an die Kaderzeile, nicht ans Mitglied.
- `supabase/etappe6c_restliche_altspalten.sql` — `hat_portal_zugang`, `eltern`, `datenstatus`, `notizen`, `fairgate_sync_at`. Enthält auch die neue Fassung von `handle_new_user()`.
- `supabase/auth_triggers.sql` — die zwei Trigger auf `auth.users`, die in keinem `public`-Dump stehen.
- `supabase/cron_sfv_sync.sql` — der stündliche Zeitplan des SFV-Sync (pg_cron + pg_net, Ausweis aus dem Vault). Steht ebenfalls in keinem Dump, weil `cron.job` nicht im Schema `public` liegt. Enthält auch die zwei Abfragen zum Nachschauen: `cron.job_run_details` sagt, ob der Aufruf abgesetzt wurde, `api_sync_log` sagt, ob der Lauf gelang.
- `supabase/migration_sfv_sync.sql` — Laufsperre (`api_verbindungen.sync_laeuft_seit`) und die Korrektur der Feldhoheit (`ht_resultat` gehört dem Verein, der Spielplan-Endpunkt liefert keine Halbzeit). Ausgeführt am 14.08.2026; enthält am Ende den Nachtrag über den ausgefallenen Block A.
- `README.md` — Produktüberblick, Rollen, Einrichtung eines neuen Vereins.

## Bekannte Defekte

- Vier fast gleiche Kaderrollen-Typen nebeneinander: `KaderRolle` (`types.ts`), `KaderRolleDb` (`roleUtils`), `KaderRolleOption` (`useMemberMeta`), `RolleOption` (`RollenAuswahlListe`).
- **Mitglied anlegen prüft nicht auf Dubletten.** `NeuesMitgliedModal` → `insertMitglied()` schreibt ohne Abgleich gegen den Bestand; zweimal abgeschickt heisst zweimal in der Datenbank. Nachweis: zwei Zeilen „Test User" <test@fch-test.ch>, angelegt am 26.07.2026 fünf Sekunden auseinander, in Etappe 2a entfernt. Der Unique-Index `personen_email_pro_verein` fängt das **noch nicht** ab — `insertMitglied()` schreibt weiterhin nach `mitglieder`, nicht nach `personen`. Ein Doppelklick-Schutz im Formular bleibt offen.
  *Für Elternkontakte ist der Fall seit Etappe 3 erledigt:* `insertElternkontakt()` läuft über `findeOderLegePersonAn()`, führt über die E-Mail zusammen und übersetzt `23505` in „Diese E-Mail ist bereits vergeben." Derselbe Weg steht `insertMitglied()` noch bevor.

Behoben in der TS-Migration (Session 18): das nicht importierte `supabase` in `clubcampus` (ReferenceError statt Login-Screen, sobald die Env-Variablen fehlten), das undefinierte `vereinId` an `ProfileView`, sowie das Phantomfeld `geprueft` in `MemberHero` und `InfoTab` (Datenprüfungs-Status stand konstant auf „offen"/„Ausstehend").

Behoben mit der SQL-Migration vom 26.07.2026 + Typ-Regenerierung: `mitglieder.eintrittsdatum`, `elternkontakte.supporter` und `benutzer.vorname/nachname/telefon` sind jetzt echte Spalten. `database.types.ts` wurde neu generiert; die früheren Bridge-/Extension-Typen in `types.ts` (Elternkontakt-`supporter`, DbUser-`vorname/nachname/telefon`, Mitglied-`eintrittsdatum`) sind entfernt. Damit greifen die früher stillen Schreibpfade (u. a. die Supporter-Logik beim Entknüpfen des letzten Kindes).

Behoben am 05.08.2026 (Etappe 4 und 5):
- **Der Registrierungsablauf war seit Etappe 3 kaputt.** `handle_new_user()` und `check_email_bekannt()` suchten in `mitglieder.email` (seit Etappe 2b eine Altspalte) und ersatzweise in `elternkontakte` (seit Etappe 3 abgelöst). Ein neuer Elternteil konnte sich nicht registrieren, und wer seine Adresse im Portal geändert hatte, wurde nicht gefunden. Beide suchen jetzt in `personen`.
- **Verwaiste Auth-Konten entstanden lautlos.** Bei unbekannter E-Mail brach der Trigger still ab; die `auth.users`-Zeile blieb stehen. Jetzt wirft er, und Supabase rollt mit zurück.
- **`role = 'mitglied'` wurde gesetzt, ohne dass die Rolle aktiv war.** Sie stand in `portal_rollen` mit `aktiv = false` und fehlte in `types.ts`, `getPermissions` und `NAV_BY_ROLE`.
- **`mitglieder.eltern` enthielt 391 Zeilen mit dem falschen Inhalt** — Name, E-Mail, Telefon, Beziehung, aber kein `benutzer_id`. Der Filter, der die Kinder eines Elternteils suchte, konnte deshalb nie einen Treffer haben; Eltern bekamen nie einen Datenprüfungs-Hinweis für ihre Kinder. Die Lücke steht jetzt als `kinderVonElternteil()` an einer Stelle in `getProfilCheck` und wartet auf einen eigenen Schritt.
- **487 Kaderrollen im Funktionenfeld** — in `mitglieder` UND in `personen` (Etappe 1 hatte sie mitkopiert). `ableitRolle()` prüft nur `funktionen.length > 0` und machte damit jeden zum Funktionär, der gerade in keinem Kader stand. Übrig blieben acht echte Einträge auf sechs Ämter.
- **`mitglieder.rolle` war bei 493 von 512 aktiven Mitgliedern leer.** `ableitUndSaveRolle()` läuft nur bei Kader-, Team- oder Funktionsänderungen — wer nie eine hatte, ging nie durch die Funktion. Vorher fiel es nicht auf, weil das fälschliche „Spieler" im Funktionenfeld die Ableitung angestossen hatte. Am 05.08.2026 einmalig aus `mitgliedtypen.standard_rolle` nachgezogen.
- **Zwei Zeilen trugen `rolle = 'Spieler'` mit grossem S** — ein Wert, den `portal_rollen` nicht kennt und mit dem weder `getPermissions` noch `NAV_BY_ROLE` etwas anfangen. Zum Prüfen: jeder Wert in `mitglieder.rolle` muss in `portal_rollen` vorkommen.

Behoben am 05.08.2026 (Adminstatus):
- **`ableitUndSaveRolle()` degradierte Administratoren stillschweigend.** `benutzer.role` ist ein berechneter Wert, und `ableitRolle()` kennt `administrator` gar nicht — ein Admin, der auch Juniorentrainer ist, wurde beim nächsten Kader-Eintrag zum Trainer. Dasselbe beim Login über `useDbUser`. Der Adminstatus liegt jetzt in `benutzer.ist_admin` und wird von der Ableitung nicht mehr angefasst; `role` bleibt der berechnete Wert und ist `administrator`, solange das Kennzeichen gesetzt ist. Alle Vergleiche auf `role === "administrator"` funktionieren dadurch unverändert.

Behoben am 05.08.2026 (Pflichtfelder):
- **Die Portalrolle war beim Anlegen wählbar, obwohl sie ein berechneter Wert ist.** `ableitRolle()` bestimmt sie aus den Kader-Rollen, ersatzweise aus `mitgliedtypen.standard_rolle`, dann aus den Funktionen; `ableitUndSaveRolle()` schreibt sie nach `mitglieder.rolle` **und** `benutzer.role` — bei jeder Kader-Zuweisung, jeder Änderung an Teams oder Funktionen, und beim Login nochmals über `useDbUser`. Eine im Modal gewählte Rolle hielt also nur bis zum ersten dieser Ereignisse. Das Feld ist entfernt; stattdessen wird die Rolle direkt nach dem Anlegen abgeleitet, sonst zeigte die Liste `-`. Von Hand setzen geht im Profil (`PortalTab`), wo man sieht, was die Ableitung ergeben hat.
- **`Mitgliedtyp` in `types.ts` war unvollständig** — `id`, `standard_rolle` und `beitragsinfo` fehlten. Ergänzt; der Eintrag unter „Bekannte Defekte" entfällt damit.
- **Drei Mitgliedtypen liessen sich nicht anlegen** — bei Passiv-, Ehren- und Freimitglied verlangte die Matrix `email`, während `NeuesMitgliedModal` das Feld über eine `PASSIV_TYPEN`-Liste ausblendete. Die Prüfung schlug an, das Feld fehlte.
- **Die Spaltenköpfe der Pflichtfeld-Matrix waren fest verdrahtet** (`Juniormitglied`, `Funktionär`). Die echten Typen heissen `Juniorenmitglied` und `Funktionär/in` — Häkchen schrieben Zeilen für nicht existierende Typen, `Pausenmitglied` und `Supporter` hatten keine Spalte. Deshalb stand bei Juniorenmitglied nichts in der Matrix: es liess sich nicht ankreuzen. Quelle sind jetzt `dbMitgliedtypen`.
- **`adresse` wirkte nirgends** — die Matrix schrieb `adresse`, das Formular fragte `strasse`/`plz`/`ort`; unbekannte Feldnamen wurden still übersprungen, der Adressblock erschien gar nicht.
- **`ahv_nr`, `nationalitaet`, `heimatort`** standen in der Prüfliste ohne Eingabefeld. Sie werden jetzt gerendert und gespeichert.

Behoben beim Abschluss der Modul-Migration (Sport-Module):
- **Acht tote `verein_id`-Schreibpfade** — die DB lehnt Zeilen ohne `verein_id` still ab (siehe verein_id-Regel oben): `KaderModul` (Kader-Upsert), `TrainingsplanModul` (`trainingsplaetze`, `trainings`, `trainingsplan_vorlagen`/`_slots`/`_ausnahmen`), `TeamsVerwaltungModul` (`teams`-Insert via `toDbData`, `team_module`-Upsert). `vereinId` wird jetzt via Prop durchgereicht (clubcampus → TeamView/TeamsVerwaltung → Modul), Guards ergänzt.
- **`TrainingsplanModul`**: der Slot-Upsert schrieb in die nicht existierende Spalte `end_haelfte` statt `end_half` → der ganze Slot-Upsert scheiterte, `end_half` wurde nie persistiert.
- **`TrainingsplanModul` / `TermineModul`**: KW-Berechnung rechnete `Date − Date` statt `getTime() − getTime()`.
- **`TermineModul`**: `toggleCancel` referenzierte das nicht existierende `week_nrAusnahmen` (statt `kwAusnahmen`) → ReferenceError beim Absagen eines Trainings (folgenlos nur, weil `ATT_EVENTS`/`window.storage` im Demo leer liefen).
- **`TeamModul`**: `parseEvDate` war gar nicht definiert (nur lokal in `TermineModul`) und `EventsList` las die nirgends definierten `kannVerwalten`/`meineTeams` → latente ReferenceErrors, bislang folgenlos weil `ATT_EVENTS` leer ist bzw. der Code-Pfad tot war. Helper ergänzt bzw. als Props geführt.
- **`DashboardModul`**: Eltern-Dashboard warf `ReferenceError` durch undefinierte `kannSchreiben`/`kannVerwalten`/`isTrainer`/`isAdmin`.
- **`TeamsVerwaltungModul`**: der exportierte, aber nirgends gerenderte `TeamsAdminView` las `navToTeam`/`onNavToTeamDone`, die nicht in seiner Prop-Liste standen.
- Diverse zur Laufzeit wirkungslose Props (nicht durchgereicht/gespreadet) bereinigt: `mb`/`title`/`className` auf `Row`/`Btn`/`PersonPicker`, tote `window.storage`-/`ROLLE_MAP`-Reste.

## Offene Punkte aus Session 23 (05.08.2026)

### ✅ Personenseite statt Modal — beide Modale gefallen am 21.08.2026

Auftrag: `docs/auftrag_personenseite.md`. Schritte 1–4 geliefert.

Mitglied, Elternteil und Supporter sind **dieselbe Person**, also dieselbe
Seite. `MemberDetail` trägt seit Schritt 1 auch eine Person ohne
Mitgliedschaft; **den Unterschied macht genau eine Zeile** — welche Achse der
Feldkonfiguration gilt:

```ts
getFeldkonfig(mitgliedId == null ? OHNE_MITGLIEDSCHAFT : fuerMitgliedtyp(raw.mitgliedtyp), feldkonfig)
```

Alles Weitere folgt daraus. Kein `if (istSupporter)` auf der Seite: wo eine
solche Abfrage nötig schiene, kennt die Konfiguration den Fall noch nicht.

| war | ist |
|---|---|
| `SupporterModal` (190 Z.) | Personenseite, Achse `ohne_mitgliedschaft` |
| `ElternkontaktModal` (265 Z.) | dieselbe |
| `ElternPortalSection` (63 Z.) | Portal-Tab |
| `ElternKinderSektion` (215 Z.) + `KindSucheModal` | **ersatzlos** — siehe unten |
| `ElternFelder` / `validateElternkontakt` | eigene Datei `ElternFelder.tsx` (sie ERFASSEN, das Modal ZEIGTE) |

**Was ersatzlos weggefallen ist**, vollständig: Kinderliste am Elternteil,
Hauptkontakt-Stern von dort, „Kind hinzufügen" von der Elternseite aus,
„Entfernen" pro Elternteil. Die ersten drei gibt es weiter **vom Kind aus**
(`ElternTab`), das vierte als Sammelaktion in der Elternliste. Keine Fähigkeit
fällt weg, nur die Richtung.

**Offen: der Kinder-Tab.** Dort gehören Beziehung und Hauptkontakt-Stern hin
— beide hängen an `eltern_kinder`, nicht an der Person. Der fertige Inhalt
dafür liegt im Git-Verlauf: `ElternKinderSektion.tsx`, `KindSucheModal.tsx`
und `elternService.sucheKinder()`, gelöscht im Commit zu Schritt 4
(21.08.2026). Nicht als tote Datei stehengelassen — eine Datei, die niemand
rendert, läuft still am Schema vorbei.

> **Der Verlauf hat weiterhin keinen Platz an einer Person.**
> `mitglieder_aenderungen` und `mitglieder_aktivitaeten` führen beide
> `mitglied_id bigint NOT NULL` — der Verlauf gehört der MITGLIEDSCHAFT.
> Deshalb trägt `tab_verlauf` ein `nur_mitgliedschaft` und ist auf der Achse
> `ohne_mitgliedschaft` strukturell `aus`; die Karte „gibt es noch nicht" aus
> dem Supporter-Modal ist mit ihm gefallen.
>
> Die Frage bleibt offen: Bezugspunkt auf `person_id` umstellen (dann
> überlebt der Verlauf einen Austritt und die Rückkehr), oder beides
> nebeneinander führen. Das ist eine Migration und gehört in einen eigenen
> Auftrag.

Ebenfalls offen: `MemberHero` und `MemberDetail` liegen weiterhin unter
`modules/members/`. Der Umzug nach `src/shared/person/` (laut
`ARCHITECTURE.md` die Voraussetzung) ist **nachträglich** zu machen — die
Seite trägt beide Fälle bereits.

### Supporter-Liste überarbeiten

Der Tab steht (`SupporterListView`), aber Spalten, Filter und gespeicherte Ansichten sind nur das Nötigste:

- **Spalten**: heute Name, E-Mail, Telefon, PLZ/Ort, Portal-Zugang — aus `ALL_COLS` gezogen. `Eintritt` ist am 20.08.2026 entfallen: es kommt aus `mitglieder.eintrittsdatum` und ist bei einer Person ohne Mitgliedschaft strukturell leer, hätte also in **jeder** Zeile „-" gezeigt. Ein „dabei seit" für Supporter bräuchte eine eigene Angabe. Was sonst dazugehört (wie erreichbar, welche Anlässe, Beitrag?) ist nicht durchdacht.
- **Filter**: nur Portal-Zugang.
- **Gruppierung**: nur Portal-Zugang und Wohnort.
- **`savedViews`**: bewusst weggelassen — die Vorlagen „Standard" und „Verwaltung" bestehen aus Spalten, die es hier nicht gibt (Mitgliedschaft, Teams, Kaderrollen). Eigene Ansichten speichern funktioniert, `ListView` legt sie unter `viewTyp="supporter"` ab. Eigene Vorlagen fehlen.

Filter, Sortierung und Gruppierung laufen über dieselben Funktionen wie die Mitgliederliste (`filterMembers`, `sortMembers`, `buildGroups`) — ein Supporter **ist** eine `MemberRow`, seit dem Rückbau über `mapSupporter()` statt über eine Zeile in `mitglieder`. Das soll so bleiben; zu überarbeiten ist die Auswahl, nicht die Mechanik.

### `mitglieder_fairgate_id_key` ist global unique

Fairgate-Nummern werden **pro Verein** vergeben. Der Schlüssel steht aber auf
`UNIQUE (fairgate_id)` — beim zweiten Verein kollidieren `FG-00001` und
`FG-00001`. Gehört zu den dreizehn Schlüsseln, die am 05.08.2026 auf
`(verein_id, …)` umgestellt wurden, und ist durchgerutscht.

Umstellen auf `(verein_id, fairgate_id)`, bevor ein zweiter Verein dazukommt.

> **Korrigiert am 14.08.2026.** Hier stand, `api_verbindungen_key_key` sei
> „absichtlich global (ein API-Schlüssel ist ein Geheimnis und muss projektweit
> eindeutig sein)". Das war falsch: `api_verbindungen.key` ist kein Geheimnis,
> sondern der Name des Anschlusses — `fairgate`, `football_ch`, `fvrz`,
> `clubdesk`, `sfa`. Derselbe Wert wählt in `ApiTab` den Beschreibungstext aus
> `API_INFOS`. In der ganzen Tabelle steht kein Geheimnis; der Hinweis im Tab
> sagt es selbst („API-Keys werden aus Sicherheitsgründen nicht in der
> Datenbank gespeichert"). Wirkung des Fehlers: der erste Verein, der einen
> Anschluss anlegt, hätte ihn allen anderen weggenommen. Umgestellt auf
> `(verein_id, key)` mit `supabase/migration_api_verbindungen_mandant.sql`.
> Damit bleibt `mitglieder_fairgate_id_key` der letzte offene Fall —
> `api_verbindungen_key_key` war es also nicht der einzige.

### Von Hand gesetzte Rollen werden still überschrieben

Der Portal-Tab erlaubt, die Rolle direkt zu setzen — `updateMitgliedRolle()`
schreibt sie ohne Ableitung. Läuft danach `ableitUndSaveRolle()` (Kader-, Team-
oder Funktionsänderung), ist die Einstellung weg, ohne dass es jemand merkt.

Zu entscheiden: Gewinnt die Ableitung immer? Dann gehört das im Portal so
beschriftet — „gilt bis zur nächsten Änderung". Oder bleibt eine manuell
gesetzte Rolle? Dann braucht es ein Kennzeichen dafür.

### ✅ Was ein Mitgliedtyp hat — erledigt am 19.08.2026

Auftrag: `docs/auftrag_mitgliedtyp_konfig.md`. Alle vier Schritte geliefert.

Was ein Mitgliedsprofil zeigt, lag an vier Stellen verstreut. Jetzt an einer:
**`mitgliedtyp_feldkonfig`**, pro Mitgliedtyp und Schlüssel einer von drei
Werten — **Pflicht · Freiwillig · Gibt es nicht**. Der dritte blendet aus,
auch für die Verwaltung.

| war | ist |
|---|---|
| `mitgliedtyp_pflichtfelder` | `mitgliedtyp_feldkonfig` (`domains/members/feldkonfig.ts`) |
| `rolle_pflichtfelder` | **entfallen** — konnte nur addieren, nie wegnehmen |
| `getFieldVisibility()` | **bleibt** — sie meint die Rolle des *Betrachters* |
| `istSupporter` in `InfoTab` | **entfallen** — `istBereichSichtbar()` |
| `SUPPORTER_TYP` | **entfallen** — `mitgliedtypen.zaehlt_als_mitgliedschaft` |

**Eine fehlende Zeile bedeutet „freiwillig".** Gespeichert wird nur die
Abweichung; ein neuer Mitgliedtyp braucht keine einzige Zeile und zeigt
trotzdem ein vollständiges Profil. Das ist exakt das vorherige Verhalten —
es gab nie eine Rückfallliste.

**`getFieldVisibility` und die Konfiguration sind zwei Fragen**, nicht eine.
Was es bei diesem Mitgliedtyp *gibt*, sagt die Konfiguration; wer es *sehen
darf*, sagt die Rolle. `getSichtbarkeit()` in `memberUtils.tsx` verknüpft
beides, und die Reihenfolge ist die Aussage: **„Gibt es nicht" gewinnt gegen
jede Rolle.** Die Gegenrichtung bleibt — ein Trainer sieht die AHV-Nummer
weiterhin nicht. Die Rollen-Seite („wer sieht was bei anderen") wartet
unverändert auf die Gruppenrechte.

Drei der acht `fv.*`-Schalter waren **doppelt belegt** (`showPass`,
`showFairgateId`, `showNotizen`): sie regelten zugleich, wer etwas sehen darf
UND ob es das Feld überhaupt gibt. Die zweite Bedeutung hat jetzt „Gibt es
nicht". Ausserdem hingen Spielerpass und J+S-Nr. an *einem* Schalter — ein
Junior hat einen Pass und keine J+S-Nummer, ein Trainer umgekehrt.

**In der Neuanlage hing bis dahin die Sichtbarkeit am Pflicht-Häkchen**: was
nicht Pflicht war, liess sich beim Anlegen gar nicht erfassen. Jetzt ist ein
freiwilliges Feld sichtbar und darf leer bleiben.

`mitgliedtyp_pflichtfelder` und `rolle_pflichtfelder` stehen noch in der
Datenbank, werden aber von keiner Stelle mehr gelesen. Sie fallen in einer
eigenen Migration, wie `elternkontakte`. **17 verwaiste Zeilen** der alten
Tabelle (`Juniormitglied` 6, `Funktionär` 6, `Gönner` 5) sind bewusst nicht
mitgewandert — Reste des am 05.08.2026 behobenen Spaltenkopf-Defekts.

> ⚠ **`Gönner` ist hier ein protokollierter DATENWERT, keine Bezeichnung.**
> Er stand so in der Tabelle und bleibt so stehen; ihn zu „berichtigen" hiesse,
> den Befund zu fälschen. Wie der Verein die Sache nennt, steht unter „Was
> «Supporter» in diesem Verein heisst". Der
Fremdschlüssel auf `mitgliedtypen(id, verein_id)` verhindert beide Ursachen
künftig.

Migration: `supabase/migration_mitgliedtyp_feldkonfig.sql`.

### ✅ Die Pflichtfeld-Matrizen wirken — berichtigt am 22.08.2026

**Hier stand bis heute das Gegenteil der Wirklichkeit**, und das war
gefährlicher als jeder tote Zweig: der Abschnitt behauptete, die Datenprüfung
werte die Matrix nicht aus, und wer ihn las, hat danach nicht mehr
nachgesehen. Der beschriebene Zustand endete mit dem 19.08.2026 — der Text
blieb.

**Was tatsächlich läuft.** `DatenpruefungMitglied` bekommt die Pflichtfelder
aus der Matrix (`pflichtfelderFuer` → `pflichtfelderFuerZiel`), und zwar:

| | Zeile |
|---|---|
| nennt die fehlenden Felder **namentlich** | `DatenpruefungMitglied.tsx:286–289` |
| trennt „kann ich selbst" von „nur die Verwaltung" | 296–299 |
| **sperrt** den Bestätigen-Knopf, solange etwas Eigenes fehlt | 232, 259 |
| Knopftext deckt nur, was er kann: „Meine Angaben sind korrekt ✓" | 261 |

Die Elternseite seit dem 21.08.2026 genauso, über `personenStand()`.

⚠ **Und das Login-Overlay rendert genau diese Maske** — es ist keine dünne
Aufforderung, sondern die vollständige Datenprüfung in einem Modal
(`clubcampus.tsx`, Profil-Pflicht-Block). Die Felder sind darin ausfüllbar.
Damit sperrt auch das Overlay; siehe „Die AHV-Pflicht sperrt 381 Mitglieder
aus".

**Was von der alten Beschreibung stimmt:** `getProfilFehlend()` und
`markiereProfilGeprueft()` werden nach wie vor nirgends aufgerufen. Nur ist
das nicht die fehlende Wirkung — die kommt über `pflichtfelderFuer()` —,
sondern eine zweite, tote Rechnung daneben. Siehe den Punkt darunter.

### ⚠ Drei Rechnungen für dieselbe Frage — und 21 Tests hängen an der toten

Befund vom 22.08.2026. „Welche Pflichtfelder sind leer, und welche davon kann
die Person selbst füllen?" wird an **drei** Stellen beantwortet:

| | wo | |
|---|---|---|
| `getProfilFehlend()` | `domains/app/getProfilCheck.ts:145` | **tot** — kein Aufrufer im ganzen Portal |
| `fehlendSelbst` / `fehlendVerwaltung` | `DatenpruefungMitglied.tsx:225–231`, inline | lebendig |
| `personenStand()` | `DatenpruefungEltern.tsx:125` | lebendig |

Die beiden lebendigen trennen „selbst" von „Verwaltung" mit **verschiedener
Mechanik**: `personenStand` über die Mengen `DARSTELLBAR`/`GESPERRT`,
`DatenpruefungMitglied` über `k in form`. Zwei Wege zu derselben Aussage —
dasselbe Muster wie `hat_portal_zugang` gegen den Join.

⚠ **LÖSCHEN IST HIER NICHT AUFRÄUMEN, SONDERN DECKUNG VERLIEREN.** An
`getProfilFehlend()` hängen **21 von 30 Testfällen** in
`getProfilCheck.test.ts`:

| describe | Fälle |
|---|---|
| `getProfilFehlend` | 9 |
| `getProfilFehlend — Labels für die Anzeige` | 3 |
| `Elternteil ohne Mitgliedschaft` | 4 |
| `Kinder eines Elternteils` | 5 |

Sie prüfen Verhalten, das das Produkt **braucht** — „meldet ein fehlendes
Pflichtfeld des Kindes mit Namen davor", „richtet sich nach dem Mitgliedtyp
DES KINDES, nicht des Elternteils". Nur prüfen sie es an einer Funktion, die
niemand ruft. Wer die Funktion mit dem Satz „ist ja tot" entfernt, nimmt 70 %
der Datei mit und merkt es an keiner roten Zeile.

**Der Weg ist deshalb UMDREHEN, nicht löschen:** `getProfilFehlend()` wird die
eine Quelle, und die beiden Masken rufen sie. Dann sind die 21 Fälle wieder
Tests von etwas Lebendigem, und aus drei Rechnungen wird eine.

⚠ **Nicht gleichzeitig mit einer Änderung an der Matrix** (Entscheidung Didi,
22.08.2026): die Datenprüfung ist die Maske, die als nächstes 371 Familien
betrifft. Sie in derselben Woche umzubauen, in der ihre Konfiguration
geändert wird, macht jeden Fehler doppelt schwer zuzuordnen.

### ✅ Vier Mitgliedtypen verlangten alle zehn Felder — gelockert am 19.08.2026

**Erledigt.** Didi hat die Matrix in der neuen Oberfläche (Portalverwaltung →
Benutzer & Rollen → „Was ein Mitgliedtyp hat") von Hand durchgegangen. Der
Befund darunter ist **Archiv** und beschreibt den Stand *vor* dem Durchgang;
er steht hier, weil er erklärt, warum das Anschliessen von
`getProfilFehlend()` so lange warten musste.

Befund vom 19.08.2026, aus derselben Bestandsaufnahme. `FELDER_TYP` hat zehn
Einträge; so war `mitgliedtyp_pflichtfelder` gestellt:

| Mitgliedtyp | Pflicht | Freiwillig | ohne Zeile |
|---|---|---|---|
| Juniorenmitglied | **10** | 0 | 0 |
| Funktionär/in | **10** | 0 | 0 |
| Ehrenmitglied | **10** | 0 | 0 |
| Pausenmitglied | **10** | 0 | 0 |
| Aktivmitglied | 9 | 1 | 0 |
| Passivmitglied | 6 | 2 | 2 |
| Supporter | 7 | 0 | 3 |
| Freimitglied | 7 | 0 | 3 |

Die vier oberen verlangen jedes einzelne Feld, einschliesslich AHV-Nummer,
Nationalität, Heimatort und E-Mail. Ein Ehrenmitglied muss danach eine
AHV-Nummer haben. Der Stand vom 05.08.2026 hatte diesen Typen sechs Felder
gegeben (`migration_pflichtfelder_fein.sql`, Block B); seither ist erhöht
worden.

Wirksam ist das heute in der **Neuanlage**: ein Juniorenmitglied braucht zwölf
ausgefüllte Felder, bevor das Formular abschickt (zehn aus der Matrix plus
`vorname`/`nachname`).

**Die Oberfläche steht seit dem 19.08.2026** (Portalverwaltung → Benutzer &
Rollen → „Was ein Mitgliedtyp hat"). Die Migration hat die Zeilen wörtlich
übernommen — verlustfrei und verhaltensneutral —, das Lockern bleibt ein
Durchgang von Hand. „Gibt es nicht" hilft dabei nicht: zu viele Pflichtfelder
sind eine Pflicht/Freiwillig-Frage, keine Existenzfrage.

⚠ **Das war die Voraussetzung dafür, `getProfilFehlend()` anzuschliessen**
(Abschnitt darüber) — solange vier Typen zehn Pflichtfelder verlangten, wäre
danach kein Juniorenmitglied mehr durch die eigene Datenprüfung gekommen.
Mit dem Durchgang vom 19.08.2026 ist die Blockade weg.

### ⚠ Die AHV-Pflicht sperrt 381 Mitglieder aus — seit dem 19.08.2026, unbemerkt

Befund vom 22.08.2026. **Nicht mehr „die Prüfung prüft nichts" — das Gegenteil.**

Der Eintrag „Die Pflichtfeld-Matrizen wirken in der Datenprüfung gar nicht"
beschreibt einen Zustand, den es nicht mehr gibt. `DatenpruefungMitglied`
bekommt die Pflichtfelder seit dem 19.08.2026 aus der Matrix
(`pflichtfelderFuer`), nennt die fehlenden **namentlich**, trennt sie nach
„kann ich selbst" und „nur die Verwaltung", und **sperrt** den
Bestätigen-Knopf, solange etwas Eigenes fehlt. Die Elternseite seit dem
21.08. genauso (`personenStand()`).

**Das Login-Overlay rendert genau diese Maske.** Es ist keine dünne
Aufforderung, sondern die vollständige Datenprüfung in einem Modal — die
Felder sind darin ausfüllbar.

**Und damit sperrt es.** Wer ein Pflichtfeld nicht ausfüllen kann, kommt am
Overlay nicht vorbei; es bleibt nur *Abmelden*.

| Mitgliedtyp | AHV-Modus | aktiv | **ohne AHV** |
|---|---|---|---|
| **Juniorenmitglied** | **Pflicht** | 388 | **371** |
| **Aktivmitglied** | **Pflicht** | 120 | **9** |
| Passivmitglied | freiwillig | 1 | 1 |
| Ehren-, Pausen-, Freimitglied, Funktionär/in | — | 2 | 0 |
| | | **510** | **381** |

⚠ **371 der 381 sind Junioren.** Es verteilt sich nicht — es hängt an EINEM
Schalter: `Juniorenmitglied · ahv_nr`. Bei den Aktivmitgliedern fehlt sie 9
von 120, dort hat die Pflicht Deckung.

**Warum es niemand gemerkt hat:** es gibt **fünf** Portal-Konten. Die Maske
hat kaum einen Betrachter, und keiner davon ist Junior. Beim Ausrollen von
Konten stünden 371 Familien vor einer Wand — nicht als Fehler, sondern als
Regel, die jemand so eingestellt hat.

⚠ **DIE SPERRE WEGZUNEHMEN IST KEIN NEBENEFFEKT, SONDERN DER PREIS.** Heute
bestätigt niemand etwas, das er nicht ausgefüllt hat — `profil_geprueft_at`
ist eine Unterschrift mit Deckung. Ohne Sperre ist sie wieder eine ohne, und
der Zustand vor dem 19.08.2026 ist hergestellt: ein grünes Häkchen, das
nichts bedeutet. Das war der Grund, aus dem die Kette überhaupt angeschlossen
wurde.

**Die Entscheidung liegt deshalb in der MATRIX, nicht im Code** (Didi,
22.08.2026): ob die AHV-Nummer für alle Mitgliedtypen Pflicht sein soll oder
nur dort, wo der Spielbetrieb sie verlangt. Steht `Juniorenmitglied · ahv_nr`
auf freiwillig, schrumpft das Problem von 381 auf 10 — eine Grösse, die die
Verwaltung von Hand erledigt, und die Sperre darf bleiben, wie sie ist.

Zum Nachzählen:

```sql
select t.name, coalesce(k.modus,'(freiwillig)') as ahv,
       count(m.id) as aktiv, count(m.id) filter (where coalesce(p.ahv_nr,'')='') as ohne
  from public.mitgliedtypen t
  left join public.mitgliedtyp_feldkonfig k on k.mitgliedtyp_id=t.id and k.schluessel='ahv_nr'
  left join public.mitglieder m on m.mitgliedtyp=t.name and m.aktiv
  left join public.personen p on p.id=m.person_id
 where t.aktiv group by 1,2 order by 4 desc;
```

### ⚠ `api_verbindungen.active` und `auto_sync` — zwei Kennzeichen, zwei Leser

Befund vom 20.08.2026, beim ersten Lauf von Hand aufgefallen.

| Spalte | wer liest sie | wer nicht |
|---|---|---|
| `active` | **nur die Oberfläche** — Stecker-Symbol, Häkchenliste, der Knopf „Sync starten" in `ApiTab` | die Edge Function prüft sie **nirgends** |
| `auto_sync` | **nur `sfv-sync/index.ts`**, und dort nur der Cron-Pfad (`if (perZeitplan)`) | die Oberfläche zeigt sie nicht an |

**Was daraus folgte.** `migration_sfv_spielplan.sql` legt den Eintrag mit
`active = false` an („bleibt false, bis die Edge Function steht") — und
niemand hat ihn nachgezogen, als sie stand. Sechs Tage lang zeigte die Kachel
einen grauen Stecker für einen Anschluss, der **stündlich lief**. Schlimmer:
der Knopf `Sync starten` hängt an `active` und hat deshalb nie gerendert.
Beim Abschalten von `auto_sync` für den ersten Lauf von Hand gab es damit
überhaupt keinen Auslöser mehr — der Cron fand nichts, und von Hand ging es
nicht.

**Dasselbe Muster wie `hat_portal_zugang`** gegen den Join auf `benutzer`
(in Etappe 6c aufgelöst): zwei Stellen behaupten dieselbe Sache, eine davon
veraltet, und die Abweichung fällt erst auf, wenn jemand sich auf die falsche
verlässt. Die Lehre ist dieselbe — **eine Aussage, ein Ort.**

**Zu entscheiden, zusammen mit der API-Kachel insgesamt:**

- `active` in der Edge Function mitprüfen — dann heisst es wirklich
  „Anschluss aus" und schaltet auch den Cron ab. Dann braucht `auto_sync`
  eine eigene, engere Bedeutung („stündlich statt nur von Hand") oder fällt weg.
- Oder `active` auf reine Anzeige beschränken und im Tab so benennen, dass
  niemand es für einen Schalter hält.

Bis dahin: **nach jeder Änderung an der Edge Function prüfen, ob `active`
noch stimmt.** Zum Nachsehen:

```sql
select key, active, konfiguriert, auto_sync, letzter_sync
  from public.api_verbindungen where key = 'football_ch';
```

Steht dort ein frisches `letzter_sync` bei `active = false`, ist das der Beleg,
dass die Spalte reine Anzeige ist.

### Zwei Komponenten stehen noch innerhalb einer anderen

Befund vom 21.08.2026, beim Herausziehen von `RolleField`. Die Regel dazu
steht oben unter Konventionen; hier die zwei, die noch offen sind.

**`MitgliedtypFelderSektion` — `ModusSchalter`, `AnAusSchalter`, `Zeile`.**
Die relevantere der beiden: es ist die Oberfläche, mit der die
Feldkonfiguration bedient wird — pro Mitgliedtyp und Schlüssel ein Dreifach-
Schalter. Jeder Klick löst einen Render aus, und jeder Render montiert alle
drei Komponenten neu. Für die Maus fällt das kaum auf; wer mit der Tastatur
durch die Matrix geht, verliert nach jeder Änderung die Position.

**`TrainingsplanModul` — `Btn2`.** Drei Verwendungen, ein Knopf, geringste
Wirkung. Steht hier nur der Vollständigkeit halber.

Beides ist ein kleiner Umbau: Komponente nach oben ziehen, die gelesenen
Werte als Props durchreichen. Nicht dringend, aber billig — und `RolleField`
hat gezeigt, dass dabei ein übersprungener Test zurückkommen kann.

### ✅ Zwei Tests entschieden sich nach Rechnerlast — behoben am 22.08.2026

`datenpruefungEltern` und `datenpruefungMitglied` liefen im vollen Durchgang
in den 5-Sekunden-Timeout, einzeln aber in zwei Sekunden. Damit hiess **rot
zwei Dinge** — Defekt oder langsamer Rechner —, und wer die beiden
verwechselt, verliert immer dieselbe von beiden: wenn rot manchmal folgenlos
ist, wird neu gestartet, bis es grün ist.

**Die Ursache war nicht die Parallelität, sondern die Menge.** `vite.config.js`
setzte `environment: 'jsdom'` **global**. Von 47 Testdateien brauchen aber nur
**14** einen DOM — die Komponententests, alle `.jsx`. Die anderen 33 sind reine
Logik und bezahlten trotzdem für eine jsdom-Instanz. In der Ausgabe war
`environment` mit 428–485 s die grösste Position, während die Tests selbst
70 s brauchten.

Jetzt ist `node` die Vorgabe, und wer einen DOM braucht, sagt es oben in
seiner Datei:

```js
// @vitest-environment jsdom
```

⚠ **Keine feste `maxWorkers`-Zahl, und das war die eigentliche Frage.** Sie
hätte auf dieser Maschine (22 Kerne) etwas anderes bedeutet als in der
Prüfkette (`ubuntu-latest`, 4 Kerne) — dort eine Bremse, hier eine
Verschwendung. **Weniger Arbeit schlägt anders verteilte Arbeit.** Und
`environmentMatchGlobs` schied aus: in Vitest 3 abgekündigt. Der Vermerk in
der Datei steht dort, wo er gilt, und überlebt jeden Umbau der Konfiguration.

**Gemessen, nicht gehofft:**

| | vorher | nachher |
|---|---|---|
| die zwei Fälle unter voller Last | 7163 ms · 7144 ms | **912 ms · 1181 ms** |
| `environment` der 33 Logikdateien | Anteil an ~500 s | **13 ms** |
| `tests` gesamt | 70 s | 25 s |
| drei Durchgänge hintereinander | 1 von 2 rot | **3 von 3 grün** |

Die Wanduhr ändert sich kaum (~40 s): die 14 jsdom-Dateien laufen ohnehin
parallel und bestimmen sie. Es ging nie um Geschwindigkeit, sondern darum,
dass rot wieder eine Bedeutung hat.

### ⚠ Der Portal-Zugang wird an drei Spalten gemessen — Rest von F2

Befund vom 21.08.2026, beim Umbau der Personenseite. **Die Hälfte ist
behoben, die andere steht.**

Gesperrt wird der Login allein durch **`benutzer.aktiv`** — `useDbUser` meldet
ab, wenn es `false` ist. Alles andere ist Verknüpfung, keine Sperre.

**Behoben:** `portalZugangDeaktivieren()` setzte `mitglied_id = null` und
filterte über `person_id`. Bei einer Person **ohne** Mitgliedschaft stand dort
schon null — geschrieben wurde null über null, gelesen wird über `person_id`,
und der Tab meldete „Zugang deaktiviert" und zeigte danach unverändert
„Aktiv". Und beim Mitglied sperrte es den Login gar nicht. Beide Funktionen
schalten jetzt `aktiv` und heissen `portalZugangDeaktivieren` /
`portalZugangReaktivieren`; die Verknüpfung bleibt, wo sie ist. Ein Konto von
seiner Person zu **trennen** wäre eine andere Aktion, und es gibt heute keine,
die sie verlangt. *(Entschieden am 21.08.2026, Didi.)*

**Offen bleibt die Anzeige.** `useAppData.loadDbMitglieder()` baut
`hat_benutzer` und `benutzer_deaktiviert` über **`mitglied_id`** auf:

```js
(benutzerRes.data || []).forEach(b => {
  if (b.mitglied_id) benutzerMap[b.mitglied_id] = { … };   // ← ohne Mitgliedschaft: nie
});
```

Daraus folgen zwei Dinge:

- Eine Person ohne Mitgliedschaft steht in dieser Liste ohnehin nicht; ihr
  Portal-Status kommt aus `fetchSupporter`/`fetchAlleElternkontakte`, die über
  `person_id` lesen. Zwei Wege zu derselben Aussage — dasselbe Muster wie
  `hat_portal_zugang` gegen den Join (in Etappe 6c aufgelöst).
- **`onUpdatePortalZugang(mitgliedId, aktiv)` erreicht sie nicht.** Es ist der
  einzige Aufrufer, der `aktiv` beim Archivieren und Reaktivieren mitführt,
  und seine Signatur beginnt mit einer Mitglieds-Id.

Zusammenlegen, sobald jemand die Liste anfasst: eine Aussage, ein Ort — und
das ist `benutzer.person_id`.

### ⚠ „Mein Kind" zeigt einem Elternteil HEUTE Demodaten

Befund vom 20.08.2026, beim ersten echten Elternkonto.

```ts
// clubcampus.tsx
const myRosterId = account.rosterId || (role==="spieler"?1 : role==="eltern"?1 : …);
```

Für ein Elternteil ist das eine **fest verdrahtete 1** aus `demoData.js`.
Dazu `meineTeams = []` — die Teams kommen aus `teamRollen`, und die füllt
`useDbUser` nur bei gesetztem `mitglied_id`. `TeamView` fällt bei leerer Liste
auf `ROSTER` und `trainerTeams = ["Cc-Junioren"]` zurück.

**Der Menüeintrag heisst „Mein Kind" und zeigt ein fremdes.** Der Text ist ein
statischer Eintrag in `NAV_BY_ROLE`; die App weiss vom echten Kind nichts.

⚠ **Das ist schlimmer als ein fehlender Eintrag.** Wer eine leere Seite sieht,
meldet sie. Wer eine gefüllte sieht, hält sie für richtig — und beim ersten
Test hat sie genau deshalb den Verdacht in die falsche Richtung gelenkt: die
Datenprüfung sagte „keine Kinder", „Mein Kind" zeigte eines, also schien der
Fehler bei der Datenprüfung zu liegen. Beide fanden das Kind nicht; eines sah
nur so aus.

Bis das echte Team hängt: entweder den Eintrag für `eltern` ausblenden oder
den Fallback auf `ROSTER` durch eine Karte ersetzen, die sagt, dass die
Anbindung fehlt. Ein Platzhalter, der wie eine Funktion aussieht, ist keine.

### ✅ Die cc.css-Dubletten sind weg — und eine davon war der Beleg

Zwölf Klassen standen doppelt (Stand 05.08. und unverändert bis
22.08.2026), dazu vier zusammengesetzte Selektoren. **Alle aufgelöst am
22.08.2026**, geprüft mit einem Parser, der Blöcke zählt statt Zeilen: **0
Dubletten**, auch bei `:hover` und im Dunkelmodus.

⚠ **DAS ARGUMENT GEGEN DUBLETTEN STEHT IN `cc-mb-*`, und es ist schärfer als
„es könnte mal falsch werden".** Drei Klassen derselben Familie, und **eine
verhielt sich anders als die zwei anderen**:

| Klasse | frühe Definition | späte | **galt** |
|---|---|---|---|
| `cc-mb-4` | Zeile 154 (ohne) | **226 (`!important`)** | **mit** |
| `cc-mb-8` | 226 (`!important`) | **731 (ohne)** | **ohne** |
| `cc-mb-16` | 226 (`!important`) | **801 (ohne)** | **ohne** |

`cc-mb-4` stach Komponentenregeln, `cc-mb-8` und `cc-mb-16` nicht — **allein
weil die spätere Definition zufällig woanders stand.** Niemand hat das
entschieden, und niemand konnte es sehen: die drei stehen in derselben Zeile
nebeneinander im Code und sahen dort gleich aus.

Jetzt trägt die ganze Familie kein `!important` mehr. Gemessen vor dem
Entfernen: **kein einziger Verwender** konkurriert mit einer
`margin-bottom`-Regel, das `!important` war überall wirkungslos. (Hätte einer
es gebraucht, wäre das der eigentliche Befund gewesen — dann läge der Fehler
in der Komponentenregel, nicht im Abstand.)

**Was sonst entschieden wurde**, jeweils mit dem Bild als Massstab:

| Klasse | | |
|---|---|---|
| `cc-hero-back` | identische Dublette | gelöscht, Bild unverändert |
| `cc-btn-ghost` | die **gerahmte** Fassung war tot — die spätere überschrieb sie für **alle acht** Verwender | gelöscht, Bild unverändert |
| `cc-btn-success` / `-danger` | je **ein** Verwender (`PortalTab`, vollbreite Knöpfe) | die kleine 12px-Fassung gelöscht, die grosse galt ohnehin |
| `cc-check-icon` | zwei Grüntöne — und die späte verlor `flex-shrink:0` | **Farbe zusammengeführt**: dunkleres Grün UND `flex-shrink:0`. Eine Farbänderung, die niemand bestellt hat, gehört nicht in einen Aufräum-Durchgang |
| `cc-ml-toolbar` | die zweite ergänzte nur | zusammengelegt |
| `cc-ml-view-custom`, `cc-table-wrap-inner` | Redigierreste | die ärmere gelöscht |
| `cc-role-chip-trainer` | zwei Brauntöne, hell und dunkel | je der spätere behalten, im Hell- **und** Dunkelmodus gleich entschieden |

⚠ **`cc-btn-ghost` war keine Wartung, sondern eine Entscheidung — und der ORT
hat sie beantwortet, nicht die Klasse.** Von acht Verwendern sitzen zwei im
Eingabefeld (AHV-Auge, `position:absolute`) und vier in einer
Abschnittsüberschrift; alle sechs brauchen den randlosen Knopf. Zwei stehen
neben anderen Knöpfen, und nur einer davon — `PlatzhalterModul`, Sekundär
neben Primär — wollte den gerahmten. Der nimmt jetzt `<Btn variant="outline">`,
die Komponente, die es dafür längst gab.

**Zum Nachprüfen** (Zeilen zu zählen genügt nicht — mehrere Regeln stehen auf
einer Zeile, und `@media`-Inhalt zählt nicht mit):

```bash
python - <<'EOF'
import io, re, collections
s = re.sub(r"/\*.*?\*/", "", io.open("src/styles/cc.css", encoding="utf-8").read(), flags=re.S)
vor = collections.Counter(); i = 0; n = len(s); ss = 0
while i < n:
    if s[i] == "{":
        sel = s[ss:i].strip(); t, j = 1, i+1
        while j < n and t:
            t += (s[j] == "{") - (s[j] == "}"); j += 1
        if not sel.startswith("@"):
            for x in (y.strip() for y in sel.split(",")):
                if x: vor[re.sub(r"\s+", " ", x)] += 1
        i = j; ss = j; continue
    i += 1
print({k: v for k, v in vor.items() if v > 1} or "0 Dubletten")
EOF
```

### ⚠ Zwei Schreibwege der Portalverwaltung treffen null Zeilen und melden Erfolg

Befund vom 23.08.2026, **gemessen gegen die laufende Datenbank**, als
`authenticated` mit der Identität eines echten Admins, in einer
zurückgerollten Transaktion.

`vereine` hat RLS an und genau **zwei** Policies — beide `FOR SELECT`. Für
UPDATE gibt es keine:

```
update vereine set theme = … where id = <eigener Verein>   →  0 Zeilen
dieselbe Anweisung ohne where                              →  0 Zeilen
```

**PostgREST antwortet darauf `204 No Content` ohne Fehler.** Der Code liest
`error` — vorbildlich — und `error` ist `null`. Also:

| Stelle | zeigt | tut |
|---|---|---|
| `AussehenTab` → Speichern | **„Theme gespeichert ✓"** | nichts |
| `AussehenTab` → Standard wiederherstellen | **„Standard gespeichert ✓"** | nichts |
| `PersonenartenSektion` → Austrittsziel | kein Fehler | nichts |

⚠ **`error` zu lesen genügt hier nicht.** Die Regel „wer eine Abfrage
schreibt, liest `error`" ist richtig und hat hier nichts gefangen: eine
Änderung, die niemanden trifft, ist für PostgREST kein Fehler. Wer wissen
will, ob geschrieben wurde, muss **zählen** — `select: "id"` und die Länge der
Antwort, oder `count: "exact"`. Ein `update()`, dessen Ergebnis niemand
ansieht, ist eine Behauptung.

⚠ **UND ES VERSCHWINDET SPURLOS.** Die Oberfläche zeigt den neuen Wert sofort
aus dem React-State und legt ihn in `localStorage["cc-theme"]` ab; beim
nächsten Laden wird er als Flicker-Schutz zuerst angewendet. Dann überschreibt
`loadTenant()` ihn mit dem Wert aus der Datenbank — **und löscht die
localStorage-Kopie gleich mit** (`useAppData.js:35`). Die Änderung ist also
nicht nur ungespeichert; nach einem harten Neuladen ist auch die Kopie weg.

**Deshalb ist die Realtime-Verteilung des Brandings nie ausgelöst worden.** Die
Subscription auf `UPDATE vereine` steht und funktioniert — nur hat das Portal
in dieser Tabelle noch nie eine Zeile geändert. Ein Mechanismus, der auf ein
Ereignis wartet, das es nicht geben kann.

**Der Durchgang über alle 34 aus `src/` beschriebenen Tabellen fand genau
diesen einen Fall.** `vereine` ist die einzige. Zum Wiederholen:

```sql
select cl.relname,
       count(*) filter (where p.cmd in ('INSERT','ALL')) as ins,
       count(*) filter (where p.cmd in ('UPDATE','ALL')) as upd,
       count(*) filter (where p.cmd in ('DELETE','ALL')) as del
  from pg_class cl
  join pg_namespace n on n.oid = cl.relnamespace and n.nspname='public'
  left join pg_policies p on p.schemaname='public' and p.tablename = cl.relname
 where cl.relkind='r' and cl.relrowsecurity
 group by 1 order by 1;
```

**Bereit, nicht ausgeführt:** `supabase/migration_vereine_schreibrecht.sql`.
Probelauf mit `rollback` gemacht — danach 1 Zeile statt 0, für beide Spalten.

⚠ **Die Reparatur ist eine SPALTEN-Allowlist, kein Pauschalrecht.** Eine blosse
UPDATE-Policy gäbe jedem Vereinsadmin auch `vereine.slug` — und der Slug ist
seit dem 23.08.2026 die Quelle des Linkziels in der Einladungs-Mail
(`invite-user`). Wer ihn setzen kann, bestimmt, wohin ein Anmeldelink führt.
**Genau dieser Ausgang ist am selben Tag geschlossen worden; er darf nicht
durch die Reparatur wieder aufgehen.** Die Migration entzieht deshalb UPDATE
und vergibt es spaltenweise neu (`theme`, `austritt_art_id`); im Probelauf
wurde ein `update … set slug` mit `42501 permission denied` abgewiesen.

### ⚠ 84 Schreibstellen ohne Gegenprobe — die andere Richtung

Befund vom 23.08.2026. Der erste Durchgang fragte: *wo fehlt die Policy ganz?*
Antwort: einmal (`vereine`). Der zweite fragt das Schwierigere: **wo gibt es
eine Policy, aber ihre Bedingung kann eine Zeile ausschliessen — und der Code
merkt es nicht, weil er nur `error` liest?**

**132 Schreibstellen in `src/`, 122 davon unter einer Bedingung, die mehr
verlangt als die Zugehörigkeit zum Verein. 84 davon zählen nicht nach.**

⚠ **Das sind KEINE 84 Defekte, und wer die Zahl so weitergibt, macht die
Liste wertlos** — dieselbe Falle wie die 758 Lint-Warnungen. Bei den meisten
lautet die Bedingung `is_admin()`, und die Maske ist ohnehin nur für Admins
erreichbar; dort ist der fehlende Nachweis eine Vorsichtslücke, kein Ausfall.
**Die Frage, die zählt, ist nicht „prüft der Code nach?", sondern „kann jemand
diese Maske erreichen, den die Policy abweist?"** Danach sortiert:

| | Bedingung | wer die Maske erreicht | |
|---|---|---|---|
| **1** | `kader_write`: `get_my_role() IN (administrator, administration, trainer)` | ein **Funktionär** mit `team: schreiben` aus den Gruppenrechten | ⚠ **wird abgewiesen** |
| **2** | `ansichten_write`: `benutzer_id = auth.uid() OR is_admin()` | jeder, dem eine **geteilte** Ansicht angezeigt wird | ⚠ Löschen/Ändern läuft ins Leere |
| **3** | `is_admin()` (≈60 Stellen) | die UI prüft `role === "administrator"`, die Policy `benutzer.ist_admin` | zwei Quellen, heute einig |

**Zu 1 — und es ist kein Einzelfall, sondern ein Muster.** `trainings_write`
führt `funktionaer` in seiner Liste, `kader_write` nicht. Ob das Absicht war,
steht nirgends. Der Funktionär kann die Kader-Maske über die Gruppenrechte
bekommen, und dann tut jedes Speichern nichts. **Dieselbe Familie wie der
schon vermerkte Übergang `get_my_role() = 'trainer'` in
`spiel_ereignisse_write`** — Rollennamen fest in Policies, während die Rechte
in der Oberfläche längst aus Gruppen kommen. Fällt mit den Gruppenrechten weg
(`docs/auftrag_rls_gruppenrechte.md`).

**✅ Zu 2 — der Lese-Teil ist repariert.** `ansichten_select` gab fremde
Ansichten nur frei, wenn `ist_standard = true` — **die Spalte, die das Teilen
steuert, heisst aber `geteilt`**. Die Liste FRAGT nach geteilten Ansichten
(`memberService.ts:345`), und `useListView.ts:372` rendert eine eigene Gruppe
„Geteilte Ansichten"; RLS filterte sie vorher weg. Kein Fehler, keine leere
Meldung — nur eine Gruppe, die nie erschien.

Gemessen im Probelauf, als Nicht-Autor: **vorher 0 sichtbare Ansichten,
nachher 2** — und die private des Autors bleibt privat.
`migration_ansichten_geteilt.sql`, 23.08.2026. `ist_standard` wurde dabei
**ersetzt, nicht ergänzt**: die Spalte hat im ganzen Portal keinen Leser und
keinen Schreiber, und eine Bedingung, die nie zutrifft, bleibt sonst als
vermeintlicher Teilen-Schalter stehen.

⚠ **Die Schreib-Hälfte bleibt offen und liegt bei den Gruppenrechten**: ob
ein Nicht-Autor eine geteilte Ansicht auch ändern darf, ist eine Rechtefrage,
keine Reparatur.

**Zu 3 — heute einig, und das ist keine Absicherung.** Gemessen: 5 Konten, das
eine mit `ist_admin = true` hat auch `role = 'administrator'`, die vier
anderen beides nicht. Aber `role` ist ein **berechneter** Wert
(`ableitUndSaveRolle()`), `ist_admin` ein gesetztes Kennzeichen — sie wurden
am 05.08.2026 ausdrücklich getrennt. Läuft eines dem anderen davon, sieht ein
Admin seine Maske und jeder Klick darin verpufft.

⚠ **Und der Lese-Teil hatte heute keinen Nutzniesser** — nachgemessen, nachdem
ich ihn als „behoben, wirkt" gemeldet hatte. Der gemessene Nicht-Autor war ein
`funktionaer`, und `funktionaer` hat in `NAV_BY_ROLE` keinen Eintrag `members`;
`mitglieder_ansichten` wird nur in `ListView` geladen, und die steht nur unter
`members`. Beide Rollen, die dorthin kommen (`administrator`,
`administration`), waren über `is_admin()` — das `ist_admin OR role =
'administration'` prüft — ohnehin schon abgedeckt.

**Eine Policy-Messung beantwortet „wer DARF?", nicht „wer KOMMT HIN?".** Die
zweite Hälfte steht nicht in der Datenbank, sondern in `NAV_BY_ROLE`,
`isModuleVisible()` und den Tab-Bedingungen. Die ausführliche Fassung samt
beider Fehlerrichtungen steht in `docs/auftrag_rls_gruppenrechte.md` → „RLS zu
messen ist nicht dasselbe wie Erreichbarkeit zu messen".

**Die drei übrigen sind EIN Befund, nicht drei** — überall steht ein
Rollenname fest in der Policy, während das Recht in der Oberfläche aus einer
Gruppe kommt. Sie stehen deshalb seit dem 23.08.2026 in
`docs/auftrag_rls_gruppenrechte.md` → „Vier Policies nennen Rollennamen",
zusammen mit dem schon vermerkten `spiel_ereignisse_write`. Hier nicht
doppelt führen.

**Der Durchgang zum Wiederholen** liegt nicht als Skript im Repo (er braucht
eine Datenbankverbindung, die die Prüfkette nicht hat). Die beiden Abfragen
stehen im Eintrag darüber; der Rest ist ein Abgleich der Schreibstellen aus
`src/` gegen `pg_policies`.

### Die Supporter-Liste zeigt eine gelöschte Person weiter

Befund vom 23.08.2026, beim ersten scharfen Löschlauf. Nach „Person löschen
(DSGVO)" stand der Eintrag noch in der Liste — bis zum Neuladen, dann
`7 von 7`.

`onPersonGeloescht` in `MemberDetail` ruft `onClose(); onReload();`, und
`onReload` lädt **`dbMitglieder`** neu. Die Supporter-Liste hat aber ihren
eigenen Abruf (`fetchSupporter`), und der Eltern-Tab ebenso
(`fetchAlleElternkontakte`). Beide bekommen davon nichts mit.

⚠ **Es ist die harmlose Hälfte eines Musters, das schon zweimal teuer war:**
eine Anzeige, die nach einer Handlung stehenbleibt, ist von einer Handlung,
die nicht stattgefunden hat, nicht zu unterscheiden. Hier hat die Person
tatsächlich aufgehört zu existieren — beim nächsten Mal könnte es umgekehrt
sein.

Zu tun: entweder bekommt `MitgliederModul` einen Auffrischer, der **alle
drei** Listen kennt, oder die Listen laden bei einem Wechsel des Tabs neu.
Die zweite Lösung ist billiger und deckt auch die Fälle ab, die niemand
verdrahtet hat.

### ⚠ `redirect_to` kennt den Verein nicht — zwei von drei Wegen

Befund vom 23.08.2026, beim Nachmessen der Redirect-Allowlist.

| Vorgang | Ziel | Slug dabei? |
|---|---|---|
| Einladung (`invite-user`) | `https://www.clubcampus.app/<slug>` | **ja**, aus `vereine.slug` |
| Passwort zurücksetzen (`LoginScreen.tsx:86`) | `window.location.origin` | **nein** |
| Registrierung bestätigen (`LoginScreen.tsx:67`) | keins gesetzt → Site-URL | **nein** |

Die blosse Wurzel wird per `vercel.json` auf `/fcherrliberg` umgeleitet. **Wer
beim zweiten Verein sein Passwort zurücksetzt oder seine Registrierung
bestätigt, landet also im FCH-Portal** — nicht als Fehler, sondern als 307.

⚠ **Die Redirect-Allowlist bei Supabase fängt das nicht ab**, im Gegenteil:
sie lässt beide Ziele durch, weil beide stimmen. Es ist kein
Konfigurationsproblem, sondern eines im Code — und es trifft ab dem zweiten
Verein sofort, ohne dass etwas fehlschlägt.

Zu tun: beide Aufrufe bekommen den Slug mit, so wie `invite-user` ihn hat.
Beim Zurücksetzen steht er im Pfad (`getSlugFromPath()`), bei der
Registrierung ebenso — die Anmeldemaske läuft bereits unter `/<slug>`.

⚠ **Und ein Ziel muss zusätzlich in der Supabase-Redirect-Allowlist stehen**
(Auth → URL Configuration). Steht es nicht drin, verschickt Supabase die Mail
**trotzdem** — nur mit der Site-URL statt des Ziels. Kein Fehler, keine
Meldung. Eingetragen am 23.08.2026: `https://www.clubcampus.app` (die nackte
Adresse, für das Zurücksetzen) und `https://www.clubcampus.app/*` (ein
Pfadsegment, für die Einladung). Ein Platzhalter spannt über **Pfade, nie über
Hosts** — `https://*.vercel.app` wäre eine Preisgabe, dort kann jeder
deployen.

### ⚠ Der Bucket `mitglieder-fotos` ist für jeden eingeloggten Benutzer offen

Befund vom 21.08.2026, beim Umstellen des Fotopfads auf `person_id`.

```sql
select policyname, cmd, qual from pg_policies
 where schemaname='storage' and tablename='objects';
```

```
mitglieder_fotos_select | SELECT | (bucket_id = 'mitglieder-fotos')
mitglieder_fotos_update | UPDATE | (bucket_id = 'mitglieder-fotos')
mitglieder_fotos_upload | INSERT |
```

**Die drei Policies prüfen nur den Bucket — weder den Pfad noch den Verein.**
Jeder eingeloggte Benutzer kann damit **jedes Foto jedes Vereins** lesen,
überschreiben und neue hochladen. Dieselbe Familie wie
`mitglieder_select_priv`, nur ausserhalb von `public`.

**Genau deshalb ist es so lange unbemerkt geblieben:** `storage.objects` liegt
nicht in `public` und steht damit in **keinem** `schema.sql` — einer der vier
blinden Flecken (siehe `ARCHITECTURE.md` → „`schema.sql` baut die Datenbank
NICHT nach"). Wer die Rechte des Portals prüft, findet den Bucket nicht, weil
er nirgends im Dump vorkommt.

**Wirkt heute begrenzt, weil es nur einen Verein gibt.** Es blockiert aber —
wie die Gruppenrechte — einen externen Pilotverein: ab dem zweiten Mandanten
ist es eine echte Preisgabe. Gehört zu `docs/auftrag_rls_gruppenrechte.md`.

> **Der neue Pfad macht die spätere Policy leichter.** Seit dem 21.08.2026
> liegen Fotos unter `<person_id>/foto.<ext>` statt `<mitglied_id>/`. Eine
> Policy kann damit über `personen.verein_id` filtern — ein direkter Weg vom
> Pfadsegment zum Mandanten. Über `mitglied_id` wäre es ein Umweg über
> `mitglieder`, und für Personen ohne Mitgliedschaft gäbe es gar keinen.

### ⚠ Ein Trainer kann 914 Adressen und AHV-Nummern exportieren

Befund vom 22.08.2026, beim Messen für den Listen-Auftrag. **Der bisher
schärfste Beleg für `docs/auftrag_rls_gruppenrechte.md`** — drei Schichten,
die einander schützen sollten, und keine tut es.

**1 · Die Datenbank gibt alles frei.**

```
personen_select_priv | SELECT | verein_id = get_my_verein_id()
                     |        | AND get_my_role() IN ('administrator','administration','trainer','funktionaer')
```

Jede Zeile, jede Spalte. Nicht die Eltern der eigenen Junioren — **alle 914
Personen des Vereins**, mit Adresse, Geburtsdatum, AHV-Nummer, Nationalität
und Heimatort. Die zwei engen Policies daneben (`personen_select_self`,
`personen_select_kind`) schränken nichts ein: RLS ist **additiv**.

**2 · Die Feldsichtbarkeit erreicht keine Liste.** `getFieldVisibility()` —
die Funktion mit `showAdresse: lvl >= 5`, `showGebdat: lvl >= 3`, `showAhv`
nur Verwaltung — wird an **genau einer Stelle** aufgerufen:
`MemberDetail.tsx:188`, also auf der Profilseite. In `MitgliederModul`,
`ElternListView`, `SupporterListView` und `ArchivView` kommt kein einziges
`fv.` vor. **Die Mitgliederliste führt AHV-Nummer, Geburtsdatum und Adresse
als Spalten — ohne jede Rollenprüfung.**

**3 · ⚠ Und deshalb beruhigt der Export-Satz nicht.** „Der Export nimmt genau
die sichtbaren Spalten mit" stimmt — `exportListData(rows, cols, …)` bekommt
`cols` aus der Ansicht. Aber der Satz schützt nur, solange die **Anzeige**
gefiltert ist, und sie ist es nicht. Wer an eine Liste kommt, exportiert
**914 Adressen und AHV-Nummern in eine Datei** — CSV oder Excel, drei Klicks,
kein Protokolleintrag.

Heute hält allein die Oberfläche: der Eltern-Tab hängt an
`istVerwaltung = role === "administrator" || role === "administration"`, ein
Trainer sieht ihn nicht. **Das ist eine Sichtbarkeitsregel im Frontend, keine
Rechteprüfung.** Über die API steht ihm dieselbe Menge offen, und in der
Mitgliederliste, die er sehr wohl erreicht, hält ihn ohnehin nichts auf.

Zu tun ist beides, und in dieser Reihenfolge: `personen_select_priv` auf das
einengen, was eine Rolle wirklich braucht (das ist der Gruppenrechte-Auftrag,
weil eine Rollenleiter dafür nicht taugt — der Trainer braucht die Handynummer
seiner Junioren, der Kassier nicht), und `getFieldVisibility` an die Listen
anschliessen. Das Zweite allein wäre ein Versprechen ohne Deckung — im Portal
ausgeblendet, über die API sichtbar. Genau der Grund, aus dem die Seite „Wer
sieht was bei anderen" zurückgestellt wurde.

### ⚠ `is_trainer_or_above()` prüft einen Rollennamen, den es nicht gibt

Befund vom 19.08.2026.

```sql
select role in ('administrator','administration','funktionär','trainer')
```

**`funktionär` mit Umlaut** — die Rollen-Keys sind aber normalisiert
(`funktionaer`, siehe `roleUtils.ts:19` und `portal_rollen`). Der Zweig
trifft nie zu; ein Funktionär gilt für diese Funktion als nicht berechtigt.

**Wirkt heute nicht.** Die Funktion ist definiert und an `anon`,
`authenticated` und `service_role` freigegeben, steht aber **in keiner
Policy**. Genau das macht sie gefährlich: ein Loch, das keine Fehlermeldung
erzeugt: Wer sie das nächste Mal in einer Policy verwendet, bekommt eine
Prüfung, die stiller strenger ist als gedacht — Funktionäre kommen nicht
durch, und niemand sieht warum.

**Reparieren oder streichen gehört zum Gruppenrechte-Auftrag**
(`docs/auftrag_rls_gruppenrechte.md`), der die Rollenprüfungen ohnehin
anfasst. Bis dahin: nicht verwenden. `migration_matchdaten.sql` umgeht sie
bewusst und vermerkt den Grund.

### ⚠ Übergang: `get_my_role() = 'trainer'` in `spiel_ereignisse_write`

Eingebaut am 19.08.2026 mit `migration_matchdaten.sql`:

```sql
is_admin() or get_my_role() = 'trainer'
          or hat_modul_recht('schedule','schreiben')
```

**Der mittlere Zweig ist genau das, was die Gruppenrechte abschaffen sollen:
ein Rollenname, fest in einer Policy.** Er steht dort nicht aus Bequemlichkeit,
sondern weil zwei Dinge zusammenkommen:

1. `hat_modul_recht()` liest ausschliesslich `benutzer_funktionen →
   portal_funktionen → portal_gruppen`. Die Rolle steht dort nicht drin — ein
   Trainer ohne Gruppenzugehörigkeit bekommt für **jedes** Modul `false`.
2. `schedule` ist ausgerechnet das Modul, auf dem der Trainer am wenigsten
   hat: `APP_ZUGRIFF_DEFAULT` gibt ihm dort `lesen`, während er bei `team`,
   `training` und `events` `verwalten` hat. Die Stufe kann „mindestens so viel
   wie ein Trainer" nicht ausdrücken.

**Er verschwindet mit dem Umbau.** Sobald die Gruppenrechte stehen und der
Trainer seine Stufen über eine Gruppe bekommt statt über den Rollennamen,
fällt der Zweig ersatzlos weg — die Policy ist dann `is_admin() or
hat_modul_recht('schedule','schreiben')`.

Bis dahin gilt: **kein Funktionär kann Matchdaten korrigieren**, solange
seiner Gruppe nicht `schedule: schreiben` gesetzt wird. Das ist ein
Konfigurationsschritt in der Portalverwaltung, kein Codewechsel.

### ⚠ `mitglied_id` ist in VIER Tabellen der falsche Typ — und das ist auch ein Löschproblem

Befund vom 19.08.2026, **berichtigt und erweitert am 23.08.2026**.

**`mitglieder.id` ist `bigint`.** Ursprünglich stand `mitglied_id` in **acht**
Tabellen als `uuid` — ein Join auf `mitglieder` ist dort unmöglich. Vier davon
sind inzwischen umgestellt und tragen einen Fremdschlüssel:

| | |
|---|---|
| ✅ **behoben** (`bigint` + FK) | `anwesenheiten`, `helper_einsatz_pflicht_mitglied`, `helper_zuteilungen`, `team_helfer_zuteilungen` |
| ⚠ **offen** (`uuid`, kein FK) | `abstimmung_antworten`, `aufgebote`, `bus_anmeldungen`, `material_ausleihen` |

Dazu unverändert `news.mitglied_ids` als `uuid[]`.

⚠ **Wer hier „acht" liest, plant eine Migration, die zur Hälfte schon gelaufen
ist.** Deshalb steht die Zahl nicht mehr im Titel allein — nachzählen:

```sql
select table_name, data_type from information_schema.columns
 where table_schema='public' and column_name='mitglied_id'
 order by data_type, table_name;
```

**Keine der vier hat einen Fremdschlüssel auf `mitglieder`** — sonst wäre es
beim Anlegen aufgefallen. Genau das ist die Lehre: ein fehlender
Fremdschlüssel lässt einen Typfehler jahrelang unbemerkt stehen.

### ⚠ Es ist nicht nur ein Typproblem, sondern ein LÖSCHPROBLEM

Aufgefallen am 23.08.2026 beim Durchrechnen der Löschkette (Etappe 3b), und
es steht sonst nirgends:

**Die vier sind für das Löschen einer Person gerade deshalb gefährlich, WEIL
sie keinen Fremdschlüssel haben.** Sie verweisen auf ein Mitglied über eine
`uuid`, die eine `bigint`-Id gar nicht aufnehmen kann. Beim Löschen bliebe
dort eine Waise stehen — und **nichts würde sich beschweren**: kein `23503`,
keine Meldung, keine Kaskade. Ein Fremdschlüssel hätte den Löschvorgang
entweder aufgehalten oder aufgeräumt; ohne ihn tut er beides nicht.

⚠ **Und die Löschvorschau kann sie nicht prüfen.** Sie kann nicht zählen, was
sie nicht joinen kann. Deshalb nennt die Vorschau sie **ausdrücklich als
„nicht prüfbar"** statt sie zu übergehen — der einzige Punkt, an dem sie
etwas NICHT weiss, gehört auf den Schirm und nicht in eine Fussnote.

**Wirkt heute nirgends:** alle vier sind **leer** (gemessen 23.08.2026) und
warten auf Phase 4 (Aufgebote, Termine, Bus, Material). Sobald sie Zeilen
bekommen, entsteht mit jedem Löschen ein stiller Rest.

**Vor Phase 4 nachziehen**, mit Fremdschlüssel auf `mitglieder(id, verein_id)`
wie in `migration_matchdaten.sql`. Solange die Tabellen leer sind, ist es ein
`alter column … type bigint` ohne Datenverlust — mit Zeilen darin wäre es eine
Migration mit Abbildung.

**Und `aufgebote` ist eine davon.** Der geplante Vergleich „wer war aufgeboten
und hat nicht gespielt" braucht den Join Aufgebot ↔ Aufstellung über das
Mitglied — `uuid` gegen `bigint` geht nicht. Der Vergleich scheitert, bevor
ihn jemand baut.

### Wer sieht was bei anderen — wartet auf die Gruppenrechte

Die zweite Hälfte: eine Matrix Rolle × Feld, die festlegt, wer welches Feld bei
**anderen** Mitgliedern sieht. Die eigenen Daten sieht jeder vollständig.

**Bewusst zurückgestellt.** Zwei Gründe:

1. Solange die Rechte an Rollennamen hängen statt an Gruppen, würde die Seite
   eine Rollenleiter zementieren — und eine Leiter passt nicht: Der Trainer
   braucht die Handynummer seiner Junioren, der Kassier nicht, obwohl
   „Funktionär" in `portal_rollen` über „Trainer" steht.
2. Ohne Wirkung in der Datenbank wäre es ein Versprechen ohne Deckung — im
   Portal ausgeblendet, über die API sichtbar. Postgres kann keine Spalten pro
   Rolle ausblenden; es bräuchte Sichten.

Reihenfolge deshalb: Mitgliedtyp-Konfiguration → Gruppenrechte
(`docs/auftrag_rls_gruppenrechte.md`) → diese Seite, dann mit Wirkung in der
Datenbank.

`feldsichtbarkeit` hat bereits die richtige Form `(feld_key, role, sichtbar)`,
wird aber **nie geladen** — der Tab „Feldsichtbarkeit" ist leer und der
Umschalter unerreichbar. Nicht abbauen, anschliessen.

### Die Portalverwaltung ist nach Technik geordnet, nicht nach Absicht

Vier Kategorien, vierzehn Tabs. Wer einen Mitgliedtyp einrichtet, braucht drei
Orte; wer einen Benutzer anlegt, zwei. Dazu heisst „Benutzer & Rollen" sowohl
Kategorie als auch Tab darin, und Rollen liegen an vier Stellen (Portal-Rollen,
Kader-Rollen, Mitglieder-Konfiguration, Module & Rechte).

Vorschlag vom 17.08.2026 — vier Kategorien nach Absicht:

| Kategorie | Tabs |
|---|---|
| Mitglieder | Mitgliedtypen · Kader-Rollen · Vereinsfunktionen |
| Zugang | Konten · Portal-Rollen · Gruppen & Funktionen |
| Was wer darf | Module & Rechte · Wer sieht was · Team-Module |
| Verein | Aussehen · API-Verbindungen · Audit-Logs |

Kader-Rollen wandern zu den Mitgliedern (Vereinsangabe, keine Berechtigung),
„Design-System" fällt raus (Entwicklerseite). Ob „Gruppen & Funktionen" später
zu den Mitgliedern gehört, entscheidet sich mit den Gruppenrechten — siehe dort
den Abschnitt „Ein Amt und ein Rechtebündel heissen beide Funktion".

**Unabhängig von allem anderen, jederzeit machbar.**

### Supporter: Teil A erledigt am 20.08.2026 — Teil B offen

Auftrag: `docs/auftrag_supporter_rueckbau.md`.

**Am 17.08.2026 entschieden**, durch die Vereinsstatuten: Supporter steht nicht
in Artikel 6, ist also **keine Mitgliedschaft**. Herleitung in
`ARCHITECTURE.md` unter „Supporter ist keine Mitgliedschaft" und „Was ein
Mitglied ist — die Statuten des FCH".

Kurz: eine Person ohne Mitgliedschaft, die erreichbar bleibt, sich für
Helferschichten einträgt und bestimmte News erhält. Er darf eine Vereinsfunktion
haben, aber keine Funktionärsrechte auf Mitgliederdaten.

**Teil A ist gebaut** (`supabase/migration_supporter_rueckbau.sql`):

| war | ist |
|---|---|
| `macheZumSupporter()` legt eine Mitgliedschaft an | **entfallen** — ein Supporter entsteht durch das Fehlen, nicht durch einen Schreibvorgang |
| `SupporterListView` filtert `mitglieder` | `fetchSupporter()` liest `personen` |
| Mitgliedtyp „Supporter" | `aktiv = false` (nicht gelöscht: `mitgliedtyp_feldkonfig` hängt daran) |
| `benutzer_funktionen` kennt nur `seit` | `bis date` dazu — Artikel 8 spricht von einem Zeitpunkt |

**Wer dazugehört, sind zwei Ausschlüsse**, keine Merkmale: eine Person ohne
jede Zeile in `mitglieder` und ohne jede Zeile in `eltern_kinder`. Es gibt
kein Kennzeichen „ist Supporter" und soll keines geben. Auch eine *beendete*
Mitgliedschaft schliesst aus — sonst stünde dieselbe Person im Archiv und
unter den Supportern.

**Was noch offen ist (Teil B):**

- ~~Das **schlanke Supporter-Modal**.~~ ✅ Gebaut am 20.08.2026 und am
  21.08.2026 wieder **gefallen**: `MemberDetail` trägt die Person ohne
  Mitgliedschaft jetzt selbst. Es war als Platzhalter mit Ablaufdatum
  angelegt, und das Datum ist eingetreten.
- ~~**„Mitglied werden"** und der Austritt in die Gegenrichtung, beide mit
  **Rückfrage**.~~ ✅ Erledigt mit Etappe 2 (22.08.2026). Die Antworten kommen
  jetzt aus der Datenbank statt aus dem Code: die Mitgliedtypen aus
  `mitgliedtypen` (damit ist **Pausenmitglied** erstmals wählbar — der Typ, der
  wörtlich „kommt vielleicht wieder" bedeutet), das Austrittsziel aus
  `vereine.austritt_art_id`. Offen bleibt dieselbe Rückfrage beim Entkoppeln
  des letzten Kindes und beim Funktionär, der sein Amt niederlegt.
- **Personensuche in der Neuanlage**, nach dem Muster von `ElternSucheModal`
  — schliesst zugleich „Mitglied anlegen prüft nicht auf Dubletten".
- Helferanfragen als zweite Empfängerliste (News ist erledigt, siehe unten).

### ✅ Archiv: zwei Wege, fünf Unterschiede — vereinheitlicht am 22.08.2026

Es gab zwei Wege ins Archiv, den Knopf „Archivieren" und die Antwort „Archiv"
im Austrittsdialog. Sie taten **fünf verschiedene Dinge**, und in zweien war
der härtere der mildere:

| | Knopf | Austritt → Archiv |
|---|---|---|
| `deaktiviert_am` | jetzt | wählbarer Tag |
| `deaktiviert_von` | gesetzt | **leer** |
| Kadereinträge | **blieben aktiv** | wurden beendet |
| Ämter (`bis`) | **blieben offen** | bekamen ein Ende |
| Portal-Konto | deaktiviert | **blieb aktiv** |

**Nur eines davon war je Absicht — und die Absicht war falsch.** Im Code stand
seit dem 20.08.2026: *„Beim Archiv bleibt sie stehen — das Konto wird ohnehin
vom Aufrufer deaktiviert."* Der Aufrufer hat es **nie** getan; `fuehreAustrittAus`
enthielt keinen solchen Aufruf. Ein ausgetretenes Mitglied blieb angemeldet.

⚠ **Ein Kommentar, der eine andere Stelle zusichert, ist eine Behauptung ohne
Prüfung** — und wer ihn liest, prüft erst recht nicht nach. Dieselbe Familie
wie „wer liest diese Spalte?": eine Hälfte gebaut, die andere angenommen.
Aufgefallen ist es nur, weil jemand die zwei Wege nebeneinandergelegt hat.

Beim Kader dagegen gibt es **keine Absicht** — `archiviereMitglied()` schrieb
seit ihrer ersten Fassung drei Spalten und hat den Kader nie mitgedacht.

**Entschieden (Didi, 22.08.2026): der Austritt ist der vollständige Weg, der
Knopf bleibt als Abkürzung — aber er tut dasselbe.** Beide rufen jetzt
`beendeVerknuepfungen()` in `memberService.ts`. Übrig bleiben zwei gewollte
Unterschiede: das Datum (Knopf heute, Austritt rückdatierbar) und dass der
Knopf festhält, wer geklickt hat — `deaktiviert_von` setzt seither **auch** der
Austritt.

⚠ **Dass es niemanden getroffen hat, lag an der Datenlage** — keines der drei
ausgetretenen Mitglieder hatte ein Konto, und keine archivierte Person stand in
einem aktiven Kader. Beides gemessen, nicht angenommen. Eine Datenlage ist
keine Absicherung.

### ⚠ `mitgliedtypen.standard_rolle` hat keinen Fremdschlüssel

`personenarten.standard_rolle` hat seit dem 22.08.2026 einen auf
`portal_rollen(verein_id, name)`; `mitgliedtypen.standard_rolle` nicht — und
genau dieses Fehlen liess am 05.08.2026 zwei Zeilen mit `rolle = 'Spieler'`
(grosses S) zu, einen Wert, den weder `getPermissions` noch `NAV_BY_ROLE`
kennen. Der Schlüssel ist zu haben: `portal_rollen` trägt
`UNIQUE (verein_id, name)`.

Nachzuziehen mit einer kleinen Migration. Vorher prüfen, ob alle bestehenden
Werte in `portal_rollen` vorkommen — sonst bricht das `ALTER`, und die Meldung
von Postgres nennt die Zeile nicht:

```sql
select t.name, t.standard_rolle from public.mitgliedtypen t
  left join public.portal_rollen r
    on r.verein_id = t.verein_id and r.name = t.standard_rolle
 where t.standard_rolle is not null and r.name is null;
```

### ⚠ Drei Nebenbefunde aus dem Supporter-Rückbau (20.08.2026)

**1. `zaehlt_als_mitgliedschaft` hat keinen Leser mehr.** Die Spalte war die
Vorarbeit vom 17.08.2026: die Listentrennung sollte nicht am Namen „Supporter"
hängen, sondern an einem Merkmal. Mit dem Rückbau trennt nicht mehr ein Filter,
sondern die **Tabelle** — in `mitglieder` steht nur noch, was eine
Mitgliedschaft ist.

Der Filter in `MitgliederModul` ist deshalb **entfernt und nicht als
Sicherheitsnetz stehengeblieben**: eine Zeile, die er heute wegnähme, wäre
nirgends mehr zu sehen — nicht in der Mitgliederliste und nicht im
Supporter-Tab, der ja gar nicht mehr aus `mitglieder` liest. Sie verschwände,
ohne dass etwas fehlschlägt.

Damit ist die Spalte ein Schalter ohne Wirkung — dasselbe Muster wie
`api_verbindungen.active`. Entweder bekommt sie einen Leser (Mitgliederzählung,
Beitragslauf) oder sie fällt. Nicht liegen lassen.

**2. `NachrichtenModul.tsx:77` steht im Code, nicht in der Datenbank.**
`ROLLEN_OPTS` ist eine feste Liste; die Zeile `supporter` ist ergänzt, aber die
Quelle bleibt falsch — eine neue Portalrolle erscheint dort nie. Und **„Alle
Mitglieder" meint dort alle Empfänger**, nicht die Mitglieder im Sinne der
Statuten. Nach dem Rückbau ist das eine Aussage, die stimmen muss: die beiden
Begriffe gehören getrennt beschriftet („Alle Mitglieder" ≠ „alle Erreichbaren"),
sonst bekommt der Supporter die GV-Einladung.

**3. ✅ `rolleLabelMap` liess die Konstanten gegen die Datenbank gewinnen —
behoben am 20.08.2026.** In `memberMapper.ts` standen die acht fest
verdrahteten Beschriftungen **hinter** denen aus `portal_rollen`, und
`Object.fromEntries` lässt den letzten Eintrag gewinnen. Sie waren also keine
Rückfallwerte, sondern Überschreibungen — für `administrator`,
`administration`, `funktionaer`, `trainer`, `spieler`, `eltern`, `mitglied`
und `supporter`, also praktisch jede Rolle. Wer eine umbenannte, sah davon
nichts. Die Reihenfolge ist getauscht: Konstanten vorne, `dbPortalRollen`
dahinter.

**Der Weg dorthin ist die eigentliche Lehre.** Ich hatte den Test zuerst
andersherum geschrieben — er hielt den Ist-Zustand fest („Supporter" statt
„Supporter/in") und war grün.

> **Didi:** ein Test, der den Ist-Zustand festhält, obwohl der Ist-Zustand
> falsch ist, zementiert den Fehler und fällt ausgerechnet dann um, wenn ihn
> jemand behebt. Er findet nichts, er bewacht etwas Falsches.

Umgedreht war er rot — und blieb es genau eine Runde, bis die CI mit Exit-Code
1 abbrach:

> **Didi:** ein dauerhaft roter Test macht die Prüfkette wertlos — beim
> nächsten echten Fehler schaut niemand mehr hin.

**Beide Sätze zusammen ergeben die Regel:** ein Test prüft den Soll-Zustand,
und rot ist ein Zustand für Stunden, nicht für Wochen. Wer den Soll-Zustand
nicht sofort herstellen kann, markiert ihn `skip` mit Verweis auf die
Entscheidung — aber lässt die Prüfkette nie dauerhaft rot stehen.



