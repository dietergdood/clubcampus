# Übergabe an den Website-Chat: `fvrz_link` bauen statt speichern

Gemessen am 10.09.2026. **Der Export soll das Feld NICHT füllen** — die
Vorlage kann die Adresse selbst bauen, und sie tut es an zwei Stellen
bereits.

## Die Antwort in einem Satz

**Das Theme baut Matchcenter-Adressen schon heute.** Also braucht es weder
einen Schreibpfad an `fch_team` noch 21 gespeicherte Adressen.

```php
// themes/fch/inc/verlauf.php:130   (und single-fch_spiel.php gleichlautend)
'https://matchcenter.fvrz.ch/default.aspx?lng=1&cxxlnus=1&v=253&a=tg&tg=' . $mid
```

Dieselbe Bauform für die Gruppentabelle, aus `sfv_id` statt `sfv_match_id`:

```
https://matchcenter.fvrz.ch/default.aspx?v=<VEREIN>&oid=11&lng=1&t=<sfv_id>&a=trr
```

## ⚠ `v` bedeutet in den zwei Adressen NICHT dasselbe

Beides ist gemessen, an verschiedenen Tagen, und steht bereits im Bestand:

| Adresse | `v` | Beleg |
|---|---|---|
| Spielbericht (`a=tg`) | **253** = die **Ansicht** „Spielbericht" | `CLAUDE.md`, 25.08.2026, im Browser belegt |
| Gruppentabelle (`a=trr`) | **1516** = die **Vereinsseite** des FCH | `migration_wp_export.sql:252`, 05.09.2026: *„Der Linkparameter `v=1516` ist die FCH-Vereinsseite und trägt nur für eigene Teams."* |

**Wer eine der beiden Adressen abschreibt und `v` für dasselbe hält, baut
eine Adresse, die auf die falsche Ansicht zeigt.** Der Parameter heisst
gleich und meint zweierlei — dieselbe Familie wie `sfv_id` gegen
`sfv_team_id`, nur beim Verband statt bei uns.

## Woher `v` bei einem zweiten Verein käme

**1516 ist die ClubId des FCH** — in ClubCampus bekannt als Secret
`SFV_CLUB_ID=1516`, dieselbe Zahl, die jeder API-Aufruf mitführt
(`/api/club/ranking?ClubId=…`). ⚠ Nicht zu verwechseln mit der
`clubNumber` **11057**, die in Ranglisten und Matchdaten steht.

⚠ **Und trotzdem gehört sie ins Theme, nicht in den Export.** Eine
WordPress-Installation gehört **einem** Verein; der zweite bekommt eine
eigene mit einer eigenen Konstante. Mandantenfähigkeit ist die Aufgabe von
ClubCampus, nicht die der Vereinswebsite.

**Empfehlung:** eine Konstante bzw. eine Vereinseinstellung im Theme, an
derselben Stelle, an der die Website ihre übrigen Klubangaben führt. Der
Export liefert nichts — auch nicht einmalig: eine Kopplung für einen Wert,
der sich nie ändert, ist teurer als die Konstante.

## ⚠ Bevor das Feld `fvrz_link` fällt — ein Fall, der zuerst zu messen ist

Es hat heute **einen Leser** (`single-fch_team.php:633`) und **einen
Schreiber** (die Saat, `saeen.php:3321`, mit genau der obigen Adresse für
Team 38309).

**Zu prüfen, bevor es entfernt wird:** gibt es eine Mannschaft, deren
FVRZ-Adresse der Vorlage **nicht** folgt?

| Verdachtsfall | warum |
|---|---|
| **Spielgemeinschaften** — im Bestand steht „Juniorinnen Da Spielgemeinschaft" | eine SG spielt unter einem der beteiligten Vereine. Dann ist `v` **ein anderer** als 1516, und die gebaute Adresse zeigt ins Leere |
| Teams ohne `sfv_id` | ohne Kennung keine Adresse — die Zeile „Zum FVRZ" entfällt, wie heute bei leerem Feld |

**Vorschlag, falls eine Ausnahme existiert:** dieselbe Bauform wie bei
`liga` — **gebaut zuerst, Feld als Rückfall**. Dann fällt das Feld nicht,
sondern wird vom Pflichtfeld zum Ausnahmefall, und die 20 regulären
Mannschaften brauchen keinen Eintrag mehr.

Findet sich keine Ausnahme, kann es ersatzlos weg.

## Was der Export dazu tut: nichts

Kein neues Feld, keine Nutzlast, kein Schreibpfad an `fch_team`. Die eine
Zusage, die die Redaktion schützt, bleibt unangetastet — und die Adresse
ist eine **Vorlage**, keine 21 Zeichenketten.

> Didi, 10.09.2026: *„Ändert der Verband seine Adressform, sind es sonst 21
> gespeicherte Adressen statt einer Vorlage — genau das habe ich beim
> Spielbericht schon entschieden."*

Die Entscheidung ist im Theme belegt: der Spielbericht wird gebaut, nicht
gespeichert. Dies ist dieselbe Entscheidung, einen Endpunkt weiter.
