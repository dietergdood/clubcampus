# Auftrag für Claude Code — Feldkonfiguration für Personen ohne Mitgliedschaft

## Ausgangslage

Die Mitgliedtyp-Feldkonfiguration (19./20.08.2026) beantwortet pro Feld drei
Werte — Pflicht · Freiwillig · Gibt es nicht — und hängt am Mitgliedtyp. Wer
keine Mitgliedschaft hat, fällt aus ihr heraus. Das trifft heute zwei Gruppen
und zeigt sich in beide Richtungen falsch:

- **Supporter:** `getFeldkonfig(null, …)` hat ein `if (!mitgliedtyp) return konfig;`
  und liefert alles auf `freiwillig` — also sichtbar. Ein Gönner bekommt damit
  jede Karte und jeden Tab, auch Statistik, Eltern und Datenprüfung.
- **Elternteil:** `getProfilCheck.getProfilFehlend()` hat für ihn einen fest
  verdrahteten Satz — Vorname, Nachname, Telefon — mit der Begründung „hat
  keinen Mitgliedtyp, deshalb keine Matrix".

Das ist dieselbe Lücke, einmal als Zuviel und einmal als Zuwenig. Der fest
verdrahtete Satz ist zugleich der zweite Konfigurationsort, dessen Abbau seit
dem 19.08. läuft: `rolle_pflichtfelder` ist genau deshalb entfallen.

## Der Entscheid

**`gilt_fuer` als ausdrückliche Achse in `mitgliedtyp_feldkonfig`.** In der
Oberfläche eine Spalte neben den Mitgliedtypen, in den Daten ein eigener Fall.

**Nicht als Zeile in `mitgliedtypen`.** Diese Tabelle beantwortet „welche
Mitgliedschaften bietet der Verein an". Eine Zeile darin erscheint in jedem
Dropdown, in jeder Zählung, in jeder Auswertung — und stellt die Falle wieder
auf, die der Supporter-Rückbau am 20.08. abgebaut hat. `aktiv = false` verdeckt
sie nur; der Nächste, der `select * from mitgliedtypen` schreibt, hat sie
wieder.

**Ein einziger Wert `ohne_mitgliedschaft`, nicht zwei.** Elternteil und
Supporter bekommen damit denselben Feldsatz. Das ist bewusst in Kauf genommen:
Telefon gehört für den Elternteil auf Pflicht — es ist die Nummer, unter der
der Verein wegen des Kindes anruft —, und damit muss sie auch der Gönner
angeben. Die Alternative wäre ein Wert `elternteil`, abgeleitet aus „hat
Kinder". Das wäre eine **berechnete Achse**, die kippt, sobald ein Kind
austritt — derselbe Fehler, den `rolle_pflichtfelder` gekostet hat.

> Falls Didi das anders entscheidet, ändert sich nur der `CHECK` und die Zahl
> der Spalten in der Oberfläche. Nicht selbst umentscheiden, nachfragen.

## Migration

```sql
alter table mitgliedtyp_feldkonfig
  add column gilt_fuer text not null default 'mitgliedtyp'
    check (gilt_fuer in ('mitgliedtyp','ohne_mitgliedschaft')),
  alter column mitgliedtyp_id drop not null,
  add constraint mitgliedtyp_feldkonfig_achse_check check (
    (gilt_fuer = 'mitgliedtyp'         and mitgliedtyp_id is not null) or
    (gilt_fuer = 'ohne_mitgliedschaft' and mitgliedtyp_id is null));
```

Dazu zwingend, beides bereits geprüft:

**Der Unique-Schlüssel trägt mit NULL nicht mehr.**
`mitgliedtyp_feldkonfig_verein_key (verein_id, mitgliedtyp_id, schluessel)` —
Postgres zählt NULLs als verschieden, es könnten also beliebig viele Zeilen für
denselben Schlüssel entstehen. Neu anlegen mit `NULLS NOT DISTINCT`.

**⚠ Der Fremdschlüssel prüft die neuen Zeilen nicht.**
`mitgliedtyp_feldkonfig_typ_fkey` ist zusammengesetzt: `(mitgliedtyp_id,
verein_id) → mitgliedtypen(id, verein_id)`. Ohne `MATCH FULL` — und das ist die
Vorgabe — lässt Postgres eine Zeile durch, sobald **eine** Spalte NULL ist. Die
`ohne_mitgliedschaft`-Zeilen passieren ihn also ungeprüft. Das ist hier das
gewünschte Verhalten, aber Nebenwirkung und nicht Absicht: **als Satz in die
Migration schreiben**, sonst baut es der Nächste mit `MATCH FULL` nach und
wundert sich, warum nichts mehr speichert.

**Seed für `ohne_mitgliedschaft`.** Gespeichert wird nur die Abweichung, eine
fehlende Zeile heisst freiwillig.

**Zehn Felder brauchen keine Zeile, weil sie in dieser Spalte gar nicht
erscheinen.** `mitgliedtyp`, `eintrittsdatum`, `spielerpass`, `js_nr`,
`fairgate_id`, `teams`, `notizen`, `tab_stats`, `tab_verlauf`, `tab_eltern`
hängen an einer Mitgliedschaft, die es hier nicht gibt. Als Schalter könnte die
Verwaltung sie auf „Pflicht" stellen und erzeugte eine Anforderung, die niemand
je erfüllen kann — derselbe Fehler wie `rolle_pflichtfelder`.

Die Registry hat die Form dafür schon: `modi: FEST` und `modi: AN_AUS` sagen
bereits „hier gibt es weniger Auswahl". Ein Merkmal mehr, sinngemäss
`nur_mitgliedschaft: true`, und die zehn verschwinden aus der Spalte, brauchen
keine Seed-Zeile und können nicht falsch gestellt werden. Zwei davon
(`notizen`, `tab_verlauf`) sind ausserdem strukturell: die Zieltabellen führen
`mitglied_id bigint NOT NULL`.

Übrig bleiben **15 konfigurierbare Schlüssel**. Davon bekommen **drei** eine
Seed-Zeile, zwölf bleiben freiwillig ohne Zeile:

> Hier stand „sieben echte Entscheide … vier gesetzt, drei ohne Zeile".
> Falsch gezählt — nachgezogen am 21.08.2026 gegen die Registry:
> 27 Einträge = 2 `FEST` + 10 `nur_mitgliedschaft` + **15 konfigurierbar**.
> Die Tabelle darunter war inhaltlich immer richtig, nur die Zahl nicht.

| Feld | Modus | Grund |
|---|---|---|
| `telefon` | `pflicht` | Erreichbarkeit wegen des Kindes |
| `email` | `pflicht` | siehe unten |
| `ahv_nr` | `aus` | Startwert, ein Klick zum Ändern — **kein Sonderfall im Code** |
| `funktionen` | — | bleibt sichtbar: „Er darf eine Vereinsfunktion haben" (17.08.) |
| `geburtsdatum`, `geschlecht`, `nationalitaet`, `nationalitaet2`, `heimatort` | — | freiwillig, **nicht `aus`** |
| Adressblock, `tab_portal`, `tab_datenpruefung` | — | freiwillig |

Vorname und Nachname stehen in `IMMER_PFLICHT_KEYS` (`modi.length === 0`) und
brauchen keine Zeile.

**⚠ Die fünf Personalien-Felder ausdrücklich NICHT auf `aus`.** „Aus" heisst
unsichtbar, nicht gelöscht. Ein Aktivmitglied mit Geburtsdatum, Nationalität
und Heimatort tritt aus und wird Supporter — die Angaben stehen weiter in
`personen`, sind aber für niemanden mehr sichtbar, auch nicht für die
Verwaltung. Bei jedem Austritt entstünde so ein Bestand an Personendaten, den
niemand mehr sieht und deshalb niemand aufräumt. Auf `freiwillig` bleiben sie
sichtbar und löschbar. **Dieser Satz gehört in den Migrationskopf.**

**`ahv_nr` bleibt `modi: ALLE` in beiden Spalten.** Der Startwert ist `aus`,
die Entscheidung liegt bei der Verwaltung — kein Sonderfall in der Logik. Die
Zweckbindung der AHVN13 (ohne J+S gibt es keinen Zweck) gehört als `hinweis:`
an den Registry-Eintrag, wie bei `fairgate_id`: sie informiert, sie wirkt
nicht. Kein automatisches Leeren beim Wechsel zu „ohne Mitgliedschaft" — das
kommt als eigene Aktion mit Vorschau zum DSGVO-Löschen.

### E-Mail: Pflicht, ausser bei Junioren

Gilt für `ohne_mitgliedschaft` **und** für alle Mitgliedtypen ausser den
Junioren-Typen; dort freiwillig.

Der Grund ist `personen_email_pro_verein`, ein partieller Unique-Index über
`(verein_id, lower(btrim(email)))`. Wäre die Adresse ausnahmslos Pflicht,
bräuchte jedes Geschwisterkind eine eigene — drei Junioren einer Familie
könnten nicht dieselbe Mutter-Adresse tragen, und die Mutter blockierte sie
zusätzlich mit ihrer eigenen Zeile. Ein Siebenjähriger hat keine Adresse;
erreichbar ist er über `eltern_kinder`. Genau dafür gibt es die
Elternkonstruktion.

**⚠ Welche Mitgliedtypen Junioren sind, liest du aus der Datenbank, nicht aus
dem Namen.** Ein `ilike 'junior%'` ist geraten. Nenn die Ids im Plan.

**⚠ Eine fehlende Pflicht-E-Mail sperrt den Bestätigen-Knopf NICHT.** Sie ist
in den Datenprüfungs-Masken nur durch die Verwaltung änderbar — sie wird also
genannt, nicht erzwungen. Zuständigkeitstrennung vom 20.08.; sonst sitzt jedes
Mitglied ohne Adresse in einer Sackgasse.

> Das ändert sich mit `auftrag_email_identitaet.md`: sobald die Person ihre
> Adresse selbst ändern kann, gehört die fehlende E-Mail wieder auf sperren.
> Nicht jetzt vorwegnehmen, aber im Kommentar erwähnen.

**Vor dem Deploy zählen, wie viele Nicht-Junioren heute keine E-Mail haben.**
Das ist die Zahl, die in der Datenprüfung aufleuchtet. Nenn sie, bevor du
lieferst.

Geh die `FELD_REGISTRY` (27 Einträge) trotzdem vollständig durch und bestätige
im Plan, dass die Aufteilung oben aufgeht.

## Code

- **`getFeldkonfig`** bekommt statt `mitgliedtyp: string | null | undefined`
  ein ausdrückliches `KonfigZiel`. „Kein Mitgliedtyp" darf nicht länger „keine
  Regeln" heissen, und ein bloss übergebener String muss zum Typfehler werden.

  ⚠ **Ein Union aus zwei Fällen reicht nicht.** `mitglieder.mitgliedtyp` ist
  nullable — eine Mitgliedschaft *ohne* Typ ist ein Datenloch und nicht
  dasselbe wie eine Person ohne Mitgliedschaft. Wer beides zusammenlegt,
  blendet bei einem Datenloch plötzlich Felder aus. Das Datenloch fällt
  weiterhin auf „alles freiwillig" zurück; das ist für einen unbekannten Typ
  das richtige Verhalten. Das Vokabular ist dasselbe wie in der Datenbank:
  `gilt_fuer`, `mitgliedtyp`, `ohne_mitgliedschaft`.
- **⚠ Der Schreibpfad trifft NULL nicht.** `setzeModus` und
  `setzeModusMehrere` löschen mit `.eq("mitgliedtyp_id", mitgliedtypId)`.
  `= NULL` ist in SQL nie wahr: für die neuen Zeilen löscht das nichts,
  PostgREST gibt keinen Fehler zurück, die Oberfläche meldet Erfolg — und
  „Freiwillig" (= Zeile löschen) bliebe wirkungslos. Dieselbe Familie wie das
  `42P10` vom 20.08. Beide Funktionen nehmen deshalb ein `KonfigZiel`
  entgegen, statt dass sich der Aufrufer an `.is(...)` erinnern muss.
  Für den Upsert bleibt `onConflict: "verein_id,mitgliedtyp_id,schluessel"`
  richtig, **sobald** der Unique-Schlüssel `NULLS NOT DISTINCT` trägt — sonst
  entstünde bei jedem Speichern eine weitere Zeile statt einer Aktualisierung.
- **`FeldkonfigZeile`** trägt heute `mitgliedtyp` als Namen. Der Ladepfad muss
  `gilt_fuer` mitbringen, sonst filtert die Auswertung die neuen Zeilen weg —
  und zwar lautlos, weil `z.mitgliedtyp !== mitgliedtyp` bei NULL einfach nicht
  trifft.
- **`getProfilCheck`**: der fest verdrahtete Elternsatz (Vorname, Nachname,
  Telefon) entfällt und liest die neue Achse. Das ist der Punkt der Übung.
- **Portalverwaltung → Benutzer & Rollen → Mitglieder-Konfiguration:** eine
  Spalte „Ohne Mitgliedschaft" neben den Mitgliedtypen, gleiche `cc-seg`, keine
  neue Bedienlogik.

## Was NICHT Teil dieses Auftrags ist

Die Personenseite und ihre Tabs. Sie ist der Grund, warum diese Achse jetzt
gebraucht wird, aber ein eigenes Vorhaben. Ebenso die Elternseite
(`auftrag_elternseite.md`) — sie setzt auf dieser Migration auf und wird
unmittelbar danach gebaut. **Beide Aufträge fassen dieselbe Migration an: sie
gehört ganz hierhin und dort gar nicht.**

## Vorgehen

1. Bestandsaufnahme und Plan: die Seed-Liste bestätigt, der Vorschlag für das
   Registry-Merkmal `nur_mitgliedschaft`, das `KonfigZiel`, jede Aufrufstelle
   von `getFeldkonfig` mit der Aussage, welcher Fall dort gilt, und die Ids der
   Junioren-Mitgliedtypen aus der DB. **Nichts bauen.**
2. Migration zeigen, Didi führt sie aus.
3. Domain, dann Oberfläche.

**Vor der Migration `show server_version` ausgeben.** `NULLS NOT DISTINCT`
braucht Postgres 15. Und in den Kopf: das ist **nicht** dasselbe wie ein
partieller Unique-Index — der verträgt sich mit `ON CONFLICT` nicht, dieser
schon. Sonst zieht der Nächste die falsche Lehre aus der richtigen Regel.

**`feldkonfig.test.ts`: Testzahl vorher und nachher nennen.** Die rund 16
mechanischen Umschreibungen auf das neue `KonfigZiel` sind die Stelle, an der
ein Test lautlos aufhört zu prüfen. Mindestens ein neuer Test deckt
`ohne_mitgliedschaft` ab, sonst hat der neue Zweig keinen.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- Migration über drei Anweisungen hinaus in **einen** `do $mig$`-Block mit
  Zählprobe am Ende. Erwartete Zahlen aus dem **Dump** ableiten, nicht aus dem
  Skript.
- Keine Datei ohne `npm run typecheck`, `npm run build`, `npm test`
  (567 grün vor Beginn — Abweichung nach oben oder unten benennen).
- Nach der Strukturänderung Dump **und** `npm run gen:types` nachziehen.
- Deutsch (Schweiz) in Kommentaren, kein ß.
