/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternFelder.tsx

   Die Eingabefelder für einen NEUEN Elternkontakt.

   ⚠ Sie standen bis zum 21.08.2026 in `ElternkontaktModal.tsx` und
   sind beim Wegfall des Modals hierher gezogen — nicht mitgefallen,
   weil sie etwas anderes tun als das Modal: das Modal ZEIGTE einen
   bestehenden Elternteil (das macht jetzt die Personenseite), diese
   Felder ERFASSEN einen neuen.

   Zwei Aufrufer, beide beim Kind:
     ElternSucheModal          „nicht gefunden — neu erfassen"
     NeuesMitgliedElternSektion  beim Anlegen eines Juniors

   Beziehung steht hier mit drin, obwohl sie an `eltern_kinder` hängt
   und nicht an der Person: beim Erfassen ist das Kind bekannt, und
   die Verknüpfung entsteht im selben Zug (`insertElternkontakt`).
   ═══════════════════════════════════════════════════════════════ */
import { PhoneInput } from "../../theme.ts";

export interface ElternFormular {
  id?: string;
  mitglied_id?: number;
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null;
  telefon?: string | null;
  beziehung?: string | null;
  benutzer_id?: string | null;
}

const FELDER = [
  { k: "vorname",   l: "Vorname",   req: true },
  { k: "nachname",  l: "Nachname",  req: true },
  { k: "beziehung", l: "Beziehung", opts: ["Mutter","Vater","Elternteil","Grossmutter","Grossvater","Vormund"] },
  { k: "email",     l: "E-Mail",    type: "email", req: true, full: true },
] as const;

export function validateElternkontakt(d: ElternFormular) {
  if (!d.vorname?.trim())  return "Vorname ist Pflichtfeld";
  if (!d.nachname?.trim()) return "Nachname ist Pflichtfeld";
  const email = d.email ?? "";
  if (!email.trim()) return "E-Mail ist Pflichtfeld";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Ungültige E-Mail-Adresse";
  return null;
}

export function ElternFelder({ form, onChange }: { form: ElternFormular; onChange: (k: keyof ElternFormular, v: string) => void }) {
  return (
    <div className="cc-form-row">
      {FELDER.map(f => {
        const req  = "req"  in f ? f.req  : false;
        const opts = "opts" in f ? f.opts : undefined;
        const type = "type" in f ? f.type : "text";
        const full = "full" in f ? f.full : false;
        const k = f.k;
        return (
          <div key={k} className={full ? "cc-form-full" : ""}>
            <label className="cc-label">{f.l}{req && <span className="cc-label-req"> *</span>}</label>
            {opts
              ? <select className="cc-input" value={String(form[k] || "")} onChange={ev => onChange(k, ev.target.value)}>
                  <option value="">– wählen –</option>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              : <input className="cc-input" type={type} value={String(form[k] || "")} onChange={ev => onChange(k, ev.target.value)} placeholder={f.l}/>
            }
          </div>
        );
      })}
      <div className="cc-form-full">
        <label className="cc-label">Telefon</label>
        <PhoneInput value={form.telefon || ""} onChange={v => onChange("telefon", v)} showHint={false}/>
      </div>
    </div>
  );
}
