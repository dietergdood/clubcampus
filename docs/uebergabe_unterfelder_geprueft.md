# Wo `unterfelder_geprueft` steht — und wo Didi hinsehen muss

Gemessen am 24.09.2026 gegen `wordpress/wp-export-empfaenger.php`,
`supabase/functions/wp-export/index.ts`, `src/domains/spiele/wpLauf.ts`,
`src/domains/spiele/wpExportService.ts` und `src/modules/portal/ApiTab.tsx`.
Kein Aufruf, kein Lauf, nichts geschrieben — nur Quelltext.

---

## ⚠⚠ DIE ANTWORT VORWEG: ES KOMMT NICHT IN DIE KACHEL

`unterfelder_geprueft` **steht in der Antwort der Edge Function** und
erreicht **keine einzige Zeile der Portalverwaltung.** Es fällt an zwei
Gliedern weg, unabhängig voneinander.

| Glied | trägt `unterfelder_geprueft`? |
|---|---|
| Empfänger `/clubcampus/v1/spiele`, **oberste Ebene** der Antwort | ✅ ja |
| `sendeTeil()` → `ergebnisse[].wp` (`wp-export/index.ts:794`) | ✅ vollständig, unverändert |
| **Rückgabe der Function** → `je_team[i].wordpress` (`index.ts:941`) | ✅ **vollständig** |
| `fuersProtokoll()` → `api_sync_log.details.je_team` (`wpLauf.ts:365`) | ❌ Allowlist: nur `neu`, `aktualisiert`, `zurueckgezogen`, `aufstellung_zeilen`, `gescheitert` |
| `fasseLauf()` → `zahlen` (`wpLauf.ts:194`) | ❌ eingesammelt werden nur `unbeachtete_felder`, `ohne_feldschluessel`, `feld_mehrdeutig` |
| `fasseExportZusammen()` → der Text der Kachel (`wpExportService.ts:79`) | ❌ Allowlist, ausdrücklich kein roher Abzug |
| **aufklappbare Rohantwort der Kachel** | ❌ sie hängt an `auskunft.roh` — das sind die *Proben*. Der Export setzt `setErgebnis({ok, text})` (`ApiTab.tsx:604`), und `ergebnis` hat **kein** `roh`-Feld |

⚠ **Der zweite Weg ist ebenso zu.** `/status` liefert seit 0.9.17 ein
eigenes `unterfelder` (`acf_kennt` · `wir_schicken` · `faellt_weg` ·
`bleibt_leer`, je Repeater), und `wp-export` reicht es durch
(`index.ts:1842`). **`deuteEmpfaenger()` in `ApiTab.tsx:270–388` nennt es
nirgends — null Fundstellen —, und der Empfänger-Knopf reicht als einziger
Knopf keine Rohantwort durch.** Berechnet, geliefert, nicht gezeigt — in der
Liste der Melder selbst.

### Wo Didi es also sieht

**In den Entwicklerwerkzeugen des Browsers, an dem Lauf, den er ohnehin
auslöst.** Netzwerk-Reiter, der `POST` auf
`…/functions/v1/wp-export`, Antwort:

```
je_team[0].wordpress.unterfelder_geprueft.verlauf
je_team[0].wordpress.unterfelder_geprueft.aufstellung
```

⚠ **Je Mannschaft ein Eintrag** — `sendeTeil()` schickt eine Anfrage pro
Mannschaft, und der Empfänger setzt seine Zähler pro Anfrage zurück
(`cc_route_spiele`, Zeile 2668–2671). `je_team` hat also einen Eintrag pro
gesendeter Mannschaft, mit je eigenen Zahlen. Wer nur `[0]` liest, liest
eine Mannschaft.

⚠ **Und innerhalb einer Mannschaft gewinnt das LETZTE Spiel.**
`$GLOBALS['cc_unterfelder_geprueft'][$repeater] = …` wird bei jedem Spiel
überschrieben, nicht vereinigt. Die drei Zahlen beschreiben das letzte
verarbeitete Spiel dieser Mannschaft.

Der Konsolenhelfer aus `docs/plan_wordpress_spieldaten.md` §2704 zeigt
dasselbe — **löst aber einen zweiten scharfen Lauf aus.** Der
Netzwerk-Reiter kostet nichts.

---

## Die Form: `gesendet:erlaubt:acf`

Gemessen an `cc_pruefe_unterfelder()`, Zeile 2028 — die drei Zahlen in
dieser Reihenfolge:

| Stelle | was gezählt wird |
|---|---|
| **1 · gesendet** | die Pfade in der **rohen** Nutzlast dieses Repeaters — `cc_nutzlast_pfade()`, rekursiv, Vereinigung über alle Zeilen des Spiels. Nicht die gesäuberten: eine Prüfung hinter dem Filter, den sie prüfen soll, kann nur „in Ordnung" sagen |
| **2 · erlaubt** | die Konstante des Empfängers — `CC_VERLAUF_FELDER` bzw. `cc_erlaubt_aufstellung()` |
| **3 · acf** | die Unterfeldpfade der ACF-Feldgruppe dieses Repeaters. **`?` heisst: ACF war nicht zu befragen** — dann nennt `unterfelder_unbekannt` den Repeater |

### Welche Repeater darin vorkommen — genau zwei

`cc_pruefe_unterfelder()` wird an zwei Stellen gerufen: `aufstellung`
(Zeile 1775) und `verlauf` (Zeile 2055).

⚠ **`marken` hat KEINEN eigenen Eintrag und soll keinen haben.** Es ist
der verschachtelte Repeater innerhalb der Aufstellung und steckt dort als
Pfad: `cc_erlaubt_aufstellung()` hängt `marken.art` und `marken.minute` an
die elf Namen (Zeile 1950), und `cc_nutzlast_pfade()` steigt selbst hinab.
**Wer unter `unterfelder_geprueft["marken"]` nachsieht, findet nichts —
das ist richtig, nicht kaputt.**

---

## Die Sollwerte

### `verlauf` — unsere Zahl ist **12**, und sie stimmt mit seiner überein

Gezählt in `src/domains/spiele/wpNutzlast.ts`, `WpVerlaufZeile` und
`bildeVerlauf()`:

```
minute · art · seite · text · stand · klub · sfv_person_id · nummer
ereignis_zusatz · ohne_person · rolle · ein_nummer            = 12
```

Alle zwölf werden **immer** gesetzt — `null` und `""` sind Werte, keine
fehlenden Schlüssel, und `cc_nutzlast_pfade()` zählt Schlüssel.
**`gesendet` ist damit 12, unabhängig vom Inhalt.**

| erwartet | wenn drüben |
|---|---|
| **`12:12:12`** | 0.9.37 läuft (er hat `rolle` als `f_s_v_rolle` ergänzt, `CC_VERLAUF_FELDER` auf 12) |

### `aufstellung` — **13**, mit einer Ausnahme, die kein Defekt ist

`WpAufstellungZeile` hat 11 Felder (`seite`, `sfv_person_id`, `nummer`,
`spieler`, `position`, `rolle`, `ist_captain`, `von_minute`, `bis_minute`,
`spielzeit`, `marken`), `WpAufstellungMarke` zwei (`art`, `minute`).
`cc_erlaubt_aufstellung()` ergibt 11 + 2 = **13**.

| erwartet | heisst |
|---|---|
| **`13:13:13`** | im letzten Spiel dieser Mannschaft trug mindestens eine Zeile eine Karte |
| **`11:13:13`** | ⚠ **kein Defekt** — `marken: []` bei jeder Zeile. `cc_ist_zeilenliste()` weist eine leere Liste ab (Zeile 1876), also entstehen die zwei Unterpfade nicht. Ein Spiel ohne Karten sieht so aus |

### `marken`

**Kein Eintrag.** Siehe oben.

---

## Was eine kleinere Zahl heisst — je Richtung

| Muster | heisst | die Namen stehen in |
|---|---|---|
| **gesendet > erlaubt** | wir schicken einen Namen, den der Empfänger **nicht kopiert**. Er fällt schon an seiner Allowlist heraus; ACF sieht ihn nie | `unbeachtete_unterfelder` |
| **erlaubt > acf** | der Empfänger kopiert einen Namen, den der **Zielrepeater nicht kennt**. `update_field()` verwirft ihn wortlos — der Fall `ein_nummer`, der zwei Wochen gekostet hat | `unterfelder_ohne_acf` |
| **acf > erlaubt** | ACF führt ein Unterfeld, das wir nie füllen. Kein Fehler, aber ein leeres Feld auf der Seite | keine Liste; `/status` nennt es als `bleibt_leer` |
| **gesendet < erlaubt** | bei `aufstellung`: keine Karten (siehe oben). Bei `verlauf`: nur `0:12:12`, wenn der Verlauf des letzten Spiels **leer** war | keine Liste — es ist kein Befund |
| **`?` an dritter Stelle** | ACF war nicht zu befragen. `array_diff` gegen eine leere Liste hätte **alle** Namen als unbekannt gemeldet; darum `null` statt einer leeren Liste | `unterfelder_unbekannt` |

### ⚠ Die zwei Melder messen in ENTGEGENGESETZTE Richtungen

Sie hiessen bis 0.9.15 fast gleich, und die Umbenennung war der Preis für
die Reparatur:

| Feld | Richtung |
|---|---|
| **`unbeachtete_unterfelder`** | **Nutzlast → Konstante.** Wir schicken, *er* kopiert nicht. Dasselbe wie `unbeachtete_felder` eine Ebene darüber |
| **`unterfelder_ohne_acf`** | **Konstante → ACF.** *Er* kopiert, ACF kennt nicht |

Beide sind Listen im Format `repeater.name`, beide erscheinen nur, wenn sie
nicht leer sind. Sie stehen — wie `unterfelder_geprueft` — auf der obersten
Ebene der `/spiele`-Antwort, also unter
`je_team[i].wordpress.unbeachtete_unterfelder`.

---

## ⚠ Wenn `unterfelder_geprueft` ganz FEHLT

Drei Lagen, und nur die erste ist ein Befund:

| Lage | woran zu erkennen |
|---|---|
| **der Schlüssel fehlt ganz** | drüben läuft eine Fassung **vor 0.9.16**, oder der Melder ist nicht gelaufen. ⚠ Die Fassung steht **nicht** in dieser Antwort — siehe unten |
| **`verlauf` fehlt, `aufstellung` steht da** | `cc_schreibe_verlauf()` bricht vor dem Melder ab, wenn `cc_feld_schluessel()` `null` liefert (Zeile 2049). Dann steht der Repeater in `ohne_feldschluessel` |
| **`aufstellung` fehlt, `verlauf` steht da** | ⚠ **normal.** Seit Weg B schicken wir das Feld `aufstellung` nur mit Zeilen; keines der Spiele dieser Mannschaft hatte Matchdaten. Der Zähler `gesendete_spiele_ohne_aufstellung` nennt die Zahl |

---

## ⚠ Unsere Fassung im Repository weicht ab

| | |
|---|---|
| `wordpress/wp-export-empfaenger.php` hier | **0.9.26** (13.09.2026), Kopf und `CC_VERSION` stimmen überein |
| `CC_VERLAUF_FELDER` hier | **11** Namen — **ohne `rolle`** |
| der Theme-Chat sagt | **0.9.37**, `rolle` ergänzt, 12 Namen |

**Seine Angabe gilt, nicht unser Stand.**

### ⚠⚠ Und die Fassung steht NICHT in der `/spiele`-Antwort

Gemessen: `empfaenger` und `version` kommen in unserer Fassung an genau
**zwei** Stellen vor — `cc_route_status()` (Zeile 1209/1210) und
`cc_route_bestand()` (Zeile 2533/2535). **`/spiele` und `/ranglisten`
tragen keine von beiden.**

⚠ **Damit ist `CLAUDE.md` an dieser Stelle zu weit gefasst.** Dort steht,
seit 0.9.19 trügen *alle* Routen `empfaenger` und `version`; für 0.9.26
gilt das für zwei von vier. Ob 0.9.37 es nachgezogen hat, ist von hier aus
nicht messbar.

**Die Fassung kommt deshalb über den Knopf „Empfänger"** — er ruft
`/status`, und `deuteEmpfaenger()` nennt Dateiname und Fassung. Sie gehört
**vor** den Lauf: ohne sie ist eine fehlende Zahl nicht von einer alten
Fassung zu unterscheiden.

⚠ **Und damit gibt es eine Gegenprobe, die keine Fassungsnummer braucht:**
liefe drüben noch 0.9.26, stünde `12:11:11` da **und** `verlauf.rolle` in
`unbeachtete_unterfelder`. Steht der Name dort, führt der Empfänger `rolle`
nicht — gleich welche Fassung er nennt.

---

## Was zu tun ist, wenn der Wert nicht dasteht

**Fall A — er steht in der Antwort, aber nicht in der Kachel.**
Das ist der Normalzustand, gemessen. Nichts ist kaputt; die Durchreiche
fehlt. Zwei Stellen wären dafür anzufassen, und beide liegen bei uns:

- `fasseLauf()` in `wpLauf.ts` sammelt `unterfelder_geprueft`,
  `unbeachtete_unterfelder` und `unterfelder_ohne_acf` je Mannschaft ein
  (wie heute `unbeachtete_felder`, Zeile 194),
- `fasseExportZusammen()` in `wpExportService.ts` nennt sie — die Zahlen
  **immer**, die zwei Listen nur, wenn sie nicht leer sind.

⚠ **Kein rohes `JSON.stringify` der Antwort.** `je_team[].wordpress` trägt
bei Dubletten den abgeleiteten Beitragstitel, und am 21.08.2026 sind so 903
Klarnamen ins Protokoll geraten. Auf einem Schirm wäre es dieselbe
Preisgabe.

Ebenso fehlt es in `api_sync_log.details` — `fuersProtokoll()` führt je
Mannschaft eine eigene Allowlist (`wpLauf.ts:365`).

**Fall B — er fehlt in der Antwort des Empfängers.**
Dann ist die Fassung drüben zu klären, nicht unsere Seite. Die Reihenfolge:
**zuerst** den Knopf „Empfänger" drücken (er nennt Dateiname und Fassung
aus `/status`), **dann** den Lauf. Steht dort etwas vor 0.9.16, kennt der
Empfänger den Melder nicht. Steht dort 0.9.37 und der Schlüssel fehlt
trotzdem, ist es ein Befund für den Theme-Chat — dann prüft der Melder
etwas und meldet es nicht.

⚠ Umgekehrt geht es nicht: die `/spiele`-Antwort nennt ihre eigene
Fassung nicht, und nach dem Lauf ist sie nicht mehr zuzuordnen.

⚠ **Die zwei Fälle sehen gleich aus, solange man nur in die Kachel sieht.**
Genau deshalb steht der Pfad oben und nicht die Deutung.

---

## Was ich nicht messen konnte

- **Ob drüben tatsächlich 0.9.37 läuft.** Das sagt nur ein Aufruf, und ein
  `POST` war ausgeschlossen. Unser Repository trägt 0.9.26.
- **Ob `f_s_v_rolle` in der ACF-Feldgruppe steht.** Das ist die dritte Zahl,
  und sie entsteht erst beim Lauf (`cc_unterfelder()` liest ACF drüben).
- **Die Zahlen eines echten Laufs.** Alle Sollwerte oben sind aus den
  Feldlisten gezählt, nicht aus einer Antwort abgelesen.
