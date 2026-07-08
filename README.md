# ClubCampus

![ClubCampus](./public/slogan.png)

ClubCampus ist eine Progressive Web App (PWA) für die Verwaltung von Sportvereinen. Mehrere Vereine teilen dieselbe Infrastruktur — jeder Verein hat eigenes Branding, eigene Benutzer und vollständig getrennte Daten.

---

## Produkt

### Module

| Modul | Beschreibung |
|---|---|
| Dashboard | Übersicht, Schnellzugriff, rollenbasierte Ansichten |
| Mitglieder | Mitgliederverwaltung, Profile, Elternkontakte, Archiv |
| Kader | Kaderverwaltung pro Team und Saison |
| Teams | Mannschaftsverwaltung, Teamstruktur |
| Trainingsplan | Wöchentliche Trainingsplanung, Platzbelegung |
| Termine | Vereinskalender mit Spielen, Trainings und Events, RSVP |
| Spielplan | Spiele, Resultate, Aufgebote |
| Helfereinsätze | Einsatzplanung, Schichten, Zuteilungen |
| Nachrichten | Interne Kommunikation |
| News | Vereinsnews, intern und öffentlich |
| Material | Materialverwaltung, Ausleihen |
| Dokumente | Dokumentenablage |
| Wiki | Vereinswissen |
| Medien | Berichte erstellen und einreichen (Spielbericht, Lagebericht, Vorschau, Teamnews etc.) für die öffentliche Vereinswebsite |
| Portalverwaltung | Systemeinstellungen (nur Administrator) |

### Rollen

| Rolle | Beschreibung |
|---|---|
| administrator | Vollzugriff inkl. Systemeinstellungen |
| administration | Vereinsverwaltung, keine Systemeinstellungen |
| trainer | Teamverwaltung, Trainings, Spielplan |
| funktionaer | Materialverwaltung, Helfereinsätze |
| spieler | Eigenes Profil, Anwesenheit, Teamansicht |
| eltern | Kinderprofil, Termine |

### Branding

Jeder Verein richtet sein Branding direkt in der App ein: **Portalverwaltung → Aussehen**

Änderungen werden via Supabase Realtime live auf alle offenen Sessions übertragen — kein Reload nötig.

| Einstellung | Beschreibung |
|---|---|
| Vereinsname | Wird im Menü und Login-Screen angezeigt |
| Vereinslogo | PNG/SVG — Navigation und Login |
| Vereinsfarbe | Hauptfarbe (Badges, Tabellenheader, aktive Elemente) |
| Navigationsfarbe | Hintergrund der Seitennavigation |
| Avatar Farben | Hintergrund und Text der Benutzer-Avatare |
| Button Farben | Primäre Aktions-Buttons |

### Neuen Verein einrichten

Alle Vereine laufen auf derselben Infrastruktur — ein neuer Verein braucht nur einen DB-Eintrag und einen Admin-User.

**1. Verein in der DB anlegen** (Supabase SQL Editor):
```sql
INSERT INTO vereine (name, theme) VALUES ('Vereinsname', '{}');
```

**2. Admin-User erstellen:**
1. Supabase → Authentication → Users → **Invite User**
2. In `benutzer` Tabelle: `verein_id` und `role = 'administrator'` setzen
3. Admin loggt sich ein → Portalverwaltung → Branding und Module einrichten

**3. Subdomain (optional):**
1. Vercel → Projekt → Settings → Domains → `vereinsname.clubcampus.app`
2. DNS: CNAME `vereinsname` → `cname.vercel-dns.com`

---

## Technologie

### Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18 + Vite |
| Backend / Auth / DB | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel (Pro) |
| Sprache | Deutsch (Schweiz) |
| Zusatz-Libraries | xlsx (CSV/Excel-Export) |

### Domains

- [clubcampus.app](https://clubcampus.app)
- [clubcampus.ch](https://clubcampus.ch)

### Vercel Environment Variables

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Mandantenfähigkeit

Alle Vereine teilen eine Supabase-Datenbank. Trennung via `verein_id` auf jeder Tabelle + Row Level Security (RLS).

DB-Hilfsfunktionen:
- `get_my_verein_id()` — verein_id des eingeloggten Users
- `get_my_role()` — Rolle des eingeloggten Users
- `is_admin()` — true wenn administrator oder administration
- `is_trainer()` — true wenn trainer

Jede neue Tabelle braucht zwingend `verein_id`, Index, RLS und Policies.  
→ Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Projektstruktur

```
src/
  domains/          <- Business-Logik, Services, Hooks
  shared/           <- Wiederverwendbare UI-Bausteine
  modules/          <- Alle Modul-Dateien
    members/        <- MitgliederModul aufgeteilt
    portal/         <- PortalverwaltungModul (1 Tab = 1 Datei)
  App.jsx           <- Entry Point, Supabase-Client
  clubcampus.jsx    <- Hauptanwendung: Portal, Auth, Theme, Routing
  constants.js      <- Farben, Breakpoints, globale Konstanten
  icons.jsx         <- Tabler Icons Wrapper
  main.jsx          <- React Root
  supabase.js       <- Supabase Client
  theme.jsx         <- Design-System, CSS, UI-Komponenten

public/
  logo.png          <- ClubCampus Standard-Logo (Fallback)
  manifest.json     <- PWA Manifest

supabase/
  schema.sql        <- Schema, Tabellen, Policies, RLS, Funktionen (kein Datendump)
                       Wird nach jeder Session manuell aktualisiert und committed.
```

→ Vollständige Struktur und Entwicklungsregeln: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Pilot

**FC Herrliberg (FCH)** — Pilotverein seit Mai 2026

| | |
|---|---|
| Supabase DB | Central Europe (Zürich / eu-central-2) |
| Deployment | [clubcampus.vercel.app](https://clubcampus.vercel.app) |
| Ziel-Domain | clubcampus.app/fcherrliberg (geplant — heute noch kein Slug-Routing) |

**Geplantes URL-Schema:**
- `clubcampus.app/fcherrliberg`
- `clubcampus.app/fckloten`
- `clubcampus.app/svsportverein`

Heute lädt die App den Verein via `.single()` aus der `vereine` Tabelle — kein Slug-Routing. Der Umbau auf pfadbasiertes Routing (Slug → verein_id) ist geplant.

---

## Kontakt

**Dieter Good** — Entwickler & Inhaber  
ClubCampus — [clubcampus.app](https://clubcampus.app) · [clubcampus.ch](https://clubcampus.ch)
