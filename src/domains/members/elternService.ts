/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/members/elternService.ts
   Elternkontakte, seit Etappe 3 auf `personen` statt `elternkontakte`.

   BEZUGSPUNKT IST `eltern_kinder.person_id`. Die Altspalte `eltern_id`
   zeigt weiterhin auf `elternkontakte`, ist seit Etappe 3 nullable und
   wird NICHT MEHR GESCHRIEBEN; sie entfaellt mit `elternkontakte` in
   Etappe 6. `elternkontakte` wird hier weder gelesen noch geschrieben.

   `beziehung` und `hauptkontakt` haengen an der VERKNUEPFUNG, nicht an
   der Person: dieselbe Person kann Mutter des einen und Stiefmutter des
   anderen Kindes sein. Hauptkontakt ist genau einer pro Kind, erzwungen
   durch den partiellen Index `eltern_kinder_ein_hauptkontakt`.

   FASSADEN-REGEL (ARCHITECTURE.md): gelesen wird per Join, zurueck
   kommen FLACHE Zeilen. Die Feld-Keys, die `mapEltern()` daraus baut,
   stehen als Nutzerdaten in `mitglieder_ansichten` — sie duerfen sich
   nicht aendern, sonst bleiben gespeicherte Ansichten still leer.
   ═══════════════════════════════════════════════════════════════ */
import type { PostgrestError } from "@supabase/supabase-js";
import { flacheZeile, verteileFelder } from "../person/personService.ts";
import type { SbClient, TablesInsert, TablesUpdate } from "../../types.ts";

/* Ein Elternkontakt, wie die Oberflaeche ihn sieht: die Person flach,
   dazu die Angaben aus der Verknuepfung.

   `id` ist die PERSONEN-Id. Sie hat die fruehere elternkontakte-Id
   abgeloest und ist ueberall der Bezugspunkt — linkKind, unlinkKind,
   setHauptkontakt, entkoppleKind erwarten sie. */
export interface ElternkontaktMitLink {
  id: string;
  vorname: string | null;
  nachname: string | null;
  /* `personen` hat keine `name`-Spalte (anders als `elternkontakte`).
     Hier zusammengesetzt, damit die Oberflaechen `e.name` behalten. */
  name: string;
  email: string | null;
  telefon: string | null;
  profil_geprueft_at: string | null;
  /* aus eltern_kinder — pro Verknuepfung, nicht pro Person */
  beziehung: string | null;
  hauptkontakt: boolean | null;
  /* aus benutzer.person_id: der Portal-Zugang sitzt seit Etappe 3 dort
     und nicht mehr in `elternkontakte.benutzer_id` (Block D). */
  benutzer_id: string | null;
}

type Zeile = Record<string, unknown>;

function nameAus(p: { vorname?: string | null; nachname?: string | null }): string {
  return `${p.vorname || ""} ${p.nachname || ""}`.trim();
}

/* Ein Kind, nachdem flacheZeile() die Personenfelder heraufgezogen hat.
   Explizit deklariert, weil flacheZeile() `Record<string, unknown>`
   liefert — ohne diesen Typ waeren `vorname` und `kader` in
   elternListUtils `unknown` und die Auswertung dort ungeprueft. */
export interface KindZeileFlach {
  id: number;
  vorname: string | null;
  nachname: string | null;
  aktiv?: boolean | null;
  mitgliedtyp?: string | null;
  kader?: {
    rollen?: string[] | null;
    aktiv: boolean | null;
    teams: { id?: number; name: string; kurzname: string | null }
         | { id?: number; name: string; kurzname: string | null }[]
         | null;
  }[] | null;
}

/* Beziehungen mehrerer Verknuepfungen zu EINEM Anzeigewert.

   Eine Person steht in der Elternliste ab Etappe 3 nur noch in EINER
   Zeile, kann aber je Kind eine andere Beziehung haben. Mehrere Werte
   werden deshalb kommagetrennt zusammengefasst.

   ⚠ Fuer Filter und Gruppierung entsteht dadurch ein EIGENER Wert:
   „Mutter, Stiefmutter" ist ein dritter Eintrag neben „Mutter" und
   „Stiefmutter" und faellt weder unter den einen noch den anderen
   Filter. Bei FCH ist das der Ausnahmefall (Stand 05.08.2026 hat kein
   Elternteil abweichende Beziehungen), fuer den Fairgate-Import aber
   im Blick zu behalten. */
export function fasseBeziehungZusammen(werte: (string | null | undefined)[]): string | null {
  const eindeutig = [...new Set(werte.filter((w): w is string => Boolean(w && w.trim())))];
  return eindeutig.length ? eindeutig.join(", ") : null;
}

/* ── Lesen ──────────────────────────────────────────────────────── */

/* Elternkontakte EINES Kindes — fuer den ElternTab im Mitglied-Detail.
   `beziehung` und `hauptkontakt` sind hier eindeutig: es geht um genau
   eine Verknuepfung. */
export async function fetchElternkontakte(sb: SbClient, mitgliedId: number): Promise<ElternkontaktMitLink[]> {
  const { data, error } = await sb.from("eltern_kinder")
    .select("hauptkontakt, beziehung, personen(*, benutzer(id))")
    .eq("mitglied_id", mitgliedId);
  if (error) console.error("fetchElternkontakte error:", error);
  if (!data) return [];
  return data.map(zeile => {
    const person = (zeile.personen || {}) as Zeile & { benutzer?: { id: string }[] | null };
    const flach = (flacheZeile({ personen: person }) || {}) as Zeile;
    return {
      id:                 String(person.id ?? ""),
      vorname:            (flach.vorname as string) ?? null,
      nachname:           (flach.nachname as string) ?? null,
      name:               nameAus(flach as { vorname?: string | null; nachname?: string | null }),
      email:              (flach.email as string) ?? null,
      telefon:            (flach.telefon as string) ?? null,
      profil_geprueft_at: (flach.profil_geprueft_at as string) ?? null,
      beziehung:          zeile.beziehung,
      hauptkontakt:       zeile.hauptkontakt,
      benutzer_id:        person.benutzer?.[0]?.id ?? null,
    };
  });
}

/* Alle Elternkontakte des Vereins — Grundlage der Elternliste.

   Einstieg ist `personen` mit `eltern_kinder!inner`: gelistet wird, wer
   mindestens ein Kind verknuepft hat. Damit steht eine Person, die zwei
   Kinder im Verein hat, nur noch EINMAL in der Liste — vor Etappe 3
   waren das zwei `elternkontakte`-Zeilen und damit zwei Listenzeilen.

   ⚠ Wer keine Verknuepfung mehr hat, faellt aus der Liste. Das trifft
   Supporter (letztes Kind entknuepft, Kind noch im Verein): die Person
   bleibt bestehen, ist hier aber nicht mehr zu sehen, bis Etappe 5 den
   Mitgliedtyp „Supporter" bringt.

   Die Kindernamen kommen aus `mitglieder.personen`, nicht aus den
   Altspalten von `mitglieder`; `flacheZeile()` macht sie wieder flach,
   damit `getKinderMitTeams()` in elternListUtils unveraendert bleibt. */
export async function fetchAlleElternkontakte(sb: SbClient, vereinId: string) {
  const { data, error } = await sb.from("personen")
    .select(`
      id, vorname, nachname, email, telefon,
      benutzer(id),
      eltern_kinder!inner(
        mitglied_id, hauptkontakt, beziehung,
        mitglieder:mitglied_id(
          id,
          personen(vorname, nachname),
          kader(rollen, aktiv, teams(id, name, kurzname))
        )
      )
    `)
    .eq("verein_id", vereinId)
    .order("nachname", { ascending: true });
  if (error) console.error("fetchAlleElternkontakte error:", error);

  /* Portal-Zugang fuer die ANZEIGE aus der Sicht `portal_zugang`, nicht aus
     dem eingebetteten benutzer(id) oben. Auf `benutzer` liegen nur
     benutzer_select_admin und _self — ein Trainer bekommt dort eine leere
     Menge, und die Spalte zeigte ihm fuer ALLE "Kein Zugang", ohne Fehler.
     Die Sicht laeuft bewusst ohne security_invoker und liefert nur
     (person_id, hat_zugang); siehe supabase/migration_portal_zugang.sql.

     `benutzer_id` bleibt daneben stehen: es wird fuer AKTIONEN gebraucht
     (entkoppleKind setzt die Benutzerrolle), und wer die ausfuehren darf,
     sieht die Tabelle ohnehin. */
  const { data: zugaenge } = await sb.from("portal_zugang").select("person_id, hat_zugang");
  const zugangMap = new Map<string, boolean>(
    (zugaenge || []).map(z => [z.person_id as string, z.hat_zugang !== false]),
  );

  return (data || []).map(p => {
    const links = p.eltern_kinder || [];
    /* Kind-Zeilen flach machen, damit elternListUtils weiter `m.vorname`
       liest und nichts von `personen` wissen muss. */
    const kinder = links.map(l => ({
      mitglied_id:  l.mitglied_id,
      hauptkontakt: l.hauptkontakt,
      beziehung:    l.beziehung,
      mitglieder:   flacheZeile(l.mitglieder as never) as KindZeileFlach | null,
    }));
    const erstes = kinder[0];
    return {
      id:          p.id,
      vorname:     p.vorname,
      nachname:    p.nachname,
      name:        nameAus(p),
      email:       p.email,
      telefon:     p.telefon,
      beziehung:   fasseBeziehungZusammen(links.map(l => l.beziehung)),
      benutzer_id: p.benutzer?.[0]?.id ?? null,
      hat_zugang:  zugangMap.get(p.id) ?? false,
      mitglied_id: erstes?.mitglied_id || null,
      hauptkontakt: erstes?.hauptkontakt || false,
      mitglieder:  erstes?.mitglieder || null,
      _alle_kinder: kinder,
    };
  });
}

export async function fetchKinderFuerElternteil(sb: SbClient, personId: string) {
  const { data } = await sb.from("eltern_kinder")
    .select("mitglied_id, hauptkontakt, mitglieder:mitglied_id(id, aktiv, mitgliedtyp, personen(vorname, nachname), kader(aktiv, teams(name, kurzname)))")
    .eq("person_id", personId);
  return (data || []).map(zeile => ({
    mitglied_id:  zeile.mitglied_id,
    hauptkontakt: zeile.hauptkontakt,
    mitglieder:   flacheZeile(zeile.mitglieder as never) as KindZeileFlach | null,
  }));
}

export async function fetchKinderVollstaendigFuerElternteil(sb: SbClient, personId: string) {
  const { data } = await sb.from("eltern_kinder")
    .select(`mitglied_id, mitglieder:mitglied_id(
      id, mitgliedtyp, rolle, profil_geprueft_at,
      personen(*)
    )`)
    .eq("person_id", personId);
  return (data || [])
    .map(zeile => flacheZeile(zeile.mitglieder as never))
    .filter(Boolean);
}

/* Suche fuer „bestehenden Elternteil verknuepfen".

   Gesucht wird in `personen` — nicht mehr in `elternkontakte` und auch
   nicht in den Altspalten von `mitglieder`. Absichtlich OHNE Filter auf
   vorhandene Kinder: wer heute Aktivmitglied ist und morgen als Vater
   eines Juniors dazukommt, ist dieselbe Person und soll gefunden werden.
   Genau dafuer wurden die Personen in Etappe 2a zusammengefuehrt. */
export async function sucheElternkontakte(
  sb: SbClient,
  vereinId: string,
  query: string,
  /** Das Kind, fuer das gesucht wird. Es selbst darf nicht als sein eigener
      Elternteil erscheinen, und wer bereits ein Kind IST, ebenso wenig. */
  fuerMitgliedId?: number | null,
) {
  const q = (query || "").trim();
  if (!q) return [];

  /* Mehrere Woerter: jedes muss irgendwo treffen, die Reihenfolge ist egal.
     „adrian kaiser" und „kaiser adrian" finden dieselbe Person.
     Technisch: mehrere .or()-Aufrufe werden von PostgREST UND-verknuepft,
     innerhalb eines Aufrufs gilt ODER. */
  const woerter = q.split(/\s+/).filter(Boolean).slice(0, 4);

  let abfrage = sb.from("personen")
    .select("id, vorname, nachname, email, eltern_kinder(mitglied_id, beziehung, mitglieder:mitglied_id(id, personen(vorname, nachname)))")
    .eq("verein_id", vereinId);
  for (const w of woerter) {
    abfrage = abfrage.or(`vorname.ilike.%${w}%,nachname.ilike.%${w}%,email.ilike.%${w}%`);
  }

  const { data, error } = await abfrage
    .order("nachname", { ascending: true })
    .limit(20);
  if (error) console.error("sucheElternkontakte error:", error);

  /* Zwei Ausschluesse, und nur diese zwei:

     1. Das Kind selbst — niemand ist sein eigener Elternteil.
     2. Zirkel: Ist das Kind bereits Elternteil DIESER Person, darf sie nicht
        umgekehrt sein Elternteil werden.

     ⚠ NICHT ausgeschlossen wird, wer irgendwo sonst als Kind eingetragen ist.
     Ein erwachsenes Mitglied, dessen Eltern ebenfalls im Verein sind, ist
     selbst ein Kind — und trotzdem Vater seiner eigenen Kinder. Ein solcher
     Filter liess am 05.08.2026 den gesuchten Adrian Kaiser verschwinden. */
  let eigenePersonId: string | null = null;
  const zirkel = new Set<string>();
  if (fuerMitgliedId) {
    const { data: kind } = await sb.from("mitglieder")
      .select("person_id").eq("id", fuerMitgliedId).maybeSingle();
    eigenePersonId = kind?.person_id ?? null;

    if (eigenePersonId) {
      /* Wessen Elternteil ist dieses Kind bereits? Deren Personen duerfen
         nicht ihrerseits sein Elternteil werden. */
      const { data: umgekehrt } = await sb.from("eltern_kinder")
        .select("mitglieder:mitglied_id(person_id)")
        .eq("person_id", eigenePersonId);
      for (const z of umgekehrt || []) {
        const pid = (z.mitglieder as { person_id?: string | null } | null)?.person_id;
        if (pid) zirkel.add(pid);
      }
    }
  }

  return (data || [])
    .filter(p => p.id !== eigenePersonId && !zirkel.has(p.id))
    .slice(0, 10)
    .map(p => ({
    id:        p.id,
    vorname:   p.vorname,
    nachname:  p.nachname,
    name:      nameAus(p),
    email:     p.email,
    beziehung: fasseBeziehungZusammen((p.eltern_kinder || []).map(l => l.beziehung)),
    eltern_kinder: (p.eltern_kinder || []).map(l => ({
      mitglied_id: l.mitglied_id,
      mitglieder:  flacheZeile(l.mitglieder as never) as { id: number; vorname?: string | null; nachname?: string | null } | null,
    })),
  }));
}

/* ── Person finden oder anlegen ─────────────────────────────────── */

/* Uebersetzt die Unique-Verletzung des Index `personen_email_pro_verein`
   in eine Meldung, die im Formular etwas aussagt. Roh durchgereicht
   landet sie hoechstens in einer saveMsg und der Benutzer sieht nichts
   (siehe CLAUDE.md → Bekannte Defekte). */
function alsEmailVergeben(err: PostgrestError): PostgrestError {
  /* Nur die Meldung ersetzen — code, details und hint bleiben fuer die
     Fehlersuche stehen. Object.assign statt Objektliteral, weil
     PostgrestError eine Klasse ist (toJSON ginge sonst verloren). */
  return Object.assign(err, { message: "Diese E-Mail ist bereits vergeben." });
}

async function findePersonPerEmail(sb: SbClient, vereinId: string, email: string) {
  const { data } = await sb.from("personen")
    .select("id")
    .eq("verein_id", vereinId)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export interface PersonErgebnis {
  personId: string | null;
  error: PostgrestError | null;
}

/* Findet die Person ueber die E-Mail oder legt sie an.

   ZUSAMMENGEFUEHRT WIRD NUR UEBER DIE E-MAIL — dieselbe Regel wie in
   Etappe 2a (`supabase/etappe2a_merge.sql`). Nicht ueber den Namen: der
   Bestand enthaelt Namenskollisionen, teils mit identischer Adresse.

   OHNE E-MAIL wird IMMER neu angelegt. Ein Leerwert darf nicht
   zusammenfuehren, sonst wuerden alle Elternteile ohne E-Mail zu einer
   Person verschmelzen (Rosmarie Steiner, Grossmutter, nur telefonisch
   erreichbar). Der Unique-Index klammert leere E-Mails deshalb aus.

   BESTEHENDE PERSONEN WERDEN NICHT UEBERSCHRIEBEN. Wird ein Vater
   gefunden, der bereits Aktivmitglied ist, gewinnen seine gepflegten
   Daten gegen das, was gerade im Elternformular steht. */
export async function findeOderLegePersonAn(
  sb: SbClient,
  felder: Record<string, unknown>,
  vereinId: string,
): Promise<PersonErgebnis> {
  const { person } = verteileFelder(felder);
  const email = typeof person.email === "string" ? person.email.trim() : "";
  person.email = email || null;

  if (email) {
    const treffer = await findePersonPerEmail(sb, vereinId, email);
    if (treffer) return { personId: treffer, error: null };
  }

  const { data, error } = await sb.from("personen")
    .insert({ ...person, verein_id: vereinId } as TablesInsert<"personen">)
    .select("id").single();

  if (error) {
    /* 23505: zwischen Suche und Insert ist jemand zuvorgekommen, oder
       die gespeicherte E-Mail weicht in Gross-/Kleinschreibung bzw.
       Leerzeichen ab (der Index normalisiert ueber lower(btrim())).
       Nochmal suchen, bevor der Fehler nach oben geht. */
    if (error.code === "23505" && email) {
      const treffer = await findePersonPerEmail(sb, vereinId, email);
      if (treffer) return { personId: treffer, error: null };
      return { personId: null, error: alsEmailVergeben(error) };
    }
    return { personId: null, error };
  }
  return { personId: data.id, error: null };
}

/* ── Schreiben ──────────────────────────────────────────────────── */

/* Eingabe von insertElternkontakt: Personenfelder plus die Angaben, die
   an die Verknuepfung gehen. `verein_id` kommt als eigener Pflicht-
   parameter, damit der Aufrufer es nicht vergessen kann (siehe
   insertMitglied in CLAUDE.md → Konventionen). */
export interface NeuerElternkontakt extends Omit<TablesInsert<"personen">, "verein_id" | "id"> {
  /* Kind, mit dem verknuepft wird. Seit Etappe 3 koennte eine Person
     auch ohne Kind entstehen — die Oberflaechen erfassen Elternteile
     aber weiterhin beim Kind, deshalb Pflichtfeld. */
  mitglied_id: number;
  /* Gehoeren zu eltern_kinder, nicht zu personen */
  beziehung?: string | null;
  hauptkontakt?: boolean;
}

/* Legt den Elternkontakt an: Person finden oder anlegen, dann mit dem
   Kind verknuepfen. Vor Etappe 3 entstand hier eine `elternkontakte`-
   Zeile pro Eltern-Kind-Paar — derselbe Mensch mit zwei Kindern war
   zweimal erfasst. */
export async function insertElternkontakt(
  sb: SbClient, kontakt: NeuerElternkontakt, vereinId: string,
): Promise<PostgrestError | null> {
  const { mitglied_id, hauptkontakt = false, beziehung = null, ...personFelder } = kontakt;

  const { personId, error } = await findeOderLegePersonAn(sb, personFelder, vereinId);
  if (error) return error;
  if (!personId) return null;
  if (!mitglied_id) return null;

  const { error: linkError } = await sb.from("eltern_kinder").insert({
    person_id: personId,
    mitglied_id,
    verein_id: vereinId,
    hauptkontakt,
    beziehung,
  });
  return linkError;
}

/* Aendert einen Elternkontakt.

   Personenfelder gehen nach `personen`, `beziehung` an die Verknuepfung.
   `mitgliedId` sagt, WELCHE Verknuepfung gemeint ist: aus dem ElternTab
   steht man bei einem bestimmten Kind, aus der Elternliste nicht. Ohne
   `mitgliedId` gilt die Beziehung fuer alle Kinder dieser Person — das
   ist die einzige Lesart, die zu der einen Zeile passt, die man dort
   vor sich hat. Die Oberflaeche schickt `beziehung` deshalb nur mit,
   wenn sie tatsaechlich geaendert wurde. */
export async function updateElternkontakt(
  sb: SbClient,
  personId: string,
  fields: Record<string, unknown>,
  mitgliedId?: number | null,
): Promise<PostgrestError | null> {
  const { beziehung, ...rest } = fields;
  const { person } = verteileFelder(rest);

  if (Object.keys(person).length > 0) {
    const { error } = await sb.from("personen")
      .update(person as TablesUpdate<"personen">).eq("id", personId);
    if (error) return error.code === "23505" ? alsEmailVergeben(error) : error;
  }

  if ("beziehung" in fields) {
    let q = sb.from("eltern_kinder").update({ beziehung: (beziehung as string) ?? null })
      .eq("person_id", personId);
    if (mitgliedId) q = q.eq("mitglied_id", mitgliedId);
    const { error } = await q;
    if (error) return error;
  }
  return null;
}

/* Loescht die Person NUR, wenn nichts mehr an ihr haengt: keine
   Mitgliedschaft, keine Eltern-Verknuepfung, kein Benutzerkonto.

   Ohne diese Pruefung wuerde das Loeschen eines Elternkontakts die
   Identitaet eines aktiven Mitglieds mitreissen — seit Etappe 2a ist
   der Vater, der selbst Aktivmitglied ist, DIESELBE Zeile in
   `personen`. Im Zweifel bleibt die Person stehen: eine verwaiste
   Person kostet nichts, eine geloeschte ist nicht zurueckzuholen. */
export async function loeschePersonWennVerwaist(sb: SbClient, personId: string): Promise<boolean> {
  const zaehle = async (tabelle: "mitglieder" | "eltern_kinder" | "benutzer") => {
    const { count, error } = await sb.from(tabelle)
      .select("id", { count: "exact", head: true })
      .eq("person_id", personId);
    /* Fehler (etwa fehlendes Leserecht) zaehlt als „haengt dran" —
       lieber stehen lassen als blind loeschen. */
    if (error) return 1;
    return count || 0;
  };
  if (await zaehle("mitglieder")) return false;
  if (await zaehle("eltern_kinder")) return false;
  if (await zaehle("benutzer")) return false;

  const { error } = await sb.from("personen").delete().eq("id", personId);
  return !error;
}

/* Entfernt die Verknuepfung zwischen Elternteil und Kind — ohne
   `mitgliedId` alle Verknuepfungen dieser Person.

   Hiess bis Etappe 3 `deleteElternkontakt()` und loeschte eine Zeile in
   `elternkontakte`. Die Person selbst wird NIE geloescht; nur wenn
   danach gar nichts mehr an ihr haengt, raeumt
   `loeschePersonWennVerwaist()` sie weg. */
export async function entferneElternVerknuepfung(
  sb: SbClient, personId: string, mitgliedId?: number | null,
): Promise<PostgrestError | null> {
  let q = sb.from("eltern_kinder").delete().eq("person_id", personId);
  if (mitgliedId) q = q.eq("mitglied_id", mitgliedId);
  const { error } = await q;
  if (error) return error;
  await loeschePersonWennVerwaist(sb, personId);
  return null;
}

export async function linkKind(sb: SbClient, personId: string, mitgliedId: number, vereinId: string, hauptkontakt = false, beziehung: string | null = null): Promise<PostgrestError | null> {
  /* onConflict folgt dem Unique-Index eltern_kinder_person_mitglied_key
     (verein_id, person_id, mitglied_id). Stimmt die Spaltenliste nicht
     mit dem Index ueberein, scheitert jeder Upsert. */
  const { error } = await sb.from("eltern_kinder").upsert({
    person_id: personId,
    mitglied_id: mitgliedId,
    verein_id: vereinId,
    hauptkontakt,
    beziehung,
  }, { onConflict: "verein_id,person_id,mitglied_id" });
  return error;
}

export interface UnlinkErgebnis {
  verbleibendeKinder: number;
  kindNochAktiv: boolean;
}

export async function unlinkKind(sb: SbClient, personId: string, mitgliedId: number): Promise<UnlinkErgebnis> {
  await sb.from("eltern_kinder").delete()
    .eq("person_id", personId)
    .eq("mitglied_id", mitgliedId);
  const { count } = await sb.from("eltern_kinder")
    .select("id", { count: "exact", head: true })
    .eq("person_id", personId);
  const { data: kind } = await sb.from("mitglieder")
    .select("aktiv")
    .eq("id", mitgliedId)
    .maybeSingle();
  return { verbleibendeKinder: count || 0, kindNochAktiv: kind?.aktiv === true };
}

export async function setHauptkontakt(sb: SbClient, mitgliedId: number, personId: string, _vereinId?: string | null) {
  void _vereinId;
  await sb.from("eltern_kinder").update({ hauptkontakt: false }).eq("mitglied_id", mitgliedId);
  await sb.from("eltern_kinder").update({ hauptkontakt: true })
    .eq("person_id", personId)
    .eq("mitglied_id", mitgliedId);
}

export async function clearHauptkontaktFuerKind(sb: SbClient, personId: string, mitgliedId: number) {
  return sb.from("eltern_kinder").update({ hauptkontakt: false })
    .eq("person_id", personId).eq("mitglied_id", mitgliedId);
}

/* Sucht Mitglieder, die als Kind eines Elternkontakts in Frage kommen.
   Massgeblich ist normalerweise mitgliedtypen.hauptkontakt_pflicht — dieselbe
   Regel, nach der das Portal sonst entscheidet, wer einen Elternkontakt
   braucht. Fuer den Ausnahmefall laesst sich der Filter weglassen: ein
   Elternkontakt ist bei jedem Mitgliedtyp erlaubt, nur nicht ueberall
   erforderlich. */
/* Rückgabe der Kindersuche. Explizit deklariert, weil die Abfrage die Namen
   verschachtelt liefert (personen(...)) und flacheZeilen() sie flach macht —
   der aus der Abfrage abgeleitete Typ träfe also nicht zu. */
export interface KindTreffer {
  id: number;
  mitgliedtyp: string | null;
  vorname: string | null;
  nachname: string | null;
}

export async function sucheKinder(
  sb: SbClient,
  vereinId: string,
  query: string,
  pflichtTypen: string[] | null,
) {
  const suche = query.trim();
  if (!suche) return [];
  /* Gesucht wird in `personen`, nicht in den Altspalten von `mitglieder` —
     sonst fände die Suche nach einer Namenskorrektur noch den alten Wert.
     `!inner` ist dafür nötig; es setzt voraus, dass jede Mitgliedschaft eine
     Person hat (supabase/etappe2b_backfill_person_id.sql). */
  let q = sb.from("mitglieder")
    .select("id, mitgliedtyp, personen!inner(id,vorname,nachname)")
    .eq("verein_id", vereinId)
    .eq("aktiv", true);
  if (pflichtTypen) {
    if (pflichtTypen.length === 0) return [];
    q = q.in("mitgliedtyp", pflichtTypen);
  }
  const { data } = await q
    .or(`vorname.ilike.%${suche}%,nachname.ilike.%${suche}%`, { referencedTable: "personen" })
    .order("nachname", { referencedTable: "personen" })
    .limit(20);
  return (data || [])
    .map(z => flacheZeile(z as never))
    .filter(Boolean) as unknown as KindTreffer[];
}

/* Was nach dem Entkoppeln mit dem Elternkontakt geschehen ist. */
export type EntkoppelFolge = "verknuepft" | "supporter" | "geloescht";

/* Aenderungen an einem Elternkontakt betreffen alle verknuepften Kinder.
   mitglieder_aktivitaeten haengt an einer mitglied_id — deshalb wird der
   Eintrag in jeden betroffenen Verlauf geschrieben. Wer Adrians Verlauf
   liest, sieht so auch, dass die Nummer seiner Mutter korrigiert wurde. */
export async function logFuerAlleKinder(
  sb: SbClient,
  personId: string,
  vereinId: string,
  schreibe: (mitgliedId: number) => void | Promise<void>,
): Promise<void> {
  void vereinId;
  const { data } = await sb.from("eltern_kinder")
    .select("mitglied_id")
    .eq("person_id", personId);
  for (const zeile of data || []) {
    await schreibe(zeile.mitglied_id);
  }
}

/* unlinkKind samt Nachbehandlung: war es das letzte Kind, wird der
   Elternteil je nach Zustand des Kindes zum Supporter oder die Person
   entfaellt. Die Logik lag bisher in ElternTab und wird von Elternliste
   und Tab gleichermassen gebraucht — deshalb hier, nicht in der
   Komponente. */
export async function entkoppleKind(
  sb: SbClient,
  personId: string,
  mitgliedId: number,
  benutzerId?: string | null,
  vereinId?: string | null,
): Promise<EntkoppelFolge> {
  const { verbleibendeKinder, kindNochAktiv } = await unlinkKind(sb, personId, mitgliedId);
  if (verbleibendeKinder > 0) return "verknuepft";

  if (kindNochAktiv) {
    /* Kind noch im Verein (z.B. Junioren → Aktiv) → der Elternteil wird
       Supporter. Seit Etappe 5 ist das ein MITGLIEDTYP und kein Kennzeichen:
       ohne Mitgliedschaft haette die Person keine Verknuepfung mehr und
       erschiene in keiner Liste — weder bei den Eltern (dort steigt die
       Abfrage ueber eltern_kinder ein) noch bei den Mitgliedern. */
    await macheZumSupporter(sb, personId, vereinId);
    if (benutzerId) await updateBenutzerRolle(sb, benutzerId, "supporter");
    return "supporter";
  }

  /* Kind hat den Verein verlassen: die Person bleibt, solange noch
     irgendetwas an ihr haengt (Mitgliedschaft, anderes Kind, Konto). */
  await loeschePersonWennVerwaist(sb, personId);
  return "geloescht";
}

/**
 * Legt fuer eine Person eine aktive Mitgliedschaft vom Typ „Supporter" an.
 *
 * Tut nichts, wenn die Person bereits eine aktive Mitgliedschaft hat: Der
 * partielle Index `mitglieder_eine_aktive_mitgliedschaft` laesst nur eine
 * zu, und Aktivmitglied wiegt schwerer als Supporter. Wer beides sein will,
 * muss die alte zuerst archivieren — das ist die Regel aus Etappe 5, nicht
 * ein Sonderfall hier.
 */
export async function macheZumSupporter(
  sb: SbClient,
  personId: string,
  vereinId?: string | null,
): Promise<PostgrestError | null> {
  const { data: person } = await sb.from("personen")
    .select("verein_id")
    .eq("id", personId)
    .maybeSingle();
  const verein = vereinId ?? person?.verein_id;
  if (!verein) return null;

  const { count } = await sb.from("mitglieder")
    .select("id", { count: "exact", head: true })
    .eq("person_id", personId)
    .eq("aktiv", true);
  if ((count || 0) > 0) return null;

  const { error } = await sb.from("mitglieder").insert({
    person_id: personId,
    verein_id: verein,
    mitgliedtyp: "Supporter",
    aktiv: true,
  } as never);
  return error;
}

export async function updateBenutzerRolle(sb: SbClient, benutzerId: string, rolle: string) {
  return sb.from("benutzer").update({ role: rolle }).eq("id", benutzerId);
}

/* Portal-Zugang eines Elternteils.

   Der Zugang haengt seit Block D an `benutzer.person_id`, nicht mehr an
   `elternkontakte.benutzer_id`. „Deaktivieren" trennt weiterhin nur die
   Zuordnung; das Konto selbst bleibt bestehen, wie bisher. */
export async function unlinkElternBenutzer(sb: SbClient, personId: string) {
  return sb.from("benutzer").update({ person_id: null }).eq("person_id", personId);
}

export async function linkElternBenutzer(sb: SbClient, personId: string, benutzerId: string) {
  return sb.from("benutzer").update({ person_id: personId }).eq("id", benutzerId);
}
