# Vorschlag — das Sieben-Tage-Fenster

Stand 11.09.2026. **Vorschlag, nicht gebaut.**

---

## 1 · Der Ist-Zustand, gelesen

`matchdaten.ts:waehleKandidaten`, `NACHZUG_TAGE = 7`, `hoechstens = 10`:

```ts
neu    = ohne matchdaten_geholt_am           // jüngstes zuerst
wieder = MIT geholt_am UND date >= heute−7   // jüngstes zuerst
return [...neu, ...wieder].slice(0, 10)
```

**Zwei Töpfe, und dazwischen fällt alles hindurch, was älter als sieben
Tage ist und schon einmal geholt wurde.**

| Spiel | in `neu`? | in `wieder`? |
|---|---|---|
| nie geholt | ✅ | — |
| geholt, innerhalb 7 Tagen | ✗ | ✅ |
| **geholt, älter als 7 Tage** | ✗ | ✗ |

**Gemessen am 11.09.2026: 62 Spiele lagen in dieser Zone**, zurück bis
zum 01.07. Sie trugen die Form vom Tag ihres Abrufs — ohne Halbzeitstand,
ohne die Rollenableitung aus den Minuten, ohne Gegnerzeilen nach
Entscheid B. **Wochenlang, ohne dass etwas fehlschlug.**

> ⚠ **Das ist keine Eigenschaft der Gegnerzeilen, sondern des Fensters.**
> Jede künftige Änderung an der Matchdaten-Verarbeitung erreicht nur die
> letzten sieben Tage. Alles Ältere behält still die alte Form.

Behoben wurde es mit einem `update … set matchdaten_geholt_am = null` von
Hand. **Genau der Handgriff, an den jemand denken muss — nach der eigenen
Regel dieses Projekts die schwächste Lösung.**

---

## 2 · ⚠ Und es gibt eine ZWEITE Hungerzone, die niemand gesucht hat

`hoechstens = 10` deckelt **beide Töpfe zusammen**. Fallen mehr als zehn
Spiele in die sieben Tage, bekommt der Rest des Fensters nichts — er
altert heraus, ohne je nachgeholt worden zu sein.

**Das ist kein Randfall, sondern der Normalfall eines Spielwochenendes.**
Bei 21 Mannschaften genügt ein Samstag mit zwölf Spielen.

⚠ **Und es fällt nicht auf:** die Spiele haben ja Daten, nur eben die vom
ersten Abruf — ohne die Korrekturen, die der Verband in den Tagen danach
nachträgt. Genau wofür das Fenster gebaut wurde.

**Ungemessen. Die Abfrage, die es beantwortet:**

```sql
select d::date as fenster_ende,
       count(*) as spiele_in_7_tagen
  from generate_series(date '2026-08-01',
                       current_date, '1 day') d
  join public.spiele s
    on s.date > d - 7 and s.date <= d
   and s.sfv_status = 2
 group by d
 order by spiele_in_7_tagen desc
 limit 10;
```

**Steht dort irgendwo eine Zahl über 10, war die Hungerzone schon aktiv.**

---

## 3 · Die eigentliche Frage: `hoechstens` ist knapp und wird verdeckt verteilt

Heute entscheidet ein `slice(0, 10)` am Ende, wer leer ausgeht — also die
**Reihenfolge**, nicht eine Absicht. Eine Aufteilung, die niemand
aufgeschrieben hat, kann auch niemand prüfen.

> **Wo eine Zahl im Code steht, die niemand gemessen hat, gehört sie
> gegen einen echten Fall gehalten.** `hoechstens = 10` ist so eine Zahl.
> Was sie begrenzt, ist die Laufzeit: vier API-Aufrufe je Spiel, streng
> seriell mit demselben Token. **Die gemessene Dauer steht in
> `api_sync_log.details->>'dauer_ms'`** — sie ist die Grundlage für jede
> Änderung an der Zahl, nicht eine Schätzung.

---

## 4 · Drei Wege

### (a) Versionsstempel — „was ist veraltet?"

Eine Spalte `spiele.matchdaten_version`, im Code eine Konstante:

```ts
export const VERARBEITUNG = 8;   // hochzählen, wenn sich etwas ändert
```

Dritter Topf: alles, dessen gespeicherte Version kleiner ist. Nach einer
Änderung holt der Sync von selbst alles nach, zehn je Lauf.

| | |
|---|---|
| ✅ | die Absicht steht im Code, nicht in einem SQL-Block von Hand |
| ✅ | wirkt sofort — vier Stunden statt Wochen |
| ⚠ | **jemand muss die Konstante hochzählen.** Der Handgriff ist nicht weg, er ist umgezogen — aber in dieselbe Datei und denselben Commit wie die Änderung, statt in eine spätere Sitzung |

### (b) Rollender Nachlauf — „was war am längsten nicht dran?"

Feste zwei der zehn Plätze für die Spiele mit dem **ältesten**
`matchdaten_geholt_am`, unabhängig vom Datum.

| | |
|---|---|
| ✅ | **niemand muss an irgendetwas denken.** Dieselbe Bauart wie der Export-Abholer: nicht fragen, ob jemand ausgelöst hat, sondern was ansteht |
| ✅ | **kostet nichts** — es verteilt die zehn Plätze um, statt sie zu erhöhen |
| ✅ | räumt die Hungerzone aus §2 gleich mit ab |
| ⚠ | eine Änderung braucht einen vollen Umlauf: 270 Spiele ÷ 2 je Stunde ≈ **5,6 Tage** |

### (c) Beides

(b) als Grundrauschen, (a) wenn es schnell gehen soll.

---

## 5 · Empfehlung: **(b) zuerst, (a) später oder nie**

**Weil (b) das Versprechen einlöst, um das es geht: nichts zu tun ist
richtig.** Wer eine Änderung baut und nichts weiter unternimmt, bekommt
sie in knapp sechs Tagen überall — und niemand kann es vergessen.

⚠ **(a) allein wäre die Wiederholung des Fehlers auf höherer Ebene.**
„Konstante hochzählen" ist derselbe Satz wie „Rücksetz-Lauf starten", nur
näher am Code. Er hilft dem, der daran denkt — und das ist genau die
Menge, die heute schon keine Lücke hätte.

⚠ **(b) ist ausserdem die einzige der drei, die §2 löst.** Ein
Versionsstempel hilft nicht gegen einen Deckel, der die zehn Plätze schon
verbraucht hat.

**Wenn (a) dazukommt, dann mit einer Prüfung dahinter:** ein Testfall, der
`VERARBEITUNG` gegen die Form der geschriebenen Zeile hält, damit ein
vergessenes Hochzählen rot wird statt still zu bleiben. Ohne die Prüfung
ist die Konstante ein Kommentar mit Zahlenwert.

---

## 6 · Was dabei zu entscheiden wäre

| | |
|---|---|
| **zwei Plätze oder drei?** | 2 von 10 = 5,6 Tage Umlauf · 3 von 10 = 3,8 Tage. Die Frage ist, wie viel vom Fenster übrig bleiben muss — und die Antwort hängt an der Messung aus §2 |
| **`hoechstens` erhöhen?** | nur gegen `dauer_ms`, nie gegen ein Gefühl. Vier Aufrufe je Spiel, seriell |
| ⚠ **Status 5 „abgebrochen"** | `MATCHDATEN_STATUS` holt nur 2. Ein abgebrochenes Spiel hat STATTGEFUNDEN und kann Aufstellung und Ereignisse tragen. **Ob der Verband sie führt, ist ungemessen** — ein eigener Befund, keine Folge dieses Vorschlags |

⚠ Die Statusliste selbst war der Anlass dafür: `migration_sfv_spielplan.sql`
nennt in einem Kommentar **fünf** Werte, der Verband führt **zwölf**. Aus
den fünf habe ich am 11.09.2026 geschlossen, „3 forfait" gebe es nicht.
Die vollständige Liste steht seither als `SFV_STATUS` in `matchdaten.ts`.
