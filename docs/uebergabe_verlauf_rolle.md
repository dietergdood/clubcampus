# Übergabe an den Theme-Chat: das Feld `rolle` an der Verlaufszeile

Stand 24.09.2026, Commit `baac77a`. **Alles hier ist an unserem Code
gemessen**, nicht erinnert — die Beispielzeile unten ist durch
`bildeVerlauf()` erzeugt, dieselbe Funktion, die der scharfe Lauf benutzt.

⚠ **Über dein Repository steht hier nichts, was wir nicht messen können.**
Was wir von deiner Seite kennen, ist der Stand von
`wordpress/wp-export-empfaenger.php` in *unserem* Repo; wo eine Aussage
darüber hinausgeht, steht sie als Frage am Ende.

---

## 1 · Das Feld

```
Name    rolle
Ort     Unterfeld des Repeaters `verlauf` — NICHT am Spiel
```

Es steht **an der Verlaufszeile**, also neben `minute`, `art`, `text`,
`ohne_person`. Am Spiel selbst kommt nichts dazu; die äussere Ebene ist
unverändert.

## 2 · Die Form

| | |
|---|---|
| Typ | **Zeichenkette** |
| wenn nichts gilt | **`""`** — leerer Text |
| fehlt es je? | **nein** |

⚠ **`""` und „fehlt" sind hier nicht dasselbe, und nur eines kommt vor.**
Das Feld ist in jeder Verlaufszeile gesetzt — ein leerer Text heisst „es
gibt keinen Rollenvermerk zu zeigen", nicht „wir haben nicht gefragt".
Drüben braucht es also **keine** Unterscheidung `isset()` gegen `''`.

⚠ Wir führen den Unterschied trotzdem, nur nicht in der Nutzlast: bei uns
heisst `rolle_kategorie_id = null` **nicht gefragt** (Altbestand) und
`= 1` **Spieler**. Für die Anzeige fallen beide zusammen, deshalb kommt
für beide `""`. Wer die zwei auseinanderhalten muss, sind wir.

## 3 · Welche Werte vorkommen können

Der Wert ist der **Klartext des Verbands** zur Rollenkategorie
(`roleCategoryName`), unverändert durchgereicht und nur getrimmt.

Der Verband führt **28 Kategorien** (`docs/sfv/sfv_stammdaten.json`, Liste
`Rollenkategorie`). Ihre Ids sind **nicht durchgehend** — 1–6, 9–28, 98,
99; 7 und 8 fehlen. Die Namen, in der Schreibweise der Stammdaten:

```
 1 Spieler                      2 Schiedsrichter
 3 Trainer                      4 Funktionär
 5 Auswahlspieler               6 Kursorganisatoren
 9 Betreuer                    10 Verein
11 Medien                      12 Lieferant
13 Sponsor juristisch          14 Sponsor natürlich
15 Sportanlage                 16 Verband
17 Kommission                  18 Sportanlagebesitzer juristisch
19 Kreisverband                20 Sportanlagebesitzer natürlich
21 Medien natürlich            22 Mitglied natürlich
23 Ticketing natürlich         24 Ticketing juristisch
25 Community Member            26 Sporthalle
27 Mitglied juristisch         28 Scout
98 Diverse natürliche Personen 99 Diverse juristische Personen
```

**Kategorie 1 kommt nie an.** Für einen Spieler ist `rolle` leer — das ist
die Entscheidung, nicht ein Nebeneffekt.

### ⚠⚠ DIE STAMMDATEN UND DIE ECHTE ANTWORT SIND NICHT ZEICHENGLEICH

Gemessen am 24.09.2026 an einer aufgezeichneten Antwort
(`docs/sfv/matchdaten_beispiel.json`, fünf Ereignisse):

| | `roleCategoryId` | Text |
|---|---|---|
| echte Antwort `/events` | 1 | **`"Spieler/in"`** |
| `sfv_stammdaten.json` | 1 | **`"Spieler"`** |

**Zwei Listen desselben Verbands, und sie schreiben verschieden.** Für dich
heisst das: **auf keinen Text vergleichen.** Ein `=== 'Trainer'` trifft
`'Trainer/in'` nicht, und dann fehlt der Vermerk, ohne dass irgendetwas
fehlschlägt.

⚠ **Für Kategorie 3 ist kein Ereignis aufgezeichnet** — ob dort
`"Trainer"` oder `"Trainer/in"` ankommt, ist **ungemessen**. Die Zahl steht
in unserer Datenbank und ist mit einer Abfrage zu holen (siehe
`supabase/abfragen_2026-09-24_trainerkarte_probe.sql`, Abfrage 3); sie
gehört zu den Fragen unten.

⚠ **Der Text wird von uns nicht geputzt.** Fremde Daten stillschweigend zu
säubern versteckt den Fehler, statt ihn zu melden — dieselbe Entscheidung
wie beim Doppelabstand in „Gruppe  2" und bei „Schweizer-Cup" neben
„Schweizer Cup". Wenn dort `"Trainer/in"` steht, steht es auch bei dir so.

## 4 · Was damit zu tun ist — und was nicht

**Anzeigen, vor dem Namen.** Der Vermerk sagt, *was* jemand ist, wenn wir
nicht sagen können, *wer*.

| | |
|---|---|
| ✅ | den Wert **zeigen**, wie er ankommt |
| ✅ | ihn weglassen, wenn er leer ist |
| ❌ | **die Rolle aus `text` herausschneiden** |
| ❌ | **den Wert gegen eine eigene Liste vergleichen** |
| ❌ | die Schreibweise angleichen („Trainer/in" → „Trainer") |
| ❌ | daraus auf eine **Mannschaftsstrafe** schliessen |

⚠ **Der dritte und der vierte Punkt sind der Grund, warum es das Feld
gibt.** Ohne es wärst du beim nächsten Schritt gezwungen, `"Trainer"` aus
`text` herauszuschneiden — **derselbe Fehler wie `"Unser Team"` als
Zeichenkette, eine Runde später.** Und eine eigene Liste der 28 Kategorien
wäre eine zweite Wahrheit neben den Stammdaten des Verbands, die gepflegt
werden müsste: heute sind es 28, morgen vielleicht 29.

⚠ ⚠ **`text` TRÄGT DIE ROLLE BEREITS MIT, und `text` ist unverändert.**
Gemessen: bei einem benannten Trainer steht dort `"Trainer/in Hans Meier"`.
Wer `rolle` **zusätzlich** anzeigt, zeigt sie zweimal. Das ist eine
Gestaltungsfrage und deine Entscheidung — nur soll sie nicht dadurch
beantwortet werden, dass jemand `text` zerlegt.

⚠ **Und `text` bleibt vorerst so.** Dieselbe Lage wie bei
`ereignis_zusatz`: solange nicht bestätigt ist, dass das neue Feld
**gefüllt ankommt** — nicht gesendet, angekommen —, darf die Angabe nicht
aus `text` verschwinden. Sonst steht bei einer Trainerkarte nur noch ein
Name ohne Rolle, und niemand merkt es.

## 5 · Wie es mit `ohne_person` zusammenspielt

Die beiden sind ein Paar: zusammen sagen sie alles, was wir über den
Menschen hinter einer Zeile wissen.

**Die Tabelle ist erzeugt, nicht getippt** — sie ist die Ausgabe von
`bildeVerlauf()` vom 24.09.2026:

| Fall | `rolle` | `ohne_person` | `text` |
|---|---|---|---|
| eigener Trainer, Name da | `Trainer/in` | `false` | `Trainer/in Hans Meier` |
| eigener Trainer, nur Rückennummer | `Trainer/in` | `false` | `Trainer/in Nr. 7` |
| eigener Trainer, **kein** Name | `Trainer/in` | **`true`** | `Trainer/in` |
| eigener Spieler mit Nummer | `""` | `false` | `Nr. 13` |
| Altbestand (nicht gefragt) | `""` | **`true`** | `Unser Team` |
| **fremder** Trainer | `Trainer/in` | **`false`** | `Trainer/in FC Fällanden` |

⚠ **Ein Sonderfall, der hierher gehört:** trägt der Verband die Kategorie 3,
aber als Text einen Strich (`"-"`) oder nichts, dann ist `rolle` leer **und**
`text` steht auf `"Unser Team"` — wir wissen dann, dass es kein Spieler ist,
können es aber nicht in Worte fassen. Gemessen am 24.09.2026; ob der Verband
das bei `roleCategoryName` überhaupt tut, ist ungemessen. Bei `subtyp` tut er
es (dort steht bei Subtyp 0 ein `-`), und genau deshalb prüfen wir es.

⚠ **`ohne_person` wird durch die Umstellung SELTENER wahr.** Vorher war es
wahr für jeden eigenen Trainer (es gab keinen Namen); jetzt nur noch für
den, den wir auch mit Rolle nicht benennen können, und für den Altbestand.

### ⚠⚠ Für Gegner ist `ohne_person` `false` — und das ist KEINE Änderung

**Gemessen: es ist `false`, seit es das Feld gibt.** In der Bedingung steht
`wir && !benennbar`, und `wir` war von der ersten Zeile an dabei.

Semantisch wäre `true` die wahrere Antwort — einen Gegner können wir nie
benennen. Es bleibt trotzdem, wie es ist: das wäre eine **unbestellte
Bedeutungsänderung an jeder fremden Verlaufszeile** auf einer öffentlichen
Seite, deren Umgang mit dem Feld wir nicht kennen.

⚠ **542 waren es am 11.09.2026 — das ist eine Messung von damals**, und wer
sie zitiert, macht eine Behauptung über heute. Für die Grössenordnung
genügt sie; für eine Entscheidung wäre sie neu zu zählen.

> Eine Zahl, deren Bedeutung sich ändert, ohne dass ihr Name sich ändert,
> ist gefährlicher als eine falsche.

**Der Punkt steht offen, nicht entschieden.** Wenn du `ohne_person` bei
Gegnern auswertest, sag es uns — dann ist es eine Entscheidung mit
bekanntem Preis und keine Reparatur.

## 6 · Die Fassungsnummer

```
NUTZLAST_FASSUNG = 6      (vorher 5)
```

Sie steht in `src/domains/spiele/wpNutzlast.ts` und **löst den Export aus**:
ändert sie sich, gilt jedes Spiel als geändert und geht neu hinaus. Sie ist
der Anlass, den Empfänger nachzuziehen.

Zur Einordnung: Fassung 4 brachte `ohne_person` (13.09.2026), Fassung 5
`sfv_gegner_team_id` am Spiel (23.09.2026), Fassung 6 ist `rolle`.

## 7 · ⚠⚠ Was passiert, solange der Empfänger das Feld nicht kennt

**Gemessen an `wordpress/wp-export-empfaenger.php`, Stand in unserem Repo**
— wenn drüben eine neuere Fassung liegt, gilt deine.

`CC_VERLAUF_FELDER` führt **11** Namen: `minute`, `art`, `seite`, `text`,
`stand`, `klub`, `sfv_person_id`, `ein_nummer`, `nummer`,
`ereignis_zusatz`, `ohne_person`. **`rolle` ist nicht darunter.**

`cc_schreibe_verlauf()` baut jede Zeile aus genau dieser Liste — der Wert
fällt also **an deiner eigenen Allowlist** weg, eine Stufe **vor** ACF. Es
geht nichts kaputt, es fehlt nur.

**Und es ist sichtbar, weil der Melder die rohe Nutzlast bekommt:**

```php
cc_pruefe_unterfelder( $post_id, 'verlauf', $verlauf, CC_VERLAUF_FELDER );
//                                          ^ die ROHE Nutzlast
```

Daraus folgt in der Antwort von **`POST /clubcampus/v1/spiele`**
(`cc_route_spiele()`):

| Feld | erwartet |
|---|---|
| `unbeachtete_unterfelder` | enthält **`"verlauf.rolle"`** |
| `unterfelder_ohne_acf` | **unberührt** — die andere Richtung |
| `unterfelder_geprueft["verlauf"]` | **`12:11:11`** statt `11:11:11` |

⚠ **Die Richtung ist wichtig, und die zwei Listen hiessen zeitweise fast
gleich:** `unbeachtete_unterfelder` heisst „die Nutzlast bringt einen Namen,
den *wir* nicht kopieren" — das ist dieser Fall. `unterfelder_ohne_acf`
heisst „wir kopieren einen Namen, den der Zielrepeater nicht kennt" — das
war `ein_nummer`, und es wird hier **nicht** anschlagen, solange der Name
nicht in `CC_VERLAUF_FELDER` steht.

**Nachzusehen ist also drüben**, in der Antwort des Export-Laufs, nicht in
`/status`.

### ⚠⚠ Und unsere Seite reicht diesen Melder NICHT durch

Gemessen in `src/domains/spiele/wpLauf.ts`: die Laufzusammenfassung sammelt
`unbeachtete_felder`, `ohne_feldschluessel` und `feld_mehrdeutig` — **die
drei Unterfeld-Angaben sind nicht dabei.**

Der Melder feuert also, und in unserer Kachel steht davon nichts. Das ist
ein Befund auf **unserer** Seite; wir führen ihn als offenen Punkt. Bis er
behoben ist, ist die Antwort des Empfängers die einzige Stelle, an der es zu
sehen ist.

## 8 · ⚠ Den Namen `rolle` gibt es schon — am anderen Repeater

```
aufstellung.rolle   start | eingewechselt | nicht_eingesetzt
verlauf.rolle       Trainer/in | Betreuer | … | ""
```

**Zwei Unterfelder, gleicher Name, verschiedene Bedeutung und verschiedene
Wertemengen.** `aufstellung.rolle` gibt es seit längerem und ist
unverändert.

⚠ **Technisch ist das keine Falle** — und das steht so schon in deiner
Datei, am Unterfeld `sfv_person_id`: `update_field('verlauf', $zeilen, …)`
ordnet die Schlüssel den Unterfeldern **dieses** Repeaters zu; ACFs globale
Namenssuche greift hier nicht. Für ein Feld der obersten Ebene wäre es die
Falle von `liga`, als Unterfeld ist es keine.

⚠ **Für einen Menschen schon.** Wer die zwei Listen nebeneinander liest,
hält `rolle` für dasselbe. Deshalb steht es hier.

## 9 · Eine vollständige Verlaufszeile — erzeugt, nicht getippt

Ausgabe von `bildeVerlauf()` für einen eigenen Trainer mit Namen, am
24.09.2026:

```json
{
  "minute": "55",
  "art": "gelb",
  "seite": "heim",
  "text": "Trainer/in Hans Meier",
  "stand": "",
  "klub": "FC Herrliberg",
  "sfv_person_id": null,
  "nummer": null,
  "ereignis_zusatz": "",
  "ohne_person": false,
  "rolle": "Trainer/in",
  "ein_nummer": null
}
```

Zwölf Schlüssel. ⚠ Die Werte sind Vorgaben (der Name ist erfunden), die
**Form** ist gemessen: dieselbe Funktion, derselbe Weg wie im Lauf.

---

## Was wir von dir brauchen

1. **`rolle` als Text-Unterfeld am Repeater `verlauf`** und der Name in
   `CC_VERLAUF_FELDER`. Beides liegt in deinem Repository.
2. **Sag, welche Fassung danach drüben läuft.** Wir lesen sie aus
   `empfaenger` und `version` in jeder Antwort; ohne sie ist „läuft mein
   Deploy?" von „antwortet drüben etwas Altes?" nicht zu trennen.
3. **Steht nach dem nächsten Lauf `verlauf.rolle` in
   `unbeachtete_unterfelder`?** Wenn ja, ist der Name noch nicht in der
   Liste. Nennt `unterfelder_ohne_acf` es, fehlt das ACF-Unterfeld.
4. **Wertest du `ohne_person` bei Gegnerzeilen aus?** Siehe Abschnitt 5.

## Fragen, die wir nicht beantworten können

| Frage | warum nicht |
|---|---|
| Welche Schreibweise kommt für Kategorie 3 an — `"Trainer"` oder `"Trainer/in"`? | In der aufgezeichneten Antwort steht nur Kategorie 1. Die Zahl liegt in **unserer** Datenbank; Abfrage 3 in `supabase/abfragen_2026-09-24_trainerkarte_probe.sql` holt sie. **Frage an Didi, nicht an dich.** |
| Wie lautet die **öffentliche** Adresse einer Spielseite auf dev? | In unserem Repo steht keine. Die Permalink-Struktur ist eine Einstellung der Website (`docs/anleitung_wordpress_etappe3.md`, Schritt 1: „Alles ausser «Einfach» ist recht"), und `get_permalink()` kommt im Empfänger nicht vor. Was wir bauen können, ist die **Backend**-Adresse — siehe unten. |
| Welche Form hat `personName` — `"Hans Meier"`, `"MEIER Hans"`, `"Meier, Hans"`? | In der aufgezeichneten Antwort ist das Feld geschwärzt. Wir reichen es **unverändert** durch, statt eine Form anzunehmen, die niemand gesehen hat. Fällt dir drüben eine ungewohnte Form auf, ist das ein Befund über den Verband. |

---

## Anhang · Die Stelle zum Ansehen

**Zwei Schritte, beide messbar, und der erste kann leer ausgehen.**

**1 · Das Spiel finden** —
`supabase/abfragen_2026-09-24_trainerkarte_probe.sql` (drei Abfragen, alle
nur lesend). Sie gibt `sfv_match_id`, Datum, Mannschaft, Gegner, Minute und
den **erwarteten Text** heraus.

⚠ **Vor dem Nachlauf findet sie möglicherweise nichts, und das ist kein
Defekt.** Der Altbestand trägt `rolle_kategorie_id = null` — „nicht
gefragt", nicht „Spieler". Dort steht weiter „Unser Team", bis ein Abruf das
Spiel neu holt. Abfrage 1 sagt, wie weit das ist; das Zurücksetzen steht in
`supabase/abfragen_2026-09-24_rolle_verlauf.sql`, Abfrage 4.

**2 · Aus der `sfv_match_id` einen Link machen** — über
`aktion: "bestand"`. Die Route `GET /clubcampus/v1/bestand` liefert je
Beitrag:

```
beitrag_id · titel · status · sfv_match_id · team · bearbeiten_url
```

⚠ **`bearbeiten_url`** kommt aus `get_edit_post_link()` und ist eine
vollständige Adresse — damit sind **Titel und direkter Link** da, ohne dass
jemand die Permalink-Struktur kennen muss. Sie führt in das **Backend** des
Beitrags, nicht auf die öffentliche Spielseite.

⚠ **Die öffentliche Adresse ist aus unserem Repo nicht herleitbar** (siehe
die Fragen oben). Eine plausible URL zu bauen, die niemand geprüft hat, wäre
schlechter als keine — deshalb steht hier keine.
