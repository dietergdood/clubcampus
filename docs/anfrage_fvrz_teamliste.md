# Anfrage an den FVRZ — Mannschaften ohne Wettbewerbsteilnahme

Stand 14.09.2026, **nach der Messung**. Zum Abschicken; der Text darunter ist
die Anfrage, alles darüber ist für uns.

⚠ Die erste Fassung sagte nur „wir finden sie nicht". Diese nennt sieben
Aufrufe mit ihren Antworten und eine Nummer, die auf ihrer eigenen Website
steht. **Der Unterschied ist der zwischen einer Vermutung und einer
Messung** — und er entscheidet, ob jemand nachsieht oder zurückschreibt, man
möge es nochmal versuchen.

**Warum sie so kurz ist:** eine Anfrage, die drei Fragen stellt, bekommt eine
Antwort auf eine. Hier steht eine Zahl, eine Frage und ein Angebot.

**Was bewusst NICHT drinsteht:** keine Vermutung über die Ursache, kein
Vorschlag, wie sie es lösen sollen, und kein Vorwurf. Wir wissen, was wir
gemessen haben, und nicht, warum es so ist — und eine mitgelieferte
Erklärung lädt dazu ein, sie zu bestätigen statt nachzusehen.

Die Zahlen sind am 14.09.2026 gemessen (`aktion: "teamprobe"`), nicht aus
einem Dokument zitiert.

---

Betreff: API Club-Schnittstelle — Mannschaften ohne Wettbewerbsteilnahme

Guten Tag

Wir betreiben für den FC Herrliberg ein Vereinsportal und eine Website und
beziehen Spielpläne und Ranglisten über Ihre Club-API (`/api/team/list`,
`/api/club/schedule`, `/api/club/ranking`).

Dabei ist uns eine Lücke aufgefallen, und wir kommen allein nicht weiter.

Unser Verein führt 42 Mannschaften. `/api/team/list` gibt davon 21 heraus —
soweit wir sehen, genau die mit Meisterschaftsbetrieb und Rangliste. Die
übrigen 21 spielen in Turnierform, vor allem die Junioren E; auf Ihrer
Website (matchcenter.fvrz.ch) sind sie mit Turniernummer, Organisator,
Zeitfenster und Teamliste vollständig geführt.

Über die Schnittstelle finden wir sie nicht. Am Beispiel der Mannschaft mit
der Nummer **38315** — sie ist auf Ihrer Website unter genau dieser Nummer
erreichbar (`…&t=38315&a=trr`) — haben wir sieben Wege versucht:

| Aufruf | Antwort |
|---|---|
| `/api/team/list` mit `TeamId=38315` | 21 Einträge, also die unveränderte Liste ohne 38315 |
| `/api/club/schedule` mit `TeamId=38315` | leere Liste |
| `/api/club/ranking` mit `TeamId=38315` | leere Liste |
| `/api/club/schedule` mit `MatchType=6` (Turnier) | leere Liste |
| `/api/club/schedule` mit `MatchType=8` (Mini-Turniere) | leere Liste |
| `/api/club/schedule` mit `MatchType=6` **und** `TeamId=38315` | leere Liste |
| `/api/team/picture/38315` | **ein Bild** |

Der letzte Aufruf ist der aufschlussreichste: das Wappen zu 38315 liefern Sie
aus. Die Nummer existiert in Ihrem System — die übrigen Endpunkte geben zu
ihr nur nichts heraus.

Ergänzend haben wir geprüft:

- In den 270 Zeilen, die `/api/club/schedule` für unseren Klub liefert, kommt
  38315 weder als `teamAId` noch als `teamBId` vor.
- Die Spezifikation kennt keinen Turnierbegriff: „tournament", „turnier",
  „junior", „training", „festival" und „mini" kommen in keinem der 19
  Schemata vor. `matchType` 6 und 8 stehen dagegen in Ihren Stammdaten.

Damit hat die Hälfte unserer Mannschaften auf unserer Website keinen
Spielplan — und es sind die Juniorenmannschaften, deren Eltern dort am
häufigsten nachschauen.

Unsere Frage:

Gibt es einen Weg über die API zu den Mannschaften ohne
Wettbewerbsteilnahme — einen Parameter, den wir übersehen haben, einen
weiteren Endpunkt, oder eine andere Kennung? Und falls es ihn heute nicht
gibt: ist er geplant?

Wir richten uns gern nach dem, was für Sie am wenigsten Aufwand bedeutet.
Wenn es hilft, schicken wir Ihnen unsere konkreten Aufrufe samt Antworten;
wir haben sie protokolliert.

Freundliche Grüsse

<Name>
FC Herrliberg
