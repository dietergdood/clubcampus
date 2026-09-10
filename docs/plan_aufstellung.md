# Plan: die Aufstellung auf die Website

Stand 10.09.2026. **Schritt 1 — gemessen, nichts gebaut.**

---

## 1 · Was in `spiel_aufstellung` liegt — am Code gemessen

```ts
// matchdaten.ts, bildeAufstellung()
if (!istEigener(p.clubNumber, unsere)) return null;   // ⚠ die erste Zeile
```

| Spalte | Quelle |
|---|---|
| `sfv_person_id` | `personId` |
| `sfv_team_id` | `teamId` |
| **`rueckennr`** | `jerseyNumber` — **ja, sie steht dabei** |
| `position_id` · `position_name` | `positionId` · `positionName` |
| `von_minute` · `bis_minute` · `spielzeit` | `playFromMinute` · `playUntilMinute` · `totalPlayTime` |

**Die Zeilenzahlen kann ich von hier nicht messen** — die Abfrage steht in §6.

### ⚠ Drei Befunde, und alle drei sind harte Grenzen

**(a) Es stehen NUR eigene Spieler drin.** Zeile 1 von `bildeAufstellung`
gibt bei fremden `null` zurück. Der Prototyp zeigt **beide** Mannschaften
— diese Hälfte gibt es in der Datenbank nicht, und zwar nicht „noch
nicht", sondern **absichtlich seit dem 21.08.2026**.

**(b) Die Bank fehlt vollständig.** Gemessen am 10.09.2026, zweimal
unabhängig: **207 von 207** Eingewechselten stehen in keiner Aufstellung.
`/api/match/{id}/players` liefert die Startelf; die Bank steht in
`/bench`, und der Abruf antwortet bisher mit **HTTP 406**.

**(c) Startelf und Ersatz sind NICHT unterscheidbar** — und es gibt zwei
Gründe dafür, von denen nur einer wichtig ist:

| | |
|---|---|
| es sind ohnehin nur Starter drin | Folge von (b) |
| ⚠ das Rollenfeld wird **nicht gelesen** | `Player` führt `assignmentRoleId` und `assignmentRoleName`; unsere Allowlist nimmt beide nicht mit |

**Der zweite ist der wichtigere:** sobald `/bench` läuft, ist die
Unterscheidung eine Frage von zwei Feldern in der Allowlist — sie ist
nicht zu bauen, sie ist zu **holen**.

---

## 2 · Gegnerspieler: es gibt keine, und zwar doppelt gesichert

| Ort | Was |
|---|---|
| `bildeAufstellung()` | fremde Zeilen ergeben `null` — sie entstehen gar nicht |
| `spiel_ereignisse` | CHECK `spiel_ereignisse_fremde_anonym_check`: bei `ist_eigener = false` **müssen** `sfv_person_id`, `rueckennr`, `ein_sfv_person_id`, `ein_rueckennr` NULL sein |
| Anzeige | `beschreibeWer()` gibt beim Gegner den **Vereinsnamen** zurück, nie eine Person |

⚠ **Das ist kein Versäumnis, sondern eine Entscheidung** (Didi,
21.08.2026), und sie wurde am 10.09.2026 ausdrücklich **nicht**
mitgedreht, als die eigenen Namen freigegeben wurden:

> „⚠ Was NICHT umgedreht wird: **Gegner bleiben anonym.**"

**Der Prototyp verlangt damit etwas, das eine eigene Entscheidung
braucht** — keine Bauarbeit. Siehe §5.

Zu den Zahlen aus deinem Lauf (145 Aufstellungs-, 116 Ereigniszeilen):
das ist **ein** Lauf über zehn Spiele, keine Bestandszahl. Beide zählen
ausschliesslich eigene Zeilen — die 116 Ereignisse enthalten
Gegnerzeilen, aber ohne jede Person.

---

## 3 · Was heute an WordPress geht — gemessen

Je Spiel **18 Felder** plus `verlauf`:

```
sfv_match_id · sfv_spiel_nr · datum · zeit · sfv_team_id · gegner
heim_auswaerts · ort · wettbewerb · liga · runde · status · publizieren
tore_heim · tore_gast · halbzeit_heim · halbzeit_gast · verlauf[]

verlauf[]:  minute · art · seite · text · stand · klub
```

```
grep -c "aufstellung|spieler"   wp-export/index.ts → 0
                                wpNutzlast.ts      → 0
```

**Die Aufstellung geht nirgends hinaus.** Es ist keine halbe Anbindung,
es gibt sie nicht.

⚠ **Und `verlauf[].text` ist eine Zeichenkette**, kein Verweis: „Enea
Scot ersetzt durch Nr. 12". Für eine Aufstellung mit Toren am Spieler
reicht das nicht — dort braucht es die Person als **Zeile**, nicht als
Satz.

---

## 4 · Der Abstand zwischen Prototyp und Daten

| Der Prototyp zeigt | Steht in der Datenbank | Fehlt |
|---|---|---|
| Startelf mit Rückennummern | ✅ eigene | Gegner |
| Ersatzbank | ❌ | **alles** — wartet auf `/bench` |
| Ein-/Auswechslung mit Minute | teils: `von_minute`/`bis_minute` bei Startern | die Eingewechselten selbst |
| Tore und Karten am Spieler | ✅ `spiel_ereignisse` mit `sfv_person_id` | beim Gegner unmöglich (CHECK) |
| beide Mannschaften | ❌ | **die halbe Anzeige** |

⚠ **Drei der fünf Zeilen hängen an `/bench` oder an einer Entscheidung —
nicht an Bauarbeit.**

---

## 5 · Was zu entscheiden ist, bevor gebaut wird

**(1) Die Gegnerseite.** Der Prototyp zeigt sie; die Datenbank verbietet
sie. Drei Wege:

| | |
|---|---|
| **A** Nur unsere Mannschaft zeigen | kein Entscheid nötig, halbe Anzeige |
| **B** Gegner als Nummern | `spiel_aufstellung` müsste fremde Zeilen aufnehmen, `rueckennr` ohne Person |
| **C** Gegner mit Namen | ⚠ dreht den Entscheid vom 21.08.2026 um, samt CHECK-Constraint. **Dieselbe Prüfung wie bei den eigenen Namen:** stehen sie öffentlich auf fvrz.ch? |

⚠ **B ist nicht der harmlose Mittelweg, für den er aussieht.** Eine
Nummer ohne Namen ist auf einer öffentlichen Seite wertlos — und der
Constraint müsste trotzdem fallen.

**(2) Ob es überhaupt ohne Bank geht.** Ohne `/bench` gibt es keine
Ersatzliste und keine Einwechslungen. Eine Aufstellung, die nur die
Startelf zeigt und bei Wechseln „Nr. 12" schreibt, ist **weniger** als
das, was der Verlauf heute kann.

> **Empfehlung: `/bench` zuerst klären, dann entscheiden.** Antwortet er
> nicht, ist der Prototyp in dieser Form nicht bedienbar, und die Frage
> nach der Gegnerseite erübrigt sich.

---

## 6 · Die Messungen, die ich nicht machen kann

```sql
select count(*)                              as zeilen,
       count(distinct spiel_id)              as spiele,
       count(rueckennr)                      as mit_nummer,
       count(*) filter (where von_minute > 0) as mit_startminute,
       count(distinct sfv_person_id)         as personen
  from public.spiel_aufstellung;
```

```sql
select count(*)                                    as ereignisse,
       count(*) filter (where ist_eigener)         as eigene,
       count(*) filter (where not ist_eigener)     as fremde,
       count(sfv_person_id)                        as mit_person
  from public.spiel_ereignisse;
```

⚠ **`mit_person` muss gleich `eigene` sein.** Weicht es ab, ist der
CHECK-Constraint umgangen worden — das wäre ein eigener Befund.

---

## 7 · Wenn `/bench` antwortet: was das Theme registrieren muss

⚠ **Erst das Feld im Theme, dann `CC_FELDER`** — genau wie bei `liga`.
Umgekehrt schreibt `update_field()` über ACFs globale Namenssuche in ein
fremdes Feld.

**Ein Repeater am `fch_spiel`, Feldname `aufstellung`:**

| Unterfeld | Typ | Inhalt |
|---|---|---|
| `nummer` | Zahl | Rückennummer, leer wenn keine |
| `spieler` | Text | Name — oder „Nr. 12", wenn keiner bekannt ist |
| `position` | Text | `positionName` des Verbands |
| `seite` | Auswahl | `heim` / `gast` — dieselben Werte wie im Verlauf |
| `rolle` | Auswahl | `start` / `ersatz` — aus `assignmentRoleName` |
| `von_minute` | Zahl | leer bei Startern |
| `bis_minute` | Zahl | leer, wenn durchgespielt |

⚠ **`spieler` ist ein TEXT, kein Verweis** — dieselbe Regel wie im
Verlauf: „Nennt Personen nur als Text." Ein Verweis auf einen
`fch_person`-Beitrag hiesse, 308 Profile anzulegen.

⚠ **`seite` trägt dieselben Werte wie `verlauf[].seite`.** Zwei
Bezeichnungen für dieselbe Sache wären der nächste Fund.

**Danach bei mir:** `aufstellung` in `CC_FELDER`, ein
`cc_schreibe_aufstellung()` nach dem Muster von `cc_schreibe_verlauf()`
(vollständig ersetzen, nicht ergänzen), und die Aufstellung in
`WpSpiel` — mit einer Allowlist je Zeile, keine Spreads.

---

## 8 · Reihenfolge

| | | |
|---|---|---|
| 1 | **`/bench` klären** | wartet auf einen Druck auf „Rohschlüssel" |
| 2 | Entscheid Gegnerseite (§5) | Didi |
| 3 | Feld im Theme (§7) | Theme-Chat |
| 4 | `CC_FELDER` + Nutzlast + Empfänger | hier |

⚠ **Schritt 1 kann Schritt 2 bis 4 gegenstandslos machen.** Deshalb steht
er zuerst und nicht parallel.
