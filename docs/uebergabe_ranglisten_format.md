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

Eine Abbildung `sfv_gruppe_id → Gruppe`, **nicht eine Liste**. Der Schlüssel
ist die Gruppennummer als Zeichenkette:

```json
{
  "900123": {
    "sfv_gruppe_id": 900123,
    "sfv_saison_id": 2026,
    "sfv_liga_id": 401,
    "sfv_division_id": 0,
    "liga_name": "Junioren C 2. Stärkeklasse",
    "gruppe_name": "Gruppe 3",
    "stand_vom": "2026-09-09T18:00:00+02:00",
    "zeilen": [
      {
        "rang": 1, "team": "FC Küsnacht a", "spiele": 9,
        "siege": 7, "unentschieden": 1, "niederlagen": 1,
        "fair": 2, "tore_plus": 28, "tore_minus": 9, "punkte": 22,
        "ist_wir": false, "sfv_team_id": 37931
      }
    ]
  }
}
```

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

## Was auf der Website daran hängt (bereits gebaut)

| | |
|---|---|
| `themes/fch/inc/rangtabelle.php:67` | `fch_theme_rangzeilen( int $team_id )` — Ablage zuerst, Feld `rangliste` als Rückfall, `function_exists()`-Wächter |
| `single-fch_team.php:584` · `page-spiele.php:375` | die zwei Lesestellen |
| Feld `rangliste` am Team | bleibt, ist der Rückfall; Hilfetext am 09.09.2026 berichtigt |

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
