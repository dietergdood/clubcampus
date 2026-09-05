# Auftrag für Claude Code — Spieldaten auf fcherrliberg.ch

## Was gebaut wird

Spielplan, Rangliste und Matchereignisse aus ClubCampus erscheinen auf der
WordPress-Website. **Die Daten wandern**, WordPress fragt ClubCampus nicht ab.

## Warum wandern und nicht abfragen

Am 20./21.08.2026 stand der SFV-Sync vierzehn Stunden, und niemand merkte es.
Hinge die Website live an ClubCampus, wäre der Spielplan auf fcherrliberg.ch in
dieser Zeit **leer** gewesen — öffentlich, für jeden sichtbar. Beim Wandern
stünde dort der Stand von gestern, und für einen Spielplan ist ein Tag
Verzögerung belanglos.

Dazu: Die Website hatte im August einen Einbruch. Je weniger sie live nach
aussen spricht, desto weniger Angriffsfläche. Und WordPress kann mit eigenen
Inhalten Dinge, die es mit Fremddaten nicht kann — Suche, Sortierung,
Zwischenspeicher, Weiterleitungen.

## Umfang

| | |
|---|---|
| **Spielplan** | alle Mannschaften |
| **Rangliste** | alle Mannschaften |
| **Matchereignisse** | alle Mannschaften |

Ereignisse heisst: Tore, Assists, Wechsel, Karten.

**Entschieden am 24.08.2026: alle Mannschaften, auch die Junioren.** Ob eine
Mannschaft auf der Website erscheint, steuert das WordPress-Backend — nicht der
Export.

**Die Begründung, damit sie niemand später für Nachlässigkeit hält:** Ereignisse
nennen Personen mit Namen, öffentlich und ohne Anmeldung — und bei den Junioren
war das der Grund für eine Beschränkung. Sie entfällt, weil der Verband dieselben
Namen mit denselben Toren auf fvrz.ch bereits öffentlich zeigt. Die
WordPress-Datenbank fügt nichts hinzu, was nicht schon öffentlich wäre.

**⚠ Was das nicht heisst:** dass Personendaten in WordPress generell unbedenklich
sind. Die Ausnahme trägt genau so weit wie die Veröffentlichung des Verbands —
für Adressen, Geburtsdaten oder AHV-Nummern gilt sie nicht. Wer später einen
weiteren Inhaltstyp anschliesst, prüft das erneut.

**⚠ Die Sichtbarkeit pro Mannschaft ist trotzdem zu bauen** — im Backend, nicht
fest verdrahtet. Und sie gehört zu den Feldern, die der Abgleich **nicht**
überschreiben darf: sie ist eine Entscheidung des Vereins, kein Datum aus
ClubCampus. Siehe „Die Zuordnung".

## Der Verweis auf den FVRZ-Spielbericht

Jedes Spiel auf der Website soll auf seinen Spielbericht beim Verband
verweisen. **Die dafür nötige Kennung ist `spiele.sfv_match_id`** — sie wandert
mit, auch wenn sie auf der Website selbst nie angezeigt wird.

**⚠ Nicht zu verwechseln mit der Spielnummer.** Der FVRZ zeigt in der Anzeige
„Spielnummer: 163640" (= `sfv_spiel_nr`), verwendet in der Adresse aber
`tg=4379001` (= `sfv_match_id`). Zwei verschiedene Zahlen für dasselbe Spiel —
wer die sichtbare nimmt, baut einen Link ins Leere.

| | |
|---|---|
| `sfv_match_id` | die Kennung in der Adresse, bei 269 von 269 Spielen gefüllt |
| `sfv_spiel_nr` | die angezeigte Spielnummer, ebenfalls vollständig |

Belegt am 24.08.2026 über den Gruppenversatz (26 Spiele derselben Gruppe,
identische Differenz zwischen beiden Zahlen) und direkt gegen die FVRZ-Seite
geprüft.

**⚠ Der Link gehört auf die WordPress-Seite, nicht in die Datenwanderung.** Die
Form der Adresse kann sich ändern, wenn der Verband seine Seite umbaut — dann
ist es eine Änderung an einer Vorlage statt an 269 gespeicherten Adressen.
Wandern soll die Zahl, nicht die URL.

### ⚠ Der Verband antwortet auf serverseitige Abrufe mit 403

Gemessen am 25.08.2026: dieselbe Adresse, die im Browser den Spielbericht
zeigt, gibt bei einem Abruf ohne Browser **HTTP 403 Forbidden** zurück — ohne
Rumpf, ohne Erklärung.

**Für den Link selbst ist das ohne Belang.** Er wird im Browser des Besuchers
geöffnet, und dort funktioniert er.

**⚠ Es ist die Grenze, die jemand später gegen sich selbst baut.** Alles
Folgende scheitert, und zwar erst, wenn es schon gebaut ist:

| naheliegende Idee | was passiert |
|---|---|
| eine **Vorschau** oder ein Kartenbild des Spielberichts erzeugen | 403 |
| den **Seitentitel** holen, um den Link zu beschriften | 403 |
| beim Export **prüfen, ob der Link lebt** | 403 für alle 269 |
| die Aufstellung vom Spielbericht **nachladen** statt aus der API | 403 |

Die Aufstellung gibt es ohnehin über die SFV Club API (`/api/match/{id}/players`)
— das ist der Weg, den der Sync geht, und der richtige. Die FVRZ-Seite ist ein
**Ziel für Menschen**, keine Datenquelle.

**⚠ Und der 403 sieht aus wie ein kaputter Link.** Wer eine
Verfügbarkeitsprüfung baut und 269 Fehlschläge bekommt, sucht den Fehler bei
der Kennung — dabei ist sie richtig, und die Prüfung selbst ist der Fehler.
Genau deshalb steht es hier und nicht erst im Fehlerprotokoll.

## Takt

Stündlich. **⚠ Nicht gleichzeitig mit dem SFV-Sync (Minute 17) und nicht mit
dem Wächter (Minute 47).** Schlag eine Minute vor und begründe sie: der Export
soll nach dem Sync laufen, damit er frische Daten sieht, aber mit Abstand — der
Sync darf bis 120 Sekunden brauchen.

## ⚠ Was zuerst zu klären ist

**Die Namen stehen nicht in den Ereignissen.** `spiel_ereignisse` führt
`sfv_person_id` und `rueckennr`; der Klarname kommt über `sfv_zuordnung` →
`mitglieder` → `personen`. Für eine öffentliche Torschützenliste muss dieser
Weg gegangen werden — genau die Kette, die diese Woche abgeschirmt wurde.

Beantworte im Plan:
- **Welcher Name? Entschieden am 22.08.: der volle Name**, wie ihn der Verband
  auf fvrz.ch zeigt. Siehe „Die Startseiten-Kachel" weiter unten.
- **Was passiert mit unzugeordneten Spielern?** Heute sind 0 offen, aber neue
  kommen dazu. Eine Zeile ohne Namen ist besser als keine — oder umgekehrt?
  Sag, was du vorschlägst.
- **Und was mit Gegnern?** `spiel_ereignisse_fremde_anonym_check` erzwingt,
  dass vom Gegner nur `gegner_club_name` steht. Ein gegnerisches Tor hat also
  keinen Schützen. Das ist richtig so — sag, wie die Website das darstellt,
  ohne dass es wie ein Fehler aussieht.

## Die Korrektur-Schicht

`spiel_ereignisse` trägt zwei Herkünfte: `sfv` und `verein`. Vereins-Zeilen
überlagern SFV-Zeilen über `ersetzt_ereignis_id`, und `verworfen_am` nimmt eine
Korrektur zurück.

**Der Export muss dieselbe Auflösung verwenden wie das Portal** — sonst zeigt
die Website etwas anderes als ClubCampus, und niemand weiss, welches stimmt.
Such die bestehende Auflösung im Portal und benutze sie, statt die Logik ein
zweites Mal zu schreiben.

**⚠ 40 % der Spiele haben gar keine Ereignisse vom Verband.** Das Resultat
steht in `spiele.resultat`, nie in den Ereignissen. Ein Spiel ohne Ereignisse
ist der Normalfall und kein Fehler — die Website darf daraus nicht „0:0"
machen.

## Die Startseiten-Kachel

Der Prototyp hat auf der Startseite zwei nebeneinanderstehende Kacheln für die
**1. Mannschaft**: „Letztes Resultat" und „Nächstes Spiel". Sie sind heute von
Hand gefüllt und sollen aus den gewanderten Daten kommen.

Was der Prototyp damit bereits entschieden hat — übernimm es, erfinde nichts
Neues:

| | |
|---|---|
| **Namensform** | **voller Name**: `Adrian Lustgarten 33.` — Vorname, Nachname, Minute |
| **Gegner ohne Tore** | kursiv „keine Tore" statt eines leeren Blocks |
| **Gegner unbekannt** | „GEGNER OFFEN" |
| **Fusszeile** | Datum · Liga · Platz, dazu ein Verweis („Matchbericht", „Alle Spiele") |

**⚠ Der Prototyp zeigt `A. Lustgarten` — das ist überholt.** Didi hat am
22.08. den vollen Namen entschieden, wie ihn der Verband auf fvrz.ch zeigt.
Gilt für die ganze Website, nicht nur für die Kachel, damit nicht zwei
Schreibweisen desselben Menschen nebeneinanderstehen.

**⚠ Damit ist der Platz knapper.** „Adrian Lustgarten 33." ist deutlich
breiter als „A. Lustgarten 33.", und die Kachel steht auf der Startseite neben
einer zweiten. Prüf die Breiten auf allen Stufen, bevor du sie freigibst — bei
langen Doppelnamen zuerst. Der Verein hat mehrere.

**Der Countdown läuft im Browser** und braucht keine gewanderten Daten — nur
Datum und Zeit des nächsten Spiels. Er darf nicht serverseitig gerechnet und
zwischengespeichert werden, sonst zeigt er den Stand des letzten Abgleichs.

**⚠ „Gegner offen" ist ein echter Zustand, kein Ausfall.** Die Kachel muss ihn
von „der Abgleich hat versagt" unterscheiden — sag im Plan, woran.

> **⚠ BERICHTIGUNG VOM 05.09.2026.** Hier stand: *„`spiele.gegner` ist nullable,
> und bei noch nicht ausgelosten Spielen liefert der Verband ihn nicht."* Die
> Spalte ist nullable — **der Sync schreibt aber nie `null`:**
>
> ```ts
> // sync.ts:81
> gegner: gegnerName ?? "",
> ```
>
> **Leerer String, nicht `null`.** Damit sind es zwei verschiedene Aussagen, und
> die Unterscheidung, nach der der Auftrag fragt, liegt genau dazwischen:
>
> | | heisst |
> |---|---|
> | `gegner = ''` | der Verband kennt den Gegner noch nicht — **„GEGNER OFFEN"** |
> | `gegner IS NULL` | diese Zeile hat der Sync nie angefasst (von Hand erfasstes Spiel) |
>
> ⚠ **Und keins von beidem heisst „der Abgleich hat versagt".** Das erkennt man
> nicht am Feld, sondern am **Zeitstempel** des Exports — deshalb trägt jeder
> exportierte Datensatz den Zeitpunkt seines Laufs mit. Siehe
> `docs/plan_wordpress_spieldaten.md` §9.1.

**Welches ist das „letzte" und das „nächste" Spiel? Entschieden am 22.08.:**

| | |
|---|---|
| **Letztes Resultat** | das jüngste Spiel mit `resultat is not null` |
| **Nächstes Spiel** | das nächste in der Zukunft, unabhängig vom Gegner |
| **Kein nächstes** | „Keine Spiele angesetzt" · „Sobald der Verband den Spielplan aufschaltet, steht es hier." |

**⚠ Der Status entscheidet nicht, das Resultat entscheidet.** Ein Spiel in der
Vergangenheit ohne Resultat wird übersprungen — die Kachel zeigt dann das Spiel
davor, statt eine leere Zeile. Das kommt vor: der Verband trägt Resultate nicht
immer sofort nach.

**Die linke Kachel bleibt in der Pause stehen**, auch wenn das Resultat vom
November ist. Nur die rechte bekommt den Ersatztext — die Kachel verschwindet
nicht, sonst verändert sich das Layout der Startseite zweimal im Jahr und
niemand weiss beim ersten Mal, ob es ein Fehler ist.

**⚠ Und wenn es gar kein Spiel mit Resultat gibt** — erste Saison, neuer Verein,
frische Datenbank —, braucht auch die linke Kachel eine Antwort. Schlag eine
vor.

## ⚠ Die Zuordnung: `clubcampus_id`

Der WordPress-Plan sieht an jedem Beitragstyp ein Feld `clubcampus_id` vor.
**Bevor das Backend gebaut wird, muss dreierlei feststehen** — danach ist es ein
Umbau statt einer Entscheidung.

**1 · Ist die Id eindeutig?**

> **⚠ BERICHTIGUNG VOM 05.09.2026 — hier standen die Id-Typen von `teams` und
> `spiele` VERTAUSCHT.** Der Satz lautete: *„`personen`, `teams` und die meisten
> Tabellen tragen UUIDs — die kollidieren nie. `mitglieder` und `spiele` tragen
> `bigint`. Team 47 und Spiel 47 existieren beide."*
>
> Gemessen aus `supabase/schema.sql`:
>
> | | behauptet | **gemessen** | Zeile |
> |---|---|---|---|
> | `teams.id` | uuid | **bigint** | 2174 |
> | `spiele.id` | bigint | **uuid** | 2006 |
> | `personen.id` | uuid | uuid ✓ | 1557 |
> | `mitglieder.id` | bigint | bigint ✓ | — |
>
> ```bash
> for t in teams spiele ranglisten spiel_ereignisse personen mitglieder; do
>   printf "%-20s " "$t"
>   grep -A 3 "CREATE TABLE IF NOT EXISTS \"public\".\"$t\" (" supabase/schema.sql \
>     | grep '"id"' | head -1
> done
> ```
>
> ⚠ **Genau die beiden, um die es hier geht, waren vertauscht — und das dreht
> die Frage um.** Das Kollisionsrisiko liegt nicht bei `spiel` (uuid, global
> eindeutig), sondern bei **`team`**: `teams.id` und `mitglieder.id` sind beide
> `bigint` und beginnen beide klein. Team 47 und Mitglied 47 existieren beide,
> und der CPT `person` ist im WordPress-Plan vorgesehen.

In ClubCampus gemischt: `personen`, `spiele`, `ranglisten` und
`spiel_ereignisse` tragen UUIDs — die kollidieren nie. `teams` und `mitglieder`
tragen `bigint`. Miss es für jede Tabelle, die wandert, und sag, ob das Feld die
Herkunft mittragen muss (`team:47`).

**2 · Was passiert, wenn ein Datensatz gelöscht und neu angelegt wird?**
Dann hat dasselbe Ding eine neue Id, und WordPress hält an der alten fest. Der
Beitrag wird zur Waise: er sieht richtig aus und wird nie mehr aktualisiert.
Bei `personen` ist das real — „Person löschen" gibt es seit dem 23.08. Bei
`spiele` hängt es am SFV-Sync; **miss, ob dort je eine Zeile gelöscht und neu
angelegt wird**, statt es anzunehmen.

**3 · Wer legt an?**
Wenn ClubCampus schreibt und ein Team in WordPress fehlt — legt die Anbindung
es an, oder meldet sie es? Beides ist vertretbar, aber es entscheidet, ob
jemand die Website pflegen kann, ohne dass ClubCampus dazwischenfunkt.

**⚠ Und daraus folgt der Punkt, der vor das Theme gehört:** Legt die Anbindung
an und aktualisiert sie, dürfen die betroffenen Felder im WordPress-Backend
**nicht bearbeitbar** sein. Sonst gibt es zwei Wahrheiten, und die eine
überschreibt die andere beim nächsten Lauf — lautlos, weil ein Abgleich, der
überschreibt, keinen Fehler meldet.

Eine Stelle zum Ändern, beide Richtungen zum Lesen. **Nenn im Plan Feld für
Feld, welche gesperrt sind** — nicht als Regel, sondern als Liste.

## Spieler: die Verknüpfung geht über die SFV-Kennung, nicht über die Person

**Entschieden am 24.08.2026.** Ein Spieler-Beitrag in WordPress hängt an
`sfv_person_id`, nicht an einer ClubCampus-Person.

**Warum:** Der Kader in ClubCampus besteht heute aus Demodaten — 14 von 512
aktiven Mitgliedern haben einen Kadereintrag, darunter ein Zehnjähriger als
Co-Trainer der 1. Mannschaft. Es gibt dort nichts zu holen. Die Spieldaten
dagegen sind echt: `spiel_aufstellung` und `spiel_ereignisse` führen
`sfv_person_id` mit Rückennummer, Position, Minuten, Toren und Karten — pro
Spiel, pro Saison, ohne dass eine Person dranhängen muss.

**Wie es funktioniert:** Die Redaktion legt einen Spieler in WordPress an,
trägt Name und Foto ein und hinterlegt die `sfv_person_id`. Alles Statistische
wandert aus Supabase und aktualisiert sich mit jedem Spiel. Die Nummer steht in
der Zuordnungsmaske neben jedem Spieler.

**⚠ Der Name kommt nicht mit.** Der Verband liefert ihn, ClubCampus speichert
ihn bewusst nicht (Entscheid vom 22.08.). In der Datenbank steht „Spieler
1339751, Nr. 13, 3 Einsätze". Der Name ist damit **redaktionell** — er wird in
WordPress eingetragen und nie überschrieben.

**⚠ Und damit ist die Feldtrennung hier scharf:**

| kommt aus Supabase | bleibt redaktionell |
|---|---|
| Einsätze, Minuten, Tore, Assists, Karten | Name, Foto, Vorstellungstext |
| Rückennummer(n), Position | alles Weitere |

Die linke Spalte darf im Backend **nicht** bearbeitbar sein — sie wird beim
nächsten Lauf überschrieben. Die rechte fasst der Abgleich nie an.

**⚠ Was passiert ohne Verknüpfung?** Ein Spieler-Beitrag ohne
`sfv_person_id` ist ein rein redaktionaler Eintrag und wird vom Abgleich
übergangen. Das muss so bleiben: die Redaktion soll Spieler erfassen können,
bevor sie je auf einem Spielbericht standen.

**⚠ Und was, wenn dieselbe `sfv_person_id` zweimal vergeben wird?** Dann
bekämen zwei Beiträge dieselben Zahlen. Prüf, ob WordPress das verhindern kann,
und sag, was der Abgleich tut, wenn er sie doppelt findet — er darf nicht
stillschweigend einen von beiden bedienen.

**Nicht Teil dieses Auftrags, aber vorgesehen: der spätere Umstieg auf
`personen`.**

Der Weg dorthin existiert bereits — `sfv_zuordnung` verbindet
`sfv_person_id` mit `mitglied_id`. **Genutzt wird er noch nicht: es ist bislang
niemand zugeordnet.**

> **⚠ BERICHTIGUNG VOM 25.08.2026.** Hier stand: *„seit dem 22.08. sind alle
> 177 offenen Spieler zugeordnet. ClubCampus weiss also längst, welche Person
> hinter `1339751` steckt."*
>
> **Beide Hälften trafen nicht zu.**
>
> | | behauptet | gemessen |
> |---|---|---|
> | zugeordnete Spieler | alle | **0** |
> | offene Spieler | 177 | **287** |
>
> `public.sfv_zuordnung` hat **null Zeilen**. Die Zuordnungsarbeit ist nie
> gemacht worden — der Satz beruhte auf einer Verwechslung mit einem anderen
> Arbeitsschritt vom selben Tag. **Kein Defekt, ein Irrtum im Dokument.**
>
> Die **177** war ausserdem der Stand vom **21.08.**, eine Momentaufnahme:
>
> | Stand | offene Spieler |
> |---|---|
> | 21.08.2026 | 177 |
> | 22.08.2026 | 265 |
> | 23.08.2026 | **287** |
>
> ⚠ **Warum die Berichtigung deutlich ausfällt:** die Zahl stand als Tatsache
> da und wurde weiterverwendet („der Umstieg ist kein Umbau, sondern ein
> zusätzlicher Blick"). Diese Folgerung bleibt richtig — aber sie setzt
> Zuordnungen voraus, die es nicht gibt. Wer den Abschnitt las, hielt eine
> Vorarbeit für erledigt, die noch aussteht.

### ⚠ Reihenfolge: die Spielerliste VOR der Zuordnungsarbeit ziehen

Die `namen`-Aktion gibt strukturell nur die **offenen** Spieler zurück —
`bildeOffeneNamen` überspringt jeden bereits Zugeordneten
(`supabase/functions/sfv-sync/matchdaten.ts:187`), und `laufeNamen` fragt nur
Spiele mit offenen Spielern beim Verband ab.

**Solange nichts zugeordnet ist, liefert sie alle 287.** Mit jedem
zugeordneten Spieler schrumpft sie.

⚠ **Das ist die gefährliche Sorte Abhängigkeit, weil sie plausibel aussieht.**
Wer erst zuordnet und dann exportiert, bekommt eine kürzere Liste — und käme
nicht darauf, dass die eigene Arbeit der Grund ist. Es fehlt keine Meldung, es
fehlt kein Spieler „im Fehler": die Liste ist einfach kleiner, und genau die
Spieler fehlen, die man schon bearbeitet hat.

**Also: erst die Liste ziehen, dann zuordnen.** Wird sie später erneut
gebraucht, muss klar sein, dass sie dann nur noch die Restmenge zeigt.

Der Umstieg ist deshalb kein Umbau, sondern ein zusätzlicher Blick: der
Abgleich schaut nach, ob eine Zuordnung besteht. Wenn ja, kommt der Name aus
`personen`. Wenn nein, bleibt der redaktionelle stehen.

**⚠ Das geht Spieler für Spieler, nicht alles auf einmal** — je nachdem, wer
zugeordnet ist. Genau deshalb braucht es keinen Stichtag.

**⚠ Und der Preis gehört benannt:** Sobald der Name aus ClubCampus kommt, ist
er im Backend nicht mehr änderbar. Ein Spitzname oder eine bewusst andere
Schreibweise wird beim nächsten Lauf überschrieben. Wer das nicht will, lässt
die Zuordnung für diesen Spieler weg — dann ist sie auch die Stelle, an der man
es steuert.

**Bau heute nichts davon.** Aber bau nichts, was dem im Weg steht: kein
zweites Namensfeld, keine Kopie der Zuordnung in WordPress, keine Annahme, dass
der Name dauerhaft redaktionell bleibt.

## Wohin die Daten wandern

Der WordPress-Plan (`fch-wordpress-umsetzung.md`) sieht sieben Inhaltstypen
vor, alle mit `clubcampus_id`. Für dieses Vorhaben relevant: `spiel` und
`team`.

Beantworte im Plan:
- **Wer schreibt?** Eine Edge Function, die die WordPress-REST-API bedient, oder
  ein Plugin auf WordPress-Seite, das bei ClubCampus abholt? Beides hat einen
  Zugang, der irgendwo liegen muss — sag, wo, und warum dort.
- **Rangliste als CPT oder als Feld?** Eine Tabelle ist kein Beitrag. Ein
  eigener Inhaltstyp pro Rangliste wäre vermutlich falsch.
- **Wie wird gelöscht?** Ein Abgleich, der nur schreibt und nie löscht,
  veraltet in eine Richtung.

  > **⚠ BERICHTIGUNG VOM 05.09.2026.** Hier stand: *„Ein abgesagtes Spiel
  > verschwindet in ClubCampus. Der Export muss das nachziehen, sonst bleibt es
  > auf der Website stehen."* **Beide Hälften der Annahme treffen nicht zu.**
  >
  > **a) Ein Spiel verschwindet nie.** Es gibt im ganzen Projekt keinen
  > Löschpfad auf `spiele`:
  >
  > ```bash
  > grep -rn "from(\"spiele\")\|from('spiele')" src/ supabase/functions/ | grep -i delete
  > # → 0 Treffer
  > ```
  >
  > `src/` greift überhaupt nur einmal auf `spiele` zu, und das liest
  > (`spielService.ts:20`). Der Sync löscht ausdrücklich nicht — er zählt:
  >
  > ```ts
  > // sync.ts:206-208
  > /* Nicht mehr gelieferte werden gezählt, nie gelöscht. */
  > erg.spiele.nicht_mehr_geliefert = [...bekannt].filter((id) => !geliefert.has(id)).length;
  > ```
  >
  > `ranglisten` **werden** gelöscht (`sync.ts:248`), `spiele` nicht.
  >
  > **b) „Abgesagt" ist kein Zustand, sondern eine Familie aus zwölf.** Aus
  > `docs/sfv/sfv_stammdaten.json` → `Spielstatus`: 1 noch nicht ausgetragen ·
  > 2 ausgetragen · 3 forfait · 4 Null zu Null · 5 abgebrochen · 6 verschoben ·
  > 7 neu angesetzt · 8 nicht gespielt (SR) · 9 nicht gespielt (Gegner) ·
  > 10 findet nicht statt · 11 Abbruch der Saison · **12 Spiel ohne Austragung
  > (keine Publikation)**.
  >
  > ⚠ **STATUS 12 IST EIN VERÖFFENTLICHUNGSVERBOT DES VERBANDS.** Es steht
  > wörtlich so in den Stammdaten, und es kommt bisher an **keiner** Stelle des
  > Projekts vor — nicht im Code, nicht in `CLAUDE.md`, nicht in diesem
  > Auftrag. Der Sync speichert den Zustand brav in `sfv_status`, und niemand
  > liest ihn.
  >
  > **Solange die Daten in ClubCampus bleiben, ist das folgenlos. Mit diesem
  > Auftrag hört es auf, folgenlos zu sein** — es ist die erste
  > Veröffentlichung nach aussen. Wer ohne diese Zeile baut, stellt ein Spiel
  > auf eine öffentliche Website, das der Verband ausdrücklich nicht publiziert
  > haben will.
  >
  > **Der Auslöser fürs Zurückziehen ist damit nicht das Verschwinden einer
  > Zeile, sondern ihr Zustand.** Und ein verschobenes Spiel (6) zu entfernen
  > wäre falsch: es findet statt, nur später.
  >
  > ⚠ **Nebenbefund:** `bildeSpiel` setzt `resultat` nur bei Status 2
  > (`sync.ts:90`). Ein Forfait (3) hat beim Verband ein Resultat und steht in
  > ClubCampus ohne — die Startseiten-Kachel überspringt es deshalb.

## ⚠ Der Ausfall muss auffallen

Genau das war der Fehler beim SFV-Sync. Der Export bekommt von Anfang an:
- eine Spur in `api_sync_log` (oder einer eigenen Tabelle — sag, was passt)
- eine Aufnahme in den bestehenden Wächter (`cron_sync_waechter.sql`), der
  bereits `api_verbindungen` prüft. Prüf, ob der Export dort hineinpasst oder
  eine eigene Prüfung braucht.

**Ein Export, der still ausfällt, zeigt auf der Website wochenalte Daten, ohne
dass es jemandem auffällt.** Das ist schlimmer als ein leerer Spielplan.

## Wo der Export in ClubCampus sichtbar ist

**Portalverwaltung → API-Verbindungen, als zweite Kachel neben dem SFV-Sync.**
Gleiche Bauart, gleiche Stelle — kein neues Muster.

Was sie zeigt:

| | |
|---|---|
| letzter Lauf | Zeitpunkt und Status |
| Umfang | wie viele Spiele, Ranglisten, Ereignisse gewandert sind |
| Fehler | die Meldung des letzten fehlgeschlagenen Laufs |
| Wächter | wann zuletzt geprüft wurde |

**⚠ Sonst braucht ClubCampus keine Oberfläche dafür.** Die Sichtbarkeit pro
Mannschaft steht im WordPress-Backend, nicht hier — zwei Schalter für dieselbe
Frage wären der Fehler, der in diesem Projekt schon mehrfach Zeit gekostet hat.

**⚠ Und die Kachel liest dieselbe Quelle wie der Wächter.** Zwei Regeln für eine
Zahl bedeuten, dass eine von beiden irgendwann etwas anderes sagt — und niemand
weiss, welche stimmt. Der SFV-Sync hat dafür bereits `api_verbindungen` mit
`letzter_sync`, `sync_status` und `wache_zuletzt`; prüf, ob der Export dort als
zweite Zeile hineinpasst, statt eine eigene Tabelle zu bekommen.

## Was NICHT Teil dieses Auftrags ist

- Die übrigen fünf Inhaltstypen (`person`, `anlass`, `jahr`, `sponsor`,
  `produkt`).
- Die Darstellung auf der Website — Vorlagen, Gestaltung, Einbindung ins Menü.
  Erst wandern die Daten, dann wird gestaltet.

## Vorgehen

Bestandsaufnahme und Plan. Darin die Antworten auf alle Fragen oben. **Nichts
bauen.**

Sag ausdrücklich, welche Teile auf **WordPress-Seite** liegen — dort gibt es
keinen Typecheck, keine Testkette und keinen Compiler, der etwas meldet. Was
dort steht, prüft niemand ausser einem Menschen.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow").

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- `error` wird gelesen, nie verschluckt. `catch {}` ohne Bindung ist verboten.
- Allowlist, nie Denylist — besonders bei allem, was den Verein verlässt.
- Wer einem Objekt ein Feld hinzufügt, muss **jeden** Weg kennen, den dieses
  Objekt nimmt.
- Migration über drei Anweisungen hinaus in einen `do $mig$`-Block mit
  Zählprobe, Zahlen aus dem Dump. Probelauf mit `BEGIN … ROLLBACK`.
- Keine Datei ohne `npm run typecheck`, `npm run build`, `npm test`,
  `check:imports`, `check:selects`.
- Deutsch (Schweiz) in Kommentaren, kein ß.
