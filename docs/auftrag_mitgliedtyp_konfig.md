# Auftrag für Claude Code — Was ein Mitgliedtyp hat

## Das Problem

Heute liegt an vier Stellen verstreut, was ein Mitgliedsprofil zeigt:

| Wo | Was |
|---|---|
| `mitgliedtyp_pflichtfelder` | welche Felder ausgefüllt sein müssen — lebt, wird gepflegt |
| `rolle_pflichtfelder` | dasselbe pro Portalrolle |
| `getFieldVisibility()` in `memberUtils.tsx` | acht fest verdrahtete Zeilen, gesteuert über ein Rollen-Level |
| `InfoTab.tsx` | `fv.showPass`, `fv.showFairgateId`, `fv.showNotizen`, seit 17.08. `istSupporter` |

Wer einen Mitgliedtyp einrichtet, muss zwei Orte kennen und den Rest im Code
ändern lassen. Und `istSupporter` ist bereits die vierte Stelle, an der jemand
im Code entscheidet, was ein Profil zeigt — beim nächsten Sonderfall wäre es
die fünfte.

## Was gebaut wird

**Eine Seite in Portalverwaltung → Benutzer & Rollen → Mitgliedertyp-Konfiguration.** Sie ersetzt die
heutige Pflichtfeld-Matrix dort, statt danebenzustehen.

Pro Mitgliedtyp bekommt jedes Feld **einen** von drei Werten:

| Wert | Wirkung |
|---|---|
| **Pflicht** | wird im Profil gezeigt, in der Neuanlage verlangt, von der Datenprüfung eingefordert |
| **Freiwillig** | wird gezeigt, darf leer bleiben |
| **Gibt es nicht** | verschwindet aus Profil, Neuanlage und Datenprüfung — **für alle, auch für die Verwaltung** |

Der dritte Wert ist der neue. Heute gibt es nur Pflicht ja/nein.

**Aufbau der Seite:** Bereiche als Überschriften (Personalien, Kontakt,
Vereinsdaten, Teams, Vereinsfunktionen, Notizen), darunter die Felder mit je
einem Auswahlfeld. Pro Bereich ein Sammelschalter „Bereich aus", der alle
Felder darunter auf „Gibt es nicht" setzt. Darunter die Tabs des Profils
(Eltern, Statistik, Portal-Zugang, Datenprüfung, Verlauf) als an/aus.

⚠ **Zeilen bleiben immer sichtbar**, auch bei „Gibt es nicht" — nur optisch
zurückgenommen. Sonst käme man nicht mehr heran, um sie wieder einzuschalten.

## Was NICHT Teil dieses Auftrags ist

**Die Rollen-Sichtbarkeit** — „wer sieht was bei anderen". Das ist eine zweite
Seite und wartet bewusst: Solange die Rechte an Rollennamen hängen statt an
Gruppen, würde sie eine Rollenleiter zementieren. Erst die Gruppenrechte
(`docs/auftrag_rls_gruppenrechte.md`), dann diese Seite — und dann mit Wirkung
in der Datenbank, nicht nur in der Anzeige.

**Die Navigation der Portalverwaltung** wird nicht umgestellt. Sie ist schief
(„Benutzer & Rollen" ist Kategorie *und* Tab darin, Rollen liegen an vier
Orten), aber das ist eine eigene Aufgabe.

## Fragen, die vor dem Bauen zu klären sind

Beantworte sie im Plan, entscheide sie nicht selbst:

1. **`rolle_pflichtfelder`** — wird sie tatsächlich benutzt? Sie hält
   Pflichtfelder pro Portalrolle, also „ein Trainer braucht eine
   Telefonnummer". Neben dem Mitgliedtyp eine zweite Achse für dieselbe
   Frage. Schau nach, was drinsteht und wer sie liest
   (`domains/members/pflichtfelder.ts`). Wenn sie leer ist oder dasselbe
   sagt: Vorschlag zum Abbau.

2. **Voreinstellung bei einem neuen Mitgliedtyp** — alles an oder alles aus?
   Mein Vorschlag: alles an, freiwillig. Wer etwas verbergen will, sucht
   danach; wer etwas vermisst, sucht nicht.

3. **Woran hängt ein Feld?** Heute prüft `InfoTab` teils den Mitgliedtyp
   (`istSupporter`), teils ein Rollen-Level (`fv.showPass`). Nach diesem
   Umbau soll **eine** Quelle entscheiden, was es gibt. Zeig mir, welche
   `fv.*`-Prüfungen dadurch entfallen und welche bleiben, weil sie
   tatsächlich die Rolle meinen.

4. **Was passiert mit `istSupporter`?** Die Ausblendung vom 17.08.2026 ist
   ein Vorgriff auf genau diese Seite. Nach dem Umbau sollte sie
   verschwinden — der Supporter bekommt seine drei Bereiche einfach auf
   „Gibt es nicht" gesetzt. Prüf, ob das aufgeht.

5. **Bestehende Daten.** `mitgliedtyp_pflichtfelder` ist gepflegt und darf
   nicht verlorengehen. Zeig im Plan, wie die Migration die vorhandenen
   Zeilen überführt: `pflicht = true` → Pflicht, `pflicht = false` →
   Freiwillig, fehlende Zeile → was?

## Beim Bauen gilt

- **Kein hartkodierter Mitgliedtyp mehr.** `SUPPORTER_TYP` in
  `memberConstants.ts` war eine Notlösung und trägt einen Warnhinweis: Der
  Name ist der Schlüssel, es gibt kein strukturelles Merkmal. Nach diesem
  Umbau soll er entfallen.
- Die Konfiguration gehört in `domains/`, nicht in die Komponente. Ein
  `useMitgliedtypKonfig` oder ähnlich, das Profil, Neuanlage und
  Datenprüfung dieselbe Antwort gibt.
- Neue Tabelle: `verein_id NOT NULL`, Index, RLS, Policies mit `using`
  **und** `with check`.
- Migration über drei Anweisungen hinaus in einen `do $mig$`-Block mit
  Prüfung am Ende — nach den stillen Ausfällen vom 13. und 14.08.2026.
- `mitgliedtypen_name_key` und `mitgliedtyp_pflichtfelder` auf
  Mandantenfähigkeit prüfen, falls noch nicht geschehen.

## Vorgehen

1. Bestandsaufnahme und Plan, mit Antworten auf die fünf Fragen.
   **Nichts bauen.**
2. Migration zeigen, Didi führt sie aus.
3. Domain und Oberfläche.
4. Die vier Codestellen ablösen, die heute selbst entscheiden.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- Keine Datei ohne `npm run typecheck` (0 neue Fehler), `npm run build`
  (grün), `npm test` (403 grün).
- Nach jeder Strukturänderung Dump **und** Typen nachziehen.
- Deutsch (Schweiz) in Kommentaren, kein ß.
