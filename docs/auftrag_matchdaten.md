# Auftrag für Claude Code — Matchdaten vom SFV

## Warum jetzt und nicht später

Die Matchdaten-Endpunkte liefern **nur die laufende Saison**. Spiele der Saison
2025/26 antworten durchgehend mit 404 — geprüft an sechs 2.-Liga-Spielen bei
der Erkundung am 13.08.2026.

Wer Historie will, muss archivieren, **während** die Saison läuft. Ein
verpasstes Spiel ist unwiederbringlich weg. Die Saison 2026/27 läuft seit dem
1. Juli; jeder Tag ohne Sync ist ein Tag, den es später nicht mehr gibt.

Das ist der eigentliche Grund für die Dringlichkeit — nicht der Funktionsumfang.

## Die Regel, die alles andere bestimmt

**Von fremden Spielern wird nichts gespeichert. Gar nichts.**

Die Endpunkte liefern zu jedem Ereignis `personName`, `birthDate` und
`passportNumber` — auch von Spielern anderer Vereine, darunter Minderjährige.
Diese Daten dauerhaft zu halten wäre eine Datensammlung, die niemand bestellt
hat und für die es keinen Zweck gibt.

Entschieden am 17.08.2026: **Eigene Spieler mit Namen, der Gegner als Verein.**

```
 2.  Tor          ·  FC Herrliberg
34.  Tor          ·  M. Baumann
41.  Verwarnung   ·  FC Küsnacht
67.  Tor          ·  FC Küsnacht
```

Der Spielverlauf bleibt vollständig — Minute, Ereignis, welche Seite. Nur die
Person dahinter bleibt anonym. Wer den gegnerischen Torschützen wissen will,
findet ihn auf football.ch; dort gehört er hin.

**Unterschieden wird über `clubNumber`.** Die des FCH ist **11057** — nicht die
ClubId 1516. In Ranglisten und Matchdaten steht ausschliesslich die
`clubNumber`.

```
clubNumber === unsere  →  personName, jerseyNumber, personId übernehmen
sonst                  →  nur den Vereinsnamen, alles Personenbezogene verwerfen
```

Das ist eine Zeile Logik im Sync und **keine** Regel, die jemand später
einhalten muss. Genau deshalb so gebaut: Was nie gespeichert wird, kann nicht
versehentlich angezeigt, exportiert oder vergessen werden.

`birthDate` und `passportNumber` werden **auch bei eigenen Spielern nicht**
gespeichert — die stehen in `personen`, dort gehören sie hin, und eine zweite
Kopie liefe auseinander.

## Was zu holen ist

Pro Spiel, dessen `sfv_status` auf 2 („ausgetragen") steht und das noch keine
Matchdaten hat:

| Endpunkt | Inhalt |
|---|---|
| `/api/match/{id}` | Halbzeitstand (`intermediateResults`), `hasMatchEnded`, `teams[]` mit `isHomeTeam` |
| `/api/match/{id}/events` | Tore, Karten, Auswechslungen — mit Minute |
| `/api/match/{id}/players` | Aufstellung: Position, Rückennummer, Einsatzminuten |

Nicht in diesem Auftrag: `/bench` und `/referees`. Sie liefern dieselbe Sorte
Personendaten und haben für Spielbericht und Statistik keinen Nutzen. Falls sie
je gebraucht werden, gilt dieselbe `clubNumber`-Regel.

**Der Halbzeitstand schliesst nebenbei eine Lücke.** `ht_resultat` steht seit
dem 14.08.2026 in der Verein-Spalte der Feldhoheit, weil der Spielplan-Endpunkt
keine Halbzeit liefert. Über `/api/match/{id}` käme sie — dann müsste die
Feldhoheit für dieses eine Feld neu entschieden werden. **Nicht eigenmächtig
umstellen**, sondern im Bericht vorlegen: Wer trägt die Halbzeit ein, der SFV
oder der Verein?

## Wie oft und wie viele Aufrufe

Der Spielplan-Sync macht heute fünf Aufrufe pro Lauf. Matchdaten wären **drei
Aufrufe pro Spiel** — bei 268 Spielen und stündlichem Lauf wäre das nicht
tragbar, zumal Rate Limits nicht dokumentiert sind.

Deshalb: **nur neue Spiele, und mit Obergrenze.** Ein Lauf holt die Matchdaten
von höchstens N Spielen, die ausgetragen sind und noch keine haben. Der Rest
kommt in der nächsten Stunde. Schlag einen Wert für N vor und begründe ihn.

Ein Spiel wird **einmal** geholt. Nachträgliche Korrekturen des SFV (falsch
erfasstes Tor, nachgereichte Karte) kämen damit nicht an — sag mir im Bericht,
ob das ein Problem ist und was du vorschlägst.

## Wozu das Ganze

Zwei Zwecke, und sie stellen verschiedene Anforderungen:

**Spielbericht** — auf der Vereinswebsite und im Portal. Braucht den
Spielverlauf mit Minute und Ereignis, den Halbzeitstand, die Aufstellung.

**Einsatzstatistik der eigenen Spieler** — wer hat wie viele Minuten, Tore,
Karten. Braucht die Verknüpfung von SFV-`personId` zu euren `personen`. Über
`jerseyNumber` allein geht es nicht: Rückennummern wiederholen sich über Teams
hinweg.

**Wie die Verknüpfung entstehen soll, ist offen.** Automatisch über den Namen
wäre dieselbe Falle wie bei der Team-Zuordnung — „M. Baumann" gibt es
womöglich zweimal. Von Hand wäre bei jedem neuen Spieler ein Schritt.
Schlag etwas vor, bau es nicht.

## Vorgehen

1. **Bestandsaufnahme und Plan.** Welche Tabellen, welche Felder, wie der
   Ablauf. Was du an bestehenden Bausteinen wiederverwendest.
2. **Migration zeigen**, ich führe sie aus.
3. **Sync erweitern.**
4. **Anzeige** — eigener Schritt, nicht im selben Zug.

Beim Bauen gilt, was schon entschieden ist:

- Ein Token pro Lauf, streng seriell. Ein zweiter `POST /api/token` macht den
  ersten sofort ungültig (am 13.08.2026 gemessen).
- Die Laufsperre über `api_verbindungen.sync_laeuft_seit` gilt für den ganzen
  Lauf, Matchdaten inbegriffen.
- Feldhoheit über `sync_felder`, in beide Richtungen geprüft.
- Jede neue Tabelle: `verein_id NOT NULL`, Index, RLS, Policies mit
  `using` **und** `with check`.
- Migrationen über drei Anweisungen hinaus in einen `do $mig$`-Block mit
  Prüfung am Ende — nach den zwei stillen Ausfällen vom 13. und 14.08.2026.
- Kein `console.*` in der Edge Function.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- Keine Datei ohne `npm run typecheck` (0 neue Fehler), `npm run build`
  (grün), `npm test` (alle grün — aktuelle Zahl aus CLAUDE.md).
- Nach jeder Strukturänderung Dump **und** Typen nachziehen.
- Deutsch (Schweiz) in Kommentaren, kein ß.
