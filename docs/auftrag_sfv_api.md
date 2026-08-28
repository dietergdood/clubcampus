# Auftrag für Claude Code — SFV Club API anbinden

## Warum

Zwei Systeme brauchen dieselben Daten: **ClubCampus** für das Spielplan-Modul
und die **FCH-Vereinswebsite**, die ohne Spielplan und Tabellen nicht online
gehen kann. Heute wird beides von Hand gepflegt.

Der SFV bietet dafür eine offizielle Club-API. Die Gebühr (rund 200 CHF/Jahr)
zahlt der Verein direkt an den SFV.

## Die Architekturentscheidung, die schon getroffen ist

**ClubCampus holt, speichert und liefert. Die Website liest aus ClubCampus.**

Nicht: Website und ClubCampus rufen beide den SFV.

Gründe:

- **Ein Schlüssel an einem Ort.** Die Website bekommt keine SFV-Zugangsdaten —
  dieselbe Regel wie bei den Mitgliederdaten, wo die Website auch keinen
  Supabase-Key mit Leserecht bekommt, sondern eine eigene View mit
  `oeffentlich`-Flag.
- **Eine Gebühr, ein Zwischenspeicher, ein Ort für Rate-Limits.**
- **ClubCampus braucht die Daten ohnehin.** Das Spielplan-Modul läuft heute auf
  `demoData`.
- Fällt der SFV kurz aus, zeigt die Website den letzten Stand statt einer
  leeren Seite.

## Was vorliegt

| | |
|---|---|
| ClubID FC Herrliberg | **1516** |
| Token-Endpunkt (Produktion) | `https://club-api-services.football.ch/api/token` |
| Swagger (Staging) | `https://stg-club-api-services.football.ch/swagger/index.html` |
| Umgebungen | `stg-…` ist Staging, ohne Präfix Produktion. Ob Staging echte FCH-Daten enthält, ist **ungeprüft** — Spezifikation von dort lesen, Aufrufe gegen Produktion (reines Lesen, verändert nichts). |
| Stammdaten | `docs/sfv/sfv_stammdaten.xlsx` und `.json` |

### Zugangsdaten

Liegen in `supabase/functions/.env` (über `.gitignore` ausgeschlossen) unter
diesen Namen:

```
SFV_CLUB_ID=1516
SFV_API_URL=https://club-api-services.football.ch
SFV_APPLICATION_KEY=…
SFV_APPLICATION_PASS=…
```

Der SFV nennt die beiden Letzteren „ApplicationKey" und „ApplicationPass" —
es sind Zugangsdaten für eine Anwendung, nicht für eine Person. Sie hängen
also nicht an einem persönlichen clubcorner-Login.

⚠ **Drei Regeln, die nicht verhandelbar sind:**

1. **Kein `VITE_`-Präfix.** ClubCampus ist eine Vite-App — alles mit diesem
   Präfix wird beim Bauen fest in das JavaScript geschrieben, das jeder
   Besucher herunterlädt. Beim `VITE_SUPABASE_ANON_KEY` ist das in Ordnung
   (öffentlich gedacht, durch RLS geschützt), bei den SFV-Zugangsdaten wäre
   es ein Leck.
2. **Der Aufruf gehört auf den Server**, nicht in den Browser — also in eine
   Supabase Edge Function. Das Muster gibt es bereits:
   `supabase/functions/invite-user` liest seine Geheimnisse mit
   `Deno.env.get()`. Im Betrieb kommen sie aus
   `npx supabase secrets set …`, nicht aus einer Datei.
3. **Niemals ins Log.** Ein `console.log(response)` beim Fehlersuchen ist
   schnell getippt, und Supabase-Logs sind lesbar. Wurden Zugangsdaten
   einmal versehentlich committed, hilft Löschen nicht — die Git-Historie
   vergisst nichts, sie müssen beim SFV neu vergeben werden.

### Die Stammdaten

Elf Codetabellen, die man braucht, um die API-Antworten zu lesen:

| Blatt | Einträge | Inhalt |
|---|---|---|
| Liga | 352 | NLA bis FE-13, inkl. Stärkeklassen |
| Ereignissubtyp | 100 | Tordetails, Kartengründe |
| Spielerposition | 35 | TH, LIB, … |
| Ereignistyp | 30 | Tor, Auswechslung, Verwarnung, Ausschluss, Assist |
| Rollenkategorie | 28 | Spieler, Schiedsrichter, … |
| Organisation | 17 | SFV, SFL, Regionalverbände |
| Spieltyp | 15 | Meisterschaft, Cup, … |
| Spielstatus | 12 | „noch nicht ausgetragen", „ausgetragen" |
| Resultattyp | 11 | Halbzeit, Schlussresultat |
| Saison | **1** | siehe unten |

⚠ **Die Saison-Tabelle ist veraltet und die ID-Logik ist nicht belegt.** Sie
enthält genau eine Zeile: `sSaisonID 2025` für den Zeitraum 1.7.2024 bis
30.6.2025. Die Saison wird also offenbar nach dem **Endjahr** benannt — die
laufende Saison (Juli 2026 bis Juni 2027) hätte demnach die ID **2027**.
Das ist eine Vermutung. **Gegen die API prüfen, nicht annehmen.**

## Schritt 1 — Erkunden, NICHTS bauen

Hol dir die Spezifikation:

```
https://stg-club-api-services.football.ch/swagger/v1/swagger.json
```

(Falls der Pfad nicht stimmt: Die Swagger-Oberfläche nennt ihn oben.)

**Berichte dann, bevor du irgendetwas änderst:**

1. **Welche Endpunkte gibt es?** Vollständige Liste mit Methode und Pfad.
2. **Wie funktioniert die Authentifizierung?** Was erwartet `/api/token`,
   was gibt er zurück, wie lange gilt ein Token, gibt es einen Refresh?
3. **Welcher Endpunkt liefert die Spiele eines Vereins?** Parameter
   (ClubID? Saison? Liga? Zeitraum?), Antwortstruktur, Feldnamen.
4. **Welcher Endpunkt liefert eine Tabelle/Rangliste?** Oder gibt es keine —
   dann müsste sie aus den Resultaten gerechnet werden, was eine ganz andere
   Aufgabe wäre.
5. **Welcher Endpunkt liefert die Teams des Vereins?** Wir brauchen die
   Zuordnung von FCH-Teams zu SFV-Liga-IDs.
6. **Gibt es Aufstellungen, Torschützen, Karten?** Nur für die Einordnung —
   das Matchdaten-Modul ist nicht Teil dieses Auftrags.
7. **Rate Limits, Nutzungsbedingungen, Caching-Vorgaben?** Steht oft in der
   Beschreibung. Wichtig für das Sync-Intervall.
8. **Unterscheiden sich Staging und Produktion** in Pfaden oder Feldern?

Dazu, falls die Zugangsdaten vorliegen: **einen echten Aufruf** gegen Staging
mit ClubID 1516, und die tatsächliche Antwort zeigen. Eine Spezifikation sagt,
was möglich ist; die Antwort sagt, was wirklich kommt.

**Danach Plan zeigen und auf Freigabe warten.**

---

## Die Spezifikation, gelesen am 28.08.2026

Die Swagger-Datei war bis dahin **nur verlinkt, nie geholt** — zwei Wochen
lang stand oben eine Fragenliste, deren Antworten einen `curl` weit entfernt
waren. Geholt von `https://stg-club-api-services.football.ch/swagger/v1/swagger.json`
(92 KB, HTTP 200, öffentlich, kein Token nötig), Titel *SFV Club API
Interface*, Version **v26.7.10.1**.

**Zu Frage 1 — es gibt genau 15 Endpunkte, alle GET ausser dem Token:**

```
POST /api/token
GET  /api/common/ids
GET  /api/team/list · /api/team/picture/{teamId}
GET  /api/club/schedule · /api/club/ranking
GET  /api/club/{clubId}/coaches · /officials · /players · /referees
GET  /api/match/{matchId} · /players · /events · /referees · /bench
```

Vier davon kennt unser Sync **nicht**: die vier `club/{clubId}/…`-Endpunkte
und `match/{matchId}/bench`.

**⚠ Zu Frage 4 — und das ist die Antwort, die einen ganzen Umbau erledigt
hat:** `/api/club/ranking` liefert das Schema `Ranking` mit **19 Feldern**,
und **keines trennt Heim von Auswärts**. Unser Mapper (`sync.ts:110`) liest
18 davon; das einzige ungenutzte ist `leagueNumber`. Eine Suche über die
ganze Datei nach `home`/`away` findet `isHomeTeam` nur in `MatchDetail`,
`MatchEvent`, `Player` und `PlayerBench` — **nie in `Ranking`, nie in
`Schedule`**.

**⚠ Es gibt keinen gruppen- oder ligabasierten Endpunkt.** `ClubId` ist bei
`schedule`, `ranking` und `team/list` **Pflicht**; `GroupId` existiert nur
als *optionaler Filter* innerhalb des Vereins (bei `ranking` als `GroupeId`
geschrieben — Tippfehler der API). Spiele einer ganzen Gruppe sind damit
nicht abrufbar, und zwar aus drei unabhängigen Gründen:

1. kein Gruppenendpunkt (oben),
2. `/api/club/schedule?ClubId=1516` liefert **ausschliesslich** Spiele mit
   eigener Beteiligung — `spiele.ohne_team` war in **allen 185** protokollierten
   Läufen `0` (`api_sync_log.details`, gemessen 28.08.2026),
3. **die ClubId fremder Vereine steht nirgends im Bestand.**
   `ranglisten.club_nummer` ist die **clubNumber** (FCH 11057), nicht die
   ClubId (1516) — zwei verschiedene Zahlen, und eine Abbildung gibt es weder
   in der Datenbank noch in einem Endpunkt.

Für die 21 FCH-Gruppen wären es **71 verschiedene fremde Vereine**. Das ist
keine technische Frage mehr, sondern eine an den Verband.

**Was daraus folgt und schon gebaut ist:** die Heim-/Auswärtsbilanz gibt es
nur für **eigene** Teams (`domains/spiele/heimAuswaerts.ts`). Eine
Gruppentabelle mit Heim-/Auswärtstrennung ist mit dieser API nicht zu haben.

**Grössenordnung, falls die Frage doch beantwortet wird:** 21 Gruppen mit
8–14 Teams (232 Ranglistenzeilen, Ø 11.05), 234 eigene Meisterschaftsspiele.
Fremde Spiele wären **rund 1088** — `spiele` wüchse von 269 auf ~1357,
Faktor 5. Zeit wäre nicht das Hindernis: ein Lauf braucht heute im Median
**8,6 s** (188 Läufe, p90 10,6 s, max 18,1 s) bei 45 HTTP-Aufrufen, also
~0,19 s je Aufruf.

⚠ **Und der Kommentar in `sync.ts:27` ist überholt:** es sind **vier**
Aufrufe je Spiel, nicht drei — `holeSchiedsrichter` kam am 20.08.2026 dazu
(`matchdatenLauf.ts:87–90`). Dabei aufgefallen: **`holeMatch` wird
aufgerufen und sein Rückgabewert verworfen** (`matchdatenLauf.ts:87`, kein
`const`). Er ist ein Viertel der Matchdaten-Aufrufe und trägt genau die
Felder, die anderswo fehlen — `teams[].isHomeTeam`, dazu die Quellen für
`ht_resultat` und `zuschauer`, die beide leer bleiben. Ob der Aufruf als
Erreichbarkeitsprüfung gedacht ist, steht nirgends; `holeAufstellung` würde
denselben 404 liefern.

## Schritt 2 — Was danach zu bauen ist (Skizze, nicht Auftrag)

Erst nach Freigabe. Die Skizze dient nur dazu, beim Erkunden auf das Richtige
zu achten.

**Datenbank.** Was heute fehlt:

- `spiele` hat keine SFV-Spiel-Id — ohne sie lässt sich beim Sync nicht
  entscheiden, ob ein Spiel neu ist oder aktualisiert wird. Es gibt bereits
  `liga`, `spiel_nr`, `resultat`, `ht_resultat`, `schiedsrichter`,
  `zuschauer`, `status` — prüfen, ob `spiel_nr` die SFV-Id ist oder etwas
  anderes.
- `teams` hat `liga` als Text und keine SFV-Liga-Id. Für den Abruf pro Team
  braucht es die Zuordnung.
- **Eine Tabelle für Ranglisten gibt es gar nicht.**
- Jede neue Tabelle: `verein_id`, Index, RLS, SELECT- und Schreib-Policies.

**Sync.** `api_verbindungen` und `api_sync_log` stehen bereits und sind
generisch: `api_url`, `auto_sync`, `sync_intervall`, `sync_uhrzeit`,
`sync_felder`, `letzter_sync`, `sync_status`. Der SFV wird ein Eintrag darin,
kein Sonderweg. **Die Staging- und Produktionsadresse gehören in
`api_verbindungen.api_url`, nicht fest in den Code.**

**Für die Website** eine öffentliche, lesende Sicht — nur Spiele und Tabellen,
keine Personendaten. Beim Bauen dieselbe Vorsicht wie bei `portal_zugang`:
Wer `security_invoker` weglässt, umgeht RLS.

## Was NICHT Teil dieses Auftrags ist

- Das Matchdaten-Modul (Aufstellungen, Torschützen, Karten).
- Die Kader-Migration von `demoData` nach Supabase — die ist der grössere
  Nachbar und läuft getrennt.
- Die Website selbst.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil, bis „Post-Refactoring
Pflicht-Workflow" — alles unter „Archiv" ist Historie).

Für diesen Auftrag besonders:

- **Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.**
- Keine Zugangsdaten im Code, in Logs oder in einem Commit.
- Keine Datei ohne `npm run typecheck` (0 neue Fehler), `npm run build`
  (grün), `npm test` (372 grün).
- Nach jeder Strukturänderung Dump **und** Typen nachziehen.
- Deutsch (Schweiz) in Kommentaren, kein ß.
