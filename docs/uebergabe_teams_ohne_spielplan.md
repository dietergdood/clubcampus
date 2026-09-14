# Übergabe an den Theme-Chat — Mannschaften ohne Spielplan

> # ⚠ ⚠ ⚠ ANGEHALTEN AM 14.09.2026 — NICHT UMSETZEN
>
> **Zwei Annahmen dieses Papiers sind widerlegt.** Didi hat die Teamseite
> einer Turniermannschaft beim Verband aufgerufen:
>
> ```
> https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1&t=38315&a=trr
> ```
>
> **`t=38315`.** Diese Mannschaften haben also sehr wohl eine Teamnummer
> beim Verband — sie stehen nur nicht in `/api/team/list`.
>
> Damit fällt:
>
> - „ohne Nummer, deshalb kein Ort" — es gibt einen Ort
> - „der Link muss auf die **Vereinsseite** gehen, weil es keine
>   Teamadresse gibt" — es gibt eine, und sie ist besser
>
> ⚠ **Und die offene Frage dahinter ist grösser als der Link:** antwortet
> die SCHNITTSTELLE auf 38315, obwohl sie die Mannschaft nicht von selbst
> nennt? **Eine Liste, die eine Mannschaft nicht nennt, muss sie nicht
> ablehnen** — das sind zwei verschiedene Dinge, und gemessen war bisher
> nur das erste.
>
> Bis das gemessen ist, wird hier nichts umgesetzt. Alles unterhalb dieser
> Zeile ist der Stand von vorher.


Stand 14.09.2026. Alle Zahlen an diesem Tag gemessen (`aktion: "teamprobe"`),
nicht aus einem Dokument zitiert.

## Die Lage in einem Satz

Der Verband liefert für 21 unserer 42 Mannschaften **keine Spiele** — sie
spielen in Turnierform, und `/api/club/schedule` enthält keine einzige Zeile
für sie. Es ist ein Quellenproblem; bei uns ist nichts zu reparieren.

Die Folge auf der Website: eine Mannschaftsseite ohne Spielplan sieht aus wie
eine, bei der etwas kaputt ist.

## ⚠ Die Mengen gehen NICHT auf, und das ist der erste Befund

| | |
|---|---|
| unsere `teams`-Tabelle | **42** Zeilen, 41 aktiv |
| davon mit `sfv_team_id` | **21** |
| davon ohne | **21** |
| `fch_team`-Beiträge drüben | **31** (deine Messung) |
| davon mit `sfv_id` | 21 |
| davon ohne | 10 |

**42 − 31 = 11 Mannschaften haben drüben gar keine Seite.**
**31 − 21 = 10 Seiten haben keine Nummer.**

Das sind **zwei verschiedene Gruppen**, und sie werden leicht verwechselt —
die „elf", die in unserem Gespräch herumgeisterten, waren vermutlich diese
elf ohne Seite, nicht die 21 ohne Spielplan.

⚠ **Für die elf ohne Seite können wir nichts anzeigen.** Es gibt keinen Ort.
Ob sie eine Seite bekommen sollen, ist eine Entscheidung von Didi, keine
technische.

**Der Satz unten betrifft also die 10 Seiten ohne Nummer** — und jede weitere,
die dazukommt.

## Was du von uns brauchst: fast nichts

Der Export **kann** diesen Satz nicht liefern. Er gruppiert die Spiele je
`sfv_team_id` und sendet je Teamnummer; der Empfänger findet den Beitrag über
das Postmeta `sfv_id`. Eine Mannschaft ohne Nummer hat auf beiden Seiten keine
Identität — sie kommt in keiner Nutzlast vor und kann in keiner vorkommen.

**Die Bedingung steht deshalb bei dir, und sie ist eine Zeile:** ist das
Postmeta `sfv_id` an einem `fch_team`-Beitrag leer, gibt es keinen Spielplan
und wird auch keiner kommen.

⚠ **Nicht „der Spielplan ist leer" als Bedingung nehmen.** Eine Mannschaft
**mit** Nummer kann vorübergehend keine Spiele haben — Saisonpause,
Spielplan noch nicht publiziert. Das ist eine andere Lage und braucht einen
anderen Satz oder gar keinen. Die zwei zusammenzuwerfen wäre genau die
Einebnung, die uns diese Woche mehrfach Zeit gekostet hat.

## Der Text

> Diese Mannschaft spielt in Turnierform. Der Verband führt ihren Spielplan
> nicht über die Schnittstelle — er steht nur auf seiner eigenen Website.

Dazu der Link auf die **Vereinsseite** beim Verband:

```
https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1
```

⚠ **Die Vereinsseite, nicht eine Mannschaftsseite.** Eine Teamadresse braucht
`t=<teamId>`, und genau die haben diese Mannschaften nicht. Von der
Vereinsseite aus findet ein Mensch die Turniere; eine Maschine nicht.

⚠ `v=1516` ist die ClubId, `oid=11` der FVRZ. Beide liegen bei uns seit dem
14.09.2026 als Spalten an `vereine` (`sfv_club_id`, `sfv_verband_oid`) — für
deine Installation sind es Konstanten, dort dürfen sie fest stehen. Bei uns
dürfen sie es nicht, weil das Portal mandantenfähig ist.

⚠ **Und nicht mit `sfv_club_nummer` verwechseln.** Das ist **11057** und eine
andere Zahl aus einem anderen System. Beide sehen nach „Vereinsnummer" aus.

## Was wir gebaut haben, falls du es je brauchst

`src/domains/sfv/verbandslink.ts` baut beide Adressen und entscheidet den
Satz. Sie ist für **unser Portal** da, nicht für dich — du brauchst sie
nicht, weil die Bedingung bei dir einfacher ist. Sie steht hier nur, damit
die zwei Seiten nicht auseinanderlaufen, falls der Satz je geändert wird.

⚠ Eine Eigenheit daraus, die auch bei dir gilt: **kein halber Link.** Fehlt
eine der Angaben, lieber gar keinen — eine Adresse mit `v=0` führt auf eine
fremde oder leere Seite, und das sieht aus wie ein Defekt **deiner** Seite,
nicht wie ein fehlender Wert.

## Was offen bleibt

Die Anfrage an den FVRZ ist geschrieben (`docs/anfrage_fvrz_teamliste.md`)
und geht raus: gibt es einen Weg über die API zu den Mannschaften ohne
Wettbewerbsteilnahme? Sagt er ja, fällt dieser ganze Satz wieder weg und die
21 bekommen einen echten Spielplan.

⚠ Bis dahin ist der Satz das Ehrlichste, was geht — **und er ist besser als
eine leere Karte**, weil er den Unterschied zwischen „gibt es nicht" und „ist
kaputt" sichtbar macht.
