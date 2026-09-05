# `wordpress/` — der Empfänger auf WordPress-Seite

Gehört zu `docs/plan_wordpress_spieldaten.md` (Etappe 3) und
`docs/anleitung_wordpress_etappe3.md`.

## Was hier liegt

| | |
|---|---|
| `clubcampus-export.php` | mu-plugin für `dev.fcherrliberg.ch`: nimmt Spielplan, Verlauf und Ranglisten entgegen |

## Einbauen

```
wp-content/mu-plugins/clubcampus-export.php     (neben fch-core.php)
```

Als **mu-plugin**, nicht als gewöhnliches Plugin: mu-plugins lassen sich im
Backend nicht abschalten. Eines, das jemand versehentlich deaktiviert, nimmt
die Route mit — der Abgleich bekäme 404 statt einer Antwort, während die
Website unverändert aussieht.

Danach einmal prüfen:

```bash
curl -s -u "clubcampus-export" https://dev.fcherrliberg.ch/wp-json/clubcampus/v1/status
```

Erwartet: `{"bereit":true,…}`. Steht dort `bereit:false`, nennt `fehlt`
den Grund — fehlendes ACF, fehlendes fch-core, fehlender Beitragstyp.
**Der Aufruf ist der Ersatz für einen Verbindungstest, den es sonst nicht
gäbe:** ein 200 auf `/wp-json/` sagt nichts darüber, ob ACF geladen ist.

## ⚠ Zwei Repositories, ein Inhalt — das ist noch nicht entschieden

Die Datei **liegt** hier (ClubCampus) und **läuft** in `fch-theme`. Solange
sie an beiden Orten steht, können die Fassungen auseinanderlaufen, und
niemand merkt es: WordPress meldet keinen Versionsunterschied, und
`php -l` prüft die Kopie, nicht das Original.

**Vor dem ersten scharfen Lauf festlegen, welches Repository sie besitzt.**
Zwei vertretbare Antworten:

| Besitzer | dafür |
|---|---|
| **ClubCampus** (hier) | sie ist die Gegenseite des Exports und ändert sich mit ihm; `npm run check:php` läuft in dieser Prüfkette |
| **fch-theme** | dort liegt aller WordPress-Code, und von dort wird deployt |

Im jeweils anderen Repository bleibt ein Verweis statt einer Kopie.

## Was geprüft ist — und was nicht

```bash
npm run check:php     # php -l, sonst über Docker
```

| | |
|---|---|
| findet | Syntaxfehler — fehlende Klammer, Semikolon, Tippfehler |
| findet **nicht** | ob eine WordPress-Funktion existiert · ob ein Hook zur richtigen Zeit feuert · ob ein ACF-Feldname stimmt · ob die Logik richtig ist |

⚠ **Ein grüner Lauf heisst „es parst", nicht „es funktioniert".** Der
Mensch aus Plan §12 bleibt zuständig; ihm ist eine Fehlerklasse abgenommen,
nicht die Verantwortung.

## Die drei Regeln, die man später nicht mehr sieht

1. **`update_field()` statt `update_post_meta()`.** ACF legt je
   Repeaterzeile Wert *und* Feldschlüssel ab; über Postmeta ist das nicht
   verlässlich zu schreiben. Das Theme liest 416× mit `get_field()` gegen
   44× `get_post_meta()`.

2. **Eigene Route statt Kern-REST.** `fch_spiel` steht auf
   `show_in_rest => false` — eine begründete Entscheidung des Themes, keine
   Lücke. Eine eigene Route hängt nicht daran.

3. **Der Titel wird von `fch_core_spiel_titel()` abgeleitet, angestossen
   von uns.** Die Ableitung hängt an `acf/save_post`, und `update_field()`
   löst den Haken nicht aus. Ohne den Anstoss hätte jedes neue Spiel einen
   leeren Titel.

## ⚠ Und die eine Regel, die niemand wegoptimieren darf

**Ein `fch_spiel`-Beitrag ohne `sfv_match_id` wird nie angefasst.** Nicht
aktualisiert, nicht zurückgezogen, nicht gezählt. Das sind die von Hand
angelegten Freundschaftsspiele und Turniere — sie gehören der Redaktion.

Die Prüfung steht in `cc_abgleich_kandidaten()` und ist die **erste**
Bedingung, nicht die letzte. Ein Abgleich, der „aufräumt", räumt genau
diese Beiträge ab, und niemand meldet es.
