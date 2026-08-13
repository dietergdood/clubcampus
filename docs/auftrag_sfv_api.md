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
