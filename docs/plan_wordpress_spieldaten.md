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

✅ **Der Widerspruch in der InfoBox ist behoben (07.09.2026).** Sie sagte
*„Die Adresse des Anschlusses steht in api_verbindungen.api_url"* — für die
WordPress-Zeile stimmte das nicht. Sie nennt jetzt beide Fälle und schliesst
mit dem Satz, auf den es ankommt: **wohin ein Lauf tatsächlich geschrieben
hat, sagt seine Meldung, nicht die Konfiguration.**

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
einen mit dieser `sfv_match_id`?"), nicht indem er sich etwas merkt. Er ist
damit zustandslos, und der Wechsel ist wirklich ein `secrets set`.

> ⚠ **BERICHTIGT AM 07.09.2026 — hier stand ein Halbsatz zu viel.** Er
> lautete: *„die neue Seite hat keine Beiträge, die Abfrage findet nichts,
> der Export legt an."* Das folgte aus einer Annahme, die Didi am
> 07.09.2026 richtiggestellt hat: **`dev.fcherrliberg.ch` WIRD zu
> `fcherrliberg.ch`.** Es sind nicht zwei Seiten, sondern eine unter
> vorläufigem Namen — es wechselt die Adresse, nicht die Installation.
>
> **Die Zustandslosigkeit selbst bleibt richtig und bleibt wertvoll**, nur
> aus einem anderen Grund als hier stand: nicht weil sie einen Neuanfang
> verträgt, sondern weil sie **keinen braucht**. Es gibt nichts, was auf
> eine Adresse zeigt und nachgezogen werden müsste.

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

> ⚠⚠ **DIESER ABSCHNITT STAND AUF EINER FALSCHEN ANNAHME UND IST AM
> 07.09.2026 NEU GESCHRIEBEN.** Er beschrieb einen Umzug von einer Seite
> auf eine andere. Didis Richtigstellung:
>
> > *„dev.fcherrliberg.ch WIRD zu fcherrliberg.ch, sobald alles läuft. Es
> > ist keine Testumgebung, sondern dieselbe Installation unter
> > vorläufigem Namen."*
>
> **Eine Umbenennung, kein Umzug.** Was hier stand, war nicht bloss
> ungenau — es war in der entscheidenden Zeile das Gegenteil: „Beiträge
> auf der neuen Seite: keine". Der alte Wortlaut steht in git.

**Frage von Didi: braucht es einen Anstoss von Hand, oder reicht die
Stunde?**

| | |
|---|---|
| Beiträge | **bleiben** — es ist dieselbe Datenbank, derselbe Beitrag, dieselbe Id |
| `team.sfv_id`, `spieler.sfv_person_id` (Redaktion) | **bleiben** |
| Anwendungspasswort und Export-Benutzer | **bleiben** — sie hängen am Benutzer, nicht an der Adresse |
| es wechselt | **die Adresse, sonst nichts** |

**Damit ist der Wechsel funktional ein Nicht-Ereignis für den Export.**
Selbst wenn nach dem `secrets set` tagelang kein Lauf käme, stünde die
Website vollständig da — sie steht ja schon.

⚠ **Trotzdem einen Lauf von Hand anstossen, und der Grund hat sich
verschoben.** Vorher war es „die neue Seite ist leer"; das gilt nicht
mehr. Was bleibt, ist die Prüfung des Secrets selbst: **greift die neue
Adresse, und welchen Host nennt die Meldung?** Ein `secrets set`, das nicht
gegriffen hat, sieht ohne Lauf genauso aus wie eines, das gegriffen hat —
der Export schriebe weiter unter dem alten Namen, und weil es dieselbe
Installation ist, **würde das sogar funktionieren**. Es fiele nie auf.

> ⚠ **Das ist die eine Stelle, an der die Umbenennung den Wechsel
> GEFÄHRLICHER macht statt harmloser.** Bei zwei getrennten Seiten wäre ein
> vergessenes `secrets set` sofort sichtbar gewesen: die neue Seite bliebe
> leer. Bei einer umbenannten Installation antwortet die alte Adresse
> weiter (Weiterleitung oder Alias), der Export läuft grün durch, und
> `sync_meldung` nennt weiter `dev.fcherrliberg.ch` — die einzige Stelle,
> an der es steht. **Der Zähler ist der Ziel-Host in der Meldung, und
> genau deshalb steht er dort.**

⚠ **Trotzdem von Hand anstossen, und zwar nicht wegen der Zeit.** Der
erste Lauf gegen eine neue Zielseite ist der, bei dem man zusieht — genau
wie Etappe 4 im Plan. Er beantwortet drei Fragen auf einmal: greift das
neue Secret, stimmt die Adresse, und **welchen Host nennt die Meldung**.

⚠ **Und dafür fehlt heute der Knopf.** „Sync starten" ist auf
`football_ch` verdrahtet; jede andere aktive Verbindung bekommt einen
Knopf mit `onClick={()=>{}}` (§15). Der zweite Zweig gehört damit zu
Etappe 7 — oder der Anstoss läuft über einen `curl` gegen die Function.

⚠ **Was der Wechsel NICHT mitbringt — die Liste ist am 07.09.2026 von
drei auf einen geschrumpft, und der eine ist nicht technisch:**

| stand hier | gilt noch? |
|---|---|
| „die redaktionelle Zuordnung ist seitengebunden" | ❌ **entfällt** — `team.sfv_id` und `spieler.sfv_person_id` bleiben, es ist dieselbe Datenbank |
| „hat die neue Seite schon Spiel-Beiträge, setzt der Abgleich sie auf Entwurf" | ❌ **entfällt als Überraschung** — sie hat welche, und es sind die eigenen. Der Abgleich erkennt sie an der `sfv_match_id` und aktualisiert |
| „die alte Seite friert ein" | ❌ **entfällt ganz** — es gibt keine alte Seite. Siehe §4.6 |

**Der eine, der bleibt, ist neu und ist der schwerste:**

⚠⚠ **ALLES, WAS HEUTE AUF DER SEITE ENTSTEHT, IST NACH DEM WECHSEL
ÖFFENTLICH.** Nicht „war mal auf einer Testseite" — es steht dann unter
dem richtigen Namen, ohne dass jemand es dorthin gestellt hätte. Eigener
Abschnitt: §4.5b.

---

## 4.5b ⚠ Was heute entsteht, ist später öffentlich — woran man es erkennt

**Didis Punkt vom 07.09.2026, und er folgt direkt aus der Umbenennung:**

> *„Testbeiträge, halbe Läufe, Dubletten aus Probeläufen — das räumt
> niemand weg, wenn es beim Umschalten niemand weiss."*

Richtig, und die Antwort zerfällt in zwei ungleiche Hälften: eine, die
sich als Sorge auflöst, und eine, die bleibt.

### 1 · Es gibt keine Beiträge aus Probeläufen — die Probe schreibt nichts

Nicht „wenig", nicht „nur Entwürfe": **nichts.** Belegt im Code, an drei
Stellen zugleich:

| | |
|---|---|
| `laufeProbe()` | liest ausschliesslich — kein `insert`, kein `update`, kein `fetch` nach aussen |
| der einzige Schreibpfad | `sendeAnWordpress()`, und der wird nur für `aktion === "export"` erreicht (`index.ts:148`) |
| `protokoll()` | schreibt nach `console.log`, nicht in eine Tabelle (`sfv-sync/protokoll.ts:53`) |

Die Probe endet mit `return json(erg)` — die Nutzlast geht an den Browser
dessen, der sie ausgelöst hat, und sonst nirgendwohin. Das war ihr ganzer
Zweck (§13, Etappe 2): **einmal von Hand lesen, bevor etwas empfängt.**

⚠ **Der Begriff „Probelauf" ist deshalb zweideutig, und die Zweideutigkeit
ist gefährlich.** `aktion: 'probe'` schreibt nichts. Ein *scharfer* Lauf,
den jemand „zur Probe" macht, schreibt alles — er heisst `export`, und die
Beiträge daraus sind so echt wie alle späteren. **Was auf der Seite steht,
stammt aus `export`-Läufen, ausnahmslos.**

### 1b ⚠ Woran ein PROBELAUF zu erkennen ist — heute: gar nicht

**Didis Frage vom 07.09.2026, und die Antwort ist unbequem.** Ein Beitrag
aus einem Testlauf ist von einem aus einem echten Lauf **nicht zu
unterscheiden** — und die zwei Merkmale, die man dafür nehmen würde, sind
beide falsch:

| Kandidat | warum er nicht taugt |
|---|---|
| **der Inhalt** | jeder Lauf schreibt dieselben Felder. Er ist auch nicht *falsch*: jeder Lauf sendet den vollen Satz je Mannschaft |
| **`post_modified`** | ⚠ **bewegt sich beim Auffrischen NICHT.** `cc_schreibe_felder()` schreibt über `update_field()`, also reines Postmeta; `post_modified` rührt nur `wp_update_post` an — und das läuft nur bei einer **Titeländerung** oder beim Rückzug. Ein Beitrag, den der Export einen Monat lang täglich auffrischt, trägt weiter das Datum vom ersten Tag |

⚠ **Der zweite ist die gefährlichere Hälfte.** `post_modified` steht in
jeder WordPress-Liste, heißt „Zuletzt geändert" und misst hier etwas
anderes. **Ein Zeitstempel, der plausibel aussieht und die falsche Frage
beantwortet, ist schlimmer als keiner** — dieselbe Familie wie der
Namenszähler, der 431 statt 0 meldete.

Zuverlässig ist allein **`post_date`**: `wp_insert_post` setzt es, und es
sagt genau, wann der Export den Beitrag angelegt hat.

#### Die Reparatur: der Laufstempel

`lauf` steht **seit dem ersten Entwurf in der Nutzlast und wurde nie
gelesen**. Seit dem 07.09.2026 schreibt das Plugin ihn bei jedem
Schreibvorgang als Postmeta:

| | |
|---|---|
| `_cc_lauf` | Zeitstempel des **letzten** Laufs, der den Beitrag angefasst hat |
| `_cc_lauf_erst` | der des **ersten** — wird nie überschrieben |

⚠ **Und das FEHLEN ist die Aussage.** Ein Beitrag ohne `_cc_lauf` ist seit
dem Einspielen dieser Fassung von keinem Lauf mehr berührt worden — also
aus der Erprobung und seither nicht aufgefrischt, **oder eine Waise**:
seine Mannschaft wird nicht mehr exportiert.

⚠ **Die Grenze ist das Einspielen, nicht der 07.09.2026.** Läuft der Export
vorher noch einmal, bleiben auch diese Beiträge ungestempelt — richtig so:
nachträglich weiß niemand, aus welchem Lauf sie stammen. **Ein Datum in
den Code zu schreiben wäre eine Behauptung über einen Zeitpunkt, den der
Code nicht kennt.**

⚠ **Die Menge schrumpft von selbst, und das ist die eigentliche
Eigenschaft.** Wen ein echter Lauf berührt, der fällt heraus —
richtigerweise, denn dann ist sein Inhalt aktuell. Nach einem vollen Lauf
(Etappe 5) bleibt genau das übrig, **was niemand mehr pflegt**. Keine
Schwelle, die jemand raten müsste, kein Stichtag, der veraltet.

#### Die Liste: `aktion: "bestand"`

**Sie zeigt. Sie löscht nicht.** GET, keine Sammelaktion, kein Knopf, der
zwanzig Beiträge wegräumt — jede Zeile trägt ihre `bearbeiten_url`, und
entschieden wird pro Beitrag im WordPress-Backend.

```js
await wpExport('bestand');    // ändert nichts, protokolliert nichts
```

| Feld je Zeile | |
|---|---|
| `ohne_laufstempel` | ⚠ **das fragliche Merkmal** |
| `status` | eine Waise im Entwurf sieht niemand; eine veröffentlichte steht auf der Website und sieht aktuell aus |
| `angelegt` | `post_date` — das Datum, nach dem du gefragt hast |
| `lauf_zuletzt` / `lauf_erst` | leer, solange ungestempelt |
| `beitrag_id`, `titel`, `team`, `sfv_match_id`, `bearbeiten_url` | zum Entscheiden |

Dazu vier Zahlen, die **aufgehen müssen**: `gesamt`,
`ohne_laufstempel` + `mit_laufstempel`, `zaehlung_stimmt` — und
**`handbeitraege`** als Gegenprobe auf die Besitzregel. Steigt die letzte,
hat der Export einen Handbeitrag übernommen, was er nicht darf.

⚠ **Ungekürzt, absichtlich.** Wer entscheiden soll, muss alle sehen —
dieselbe Lehre wie bei der Löschvorschau, deren Schwelle von 20 bei einem
Stapel von zwei umfiel.

⚠ **Sie schreibt auch nicht nach `api_sync_log`.** Ein Nachsehen ist kein
Lauf; stünde es im Protokoll, verschiebe es `letzter_sync`, und die Kachel
meldete einen Export, den es nie gab.

Gehalten von `src/domains/spiele/__tests__/wpExportBestand.test.ts` — zehn
Strukturprüfungen auf beide Quelltexte, gegengeprobt: mit gebrochener
Zusage (POST, `.slice(0,20)`, `post_modified`) sind drei davon rot.

### 2 · Woran ein Beitrag des Exports zu erkennen ist — drei Wege

| | wo | Aussagekraft |
|---|---|---|
| **`sfv_match_id`** gesetzt | Postmeta | ⚠ **das Besitzmerkmal.** Ein Beitrag ohne sie wird vom Export nie angefasst — das ist die Regel, die die 11 Handbeiträge schützt |
| Spalte **„Quelle"** | Spieleliste im Backend, Pille `ClubCampus` / `WordPress` | ohne SQL sichtbar — ⚠ aber `quelle` ist ein **Etikett**, das jemand ändern kann. Es zeigt, was gemeint war, nicht wem der Beitrag gehört |
| **`api_sync_log`** | ClubCampus | das Protokoll: welcher Lauf, wann, welches Team, wie viele neu/aktualisiert, welche Warnungen |

Die Spalte gibt es bereits (`Listen/spalten.php:441` → `fch_core_liste_quelle`
in `Listen/darstellung.php:136`); sie war nicht für diesen Zweck gedacht und
beantwortet ihn trotzdem.

**Die Abfrage, die sagt, was gelaufen ist — jeder scharfe Lauf steht darin:**

```sql
select gestartet_am at time zone 'Europe/Zurich' as zeit,
       status,
       details->>'ziel_host'  as ziel,
       details->>'team'       as team,
       details->>'neu'        as neu,
       details->>'aktualisiert' as akt,
       details->>'zurueckgezogen' as zurueck,
       details->'fehler'            as fehler,
       details->'ohne_team'         as ohne_team,
       details->'doppelte_teams'    as doppelte_teams,
       details->'moegliche_dubletten' as dubletten
  from public.api_sync_log
 where verbindung_id = (select id from public.api_verbindungen where key = 'wordpress')
 order by gestartet_am desc;
```

### 3 · Was ein wiederholter Lauf NICHT anrichtet — und das ist die gute Hälfte

⚠ **Ein zweiter Export desselben Teams erzeugt keine Dubletten.** Der
Schlüssel ist `sfv_match_id`: findet das Plugin einen Beitrag damit,
**aktualisiert** es ihn (`clubcampus-export.php:480`), sonst legt es an.
Etappe 4 darf deshalb beliebig oft wiederholt werden — es entsteht nichts
Zusätzliches.

Ein **abgebrochener** Lauf hinterlässt aus demselben Grund keinen Rest: er
schreibt weniger Beiträge, nie überzählige. Der nächste vollständige Lauf
holt sie nach, weil jeder Lauf den **ganzen** Satz je Team sendet.

**Der einzige echte Dublettenfall ist Export gegen Handbeitrag** — und den
legt das Plugin nicht zusammen, sondern **meldet** ihn:
`cc_pruefe_dublette()` sucht ausschliesslich unter Beiträgen **ohne**
`sfv_match_id` und schreibt den Fund nach `moegliche_dubletten`. Er steht
damit in der Antwort, in `api_sync_log.details` und in der Kachelmeldung.
⚠ **Zusammengeführt wird nichts automatisch** — es ist eine redaktionelle
Entscheidung, welcher der beiden bleibt.

### 4 · Die eine Stelle, an der doch etwas liegenbleibt

**Entwürfe.** Ein Spiel, das der Export nicht mehr liefert, wird auf
Entwurf gesetzt statt gelöscht (§8.2) — richtig so, aber Entwürfe sammeln
sich, und niemand sieht sie, weil sie nicht öffentlich sind.

⚠ **Nach dem Wechsel sind sie weiterhin nicht öffentlich** — ein Entwurf
bleibt ein Entwurf. Das Problem ist nicht Sichtbarkeit, sondern
Ununterscheidbarkeit: **ein zu Unrecht zurückgezogenes Spiel sieht aus wie
ein zu Recht zurückgezogenes.** Wer sie durchsehen will, filtert die
Spieleliste auf `Entwurf` und hält sie gegen `zurueckgezogen` im Protokoll.

### 5 · Vor dem Umschalten — die Liste

0. **Das aktualisierte Plugin einspielen.** Ohne es gibt es keinen
   Laufstempel, und ohne Stempel beantwortet die Bestandsliste die Frage
   nicht, für die sie gebaut ist. ⚠ Es liegt in `wordpress/`, läuft aber
   in `fch-theme` — siehe §12.
1. `await wpExport('bestand')` — die vollständige Liste, ungekürzt.
   `ohne_laufstempel_sichtbar` ist die Zahl, die zählt: veröffentlichte
   Beiträge, die kein Lauf mehr anfasst.
2. `api_sync_log` durchlesen (Abfrage oben). Jede Zeile mit
   `status = 'warnung'` **einzeln** ansehen: `fehler`, `ohne_team`,
   `doppelte_teams`, `moegliche_dubletten`.
3. Spieleliste nach **Entwurf** filtern (Punkt 4).
4. Die **11 Handbeiträge** zählen — sie müssen unverändert sein.
   `bestand` liefert die Zahl als `handbeitraege` mit.

⚠ **Punkt 4 ist der wichtigste und der billigste.** Er prüft nicht eine
Zahl, sondern eine Zusage.

⚠ **Und Punkt 1 wird mit jedem echten Lauf aussagekräftiger, nicht
schwächer.** Direkt nach dem Einspielen steht dort alles; nach einem vollen
Lauf über alle Mannschaften nur noch das, was tatsächlich niemand mehr
pflegt. **Die richtige Reihenfolge ist deshalb: Plugin einspielen, Etappe 5
fahren, DANN die Liste lesen** — vorher ist sie lang und sagt wenig.

---

## 4.6 ~~Die alte Seite friert ein~~ — ENTFÄLLT, und der Rest wiegt schwerer

> ⚠⚠ **ERLEDIGT DURCH RICHTIGSTELLUNG, 07.09.2026 — DIESER ABSCHNITT
> BESCHRIEB EIN PROBLEM, DAS ES NICHT GIBT.**
>
> Er stand hier als der einzige Teil des Vorhabens, für den es *keine*
> technische Lösung gibt: nach dem Wechsel bliebe auf `dev.fcherrliberg.ch`
> ein eingefrorener Spielplan stehen, verwechselbar mit dem echten,
> indexiert, für immer falsch.
>
> **Es gibt keine zweite Seite.** Didi, 07.09.2026: *„dev.fcherrliberg.ch
> WIRD zu fcherrliberg.ch."* Damit fällt die eingefrorene Kopie, die
> Verwechslungsgefahr zweier Adressen und die doppelte Indexierung — alles
> drei ersatzlos.
>
> ⚠ **Der Abschnitt bleibt trotzdem stehen, und nicht aus Pietät.** Was
> darunter folgt — die offene Installation, die Messung von `/wp-json/`,
> die zwei guten Nachrichten — hing nie an der Zwei-Seiten-Annahme. Und es
> ist seit der Richtigstellung **dringender, nicht harmloser:**
>
> | | vorher | jetzt |
> |---|---|---|
> | was offen steht | eine Testseite, die man später abschaltet | **die künftige Produktionsseite** |
> | was darauf entsteht | Wegwerfinhalt | **der öffentliche Bestand des Vereins** |
> | „nach dem Wechsel abschalten" | eine Aufräumaufgabe | **gibt es nicht mehr — es bleibt an** |
>
> **Die Frist aus dem nächsten Unterabschnitt gilt unverändert** und hängt
> weiter an der ersten Zeile in `sfv_zuordnung`.

### ⚠⚠ OFFENER PUNKT SEIT 05.09.2026: die Dev-Seite ist JETZT offen

**Und zwar wegen eines Schritts, den ich angewiesen habe.** Didi hat beim
Anlegen des Anwendungspassworts gemeldet:

> *„Die Dev-Seite lief mit HTTP-Basic-Auth, und WordPress verweigert dann
> Anwendungspasswörter (‚Basis-Authentifizierung ist nicht kompatibel'). Ich
> habe den Schutz abgeschaltet — die Seite ist jetzt offen."*

**Der Grund ist ein geteilter Header, und er ist unvermeidlich:** sowohl
Basic-Auth des Servers als auch das WordPress-Anwendungspasswort benutzen
`Authorization: Basic`. Der Server verbraucht ihn zuerst; WordPress
bekommt ihn nie zu sehen und schaltet die Anwendungspasswörter deshalb ab.
**Das ist keine Fehlkonfiguration, sondern eine echte Unverträglichkeit.**

⚠ **Damit steht eine WordPress-Installation offen, deren Vorgängerin im
August eingebrochen wurde.** Das ist für sich genommen ein Befund — ganz
ohne Junioren-Namen.

**Was zurück muss, und was NICHT geht:**

| | taugt? |
|---|---|
| Basic-Auth wie vorher | ❌ schaltet die Anwendungspasswörter ab — genau der Grund für das Abschalten |
| IP-Allowlist auf der ganzen Seite | ❌ Supabase Edge Functions haben keine feste Ausgangs-IP; der Export käme nicht durch |
| Basic-Auth **mit Ausnahme für `/wp-json/`** | ⚠ geht, aber die Ausnahme ist genau der Weg zu den Daten — und `/wp/v2/users` verrät Benutzernamen |
| „Coming soon"-Plugin, das die REST-API durchlässt | ✅ der übliche Weg — ⚠ die Einstellung „REST nicht blocken" ist die, die niemand nachprüft |
| `noindex` | nur ergänzend — eine Bitte an die Suchmaschine, keine Sperre |

**Zu entscheiden von Didi, nicht von mir** — es ist seine Installation und
sein Betriebsrisiko. Ich nenne die Kandidaten, nicht die Wahl.

### ⚠ Wann es dringend wird — und das ist NICHT ganz Etappe 4

Didi sagt: *„spätestens in Etappe 4, nicht irgendwann"*. Richtig, und die
Frist lässt sich noch schärfer fassen — in beide Richtungen:

| | |
|---|---|
| **heute** | der Export trägt **keine Klarnamen eigener Spieler**. `sfv_zuordnung` hat null Zeilen (gemessen 29.08.2026), also löst `beschreibeWer()` jeden auf `Nr. 9` auf. Vom Gegner steht ohnehin nur der Vereinsname |
| **ab der ersten Zuordnung** | jeder zugeordnete Spieler erscheint mit vollem Namen im `verlauf` — und das kann **vor** Etappe 4 passieren, denn Zuordnen ist Portalarbeit und hängt nicht am Export |

⚠ **Der Auslöser ist also die erste Zeile in `sfv_zuordnung`, nicht der
erste Export.** Wer zwischendurch eine Stunde Zuordnungsarbeit macht und
danach einen Probelauf, hat beides zusammen — ohne dass jemand eine
Entscheidung getroffen hätte.

**Vor Etappe 4 nachzählen, nicht auf die Messung vom 29.08. verlassen:**

```sql
select count(*) as zugeordnet from public.sfv_zuordnung;
```

⚠ **Und unabhängig davon gilt:** eine offene WordPress-Installation nach
einem Einbruch ist kein Zustand für Wochen. Die Namen machen es
schlimmer, nicht erst gefährlich.

### ✅ Gemessen am 05.09.2026: was unter `/wp-json/` ohne Anmeldung steht

Didi hat sich für **Basic-Auth mit Ausnahme für `/wp-json/`** entschieden,
mit der Begründung: *„die REST-API verlangt selbst eine Anmeldung — der
Schutz davor ist eine zweite Tür, keine einzige"*, und dazu die richtige
Rückfrage, ob das stimmt.

**Gemessen, unangemeldet, gegen die laufende Dev-Seite:**

| Route | | Inhalt |
|---|---|---|
| `/wp-json/` | 200 | die Routenliste |
| `wp/v2/posts` | 200 | 14 veröffentlichte News |
| `wp/v2/pages` | 200 | 18 Seiten |
| `wp/v2/media` | 200 | 20 Medien |
| `wp/v2/fch_team` | 200 | 11 Teams — ⚠ **ohne `sfv_id`** (`meta: null`, `acf: []`) |
| `wp/v2/fch_anlass` · `fch_sponsor` · `fch_jahr` | 200 | öffentliche Inhalte |
| **`wp/v2/fch_spiel`** | **404** | ✅ nicht exponiert — die Entscheidung des Themes trägt |
| **`clubcampus/v1/status`** | **401** | ✅ verlangt Anmeldung |
| **`wp/v2/users`** | **200** | ⚠ **ein Benutzer: „Dieter Good", slug `dgood`** |

Entwürfe sind nicht dabei — `?status=draft` wird abgewiesen, alle
gelieferten Objekte stehen auf `publish`.

### ⚠ Die Rechnung stimmt fast — und das Loch ist genau das eine, das zählt

**Der erste Satz trifft nicht zu:** die Kern-Routen verlangen **keine**
Anmeldung. Posts, Seiten, Medien und die vier `fch_*`-Typen kommen
unangemeldet. `/wp-json/` ist dort keine zweite Tür, sondern gar keine.

**Der Schluss stimmt trotzdem — für alles ausser einer Route.** Was dort
ausgegeben wird, steht ohnehin auf der öffentlichen Website: es sind die
Inhalte, für die die Seite da ist. Und die Spiele sind mit 404 gar nicht
dabei.

⚠ **`wp/v2/users` ist die Ausnahme, und die Ausnahme ist teuer.** Sie
veröffentlicht den Anmeldenamen des Administrators. Nach einem Einbruch
macht das aus „Benutzername UND Passwort raten" ein „Passwort raten".

**Und die gewählte Massnahme trifft genau diese Route nicht:**

| | mit Basic-Auth + Ausnahme für `/wp-json/` |
|---|---|
| `/author/dgood/` (Frontend, heute 200) | ✅ geschützt |
| `wp/v2/users` | ⚠ **offen** — die Ausnahme lässt sie durch |

**Die Ausnahme lässt also ausgerechnet das offen, was der Schutz sonst
schliessen würde.** Zwei Zeilen schliessen es, unabhängig von Basic-Auth:

```php
add_filter( 'rest_endpoints', function ( $e ) {
    if ( ! is_user_logged_in() ) {
        unset( $e['/wp/v2/users'], $e['/wp/v2/users/(?P<id>[\d]+)'] );
    }
    return $e;
} );
```

⚠ **Nur für Nichtangemeldete** — der Block-Editor braucht die Route für
die Autorenauswahl. Und ⚠ **nicht in `clubcampus-export.php`**: der
Export hat mit der Benutzerliste nichts zu tun, und ein Plugin, das
nebenbei fremde Routen abschaltet, überrascht den nächsten Leser. Sie
gehört in `fch-core` oder ein eigenes kleines mu-plugin — Didis
Entscheidung, es ist seine Installation.

### ✅ Zwei gute Nachrichten aus derselben Messung

**1 · `clubcampus-export` steht NICHT in der Benutzerliste.** WordPress
listet unangemeldet nur Benutzer mit veröffentlichten Beiträgen in einem
Beitragstyp mit `show_in_rest => true`. Der Export schreibt ausschliesslich
`fch_spiel`, und das steht auf `false`.

⚠ **Das ist kein Zufall, sondern eine Folge — und damit eine
Abhängigkeit:** würde jemand `show_in_rest` an `fch_spiel` einschalten,
erschiene der Export-Benutzer mitsamt seinem Anmeldenamen in der
öffentlichen Liste. Ein weiterer Grund, die Entscheidung des Themes nicht
anzutasten.

**2 · `sfv_id` am Team ist nicht öffentlich.** `meta: null` und `acf: []` —
weder als registriertes Postmeta noch über ACF freigegeben.

⚠ **Aber `acf` ist als Schlüssel DA**, die ACF-REST-Anbindung ist also
aktiv. Wer später an einer Feldgruppe „Show in REST API" anhakt, macht
ihre Felder auf der öffentlichen Route sichtbar — ohne dass jemand einen
Endpunkt geöffnet hätte. **Ein Schalter, der wie eine Anzeigeeinstellung
aussieht und eine Veröffentlichung ist.**

**Was hilft, alles auf WordPress-Seite (§12):**

1. **`Einstellungen → Lesen → Suchmaschinen davon abhalten`** — das
   Mindeste, aber ⚠ nur eine Bitte an die Suchmaschine, keine Sperre.
2. **Ein echter Zugriffsschutz.** HTTP-Basic auf dem Server oder ein
   Plugin, das die ganze Seite nur angemeldet ausliefert. Das ist die
   einzige Massnahme, die auch gegen einen weitergegebenen Link wirkt.
3. ~~**Nach dem Wechsel: die dev-Seite abschalten oder leeren.**~~
   ⚠ **Entfällt (07.09.2026)** — es gibt nichts abzuschalten, die
   Installation bleibt und wird umbenannt. **An ihre Stelle tritt das
   Gegenteil:** was heute daraufkommt, bleibt und wird öffentlich. Die
   Durchsicht davor steht in §4.5b.5.

~~⚠ **Warum der Export das NICHT übernehmen soll**, obwohl es technisch
ginge (er könnte vor dem Wechsel alle Beiträge der alten Seite auf Entwurf
setzen): dann bräuchte er Zugang zu zwei Seiten gleichzeitig …~~

⚠ **Entfällt mit der Richtigstellung (07.09.2026)** — es gibt keine alte
Seite, die aufzuräumen wäre. **Die Schlussfolgerung überlebt ihre
Begründung und ist die wichtigere Hälfte:** der Export kennt genau eine
Adresse, und zwar die aus dem Secret. Wer ihm je eine zweite gibt — zum
Aufräumen, zum Spiegeln, zum Testen —, nimmt die Eigenschaft zurück, die
§4.2 hergestellt hat: **ein Wechsel ist ein `secrets set`.**

**Zugriffsschutz und Indexierung bleiben ein Betriebsschritt, kein
Codeschritt.** Sie gehören in die Anleitung
(`docs/anleitung_wordpress_etappe3.md`) und nicht in die Edge Function.

---

## 4.7 ⚠ Die Beitragstypen heissen anders — und ihr Name ist Konfiguration

**Gemessen von Didi am 05.09.2026: der Team-Typ heisst `fch_team`, nicht
`team`.** Die Installation benutzt durchgehend ein `fch_`-Präfix.

⚠ **Der ganze Plan bis hierher schreibt `spiel` und `team`.** Das war eine
Übernahme aus dem Auftrag, nicht eine Messung — und sie war falsch. Wo in
diesem Dokument `spiel` oder `team` als Beitragstyp steht, ist der
**logische** Typ gemeint; der tatsächliche Name steht in der
Konfiguration.

**Daraus folgt eine Entwurfsänderung, und sie ist mehr als eine
Umbenennung:**

| | |
|---|---|
| ❌ falsch | die Namen als Konstanten in die Edge Function |
| ✅ richtig | in `api_verbindungen.sync_felder`, wie alles andere an diesem Vertrag |

**Warum nicht in die Secrets:** die Typnamen sind kein Geheimnis, und sie
gehören zur selben Aussage wie die Feldlisten — die stehen schon dort.
**Warum nicht in den Code:** beim zweiten Verein heissen sie anders, und
die Adresse ist bereits pro Verein (§4.2). Ein Wert, der pro Installation
wechselt, gehört nicht in eine Datei, die für alle gilt.

⚠ **Und was der Export tatsächlich braucht, ist nicht der Typname,
sondern die REST-ROUTE.** Die beiden sind nicht dasselbe:

```
register_post_type('fch_team', ['rest_base' => 'teams', …])
                    ↑ slug                        ↑ Route: /wp/v2/teams
```

Ohne `rest_base` ist die Route der Typname (`/wp/v2/fch_team`), mit ihr
etwas anderes. **Beides steht in der Antwort von `/wp/v2/types`**, und
genau das ist der Wert, der in `sync_felder` gehört — nicht der Slug.

**Nachzutragen in `migration_wp_export.sql`, sobald beide Routen belegt
sind** (`sync_felder` steht im `on conflict … SET`, ein erneuter Lauf der
Datei genügt also):

```
'wp_routen', jsonb_build_object(
  'spiel', '…',            -- offen, der Typ existiert noch nicht
  'team',  'fch_team')     -- gemessen 05.09.2026
```

### Was `/wp/v2/types` am 05.09.2026 tatsächlich zeigte

Vier eigene Typen, alle mit `rest_base` **gleich dem Slug** — keiner
trägt eine abweichende Route:

| Typ | `rest_base` | Name | Taxonomie |
|---|---|---|---|
| `fch_team` | `fch_team` | Teams | `fch_teamstufe` |
| `fch_anlass` | `fch_anlass` | Anlässe | — |
| `fch_sponsor` | `fch_sponsor` | Sponsoren | — |
| `fch_jahr` | `fch_jahr` | Vereinsjahre | `fch_epoche` |

**Die Route für Teams ist damit `/wp/v2/fch_team`.**

⚠ **`fch_spiel` ist nicht darunter — und meine Folgerung daraus war
falsch.**

Hier stand: *„Da alle vier vorhandenen REST-sichtbar sind, spricht alles
dafür, dass die drei schlicht noch nicht angelegt sind."* **Gemessen von
Didi am selben Tag über die Admin-Adresse: `fch_spiel` EXISTIERT, mit 11
von Hand angelegten Beiträgen.** Ihm fehlt allein `show_in_rest`.

⚠ **Die Folgerung war plausibel und trotzdem eine Vermutung** — und ich
hatte sie im selben Abschnitt als solche gekennzeichnet (§4.8: „belegt ist
das nicht"). Genau deshalb steht sie hier stehen geblieben statt
weggeputzt: **der Abstand zwischen „spricht alles dafür" und „gemessen"
ist der ganze Punkt von §4.8.** Wer die Zeile liest, sieht, wie leicht aus
einem Fehlen ein Schluss wird.

Was daraus folgt, steht in §4.10 — es ist mehr als eine Umbenennung.

---

## 4.9 ⚠ ACF ist im Einsatz — und das ändert, WIE geschrieben wird

Aus derselben Antwort, und es war nicht gesucht: `fch_anlass` trägt ein
Block-Template aus **eigenen ACF-Blöcken**.

```json
"template": [["acf/fch-fliesstext", …], ["acf/fch-abschnitt", …], ["acf/fch-tabelle", …]]
```

**ACF ist also nicht nur installiert, sondern trägt die Inhaltsstruktur
der Website.** Damit ist die Wahrscheinlichkeit hoch, dass auch
`fch_team.sfv_id` ein ACF-Feld ist und nicht schlichtes Postmeta.

⚠ **Das ist ein Unterschied, den man von aussen nicht sieht und der beim
Schreiben zubeisst.** ACF legt zu jedem Feld **zwei** Zeilen an:

```
sfv_id   = 38309            ← der Wert
_sfv_id  = field_64a1b2c3   ← der Feldschluessel
```

Wer den Wert über die Kern-REST-API als Postmeta schreibt, setzt **nur
die erste**. Für `get_post_meta()` genügt das; **`get_field()` kann den
Wert dann nicht mehr auflösen oder formatieren** — und ob die Vorlage das
eine oder das andere benutzt, sieht man dem Ergebnis nicht an. Ein Feld,
das im Backend richtig aussieht und auf der Seite leer bleibt.

### Die Gabelung, und sie gehört Didi

| | Kern-REST (`/wp/v2/fch_spiel`) | **eigene Route** (`/clubcampus/v1/spiele`) |
|---|---|---|
| PHP-Menge | wenig — nur `register_post_meta` | mehr, und ⚠ es prüft dort niemand |
| Aufrufe je Lauf | viele: Aufzählung + einer je Spiel | **einer** |
| ACF-Feldschlüssel | ⚠ ungelöst | gelöst — `update_field()` setzt beide Zeilen |
| CPT braucht `show_in_rest` | **ja** | nein |
| CPT braucht `custom-fields` in `supports` | **ja** | nein |
| Abgleich (§8.2) | im Export, über viele Aufrufe | serverseitig, in einem Durchgang |

⚠ **Die eigene Route ist die technisch bessere und die riskantere
zugleich**, und beide Hälften zählen. Sie löst das ACF-Problem, spart
269 Aufrufe je Lauf und macht den Abgleich zu einem Vorgang statt zu
vielen — aber sie verlagert genau die Logik, die den Spielplan auf
Entwurf setzen kann, in eine Sprache ohne Typecheck und ohne Testkette
(§12, Punkt 4).

**Empfehlung: eigene Route** — mit der Auflage, dass der Abgleich darin
so eng wie möglich bleibt (je Team, nur gelieferte Teams, nur Status
ändern, nie löschen) und dass der Export ihr ein ausdrücklich als
vollständig gekennzeichnetes Set schickt.

⚠ **Zu klären, bevor ich das Plugin schreibe:** liest die Vorlage die
Felder mit `get_field()` (ACF) oder mit `get_post_meta()`? Davon hängt
ab, ob `update_field()` Pflicht ist oder nur Vorsicht.

---

---

## 4.8 ⚠ `/wp/v2/types` kann NICHT sagen, ob ein Typ fehlt

**Didis Frage am 05.09.2026: fehlt `fch_spiel`, oder ist er nur ohne
`show_in_rest` registriert?**

**Aus dieser Antwort ist das nicht zu entscheiden — von niemandem.** Der
Endpunkt listet ausschliesslich Typen mit `show_in_rest => true`. Ein Typ,
den es nicht gibt, und ein Typ, der ohne dieses Flag registriert ist,
sehen dort **identisch aus: beide fehlen.**

⚠ **Das ist die Sorte Messung, die eine Antwort liefert und eine andere
Frage beantwortet.** Wer die Liste liest und „`fch_spiel` fehlt" notiert,
hat nicht gemessen, ob es ihn gibt — er hat gemessen, ob er über REST
sichtbar ist. Dieselbe Familie wie `job_run_details: succeeded`
(= abgesetzt, nicht gelungen) und wie `letzter_sync` (= fertig geworden,
nicht gelungen).

**Was den Unterschied zeigt** — die billigste Probe zuerst:

| | entscheidet? |
|---|---|
| `wp-admin/edit.php?post_type=fch_spiel` im Browser | ✅ Liste = existiert · „Ungültiger Beitragstyp" = existiert nicht |
| die Liste in CPT UI bzw. ACF | ✅ zeigt auch Typen ohne REST |
| `wp post-type list --fields=name,show_in_rest,rest_base` (WP-CLI) | ✅ vollständig |
| `/wp/v2/types` | ❌ **kann es nicht** |

⚠ **Eine Einschränkung auch bei der ersten Probe:** ein Typ mit
`show_ui => false` existiert und hat trotzdem keine Admin-Seite. Selten,
aber deshalb ist ein negatives Ergebnis dort **kein Beweis** — es ist ein
Hinweis, den die CPT-UI-Liste bestätigen muss.

---

## 4.10 ⚠ `fch_spiel` gehört nicht dem Export — 11 Beiträge stehen schon drin

**Gemessen von Didi, 05.09.2026: `fch_spiel` existiert, mit 11 von Hand
angelegten Beiträgen. Es fehlt nur `show_in_rest`.** Und die Beitragsliste
hat eine Spalte **„Quelle"** mit dem Wert **„WordPress"** — jemand hat die
Unterscheidung bereits vorgesehen.

⚠ **Damit ist §8.2 in seiner bisherigen Form gefährlich.** Dort steht: „ein
`spiel`-Beitrag, dessen `clubcampus_id` der Export nicht mehr liefert, wird
auf Entwurf gesetzt". Die Regel war je Team gefasst, aber sie ging
stillschweigend davon aus, dass **jeder** `fch_spiel`-Beitrag dem Export
gehört. **Er gehört ihm nicht.** Der erste scharfe Lauf hätte alle 11
abgeräumt — kein Fehler, keine Meldung, elf verschwundene Spiele.

### Das Besitzmerkmal ist `clubcampus_id`, nicht `quelle`

Zwei Kandidaten, und die Wahl ist keine Geschmacksfrage:

| | prüft | |
|---|---|---|
| `quelle == 'ClubCampus'` | eine **Zeichenkette**, die jemand gesetzt hat | ❌ |
| `clubcampus_id` ist gesetzt | ob der Beitrag **einen Zeiger auf eine ClubCampus-Zeile trägt** | ✅ |

**Das ist wörtlich die Regel aus `CLAUDE.md`:** *„Ein Filter auf einen
NAMEN prüft eine Schreibweise. Ein Filter auf ein MERKMAL prüft die
Sache."* `quelle` ist ein Etikett — es kann umbenannt, übersetzt oder von
Hand geändert werden. `clubcampus_id` **ist** die Zugehörigkeit.

⚠ **Und die Fehlerrichtung entscheidet mit.** Die zwei möglichen Irrtümer
sind nicht gleich schlimm:

| Irrtum | Folge |
|---|---|
| ein Handbeitrag gilt als exportiert | ⚠ **er wird auf Entwurf gesetzt — Verlust** |
| ein Exportbeitrag gilt als fremd | er bleibt stehen und veraltet — ärgerlich, aber nichts ist weg |

**Also die konservative Fassung: angefasst wird nur, was nachweislich eine
`clubcampus_id` trägt.** Fehlt sie, Hände weg — auch dann, wenn der Beitrag
sonst nach Export aussieht. Dieselbe Logik wie Allowlist statt Denylist.

**Der Abgleich hat damit zwei Einschränkungen statt einer:**

```
Abgleichmenge = Beiträge MIT clubcampus_id
                UND deren Team im gelieferten Satz steht
```

Beide verengen. Alles andere ist für den Export unsichtbar.

### `quelle` wird trotzdem geschrieben — als die menschliche Hälfte

Der Export setzt bei jedem Beitrag, den er anlegt, `quelle` auf den Wert
für ClubCampus. **Nicht als Filter, sondern als Anzeige** — die Spalte ist
dafür da, dass Didi in der Liste sieht, was woher kommt.

⚠ **Und damit entsteht eine Gegenprobe, die es zu behalten lohnt.** Ab
dann behaupten zwei Felder dasselbe:

| `clubcampus_id` | `quelle` | heisst |
|---|---|---|
| gesetzt | ClubCampus | ✅ normal |
| leer | WordPress | ✅ normal, ein Handbeitrag |
| **gesetzt** | **WordPress** | ⚠ jemand hat das Etikett geändert — oder von Hand eine Id eingetragen |
| **leer** | **ClubCampus** | ⚠ ein Beitrag, der exportiert aussieht und es nicht ist |

**Die letzten zwei Zeilen meldet der Export, statt sie zu berichtigen.**
`CLAUDE.md` sagt dazu, was zählt: *„eine Anzeige, die einer anderen
widerspricht, ist kein Prüfmittel, sondern ein Fehler mit Zusatznutzen"* —
aber der Widerspruch fällt auf, und ein stiller Zustand nicht.

### ⚠ Die dritte Gefahr, die noch niemand genannt hat: Dubletten

**Die 11 Handbeiträge könnten dieselben Spiele sein, die der Export
gleich anlegt.** Wer eine Saison von Hand erfasst hat, hat vermutlich bei
der 1. Mannschaft angefangen — und genau deren Spiele stehen auch im
SFV-Spielplan.

Nach dem ersten Lauf stünde jedes davon **zweimal** auf der Website: einmal
von Hand, einmal exportiert, beide plausibel.

⚠ **Der Export kann das nicht selbst auflösen, und er soll es nicht
versuchen.** Es gibt keinen gemeinsamen Schlüssel; die einzige Brücke wäre
Datum + Team — und das ist ein Namensvergleich, kein Merkmal. Ein
automatisches Zusammenführen überschriebe redaktionelle Arbeit auf
Verdacht.

**Was er stattdessen tut: melden.** Für jeden Beitrag, den er neu anlegt,
sieht er nach, ob ein Beitrag **ohne** `clubcampus_id` mit gleichem Datum
und gleichem Team existiert, und zählt ihn als möglichen Doppel — mit
Beitrags-Id, in der Meldung und in `api_sync_log.details`. **Didi
entscheidet, nicht der Export.**

⚠ **Und das gehört vor den ersten scharfen Lauf, nicht danach:** die 11
einmal durchsehen und entscheiden, ob sie bleiben, gelöscht werden oder
zur Kontrolle dienen. Elf Beiträge von Hand durchzusehen ist eine halbe
Stunde; hinterher zwei Spielpläne auseinanderzusortieren nicht.

---

## 4.11 Die Spalten der Liste — und was ihnen fehlt

Didis Spalten: **Datum · Zeit · Team · Gegner · Ort · Art · Resultat ·
Quelle.**

| Spalte | Quelle in ClubCampus | |
|---|---|---|
| Datum | `spiele.date` | ✓ in §11 |
| Zeit | `spiele.zeit` | ✓ |
| **Team** | `spiele.sfv_team_id` | ⚠ **siehe unten** |
| Gegner | `spiele.gegner` | ✓ |
| Ort | `spiele.venue` **+** `spiele.heimspiel` | ⚠ die Spalte trägt beides — §11 schickt sie getrennt, das bleibt so |
| **Art** | `spiele.wettbewerb` | ✓ Meisterschaft · Cup · Trainingsspiel (Didi, 05.09.2026) |
| Resultat | `spiele.resultat` | ✓ |
| **Quelle** | — | neu, der Export schreibt sie |

⚠ **Zu „Team": mein Entwurf schickt eine Zahl, die Liste zeigt eine
Mannschaft.** Wenn das Feld eine ACF-Beziehung auf `fch_team` ist — und
danach sieht es aus —, dann braucht es die **WordPress-Beitrags-Id** des
Teams, nicht `sfv_team_id`.

Das ist kein Mehraufwand: der Export liest die Teams ohnehin, um die
Zuordnung zu bauen (§7). Aber es ändert das Feld in der Nutzlast, und
zwar von einer Zahl, die zufällig auch eine Id ist, auf eine ganz andere
Zahl. **Genau die Sorte Verwechslung wie `sfv_match_id` gegen
`sfv_spiel_nr`.**

⚠ **Und die Spalten sind NICHT die Feldliste.** Eine Admin-Spalte ist eine
Auswahl fürs Listenbild. Was §11 sonst noch braucht, hat in den 11
Handbeiträgen vermutlich gar kein Feld:

| fehlt vermutlich | wofür |
|---|---|
| `sfv_match_id` | der Verweis auf den FVRZ-Spielbericht |
| `status` / `status_id` | verschoben, abgebrochen, forfait (§0.2) |
| `liga`, `gruppe` | Einordnung |
| `halbzeit` | heute leer, später gefüllt |
| `sfv_spiel_nr` | die angezeigte Spielnummer |
| `ereignisse` | Tore, Assists, Wechsel, Karten |
| `export_lauf` | woran man sieht, wie frisch der Stand ist |
| `clubcampus_id` | ⚠ **das Besitzmerkmal — ohne es geht gar nichts** |

**Die ACF-Feldgruppe für `fch_spiel` muss also erweitert werden.** Das ist
ein eigener Schritt in Etappe 3 und gehört Didi, aus demselben Grund wie
der Beitragstyp selbst: die Felder erscheinen im Backend, und wie sie dort
heissen und liegen, ist eine redaktionelle Entscheidung.

---

## 4.13 ⚠ Das Theme gelesen — und es hatte den Export schon eingeplant

Am 05.09.2026 in `C:\Users\diete\Documents\GitHub\fch-theme` gelesen, nur
gelesen. **Der Befund dreht drei Empfehlungen um, die ich vorher gegeben
hatte.** Die betroffenen Abschnitte sind unten berichtigt, nicht gelöscht.

Alles Relevante liegt in `mu-plugins/fch-core/` — nicht im Theme-Ordner.

### 1 · ⚠ `show_in_rest => false` ist eine ENTSCHEIDUNG, kein fehlendes Flag

`src/PostTypes/registrierung.php:118`:

```php
'fch_spiel' => array(
    'show_in_rest' => false,   // mit dieser Begruendung daneben:
    // Der Beitrag traegt sfv_match_id und sfv_spiel_nr, beide nicht fuer
    // die Website gedacht. Die Seite zeigt aus, was sie zeigen soll;
    // die REST-Ausgabe gaebe alles.
    'supports' => array( 'revisions' ),   // ⚠ kein custom-fields, kein title, kein editor
```

⚠ **Ich habe in der Anleitung geschrieben, du sollst es einschalten. Das
war falsch, und zwar nicht knapp.** Es ist keine vergessene Einstellung,
sondern eine begründete Absicht — und die Begründung trägt: `show_in_rest`
an einem `public`-Beitragstyp öffnet die registrierten Felder für
**unangemeldete** Leser. Nach dem Einbruch im August ist das nichts, was
man nebenbei umlegt.

**Es ist ausserdem gar nicht nötig.** Eine eigene Route
(`register_rest_route('clubcampus/v1', …)`) hängt nicht an
`show_in_rest`. Damit fällt die Empfehlung aus §4.9 nicht nur bequemer
aus, sondern ist die einzige, die die Entscheidung des Themes respektiert.

⚠ **Und `supports` nennt kein `custom-fields`** — die Kern-REST-Route
könnte die Felder also selbst dann nicht ausgeben, wenn sie offen wäre.
Die Gabelung aus §4.9 ist damit entschieden: **eigene Route.**

### 2 · ⚠ ACF ist Pflicht, nicht Vorsicht

Gezählt über `mu-plugins/` und `themes/`:

| | |
|---|---|
| `get_field()` | **416** |
| `get_post_meta()` | 44 |
| `update_field()` | **189** |
| `update_post_meta()` | 27 |

**Der Export muss `update_field()` benutzen.** Bei einem Repeater ist das
keine Stilfrage: ACF legt je Zeile `verlauf_0_minute` **und**
`_verlauf_0_minute` (Feldschlüssel) ab, dazu die Zeilenzahl unter
`verlauf`. Von Hand über Postmeta ist das praktisch nicht richtig zu
schreiben.

### 3 · ⚠⚠ ES GIBT ZWEI EREIGNIS-REPEATER — und der Export schreibt den anderen

**Das ist der wichtigste Fund, und er macht meine letzte Antwort
gegenstandslos.** `src/Fields/spiel.php` führt beide nebeneinander:

| Feld | wem gehört es | Personen |
|---|---|---|
| `ereignisse` | **der Redaktion** | `post_object` → `fch_person` |
| `verlauf` („Verlauf laut Verband") | **dem Abgleich** | nur als **Text** |

Und der Kommentar dort ist vom **05.09.2026**, also von heute:

> *„Er steht neben `ereignisse` und nicht an dessen Stelle. **Der Abgleich
> schreibt ihn**, und was heute funktioniert, wird nicht geloescht. Die
> beiden beantworten verschiedene Fragen: `verlauf` sagt, was der Verband
> gemeldet hat, `ereignisse` sagt, wem es zuzurechnen ist."*

Die Feldbeschreibung sagt dasselbe: *„Schreibt der Abgleich. Nennt
Personen nur als Text — für die Statistik zählt die Tabelle darüber."*

⚠ **Damit ist Didis Sorge aus der letzten Runde gegenstandslos, und meine
Antwort darauf war die falsche Lösung für das richtige Problem.** Ich
hatte gesagt: der Repeater wird überschrieben, also gesperrt, korrigiert
wird im Portal. Richtig ist:

| | |
|---|---|
| `verlauf` | 🔒 der Export ersetzt ihn stündlich — dort ist Korrektur sinnlos |
| `ereignisse` | ✅ **der Export fasst ihn NIE an** — dort korrigierst du, im Backend, mit Personenverweis |

**Die Korrigierbarkeit ist also nicht ans Portal abgewandert. Sie steht
im WordPress-Backend, ein Feld weiter oben.** Die Korrektur im Portal
(§4.12) bleibt trotzdem richtig und nützlich — sie wirkt auf `verlauf`
und damit auf beide Systeme. Es sind zwei Wege, und sie widersprechen
sich nicht: einer berichtigt, was der Verband gemeldet hat, der andere
ordnet zu, wem es gehört.

⚠ **Und `stand` wird NICHT gerechnet** — das steht ausdrücklich dort:
*„eine gerechnete Zahl, die von der eingetragenen abweicht, wäre
schlimmer als keine."* `spiel_ereignisse` führt keinen Zwischenstand, der
Export lässt das Feld also leer statt es herzuleiten.

### 4 · Die Felder, die es schon gibt — und wo mein §11 danebenlag

`src/Fields/spiel.php`, `acf_add_local_field_group`, Schlüssel
`group_fch_spiel` (kein `acf-json/`).

| mein §11 | tatsächlich | ⚠ |
|---|---|---|
| `resultat` (Text „3:3") | **`tore_heim` · `tore_gast`** (Zahlen) | muss zerlegt werden |
| `halbzeit` (Text) | **`halbzeit_heim` · `halbzeit_gast`** (Zahlen) | dito |
| `heimspiel` (true/false) | **`heim_auswaerts`** (Auswahl `heim`/`auswaerts`) | kein Wahrheitswert |
| `team_sfv_id` (Zahl) | **`fch_team`** (`post_object` → `fch_team`, `return_format: id`) | ⚠ Feld heisst `fch_team`, nicht `team` — und will die **WP-Beitrags-Id** |
| `spielort` | `ort` (Text) | |
| `datum` | `datum` (`date_picker`, `return_format: Ymd`) | ⚠ Format `Ymd`, nicht ISO |
| `zeit` | `zeit` (`time_picker`, `H:i`) | |
| `wettbewerb` | `wettbewerb` (Text) | „Art" in der Liste |
| `status` | `status` (Auswahl, **4 Werte**) | ⚠ siehe unten |
| `sfv_match_id` · `sfv_spiel_nr` | beide da, Text | |
| `clubcampus_id` | **gibt es nicht** | ⚠ siehe unten |
| `bericht` | `matchbericht` (`post_object` → News-Beitrag) | kein Textfeld am Spiel |
| — | `runde`, `telegramm`, `aufstellung` | zusätzlich vorhanden |

⚠ **`status` kennt vier Werte, der Verband zwölf** (§0.2):

```
normal · verschoben · abgesagt · forfait
```

Eine Abbildung 12 → 4 verliert. Vor allem: **für Status 12 („keine
Publikation") gibt es keinen Wert** — und das ist richtig so, denn dieser
Zustand ist keine Anzeige, sondern ein Veröffentlichungsverbot. Er wird
über den **Beitragsstatus** behandelt (Entwurf, §8.1), nicht über dieses
Feld. Die Abbildung der übrigen elf gehört in `sync_felder` und ist eine
Entscheidung, keine Übersetzung.

### 5 · Der Schlüssel: `sfv_match_id` statt eines neuen `clubcampus_id`

Es gibt kein `clubcampus_id`-Feld — aber `sfv_match_id`, und das ist der
bessere Schlüssel:

| | |
|---|---|
| existiert bereits | ✅ kein neues Feld, keine Feldgruppenänderung |
| eindeutig | ✅ `spiele` trägt `UNIQUE (verein_id, sfv_match_id)` |
| stabil | ✅ der Sync legt nie neu an (§3.2) |
| ein **Merkmal**, kein Name | ✅ er zeigt auf die Zeile, er beschreibt sie nicht |

⚠ **Die Grenze gehört dazu:** ein von Hand in ClubCampus erfasstes Spiel
hat `sfv_match_id = NULL` und wäre so nicht exportierbar. Das Theme sagt
dazu selbst: *„Von Hand angelegt werden nur Freundschaftsspiele und
Turniere"* — und die entstehen in WordPress. **Solange das gilt, ist die
Grenze keine.** Sobald jemand in ClubCampus ein Spiel von Hand anlegt und
es auf der Website will, braucht es doch ein `clubcampus_id`.

**Damit ändert sich §4.10 nicht im Kern, nur im Namen:** Besitzmerkmal ist
**`sfv_match_id` gesetzt**, nicht `quelle`.

### 6 · `quelle` — und drei Namen für einen Zustand

```php
'name' => 'quelle', 'type' => 'select', 'default_value' => 'manuell',
'choices' => array( 'manuell' => 'manuell', 'clubcampus' => 'ClubCampus' ),
```

⚠ **Der Export schreibt `clubcampus`, klein.** Schriebe er „ClubCampus",
zeigte ACF nichts an — genau die Falle, vor der §3b-neu warnt.

⚠ **Und die Spalte zeigt „WordPress", obwohl kein Wert so heisst.**
`Listen/darstellung.php:136` bildet alles Unbekannte darauf ab:

```php
if ( 'clubcampus' === $v ) return … 'ClubCampus';
if ( 'sfv'        === $v ) return … 'SFV';
return … 'WordPress';        // ← der Auffangzweig
```

**Ein Zustand, drei Namen:** gespeichert `manuell`, im Feld beschriftet
`manuell`, in der Liste angezeigt `WordPress`. Genau deshalb stand in
Didis Meldung „Wert WordPress" — der Wert ist es nicht.

⚠ Nebenbei: der Zweig für `'sfv'` trifft nie, denn die Auswahl bietet
diesen Wert nicht an. Ein toter Zweig, der aussieht wie eine dritte
Möglichkeit. **Nicht mein Repository — nur gemeldet, nicht angefasst.**

### 7 · Der Titel ist abgeleitet

`supports` nennt kein `title`; der Titel entsteht beim Speichern aus
„Team — Gegner" (`src/Masken/spiel.php`). **Der Export setzt ihn nicht
selbst** — sonst gäbe es zwei Regeln für einen Namen. Zu prüfen beim Bau:
ob die Ableitung auch bei einem Schreibvorgang ohne Maske greift.

---

## 4.12 ⚠ Der Repeater wird überschrieben — und deshalb ist er gesperrt

> **⚠ ÜBERHOLT AM 05.09.2026, wenige Stunden nach dem Schreiben — siehe
> §4.13 Punkt 3.** Dieser Abschnitt geht davon aus, dass es EINEN
> Ereignis-Repeater gibt, den der Export überschreibt. Es gibt **zwei**:
> `verlauf` (Abgleich, gesperrt) und `ereignisse` (Redaktion, wird nie
> angefasst). Die Schlussfolgerung „korrigiert wird nur im Portal" ist
> damit zu eng — im Backend korrigiert man `ereignisse`.
>
> **Was hier steht, bleibt richtig für `verlauf`** und für die Frage, warum
> ein überschriebenes Feld gesperrt gehört. Der Abschnitt bleibt deshalb
> stehen; er ist nicht falsch, nur nicht vollständig.

**Entschieden am 05.09.2026: `ereignisse` als Repeater, nicht als JSON.**
Didis Begründung, und sie trägt: JSON in einem Textfeld ist im Backend
nicht lesbar und nicht prüfbar — bei einer kaputten Zeile merkt es
niemand.

**Didis Rückfrage darauf ist die richtige: was passiert, wenn jemand einen
Repeater-Eintrag von Hand ändert?**

### Die Antwort ist unbequem: der nächste Lauf überschreibt ihn

Ohne Einschränkung. Der Export schickt je Spiel die vollständige,
aufgelöste Ereignisliste, und der Repeater wird ersetzt — stündlich. Eine
Änderung im WordPress-Backend hält höchstens bis zur Minute 32.

⚠ **Damit ist Didis Schluss richtig: die Korrigierbarkeit im Backend wäre
eine Falle, kein Vorteil.** Ein Feld, das sich ändern lässt und stillt
zurückgesetzt wird, ist schlimmer als ein gesperrtes — es kostet Arbeit
und meldet den Verlust nicht. `ereignisse` steht deshalb in §11 unter 🔒,
und **Lesbarkeit ist der einzige verbleibende Grund für den Repeater.**

**Das ist immer noch ein guter Grund.** Wer im Backend sieht, dass ein
Torschütze falsch ist, kann handeln — er handelt nur woanders.

### ⚠ Die Korrigierbarkeit ist nicht verloren, sie liegt an der Quelle

Und zwar nicht als Behelf, sondern weil es sie dort **schon gibt**:

| | |
|---|---|
| Tabelle | `spiel_ereignisse` mit `herkunft = 'sfv' \| 'verein'` |
| Auflösung | `mischeEreignisse()` in `domains/spiele/matchdatenAnzeige.ts` |
| Maske | `EreignisKorrektur.tsx` |
| Weg dorthin | Termine → ein gespieltes Spiel → Tab **„Spielbericht"** |

**Gemessen am 05.09.2026, weil ich es nicht versprechen wollte, ohne
nachzusehen:** die Kette ist verdrahtet — `TermineModul.tsx:261` rendert
`Spielbericht`, `Spielbericht.tsx:110` rendert `EreignisKorrektur`. Der
Tab erscheint bei gespielten Spielen, die aus der Datenbank kommen.

**Und die Korrektur ist dort dauerhaft:** der SFV-Sync schreibt
ausschliesslich die `sfv`-Zeilen fort und fasst die `verein`-Zeilen nie an
(`migration_matchdaten.sql`). Eine Korrektur überlebt damit **jeden**
stündlichen Lauf — im Portal wie auf der Website, weil der Export dieselbe
Auflösung benutzt (§4.1).

⚠ **Genau das ist der Punkt: die Korrektur ist HALTBAR, weil sie an der
Quelle gemacht wird.** Im WordPress-Backend wäre sie es nicht.

### Warum kein Korrektur-Kennzeichen auf WordPress-Seite

Naheliegend wäre: ein Häkchen „von Hand korrigiert" je Repeater-Zeile, das
der Export respektiert. **Zwei Gründe dagegen, und der zweite ist der
schwerere.**

1. **Es wäre eine zweite Antwort auf dieselbe Frage.** Dieses Projekt hat
   das dreimal bezahlt — drei Rechnungen für die Portalrolle, drei für die
   Pflichtfelder, zwei für den Portal-Zugang. Jedes Mal war das Merkmal,
   dass **beide Antworten für sich plausibel** aussahen und keine
   Prüfkette rot wurde.
2. ⚠ **Eine Korrektur in WordPress wäre in ClubCampus unsichtbar.** Dann
   zeigt die Website etwas anderes als das Portal — und das ist wörtlich
   das, was der Auftrag ausschliesst: *„sonst zeigt die Website etwas
   anderes als ClubCampus, und niemand weiss, welches stimmt."*

### Was der Sperre ihre Schärfe nimmt: ein Hinweis, kein leeres Feld

Ein gesperrtes Feld ohne Wegweiser ist eine Sackgasse. Der Repeater trägt
deshalb im Editor den Satz, der beides sagt — dass es überschrieben wird
**und wohin man geht**:

> Kommt aus ClubCampus, wird stündlich überschrieben.
> Korrektur im Portal: Termine → Spiel → Spielbericht.

⚠ **Und eine Einschränkung, die dazugehört:** wer korrigieren darf, regelt
`spiel_ereignisse_write` — heute `is_admin() or get_my_role() = 'trainer'
or hat_modul_recht('schedule','schreiben')`. **Ein Funktionär kommt nicht
durch**, solange seine Gruppe `schedule: schreiben` nicht hat. Das ist der
Übergangszweig, der mit den Gruppenrechten fällt (`CLAUDE.md`), und er
betrifft jetzt auch die Website.

### Die Unterfelder des Repeaters

Aus `AnzeigeEreignis` (`matchdatenAnzeige.ts`), aufgelöst:

| Feld | Typ | |
|---|---|---|
| `minute` | Zahl | |
| `zusatzminute` | Zahl | für 45+2 |
| `typ` | Text | „Tor", „Verwarnung" … |
| **`typ_id`** | Zahl | ⚠ **das Merkmal, auf das die Vorlage schaltet** — nicht auf den Text |
| `subtyp` | Text | Kopftor, Eigentor, Penalty, 2. Verwarnung |
| `eigenes_team` | true/false | `ist_eigener` |
| `wer` | Text | aufgelöst: Name · `Nr. 9` · Mannschaftsname des Gegners (§6) |
| `sfv_person_id` | Zahl | für die spätere Verknüpfung zum Spieler-Beitrag |
| `rueckennr` | Zahl | |
| `ein_wer` · `ein_rueckennr` | Text/Zahl | bei Auswechslung: wer kommt |
| `vom_verein` | true/false | ⚠ diese Zeile ist eine Korrektur — **fürs Backend**, damit sichtbar ist, dass hier jemand eingegriffen hat. Ob es die Website zeigt, ist eine Gestaltungsfrage und nicht Teil dieses Auftrags |

⚠ **`typ` und `typ_id` beide, und das ist Absicht.** Der Text ist für den
Menschen im Backend, die Zahl für die Vorlage. Eine Vorlage, die auf
`typ === "Tor"` schaltet, bricht, sobald der Verband die Bezeichnung
ändert oder jemand übersetzt — dieselbe Regel wie „ein Filter auf einen
NAMEN prüft eine Schreibweise".

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

> **⚠ BERICHTIGT AM 05.09.2026 — DIE MENGE WAR ZU GROSS GEFASST.** Hier
> stand „ein `spiel`-Beitrag, den der Export nicht mehr kennt", und das
> hätte die **11 von Hand angelegten Beiträge mit abgeräumt**, die schon
> in `fch_spiel` stehen. Die Abgleichmenge ist seither doppelt verengt —
> nur Beiträge **mit `clubcampus_id`** und nur für **gelieferte Teams**.
> Herleitung in §4.10.

Ein `spiel`-Beitrag **aus der Abgleichmenge (§4.10)**, dessen
`clubcampus_id` der Export nicht mehr liefert, wird auf `draft` gesetzt,
nicht entfernt. Drei Gründe:

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
| `ereignisse` | aufgelöst, §6 · Repeater, §4.12 | 🔒 ⚠ **wird stündlich ersetzt** — Korrektur gehört ins Portal, nicht ins Backend |
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

### ⚠ 12.1 Die Plugin-Datei liegt im falschen Repository

`wordpress/clubcampus-export.php` liegt in **fch-portal** und läuft in
**fch-theme** (`mu-plugins/`). Sie liegt hier, weil ich in fch-theme nicht
schreiben darf — das betreut ein anderer Chat.

⚠ **WordPress meldet keinen Versionsunterschied.** Wer die Datei hier
ändert und drueben nicht einspielt, hat zwei Fassungen und keine Meldung.

**Stand 07.09.2026: die Datei hier ist NEUER als die eingespielte.** Dazu
gekommen sind

| | |
|---|---|
| `cc_stempel()` + die zwei Meta-Konstanten | ohne sie kein Laufstempel — und ohne Stempel beantwortet §4.5b die Frage nicht, für die es geschrieben ist |
| Route `GET /clubcampus/v1/bestand` | ohne sie antwortet `aktion: "bestand"` mit einem 404 der Website (laut, nicht still — die Edge Function wirft mit dem Antworttext) |

**Einspielen, bevor Etappe 4 erneut läuft.** Der Stempel wirkt ab dem
Einspielen, nicht rückwirkend: was vorher geschrieben wurde, bleibt
ungestempelt — und ist damit korrekt als „fraglich" ausgewiesen.

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
| 7 | Kachel in `ApiTab` (§15) | ✅ **erledigt 07.09.2026** — Beschreibung, Richtung, keine toten Knöpfe |

⚠ **Etappe 4 ist mindestens einmal gelaufen, und das stand nirgends.**
Gemeldet von Didi am 07.09.2026: die Kachel zeigt `letzter Sync 05.09.
19:20` und Status **warnung**. Beide Spalten schreibt **nur** der scharfe
Pfad (`index.ts:233-237`, erreichbar allein über `aktion: "export"`); der
Wächter fasst an `api_verbindungen` ausschliesslich `wache_zuletzt` an
(`cron_sync_waechter.sql:204`), und `wordpress` steht ohnehin auf
`active = false`, wird von ihm also gar nicht angesehen.

**Es gibt keine andere Quelle für diese zwei Werte. Ein `export` hat
stattgefunden.** Was er getan hat, steht in `api_sync_log` — die Abfrage
in §4.5b.2. ⚠ **Das ist eine Herleitung aus dem Code, keine Messung** —
sie fällt, sobald die Abfrage etwas anderes zeigt.

⚠ **Etappe 2 vor Etappe 3, und die Reihenfolge ist nicht beliebig.** Die
Probe zeigt die vollständige Nutzlast, bevor irgendetwas sie empfängt —
und zwar in eine Datei, die gegengelesen wird. Genau so ist am
19.08.2026 die Denylist aufgeflogen, die 32 Klarnamen durchgelassen
hätte: *„Gefangen wurde es nur, weil die Datei zuerst in den Scratchpad
geschrieben und dort gegengelesen wurde."* Der Export schickt Namen von
Junioren auf eine öffentliche Website. **Das ist der Lauf, den man einmal
von Hand liest.**

---

### 13.1 Etappe 4 — der Aufruf, wörtlich

**Er stand bisher in keiner Datei**, nur im Verlauf eines Chats. Deshalb
hier, samt der Falle, die am 07.09.2026 dazu gefunden wurde.

⚠ **`nur_team` IST DIE SFV-TEAMNUMMER, NICHT DER MANNSCHAFTSNAME.**
Die Function vergleicht gegen `teams.sfv_team_id` (`index.ts:338`, jetzt
:365). Bis zum 07.09.2026 prüfte das niemand: ein Name lief brav durch,
traf kein Spiel, und WordPress meldete die Mannschaft unter `ohne_team`
zurück — **0 neu, 0 aktualisiert, Status „warnung", und das sieht aus wie
„diese Mannschaft hat keine Spiele".** Seither bricht der Lauf ab und
zählt die gültigen Nummern samt Namen auf.

**Die Nummern holen** (im Portal oder per SQL):

```sql
select name, sfv_team_id from public.teams
 where verein_id = (select id from public.vereine where slug = 'fcherrliberg')
   and sfv_team_id is not null
 order by name;
```

**Der Aufruf** — Browser-Konsole, im Portal angemeldet. Der Token kommt
aus der laufenden Sitzung; nichts wird von Hand kopiert:

```js
const [schl, roh] = Object.entries(localStorage)
  .find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
const token = JSON.parse(roh).access_token;
const ref   = schl.slice(3, -'-auth-token'.length);

async function wpExport(aktion, nurTeam) {
  const r = await fetch(`https://${ref}.supabase.co/functions/v1/wp-export`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ aktion, nur_team: nurTeam }),
  });
  const j = await r.json();
  console.log(r.status, j);
  return j;
}

await wpExport('probe',  '38309');   // schreibt NICHTS — erst lesen
await wpExport('export', '38309');   // schreibt scharf auf die Website
await wpExport('bestand');           // zeigt, was auf der Website liegt (§4.5b)
```

**Die drei Zahlen, die übereinstimmen müssen** (Didis Bedingung):

| | woher |
|---|---|
| `zusammenfassung.spiele` der Probe | die Antwort von `probe` |
| `wordpress.neu + wordpress.aktualisiert` | die Antwort von `export` |
| die Zahl im WordPress-Backend | Spieleliste, Quelle = ClubCampus |

Dazu: **die 11 Handbeiträge bleiben unverändert.** Sie sind die
Gegenprobe auf die Besitzregel (§4.10).

---

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

## 15 · ✅ Zwei Nebenbefunde in `ApiTab` — behoben am 07.09.2026

Beim Messen aufgefallen, beide betrafen die zweite Kachel. **Beide
erledigt; der Wortlaut des Befunds bleibt stehen, weil er erklärt, warum
so lange niemand etwas gesehen hat.**

**1 · ✅ Der tote Knopf ist weg — und es waren zwei.**

```tsx
// ApiTab.tsx:178-181, bis zum 07.09.2026
{api.active && api.key === "football_ch"
  ? <Btn … onClick={syncStarten} …>Sync starten</Btn>
  : api.active && <Btn … onClick={()=>{}}>Sync starten</Btn>}
//                          ^^^^^^^^^^^ tut nichts
…
  : <Btn … onClick={()=>{}}>Konfigurieren</Btn>}     // :190, ebenso
```

⚠ **„Konfigurieren" war der sichtbarere von beiden**, und zwar sofort:
er hing nicht an `active`. Die WordPress-Kachel trug ihn vom ersten Tag
an, während der zweite „Sync starten" erst mit Etappe 6 erschienen wäre.

⚠ **Warum es jahrelang niemandem auffiel:** es gab genau **eine** Zeile in
`api_verbindungen`, und die hiess `football_ch`. Beide Zweige waren der
`else`, und der wurde nie gerendert. **Ein toter Zweig ist unsichtbar,
solange die Bedingung nie eintritt** — und dann kommt eine zweite Zeile
dazu, und er ist plötzlich die halbe Kachel.

**Umgesetzt: der Knopf erscheint nicht.** Statt seiner steht ein Satz, der
sagt, wo die Bedienung wirklich ist. Gehalten von
`src/modules/__tests__/apiKacheln.test.jsx` — sieben Fälle an der
gerenderten Kachel und eine Strukturprüfung, die den Quelltext auf einen
leeren `onClick`-Handler absucht.

> ⚠ **Und die Strukturprüfung war in ihrer ersten Fassung rot, mit zwei
> Treffern in der gerade reparierten Datei.** Beide standen in
> **Kommentaren**, die den alten Defekt beschreiben — einer davon in dem
> Kommentar, der ihn behebt. Genau die Familie aus `CLAUDE.md`: *ein
> Werkzeug, das nach Text sucht, trifft was gleich AUSSIEHT, nicht was
> gleich GEMEINT ist.*
>
> **Die naheliegende Reparatur wäre die falsche gewesen.** Hätte ich die
> Kommentare umformuliert, wäre der Fall grün geworden und hätte ab da die
> *Beschreibung* des Fehlers bewacht statt den Fehler. Der Test streicht
> jetzt Kommentare weg, bevor er sucht — mit einem zweiten Fall, der
> festhält, dass der Stripper nicht auch den Code mitnimmt.

**2 · ✅ `API_INFOS` hat einen Eintrag `wordpress`** (`portalUtils.ts`).
Ohne ihn zeigte die Kachel „Externe API-Verbindung" und keine Feldliste.

⚠ **Und dabei fiel ein dritter Punkt an, den niemand gesucht hatte: die
Überschrift der Feldliste hiess „Synchronisierte Daten".** Für fünf
eingehende Anschlüsse war das richtig. Für den ersten **ausgehenden** ist
es die Umkehrung: „Spielplan, Resultate" steht dort nicht für das, was
hereinkommt, sondern für das, was auf eine öffentliche Website hinausgeht.
Zwei Anschlüsse mit derselben Feldliste und entgegengesetzter Richtung
sähen identisch aus — und der Unterschied ist genau der, auf den es
ankommt.

`ApiInfo` trägt deshalb ein **Pflichtfeld** `richtung: "ein" | "aus"`, und
die Kachel schreibt „Empfangene Daten:" oder „Gesendete Daten:". Pflicht,
nicht optional mit Vorgabewert: der Compiler soll die Frage bei jedem
neuen Eintrag stellen.

**3 · ✅ Die InfoBox behauptete etwas Falsches** — *„Die Adresse des
Anschlusses steht in api_verbindungen.api_url"*. Für die WordPress-Zeile
ist `api_url` bewusst `NULL` (§4.2). Sie nennt jetzt beide Fälle und
schliesst mit dem Satz, auf den es ankommt: **wohin ein Lauf tatsächlich
geschrieben hat, sagt seine Meldung, nicht die Konfiguration.**

---

### 15.1 ⚠ Das Label in der Datenbank trägt einen Host — die Datei nicht

**Gemeldet von Didi, 07.09.2026:** die Kachel heisst
**„WordPress-Export (fcherrliberg.ch)"**.

`migration_wp_export.sql` schreibt aber `'WordPress-Export'` **ohne**
Host, mit genau diesem Beispiel im Kommentar daneben. Es ist also eine
frühere Fassung eingespielt worden, und die Datei ist seither korrigiert
worden, ohne dass die Zeile nachgezogen wurde.

⚠ **Der Name ist nicht „richtig, nur zu früh" — er ist dreifach falsch,
und die dritte Art ist die schlimmste:**

| | |
|---|---|
| **heute falsch** | geschrieben wird nach `dev.fcherrliberg.ch`. Die Kachel nennt eine Adresse, an die nichts geht |
| **ein zweiter Ort** | die Adresse steht damit im Secret **und** in einer Beschriftung. Zwei Orte für eine Aussage laufen auseinander — und eine Beschriftung ist der Ort, den man am seltensten nachzieht, weil er „nur" eine Beschriftung ist |
| ⚠ **wird still richtig** | beim Umschalten stimmt der Name plötzlich — **ohne dass jemand ihn entschieden hätte.** Ein Fehler, der sich selbst behebt, wird nie bemerkt und nie gelernt. Beim übernächsten Wechsel steht er wieder falsch da, und wieder merkt es niemand |

**Die Reparatur ist ein erneuter Lauf der Migration.** Sie ist idempotent
und aktualisiert `label` über `on conflict … do update`; `active`,
`auto_sync`, `konfiguriert`, `sync_status`, `sync_meldung` und `api_url`
stehen absichtlich **nicht** im `SET` und bleiben unangetastet — ein Lauf
schaltet also nichts ab und setzt keinen Zustand zurück.

**Gegenprobe für Didi** — vorher und nachher dieselbe Zeile:

```sql
select key, label, active, auto_sync, sync_status,
       letzter_sync at time zone 'Europe/Zurich' as letzter_sync
  from public.api_verbindungen where key = 'wordpress';
```

`label` muss danach `WordPress-Export` sein, alles andere unverändert.

> ✅ **Entschieden (Didi, 07.09.2026): Anzeigename ohne Klammer, Ziel als
> eigene Zeile.** Begründung wörtlich: *„die Klammer sieht aus wie ein Ziel
> und ist ein Name. Und wenn das Ziel dasteht, sagt es die Wahrheit — auch
> dass es null ist."*
>
> Umgesetzt in der Kachel: eine Zeile **Ziel**, die **immer** erscheint. Ist
> `api_url` leer, sagt sie das — *„— steht nicht in der Datenbank, sondern in
> den Secrets der Edge Function"* — statt zu verschwinden. Eine Zeile, die
> bei fehlendem Wert verschwindet, ist von einer nicht gerenderten nicht zu
> unterscheiden.
>
> Darunter eine Zeile **Meldung**, wörtlich aus `sync_meldung`. ⚠ **Sie ist
> die einzige Stelle, an der der echte Ziel-Host steht** — der Export stellt
> ihn seiner Meldung voran. Und sie wird wörtlich übernommen, nicht zerlegt:
> den eigenen Ausgabetext zu parsen, um zu erfahren, was man selbst
> hineingeschrieben hat, ist immer der Umweg.
>
> ⚠ **`sync_meldung` hatte bis dahin gar keinen Leser** — geschrieben seit
> dem ersten Lauf, nirgends gerendert. Dieselbe Sorte offener Punkt wie
> `api_verbindungen.active` vor dem 05.09.: eine Spalte, die niemand liest.
>
> **Oben eine Behauptung über die Zukunft, unten ein Bericht über die
> Vergangenheit.** Nur das zweite kann nach einem Wechsel nicht falsch sein.

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
let letztesTeam = "\0";   // als BYTE geschrieben, nicht als Escape
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
Escape-Folge `\0` ersetzen. Der Laufzeitwert ist identisch, die Datei
wird ASCII-sicher, `grep` sieht sie wieder.

⚠ **Nicht angefasst** — es ist eine Quelltextänderung ausserhalb von
Etappe 1. Zum Nachprüfen:

```bash
python -c "d=open('src/domains/spiele/spielerAusgabe.ts','rb').read(); print(d.count(b'\0'))"
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
