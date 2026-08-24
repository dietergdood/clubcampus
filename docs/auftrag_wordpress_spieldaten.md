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

**⚠ „Gegner offen" ist ein echter Zustand, kein Ausfall.** `spiele.gegner` ist
nullable, und bei noch nicht ausgelosten Spielen liefert der Verband ihn nicht.
Die Kachel muss ihn von „der Abgleich hat versagt" unterscheiden — sag im Plan,
woran.

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
In ClubCampus gemischt: `personen`, `teams` und die meisten Tabellen tragen
UUIDs — die kollidieren nie. `mitglieder` und `spiele` tragen `bigint`. Team 47
und Spiel 47 existieren beide, und „47" allein ist dann keine Auskunft. Miss es
für jede Tabelle, die wandert, und sag, ob das Feld die Herkunft mittragen muss
(`spiel:47`).

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
`sfv_person_id` mit `mitglied_id`, und seit dem 22.08. sind alle 177 offenen
Spieler zugeordnet. ClubCampus weiss also längst, welche Person hinter
`1339751` steckt; es wird nur nicht genutzt.

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
- **Wie wird gelöscht?** Ein abgesagtes Spiel verschwindet in ClubCampus. Der
  Export muss das nachziehen, sonst bleibt es auf der Website stehen. Ein
  Abgleich, der nur schreibt und nie löscht, veraltet in eine Richtung.

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
