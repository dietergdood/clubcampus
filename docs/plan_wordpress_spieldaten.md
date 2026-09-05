# Plan — Spieldaten nach fcherrliberg.ch

Bestandsaufnahme vom 05.09.2026, dazu der Plan. **Nichts gebaut.**
Auftrag: `docs/auftrag_wordpress_spieldaten.md`.

Was hier steht, ist gemessen oder als ungemessen gekennzeichnet. Die
Abfragen und Fundstellen stehen dabei, damit jede Zahl nachprüfbar ist —
und damit widerlegbar.

---

## 0 · Drei Annahmen des Auftrags treffen nicht zu

Vorweg, weil sie den Plan an drei Stellen umdrehen.

### 0.1 ⚠ Die Id-Typen von `teams` und `spiele` stehen im Auftrag VERTAUSCHT

Der Auftrag sagt unter „Die Zuordnung": *„`personen`, `teams` und die
meisten Tabellen tragen UUIDs … `mitglieder` und `spiele` tragen
`bigint`. Team 47 und Spiel 47 existieren beide."*

Gemessen aus `supabase/schema.sql`:

| Tabelle | Auftrag sagt | **gemessen** | Zeile |
|---|---|---|---|
| `teams.id` | uuid | **bigint** | 2174 |
| `spiele.id` | bigint | **uuid** | 2006 |
| `personen.id` | uuid | uuid ✓ | 1557 |
| `mitglieder.id` | bigint | bigint ✓ | — |
| `ranglisten.id` | — | uuid | 1818 |
| `spiel_ereignisse.id` | — | uuid | 1960 |

```bash
for t in teams spiele ranglisten spiel_ereignisse personen mitglieder; do
  printf "%-20s " "$t"
  grep -A 3 "CREATE TABLE IF NOT EXISTS \"public\".\"$t\" (" supabase/schema.sql \
    | grep '"id"' | head -1
done
```

**Genau die beiden, um die es geht, sind vertauscht.** Das dreht die
Antwort auf Frage 1 um: das Kollisionsrisiko liegt nicht bei `spiel`,
sondern bei `team`. Siehe §3.

### 0.2 ⚠ „Ein abgesagtes Spiel verschwindet in ClubCampus" — nein, nie

Zwei getrennte Messungen.

**a) Es gibt im ganzen Projekt keinen Löschpfad auf `spiele`.**

```bash
grep -rn "from(\"spiele\")\|from('spiele')" src/ supabase/functions/ | grep -i delete
# → 0 Treffer
```

`src/` greift überhaupt nur an einer Stelle auf `spiele` zu, und die
liest (`spielService.ts:20`). Der Sync löscht ausdrücklich nicht — er
zählt:

```ts
// sync.ts:206-208
/* Nicht mehr gelieferte werden gezählt, nie gelöscht. */
const geliefert = new Set(zeilen.map((z) => Number(z.sfv_match_id)));
erg.spiele.nicht_mehr_geliefert = [...bekannt].filter((id) => !geliefert.has(id)).length;
```

`ranglisten` **werden** gelöscht (`sync.ts:248`), `spiele` nicht.

**b) „Abgesagt" ist kein Zustand, sondern eine Familie aus zwölf.**
Aus `docs/sfv/sfv_stammdaten.json` → `Spielstatus`:

| Id | Bedeutung | |
|---|---|---|
| 1 | noch nicht ausgetragen | |
| 2 | ausgetragen | nur hier setzt der Sync `resultat` |
| 3 | forfait | |
| 4 | Null zu Null – Null Punkte | |
| 5 | abgebrochen | |
| 6 | verschoben | |
| 7 | neu angesetzt | |
| 8 | nicht gespielt (SR) | |
| 9 | nicht gespielt (Gegner) | |
| 10 | Spiel findet nicht statt (keine Neuansetzung) | |
| 11 | Abbruch der Saison | |
| 12 | **Spiel ohne Austragung (keine Publikation)** | ⚠ |

⚠ **Status 12 heisst wörtlich „keine Publikation".** Das ist ein
Veröffentlichungsverbot des Verbands, und der Export geht auf eine
öffentliche Website. Es steht bisher an keiner Stelle des Projekts, dass
dieser Zustand existiert — weder im Auftrag noch im Code. Wer ohne
diese Zeile baut, veröffentlicht ein Spiel, das der Verband ausdrücklich
nicht publiziert haben will.

**Folge:** Löschen auf der Website richtet sich nicht nach dem
Verschwinden einer Zeile, sondern nach ihrem Zustand. Siehe §8.

⚠ **Und ein Nebenbefund:** `bildeSpiel` setzt `resultat` nur bei Status
2 (`sync.ts:90`). Ein Forfait (Status 3) hat beim Verband ein Resultat
(3:0) und steht in ClubCampus ohne. Für die Website heisst das: ein
Forfait erscheint als Spiel ohne Resultat. Das ist eine bestehende
Entscheidung, kein Fehler dieses Auftrags — aber die Startseiten-Kachel
überspringt es dadurch (§9), und das gehört gewusst.

### 0.3 ⚠ `spiele.gegner` ist bei jedem Sync-Spiel gesetzt — notfalls leer

Der Auftrag sagt: *„`spiele.gegner` ist nullable, und bei noch nicht
ausgelosten Spielen liefert der Verband ihn nicht."* Die Spalte ist
nullable — der Sync schreibt aber nie `null`:

```ts
// sync.ts:81
gegner: gegnerName ?? "",
```

**Leerer String, nicht `null`.** Damit heisst `gegner IS NULL` in der
Praxis „diese Zeile hat der Sync nie angefasst" (ein von Hand erfasstes
Spiel), und `gegner = ''` heisst „der Verband kennt den Gegner noch
nicht". Das ist die Unterscheidung, nach der der Auftrag fragt — sie
liegt im Unterschied zwischen `null` und `''`, nicht in der Leere
allein. Siehe §9.

---

## 1 · Welches Feld trägt die Verknüpfung Spiel → Team

**Gemessen: es gibt eine `teams`-Tabelle mit eigener Id, und der
belastbare Schlüssel ist `sfv_team_id` — nicht `spiele.team`.**

```
teams.id            bigint  NOT NULL                        schema.sql:2174
teams.name          text    NOT NULL                        schema.sql:2175
teams.sfv_team_id   bigint  NULL, UNIQUE (verein_id, …)     schema.sql:2195 / 3037
spiele.team         text    NOT NULL                        schema.sql:2007
spiele.sfv_team_id  bigint  NULL                            schema.sql:2029
```

Es gibt **keinen** Fremdschlüssel `spiele → teams`. `spiele.team` ist ein
Textfeld — und zwar ein **Abbild**, kein Schlüssel:

```ts
// sync.ts:74-77
/* team ist abgeleitet: aus teams.name über teams.sfv_team_id, NIE aus
   dem SFV-Namen. Ohne Zuordnung ersatzweise der SFV-Name, bis jemand
   zuordnet — die Spalte ist NOT NULL. */
team: namen.get(unserId) ?? ((unsA ? s.teamNameA : s.teamNameB) as string) ?? "",
```

⚠ **`spiele.team` taugt aus zwei Gründen nicht als Zuordnung:**

1. Ohne Team-Zuordnung trägt es den **SFV-Namen** als Platzhalter
   („FC Herrliberg a"), nicht den ClubCampus-Namen („Junioren Ca").
2. Benennt jemand ein Team um, richtet der nächste Lauf **alle** seine
   Zeilen neu aus (`migration_sfv_spielplan.sql:205-209`). Ein Abgleich,
   der auf diesen Text zeigt, verliert seine Zuordnung bei einer
   Umbenennung — lautlos.

**Der Weg für den Export ist deshalb:**

```
spiele.sfv_team_id  →  teams.sfv_team_id  →  teams.id / teams.name
                       UNIQUE (verein_id, sfv_team_id)
```

Die Eindeutigkeit ist erzwungen (`teams_verein_sfv_team_key`,
schema.sql:3037) — dieselbe SFV-Id kann nicht an zwei ClubCampus-Teams
hängen. Der Zuordnungsdialog löst deshalb die alte Zuordnung, bevor er
die neue setzt (`SfvZuordnung.tsx:60-66`).

⚠ **Die saubere Lösung — `spiele.team_id bigint references teams(id)` —
ist bereits geplant und ausdrücklich auf Phase 4 gelegt**
(`migration_sfv_spielplan.sql:211-215`), weil `TermineModul`,
`TeamModul` und `DashboardModul` noch auf `demoData` stehen. **Dieser
Export soll darauf nicht warten und ihr nicht im Weg stehen:** er liest
`sfv_team_id`, nicht `team`. Kommt `team_id` später, ändert sich für ihn
nichts.

---

## 2 · ✅ `t=` IST `sfv_team_id` — belegt am 05.09.2026

**Von Didi im Browser gemessen, mit der Gegenprobe:**

| `t=` | zeigt | erwartet |
|---|---|---|
| **38309** | „Junioren C Promotion a", FC Herrliberg a in der Tabelle | ✅ |
| **37931** | den Spielplan von FC Küsnacht a | ✅ |

**Damit ist die Verknüpfung entschieden:** das WordPress-Feld `team.sfv_id`
lässt sich direkt gegen `teams.sfv_team_id` halten. Keine
Zuordnungstabelle, keine Spalte `fvrz_team_id`, kein zusätzliches Feld.

⚠ **Der Teamname fehlt beim zweiten Aufruf, und das ist kein Widerspruch.**
`v=1516` ist die **FCH-Vereinsseite** — für ein fremdes Team zeigt sie den
Spielplan ohne den Namenskopf. Die Spiele stimmen, und darauf kam es an.

⚠ **Nebenbefund (Didi, 05.09.2026): für fremde Teams braucht der Link ein
anderes `v=`.** Für FCH-Teams ist `v=1516` richtig. **Mehr braucht die
Website nicht** — sie verweist nur auf eigene Mannschaften, und der
einzige Verweis auf ein fremdes Team wäre der Spielbericht, und der geht
über `tg=sfv_match_id` (belegt in `CLAUDE.md`) und nicht über `t=`.

**Wer später doch auf ein gegnerisches Team verlinken will, hat hier die
Grenze schriftlich:** `v=1516` fest zu verdrahten trägt genau so weit wie
die eigenen Mannschaften. Es ist die Vereinsnummer in der Adresse, nicht
ein Anzeigeschalter — dieselbe Familie wie `tg` gegen `sfv_spiel_nr`: zwei
Zahlen, die verwandt aussehen und verschiedene Fragen beantworten.

### Was vorher belegt war (Herleitung, zur Nachvollziehbarkeit)

`docs/sfv/matchdaten_beispiel.json`, echte Antwort von
`/api/match/{id}`:

```json
{"isHomeTeam": true,  "teamId": 37931, "teamName": "FC Küsnacht a",   "clubNumber": 11030}
{"isHomeTeam": false, "teamId": 38309, "teamName": "FC Herrliberg a", "clubNumber": 11057}
```

**Die `teamId` der SFV Club API ist fünfstellig, und FC Herrliberg a hat
38309.** Didis FVRZ-Wert für die 1. Mannschaft ist **38301** — selbe
Länge, selber Tausenderblock, selber Verein.

### Was ICH nicht messen konnte, und warum — die Messung kam von Didi

Der direkte Gegenbeweis wäre ein Aufruf von
`matchcenter.fvrz.ch/…&a=t&t=38309&bn=0`. Gemessen:

```
HTTP 302  →  https://matchcenter.al-la.ch/default.aspx?oid=4&lng=1&v=253
```

**Die Weiterleitung wirft die Parameter weg.** Zur Gegenprobe habe ich
dieselbe Abfrage mit der in `CLAUDE.md` dokumentierten, nachweislich
funktionierenden Spielbericht-Adresse (`a=tg&4393132&bn=0`) gemacht —
sie landet auf **derselben** parameterlosen Seite, mit einer allgemeinen
Spielliste (19 Treffer auf „Spielnummer" statt einem).

⚠ **Damit sagt meine Messung nichts über den Parameternamen aus.** Sie
scheitert bei einer Adresse, von der belegt ist, dass sie richtig ist.
Ein Fehlschlag, der auch den bekannten Fall trifft, ist kein Befund über
den unbekannten. (Der Browser-Weg wäre der richtige — die
Chrome-Erweiterung ist in dieser Sitzung nicht verbunden.)

Das ist die Familie, vor der `CLAUDE.md` beim 403 warnt: **der Fehlschlag
sieht aus wie ein Befund über die Kennung und ist einer über die
Prüfung.**

### Warum die Gegenprobe dazugehörte

Eine Zahl, die zufällig irgendein Herrliberger Team trifft, beweist
nichts; zwei, die beide das richtige treffen, schon. Deshalb `37931` mit
— und deshalb ist das Ergebnis belastbar und nicht bloss plausibel.

**Der Zuordnungsbericht aus §7 bleibt trotzdem, und zwar unverändert:**
findet der Export ein WordPress-Team, dessen `sfv_id` in
`teams.sfv_team_id` nicht vorkommt, meldet er es namentlich. Er ist jetzt
kein Beweismittel mehr, sondern das, wofür er gedacht war — der Melder
für einen Tippfehler in einem einzelnen `sfv_id`-Feld.

---

## 3 · `clubcampus_id`: eindeutig, stabil, wer legt an

### 3.1 Ist die Id eindeutig?

Wegen §0.1 anders als im Auftrag gedacht:

| wandert als | ClubCampus-Quelle | Id-Typ | kollidiert mit |
|---|---|---|---|
| CPT `spiel` | `spiele.id` | **uuid** | nichts — global eindeutig |
| CPT `team` | `teams.id` | **bigint** | `mitglieder.id` (CPT `person`, vorgesehen) |
| CPT `spieler` | — | — | hängt an `sfv_person_id`, nicht an `clubcampus_id` |

**Empfehlung: die Herkunft mitschreiben, `spiel:<uuid>` und
`team:<bigint>`.** Begründung, obwohl `spiel` sie nicht braucht:

- `team` braucht sie: `teams.id` und `mitglieder.id` sind beide `bigint`
  und beginnen beide bei kleinen Zahlen. Team 47 und Mitglied 47
  existieren beide. Der CPT `person` ist im WordPress-Plan vorgesehen.
- Ein Feld, das bei einem Typ ein Präfix trägt und beim anderen nicht,
  ist genau die Sorte Unterschied, die niemand im Kopf behält.
- ⚠ Es macht ausserdem sichtbar, **welcher** Datensatz fehlt, wenn ein
  Abgleich ins Leere zeigt. `47` allein ist keine Auskunft — genau das
  sagt der Auftrag, und es gilt für `team` wörtlich.

### 3.2 Was passiert bei Löschen und Neuanlegen?

**Für `spiele` gemessen: kommt nicht vor.**

Der Sync legt eine Zeile **einmal** über
`upsert(…, {onConflict: "verein_id,sfv_match_id"})` an (`sync.ts:213`)
und fasst sie danach nur noch an. Er löscht nie (§0.2a). Im Portal gibt
es keinen Löschpfad. Die `spiele.id` ist damit stabil, solange niemand
von Hand in der Datenbank löscht.

⚠ **Und der Schlüssel ist bewusst eine gewöhnliche UNIQUE-Constraint,
kein partieller Index** (`migration_sfv_spielplan.sql:35-46`) — sonst
könnte `ON CONFLICT` ihn nicht ableiten und der Sync fiele still auf
INSERT zurück und erzeugte Dubletten. Das ist bereits durchdacht; der
Export erbt die Stabilität.

**Für `teams`:** die Zeilen legt der Verein an, der Export fasst sie nie
an. Ein gelöschtes und neu angelegtes Team bekäme eine neue `bigint`-Id
— aber der Export verknüpft über `sfv_id`/`sfv_team_id`, nicht über
`clubcampus_id`. Die Waise entstünde also nicht.

⚠ **Daraus folgt etwas, das ich ausdrücklich benenne:
`team.clubcampus_id` ist im WordPress-Plan vorgesehen, wird von diesem
Export aber weder geschrieben noch gelesen.** Die Verknüpfung läuft ganz
über `sfv_id`. Ein Feld, das niemand liest, ist genau der Defekt, den
`CLAUDE.md` unter „Wer eine Spalte anlegt, nennt im selben Auftrag die
Stelle, die sie liest" beschreibt — dreimal belegt. **Entweder bekommt
`team.clubcampus_id` einen Leser, oder es bleibt bei `team` weg.** Ich
schlage vor: weglassen, und die Entscheidung hier festhalten, damit
niemand sie später für Nachlässigkeit hält.

### 3.3 Wer legt an?

| CPT | Anlegen | Ändern | Entfernen |
|---|---|---|---|
| `spiel` | **Export** | Export | Export (auf Entwurf, §8) |
| `team` | Redaktion | Redaktion | Redaktion |
| `spieler` | Redaktion | Export nur die Zahlen | Redaktion |
| Rangliste | Export | Export | Export |

Das ist Didis Vorgabe, unverändert. **Der Export legt kein Team an —
auch dann nicht, wenn eines fehlt.** Begründung in §7.

---

## 4 · Wer schreibt: die Edge Function

Vorgegeben, nicht offen — hier nur, was daraus folgt.

**Blaupause ist `supabase/functions/sfv-sync/`, Bauteil für Bauteil.**
Der neue Ordner heisst `supabase/functions/wp-export/`.

| | SFV-Sync | Export (übernommen) |
|---|---|---|
| zwei Wege herein | Admin-JWT · `X-Sync-Key` | gleich |
| Rechteprüfung | `alsAufrufer.rpc("is_admin")` | gleich |
| Schreiben | Service Role | entfällt — der Export **liest** nur aus Supabase |
| Geheimnisse | `npx supabase secrets set` | `WP_BASIS_URL`, `WP_BENUTZER`, `WP_APP_PASSWORT`, `WP_SYNC_KEY` |
| Adresse | `api_verbindungen.api_url` | gleich |
| Laufsperre | `sync_laeuft_seit`, 15 Min. | gleich, eigene Zeile |
| Protokoll | `protokoll.ts` schwärzt | **dieselbe Datei mitbenutzen** |
| Ergebnisform | `ergebnisTypen.ts` + Allowlist | eigene Datei nach demselben Muster |

⚠ **Der Zugang gehört in die Secrets, nicht in `api_verbindungen`** —
dieselbe Regel wie beim SFV, und der Hinweis steht bereits in der Kachel
(`ApiTab.tsx:117`): *„Zugangsdaten stehen nicht in der Datenbank."*
WordPress-Application-Passwörter sind vollwertige Zugänge; in einer
Tabelle, die `PortalverwaltungModul` mit `select("*")` liest, hätten sie
nichts zu suchen.

⚠ **Kein `service_role`-Key als Ausweis**, auch nicht in Versuchung: die
Erklärung dazu steht in `index.ts:21-23` — `is_admin()` liest
`auth.uid()`, das dabei leer ist.

### 4.1 ⚠ Der eine Punkt, den ich zuerst prüfen würde

Der Auftrag verlangt: *„Such die bestehende Auflösung im Portal und
benutze sie, statt die Logik ein zweites Mal zu schreiben."*

**Sie existiert: `mischeEreignisse()` in
`src/domains/spiele/matchdatenAnzeige.ts`.** Sie behandelt alle vier
Fälle — Korrektur verdeckt SFV-Zeile, verworfene Korrektur verdeckt
nicht mehr, Nachtrag ohne `ersetzt_ereignis_id`, und Korrektur, deren
SFV-Zeile verschwunden ist. Dazu `hatVerlauf()` und `OHNE_VERLAUF_TEXT`
für §6.

**Und sie ist importierbar:**

```bash
grep -c "^import" src/domains/spiele/matchdatenAnzeige.ts   # → 0
```

**Null Imports.** Damit ist sie genau der Fall, den `ergebnisTypen.ts`
im Kopf beschreibt: eine Datei, die beide Welten lesen können — Deno für
die Edge Function, `tsc`/vitest für die Tests. Der Import aus
`supabase/functions/wp-export/` heraus wäre ein relativer Pfad über
Ordnergrenzen.

⚠ **Das ist der eine Punkt, an dem ich vor dem Bauen einen Trockenlauf
machen würde**, denn der Pfad geht aus `supabase/functions/` in `src/`
hinaus, und ob `supabase functions deploy` das mitbündelt, ist eine
Frage an das Werkzeug, nicht an den Code. Fünf Minuten, und sie
entscheiden zwischen zwei Bauformen:

| | |
|---|---|
| Import trägt | direkt aus `src/domains/spiele/` — eine Quelle, nichts zu tun |
| Import trägt nicht | die Datei wandert nach `supabase/functions/_shared/`, und `src/` importiert von dort. Ein Umzug, keine Kopie — **eine zweite Fassung wäre der Fehler**, den der Auftrag ausschliesst |

Der Präzedenzfall steht bereits: `supabase/functions/_shared/aufrufer.ts`
und `aufruferRegeln.ts` sind genau so entstanden, „weil zwei getrennte
Rechteprüfungen still auseinanderlaufen" (`CLAUDE.md`).

---

## 4.2 · Die Adresse: dev zuerst, Produktion später

**Vorgabe (Didi, 05.09.2026): ein Wechsel ist ein `secrets set` und sonst
nichts.** Kein Wert im Code, keine Kopie in der Datenbank, kein zweiter
Ort.

```bash
npx supabase secrets set WP_BASIS_URL=https://dev.fcherrliberg.ch/wp-json
#  … später …
npx supabase secrets set WP_BASIS_URL=https://www.fcherrliberg.ch/wp-json
```

Umgesetzt in `migration_wp_export.sql`: **`api_url` bleibt `NULL`** — anders
als beim SFV-Anschluss, wo die Adresse in der Spalte steht. Und das Label
heisst „WordPress-Export" ohne Host: eine Beschriftung ist der Ort, den
man am seltensten nachzieht, weil er nur eine Beschriftung ist.

⚠ **Was dabei verloren geht, und es ist nicht nichts:** die Tabelle sagt
nicht mehr, wohin geschrieben wird. Ersetzt wird das **nicht durch eine
Kopie, sondern durch eine Beobachtung** — der Export nennt den Ziel-Host
in `sync_meldung` und `api_sync_log.meldung`.

| | kann veralten? |
|---|---|
| **Konfiguration**: das Secret | — es ist die einzige Quelle |
| **Beobachtung**: die Meldung des letzten Laufs | ⚠ **nein** |

Eine Konfigurationskopie behauptet etwas über die Zukunft, ein Protokoll
berichtet über die Vergangenheit. Nur das zweite kann nach einem Wechsel
nicht falsch sein.

⚠ **Und das beantwortet nebenbei eine Frage, die ich sonst hätte offen
lassen müssen:** ob Supabase ein geändertes Secret sofort an eine warme
Function-Instanz durchreicht oder erst beim nächsten Kaltstart, weiss ich
nicht sicher. **Ich muss es auch nicht wissen** — der erste Lauf nach dem
Wechsel schreibt den Host, den er tatsächlich benutzt hat, in die Meldung.
Die Frage beantwortet sich durch Hinsehen statt durch Vermuten.

⚠ **Ein Widerspruch, der stehen bleibt:** die InfoBox in `ApiTab.tsx:117`
sagt *„Die Adresse des Anschlusses steht in api_verbindungen.api_url"* —
für die WordPress-Zeile stimmt das nicht mehr. Der Satz gilt weiterhin für
den SFV. Gehört umformuliert, wenn die Kachel ohnehin angefasst wird
(§15).

### 4.3 ⚠ Wird die Zuordnung irgendwo gespeichert? — Gemessen: nein

Didis Frage, und sie ist die richtige: läge irgendwo ein
WordPress-Beitrags-Id, zeigte sie nach dem Wechsel auf Beiträge, die es
auf der neuen Seite nicht gibt — dann wäre der Wechsel kein `secrets set`,
sondern ein Zurücksetzen.

**Gemessen am 05.09.2026, drei Orte:**

```bash
grep -niE "wp_|wordpress|post_id|beitrag" supabase/schema.sql   # nur "Beitrag" = Mitgliederbeitrag
grep -rniE "wordpress|wp_post|wp-json" src/ supabase/functions/
```

| | Ergebnis |
|---|---|
| Spalte in der Datenbank | **keine** |
| Verweis im Portal-Code | **keiner** |
| in `migration_wp_export.sql` | **keiner** |

**Alle drei Schlüssel leben ausschliesslich auf der WordPress-Seite**, als
Postmeta des jeweiligen Beitrags:

| CPT | Schlüssel | wer ihn setzt |
|---|---|---|
| `spiel` | `clubcampus_id` | der Export |
| `team` | `sfv_id` | die Redaktion |
| `spieler` | `sfv_person_id` | die Redaktion |

Der Export findet einen Beitrag, indem er WordPress **fragt** („gibt es
einen mit `clubcampus_id = spiel:<uuid>`?"), nicht indem er sich etwas
merkt. Er ist damit zustandslos, und der Wechsel ist wirklich ein
`secrets set`: die neue Seite hat keine Beiträge, die Abfrage findet
nichts, der Export legt an.

⚠ **Diese Zustandslosigkeit ist eine Eigenschaft, die man verlieren kann,
und sie sieht wie eine Optimierung aus.** Wer später eine Spalte
`spiele.wp_beitrag_id` anlegt, um die Meta-Abfrage je Spiel zu sparen,
baut genau den Fall, vor dem Didi warnt — und er fällt nicht auf, solange
niemand die Seite wechselt. **Die Zuordnung gehört nach WordPress, in
beide Richtungen. Sie darf nicht nach ClubCampus zurückwandern.**

### 4.4 ⚠ Es gibt bereits einen WordPress-Pfad, und ich hatte ihn übersehen

`src/domains/spiele/spielerAusgabe.ts` baut eine **WXR-Importdatei** für
die Spieler-Beiträge (`SfvSpielerZuordnung.tsx:285`, „WordPress-Importdatei
(XML)"). Sie entsteht im Browser, geht nie an den Server zurück, und setzt
genau ein Postmeta:

```xml
<wp:postmeta>
  <wp:meta_key>sfv_person_id</wp:meta_key>
```

**Das bestätigt §4.3 und legt zugleich die Konvention fest**, an die der
Export sich zu halten hat: der Spieler-Schlüssel heisst `sfv_person_id`
und nicht `clubcampus_id`. `<wp:post_id>` in der Datei ist eine laufende
Nummer **innerhalb der Datei** — WordPress vergibt beim Import eigene Ids,
und die Datei-Nummer ist danach bedeutungslos. Auch von dort kommt also
kein Verweis zurück.

⚠ **Warum ich die Datei in der Bestandsaufnahme nicht gefunden habe,
gehört dazu — es ist ein Befund für sich.** Sie enthält an Zeile 100 ein
rohes **NUL-Byte** in einem Stringliteral (`let letztesTeam = "\0"`, als
Byte geschrieben statt als Escape). Damit hält `grep` sie für binär und
**überspringt sie stillschweigend** — jedes `grep -rn` in dieser
Codebasis, meines eingeschlossen. Siehe §16 Punkt 4.

### 4.5 Was beim Wechsel passiert

**Frage von Didi: braucht es einen Anstoss von Hand, oder reicht die
Stunde?**

| | |
|---|---|
| Beiträge auf der **alten** Seite | bleiben stehen, unverändert, für immer |
| Beiträge auf der **neuen** Seite | keine — bis zum nächsten Lauf |
| nach dem nächsten Lauf | vollständig, weil der Export je Team den **ganzen** Satz sendet (§8.2) und keine Mengenbegrenzung je Lauf hat |

**Die Stunde reicht — funktional.** Es gibt keine Nachhol-Mechanik, weil
es nichts nachzuholen gibt: jeder Lauf ist ein voller Abgleich, nicht ein
Nachtrag. Das ist der Unterschied zum SFV-Sync, der zehn Spiele je Lauf
holt (`MATCHDATEN_PRO_LAUF = 10`) und deshalb Läufe braucht.

⚠ **Trotzdem von Hand anstossen, und zwar nicht wegen der Zeit.** Der
erste Lauf gegen eine neue Zielseite ist der, bei dem man zusieht — genau
wie Etappe 4 im Plan. Er beantwortet drei Fragen auf einmal: greift das
neue Secret, stimmt die Adresse, und **welchen Host nennt die Meldung**.

⚠ **Und dafür fehlt heute der Knopf.** „Sync starten" ist auf
`football_ch` verdrahtet; jede andere aktive Verbindung bekommt einen
Knopf mit `onClick={()=>{}}` (§15). Der zweite Zweig gehört damit zu
Etappe 7 — oder der Anstoss läuft über einen `curl` gegen die Function.

⚠ **Drei Dinge, die der Wechsel NICHT von selbst mitbringt:**

1. **Die redaktionelle Zuordnung ist seitengebunden.** `team.sfv_id` und
   `spieler.sfv_person_id` trägt die Redaktion ein — auf der neuen Seite
   sind sie leer, wenn sie nicht mitkommen. **Wird dev als Klon der
   Produktion gebaut (oder umgekehrt), kommen sie mit**; wird die neue
   Seite frisch aufgesetzt, nicht.
   ⚠ **Das ist der eigentliche Aufwand des Wechsels, nicht die Adresse.**
   Fehlt `team.sfv_id`, überspringt der Export jede Mannschaft — aber
   **laut**: er zählt und nennt sie namentlich (§7). Kein stiller Ausfall.
2. **Hat die neue Seite schon Spiel-Beiträge**, setzt der Abgleich alles
   auf Entwurf, was nicht im gesendeten Satz steht. Richtig so, aber es
   überrascht, wenn dort von Hand etwas angelegt wurde.
3. **Die alte Seite friert ein.** Eigener Punkt, §4.6 — es ist das
   einzige der drei, das der Export nicht lösen kann.

---

## 4.6 ⚠ Die alte Seite friert ein — und der Export kann daran nichts ändern

**Aufgenommen auf Didis Hinweis, 05.09.2026.** Es steht hier als eigener
Abschnitt und nicht als Unterpunkt, weil es der einzige Teil dieses
Vorhabens ist, für den es **keine** technische Lösung im Export gibt.

Nach dem Wechsel `dev` → Produktion hört der Export auf, mit
`dev.fcherrliberg.ch` zu sprechen. Was dort steht, bleibt stehen: ein
vollständiger Spielplan mit Resultaten, Ranglisten und Torschützen —
**eingefroren auf den Tag des Wechsels.**

⚠ **Es sieht nicht veraltet aus, und das ist das Problem.** Ein leerer
Spielplan fällt auf. Einer, der Resultate zeigt, sieht aus, als stimme er
— nur eben die vom letzten Lauf. Dieselbe Familie wie die erfundenen
Werte in `DashboardModul` („Mitglieder total 187"): **eine plausible Zahl
wird zitiert, eine fehlende wird gemeldet.**

**Und die Adresse ist verwechselbar.** `dev.fcherrliberg.ch` gegen
`www.fcherrliberg.ch` unterscheidet ein Elternteil nicht, das den Link
von irgendwoher hat.

| ohne Gegenmassnahme | |
|---|---|
| Suchmaschinen | indexieren beide Seiten; die dev-Seite kann bei „FC Herrliberg Junioren C Resultate" oben stehen |
| Verweise von aussen | ein einmal geteilter dev-Link bleibt gültig und zeigt für immer den Stand vom Wechseltag |
| Nutzer | sieht ein Resultat, das falsch ist, ohne jeden Hinweis darauf |

**Was hilft, alles auf WordPress-Seite (§12):**

1. **`Einstellungen → Lesen → Suchmaschinen davon abhalten`** — das
   Mindeste, aber ⚠ nur eine Bitte an die Suchmaschine, keine Sperre.
2. **Ein echter Zugriffsschutz.** HTTP-Basic auf dem Server oder ein
   Plugin, das die ganze Seite nur angemeldet ausliefert. Das ist die
   einzige Massnahme, die auch gegen einen weitergegebenen Link wirkt.
3. **Nach dem Wechsel: die dev-Seite abschalten oder leeren**, wenn sie
   nicht mehr gebraucht wird.

⚠ **Warum der Export das NICHT übernehmen soll**, obwohl es technisch
ginge (er könnte vor dem Wechsel alle Beiträge der alten Seite auf
Entwurf setzen): dann bräuchte er Zugang zu **zwei** Seiten gleichzeitig,
und die Adresse wäre wieder zwei Werte statt einem. Damit fiele die
Eigenschaft, die §4.2 gerade hergestellt hat — **ein Wechsel ist ein
`secrets set`**. Ein Aufräumschritt, der die Konfiguration verdoppelt,
kostet mehr, als er einbringt.

**Es ist ein Betriebsschritt, kein Codeschritt.** Er gehört in die
Anleitung (`docs/anleitung_wordpress_etappe3.md`, Schritt 9) und nicht
in die Edge Function.

---

## 5 · Rangliste: weder CPT noch Feld am Team

Der Auftrag ahnt richtig, dass ein Inhaltstyp pro Rangliste falsch wäre
— die Begründung ist aber eine andere als vermutet, und sie führt zu
einer dritten Antwort.

**Was eine Rangliste ist, gemessen:** `ranglisten` hält **eine Zeile je
Team je Gruppe** (`schema.sql`, Kommentar 1847). Der Schlüssel ist
sechsteilig:

```
(verein_id, sfv_saison_id, sfv_liga_id, sfv_division_id, sfv_gruppe_id, sfv_team_id)
```

Eine „Rangliste" ist also die Menge aller Zeilen einer **Gruppe** —
nicht eines Teams. Ein FCH-Team steht in genau einer Gruppe (belegt in
`CLAUDE.md`, 28.08.2026: 21 Teams in 21 verschiedenen Gruppen), und in
seiner Gruppe stehen auch die Gegner.

**Warum kein Feld am `team`-Beitrag:** weil der Export dann in `team`
schreiben müsste — und Didis Vorgabe ist, dass er Teams weder ändert
noch anlegt. Diese Vorgabe ist gut, und ich würde sie nicht für die
Rangliste aufweichen: sie ist die einzige Zusage, die die Redaktion vor
dem Export schützt.

**Warum kein CPT:** eine Rangliste hat keinen eigenen Titel, keinen
Permalink, keinen redaktionellen Inhalt und keine Taxonomie. Ein
Beitragstyp gäbe ihr eine Adresse, unter der sie niemand aufruft, und
einen Editor, in dem sie niemand bearbeiten darf.

### Vorschlag

**Eine eigene Tabelle in WordPress, ein Datensatz je Gruppe, die ganze
Tabelle als ein JSON-Feld.** Adressiert über `sfv_gruppe_id`.

```
wp_cc_ranglisten
  sfv_gruppe_id     bigint  PRIMARY KEY
  sfv_saison_id     int
  sfv_liga_id       int
  sfv_division_id   int
  liga_name         text
  gruppe_name       text
  zeilen            longtext   -- JSON, Position … Punkte, je Team
  stand_vom         datetime
  export_lauf       datetime
```

Die Vorlage sucht die Gruppe **über die Zeilen selbst**: welche Gruppe
enthält `sfv_team_id = 38309`? Bei rund 21 Gruppen ist das nichts, und
es kommt ohne einen einzigen Schreibvorgang an `team` aus.

⚠ **Der Preis gehört benannt:** die Rangliste ist damit im
WordPress-Backend nicht sichtbar und nicht bearbeitbar. Das ist gewollt
— sie gehört dem Verband, und es gibt daran nichts zu entscheiden. Aber
sie ist dann auch nicht **prüfbar**, und deshalb gehört ihr Stand in die
Kachel in ClubCampus (§7), nicht ins WordPress-Backend.

⚠ **Und der Auftrag nennt „Rangliste: alle Mannschaften".** Der Export
schickt die Gruppen aller zugeordneten Teams — auch die der Junioren.
Die Rangliste einer Junioren-Gruppe nennt gegnerische **Mannschaften**,
keine Personen; die Personenfrage aus dem Auftrag stellt sich hier
nicht.

---

## 6 · Ereignisse: Gegner, unzugeordnete Spieler, leerer Verlauf

### 6.1 Gegnerische Tore haben keinen Schützen — erzwungen

```sql
CONSTRAINT "spiel_ereignisse_fremde_anonym_check"
  CHECK (ist_eigener OR (sfv_person_id IS NULL AND rueckennr IS NULL
                     AND ein_sfv_person_id IS NULL AND ein_rueckennr IS NULL))
```

(`schema.sql:1984`) Der Sync prüft dasselbe ein zweites Mal
(`matchdaten.ts:129-138`) und behält vom Gegner nur `gegner_club_name`
— den **Mannschaftsnamen**, nicht den Verein und keine Person.

**Wie die Website es zeigt, ohne dass es wie ein Fehler aussieht:** der
Mannschaftsname tritt an die Stelle der Person, nicht ein Leerraum und
nicht „unbekannt".

```
⚽  34.   Adrian Lustgarten
⚽  51.   FC Küsnacht a
🟨  67.   FC Küsnacht a
```

Die zweite Zeile liest sich als Aussage, nicht als Lücke. **Kein
Erklärsatz darunter** — die Regel aus `CLAUDE.md` gilt hier wörtlich:
*„Ein Erklärsatz, der eine Platzierung geradebiegen muss, ist das
Eingeständnis der falschen Platzierung."* Wer „beim Gegner erfassen wir
keine Namen" darunterschreibt, macht aus einer selbstverständlichen
Zeile eine erklärungsbedürftige.

⚠ **Ein Wort zur Symmetrie, weil es beim Bauen auffallen wird:** eigene
Tore nennen einen Menschen, gegnerische eine Mannschaft. Das sieht
ungleich aus und ist es. Es ist trotzdem richtig — es ist genau die
Grenze, die der Auftrag zieht („Die Ausnahme trägt genau so weit wie die
Veröffentlichung des Verbands"), und die Ungleichheit ist ihr sichtbarer
Abdruck. **Sie zu glätten hiesse, eine der beiden Seiten zu ändern.**

### 6.2 Unzugeordnete Spieler — Vorschlag: die Zeile bleibt, mit Nummer

**Heute sind es alle.** `sfv_zuordnung` hat null Zeilen (belegt in
`CLAUDE.md`, 29.08.2026, gegen einen Dump gemessen), bei 308 offenen
Spielern. Der Auftrag sagt „Heute sind 0 offen" — das ist die
Berichtigung vom 25.08., die im Auftrag selbst weiter unten steht: **es
ist umgekehrt, null sind zugeordnet.**

⚠ **Damit ist die Frage nicht „was tun mit den wenigen Ausnahmen",
sondern „wie sieht die Website aus, solange NIEMAND zugeordnet ist".**
Das ist der Zustand am Tag der Inbetriebnahme, nicht ein Randfall.

**Vorschlag: die Zeile bleibt, mit der Rückennummer.**

```
⚽  34.   Nr. 9
```

Drei Gründe:

1. **Eine fehlende Zeile fälscht das Spiel.** Ein 3:0, bei dem zwei Tore
   fehlen, weil ihre Schützen nicht zugeordnet sind, ist ein falscher
   Spielbericht. Ein 3:0 mit „Nr. 9" ist ein richtiger mit einer offenen
   Angabe.
2. **Die Rückennummer kennt jeder, der beim Spiel war.** Genau diese
   Begründung steht schon im Code (`matchdatenAnzeige.ts`,
   `unzugeordnetLabel`).
3. **Es füllt sich von selbst.** Jede Zuordnung ersetzt eine Nummer
   durch einen Namen, ohne dass am Export etwas geändert wird.

⚠ **Aber NICHT `unzugeordnetLabel()` auf der Website benutzen.** Sie
liefert „Nr. 9 · nicht zugeordnet" — das ist die Sprache der
Verwaltungsmaske. Ein Besucher liest daraus einen Defekt der Website.
Auf der Website steht `Nr. 9` und sonst nichts.

⚠ **Und NIE die rohe `sfv_person_id` anzeigen.** Die Warnung steht
wörtlich im Code: *„Eine Zahl aus einem fremden System sagt dem Leser
nichts, sieht aber aus wie eine Auskunft."* Sie **wandert** mit (als
Verknüpfung zum Spieler-Beitrag), sie **erscheint** nicht.

**Die Namensauflösung in drei Stufen**, in dieser Reihenfolge:

| | Quelle | heute |
|---|---|---|
| 1 | `sfv_zuordnung` → `mitglieder` → `personen.vorname + nachname` | 0 Treffer |
| 2 | WordPress-Spieler-Beitrag mit passender `sfv_person_id` | redaktionell |
| 3 | `Nr. <rueckennr>` | der Normalfall heute |

Stufe 1 liefert heute nichts und wird von selbst wirksam, sobald jemand
zuordnet — genau der „zusätzliche Blick" aus dem Auftrag. **Der Export
schickt in Stufe 1 einen Namen, sonst keinen**; WordPress entscheidet
zwischen 2 und 3. Damit bleibt der redaktionelle Name unangetastet,
solange niemand zugeordnet ist, und wird überschrieben, sobald doch —
mit dem Preis, den der Auftrag benennt.

**Voller Name, nicht abgekürzt** (Entscheid 22.08.): `personen.vorname`
und `personen.nachname` sind beide `NOT NULL` (`schema.sql:1559-1560`),
zusammengesetzt wie in `elternService.ts:51`. Ein Helfer dafür sollte
nicht ein viertes Mal entstehen.

### 6.3 Kein Verlauf ist der Normalfall

`hatVerlauf()` und `OHNE_VERLAUF_TEXT` stehen bereits
(`matchdatenAnzeige.ts`). Für die Website umformuliert — der bestehende
Satz ist für die Verwaltung geschrieben:

> Zu diesem Spiel liegt kein Spielverlauf vor. Das Resultat stammt aus
> dem Spielplan des Verbands.

⚠ **Der Stand kommt aus `spiele.resultat`, nie aus den Ereignissen** —
sonst würde aus „keine Ereignisse" ein „0:0". Das steht so im Auftrag
und ist im Code bereits als Warnung vermerkt.

### 6.4 ⚠ Welche Ereignistypen überhaupt hinausgehen — Allowlist

`bildeEreignis()` speichert **jeden** Typ, den der Verband liefert
(`matchdaten.ts:121`). Die Stammdaten kennen mindestens 19:

| Id | | Id | |
|---|---|---|---|
| 1 | Tor | 10 | Bemerkungen |
| 2 | Aus-/Einwechslung | 11 | Torschuss |
| 3 | Verwarnung | 13 | Spielinformationen |
| 4 | Ausschluss | 14 | Spielerbank |
| 5 | Torchance | 15 | **Strafen (Trainer, Funktionäre, Zuschauer)** |
| 9 | Assist | 16–19 | Offside, Abstoss, Einwurf, Flachschuss |

**Der Auftrag nennt vier: Tore, Assists, Wechsel, Karten.** Das ist
`typ_id IN (1, 9, 2, 3, 4)` und sonst nichts.

⚠ **Als Allowlist, nicht als Filter gegen die unerwünschten** — die
Projektregel gilt genau hier: was der Verband morgen als Typ 20 liefert,
ist im Zweifel nicht auf der Website. Typ 15 („Strafen (Trainer,
Funktionäre, Zuschauer)") ist das lebende Beispiel: er nennt Menschen,
die keine Spieler sind, und er stünde ohne Allowlist mit auf der Seite.

---

## 7 · Was der Export tut, wenn ein Team keine Kennung trägt

Der Auftrag stellt die Frage genau richtig: *„Anlegen kann er nicht,
überspringen wäre still. Wo sieht Didi, dass eine Zuordnung fehlt?"*

**Der Präzedenzfall steht bereits im Sync, in beide Richtungen.**

```ts
// sync.ts:167-168
erg.verwaiste_zuordnungen = (teamZeilen ?? [])
  .filter((t) => t.sfv_team_id != null && !eigene.has(Number(t.sfv_team_id))).length;

// sync.ts:203
if (!gebildet) { erg.spiele.ohne_team++; continue; }

// sync.ts:303
if (erg.verwaiste_zuordnungen > 0 || erg.spiele.nicht_mehr_geliefert > 0) erg.status = "warnung";
```

Und die Meldung nennt es im Klartext:
`"… Team-Zuordnung(en) zeigen ins Leere"`.

**Der Export macht dasselbe, gespiegelt.** Vier Zustände, alle vier
gezählt und benannt:

| Zustand | was der Export tut |
|---|---|
| WordPress-Team **ohne** `sfv_id` | überspringt seine Spiele, **zählt und nennt es namentlich** |
| WordPress-`sfv_id` **kennt ClubCampus nicht** | dito — und das ist der Alarm aus §2 |
| ClubCampus-Team **ohne** WordPress-Gegenstück | überspringt, zählt, nennt den ClubCampus-Namen |
| dieselbe `sfv_id` an **zwei** WordPress-Teams | **liefert an keines von beiden**, nennt beide Beitrags-Ids |

⚠ **Der vierte Fall folgt einer bestehenden Entscheidung, nicht meiner
Erfindung.** Der Sync macht es bei den Spielerpässen genauso:

> *„Mitglieder mit widersprüchlicher Zuordnung: zwei SFV-Personen, zwei
> Passnummern. Für sie wird NICHTS geschrieben — der Wert pendelte sonst
> bei jedem Lauf. Von Hand zu klären."* (`ergebnisTypen.ts`)

Genau dieselbe Begründung gilt für zwei Teams mit derselben `sfv_id` und
für zwei Spieler-Beiträge mit derselben `sfv_person_id`, nach der der
Auftrag fragt: **einen von beiden zu bedienen hiesse, bei jedem Lauf
womöglich den anderen zu bedienen.** Ein Wert, der pendelt, ist
schlimmer als ein Wert, der fehlt — er sieht nach Pflege aus.

### Kann WordPress die Doppelung verhindern?

**Nicht von selbst.** WordPress kennt keinen Unique-Index auf Postmeta —
`wp_postmeta` hat keinen, und ACF/Meta-Boxen bieten nichts dergleichen.
Es geht nur über einen `save_post`-Hook, der beim Speichern nachsieht und
das Feld zurückweist.

⚠ **Ein solcher Hook ist eine Zusage auf WordPress-Seite, und dort prüft
sie niemand** (siehe §12). Deshalb: **den Hook bauen, aber sich nicht auf
ihn verlassen.** Der Export prüft es unabhängig noch einmal — und das ist
nicht Doppelarbeit, sondern die einzige Prüfung, die ein Protokoll
hinterlässt.

### Wo Didi es sieht — drei Orte, absteigend nach Aufdringlichkeit

1. **Die Kachel in der Portalverwaltung** — Status `warnung` statt `ok`,
   samt Meldung. Sie liest `api_verbindungen.sync_status`, das der Export
   im selben `update` wie `letzter_sync` setzt.
2. **`api_sync_log.details`** — die Namen der betroffenen Teams,
   nachlesbar im Audit-Tab.
3. **Der Wächter** — nur, wenn es ein Ausfall wird, nicht bei einer
   Zuordnungslücke. Eine fehlende Zuordnung ist kein Ausfall des Laufs,
   und wer sie zu einem macht, stumpft den Alarm ab.

⚠ **Was der Export ausdrücklich NICHT tut: ein Team anlegen.** Didis
Vorgabe, und sie ist die richtige — sonst gäbe es zwei Wahrheiten über
die Frage, welche Mannschaft auf der Website erscheint, und die
Sichtbarkeit pro Mannschaft (die im Backend steht) wäre nicht mehr die
Entscheidung des Vereins.

---

## 8 · Wie gelöscht wird

Der Auftrag: *„Ein Abgleich, der nur schreibt und nie löscht, veraltet in
eine Richtung."* Richtig — nur ist der Auslöser ein anderer als vermutet
(§0.2).

### 8.1 Die vier Fälle, getrennt

| in ClubCampus | auf der Website |
|---|---|
| Status **12** („keine Publikation") | **erscheint gar nicht.** Nie exportiert |
| Status 3–11 (forfait … Saisonabbruch) | **bleibt stehen**, mit dem Zustand im Klartext |
| Zeile nicht mehr geliefert | bleibt stehen — sie steht ja auch in ClubCampus noch |
| WordPress-Beitrag, den der Export nicht mehr kennt | → **Entwurf**, nicht gelöscht |

⚠ **Status 12 ist die einzige echte Nichtveröffentlichung**, und sie ist
eine Anweisung des Verbands, keine Ansichtssache. Ein Spiel, das schon
auf der Website steht und danach auf 12 wechselt, muss **zurückgezogen**
werden — also der eine Fall, in dem der Export einen bestehenden Beitrag
aktiv auf Entwurf setzt.

⚠ **Ein verschobenes Spiel (6) zu löschen wäre falsch.** Es findet statt,
nur später. Auf der Website gehört „verschoben" hin, nicht nichts. Der
Klartext steht bereits in `spiele.status` (`matchStateName`), er muss nur
mitwandern.

### 8.2 Entwurf statt Löschen — und warum

Ein `spiel`-Beitrag, dessen `clubcampus_id` der Export nicht mehr
liefert, wird auf `draft` gesetzt, nicht entfernt. Drei Gründe:

1. **Ein halber Ausfall darf nichts wegräumen.** Der Sync hat diese Lehre
   schon gezogen, wörtlich (`sync.ts:230-232`): *„Abgleich JE GRUPPE,
   nicht je Saison. Liefert der SFV nur einen Teil, werden nur die
   gelieferten Gruppen bereinigt … Ein halber Ausfall kann so nichts
   wegräumen."* **Für den Export heisst das: abgeglichen wird je Team,
   und nur für Teams, zu denen der Lauf tatsächlich Spiele geliefert
   hat.**
2. Ein gelöschter Beitrag verliert seine Adresse. Verweise von aussen,
   aus Newslettern, aus Suchmaschinen laufen ins Leere.
3. Ein Entwurf ist **sichtbar**. Er steht im Backend mit einer
   Begründung, und wer ihn dort sieht, kann fragen. Ein gelöschter
   Beitrag hinterlässt nichts, worüber man fragen könnte.

⚠ **Der Preis: Entwürfe sammeln sich an, und niemand räumt sie weg.**
Deshalb zählt der Export sie und nennt die Zahl in der Meldung —
„3 Spiele zurückgezogen". Steigt sie unerwartet, ist das der Befund.

---

## 9 · Die Startseiten-Kachel

### 9.1 Woran „Gegner offen" von „der Abgleich hat versagt" zu unterscheiden ist

Der Auftrag fragt danach ausdrücklich. **Die Antwort liegt nicht im Feld,
sondern im Zeitstempel.**

Gemessen (§0.3): der Sync schreibt `gegner: gegnerName ?? ""` — leerer
String, nie `null`. Ein leeres Feld ist also eine **Aussage** des
Verbands („noch nicht ausgelost"), keine Lücke.

**Jeder exportierte Datensatz trägt deshalb den Zeitpunkt seines Laufs
mit.** Damit stehen der Vorlage drei unterscheidbare Lagen zur Verfügung:

| | Zustand | Kachel zeigt |
|---|---|---|
| Datensatz frisch, `gegner` leer | noch nicht ausgelost | **GEGNER OFFEN** |
| Datensatz frisch, `gegner` gesetzt | normal | der Gegner |
| Datensatz **älter als 24 h** | der Export läuft nicht | der letzte Stand, **und der Alarm geht an ClubCampus** |

⚠ **Der dritte Fall gehört NICHT auf die öffentliche Seite.** Ein
Besucher kann mit „die Daten sind alt" nichts anfangen; der Verein kann
es. Deshalb bleibt die Kachel stehen und zeigt, was sie hat — gemeldet
wird in ClubCampus, über den Wächter (§10). **Das ist der ganze Sinn des
Wanderns:** ein Tag Verzögerung ist belanglos, solange jemand es merkt.

### 9.2 Wenn es überhaupt kein Spiel mit Resultat gibt

Der Auftrag fragt nach einem Vorschlag für die linke Kachel.
**Symmetrisch zur rechten, damit die Startseite eine Sprache spricht:**

| | Titel | Satz |
|---|---|---|
| rechts (vorgegeben) | Keine Spiele angesetzt | Sobald der Verband den Spielplan aufschaltet, steht es hier. |
| **links (Vorschlag)** | **Noch kein Resultat** | **Sobald die erste Partie gespielt ist, steht sie hier.** |

Die Kachel verschwindet nie — dieselbe Begründung, die der Auftrag für
die rechte gibt: sonst verändert sich das Layout, und niemand weiss beim
ersten Mal, ob es ein Fehler ist.

⚠ **Und der Fall ist nicht hypothetisch, sondern jährlich:** in der
Sommerpause vor dem ersten Spiel einer neuen Saison hat die linke Kachel
das Resultat vom Frühling — der Auftrag will das ausdrücklich so. Der
leere Fall trifft die **erste** Saison und jeden neuen Verein, also genau
die Lage, in der niemand hinsieht.

### 9.3 Die Breite — nicht freigeben ohne Messung an echten Namen

Der Auftrag warnt: „Adrian Lustgarten 33." ist deutlich breiter als
„A. Lustgarten 33.", und der Verein hat mehrere lange Doppelnamen.

⚠ **Das ist eine Schwelle, und Schwellen sind nie durch einen Test
gedeckt** (`CLAUDE.md`). Die Prüfung gehört gegen die **längsten
tatsächlichen Namen**, nicht gegen einen erfundenen:

```sql
select p.vorname || ' ' || p.nachname as name,
       length(p.vorname || ' ' || p.nachname) as zeichen
  from public.personen p
  join public.mitglieder m on m.person_id = p.id and m.aktiv
 order by zeichen desc limit 10;
```

Und der echte Fall ist hier der **lange**, nicht der kurze — anders als
bei der Löschvorschau. Gehört zur Gestaltung, also nicht in diesen
Auftrag; die Zahl aber schon, damit sie beim Gestalten dasteht.

---

## 10 · Der Ausfall muss auffallen

### 10.1 ⚠ Der Wächter deckt den Export bereits ab — unter EINER Bedingung

Gemessen in `supabase/cron_sync_waechter.sql`:

```sql
for r in
  select v.id, v.verein_id, v.key, v.label, v.sync_status, v.letzter_sync, …
    from public.api_verbindungen v
   where v.active is true and v.auto_sync is true
loop
```

**Er ist nicht auf `football_ch` verdrahtet.** Er prüft jede Zeile mit
`active = true AND auto_sync = true` — auf `letzter_sync IS NULL`, auf
Alter > 120 Minuten und auf `sync_status = 'fehler'`. Eine zweite Zeile
`wordpress` ist damit **ohne eine Zeile Änderung** überwacht.

⚠ **UND GENAU DARIN LIEGT DIE FALLE, DIE DIESEN AUFTRAG ÜBERHAUPT
AUSGELÖST HAT.**

`migration_sfv_spielplan.sql` legt die SFV-Zeile mit `active = false` an
(„bleibt false, bis die Edge Function steht") — und niemand hat sie
nachgezogen, als sie stand. Sechs Tage grauer Stecker für einen
Anschluss, der stündlich lief (`CLAUDE.md`).

**Wird die `wordpress`-Zeile mit `active = false` angelegt, schaut der
Wächter sie nicht an.** Der Export könnte vom ersten Tag an ausfallen,
und der Wächter bliebe still — und Stille ist von Zufriedenheit nicht zu
unterscheiden. **Das ist wortwörtlich der Ausfall, gegen den dieser ganze
Auftrag geschrieben ist.**

**Also: die Migration legt die Zeile mit `active = true` und
`auto_sync = true` an, und die Zählprobe am Ende prüft genau das:**

```sql
if (select count(*) from public.api_verbindungen
     where key = 'wordpress' and active and auto_sync) <> 1 then
  raise exception 'UNVOLLSTAENDIG: wordpress-Zeile nicht ueberwacht';
end if;
```

⚠ **Nebenbefund für `CLAUDE.md`:** dort steht unter
„`api_verbindungen.active` und `auto_sync` — zwei Kennzeichen, zwei
Leser", `active` werde **nur von der Oberfläche** gelesen und die Edge
Function prüfe sie nirgends. Für die Edge Function stimmt das weiterhin
(`index.ts:113` filtert nur auf `auto_sync`). **Für die Datenbank nicht
mehr:** der Wächter vom 21.08.2026 liest `active` an zwei Stellen — in
der Schleifenbedingung und in `update … set wache_zuletzt = now() where
active is true`. Der Eintrag ist einen Tag zu alt und sollte berichtigt
werden; wer ihn heute liest, hält `active` für folgenlos und legt die
Zeile auf `false`.

### 10.2 `api_sync_log` passt — mit eigener Allowlist

Die Tabelle ist generisch (`verbindung_id`, `status`, `datensaetze_*`,
`meldung`, `details jsonb`). Keine eigene Tabelle nötig.

⚠ **`details` bekommt eine eigene Allowlist-Funktion, nicht die des
Syncs.** Das ist die Lehre vom 21.08.2026, an der 903 Klarnamen ins
Protokoll gerieten — und sie ist hier **schärfer als beim Sync**, weil
das Ergebnisobjekt des Exports Namen führen wird (Stufe 1 aus §6.2).

**Die Prüfung, die der Auftrag verlangt („wer einem Objekt ein Feld
hinzufügt, muss jeden Weg kennen"), ist mechanisch:**

```bash
grep -n "erg" supabase/functions/wp-export/index.ts   # jeder Ausgang
```

Für das Export-Ergebnis sind es **drei**, und jeder braucht seine eigene
Liste:

| Ausgang | Allowlist |
|---|---|
| `api_sync_log.details` | `fuersProtokoll()` — nur Zahlen und Team-Namen |
| Antwort an den Zeitplan (`pg_net` → `net._http_response`) | `fuerZeitplanAntwort()` — nur Zahlen |
| Antwort an den Browser (Aufruf aus der Kachel) | darf mehr, aber nicht alles |

⚠ **Und der Rumpf, der an WordPress geht, ist ein VIERTER Ausgang** — der
einzige, der den Verein wirklich verlässt. Er bekommt die strengste
Liste, Feld für Feld aus §11 abgeleitet, und **niemals einen Spread**.

### 10.3 Die Minute: **32**

| Minute | wer |
|---|---|
| 17 | SFV-Sync (`cron_sfv_sync.sql:113`) |
| **32** | **WordPress-Export** ← Vorschlag |
| 47 | Wächter (`cron_sync_waechter.sql`) |

Begründung:

- **Nach dem Sync, mit Abstand.** Der Sync darf bis 120 Sekunden
  brauchen; 15 Minuten sind das Siebenfache. Er sieht damit frische
  Daten.
- **Vor dem Wächter, mit Abstand.** Der Wächter prüft um :47 und würde
  einen gleichzeitig laufenden Export als Ausfall melden — genau der
  Fehler, den die Wahl von Minute 47 beim Sync vermeiden sollte.
- **Gleicher Abstand nach beiden Seiten** (15/15). Wird einer der beiden
  langsamer, bleibt in beide Richtungen Luft.
- Die 120-Minuten-Schwelle des Wächters passt unverändert: bei
  stündlichen Läufen um :32 ist `letzter_sync` beim Prüfen um :47
  höchstens 15 Minuten alt.

⚠ **Die Laufsperre des Exports ist eine eigene** (`sync_laeuft_seit` auf
seiner eigenen Zeile). Er berührt das SFV-Token nicht, es gibt also
keinen Grund, sich mit dem Sync gegenseitig auszusperren — und einen sehr
guten, es nicht zu tun: die Aktion `namen` beansprucht die SFV-Sperre bis
zu 15 Minuten (`index.ts:152`), und der Export dürfte davon nicht
abhängen.

---

## 11 · Die gesperrten Felder, Feld für Feld

Der Auftrag verlangt eine **Liste, keine Regel**. Vorbild ist
`api_verbindungen.sync_felder`, das im Projekt bereits als **Vertrag**
geführt wird, nicht als Dokumentation
(`migration_sfv_spielplan.sql:190-196`): was dort nicht steht, kommt gar
nicht erst in die Nutzlast.

**Der Export bekommt dieselbe Struktur** unter
`api_verbindungen.sync_felder` seiner eigenen Zeile — damit steht die
Liste an genau einem Ort und nicht doppelt in Code und Backend.

### CPT `spiel` — der Export besitzt ihn

| Feld | Quelle in ClubCampus | Backend |
|---|---|---|
| `clubcampus_id` | `spiele.id` (uuid, mit Präfix) | 🔒 gesperrt |
| `datum` | `spiele.date` | 🔒 |
| `zeit` | `spiele.zeit` | 🔒 |
| `team_sfv_id` | `spiele.sfv_team_id` | 🔒 |
| `gegner` | `spiele.gegner` | 🔒 |
| `heimspiel` | `spiele.heimspiel` | 🔒 |
| `spielort` | `spiele.venue` | 🔒 |
| `wettbewerb` | `spiele.wettbewerb` | 🔒 |
| `liga` | `spiele.liga` | 🔒 |
| `gruppe` | `spiele.sfv_gruppe` | 🔒 |
| `status` | `spiele.status` (Klartext) | 🔒 |
| `status_id` | `spiele.sfv_status` | 🔒 |
| `resultat` | `spiele.resultat` | 🔒 |
| `halbzeit` | `spiele.ht_resultat` | 🔒 ⚠ heute überall leer |
| `sfv_match_id` | `spiele.sfv_match_id` | 🔒 — trägt den Verweis |
| `sfv_spiel_nr` | `spiele.sfv_spiel_nr` | 🔒 |
| `ereignisse` | aufgelöst, §6 | 🔒 |
| `export_lauf` | Zeitpunkt des Laufs | 🔒 |
| — | — | |
| **`bericht`** (redaktioneller Matchbericht) | — | ✅ **frei** |
| **`bilder`** | — | ✅ frei |
| **Beitragsstatus** (Entwurf/veröffentlicht) | — | ⚠ **frei, aber §8** |

⚠ **Fünf ClubCampus-Felder, die auffallen, weil sie NICHT wandern:**

| Feld | warum nicht |
|---|---|
| `treffpunkt` | gehört dem Verein (`sync_felder → verein`), ist eine **interne** Angabe für die Mannschaft — nicht für die Öffentlichkeit |
| `notes` | dito, interne Notiz |
| `venue_addr` | gehört dem Verein; könnte wandern, ist aber nicht verlangt — **und ein Feld, das ohne Auftrag mitwandert, ist genau der Fehler, vor dem die Allowlist-Regel warnt** |
| `spiel_nr` | die vereinseigene Nummer. ⚠ **Sie hat noch nie einen Wert getragen** (`CLAUDE.md`: 0 von 269) — sie zu exportieren hiesse, eine leere Spalte zu veröffentlichen |
| `schiedsrichter`, `delegierter`, `zuschauer` | gehören dem Verein, nicht verlangt |

⚠ **`ht_resultat` steht in der Liste, obwohl es heute leer ist.** Das ist
Absicht und gehört benannt: `CLAUDE.md` hält fest, dass `holeMatch` den
Halbzeitstand liefert und weggeworfen wird. Wird das behoben, füllt sich
das Feld ohne Änderung am Export. **Solange es leer ist, darf die Vorlage
daraus nichts machen** — kein „0:0", keine leere Klammer.

### CPT `team` — die Redaktion besitzt ihn, ganz

| Feld | Backend |
|---|---|
| `sfv_id` | ✅ **frei — und das ist der Kern.** Es ist die Verknüpfung, und sie ist eine redaktionelle Entscheidung |
| Name, Beschreibung, Bild, Trainer, Reihenfolge | ✅ frei |
| **Sichtbarkeit auf der Website** | ✅ **frei — der Export fasst sie nie an** |
| `clubcampus_id` | ⚠ **entfällt** — siehe §3.2 |

**Der Export schreibt in `team` kein einziges Feld.** Deshalb steht hier
kein einziges 🔒 — und deshalb ist die Sichtbarkeit pro Mannschaft
sicher.

### CPT `spieler` — geteilt, und die Grenze ist scharf

| Feld | Quelle | Backend |
|---|---|---|
| `sfv_spieler_id` | — | ✅ **frei** — die Verknüpfung, redaktionell |
| Name | — | ✅ frei ⚠ bis zur Zuordnung (§6.2) |
| Foto, Vorstellungstext | — | ✅ frei |
| `einsaetze` | `baueStatistik()` | 🔒 |
| `minuten` | dito | 🔒 |
| `spiele_mit_verlauf` | dito | 🔒 ⚠ siehe unten |
| `tore` | dito | 🔒 |
| `assists` | `typ_id = 9` | 🔒 |
| `verwarnungen` | dito | 🔒 |
| `ausschluesse` | dito | 🔒 |
| `rueckennummern` | `spiel_aufstellung.rueckennr` | 🔒 |
| `position` | `spiel_aufstellung.position_name` | 🔒 |
| `export_lauf` | | 🔒 |

⚠ **`spiele_mit_verlauf` wandert mit, obwohl niemand danach gefragt hat
— und zwar aus einem Grund, der im Code schon steht:**

> *„Einsätze und Minuten liefert der SFV zu jedem Spiel. Tore und Karten
> nur dort, wo er einen Spielverlauf erfasst hat … Eine 0 bei den Toren
> kann deshalb auch heissen: nicht erfasst."* (`STATISTIK_HINWEIS`)

**Bei rund vier von zehn Spielen fehlt der Verlauf.** Ohne diese Zahl
zeigt die Website „14 Einsätze, 0 Tore" für einen Stürmer, der getroffen
hat. Die Zahl muss nicht angezeigt werden — sie muss **da** sein, damit
die Vorlage später entscheiden kann. Ein Feld nachzureichen ist teurer
als eines mitzuschicken.

### Rangliste

Alle Felder 🔒. Nichts davon ist redaktionell — sie gehört dem Verband.

---

## 12 · Was auf WordPress-Seite liegt

Der Auftrag verlangt es ausdrücklich: **dort gibt es keinen Typecheck,
keine Testkette und keinen Compiler.** Was hier steht, prüft niemand
ausser einem Menschen.

| | was | Risiko, wenn es still falsch ist |
|---|---|---|
| 1 | **REST-Endpunkte** für `spiel` und die Rangliste (Empfang) | ein Feld, das der Export schickt und WordPress verwirft — **kein Fehler, nur ein leeres Feld auf der Seite** |
| 2 | **Die Sperren** aus §11 (`readonly` im Editor) | die gefährlichste Stelle: eine fehlende Sperre gibt zwei Wahrheiten, und der Abgleich überschreibt lautlos |
| 3 | **`save_post`-Hook** gegen doppelte `sfv_id` / `sfv_person_id` | greift nicht → der Export fängt es (§7), aber erst beim Lauf |
| 4 | **Abgleich-Empfänger**: Set entgegennehmen, Fehlende auf Entwurf | ⚠ **hier entsteht Datenverlust, wenn er zu viel wegräumt** |
| 5 | **Speicher der Rangliste** (§5) | unsichtbar im Backend, also nur über die Kachel prüfbar |
| 6 | **Vorlagen** (nicht Teil dieses Auftrags) | — |
| 7 | **Application Password** für den Export-Benutzer | ⚠ ein Konto mit Schreibrecht auf `spiel`, **sonst nichts** |

⚠ **Zu 7, und das ist keine Formalie:** der Export-Benutzer bekommt eine
eigene Rolle mit genau den Rechten, die §11 verlangt — `spiel` schreiben,
`team` **lesen**, Rangliste schreiben. Kein `edit_others_posts`, kein
`manage_options`. Die Website hatte im August einen Einbruch; ein
Application Password mit Administratorrechten in einem Supabase-Secret
wäre ein zweiter Weg hinein, der niemandem auffällt.

⚠ **Zu 4, der teuerste Fehler dieses Vorhabens:** ein Abgleich-Empfänger,
der ein unvollständiges Set als vollständig behandelt, setzt den halben
Spielplan auf Entwurf. **Der Schutz gehört auf beide Seiten:** der Export
sendet je Team ein ausdrücklich als vollständig gekennzeichnetes Set, und
WordPress räumt **nur** innerhalb der Teams auf, die im Set vorkommen.
Das ist genau die Lehre aus `sync.ts:230` — nur diesmal in einer Sprache,
die niemand prüft.

⚠ **Und zu 2 — die Sperre ist eine Zusage über eine ANDERE Stelle.**
`CLAUDE.md` führt vier Fälle vom 23.08.2026, in denen ein Kommentar eine
andere Stelle zusicherte und danebenlag. Ein `readonly` im
WordPress-Editor ist genau so eine Zusage: **der Export verlässt sich
darauf, dass niemand das Feld ändert, und prüft es nie nach.** Er
überschreibt ohnehin — der Schaden ist also nicht Datenverlust, sondern
verlorene Arbeit einer Person, die etwas eingetragen hat und beim
nächsten Lauf nichts mehr davon findet, ohne eine Meldung. **Deshalb
gehört zu jeder Sperre ein sichtbarer Hinweis im Editor**, nicht nur ein
graues Feld: *„Kommt aus ClubCampus, wird stündlich überschrieben."*

---

## 13 · Etappen

Ohne die Gestaltung — die ist ausdrücklich nicht Teil des Auftrags.

| | | prüfbar woran |
|---|---|---|
| ~~0~~ | ~~Die `t=`-Frage~~ | ✅ **erledigt 05.09.2026**, siehe §2 |
| **0b** | **Trockenlauf: trägt der Import von `matchdatenAnzeige.ts` in eine Edge Function?** (§4.1) | `supabase functions deploy` |
| 1 | Migration: Zeile `wordpress` in `api_verbindungen`, `active = true`, `auto_sync = true`, `sync_felder` nach §11, mit Zählprobe | `BEGIN … ROLLBACK` |
| 2 | Edge Function `wp-export`, Aktion `probe` — **liest, sendet nichts, gibt zurück, was sie senden würde** | Gegenlesen im Scratchpad |
| 3 | WordPress: Endpunkte, Sperren, Abgleich-Empfänger (§12) | von Hand — es prüft dort niemand |
| 4 | Aktion `export`, scharf, **ein Team**, von Hand ausgelöst | die Website |
| 5 | Alle Teams, von Hand | `api_sync_log` |
| 6 | Zeitplan auf Minute 32 + Probelauf des gespeicherten Befehls | `do $probe$ … execute c; rollback` |
| 7 | Kachel in `ApiTab` (§15) | die Kachel |

⚠ **Etappe 2 vor Etappe 3, und die Reihenfolge ist nicht beliebig.** Die
Probe zeigt die vollständige Nutzlast, bevor irgendetwas sie empfängt —
und zwar in eine Datei, die gegengelesen wird. Genau so ist am
19.08.2026 die Denylist aufgeflogen, die 32 Klarnamen durchgelassen
hätte: *„Gefangen wurde es nur, weil die Datei zuerst in den Scratchpad
geschrieben und dort gegengelesen wurde."* Der Export schickt Namen von
Junioren auf eine öffentliche Website. **Das ist der Lauf, den man einmal
von Hand liest.**

⚠ **Und Etappe 0 gehört wirklich zuerst.** Liegt §2 falsch, ändert sich
die Verknüpfung — also Etappe 1, 2, 3 und 4. Danach wäre es ein Umbau
statt einer Entscheidung; das ist die Formulierung des Auftrags, und sie
trifft genau hier zu.

---

## 14 · Was ich nicht messen konnte

**Zwei Dinge, und ich nenne sie, statt sie zu schätzen.**

### 14.1 Die Bestandszahlen

Es gibt in dieser Sitzung keine Datenbankverbindung: kein `psql`, keine
Zugangsdaten in `.env.local` (nur `VITE_SUPABASE_URL` und der Anon-Key),
und der Supabase-MCP verlangt eine OAuth-Anmeldung, die Didi selbst
durchführen müsste.

Die Zahlen im Plan stammen deshalb aus `CLAUDE.md` und sind **Stände von
damals, keine Messungen von heute**. Sie gehören vor Etappe 1
nachgezählt — mit dem Reflex, den `CLAUDE.md` verlangt: als Behauptung,
die widerlegt werden darf.

```sql
-- Wie viele Teams sind ueberhaupt zugeordnet? (ohne Zuordnung kein Export)
select count(*) filter (where sfv_team_id is not null) as zugeordnet,
       count(*)                                        as teams_gesamt
  from public.teams
 where verein_id = (select id from public.vereine where slug = 'fcherrliberg');

-- Wie verteilen sich die Spielzustaende? ⚠ Status 12 ist die Frage aus 0.2
select sfv_status, status, count(*) from public.spiele group by 1, 2 order by 1;

-- Wie viele Spiele haben ueberhaupt einen Verlauf? (6.3, „4 von 10")
select count(distinct spiel_id) as mit_verlauf,
       (select count(*) from public.spiele where sfv_status = 2) as ausgetragen
  from public.spiel_ereignisse where herkunft = 'sfv';

-- Steht wirklich noch niemand zugeordnet? (6.2)
select (select count(*) from public.sfv_zuordnung)                          as zugeordnet,
       (select count(distinct sfv_person_id) from public.spiel_aufstellung) as offen;

-- Gibt es Vereins-Korrekturen, die die Aufloesung ueberhaupt betreffen?
select herkunft, count(*) from public.spiel_ereignisse group by 1;

-- Die laengsten Namen, fuer die Kachelbreite (9.3)
select p.vorname || ' ' || p.nachname            as name,
       length(p.vorname || ' ' || p.nachname)    as zeichen
  from public.personen p
  join public.mitglieder m on m.person_id = p.id and m.aktiv
 order by zeichen desc limit 10;
```

⚠ **Die vierte Abfrage ist die wichtigste.** Steht dort nicht `0`, ist
die Grundlage von §6.2 falsch — und dann liefert die `namen`-Aktion nur
noch die Restmenge, mit der Falle, vor der der Auftrag warnt.

### 14.2 ~~Die `t=`-Frage~~ — erledigt

✅ Belegt am 05.09.2026, siehe §2. Bleibt hier stehen, damit sichtbar
ist, dass sie eine offene Messung **war** — und woran ich sie nicht
selbst erledigen konnte.

---

## 15 · Zwei Nebenbefunde in `ApiTab`

Beim Messen aufgefallen, beide betreffen die zweite Kachel.

**1 · ⚠ Eine zweite aktive Verbindung bekommt heute einen toten Knopf.**

```tsx
// ApiTab.tsx:178-181
{api.active && api.key === "football_ch"
  ? <Btn … onClick={syncStarten} …>Sync starten</Btn>
  : api.active && <Btn … onClick={()=>{}}>Sync starten</Btn>}
//                          ^^^^^^^^^^^ tut nichts
```

Sobald die `wordpress`-Zeile auf `active = true` steht — und §10.1
verlangt genau das —, rendert die Kachel einen Knopf „Sync starten", der
nichts tut. Kein Fehler, keine Meldung. Dasselbe gilt für
„Konfigurieren" (`:190`).

**Der Knopf braucht einen zweiten Zweig, oder er darf nicht erscheinen.**
Ein Knopf, der nichts tut, ist schlimmer als keiner: wer ihn drückt und
nichts passiert, sucht den Fehler beim Export.

**2 · `API_INFOS` ist eine feste Liste im Code** (`portalUtils.ts:21`).
Die Kachel braucht dort einen Eintrag `wordpress`, sonst rendert sie ohne
Beschreibung und ohne die Zeile „Synchronisierte Daten". Kein Defekt —
nur eine Stelle, die man sonst vergisst, weil alles andere generisch ist.

⚠ **Was die Kachel dagegen ohne Änderung kann:** Status-Chip, „Letzter
Sync", **und die Wächter-Zeile** (`:170-176`) — samt der richtigen
Anzeige „— noch nie gelaufen", wenn nichts da ist. Genau die vier
Angaben, die der Auftrag verlangt, kommen aus derselben Quelle wie der
Wächter. Es braucht **keine** zweite Zählung.

---

## 16 · Wonach ich nicht gefragt wurde, was aber dazugehört

Drei Dinge, die beim Messen aufgefallen sind und die ich nicht
stillschweigend übergehen will.

**1 · ⚠ Status 12 („keine Publikation") ist bisher nirgends bedacht.**
Weder im Auftrag noch im Code noch in `CLAUDE.md`. Der Sync speichert den
Zustand brav in `sfv_status`, und niemand liest ihn. Solange die Daten in
ClubCampus bleiben, ist das folgenlos. **Mit diesem Auftrag hört es auf,
folgenlos zu sein** — es ist die erste Veröffentlichung nach aussen.

**2 · `spielService.fetchSpiele` verschluckt `error`.**

```ts
const { data, error } = await frage;
if (error) return [];        // spielService.ts:25-26
```

Aus einem Datenbankfehler wird „keine Spiele" — der Fall, den `CLAUDE.md`
mit `fetchKinderVollstaendigFuerElternteil` ausführlich beschreibt (zwei
Wochen unbemerkt). **Der Export darf dieses Muster nicht erben:** er
liest dieselben Tabellen, und bei ihm hiesse ein verschluckter Fehler,
dass er einen halben Spielplan als vollständig meldet — und WordPress
räumt den Rest auf Entwurf (§8.2). Aus einem verschluckten `error` würde
damit **zurückgezogener Inhalt auf einer öffentlichen Seite.** Das ist
die schwerste Folge, die dieses Muster im Projekt bisher hätte.

**4 · ⚠ Ein NUL-Byte macht eine `.ts`-Datei für `grep` unsichtbar.**

`src/domains/spiele/spielerAusgabe.ts` enthält an **Zeile 100** ein rohes
NUL-Byte (0x00) in einem Stringliteral:

```ts
let letztesTeam = " ";   // als BYTE geschrieben, nicht als Escape
```

Gemessen: 7605 Bytes, davon genau eines ein NUL. Kein BOM, sonst sauberes
UTF-8.

| | |
|---|---|
| **Funktional** | harmlos — es ist ein Wächterwert, den kein Mannschaftsname trifft |
| **Für Werkzeuge** | ⚠ `grep` hält die Datei für **binär** und überspringt sie |

⚠ **Der Schaden ist nicht theoretisch: ich bin am 05.09.2026 selbst
darauf hereingefallen.** Bei der Bestandsaufnahme habe ich mit
`grep -rniE "wordpress|wp_post|wp-json" src/` nach bestehenden
WordPress-Pfaden gesucht. Die Datei kam als
`Binary file … matches` zurück — **ohne eine einzige Trefferzeile**.
Damit habe ich den existierenden WXR-Export übersehen und den Plan
geschrieben, als gäbe es ihn nicht.

Dieselbe Familie wie die UTF-16-Typdatei vom 20.08.2026: *„Git hielt die
Datei für binär …, `grep` fand nichts darin, und Build wie Typecheck
liefen trotzdem durch."* Auch hier laufen `tsc`, Build und alle 854 Tests
grün — **es fehlt etwas, und nichts meldet es.**

**Der Fix ist ein Zeichen und verhaltensneutral:** das Byte durch die
Escape-Folge ` ` ersetzen. Der Laufzeitwert ist identisch, die Datei
wird ASCII-sicher, `grep` sieht sie wieder.

⚠ **Nicht angefasst** — es ist eine Quelltextänderung ausserhalb von
Etappe 1. Zum Nachprüfen:

```bash
python -c "d=open('src/domains/spiele/spielerAusgabe.ts','rb').read(); print(d.count(b' '))"
```

**3 · Der Auftrag lässt eine Zahl unbeantwortet, die gemessen werden
sollte, bevor jemand die Kachel liest:** wie viele Ereignisse überhaupt
vom Verein korrigiert sind. Ist es null, läuft die ganze
Korrektur-Auflösung (§4.1) im Leerlauf — sie wäre trotzdem richtig
angeschlossen, aber niemand hätte je gesehen, dass sie wirkt. Die Abfrage
steht in §14.1.

---

## Zusammenfassung in einem Satz je Frage

| Frage des Auftrags | Antwort |
|---|---|
| Welches Feld trägt die Verknüpfung? | `spiele.sfv_team_id` → `teams.sfv_team_id`. **Nicht** `spiele.team` — das ist ein Abbild, das sich stündlich neu ausrichtet |
| Gibt es eine `teams`-Tabelle? | Ja, mit `id bigint` — der Auftrag hat die Id-Typen von `teams` und `spiele` vertauscht |
| Stimmt `sfv_team_id` mit `t=`? | ✅ **Ja, belegt am 05.09.2026** mit Gegenprobe (38309 → FC Herrliberg a, 37931 → FC Küsnacht a). `team.sfv_id` ist die Verknüpfung |
| Team ohne Kennung? | Nie anlegen, nie still überspringen: zählen, namentlich nennen, `status = 'warnung'`. Doppelte Kennung → **keines von beiden** bedienen |
| Gegnerische Tore ohne Schützen? | Der Mannschaftsname tritt an die Stelle der Person. Kein Erklärsatz |
| Abgesagte Spiele? | Sie verschwinden nie — es gibt keinen Löschpfad. „Abgesagt" sind zwölf Zustände, und **Status 12 heisst „keine Publikation"** |
| Gesperrte Felder? | §11, Feld für Feld, als `sync_felder`-Vertrag |
| Rangliste als CPT? | Nein — und auch kein Feld am `team`. Eigener Speicher je Gruppe |
| Wie wird gelöscht? | Entwurf statt Löschen, je Team, nur für gelieferte Teams |
| Wer schreibt? | Edge Function `wp-export`, Zugang in den Secrets |
| Takt? | Minute 32 — 15 nach dem Sync, 15 vor dem Wächter |
| Ausfall? | `api_verbindungen`-Zeile **mit `active = true`**, sonst schaut der Wächter nicht hin |
