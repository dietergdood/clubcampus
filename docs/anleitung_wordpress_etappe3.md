# Etappe 3 auf der WordPress-Installation — Schritte für Didi

Stand 05.09.2026. Gehört zu `docs/plan_wordpress_spieldaten.md` §12.
Ziel: `dev.fcherrliberg.ch` so weit, dass der Export aus ClubCampus
schreiben kann.

> **⚠ Auf dieser Seite prüft nichts.** Kein Typecheck, kein Compiler, keine
> Testkette. Jeder Schritt hat deshalb unten eine Probe mit einer erwarteten
> Ausgabe — die ist der Ersatz. Wenn eine Probe etwas anderes sagt, nicht
> weitermachen.

---

## 0 · Die Arbeitsteilung, damit klar ist, was auf dich zukommt

| | wer |
|---|---|
| Permalinks, Benutzer, Rolle, Application Password, Secret | **du** — Schritte 1, 5, 6, 7 |
| dev abschirmen (noindex + Zugriffsschutz) | **du** — Schritt 9, ⚠ nicht erst beim Wechsel |
| Das Plugin (REST-Flags, Metafelder, Ranglisten-Route, Sperren) | **ich** — du installierst es, Schritt 4 |
| Die Diagnose davor | **du**, drei Minuten — Schritt 3 |

⚠ **Schritt 3 zuerst lesen.** Was ich ins Plugin schreibe, hängt davon ab,
wie `spiel` und `team` bei dir angelegt wurden. Ohne diese Auskunft baue
ich gegen eine Annahme.

---

## 1 · Permalinks

**Einstellungen → Permalinks.** Alles ausser „Einfach" ist recht —
üblicherweise „Beitragsname".

**Warum es zählt:** bei „Einfach" gibt es `/wp-json/` nicht. Die REST-Basis
ist dann `https://dev.fcherrliberg.ch/?rest_route=/` — eine andere Form,
und jeder Pfad im Export stimmt nicht mehr.

⚠ **Auch wenn die Einstellung schon richtig aussieht: einmal auf
„Änderungen speichern" klicken.** Das schreibt die Rewrite-Regeln neu. Ein
frisch angelegter Inhaltstyp ist ohne diesen Klick oft über die
REST-Route nicht erreichbar, und der 404 sieht dann aus wie ein
Registrierungsfehler.

**Probe:**

```bash
curl -s -o /dev/null -w "%{http_code}  %{url_effective}\n" -L \
  https://dev.fcherrliberg.ch/wp-json/
```

Erwartet: `200`. Und die Zieladresse notieren — wenn `curl` von
`dev.fcherrliberg.ch` auf `www.dev.…` oder auf `http→https` umleitet,
gehört **das Ziel** ins Secret, nicht die weiterleitende Adresse.

⚠ **Nicht kosmetisch:** manche Clients machen aus `POST` plus `301` ein
`GET` und werfen den Rumpf weg. Der Export schriebe dann nichts und bekäme
trotzdem eine 200 zurück.

---

## 2 · Ist die REST-API überhaupt offen?

```bash
curl -s https://dev.fcherrliberg.ch/wp-json/ | head -c 300
```

Erwartet: JSON, das mit `{"name":"…","description":"…","url":"…"` beginnt.

| Antwort | heisst |
|---|---|
| JSON wie oben | ✅ offen |
| `401` / `{"code":"rest_not_logged_in"}` | die REST-API ist für Gäste gesperrt |
| `403` | ein Sicherheits-Plugin blockt |
| HTML statt JSON | Permalinks (Schritt 1) oder eine Caching-Schicht davor |

⚠ **Ein 401 hier ist kein Defekt und muss nicht behoben werden.** Der
Export meldet sich ohnehin an. Es ändert nur, dass die Proben unten alle
mit Anmeldung laufen müssen. **Sag mir, welcher Fall es ist** — es ändert,
wie Etappe 2 die Verbindung prüft.

⚠ **Was du NICHT tun sollst: die REST-API „für alle öffnen", damit die
Proben durchgehen.** Nach dem Einbruch im August ist eine gesperrte
REST-API eine vernünftige Einstellung. Der Export braucht sie nicht offen.

---

## 3 · ⚠ Wie sind `spiel` und `team` angelegt? — das brauche ich von dir

Drei Möglichkeiten, und sie führen zu drei verschiedenen Plugins:

| | woran du es erkennst |
|---|---|
| **CPT UI** (Plugin) | Menü „CPT UI" im Backend |
| **ACF** (ab PRO 6.1) | ACF → „Beitragstypen" |
| **Code** | weder noch → in `functions.php` des Themes oder in einem eigenen Plugin |

> **Stand 05.09.2026, gemessen:** vier eigene Typen sind REST-sichtbar —
> `fch_team`, `fch_anlass`, `fch_sponsor`, `fch_jahr`, alle mit `rest_base`
> gleich dem Slug.
>
> ⚠ **`fch_spiel` steht NICHT darunter — existiert aber**, mit 11 von Hand
> angelegten Beiträgen. Ihm fehlt allein `show_in_rest`. Genau der Fall,
> den die Liste nicht unterscheiden kann; gefunden hat ihn die
> Admin-Adresse. Was zu tun ist: Schritt 3b-neu.
>
> Und `fch_anlass` trägt ein Block-Template aus eigenen ACF-Blöcken — ACF
> ist hier also zentral, siehe Schritt 3c.

**Und dann die zugehörige Einstellung:**

| Weg | wo `show_in_rest` steht |
|---|---|
| CPT UI | Beitragstyp bearbeiten → **Einstellungen** → „Show in REST API" auf **true**, und „REST API base slug" notieren |
| ACF | Beitragstyp → **Advanced Configuration → REST API** → „Show In REST API" |
| Code | `register_post_type('spiel', [ 'show_in_rest' => true, … ])` |

⚠ **Und die zweite Einstellung, die fast immer fehlt:** in `supports` muss
**`custom-fields`** stehen. Ohne sie erscheinen eigene Felder **nicht** in
der REST-Antwort — auch dann nicht, wenn sie sauber registriert sind. Bei
CPT UI ist das die Checkbox „Custom Fields" in der Supports-Liste.

**Das ist die häufigste stille Ursache**, und sie sieht aus wie ein Fehler
im Export: die Beiträge kommen, das Feld `clubcampus_id` ist leer, und
nichts meldet etwas.

### Was du mir schickst

```bash
curl -s https://dev.fcherrliberg.ch/wp-json/wp/v2/types | head -c 2000
```

Daraus lese ich die **Routen** (`rest_base`) der Typen, die REST-sichtbar
sind. Dazu in einem Satz: welcher der drei Wege oben es ist.

> **⚠ BERICHTIGT AM 05.09.2026 — hier stand ein Fehlschluss.**
>
> Hier stand: *„Wenn `spiel` dort fehlt, ist `show_in_rest` aus."* **Das
> stimmt nicht.** `/wp/v2/types` listet ausschliesslich Typen mit
> `show_in_rest => true`. Ein Typ, den es **nicht gibt**, und ein Typ, der
> **ohne das Flag** registriert ist, sehen dort identisch aus: beide
> fehlen. Aus dem Fehlen folgt gar nichts.
>
> ⚠ Eine Messung, die eine Antwort liefert und eine ANDERE Frage
> beantwortet — dieselbe Familie wie `job_run_details: succeeded`
> (= abgesetzt, nicht gelungen).

### Die Probe, die es wirklich entscheidet

**Im Browser, angemeldet im Backend:**

```
https://dev.fcherrliberg.ch/wp-admin/edit.php?post_type=fch_spiel
https://dev.fcherrliberg.ch/wp-admin/edit.php?post_type=spiel
```

| was du siehst | heisst |
|---|---|
| eine (auch leere) Beitragsliste | **der Typ existiert**, nur `show_in_rest` fehlt |
| „Ungültiger Beitragstyp" | **den Typ gibt es nicht** — er muss angelegt werden |

⚠ **Ein negatives Ergebnis ist kein Beweis:** ein Typ mit
`show_ui => false` existiert und hat trotzdem keine Admin-Seite. Deshalb
zusätzlich in der Liste von **CPT UI** bzw. **ACF** nachsehen — dort
stehen auch Typen ohne REST und ohne Oberfläche.

---

## 3b · ~~Wenn `fch_spiel` fehlt: wer legt ihn an~~ — hinfällig, er existiert

> **⚠ ERLEDIGT SICH AM 05.09.2026: `fch_spiel` existiert mit 11 Beiträgen.**
> Der Abschnitt bleibt stehen, weil die Begründung für JEDEN künftigen
> Beitragstyp gilt — und weil er die Einstellungen nennt, die auch beim
> Nachziehen eines bestehenden Typs stimmen müssen. Was jetzt zu tun ist,
> steht in Schritt 3b-neu.

**Du, in derselben Maske wie `fch_team`. Nicht ich im Plugin.**

⚠ **Begründung, und sie ist dieselbe wie beim Team:** ein Beitragstyp ist
eine Sache der Website, nicht des Exports. Lege ich ihn im mu-Plugin an,
gehört er dem Code — Beschriftungen, Menüposition und Archiveinstellung
sind dann im Backend nicht mehr änderbar, und du müsstest mich für jede
Kleinigkeit fragen. **Der Export soll den Inhaltstyp bedienen, nicht
besitzen.** Genau wie er Teams liest und nie anlegt (Plan §3.3).

**Die Einstellungen, die er braucht** — der Rest ist deine Wahl:

| | Wert | warum |
|---|---|---|
| Slug | `fch_spiel` | dem Präfix von `fch_team` folgen |
| **Show in REST API** | **true** | ⚠ ohne das ist er für den Export unsichtbar |
| **REST API base slug** | notieren, was du einträgst | das ist der Wert, den ich brauche — nicht der Slug |
| **Supports → Title** | ✓ | ein Beitrag ohne Titel ist im Backend unbrauchbar |
| **Supports → Editor** | ✓ | der redaktionelle Matchbericht (Plan §11) |
| **Supports → Custom Fields** | ✓ | ⚠ **ohne das bleibt jedes eigene Feld in der REST-Antwort leer** |
| Public / Has Archive | deine Wahl | betrifft nur die Website, nicht den Export |

⚠ **Danach Schritt 1 wiederholen** (Permalinks speichern). Ein frisch
angelegter Typ ist sonst über seine REST-Route oft noch nicht erreichbar,
und der 404 sieht aus wie ein Registrierungsfehler.

---

## 3b-neu · ⚠ `fch_spiel` EXISTIERT — was das ändert

**Gemessen 05.09.2026: 11 Beiträge, von Hand angelegt, mit Daten.**
Schritt 3b oben (den Typ anlegen) entfällt damit.

> **⚠ ⚠ BERICHTIGT NOCH AM SELBEN TAG — HIER STAND FALSCHER RAT.**
>
> Hier stand: *„Es fehlt nur `show_in_rest`"* mit der Anweisung, es
> einzuschalten. **Beides war falsch.** Im Theme
> (`mu-plugins/fch-core/src/PostTypes/registrierung.php:118`) steht
> `show_in_rest => false` **mit ausgeschriebener Begründung** — es ist
> eine Entscheidung, keine Lücke:
>
> > *„Der Beitrag traegt `sfv_match_id` und `sfv_spiel_nr`, beide nicht
> > fuer die Website gedacht. Die Seite zeigt aus, was sie zeigen soll;
> > die REST-Ausgabe gaebe alles."*
>
> Sie trägt: an einem `public`-Beitragstyp öffnet `show_in_rest` die
> Felder für **unangemeldete** Leser. Nach dem Einbruch im August ist das
> nichts, was man nebenbei umlegt.
>
> ⚠ **UND ES IST GAR NICHT NÖTIG.** Eine eigene Route
> (`clubcampus/v1`) hängt nicht an `show_in_rest`. Ausserdem nennt
> `supports` kein `custom-fields` — die Kern-Route könnte die Felder
> selbst dann nicht ausgeben, wenn sie offen wäre.
>
> **Also: `show_in_rest` bleibt `false`, `supports` bleibt wie es ist,
> und nichts an der Registrierung ist zu ändern.** Die Gabelung aus
> Schritt 3c ist damit entschieden — eigene Route.

### Und die Feldgruppe muss erweitert werden

Die 11 Beiträge tragen die Felder, die für eine Handerfassung nötig waren.
Der Export braucht mehr. **Anzulegen in der ACF-Feldgruppe zu `fch_spiel`
— von dir, weil die Felder im Backend erscheinen und ihre Beschriftung und
Reihenfolge eine redaktionelle Entscheidung ist:**

| Feldname | Typ | wofür |
|---|---|---|
| `clubcampus_id` | Text | ⚠ **das Besitzmerkmal — ohne es fasst der Export gar nichts an** |
| `sfv_match_id` | Zahl | der Verweis auf den FVRZ-Spielbericht |
| `sfv_spiel_nr` | Text | die angezeigte Spielnummer |
| `status` | Text | „verschoben", „abgebrochen", „forfait" … |
| `status_id` | Zahl | derselbe Zustand als Zahl, zum Filtern |
| `liga` · `gruppe` | Text | Einordnung |
| `halbzeit` | Text | heute leer, später gefüllt |
| `ereignisse` | **Repeater** | Tore, Assists, Wechsel, Karten — Unterfelder siehe unten |
| `export_lauf` | Text/Datum | woran man sieht, wie frisch der Stand ist |

⚠ **`clubcampus_id` gehört dem Export und darf im Backend nicht bearbeitbar
sein** (Plan §11). Am einfachsten: ein Textfeld mit dem Hinweis „Kommt aus
ClubCampus, wird stündlich überschrieben" — die Sperre selbst macht mein
Plugin.

### `ereignisse` — Repeater, entschieden am 05.09.2026

**Repeater, nicht JSON.** Didis Begründung: JSON in einem Textfeld ist im
Backend nicht lesbar und nicht prüfbar — bei einer kaputten Zeile merkt es
niemand.

⚠ **Und die Rückfrage dazu ist beantwortet: der nächste Lauf überschreibt
jede Handänderung.** Der Export schickt je Spiel die vollständige Liste,
der Repeater wird ersetzt — stündlich. **Das Feld ist deshalb gesperrt,
und Lesbarkeit ist der einzige verbleibende Grund für den Repeater.**

**Korrigiert wird im Portal, nicht hier:** Termine → das Spiel → Tab
**„Spielbericht"**. Dort gibt es die Korrekturmaske, und eine Korrektur
überlebt **jeden** stündlichen Lauf — der SFV-Sync fasst Vereins-Zeilen
nie an. Herleitung in Plan §4.12.

**Die Unterfelder:**

| Feld | Typ | |
|---|---|---|
| `minute` | Zahl | |
| `zusatzminute` | Zahl | für 45+2 |
| `typ` | Text | „Tor", „Verwarnung" … — für dich im Backend |
| **`typ_id`** | Zahl | ⚠ **darauf schaltet die Vorlage** — nie auf den Text |
| `subtyp` | Text | Kopftor, Eigentor, Penalty, 2. Verwarnung |
| `eigenes_team` | Wahrheitswert | |
| `wer` | Text | Name · `Nr. 9` · Mannschaftsname des Gegners |
| `sfv_person_id` | Zahl | für die spätere Verknüpfung zum Spieler |
| `rueckennr` | Zahl | |
| `ein_wer` · `ein_rueckennr` | Text/Zahl | bei Auswechslung: wer kommt |
| `vom_verein` | Wahrheitswert | diese Zeile ist eine Korrektur aus dem Portal |

⚠ **`typ` und `typ_id` beide.** Der Text ist für den Menschen, die Zahl
für die Vorlage. Eine Vorlage, die auf `typ === "Tor"` schaltet, bricht,
sobald der Verband die Bezeichnung ändert.

⚠ **Der Hinweistext gehört ans Feld**, sonst ist die Sperre eine
Sackgasse statt eines Wegweisers:

> Kommt aus ClubCampus, wird stündlich überschrieben.
> Korrektur im Portal: Termine → Spiel → Spielbericht.

### ⚠ Die 11 Beiträge einmal durchsehen — VOR dem ersten scharfen Lauf

Wahrscheinlich sind es Spiele der 1. Mannschaft. **Dann stehen genau diese
Spiele auch im SFV-Spielplan**, und nach dem ersten Lauf gäbe es sie
zweimal: einmal von Hand, einmal exportiert, beide plausibel.

Der Export **meldet** mögliche Dubletten (gleiches Datum, gleiches Team,
ohne `clubcampus_id`), aber er löst sie nicht auf — dafür gibt es keinen
gemeinsamen Schlüssel, und ein automatisches Zusammenführen überschriebe
deine Arbeit auf Verdacht.

**Elf Beiträge durchzusehen ist eine halbe Stunde. Zwei Spielpläne
hinterher auseinanderzusortieren nicht.**

### Was ich zur Spalte „Quelle" wissen muss

Sie ist die menschliche Hälfte der Unterscheidung, und der Export soll sie
mitschreiben. Dafür brauche ich:

1. **Wie heisst das Feld** (nicht die Spaltenüberschrift)? In ACF →
   Feldgruppen → die Gruppe zu `fch_spiel` → Feldname.
2. ⚠ **Ist es ein Auswahlfeld (Select/Radio)?** Dann speichert ACF den
   **Wert** und zeigt die **Beschriftung**. Steht dort `Wert: clubcampus`
   / `Beschriftung: ClubCampus`, muss der Export `clubcampus` schreiben —
   schreibt er „ClubCampus", zeigt ACF nichts an. **Schick mir die
   Wert/Beschriftung-Paare, so wie sie in der Feldmaske stehen.**
3. Gibt es den Wert für ClubCampus schon, oder ist bisher nur „WordPress"
   angelegt?

⚠ **Die Spalte selbst verrät ausserdem etwas:** ACF fügt von sich aus
keine Admin-Spalten hinzu. Dass es sie gibt, heisst, dass irgendwo Code
für `fch_spiel` liegt (`manage_fch_spiel_posts_columns`) — oder ein
Helfer-Plugin. **Dort steht vermutlich auch die Registrierung des Typs,
und damit die Stelle, an der `show_in_rest` hingehört.**

---

## 3c · ⚠ ACF: eine Frage, die ich vor dem Plugin beantwortet brauche

Aus der Types-Antwort vom 05.09.2026, nicht gesucht, aber deutlich:
`fch_anlass` trägt ein Block-Template aus **eigenen ACF-Blöcken**
(`acf/fch-fliesstext`, `acf/fch-abschnitt`, `acf/fch-tabelle`). **ACF
trägt hier die Inhaltsstruktur der Website**, es ist nicht nur
installiert.

Damit ist wahrscheinlich, dass auch `fch_team.sfv_id` ein **ACF-Feld**
ist und nicht schlichtes Postmeta. Der Unterschied sieht man von aussen
nicht, und er beisst beim **Schreiben**:

```
sfv_id   = 38309            ← der Wert
_sfv_id  = field_64a1b2c3   ← der Feldschluessel, den ACF daneben legt
```

Wer den Wert als gewöhnliches Postmeta schreibt, setzt **nur die erste
Zeile**. `get_post_meta()` liefert danach den richtigen Wert;
**`get_field()` kann ihn nicht mehr auflösen.** Ergebnis: ein Feld, das
im Backend richtig aussieht und auf der Seite leer bleibt — und nichts
meldet etwas.

### Die Frage

**Liest euer Theme die Felder mit `get_field()` oder mit
`get_post_meta()`?**

Wenn du es nicht sicher weisst, genügt ein Blick in die Theme-Dateien:

```bash
grep -rn "get_field\|get_post_meta" wp-content/themes/<euer-theme>/ | head -20
```

⚠ **Es ist keine Geschmacksfrage.** Bei `get_field()` muss das Plugin die
Werte mit `update_field()` schreiben — nur die setzt beide Zeilen. Bei
`get_post_meta()` genügt der einfache Weg. Baue ich gegen die falsche
Annahme, sieht der erste scharfe Lauf erfolgreich aus und die Seite bleibt
leer.

### Was daran hängt: wie der Export überhaupt schreibt

| | Kern-REST (`/wp/v2/fch_spiel`) | **eigene Route** |
|---|---|---|
| PHP-Menge | wenig | mehr — ⚠ und dort prüft niemand |
| Aufrufe je Lauf | Aufzählung + einer je Spiel | **einer** |
| ACF-Feldschlüssel | ⚠ ungelöst | gelöst (`update_field()`) |
| CPT braucht `show_in_rest` | **ja** | nein |
| CPT braucht `custom-fields` | **ja** | nein |

**Ich empfehle die eigene Route** — sie löst das ACF-Problem, spart rund
269 Aufrufe je Lauf und macht den Abgleich zu einem Vorgang statt zu
vielen. ⚠ **Der Preis ist ehrlich zu nennen:** sie verlagert genau die
Logik, die einen Spielplan auf Entwurf setzen kann, in eine Sprache ohne
Typecheck und ohne Testkette.

⚠ **`fch_spiel` bekommt trotzdem `show_in_rest` und `custom-fields`**
(Schritt 3b) — auch wenn die eigene Route sie nicht braucht. Sie kosten
nichts und sind der Weg, auf dem du selbst nachsehen kannst, was drin
steht. Ein Inhaltstyp, den nur mein Plugin lesen kann, ist einer, dessen
Zustand niemand sonst prüfen kann.

---

## 4 · Das Plugin — schreibe ich, du installierst es

Als **mu-plugin**: `wp-content/mu-plugins/clubcampus-export.php`.

**Warum mu statt normal:** mu-plugins lassen sich im Backend nicht
deaktivieren und werden bei Theme-Wechseln nicht mitgerissen. Ein Plugin,
das jemand versehentlich abschaltet, nimmt die Metafelder mit — und der
Export schriebe danach ins Leere, ohne dass etwas fehlschlägt.

**Was darin steht:**

| | wofür |
|---|---|
| `register_post_meta` für `clubcampus_id`, `sfv_id`, `sfv_person_id` | ⚠ **ohne das kann der Export weder lesen noch schreiben** |
| eine REST-Route für die Ranglisten | Plan §5 |
| die Sperren im Editor | Plan §11 — Felder, die aus ClubCampus kommen |
| ein `save_post`-Hook gegen doppelte `sfv_id` / `sfv_person_id` | Plan §7 |
| ggf. Nachziehen von `show_in_rest` / `custom-fields` | nur wenn Schritt 3 ergibt, dass der Typ per Code angelegt ist |

⚠ **Zu `register_post_meta`, weil es der Kern ist:** eigene Felder sind in
der REST-API **standardmässig unsichtbar**, auch wenn der Inhaltstyp
sichtbar ist. Sie müssen einzeln angemeldet werden. Das ist der Grund,
warum ein Export „funktioniert" und trotzdem jedes Feld leer bleibt.

⚠ **Und eine Einschränkung des WordPress-Kerns, die den Entwurf betrifft:**
die REST-API kann **nicht nach einem Metafeld filtern**. Es gibt kein
`?meta_key=clubcampus_id&meta_value=…`. Der Export liest deshalb je Lauf
**alle** `spiel`-Beiträge seitenweise (`?per_page=100`) und baut die
Zuordnung im Arbeitsspeicher.

**Das ist kein Umweg, sondern billiger:** er braucht die vollständige
Liste ohnehin für den Abgleich („welche Beiträge habe ich, die nicht mehr
im Satz stehen?"). Bei 269 Spielen sind das drei Anfragen. **Es spart
ausserdem eine WordPress-seitige Sonderlocke** — und jede, die wegfällt,
ist eine, die niemand prüft.

---

## 5 · Der Export-Benutzer und seine Rolle

**Benutzer → Neu hinzufügen.**

| | |
|---|---|
| Benutzername | `clubcampus-export` |
| E-Mail | eine, die existiert, aber nichts empfangen muss |
| Rolle | ⚠ **siehe unten — nicht Administrator** |

### Welche Rolle

**Was der Export tatsächlich tut:**

| Tätigkeit | Recht |
|---|---|
| `team` **lesen** (die `sfv_id` holen) | Lesen |
| `spiel` anlegen und ändern | Bearbeiten + Veröffentlichen |
| `spiel` **auf Entwurf setzen** | Bearbeiten |
| Rangliste schreiben | die eigene Route des Plugins |

⚠ **Er braucht KEIN Löschrecht.** Der Abgleich setzt auf Entwurf statt zu
löschen (Plan §8.2) — das ist eine Statusänderung, kein Löschvorgang.
Damit fällt `delete_posts` weg, und ein Fehler im Export kann nichts
unwiederbringlich entfernen. **Bitte auch nicht „vorsichtshalber" vergeben.**

**Was es NICHT braucht, und was ich ausdrücklich ausschliesse:**
`manage_options`, `edit_users`, `edit_theme_options`, `install_plugins`,
`upload_files`, `unfiltered_html`.

**Zwei Wege, je nach Schritt 3:**

| Lage | Rolle |
|---|---|
| Die Typen haben einen **eigenen** `capability_type` | Ich lege im Plugin eine Rolle `clubcampus_export` an, die genau diese Rechte trägt. Sauberster Fall |
| Die Typen benutzen den **Standard** (`capability_type => 'post'`) | ⚠ Dann hängt „ein `spiel` bearbeiten" an `edit_posts` — demselben Recht wie für normale Beiträge. **Die engste Rolle ist dann `Autor`**, und der Benutzer kann damit auch Blogbeiträge anlegen. Nicht ideal, aber begrenzt und ohne Zugriff auf fremde Inhalte |

**Fürs Erste: Rolle `Autor`.** Nach Schritt 3 sage ich dir, ob das Plugin
sie durch eine engere ersetzen kann.

⚠ **Nicht `Redakteur`:** der darf fremde Beiträge bearbeiten und löschen.

---

## 6 · Das Application Password

**Benutzer → `clubcampus-export` → Profil bearbeiten → ganz nach unten,
Abschnitt „Anwendungspasswörter".**

Name: `ClubCampus Export`. → **Neues Anwendungspasswort hinzufügen.**

WordPress zeigt danach **einmal** eine Zeichenfolge aus 24 Zeichen in
Gruppen zu vier, mit Leerzeichen. Die Leerzeichen gehören dazu und dürfen
mitkopiert werden.

⚠ **Sie wird nie wieder angezeigt.** Verlierst du sie, legst du eine neue
an und widerrufst die alte — kein Drama, aber kein Zurückholen.

**Fehlt der Abschnitt ganz?** Drei Ursachen, in dieser Reihenfolge prüfen:

1. Die Seite läuft nicht über HTTPS. Anwendungspasswörter sind dann
   deaktiviert.
2. Ein Sicherheits-Plugin hat sie abgeschaltet (nach einem Einbruch eine
   verbreitete Massnahme).
3. WordPress älter als 5.6.

---

## 7 · ⚠ Das Passwort kommt NICHT zu mir

**Das ist die eine Stelle dieser Anleitung, an der ich ausdrücklich nichts
bekomme.**

Ich sehe das Anwendungspasswort nicht, ich trage es nicht ein, und es
gehört nicht in eine Datei im Repository, nicht in eine Nachricht an mich
und nicht in `api_verbindungen`. Es geht **direkt** von deinem Bildschirm
in die Supabase-Secrets.

### So, nicht anders

Die naheliegende Form ist die falsche:

```bash
npx supabase secrets set WP_APP_PASSWORT='abcd efgh …'   # ⚠ landet in der Shell-History
```

**Stattdessen über eine Datei, die du danach löschst — und zwar
AUSSERHALB des Repositorys:**

```bash
# Die Datei liegt bewusst nicht im Projektordner.
cat > "$TEMP/wp.env" <<'EOF'
WP_BASIS_URL=https://dev.fcherrliberg.ch/wp-json
WP_BENUTZER=clubcampus-export
WP_APP_PASSWORT=abcd efgh ijkl mnop qrst uvwx
WP_SYNC_KEY=
EOF

cd C:/Users/diete/OneDrive/Dokumente/GitHub/fch-portal
npx supabase secrets set --env-file "$TEMP/wp.env"
rm "$TEMP/wp.env"
```

⚠ **Warum ausserhalb, und das ist eine Korrektur an mir selbst:** der
erste Entwurf dieser Anleitung legte `wp.env` im Projektordner an, mit dem
Zusatz „prüf danach `git status`". Nachgesehen:

```bash
grep -nE "\.env" .gitignore
# 3:.env
# 4:.env.local
```

**`.gitignore` führt zwei exakte Namen, kein Muster.** Weder `wp.env` noch
`*.env` wären erfasst — die Datei wäre also sichtbar gewesen, und die
einzige Sperre wäre gewesen, dass du daran denkst. Eine Regel, an die
jemand denken muss, ist die schwächste Lösung; eine Datei, die gar nicht
erst im Projektordner liegt, kann nicht versehentlich eingecheckt werden.

⚠ **`npx supabase` muss trotzdem im Projektordner laufen** — dort steht
die Projektverknüpfung. Nur die Datei liegt woanders.

⚠ **`WP_SYNC_KEY` lässt du leer** — den erzeuge ich in Etappe 6 zusammen
mit dem Zeitplan; er hat mit WordPress nichts zu tun (er ist der Ausweis,
mit dem der Cron die Edge Function ruft, wie `SFV_SYNC_KEY`).

### Und bei den Proben unten

```bash
curl -u "clubcampus-export" …      # ✅ curl fragt nach dem Passwort
curl -u "clubcampus-export:abcd …" # ⚠ History, und du kopierst es mir
```

⚠ **Wenn du mir eine Probenausgabe schickst, überflieg sie vorher.** Bei
einem `-v` steht der `Authorization`-Header mit drin.

---

## 8 · Woran du merkst, dass es stimmt

Fünf Proben, in dieser Reihenfolge. Jede hat eine erwartete Ausgabe.

```bash
WP=https://dev.fcherrliberg.ch/wp-json

# 1 · REST erreichbar
curl -s -o /dev/null -w "1  %{http_code}\n" "$WP/"

# 2 · Die Inhaltstypen sind da
curl -s "$WP/wp/v2/types" | grep -o '"slug":"[a-z_-]*"' | sort -u

# 3 · Die Routen antworten
curl -s -o /dev/null -w "3a spiel %{http_code}\n" "$WP/wp/v2/spiel"
curl -s -o /dev/null -w "3b team  %{http_code}\n" "$WP/wp/v2/team"

# 4 · Die Anmeldung trägt  (curl fragt nach dem Passwort)
curl -s -u "clubcampus-export" "$WP/wp/v2/users/me" | head -c 200

# 5 · Und sie darf schreiben — legt einen ENTWURF an
curl -s -u "clubcampus-export" -X POST "$WP/wp/v2/spiel" \
  -H "Content-Type: application/json" \
  -d '{"title":"PROBE bitte loeschen","status":"draft"}' | head -c 200
```

| | erwartet | wenn nicht |
|---|---|---|
| 1 | `200` | Schritt 1 und 2 |
| 2 | `spiel` und `team` in der Liste | `show_in_rest` fehlt → Schritt 3 |
| 3 | `200` oder `401` | **`404` = die Route gibt es nicht.** `rest_base` weicht ab, oder Permalinks nicht neu gespeichert |
| 4 | JSON mit `"slug":"clubcampus-export"` | siehe unten |
| 5 | JSON mit `"id":…` und `"status":"draft"` | die Rolle darf nicht schreiben → Schritt 5 |

⚠ **Probe 5 legt einen echten Entwurf an. Bitte danach im Backend
löschen** — er trägt keine `clubcampus_id` und würde beim ersten scharfen
Lauf ohnehin als „nicht im Satz" behandelt.

### Wenn Probe 4 mit 401 scheitert, obwohl das Passwort stimmt

Der klassische Fall, und er kostet sonst eine Stunde: **manche
Apache/FastCGI-Aufbauten geben den `Authorization`-Header nicht an PHP
weiter.** Symptom ist ein `401` mit `{"code":"rest_not_logged_in"}` —
also „nicht angemeldet", nicht „falsches Passwort". Abhilfe in der
`.htaccess`:

```apache
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

⚠ **Die Meldung führt in die Irre**, deshalb steht sie hier: sie sagt
„nicht angemeldet", und man sucht beim Passwort. Der Header ist nie
angekommen.

---

## 9 · ⚠ dev abschirmen — jetzt, nicht beim Wechsel

**Der einzige Schritt dieser Anleitung, den der Export nicht lösen kann,
und der einzige, der leicht vergessen wird, weil er heute noch nichts
bewirkt.**

Sobald der Export später auf die Produktion umgestellt wird, hört er auf,
mit `dev.fcherrliberg.ch` zu sprechen. **Was dort steht, bleibt für immer
stehen** — ein vollständiger Spielplan mit Resultaten, eingefroren auf den
Tag des Wechsels.

⚠ **Er sieht nicht veraltet aus, und das ist das Problem.** Ein leerer
Spielplan fällt auf. Einer mit Resultaten sieht aus, als stimme er. Und
`dev.fcherrliberg.ch` unterscheidet ein Elternteil nicht von
`www.fcherrliberg.ch`, wenn es den Link von irgendwoher hat.

> **⚠⚠ STAND 05.09.2026: DIE SEITE IST OFFEN — und zwar wegen Schritt 6.**
>
> Die Dev-Seite lief mit HTTP-Basic-Auth. WordPress verweigert dann
> Anwendungspasswörter („Basis-Authentifizierung ist nicht kompatibel"),
> weil **beide denselben Header benutzen**: der Server verbraucht
> `Authorization: Basic` zuerst, WordPress bekommt ihn nie zu sehen. Das
> ist eine echte Unverträglichkeit, keine Fehlkonfiguration.
>
> Didi hat den Schutz deshalb abgeschaltet. **Er muss zurück — aber als
> etwas, das die REST-API durchlässt.** Kandidaten und ihre Haken stehen
> in Plan §4.6; die Wahl ist eine Betriebsentscheidung.
>
> ⚠ **Und die Frist ist schärfer als „vor Etappe 4":** der Auslöser ist
> die **erste Zeile in `sfv_zuordnung`**, nicht der erste Export. Heute
> trägt der Export keine Klarnamen (null Zuordnungen, alles läuft als
> `Nr. 9`); ab der ersten Zuordnung schon — und Zuordnen ist Portalarbeit,
> die jederzeit nebenher passieren kann.

**Zwei Massnahmen, jetzt:**

```
Einstellungen → Lesen → „Suchmaschinen davon abhalten, diese Website zu indexieren" ✓
```

⚠ **Das allein genügt nicht** — es ist eine Bitte an die Suchmaschine,
keine Sperre, und gegen einen weitergegebenen Link wirkt es gar nicht.
Dazu gehört ein echter Zugriffsschutz: HTTP-Basic auf dem Server oder ein
Plugin, das die Seite nur angemeldet ausliefert.

**Warum jetzt und nicht beim Wechsel:** beim Wechsel denkt niemand daran,
weil dann die neue Seite die Aufmerksamkeit hat. Und ab dem ersten
scharfen Lauf stehen dort echte Namen von Junioren mit echten Toren —
öffentlich, wenn die Seite öffentlich ist. Das ist nicht erst nach dem
Wechsel ein Thema, sondern ab Etappe 4.

---

## 10 · Was ich danach von dir brauche

Kurz, und nichts davon ist geheim:

| | |
|---|---|
| 1 | **Schritt 3**: wie sind `spiel` und `team` angelegt (CPT UI / ACF / Code)? Und die Ausgabe von `…/wp/v2/types` |
| 2 | Die Ausgabe der **fünf Proben** aus Schritt 8 — Statuscodes genügen, ⚠ ohne `-v` |
| 3 | Bei Schritt 2: welcher der vier Fälle (offen / 401 / 403 / HTML) |
| 4 | Die **endgültige Adresse** nach allen Weiterleitungen aus Schritt 1 |
| 5 | Ob `dev.fcherrliberg.ch` **öffentlich erreichbar** ist — und ob Schritt 9 erledigt ist |
| 6 | Eine Bestätigung, dass das Secret gesetzt ist — **nicht der Wert** |

⚠ **Zu 5: das ist Schritt 9**, und er ist der einzige, den der Export
nicht lösen kann. Begründung dort und in Plan §4.6.

**Damit baue ich das Plugin (Schritt 4) und Etappe 2 fertig.** Die
Reihenfolge bleibt: erst der Probelauf, der zeigt, *was* gesendet würde,
dann der scharfe.

---

## Was ausdrücklich noch NICHT dran ist

- Die Darstellung: Vorlagen, Gestaltung, Menü. Erst wandern die Daten.
- Der Inhaltstyp `spieler` — er hängt an der Zuordnungsarbeit, die noch
  aussteht (`sfv_zuordnung` hat null Zeilen). Die WXR-Importdatei dafür
  gibt es schon im Portal, unter Portalverwaltung → API-Verbindungen →
  Spieler zuordnen.
- Die fünf übrigen Inhaltstypen aus dem WordPress-Plan.
