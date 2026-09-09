# Übergabe an den Website-Chat: die Ranglisten-Ablage

Stand 09.09.2026. **Alles hier ist gemessen**, nicht vorgeschlagen — die
Form stammt aus `themes/fch/inc/rangtabelle.php`, nicht umgekehrt.

## Der Optionsname

```
fch_cc_ranglisten
```

Geschrieben von `wp-export-empfaenger.php`, Route
`POST /clubcampus/v1/ranglisten`. **Nicht `autoload`** (`update_option( …,
false )`; die Spalte wird nach jedem Schreiben gelesen und nötigenfalls
berichtigt — siehe unten).

## Die Form

Eine Abbildung **`schluessel` → Gruppe**, keine Liste. Der Empfänger baut
sie über `$alle[ $id ] = $g`.

⚠⚠ **DER SCHLÜSSEL IST `schluessel`, NICHT `sfv_gruppe_id` — berichtigt am
09.09.2026 abends, nach einem Befund auf der Website.** Eine Gruppe ist
beim Verband **vierteilig**: Saison, Liga, Division, Gruppennummer. Die
Nummer allein ist nicht eindeutig — in der Datenbank steht dafür ein
sechsteiliger Unique-Schlüssel, und `sfv_gruppe_id` trägt obendrein
`DEFAULT 0`.

```
schluessel = "<saison>|<liga>|<division>|<gruppe>"    z. B. "2026|401|0|900123"
```

`sfv_gruppe_id` bleibt in der Gruppe stehen und ist weiterhin die **echte
Gruppennummer des Verbands** — sie taugt zur Anzeige und zum Verweis, nur
nicht als Schlüssel.

⚠ **Das Beispiel unten ist ERZEUGT, nicht getippt** — es läuft durch
dieselbe Funktion (`baueGruppen()` in `src/domains/spiele/wpRangliste.ts`),
die auch der scharfe Lauf benutzt. Ein von Hand geschriebenes Beispiel
könnte von dem abweichen, was tatsächlich ankommt, und genau das darf eine
Formatbeschreibung nicht.

**Zwei Gruppen, damit die Schlüsselung sichtbar ist**, und in jeder genau
eine eigene Zeile (`ist_wir: true`):

```json
{
  "2026|401|0|900123": {
    "schluessel": "2026|401|0|900123",
    "sfv_gruppe_id": 900123,
    "sfv_saison_id": 2026,
    "saison_name": "2025/2026",
    "sfv_liga_id": 401,
    "sfv_division_id": 0,
    "liga_name": "Junioren C 2. Stärkeklasse",
    "gruppe_name": "Gruppe 3",
    "stand_vom": "2026-09-09T18:00:00+02:00",
    "zeilen": [
      {
        "rang": 1,
        "team": "FC Küsnacht a",
        "spiele": 9,
        "siege": 7,
        "unentschieden": 1,
        "niederlagen": 1,
        "fair": 2,
        "tore_plus": 28,
        "tore_minus": 9,
        "punkte": 22,
        "ist_wir": false,
        "sfv_team_id": 37931
      },
      {
        "rang": 2,
        "team": "FC Herrliberg a",
        "spiele": 9,
        "siege": 5,
        "unentschieden": 2,
        "niederlagen": 2,
        "fair": 1,
        "tore_plus": 19,
        "tore_minus": 12,
        "punkte": 17,
        "ist_wir": true,
        "sfv_team_id": 38309
      },
      {
        "rang": 3,
        "team": "SC Zollikon b",
        "spiele": 9,
        "siege": 4,
        "unentschieden": 1,
        "niederlagen": 4,
        "fair": 4,
        "tore_plus": 15,
        "tore_minus": 18,
        "punkte": 13,
        "ist_wir": false,
        "sfv_team_id": 37940
      }
    ]
  },
  "2026|388|0|900456": {
    "schluessel": "2026|388|0|900456",
    "sfv_gruppe_id": 900456,
    "sfv_saison_id": 2026,
    "saison_name": "2025/2026",
    "sfv_liga_id": 388,
    "sfv_division_id": 0,
    "liga_name": "3. Liga",
    "gruppe_name": "Gruppe 1",
    "stand_vom": "2026-09-09T18:00:00+02:00",
    "zeilen": [
      {
        "rang": 4,
        "team": "FC Herrliberg 1",
        "spiele": 9,
        "siege": 3,
        "unentschieden": 2,
        "niederlagen": 3,
        "fair": 3,
        "tore_plus": 14,
        "tore_minus": 15,
        "punkte": 11,
        "ist_wir": true,
        "sfv_team_id": 38301
      }
    ]
  }
}
```

Gewicht dieses Beispiels: `{"gruppen":2,"zeilen":4,"bytes":1161,"groesste_gruppe":3}`

### Was daran wofür da ist

| Feld | |
|---|---|
| `schluessel` | **der Schlüssel der Ablage.** Vierteilig, siehe oben |
| `sfv_gruppe_id` | die echte Gruppennummer des Verbands — zur Anzeige, **nicht** als Schlüssel |
| `sfv_saison_id` · `sfv_liga_id` · `sfv_division_id` | Herkunft beim Verband. Die Vorlage braucht sie heute nicht; ohne sie wäre eine alte Gruppe später nicht von einer neuen zu unterscheiden |
| `liga_name` · `gruppe_name` | Klartext für Überschriften (`page-spiele.php` setzt heute `liga` vom Team davor) |
| `saison_name` | **neu am 10.09.2026** — „2026/2027", die Schreibweise des Verbands. Siehe den Abschnitt darunter |
| `stand_vom` | wann der Verband diesen Stand geliefert hat — **nicht**, wann der Export lief |
| `zeilen[]` | die Tabelle, nach `rang` sortiert |

## Die elf Schlüssel je Zeile — der Vertrag

Gemessen an `themes/fch/inc/rangtabelle.php` (Zeilen nach dem Umbau vom
09.09.2026):

| Schlüssel | Zeile | | Schlüssel | Zeile |
|---|---|---|---|---|
| `tore_plus` | 120 | | `siege` | 129 |
| `tore_minus` | 121 | | `unentschieden` | 130 |
| `ist_wir` | 124 | | `niederlagen` | 131 |
| `rang` | 126 | | `fair` | 132 |
| `team` | 127 | | `punkte` | 135 |
| `spiele` | 128 | | | |

⚠ **Keine Tordifferenz.** Zeile 122 rechnet `$diff = $tp - $tm;`. Eine
mitgelieferte wird ignoriert — belegt am 09.09.2026 mit `differenz: 99` in
der Nutzlast: die Seite zeigte `+23`. **Der Export schickt sie deshalb gar
nicht erst** (`wpRangliste.ts`, mit eigenem Testfall).

⚠ **`sfv_team_id` ist KEIN Anzeigefeld** und muss trotzdem in jeder Zeile
stehen: `fch_cc_rangliste_fuer_team()` sucht die Gruppe darüber
(`wp-export-empfaenger.php:1217`). Ohne sie liegt die Rangliste vollständig
in der Datenbank und die Seite bleibt leer — ohne Fehler.

⚠ **`sfv_team_id` (Nutzlast) ≠ `sfv_id` (Feld am Team-Beitrag).** Zwei
Namen, zwei Welten, dieselbe Zahl. Nicht angleichen.

## Was der Empfänger zurückgibt

```json
{
  "gruppen_geschrieben": 21,
  "gruppen_gesamt": 21,
  "bytes": 71204,
  "autoload": "off",
  "autoload_korrigiert": false
}
```

| Feld | |
|---|---|
| `gruppen_geschrieben` | was **dieser** Lauf gebracht hat |
| `gruppen_gesamt` | was **insgesamt** in der Ablage liegt |
| `bytes` | `LENGTH(option_value)` — die Ablage, nicht die Sendung |
| `autoload` | die Spalte, roh gelesen |
| `autoload_korrigiert` | `true`, wenn sie nicht auf `off` stand und gesetzt wurde |

⚠ **`gesamt > geschrieben` ist das Wachstum**, nach dem zu sehen ist: der
Empfänger ersetzt nur gelieferte Gruppen und **entfernt nie eine**. Nach
einem Saisonwechsel bleiben die alten liegen. Ob und wann sie fallen, ist
ein offener Entscheid — gemeldet wird es seit dem 09.09.2026.

## ⚠ Wer die Tabelle darstellt — das ist schon gebaut

**Damit die Ranglisten nicht in der Datenbank liegen bleiben, ist auf der
Website nichts mehr zu bauen.** Die Anzeige steht seit dem 09.09.2026 im
Theme (Commit `4493edc`) und liest bereits aus dieser Ablage:

```php
// themes/fch/inc/rangtabelle.php:67
fch_theme_rangzeilen( int $team_id ): array     // Ablage zuerst, Feld als Rückfall
```

Sie sucht die Gruppe über `fch_cc_rangliste_fuer_team( get_field( 'sfv_id', $team ) )`
und gibt deren `zeilen` an `fch_theme_rangtabelle()`. **Was fehlt, ist
nicht Code, sondern Inhalt:** die `sfv_id` an den Team-Beiträgen und ein
scharfer Lauf.

⚠ **Wofür der Website-Chat dieses Format trotzdem braucht:** für alles,
was daneben steht — den Prüfstand «Datenempfang», eine Anzeige des
Bestands, oder wenn die Tabelle einmal woanders erscheinen soll. Und damit
niemand die Schlüssel aus dem Quelltext rät.

## Was auf der Website daran hängt (bereits gebaut)

| | |
|---|---|
| `themes/fch/inc/rangtabelle.php:67` | `fch_theme_rangzeilen( int $team_id )` — Ablage zuerst, Feld `rangliste` als Rückfall, `function_exists()`-Wächter |
| `single-fch_team.php:584` · `page-spiele.php:375` | die zwei Lesestellen |
| Feld `rangliste` am Team | bleibt, ist der Rückfall; Hilfetext am 09.09.2026 berichtigt |

## ⚠ Was am 09.09.2026 abends schiefging — damit es drüben niemand nachbaut

Auf `/teams/fc-herrliberg-4/` standen **zwei Tabellen ineinander**: die
Ränge 1, 1, 2, 2, 3, 3 und zwei eigene Mannschaften hervorgehoben, die in
verschiedenen Gruppen spielen.

**Es lag nicht an der Anzeige.** `fch_theme_rangzeilen()` gibt genau ein
`zeilen`-Array weiter, und `rangtabelle.php` rendert genau das — eine
Vorlage kann zwei Gruppen gar nicht mischen. **Gemischt hat der Export**:
er fasste die Zeilen nach `sfv_gruppe_id` **allein** zusammen, und die ist
nicht eindeutig.

⚠ **Der zweite Teil desselben Fehlers hätte erst später wehgetan:** auch
der Empfänger schlüsselte auf `sfv_gruppe_id`. Wäre nur der Export
berichtigt worden, hätten die zwei nun getrennten Gruppen **dieselbe Zeile
der Ablage belegt** — die zweite überschriebe die erste, ohne Fehler und
ohne Meldung. Aus „zwei Tabellen ineinander" wäre „eine Mannschaft zeigt
die Tabelle einer anderen" geworden: leiser und schwerer zu finden.

**Beide Hälften sind berichtigt.** Der Empfänger nimmt `schluessel` und
fällt auf `sfv_gruppe_id` nur zurück, wenn eine ältere Gegenstelle ihn
nicht mitschickt — und **meldet das dann** unter `uebersprungen`.

## Grössen — gemessen, keine Grenze erfunden

| | |
|---|---|
| 21 Gruppen à 10 / 12 / 14 Teams | **61 / 72 / 83 KB** serialisiert (`php:8.2-cli`) |
| `option_value` | `longtext`, 4 GB |
| **`post_max_size` der Website** | **8 MB** — die einzige echte Wand, und die des Senders |
| `memory_limit` | 128 MB |

Bei 60–81 KB je Lauf sind das zwei Zehnerpotenzen Luft. **Es gibt keine
Schwelle im Code, weil es keine gemessene gibt** — stattdessen stehen
`bytes`, `gruppen`, `zeilen` und `alt` in jeder Antwort und in
`api_sync_log.details`.

---

# Nachtrag 10.09.2026: die Saison steht in der Gruppe

`saison_name` liegt ab sofort in **jeder** Gruppe der Ablage, neben
`liga_name` und `gruppe_name`. Wortlaut wie beim Verband: `"2026/2027"`.

**Warum dort und nicht am Team.** Sie ist für alle Mannschaften dieselbe.
An 21 Team-Beiträge geschrieben wäre sie 21-mal dieselbe Aussage — genau
das Muster, das drüben schon einmal verworfen wurde („ein Repeater hätte in
elf Teams elfmal dieselben sieben Zeilen gespeichert"). Sie kommt deshalb
aus **derselben Zeile** wie Liga und Gruppe.

**Zum Lesen** — dieselbe Gruppe, die die Seite ohnehin schon holt:

```php
$g = fch_theme_ranggruppe( $fch_id );           // steht bereits
$saison = $g['saison_name'] ?? '';              // „2026/2027"
```

⚠ **Nicht aus `sfv_saison_id` ausrechnen.** Aus `2027` liesse sich
„2026/2027" bilden — heute richtig und still falsch, sobald der Verband
anders benennt. Die Schreibweise gehört ihm; wir schreiben sie ab.

⚠ **Und `saison_name` kann leer sein.** Zeilen aus Läufen vor dem
10.09.2026 kennen die Spalte nicht. Leer heisst „noch kein Lauf mit dieser
Angabe" — dann bleibt der bestehende, von Hand gepflegte Wert stehen.

## Was heute auf der Teamseite steht — gemessen, nicht vermutet

| | |
|---|---|
| Anzeige | `2026/27` |
| Quelle | Postmeta `saison` am `fch_team`-Beitrag |
| ⚠ Feldgruppe dazu | **keine** — das Feld existiert in ACF nur am `fch_person` |
| geschrieben von | `saeen.php:1998` und `:2049`, für **zwei** Mannschaften |

**Es ist also kein gepflegtes Feld, sondern ein Rest der Saat.** Im Backend
ist es unsichtbar; wer es ändern will, findet keine Maske dafür. Die
anderen 19 Teams haben den Wert gar nicht — was dort steht, kommt aus einem
Rückfall in der Vorlage.

⚠ **Das ist die umgekehrte Richtung des bekannten Fehlers.** Sonst gilt:
ein Feld wird angelegt und von niemandem gelesen. Hier steht ein **Wert
ohne Feld** — er wird gelesen, aber niemand kann ihn pflegen. Beide Male
schlägt nichts fehl, und beide Male sieht die Anzeige richtig aus.
