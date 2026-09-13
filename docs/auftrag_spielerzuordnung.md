# Spieler zuordnen — der Vorschlagsweg

**Stand 13.09.2026.** Plan, nicht gebaut. Alle Zahlen und Aussagen unten
sind am Code gemessen; wo etwas ungemessen ist, steht es dabei.

---

## Was schon existiert — und deshalb nicht gebaut wird

Die Annahme, der Knopf öffne eine Maske, die es nicht gibt, ist **falsch**.
Gemessen:

`SfvSpielerZuordnung.tsx` hat 412 Zeilen, ist bei `ApiTab.tsx:508`
gerendert, und der Knopf „Spieler zuordnen" bei `:718` öffnet sie. Sie
gruppiert die offenen Spieler nach Mannschaft, holt deren SFV-Namen über
die Aktion `namen`, hält sie im Speicher und schreibt die Zuordnung über
`speichereZuordnung()` nach `sfv_zuordnung`. Lösen geht auch.

**Es fehlt genau eine Sache: sie schlägt nichts vor.** Je offenem Spieler
bietet sie eine alphabetische Liste **aller aktiven Mitglieder** —
`mitgliedOpts`, ungefiltert bis auf `aktiv !== false`. Bei 381 offenen
Spielern heisst das 381 Mal aus einer langen Liste greifen.

---

## Was die Zuordnung bewirkt — gemessen, und die Antwort ist gemischt

Das gehört vor jede Stunde Arbeit, und zwar ehrlich.

**Was sich sofort ändert:** `fetchSfvNamen()` wird in
`TermineModul.tsx:584` aufgerufen. Der Spielverlauf zeigt danach den
Namen statt „Nr. 13" — im Portal und, weil der Export dieselbe Karte
benutzt, auch auf der Vereinswebsite. Das ist sichtbar, je Spiel, ohne
weiteren Bau.

**Was sich NICHT ändert:** die Spielerstatistik. `baueStatistik()` in
`matchdatenAnzeige.ts` ist gebaut und getestet und hat **keinen
Aufrufer** — „Anna hat 3 Tore" erscheint nirgends. Wer zuordnet, bekommt
Namen im Verlauf, keine Statistik. Die braucht einen eigenen Bau.

⚠ **Das ist die Zahl, die über den Aufwand entscheidet**, und sie darf
nicht schöngeredet werden: der Ertrag ist heute die Namensanzeige. Die
Statistik ist einen Schritt dahinter, und sie ist der Grund, aus dem
jemand zuordnen will.

---

## Der Vorschlagsweg

### Woran verglichen wird

**Name, Jahrgang und Mannschaft** — und der Jahrgang ist der Teil, der es
tragfähig macht.

Die Datei sagt selbst, warum automatisch über den Namen ausscheidet: *„der
Verein hat zwei Adrian Schmid und zwei Adrian Jenni."* Mit dem Jahrgang
sind beide Paare unterscheidbar.

⚠ **Und den Jahrgang gibt es, nur nicht bei uns.** `/api/match/{id}/players`
liefert `birthDate` bei jedem Spieler — die Feldliste in `matchdaten.ts:10`
nennt es, und `bildeAufstellung()` verwirft es ausdrücklich. `sfv_personen`
führt nur Name, Team und Rückennummer.

**Er wird gehalten wie der Name: im Speicher, für die Dauer der Maske, und
beim Neuladen weg.** Das ist dieselbe Entscheidung, die am 21.08.2026 für
den Namen getroffen wurde, mit derselben Begründung — eine Spalte läse der
ganze Verein, und nach der Zuordnung wäre der Wert zwecklos.

### Wie der Vorschlag gebildet wird

Drei Merkmale, in dieser Reihenfolge, und **keines** entscheidet allein:

1. **Mannschaft.** Die Maske ist schon nach Mannschaft gruppiert; die
   Vorschläge kommen aus dem Kader derselben Mannschaft. Das schneidet 512
   Mitglieder auf ein bis zwei Dutzend.
2. **Jahrgang.** Gleicher Jahrgang aus `personen.geburtsdatum` gegen
   `birthDate` — der Teil, der die Namensgleichen trennt.
3. **Name.** Über `namensschluessel()`, denselben Helfer, den der
   Personen-Abgleich benutzt.

Vorgeschlagen wird, wer **alle drei** trifft. Wer zwei trifft, steht als
zweiter Vorschlag darunter, mit dem fehlenden Merkmal benannt.

### Zwei Schutzregeln, und sie sind der Kern

**⚠ Bei zwei Kandidaten wird keiner vorgeschlagen.** Nicht der
wahrscheinlichere, nicht der erste — keiner, und die Maske sagt, dass es
zwei sind. Dieselbe Regel wie bei der Nummern-Brücke im Export: *eine
Brücke, die rät, ist schlimmer als keine, und eine, die immer gleich rät,
ist die schlimmste.*

**⚠ Der Vorschlag wird nie automatisch gespeichert.** Er füllt das Feld
vor, und Didi bestätigt. Ein „alle bestätigen"-Knopf wäre der Punkt, an dem
aus einem Vorschlag eine Behauptung wird — **und ein falscher Treffer, der
gespeichert ist, sieht danach aus wie eine Zuordnung von Hand.**

### Die Rückennummer bleibt draussen

Sie liegt auf beiden Seiten (`spiel_aufstellung.rueckennr` als `integer`,
`kader.rueckennr` als **`text`**), und sie wäre der naheliegende vierte
Vergleich. Sie bleibt weg, aus zwei Gründen:

Die Typen sind verschieden, und ein Textfeld hält `"7 "`, `"07"` und `""`.
Und wichtiger: eine Rückennummer ist eine **Beschriftung auf einem
Trikot**, kein Schlüssel — das steht seit dem 10.09.2026 im Papier, samt
dem Fall, in dem sie in derselben Partie zweimal vorkommt.

⚠ Als **Anzeige** neben dem Vorschlag ist sie richtig: sie hilft dem
Menschen, der bestätigt. Als Vergleichsmerkmal nicht.

---

## Der eine echte Risikopunkt

**Das Geburtsdatum ist ein neues Feld an einem bestehenden Objekt** — und
damit erbt es jeden Ausgang, den dieses Objekt schon nimmt.

Genau dieser Fehler ist am 21.08.2026 passiert: `offene_namen` war als
Durchreiche an den Browser gedacht, und dasselbe Objekt ging über
`details: erg` in `api_sync_log` — **903 Klarnamen in sieben Läufen**, plus
die Antwort des Cron-Laufs in `net._http_response`.

Vor dem Bau ist deshalb zu prüfen, welche Ausgänge das Antwortobjekt der
Aktion `namen` heute hat:

```bash
grep -n "\berg\b" supabase/functions/sfv-sync/namenLauf.ts
```

Für jeden Ausgang eine eigene Allowlist — `fuersProtokoll()` und
`fuerZeitplanAntwort()` in `ergebnisTypen.ts` sind die Muster. **Ein
Geburtsdatum im Protokoll wäre schlimmer als ein Name: es veraltet nicht.**

⚠ Und die Aktion `namen` ist ohnehin schon für den Zeitplan gesperrt
(`namen nur mit Anmeldung`), aus genau diesem Grund. Die Sperre gilt weiter
und wird nicht angefasst.

---

## Aufwand und Reihenfolge

Klein, und in dieser Ordnung:

1. `birthDate` in die Antwort der Aktion `namen` aufnehmen — mit der
   Allowlist-Prüfung oben. Das ist der Schritt mit dem Risiko.
2. Den Vorschlag in `SfvSpielerZuordnung.tsx` bilden: Kader der Mannschaft,
   Jahrgang, Namensschlüssel. Vorbelegen, nicht speichern.
3. Zwei Testfälle, die die Schutzregeln halten: zwei Kandidaten ergeben
   **keinen** Vorschlag, und ein Vorschlag wird nicht gespeichert.

**Was NICHT dazugehört** und ausdrücklich offen bleibt: die Statistik.
Sie ist der Ertrag, den sich jeder von der Zuordnung erwartet, und sie ist
ein eigener Auftrag. Wer sie hier mit hineinnimmt, hat zwei Bauten in
einem und kann bei einem Fehler nicht sagen, welcher.
