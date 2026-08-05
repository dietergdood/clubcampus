# Auftrag für Claude Code — Etappe 3: Elternkontakte auf `personen` umstellen

## Ausgangslage

Der Personen-Umbau (siehe `ARCHITECTURE.md` → Personen-Modell) ist bei Etappe 3 angelangt. Etappen 1, 2a und 2b sind fertig.

Heute gibt es Menschen doppelt: ein Vater, der selbst Aktivmitglied ist und dessen Sohn Junior ist, steht in `mitglieder` **und** in `elternkontakte`. Etappe 2a hat diesen Fall über E-Mail-Gleichheit zusammengeführt. Etappe 3 löst nun `elternkontakte` als eigene Personenquelle ab.

**Die Eigenheit, um die es geht:** `elternkontakte.mitglied_id` ist `NOT NULL`. Der Elternteil hängt also an **einem** Kind. Ein Vater mit zwei Kindern hat **zwei Zeilen** — und ist damit zweimal derselbe Mensch.

## Zielmodell

```
personen        der Mensch (bereits vorhanden)
eltern_kinder   person_id → personen.id
                mitglied_id → mitglieder.id
                hauptkontakt, beziehung   (pro Verknüpfung, nicht pro Person!)
elternkontakte  entfällt — in Etappe 3 nicht mehr gelesen/geschrieben,
                gelöscht wird die Tabelle erst in Etappe 6
```

`beziehung` gehört an die Verknüpfung: dieselbe Person kann Mutter des einen und Stiefmutter des anderen Kindes sein. Ebenso `hauptkontakt` — pro Kind genau einer, erzwungen durch den partiellen Index `eltern_kinder_ein_hauptkontakt`.

## Datenlage, am 05.08.2026 geprüft

| | |
|---|---|
| `elternkontakte` | 398 Zeilen |
| davon ohne E-Mail | 1 (Rosmarie Steiner, Grossmutter — nur telefonisch erreichbar) |
| Elternteile mit mehreren Kindern | 1 (Stefan Odermatt, 2 Kinder, gleiche E-Mail) |
| `eltern_kinder` | deckt **alle** `elternkontakte` ab (am 05.08. eine Altzeile nachgetragen) |
| `eltern_kinder.person_id` | überall gesetzt |
| `personen` | 908 |

**Wichtig:** Der Geschwisterfall und die Elternteile ohne E-Mail sind **Seed-Daten vom 05.08.2026** (`supabase/etappe3_seed.sql`, Domäne `@seed.example`). Der Zufallsgenerator hatte für jedes Kind eigene Eltern erfunden — im Originalbestand kamen beide Fälle **null mal** vor. Bei FCH mit rund 400 Junioren sind Geschwister aber häufig. Ohne den Seed würde der Merge-Schritt durchlaufen, ohne je einen Treffer zu haben, und beim Fairgate-Import zum ersten Mal scharf laufen.

Für die Seed-Zeilen existiert **noch keine Person** — sie entstanden nach Etappe 1. Das ist gewollt: Etappe 3 muss diesen Fall beherrschen.

## Aufgabe 1 — SQL: liegt bereits vor

`supabase/etappe3_eltern.sql` ist geschrieben. **Nicht neu bauen, nicht ändern** — Didi spielt sie im SQL-Editor ein, blockweise wie Etappe 1 und 2a.

| Block | Inhalt |
|---|---|
| A | Sperrabfragen — Elternkontakte ohne Verknüpfung, mehrdeutige E-Mails |
| B | Personen anlegen bzw. verknüpfen, zusammengeführt über die E-Mail; Zuordnung in der Hilfstabelle `_etappe3_map` |
| C | `eltern_kinder.person_id` nachziehen |
| D | Portal-Zugang übertragen (`elternkontakte.benutzer_id` → `benutzer.person_id`) |
| E | `beziehung` und `hauptkontakt` konsolidieren, nur leere Felder auffüllen |
| F | **`eltern_kinder.eltern_id` nullable, `person_id` NOT NULL** — der entscheidende Schritt |
| G | Verifikation samt Geschwister- und Ohne-E-Mail-Probe |

**Block F ist der Kern.** Solange `eltern_kinder.eltern_id` NOT NULL ist, braucht jede neue Verknüpfung zwingend eine `elternkontakte`-Zeile — der Umbau wäre folgenlos. Nach F ist `person_id` der Bezugspunkt, und `eltern_kinder` bekommt einen Unique-Index auf `(verein_id, person_id, mitglied_id)`.

Der Code muss also davon ausgehen:

- `eltern_kinder.person_id` ist gesetzt und **NOT NULL**
- `eltern_kinder.eltern_id` ist **Altlast** und darf nicht mehr geschrieben werden
- `beziehung` liegt an `eltern_kinder`, nicht an der Person

## Aufgabe 2 — Code

`elternkontakte` wird an 54 Stellen in 13 Dateien benutzt:

```
domains/members/elternService.ts        (Kern — Lesen, Schreiben, Verknüpfen)
domains/members/memberService.ts
domains/app/useAppData.js
modules/members/tabs/ElternTab.tsx
modules/members/ElternkontaktModal.tsx
modules/members/ElternSucheModal.tsx
modules/members/ElternKinderSektion.tsx
modules/members/NeuesMitgliedElternSektion.tsx
modules/members/NeuesMitgliedModal.tsx
clubcampus.tsx
types.ts
+ zwei Testdateien
```

**Die Fassaden-Regel gilt weiter** (`ARCHITECTURE.md`): Services lesen per Join, liefern aber **flache Zeilen**. `domains/person/personService.ts` bringt dafür `flacheZeile()`, `flacheZeilen()`, `verteileFelder()` und `PERSON_FELDER` mit — dort anschliessen, nichts Paralleles bauen.

Besonders zu beachten:

- **`insertElternkontakt()`** legt heute eine `elternkontakte`-Zeile an. Künftig: Person anlegen oder bestehende über die E-Mail finden, dann `eltern_kinder` verknüpfen.
- **`NeuesMitgliedElternSektion`** (05.08.2026 gebaut) erfasst Elternteile beim Anlegen eines Juniors. Der Ablauf bleibt, nur das Ziel ändert sich.
- **`sucheElternkontakte()`** muss in `personen` suchen, nicht mehr in `elternkontakte`.
- **`elternkontakte.supporter`** wird in Etappe 5 zu einem Mitgliedtyp. In Etappe 3 nur mitnehmen, nicht umbauen.

## Was NICHT brechen darf

- **`mitglieder_ansichten`** — gespeicherte Ansichten der Elternliste. `spalten`, `filter`, `gruppierung`, `sortierung` sind JSONB mit Feld-Keys und **Nutzerdaten**. Umbenannte oder verschachtelte Keys brechen sie still: kein Fehler, nur eine leere Spalte.
- **`elternListUtils.tsx`**, `memberFilter`, `memberGrouping` — arbeiten auf flachen Zeilen und sollen unberührt bleiben.
- **`mitglieder.id`** bleibt überall der Bezugspunkt für Kinder.

## Vorgehen

1. Bestandsaufnahme: alle 54 Stellen auflisten, gruppiert nach Lesen / Schreiben / Anzeige. **Liste zeigen, bevor etwas geändert wird.**
2. Code umstellen, `elternService` zuerst.
3. Tests: die bestehenden müssen grün bleiben (315), neue für die Zusammenführung über E-Mail und für Elternteile ohne E-Mail.

### Zwei Fallen, die beim Anfangen aufgefallen sind

**`database.types.ts` ist unvollständig.** `eltern_kinder.person_id`, `eltern_kinder.beziehung` und die Fremdschlüsselbeziehung `eltern_kinder.person_id → personen` fehlen. Ohne die Beziehung meldet PostgREST beim Join „could not find the relation between personen and eltern_kinder". Nach Block F also zuerst:

```
npx supabase gen types typescript --linked > src/database.types.ts
```

**`benutzer_id` verschwindet aus der Elternliste.** `elternListUtils.tsx` liest heute `elternkontakte.benutzer_id`, um den Portal-Zugang anzuzeigen. Nach Block D steht diese Information in `benutzer.person_id` — die Elternliste muss von dort lesen, sonst zeigt sie für alle „kein Zugang".

## Projektregeln

`CLAUDE.md`. Für diesen Auftrag besonders:

- Analysieren, Plan zeigen, auf Freigabe warten, dann umsetzen.
- Keine Datei ohne `npm run typecheck` (0 neue Fehler), `npm run build` (grün), `npm test` (315 grün).
- Nach der Strukturänderung: Dump **und** Typen nachziehen. `database.types.ts` lief am 05.08. dreimal hinterher.
- Deutsch (Schweiz) in Kommentaren, kein ß.
