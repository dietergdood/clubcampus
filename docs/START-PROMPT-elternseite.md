# START-PROMPT

Lies `CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

Dann `docs/auftrag_feldkonfig_gilt_fuer.md`.

Drei Aufträge hängen zusammen und werden **nacheinander** abgearbeitet:

1. `auftrag_feldkonfig_gilt_fuer.md` — die Achse „ohne Mitgliedschaft" in der
   Feldkonfiguration. Enthält die gemeinsame Migration.
2. `auftrag_elternseite.md` — die RLS- und Maskenarbeit, die darauf aufsetzt.
3. `auftrag_email_identitaet.md` — Kontakt und Login, eigenes Vorhaben.

Fang mit Nummer 1 an. Nummer 2 und 3 liest du jetzt noch nicht.

Erwartet wird zuerst eine **Bestandsaufnahme mit Plan**, keine Änderung. Der
Plan beantwortet:

- Die Seed-Liste: bestätige die Aufteilung im Auftrag gegen die vollständige
  `FELD_REGISTRY` (27 Einträge).
- Den Vorschlag für das Registry-Merkmal `nur_mitgliedschaft`, mit dem die zehn
  strukturellen Felder aus der Spalte „Ohne Mitgliedschaft" verschwinden.
- Das `KonfigZiel` für `getFeldkonfig`, `setzeModus` und `setzeModusMehrere`.
- Jede Aufrufstelle von `getFeldkonfig`, mit der Aussage, welcher Fall dort
  gilt.
- Ob der Ladepfad der `FeldkonfigZeile` `gilt_fuer` heute mitbringt.
- Die Ids der Junioren-Mitgliedtypen, aus der Datenbank gelesen und nicht aus
  dem Namen geraten.
- Wie viele Nicht-Junioren heute keine E-Mail haben.

Vor Beginn: `npm test` laufen lassen und die Zahl nennen. Erwartet sind 567
grün. Weicht es ab, sag es, bevor du irgendetwas anfasst.
