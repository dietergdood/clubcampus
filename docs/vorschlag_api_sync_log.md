# Vorschlag — `api_sync_log`: Frist und Lesestellen sind EINE Frage

Stand 11.09.2026. **Vorschlag, nicht gebaut.**

Ausgangslage (Didi, 11.09.2026): 631 Zeilen, rund 50 am Tag, die
1000er-Grenze von PostgREST in etwa zwei Wochen. Eine 30-Tage-Frist
löschte **heute null Zeilen** und liesse die Tabelle dauerhaft bei ~1500
pendeln — also über der Lesegrenze.

> **Eine Frist allein reicht nicht.** (Didi) Das ist der Ausgangspunkt
> dieses Papiers, und er stimmt — nur liegt der Grund woanders, als die
> 1000 vermuten lässt.

---

## 1 · Zuerst gemessen: die 1000er-Grenze greift heute nirgends

**Vier Lesestellen, alle begrenzt** (11.09.2026):

| Stelle | Begrenzung | was sie will |
|---|---|---|
| `PortalverwaltungModul.tsx:355` Audit-Tab | `.limit(50)` | die letzten Läufe |
| `:366` Kachel | `.limit(20)` | Zeilen mit `ziel_host` |
| `sync.ts:192` | `.limit(1)` | der **letzte** Lauf mit Saison-Id |
| `wp-export/index.ts:819` | `.limit(1)` | der **älteste** Lauf |

**Keine ungepagte Lesestelle.** Die Wächter-Meldung, die beim ersten Lauf
kommt, ist für diese Tabelle gegenstandslos — genau der Fehlalarm, den
`docs/vorschlag_paginierung_sichtbar.md` als Schwäche von Teil B benannt
hat.

⚠ **Damit ist die Frage nicht beantwortet, sondern verschoben:** wenn die
Grenze nicht beisst, warum dann überhaupt etwas tun?

---

## 2 · Der eigentliche Defekt: eine Zeitspanne, die als Zeilenzahl geschrieben ist

```ts
.order("gestartet_am", { ascending: false }).limit(50)
```

**`.limit(50)` ist keine Zeilenzahl, sondern ein Zeitfenster** — und es
wird kürzer, ohne dass jemand etwas anfasst.

⚠ **Das hat schon einmal zugebissen**, und der Kommentar an derselben
Zeile protokolliert es: der WordPress-Lauf vom 05.09.2026 fiel drei Tage
später aus den 50 heraus, die Kachel meldete dauerhaft „kein Lauf", und
der Vergleich zwischen Konfiguration und Beobachtung konnte **nie**
anschlagen — ein Prüfzweig, den nichts erreicht.

| Schreibrate | was 50 Zeilen bedeuten |
|---|---|
| 24/Tag (nur der Sync) | 2 Tage |
| 33/Tag (heutiger Dauerbetrieb) | 1½ Tage |
| **96/Tag** (Abholer ohne Bedingung) | **12 Stunden** |

> **Eine Grenze, die in einer anderen Einheit gemessen wird als in der
> Frage, die sie beantworten soll, geht still auseinander.**

---

## 3 · ⚠ Die gemessenen 50/Tag sind ein Übergangswert, keine Rate

**Gegen eine Zahl aus dem geschäftigsten Tag dieses Projekts darf keine
Frist gesetzt werden.** Drei Einflüsse, alle vorübergehend:

| | |
|---|---|
| der **rollende Nachlauf** holt gerade 62 eingefrorene Spiele nach | vorbei, sobald der Rückstand weg ist |
| **Läufe von Hand** beim Fehlersuchen am 10./11.09.2026 | `sync` zeigt 67 Zeilen in anderthalb Tagen — mehr als stündlich |
| der **Abholer** schreibt heute nur bei `export_wartet() > 0` | seit der Trigger-Reparatur (141 → 0) selten: 53 Zeilen in sechs Tagen ≈ 9/Tag |

**Dauerbetrieb, gerechnet aus den Zeitplänen:** 24 (Sync) + ~9 (Export)
≈ **33 am Tag**, also rund 1000 im Monat.

### ⚠ Und der grösste Hebel ist eine offene Änderung von mir

Der **Fassungs-Weg** sollte die Bedingung `export_wartet() > 0` aus
`cron_wp_export.sql` entfernen, damit ein Fassungssprung einen
vollständigen Export erzwingt. **Das allein vervierfacht das Wachstum
dieser Tabelle** — von ~9 auf bis zu 96 Exportzeilen am Tag.

> **Wer eine Frist setzt, bevor die Schreibrate entschieden ist, setzt sie
> gegen die falsche Zahl.** Die Reihenfolge ist also: erst der Abholer,
> dann die Frist.

---

## 4 · Was geht verloren — Lesestelle für Lesestelle

| | verliert bei einem Schnitt |
|---|---|
| Audit-Tab (50) | **nichts** — er sieht ohnehin nur Tage |
| Kachel (20) | **nichts** |
| Saisonwechsel (`limit 1`, absteigend) | **nichts** — er will den letzten |
| **`ersterLauf`** (`limit 1`, **aufsteigend**) | ⚠ **alles** |
| Nachmessen von Hand | die Möglichkeit, ein Muster über Wochen zu sehen |

### ⚠ `ersterLauf` ist der einzige echte Blocker

```ts
// wp-export/index.ts:819
.order("gestartet_am", { ascending: true }).limit(1)
// wpBestand.ts:96
if (ersterLauf) return { von: ersterLauf, bis, quelle: "erster-lauf" };
```

**Der Anfang des Betrachtungszeitraums wird aus der ältesten
Protokollzeile abgeleitet.** Fällt sie weg, rückt der Zeitraum vor — kein
Fehler, keine Meldung, nur ein anderer Bestandsbericht.

> **Ein Aufräumlauf, der eine Rechnung verändert, ohne dass etwas
> fehlschlägt, ist dieselbe Familie wie ein leerer `catch`: aus einer
> Handlung wird eine Datenlage.**

### Das Nachmessen von Hand ist der stille fünfte Verbraucher

Es steht in keiner Zeile Code und hat diese Woche viermal entschieden:
*„acht Läufe, null Fehler"*, *„dieselbe Spielnummer über mehrere Läufe"*,
*„0+8+2=10 passt nicht zu 12"*, *„270 aktualisiert seit dem 09.09."*

⚠ **Alle vier gingen Tage zurück, keiner Monate.** Und was in `details`
langfristig etwas wert wäre — `derbys`, `ohne_team`, `zaehlung_stimmt` —
sind **Zähler über einen Zustand, der anderswo weiterlebt**: die Spiele
stehen in `spiele`, die Zeilen in `spiel_aufstellung`. Einzig die
**Geschichte der Läufe** gibt es nur hier.

---

## 5 · Der Vorschlag — vier Schritte, und die Frist ist der letzte

### ① `api_verbindungen.erster_lauf` (eine Spalte, einmal geschrieben)

Damit hängt `waehleZeitraum()` nicht mehr an der Aufbewahrung.
⚠ **Ohne diesen Schritt darf kein Schnitt laufen** — er ist die einzige
Stelle, an der ein Schnitt heute etwas kaputtmacht.

### ② Der Audit-Tab liest eine ZEIT, nicht eine Zeilenzahl

```ts
.gte("gestartet_am", vorTagen(7)).order(...).limit(200)
```

Der `limit` bleibt als Netz, nicht als Aussage. **Dann heisst die Abfrage,
was sie meint**, und sie überlebt jede Änderung der Schreibrate.

### ③ Erst dann die Schreibrate entscheiden

Fällt `export_wartet() > 0` weg, schreibt der Abholer viermal so viel.
⚠ Das ist eine **eigene** Entscheidung und gehört nicht in diesen
Auftrag — aber die Frist darf nicht davor gesetzt werden.

### ④ EINE Frist, an EINEM Ort

> **Zwei Fristen, und die zweite kennt niemand.** (Didi, 11.09.2026)

⚠ **Ich habe im ganzen Repository keine 90-Tage-Regel gefunden** — kein
`interval '90 days'`, nichts an `verworfen_am`. Wenn sie existiert, liegt
sie ausserhalb dieses Repositories, und **das ist selbst ein Befund**: ein
Aufräumlauf, den dieses Repository nicht kennt, kann mit einem zweiten
kollidieren, ohne dass etwas fehlschlägt.

**Deshalb: die Frist gehört in eine Tabelle, nicht in eine Zeile.** Ein
Ort, an dem steht, was wie lange bleibt — sonst entsteht die zweite Frist
beim nächsten Mal von selbst.

**Und die Zahl wird nicht gewählt, sondern abgeleitet:**

| Lesefenster | |
|---|---|
| Code, nach Schritt ① | **7 Tage** (Audit-Tab), sonst `limit 1` |
| Mensch beim Nachmessen | **Wochen** |
| **Frist** | **90 Tage** — dieselbe Zahl wie die bestehende, falls es sie gibt |

> **Eine Frist, die länger ist als jede Lesestelle, kann keine Messung
> widerlegen. Genau deshalb wird sie an die Lesestelle gebunden und nicht
> ans Gefühl** — und wenn es schon eine Zahl im Haus gibt, gewinnt sie
> gegen jede bessere.

⚠ **Der Schnitt behält die älteste Zeile je Verbindung**, auch nach
Schritt ①. Sie kostet nichts und ist der Beleg, seit wann es den Anschluss
gibt.

---

## 6 · `aktion = null`: nicht nachtragen

508 Zeilen tragen `aktion = null` — Läufe vor der Spalte (10.09.2026).
Sie liessen sich herleiten: `details->'spiele'` heisst `sync`,
`details->'ziel_host'` heisst `export`.

**Trotzdem nein, aus zwei Gründen:**

⚠ **`null` heisst hier „vor der Spalte", und das ist der ehrliche Wert.**
Ein Nachtrag machte aus einem Schluss eine gespeicherte Tatsache, und
danach wäre nicht mehr zu unterscheiden, welche Zeilen gemessen und welche
erschlossen sind. Dieselbe Unterscheidung wie beim fünften Lauf, dessen
`ohne_team` **`null`** war und nicht `0`: *nicht gefragt ist nicht
dasselbe wie nichts gefunden.*

**Und die Frage erledigt sich von selbst:** die 508 sind vom 14.08. bis
10.09.2026. Bei jeder Frist ab 30 Tagen altern sie in den nächsten Wochen
vollständig heraus. **Ein Nachtrag wäre Arbeit an Zeilen, die ohnehin
verschwinden.**

---

## 7 · Was NICHT vorgeschlagen wird

⚠ **Eine Frist als Einzeiler.** Sie löscht heute null Zeilen, lässt die
Tabelle über der Lesegrenze pendeln und bricht `ersterLauf` — drei
Wirkungen, von denen zwei niemand bemerkt.

⚠ **Die Tabelle kleiner schreiben** (weniger Zeilen je Lauf). Die Zeile
pro Lauf ist der Zweck; sie zu sparen hiesse, die Geschichte zu sparen.

⚠ **Die 1000er-Grenze bei Supabase anheben.** Eine höhere stille Grenze
ist eine spätere stille Grenze.

---

## 8 · Reihenfolge

| | | Aufwand |
|---|---|---|
| 1 | `erster_lauf` als Spalte, `wp-export` liest sie | klein — Migration + eine Zeile |
| 2 | Audit-Tab liest eine Zeit statt einer Zeilenzahl | klein |
| 3 | Schreibrate entscheiden (Abholer) | eigene Entscheidung |
| 4 | Frist, in einer Tabelle, mit der Zahl, die es schon gibt | klein |

**1 und 2 sind unabhängig voneinander und jederzeit machbar. 4 darf erst
nach 1 laufen.**
