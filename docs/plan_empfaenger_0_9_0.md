# Plan — Empfänger 0.9.0: Zeitschutz, Bericht bei Abbruch, `teil`

Stand 10.09.2026. **Freigegeben, noch nicht gebaut.**

---

## Der Ausgangspunkt, gemessen

`wp-export-empfaenger.php` 0.8.0 hat **keinen Zeitschutz**: kein
`set_time_limit`, kein `ignore_user_abort`, keine Transaktion, keine
Stückelung. Was bei einem Zeitlimit passiert, in drei Stufen:

| | |
|---|---|
| **Spiele** | die Schleife läuft Spiel für Spiel, jedes wird fertig geschrieben. Ein Abbruch lässt **ganze** Spiele geschrieben und ganze unberührt |
| **eine Aufstellung** | ⚠ **halb möglich.** `update_field()` auf einen Repeater schreibt ~300 einzelne Postmeta-Zeilen, nicht transaktional |
| **der Bericht** | `cc_bericht_ablegen()` steht am **Ende**. Bei einem Abbruch wird **gar nichts** abgelegt |

**Die halbe Aufstellung heilt sich beim nächsten Lauf** — `update_field`
ersetzt den ganzen Repeater. **Der fehlende Bericht nicht.**

---

## 1 · Der Bericht bei Abbruch — der wichtigste der drei

> **Ohne ihn ist ein Zeitlimit nicht von „nichts zu tun" zu
> unterscheiden.** (Didi, 10.09.2026)

⚠ **Das ist wörtlich derselbe blinde Fleck wie bei `api_sync_log`**, wo
ein gescheiterter Lauf keine Zeile hinterliess und „keine neue Zeile"
genau wie „es gab nichts zu tun" aussah. Dort war die Lösung, die Zeile
**zuerst** zu schreiben. Hier geht das nicht — der Bericht soll ja
Ergebnisse tragen. Also die andere Bauart:

```php
register_shutdown_function( 'cc_bericht_notfalls' );
```

**Sie läuft auch, wenn PHP das Zeitlimit reisst** — anders als der Code
nach der Schleife. Sie prüft, ob der reguläre Bericht schon abgelegt
wurde; wenn nicht, legt sie ab, **wie weit gekommen wurde**.

| Feld | |
|---|---|
| `abgebrochen: true` | die Aussage, um die es geht |
| `verarbeitet` / `erwartet` | 14 von 26 Spielen |
| `letztes_spiel` | die `sfv_match_id`, bei der es riss |
| `laufzeit` | Sekunden bis zum Abbruch |
| `grund` | `error_get_last()` — Zeitlimit, Speicher, oder etwas anderes |

⚠ **`abgebrochen` gehört als eigenes Feld hinein, nicht als fehlender
Wert.** Ein Bericht ohne Abschluss ist dieselbe Familie wie ein
`person_geloescht`-Protokoll ohne `nachher`: **er behauptet sonst mehr,
als geschehen ist.** Und wer die Berichte liest, darf einen abgebrochenen
nicht als erfolgreichen zählen.

⚠ **Das Aufräumen darf beim Abbruch NICHT gelaufen sein.** Es steht heute
nach der Schleife — ein Zeitlimit in der Schleife überspringt es, und das
ist richtig. **Diese Reihenfolge ist zu erhalten**, sonst zieht ein
abgebrochener Lauf die nicht verarbeiteten Spiele zurück.

---

## 2 · `set_time_limit()`

```php
@set_time_limit( 300 );
```

⚠ **Kann vom Hoster verboten sein** (`safe_mode`, `disable_functions`).
Dann tut der Aufruf nichts — und **das soll auffallen**, nicht
schweigen: `/status` meldet, ob er greift.

```php
'zeitlimit' => array(
  'gesetzt'   => (int) ini_get( 'max_execution_time' ),
  'aenderbar' => function_exists( 'set_time_limit' )
                 && ! in_array( 'set_time_limit', $verboten, true ),
),
```

⚠ **Ohne diese Auskunft ist der Schutz eine Behauptung.** Genau das
Muster, das `spielfelder` in 0.8.0 gelöst hat: eine Aufzählung im Code
kann nicht wissen, was drüben gilt — die Gegenstelle schon.

---

## 3 · Das `teil`-Feld

**Der Grund ist das Aufräumen, nicht die Zeit** (siehe CLAUDE.md → „Der
Empfänger setzt fehlende Spiele auf `draft`"). Eine Mannschaft auf zwei
Anfragen zu verteilen zieht mit dem ersten Teil alle Spiele des zweiten
zurück.

```json
{ "lauf": "…", "teams": ["38309"], "spiele": [...],
  "teil": { "nr": 1, "von": 3 } }
```

| | |
|---|---|
| `teil` fehlt | wie bisher: eine Anfrage, Aufräumen läuft |
| `nr < von` | **kein Aufräumen** — die Spiele werden geschrieben, mehr nicht |
| `nr === von` | Aufräumen über den **ganzen** Lauf |

⚠ **Und das Aufräumen des letzten Teils braucht die Spiele der früheren
Teile.** Sonst zieht es sie zurück — genau der Fehler, den `teil`
verhindern soll. Zwei Wege:

| | |
|---|---|
| **A** — der Empfänger merkt sich je `lauf` die gesehenen `sfv_match_id` | ein Transient, Aufräumen gegen die Vereinigung. Zustand über Anfragen hinweg, also eine neue Fehlerquelle |
| **B** — der letzte Teil bringt die vollständige Id-Liste mit | zustandslos, ein Feld `alle_ids`. Ein paar KB, dafür kein Gedächtnis |

**Empfehlung: B.** Der Empfänger bleibt zustandslos, und ein
verlorengegangener Teil führt dann zu „zu wenig zurückgezogen" statt zu
„zu viel" — die harmlosere Fehlerrichtung.

⚠ **Nicht bauen, solange nicht gestückelt wird.** `teil` ist die
Voraussetzung fürs Stückeln, nicht sein Ersatz. Heute geht jede
Mannschaft in einer Anfrage durch; das Feld wird erst gebraucht, wenn
eine Messung zeigt, dass eine nicht mehr durchgeht.

---

## 4 · Reihenfolge und Prüfung

| | | |
|---|---|---|
| 1 | Bericht bei Abbruch + `zeitlimit` in `/status` | ohne Abhängigkeit |
| 2 | `set_time_limit()` | trivial |
| 3 | `teil` annehmen und auswerten | erst wenn gestückelt wird |
| 4 | `check:plugin` um zwei Regeln erweitern | siehe unten |

**Die zwei neuen Prüfregeln:**

| | |
|---|---|
| `cc_bericht_notfalls` ist registriert | sonst fällt der wichtigste Teil beim nächsten Umbau still weg |
| das Aufräumen steht **nach** der Schleife | die Reihenfolge ist die Zusage; sie zu drehen wäre ein stiller Datenverlust |

⚠ **Jede Regel bekommt eine Positivkontrolle** — am 10.09.2026 gab es
zwei Regeln in dieser Datei, die bei ihrer eigenen scheiterten. **Eine
Regel, die nie rot war, ist keine Prüfung, sondern eine Behauptung.**
