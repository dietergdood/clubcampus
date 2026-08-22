# Auftrag für Claude Code — Supporter-Rückbau und Statuswechsel

## Ausgangslage

Etappe 5 hat dem Supporter eine Mitgliedschaft in `mitglieder` gegeben
(`mitgliedtyp = 'Supporter'`), damit er überhaupt auffindbar ist. Das war
Bequemlichkeit, nicht Modell.

**Am 17.08.2026 entschieden, durch die Vereinsstatuten:** Artikel 6 kennt fünf
Mitgliederkategorien — Aktivmitglieder, Junioren, Funktionäre, Ehren- und
Freimitglieder, Passivmitglieder. **Supporter steht nicht darunter.** Er ist
keine Mitgliedschaft.

Ausführlich in `ARCHITECTURE.md` unter „Supporter ist keine Mitgliedschaft" und
„Was ein Mitglied ist — die Statuten des FCH".

**Was ein Supporter ist:** eine Person ohne Mitgliedschaft, die erreichbar
bleibt, sich für Helferschichten einträgt und bestimmte News erhält. Er darf
eine Vereinsfunktion haben — sonst könnte er nicht im OK mithelfen.

## Teil A — Der Rückbau

- `macheZumSupporter()` legt keine Mitgliedschaft mehr an. `entkoppleKind()`
  setzt nur noch die Benutzerrolle.
- Die drei bestehenden Supporter-Mitgliedschaften (Philippe Kern, Heidi
  Studer, Werner Ulrich) werden entfernt; die Personen bleiben.
- Der Mitgliedtyp „Supporter" entfällt.
- `SupporterListView` liest aus `personen` statt aus `mitglieder`.

⚠ **Der letzte Punkt ist der Aufwand.** Aus `personen` gelesen ist die Zeile
keine `MemberRow` mehr — `filterMembers`, `sortMembers` und `buildGroups`
greifen nicht mehr direkt. Zeig im Plan, wie du das löst, ohne sie zu
verdoppeln.

**Wer ist Supporter?** Eine Person ohne aktive Mitgliedschaft und ohne
Kindverknüpfung. `mitgliedtypen.zaehlt_als_mitgliedschaft` (17.08.2026) ist die
Vorarbeit: Die Listentrennung hängt nicht mehr am Namen, sondern an einem
Merkmal.

**Empfängerlisten:** Supporter brauchen einen Platz in News und
Helferanfragen — getrennt von den Mitgliedern, sonst bekommt der Supporter die
GV-Einladung. Sag im Plan, wo das heute entschieden wird.

## Teil B — Statuswechsel in beide Richtungen

### Hinauf: Supporter wird Mitglied

Zwei Wege, beide bauen:

1. **Knopf „Mitglied werden"** an der Zeile in der Supporter-Liste. Öffnet ein
   Fenster: Mitgliedtyp wählen, Eintrittsdatum, fertig. Die Person bleibt
   dieselbe und bekommt eine Mitgliedschaft dazu.
2. **Suche in der Neuanlage.** Beim Anlegen eines Mitglieds wird zuerst nach
   der Person gesucht — wie bei `ElternSucheModal`. Sonst legt jemand einen
   zweiten Datensatz an, weil er nicht wusste, dass die Person schon da ist.
   Genau die Dublette, die Etappe 2a auflösen musste.

**Die Portalrolle wird automatisch gesetzt** — die Standardrolle des neuen
Mitgliedtyps, über dieselbe Ableitung wie sonst. Kein Dialog: Wer es anders
will, ändert es im Portal-Tab.

### Hinunter: Mitglied tritt aus

**Alles wird auf Supporter-Niveau abgestuft.** Entschieden am 17.08.2026:

| | |
|---|---|
| Mitgliedschaft | `aktiv = false`, bleibt als Historie stehen |
| Portalrolle | `supporter` |
| Kadereinträge | inaktiv |
| Vereinsfunktionen | **inaktiv mit Datum, nicht gelöscht** |

⚠ **Inaktiv statt gelöscht ist ausdrücklich so gewollt.** Artikel 8 verlangt
zwar die sofortige Streichung von der Funktionärsliste — für die
Vereinsgeschichte wäre es aber ein Verlust, wenn nicht mehr nachvollziehbar
ist, dass jemand fünf Jahre Kassier war. Die Streichung wirkt, die Spur bleibt.

Prüf, ob `benutzer_funktionen` ein Feld dafür hat. Falls nicht, gehört eines
dazu — mit dem Datum, nicht nur einem Häkchen.

**Mit Rückfrage, nicht automatisch.** Supporter ist nur eine von mehreren
richtigen Antworten: Wer zwanzig Jahre im Vorstand war, wird vielleicht
Ehrenmitglied; wer weiterspielt, Aktivmitglied; wer gar nichts mehr will,
archiviert. Das entscheidet der Vorstand, nicht die Software.

Der Fall entsteht heute schon beim Entkoppeln des letzten Kindes — dort auch
die Rückfrage einbauen.

## Was NICHT Teil dieses Auftrags ist

Die Personenseite statt Modal. Sie wäre der natürliche Ort für den
Statuswechsel, ist aber ein eigenes Vorhaben (`MemberHero` und `MemberDetail`
nach `src/shared/person/`). Bau den Wechsel so, dass er später dorthin
umziehen kann.

## Beim Bauen gilt

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- Eine Person wird **nie** gelöscht. Seit Etappe 2a kann hinter einer
  Elternzeile ein Aktivmitglied stehen.
- Migration über drei Anweisungen hinaus in einen `do $mig$`-Block mit Prüfung
  am Ende.
- Erwartete Zahlen der Zählprobe aus dem **Dump** ableiten, nicht aus dem
  Skript — ein `CHECK` steht inline im `CREATE TABLE`, ein partieller
  UNIQUE-Index als `CREATE UNIQUE INDEX`.
- Keine Datei ohne `npm run typecheck`, `npm run build`, `npm test`.
- Deutsch (Schweiz) in Kommentaren, kein ß.
