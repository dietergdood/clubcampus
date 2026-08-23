# Auftrag für Claude Code — E-Mail und Identität

## Ausgangslage

Die E-Mail-Adresse steht an **drei** Orten, und keiner ist als Wahrheit
benannt:

| Ort | Bedeutung | Besonderheit |
|---|---|---|
| `auth.users.email` | der Login | ändert sich nur über Supabase Auth |
| `benutzer.email` | Spiegel im Portal | `NOT NULL` |
| `personen.email` | der Vereinskontakt | Unique pro Verein, siehe unten |

`personen_email_pro_verein` ist ein partieller Unique-Index über
`(verein_id, lower(btrim(email)))`, nur für nicht-leere Werte. Zwei Personen
desselben Vereins können dieselbe Adresse also nicht tragen.

Heute gibt es keinen Weg, die eigene Adresse selbst zu ändern. In den
Datenprüfungs-Masken steht sie als „nur durch den Administrator änderbar", und
der Administrator ändert damit `personen.email` — der Login bleibt, wie er war.
Wer seine Adresse wechselt, meldet sich weiter mit der alten an, ohne dass es
jemandem auffällt. Ein Ausfall, der wie ein Zustand aussieht.

**Entschieden am 20.08.2026:** Die Person ändert ihre Adresse an ihrem Kontakt,
das Login zieht nach, danach wird abgemeldet.

## Die Regel, die alles trägt

**Das Feld ändert immer denselben Wert: den Vereinskontakt in `personen`.**
Was dazukommt, ist eine Bestätigung — und die geht **immer an die Person
selbst**, nie an den, der geklickt hat.

Daraus folgen drei Fälle. Sie unterscheiden sich nicht danach, wer klickt,
sondern danach, ob die betroffene Person ein Konto hat.

**A · Person ohne Konto** (der typische Junior). `personen.email` schreiben,
fertig. Es gibt kein Login, das nachziehen könnte. Gilt für Elternteil wie
Verwaltung.

**B · Person mit Konto, sie selbst ändert.**
1. Beim Speichern **nur** `auth.updateUser({ email })`. `personen.email` bleibt
   stehen.
2. Das Feld zeigt: „Bestätigung an neue@… gesendet — bis dahin gilt die
   bisherige Adresse zum Anmelden." Angemeldet bleibt sie.
3. Erst der Klick in der Bestätigung zieht `personen.email` und
   `benutzer.email` nach. **Dort** wird abgemeldet — der Link bringt ohnehin
   eine neue Sitzung mit.

**⚠ Die Reihenfolge ist der ganze Punkt.** Wer beim Speichern abmeldet, sperrt
Leute aus: `auth.users.email` wechselt erst nach dem Klick, bis dahin gilt zum
Anmelden die **alte** Adresse. Wer den Link nicht klickt — Tippfehler, Spam,
„mach ich später" — steht vor dem Login und tippt die neue ein, weil im Profil
die neue stand. Die alte kennt die Oberfläche ihm nicht mehr. Kein Fehler,
keine Meldung, nur ein Konto, an das er nicht mehr herankommt.

**C · Person mit Konto, jemand anders ändert** (Verwaltung bei einem Mitglied,
Elternteil bei einem Junior mit eigenem Zugang).
1. `personen.email` wird gesetzt — der Vereinskontakt ist Sache des Vereins.
2. **An die bisherige Adresse** geht eine Meldung: „Der Verein hat deine
   E-Mail auf neue@… geändert — bestätige hier, sonst gilt weiter die alte."
3. **An die neue** geht die Bestätigung.
4. Erst der Klick zieht `auth` nach. Klickt niemand, bleibt der Login, wie er
   war: Vereinskontakt geändert, Anmeldung nicht.

**⚠ Warum nicht einfach mitziehen:** Ein Administrator könnte sonst eine fremde
Anmeldung auf eine Adresse umbiegen, die ihm gehört, und käme über „Passwort
vergessen" ins Konto. Der Mensch, dem das Konto gehört, erführe es erst beim
nächsten fehlgeschlagenen Login. Das ist kein Randfall, das ist der
Standardangriff gegen genau diese Funktion.

## Der Sonderweg: Login zurücksetzen

Bleibt der Fall, in dem die Person an die alte Adresse nicht mehr herankommt —
Lehrstelle statt Schule, alter Arbeitgeber. Dann klickt sie nichts, und das
Konto ist blockiert.

Dafür ein **eigener Knopf** für die Verwaltung: Konto auf die neue Adresse
umstellen **ohne** Bestätigung, über die Admin-API. Mit eigener Rückfrage, und
mit Eintrag in `mitglieder_aenderungen` (`geaendert_von` = der Administrator),
damit nachvollziehbar ist, wer wann eine fremde Anmeldung umgestellt hat.

**Nicht als stille Nebenwirkung des Kontaktformulars.** Sichtbar und
protokolliert statt unsichtbar und bequem.

## Was zu bauen ist

**Edge Function** für Fall C und den Sonderweg — `auth.admin.updateUserById()`
braucht den Service-Role-Key, der nicht ins Frontend gehört. Muster:
`supabase/functions/invite-user`.

**✅ Autorisierung: nimm `supabase/functions/_shared/aufrufer.ts`** — sie löst
den Aufrufer auf und prüft `ist_admin` und `verein_id`. Nicht nachbauen.

⚠ **Hier stand „Kopier deren Autorisierung NICHT"**, weil `invite-user` nur
prüfte, *dass* ein `Authorization`-Header da ist. Gemessen am 23.08.2026 war
die Lücke grösser als der Satz sagte: in diesem Header steht im Normalfall der
publishable key aus dem JavaScript-Bündel — also **jeder**, nicht nur jeder
Eingeloggte. Repariert am 23.08.2026; der Punkt auf der Liste offener
Sicherheitsthemen entfällt.

**Passwort-Rückfrage vor dem Absenden** in Fall B. Selbstbedienung bei der
E-Mail heisst sonst: wer eine offene Sitzung übernimmt, übernimmt das Konto.

**Fehlerbehandlung `23505`.** Nimmt jemand eine Adresse, die im Verein bereits
vergeben ist — typisch das Kind, das die Adresse der Mutter nimmt —, muss der
Satz erscheinen: „Diese Adresse ist im Verein bereits vergeben." Kein leeres
`catch`; ein `23505` ist eine Aussage und kein Rauschen.

**Backfill.** Wer angemeldet ist, hat die Adresse bereits — sonst käme er nicht
hinein. Eine leere `personen.email` bei einem Menschen mit Konto ist also kein
fehlendes Feld, sondern ein fehlender Abgleich. Einmalig aus `auth.users`
nachziehen, mit Zählprobe. Das reduziert zugleich die Zahl, die nach dem
E-Mail-Pflicht-Entscheid in der Datenprüfung aufleuchtet.

**Welcher Ort ist die Wahrheit?** Beantworte das im Plan ausdrücklich, statt es
implizit zu lassen. Vorschlag: `auth.users.email` für die Anmeldung,
`personen.email` für den Verein, `benutzer.email` als reiner Spiegel, der von
einer Stelle geschrieben wird. Drei Orte ohne benannte Rangfolge sind der Grund
für den heutigen Zustand.

## Was NICHT Teil dieses Auftrags ist

- Der E-Mail-Pflicht-Entscheid (Pflicht ausser bei Junioren) — der gehört in
  `auftrag_feldkonfig_gilt_fuer.md`.
- `invite-user` reparieren.
- Das DSGVO-Löschen, das `auth.users` ebenfalls braucht. Bau die Function so,
  dass sie später einen zweiten Zweck aufnehmen kann, aber bau ihn nicht.

## Vorgehen

1. Bestandsaufnahme und Plan. Darin: die Rangfolge der drei Orte, jede
   Schreibstelle auf `email` im Bestand, und wie die Bestätigung technisch
   zurückkommt (Auth-Hook, Redirect-Ziel oder Abgleich beim nächsten Login —
   nicht raten, nachschauen). **Nichts bauen.**
2. Edge Function und Backfill zeigen, Didi führt aus.
3. Oberfläche.
4. Zum Schluss mit einem echten Konto durchspielen: ändern, **nicht**
   bestätigen, abmelden, mit der alten Adresse anmelden. Das muss gehen. Ein
   grüner Test beweist es nicht — der ganze Fehler liegt im Fenster zwischen
   Speichern und Bestätigen.

## Projektregeln

`CLAUDE.md` und `ARCHITECTURE.md` (oberer Teil bis „Post-Refactoring
Pflicht-Workflow"; alles unter „Archiv" ist Historie).

- Analysieren → Plan zeigen → auf Freigabe warten → erst dann bauen.
- `catch {}` ohne Bindung ist verboten.
- Keine Datei ohne `npm run typecheck`, `npm run build`, `npm test`.
- Deutsch (Schweiz) in Kommentaren, kein ß.
