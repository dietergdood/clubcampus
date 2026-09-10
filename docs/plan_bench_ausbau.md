# Plan — `/bench` ausbauen

Stand 10.09.2026. **Gemessen, nichts gebaut. Kein Ausbau vor Freigabe.**

---

## 0 · Warum es ihn gibt, und warum das der eigentliche Befund ist

`/bench` entstand am Vormittag des 10.09.2026 aus dem Satz *„`/players`
liefert nur die Startelf"* — gezogen aus den **207**, die fehlende
**Namen** messen und nicht fehlende **Zeilen**. Beide Hälften sind am
selben Abend widerlegt.

**Der Abruf war nie falsch gebaut. Er war auf eine falsch gestellte Frage
gebaut.** Steht als Lehrsatz in `CLAUDE.md`.

---

## 1 · Was `/bench` beiträgt — gemessen

| | |
|---|---|
| Personen, die **nur** aus `/bench` kommen | **20** |
| davon Rollenkategorie „Spieler" | **0** |
| davon „Trainer/in" | **20** |
| Kosten | **ein Abruf je Spiel** — ein Viertel der vierzig Matchdaten-Aufrufe je Lauf |

**Für Spielernamen trägt er nichts bei.** Die Ersatzspieler stehen alle in
`/players`, und ihre Rolle steht dort in `assignmentRoleName` — belegt
durch die gleiche Verteilung auf beiden Seiten (Ersatz: fremd 37, eigen
40).

---

## 2 · Was anderswo gebraucht wird — jede Spalte einzeln geprüft

| Spalte | Leser ausserhalb des Schreibpfads | |
|---|---|---|
| `rolle_kategorie` | **keiner** — nicht in `src/`, nicht in der Nutzlast, nicht im WordPress-Plugin | geht mit |
| `rolle_kategorie_id` | nur `bildeSfvPersonAusBank` (Filter `=== 1`) — der selbst mitgeht | geht mit |
| `rolle_id` | **keiner** | geht mit |
| `ist_bank` | `rolleAus(zuweisungId, istBank)` und `bank_zeilen` | siehe §3 |
| `bank_zeilen` · `bank_fehler` | Protokoll-Allowlist, keine Anzeige | gehen mit |

⚠ **`rolle_kategorie` ist damit selbst ein Fall von „wer liest diese
Spalte?"** — angelegt am 10.09.2026, an keiner Stelle gelesen, und der
einzige Grund für ihre Existenz fällt jetzt weg.

---

## 3 · `ist_bank` — BESTÄTIGT, aber nicht aus dem genannten Grund

Deine Vermutung: *„`ist_bank` fällt vermutlich auch, weil `rolle_zuweisung`
die Unterscheidung trägt."*

**Bestätigt — und der Weg dorthin ist ein anderer, als er klingt.**

`rolleAus()` liest `istBank` heute als **Abkürzung**: wer aus `/bench`
kommt, ist per Definition nicht in der Startelf. Ohne `/bench` ist
`istBank` immer `false`, und die Unterscheidung hängt allein an
`rolle_zuweisung_id === 2`. Das trägt — für jede Zeile, die seit dem
10.09.2026 geschrieben wurde.

⚠ **Für den Altbestand trägt WEDER das eine NOCH das andere.** Die 1021
Zeilen ohne `rolle_zuweisung` stammen aus der Zeit vor beiden Spalten;
`ist_bank` ist dort ebenfalls `false`. Wer `ist_bank` behielte, um den
Altbestand zu retten, rettete nichts. **Er wird durch Nachladen geheilt
oder gar nicht** (27 Läufe, siehe unten).

---

## 4 · ⚠ DIE 20 ZEILEN MÜSSEN WEG — sonst werden Trainer zu Startspielern

**Der Ausbau des Abrufs löscht nichts.** Die 20 Trainer stehen in
`spiel_aufstellung` und bleiben dort: ohne Rückennummer, ohne Position,
mit `rolle_zuweisung = null`.

`rolleAus(null, false)` gibt **`start`** zurück. **Sie erschienen also in
der Startformation** — namentlich, auf der öffentlichen Website, als
Spieler.

```sql
delete from public.spiel_aufstellung
 where ist_bank and rolle_zuweisung_id is null;
```

⚠ **Das ist der Schritt, den man beim „Abruf entfernen" übersieht**, und
er ist der einzige mit sichtbarer Folge. Er gehört **vor** den Deploy,
nicht danach.

---

## 5 · Reihenfolge

| | | wer |
|---|---|---|
| 1 | Migration: die 20 Zeilen löschen, `ist_bank` · `rolle_id` · `rolle_kategorie*` streichen | du |
| 2 | `holeBank`, `bildeBankZeile`, `bildeSfvPersonAusBank`, `alleBank`, `bank_zeilen`, `bank_fehler` entfernen | hier |
| 3 | `verschmelzeAufstellung()` — **bleibt** | hier |
| 4 | `rolleAus()` verliert den zweiten Parameter | hier |
| 5 | Tests: `bildeBankZeile` (10 Fälle) fallen, `verschmelzeAufstellung` bleibt | hier |

### ⚠ Warum `verschmelzeAufstellung()` bleibt

Ohne `/bench` gibt es keine zwei Quellen mehr — die Verschmelzung sieht
dann überflüssig aus. **Sie ist es nicht:** ihr fremder Zweig fängt zwei
Gegner mit derselben Rückennummer ab, und ohne ihn bricht der ganze
Stapel mit `21000` ab, so wie heute Mittag. `gegner_doppel` zählt sie.

**Der eigene Zweig wird dann tot.** Er bleibt trotzdem stehen — mit
einem Satz, der sagt warum: er ist die Stelle, an der eine zweite Quelle
wieder andocken würde.

---

## 6 · ⚠ OFFENER PUNKT: Trainer sind danach nicht mehr verfügbar

**Nach dem Ausbau kennt ClubCampus die Trainer eines Spiels nicht mehr.**
Nicht „sie werden nicht angezeigt" — die Angabe kommt gar nicht mehr an.

`/bench` ist der **einzige** Weg dorthin: `/players` führt sie nicht,
`/api/match/{id}` liefert Mannschaften und Resultat, nicht das
Betreuerteam.

**Sollen Trainer je auf der Website erscheinen, ist der Abruf wieder
einzubauen** — und dann mit dem Zweck, den er dann hat, statt mit dem,
für den er ursprünglich gebaut wurde.

⚠ **Das ist eine Entscheidung über das Produkt, keine über den Code.**
Deshalb steht sie hier als eigener Punkt und wird nicht stillschweigend
mit ausgebaut.

---

## 7 · Was NICHT mitgeht

| | |
|---|---|
| `aktion: "rohschluessel"` fragt `/bench` mit | **bleibt** — sie liest nur, läuft von Hand, und ist der Weg, den Endpunkt erneut zu messen, falls §6 eintritt |
| `spiel_aufstellung.rolle_zuweisung*` | **bleiben** — sie kommen aus `/players` |
| Der partielle Gegner-Index | **bleibt** |
