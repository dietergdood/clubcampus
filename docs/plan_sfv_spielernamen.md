# Plan: die SFV-Spielernamen speichern

Entscheidung Didi, 10.09.2026. **Der Entscheid vom 22.08.2026 wird
umgedreht.** Dieses Papier ist Bestandsaufnahme und Vorschlag — gebaut ist
nichts.

---

## 0 · Was heute tatsächlich läuft — gemessen, nicht erinnert

| | |
|---|---|
| Der Name kommt an | `matchdaten.ts:191` liest `firstname` + `name` aus `/players` |
| und wird verworfen | `bildeAufstellung()` nennt ihn in seiner Allowlist **nicht** — er wird nicht gefiltert, sondern gar nicht erst gelesen |
| er reist nur in der Antwort mit | `bildeOffeneNamen()` → `erg.offene_namen`, im Speicher der Maske, beim Neuladen weg |
| die Aktion `namen` | `namenLauf.ts` — wählt Spiele nach der **Frage**, nicht nach dem Zeitplan, und **schreibt heute nichts** |
| der Export | `wp-export/index.ts:880` baut `namen` aus `sfv_zuordnung` — **0 Zeilen**, also überall „Nr. 13" |
| die Rückfallkette | `beschreibeWer()` in `matchdatenAnzeige.ts:284`: Gegner → Zuordnung → `Nr. N` → „Unser Team" |

**Der Wortlaut des Entscheids, den wir umdrehen** (`matchdaten.ts:145`):

> ⚠ SIE WERDEN NICHT GESPEICHERT. … Speichern: eine Spalte an
> `spiel_aufstellung` liest JEDER … Und nach der Zuordnung ist der Name
> überflüssig: ein Bestand ohne Zweck, den jemand löschen müsste und
> vergessen würde.

---

## 1 · Wohin — eine eigene Tabelle, nicht `sfv_person_name`

**Mein Vorschlag vom 22.08. stimmt nicht mehr, und zwar aus zwei Gründen,
von denen nur einer der Datenschutz war.**

### Der Korngrössen-Grund — er bleibt, auch ohne Datenschutz

`spiel_aufstellung` hat **eine Zeile je Spieler UND Spiel**: 640 Zeilen für
308 Personen (gemessen 29.08.2026). Ein Name dort stünde im Schnitt
doppelt, und zwar als **unabhängige Kopien**:

| | |
|---|---|
| Der SFV schreibt einen Namen in Spiel A anders als in Spiel B | zwei Wahrheiten, keine Meldung |
| Ein Lauf berührt Spiel A, nicht Spiel B | eine Hälfte aktualisiert, die andere alt |
| Frage „wie heisst 4711?" | ergibt eine **Liste**, nicht eine Antwort |

**Ein Name gehört zur Person, nicht zu ihrem Auftritt.** Das ist keine
Normalisierungsvorliebe, sondern die Frage, ob es überhaupt eine Stelle
gibt, an der die Antwort steht.

### Der Rechte-Grund — er ist schwächer geworden, aber nicht weg

`spiel_aufstellung_select` gilt für den **ganzen Verein**
(`verein_id = get_my_verein_id()`). Genau das war das Argument vom 22.08.
Es trägt heute nur noch halb: die Namen gehen ohnehin auf eine öffentliche
Website. Was bleibt, ist die **Wahl** — eine eigene Tabelle kann eine eigene
Policy tragen, eine Spalte erbt die der Tabelle und lässt keine Wahl.

### Vorschlag

```sql
create table public.sfv_personen (
  verein_id       uuid    not null references public.vereine(id),
  sfv_person_id   integer not null,
  name            text    not null,
  sfv_team_id     integer,
  rueckennr       integer,
  erstmals_gesehen  timestamptz not null default now(),
  zuletzt_gesehen   timestamptz not null default now(),
  primary key (verein_id, sfv_person_id)
);
```

⚠ **Der Schlüssel ist `(verein_id, sfv_person_id)`** — nicht
`sfv_person_id` allein. Die Personennummer des Verbands ist schweizweit
eindeutig, aber dieselbe Person kann in zwei Vereinen im Portal stehen, und
global unique nähme der zweite Verein dem ersten die Zeile weg. Dieselbe
Familie wie `mitglieder_fairgate_id_key`, der genau so durchgerutscht ist.

⚠ **`rueckennr` und `sfv_team_id` sind hier eine Momentaufnahme**, kein
Stammdatum — sie stehen richtig an `spiel_aufstellung` und dienen hier nur
der Maske („Nr. 13, De-Junioren" hilft beim Wiedererkennen). Wer daraus
rechnet, rechnet falsch. Das gehört als Kommentar an die Spalten, sonst
wird es in einem halben Jahr zur Quelle.

---

## 2 · Wer schreibt — beide, dieselbe Funktion, kein zusätzlicher Abruf

| | erreicht | schreibt heute |
|---|---|---|
| stündlicher Lauf (`matchdatenLauf`) | 10 Spiele je Lauf, nach **Datum** gewählt | Aufstellung + Ereignisse |
| Aktion `namen` (`namenLauf`) | Spiele nach der **Frage** gewählt | ⚠ nichts |

**Beide schreiben, über eine gemeinsame Funktion.** Der stündliche Lauf
holt `/players` ohnehin — der Name kostet **null zusätzliche Abrufe**. Die
Aktion `namen` holt die Spieler, die der Zeitplan nie erreicht: am
22.08.2026 waren das **48 von 177**, also 27 %.

⚠ **Damit fällt auch der zweite Satz des alten Entscheids**, und er gehört
in den Migrationskopf: *„Sie schreibt nichts … jeder Schreibvorgang wäre ein
weiterer Ausgang, den jemand prüfen müsste."* Das stimmt weiterhin — es ist
jetzt nur ein Ausgang, den wir **wollen**. Was daraus folgt, ist keine
Ausnahme, sondern eine Pflicht: der Schreibweg bekommt eine Allowlist wie
jeder andere (`bildeSfvPerson()` nennt jedes Feld einzeln), und der
`error` wird gelesen.

**Bei jedem Lauf, nicht einmalig.** Ein Name kann sich beim Verband
ändern — Heirat, Korrektur einer Schreibweise. `upsert` auf den Schlüssel,
`zuletzt_gesehen` mit. Einmalig geschrieben wäre er ein Wert, den niemand
mehr anfasst und niemand mehr prüft.

⚠ **Und der Name wird NICHT gelöscht, sobald jemand zugeordnet ist.** Der
alte Entscheid nannte ihn „nach der Zuordnung überflüssig". Das war richtig,
solange die Zuordnung das Ziel war. Jetzt ist er der **Rückfall** — und bei
0 Zuordnungen zu 308 offenen Spielern ist der Rückfall auf absehbare Zeit
der Normalfall, nicht die Ausnahme.

---

## 3 · Wer darf lesen — und die eine Stelle, an der es kippt

| | |
|---|---|
| Der Website-Export | läuft als `service_role`, RLS gilt für ihn nicht. Er bekommt die Namen **unabhängig** von jeder Policy |
| Die Zuordnungsmaske | Verwaltung — `sfv_zuordnung_write` ist bereits `is_admin()` |

**Vorschlag: SELECT nur für `is_admin()`**, wie beim Schreiben von
`sfv_zuordnung`. Innerhalb von ClubCampus hat der Name genau einen Zweck,
und der ist die Maske.

⚠ **Zu entscheiden, weil es genau eine Stelle gibt, an der das sichtbar
wird:** `Spielbericht.tsx:153` zeigt `beschreibeWer(e, namen)` — heute für
jeden, der ein Spiel öffnet. Steht die Policy auf `is_admin()`, sieht ein
Trainer im **eigenen** Spielbericht weiter „Nr. 13", während auf der
öffentlichen Website der Name steht. **Das ist absurd genug, dass es
jemandem als Fehler gemeldet wird.**

Zwei Wege, beide vertretbar:

| | |
|---|---|
| SELECT `verein_id = get_my_verein_id()` | der Spielbericht zeigt Namen. Konsequent zur Website — was öffentlich steht, darf ein Vereinsmitglied auch sehen |
| SELECT `is_admin()` + Spielbericht bleibt bei „Nr. 13" | strenger, aber der Widerspruch zur Website bleibt sichtbar |

**Empfehlung: der erste.** Sobald der Name öffentlich ist, ist eine engere
Policy im Portal kein Schutz mehr, sondern nur noch eine Ungereimtheit —
und Ungereimtheiten werden irgendwann „aufgeräumt", von jemandem, der den
Grund nicht kennt.

⚠ **Unverändert bleibt: Gegner sind anonym.** `istEigener()` filtert nach
`clubNumber`, der Constraint `spiel_ereignisse_fremde_anonym_check` prüft
es ein zweites Mal in der Datenbank. **Der Entscheid vom 10.09. berührt
davon nichts** — er handelt ausschliesslich von eigenen Spielern.

---

## 4 · Die Reihenfolge im Export — und der Zähler, der dabei still umkippt

Gewünscht: **zugeordnet → SFV-Name → Rückennummer.**

Die gute Nachricht: `beschreibeWer()` muss **nicht angefasst werden**. Es
nimmt eine `Map<number, string>`; die Kette entsteht aus der Reihenfolge,
in der der Export die Map füllt — erst die SFV-Namen, dann die Zuordnungen
darüber. Wer zugeordnet ist, gewinnt; wer nicht, behält den SFV-Namen; wer
gar keinen hat, bleibt bei `Nr. N`.

⚠ ⚠ **UND GENAU HIER LIEGT DER FUND DIESES PLANS.**

`zaehleVerlaufNamen()` ist die Zahl, die vor dem ersten scharfen Lauf
entscheidet, ob Klarnamen von Junioren auf eine öffentliche Website gehen.
Sie ist am 05.09.2026 einmal falsch gewesen (431 statt 0) und deshalb neu
gebaut worden. Sie fragt heute:

> Ist die Zeile von uns, und steht für ihre `sfv_person_id` ein Name **in
> der Zuordnung**?

**Füllt man die Map wie oben, misst dieselbe Funktion ab sofort etwas
anderes** — „steht irgendein Name da" statt „ist jemand zugeordnet". Sie
meldete dann bei 308 SFV-Namen und 0 Zuordnungen dreistellige
`mit_personenname`-Werte und sähe aus wie ein grosser Erfolg der
Zuordnungsarbeit, die gar nicht stattgefunden hat.

**Kein Test würde rot.** Die Funktion rechnet weiterhin richtig; nur die
Frage darunter hat sich geändert.

> Eine Zahl, deren Bedeutung sich ändert, ohne dass ihr Name sich ändert,
> ist gefährlicher als eine falsche Zahl — die falsche fällt auf.

**Deshalb gehört der Zähler zur Umstellung, nicht danach.** Vier Werte
statt drei:

```
zeilen_mit_eigenem_namen      ← zugeordnet, unsere Schreibweise
zeilen_mit_sfv_namen          ← Rückfall
zeilen_mit_rueckennummer      ← weder noch
zeilen_mit_gegnername
```

Die Summe muss weiter die Zeilenzahl ergeben (`zaehlung_stimmt`) — eine
Aufteilung, die aufgehen muss, prüft sich selbst.

---

## 5 · Die Löschkette — was heute noch niemand geprüft hat

`person-loeschen/index.ts:60` führt `sfv_zuordnung` in seiner Tabellenliste,
und `sfv_zuordnung_mitglied_fkey` kaskadiert. **Beides greift bei der neuen
Tabelle nicht:**

| | |
|---|---|
| `sfv_personen` hängt an keiner `mitglied_id` | kein Fremdschlüssel, keine Kaskade |
| die Löschvorschau zählt sie nicht | sie kennt die Tabelle nicht |

⚠ **Wird eine Person gelöscht, die zugeordnet war, verschwindet die
Zuordnung — und der SFV-Name bleibt stehen.** Ab dem nächsten Export
erscheint dieselbe Person auf der Website wieder, nur in der Schreibweise
des Verbands statt in unserer. **Eine Löschung, die den Namen wieder
sichtbar macht, ist das Gegenteil dessen, was sie soll.**

Zu tun, im selben Schritt und nicht später:

1. `sfv_personen` in die Tabellenliste von `person-loeschen` aufnehmen —
   über die `sfv_person_id` der gelöschten Zuordnung.
2. Die Löschvorschau nennt sie, wie sie jede andere nennt.
3. Ein Fall in den Tests, der es festhält: *nach dem Löschen einer
   zugeordneten Person steht ihr SFV-Name nicht mehr da.*

⚠ Ohne Punkt 1 wäre die neue Tabelle die erste im Portal, die eine
DSGVO-Löschung überlebt. Das ist kein Restrisiko, sondern der Kern der
Sache.

---

## 6 · Reihenfolge des Baus

| | | |
|---|---|---|
| 1 | Migration `migration_sfv_personen.sql` | mit dem Kopf aus §7 |
| 2 | `bildeSfvPerson()` in `matchdaten.ts` + Tests | Allowlist, wie `bildeAufstellung` |
| 3 | Schreiben in `matchdatenLauf` **und** `namenLauf` | `error` lesen, `.select("sfv_person_id")` zählen |
| 4 | **Zähler aufteilen** (§4) | ⚠ vor Schritt 5, sonst misst er zwischendrin Falsches |
| 5 | Export: Map zweistufig füllen | `beschreibeWer` unverändert |
| 6 | Löschkette (§5) | mit Testfall |
| 7 | `gen:types`, volle Prüfkette, Deploy | |

⚠ **Schritt 4 vor Schritt 5.** Andersherum gäbe es ein Zeitfenster, in dem
die eine Zahl, die vor einem öffentlichen Lauf schützt, das Falsche misst.

---

## 7 · Was im Migrationskopf stehen muss

Nicht „Spalte hinzugefügt", sondern **warum ein Entscheid umgedreht wurde**.
Sonst liest es der Nächste als Rückfall in einen Zustand, den wir bewusst
verlassen hatten — und macht ihn rückgängig.

> **Der Entscheid vom 22.08.2026 lautete: die SFV-Namen werden NICHT
> gespeichert.** Er war richtig für seine Frage. Die Frage hat sich am
> 10.09.2026 geändert.
>
> **Damals:** die Namen dienten der Zuordnung. Nach der Zuordnung wären sie
> ein Bestand ohne Zweck gewesen — „den jemand löschen müsste und vergessen
> würde". Und `spiel_aufstellung`, der naheliegende Ort, steht dem ganzen
> Verein offen.
>
> **Heute:** die Namen sollen auf die Website. Ein Torschütze heisst dort
> mit Namen oder „Nr. 13", und 308 Spielerprofile von Hand anzulegen ist
> keine Option. Damit haben sie einen dauerhaften Zweck — sie sind der
> **Rückfall**, wenn keine Zuordnung besteht.
>
> **Das Datenschutzargument trägt nicht mehr:** dieselben Namen mit
> denselben Toren stehen öffentlich auf fvrz.ch. Wir veröffentlichen nichts,
> was nicht schon veröffentlicht ist.
>
> ⚠ **Was NICHT umgedreht wird — und das ist der wichtigere Teil:**
> - Die Zuordnung bleibt der bessere Weg. Steht eine echte Person in
>   ClubCampus und ist zugeordnet, gewinnt **unser** Name, in unserer
>   Schreibweise. Der SFV-Name ist der Rückfall, nicht die Wahrheit.
> - **Gegner bleiben anonym.** `istEigener()` und
>   `spiel_ereignisse_fremde_anonym_check` bleiben unverändert.
> - Die Allowlist bleibt das erste Netz: `bildeSfvPerson()` nennt jedes
>   Feld einzeln. `birthDate`, `passportNumber`, `gender` und `secondName`
>   werden weiterhin **nicht gelesen** — nicht gefiltert, sondern gar nicht
>   erst angefasst.
