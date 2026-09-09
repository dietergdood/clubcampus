# Auftrag: Liga und Gruppe am Team — Anzeige aus der Ablage, Text ohne Versprechen

Beschlossen und **gebaut am 09.09.2026**. Die Belege stehen am Ende.

> ⚠ **Zwei Fragen waren vorher zu messen, nicht abzuleiten** (Didi):
> *„Braucht die Anzeige die Liga am TEAM, um die Rangliste zu finden?"* und
> *„Was passiert beim ersten Lauf, wenn beide Felder leer waren?"*
> **Beide sind an der laufenden Instanz gemessen — Antworten unten.**

> **Didi, 09.09.2026:** *„Sonst läuft zweierlei gleichzeitig, und beim
> nächsten Fehler weiss niemand, welcher Teil es war."*

Das war die Reihenfolge, solange der volle Lauf noch ausstand. ⚠ **Sie ist
hier folgenlos, und das ist gemessen, nicht behauptet:** solange die Ablage
leer ist, verhält sich die Seite exakt wie vorher — dieselben Kacheln,
dieselben Tabellen, dieselben Überschriften. Der Umbau kann den Lauf nicht
stören, weil er ohne dessen Ergebnis gar nichts tut.

---

## Der Befund (gemessen 09.09.2026)

Die Felder `liga` und `gruppe` am `fch_team`-Beitrag sind leer und **grau
mit Schloss**. Der Hinweistext sagt:

> *„Kommt vom Verband, sobald der Abgleich steht. Bis dahin von Hand."*
> — `Fields/team.php:501`

**Der Abgleich steht. Er schreibt sie nicht — und kann es nicht.** Alle
Schreibaufrufe des Empfängers treffen `fch_spiel`-Beiträge oder zwei
Optionen; `CC_FELDER` führt kein Teamfeld. Dieselbe Messung hat das Theme
am 07.09.2026 selbst gemacht.

⚠ **Drei gesperrte Felder haben keinen Schreiber:** `liga`, `gruppe`,
`clubcampus_id`. Die Sperre ist das Versprechen — ein Feld grau mit Schloss
sagt „hier kümmert sich jemand darum".

⚠ **Was NICHT stimmt:** die leere Gruppe war nicht die Ursache der
gemischten Rangliste. `get_field('gruppe', <team>)` kommt in `themes/fch/`
kein einziges Mal vor; der Weg zur Rangliste läuft über `sfv_id` →
`sfv_team_id`. Zwei echte Befunde, keine Verbindung.

---

## Die drei Regeln

Beschlossen von Didi am 09.09.2026, hier so notiert, wie sie gelten:

**1 · Kein Schreibvorgang an `fch_team`.** Die Anzeige holt sich die Werte,
statt dass ein Abgleich sie hinschreibt. Die eine Zusage, die die Redaktion
vor dem Export schützt, bleibt unangetastet.

**2 · Das Feld bleibt der Rückfall.** Wo aus der Ablage nichts kommt, gilt,
was von Hand dasteht — wie bei `rangliste` seit dem 09.09.2026. Kein Feld
wird entfernt.

**3 · ⚠ Der Wert kommt aus DERSELBEN ZEILE wie die Rangliste.**

> *„sonst laufen sie auseinander."*

Das ist die schärfste der drei und geht über „lies es aus der Ablage"
hinaus: Liga und Gruppe werden **nicht ein zweites Mal gesucht**, sondern
aus dem Gruppenobjekt genommen, das die Tabelle geliefert hat. Ein zweiter
Zugriff könnte eine andere Gruppe treffen — und dann stünde über einer
Tabelle die Liga einer anderen.

Praktisch heisst das: `fch_theme_rangzeilen()` gibt heute nur `zeilen`
zurück. Für diesen Auftrag muss es **die Gruppe** liefern (oder Gruppe und
Zeilen zusammen), damit Kopf und Tabelle nachweislich dieselbe Herkunft
haben.

---

## ⚠ Der Fall, der den Auftrag erst vollständig macht: ein Team OHNE Rangliste

**Didi, 09.09.2026:** *„Was passiert, wenn ein Team keine Rangliste hat —
Trainingsspiele, Turniere, Gruppen ohne Tabelle? Dann bleibt Liga und
Gruppe leer, und das Feld sagt weiterhin «kommt vom Verband, sobald der
Abgleich steht». Der Satz stimmt dann nicht."*

**Er stimmt dann nie mehr.** Und das ist keine Randlage:

| | |
|---|---|
| **Junioren G** | spielt ohne Meisterschaft. Gemessen: `rangliste_anzeigen = 0`, als einziges Team ausdrücklich abgeschaltet |
| **Cup und Trainingsspiele** | erzeugen Spiele, aber keine Gruppe mit Tabelle |
| **Spielgemeinschaften** | „Juniorinnen Da Spielgemeinschaft" — wessen Rangliste? |
| **vor dem Saisonstart** | Spielplan da, Tabelle noch leer |

**Das Theme hat für diesen Fall schon eine Antwort**, und sie ist gut:

```php
// single-fch_team.php:445, greift wenn weder Spielplan noch Rangliste
// noch Bilanz geschaltet sind
„Auf dieser Stufe wird ohne Meisterschaft gespielt. Wir trainieren
 wöchentlich und nehmen an Turnieren und Freundschaftsspielen teil."
```

### Was daraus für die drei Regeln folgt

**Die Anzeige braucht nichts Zusätzliches.** Kommt aus der Ablage nichts,
greift Regel 2 (das Feld), und ist auch das leer, zeigt die Seite die
Liga-Kachel nicht — so wie heute. Das ist richtig: *eine Kachel mit leerem
Wert wäre der Fehler*, sagt `single-fch_team.php:85` selbst.

⚠ **Der Hinweistext dagegen wird falsch, und zwar dauerhaft.** Für ein
Team ohne Meisterschaft gibt es keinen „Abgleich, der noch nicht steht" —
es gibt nichts, worauf zu warten wäre. Der Satz vertröstet auf ein
Ereignis, das nicht eintritt.

**Der neue Text muss beide Fälle tragen**, und er darf keinen Zeitpunkt
versprechen. Vorschlag, zu entscheiden von Didi:

> *„Kommt aus der Rangliste des Verbands, sobald eine vorliegt. Teams ohne
> Meisterschaft haben keine — hier von Hand."*

Er sagt drei Dinge, die alle stimmen: woher der Wert kommt, dass er
ausbleiben kann, und wer dann zuständig ist.

⚠ **Und die Sperre gehört zum Text.** Ein Feld, das „hier von Hand" sagt
und grau mit Schloss dasteht, widerspricht sich. Zu entscheiden ist
deshalb zusammen:

| | |
|---|---|
| Sperre **bleibt** | dann muss der Text sagen, wie man sie löst (Quelle auf „kein Abgleich"?) |
| Sperre **fällt für `liga`/`gruppe`** | dann ist das Feld ehrlich von Hand pflegbar — und ein späterer Teamabgleich müsste sie zurückholen |

`Masken/team.php:1229` hat die Regel dafür schon: *„Gesperrt wird nur, was
ein Abgleich führt — und nur, solange einer eingestellt ist. Steht die
Quelle auf «kein Abgleich», bleibt alles von Hand pflegbar."* **Für `liga`
und `gruppe` führt heute kein Abgleich etwas.** Nach der eigenen Regel des
Theme wären sie also gar nicht zu sperren.

---

## Was gebaut wurde

1. ✅ **`fch_theme_ranggruppe()`** gibt die **ganze Gruppe** zurück;
   `fch_theme_rangzeilen()` nimmt sie als zweites Argument entgegen, statt
   ein zweites Mal zu suchen (Regel 3). Dazu `fch_theme_rangliga()` und
   `fch_theme_ranggruppenname()` — beide lesen aus **dem übergebenen
   Objekt**, nicht aus einem eigenen Zugriff.
2. ✅ Beide Lesestellen holen die Gruppe **einmal** und leiten Kopf und
   Tabelle daraus ab: `single-fch_team.php` (Liga-Kachel + Tabelle),
   `page-spiele.php` (Überschrift + Tabelle). Feld bleibt Rückfall.
3. ✅ Hinweistexte von `liga` und `gruppe` berichtigt, alter Wortlaut
   zitiert und datiert.
4. ⏸ Über die Sperre ist **nicht** entschieden — Tabelle oben.
5. ⏸ `clubcampus_id` am Team: derselbe Fall, nicht mitgelöst.

**Alles in `themes/fch/` und `mu-plugins/fch-core/`** — zweites Repository,
schreiben nur nach ausdrücklicher Freigabe wie am 09.09.2026.


---

## ⚠ Gemessen vor dem Bau — die zwei Fragen, die den Aufbau bestimmten

An der laufenden Instanz, an **Junioren Ca** (`liga` leer, `gruppe` leer,
`rangliste_anzeigen = 1`). Die fehlende `sfv_id` wurde für die Dauer der
Messung über einen **ACF-Lesefilter** vorgetäuscht — kein Schreibvorgang an
`fch_team`.

### 1 · Braucht die Anzeige die Liga am Team? — **Nein.**

| | Tabelle auf der Seite |
|---|---|
| Ablage leer, `liga` leer, `gruppe` leer | **keine** |
| Ablage gefüllt, `liga` leer, `gruppe` leer | **2 Zeilen** |

Der Weg führt über `sfv_id` → `sfv_team_id` in den Zeilen der Gruppe.
`get_field( 'gruppe', <team> )` kommt in `themes/fch/` **kein einziges
Mal** vor; `liga` wird dreimal gelesen und **jedes Mal nur als Text**.

**Die zwei hängen nicht aneinander.** Das war die Sorge, die den Aufbau
bestimmt hätte — sie ist ausgeräumt.

### 2 · Was passiert beim ersten Lauf? — **Die Tabelle erscheint sofort.**

Weil am Team **nichts geschrieben werden muss**, gibt es innerhalb des
Laufs keine Reihenfolge, die darüber entscheidet. Es braucht keinen zweiten
Durchgang.

⚠ Die einzige Reihenfolge, die überhaupt wirkt, ist die im Lauf selbst:
Spiele zuerst, Ranglisten danach. Wer die Seite in den Sekunden dazwischen
lädt, sieht Spiele ohne Tabelle. Das heilt mit dem nächsten Aufruf.

---

## Belege nach dem Bau

| | |
|---|---|
| `php -l` | **4 Dateien**, keine Syntaxfehler — im Container, `md5` gegen die Arbeitskopie geprüft (alle vier gleich) |
| Ablage gefüllt, Felder leer | Liga-Kachel zeigt `WEGWERF-Liga`; Spielübersicht `WEGWERF-Liga — Junioren Ca`; Tabelle 2 Zeilen |
| Ablage leer | wie vorher: keine Kachel, keine Tabelle, `2. Liga — FC Herrliberg 1` unverändert aus dem **Feld** |
| ohne `wp-export-empfaenger.php` | beide Seiten **HTTP 200**, kein Fatal; Herrliberg 1 zeigt weiter seine 6 Feldzeilen |
| Bestand vorher/nachher | Optionen **8843 = 8843**, postmeta an 980 **88 = 88**, Ablage `NULL`, Lesefilter entfernt |

**Der Rückfall trägt beide Richtungen:** `FC Herrliberg 1` hat eine Liga im
Feld und keine Gruppe in der Ablage → Feld gewinnt. `Junioren Ca` hat
nichts im Feld und eine Gruppe in der Ablage → Ablage gewinnt.

## Was NICHT gebaut wurde — und warum

| | |
|---|---|
| **`gruppe` wird nirgends angezeigt** | `fch_theme_ranggruppenname()` steht bereit, aber **wo** der Name erscheinen soll, ist eine Gestaltungsfrage. Ich erfinde keine Kachel |
| **`page-teams.php:213`** | dritte Lesestelle, ohne Rangliste zur Hand — bleibt beim Feld, wie im Auftrag vorgesehen |
| **Die Sperre** | `liga`, `gruppe` und `clubcampus_id` bleiben gesperrt. Nach der eigenen Regel des Theme („gesperrt wird nur, was ein Abgleich führt") wäre sie bei `liga`/`gruppe` nicht am Platz — **eigener Entscheid** |
| **`clubcampus_id` am Team** | derselbe Fall, kein Schreiber, nicht mitgelöst. Gemeldet |
