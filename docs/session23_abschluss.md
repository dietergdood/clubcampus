# Session 23 — 05.08.2026

Der Personen-Umbau, vollständig. Dazu ein gutes Dutzend stiller Fehler, die
niemand gemeldet hatte, weil sie nichts kaputtmachten — sondern nur das
Falsche taten.

**Tests: 254 → 372.**

---

## Was in der Datenbank steht

| Datei | Inhalt |
|---|---|
| `etappe2a_merge.sql` | Personen über E-Mail zusammengeführt, 908 → 905 |
| `etappe2b_backfill_person_id.sql` | Personen für Mitgliedschaften ohne |
| `etappe3_seed.sql` | Geschwister und Fälle ohne E-Mail — die im Bestand fehlten |
| `etappe3_eltern.sql` | Elternkontakte auf `personen`, `eltern_kinder.person_id` NOT NULL |
| `etappe4_vorbereitung.sql` | 6 Testkonten gelöscht, 3 Personen angelegt |
| `etappe4_benutzer.sql` | `benutzer` an die Person, Registrierung repariert |
| `etappe5_supporter.sql` | Supporter als Mitgliedtyp, Rolle `mitglied`, Unique-Index |
| `etappe6a_altspalten_mitglieder.sql` | 18 Personenfelder gestrichen |
| `etappe6b_position_rueckennr.sql` | Position und Nummer an die Kaderzeile |
| `etappe6c_restliche_altspalten.sql` | 5 weitere Spalten, `handle_new_user()` neu |
| `migration_portal_zugang.sql` | Sicht für die Portal-Spalte der Elternliste |

`mitglieder` ist von **39 auf 14 Spalten** geschrumpft.

Drei Sicherheitskopien liegen bereit und können in ein paar Wochen weg:
`_etappe6_altspalten_mitglieder`, `_etappe6b_position_mitglieder`,
`_etappe6c_altspalten_mitglieder`.

---

## Die Fehler, die dabei auffielen

Sie waren alle schon da. Sichtbar wurden sie erst, weil der Umbau die
Altspalten wegnahm und der Typecheck damit anschlug.

**Der Registrierungsablauf war seit Etappe 3 kaputt.** `handle_new_user()`
und `check_email_bekannt()` suchten in `mitglieder.email` (seit Etappe 2b eine
Altspalte) und ersatzweise in `elternkontakte` (seit Etappe 3 abgelöst). Ein
neuer Elternteil konnte sich nicht registrieren.

**Verwaiste Auth-Konten entstanden lautlos.** Bei unbekannter E-Mail brach der
Trigger still ab, die `auth.users`-Zeile blieb stehen. Jetzt wirft er, und
Supabase rollt mit zurück — auch wenn jemand am Formular vorbei registriert.

**487 Kaderrollen im Funktionenfeld.** In `mitglieder.funktionen` stand bei 487
Mitgliedern „Spieler". `ableitRolle()` prüft nur `funktionen.length > 0` und
machte damit jeden zum Funktionär, der gerade in keinem Kader stand. Bereinigt
— in **beiden** Tabellen: die erste Runde traf nur `mitglieder`, gelesen wird
aber `personen`.

**493 von 512 Mitgliedern hatten keine Rolle.** `ableitUndSaveRolle()` läuft nur
bei Kader-, Team- oder Funktionsänderungen. Vorher fiel es nicht auf, weil das
fälschliche „Spieler" die Ableitung anstiess.

**Die Portal-Spalte log Trainern etwas vor.** Sie kam nach Etappe 3 aus
`benutzer`, wo nur Admin- und Self-Policies gelten — der Join lieferte eine
leere Menge, und die Liste zeigte für alle „Kein Zugang", ohne Fehler.

**`hat_portal_zugang` konnte veralten.** Ein Kennzeichen am Mitglied, das
dieselbe Frage beantwortete wie der Join auf `benutzer`. Wurde ein Konto
ausserhalb des Portals gelöscht, blieb es auf `true`.

**`mitglieder.eltern` war mit dem falschen Inhalt gefüllt** — 391 Zeilen mit
Name, E-Mail, Telefon, aber ohne `benutzer_id`. Der Filter konnte nie treffen.

**Die Rolle `mitglied` existierte in `portal_rollen`, war aber deaktiviert** und
fehlte in `types.ts`, `getPermissions` und `NAV_BY_ROLE` — obwohl drei
Mitgliedtypen sie als Standardrolle tragen.

**`mitgliedtypen_name_key` war global unique**, ebenso zwölf weitere Schlüssel.
Beim zweiten Verein hätte niemand einen eigenen Mitgliedtyp „Aktivmitglied"
anlegen können.

---

## Entscheidungen, die getroffen wurden

**`rolle` bleibt am Mitglied.** Die Spalte „Portalrolle" sagt, welche
**Berechtigung** jemand hat; „Portal-Zugang" daneben sagt, ob er sie **nutzen**
kann. Zwei Hälften einer Aussage. Man sieht damit, dass ein Trainer noch kein
Konto hat und eine Einladung lohnt.

**Die Rolle `mitglied` ist nicht durch `supporter` zu ersetzen.** Ein Passiv-,
Ehren- oder Freimitglied ist Mitglied des Vereins mit Stimmrecht an der GV, ein
Supporter ist Gönner von aussen.

**Der Chip im Profilkopf zeigt den Mitgliedtyp**, wenn jemand weder im Kader
steht noch eine Vereinsfunktion hat — dort war die Portalrolle nur aus
`standard_rolle` abgeleitet und behauptete eine Tätigkeit, die es nicht gibt.
Häufigster Fall: der neu erfasste Junior.

**Eine Person wird nie gelöscht.** Seit Etappe 2a kann hinter einer Elternzeile
ein Aktivmitglied stehen.

**`ableitRolle()` bleibt unverändert.** Die Reihenfolge (Standardrolle vor
Funktionen) ist Absicht: Wer im Grümpi-OK mithilft, ist kein Funktionär. Der
Preis — ein Junior, der Kassier wird, bleibt Spieler — löst sich mit den
Gruppenrechten.

---

## ⚠ Zu klären, bevor es weitergeht

**Was ist ein Supporter?** Etappe 5 hat ihm eine Mitgliedschaft gegeben. Der
Einwand: Ein Supporter hat keine. Siehe den eigenen Abschnitt in `CLAUDE.md` —
vier offene Fragen, und ein Rückbau ist wahrscheinlich.

**Von Hand gesetzte Rollen werden still überschrieben.** Der Portal-Tab erlaubt
es, `updateMitgliedRolle()` schreibt direkt. Läuft danach `ableitUndSaveRolle()`,
ist die Einstellung weg. Entweder gewinnt die Ableitung immer — dann gehört das
im Portal so beschriftet — oder eine manuelle Rolle braucht ein Kennzeichen.

**`mitglieder_fairgate_id_key` ist global unique.** Fairgate-Nummern werden pro
Verein vergeben; beim zweiten Verein kollidieren sie. Gehört zu den dreizehn
Schlüsseln vom 05.08. und ist durchgerutscht. Umstellen auf
`(verein_id, fairgate_id)`.

**`kinderVonElternteil()` liefert eine leere Liste.** Eltern bekommen keine
Datenprüfungs-Hinweise für ihre Kinder. Über `eltern_kinder` zu lesen ist eine
Verhaltensänderung.

---

## Nächster Schritt

**Kader und Termine nach Supabase.** Beide laufen auf `demoData`. Das blockiert
das Entfernen der Demo-Daten, den ersten externen Verein — und Etappe 6b
richtig: Position und Nummer stehen jetzt an der Kaderzeile, aber es gibt nur
34 davon.

Alles andere macht ClubCampus besser. Das macht es für jemand anderen als FCH
überhaupt erst benutzbar.

Zwei Aufträge liegen fertig in `docs/`: `auftrag_rls_gruppenrechte.md` und
`auftrag_etappe3_eltern.md` (erledigt, als Beleg).
