# ClubCampus

![ClubCampus](./public/slogan.png)

**Multi-Tenant SaaS für Sportvereine** — Mitglieder, Kader, Termine, Helfereinsätze und mehr in einer modernen PWA.

[![CI](https://github.com/dietergdood/clubcampus/actions/workflows/ci.yml/badge.svg)](https://github.com/dietergdood/clubcampus/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)

---

## Was ist ClubCampus?

ClubCampus ist ein Vereinsportal das Sportvereine bei der täglichen Verwaltung unterstützt. Mehrere Vereine teilen dieselbe Infrastruktur — jeder Verein hat eigenes Branding, eigene Benutzer und vollständig getrennte Daten (Multi-Tenancy via Row Level Security).

**Pilot:** FC Herrliberg (FCH) seit Mai 2026

---

## Features

### Module

| Modul | Beschreibung |
|---|---|
| **Dashboard** | Übersicht, Schnellzugriff, rollenbasierte Ansichten |
| **Mitglieder** | Mitgliederverwaltung, Profile, Elternkontakte, Archiv, Export |
| **Kader** | Kaderverwaltung pro Team und Saison |
| **Teams** | Mannschaftsverwaltung, Teamstruktur |
| **Termine** | Vereinskalender mit Spielen, Trainings und Events, RSVP |
| **Spielplan** | Spiele, Resultate, Aufgebote |
| **Trainingsplan** | Wöchentliche Trainingsplanung, Platzbelegung |
| **Helfereinsätze** | Einsatzplanung, Schichten, Zuteilungen |
| **Nachrichten** | Interne Kommunikation |
| **Portalverwaltung** | Systemeinstellungen, Branding, Rollen, Module (nur Administrator) |

### Rollen & Berechtigungen

| Rolle | Zugriff |
|---|---|
| `administrator` | Vollzugriff inkl. Systemeinstellungen |
| `administration` | Vereinsverwaltung ohne Systemeinstellungen |
| `trainer` | Teamverwaltung, Trainings, Spielplan |
| `funktionaer` | Konfigurierbare Funktionen und Gruppen |
| `spieler` | Eigenes Profil, Anwesenheit, Teamansicht |
| `eltern` | Kinderprofil, Termine, Anwesenheit |
| `supporter` | Lesezugriff, Helfereinsätze |

### Branding

Jeder Verein richtet sein Branding direkt in der App ein — Änderungen werden via **Supabase Realtime** live auf alle offenen Sessions übertragen.

- Vereinsname, Logo, Primärfarbe
- Navigationsfarben, Avatar-Farben, Button-Farben
- Alle Änderungen ohne Reload sichtbar

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend / Auth / DB | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| Sprache | Deutsch (Schweiz) |
| Testing | Vitest + Testing Library |
| Linting | ESLint + typescript-eslint |

---

## Architektur

### Projektstruktur

```
src/
  domains/          # Business-Logik, Services, Hooks
    app/            # getPermissions (Modul-Zugriffstufen), getProfilCheck, useAppData
    members/        # memberService, elternService, useInlineEdit, useMemberMeta
    person/         # personUtils, personTypes
    roles/          # roleUtils, Rollenhierarchie
    season/         # seasonUtils
    permissions/    # permissions.js (Prädikate je Fachbereich), funktionaerStufen
  shared/           # Wiederverwendbare UI-Bausteine
    ui/             # Btn, Card, Modal, Tabs, Av, DropMenu, ...
    forms/          # PhoneInput, AddressInput, InlineField, ...
    list/           # Toolbar, ListView, useListView, ColMenu, ...
    person/         # PersonPersonalien, PersonKontakt, PersonTeams, ...
    utils/          # colorUtils
    componentRegistry.js  # Quelle des Design-System-Tabs
  modules/          # Alle Feature-Module
    members/        # MemberDetail, MemberHero, MemberListCell, Tabs, ...
    portal/         # PortalverwaltungModul (1 Tab = 1 Datei)
    teams/          # teamService, useTeams
  styles/
    cc.css          # Design System (cc-* Klassen)
  theme.ts          # Barrel: re-exportiert shared/ui, shared/forms, shared/list
  types.ts          # Globale TypeScript-Typen
  constants.ts      # Farben, Breakpoints, globale Konstanten
  database.types.ts # Generierte Supabase-Typen
```

### Import-Richtung

```
modules → domains → shared
```
Module dürfen nie von anderen Modulen importieren. Shared ist die unterste Schicht. Auf `shared/` greifen Module über die Barrel-Datei `theme.ts` zu, nicht direkt.

### Multi-Tenancy

Alle Vereine teilen eine Supabase-Datenbank. Trennung via `verein_id` auf jeder Tabelle + Row Level Security.

```sql
-- Jede neue Tabelle braucht zwingend:
verein_id uuid NOT NULL REFERENCES vereine(id)
CREATE INDEX ON tabelle(verein_id)
ALTER TABLE tabelle ENABLE ROW LEVEL SECURITY
-- + SELECT Policy mit get_my_verein_id()
-- + Write Policy mit is_admin()
```

DB-Hilfsfunktionen:
- `get_my_verein_id()` — verein_id des eingeloggten Users
- `get_my_role()` — Rolle des eingeloggten Users
- `is_admin()` — true wenn administrator oder administration

---

## Development

### Voraussetzungen

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/dietergdood/clubcampus
cd clubcampus
npm install
cp .env.example .env  # Supabase Keys eintragen
npm run dev
```

### Environment Variables

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Scripts

```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build
npm run test         # Tests ausführen
npm run typecheck    # TypeScript prüfen
npm run lint         # ESLint
npm run check:imports # Konstanten-Imports prüfen
```

### CI/CD

Bei jedem Push auf `main` läuft automatisch:

```
TypeScript → ESLint → check:imports → Tests → Build
```

---

## Neuen Verein einrichten

Alle Vereine laufen auf derselben Infrastruktur — ein neuer Verein braucht nur einen DB-Eintrag und einen Admin-User.

**1. Verein anlegen** (Supabase SQL Editor). Der `slug` ist Pflicht — ohne ihn ist der Verein nicht erreichbar, weil das Portal den Verein ausschliesslich über das erste URL-Pfadsegment lädt:
```sql
INSERT INTO vereine (name, slug, theme)
VALUES ('Vereinsname', 'vereinsslug', '{}')
RETURNING id;
```

**2. Admin-User erstellen:**
1. Supabase → Authentication → Users → **Invite User**
2. `benutzer`-Zeile anlegen. **Sie entsteht bei einem neuen Verein nicht von selbst:** der Trigger `on_auth_user_created` sucht die E-Mail in `mitglieder` und `elternkontakte` und bricht ab, wenn er sie nirgends findet — bei einem leeren Verein also immer. Deshalb von Hand:
   ```sql
   INSERT INTO benutzer (id, email, name, role, aktiv, verein_id)
   SELECT u.id, u.email, 'Admin', 'administrator', true, '<verein-id aus Schritt 1>'
     FROM auth.users u WHERE u.email = 'admin@verein.ch';
   ```
   Ab dem zweiten Benutzer greift der Trigger normal, sobald die Person in `mitglieder` steht.
3. Admin loggt sich ein → Portalverwaltung → Branding und Module einrichten

**3. URL:**
```
https://clubcampus-fcherrliberg.vercel.app/<slug>
```
Der Vereins-Slug wird automatisch aus dem ersten URL-Pfadsegment gelesen und lädt das Branding und die Daten des entsprechenden Vereins. Er muss in `vereine.slug` eingetragen sein — ohne Slug in der Adresse lädt das Portal keinen Verein, sondern zeigt eine Meldung.

Die blosse Wurzel wird per `vercel.json` auf `/fcherrliberg` umgeleitet. Ein neu eingerichteter Verein ist also nur über seinen eigenen Slug erreichbar, nicht über die Wurzel.

> **Domains.** `clubcampus.app` und `clubcampus.ch` zeigen aktuell **nicht** auf dieses Deployment (Stand 27.07.2026: `clubcampus.app` liefert eine fremde Apache-Seite mit ungültigem Zertifikat, `clubcampus.ch` löst nicht auf). Bis die Domains im Vercel-Projekt verbunden und die DNS umgezogen ist, gilt die `vercel.app`-Adresse.

---

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architektur, Entwicklungsregeln, Komponenten-Registry |
| [CLAUDE.md](./CLAUDE.md) | Entwicklungsregeln für Claude Code |
| [ELTERN_LOGIK.md](./ELTERN_LOGIK.md) | Elternkontakte n:m Datenmodell |
| `supabase/schema.sql` | DB-Schema, Tabellen, Policies, RLS |

---

## Kontakt

**Dieter Good** — Entwickler & Inhaber  
[clubcampus.app](https://clubcampus.app) · [clubcampus.ch](https://clubcampus.ch)
