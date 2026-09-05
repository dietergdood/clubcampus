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

Daraus lese ich die Routen (`rest_base`) und ob beide Typen überhaupt
auftauchen. Dazu in einem Satz: welcher der drei Wege oben es ist.

⚠ **Wenn `spiel` dort fehlt**, ist `show_in_rest` aus — dann bitte in
derselben Maske einschalten, in der der Typ angelegt wurde, und noch
einmal Schritt 1 (Permalinks speichern).

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
