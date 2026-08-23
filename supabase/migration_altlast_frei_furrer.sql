-- ClubCampus — supabase/migration_altlast_frei_furrer.sql
-- 23.08.2026
--
-- Die zwei letzten Austritte aus dem Juli ohne Personenart.
--
-- ⚠ EINE ENTSCHEIDUNG VON HEUTE VORMITTAG WIRD ZURUECKGENOMMEN, und der Grund
--   gehoert dazu. Damals blieben Andrea Frei und Andrea Furrer bewusst OHNE
--   Art — die Entscheidung galt fuer „Ehemaliges Elternteil", eine Art, die
--   es seit demselben Tag nicht mehr gibt. Nur Hauser Andrea bekam die
--   Austritts-Art.
--
--   Mit dem Umbau „ein Mensch, ein Ort" kippt die Rechnung: der Archiv-Tab
--   wird eine gefilterte Ansicht auf die Supporter-Liste, und wer keine Art
--   traegt, steht danach in KEINER Liste. Nirgends zu stehen ist schlechter
--   als bei den Supportern zu stehen. (Entscheidung Didi, 23.08.2026.)
--
-- ⚠ UND DER GRUND IST DERSELBE WIE BEI HAUSER: die beiden sind seit Juli in
--   genau dem Zustand, den der Austritts-Ablauf seit Etappe 2 herstellt —
--   Mitgliedschaft beendet, Kontakt bleibt. Die Art traegt nach, was der
--   Ablauf getan haette, waere er damals schon dagewesen. Es wird nichts
--   erfunden.
--
-- ⚠ WAS DIE MIGRATION NICHT TUT: sie leitet die Art nicht aus der inaktiven
--   Mitgliedschaft ab. Sie setzt sie fuer ZWEI namentlich gesuchte Personen.
--   Eine Ableitung waere genau der Zustand, den der Umbau abschafft.

begin;

do $mig$
declare
  v_verein  uuid;
  v_art     uuid;
  v_artname text;
  v_vorher  int;
  v_nachher int;
  v_erwartet int := 2;
begin
  select id into v_verein from public.vereine where slug = 'fcherrliberg';
  if v_verein is null then raise exception 'ABBRUCH: Verein nicht gefunden'; end if;

  /* Die eingestellte Austritts-Art — dieselbe Quelle wie der Ablauf, nicht
     ein Name im Skript. */
  select v.austritt_art_id, a.name into v_art, v_artname
    from public.vereine v
    left join public.personenarten a on a.id = v.austritt_art_id
   where v.id = v_verein;
  if v_art is null then
    raise exception 'ABBRUCH: keine Austritts-Art eingestellt (vereine.austritt_art_id).';
  end if;

  select count(*) into v_vorher
    from public.personenart_pro_person where art_id = v_art;

  /* ⚠ NAMENTLICH und mit Bedingung: nur wer eine INAKTIVE und KEINE aktive
     Mitgliedschaft hat, keine Kinder traegt und die Art noch nicht hat.
     Faende die Abfrage mehr oder weniger als zwei, bricht die Zaehlprobe ab —
     ein stiller Treffer auf eine dritte Person waere schlimmer als gar kein
     Nachtrag. */
  with ziel as (
    select p.id, p.verein_id
      from public.personen p
     where p.verein_id = v_verein
       and (p.vorname || ' ' || p.nachname) in ('Andrea Frei', 'Andrea Furrer')
       and exists (select 1 from public.mitglieder m
                    where m.person_id = p.id and not m.aktiv)
       and not exists (select 1 from public.mitglieder m
                        where m.person_id = p.id and m.aktiv)
       and not exists (select 1 from public.eltern_kinder ek where ek.person_id = p.id)
       and not exists (select 1 from public.personenart_pro_person pp
                        where pp.person_id = p.id and pp.art_id = v_art)
  )
  insert into public.personenart_pro_person (verein_id, person_id, art_id)
  select verein_id, id, v_art from ziel;

  select count(*) into v_nachher
    from public.personenart_pro_person where art_id = v_art;

  if v_nachher - v_vorher <> v_erwartet then
    raise exception 'Erwartet % neue Zuweisungen, gezaehlt % (vorher %, nachher %)',
      v_erwartet, v_nachher - v_vorher, v_vorher, v_nachher;
  end if;

  raise notice 'OK — % Personen tragen jetzt die Art „%" (vorher %, nachher %)',
    v_erwartet, v_artname, v_vorher, v_nachher;
end
$mig$;

commit;

-- ── Nachher zum Nachsehen ────────────────────────────────────────────────
-- select p.vorname||' '||p.nachname as person, a.name as art
--   from public.personenart_pro_person pp
--   join public.personen p on p.id = pp.person_id
--   join public.personenarten a on a.id = pp.art_id
--  where p.nachname in ('Frei','Furrer','Hauser') order by 1;
--
-- Erwartet: drei Zeilen, alle mit der Austritts-Art.
