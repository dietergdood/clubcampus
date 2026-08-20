# Auftrag für Claude Code — Arten ohne Mitgliedschaft, Austritt, Löschen

Drei Etappen. Nach jeder steht etwas Fertiges. **Etappe 1 zuerst und allein**,
die anderen erst auf Zuruf.

---

## Ausgangslage

Rund 400 von 910 Personen haben keine Mitgliedschaft: 393 Elternteile,
7 Supporter. Für sie gibt es heute **einen** Wert in der Feldkonfiguration —
`gilt_fuer = 'ohne_mitgliedschaft'` — und damit zwangsläufig **denselben
Feldsatz**. Vom Elternteil will der Verein aber mehr wissen als vom Gönner.

Der Chip auf der Personenseite sagt aus demselben Grund „Ohne Mitgliedschaft"
statt „Elternteil" oder „Supporter".

Beides geht auf eine Empfehlung vom 17.08. zurück, einen einzigen Wert zu
nehmen. Sie war zu eng. Statt einen zweiten festen Wert nachzuschieben, wird
daraus eine **pflegbare Liste** — es kommen weitere dazu (Ehemalige, externe
Trainer, Sponsoren als Person).

---

# Etappe 1 · Arten ohne Mitgliedschaft

## Die Liste

Eine neue Tabelle nach dem Vorbild von `mitgliedtypen` — pro Verein, mit
`name`, `sort_order`, `aktiv`, `verein_id`. Gepflegt in der Portalverwaltung.

**⚠ Die Liste trägt zwei Sorten Einträge, und das ist der Kern:**

| Sorte | Beispiel | Woher |
|---|---|---|
| **abgeleitet** | Elternteil | ergibt sich aus einer Zeile in `eltern_kinder` |
| **gesetzt** | Supporter, Ehemalige | die Verwaltung bestimmt sie |

Jede Zeile muss sagen, welche Sorte sie ist. Ohne dieses Merkmal könnte jemand
„Elternteil" von Hand vergeben, und die Ableitung überschriebe es still —
derselbe Fehler wie bei den von Hand gesetzten Rollen, der als offener Punkt
seit dem 05.08. steht.

**⚠ Abgeleitet heisst: es kippt.** Tritt das letzte Kind aus, ist die Person
kein Elternteil mehr, und ihr Feldsatz ändert sich mit. Das ist beabsichtigt —
sie *ist* dann keiner mehr. **In den Migrationskopf schreiben.**

**⚠ Eine Person kann mehreres sein.** Ein Ehemaliger mit Kind im Verein ist
auch Elternteil. Klär im Plan: eine Art pro Person oder mehrere — und wenn
mehrere, welche die Feldkonfiguration bestimmt. Schlag eine Rangfolge vor und
begründe sie; erfinde sie nicht nebenbei.

## Die Feldkonfiguration

`gilt_fuer` wird von einem festen `CHECK` auf einen Verweis in die neue Tabelle
umgestellt. In der Portalverwaltung erscheint pro Art eine Spalte neben den
Mitgliedtypen — dieselbe Bedienung, dieselbe `cc-seg`.

Die drei bestehenden Seed-Zeilen auf `ohne_mitgliedschaft` (`telefon` Pflicht,
`email` Pflicht, `ahv_nr` aus) müssen dabei irgendwohin. **Sag im Plan, wohin
und warum** — auf „Supporter", auf „Elternteil", auf beide, oder gelöscht.

Die zehn `nur_mitgliedschaft`-Schlüssel bleiben, wie sie sind: sie hängen an
einer Mitgliedschaft, die keine dieser Arten hat.

**⚠ Zählprobe aus dem Dump ableiten, nicht aus dem Skript.** Und Probelauf mit
`BEGIN … ROLLBACK`, bevor irgendetwas scharf läuft.

## Der Chip

Statt „Ohne Mitgliedschaft" steht dort die Art. `heroChips()` liest sie aus
derselben Quelle wie die Feldkonfiguration — **nicht** aus der Portalrolle.
`role === 'eltern'` ist in dieser Codebasis schon zweimal falsch gewesen: ein
Vater, der selbst spielt, bekommt `spieler`.

**⚠ Die Ableitung darf keine Abfrage pro Zeile werden.** 400 Personen. Sag im
Plan, wo sie ermittelt wird und wie oft.

## Nicht Teil von Etappe 1

Sponsoring als Modul. Ein Sponsor kann eine **Firma** sein, und eine Firma ist
keine Person — kein Vorname, kein Geburtsdatum, dafür MwSt-Nummer,
Vertragslaufzeit, Werbeform, Logo. Das ist ein eigenes Modul mit Firma *oder*
Person als Vertragspartner. Hier geht es nur um die Art einer **Person** ohne
Mitgliedschaft. Ein Sponsor, der eine Person ist, kann eine Art in dieser Liste
bekommen — das Vertragswesen gehört nicht hierher.

---

# Etappe 2 · Austritt

## Der Ablauf, wie er gelten soll

**Beim Austritt wird die Person sofort zur eingestellten Art** — nicht erst
nach einer Rückmeldung. Wer nicht antwortet, und die meisten antworten nicht,
landet in einem definierten Zustand statt in einem Wartezimmer.

Welche Art das ist, stellt die Verwaltung ein: eine Zeile in der
Portalverwaltung, „Beim Austritt wird die Person zu → [Auswahl aus der Liste]".
Vorbelegt mit dem, was heute `AustrittsZiel = "supporter"` fest im Code steht.

**⚠ Nur „gesetzte" Arten stehen zur Auswahl.** „Elternteil" ist abgeleitet — es
beim Austritt zu wählen, wäre eine Zusage, die die Ableitung im nächsten
Moment überschreibt.

## Was der Bestand schon hat

`AustrittModal` mit vier Antworten und `AustrittsZiel` in `supporterService.ts`
(`supporter | archiv | ehrenmitglied | aktivmitglied`). Der Weg existiert also
— er bekommt die Art aus der Einstellung statt aus einer festen Zeichenkette.

## Archiv

Didi hat die Bedeutung am 21.08. geklärt: **Archiv heisst „ausgetreten, aber
noch etwas offen"** — Beitrag, Rechnung, Material. Ein Fehleintrag wird
gelöscht, nicht archiviert.

Der heutige Bestätigungstext sagt „Stillegen ohne Austritt — für Fehleinträge
und Dubletten". Das ist die alte Bedeutung und gehört berichtigt.

**Nicht Teil dieser Etappe:** der automatische Übergang vom Archiv zur
Supporter-Art nach Ablauf. Er bräuchte einen Auslöser, und offene Posten stehen
noch nirgends im System — das kommt mit dem Finanzmodul. Als offenen Punkt
eintragen, mit diesem Grund.

---

# Etappe 3 · Mail und Löschen

## Die Mail

Über **Resend**, nicht über einen Mailserver des Vereins. Absenderadresse
`@fcherrliberg.ch` über Domain-Verifizierung. Begründung, falls sie später
jemand hinterfragt: ClubCampus ist mandantenfähig — kein Verein soll erst einen
Mailserver einrichten müssen, um zu starten. Und Exchange-Postfächer haben
Sendelimits, die für Systemmails der falsche Weg sind.

Inhalt: die Person ist bereits zur eingestellten Art geworden. Die Mail fragt,
ob sie das bleiben will.

- **keine Antwort** → sie bleibt es. Das ist der Normalfall.
- **„löschen"** → vollständiges Löschen.

## Der Rückweg

Ein Link mit Token. Steht seit Wochen als offener Punkt in `ELTERN_LOGIK.md`,
gebaut ist er nicht.

**⚠ Der Token braucht ein Ablaufdatum.** Wer nach zwei Jahren auf „löschen"
klickt, ist vielleicht längst wieder Mitglied. Schlag eine Frist vor.

**⚠ Und das Löschen muss prüfen, was inzwischen gilt.** Ist die Person
mittlerweile Elternteil eines Kindes oder wieder Mitglied, ist „löschen" nicht
mehr die richtige Antwort, sondern eine Rückfrage an die Verwaltung.

## Das echte Löschen

Der heutige Knopf löscht die **Mitgliedschaft**. Die Person bleibt vollständig
stehen — Name, Adresse, Geburtsdatum, AHV-Nummer, Konto. Am 21.08. wurde er
deshalb in „Mitgliedschaft löschen" umbenannt; die Funktion fehlt weiterhin.

Vier Schritte in fester Reihenfolge, weil drei Fremdschlüssel auf `personen`
kein `ON DELETE` haben (ein `delete` scheitert sonst mit `23503`):

1. Eltern-Verknüpfungen (`eltern_kinder`)
2. Mitgliedschaften (`mitglieder`, mit allen Kaskaden)
3. Portal-Konto (`benutzer`) **und `auth.users` dazu**
4. `personen`

**⚠ Schritt 3 ist die eigentliche Lücke.** Eine Zeile in `benutzer` zu löschen
entfernt das Auth-Konto nicht — E-Mail und Login bleiben in `auth.users`
stehen und blockieren die Adresse für jede erneute Registrierung. Das braucht
die Admin-API, also eine Edge Function.

**⚠ Autorisierung nicht von `invite-user` abschreiben.** Die prüft nur, *dass*
ein `Authorization`-Header da ist, nicht *wer* dahintersteht — jeder eingeloggte
Benutzer kann sie heute aufrufen. Die neue Function prüft den Aufrufer gegen
`benutzer.ist_admin` und dessen `verein_id` gegen die der Zielperson.

## Zwei getrennte Aktionen mit ehrlichen Namen

- **„Mitgliedschaft löschen"** — was der Knopf heute tut. Für Dubletten.
- **„Person löschen (DSGVO)"** — die vollständige Kette, **mit Vorschau**: was
  gelöscht wird, was bleibt, was blockiert. Erst nach der Vorschau der Knopf.

## Helfereinsätze

`helper_zuteilungen` und `team_helfer_zuteilungen` hängen mit `ON DELETE
CASCADE` an `person_id`. Beim Löschen ginge damit der Nachweis verloren, dass
eine Schicht besetzt war.

**Entscheid vom 17.08.: anonymisiert stehenlassen.** `person_id` ist in beiden
Tabellen bereits nullable — es ist nur der FK, der von `CASCADE` auf `SET NULL`
muss. Der Unique-Schlüssel `(schicht_id, person_id)` stört nicht: NULL gilt in
UNIQUE als verschieden, mehrere anonymisierte Zeilen pro Schicht passen
nebeneinander.

---

## Vorgehen

Für **jede** Etappe: Bestandsaufnahme → Plan zeigen → auf Freigabe warten →
bauen. Migrationen zeigen, Didi führt aus, vorher Probelauf mit
`BEGIN … ROLLBACK`.

Beginn mit Etappe 1. Etappe 2 und 3 liest du jetzt noch nicht im Detail.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

- `catch {}` ohne Bindung ist verboten; `error` wird gelesen, nicht verschluckt.
- Migration über drei Anweisungen hinaus in **einen** `do $mig$`-Block mit
  Zählprobe am Ende, Zahlen aus dem Dump.
- Keine neue CSS-Klasse ohne Suche nach dem Muster, Prüfung des Namens und
  Didis Zustimmung. Namen beschreiben, **was ein Element ist**.
- Eine Attrappe kennt kein Schema — beide Richtungen, siehe `CLAUDE.md`.
- Keine Datei ohne `npm run typecheck`, `npm run build`, `npm test`,
  `check:imports`, `check:selects`.
- Nach jeder Strukturänderung Dump **und** `npm run gen:types`.
- Deutsch (Schweiz) in Kommentaren, kein ß.
