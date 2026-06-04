# ClubCampus

**Das digitale Vereinsportal für Sportvereine.**  
ClubCampus ist eine Progressive Web App (PWA) für die Verwaltung von Sportvereinen. Jeder Verein erhält seine eigene Instanz mit eigenem Branding, eigener Datenbank und eigener URL.

---

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18 + Vite |
| Backend / Auth | Supabase |
| Hosting | Vercel |
| Sprache | Deutsch |

---

## Projektstruktur

```
clubcampus/
├── public/                  # Statische Assets
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── apple-touch-icon-180.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.json        # PWA Manifest
│   └── sw.js                # Service Worker
├── src/
│   ├── App.jsx              # Entry Point, Supabase-Initialisierung
│   ├── clubcampus.jsx       # Hauptanwendung (alle Komponenten)
│   ├── main.jsx             # React Root
│   └── supabase.js          # Supabase Client
├── index.html               # HTML Entry Point
├── package.json
└── vite.config.js
```

---

## Neuen Verein einrichten

### 1. Supabase
1. Neues Projekt auf [supabase.com](https://supabase.com) erstellen
2. SQL ausführen (siehe [Datenbankschema](#datenbankschema))
3. `Project URL` und `anon key` notieren

### 2. Vercel
1. [vercel.com](https://vercel.com) → ClubCampus Team → **Add New Project**
2. GitHub Repo `dietergdood/clubcampus` importieren
3. **Environment Variables** setzen:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
4. Deploy

### 3. Domain (optional)
1. Vercel → Projekt → Settings → Domains → z.B. `vereinsname.clubcampus.app`
2. Bei Hostpoint DNS: CNAME `vereinsname` → `cname.vercel-dns.com`

### 4. Ersten Admin-User erstellen
1. Supabase → Authentication → Users → **Invite User**
2. In der App einloggen → Portalverwaltung → Benutzer & Rollen → Rolle auf **Administrator** setzen

---

## Datenbankschema

```sql
-- Vereins-Stammdaten & Theme
create table vereine (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  theme jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table vereine enable row level security;
create policy "Vereine lesbar für alle" on vereine for select using (true);
create policy "Vereine schreibbar für Admins" on vereine for all using (auth.role() = 'authenticated');

-- Eintrag für den Verein
insert into vereine (name, theme) values ('Vereinsname', '{}');
```

> Weitere Tabellen (Mitglieder, Teams, Trainings etc.) werden separat dokumentiert.

---

## Theme / Branding

Jeder Verein kann sein Branding direkt in der App anpassen:  
**Portalverwaltung → Aussehen**

| Einstellung | Beschreibung |
|---|---|
| Vereinsfarbe | Hauptfarbe (Badges, aktive Elemente) |
| Text auf Vereinsfarbe | Muss auf Vereinsfarbe lesbar sein |
| Menü Hintergrund | Hintergrund der Navigationsleiste |
| Menü Text | Farbe der inaktiven Menüpunkte |
| Menü Hover | Farbe beim Überfahren |
| Menü Aktiv Hintergrund | Hintergrund des aktiven Menüpunkts |
| Menü Aktiv Text | Textfarbe des aktiven Menüpunkts |
| Avatar Hintergrund | Hintergrund der Benutzer-Avatare |
| Avatar Text | Textfarbe der Benutzer-Avatare |
| Button Hintergrund | Primäre Buttons |
| Button Text | Text auf primären Buttons |
| Vereinslogo | SVG oder PNG, mind. 200×200px |
| Vereinsname | Wird im Menü angezeigt |

---

## Rollen & Berechtigungen

| Rolle | Beschreibung |
|---|---|
| Administrator | Vollzugriff, Systemeinstellungen |
| Vorstand | Vereinsverwaltung, keine Systemeinstellungen |
| Trainer | Teamverwaltung, Trainings, Spielplan |
| Spieler | Eigenes Profil, Anwesenheit |
| Eltern | Kinderprofil, Termine |
| Funktionär | Materialverwaltung, Helfereinsätze |
| Passivmitglied | Lesezugriff |

---

## Module

- **Dashboard** — Übersicht, Schnellzugriff
- **Mitglieder** — Mitgliederverwaltung, Profile
- **Teams** — Mannschaftsverwaltung, Kader
- **Trainingsplan** — Trainingsplanung, Anwesenheit
- **Spielplan** — Spiele, Resultate, FVRZ-Integration
- **Anwesenheitsstatistik** — Auswertungen
- **News** — Vereinsnews
- **Termine** — Vereinskalender
- **Helfereinsätze** — Einsatzplanung
- **Vereinsbusse** — Bussenmanagement
- **Material** — Materialverwaltung
- **Garderoben** — Garderobenplanung
- **Medien & Berichte** — Dokumente, Medien
- **Wiki** — Vereinswissen
- **Dokumente** — Dokumentenverwaltung
- **Portalverwaltung** — Systemeinstellungen (nur Admin)

---

## Entwicklung lokal

```bash
# Repository klonen
git clone https://github.com/dietergdood/clubcampus.git
cd clubcampus

# Dependencies installieren
npm install

# .env.local erstellen
echo "VITE_SUPABASE_URL=https://xxxxx.supabase.co" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=eyJhbGci..." >> .env.local

# Dev-Server starten
npm run dev
```

---

## Kontakt

**Dieter Good** — Entwickler & Inhaber  
ClubCampus — [clubcampus.app](https://clubcampus.app) · [clubcampus.ch](https://clubcampus.ch)
