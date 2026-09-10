# Plan B — Gegneraufstellung ohne Namen

Stand 10.09.2026. **Gemessen, nichts gebaut.**

---

## ⚠ B IST NICHT C — der Unterschied, mit Datum

| | **B** (dieses Papier) | **C** (`plan_gegner_namen.md`, ⛔ abgelehnt) |
|---|---|---|
| Gegner-Rückennummer | ✅ | ✅ |
| Gegner-Position | ✅ | ✅ |
| **Gegnername** | ❌ **verboten, nicht bloss ungenutzt** | ✅ |
| `spiel_ereignisse_fremde_anonym_check` | **bleibt unverändert** | wäre gefallen |
| Verlaufszeile beim Gegner | **unverändert**, ohne Nummer | hätte Namen getragen |

**Beide entschieden am 10.09.2026:** C abgelehnt, B angenommen. Wer später
nur „die Gegnerseite wurde geöffnet" liest, hält das eine für das andere —
deshalb steht der Unterschied hier und in beiden Papieren.

---

## 1 · Messung: liefert der Verband Nummer und Position bei Gegnern?

**Ja, vollständig.** Gemessen an einer echten aufgezeichneten Antwort
(`docs/sfv/matchdaten_beispiel.json`, 32 Spieler aus einem Spiel):

| Feld | eigene (20) | **fremde (12)** |
|---|---|---|
| `personId` | 20 | 12 |
| **`jerseyNumber`** | 20 | **12** |
| **`positionId` · `positionName`** | 20 | **12** |
| `playFromMinute` · `-Until` · `totalPlayTime` | 20 | 12 |
| `firstname` · `name` · `birthDate` · `passportNumber` | 20 | 12 |

```
Beispiel fremd: { clubNumber: 11030, personId: 1254213, jerseyNumber: 17,
                  positionId: 48, positionName: "Mittelfeld linksinnen",
                  name: "«string geschwaerzt»" }
```

⚠ **Die Namen sind in der Aufzeichnung geschwärzt** — das ist die
Allowlist des Probeskripts vom 19.08.2026, nicht der Verband. Die Datei
selbst trägt keine Gegnernamen; das ist ein Nebenbefund und spricht für
das Skript.

**Damit erübrigt sich der Rest nicht** — die Spalte bliebe nicht leer.

---

## 2 · ⚠ ZWEI KORREKTUREN AN DER AUFGABENSTELLUNG

### (a) Der CHECK ist am falschen Ort — er darf gar nicht angefasst werden

`spiel_ereignisse_fremde_anonym_check` sitzt auf **`spiel_ereignisse`**,
also am **Verlauf**. Und der Verlauf soll bei Gegnern **unverändert**
bleiben (deine Vorgabe, Schritt 3).

> **Würde man ihn lockern, damit `rueckennr` erlaubt ist, entstünde genau
> das, wovor du warnst:** ein Feld, das erlaubt ist und leer bleibt, weil
> niemand es füllt.

⚠ **`spiel_aufstellung` hat heute überhaupt keinen CHECK** — sie brauchte
keinen, weil dort nie eine fremde Zeile entstand. **B braucht deshalb
einen NEUEN Constraint auf `spiel_aufstellung`**, nicht die Änderung des
alten.

```sql
-- neu, auf spiel_aufstellung
constraint spiel_aufstellung_fremde_ohne_person check (
  ist_eigener or (sfv_person_id is null and name is null)
)
```

⚠ **`sfv_person_id` steht mit im Verbot, und das ist keine Kleinigkeit.**
Eine Personennummer ist kein Name — aber sie ist über dieselbe
Schnittstelle in einen Namen aufzulösen, und sie bliebe dauerhaft in
unserer Datenbank. **Verboten heisst verboten.**

⚠ **Folge:** eine fremde Aufstellungszeile hat keinen Primärschlüsselteil
`sfv_person_id` mehr. Der heutige Schlüssel ist
`(verein_id, spiel_id, sfv_person_id)`. Er muss für fremde Zeilen anders
lauten — Vorschlag: `(verein_id, spiel_id, ist_eigener, sfv_team_id, rueckennr)`
als zweiter, partieller Unique-Index für `ist_eigener = false`.
**Das ist der eigentliche Aufwand von B**, und er war in „kein harmloser
Mittelweg" gemeint.

### (b) `matchdaten.test.ts:379` ist gar nicht betroffen

Er prüft **`bildeSfvPerson`** — „Gegner bleiben anonym", also **Namen**.
Unter B bleibt das wahr, Wort für Wort. **Er fällt nicht und wird nicht
genauer; er bleibt.**

**Der Fall, der sich ändert, ist `matchdaten.test.ts:94`:**

```
alt:  „speichert von einem fremden Spieler gar keine Aufstellungszeile"
neu:  „speichert von einem fremden Spieler eine Zeile mit Nummer und
       Position — und ohne jede Person"
```

---

## 3 · Welche der 19 Stellen betroffen sind

| | Stelle | B |
|---|---|---|
| **DB** | `spiel_ereignisse_fremde_anonym_check` | **bleibt** |
| | Tabellenkommentar `spiel_ereignisse` | bleibt |
| | Prüfung auf den Constraint | bleibt |
| | *neu:* `spiel_aufstellung_fremde_ohne_person` | ➕ **dazu** |
| **Code** | `bildeAufstellung:64` | ⚠ **umgebaut, nicht entfernt** — siehe §4 |
| | `bildeBankZeile` | ⚠ **bleibt gefiltert** — siehe §4 |
| | `bildeEreignis:114` | **bleibt** |
| | `bildeSfvPerson:183` | **bleibt** |
| | `bildeOffeneNamen:254` | **bleibt** |
| | Pässe :438 · Zuordnungszählung :486 | **bleiben** |
| **Anzeige** | `beschreibeWer` · `EreignisKorrektur` | **bleiben** |
| **Tests** | `:54` · `:156` · `:322` · `:379` · `logos:169` | **bleiben** |
| | `:94` | ✏️ **umgeschrieben** |
| **Prosa** | alle sechs | ✏️ **ergänzt** um „Nummer und Position ja, Person nein" |

**Von 19 Stellen ändern sich zwei, und eine kommt dazu.**

---

## 4 · `istEigener`: filtern oder abbilden?

**Nicht fallen lassen — der Filter wandert vom Anfang der Funktion in die
Feldzuweisung.**

```ts
// bildeAufstellung: die Zeile entsteht für BEIDE, die Felder nicht
const eigen = istEigener(p.clubNumber, unsere);
return {
  ist_eigener: eigen,
  sfv_person_id: eigen ? personId : null,
  name:          eigen ? … : null,
  rueckennr:     zahl(p.jerseyNumber),      // beide
  position_name: text(p.positionName),      // beide
  …
};
```

⚠ **Warum nicht `return null` weglassen und alles durchreichen:** dann
wäre die Allowlist keine mehr. Die Grenze soll **Feld für Feld** stehen,
nicht Zeile für Zeile — so wie `bildeEreignis` es seit dem 19.08.2026
tut. **Eine Zeile, die durchkommt, nimmt beim nächsten neuen Feld alles
mit; eine Feldliste nicht.**

⚠ **Auf der Bank bleibt `istEigener` als Zeilenfilter.** Zwei Gründe, und
beide sind gemessen: `/bench` führt **keine `jerseyNumber` und keine
Position** — eine fremde Bankzeile trüge also gar nichts Erlaubtes. Und
sie führt `personName` an prominenter Stelle; eine Zeile, die nur aus
Verbotenem besteht, entsteht besser nicht.

---

## 5 · Was sich sonst NICHT ändert

- **Die Verlaufszeile beim Gegner:** `45' FC Uster`. Keine Nummer, kein
  „ersetzt durch". `bildeEreignis` bleibt unangetastet.
- **`sfv_personen`** nimmt weiterhin nur eigene Spieler.
- **Die Zähler** (`zeilen_mit_gegnername`, `wechsel_ohne_*`) zählen
  weiterhin von unseren Spielern.

---

## 6 · Für den Theme-Chat ändert sich **nichts an der Feldliste**

Der Repeater `aufstellung` bleibt bei sieben Unterfeldern. Was sich
ändert, ist nur, **was drinsteht**:

| Unterfeld | eigene | **Gegner** |
|---|---|---|
| `nummer` | ✅ | ✅ |
| `spieler` | Name oder „Nr. 12" | ⚠ **leer** |
| `position` | ✅ | ✅ |
| `seite` | `heim`/`gast` | jetzt **beide Werte** |
| `rolle` | `start`/`ersatz` | ⚠ **immer `start`** — die Bank kommt vom Gegner nicht |
| `von_minute` · `bis_minute` | ✅ | ✅ (der Verband liefert sie) |

⚠ **Zwei Dinge sollte der Theme-Chat wissen, bevor er baut:**

1. **`spieler` ist bei Gegnern leer** — die Vorlage braucht dafür einen
   Zustand. „Nr. 17" als Ersatztext gehört **nicht** hierher: das Feld
   `nummer` steht daneben, und ein zusammengesetzter Text wäre eine
   zweite Wahrheit.
2. **`rolle` ist beim Gegner immer `start`.** Eine Gegner-Ersatzbank gibt
   es nicht, und sie wird auch nicht kommen — `/bench` führt für fremde
   Spieler nichts Verwertbares.

---

## 7 · Reihenfolge

| | | |
|---|---|---|
| 1 | Migration: `ist_eigener`, neuer CHECK, zweiter Unique-Index | **du** |
| 2 | `bildeAufstellung` umbauen, Test `:94` umschreiben | hier |
| 3 | Sechs Prosa-Stellen ergänzen | hier |
| 4 | Repeater im Theme | Theme-Chat |
| 5 | `CC_FELDER`, Nutzlast, Empfänger | hier |

⚠ **Schritt 1 enthält den Schlüsselwechsel** (§2a) und ist der einzige
Teil, der schiefgehen kann: eine fremde Zeile ohne `sfv_person_id` passt
nicht in den heutigen Primärschlüssel. Das gehört vor dem Bau
entschieden, nicht danach entdeckt.
