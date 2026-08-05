# ClubCampus — Architektur

## Prinzip
Module sind fachlich getrennt, aber über gemeinsame Domains verbunden.
Keine Isolation — Verbindung über Services und Hooks.

## Aktuelle Ordnerstruktur

> Stand 04.08.2026. Die TypeScript-Migration ist abgeschlossen — ausser den
> Komponententests unter `modules/members/__tests__/` ist alles `.ts`/`.tsx`.

```
src/
  domains/                          ← Business-Logik, Services, Hooks
    app/
      getPermissions.ts             ← Zugriffstufen lesen|schreiben|verwalten pro Modul-Key
      getProfilCheck.ts             ← Profil-Vollständigkeit + Datenprüfung (kein Hook)
      useAppData.js                 ← loadTenant, loadDbMitglieder, loadDbUser, updatePortalZugang
    members/
      memberService.ts              ← Mitglieder, Notizen, Kader, Benutzer, Ansichten, logAenderung/logAktivitaet
      elternService.ts              ← Elternkontakte + eltern_kinder (per `export *` aus memberService mitgereicht)
      useMemberMeta.ts              ← Hook: ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap
      useInlineEdit.ts              ← Hook für Inline Cell Editing
    permissions/
      permissions.js                ← canEdit/canDelete/canExport pro Modul
      funktionaerStufen.ts          ← Stufe für Rolle `funktionaer` aus portal_funktionen/-gruppen
    person/
      personTypes.ts                ← toPerson() Normalisierer
      personUtils.ts                ← vollname(), initials(), age(), formatDatum(), LAENDER, getLandName
    roles/
      roleUtils.ts                  ← ableitRolle(), ROLLE_PRIORITAET, saveRolle()
    season/
      seasonUtils.ts                ← currentSeason(), formatSaison()

  shared/                           ← Wiederverwendbare UI-Bausteine
    componentRegistry.js            ← COMPONENT_REGISTRY (Quelle des Design-System-Tabs)
    ui/                             ← Av, Btn, ConfirmDialog, DropMenu, Modal, Skeleton, Stat,
                                       Tabs, hooks.ts, primitives.tsx (Card, Chip, Row, Input …)
    forms/                          ← AddressInput, FunktionenMultiSelect, InlineField,
                                       LandSelect, PhoneInput, RollenAuswahlListe
    list/
      ListView.tsx                  ← Zentrale Listenkomponente (Filter, Gruppierung, Ansichten, Export)
      useListView.ts                ← State und Logik dazu
      Toolbar.tsx                   ← nur Buttons + Öffnen/Schliessen-State
      FilterPanel/SortPanel/GroupPanel/FilterChips/MoreMenu/MoreSheet.tsx
      BulkBar, ColMenu, PortalBadge, RangeFilter, SortHeader
      exportUtils.ts                ← exportListData(), buildFilterDefs(), csvDownload()
      sortUtils.ts                  ← mehrstufige Sortierung (sortDefs)
    person/
      PersonAvatar.tsx              ← Av + Kamera-Overlay
      PersonFunktionen.tsx          ← Vereinsfunktionen-Ansicht
      PersonKontakt.tsx             ← Kontaktdaten-Ansicht
      PersonPersonalien.tsx         ← Personalien-Ansicht
      PersonSummary.tsx             ← Name + Subtitle + Right-Slot
      PersonTeams.tsx               ← Teams-Ansicht
    utils/
      colorUtils.ts                 ← resolveColor, hexToRgba, darkenHex, contrastColor

  styles/
    cc.css                          ← das komplette Design-System als cc-*-Klassen
    index.css                       ← bindet cc.css ein

  modules/                          ← Alle Modul-Dateien
    teams/                          ← lag früher unter domains/teams/
      teamService.js                ← fetchTeams(), createTeam(), updateTeam()
      useTeams.js                   ← Hook: teams, loading, reload
    members/                        ← MitgliederModul aufgeteilt
      ArchivView.jsx                ← Archiv-Tab (reaktivieren, löschen) — nutzt ListView
      ElternListView.jsx            ← Eltern-Tab (Liste) — nutzt ListView
      ElternkontaktModal.tsx        ← Elternkontakt anlegen/bearbeiten/löschen; ElternFelder +
                                       validateElternkontakt werden von ElternSucheModal mitbenutzt
      ElternKinderSektion.tsx       ← verknüpfte Kinder eines Elternteils: anzeigen, hinzufügen,
                                       entkoppeln, Hauptkontakt setzen. Im Modal aus der Elternliste
      ElternPortalSection.tsx       ← Portal-Zugang eines Elternkontakts anzeigen/lösen
      ElternSucheModal.tsx          ← bestehenden Elternkontakt suchen und mit einem Kind verknüpfen
      KindSucheModal.tsx            ← Gegenrichtung: Kind suchen, gefiltert nach den Mitgliedtypen
                                       mit hauptkontakt_pflicht
      FotoUpload.tsx                ← Foto-Upload Komponente (ausgelagert aus MemberHero)
      MemberDetail.tsx              ← Detailansicht mit allen Tabs
      MemberHero.tsx                ← Hero-Banner mit Avatar + FotoUpload
      MemberKPIs.tsx                ← KPI-Cards + Aufschlüsselung
      MemberListCell.tsx            ← makeMemberRenderCell() Factory für ListView
      MemberTabBar.tsx              ← Tab-Leiste der Detailansicht
      AdresseFormular.tsx           ← Strasse/PLZ/Ort/Kanton mit Adresssuche, aus
                                       NeuesMitgliedModal ausgelagert
      NeuesMitgliedModal.tsx        ← Neues Mitglied anlegen (Mitgliedtyp → Pflichtfelder)
      NeuesMitgliedElternSektion.tsx ← Elternteile im gleichen Ablauf erfassen, wenn der
                                       Mitgliedtyp hauptkontakt_pflicht trägt. Enthält
                                       speichereEltern(), das NACH dem Kind läuft
      NotizenVerlauf.tsx            ← Notizen-Komponente
      elternListUtils.tsx           ← mapEltern + Gruppierung/Zellen der Elternliste
      memberConstants.ts            ← COL_GROUPS, SAVED_VIEWS, GROUP_OPTIONS, GROUP_OPTIONS_MORE
      memberDataUtils.ts            ← Re-Exports (mapMembers, filterMembers etc.)
      memberMapper.ts               ← DB→UI Transformation
      memberFilter.ts               ← Filter + Sort mit UND/ODER-Logik
      memberGrouping.ts             ← Gruppierungslogik
      memberExportUtils.ts          ← mitglieder-spezifischer Export
      memberUtils.tsx               ← getFieldVisibility; re-exportiert LAENDER, getLandName
      tabs/
        DatenpruefungTab.tsx        ← Router: Admin / Spieler / Eltern
        DatenpruefungMitglied.tsx
        DatenpruefungEltern.tsx
        datenpruefungUtils.ts
        ElternTab.tsx
        InfoTab.tsx
        PortalTab.tsx               ← Portalrolle inline editierbar
        VerlaufTab.tsx              ← Änderungshistorie (aenderungen + aktivitaeten kombiniert)
      __tests__/                    ← Komponententests, bleiben .jsx (checkJs:false → nicht typgeprüft)
        elternTab, memberDetail, memberFilter, memberGrouping, memberListCell,
        memberMapper, mitgliederBulk, neuesMitgliedModal, personFunktionen,
        personTeams, portalTab, useInlineEdit, verlaufTab
    portal/                         ← PortalverwaltungModul aufgeteilt (1 Tab = 1 Datei)
      ApiTab · AuditTab · AussehenTab · FeldvisTab · GruppenTab · KaderRollenTab
      MitgliederKonfigTab · ModuleRechteTab · RollenTab · TeamModuleMatrix
      TeamModuleTab · UsersTab                                    (alle .tsx)
      DesignSystemTab.tsx           ← Living Style Guide (auto aus COMPONENT_REGISTRY)
      portalUtils.ts                ← ZUGRIFF_*, ALLE_MODULE, ROLES, KAT_LABELS etc.
    DashboardModul.tsx              ← ⚠️ noch demoData
    HelferModul.tsx                 ← ⚠️ noch demoData
    KaderModul.tsx
    LoginScreen.tsx                 ← Login/Registrierung, ruft check_email_bekannt
    MitgliederModul.tsx             ← State + Koordination
    NachrichtenModul.tsx
    NavigationModul.tsx             ← ⚠️ noch demoData (USER_ACCOUNTS)
    PlatzhalterModul.tsx            ← ⚠️ noch demoData
    PortalverwaltungModul.tsx       ← State + Tab-Routing
    TeamModul.tsx                   ← ⚠️ noch demoData
    TeamsVerwaltungModul.tsx
    TermineModul.tsx                ← ⚠️ noch demoData
    TrainingsplanModul.tsx
    appConstants.js                 ← ⚠️ noch demoData

  App.tsx                           ← liest den Verein-Slug aus dem Pfad
  clubcampus.tsx                    ← Haupt-Entry: Root-Komponente, Datenlader und Router in einem
  constants.ts                      ← Design-Tokens (FONT, TEXT, SPACE, RADIUS, Farben)
  database.types.ts                 ← generiert: npx supabase gen types typescript --linked
  demoData.js                       ← ⚠️ TEMPORÄR — löschen wenn die Sport-Module auf Supabase sind
  icons.tsx
  main.tsx
  supabase.js
  theme.ts                          ← Barrel: re-exportiert shared/ui, shared/forms, shared/list.
                                       Enthält kein JSX und kein CSS mehr — CSS liegt in
                                       styles/cc.css, COMPONENT_REGISTRY in shared/componentRegistry.js
  types.ts                          ← App-Typen auf Basis von database.types.ts
```

## Prinzip: Auslagern und Wiederverwenden

**Vor jedem neuen Feature oder Komponente:**
1. Prüfen ob etwas Ähnliches bereits in `shared/`, `domains/` oder `theme.ts` existiert
2. Prüfen ob bestehende Logik in `memberService.ts`, `exportUtils.ts`, `personUtils.ts` etc. genutzt werden kann
3. Nie duplizieren — lieber zentralisieren und importieren

**Wann auslagern?**
- Komponente ist >80 Zeilen und hat einen klar abgrenzbaren Zweck → eigene Datei
- Ab 300 Zeilen aufteilen (Formulare bis 400)
- Logik wird in mehr als einem Modul genutzt oder könnte genutzt werden → `shared/` oder `domains/`
- Service-Calls (`sb.from()`) in einer Komponente → in `memberService.ts` (oder jeweiligen Service)
- Render-Logik mischt sich mit State-Logik → trennen

**Konkrete Checkliste beim Bauen:**
- [ ] Stellt das Portal irgendwo schon dasselbe dar? → erst nach dem Muster suchen, dann nach dem Namen (siehe `CLAUDE.md` → Bevor eine neue CSS-Klasse entsteht)
- [ ] Gibt es bereits eine `cc-*` Klasse in `styles/cc.css`? → nutzen, nicht inline
- [ ] Gibt es bereits eine Komponente in `shared/ui`, `shared/forms` oder `shared/list`? → über `theme.ts` importieren
- [ ] Gibt es bereits eine Service-Funktion in `memberService.ts`? → nutzen
- [ ] Gibt es bereits einen Hook in `domains/`? → nutzen
- [ ] Ist diese Logik auch für KaderModul / HelferModul nützlich? → in `shared/` oder `domains/`

**Bekannte wiederverwendbare Bausteine:**
- `ListView.tsx` — für jede tabellarische Liste mit Filter/Gruppierung/Sortierung/Export
- `exportListData()` — für generischen CSV/Excel Export
- `buildFilterDefs()` — für automatische Filter-Definitionen aus Daten
- `PortalBadge` — Portal-Zugang
- `InlineField` + `useInlineEdit` — Inline-Editing von Stammdaten
- `useMemberMeta()` — ROLLE_LABEL, TRAINER_KEYS, funktionenGruppenMap
- `LAENDER`, `getLandName` — Länderliste und Ländername
- `PersonPersonalien`, `PersonKontakt`, `PersonTeams`, `PersonFunktionen` — Detail-Ansichten



```
Module  →  dürfen Domains verwenden       ✓
Domains →  dürfen Shared verwenden        ✓
Shared  →  kennt keine Module             ✗
Module  →  importieren sich nie gegenseitig ✗
```

## Checkliste für neue shared-Komponenten

Neue Komponente als eigene Datei unter `shared/ui`, `shared/forms` oder `shared/list` anlegen, in `theme.ts` re-exportieren (Module importieren aus `theme.ts`, nicht direkt aus `shared/`) — und IMMER in COMPONENT_REGISTRY eintragen (`shared/componentRegistry.js`):

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

- [ ] Service in `domains/[modul]/[modul]Service.ts` erstellen — `sb` als erstes Argument
- [ ] Hook in `domains/[modul]/use[Modul].ts` erstellen (wenn State nötig)
- [ ] Permissions in `domains/permissions/permissions.js` ergänzen
- [ ] `PersonSummary`/`PersonAvatar` aus `shared/person/` nutzen
- [ ] `ableitRolle` aus `domains/roles/roleUtils.ts` nutzen
- [ ] `currentSeason()` aus `domains/season/seasonUtils.ts` nutzen
- [ ] `verein_id` bei jedem `insert()`/`upsert()` — als eigener Pflichtparameter der Service-Funktion, nicht als optionales Objektfeld
- [ ] Kein `window.confirm` → `useConfirm` aus `theme.ts`
- [ ] Kein `demoData` Import
- [ ] Kein `sb.from()` direkt in Komponenten → Service nutzen
- [ ] Modul-Datei in `src/modules/` ablegen

## Pflege dieser Datei

Diese Datei ist **nicht** selbstpflegend. Der Anspruch „Claude hält sie aktuell" stand hier bis 04.08.2026 — tatsächlich beschrieb die Ordnerstruktur zu diesem Zeitpunkt einen Stand von vor der TypeScript-Migration, mit `domains/teams/` an einer Stelle, an der es seit Monaten nicht mehr liegt, und `theme.jsx` als Design-System, das längst nur noch eine Barrel-Datei ist.

Nachzuführen ist sie deshalb bewusst, beim Session-Abschluss:
- Neue Dateien erstellt, verschoben oder umbenannt
- Ein Modul von `demoData` auf Supabase migriert
- Neue Komponenten in COMPONENT_REGISTRY
- Architekturentscheidungen, die künftige Arbeit binden

**Bei Widerspruch zwischen dieser Datei und dem Code gilt der Code.** Wer eine überholte Aussage findet, korrigiert sie — oder meldet sie, wenn ein ganzer Abschnitt betroffen ist.

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

**Das komplette Design-System liegt in `src/styles/cc.css`** (eingebunden über `styles/index.css`). In `theme.ts` steht kein CSS mehr — die Datei ist nur noch eine Barrel-Datei.

**Vor jedem Styling:**
1. **Nach dem Muster suchen, nicht nach dem Namen**: stellt das Portal irgendwo schon dasselbe dar? → `grep -rn "cc-<bereich>" src --include=*.tsx`
2. Bestehende Klasse verwenden wenn vorhanden
3. Kein Inline-CSS wenn eine `cc-*` Klasse existiert
4. Neue CSS-Klassen nur mit Rücksprache mit Didi
5. Falls neue Klasse nötig: prüfen ob der Name frei ist — `grep -n "^\.cc-<name>{" src/styles/cc.css`. CSS warnt bei einer Kollision **nicht**; die spätere Definition überschreibt die frühere lautlos, und der Fehler erscheint an einer Stelle, die niemand angefasst hat.
6. Dann in `src/styles/cc.css` mit `cc-` Prefix, nie inline

Ausführliche Begründung beider Prüfungen: `CLAUDE.md` → „Bevor eine neue CSS-Klasse entsteht".

### Offen: cc.css-Runde

Drei Aufräumarbeiten, gesammelt für einen Durchgang. Sie hängen nicht an den Modul-Migrationen und sind jederzeit machbar; nur das Entfernen toter Klassen wartet auf deren Abschluss.

**1. Zehn doppelt definierte Klassen.** Welche Fassung wirkt, entscheidet allein die Zeilennummer — die spätere gewinnt, ohne Warnung. Pro Klasse einzeln entscheiden:

`cc-btn-danger` · `cc-btn-ghost` · `cc-btn-success` · `cc-check-icon` · `cc-hero-back` · `cc-mb-4` · `cc-ml-toolbar` · `cc-ml-view-custom` · `cc-role-chip-trainer` · `cc-table-wrap-inner`

`cc-btn-danger` ist der Löschen-Knopf, `cc-ml-toolbar` die Listen-Toolbar — beides prominent.

**2. Sieben Klassen, die benutzt, aber nie definiert wurden** (Stand 05.08.2026). Sie wirken heute schlicht nicht, die Elemente stehen ohne die gedachte Formatierung da:

| Klasse | Fundstellen | Art |
|---|---|---|
| `cc-mt-4` | 8 | Skalenlücke — `mt` beginnt bei 8 |
| `cc-gap-0` | 1 | Skalenlücke — `gap` beginnt bei 4 |
| `cc-nat-edit-wrap` | 3 | fehlende Klasse |
| `cc-addr-dropdown-fixed` | 2 | fehlende Klasse |
| `cc-addr-option` | 1 | fehlende Klasse |
| `cc-multiselect-group-label` | 1 | fehlende Klasse |
| `cc-teams-rollen-klammer` | 1 | fehlende Klasse |

Bei den **Skalenlücken** die Fundstellen auf vorhandene Werte umstellen, nicht die Skala erweitern — so ist `cc-gap-3` am 05.08.2026 aufgelöst worden (zwei Fundstellen auf `cc-gap-4`). Abstufungen, die man nicht unterscheiden kann, laden zum Wildwuchs ein. Bei den **fehlenden Klassen** braucht es je einen Blick, was gemeint war.

Zum Nachprüfen:

```bash
# doppelt definiert
grep -o "^\.cc-[a-zA-Z0-9_-]*{" src/styles/cc.css | sort | uniq -d
```

**3. Tote Klassen entfernen** — erst sinnvoll, wenn alle Module migriert sind.

```jsx
// ✗ FALSCH — Inline-CSS obwohl cc-Klasse existiert
<div style={{display:"flex",gap:8,alignItems:"center"}}>

// ✓ RICHTIG — bestehende Klasse nutzen
<div className="cc-row cc-gap-8">

// ✗ FALSCH — neue Klasse ohne Rücksprache
.meine-neue-klasse { ... }

// ✗ FALSCH — Klasse neu erfunden, obwohl es sie gibt
.cc-section-label { ... }        // cc-section-title existiert seit langem

// ✓ RICHTIG — erst Muster suchen, dann Namen prüfen, dann fragen
// → grep -rn "cc-section" src → grep -n "^\.cc-meine-klasse{" src/styles/cc.css
// → Rücksprache mit Didi → dann: .cc-meine-klasse { ... } in src/styles/cc.css
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

## Personen-Modell (laufendes Vorhaben, Stand 04.08.2026)

### Anlass

Personen stehen doppelt im System. Ein Vater, der selbst Aktivmitglied ist und dessen Sohn Junior ist, hat eine Zeile in `mitglieder` **und** eine in `elternkontakte`. Bei FCH ist das häufig. Folgen:

- Adressänderungen greifen nur an einer der beiden Stellen.
- Die Datenprüfung zählt zweimal — `profil_geprueft_at` existiert dreifach: in `mitglieder`, `elternkontakte` und `benutzer`.
- Beim Anschreiben erscheint die Person doppelt.

### Zielstruktur

```
personen        alle Menschen, einmal pro Verein
mitglieder      wird zur Mitgliedschaft, verweist per person_id auf personen
                id bleibt bigint und behaelt ihren Wert
eltern_kinder   eltern_id -> personen.id, mitglied_id -> mitglieder.id,
                hauptkontakt, beziehung
benutzer        person_id (neu), verliert vorname/nachname/telefon
elternkontakte  entfaellt — ihre Zeilen werden Personen
```

### Zuordnungsentscheidungen und ihre Begründung

| Feld | Wohin | Warum |
|------|-------|-------|
| `ahv_nr` | **Person** | Gilt lebenslang, unabhängig von jeder Mitgliedschaft. |
| Adresse (`strasse`, `plz`, `ort`, `kanton`, `land`) | **Person** | Getrennte Eltern: Mutter, Vater und Kind können drei verschiedene Adressen haben. Im alten Modell unmöglich — `elternkontakte` hat gar keine Adressspalten. |
| `spielerpass`, `js_nr` | **Mitgliedschaft** | Passivmitglieder haben keine. Sie hängen am Mitgliedsein, nicht am Menschen. |
| `beziehung` | **`eltern_kinder`** | „Mutter/Vater/Vormund" ist eine Eigenschaft der *Verknüpfung*. Dieselbe Person kann Mutter von Kind A und Vormund von Kind B sein — an der Person wäre nur einer der beiden Werte speicherbar. |
| `funktionen` | **Person** | Ein Materialwart muss kein Mitglied sein. |
| `foto_url`, `profil_geprueft_at`, `land` | **Person** | Gesicht, Datenprüfung und Adresse gehören zum Menschen. `profil_geprueft_at` löst die drei parallelen Felder ab. |
| `position`, `rueckennr` | **`kader`** | Weder Person noch Mitgliedschaft: ein Spieler hat in zwei Teams zwei Nummern. Lagen bisher dreifach (`mitglieder`, `kader`, `mitglieder_team_details`). |
| `datenstatus`, `notizen`, `fairgate_sync_at`, `hat_portal_zugang`, `eltern` (jsonb), `rolle` | **entfallen** | Veraltet, leer oder ableitbar. `hat_portal_zugang` folgt aus `benutzer`. `eltern` war ein Denormalisierungs-Schnappschuss ohne `benutzer_id`, den niemand pflegte — deshalb lief die Eltern-Datenprüfung ins Leere. |

**Angeschrieben werden alle verknüpften Personen, die Rechnung geht an den Hauptkontakt.** `eltern_kinder.hauptkontakt` bestimmt die Postadresse; ein partieller Unique-Index erzwingt höchstens einen Hauptkontakt pro Kind.

### Supporter ist ein Mitgliedtyp, kein Flag

Ein boolesches `supporter` an der Person kann der Struktur widersprechen — jemand wäre gleichzeitig Supporter und Aktivmitglied. Als `mitgliedtyp` ist der Zustand strukturell ausgedrückt, und Beiträge, Pflichtfelder und Rollenableitung greifen automatisch, weil sie ohnehin an `mitgliedtyp` hängen. Erzwungen wird die Ausschliesslichkeit in der Datenbank, nicht im Code:

```sql
create unique index mitglieder_eine_aktive_mitgliedschaft
  on mitglieder (person_id) where aktiv;
```

Bei FCH ist niemand zweifach Mitglied (keine Sektionen), deshalb ist der allgemeine Satz „eine Person hat höchstens eine aktive Mitgliedschaft" richtig — und „Supporter schliesst Aktivmitgliedschaft aus" fällt als Nebeneffekt heraus. `entkoppleKind()` muss dadurch erst die alte Mitgliedschaft beenden und dann die neue anlegen; die Reihenfolge kann nicht mehr vergessen werden.

### Die Fassaden-Regel (Etappe 2b)

**Services lesen per Join über `mitglieder` und `personen`, liefern aber weiterhin eine flache Zeile** (`{...person, ...mitgliedschaft}`). Das ist keine Bequemlichkeit, sondern der Grund, warum der Umbau in Etappen möglich ist:

- `memberMapper`, `memberFilter`, `memberGrouping`, `memberExportUtils`, `MemberListCell` bleiben unberührt.
- **Die gespeicherten Ansichten in `mitglieder_ansichten` bleiben gültig.** Deren `spalten`, `filter`, `gruppierung` und `sortierung` sind JSONB mit Feld-Keys — und **Nutzerdaten**. Eine verschachtelte Rückgabe (`{person: {...}}`) oder umbenannte Keys würden sie still brechen: kein Fehler, nur eine plötzlich leere Spalte.

Wer die Fassade aufbricht, muss `mitglieder_ansichten` migrieren. Das ist der Preis, und er ist hoch.

**Umgesetzt am 05.08.2026** in `src/domains/person/personService.ts`:

- `flacheZeile()` / `flacheZeilen()` machen aus der Join-Zeile wieder eine flache. Reihenfolge zählt: erst die Mitgliedschaft, dann die Personenfelder darüber — `personen` ist die Wahrheit und überschreibt die Altspalten.
- `verteileFelder()` teilt ein flaches Änderungsobjekt auf beide Tabellen auf. Die fünf Oberflächen (InfoTab, Datenprüfung, Inline-Bearbeitung) kennen weiterhin nur flache Felder.
- `PERSON_FELDER` ist die einzige Liste, die sagt, was an der Person hängt — für Lesen und Schreiben dieselbe.
- **`id` bleibt die Mitglieds-Id.** Daran hängen `kader.mitglied_id`, `eltern_kinder.mitglied_id`, `benutzer.mitglied_id`, Notizen und Verlauf. Die Personen-Id kommt zusätzlich als `person_id`.
- **Ohne Person greifen die Altspalten.** Mitglieder, die zwischen Etappe 1 und 2b entstanden sind, haben `person_id = null` — `NeuesMitgliedModal` legte damals keine Person an. Sie sollen nicht still aus der Liste fallen. Etappe 3 trägt die Personen nach.

### Der Testbestand kennt die schwierigen Fälle nicht

Vier Prüfungen am 05.08.2026 ergaben dasselbe: Der Zufallsgenerator hat einen Bestand erzeugt, in dem genau die Fälle fehlen, für die der Umbau gemacht wird.

| Prüfung | Ergebnis |
|---|---|
| Gemeinsame E-Mail Mitglied ↔ Elternteil (Etappe 1) | 0 |
| Personen ohne E-Mail | 0 von 905 — kein Junior ohne |
| Elternteil mit mehreren Kindern | 0 — keine Geschwister |
| Elternkontakte ohne E-Mail | 0 von 395 |

Ein Umbau, der gegen diesen Bestand läuft, prüft nichts: Der Merge-Schritt für Geschwister liefe durch, ohne je einen Treffer zu haben — und beim Fairgate-Import zum ersten Mal scharf.

Deshalb gehört **vor jede Etappe ein Seed** für die Fälle, die sie behandeln soll. Etappe 1 hatte einen (Martin Wyss, Sandra Vogt, Familie Brunner, Peter Frei), Etappe 3 bekam einen am 05.08.2026 (`supabase/etappe3_seed.sql`): Geschwister Odermatt mit einem Vater und einer E-Mail, dazu Jonas Steiner ohne eigene E-Mail und seine Grossmutter, die nur telefonisch erreichbar ist.

**Warum in TypeScript und nicht als SQL-Sicht:** Sortiert und gefiltert wird im Browser (`memberFilter`), nicht in der Datenbank — die Abfrage lädt alle aktiven Mitglieder, es gibt kein `.range()`. Es genügt deshalb, einmal an dieser Stelle flach zu machen. Eine Sicht wäre eine zweite Definition derselben Form in SQL und brächte das `security_invoker`-Risiko mit: ohne diese Angabe umgeht eine Sicht die RLS vollständig.

Sobald serverseitig seitenweise geladen wird — bei 900 Mitgliedern unnötig, bei 5000 nicht —, müsste die Datenbank sortieren und eine Sicht wäre klar besser. Weil die Fassade an genau einer Stelle sitzt, ist der Wechsel dann billig.

### Etappen

| # | Inhalt | Status |
|---|--------|--------|
| 1 | `personen` additiv anlegen, `person_id` nullable ergänzen, Backfill, Seed | ✅ **Fertig** — 908 Personen (513 Mitgliedschaften + 395 Elternkontakte), `supabase/etappe1_personen.sql` |
| 2a | Merge über E-Mail-Gleichheit | ✅ **Fertig** (05.08.2026) — 908 → 905 Personen, 1 Paar zusammengeführt, 0 Feldkonflikte, `supabase/etappe2a_merge.sql` |
| 2b | Flache Fassade | ✅ **Fertig** (05.08.2026) — `domains/person/personService.ts`, Lesen per Join, Schreiben aufgeteilt, 16 Tests |
| 3 | Elternkontakte auf `personen` | ⏳ Auftrag liegt bereit: `docs/auftrag_etappe3_eltern.md`, Seed gesetzt |
| 2b | Lesepfad hinter die flache Fassade | ⏳ Offen |
| 3 | Schreibpfad splitten (Feld-Routing Person/Mitgliedschaft) | ⏳ Offen |
| 4 | Eltern-Umbau, `elternkontakte` verliert die Führung | ⏳ Offen |
| 5 | Auth-Pfad: `get_my_person_id()`, RLS, `benutzer.person_id`, Unique-Index | ⏳ Offen |
| 6 | Altlasten droppen, FK `mitglieder.mitgliedtyp → mitgliedtypen.name` | ⏳ Offen |

Nach **jeder** Etappe müssen `npm run typecheck`, `npm run build` und `npm test` grün sein. Etappe 1 war vollständig additiv und hat die Testzahl nicht verändert.

### Die E-Mail ist der Login-Name und pro Verein eindeutig

Eine E-Mail gehört zu genau einer Person. Wer keine eigene hat — typischerweise Junioren — lässt das Feld **leer** und kann sich nicht selbst anmelden; den Zugang übernimmt ein Elternteil. Beide Eltern können je einen eigenen Zugang haben, dann aber mit je eigener Adresse. Eine Familienadresse wird bei genau einer Person hinterlegt.

Erzwungen wird das seit 05.08.2026 in der Datenbank:

```sql
create unique index personen_email_pro_verein
  on public.personen (verein_id, lower(btrim(email)))
  where email is not null and btrim(email) <> '';
```

Drei Eigenschaften, jede mit Grund:

- **Pro Verein, nicht global.** Dieselbe Person kann bei FCH und beim FC Küsnacht stehen — das sind zwei `personen`-Zeilen mit derselben Adresse. Global wäre derselbe Fehler wie bei `mitgliedtypen_name_key` (siehe unten).
- **Partiell.** Ohne die `WHERE`-Bedingung könnte nur *ein* Kind das Feld leer lassen. `NULL` kollidiert in Postgres ohnehin nie, die leere Zeichenkette dagegen schon — deshalb schliesst die Bedingung beides aus.
- **Über `lower(btrim(email))`.** `check_email_bekannt()` und der 2a-Merge vergleichen ebenso; der Index muss demselben Massstab folgen, sonst prüft er etwas anderes als der Code.

**Daraus folgt eine Regel für allen künftigen Code:** Jeder Vergleich auf `personen.email` läuft über `lower(btrim(email))`. Postgres nutzt einen Ausdrucks-Index nur bei exakt demselben Ausdruck — eine Abfrage mit `lower(email)` läuft am Index vorbei. Der frühere `personen_email_idx` aus Etappe 1 (`verein_id, lower(email)`) ist deshalb gelöscht worden; zwei Indizes auf faktisch derselben Spalte kosten bei jedem Schreibvorgang doppelt.

**Was der Index noch nicht leistet:** Die App schreibt heute nach `mitglieder`, nicht nach `personen` — der Doppelklick beim Anlegen eines Mitglieds wird also weiterhin nicht abgefangen (siehe `CLAUDE.md` → Bekannte Defekte). Ab Etappe 3 greift er, und dann muss `23505` in eine lesbare Meldung übersetzt werden.

**Offene Lücke im Testbestand:** Alle 905 Personen haben eine E-Mail — der Zufallsgenerator hat jedem eine vergeben. Der Normalfall „Junior ohne eigene Adresse" kommt also nicht vor, obwohl er bei FCH häufig sein dürfte. Dieselbe Art Lücke wie in Etappe 1, wo es null gemeinsame E-Mails gab und deshalb ein Seed nötig war. Vor Etappe 4 sollten ein paar Junioren ihre Adresse verlieren.

### Berechtigungen: eine Mechanik statt einer Rollenleiter (im Umbau, ab 05.08.2026)

**Das Problem.** ClubCampus hatte zwei Rechtesysteme nebeneinander. Die feste Rollenleiter (`administrator`, `administration`, `vorstand`, `funktionaer`, `trainer`, `spieler`, `eltern`) kennt die Datenbank; die Gruppen mit Modulrechten (`portal_gruppen` → `portal_funktionen` → `benutzer_funktionen`) kennt nur das Frontend. Ein Funktionär mit weiten Gruppenrechten sah im Portal alles und bekam beim Speichern eine Absage.

**Das Zielbild.** Eine Mechanik: Rechte pro Modul über Gruppen. Genau **ein** Sonderfall daneben — der Hauptadministrator (`benutzer.ist_admin`).

So arbeiten die verbreiteten Systeme auch. Fairgate kennt Hauptadministratoren, die alles dürfen und nirgends sonst Rechte brauchen, darunter einzeln vergebene Administrationsbereiche; „Rolle" ist dort ausdrücklich **kein** Recht, sondern ein Etikett zur Gruppierung. ClubDesk liefert Rollen als Vorlagen mit (Gast, Standard, Funktionär, Vorstand), die der Verein frei anpasst und um eigene ergänzt — der Zugriff wird pro Rolle und Modul konfiguriert. Niemand baut eine feste Leiter.

**Was bei uns dazukommt und dort fehlt:** Spieler, Trainer und Eltern bleiben **abgeleitet** (`ableitRolle()` aus Kader und Elternverknüpfung). Das ist der sportspezifische Teil — niemand pflegt Rechte von Hand nach, wenn ein Junior das Team wechselt. Ämter dagegen — Geschäftsstelle, Vorstand, Kassier, Stufenleitung — ergeben sich aus nichts und gehören in Gruppen.

**Die harte Grenze.** Alles, womit man Rechte vergibt, bleibt beim Hauptadministrator: `benutzer` (trägt `ist_admin`), `portal_gruppen`, `portal_funktionen`, `benutzer_funktionen`, `modul_rechte`, `module*`, `feldsichtbarkeit`, `rollen`, `mitgliedtypen` und die Konfigurationstabellen. Käme eine Gruppe dort hin, könnte sie sich selbst zum Administrator machen. Die vollständige Liste steht in `docs/auftrag_rls_gruppenrechte.md`.

**Stufen**

| | | |
|---|---|---|
| 1 | `benutzer.ist_admin`, `is_admin()` umgestellt | ✅ 05.08.2026 — `supabase/migration_ist_admin.sql` |
| 1b | `hat_modul_recht(modul, stufe)` in SQL, gegen die Frontend-Logik geprüft | ✅ 05.08.2026 — `supabase/migration_hat_modul_recht.sql` |
| 2 | ~50 RLS-Policies auf `is_admin() OR hat_modul_recht(...)` | ⏳ Auftrag liegt bereit |
| 3 | `administration` und `vorstand` aus dem Frontend | ⏳ Offen |

Kein additiver Zwischenschritt: Der Verein ist im Aufbau, es gibt keine laufenden Benutzer, die eine Umstellung aussperren könnte. Bei einem Verein im Betrieb müsste vor Stufe 2 geprüft werden, ob jemand `administration` trägt — und wenn ja, vorher eine Gruppe „Geschäftsstelle" eingerichtet und zugewiesen werden.

**Entschieden am 05.08.2026:** `members: verwalten` ist an eine Gruppe delegierbar. Mitglieder anlegen und löschen bleibt also nicht zwingend beim Hauptadministrator. Heute steht `members` in keiner Gruppe auf `verwalten` — auch der Vorstand hat nur `schreiben`.

**Zwei Phantomfelder** sind dabei aufgefallen: `getEffektiveStufeForFunktionaer()` liest `portal_gruppen.default_stufe` und `portal_funktionen.modul_stufen` — beide Spalten existieren nicht. Wirksam sind nur `portal_funktionen.stufe_override`, `portal_gruppen.modul_stufen` und sonst `lesen`. `hat_modul_recht()` bildet bewusst das ab, was **tatsächlich** wirkt; würde jemand die Spalten später ergänzen, liefen Datenbank und Portal auseinander.

### Mandantenfähigkeit: keine globalen Schlüssel (erledigt 05.08.2026)

**Grundsatz.** Was einem Verein gehört, darf nicht global eindeutig sein. Sonst nimmt der erste Verein dem zweiten den Namen weg — und bei Konfigurationstabellen teilen sich beide sogar eine Zeile.

Bei einem Mandanten fällt das nie auf: ein globaler Schlüssel verhält sich dann genau wie ein vereinsbezogener. Derselbe Fehlertyp wie das frühere `.single()` ohne Slug-Filter in `loadTenant()`.

Am 05.08.2026 auf `(verein_id, …)` umgestellt — `supabase/migration_mandant_schluessel.sql`:

| | Tabellen |
|---|---|
| UNIQUE | `mitgliedtypen`, `mitgliedtyp_pflichtfelder`, `rolle_pflichtfelder`, `kader_rollen`, `portal_rollen`, `portal_gruppen`, `rollen`, `trainingsplaetze`, `feldsichtbarkeit`, `module` |
| PRIMARY KEY | `modul_rechte`, `module_config`, `portal_einstellungen` |

Die drei Primärschlüssel wären am schlimmsten gewesen: `modul_rechte (modul, rolle)` ist die Rechte-Matrix. Zwei Vereine hätten sich **dieselbe** geteilt — Verein B setzt ein Häkchen, Verein A bekommt es mit.

**Codeänderung gehört dazu.** Fünf `upsert()`-Aufrufe nennen den Schlüssel explizit (`onConflict`). Wird der Constraint geändert und die Zeile nicht, schlägt jedes Speichern fehl:
`MitgliederKonfigTab` (2×), `PortalverwaltungModul` (2×), `ModuleRechteTab` (1×).

**Bewusst global geblieben:** `api_verbindungen.key` (API-Schlüssel sollen eindeutig sein) und `mitglieder.fairgate_id` (Fremdsystem-ID). Unkritisch sind Schlüssel, deren erste Spalte über einen Fremdschlüssel schon mandantengebunden ist — `mitglied_id`, `team_id`, `gruppe_id`, `modul_id`.

**Folge für Etappe 6.** Der geplante Fremdschlüssel braucht jetzt beide Spalten:

```sql
alter table mitglieder add constraint mitglieder_mitgliedtyp_fkey
  foreign key (verein_id, mitgliedtyp) references mitgliedtypen (verein_id, name);
```

`mitglieder.verein_id` existiert dafür bereits. Vorher die Altzeile korrigieren, die auf `Funktionär` statt `Funktionär/in` steht.

**Noch nicht durchsucht:** RLS-Policies und Abfragen ohne `verein_id`-Filter. Vor dem zweiten Pilotverein einmal systematisch prüfen — der Befund oben betraf nur Schlüssel.

### Pflichtfelder (Stand 05.08.2026)

**Eine Quelle:** `domains/members/pflichtfelder.ts`. Vorher stand „welche Felder sind Pflicht" an drei Stellen mit drei Vokabularen — DB-Matrizen (`adresse`, `vorname_nachname`), `NeuesMitgliedModal` (`strasse`/`plz`/`ort` plus Rückfallliste) und `getProfilCheck` (komplett fest verdrahtet). Ein Mitglied konnte dadurch beim Anlegen gültig sein und in der Datenprüfung sofort unvollständig.

Beide Matrizen führen seit `supabase/migration_pflichtfelder_fein.sql` dieselben feinen Feldnamen wie das Formular. Es gibt keine Übersetzung.

- **Keine Rückfallliste.** Was in der Matrix steht, gilt. Früher galt: kein Häkchen → feste Basisliste. Damit liess sich „nichts ist Pflicht" nicht ausdrücken, und alle Häkchen wegzunehmen verlangte *mehr* als vorher. Typen ohne Konfiguration werden in der Portalverwaltung mit „nichts gesetzt" markiert.
- **`vorname`/`nachname` stehen nicht in der Matrix** (`IMMER_PFLICHT`). Sie sind in `mitglieder` NOT NULL — ein Häkchen, das sich nicht abwählen lässt, wäre eine Lüge in der Oberfläche.
- **Die Rollen-Matrix greift nur in der Datenprüfung**, nicht beim Anlegen: dort steht erst die Portalrolle fest, die sportliche Rolle kommt übers Kader.
- **Was Pflicht ist, muss ausfüllbar sein.** Drei Fehler dieser Art sind am 05.08.2026 aufgefallen: die Spaltenköpfe der Matrix waren fest verdrahtet (`Juniormitglied` statt `Juniorenmitglied`, `Funktionär` statt `Funktionär/in`) — Häkchen schrieben Zeilen für nicht existierende Typen, Pausenmitglied und Supporter hatten gar keine Spalte; die E-Mail war bei Passiv-, Ehren- und Freimitgliedern ausgeblendet, aber Pflicht, wodurch sich diese drei Typen **nicht anlegen liessen**; und `ahv_nr`/`nationalitaet`/`heimatort` standen in der Prüfliste ohne Eingabefeld.

**Die Datenprüfung liest dieselbe Quelle** (seit 05.08.2026). `clubcampus.tsx` lädt beide Matrizen und reicht sie an `getProfilCheck` durch. Zwei Verhaltensänderungen, die daraus folgen und beabsichtigt sind:

- **Die Adresse wird endlich geprüft.** Vorher fragte `getProfilFehlend()` bei Mitgliedern nur Vorname, Nachname, Geburtsdatum und „Telefon *oder* E-Mail" — eine als Pflicht konfigurierte Adresse hatte nirgends eine Wirkung.
- **Telefon und E-Mail zählen getrennt.** Früher genügte eines von beiden. Jetzt gilt, was angekreuzt ist.

Dadurch sehen spürbar mehr Mitglieder beim nächsten Login den Datenprüfungs-Hinweis. Das ist der Zweck der Konfiguration, aber es fällt auf.

### Elternteile beim Anlegen (05.08.2026)

Trägt der Mitgliedtyp `hauptkontakt_pflicht` (bei FCH: Juniorenmitglied), erscheint im Anlegen-Modal ein Elternabschnitt: bestehende Kontakte suchen oder neue erfassen, mehrere möglich, genau einer ist Hauptkontakt.

- **Überspringbar.** Das Anlegen scheitert nicht ohne Elternteil — wer die Daten nicht zur Hand hat, soll nicht blockiert sein. Das Kind erscheint dann in der Datenprüfung.
- **Reihenfolge ist erzwungen, nicht gewählt.** `elternkontakte.mitglied_id` ist NOT NULL: ein neuer Elternteil kann gar nicht vor dem Kind entstehen. Die Einträge liegen deshalb im State, bis das Kind existiert; `speichereEltern()` schreibt danach.
- **Kein Zurückrollen bei Teilfehlern.** Scheitert ein Elternteil, bleibt das Kind stehen — es ist gültig, nur ohne Hauptkontakt. Das Modal bleibt offen und ein zweiter Klick schreibt nur noch die Eltern. Ein Rückbau würde die ganze Eingabe vernichten. Sauber wäre eine `SECURITY DEFINER`-Funktion, die Kind, Elternteil und Verknüpfung in einer Transaktion anlegt — offen, bis der Fall in der Praxis auftritt.
- **`setHauptkontakt()` läuft zuletzt.** Es setzt zuerst alle anderen auf false; mitten in der Schleife würde es zuvor gesetzte wieder löschen. Bestehende Kontakte werden deshalb ohne Flag verknüpft und der Hauptkontakt am Schluss bestimmt.

Die Datenbank erzwingt über `eltern_kinder_ein_hauptkontakt` (partieller Index) nur „höchstens einer". „Genau einer" steuert die Oberfläche bei: der erste Hinzugefügte wird es automatisch, und beim Entfernen rückt der nächste nach.

**Beim Elternteil selbst greift die Matrix nicht**: er hat keine Mitgliedschaft und damit keinen Mitgliedtyp. Für ihn bleibt es bei Vorname, Nachname, Telefon, bis Etappe 4 die Elternkontakte ablöst. Für seine **Kinder** greift sie, weil sie Mitglieder sind.

### Merge-Regel

Zusammengeführt wird **ausschliesslich über E-Mail-Gleichheit**. Nicht über Namen: der Bestand enthält 55 Namenskollisionen eines Zufallsgenerators, drei Zeilen für dieselbe Person sogar mit identischer Adresse — auch Name + Adresse trägt also nicht. Fälle mit gleichem Namen und abweichender E-Mail bleiben offen und werden per SQL gesichtet; eine Oberfläche zum manuellen Zusammenführen kommt mit dem Fairgate-Import, wenn echte Daten dahinterstehen.

Bei Feldkonflikten gilt: **nur leere Felder werden aufgefüllt, abweichende Werte bleiben stehen.** Die Mitgliedschafts-Person überlebt, die Eltern-Person wird gelöscht. Praktisch ist die Konfliktfläche winzig, und zwar strukturell: `elternkontakte` hat nur fünf Datenspalten (`vorname`, `nachname`, `email`, `telefon`/`tel`, `profil_geprueft_at`). Mehr konnte Etappe 1 gar nicht in eine Eltern-Person schreiben — Adresse, Geburtsdatum, AHV, Funktionen und Foto existieren dort nicht. Übernommen werden deshalb nur `telefon` (falls leer) und das spätere `profil_geprueft_at`; Namensabweichungen erscheinen im Konfliktbericht, werden aber nie überschrieben.

### Nach 2a: `personen.id = elternkontakte.id` gilt nicht mehr

Etappe 1 hat jede Eltern-Person mit **derselben `id`** wie ihre `elternkontakte`-Zeile angelegt, damit der spätere Wechsel `eltern_id → person_id` eine reine Umbenennung wird. Der Merge bricht diese Gleichheit für die zusammengeführten Fälle: die Eltern-Person ist gelöscht, `eltern_kinder.person_id` zeigt jetzt auf die Mitgliedschafts-Person, während `elternkontakte.id` unverändert bleibt.

**Die Verknüpfung Person ↔ Kind läuft ab jetzt ausschliesslich über `eltern_kinder.person_id`.** Ein Join `elternkontakte e on e.id = p.id` findet zusammengeführte Personen nicht mehr — das betrifft auch die Kontrollabfrage I1 in `etappe1_personen.sql`, die nach dem Merge bewusst leer läuft.

`eltern_kinder.eltern_id` bleibt unangetastet und zeigt weiter auf `elternkontakte`; deshalb bricht in Etappe 2a kein Anwendungscode. Aufgelöst wird `eltern_id` erst in Etappe 4 — **die dort auf `person_id` aufsetzen muss, nicht auf der id-Gleichheit.**

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

1. Schema, Policies und Rollen dumpen (keine Daten). **`--linked` benutzen, nie `--db-url` mit Passwort** — das Projekt ist verlinkt, die Zugangsdaten stehen unter `supabase/.temp/` (gitignored) und haben im Repo nichts verloren:
```bash
npx supabase db dump --linked -f supabase/schema.sql
```
2. Vor dem Committen gegenprüfen, dass der Dump nichts verloren hat — Vorgehen und die beiden blinden Flecken der Zählprüfung stehen in `CLAUDE.md` → Datenbank-Workflow.
3. `supabase/schema.sql` committen (enthält: Tabellen, Policies, RLS, Funktionen, Rollen — keine Nutzdaten). Die Trigger auf `auth.users` liegen separat in `supabase/auth_triggers.sql`, weil kein `public`-Dump sie erfasst.


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
npm run check:imports

# 2. Automatisch fixen
node scripts/check-imports.mjs --fix

# 3. Typen und Build verifizieren
npm run typecheck
npm run build
```

**Warum:** Konstanten aus `constants.js` (GB, ACCENT, FONT, R, etc.) wurden früher implizit
durch `clubcampus.jsx` geerbt. Seit dem Refactoring ist jedes Modul eigenständig und muss
Konstanten explizit importieren. Das Skript findet fehlende Imports automatisch.

**Script:** `scripts/check-imports.mjs` (prüfen, mit `--fix` auto-fix). Ersetzt die
früheren Python-Skripte — die lasen noch `src/constants.js` und setzten eine
Python-Installation voraus. Für `.ts`/`.tsx`-Dateien findet `npm run typecheck`
dasselbe Problem zuverlässiger; das Skript deckt die noch nicht migrierten
`.js`/`.jsx`-Dateien ab.

**Claude macht dies automatisch** am Ende jeder Session die ein Refactoring enthält.
