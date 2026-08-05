/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/NeuesMitgliedElternSektion.tsx

   Elternteile im gleichen Ablauf erfassen, in dem das Kind angelegt
   wird. Erscheint, sobald der gewählte Mitgliedtyp `hauptkontakt_pflicht`
   trägt (bei FCH: Juniorenmitglied).

   ÜBERSPRINGBAR. Das Anlegen scheitert nicht, wenn niemand erfasst
   wird — wer die Elterndaten gerade nicht zur Hand hat, soll nicht
   blockiert sein. Das Kind erscheint dann in der Datenprüfung.

   MEHRERE ELTERNTEILE, GENAU EIN HAUPTKONTAKT. Der erste Hinzugefügte
   wird es automatisch, umstellbar per Klick. Die Datenbank erzwingt
   „höchstens einer" über den partiellen Index
   `eltern_kinder_ein_hauptkontakt`; „genau einer" steuert diese
   Oberfläche bei.

   NICHTS WIRD HIER GESPEICHERT. Die Einträge liegen im State des
   Formulars, bis das Kind existiert — `elternkontakte.mitglied_id` ist
   NOT NULL, ein neuer Elternteil kann also gar nicht vor dem Kind
   entstehen. Das Schreiben erledigt `speichereEltern()` weiter unten,
   aufgerufen von NeuesMitgliedModal nach dem Insert.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Btn } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { ElternFelder, validateElternkontakt } from "./ElternkontaktModal.tsx";
import type { ElternFormular } from "./ElternkontaktModal.tsx";
import {
  insertElternkontakt, linkKind, setHauptkontakt, sucheElternkontakte,
} from "../../domains/members/elternService.ts";
import { logAktivitaet, AKTIVITAET_TYP } from "../../domains/members/memberService.ts";
import { vollname } from "../../domains/person/personUtils.ts";
import type { Sb } from "../../types.ts";

/* Ein vorgemerkter Elternteil — entweder ein bestehender Kontakt
   (`id` gesetzt) oder ein noch nicht angelegter (`form` gesetzt). */
export interface ElternEintrag {
  /** Schlüssel für React und für das Umschalten des Hauptkontakts. */
  key: string;
  /** Gesetzt, wenn ein bestehender Elternkontakt verknüpft wird. */
  id?: string;
  /** Gesetzt, wenn der Elternteil neu angelegt werden soll. */
  form?: ElternFormular;
  anzeigename: string;
  hauptkontakt: boolean;
}

type ElternTreffer = Awaited<ReturnType<typeof sucheElternkontakte>>[number];

/* ── Schreiben ────────────────────────────────────────────────────
   Läuft NACH dem Anlegen des Kindes. Gibt die Fehlermeldung zurück
   oder null. Bewusst kein Zurückrollen: das Kind ist gültig, nur ohne
   Hauptkontakt — ein Rückbau würde die ganze Eingabe vernichten. */
export async function speichereEltern(
  sb: Sb, vereinId: string, mitgliedId: number,
  eintraege: ElternEintrag[], geaendertVon: string,
): Promise<string | null> {
  if (!sb) return "Keine Verbindung zur Datenbank.";
  if (!eintraege.length) return null;
  let hauptId: string | null = null;
  const fehler: string[] = [];

  for (const e of eintraege) {
    if (e.id) {
      const err = await linkKind(sb, e.id, mitgliedId, vereinId, false);
      if (err) { fehler.push(`${e.anzeigename}: ${err.message}`); continue; }
      if (e.hauptkontakt) hauptId = e.id;
      logAktivitaet(sb, mitgliedId, vereinId, AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT,
        `Elternkontakt hinzugefügt: ${e.anzeigename}`, "elternkontakte", e.anzeigename, geaendertVon);
    } else if (e.form) {
      const err = await insertElternkontakt(sb, {
        ...e.form,
        name: `${e.form.vorname ?? ""} ${e.form.nachname ?? ""}`.trim(),
        mitglied_id: mitgliedId,
        hauptkontakt: e.hauptkontakt,
      }, vereinId);
      if (err) { fehler.push(`${e.anzeigename}: ${err.message}`); continue; }
      logAktivitaet(sb, mitgliedId, vereinId, AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT,
        `Elternkontakt angelegt: ${e.anzeigename}`, "elternkontakte", e.anzeigename, geaendertVon);
    }
  }

  /* Bestehende Kontakte werden ohne Hauptkontakt verknüpft und erst hier
     gesetzt — setHauptkontakt() räumt zuerst alle anderen ab und kann
     deshalb nicht mitten in der Schleife laufen. */
  if (hauptId) await setHauptkontakt(sb, mitgliedId, hauptId);

  return fehler.length ? fehler.join(" · ") : null;
}

/* ── Oberfläche ──────────────────────────────────────────────────── */

interface Props {
  sb: Sb;
  vereinId: string | null;
  eintraege: ElternEintrag[];
  setEintraege: (fn: (prev: ElternEintrag[]) => ElternEintrag[]) => void;
}

export function NeuesMitgliedElternSektion({ sb, vereinId, eintraege, setEintraege }: Props) {
  const [modus, setModus] = useState<"" | "suche" | "neu">("");
  const [query, setQuery] = useState("");
  const [treffer, setTreffer] = useState<ElternTreffer[]>([]);
  const [neuForm, setNeuForm] = useState<ElternFormular>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) { setTreffer([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!sb || !vereinId) return;
      setTreffer(await sucheElternkontakte(sb, vereinId, query));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, sb, vereinId]);

  /* Der erste Eintrag wird automatisch Hauptkontakt. */
  function ergaenze(eintrag: Omit<ElternEintrag, "hauptkontakt">) {
    setEintraege(prev => [...prev, { ...eintrag, hauptkontakt: prev.length === 0 }]);
    setModus(""); setQuery(""); setTreffer([]); setNeuForm({}); setFehler(null);
  }

  function entferne(key: string) {
    setEintraege(prev => {
      const rest = prev.filter(e => e.key !== key);
      /* War der Entfernte der Hauptkontakt, rückt der erste Verbleibende nach —
         sonst stünde die Liste ohne Hauptkontakt da. */
      if (rest.length && !rest.some(e => e.hauptkontakt)) rest[0] = { ...rest[0], hauptkontakt: true };
      return rest;
    });
  }

  function setzeHaupt(key: string) {
    setEintraege(prev => prev.map(e => ({ ...e, hauptkontakt: e.key === key })));
  }

  function uebernehmeTreffer(t: ElternTreffer) {
    if (eintraege.some(e => e.id === t.id)) { setFehler("Dieser Elternteil ist bereits erfasst."); return; }
    ergaenze({ key: t.id, id: t.id, anzeigename: vollname(t) });
  }

  function uebernehmeNeu() {
    const err = validateElternkontakt(neuForm);
    if (err) { setFehler(err); return; }
    const name = `${neuForm.vorname ?? ""} ${neuForm.nachname ?? ""}`.trim();
    ergaenze({ key: `neu-${Date.now()}`, form: { ...neuForm }, anzeigename: name });
  }

  return (
    <div className="cc-form-full">
      <div className="cc-section-title">
        <TI n="users" size={14}/> Elternteile
      </div>

      <div className="cc-hint-sub">
        {eintraege.length === 0
          ? "Für diesen Mitgliedtyp ist ein Hauptkontakt vorgesehen. Du kannst ihn hier gleich erfassen oder später im Profil nachtragen."
          : "Der Hauptkontakt bekommt die Post und die Rechnung. Angeschrieben werden alle verknüpften Elternteile."}
      </div>

      {eintraege.map(e => (
        <div key={e.key} className="cc-list-row">
          <div>
            <div>{e.anzeigename}</div>
            <div className="cc-hint-sub">
              {e.id ? "bestehender Kontakt" : "wird neu angelegt"}
              {e.form?.beziehung ? ` · ${e.form.beziehung}` : ""}
            </div>
          </div>
          <div className="cc-row cc-gap-8">
            <Btn small variant={e.hauptkontakt ? "primary" : "ghost"}
              onClick={() => setzeHaupt(e.key)}>
              Hauptkontakt
            </Btn>
            <Btn small variant="ghost" onClick={() => entferne(e.key)}>
              <TI n="x" size={13}/>
            </Btn>
          </div>
        </div>
      ))}

      {modus === "" && (
        <div className="cc-row cc-gap-8">
          <Btn small onClick={() => { setModus("suche"); setFehler(null); }}>
            <TI n="search" size={13}/> Bestehenden suchen
          </Btn>
          <Btn small onClick={() => { setModus("neu"); setFehler(null); }}>
            <TI n="plus" size={13}/> Neu erfassen
          </Btn>
        </div>
      )}

      {modus === "suche" && (
        <div>
          <input className="cc-input" autoFocus value={query}
            onChange={ev => setQuery(ev.target.value)}
            placeholder="Name oder E-Mail"/>
          {treffer.map(t => (
            <div key={t.id} className="cc-eltern-result" onClick={() => uebernehmeTreffer(t)}>
              <div>{vollname(t)}</div>
              <div className="cc-hint-sub">{t.email}</div>
            </div>
          ))}
          {query.trim() && treffer.length === 0 && (
            <div className="cc-hint-sub">Kein Treffer — über „Neu erfassen" anlegen.</div>
          )}
          <Btn small variant="ghost" onClick={() => { setModus(""); setQuery(""); }}>Abbrechen</Btn>
        </div>
      )}

      {modus === "neu" && (
        <div>
          <ElternFelder form={neuForm} onChange={(k, v) => { setNeuForm(f => ({ ...f, [k]: v })); setFehler(null); }}/>
          <div className="cc-row cc-gap-8">
            <Btn small variant="primary" onClick={uebernehmeNeu}>Übernehmen</Btn>
            <Btn small variant="ghost" onClick={() => { setModus(""); setNeuForm({}); }}>Abbrechen</Btn>
          </div>
        </div>
      )}

      {fehler && <div className="cc-badge cc-badge-danger cc-mt-8">{fehler}</div>}
    </div>
  );
}
