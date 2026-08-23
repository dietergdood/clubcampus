-- ClubCampus — supabase/migration_email_orakel.sql
-- 23.08.2026
--
-- ⚠ `check_email_bekannt` NENNT HEUTE NAMEN — UNANGEMELDET.
--
--   Die Funktion ist `SECURITY DEFINER` und fuer `anon` freigegeben. Gemessen
--   gegen die laufende API, ohne jede Anmeldung, nur mit dem publishable key:
--
--     POST /rest/v1/rpc/check_email_bekannt  {"p_email":"…", "p_verein_id":"…"}
--     → 200 {"bekannt":true,"name":"Andrea Hauser","person_id":"73c0837b-…",
--            "mitglied_id":null,"eltern_id":"73c0837b-…"}
--
--   Sie sagt nicht nur OB eine Adresse zum Verein gehoert, sondern liefert
--   NAMEN und `person_id` dazu. Zusammen mit abgeschaltetem
--   „Confirm email" ergibt das eine Kette: Adresse kennen → das Orakel
--   bestaetigt sie und nennt die Person → damit registrieren → ein Konto mit
--   DEREN Rolle und Daten. 907 Personen haben eine E-Mail und noch kein Konto.
--
-- WAS DIESE MIGRATION TUT: die Antwort auf `{"bekannt": true|false}` kuerzen.
--   (Entscheidung Didi, 23.08.2026 — „die Formular-Vorbelegung ist den Preis
--   nicht wert".)
--
-- ⚠ WAS SIE NICHT TUT, UND DAS GEHOERT GESAGT: das Orakel BLEIBT. Wer eine
--   Adresse eintippt, erfaehrt weiterhin, ob sie zum Verein gehoert. Das ist
--   der Preis dafuer, dass die Anmeldemaske vor der Registrierung sagen kann
--   „diese Adresse kennen wir nicht" statt den Benutzer ins Leere laufen zu
--   lassen. Es faellt nur der Teil weg, der einen NAMEN preisgibt.
--
--   Die zweite Haelfte der Kette — die fehlende Postfach-Bestaetigung — ist
--   eine Einstellung im Supabase-Dashboard und nicht Teil dieser Migration.
--
-- ⚠ UND EINE STELLE IM PORTAL MUSS MIT. `LoginScreen` reichte `rpcResult.name`
--   als `options.data.name` an `signUp` weiter. Ohne den Namen faellt das auf
--   `email.split("@")[0]` zurueck — und `handle_new_user()` liest
--   `raw_user_meta_data->>'name'` ZUERST. Aus „Trainer Zugang" wuerde damit
--   „dieter.good+trainer". Der Aufruf schickt seither GAR KEINEN Namen mehr;
--   dann greift der zweite Zweig des COALESCE und nimmt `vorname || nachname`
--   aus `personen` — also den richtigen. Weniger mitschicken ergibt hier das
--   bessere Ergebnis.

begin;

do $mig$
declare
  v_vorher int;
  v_probe  json;
begin
  select count(*) into v_vorher from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
   where p.proname = 'check_email_bekannt';
  if v_vorher <> 1 then
    raise exception 'Erwartet genau eine Fassung von check_email_bekannt, gefunden %', v_vorher;
  end if;

  create or replace function public.check_email_bekannt(p_email text, p_verein_id uuid)
    returns json
    language sql
    security definer
    set search_path to 'public'
  as $fn$
    /* ⚠ NUR `bekannt`. Kein Name, keine `person_id`, keine `mitglied_id`.
       Die Funktion ist fuer `anon` freigegeben; alles, was sie zurueckgibt,
       gibt sie an jeden zurueck, der den oeffentlichen Schluessel hat — und
       der steht im JavaScript-Buendel jeder Seite. */
    select json_build_object(
      'bekannt',
      exists (
        select 1 from public.personen
         where verein_id = p_verein_id
           and lower(btrim(email)) = lower(btrim(p_email))
      )
    );
  $fn$;

  -- ── Zählprobe ──────────────────────────────────────────────────────────
  select public.check_email_bekannt('dieter.good@fcherrliberg.ch',
                                    '00000000-0000-0000-0000-000000000001')
    into v_probe;

  if (v_probe ->> 'bekannt') <> 'true' then
    raise exception 'Eine bekannte Adresse wird nicht mehr erkannt: %', v_probe;
  end if;
  /* ⚠ `?` ist ein jsonb-Operator, nicht json — der Probelauf am 23.08.2026 ist
     genau daran gescheitert (42883). Geprueft wird deshalb ueber die
     Schluesselliste, und die ist ohnehin die schaerfere Aussage: nicht „diese
     vier fehlen", sondern „es gibt genau einen". Ein Feld, das morgen jemand
     hinzufuegt, faellt damit auch auf. */
  if (select count(*) from json_object_keys(v_probe)) <> 1
     or (select min(k) from json_object_keys(v_probe) k) <> 'bekannt' then
    raise exception 'Die Antwort traegt mehr als bekannt: %', v_probe;
  end if;

  raise notice 'OK — Antwort ist jetzt %', v_probe;
end
$mig$;

commit;

-- ── Nachher zum Nachsehen ────────────────────────────────────────────────
-- select public.check_email_bekannt('gibtsnicht@example.ch',
--        '00000000-0000-0000-0000-000000000001');   -- {"bekannt": false}
--
-- Und von aussen, ohne Anmeldung — die Antwort darf keinen Namen mehr tragen:
--
--   curl -s -X POST "$URL/rest/v1/rpc/check_email_bekannt" \
--     -H "apikey: $PUBLISHABLE" -H "Content-Type: application/json" \
--     -d '{"p_email":"…","p_verein_id":"…"}'
