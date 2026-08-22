-- ═══════════════════════════════════════════════════════════════════════════
-- FELDKONFIGURATION FUER PERSONEN OHNE MITGLIEDSCHAFT
-- 21.08.2026
--
-- Die Mitgliedtyp-Feldkonfiguration (19./20.08.2026) beantwortet pro Feld
-- drei Werte — Pflicht · Freiwillig · Gibt es nicht — und haengt am
-- Mitgliedtyp. Wer keinen hat, faellt heraus, und zwar in beide Richtungen
-- falsch:
--
--   Supporter    getFeldkonfig(null, …) liefert ALLES auf freiwillig, also
--                sichtbar. Ein Supporter bekaeme jede Karte und jeden Tab.
--   Elternteil   getProfilCheck hat einen fest verdrahteten Satz (Vorname,
--                Nachname, Telefon) — der zweite Konfigurationsort, dessen
--                Abbau seit dem 19.08. laeuft.
--
-- `gilt_fuer` macht daraus eine ausdrueckliche Achse: in der Oberflaeche eine
-- Spalte neben den Mitgliedtypen, in den Daten ein eigener Fall.
--
-- NICHT als Zeile in `mitgliedtypen`. Diese Tabelle beantwortet „welche
-- Mitgliedschaften bietet der Verein an"; eine Zeile darin erscheint in jedem
-- Dropdown und in jeder Zaehlung — und stellt die Falle wieder auf, die der
-- Supporter-Rueckbau am 20.08. abgebaut hat.
--
--
-- POSTGRES 17.6 — `NULLS NOT DISTINCT` IST VERFUEGBAR (ab 15)
--
-- ⚠ Das ist NICHT dasselbe wie ein partieller Unique-Index. Ein partieller
-- Index vertraegt sich mit `ON CONFLICT` nicht — Postgres kann ihn nicht
-- ableiten und meldet 42P10 (siehe ARCHITECTURE.md → „Keine partiellen
-- Unique-Indizes auf Spalten, gegen die geupsertet wird", erlebt am
-- 20.08. bei spiel_ereignisse). `NULLS NOT DISTINCT` ist ein normaler,
-- vollstaendiger Unique-Schluessel und wird von `ON CONFLICT` einwandfrei
-- abgeleitet. Wer die richtige Regel auf den falschen Fall anwendet, baut
-- hier unnoetig um.
--
--
-- ⚠ DER ZUSAMMENGESETZTE FREMDSCHLUESSEL PRUEFT DIE NEUEN ZEILEN NICHT
--
-- `mitgliedtyp_feldkonfig_typ_fkey` ist `(mitgliedtyp_id, verein_id) →
-- mitgliedtypen(id, verein_id)` und damit `MATCH SIMPLE` — die Vorgabe, wenn
-- nichts anderes dasteht. Postgres laesst eine Zeile durch, sobald EINE der
-- beiden Spalten NULL ist. Die `ohne_mitgliedschaft`-Zeilen passieren ihn
-- also ungeprueft.
--
-- Das ist hier gewollt, aber Nebenwirkung und nicht Absicht. Wer ihn spaeter
-- mit `MATCH FULL` nachbaut, macht jedes Speichern in der neuen Spalte
-- unmoeglich — und sucht den Grund an der falschen Stelle.
--
--
-- ⚠ FUENF PERSONALIEN-FELDER STEHEN AUSDRUECKLICH NICHT AUF `aus`
--
-- `geburtsdatum`, `geschlecht`, `nationalitaet`, `nationalitaet2` und
-- `heimatort` bleiben freiwillig, obwohl ein Supporter sie nicht braucht.
--
-- „Aus" heisst unsichtbar, nicht geloescht. Ein Aktivmitglied mit
-- Geburtsdatum, Nationalitaet und Heimatort tritt aus und wird Supporter —
-- die Angaben stehen weiter in `personen`, waeren aber fuer niemanden mehr
-- sichtbar, auch nicht fuer die Verwaltung. Bei jedem Austritt entstuende so
-- ein Bestand an Personendaten, den niemand mehr sieht und deshalb niemand
-- aufraeumt. Auf `freiwillig` bleiben sie sichtbar und loeschbar.
--
-- `ahv_nr` bekommt `aus` als STARTWERT, nicht als Regel: ein Klick in der
-- Portalverwaltung dreht es um, es gibt keinen Sonderfall im Code. Die
-- Zweckbindung der AHVN13 steht als Hinweis am Registry-Eintrag — sie
-- informiert, sie wirkt nicht.
--
--
-- WAS GESEEDET WIRD — UND WAS NICHT
--
-- Gespeichert wird nur die Abweichung; eine fehlende Zeile heisst freiwillig.
-- Von 27 Registry-Eintraegen:
--
--   2   `modi: FEST` (vorname, nachname)     — kein Bedienelement moeglich
--   10  `nur_mitgliedschaft`                 — erscheinen in der Spalte nicht
--   15  konfigurierbar, davon 3 mit Zeile
--
-- Die zehn brauchen keine Zeile, weil das Registry-Merkmal in der AUSWERTUNG
-- wirkt: `getFeldkonfig` setzt sie fuer `ohne_mitgliedschaft` auf `aus`.
-- Wirkte es nur in der Oberflaeche, muesste man sie doch seeden — und ein
-- Direktzugriff haette sie wieder sichtbar.
--
-- ⚠ FUER DIE MITGLIEDTYPEN WIRD NICHTS GESEEDET. Die Regel „E-Mail Pflicht
-- ausser bei Junioren" steht dort bereits: alle sechs aktiven Nicht-Junioren
-- haben `email = pflicht`, Juniorenmitglied hat keine Zeile. Sechs Upserts
-- ohne Wirkung waeren ein Schreibvorgang, der nach Erfolg aussieht.
--
-- Junioren werden ueber `mitgliedtypen.hauptkontakt_pflicht` erkannt, nicht
-- ueber den Namen: „dieser Typ braucht einen Hauptkontakt" IST die Aussage
-- „diese Person ist ueber einen Erwachsenen erreichbar". Genau die Bedingung,
-- unter der eine eigene Adresse entfallen darf. Heute trifft es genau einen
-- Typ (Juniorenmitglied, 8f64a237-0ce6-46e9-b602-d8701107ec0f).
--
--
-- BLOCK E RAEUMT 13 TOTE ZEILEN
--
-- Der Mitgliedtyp „Supporter" traegt 13 Konfigurationszeilen aus dem Seed vom
-- 19.08. Seit dem Rueckbau hat niemand mehr diesen Typ; die Zeilen wirken
-- nirgends. Sie sehen aus wie die neue Spalte und sind es nicht — genau die
-- Sorte Rest, die den Naechsten in die Irre fuehrt. Eine Konfigurations-
-- tabelle ist kein Archiv.
--
-- Erkannt werden sie strukturell (`zaehlt_als_mitgliedschaft = false`), nicht
-- ueber den Namen, und nur wenn der Typ auch INAKTIV ist — ein aktiver Typ
-- ohne Mitgliedschaftscharakter waere in Gebrauch und nicht wegzuraeumen.
-- ═══════════════════════════════════════════════════════════════════════════

show server_version;   -- erwartet 15 oder hoeher; gemessen 17.6 am 21.08.2026


do $mig$
declare
  v_anz      int;
  v_vorher   int;
  v_geraeumt int;
  v_vereine  int;
  r          record;
begin

  -- ─── A) Vorpruefungen ────────────────────────────────────────────────────

  if current_setting('server_version_num')::int < 150000 then
    raise exception 'ABBRUCH: NULLS NOT DISTINCT braucht Postgres 15, hier laeuft %.', current_setting('server_version');
  end if;

  /* Eine Policy blockiert `alter column … drop not null` zwar nicht, aber sie
     blockiert jedes spaetere DROP COLUMN mit 2BP01 — und wer hier eine
     anlegt, die `mitgliedtyp_id` nennt, soll es wissen (ARCHITECTURE.md →
     „Eine Policy blockiert DROP COLUMN, ein Index nicht"). Heute nennen die
     zwei Policies nur verein_id und is_admin(). */
  select count(*) into v_anz from pg_policies
   where schemaname='public' and tablename='mitgliedtyp_feldkonfig'
     and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ 'mitgliedtyp_id';
  if v_anz > 0 then
    raise notice 'Hinweis: % Policy/Policies auf mitgliedtyp_feldkonfig nennen mitgliedtyp_id — beim naechsten Spaltenumbau beachten.', v_anz;
  end if;

  select count(*) into v_vorher from public.mitgliedtyp_feldkonfig;
  raise notice 'Vorher: % Konfigurationszeilen.', v_vorher;


  -- ─── B) Die Achse ────────────────────────────────────────────────────────

  alter table public.mitgliedtyp_feldkonfig
    add column if not exists gilt_fuer text not null default 'mitgliedtyp';

  /* `drop … if exists` davor, weil ADD CONSTRAINT kein IF NOT EXISTS kennt:
     ohne das scheitert jeder zweite Lauf, und eine Migration, die man nicht
     wiederholen kann, zwingt beim kleinsten Fehler zum Rueckbau von Hand. */
  alter table public.mitgliedtyp_feldkonfig
    drop constraint if exists mitgliedtyp_feldkonfig_gilt_fuer_check;
  alter table public.mitgliedtyp_feldkonfig
    add constraint mitgliedtyp_feldkonfig_gilt_fuer_check
    check (gilt_fuer in ('mitgliedtyp','ohne_mitgliedschaft'));

  alter table public.mitgliedtyp_feldkonfig
    alter column mitgliedtyp_id drop not null;

  /* Die beiden Faelle schliessen einander aus. Ohne diesen CHECK koennte eine
     Zeile `ohne_mitgliedschaft` MIT mitgliedtyp_id entstehen — sie wuerde von
     beiden Filtern getroffen und zaehlte doppelt. */
  alter table public.mitgliedtyp_feldkonfig
    drop constraint if exists mitgliedtyp_feldkonfig_achse_check;
  alter table public.mitgliedtyp_feldkonfig
    add constraint mitgliedtyp_feldkonfig_achse_check check (
      (gilt_fuer = 'mitgliedtyp'         and mitgliedtyp_id is not null) or
      (gilt_fuer = 'ohne_mitgliedschaft' and mitgliedtyp_id is null));

  execute $q$ comment on column public.mitgliedtyp_feldkonfig.gilt_fuer is
    'Fuer wen diese Zeile gilt: mitgliedtyp (dann mit mitgliedtyp_id) oder ohne_mitgliedschaft (dann ohne). Ein einziger Wert fuer Elternteil UND Supporter — die Alternative waere ein Wert elternteil, abgeleitet aus „hat Kinder", also eine BERECHNETE Achse, die kippt sobald ein Kind austritt. Derselbe Fehler, den rolle_pflichtfelder gekostet hat.' $q$;


  -- ─── C) Der Unique-Schluessel traegt mit NULL nicht mehr ─────────────────
  -- Postgres zaehlt NULLs als verschieden: `(v, NULL, 'telefon')` kollidiert
  -- mit sich selbst nicht, es entstuenden beliebig viele Zeilen fuer denselben
  -- Schluessel. Der Name bleibt derselbe, damit die `onConflict`-Angaben im
  -- Code unveraendert gelten — sie nennen ohnehin Spalten, nicht den Namen.

  alter table public.mitgliedtyp_feldkonfig
    drop constraint if exists mitgliedtyp_feldkonfig_verein_key;

  alter table public.mitgliedtyp_feldkonfig
    add constraint mitgliedtyp_feldkonfig_verein_key
    unique nulls not distinct (verein_id, mitgliedtyp_id, schluessel);


  -- ─── D) Seed fuer ohne_mitgliedschaft ────────────────────────────────────
  -- Drei Zeilen pro Verein. Alles andere bleibt freiwillig ohne Zeile.
  --
  -- ⚠ Pro VEREIN, nicht global: die Konfiguration ist Vereinsdatum. Ein
  -- Verein, der spaeter dazukommt, bekommt sie nicht automatisch — dafuer
  -- gibt es keinen Mechanismus, und ohne Zeilen gilt „alles freiwillig",
  -- was ein brauchbarer Ausgangspunkt ist.
  --
  -- `execute`, weil `gilt_fuer` erst in Block B entstanden ist: plpgsql
  -- plant eingebettetes SQL beim ersten Ausfuehren, und ein dynamischer
  -- Befehl kann darauf gar nicht erst hereinfallen.

  select count(*) into v_vereine from public.vereine;

  execute $q$
    insert into public.mitgliedtyp_feldkonfig (verein_id, mitgliedtyp_id, schluessel, modus, gilt_fuer)
    select v.id, null, s.schluessel, s.modus, 'ohne_mitgliedschaft'
      from public.vereine v
      cross join (values
        ('telefon','pflicht'),   -- Erreichbarkeit wegen des Kindes
        ('email',  'pflicht'),   -- wie bei allen Nicht-Junioren-Typen
        ('ahv_nr', 'aus')        -- Startwert, ein Klick zum Aendern
      ) as s(schluessel, modus)
    on conflict (verein_id, mitgliedtyp_id, schluessel) do nothing
  $q$;
  get diagnostics v_anz = row_count;
  raise notice 'Seed: % Zeile(n) fuer % Verein(e) angelegt (erwartet 3 je Verein).', v_anz, v_vereine;


  -- ─── E) Tote Zeilen an Nicht-Mitgliedschafts-Typen raeumen ───────────────

  for r in
    select t.name, t.aktiv, count(*) as n
      from public.mitgliedtyp_feldkonfig f
      join public.mitgliedtypen t on t.id = f.mitgliedtyp_id
     where t.zaehlt_als_mitgliedschaft = false
     group by 1,2
  loop
    /* `is distinct from false` und nicht `if r.aktiv`: die Spalte ist
       nullable, und NULL waere hier weder wahr noch falsch — der Zweig fiele
       durch, der Typ galte als inaktiv und wuerde GERAEUMT statt gemeldet.
       Die Oberflaeche behandelt NULL ueberall als aktiv (`aktiv !== false`);
       eine Migration darf davon nicht abweichen. */
    if r.aktiv is distinct from false then
      raise exception 'ABBRUCH: Mitgliedtyp "%" zaehlt nicht als Mitgliedschaft und ist nicht ausdruecklich inaktiv (aktiv = %) — traegt aber % Konfigurationszeilen. Geraeumt wird nur, was nachweislich stillgelegt ist; erst klaeren, wozu es diesen Typ gibt.', r.name, coalesce(r.aktiv::text, 'NULL'), r.n;
    end if;
    raise notice 'Raeume % Zeile(n) am inaktiven Typ "%".', r.n, r.name;
  end loop;

  delete from public.mitgliedtyp_feldkonfig f
   using public.mitgliedtypen t
   where t.id = f.mitgliedtyp_id
     and t.zaehlt_als_mitgliedschaft = false;
  get diagnostics v_geraeumt = row_count;
  raise notice '% tote Zeile(n) geraeumt.', v_geraeumt;


  -- ─── F) Pruefung ─────────────────────────────────────────────────────────

  select count(*) into v_anz from information_schema.columns
   where table_schema='public' and table_name='mitgliedtyp_feldkonfig' and column_name='gilt_fuer';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: Spalte gilt_fuer fehlt'; end if;

  select count(*) into v_anz from information_schema.columns
   where table_schema='public' and table_name='mitgliedtyp_feldkonfig'
     and column_name='mitgliedtyp_id' and is_nullable='YES';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: mitgliedtyp_id ist noch NOT NULL'; end if;

  /* Der Unique MUSS `NULLS NOT DISTINCT` tragen — sonst entstuende bei jedem
     Speichern in der neuen Spalte eine weitere Zeile statt einer Aktualisierung,
     und zwar ohne Fehlermeldung. */
  select count(*) into v_anz
    from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'mitgliedtyp_feldkonfig' and c.contype = 'u'
     and c.conname = 'mitgliedtyp_feldkonfig_verein_key'
     and pg_get_constraintdef(c.oid) ~ 'NULLS NOT DISTINCT';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: der Unique-Schluessel traegt kein NULLS NOT DISTINCT'; end if;

  select count(*) into v_anz from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname='mitgliedtyp_feldkonfig' and c.contype='c'
     and c.conname in ('mitgliedtyp_feldkonfig_gilt_fuer_check','mitgliedtyp_feldkonfig_achse_check');
  if v_anz <> 2 then raise exception 'UNVOLLSTAENDIG: nur % von 2 CHECKs angelegt', v_anz; end if;

  select count(*) into v_anz from public.mitgliedtyp_feldkonfig where gilt_fuer='ohne_mitgliedschaft';
  if v_anz <> 3 * v_vereine then
    raise exception 'UNVOLLSTAENDIG: % Zeilen fuer ohne_mitgliedschaft, erwartet % (3 je Verein)', v_anz, 3 * v_vereine;
  end if;

  select count(*) into v_anz
    from public.mitgliedtyp_feldkonfig f join public.mitgliedtypen t on t.id = f.mitgliedtyp_id
   where t.zaehlt_als_mitgliedschaft = false;
  if v_anz <> 0 then raise exception 'UNVOLLSTAENDIG: noch % Zeilen an Nicht-Mitgliedschafts-Typen', v_anz; end if;

  /* Die E-Mail-Regel bei den Mitgliedtypen wird NICHT geschrieben, aber
     geprueft: steht sie nicht, hat jemand sie nachtraeglich gelockert, und
     der Code verliesse sich auf etwas, das es nicht gibt. */
  select count(*) into v_anz
    from public.mitgliedtypen t
   /* Dreiwertige Logik, zweimal: `not t.hauptkontakt_pflicht` ergibt bei NULL
      wieder NULL, die Zeile faellt aus dem Filter und die Warnung bliebe aus.
      Und `t.aktiv` allein schluckt NULL ebenso — waehrend die Oberflaeche
      `aktiv !== false` prueft und NULL als aktiv fuehrt. */
   where t.aktiv is not false
     and t.zaehlt_als_mitgliedschaft
     and t.hauptkontakt_pflicht is not true
     and not exists (select 1 from public.mitgliedtyp_feldkonfig f
                      where f.mitgliedtyp_id = t.id and f.schluessel='email' and f.modus='pflicht');
  if v_anz > 0 then
    raise warning '% aktive(r) Nicht-Junioren-Mitgliedtyp(en) haben email NICHT auf pflicht. Der Auftrag setzt das voraus — in der Portalverwaltung nachsehen.', v_anz;
  end if;

  raise notice 'Fertig. Vorher % Zeilen, geraeumt %, geseedet % — jetzt %.',
    v_vorher, v_geraeumt, 3 * v_vereine, (select count(*) from public.mitgliedtyp_feldkonfig);

end $mig$;


-- ─── Verifikation ──────────────────────────────────────────────────────────

with p(nr, pruefung, erwartet, gefunden) as (
  select 1, 'Spalte gilt_fuer', 1,
         (select count(*) from information_schema.columns
           where table_schema='public' and table_name='mitgliedtyp_feldkonfig' and column_name='gilt_fuer')::int
  union all
  select 2, 'mitgliedtyp_id nullable', 1,
         (select count(*) from information_schema.columns
           where table_schema='public' and table_name='mitgliedtyp_feldkonfig'
             and column_name='mitgliedtyp_id' and is_nullable='YES')::int
  union all
  select 3, 'Unique mit NULLS NOT DISTINCT', 1,
         (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
           where t.relname='mitgliedtyp_feldkonfig' and c.contype='u'
             and pg_get_constraintdef(c.oid) ~ 'NULLS NOT DISTINCT')::int
  union all
  /* ⚠ Namentlich, nicht ueber ein Muster: `mitgliedtyp_feldkonfig_%_check`
     traefe auch den bestehenden `_modus_check` und ergaebe 3 statt 2 — eine
     Pruefung, die immer „PRUEFEN" sagt, liest nach dem dritten Mal niemand. */
  select 4, 'zwei neue CHECKs', 2,
         (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
           where t.relname='mitgliedtyp_feldkonfig' and c.contype='c'
             and c.conname in ('mitgliedtyp_feldkonfig_gilt_fuer_check',
                               'mitgliedtyp_feldkonfig_achse_check'))::int
  union all
  /* Erwartung gerechnet, nicht gesetzt: drinnen prueft der Block gegen
     3 * Anzahl Vereine. Eine feste 3 hier meldete beim zweiten Verein
     „PRUEFEN", obwohl alles stimmt. */
  select 5, 'Seed-Zeilen ohne_mitgliedschaft (3 je Verein)',
         (select 3 * count(*) from public.vereine)::int,
         (select count(*) from public.mitgliedtyp_feldkonfig where gilt_fuer='ohne_mitgliedschaft')::int
  union all
  select 6, 'keine Zeilen mehr an toten Typen', 0,
         (select count(*) from public.mitgliedtyp_feldkonfig f
            join public.mitgliedtypen t on t.id=f.mitgliedtyp_id
           where t.zaehlt_als_mitgliedschaft = false)::int
)
select nr, pruefung, erwartet, gefunden,
       case when gefunden = erwartet then 'ok' else '>>> PRUEFEN' end as status
  from p order by nr;

/* Der Ist-Stand der neuen Spalte, zum Gegenlesen. */
select schluessel, modus from public.mitgliedtyp_feldkonfig
 where gilt_fuer = 'ohne_mitgliedschaft' order by schluessel;
-- erwartet: ahv_nr=aus, email=pflicht, telefon=pflicht


-- ═══════════════════════════════════════════════════════════════════════════
-- DANACH
--   Dump und `npm run gen:types` nachziehen.
--
--   ZAEHLPROBE — alle vier Kategorien ±0:
--     CREATE TABLE   ±0
--     CREATE POLICY  ±0
--     CREATE INDEX   ±0   der Unique haengt an einem CONSTRAINT, nicht an
--                         einem eigenstaendigen CREATE INDEX
--     ADD CONSTRAINT ±0   einer faellt, einer entsteht
--
--   ⚠ Die zwei neuen CHECKs zaehlt KEINE der vier Kategorien: pg_dump
--   schreibt CHECK-Constraints INLINE ins CREATE TABLE (CLAUDE.md →
--   Datenbank-Workflow). Gegenprobe:
--     grep -c "CONSTRAINT .* CHECK" supabase/schema.sql     → +2
--
--   Zeilen in der Tabelle: 75 − 13 + 3 = 65.
--
--   DANN erst der Code. Ohne ihn wirkt die neue Spalte nirgends:
--   `fetchFeldkonfig` laedt `gilt_fuer` heute nicht, und `getFeldkonfig`
--   filtert die neuen Zeilen deshalb lautlos weg — `z.mitgliedtyp` ist bei
--   ihnen "" und trifft keinen Vergleich.
-- ═══════════════════════════════════════════════════════════════════════════
