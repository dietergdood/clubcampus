# Vorschlag — den WordPress-Export überwachen

Stand 10.09.2026. **Vorschlag, nicht gebaut.**

---

## 1 · Der Ist-Zustand, gemessen

| | |
|---|---|
| `api_verbindungen` Zeile `wordpress` | `active = false`, `auto_sync = false` |
| `supabase/cron_wp_export.sql` | **existiert nicht** |
| letzter Lauf | von Hand |

**Der Export läuft nicht automatisch, und niemand merkt es, wenn er
wochenlang nicht läuft.** Die Zeile trägt es sogar selbst: *„NICHT
UEBERWACHT: der Waechter verlangt active UND auto_sync, beide stehen auf
false."*

⚠ **Das ist genau der Fall, vor dem `CLAUDE.md` warnt** — dort steht seit
dem 05.09.2026: *jede neue Zeile in `api_verbindungen` gehört mit
`active = true` und `auto_sync = true` angelegt, sonst ist sie
unüberwacht, ohne dass etwas fehlschlägt.* Der Satz wurde beim Anlegen
dieser Zeile geschrieben und nicht befolgt.

---

## 2 · ⚠ Was der Wächter verlangt — und warum die zwei Flags NICHT genügen

`cron_sync_waechter.sql`, Zeile 165 und 170:

```sql
where v.active is true and v.auto_sync is true
...
elsif r.minuten > 120 then
  v_grund := 'Der letzte Lauf ist … Stunden her — erwartet wird stuendlich.';
```

**Die Erwartung „stündlich" steht fest im Wächter.** Sie ist nicht pro
Anschluss einstellbar.

> **Wer heute nur die zwei Flags umlegt, bekommt ab der dritten Stunde
> alle zwei Stunden eine Warnung** — für einen Export, der gar nicht
> stündlich laufen soll. **Und ein Melder, der immer dasselbe sagt, wird
> nach dem dritten Mal nicht mehr gelesen.** Dieselbe Abstumpfung wie bei
> den 789 Lint-Warnungen und beim dauerhaft roten Test.

**Die Flags sind also die Voraussetzung, nicht die Lösung.**

---

## 3 · ⚠ Die richtige Frage ist nicht „wann lief er zuletzt?"

Du hast es selbst gesagt: *er soll laufen, wenn sich etwas geändert hat.*
Daraus folgt eine andere Wächter-Regel, und sie ist die eigentliche
Einsicht dieses Papiers:

| Wächter fragt | taugt für |
|---|---|
| „wann lief er zuletzt?" | einen Anschluss mit **festem Takt** — der SFV-Sync |
| **„wartet etwas?"** | einen Anschluss, der **auf Änderungen** läuft — der Export |

**Läuft der Export drei Tage nicht, weil sich drei Tage nichts geändert
hat, ist das richtig und keine Meldung wert.** Läuft er eine Stunde
nicht, obwohl seit gestern 40 Spiele geändert wurden, ist das ein
Ausfall — auch wenn der letzte Lauf erst eine Stunde her ist.

**Messbar, ohne neue Spalte:**

```sql
select count(*) as wartet
  from public.spiele s
  join public.api_verbindungen v
    on v.verein_id = s.verein_id and v.key = 'wordpress'
 where s.zuletzt_synchronisiert > coalesce(v.letzter_sync, 'epoch');
```

⚠ **Und diese Zahl ist zugleich der Auslöser und der Wächter** — dieselbe
Abfrage beantwortet „soll er laufen?" und „hätte er laufen müssen?".
Zwei Fragen, eine Quelle: genau die Bauart, die dieses Projekt an einem
Dutzend Stellen als richtig führt.

---

## 4 · Der Vorschlag, in drei Teilen

### (a) Auslöser: nach dem Sync, wenn er etwas geändert hat

Der SFV-Sync weiss am Ende seines Laufs, ob er etwas geschrieben hat —
`erg.spiele.neu`, `.aktualisiert`, die Matchdaten-Zähler. **Er ist die
einzige Stelle, an der eine Änderung entsteht.**

```
Sync-Lauf endet mit Änderungen  →  Export anstossen
Sync-Lauf ohne Änderungen       →  nichts
```

⚠ **Nicht aus dem Sync heraus aufrufen.** Ein Export, der im Sync-Lauf
hängt, macht aus zwei Ausfällen einen: scheitert WordPress, sähe es aus
wie ein Sync-Fehler. **Getrennte Läufe, verbunden über die Datenbank** —
der Sync setzt eine Marke, ein eigener Zeitplan holt sie ab.

### (b) Zeitplan: ja, aber als Abholer, nicht als Takt

**Ein Zeitplan ist sinnvoll — nicht damit er läuft, sondern damit er
nachsieht.** Vorschlag: **alle 15 Minuten**, und er tut nichts, wenn
nichts wartet.

| | |
|---|---|
| billig | eine Abfrage je Viertelstunde |
| erklärt sich selbst | „er läuft, wenn etwas wartet" ist eine Regel, die man aufschreiben kann |
| ⚠ **nicht stündlich fest** | dann wäre es wieder ein Takt, und die Frage „warum lief er ohne Grund?" käme zurück |

⚠ **Und er darf nicht öfter laufen als der Sync**, sonst schickt er
dieselbe Änderung mehrfach an WordPress. Der Sync läuft stündlich; ein
Viertelstundentakt bedeutet also **höchstens ein echter Export je
Stunde**, der Rest sind Leerläufe von einer Abfrage.

### (c) Wächter: die Regel pro Anschluss

Zwei Wege, und der zweite ist der bessere:

| | |
|---|---|
| **A** — eine Spalte `erwartet_minuten` | der Wächter liest sie statt der festen 120. Klein, aber es bleibt „wann lief er zuletzt?" |
| **B** — eine Spalte `wartet_seit` | der Export setzt sie, wenn etwas wartet, und löscht sie beim Lauf. Der Wächter meldet, wenn sie älter als eine Stunde ist |

**Empfehlung: B.** Sie beantwortet die richtige Frage, und sie meldet
**genau dann**, wenn ein Ausfall wehtut: es wartet etwas, und niemand
holt es ab.

⚠ **Bei A bliebe der Fall unentdeckt, der am meisten kostet:** der
Export läuft brav alle 15 Minuten, findet aber wegen eines Fehlers nie
etwas — der Wächter sähe einen frischen `letzter_sync` und schwiege.
**Ein Zeitstempel sagt, dass etwas lief. Nicht, dass es etwas
ausgerichtet hat.** Dasselbe wie `job_run_details.status = 'succeeded'`,
das nur „abgesetzt" heisst.

---

## 5 · Reihenfolge

| | | wer |
|---|---|---|
| 1 | `wartet_seit` anlegen, `active`/`auto_sync` auf true | Migration, du |
| 2 | Wächter: für `wordpress` gegen `wartet_seit` prüfen statt gegen 120 Minuten | hier |
| 3 | `cron_wp_export.sql` — alle 15 Minuten, tut nichts ohne Wartendes | hier |
| 4 | Sync setzt `wartet_seit`, wenn er etwas geändert hat | hier |

⚠ **Schritt 1 und 2 zusammen, nie 1 allein.** Sonst warnt der Wächter ab
der dritten Stunde alle zwei Stunden über einen Export, der genau das tut,
was er soll — und die Warnung wird abgeschaltet statt gelesen.

⚠ **Und `cron.schedule` prüft den Befehl nicht** (CLAUDE.md): der
gespeicherte Befehl gehört einmal in einer zurückgerollten Transaktion
ausgeführt, bevor man ihm glaubt. Am 21.08.2026 zweimal hintereinander
danebengegangen, beide Male mit der Meldung „Wächter steht".
