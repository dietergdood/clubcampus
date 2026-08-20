# Auftrag für Claude Code — Elternseite: die Kette schliessen

## Ausgangslage

Seit dem Deploy vom 20.08.2026 sperrt die Datenprüfung bei fehlenden
Pflichtfeldern. **372 Junioren hängen an der AHV-Nummer** — bewusst Pflicht,
ohne sie keine Lizenz, sie steht auf der Krankenkassenkarte. Beim Kind selbst
ist niemand angemeldet, also muss der Elternteil sie erfassen. Er kann es
nicht.

Der Kommentar in `getProfilCheck.ts` nennt als Grund, `kinderVonElternteil()`
gebe eine leere Liste zurück, und die Änderung sei eine Verhaltensänderung.
Beides stimmt — aber es ist nicht der Engpass. **Die Kette ist an fünf Stellen
unterbrochen, jede davon lautlos.** Am 20.08. geprüft:

**1 · Lesen der Kinder ist per RLS gesperrt.**
`fetchKinderVollstaendigFuerElternteil()` liest `eltern_kinder` und embedded
`mitglieder:mitglied_id(...)`. Auf `mitglieder` gibt es nur
`mitglieder_select_priv` (Verwaltung/Trainer/Funktionär) und
`mitglieder_select_self` (`id = get_my_mitglied_id()`). Ein Elternteil hat
weder die Rolle noch eine `mitglied_id` → der Embed kommt als `null` zurück,
`flacheZeile(null)` gibt `null`, `.filter(Boolean)` wirft es weg. Ergebnis:
leere Liste, **kein Fehler**. Sieht aus wie „keine Kinder erfasst".

`personen_select_kind` mit `person_ist_mein_kind()` existiert dagegen und
arbeitet korrekt (SECURITY DEFINER). Die **Person** des Kindes darf der
Elternteil lesen — nur den Weg dorthin über `mitglieder` nicht.

**2 · Schreiben ist ebenfalls gesperrt.** Es gibt weder `personen_update_kind`
noch `mitglieder_update_kind`. `updateMitglied()` stellt dabei eine falsche
Diagnose: es liest `mitglieder.person_id`, bekommt unter RLS nichts, schliesst
daraus „Mitglied ohne Person" und schreibt in die Altspalten — die es seit
Etappe 6a nicht mehr gibt.

**3 · Die Erfolgsmeldung ist ungedeckt.** `alleBestaetigen()` in
`DatenpruefungEltern.tsx` ignoriert den Rückgabewert von `updateMitglied()` und
setzt in jedem Fall „Alles bestätigt ✓".

**4 · AHV ist in der Elternmaske read-only** — „Nur lesbar, Änderungen durch
den Administrator". Selbst mit 1–3 gelöst bliebe genau das Feld gesperrt, an
dem die 372 hängen.

**5 · Die Elternmaske steht ausserhalb der Feldkonfiguration.**
`DatenpruefungTab` reicht `pflichtfelder` nur an `DatenpruefungMitglied`
weiter; die Elternmaske hat eine fest verdrahtete Feldliste.

## Voraussetzung

`auftrag_feldkonfig_gilt_fuer.md` muss durch sein. Die eigenen Felder des
Elternteils kommen von dort; **hier wird die Migration nicht angefasst.**

## Die Entscheide

**Asymmetrisches Recht: die Person des Kindes ja, die Mitgliedschaft nein.**

| | |
|---|---|
| `mitglieder_select_kind` | **ja** — lesen |
| `personen_update_kind` | **ja** — schreiben |
| `mitglieder_update_kind` | **nein** |

Der Elternteil pflegt die Person seines Kindes, nicht dessen Mitgliedschaft.
`mitgliedtyp`, `spielerpass`, `js_nr`, `fairgate_id`, `aktiv`, `eintrittsdatum`
bleiben bei der Verwaltung. Das Lesen von `mitglieder` ist unbedenklich: die
Tabelle hat noch 14 Spalten, nichts Heikles steht darin — gebraucht wird sie
für den `mitgliedtyp`, ohne den es keine Feldkonfiguration für das Kind gibt.

**⚠ RLS kennt keine Spalten.** `personen_update_kind` erlaubt zeilenweise
alles: der Elternteil könnte damit auch `funktionen`, `profil_geprueft_at` oder
`email` seines Kindes setzen. Die Spaltensperre muss auf App-Ebene dazu —
**als Allowlist, nie als Denylist.** Schlag im Plan vor, wo sie sitzt; sie
gehört in `personService`/`memberService` und nicht in die Maske, sonst hat der
nächste Schreibpfad sie nicht.

**AHV: der Elternteil darf sie erfassen.** Das ist der einzige Weg, der die 372
auflöst — die Nummer steht auf der Krankenkassenkarte des Kindes, der
Elternteil hat sie, die Verwaltung nicht. Die Maskierung („• • •" mit
Aufdecken) bleibt, das Feld wird schreibbar.

> Beide Entscheide sind eingebaut, nicht offen. Falls Didi sie kippt, ändert
> sich der Umfang erheblich — dann nachfragen, nicht selbst umbauen.

## Was zu bauen ist

**Migration** (eigene Datei, `do $mig$`-Block):
- `mitglieder_select_kind` — analog `personen_select_kind`, über eine
  Hilfsfunktion `mitglied_ist_mein_kind(bigint)` oder direkt über
  `eltern_kinder`. SECURITY DEFINER, `search_path` gesetzt, wie das Vorbild.
- `personen_update_kind` — `using` **und** `with check`. Ohne `with check`
  könnte der Elternteil die `verein_id` der Zeile umschreiben.

**Domain:**
- `fetchKinderVollstaendigFuerElternteil()` prüfen: mit der neuen Policy trägt
  der bestehende Embed. Falls nicht, über `personen` statt über `mitglieder`
  einsteigen — nicht raten, messen.
- `updateMitglied()`: der Zweig „Mitglied ohne Person" ist als Diagnose falsch,
  sobald RLS die Ursache sein kann. Er schreibt heute in Spalten, die es nicht
  mehr gibt. Trenn die beiden Fälle und lass den RLS-Fall als Fehler
  zurückkommen statt als Altspalten-Schreibversuch.

**Oberfläche (`DatenpruefungEltern.tsx`):**

**⚠ Die Feldliste wird als eigene, wiederverwendbare Komponente gebaut, nicht
in die Maske hineingeschrieben.** Sie bekommt eine Feldkonfiguration und einen
Datensatz und rendert daraus die sichtbaren Felder — mehr weiss sie nicht. Die
Personenseite, die unmittelbar danach kommt, zeigt dieselben Felder derselben
Menschen; ohne gemeinsame Komponente stünden hinterher zwei Formulare für
dieselbe Sache nebeneinander, und die nächste Feldänderung müsste an beiden
gemacht werden. Genau die Sorte Dublette, die `cc.css` heute zehnmal hat.

Was **nicht** dazugehört: die Bestätigungslogik, die Sperre des Knopfes, der
Schreibvorgang. Die Datenprüfung bleibt ein eigener Ablauf — eine Aufforderung
mit Bestätigung, halbjährlich —, die Personenseite ist eine Profilseite. Nur
die Felddarstellung ist gemeinsam. Schlag den Ort im Plan vor; `src/shared/`
ist die Richtung, weil die Personenseite ohnehin nach `src/shared/person/`
zieht.
- `pflichtfelder` durchreichen — vom Profil über `DatenpruefungTab` bis in die
  Maske, dieselbe Quelle wie bei `DatenpruefungMitglied`. **Pro Kind der
  Mitgliedtyp des Kindes**, für den Elternteil selbst die neue Achse
  `ohne_mitgliedschaft`.
- Die fest verdrahtete Feldliste der `KindCard` fällt und rendert nach
  Konfiguration.
- AHV schreibbar.
- Knopf sperrt, solange etwas fehlt, das der Elternteil selbst erfassen kann.
  Was nur die Verwaltung ändert (E-Mail, Spielerpass), wird genannt und sperrt
  nicht — sonst ist es eine Sackgasse. Dieselbe Trennung nach Zuständigkeit
  wie am 20.08. bei `DatenpruefungMitglied`.
- **Die Erfolgsmeldung hängt am Rückgabewert.** Schlägt ein Schreibvorgang
  fehl, sagt die Maske welches Kind und welches Feld. Ein „Alles bestätigt ✓",
  das nichts geschrieben hat, ist schlimmer als eine Fehlermeldung: der
  Elternteil versucht es nie wieder.
- `markiereProfilGeprueft()` und `sollProfilPruefen()` in `getProfilCheck`
  arbeiten danach ebenfalls über echte Kinder — beide rufen dieselbe Funktion.

## Tests

- `kinderVonElternteil()` liefert die verknüpften Kinder — heute rot.
- Die Allowlist lässt `ahv_nr`, `geburtsdatum`, Adresse durch und `funktionen`,
  `email`, `verein_id` nicht.
- Ein fehlgeschlagener Schreibvorgang erzeugt **keine** Erfolgsmeldung.

Ein Test prüft den Soll-Zustand und ist rot, solange er nicht gilt. Rot ist ein
Zustand für Stunden, nicht für Wochen.

## Was NICHT Teil dieses Auftrags ist

- **Die Personenseite.** `MemberHero` + `MemberDetail` nach `shared/person/`,
  Tabs zweiachsig — eigenes Vorhaben, direkt danach. Bau die Elternmaske so,
  dass sie später dorthin umziehen kann.
- **Die RLS-Gruppenrechte** (`auftrag_rls_gruppenrechte.md`). Dieser Auftrag
  ist die kleinere Hälfte davon: dieselbe Datei, dieselbe Denkweise, aber nur
  die Eltern-Kind-Achse. `mitglieder_select_priv` bleibt vorerst, wie es ist.
- **Der Verlauf auf `person_id`** und das DSGVO-Löschen.

## Vorgehen

1. Bestandsaufnahme und Plan. Zeig darin ausdrücklich, **wo die Allowlist
   sitzt** und **wie der RLS-Fall in `updateMitglied` vom Fall „ohne Person"
   unterschieden wird**. Nichts bauen.
2. Migration zeigen, Didi führt sie aus.
3. Domain, dann Maske.
4. Zum Schluss: mit einem echten Elternkonto in der Oberfläche nachweisen, dass
   eine AHV-Nummer ankommt. Ein grüner Test beweist das hier nicht — jede der
   fünf Unterbrechungen war ohne Fehlermeldung.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- `catch {}` ohne Bindung ist verboten. Genau dieses Muster hat hier fünfmal
  einen Ausfall wie eine Datenlage aussehen lassen.
- Migration über drei Anweisungen hinaus in **einen** `do $mig$`-Block mit
  Zählprobe am Ende, Zahlen aus dem **Dump**.
- Keine Datei ohne `npm run typecheck`, `npm run build`, `npm test`.
- Nach der Strukturänderung Dump **und** `npm run gen:types` nachziehen.
- Deutsch (Schweiz) in Kommentaren, kein ß.
