# Plan — der rollende Nachlauf

Stand 11.09.2026. **Plan, nicht gebaut.** Grundlage:
`docs/vorschlag_matchdaten_fenster.md`.

---

## 0 · ⚠⚠ ZUERST DIE WECHSELWIRKUNG — sie besteht BEREITS, ohne Nachlauf

Die Frage war, ob Nachlauf und Paginierung sich in die Quere kommen.
**Die Paginierung nicht** (§5). **Aber es gibt eine Kollision, und sie ist
seit dem 10.09.2026 aktiv — der Nachlauf würde sie nur verbreitern.**

### Die Kette

```
Gegnerzeilen  →  delete + insert  (kein upsert möglich, partieller Index)
INSERT        →  stempel_zuletzt_geaendert setzt IMMER now()
now()         →  export_wartet() > 0
              →  der Abholer schickt 21 POSTs an WordPress
```

`stempel_zuletzt_geaendert` vergleicht bei **UPDATE** den Inhalt und lässt
den Stempel stehen, wenn sich nichts geändert hat. **Bei INSERT vergleicht
er nichts** — und kann es nicht, es gibt kein `old`.

> **Jedes nachgeholte Spiel mit Gegneraufstellung löst einen vollständigen
> WordPress-Export aus, auch wenn sich inhaltlich nichts geändert hat.**

⚠ **Und die zweite Hälfte ist die teurere:** der Wächter fragt beim
Export nicht „wann lief er zuletzt?", sondern **„wartet etwas?"**. Genau
diese Frage wird bedeutungslos, wenn stündlich etwas wartet. **Ein Melder,
der immer dasselbe sagt, wird nicht mehr gelesen** — und er war mit
ausdrücklicher Begründung so gebaut.

### ⚠ Es ist heute schon so, nicht erst mit dem Nachlauf

Der stündliche Lauf holt **zehn** Spiele, und die des Fensters tragen
Gegnerzeilen. **Die Kollision ist seit Entscheid B (10.09.2026) aktiv**;
der Nachlauf macht sie nur dauerhaft, weil dann auch ältere Spiele
laufend neu geschrieben werden.

**Nachzumessen, bevor irgendetwas gebaut wird:**

```sql
select v.key, public.export_wartet(v.verein_id) as wartet,
       v.letzter_sync at time zone 'Europe/Zurich' as letzter_export
  from public.api_verbindungen v
 where v.key = 'wordpress';
```

⚠ **Ausführen kurz NACH einer vollen Stunde** (der Sync läuft zur Minute
17) und noch einmal kurz davor. Steht direkt nach dem Sync immer eine Zahl
> 0, ist die Kette belegt.

### Die Reparatur, und sie gehört VOR den Nachlauf

**Nur ersetzen, was sich geändert hat.** Die bestehenden Gegnerzeilen
werden ohnehin gelesen:

```
gelesen == gebaut  →  gar nichts schreiben
sonst              →  delete + insert wie heute
```

Der Vergleich ist ein Feldvergleich über die sechs Spalten, die eine
Gegnerzeile trägt (Team, Nummer, Position, drei Minutenwerte, Rolle).

| | |
|---|---|
| kostet | einen Vergleich über ~12 Zeilen je Spiel |
| bringt | der Export läuft wieder **nur bei Änderung** |
| ⚠ und | die Tabelle hört auf, stündlich dieselben Zeilen neu anzulegen |

⚠ **Das ist keine Optimierung, sondern die Wiederherstellung einer
Zusage.** „Der Export läuft, wenn sich etwas geändert hat" steht als
Entscheidung in `docs/vorschlag_export_ueberwachung.md`; sie gilt seit dem
10.09. nicht mehr, und niemand hat es gemerkt.

---

## 1 · Wie viele alte Spiele je Lauf, und wie lange dauert ein Durchgang?

**Vorschlag: zwei feste Plätze von zehn.**

| Kandidaten (`sfv_status = 2`) | Durchgang bei 2/Lauf | bei 3/Lauf |
|---|---|---|
| heute (~50) | **25 h** | 17 h |
| Saisonende (270) | **5,6 Tage** | 3,8 Tage |

⚠ **Die Zahl der Kandidaten ist zu messen, nicht aus diesem Papier zu
zitieren** — sie wächst jede Woche:

```sql
select count(*) from public.spiele
 where sfv_status = 2 and sfv_match_id is not null;
```

**Empfehlung: 2.** Drei wären schneller und nähmen dem Fenster einen
dritten Platz — und das Fenster hat die dringendere Aufgabe (Korrekturen
des Verbands kommen in den Tagen nach dem Spiel).

---

## 2 · Was kostet es beim Verband?

**Bei Umverteilung: nichts.** Vier Abrufe je Spiel, zehn Spiele je Lauf —
40 Abrufe pro Stunde, unverändert. Es ändert sich nur, **welche** Spiele
die Plätze bekommen.

| | Abrufe/Stunde |
|---|---|
| heute | 40 |
| **2 von 10 umverteilt** | **40** |
| 2 Plätze zusätzlich (12 gesamt) | 48 |

⚠ **Umverteilen ist nicht gratis, es ist nur beim Verband gratis.** Der
Preis steht im Fenster: bei einem Spielwochenende mit mehr als acht
Partien reichen die verbleibenden acht Plätze nicht, und der Rest des
Fensters altert heraus. **Das ist die zweite Hungerzone aus dem Vorschlag,
und sie wird durch die Umverteilung verschärft.**

**Deshalb: `hoechstens` von 10 auf 12 anheben und die 2 obendrauf.** Das
kostet 8 Abrufe je Stunde — und die Entscheidung gehört gegen die gemessene
Laufdauer gehalten, nicht gegen ein Gefühl:

```sql
select gestartet_am at time zone 'Europe/Zurich', details->>'dauer_ms'
  from public.api_sync_log where aktion is null or aktion = 'sync'
 order by gestartet_am desc limit 10;
```

⚠ Vier Abrufe je Spiel laufen **streng seriell** mit demselben Token — ein
zweites `POST /api/token` macht das erste ungültig. Zwei Spiele mehr sind
also acht Abrufe **nacheinander**, nicht parallel.

---

## 3 · Woran erkennt er, wo er stehengeblieben ist?

**Gar nicht — und das ist der Punkt.** Es gibt keinen Zeiger.

```sql
order by matchdaten_geholt_am asc nulls first
limit 2
```

`matchdaten_geholt_am` **ist** die Reihenfolge, und sie pflegt sich
selbst: wer geholt wurde, trägt `now()` und steht damit hinten an.

| | |
|---|---|
| ✅ kein Zustand, der veralten kann | keine Spalte, kein Cursor, keine Datei |
| ✅ selbstheilend | bricht ein Lauf ab, sind dieselben Spiele weiterhin die ältesten |
| ✅ überlebt jede Codeänderung | nach einem Umbau holt der Durchgang alles nach, ohne dass jemand etwas zurücksetzt |

⚠ **Damit ist der Versionsstempel aus dem Vorschlag (Variante a)
gegenstandslos.** Er sollte „was ist veraltet?" beantworten — die
Reihenfolge beantwortet es besser, weil niemand eine Konstante hochzählen
muss. **Der Rücksetz-Lauf von Hand bleibt trotzdem möglich** und ist der
Weg, wenn es schnell gehen muss: 4 Stunden statt 5,6 Tage.

---

## 4 · Woran sieht man, dass er läuft?

⚠ **Die schärfste der vier Fragen** — ein Nachlauf, der still aussetzt,
fiele monatelang niemandem auf.

### (a) Drei Zahlen je Lauf, die aufgehen müssen

```
kandidaten_neu + kandidaten_fenster + kandidaten_alt  ==  spiele_geholt
```

**Eine Aufteilung, die aufgehen MUSS, prüft sich selbst.** Alle drei immer
da, auch als Null — eine Zahl, die nur im schlechten Fall erscheint,
verlangt vom Leser eine Deutung.

⚠ **`kandidaten_alt = 0` ist für sich genommen KEIN Befund:** hat `neu`
die Plätze gebraucht, ist es richtig. Erst die drei zusammen sagen, warum.

### (b) Die eine Zahl, die nicht lügen kann

```sql
max(now() - matchdaten_geholt_am)   -- über alle Kandidaten
```

**Läuft der Durchgang, pendelt dieser Wert um die Durchgangsdauer und
wächst nie unbegrenzt. Wächst er stetig, steht der Nachlauf.**

⚠ **Und die Schwelle dafür wird gerechnet, nicht geraten:**

```
erwartet = anzahl_kandidaten / plaetze_alt   (Läufe)  ×  1 h
Alarm    = aelteste_holung  >  2 × erwartet
```

Damit gibt es keine Zahl im Code, die niemand gemessen hat — die Schwelle
folgt dem Bestand, so wie er gerade ist. **Das ist der Unterschied zu den
festen 120 Minuten im Wächter, die für den Export ein Fehlalarm-Generator
gewesen wären.**

### (c) In den Wächter, nicht nur ins Protokoll

Der Wächter läuft ohnehin alle 30 Minuten und kennt schon zwei Fragen
(Takt für den Sync, „wartet etwas?" für den Export). **Die dritte ist
„kommt der Durchgang voran?"** — und sie gehört dorthin, weil ein Wert,
der nur im Protokoll steht, jemanden braucht, der hinsieht.

---

## 5 · Kommt die Paginierung in die Quere? **Nein.**

| | vorher | nachher |
|---|---|---|
| `spiel_aufstellung` (2282) | 1 Abfrage | 3 Seiten + 1 Zählung |
| `spiel_ereignisse` (1051) | 1 | 2 + 1 |
| `fetchSupporter` (912) | 1 | 1 + 1 |

**Sieben Abfragen statt zwei, alle indexgestützt**, bei einem Lauf, der
zehntausende Millisekunden dauert. Die Zählung ist ein `count(*)` mit
`head: true` — sie liest keine Zeilen.

⚠ **Die Richtung stimmt sogar:** eine gekürzte Antwort war **eine**
Abfrage und lieferte zu wenig; jetzt sind es mehr Abfragen und das
richtige Ergebnis. **Das ist kein Preis, das ist der Unterschied zwischen
falsch und richtig.**

⚠ **Wo es zusammenwirkt, ist die Tabellengrösse, nicht die Abfragezahl:**
der Nachlauf schreibt Gegnerzeilen neu (§0), und jedes `delete + insert`
lässt `spiel_aufstellung` nicht wachsen, aber es erzeugt Schreiblast und
Autovacuum-Arbeit. Bei 2 Spielen je Stunde ≈ 24 Zeilen — vernachlässigbar.
**Mit der Reparatur aus §0 fällt auch das weg.**

---

## 6 · Reihenfolge

| | | warum |
|---|---|---|
| **1** | §0 — Gegnerzeilen nur bei Änderung ersetzen | ⚠ **zuerst**, sonst baut der Nachlauf auf einem Export, der stündlich grundlos läuft, und der Wächter verliert seine zweite Frage |
| 2 | messen: `export_wartet()` direkt nach dem Sync — ist danach 0? | die Gegenprobe zu Schritt 1 |
| 3 | `waehleKandidaten` um den dritten Topf, `hoechstens` 10 → 12 | der eigentliche Nachlauf |
| 4 | die drei Zahlen + `aelteste_holung` ins Laufergebnis | sonst ist Schritt 3 unbeobachtet |
| 5 | Wächter: die dritte Frage | sonst schaut niemand hin |

⚠ **Schritt 4 nie ohne Schritt 3 und nie danach** — ein Nachlauf ohne
Anzeige ist genau das, was §4 verhindern soll.
