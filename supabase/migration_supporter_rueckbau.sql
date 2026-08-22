-- ═══════════════════════════════════════════════════════════════════════════
-- SUPPORTER-RUECKBAU — Teil A
-- 20.08.2026
--
-- Etappe 5 hat den Supporter als MITGLIEDTYP gebaut: wer sein letztes Kind
-- verliert, bekommt eine Zeile in `mitglieder` mit mitgliedtyp = 'Supporter'.
-- Die Begruendung damals war eine technische — ohne Mitgliedschaft waere die
-- Person nirgends auffindbar, weil `fetchAlleElternkontakte` ueber
-- `eltern_kinder!inner` einsteigt.
--
-- Das war der falsche Weg herum: eine Abfrage hat das Datenmodell bestimmt.
--
-- Statuten Artikel 6 zaehlt die Mitgliedschaften auf; der Supporter kommt
-- darin nicht vor. Er zahlt keinen Beitrag, hat kein Stimmrecht an der GV und
-- ist nicht Mitglied des Vereins. Ihm eine Mitgliedschaft zu geben, verpasst
-- ihm etwas, das er nicht hat — und behauptet in jeder Auswertung, die
-- Mitglieder zaehlt, eine Zahl, die nicht stimmt.
--
-- Ein Supporter ist eine PERSON OHNE MITGLIEDSCHAFT, mit Portal-Zugang.
-- Die Liste kommt kuenftig aus `personen`.
--
--
-- WAS GELOESCHT WIRD UND WAS BLEIBT
--
--   geloescht   die Supporter-Mitgliedschaften in `mitglieder`
--   bleibt      die Person in `personen` — vollstaendig, mit allen Feldern
--   bleibt      das Benutzerkonto; sein Zugang haengt seit Etappe 4 an
--               person_id, mitglied_id ist nur noch Bequemlichkeit
--   bleibt      die Portalrolle `supporter` — sie ist eine Berechtigung,
--               keine Mitgliedschaft
--   bleibt      der Mitgliedtyp selbst, auf aktiv = false gesetzt
--
-- Geloescht, nicht archiviert: eine Mitgliedschaft als beendet zu fuehren,
-- behauptet einen Vorgang, den es nie gab. Niemand ist ausgetreten; die Zeile
-- haette nie entstehen duerfen.
--
--
-- ⚠ ACHT TABELLEN KASKADIEREN
--
-- `mitglieder` haengen neun Fremdschluessel an. Acht davon sind ON DELETE
-- CASCADE, darunter `mitglieder_aktivitaeten` und `mitglieder_aenderungen` —
-- also der Verlauf. Er wuerde mit dem DELETE verschwinden, ohne dass etwas
-- fehlschlaegt.
--
-- Deshalb legt Block A vorher eine Sicherheitskopie an, nach dem Muster von
-- `_etappe6_altspalten_mitglieder`. Und deshalb prueft Block B die Annahme.
--
--
-- ⚠ BLOCK B PRUEFT EIGENSCHAFTEN, NICHT DIE ANZAHL
--
-- Eine erwartete Zahl waere hier eine Falle. Solange `macheZumSupporter()`
-- lief, konnte jedes Entkoppeln eines letzten Kindes eine weitere Zeile
-- erzeugen — am 20.08.2026 waren beim Ausfuehren fuenf da, wo beim Schreiben
-- drei standen (Lukas Herzig und Peter Vogt kamen in den Tagen dazwischen
-- dazu). Daran war nichts falsch; eine fest verdrahtete Drei haette
-- abgebrochen und den Eindruck erweckt, es sei etwas kaputt.
--
-- Die Migration NENNT deshalb, was sie findet — Name, Mitgliedtyp, Konten,
-- weitere Mitgliedschaften, Zeile fuer Zeile — und prueft drei Eigenschaften:
--
--   B-1  alle heissen „Supporter"            → Abbruch
--   B-2  nichts haengt daran                 → Abbruch
--   B-3  keine zweite Mitgliedschaft         → Abbruch
--   B-4  Benutzerkonten                      → nur Meldung
--
-- B-4 bricht bewusst NICHT ab: ein Supporter mit Portal-Zugang ist der
-- Normalfall, den dieser Rueckbau erhalten soll. Ein Abbruch dort wuerde
-- genau die Konstellation blockieren, fuer die das Ganze gebaut ist.
--
-- Der neunte Fremdschluessel, `fk_benutzer_mitglied`, ist ON DELETE SET NULL.
-- Block C setzt die Spalte trotzdem von Hand: was beabsichtigt ist, soll im
-- Text stehen und nicht nur in einer Constraint-Definition, die man beim
-- Lesen der Migration nicht sieht.
--
--
-- BENUTZER_FUNKTIONEN.BIS
--
-- Statuten Artikel 8 spricht vom Zeitpunkt des Austritts, nicht von einem
-- Zeitraum — deshalb `date` und nicht `timestamptz`. Wer austritt, behaelt
-- seine Aemter bis zu diesem Tag; sie verschwinden nicht rueckwirkend.
-- Bis heute kannte die Tabelle nur `seit`, ein Amt endete also durch Loeschen
-- der Zeile — und war danach nicht mehr nachweisbar.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz          int;
  v_ids          bigint[];
  v_haenger      int;
  v_fremd        int;
  v_konten       int;
  v_benutzer     int;
  v_typ_id       uuid;
  v_zaehlt       boolean;
  v_spalte       int;
  v_liste        text;
  r              record;
begin

  -- ─── A) Bestandsaufnahme und Sicherheitskopie ────────────────────────────

  /* KANDIDATEN AUS ZWEI QUELLEN, absichtlich: der Name „Supporter" UND das
     Merkmal `mitgliedtypen.zaehlt_als_mitgliedschaft = false`.

     Nur nach dem Namen zu suchen, waere blind fuer einen Verein, der seinen
     Typ anders nennt; nur nach dem Merkmal waere blind fuer einen Typ, an dem
     das Kennzeichen nie gesetzt wurde. Zusammen ergibt sich eine Pruefung, die
     etwas aussagt (Block B-1) — waere hier nur `mitgliedtyp = 'Supporter'`
     gesucht worden, koennte die Kontrolle „alle heissen Supporter" gar nicht
     fehlschlagen. */
  /* distinct: der LEFT JOIN kann eine Mitgliederzeile vervielfachen, wenn ein
     Typname pro Verein doppelt vorkommt. `= any()` stoert das nicht, die
     gemeldete Zahl schon — und eine falsche Zahl in einer Meldung, die
     ausdruecklich zum Gegenlesen da ist, waere das Gegenteil des Zwecks. */
  select array_agg(distinct m.id), count(distinct m.id) into v_ids, v_anz
    from public.mitglieder m
    left join public.mitgliedtypen t
           on t.name = m.mitgliedtyp and t.verein_id = m.verein_id
   where m.mitgliedtyp = 'Supporter'
      or t.zaehlt_als_mitgliedschaft = false;

  if v_anz = 0 then
    raise notice 'Keine Supporter-Mitgliedschaften vorhanden — Bloecke A bis D entfallen.';
    v_ids := array[]::bigint[];
  else
    /* Die Zahl wird GENANNT, nicht vorgegeben. Zwischen dem Schreiben dieser
       Migration und ihrer Ausfuehrung kann jemand entkoppelt worden sein,
       solange macheZumSupporter() noch lief — am 20.08.2026 genau so
       passiert: erwartet waren drei, gefunden fuenf. Eine fest verdrahtete
       Erwartung haette hier abgebrochen, ohne dass etwas falsch war. */
    raise notice '% Mitgliedschaft(en) gefunden, die nach dem Rueckbau keine mehr waeren:', v_anz;
    for r in
      select m.id, m.mitgliedtyp, p.vorname, p.nachname, p.email, m.aktiv, m.created_at,
             (select count(*) from public.benutzer b where b.person_id = m.person_id) as konten,
             (select count(*) from public.mitglieder m2
               where m2.person_id = m.person_id and m2.id <> m.id) as andere
        from public.mitglieder m join public.personen p on p.id = m.person_id
       where m.id = any(v_ids) order by p.nachname, p.vorname
    loop
      raise notice '   #% [%] % % <%>  aktiv=%  angelegt %  Konten=%  andere Mitgliedschaften=%',
        r.id, r.mitgliedtyp, r.vorname, r.nachname, coalesce(r.email, '—'),
        r.aktiv, r.created_at::date, r.konten, r.andere;
    end loop;
  end if;

  /* Die Kopie entsteht auch bei null Zeilen. Eine leere Tabelle sagt
     "nachgesehen und nichts gefunden"; eine fehlende sagt gar nichts. */
  create table if not exists public._supporter_rueckbau_mitglieder as
    select m.*, p.vorname, p.nachname, p.email
      from public.mitglieder m join public.personen p on p.id = m.person_id
     where m.id = any(v_ids);

  create table if not exists public._supporter_rueckbau_aktivitaeten as
    select * from public.mitglieder_aktivitaeten where mitglied_id = any(v_ids);

  create table if not exists public._supporter_rueckbau_aenderungen as
    select * from public.mitglieder_aenderungen where mitglied_id = any(v_ids);

  create table if not exists public._supporter_rueckbau_notizen as
    select * from public.mitglieder_notizen where mitglied_id = any(v_ids);

  execute $q$ comment on table public._supporter_rueckbau_mitglieder is
    'Sicherheitskopie des Supporter-Rueckbaus vom 20.08.2026. Die Personen selbst stehen unveraendert in personen; hier liegt nur, was an der geloeschten Mitgliedschaft hing. Kann geloescht werden, sobald der Rueckbau eine Saison ueberstanden hat.' $q$;

  /* ⚠ RLS AN, POLICY KEINE — das ist kein Versehen, sondern der Zweck.
     Supabase gewaehrt anon und authenticated per ALTER DEFAULT PRIVILEGES
     ALLE Rechte auf jede neue Tabelle in `public`. Eine Sicherheitskopie mit
     Namen und E-Mail-Adressen waere damit fuer jeden eingeloggten Nutzer ueber
     PostgREST lesbar — ohne dass irgendwo etwas fehlschlaegt.
     RLS ohne Policy heisst: niemand ausser postgres/service_role. Genauso
     stehen die drei _etappe6_*-Kopien da. */
  alter table public._supporter_rueckbau_mitglieder   enable row level security;
  alter table public._supporter_rueckbau_aktivitaeten enable row level security;
  alter table public._supporter_rueckbau_aenderungen  enable row level security;
  alter table public._supporter_rueckbau_notizen      enable row level security;


  -- ─── B) Stimmt die Annahme? ──────────────────────────────────────────────
  -- Vier Kontrollen ueber EIGENSCHAFTEN der gefundenen Zeilen, nicht ueber
  -- ihre Anzahl. Eine erwartete Zahl waere hier falsch: zwischen dem Schreiben
  -- dieser Migration und ihrer Ausfuehrung kann jemand entkoppelt worden sein,
  -- solange macheZumSupporter() noch lief. Genau das ist am 20.08.2026
  -- passiert (drei erwartet, fuenf gefunden) — und es war nichts falsch daran.
  --
  -- Drei brechen ab, eine meldet nur. Der Unterschied ist bewusst.

  if v_anz > 0 then

    /* B-1  Alle gefundenen Zeilen heissen „Supporter".
       Die Auswahl in A ist breiter (Name ODER Merkmal). Faellt hier etwas
       durch, hat ein Mitgliedtyp `zaehlt_als_mitgliedschaft = false`, ohne
       Supporter zu sein — dann trifft der Rueckbau etwas, das er nicht
       gemeint hat, und die Entscheidung gehoert einem Menschen. */
    select count(*), string_agg(distinct mitgliedtyp, ', ')
      into v_fremd, v_liste
      from public.mitglieder where id = any(v_ids) and mitgliedtyp <> 'Supporter';
    if v_fremd > 0 then
      raise exception 'ABBRUCH: % Zeile(n) mit anderem Mitgliedtyp in der Auswahl (%). Diese Migration baut den SUPPORTER zurueck — welche anderen Typen keine Mitgliedschaft sein sollen, ist eine eigene Entscheidung.', v_fremd, v_liste;
    end if;

    /* B-2  Es haengt nichts daran, was ein Supporter gar nicht haben kann.
       Kader, Kind, Team-Detail, SFV-Zuordnung, Elternkontakt-Altzeile — alle
       fuenf wuerden per ON DELETE CASCADE lautlos mitgehen. */
    select
      (select count(*) from public.kader                  where mitglied_id = any(v_ids))
    + (select count(*) from public.eltern_kinder          where mitglied_id = any(v_ids))
    + (select count(*) from public.mitglieder_team_details where mitglied_id = any(v_ids))
    + (select count(*) from public.sfv_zuordnung          where mitglied_id = any(v_ids))
    + (select count(*) from public.elternkontakte         where mitglied_id = any(v_ids))
      into v_haenger;
    if v_haenger > 0 then
      raise exception 'ABBRUCH: an den Supporter-Mitgliedschaften haengen % Zeilen aus kader/eltern_kinder/mitglieder_team_details/sfv_zuordnung/elternkontakte. Ein Supporter hat davon nichts — die Annahme stimmt nicht. Nachsehen, bevor geloescht wird.', v_haenger;
    end if;

    /* B-3  Keine der Personen hat noch eine ZWEITE Mitgliedschaft.
       Haette sie eine, waere sie nach dem Loeschen weiterhin Mitglied — dann
       ist sie kein Supporter, und die Supporter-Zeile war ein Doppeleintrag mit
       eigener Vorgeschichte. Auch das gehoert angeschaut, nicht geloescht. */
    select count(*) into v_fremd
      from public.mitglieder m
     where m.id = any(v_ids)
       and exists (select 1 from public.mitglieder m2
                    where m2.person_id = m.person_id and m2.id <> m.id);
    if v_fremd > 0 then
      raise exception 'ABBRUCH: % der gefundenen Personen haben noch eine weitere Mitgliedschaft. Sie waeren nach dem Loeschen weiterhin Mitglied — dann ist die Supporter-Zeile ein Doppeleintrag und kein Rueckbaufall.', v_fremd;
    end if;

    /* ⚠ B-4 MELDET NUR — und das ist keine Nachlaessigkeit.
       Ein Supporter MIT Portal-Zugang ist der Normalfall, den dieser Rueckbau
       ausdruecklich erhalten soll: „erreichbar bleiben" ist der ganze Zweck.
       Block C loest deshalb nur `benutzer.mitglied_id`; das Konto bleibt und
       haengt seit Etappe 4 ohnehin an `person_id`.
       Ein Abbruch hier wuerde genau die Konstellation blockieren, fuer die
       das Ganze gebaut ist. */
    select count(*) into v_konten
      from public.benutzer b
     where exists (select 1 from public.mitglieder m
                    where m.id = any(v_ids) and m.person_id = b.person_id);
    if v_konten > 0 then
      raise notice '   Hinweis: % der Personen haben ein Benutzerkonto. Es bleibt bestehen (Block C loest nur die Mitgliedschaft).', v_konten;
    else
      raise notice '   Keine der Personen hat ein Benutzerkonto.';
    end if;

    raise notice 'Annahme bestaetigt. Gesichert: % Aktivitaet(en), % Aenderung(en), % Notiz(en).',
      (select count(*) from public._supporter_rueckbau_aktivitaeten),
      (select count(*) from public._supporter_rueckbau_aenderungen),
      (select count(*) from public._supporter_rueckbau_notizen);
  end if;


  -- ─── C) Benutzerkonten loesen ────────────────────────────────────────────
  -- Das Konto bleibt. Genau darum geht es: erreichbar bleiben.

  if v_anz > 0 then
    update public.benutzer set mitglied_id = null where mitglied_id = any(v_ids);
    get diagnostics v_benutzer = row_count;
    if v_benutzer > 0 then
      raise notice '% Benutzerkonto(en) von der Mitgliedschaft geloest. Der Zugang haengt an person_id und bleibt.', v_benutzer;
    end if;
  end if;


  -- ─── D) Loeschen ─────────────────────────────────────────────────────────

  if v_anz > 0 then
    delete from public.mitglieder where id = any(v_ids);
    get diagnostics v_haenger = row_count;
    if v_haenger <> v_anz then
      raise exception 'ABBRUCH: % Zeilen gefunden, aber % geloescht.', v_anz, v_haenger;
    end if;
    raise notice '% Supporter-Mitgliedschaft(en) geloescht.', v_haenger;
  end if;


  -- ─── E) Der Mitgliedtyp ──────────────────────────────────────────────────
  -- Nicht loeschen: mitgliedtyp_feldkonfig haengt per ON DELETE CASCADE daran,
  -- und die Feldkonfiguration ist Geschichte, die erklaert, was hier stand.

  select id, zaehlt_als_mitgliedschaft into v_typ_id, v_zaehlt
    from public.mitgliedtypen where name = 'Supporter' limit 1;

  if v_typ_id is null then
    raise notice 'Kein Mitgliedtyp "Supporter" vorhanden — Block E entfaellt.';
  else
    update public.mitgliedtypen set aktiv = false where id = v_typ_id;
    raise notice 'Mitgliedtyp "Supporter" auf aktiv = false gesetzt (zaehlt_als_mitgliedschaft war %).', v_zaehlt;
  end if;


  -- ─── F) benutzer_funktionen.bis ──────────────────────────────────────────

  alter table public.benutzer_funktionen
    add column if not exists bis date;

  execute $q$ comment on column public.benutzer_funktionen.bis is
    'Tag, an dem das Amt endet. NULL heisst laufend. Statuten Artikel 8 spricht vom Zeitpunkt des Austritts, nicht von einem Zeitraum — deshalb date. Ein Amt wird beendet, indem hier ein Datum steht, nicht durch Loeschen der Zeile: sonst waere es danach nicht mehr nachweisbar.' $q$;


  -- ─── G) Pruefung ─────────────────────────────────────────────────────────

  /* Dieselbe Bedingung wie die Auswahl in Block A — sonst prueft das Ende
     etwas anderes als der Anfang gemacht hat. */
  select count(distinct m.id) into v_anz
    from public.mitglieder m
    left join public.mitgliedtypen t
           on t.name = m.mitgliedtyp and t.verein_id = m.verein_id
   where m.mitgliedtyp = 'Supporter' or t.zaehlt_als_mitgliedschaft = false;
  if v_anz <> 0
  then raise exception 'UNVOLLSTAENDIG: es stehen noch % Zeilen in mitglieder, die keine Mitgliedschaft sein sollten', v_anz; end if;

  select count(*) into v_spalte from information_schema.columns
   where table_schema = 'public' and table_name = 'benutzer_funktionen' and column_name = 'bis';
  if v_spalte <> 1
  then raise exception 'UNVOLLSTAENDIG: benutzer_funktionen.bis fehlt'; end if;

  /* Die Sicherheitskopie muss stehen — ueber pg_class, NICHT ueber ::regclass:
     regclass wird beim Planen aufgeloest, und die Tabelle entsteht erst in
     diesem Block (siehe ARCHITECTURE.md → Migrationen). */
  select count(*) into v_spalte
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = '_supporter_rueckbau_mitglieder';
  if v_spalte <> 1
  then raise exception 'UNVOLLSTAENDIG: Sicherheitskopie _supporter_rueckbau_mitglieder fehlt'; end if;

  /* Alle vier Kopien mit RLS. Fehlt sie an einer, liegen Namen und
     E-Mail-Adressen fuer jeden eingeloggten Nutzer offen. */
  select count(*) into v_spalte
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname like '\_supporter\_rueckbau\_%'
     and c.relrowsecurity;
  if v_spalte <> 4
  then raise exception 'UNVOLLSTAENDIG: nur % von 4 Sicherheitskopien haben RLS', v_spalte; end if;

  /* Kein Benutzerkonto darf auf eine Mitgliedschaft zeigen, die es nicht
     mehr gibt. Der Fremdschluessel garantiert es, die Pruefung sagt es. */
  select count(*) into v_spalte from public.benutzer b
   where b.mitglied_id is not null
     and not exists (select 1 from public.mitglieder m where m.id = b.mitglied_id);
  if v_spalte <> 0
  then raise exception 'UNVOLLSTAENDIG: % Benutzerkonten zeigen ins Leere', v_spalte; end if;

  if coalesce(v_konten, 0) > 0 then
    raise notice 'Fertig. Die Supporter sind Personen ohne Mitgliedschaft; ihre % Konten bestehen weiter.', v_konten;
  else
    raise notice 'Fertig. Die Supporter sind Personen ohne Mitgliedschaft. Keine von ihnen hat ein Portal-Konto — sie sind heute nur ueber E-Mail und Telefon erreichbar.';
  end if;

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'keine Nicht-Mitgliedschaft mehr in mitglieder', 0,
         (select count(distinct m.id) from public.mitglieder m
            left join public.mitgliedtypen t
                   on t.name = m.mitgliedtyp and t.verein_id = m.verein_id
           where m.mitgliedtyp = 'Supporter' or t.zaehlt_als_mitgliedschaft = false)::int
  union all
  select 2, 'Mitgliedtyp Supporter inaktiv', 1,
         (select count(*) from public.mitgliedtypen where name = 'Supporter' and aktiv = false)::int
  union all
  select 3, 'Spalte benutzer_funktionen.bis', 1,
         (select count(*) from information_schema.columns
           where table_schema='public' and table_name='benutzer_funktionen' and column_name='bis')::int
  union all
  select 4, 'kein Benutzerkonto zeigt ins Leere', 0,
         (select count(*) from public.benutzer b where b.mitglied_id is not null
            and not exists (select 1 from public.mitglieder m where m.id = b.mitglied_id))::int
  union all
  select 5, 'alle vier Sicherheitskopien mit RLS', 4,
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname='public' and c.relname like '\_supporter\_rueckbau\_%'
             and c.relrowsecurity)::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;

/* Wer war betroffen — und hat die Person noch ein Konto? */
select k.vorname, k.nachname, k.email,
       (select count(*) from public.benutzer b where b.person_id = k.person_id) as konten,
       (select count(*) from public.mitglieder m where m.person_id = k.person_id and m.aktiv) as andere_mitgliedschaften
  from public._supporter_rueckbau_mitglieder k
 order by k.nachname, k.vorname;


-- ─── Rueckbau ──────────────────────────────────────────────────────────────
-- Moeglich, solange die Sicherheitskopie steht. Die alten Ids kommen zurueck,
-- weil sie mitkopiert wurden — die Sequenz muss danach nicht angefasst werden,
-- da sie ohnehin ueber dem hoechsten Wert steht.
--
-- begin;
--   insert into public.mitglieder
--     (id, mitgliedtyp, rolle, aktiv, spielerpass, js_nr, fairgate_id,
--      created_at, updated_at, deaktiviert_am, deaktiviert_von, verein_id,
--      eintrittsdatum, person_id)
--   select id, mitgliedtyp, rolle, aktiv, spielerpass, js_nr, fairgate_id,
--          created_at, updated_at, deaktiviert_am, deaktiviert_von, verein_id,
--          eintrittsdatum, person_id
--     from public._supporter_rueckbau_mitglieder;
--   insert into public.mitglieder_aktivitaeten select * from public._supporter_rueckbau_aktivitaeten;
--   insert into public.mitglieder_aenderungen  select * from public._supporter_rueckbau_aenderungen;
--   insert into public.mitglieder_notizen      select * from public._supporter_rueckbau_notizen;
--   update public.mitgliedtypen set aktiv = true where name = 'Supporter';
--   -- benutzer.mitglied_id bleibt null; sie war ohnehin nur Bequemlichkeit.
--   -- alter table public.benutzer_funktionen drop column if exists bis;
-- commit;


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Dump und Typen nachziehen.
--
--   ⚠ ZAEHLPROBE: die Zahlen gehen HINAUF, nicht hinunter.
--      CREATE TABLE   +4   die vier Sicherheitskopien
--      CREATE POLICY  +0   RLS ist an, Policies gibt es keine — genau so
--                          soll es sein (siehe Block A)
--      CREATE INDEX   +0
--      ADD CONSTRAINT +0
--   Zwei Dinge zaehlt keine der vier Kategorien: die neue Spalte
--   benutzer_funktionen.bis und die vier ENABLE ROW LEVEL SECURITY. Wer die
--   Probe erwartungsgemaess auf 0 stellt, sucht danach umsonst nach einem
--   abgebrochenen Dump — und wer die RLS-Zeilen nicht eigens nachzaehlt,
--   merkt ihr Fehlen nie, weil ohne sie nichts fehlschlaegt.
--
--   Erst dann Schritt 2 des Auftrags: mapSupporter, fetchSupporter und die
--   Trennung von id und mitglied_id in MemberRow. Bis dahin ist der
--   Supporter-Tab leer — er liest heute aus mitglieder.
-- ═══════════════════════════════════════════════════════════════════════════
