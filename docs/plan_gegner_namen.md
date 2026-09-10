# ⛔ ABGELEHNT — Entscheid A statt C (10.09.2026)

**Dieses Papier wird NICHT umgesetzt.** Didi hat den Entscheid am selben
Tag geändert: **die Gegnerseite bleibt anonym.** Der Entscheid vom
21.08.2026 steht, und keine der 19 Stellen wird angefasst —
`spiel_ereignisse_fremde_anonym_check` bleibt, `istEigener` in
`bildeAufstellung` und `bildeEreignis` bleibt, `matchdaten.test.ts:379`
bleibt, alle sechs Prosa-Stellen bleiben.

⚠ **Es steht trotzdem hier, aus zwei Gründen:**

1. **Die Messung gilt weiter.** Die 19 Stellen sind gezählt und benannt;
   wer den Entscheid später erneut aufmacht, muss sie nicht neu suchen.
   Und §1 hält den öffentlichen Beleg fest (siehe unten).
2. **Ein abgelehnter Vorschlag ohne Grund kommt in vier Wochen als
   vergessene Aufgabe zurück.** Mit „abgelehnt am 10.09.2026" kommt er
   nicht.

⚠ **Und die vier Zeilen Code, die schon geschrieben waren, sind mit
`git checkout` zurückgenommen worden** — bevor irgendetwas davon
committet oder deployt wurde. Der Bestand hat C nie gesehen.

---

## Der Beleg, der bleibt

**Gemessen am 10.09.2026 von Didi im Browser**, Spielbericht
FC Herrliberg 3 – FC Blau-Weiss Erlenbach 1, 23.08.2026,
`sfv_match_id 4393132`:

> Für Erlenbach gelistet, **ohne Anmeldung abrufbar**: Startelf mit
> Nummer und Position, fünf Ersatzspieler, zwei Trainer, ein Abwesender.

**Die Grundlage für C wäre also da gewesen.** Der Entscheid fiel trotzdem
auf A — das ist eine Entscheidung über das Produkt, nicht über die
Datenlage, und die zwei sind auseinanderzuhalten.

---

# Plan: Entscheid C — beide Mannschaften mit Namen

Stand 10.09.2026. **Gemessen, nichts gebaut.** Freigabe für den Bau steht
aus.

---

## 1 · ⚠ DIE GRUNDLAGE IST NICHT GEMESSEN — und ich kann sie nicht messen

Der Entscheid vom 21.08.2026 („Gegner bleiben anonym") und seine
Umkehrung am 10.09.2026 für die **eigenen** Namen ruhten auf **einer**
Prüfung:

> Dieselben Namen mit denselben Toren stehen öffentlich auf fvrz.ch.

Für die eigenen Namen hat Didi das bestätigt: *„alle Altersklassen stehen
mit Namen auf fvrz.ch, kein Jahrgang fällt heraus."*

**Für die Gegnernamen fehlt diese Bestätigung.**

### Was ich versucht habe

```
https://matchcenter.fvrz.ch/default.aspx?…&a=tg&4393132&bn=0
  → HTTP 302 auf matchcenter.al-la.ch, OHNE die Parameter
  → dort HTTP 200, 43 KB, aber:
       „Aufstellung"  0 Treffer
       „Herrliberg"   0
       „Erlenbach"    0
```

**Die Seite lädt ihren Inhalt nachträglich.** Ein serverseitiger Abruf
bekommt das Gerüst, nicht den Spielbericht. Das ist die zweite Sperre
nach dem 403 vom 25.08.2026 — und sie lässt sich von hier nicht umgehen.

### Was den Punkt entscheidet, und es dauert eine Minute

**Einen Spielbericht im Browser öffnen und nachsehen, ob die Aufstellung
des GEGNERS mit Namen dasteht** — nicht nur unsere.

```
https://matchcenter.fvrz.ch/default.aspx?lng=1&cxxlnus=1&v=253&a=tg&4393132&bn=0
```

`tg` ist die `sfv_match_id`; 4393132 ist das Spiel vom 23.08.2026
(FC Herrliberg 3 – FC Blau-Weiss Erlenbach 1, 3:3), das am 25.08.2026
schon einmal als Beleg diente — damals hiess es „samt Aufstellung", ohne
zu sagen, von welcher Mannschaft.

⚠ **Was NICHT als Beleg taugt:** dass die SFV-Schnittstelle uns die
Gegnernamen liefert. Das tut sie — `personName` steht in jeder fremden
Zeile, wir lesen sie nur nicht. **Aber eine API mit Vereinszugang ist
nicht dasselbe wie eine öffentliche Seite.** Genau diese Verwechslung
wäre der Fehler, gegen den die Prüfung vom 21.08. gebaut wurde.

> **Ohne diese Bestätigung baue ich Punkt 2 nicht.** Der Entscheid soll
> nicht ohne dieselbe Prüfung fallen, die ihn aufgestellt hat — das ist
> deine Auflage, und sie ist richtig.

---

## 2 · Alle Stellen, die den Entscheid festhalten — vollständig gemessen

### (a) Datenbank — die harte Sperre

| | |
|---|---|
| `spiel_ereignisse_fremde_anonym_check` | `ist_eigener OR (sfv_person_id IS NULL AND rueckennr IS NULL AND ein_sfv_person_id IS NULL AND ein_rueckennr IS NULL)` |
| Tabellenkommentar `spiel_ereignisse` | *„Von fremden Spielern bleibt nur gegner_club_name — erzwungen durch spiel_ereignisse_fremde_anonym_check."* |
| `migration_matchdaten.sql:437` | eine Prüfung, die das Vorhandensein des Constraints selbst kontrolliert |

⚠ **Drei Stellen für eine Zusage** — der Constraint, sein Kommentar und
eine Prüfung darauf. Alle drei müssten fallen oder umgeschrieben werden.

### (b) Code — sechs Filterstellen

```
matchdaten.ts:64    bildeAufstellung   → null bei fremden
matchdaten.ts:114   bildeEreignis      → eigen ? … : null  (vier Felder)
matchdaten.ts:183   bildeSfvPerson     → null bei fremden
matchdaten.ts:254   bildeOffeneNamen   → continue
matchdaten.ts:438   (Pässe)            → continue   „Regel 1"
matchdaten.ts:486   (Zuordnungszählung)→ continue
```

⚠ **Nicht alle sechs dürfen fallen.** `bildeSfvPerson` schreibt nach
`sfv_personen`, und dort steht heute nur, wer uns gehört; die
Pass-Übernahme (438) und die Zuordnungszählung (486) betreffen **unsere**
Mitglieder und müssen eigen bleiben. **Zu ändern sind zwei: 64 und 114.**

### (c) Anzeige

```
matchdatenAnzeige.ts:280   if (!e.ist_eigener) return e.gegner_club_name ?? "Gegner";
EreignisKorrektur.tsx:103  gegner_club_name: eigen ? null : (gegnerName ?? "Gegner");
```

### (d) Testfälle — sechs halten die Zusage fest

| Datei | Fall |
|---|---|
| `matchdaten.test.ts:54` | „übernimmt von einem fremden Spieler nur den Vereinsnamen" |
| `matchdaten.test.ts:94` | „speichert von einem fremden Spieler gar keine Aufstellungszeile" |
| `matchdaten.test.ts:156` | „erzwingt bei fremden Zeilen alle vier Personenfelder auf NULL" — liest `schema.sql` |
| `matchdaten.test.ts:322` | „lässt GEGNER weg — auch wenn der Verband ihren Namen mitliefert" |
| `matchdaten.test.ts:379` | „⚠ GEGNER BLEIBEN ANONYM — auch nach dem umgedrehten Entscheid" |
| `logos.test.ts:169` | „liest von einem GEGNER nichts — auch nicht den Pass" |

⚠ **`matchdaten.test.ts:379` ist der Fall, den ich am 10.09.2026 selbst
geschrieben habe**, als die eigenen Namen freigegeben wurden — mit dem
Satz „falls diese Zeile fällt, ist die Umdrehung zu weit gegangen".
**Jetzt soll sie fallen.** Sie fällt nicht ersatzlos: an ihre Stelle
gehört ein Fall, der die neue Zusage hält (siehe §4).

Dazu zwei Zähler-Fälle, die **bleiben**: `wechselProbe.test.ts:46` und
`wpNutzlast.test.ts:457/564` zählen Gegner nicht mit — das bleibt
richtig, weil die Zähler von *unseren* Spielern handeln.

### (e) Texte, die Anonymität zusagen

| Ort | Wortlaut |
|---|---|
| `docs/auftrag_matchdaten.md:34` | „Person dahinter bleibt anonym. Wer den gegnerischen Torschützen wissen will…" |
| `docs/auftrag_wordpress_spieldaten.md:124` | „Und was mit Gegnern? … erzwingt…" |
| `docs/plan_sfv_spielernamen.md:150, 280` | „Unverändert bleibt: Gegner sind anonym" |
| `docs/plan_wordpress_spieldaten.md:1945–1952` | „den Mannschaftsnamen, nicht den Verein und keine Person" |
| `scripts/sfv-matchdaten-probe.mjs:70` | „IDs bleiben: sie zeigen keine Person" |
| `CLAUDE.md` | mehrfach, u. a. im Eintrag zur Allowlist |

⚠ **Keine Prüfregel im Plugin** hält die Zusage — dort ist nichts zu
ändern.

⚠ **Und das ist die Lehre vom Knopftext heute Morgen**, ausgeschrieben:
**19 Stellen** halten eine Zusage fest, die in einem Satz umgedreht wird.
Sechs davon sind Testfälle, sechs sind Prosa, drei sind Datenbank. **Wer
nur den Code ändert, hinterlässt siebzehn Stellen, die das Gegenteil
behaupten** — und die nächste Person glaubt ihnen.

---

## 3 · `assignmentRoleId` / `assignmentRoleName` — zu holen, nicht zu erfinden

**Sie kommen bei jedem Abruf mit** und werden von der Allowlist nicht
gelesen. Damit wird Startelf von Ersatz unterscheidbar, **ohne einen
einzigen zusätzlichen Abruf**.

| | |
|---|---|
| Migration | `spiel_aufstellung` bekommt `rolle_id integer`, `rolle_name text` |
| Mapper | zwei Zeilen in `bildeAufstellung` |
| ⚠ Nicht ableiten | „von_minute > 0 heisst Ersatz" wäre plausibel und falsch — ein Starter, der in der 1. Minute verletzt raus muss, hätte auch eine Minute. **Die Rolle steht da; sie wird gelesen.** |

⚠ **Was die Werte bedeuten, ist ungemessen.** `assignmentRoleName` ist ein
Text des Verbands; ob dort „Startelf"/„Ersatz" steht oder etwas anderes,
weiss ich nicht — die Swagger-Datei hat keine Beschreibung. **Das ist
derselbe Fall wie `playDayName`.** Deshalb: Spalten anlegen, füllen,
**dann** entscheiden, wie die Anzeige sie liest. Nicht umgekehrt.

---

## 4 · Was beim Bau an die Stelle der alten Zusagen tritt

Ein Entscheid, der fällt, hinterlässt eine Lücke in der Prüfkette. Was
danach gilt, braucht dieselbe Deckung:

| alt | neu |
|---|---|
| CHECK erzwingt NULL bei Fremden | ⚠ **kein CHECK mehr** — dann hält nichts mehr die Grenze. Ersatz: ein Fall, der prüft, dass `ist_eigener` weiterhin **richtig gesetzt** wird (die Trennung bleibt, nur die Sperre fällt) |
| „speichert von einem fremden Spieler gar keine Aufstellungszeile" | „speichert von beiden Mannschaften eine Zeile, und `ist_eigener` unterscheidet sie" |
| „GEGNER BLEIBEN ANONYM" | „Gegnernamen kommen mit — und **`birthDate`, `passportNumber`, `gender` weiterhin nicht**" |

⚠ **Der letzte Punkt ist der wichtigste.** Die Allowlist fällt nicht; sie
wird um **ein** Feld erweitert. Geburtsdatum und Passnummer eines
gegnerischen Junioren haben auf einer Website nichts verloren — und sie
stehen in derselben Antwort, eine Zeile daneben.

---

## 5 · Reihenfolge

| | | |
|---|---|---|
| **0** | ⚠ **fvrz.ch prüfen** (§1) | Didi, eine Minute |
| **1** | `/bench` klären | wartet auf „Rohschlüssel" |
| 2 | Migration: CHECK weg, `rolle_id`/`rolle_name` dazu | hier |
| 3 | Mapper: zwei Filterstellen, zwei neue Felder | hier |
| 4 | Tests umschreiben (§4), 17 Texte nachziehen (§2e) | hier |
| 5 | Repeater `aufstellung` im Theme | Theme-Chat |
| 6 | `CC_FELDER`, Nutzlast, Empfänger | hier |

⚠ **Schritt 0 und 1 können alles danach gegenstandslos machen.** Ohne die
Bank gibt es keine Ersatzliste, und dann ergäbe auch C nur den halben
Prototyp — das ist deine eigene Formulierung, und sie stimmt.
