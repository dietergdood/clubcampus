# Plan: Gegner-Wappen — „bei jedem Sync, aber nur wenn geändert"

Stand 10.09.2026. **Weg B ist nicht gebaut**, und der Grund ist kein
Versäumnis, sondern eine Eigenschaft der Schnittstelle. Dieses Papier
misst zuerst und schlägt dann vor; gebaut ist nichts.

---

## 1 · Was heute läuft — am Code gezeigt

```ts
// logos.ts:46 — offeneLogos()
for (const id of new Set(gebraucht)) {
  const z = nachId.get(id);
  if (!z)            { raus.push(id); continue; }   // nie versucht
  if (z.pfad)          continue;                    // ⚠ HIER endet es
  if (!z.fehlt_seit) { raus.push(id); continue; }
  if (new Date(z.fehlt_seit).getTime() < grenze) raus.push(id);
}
```

**Zeile 58 ist der ganze Befund.** Wer ein Bild hat, wird übersprungen —
ohne Vergleich, ohne Datum, ohne Frage an den Verband. Es gibt keine
Änderungserkennung, weder gebaut noch halb gebaut.

| | |
|---|---|
| neuer Gegner | ✅ zieht von selbst nach — `gebraucht` kommt aus **allen** Spielen (`spiele.sfv_gegner_team_id`), 25 pro Lauf |
| Wappen fehlt beim Verband (404) | ✅ erneuter Versuch nach 30 Tagen (`fehlt_seit`) |
| **Wappen ändert sich** | ❌ **wird nie bemerkt** |

Meine frühere Formulierung „einmal, dann nie wieder" beschreibt also den
Ist-Zustand richtig — sie war keine Beschreibung von Weg B.

---

## 2 · ⚠ Warum „nur wenn geändert" nicht billig ist

**Die Schnittstelle führt keine `logoUrl`.** Gemessen über *alle* Schemata
der Swagger-Datei (Stand 28.08.2026), gesucht nach `logo`, `picture`,
`image`, `emblem`, `url`:

```
Felder mit Logo/Bild/URL im ganzen Schema:   (keines)
```

Der einzige Weg zu einem Wappen ist:

```
GET /api/team/picture/{teamId}
    → "binary data encoded in base64", text/plain
```

**Kein Link, kein Zeitstempel, keine Prüfsumme, keine Version.** Damit
gilt:

> Um zu wissen, ob sich ein Wappen geändert hat, muss man es holen.

Die Ersparnis von Weg B liegt also **nicht** beim Abruf — der fällt
vollständig an —, sondern nur beim Schreiben in den Bucket. Das ist die
Rechnung, die vor der Entscheidung stehen muss:

| | Abrufe je Lauf | Abrufe je Tag |
|---|---|---|
| heute (einmal, dann nie) | **0** | 0 |
| „bei jedem Sync, nur wenn geändert" | **219** | **5256** |
| alle 30 Tage, gleichmässig verteilt | ~8 | ~183 |

⚠ **5256 Abrufe am Tag für Bilder, die sich vielleicht einmal im Jahr
ändern.** Rate Limits sind beim SFV nicht dokumentiert; der erste
Logo-Lauf am 20.08.2026 hat 217 Abrufe auf einmal gemacht und wurde
danach ausdrücklich auf 25 je Lauf gebremst, weil ein solcher Ausschlag
ohne Not entsteht.

---

## 3 · Drei Wege, und was jeder wirklich kostet

### B1 · Jeder Lauf, Vergleich über eine Prüfsumme

`sfv_team_logos` bekommt `hash text`. Der Lauf holt das Bild, bildet
SHA-256 über die Bytes, vergleicht — nur bei Abweichung wird
hochgeladen.

| | |
|---|---|
| erkennt Änderungen | **sofort** |
| Abrufe | 219 je Lauf, 5256 am Tag |
| Schreibvorgänge | ~0 |
| ⚠ Risiko | ein undokumentiertes Rate Limit trifft **den ganzen Sync**, nicht nur die Logos — dasselbe Token, dieselbe Anwendung |

### B2 · Jeder Lauf, Vergleich über `If-None-Match`

Wie B1, aber der Server beantwortet unveränderte Bilder mit **304** statt
mit dem Bild.

⚠ **Ungemessen, ob der Endpunkt ETags liefert.** Die Swagger-Datei
dokumentiert keine Antwortköpfe. Ein einziger Abruf mit `-i` beantwortet
es. Trifft es zu, ist B2 der beste Weg: die Anfrage bleibt, die Nutzlast
fällt weg.

### B3 · Gestaffelt: alle N Tage, verteilt (Empfehlung)

`sfv_team_logos` bekommt `zuletzt_geprueft`. Kandidat ist, wessen Prüfung
älter als N Tage ist — dieselbe Mechanik wie `fehlt_seit`, nur für die
gefundenen statt für die fehlenden. Die bestehende Bremse von 25 je Lauf
bleibt.

| | |
|---|---|
| erkennt Änderungen | nach höchstens N Tagen |
| Abrufe | **~8 je Lauf** bei N = 30, gleichmässig verteilt |
| neue Spalte | `zuletzt_geprueft` (und `hash`, wenn nur bei Änderung geschrieben werden soll) |

⚠ **N = 30 ist eine Zahl, die niemand gemessen hat** — genau die Sorte
Schwelle, vor der `CLAUDE.md` warnt. Sie ist deshalb hier zu
entscheiden, nicht im Code zu setzen: **wie alt darf ein Vereinswappen
auf der Website höchstens sein?** Ein Jahr wäre vertretbar, ein Tag
sicher übertrieben.

---

## 4 · Was in jedem Fall dazugehört

- **Der Hash ist auch die Gegenprobe.** Ohne ihn sagt „hochgeladen: 0"
  zweierlei: nichts geändert, oder nichts geprüft. Mit ihm steht in der
  Antwort `geprueft: 25, geaendert: 0` — und die erste Zahl belegt, dass
  gearbeitet wurde.
- **Der Sync meldet, wie viele Wappen alt sind.** Sonst ist „alles
  aktuell" von „seit Wochen nicht nachgesehen" nicht zu unterscheiden.
- ⚠ **Unser eigenes Wappen bleibt aussen vor.** Es steht in
  `vereine.theme`, in besserer Qualität als die 80×80 vom Verband, und
  wird nie geholt. Daran ändert kein Weg etwas.

---

## 2a · ⚠ ⚠ AN DER LEITUNG GEMESSEN — es gibt keine `logoUrl` (10.09.2026)

Der Abschnitt darüber leitet aus der **Swagger-Datei** ab. Didis Einwand
dagegen war berechtigt:

> Ein Schema ist ein Dokument, keine Antwort. `playDayName` verhielt sich
> auch anders, als es beschrieben war.

**Jetzt ist es an der Antwort gemessen** (`aktion: "rohschluessel"`,
Objekt für Objekt, `Object.keys()` ohne Werte):

```
Teamliste  (21 Objekte)
  clubName · clubNumber · isHomeTeam · isTeamActive · teamDivisionName
  teamFullname · teamId · teamLeagueId · teamLeagueName · teamName
  teamOrganisationId

Spielplan (270 Objekte)
  cupId · divisionId · divisionName · groupId · groupName
  isUnkownPlayground · leagueId · leagueName · leagueNumber · matchDate
  matchId · matchNumber · matchState · matchStateName · matchType
  matchTypeName · organisationId · organisationName · playDay
  playDayName · playgroundId · roundNbr · scoreTeamA · scoreTeamB
  seasonId · seasonName · stadiumPlaygroundName · teamAId · teamBId
  teamNameA · teamNameB
```

**Kein Schlüssel mit `logo`, `picture`, `image`, `emblem` oder `url` — in
keinem der 291 Objekte.** Die Schema-Suche war richtig; die gegenteilige
Annahme war es nicht.

⚠ **Der Unterschied ist die Belegart, nicht das Ergebnis.** Vorher stand
hier eine Ableitung aus einem Dokument, jetzt eine Messung an der
Leitung. Bei `playDayName` war genau das der Unterschied zwischen richtig
und falsch.

**Damit ist Weg B endgültig gegenstandslos, nicht vertagt.** Ohne
Zeitstempel und ohne Prüfsumme müsste man jedes Bild **holen**, um zu
wissen, ob es sich geändert hat — die Ersparnis, die „nur wenn geändert"
verspricht, kann es hier nicht geben.

## 4a · ⚠ ZURUECKGESTELLT — die Reihenfolge steht fest

Entscheidung Didi, 10.09.2026, auf Befund (b):

> **Erst ausliefern, dann Aktualität.**

Der Export schickt heute keine Wappen (0 Treffer für `logo` im
Exportpfad), also liest sie niemand. Damit ist Weg B **gegenstandslos**,
bis die Auslieferung steht — und zwar nicht „später dran", sondern ohne
Gegenstand: die Frage „ist dieses Bild noch aktuell?" hat keinen
Adressaten, solange das Bild nirgends erscheint.

**Bis dahin wird daran nichts gebaut und nichts dafür gemessen** — auch
die ETag-Frage aus §6 nicht. Sie kostet einen Abruf beim Verband für eine
Entscheidung, die niemand treffen muss.

⚠ **Und das ist die allgemeine Form:** eine Frage nach der Frische von
Daten setzt voraus, dass jemand sie liest. Wer sie vorher stellt, baut
eine Pflege für einen Bestand ohne Leser — dieselbe Familie wie eine
Spalte, die niemand ausliest, nur eine Ebene höher.

## 5 · Zu entscheiden, bevor gebaut wird

1. **Welcher Weg** — B1, B2 (falls ETags), B3.
2. **Bei B3: welches N.** Die Frage ist nicht technisch: wie alt darf ein
   Wappen sein?
3. **Ob der Export die Logos überhaupt mitschickt.** Das ist bis heute
   nicht gebaut (0 Treffer für `logo` im Exportpfad) und eine eigene
   Entscheidung — ein Bestand, den niemand ausliefert, muss auch nicht
   frisch sein.

⚠ **Punkt 3 zuerst.** Solange die Wappen nicht auf der Website
erscheinen, ist ihre Aktualität eine Frage ohne Wirkung — und jeder
zusätzliche Abruf beim Verband wäre für nichts.

---

## 6 · Der eine Abruf, der B2 entscheidet

```
curl -sI "https://club-api-services.football.ch/api/team/picture/37931" \
     -H "X-User-Token: <token>"
```

Steht dort ein `ETag:` oder ein `Last-Modified:`, ist B2 möglich und
alles andere zweite Wahl. Steht dort nichts, fällt B2 weg und die Wahl
ist B1 gegen B3 — also 5256 Abrufe am Tag gegen 183.
