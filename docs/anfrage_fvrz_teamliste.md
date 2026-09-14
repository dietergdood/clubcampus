# Anfrage an den FVRZ — Mannschaften ohne Wettbewerbsteilnahme

Stand 14.09.2026. Zum Abschicken; der Text darunter ist die Anfrage, alles
darüber ist für uns.

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

Über die Schnittstelle finden wir sie nicht:

- `/api/team/list` liefert sie in keinem Aufruf, auch nicht mit `MatchType`
  6 oder 8.
- `/api/club/schedule` enthält keine einzige Zeile, in der eine dieser
  Mannschaften vorkommt (270 Zeilen geprüft, alle Spieltypen).
- In den übrigen Endpunkten der Spezifikation finden wir keine
  Mannschaftskennung, über die wir sie erreichen könnten.

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
