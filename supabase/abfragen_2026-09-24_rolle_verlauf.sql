/* ════════════════════════════════════════════════════════════════
   Rolle und Name im Spielverlauf — die Zahlen dazu
   Angelegt am 24.09.2026. Abfrage 1–3 LESEN, Abfrage 4 SCHREIBT.

   Anlass: bei einer Karte gegen einen Trainer steht im Telegramm
   „Unser Team". Der Verband liefert `roleCategoryName` und `personName`
   bei jedem Ereignis mit — wir verwerfen beide. Nach der Umstellung
   tragen neue Abrufe die Angabe; die BESTEHENDEN Zeilen nicht.
   ════════════════════════════════════════════════════════════════ */

/* ── 1 · Wie viele Zeilen zeigen heute den Rueckfalltext? ─────────────

   Die Bedingung ist dieselbe wie in `beschreibeWer()`: eigen, keine
   Personennummer, keine Rueckennummer → „Unser Team". Fremd ohne Nummer
   → nur der Klubname.

   ⚠ Gemessen am 11.09.2026 waren es 5 eigene und 29 fremde. Das ist eine
   Messung von damals — wer sie zitiert, macht eine Behauptung ueber heute. */
select count(*) filter (where e.ist_eigener
                          and e.sfv_person_id is null
                          and e.rueckennr is null)              as eigen_ohne_person,
       count(*) filter (where not e.ist_eigener
                          and e.rueckennr is null)              as fremd_ohne_nummer,
       count(*)                                                 as zeilen_gesamt
  from public.spiel_ereignisse e
 where e.herkunft = 'sfv';

/* ── 2 · Auf wie viele SPIELE verteilen sie sich? ──────────────────

   Das ist die Zahl, die den Nachlauf bestimmt — ein Abruf holt ein ganzes
   Spiel, nicht eine Zeile. */
select count(distinct e.spiel_id) as spiele_mit_rueckfalltext
  from public.spiel_ereignisse e
 where e.herkunft = 'sfv'
   and ((e.ist_eigener and e.sfv_person_id is null and e.rueckennr is null)
     or (not e.ist_eigener and e.rueckennr is null));

/* ── 3 · ⚠ Wie lange braucht der rollende Nachlauf von allein? ───────

   `NACHLAUF_PLAETZE = 2` von `HOECHSTENS_SPIELE = 12` je Lauf, und der
   Zeitplan laeuft stuendlich. Zwei Spiele pro Stunde.

   ⚠ DARAUF ZU WARTEN IST KEINE OPTION, und die Zahl sagt warum: bei den
   Spielen aus Abfrage 2 sind es so viele Stunden wie die Haelfte davon.
   Solange steht auf der Website weiter „Unser Team" — und zwar OHNE dass
   etwas fehlschlaegt, also ohne dass es jemand bemerkt.

   Der Weg ist deshalb ein gezieltes Ruecksetzen (Abfrage 4). */
select count(*)                                as spiele_gesamt,
       count(e.spiel_id)                       as mit_ereignissen,
       ceil(count(distinct e.spiel_id) / 2.0)   as stunden_wenn_man_wartet
  from public.spiele s
  left join public.spiel_ereignisse e on e.spiel_id = s.id and e.herkunft = 'sfv'
 where s.matchdaten_geholt_am is not null;

/* ── 4 · ⚠ SCHREIBT: die betroffenen Spiele zum Neuabruf vormerken ────

   ⚠ ERST NACH DEM DEPLOY DER EDGE FUNCTION AUSFUEHREN. Vorher holt der
   Lauf die Spiele erneut, liest die neuen Felder aber noch nicht — dann
   ist die Arbeit verbraucht und die Angabe fehlt weiter.

   ⚠ Und `returning` statt einer stillen Wirkung: ein `update`, das
   niemanden trifft, ist fuer PostgREST kein Fehler. Kommen null Zeilen
   zurueck, hat es NICHT gegriffen — und „Success. No rows returned"
   heisst dann „ich habe dir nichts gesagt".

   ⚠ `matchdaten_geholt_am = null` setzt das Spiel in den Topf `neu`, und
   der hat VORRANG ohne Deckel. Bei vielen Spielen verdraengt er damit das
   Fenster und den Nachlauf — fuer ein paar Dutzend ist das gewollt und
   nach einem Lauf vorbei. Bei deutlich mehr als zwoelf lohnt es, in
   Haeppchen zurueckzusetzen. */
update public.spiele s
   set matchdaten_geholt_am = null
 where s.matchdaten_geholt_am is not null
   and exists (
     select 1 from public.spiel_ereignisse e
      where e.spiel_id = s.id and e.herkunft = 'sfv'
        and ((e.ist_eigener and e.sfv_person_id is null and e.rueckennr is null)
          or (not e.ist_eigener and e.rueckennr is null))
   )
returning s.id, s.sfv_match_id, s.date, s.team;
