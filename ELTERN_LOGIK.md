# ClubCampus — Elternkontakte Logik

## Datenstruktur (n:m)

### Tabellen

**`elternkontakte`** — Personen-Datensatz des Elternteils
- `id`, `verein_id`, `vorname`, `nachname`, `beziehung`
- `email` ← **Pflichtfeld** (für Portal-Zugang + Benachrichtigungen)
- `telefon`, `benutzer_id` (Portal-Zugang)
- `mitglied_id` + `hauptkontakt` → **deprecated**, werden nach Migration entfernt

**`eltern_kinder`** — Verknüpfungstabelle (n:m)
- `id`, `verein_id`
- `eltern_id` → `elternkontakte.id`
- `mitglied_id` → `mitglieder.id`
- `hauptkontakt` boolean — pro Kind, nicht global
- Unique Constraint: `(eltern_id, mitglied_id, verein_id)`
- RLS: `verein_id = get_my_verein_id()`

---

## Entknüpfungs-Auslöser

Ein Elternteil wird von einem Kind entknüpft durch:

1. **Admin** — manuell im Eltern-Tab des Mitglieds
2. **Mitglied selbst** — im Portal (eigener Tab)
3. **Automatisch** — wenn Mitgliedtyp von Junioren-Typ → Aktiv wechselt

---

## Logik nach Entknüpfung

### Schritt 1: Prüfen ob letztes Kind
Nach dem Entknüpfen: Zähle verbleibende Einträge in `eltern_kinder` für diesen Elternteil.

- **Noch weitere Kinder vorhanden** → nichts weiter, fertig.
- **Letztes Kind entknüpft** → Schritt 2

### Schritt 2: Ist das Kind noch im Verein?

**Kind ist noch im Verein** (z.B. Mitgliedtyp-Wechsel Junior → Aktiv):
- E-Mail an Elternteil:
  > "Ihr Kind [Name] ist nun Aktivmitglied bei [Verein]. Möchten Sie als Supporter im Verein bleiben und weiterhin Zugang zur App und Vereinsinformationen haben?"
  > [Ja, als Supporter bleiben] [Nein, Daten löschen]
- **Bestätigen** → Elternkontakt-Rolle zu "Supporter", Portal-Zugang bleibt / wird neu erstellt
- **Ablehnen** → Elternkontakt-Datensatz löschen + Bestätigungs-E-Mail

**Kind hat den Verein verlassen** (archiviert/gelöscht):
- Elternkontakt-Datensatz sofort löschen
- E-Mail an Elternteil:
  > "Ihr Kind [Name] hat den Verein [Verein] verlassen. Ihre Daten wurden datenschutzkonform gelöscht."

---

## Mehrere Elternteile pro Kind

- Kind hat Mutter + Vater → beide werden entknüpft wenn Kind geht
- Jeder Elternteil bekommt separat die E-Mail
- `hauptkontakt` ist pro Kind gesetzt (in `eltern_kinder`)

---

## Mehrere Kinder pro Elternteil

- Elternteil hat Kind A (Junior) + Kind B (wechselt zu Aktiv)
- Kind B wird entknüpft → Elternteil hat noch Kind A → **nichts passiert**
- Erst wenn Kind A auch entknüpft → Logik greift

---

## E-Mail Pflichtfeld

`elternkontakte.email` ist Pflichtfeld:
- Validierung im `ElternTab.jsx` beim Speichern
- Ohne E-Mail kein Portal-Zugang möglich
- Ohne E-Mail keine Benachrichtigung möglich

---

## Portal-Zugang

- Elternteil als "Eltern"-Rolle → Zugang zu Kind-bezogenen Informationen
- Elternteil als "Supporter" → Zugang zu allgemeinen Vereinsinformationen
- Rollen-Wechsel: `benutzer.role` wird von "eltern" → "supporter" geändert

---

## Offene Punkte (spätere Sessions)

- E-Mail-Versand via Supabase Edge Function oder externem Mail-Provider
- Bestätigungs-/Ablehnungslink in E-Mail (Token-basiert, Ablaufdatum)
- Self-Service Löschantrag im Portal für Supporter
- Automatischer Trigger bei Mitgliedtyp-Wechsel (DB Trigger oder App-seitig?)
