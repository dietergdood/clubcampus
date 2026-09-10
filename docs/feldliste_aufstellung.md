# Feldliste: Aufstellung — zum Weitergeben an den Theme-Chat

Stand 10.09.2026. **Noch nichts davon wird geschickt** — `wp-export`
kennt das Wort `aufstellung` bis heute nirgends. Diese Liste beschreibt,
was kommen soll, damit die Vorlage **einmal** gebaut werden kann.

---

## 0 · Was zurückgemeldet werden muss, bevor gebaut wird

⚠ **Zeichengenau, und zwar aus dem Backend abgelesen — nicht aus dem
Gedächtnis.** Bei `liga` hat das funktioniert (Beitragstyp `fch_spiel`,
Feldname `liga`, Feldschlüssel `f_s_liga`); bei
`sfv_letzter_sync` gegen `sfv_zuletzt_abgeglichen` nicht, und der
Unterschied hat einen Abend gekostet.

Für **jedes** Feld unten:

| | |
|---|---|
| **Beitragstyp** | an dem es hängt (`fch_spiel`) |
| **Feldname** | der `name` in ACF — das ist, was `update_field()` sucht |
| **Feldschlüssel** | `field_…` bzw. `f_s_…` |
| **Feldtyp** | Text / Zahl / Wahrheitswert / Repeater |
| bei Repeatern | dasselbe für **jedes Unterfeld** — auch für die zwei des **verschachtelten** `marken` |

⚠ **Ein falscher Feldname schlägt nirgends fehl.** `update_field()` löst
einen unbekannten Namen über ACFs **globale Namenssuche** auf und
schreibt dann womöglich in das gleichnamige Feld eines anderen
Beitragstyps. Genau so hätte `liga` die Liga der Mannschaft mit der eines
einzelnen Spiels überschrieben — kein Fehler, keine Meldung, nur ein
falsch gefülltes Teamfeld.

**Erst nach der Rückmeldung kommt der Name in `CC_FELDER`.** Bis dahin
wird das Feld mitgeschickt und vom Empfänger als `unbeachtete_felder`
gemeldet — sichtbar, aber nicht geschrieben.

---

## 1 · Der Repeater `aufstellung`

Eine Zeile je Person, **beide Mannschaften**, sortiert: eigene zuerst,
darin Startelf vor Eingewechselten vor Nichteingesetzten.

| Unterfeld | Typ | eigene | Gegner |
|---|---|---|---|
| `seite` | Text | `heim` / `gast` | `heim` / `gast` |
| `nummer` | Zahl | Rückennummer | Rückennummer |
| `spieler` | Text | Name, sonst `Nr. 18` | ⚠ **immer leer** |
| `position` | Text | z. B. `Mittelfeld linksinnen` | dasselbe |
| `rolle` | Text | `start` · `eingewechselt` · `nicht_eingesetzt` | dieselben drei |
| `ist_captain` | Wahrheitswert | `true` / `false` | `true` / `false` |
| `von_minute` | Zahl | 1 … 90 | dasselbe |
| `bis_minute` | Zahl | 1 … 90 | dasselbe |
| `spielzeit` | Zahl | Minuten | dasselbe |
| `marken` | **verschachtelter Repeater** | je Zeile `art` + `minute` | ⚠ siehe §3 |

---

## 2 · ⚠ Bei jedem „leer": Entscheidung oder Grenze der Quelle?

**Das hat heute einmal gefehlt und einen Umweg gekostet.** Deshalb steht
es hier für jedes Feld einzeln.

| Feld | leer heisst | |
|---|---|---|
| `spieler` beim Gegner | **ENTSCHEIDUNG** | Entscheid B, 10.09.2026: von Gegnern wird kein Name gespeichert. Der Verband **liefert** ihn — wir nehmen ihn nicht. In der Datenbank ist es durch einen CHECK erzwungen, nicht bloss ungenutzt |
| `spieler` bei uns | **Grenze der Quelle** | wenn der Verband keinen Namen führt; dann steht `Nr. 18` statt leer, das Feld ist also nie leer |
| `nummer` | **Grenze der Quelle** | eine fremde Zeile ohne Nummer entsteht gar nicht erst (sie hätte keine Identität); bei uns kann sie fehlen |
| `position` | **Grenze der Quelle** | der Verband führt sie nicht bei jedem |
| `ist_captain` | — | nie leer, `false` ist ein Wert |
| `von_minute` · `bis_minute` · `spielzeit` | ⚠ **beides** | siehe §4 |
| `marken` | ⚠ **beides** | siehe §3 |
| `rolle` | — | nie leer, immer einer der drei Werte |

---

### ⚠ `marken` ist ein verschachtelter Repeater, keine Zeichenkette

**Berichtigt am 10.09.2026, bevor drüben gebaut wurde.** In einer ersten
Fassung dieser Liste stand `marken` als Text (`tor,tor,gelb`) — **das
war ein Fehler, keine Entscheidung.** Damit wäre die Minute verloren
gegangen, obwohl `sammleMarken()` sie durch die ganze Kette trägt und
der Prototyp sie zeigt: **⚽ 67'**.

| Unterfeld von `marken` | Typ | Werte |
|---|---|---|
| `art` | Text | `tor` · `gelb` · `gelbrot` · `rot` |
| `minute` | Text | `67`, auch `45+2` — **Text, nicht Zahl** |

⚠ **`minute` ist Text**, damit Nachspielzeit hineinpasst. Dieselbe
Entscheidung wie beim Verlauf.

⚠ **Die Wechselpfeile stehen NICHT in `marken`**, sondern an
`von_minute` und `bis_minute` derselben Zeile — ein Wechsel bekommt kein
Symbol. Das `↓ 86'` des Prototyps kommt also aus `bis_minute`.

---

## 3 · ⚠ Was ein leeres `marken` beim Gegner bedeutet

> **Ein leeres `marken` beim Gegner heisst „keine Zuordnung möglich",
> nicht „nichts passiert".**

Gegnersymbole werden **ausschliesslich über die Rückennummer**
zugeordnet — Namen speichern wir von Gegnern nicht. Fehlt die Nummer am
Ereignis, bleibt die Zeile ohne Symbol, obwohl das Tor gefallen ist.

**Bei uns ist die Zuordnung vollständig** (Personennummer), **beim
Gegner füllt sie sich mit jedem Lauf auf**: bis zum 10.09.2026 wurde die
Rückennummer bei fremden Ereignissen gar nicht gespeichert, und nur
Spiele, die seither neu geholt wurden, tragen sie. Gemessen an dem Tag:
Tore 40 von 244, Wechsel 24 von 214.

**Die Vorlage darf aus einem leeren `marken` nichts über den
Spielverlauf folgern** — auch nicht „hat nicht getroffen". **Der
Spielstand steht im Resultat, nie in der Summe der Symbole.**

---

## 4 · ⚠ Eine fehlende Minutenangabe kann „unplausibel" heissen

Nicht nur „keine Angabe". Zwei verschiedene Fälle mit demselben
Aussehen:

| | |
|---|---|
| **keine Angabe** | der Verband hat das Feld nicht gefüllt — Altbestand aus der Zeit vor der Spalte |
| **unplausibler Wert** | der Verband hat etwas geliefert, das nicht sein kann |

Vom zweiten Fall wird **eine** Sorte korrigiert, bevor sie ankommt:
`bis_minute < von_minute` wird getauscht und die Spielzeit neu gerechnet
(54/32/−22 → 32/54/22). Gemessen am 10.09.2026: **genau ein Fall im
ganzen Bestand**, eine eigene Zeile.

⚠ **Alles andere kommt unverändert an** — eine Spielzeit, die nicht zur
Differenz passt, Werte über 90 oder 120. Das ist Absicht: fremde Daten
stillschweigend zu putzen versteckt den Fehler, statt ihn zu melden.

**Für die Vorlage heisst das:** eine Minutenzahl, die seltsam aussieht,
ist nicht unbedingt ein Fehler in der Vorlage. Sie kommt so vom Verband,
und sie soll so aussehen.

---

## 5 · Die drei Werte von `rolle`, und woher sie kommen

```
spielzeit === 0    →  nicht_eingesetzt
von_minute  >  1   →  eingewechselt
sonst              →  start
```

⚠ **Aus den MINUTEN, nicht aus der Rollenangabe des Verbands.** Dessen
`assignmentRole` widerspricht den Minuten in beide Richtungen — gemessen
am 10.09.2026: 17 Spieler mit der Zuweisung „Ersatz" haben von der ersten
bis zur letzten Minute durchgespielt, 20 mit der Zuweisung „-" kamen gar
nicht zum Einsatz. **Die Minuten widersprechen sich nie.**

**Für die Anzeige der Ersatzbank gilt deshalb:** wer auf der Bank sass,
ist `eingewechselt` **oder** `nicht_eingesetzt` — beides zusammen ergibt
die Bank, `start` ergibt die Startformation.

⚠ **`ist_captain` ist ein eigenes Merkmal, kein vierter Rollenwert.**
Ein Captain kann eingewechselt werden; die zwei Fragen sind unabhängig.
Bis zum 10.09.2026 ging die Angabe verloren, weil sie als Rollenwert
behandelt wurde.

---

## 6 · Was NICHT kommt

| | warum |
|---|---|
| Gegnername | Entscheid B — verboten, nicht bloss ungenutzt |
| Personennummer des Gegners | dieselbe Grenze: sie ist über dieselbe Schnittstelle in einen Namen aufzulösen |
| Trainer und Betreuer | `/bench` ist am 10.09.2026 ausgebaut worden. Sie sind **gar nicht mehr verfügbar**; sollen sie erscheinen, ist der Abruf wieder einzubauen |
| Einsatzminuten als Statistik | die Daten trügen es, aber die Zuordnung `sfv_person_id` → Mitglied fehlt. Ohne sie wäre jede Statistik anonym |
