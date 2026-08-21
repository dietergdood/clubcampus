-- ═══════════════════════════════════════════════════════════════════════════
-- NAMEN-NACHTRAG UND MELDUNG NEUER UNZUGEORDNETER SPIELER
-- 22.08.2026
--
-- ⚠ VOR DEM DEPLOY DER EDGE FUNCTION EINSPIELEN. Die neue Fassung liest
--   `zuordnung_gemeldet_am`; ohne die Spalte antwortet PostgREST mit
--   `42703 column does not exist`, und weil der Rueckfall auf `[]` geht,
--   saehe das aus wie „keine neuen Spieler" statt wie ein Fehler.
--
-- WOZU · TEIL 1 — erstmals_gesehen
--   Die Meldung soll sagen, dass NEUE Spieler dazukommen, nicht dass welche
--   offen sind. Dafuer braucht es den ersten Auftritt eines Spielers, und
--   den gibt es heute nicht: `spiel_aufstellung.zuletzt_synchronisiert` wird
--   bei JEDEM Upsert ueberschrieben und sagt nur, wann die Zeile zuletzt
--   angefasst wurde.
--
--   ⚠ `erstmals_gesehen` steht bewusst NICHT in der Upsert-Nutzlast von
--   `bildeAufstellung()`. Was nicht mitgeschickt wird, laesst
--   `ON CONFLICT DO UPDATE SET` unberuehrt — genau so ueberlebt der Wert
--   jeden weiteren Lauf. Wer die Nutzlast spaeter erweitert, darf diese
--   Spalte nicht aufnehmen, sonst ist der erste Auftritt der letzte.
--
-- WOZU · TEIL 2 — zuordnung_gemeldet_am
--   Die Marke, bis zu der gemeldet wurde. „Neu" heisst: die frueheste
--   `erstmals_gesehen` eines unzugeordneten Spielers liegt NACH dieser
--   Marke.
--
-- ⚠ DIE MARKE WIRD AUF `now()` GESETZT, UND DAS HAT EINEN PREIS.
--   Die heute 177 offenen Spieler bleiben damit DAUERHAFT STUMM — auch in
--   einem Monat, auch wenn sie dann immer noch offen sind. Sie sind der
--   bekannte Rueckstand, keine Neuigkeit, und eine Meldung ueber sie ginge
--   nie wieder weg. Wer sie abarbeiten will, muss es WOLLEN; erinnert wird
--   er nicht. Die Zahl steht in der Zuordnungsmaske, sonst nirgends.
--
-- ⚠ NEBENWIRKUNG DER NEUEN AKTION `aktion: "namen"`, hier notiert, weil sie
--   spaeter wie ein Fehler aussieht: die Aktion beansprucht DIESELBE
--   Laufsperre wie der Sync (`api_verbindungen.sync_laeuft_seit`). Solange
--   sie laeuft, ueberspringt der stuendliche Lauf sich selbst mit „Ein Lauf
--   ist bereits unterwegs" und holt eine Stunde spaeter nach.
--
--   Das ist Absicht und nicht zu beheben: die SFV-API kennt pro Anwendung
--   genau EIN gueltiges Token, und ein `POST /api/token` des Sync wuerde das
--   Token der laufenden Aktion mitten in ihren Abrufen entwerten. Die Gefahr
--   liegt nicht in der Aktion, sondern in der UEBERLAPPUNG. Ein
--   ausgefallener Lauf ist harmlos, ein entwertetes Token nicht.
--
-- ZAEHLPROBE — Ausgangswerte aus supabase/schema.sql:
--
--   CREATE TABLE                     91 -> 91   (+-0)
--   CREATE POLICY                   174 -> 174  (+-0)
--   CREATE (UNIQUE )?INDEX           65 -> 65   (+-0)
--   ADD CONSTRAINT                  310 -> 310  (+-0)
--
-- ⚠ ALLE VIER BLEIBEN GLEICH, und das ist richtig: zwei Spalten ohne
--   Constraint, ohne Index und ohne Fremdschluessel kommen in keinem der
--   vier Zaehler vor. Wer hier eine Bewegung erwartet, sucht sie vergebens —
--   geprueft wird ueber `information_schema.columns` und ueber die Zahlen
--   unten.
--
-- ⚠ Der Dump ist zwei Migrationen im Rueckstand (`wache_zuletzt` vom
--   21.08., `migration_austritt.sql` vom 22.08., falls diese zuerst laeuft).
--   Nach beiden gehoeren Dump UND `npm run gen:types` nachgezogen.
-- ═══════════════════════════════════════════════════════════════════════════

do $mig$
declare
  v_anz     int;
  v_offen   int;
  v_neu     int;
  v_zeilen  int;
begin

  -- ─── A · Wann ein Spieler zum ersten Mal auftauchte ─────────────────────
  alter table public.spiel_aufstellung
    add column if not exists erstmals_gesehen timestamptz not null default now();

  comment on column public.spiel_aufstellung.erstmals_gesehen is
    'Wann diese Zeile ENTSTANDEN ist. Steht bewusst nicht in der Upsert-Nutzlast von bildeAufstellung() — was nicht mitgeschickt wird, laesst ON CONFLICT DO UPDATE unberuehrt. Nicht zu verwechseln mit zuletzt_synchronisiert, das bei jedem Lauf neu gesetzt wird.';

  /* ⚠ Fuer die BESTEHENDEN Zeilen ist das now(), nicht der wahre erste
     Auftritt — den weiss niemand mehr. Deshalb faellt der Rueckstand ueber
     die Marke unten heraus und nicht ueber diesen Wert. */

  -- ─── B · Bis wohin gemeldet wurde ───────────────────────────────────────
  alter table public.api_verbindungen
    add column if not exists zuordnung_gemeldet_am timestamptz;

  comment on column public.api_verbindungen.zuordnung_gemeldet_am is
    'Marke fuer die Meldung neuer unzugeordneter Spieler. Neu = fruehestes spiel_aufstellung.erstmals_gesehen liegt nach dieser Marke. Beim Anlegen auf now() gesetzt: der damalige Rueckstand bleibt dauerhaft stumm. Gelesen von sfv-sync (meldeNeueUnzugeordnete).';

  -- ─── C · Die Marke setzen, damit der Rueckstand stumm bleibt ────────────
  select count(*) into v_offen
    from (select distinct a.sfv_person_id
            from public.spiel_aufstellung a
           where not exists (select 1 from public.sfv_zuordnung z
                              where z.sfv_person_id = a.sfv_person_id
                                and z.verein_id = a.verein_id)) s;

  update public.api_verbindungen
     set zuordnung_gemeldet_am = now()
   where key = 'football_ch' and zuordnung_gemeldet_am is null;

  -- ─── Zaehlprobe ─────────────────────────────────────────────────────────
  select count(*) into v_anz from information_schema.columns
   where table_schema='public' and table_name='spiel_aufstellung'
     and column_name='erstmals_gesehen';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: erstmals_gesehen fehlt.'; end if;

  select count(*) into v_anz from information_schema.columns
   where table_schema='public' and table_name='api_verbindungen'
     and column_name='zuordnung_gemeldet_am';
  if v_anz <> 1 then raise exception 'UNVOLLSTAENDIG: zuordnung_gemeldet_am fehlt.'; end if;

  select count(*) into v_anz from public.api_verbindungen
   where key = 'football_ch' and zuordnung_gemeldet_am is not null;
  if v_anz < 1 then raise exception 'UNVOLLSTAENDIG: keine Marke gesetzt.'; end if;

  select count(*) into v_zeilen from public.spiel_aufstellung;

  /* ⚠ DIE EIGENTLICHE PROBE: nach dem Setzen der Marke darf KEIN offener
     Spieler als „neu" gelten. Waere hier eine Zahl > 0, ginge unmittelbar
     nach dieser Migration eine Meldung ueber den gesamten Rueckstand
     hinaus — genau das, was sie verhindern soll. */
  select count(*) into v_neu
    from (select a.sfv_person_id
            from public.spiel_aufstellung a
            join public.api_verbindungen v
              on v.verein_id = a.verein_id and v.key = 'football_ch'
           where not exists (select 1 from public.sfv_zuordnung z
                              where z.sfv_person_id = a.sfv_person_id
                                and z.verein_id = a.verein_id)
           group by a.sfv_person_id, v.zuordnung_gemeldet_am
          having min(a.erstmals_gesehen) > v.zuordnung_gemeldet_am) s;

  if v_neu <> 0 then
    raise exception 'MARKE WIRKT NICHT: % Spieler gelten als neu (erwartet 0).', v_neu;
  end if;

  raise notice 'Fertig. % Aufstellungszeilen, % offene Spieler, davon % neu (erwartet 0).',
    v_zeilen, v_offen, v_neu;
end $mig$;
