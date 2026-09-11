# Vorschlag — die 81 Lesestellen sichtbar halten

Stand 11.09.2026. **Vorschlag, nicht gebaut.**

---

## 1 · Die Frage ist nicht „liest es ungepagt?"

**81 Lesestellen über 24 Tabellen** lesen ohne `range`, `limit`, `single`,
`maybeSingle` oder `head: true`. **Das sind keine 81 Defekte** —
`api_verbindungen` hat eine Handvoll Zeilen und wird nie wachsen.

> **Die Frage lautet: wächst diese Tabelle auf tausend zu?**

⚠ Und sie ist **nicht statisch beantwortbar**: sie hängt am Bestand, und
der steht in der Datenbank. Die Prüfkette hat keine Zugangsdaten.

⚠ **Daraus folgt der Zuschnitt, und er ist die eigentliche Entscheidung
dieses Papiers:** die Antwort braucht ZWEI Teile, die an verschiedenen
Orten leben — und **keiner der beiden genügt allein.**

| wer weiss was | |
|---|---|
| **der Code** weiss, welche Tabellen ungepagt gelesen werden | ⚠ nicht, wie gross sie sind |
| **die Datenbank** weiss, welche Tabellen gross sind | ⚠ nicht, welche gepagt gelesen werden |

---

## 2 · Teil A — die Prüfkette: „was ist ungepagt?"

Ein `check:paging` nach dem Muster von `check:plugin`: das Messskript vom
11.09.2026 (TypeScript-Syntaxbaum, hängt am `from(…)`-Aufruf) plus eine
**erklärte Liste** von Tabellen, die ungepagt gelesen werden dürfen.

```js
/* Klein und strukturell klein — Konfiguration, keine Nutzdaten. */
const DARF_UNGEPAGT = [
  "api_verbindungen", "mitgliedtypen", "personenarten",
  "portal_rollen", "portal_funktionen", "kader_rollen", …
];
```

Alles andere muss pagen oder filtern. **Eine neue ungepagte Lesestelle auf
`personen` wird damit in der Prüfkette rot**, nicht erst im Betrieb.

⚠ **Die Liste ist eine Entscheidung, kein Bestand.** Wer eine Tabelle
einträgt, sagt: *diese wächst nicht.* Das ist prüfbar falsch, und genau
deshalb steht daneben Teil B.

⚠ **Und mein Messskript hat einen bekannten blinden Fleck**, der
mitkommen muss: es konnte `sb.storage.from("bucket")` nicht von
`sb.from("tabelle")` unterscheiden — zwei der ursprünglich 83 Einträge
waren Buckets. Ein `check:paging` braucht diese Unterscheidung, sonst
meldet es Storage-Aufrufe als Tabellen. **Dasselbe gilt für `.js`: die
erste Fassung hat nur `.tsx?` gelesen und damit `useAppData.js`
übersprungen — also genau die Datei, die die Mitgliederliste lädt.**

| | |
|---|---|
| ✅ | läuft in CI, ohne Datenbank |
| ✅ | eine neue Stelle fällt sofort auf |
| ⚠ | **beantwortet die Wachstumsfrage nicht** — dafür Teil B |

---

## 3 · Teil B — die Datenbank: „was wächst auf tausend zu?"

Der **Wächter** läuft ohnehin alle 30 Minuten mit vollem SQL-Zugriff. Er
bekommt eine Frage dazu:

```sql
select relname, n_live_tup
  from pg_stat_user_tables
 where schemaname = 'public' and n_live_tup > 800;
```

Überschreitet eine Tabelle **800**, entsteht eine Benachrichtigung mit
Namen und Zahl — **einmal**, nach der bestehenden Regel „nur wenn keine
ungelesene zu diesem Anschluss steht".

### ⚠ Warum 800 und nicht eine geraten wirkende Zahl

**Sie ist hergeleitet, nicht gewählt:** 1000 ist die harte Grenze, 800
gibt 200 Zeilen Vorlauf. Bei der gemessenen Wachstumsrate von `personen`
(912 heute) sind das **Monate**, nicht Tage — genug, um in Ruhe zu
entscheiden, und nicht so früh, dass die Meldung zum Rauschen wird.

⚠ **Die Zahl gehört trotzdem gegen einen echten Fall gehalten**, sobald
die erste Meldung kommt: war sie zu früh, steht sie zu tief; kam sie zu
spät, zu hoch. **Eine Schwelle ist nie durch einen Test gedeckt.**

### ⚠ Und die Meldung nennt, was sie NICHT geprüft hat

> *„`personen` hat 812 Zeilen. Ob sie irgendwo ungepagt gelesen wird, sagt
> diese Meldung nicht — das steht im Code."*

**Ohne diesen Satz liest jemand die Meldung als Befund**, sucht einen
Fehler, findet keinen und schaltet sie ab. Eine Prüfung, die ihren
eigenen Zuschnitt nennt, kann nicht für mehr genommen werden, als sie ist.

---

## 4 · Warum keiner der beiden Teile allein genügt

| Nur Teil A | Nur Teil B |
|---|---|
| jemand trägt eine Tabelle in `DARF_UNGEPAGT` ein, und sie wächst später doch | meldet `personen` bei 800 — **auch dann, wenn sie längst gepagt gelesen wird** |
| **niemand merkt es** | **Fehlalarm, und nach dem dritten wird abgeschaltet** |

**Zusammen decken sie beide Richtungen ab**, und das ist der Grund für den
Aufwand — nicht die Gründlichkeit.

---

## 5 · Was NICHT vorgeschlagen wird

⚠ **Alle 81 Stellen paginieren.** Das wäre teuer, machte 70 Abfragen
langsamer, die es nicht müssen, und **löschte an jeder Stelle die
Typinferenz von supabase-js** — der Preis, den `alleSeiten()` an den vier
gebauten Stellen kostet (dort ausdrücklich getippt statt `any`).

⚠ **Eine Monatsroutine „nachzählen".** Genau der Handgriff, an den jemand
denken muss — die schwächste Lösung, und derselbe Grund, aus dem der
Rücksetz-Lauf von Hand abgeschafft wird.

⚠ **Die Grenze bei Supabase anheben** (`db-max-rows`). Sie verschöbe das
Problem und nähme ihm den einzigen Vorteil, den es hat: dass es überhaupt
eine Grenze gibt, gegen die man prüfen kann. **Eine höhere stille Grenze
ist eine spätere stille Grenze.**

---

## 6 · Reihenfolge

| | | Aufwand |
|---|---|---|
| 1 | Teil B — die Frage im Wächter | klein, SQL, kein Deploy |
| 2 | Teil A — `check:paging` samt Positivkontrolle | mittel; das Messskript steht, die Liste ist die Arbeit |

**B zuerst**, weil es die dringendere Hälfte ist: `personen` steht 88
Zeilen unter der Grenze, und Teil A würde diese eine Stelle gar nicht
melden — **sie ist seit dem 11.09.2026 gepagt.**
