# Übergabe: 13 Mannschaften ohne Spielplan aus der API

Stand 10.09.2026. **Der technische Teil ist abgeschlossen** — es gibt
nichts mehr zu holen. Was bleibt, ist eine Gestaltungsfrage und eine Frage
an den Verband.

## Der Befund in drei Zeilen

| | |
|---|---|
| Die Verbandsseite führt **34** Mannschaften des FCH, **alle mit Spielplan** | gemessen von Didi |
| `/api/team/list` gibt **21** heraus — die mit Wettbewerbsteilnahme | gemessen |
| Es gibt **keinen** zweiten Weg: 15 Pfade, ein einziger Spielplan-Endpunkt, kein Filter, der mehr bringt | gemessen an der Swagger und mit `aktion: "teamprobe"` |

**Die Website des Verbands zeigt Daten, die seine eigene API nicht
herausgibt.** Für die 13 Mannschaften — die jüngsten Jahrgänge, Spieltyp
„Turnier" und „Mini-Turniere" — kommt über ClubCampus kein Spiel an, und
das lässt sich von unserer Seite nicht beheben.

## ⚠ Was die Teamseite heute zeigt: nichts

Gemessen in `themes/fch/single-fch_team.php`:

```php
// :546 und :560 — beide Abschnitte hängen an Schalter UND Daten
<?php if ( fch_theme_schalter( 'spielplan_anzeigen', $fch_id ) && $fch_kommend ) : ?>
```

Und der Ersatzabschnitt greift **nur, wenn alle drei Schalter aus sind**:

```php
// :459 — nur bei !$fch_sport
„Auf dieser Stufe wird ohne Meisterschaft gespielt. Wir trainieren
 wöchentlich und nehmen an Turnieren und Freundschaftsspielen teil."
```

⚠ **Für diese 13 trifft weder das eine noch das andere zu.** Der Schalter
steht an (sie sollen einen Spielplan haben), Spiele gibt es keine — also
**verschwindet der Abschnitt ersatzlos**, und der Ersatztext erscheint
nicht, weil nicht alle Schalter aus sind.

> **Eine Seite, die nichts zeigt, ist von einer nicht zu unterscheiden,
> die noch nicht fertig ist.** Das ist der schlechteste der drei Zustände
> — und heute ist es der eingetretene.

⚠ **Und der Ersatztext wäre für sie sogar falsch:** sie spielen nicht
„ohne Meisterschaft" — sie haben einen Spielplan, wir bekommen ihn nur
nicht. Ihn hier zu zeigen hiesse, eine Lücke in unserer Kette als
Eigenschaft der Mannschaft auszugeben.

## Der Vorschlag: ein dritter Zustand, und er nennt den Grund

Nicht leer, nicht der bestehende Ersatztext, sondern ein eigener Satz mit
dem Verweis dorthin, wo die Daten stehen:

> **Spielplan beim Verband**
> Die Spiele dieser Mannschaft führt der Fussballverband Region Zürich.
> Über die Schnittstelle, aus der diese Seite ihre Daten bezieht, sind sie
> nicht abrufbar. → *Zum Spielplan beim FVRZ*

Drei Dinge, die alle stimmen: wo die Spiele sind, warum sie hier fehlen,
und wie man hinkommt.

### ⚠⚠ OFFEN, UND ES ENTSCHEIDET ALLES: haben die 13 eine `teamId`?

**Stand 10.09.2026 stehen zwei Angaben nebeneinander, die einander
ausschliessen** — beide aus demselben Gespräch:

| | |
|---|---|
| *„A-Junioren **51083**, Ea-Junioren **74531**"* | dann HABEN sie eine `teamId`, und der Link ist baubar |
| *„die 13 Mannschaften haben keine `teamId`, also keinen Link"* | dann gibt es keine Lösung, nur eine Beschreibung |

⚠ **Beides kann nicht stimmen.** Und der Unterschied ist nicht akademisch:
er entscheidet, ob dieser Abschnitt eine Anleitung ist oder ein Nachruf.

**Die Gegenprobe kostet zehn Sekunden** — im Browser, nicht über die API:

```
https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1&t=51083&a=trr
```

| Ergebnis | heisst |
|---|---|
| die **A-Junioren** mit Namen und Partien | `51083` ist eine gültige `teamId` → die 13 sind adressierbar, der Link ist baubar, **dieser Abschnitt gilt** |
| **„Team -"**, keine Partien | `51083` ist keine `teamId` → es gibt keinen Link, und der Abschnitt darunter ist gegenstandslos |

⚠ **Der Vergleichsfall ist schon gemessen:** `t=57755` zeigt „Team -" und
„Keine Partien gefunden" — so sieht eine ungültige Nummer aus. Und
`t=38309` zeigt die Ca-Junioren, `t=37931` den FC Küsnacht a: so sieht
eine gültige aus, auch über Vereinsgrenzen hinweg.

**Bis diese eine Zeile gemessen ist, bleibt der Rest dieses Abschnitts
ein Vorschlag unter Vorbehalt.**

### ⚠ Und der Link ist baubar — genau mit dem Feld, das fast gefallen wäre

```
https://matchcenter.fvrz.ch/default.aspx?v=1516&oid=11&lng=1&t=<sfv_id>&a=trr
```

Dafür braucht der `fch_team`-Beitrag eine **`sfv_id`** — die Nummer, die
Didi von der Verbandsseite ablesen kann (z. B. `51083`, `74531`).

**Das ist der Punkt, an dem sich die Entscheidung vom 09.09.2026 auszahlt,
`sfv_id` nicht zu sperren und `fvrz_link` nicht ersatzlos zu streichen:**
für diese 13 Mannschaften trägt die Nummer keine Daten, aber sie trägt den
Verweis. Ein Feld, das nur die Zuordnung bedient hätte, wäre hier nutzlos.

⚠ **Zu entscheiden bleibt**, ob die 13 überhaupt `spielplan_anzeigen = ja`
behalten sollen. Beide Wege sind vertretbar:

| | |
|---|---|
| Schalter **an**, neuer Abschnitt | die Seite sagt, dass es Spiele gibt und wo — ehrlich, aber sie sagt es auf jeder der 13 Seiten |
| Schalter **aus** | die Seite schweigt. Dann greift der bestehende Ersatztext — ⚠ und der ist für sie **falsch** |

**Empfehlung: Schalter an, neuer Abschnitt.** Der bestehende Ersatztext
darf für diese Mannschaften nicht erscheinen.

## Die Frage an den FVRZ

> Warum liefert `/api/team/list` nur Mannschaften mit
> Wettbewerbsteilnahme, während die Vereinsseite im Matchcenter alle
> führt — auch die Turnier- und Mini-Turnier-Mannschaften?
>
> Konkret: für ClubId 1516 und SeasonId 2027 gibt der Endpunkt 21
> Mannschaften zurück, die Vereinsseite zeigt 34. Die fehlenden sind die
> jüngsten Jahrgänge (Spieltyp 6 „Turnier" und 8 „Mini-Turniere"). Weder
> `MatchType` noch ein anderer der dokumentierten Parameter ändert das
> Ergebnis.
>
> **Gibt es einen Parameter, den die Swagger-Datei (Stand 28.08.2026)
> nicht nennt?** Und: ist es beabsichtigt, dass `/api/club/schedule` die
> Spiele dieser Mannschaften ebenfalls nicht enthält?

⚠ **Die zweite Frage gehört dazu**, weil sie die erste erst vollständig
macht: fehlten die Mannschaften nur in der Teamliste, wären ihre Spiele
über den Klub-Spielplan trotzdem zu haben. Nach unserer Messung sind sie
es nicht — und das ist die eigentliche Lücke.
