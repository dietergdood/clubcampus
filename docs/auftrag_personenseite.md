# Auftrag für Claude Code — Die Personenseite

## Was gebaut wird, in einem Satz

**Eine Seite für alle Menschen des Vereins** — Mitglied, Elternteil, Supporter.
Derselbe Hero, dieselbe Tableiste, dieselben Felder. Was eine Person ohne
Mitgliedschaft sieht, entscheidet die Portalverwaltung in der Spalte „Ohne
Mitgliedschaft": Felder **und** Tabs.

Kein Modal.

## Ausgangslage

Es gibt heute **drei** Ansichten für dieselbe Sache:

| Wer | Was er bekommt | Feldquelle |
|---|---|---|
| Mitglied | `MemberDetail` — Hero, Tableiste, sechs Tabs | Feldkonfiguration ✓ |
| Supporter | `SupporterModal`, 190 Zeilen | eigene `FELDER`-Konstante, 7 Felder |
| Elternteil | `ElternkontaktModal`, 265 Zeilen | fest verdrahtet |

Der Supporter hatte die volle Ansicht, bis er am 20.08. keine Mitgliedschaft
mehr hatte. Seither bekommt er ein Modal, in dem AHV-Nummer, Nationalität und
Heimatort **gar nicht vorgesehen** sind. Das ist ein Rückschritt, kein Entwurf.

**Die Maschinerie ist längst da.** `MemberDetail` liest die Feldkonfiguration
(Zeile 111) und filtert daraus schon heute seine Tabs (Zeile 245):

```ts
].filter(t => t.key === "info" || istSichtbar(konfig, `tab_${t.key}`));
```

Und seit dem 21.08. gibt es die Achse für Personen ohne Mitgliedschaft
(`gilt_fuer`, `OHNE_MITGLIEDSCHAFT`). Es fehlt nur der Weg, eine Person ohne
Mitgliedschaft überhaupt auf diese Seite zu bringen.

## ⚠ Der eigentliche Aufwand: die Identität

`MitgliederModul.tsx:346` sagt es selbst:

> `MemberDetail` arbeitet mit einer MITGLIEDSCHAFT: `SelectedMember.id` ist die
> bigint aus `mitglieder`, und rund siebzig Zugriffe in den Tabs lesen sie als
> Zahl.

Gezählt: **75 Stellen** in `MemberDetail`, `MemberHero` und den sechs Tabs
greifen auf `raw.id` / `m.id` / `mitglied_id` zu. Ein Supporter hat keine.
`oeffneMitglied()` hat deshalb heute einen Guard, der abbricht, und die
Supporterliste bietet den Weg gar nicht erst an.

**Das ist die Arbeit dieses Auftrags — alles andere folgt daraus.**

Die Richtung steht seit dem Supporter-Rückbau fest und ist im Bestand schon
angelegt: `MemberRow` trägt `id` (Zeilenschlüssel), `person_id` und ein
**nullbares** `mitglied_id`. Genau dieses `nullable` zwingt den Compiler, jede
der 75 Stellen zu zeigen.

Schlag im Plan vor, wie die Seite ihre Identität führt, und **beantworte für
jede der 75 Stellen**, in welche der drei Gruppen sie fällt:

1. **braucht die Person** → auf `person_id` umstellen
2. **braucht die Mitgliedschaft** → bleibt, und die Stelle gehört in einen
   Zweig, den es ohne Mitgliedschaft nicht gibt (Austritt, Archivieren,
   Mitgliedtyp, Kader)
3. **unklar** → benennen, nicht raten

Eine Tabelle mit 75 Zeilen will niemand lesen — gruppier sie nach Datei und
nenn die Ausnahmen einzeln.

## Was die Konfiguration schon löst

Zehn Schlüssel tragen seit dem 21.08. `nur_mitgliedschaft: true`, darunter
`tab_stats`, `tab_verlauf` und `tab_eltern`. `getFeldkonfig` setzt sie für
`OHNE_MITGLIEDSCHAFT` auf `aus` — **die drei Tabs verschwinden von selbst.**
Kein Sonderfall im Routing, keine `if (istSupporter)`-Abfrage.

Wenn du irgendwo eine solche Abfrage schreiben willst, ist das ein Zeichen,
dass die Konfiguration den Fall noch nicht kennt. Sag es, statt es zu umgehen.

Übrig bleiben für eine Person ohne Mitgliedschaft: **Profil**, **Portal-Zugang**
und **Datenprüfung**. Das ist beabsichtigt.

## Der Hero

`MemberHero` zeigt Mitgliedtyp-Chip, „Austritt…" und „Archivieren" — alles
Mitgliedschaftssachen. Ohne Mitgliedschaft fallen sie weg, und an ihre Stelle
tritt „Mitglied werden" (der Weg gibt es schon: `MitgliedWerdenModal`).

⚠ **Was wegfällt, muss sichtbar wegfallen, nicht leer stehen bleiben.** Eine
Kopfzeile ohne Chips ist von einer kaputten nicht zu unterscheiden.

## Die Feldliste

`PersonFelderFormular` existiert seit heute. Prüf, ob es hier trägt oder ob es
die formularbasierte Schwester von `PersonKontakt`/`PersonPersonalien` bleibt —
und sag es, statt eine vierte Variante zu bauen. **Am Ende dieses Auftrags darf
es genau eine Felddarstellung geben**, die aus der Konfiguration liest.

`SupporterModal` und `ElternkontaktModal` fallen ersatzlos weg. Ihre
Besonderheiten — der Satz „Ein Supporter ist keine Mitgliedschaft…", der
Hinweis zum fehlenden Verlauf, „Mitglied werden" — ziehen auf die Seite um. Was
davon keinen Platz findet, nennst du, statt es zu verlieren.

## ⚠ Was NICHT Teil dieses Auftrags ist

- **Der Kinder-Tab für Eltern.** Dass ein Elternteil einen Tab mit seinen
  Kindern braucht, ist klar — den Entwurf macht Didi selbst. **Bau ihn nicht,
  schlag ihn nicht vor, lass keinen Platzhalter stehen.**
- **Der Verlauf auf `person_id`.** Eigene Migration mit Datenbestand.
  `tab_verlauf` bleibt für Personen ohne Mitgliedschaft aus.
- **Das DSGVO-Löschen** und die Trennung von „Mitgliedschaft löschen".
- **`auftrag_email_identitaet.md`.**

## Vorgehen

1. ✅ **Bestandsaufnahme und Plan.** *(21.08.2026)*
2. ✅ **Umbau der Identität.** `PersonZiel` mit ausdrücklichem `art` statt
   `SelectedMember` mit Index-Signatur; zwei Fabrikfunktionen als einziger
   Weg. Dabei kam heraus, dass **alle vier Einstiege** Falsches mitgaben.
3. ✅ **Hero und Tabs ohne Mitgliedschaft.** Dazu `RolleField` aus `PortalTab`
   herausgezogen — zwei übersprungene Tests liefen danach unverändert grün.
4. ✅ **Die Modals abgelöst.** Beide ersatzlos; `DatenpruefungEltern` auf
   `PersonFelderFormular`, AHV-Nummer schreibbar. Nachtrag: `person_id` kommt
   aus dem Ziel, nicht aus den Daten.
5. **Nachweis in der Oberfläche** — offen, siehe Prüfliste unten.
   Ein grüner Test zeigt das nicht.

## Prüfliste für Schritt 5

Ohne Konfigurationsänderung:

| | erwartet |
|---|---|
| Supporter-Tab → Zeile anklicken | Personenseite statt Modal; Chip **„Ohne Mitgliedschaft"** |
| dort die Tabreihe | nur **Profil · Portal-Zugang · Datenprüfung** — kein Eltern, Statistik, Verlauf |
| dort das Profil | **keine AHV-Nummer** (Seed-Zeile `ahv_nr = aus` auf der Achse `ohne_mitgliedschaft`); Telefon und E-Mail mit `*` |
| dort das Menü | **„Mitglied werden…"**; kein „Mitgliedschaft löschen", kein „Archivieren" |
| dort Telefon inline ändern | speichert und bleibt nach dem Neuladen stehen |
| Eltern-Tab → Namen anklicken | dieselbe Seite, **mit Adresse und Geburtsdatum** (die Liste führt sie nicht — sie werden nachgeschlagen) |
| ein Mitglied öffnen | **unverändert wie vorher** — erscheint hier etwas Neues, ist etwas schiefgelaufen |
| bei einem Kind: Eltern-Tab → Menü | **„Profil öffnen"** statt „Bearbeiten"; führt zum Elternteil |
| bei einem Supporter mit Konto: „Zugang deaktivieren" | Abzeichen springt sofort auf **„Deaktiviert"** — vorher blieb es auf „Aktiv" stehen |

Mit Konfigurationsänderung (Portalverwaltung → Benutzer & Rollen →
„Was ein Mitgliedtyp hat"):

| | erwartet |
|---|---|
| `heimatort` auf **Gibt es nicht**, Achse „ohne Mitgliedschaft" | verschwindet auf der Supporter-Seite, **bleibt** beim Mitglied |
| `tab_datenpruefung` auf **aus**, dieselbe Achse | der Tab verschwindet; steht er gerade offen, springt die Seite auf Profil |

⚠ **Was Schritt 5 NICHT abdeckt: die Datenprüfung des Elternteils selbst.**
Sie braucht ein Konto, und **0 von 394 Elternteilen haben eines**. Dafür liegt
`supabase/testkonto_elternteil.sql` bereit — es fehlt nur die E-Mail-Adresse.
Bis dahin ist der Weg Login → `sollProfilPruefen()` → Overlay → Maske →
`personen` nur gelesen, nicht gelaufen.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- Vor jedem „führ sie aus": Probelauf mit `BEGIN … ROLLBACK`.
- Eine Attrappe kennt kein Schema — beide Richtungen, siehe CLAUDE.md.
- Keine neue CSS-Klasse ohne Suche nach dem Muster, Prüfung des Namens und
  Didis Zustimmung. Namen beschreiben, **was ein Element ist**.
- Keine Datei ohne `npm run typecheck`, `npm run build`, `npm test`.
- Deutsch (Schweiz) in Kommentaren, kein ß.
