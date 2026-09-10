# Plan — die Aufstellung in die Nutzlast

Stand 10.09.2026. **Gemessen, nichts gebaut. Kein Bau vor Freigabe.**

---

## 1 · Der Ausgangspunkt, gemessen

`wp-export/index.ts` enthält das Wort `aufstellung` **an keiner Stelle**.
Die ganze Kette dahinter steht: `spiel_aufstellung` wird stündlich
geschrieben, `rolleAus()`, `sammleMarken()`, `spielerAnzeige()` sind
gebaut und geprüft — **und keine dieser Funktionen hat einen Aufrufer.**

⚠ **Das ist der Grund, warum den vierten Rollenwert eine SQL-Abfrage
gefunden hat und nicht die Meldung, die dafür gebaut wurde.** Ein
Melder ohne Aufrufer ist selbst die Lücke, gegen die er gebaut wurde.

---

## 2 · ⚠ Der Export sendet NICHT alle 270 Spiele in einem Zug

**Das ist die Antwort auf die Frage nach der Grösse, und sie war mir
selbst nicht präsent.** `sendeTeil()` schickt **eine Anfrage je
Mannschaft**:

```ts
body: JSON.stringify({ lauf, teams: [team], spiele })
```

Bei 21 Mannschaften sind das **21 Anfragen**, nicht eine. Die grösste
trägt die Spiele einer einzigen Mannschaft — in der Meisterschaft
höchstens 26.

**Damit ist die Frage „gehen 270 Spiele noch durch?" die falsche.** Die
richtige lautet: **geht die grösste Mannschaft noch durch?**

---

## 3 · Wie stark die Nutzlast wächst — gerechnet, mit genannten Annahmen

| gemessen | |
|---|---|
| Aufstellungszeilen je Spiel | **29,2** (145 eigene + 147 fremde auf 10 Spiele, Lauf vom 10.09.2026) |
| Verlaufszeilen gesamt | 926 auf 270 Spiele (Vorschau vom 10.09.2026) |
| Spiele mit Aufstellung | 80 von 270 (10.09.2026) |

| angenommen | |
|---|---|
| eine Aufstellungszeile als JSON | **≈ 170 Bytes** (10 Felder, kurze Werte) |
| grösste Mannschaft | 26 Spiele |

**Die grösste Einzelanfrage:**

```
26 Spiele × 29,2 Zeilen × 170 Bytes  ≈  129 KB
```

dazu, was heute schon drin ist. **Das ist weit unter jeder Grenze** —
`post_max_size` steht bei WordPress üblicherweise auf 8 MB.

⚠ **Die 170 Bytes sind geschätzt, nicht gemessen.** Selbst bei 400 Bytes
je Zeile wären es 300 KB, also weiterhin unkritisch. **Die Rechnung
trägt die Entscheidung auch dann, wenn die Annahme um das Doppelte
danebenliegt** — deshalb steht sie hier so und nicht als Messauftrag.

⚠ **Was NICHT gerechnet ist: die Zeit.** 21 Anfragen mit je bis zu 750
Repeater-Zeilen — ACF schreibt einen Repeater als viele einzelne
Postmeta-Zeilen. Bei 20 Feldern je Zeile sind das ~15 000 Schreibvorgänge
je Anfrage. **Das ist die Grenze, an der es klemmen wird, nicht die
Grösse.**

---

## 4 · Der Empfänger braucht eine neue Fassung

**Ja**, und aus zwei Gründen:

| | |
|---|---|
| `aufstellung` steht nicht in `CC_FELDER` | er verwürfe es wortlos — genau der Fall, den `unbeachtete_felder` seit 0.7.0 meldet |
| ein Repeater ist kein Textfeld | `update_field()` braucht ein Array von Zeilen; die Unterfeldnamen müssen zeichengenau stimmen |

⚠ **Und die Aufnahme in `CC_FELDER` kommt ZULETZT, nicht zuerst.**
Genau wie bei `liga`: erst muss das `fch_spiel` ein Feld dieses Namens
haben, sonst schreibt `update_field()` über ACFs globale Namenssuche in
ein gleichnamiges Feld eines anderen Beitragstyps. **Kein Fehler, keine
Meldung, nur ein falsch gefülltes Feld anderswo.**

Bis dahin ist der Zwischenzustand nützlich statt gefährlich: das Feld
wird mitgeschickt, der Empfänger meldet es unter `unbeachtete_felder`,
und wir sehen daran, dass es ankommt.

---

## 5 · Reihenfolge

| | | wer |
|---|---|---|
| 1 | Feldliste an den Theme-Chat (`docs/feldliste_aufstellung.md`) | du |
| 2 | Repeater `aufstellung` mit zehn Unterfeldern anlegen, Schlüssel zurückmelden | Theme-Chat |
| 3 | `baueAufstellung()` in `wpNutzlast.ts` — die vier gebauten Funktionen bekommen endlich einen Aufrufer | hier |
| 4 | Vorschau meldet die neuen Zahlen: Zeilen, Widersprüche, unplausible, unbekannte Rollenwerte | hier |
| 5 | Empfänger 0.9.0: Repeater schreiben, `aufstellung` in `CC_FELDER` | hier |
| 6 | Scharfer Lauf, dann die Zeit messen | du |

⚠ **Schritt 4 vor Schritt 5.** Die Vorschau liest nur und schreibt
nichts — sie ist die Stelle, an der sich die Zahlen ansehen lassen,
bevor irgendetwas auf die Website geht. Beim Verlauf hat genau das die
431 erfundenen Klarnamen gefunden, die in Wahrheit 0 waren.

---

## 6 · Was die Vorschau melden muss — und zwar immer, auch als Null

Aus dem Befund vom 10.09.2026 („berechnet, geliefert, nicht gezeigt",
neun Fälle an einem Tag):

| Zahl | |
|---|---|
| `aufstellungszeilen` | eigene und gegnerische getrennt |
| `ohne_namen` | eigene Zeilen, die als `Nr. 18` erscheinen |
| `widerspruch` | Zuweisung gegen Minuten — **Vorhersage: ≥ 37** |
| `unplausibel` | verdrehte oder negative Minuten — **heute: 1** |
| `korrigiert` | davon getauscht — **heute: 1** |
| `unbekannte_rollen` | Zuweisungswerte ausserhalb 0–3 |
| `ohne_minuten` | Zeilen, bei denen die Zuweisung die Rolle tragen musste |

⚠ **Jede davon steht immer da, auch als Null.** Eine Zahl, die nur im
schlechten Fall erscheint, verlangt vom Leser eine Deutung — und die
Deutung einer Abwesenheit ist geraten. Das ist heute schon einmal
passiert, mit `gegner_doppel`.
