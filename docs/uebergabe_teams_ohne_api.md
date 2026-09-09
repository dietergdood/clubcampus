# Übergabe: 8 Mannschaften ohne Spielplan aus der API

Stand 10.09.2026, abgeschlossen. **Es ist nichts mehr zu holen** — und der
Grund ist ein anderer als „die Schnittstelle filtert".

## Der Befund

> `/api/team/list` kennt Mannschaften, die in einem Wettbewerb **mit
> Rangliste** stehen. Die acht jüngsten spielen **ohne Tabelle** — dort
> gibt es keine `teamId` und folglich keinen abrufbaren Spielplan.

**Die Verbandsseite und die Schnittstelle zeigen nicht dieselbe Datenlage.**
Das ist kein Fehler auf einer der beiden Seiten und keine Lücke, die sich
mit einem Parameter schliessen liesse.

| gemessen | |
|---|---|
| Vereinsseite FVRZ | **34** Mannschaften, alle mit Spielplan |
| `/api/team/list` | **21**, Saison 2027 |
| davon wirklich fehlend | **8** |
| Swagger | 15 Pfade, ein einziger Spielplan-Endpunkt, kein Parameter, der mehr bringt |

### ⚠ Warum es nach 13 aussah — und warum das hierhergehört

**„Junioren D (Futsal) a" und „Dd-Junioren" sind dieselbe Mannschaft.**
Verbandsseite und ClubCampus benennen sie verschieden. Wer die Listen über
die **Namen** vergleicht, findet **13 fehlende statt 8** — fünf davon sind
Schreibweisen.

> Ein Vergleich über den Namen prüft eine Schreibweise. Über die `teamId`
> prüft er die Sache.

**Das gilt auch drüben:** wer auf der Website eine Mannschaft der einen
Liste der anderen zuordnet, tut das über die Nummer, nicht über den Namen.

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

### ✅ Geklärt: die 8 haben keine `teamId`

Die zwei Nummern, die zwischenzeitlich als Beleg galten (`51083`, `74531`),
stehen in der Liste der 34 **nicht** — sie waren verwechselt. Die
Ea-Junioren sind `38313`, „A-Junioren" führt der Verband gar nicht.

**Für die acht ohne Tabelle gibt es keine Nummer** — also auch keinen
FVRZ-Link. Der Abschnitt darunter gilt nur für Mannschaften, die eine
`teamId` haben und deren Spiele trotzdem nicht ankommen; nach heutigem
Stand ist das keine.

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

---

# Nachtrag 10.09.2026: drei Hinweistexte im Theme sind überholt

**Der Export schreibt seit `0.4.1` Teamfelder** — die eine ausdrücklich
beschlossene Ausnahme. Drei Sätze im Theme sagen weiterhin das Gegenteil,
und sie sind die Sorte Text, die am längsten überlebt: sie klingen nach
Sorgfalt und wurden aus einer echten Messung geboren.

| Datei | Wortlaut heute | |
|---|---|---|
| `Fields/team.php:988` | *„Heute füllt dieses Feld niemand — kein Abgleich schreibt Teamfelder."* | ⚠ `abgleich_stand` wird jetzt bei **jedem** Lauf geschrieben |
| `Fields/team.php` (`liga`, `gruppe`) | „Kommt aus der Rangliste des Verbands, sobald eine vorliegt … hier von Hand." | teils überholt: der Abgleich schreibt sie jetzt selbst |
| `Masken/team.php` (~1428) | *„Dieses Team hat keinen Abgleich — die Werte werden von Hand gepflegt und sind darum offen."* | ⚠ erscheint bei einem Team, dessen Quelle auf ClubCampus steht |

⚠ **Der dritte ist kein Textproblem, sondern eine Bedingung.** Er hängt an
`abgleich_quelle`: steht dort ein Wert, der nicht in der Namensliste der
Maske steht, fällt die Anzeige in den „kein Abgleich"-Zweig. Zu prüfen ist
also nicht der Satz, sondern welchen Wert das Team führt und ob die Liste
ihn kennt.

**Was jetzt gilt und in die Texte gehört:**

> `liga` und `gruppe` kommen vom Abgleich, aus der Rangliste des Verbands.
> `abgleich_stand` sagt, wann er zuletzt **da war** — nicht, wann sich
> zuletzt etwas geändert hat. Bleibt er leer, ist noch kein Lauf
> angekommen.

⚠ **Und die Unterscheidung im letzten Satz ist Absicht** (Didi,
10.09.2026): *„Ich will wissen, wann der Abgleich zuletzt da war, nicht
wann sich zufällig etwas geändert hat."* Ein Lebenszeichen darf nicht
verstummen, weil nichts passiert. Ob dieser Lauf etwas bewegt hat, steht
in der Antwort als `teamfelder: {geschrieben, unveraendert}`.
