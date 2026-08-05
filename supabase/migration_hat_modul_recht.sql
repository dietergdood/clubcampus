-- ═══════════════════════════════════════════════════════════════════════════
-- STUFE 1 — hat_modul_recht(): die Datenbank lernt die Gruppen kennen
-- 05.08.2026
--
-- ZIEL
-- Rechte hängen künftig an EINER Mechanik: Gruppen mit Modulrechten. Genau
-- ein Sonderfall bleibt daneben — der Hauptadministrator (benutzer.ist_admin),
-- wie bei Fairgate und ClubDesk auch.
--
-- Heute kennt die Datenbank nur die feste Rollenleiter. Ob jemand in der
-- Gruppe „Geschäftsstelle" steckt, ist ihr unbekannt: portal_gruppen wird
-- ausschliesslich im Frontend ausgewertet (getEffektiveStufeForFunktionaer).
-- Ein Funktionär mit weiten Gruppenrechten sieht deshalb im Portal alles und
-- bekommt beim Speichern eine Absage.
--
-- DIESE STUFE IST FOLGENLOS. Die Funktion wird angelegt, aber von KEINER
-- Policy benutzt. Es ändert sich nichts am Verhalten — wir können nur zum
-- ersten Mal nachsehen, was die Gruppenrechte pro Benutzer ergeben.
--
-- ─── ABBILDUNGSTREUE ───────────────────────────────────────────────────────
-- Die Funktion bildet nach, was getEffektiveStufeForFunktionaer() TATSÄCHLICH
-- tut — nicht, was dort steht. Der Frontend-Code liest zwei Felder, die es
-- gar nicht gibt:
--     portal_gruppen.default_stufe    existiert nicht  -> immer undefined
--     portal_funktionen.modul_stufen  existiert nicht  -> immer undefined
-- Wirksam sind also nur:
--     portal_funktionen.stufe_override[modul]   (Vorrang)
--     portal_gruppen.modul_stufen[modul]
--     sonst 'lesen'
-- Würde die Funktion die Phantomfelder mitlesen, wichen Datenbank und Portal
-- voneinander ab, sobald jemand die Spalten später ergänzt.
--
-- ─── SICHERHEIT ────────────────────────────────────────────────────────────
-- SECURITY DEFINER, weil auf portal_funktionen und portal_gruppen selbst RLS
-- liegt — ohne das könnte die Funktion die Berechtigung nicht nachschlagen.
-- Deshalb ist sie eng gefasst: sie liest ausschliesslich die Funktionen des
-- ANGEMELDETEN Benutzers (auth.uid()) und prüft zusätzlich den Verein.
-- Sie nimmt keine Benutzer-Id als Parameter — sonst könnte man damit fremde
-- Berechtigungen ausforschen.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

CREATE OR REPLACE FUNCTION public.hat_modul_recht(
  p_modul text,
  p_min_stufe text DEFAULT 'lesen'
) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
  with rang as (
    select case p_min_stufe when 'verwalten' then 3 when 'schreiben' then 2 else 1 end as noetig
  ),
  meine as (
    select coalesce(
             nullif(f.stufe_override ->> p_modul, ''),
             nullif(g.modul_stufen  ->> p_modul, ''),
             'lesen'
           ) as stufe
      from public.benutzer_funktionen bf
      join public.portal_funktionen f
        on f.id = bf.funktion_id and coalesce(f.aktiv, true)
      join public.portal_gruppen g
        on g.id = f.gruppe_id and coalesce(g.aktiv, true)
     where bf.benutzer_id = auth.uid()
       and f.verein_id = public.get_my_verein_id()
       /* module_override der Funktion schlägt die Modulliste der Gruppe —
          leeres Array heisst „keine Einschränkung", nicht „nichts". */
       and p_modul = any(
             case when coalesce(array_length(f.module_override, 1), 0) > 0
                  then f.module_override
                  else coalesce(g.module, '{}')
             end)
  )
  select coalesce(bool_or(
           case m.stufe when 'verwalten' then 3 when 'schreiben' then 2 else 1 end
           >= (select noetig from rang)
         ), false)
    from meine m;
$$;

ALTER FUNCTION public.hat_modul_recht(text, text) OWNER TO postgres;

COMMENT ON FUNCTION public.hat_modul_recht(text, text) IS
  'Hat der angemeldete Benutzer über seine Gruppen mindestens die verlangte '
  'Stufe im Modul? Gegenstueck zu getEffektiveStufeForFunktionaer() im '
  'Frontend. Ab Stufe 2 in den RLS-Policies verwendet.';

commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATION — was ergeben die Gruppen heute?
-- ═══════════════════════════════════════════════════════════════════════════

-- V1: Welche Gruppen gibt es, mit welchen Modulen und Stufen?
select g.id, g.name, g.aktiv,
       g.module,
       g.modul_stufen,
       (select count(*) from public.portal_funktionen f where f.gruppe_id = g.id and f.aktiv) as funktionen
  from public.portal_gruppen g
 order by g.name;

-- V2: Wer hängt an welcher Funktion?
select b.email, b.name, b.role, b.ist_admin,
       f.name  as funktion,
       g.name  as gruppe,
       case when coalesce(array_length(f.module_override,1),0) > 0
            then f.module_override else g.module end as wirksame_module,
       f.stufe_override
  from public.benutzer_funktionen bf
  join public.benutzer b            on b.id = bf.benutzer_id
  join public.portal_funktionen f   on f.id = bf.funktion_id
  left join public.portal_gruppen g on g.id = f.gruppe_id
 order by b.email, f.name;

-- V3: Die Probe aufs Exempel — für die eigene Sitzung.
--     Im SQL-Editor gibt es keinen angemeldeten Benutzer, deshalb ueberall
--     false. Aussagekraeftig wird das erst im Portal.
select public.hat_modul_recht('members')               as members_lesen,
       public.hat_modul_recht('members','schreiben')   as members_schreiben,
       public.hat_modul_recht('members','verwalten')   as members_verwalten;


-- ═══════════════════════════════════════════════════════════════════════════
-- WIE ES WEITERGEHT
--
-- STUFE 2 — Policies ADDITIV erweitern. Beispiel mitglieder:
--     using ( verein_id = get_my_verein_id()
--             and ( is_admin() or hat_modul_recht('members','schreiben') ) )
--   Niemand verliert dabei etwas, es kommt nur hinzu. Ein Fehler in dieser
--   Stufe bedeutet zu grosszuegige Rechte — sichtbar, aber nicht sperrend.
--
-- STUFE 3 — die alten Rollenlisten aus den Policies entfernen, erst wenn
--   Stufe 2 nachweislich traegt. Hier entstehen Sperrungen, wenn eine Gruppe
--   fehlt. Deshalb zuletzt und mit Testplan pro Tabelle.
--
-- STUFE 4 — 'administration' und 'vorstand' aus dem Frontend nehmen
--   (APP_ZUGRIFF_DEFAULT, NAV_BY_ROLE, ADMIN_ROLES, portalUtils).
--
-- MODULSCHLUESSEL PRO TABELLE (Vorschlag fuer Stufe 2, vorher pruefen):
--   mitglieder, personen, elternkontakte, mitglieder_*     -> 'members'
--   teams, team_*, kader, kader_rollen                     -> 'team'
--   termine, aufgebote, anwesenheiten                      -> 'events'
--   trainingsplan_*, trainingsplaetze                      -> 'training'
--   helper_*, team_helfer_*                                -> 'helpers'
--   nachrichten*, kommunikationsgruppen                    -> 'nachrichten'
--   dokumente                                              -> 'docs'
--   busse, material_*                                      -> 'buses' / 'material'
--   Konfigurationstabellen (module*, portal_*, feldsicht-
--   barkeit, rollen, mitgliedtypen, api_verbindungen)      -> NUR is_admin()
--
--   Der letzte Punkt ist wichtig: Systemkonfiguration bleibt beim
--   Hauptadministrator. Sonst koennte sich eine Gruppe ueber die
--   Gruppenverwaltung selbst mehr Rechte geben.
-- ═══════════════════════════════════════════════════════════════════════════
