# Auftrag für Claude Code — RLS auf Gruppenrechte umstellen

## Ausgangslage

ClubCampus hat zwei Rechtesysteme nebeneinander:

1. **Eine feste Rollenleiter** (`administrator`, `administration`, `vorstand`, `funktionaer`, `trainer`, `spieler`, `eltern`) — das kennt die Datenbank.
2. **Gruppen mit Modulrechten** (`portal_gruppen` → `portal_funktionen` → `benutzer_funktionen`) — das kennt nur das Frontend.

Ein Funktionär mit weiten Gruppenrechten sieht im Portal alles und bekommt beim Speichern eine Absage von der Datenbank. Die Rechte liegen an zwei Orten mit verschiedenen Antworten.

**Zielbild:** Eine Mechanik. Genau ein Sonderfall bleibt — der Hauptadministrator (`benutzer.ist_admin`). Alles andere läuft über Gruppen. So machen es Fairgate und ClubDesk auch.

Vorarbeit ist erledigt (05.08.2026):

- `benutzer.ist_admin` existiert, `is_admin()` liest es → `supabase/migration_ist_admin.sql`
- `public.hat_modul_recht(p_modul text, p_min_stufe text default 'lesen')` existiert und ist gegen die Frontend-Logik geprüft → `supabase/migration_hat_modul_recht.sql`

**`hat_modul_recht()` wird von noch keiner Policy benutzt. Das ist deine Aufgabe.**

## Auftrag

Schreibe alle RLS-Policies so um, dass sie neben `is_admin()` auch die Gruppenrechte auswerten, und entferne dabei die alten Rollenlisten.

**Muster:**

```sql
-- vorher
USING (verein_id = get_my_verein_id()
       AND get_my_role() = ANY (ARRAY['administrator','administration','trainer','funktionaer']))

-- nachher
USING (verein_id = get_my_verein_id()
       AND (is_admin() OR hat_modul_recht('<modul>', '<stufe>')))
```

Stufe nach Policy-Art: `FOR SELECT` → `lesen`, `FOR INSERT/UPDATE` → `schreiben`, `FOR DELETE` → `verwalten`. Bei kombinierten Policies (`USING` ohne `FOR`) → `schreiben`.

Es gibt keine laufenden Benutzer — der Verein ist im Aufbau, nur der Entwickler greift zu. Deshalb **in einem Durchgang auf den Zielzustand**, kein additiver Zwischenschritt.

## Zwei Regeln, die nicht verhandelbar sind

**1. Rechtevergabe bleibt beim Hauptadministrator.** Diese Tabellen behalten `is_admin()` **ohne** `hat_modul_recht`:

```
benutzer, benutzer_funktionen, portal_gruppen, portal_funktionen,
portal_gruppen_teams, portal_rollen, modul_rechte, modul_rollen,
module, module_config, module_berechtigungen, module_delegationen,
modul_benutzer, feldsichtbarkeit, rollen, mitgliedtypen,
mitgliedtyp_pflichtfelder, rolle_pflichtfelder, team_module,
api_verbindungen, api_sync_log, audit_log, portal_einstellungen, vereine
```

Grund: `benutzer` trägt `ist_admin`, und über `portal_gruppen` liesse sich jedes Recht selbst vergeben. Käme eine Gruppe an diese Tabellen, könnte sie sich zum Administrator machen. Das ist die Grenze zwischen Systemzugang und Fachrecht.

**2. Eigene Daten bleiben zugänglich.** Wo heute `benutzer_id = auth.uid()`, `id = get_my_mitglied_id()` oder Ähnliches steht, bleibt das erhalten. Sonst sieht ein Spieler seine eigene Anwesenheit nicht mehr.

## Modulschlüssel pro Tabelle

| Modul | Tabellen |
|---|---|
| `members` | `mitglieder`, `personen`, `elternkontakte`, `eltern_kinder`, `mitglieder_aenderungen`, `mitglieder_aktivitaeten`, `mitglieder_ansichten`, `mitglieder_notizen`, `mitglieder_team_details` |
| `team` | `teams`, `team_stufen`, `kader`, `kader_rollen`, `benutzer_teams` |
| `events` | `termine`, `aufgebote`, `anwesenheiten`, `abstimmungen`, `abstimmung_antworten` |
| `training` | `trainings`, `trainingsplan_vorlagen`, `trainingsplan_slots`, `trainingsplan_ausnahmen`, `trainingsplaetze` |
| `schedule` | `spiele` |
| `helpers` | `helper_events`, `helper_einsaetze`, `helper_schichten`, `helper_zuteilungen`, `helper_einsatz_pflicht`, `helper_einsatz_pflicht_mitglied`, `team_helferaufgaben`, `team_helfer_zuteilungen` |
| `buses` | `busse`, `bus_anmeldungen` |
| `material` | `material`, `material_ausleihen` |
| `nachrichten` | `nachrichten`, `nachrichten_antworten`, `nachrichten_dateien`, `nachrichten_gelesen`, `kommunikationsgruppen`, `kommunikationsgruppen_mitglieder`, `benachrichtigungen`, `push_subscriptions` |
| `news` | `news`, `news_kategorien`, `news_lesestatus` |
| `media` | `medien` |
| `wiki` | `wiki_artikel` |
| `docs` | `dokumente` |

`trainingsplaetze` steht bewusst bei `training` und nicht in der Sperrliste — es sind Stammdaten des Trainingsbetriebs, keine Rechtevergabe.

## Offene Punkte aus Etappe 3 (Eltern-Umbau), hier zu entscheiden

Der Eltern-Umbau hat den Lesepfad von `elternkontakte` auf `personen` und `benutzer` verlegt. Beide Tabellen sind enger geschützt als die alte — die Policies wurden dabei bewusst **nicht** angefasst. Zwei Sichtbarkeiten haben sich dadurch verändert, beide gehören in diesen Auftrag:

**1. Eltern sehen den zweiten Elternteil desselben Kindes nicht mehr.** `elternkontakte` trug neben den engeren Policies noch `elternkontakte_verein` — eine reine `verein_id`-Regel ohne `FOR`-Klausel. Da Policies desselben Kommandos mit ODER verknüpft werden, konnte faktisch jeder Eingeloggte des Vereins jede Elternzeile lesen. `personen` hat keine solche Regel: `personen_select_priv` (administrator/administration/trainer/funktionaer), `personen_select_self` und `personen_select_kind` (nur die eigenen Kinder). Ein Elternteil sieht damit sich selbst und seine Kinder, aber nicht mehr die Mutter oder den Vater desselben Kindes. Im heutigen Portal wird das nirgends gerendert — die Frage ist, ob es das künftig soll (Kontaktdaten des anderen Elternteils im Eltern-Dashboard).

**2. Trainer sehen den Portal-Zugang in der Elternliste nicht mehr.** Die Spalte „Portal" der Elternliste kam aus `elternkontakte.benutzer_id` und war für Trainer lesbar. Seit Block D steht die Information in `benutzer.person_id`, und `benutzer` hat nur `benutzer_select_admin` und `benutzer_select_self`. Der eingebettete Join liefert Trainern deshalb eine leere Menge — die Liste zeigt für alle „Kein Zugang", ohne Fehler. Zu entscheiden: braucht ein Trainer diese Spalte überhaupt? Wenn ja, genügt eine schmale SELECT-Policy auf `benutzer` für `hat_modul_recht('members','lesen')`, beschränkt auf `id`/`person_id` — die Sperrliste oben verbietet `hat_modul_recht` auf `benutzer` allerdings ausdrücklich, weil dort `ist_admin` steht. Der saubere Weg wäre dann eine Sicht (`security_invoker`) statt einer Policy-Lockerung.

## ⚠ Vier Policies nennen Rollennamen — und drei davon weisen jemanden ab, der die Maske sieht

Gemessen am 23.08.2026 bei einem Durchgang über **132 Schreibstellen in
`src/`**: 122 stehen unter einer Bedingung, die mehr verlangt als die
Zugehörigkeit zum Verein, **84 davon zählen nach dem Schreiben nicht nach**.

⚠ **Das sind keine 84 Defekte, und die Zahl so weiterzugeben machte die Liste
wertlos.** Bei den meisten lautet die Bedingung `is_admin()`, und die Maske
ist ohnehin nur für Admins erreichbar. **Die Frage ist nicht „prüft der Code
nach?", sondern „kann jemand diese Maske erreichen, den die Policy abweist?"**

Danach bleiben vier — und sie sind **ein** Befund, nicht vier: überall steht
ein **Rollenname fest in der Policy**, während das Recht in der Oberfläche
längst aus einer Gruppe kommt. Genau das löst dieser Auftrag auf.

| | Policy | Bedingung | wer die Maske erreicht und abgewiesen wird |
|---|---|---|---|
| 1 | `spiel_ereignisse_write` | `is_admin() or get_my_role() = 'trainer' or hat_modul_recht('schedule','schreiben')` | **schon vermerkt** (19.08.2026) — ein Funktionär braucht `schedule: schreiben` in seiner Gruppe |
| 2 | `kader_write` | `get_my_role() IN (administrator, administration, trainer)` | ein **Funktionär** mit `team: schreiben` aus den Gruppenrechten |
| 3 | `ansichten_write` | `benutzer_id = auth.uid() OR is_admin()` | **jeder**, dem eine geteilte Ansicht angezeigt wird |
| 4 | ≈60 Stellen | `is_admin()` | die UI prüft `role === "administrator"`, die Policy `benutzer.ist_admin` |

**Zu 2 — und das ist der schärfste, weil daneben das Gegenbeispiel steht.**
`trainings_write` führt `funktionaer` in seiner Liste, `kader_write` nicht.
Ob das je entschieden wurde, steht nirgends; es sieht aus wie zwei Policies,
die zu verschiedenen Zeiten geschrieben wurden. Der Funktionär kann die
Kader-Maske über die Gruppenrechte bekommen — und dann tut jedes Speichern
nichts, ohne Fehler.

```sql
-- die zwei nebeneinander
select tablename, regexp_replace(coalesce(qual,with_check),'\s+',' ','g')
  from pg_policies where schemaname='public' and tablename in ('kader','trainings')
   and cmd in ('ALL','UPDATE','INSERT');
```

**Zu 3 — die Lese-Hälfte ist am 23.08.2026 repariert, die Schreib-Hälfte
gehört hierher.** `ansichten_select` liess fremde Ansichten nur bei
`ist_standard = true` durch, während die Funktion `geteilt` heisst; seit
`migration_ansichten_geteilt.sql` sieht ein Nicht-Autor die geteilten
Ansichten. **Ob er sie auch ändern oder löschen darf, ist eine
Rechtefrage** — und zwar genau die, die dieser Auftrag beantwortet: „darf"
soll aus der Gruppe kommen, nicht aus `benutzer_id = auth.uid() OR
is_admin()`. Bis dahin ist das Verhalten wenigstens ehrlich: sehen ja,
ändern nein.

**Zu 4 — heute einig, und das ist keine Absicherung.** Gemessen: 5 Konten,
das eine mit `ist_admin = true` hat auch `role = 'administrator'`, die vier
anderen beides nicht. Aber `role` ist ein **berechneter** Wert
(`ableitUndSaveRolle()`), `ist_admin` ein **gesetztes** Kennzeichen — am
05.08.2026 ausdrücklich getrennt, damit die Ableitung einen Admin nicht mehr
degradiert. Läuft eines dem anderen davon, sieht ein Admin seine Maske, und
jeder Klick darin verpufft. **Solange zwei Quellen dieselbe Frage
beantworten, gehört die Oberfläche auf dieselbe wie die Policy** — hier also
`ist_admin`, nicht `role`.

⚠ **Und für alle vier gilt dasselbe zweite Ende:** solange der Code nach dem
Schreiben nicht zählt, meldet er in jedem dieser Fälle Erfolg. Ein `update`
ohne Treffer ist bei PostgREST kein Fehler (`204`, `error === null`). Die
Regel dazu steht in CLAUDE.md; wer eine dieser Policies anfasst, sieht sich
die zugehörige Schreibstelle gleich mit an.

## Der Grund, warum die Rolle `funktionaer` schief liegt

Beim Aufräumen am 05.08.2026 kam ein Fall hoch, den dieser Umbau mitlösen muss.

`ableitRolle()` bestimmt die Portalrolle in dieser Reihenfolge:

```
1. Trainer-Kaderrolle             → trainer
2. andere Kaderrolle              → höchste nach Priorität
3. standard_rolle spieler/trainer → diese
4. Vereinsfunktionen vorhanden    → funktionaer
5. andere standard_rolle          → diese
6. sonst                          → supporter
```

**Schritt 3 vor Schritt 4 ist Absicht.** Wer im Grümpi-OK mithilft, ist deswegen kein Funktionär — ein Junior mit `standard_rolle = spieler` bleibt Spieler, auch wenn er an einem Anlass mitarbeitet. Ohne diese Reihenfolge bekäme jeder OK-Helfer Funktionärsrechte auf Mitgliederdaten.

**Der Preis ist der umgekehrte Fall.** Ein Juniorenmitglied, das Kassier wird, bekommt trotzdem `spieler` — das echte Amt bleibt folgenlos, weil der Rückfallwert aus dem Mitgliedtyp vorher greift.

Beides zeigt dasselbe: **Nicht jede Funktion ist gleich viel wert, und `funktionaer` als eine Rolle kann das nicht abbilden.**

Die Struktur dafür existiert bereits. Jede Funktion hängt an einer Gruppe:

| Gruppe | Funktionen | Gewicht |
|---|---|---|
| Vorstand | Präsident, Kassier | Zugriff auf Mitglieder, Teams, Finanzen |
| Vereinsleben & Events | Grümpi-OK, Chef Anlässe, Award-Night-OK | Termine und Helfer, Mitglieder nur lesend |
| Betrieb & Infrastruktur | Materialwart | Material, Garderoben |

**Die Gruppe sagt bereits, wie viel eine Funktion wert ist** — mit `module` und `modul_stufen`. Sobald `hat_modul_recht()` in den Policies steht, braucht es die Rolle `funktionaer` als Zwischenschritt nicht mehr: Der Kassier bekommt seine Rechte aus der Gruppe „Vorstand", der OK-Helfer aus „Vereinsleben & Events", und niemand muss über eine Reihenfolge in `ableitRolle()` entscheiden.

**Für diesen Auftrag heisst das:** `ableitRolle()` bleibt vorerst unverändert — die Reihenfolge ist bewusst gewählt. Aber die Policies dürfen sich **nicht** darauf stützen, dass jemand die Rolle `funktionaer` trägt. Wo heute `get_my_role() = 'funktionaer'` steht, gehört `hat_modul_recht('<modul>', '<stufe>')` hin. Sonst hängt der Zugriff weiterhin an einer Rolle, die den Unterschied zwischen Kassier und OK-Helfer gar nicht kennt.

## Ein Amt und ein Rechtebündel heissen beide „Funktion"

Beim Ordnen der Portalverwaltung am 17.08.2026 aufgefallen, gehört hierher
entschieden.

`portal_funktionen` heisst „Funktion", meint aber ein **Rechtebündel**: Die
Tabelle hält `module_override`, `teams`, `filter` und `stufe_override`, und
`portal_gruppen` darüber `module` und `modul_stufen`. Ein Eintrag „Präsident"
sagt dort nicht, dass jemand Präsident ist — er sagt, welche Module jemand
sehen darf.

**Dass jemand Präsident ist, steht woanders:** in `mitglieder.funktionen`, dem
Textfeld, in dem bis zum 05.08.2026 bei 487 Mitgliedern „Spieler" stand.

Damit gibt es das Amt zweimal, an zwei Orten, mit zwei Bedeutungen — dieselbe
Doppelung, die der Personen-Umbau überall aufgelöst hat.

**Am 17.08.2026 anhand der Vereinsstatuten geklärt** (ausführlich in
`ARCHITECTURE.md`, „Was ein Mitglied ist — die Statuten des FCH"):

Artikel 8 sagt, wer Funktionär ist — Vorstandsmitglieder, hauptverantwortliche
Trainer, gemeldete Schiedsrichter. **Nicht jedes Amt macht zum Funktionär.**
Ein Spieler, der im Grümpi-OK mithilft, bleibt Aktivmitglied. Ein Stufenleiter
wird Funktionär.

Daraus folgen zwei Dinge für diesen Auftrag:

- **Der Mitgliedtyp ist nicht das Problem.** Er wird von Hand gesetzt, weil
  jemand entschieden hat, und bildet Artikel 6 ab. Die Software leitet ihn
  nirgends ab.
- **Das Problem sind die Rechte.** Ein Supporter darf eine Vereinsfunktion
  haben — sonst könnte er nicht im OK mithelfen. Was er nicht bekommen darf,
  sind Funktionärsrechte auf Mitgliederdaten. Heute bekommt er sie, weil aus
  jeder Funktion die Rolle `funktionaer` abgeleitet wird.

**Der konkrete Fall, an dem sich der Umbau messen lassen muss:**

> Jemand ohne Mitgliedschaft hilft im Grümpi-OK. Er ist Supporter. Er braucht
> Zugriff auf Termine und Helfereinsätze — und darf die Mitgliederliste nicht
> sehen. Heute bekommt er über die Funktion die Rolle `funktionaer` und damit
> beides.

Die Gruppe weiss das bereits: „Vereinsleben & Events" trägt in
`portal_gruppen.module` andere Module als „Vorstand". Es wird nur nicht benutzt,
weil die Rolle davorsteht.

**Zu entscheiden bleibt:**

1. Braucht es die Rolle `funktionaer` überhaupt noch, wenn die Rechte aus der
   Gruppe kommen?
2. Wenn zwei: Wie hängen sie zusammen? Über den Namen wäre dieselbe Falle wie
   bei der Team-Zuordnung — „Kassier" gibt es womöglich zweimal.
3. Was wird aus `mitglieder.funktionen`? Es ist ein Textfeld ohne Bezug zu
   `portal_funktionen`. Acht Einträge auf sechs Ämter stehen darin, gepflegt
   wird es von Hand.

„Gruppen & Funktionen" bleibt in der Portalverwaltung unter den Berechtigungen
— dort wirkt es. Das Amt selbst steht bei den Mitgliedern; die beiden
auseinanderzuhalten ist Teil dieses Auftrags.

## Vorgehen

1. Alle Policies auflisten und nach Tabelle gruppieren. Zeig mir die Liste, **bevor** du etwas änderst.
2. Eine Migrationsdatei `supabase/migration_rls_gruppenrechte.sql` schreiben, nach Tabellen gegliedert, jede Policy mit `DROP POLICY IF EXISTS` und `CREATE POLICY`.
3. Am Ende der Datei Prüfabfragen: Welche Policies nennen noch `'administration'` oder `'vorstand'`? (muss 0 sein) Welche Tabellen aus der Sperrliste rufen `hat_modul_recht` auf? (muss 0 sein)
4. Die Datei **nicht** ausführen — Didi spielt sie im SQL-Editor ein.

## Danach, nicht Teil dieses Auftrags

Stufe 4 räumt das Frontend auf: `administration` und `vorstand` aus `APP_ZUGRIFF_DEFAULT` (`domains/app/getPermissions.ts`), `NAV_BY_ROLE` (`modules/NavigationModul.tsx`), `ADMIN_ROLES` (`domains/permissions/permissions.js`), `modules/portal/portalUtils.ts` und `modules/members/memberConstants.ts`.

## Projektregeln

Siehe `CLAUDE.md`. Für diesen Auftrag besonders:

- Analysieren, Plan zeigen, auf Freigabe warten, dann umsetzen.
- Keine Datei ohne `npm run typecheck` (0 neue Fehler), `npm run build` (grün), `npm test` (371 grün).
- Deutsch (Schweiz) in Kommentaren, kein ß.
