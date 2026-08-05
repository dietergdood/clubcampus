-- ═══════════════════════════════════════════════════════════════════════════
-- PFLICHTFELDER — grobe Schluessel aufklappen, leere Mitgliedtypen befuellen
-- 05.08.2026
--
-- ANLASS
-- Die Matrizen sprachen von `adresse` und `vorname_nachname`, das Formular
-- von `strasse`, `plz`, `ort`. Unbekannte Feldnamen werden bei der Pruefung
-- still uebersprungen — Folge: bei Aktivmitglied erschien der Adressblock
-- gar nicht, obwohl die Adresse laut Konfiguration Pflicht war.
--
-- WAS PASSIERT
--   adresse           -> strasse, plz, ort        (beide Matrizen)
--   vorname_nachname  -> entfaellt ersatzlos
--
-- vorname/nachname sind in `mitglieder` NOT NULL und werden im Formular
-- unbedingt geprueft. Ein Haekchen dafuer liesse sich nicht wegnehmen — die
-- Zeile verschwindet deshalb aus der Oberflaeche und wird durch einen
-- Hinweis ersetzt.
--
-- Ausserdem bekommen die vier Mitgliedtypen ohne Eintraege welche. Bisher
-- griff bei ihnen eine im Code fest verdrahtete Rueckfallliste. Die faellt
-- weg, deshalb muessen ihre Werte in die Tabelle — sonst waere fuer sie
-- ploetzlich gar nichts mehr Pflicht.
--
-- REIHENFOLGE: dieses Skript ZUERST, dann den Code liefern.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── A1: adresse -> strasse, plz, ort (Mitgliedtyp-Matrix) ─────────────────

insert into public.mitgliedtyp_pflichtfelder (verein_id, mitgliedtyp, feld, pflicht)
select p.verein_id, p.mitgliedtyp, f.feld, p.pflicht
  from public.mitgliedtyp_pflichtfelder p
 cross join (values ('strasse'),('plz'),('ort')) as f(feld)
 where p.feld = 'adresse'
on conflict (verein_id, mitgliedtyp, feld) do nothing;

delete from public.mitgliedtyp_pflichtfelder where feld in ('adresse','vorname_nachname');

-- ─── A2: dasselbe fuer die Rollen-Matrix ───────────────────────────────────

insert into public.rolle_pflichtfelder (verein_id, rolle, feld, pflicht)
select p.verein_id, p.rolle, f.feld, p.pflicht
  from public.rolle_pflichtfelder p
 cross join (values ('strasse'),('plz'),('ort')) as f(feld)
 where p.feld = 'adresse'
on conflict (verein_id, rolle, feld) do nothing;

delete from public.rolle_pflichtfelder where feld in ('adresse','vorname_nachname');

-- ─── B: Mitgliedtypen ohne Eintraege befuellen ─────────────────────────────
-- Uebernimmt exakt die bisherige Rueckfallliste aus NeuesMitgliedModal:
--   geburtsdatum, geschlecht, strasse, plz, ort, telefon      (ohne email)
-- Das Verhalten bleibt damit gleich; anpassen kannst du es danach in der
-- Portalverwaltung. Betrifft nach heutigem Stand: Juniorenmitglied,
-- Funktionaer/in, Pausenmitglied, Supporter.

insert into public.mitgliedtyp_pflichtfelder (verein_id, mitgliedtyp, feld, pflicht)
select mt.verein_id, mt.name, f.feld, true
  from public.mitgliedtypen mt
 cross join (values ('geburtsdatum'),('geschlecht'),('strasse'),('plz'),('ort'),('telefon')) as f(feld)
 where not exists (
         select 1 from public.mitgliedtyp_pflichtfelder p
          where p.verein_id = mt.verein_id and p.mitgliedtyp = mt.name and p.pflicht)
on conflict (verein_id, mitgliedtyp, feld) do nothing;

commit;


-- ─── Verifikation ──────────────────────────────────────────────────────────
-- Erwartet: jede Zeile hat Pflichtfelder, keine Zeile enthaelt noch
-- 'adresse' oder 'vorname_nachname'.

select mt.name as mitgliedtyp, mt.hauptkontakt_pflicht,
       array_agg(p.feld order by p.feld) filter (where p.pflicht) as pflichtfelder
  from public.mitgliedtypen mt
  left join public.mitgliedtyp_pflichtfelder p
         on p.mitgliedtyp = mt.name and p.verein_id = mt.verein_id
 group by mt.name, mt.hauptkontakt_pflicht, mt.sort_order
 order by mt.sort_order;

select 'grobe Schluessel uebrig (muss 0 sein)' as pruefung,
       (select count(*) from public.mitgliedtyp_pflichtfelder
         where feld in ('adresse','vorname_nachname'))
     + (select count(*) from public.rolle_pflichtfelder
         where feld in ('adresse','vorname_nachname')) as wert;
