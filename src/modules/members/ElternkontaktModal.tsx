/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternkontaktModal.tsx
   Bearbeiten/Anlegen eines Elternkontakts.
   Aufrufer: ElternTab (Mitglied-Detail) und Elternliste. Beide sehen
   dasselbe — auch die verknuepften Kinder. Der Hauptkontakt gilt pro Kind,
   und eine Aenderung an den Kontaktdaten betrifft alle verknuepften Kinder;
   beides ist auch im Tab die relevante Information.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { Btn, ModalOrSheet, PhoneInput, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { ElternKinderSektion } from "./ElternKinderSektion.tsx";
import { ElternPortalSection } from "./ElternPortalSection.tsx";
import {
  insertElternkontakt, updateElternkontakt, entferneElternVerknuepfung, logFuerAlleKinder,
} from "../../domains/members/elternService.ts";
import { logAenderung, logAktivitaet, AKTIVITAET_TYP } from "../../domains/members/memberService.ts";
import type { Sb } from "../../types.ts";
import type { StatusMeldung } from "./tabs/DatenpruefungTab.tsx";

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

/* Die Eingabefelder allein — damit sie auch im Suche-Modal unter
   "Neu erfassen" stehen koennen, ohne ein zweites Modal zu oeffnen. */
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

/* Kontaktdaten zum Nachschauen — ohne Bearbeitungsrecht. Telefon und
   E-Mail sind Links, weil genau das der Zweck ist: anrufen oder schreiben. */
function ElternLeseAnsicht({ form }: { form: ElternFormular }) {
  const name = [form.vorname, form.nachname].filter(Boolean).join(" ") || "—";
  return (
    <div className="cc-info-grid">
      <div className="cc-info-row">
        <span className="cc-info-key">Name</span>
        <span className="cc-info-val">{name}</span>
      </div>
      <div className="cc-info-row">
        <span className="cc-info-key">Beziehung</span>
        <span className={form.beziehung ? "cc-info-val" : "cc-info-val-empty"}>
          {form.beziehung || "—"}
        </span>
      </div>
      <div className="cc-info-row">
        <span className="cc-info-key">E-Mail</span>
        {form.email
          ? <a href={`mailto:${form.email}`} className="cc-contact-link"><TI n="mail" size={12}/>{form.email}</a>
          : <span className="cc-info-val-empty">—</span>}
      </div>
      <div className="cc-info-row">
        <span className="cc-info-key">Telefon</span>
        {form.telefon
          ? <a href={`tel:${form.telefon}`} className="cc-contact-link"><TI n="phone" size={12}/>{form.telefon}</a>
          : <span className="cc-info-val-empty">—</span>}
      </div>
    </div>
  );
}

interface ElternkontaktModalProps {
  /* "neu" braucht mitgliedId — ein Kontakt ohne Kind haengt im Nichts */
  mode: "neu" | "edit";
  data: ElternFormular;
  mitgliedId?: number | null;
  /* Ohne Bearbeitungsrecht zeigt das Modal eine Lese-Ansicht: Trainer
     schauen Kontaktdaten nach, Admins korrigieren sie. Ein Formular voller
     Eingabefelder waere fuer den Lesefall das falsche Werkzeug. */
  canEdit?: boolean;
  sb: Sb;
  vereinId: string | null;
  geaendertVon: string;
  /* Kind-Auswahl fuer die Kinder-Sektion — vom Aufrufer bereitgestellt */
  onKindHinzufuegen?: (() => void) | null;
  neuesKind?: number | null;
  onKindVerknuepft?: (() => void) | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ElternkontaktModal({
  mode, data, mitgliedId = null, canEdit = true, sb, vereinId, geaendertVon,
  onKindHinzufuegen = null, neuesKind = null,
  onKindVerknuepft = null, onClose, onSaved,
}: ElternkontaktModalProps) {
  const [form, setForm] = useState<ElternFormular>({ ...data });
  const [msg, setMsg] = useState<StatusMeldung | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  const set = (k: keyof ElternFormular, v: string) => setForm(p => ({ ...p, [k]: v }));
  async function speichern() {
    if (!sb || !vereinId) return;
    const err = validateElternkontakt(form);
    if (err) { setMsg({ ok: false, text: err }); return; }
    setSaving(true); setMsg(null);
    try {
      const name = [form.vorname, form.nachname].filter(Boolean).join(" ");
      /* vorname/nachname sind in `personen` NOT NULL; validateElternkontakt()
         oben hat schon abgebrochen, wenn eines leer ist. */
      const felder = {
        vorname:   (form.vorname  || "").trim(),
        nachname:  (form.nachname || "").trim(),
        email:     form.email?.trim() || null,
        telefon:   form.telefon   || null,
      };
      if (mode === "neu") {
        if (!mitgliedId) throw new Error("Kein Kind angegeben");
        const error = await insertElternkontakt(
          sb, { mitglied_id: mitgliedId, beziehung: form.beziehung || null, ...felder }, vereinId,
        );
        if (error) throw error;
        logAktivitaet(sb, mitgliedId, vereinId, AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT, `Elternkontakt hinzugefügt: ${name}`, "elternkontakte", name, geaendertVon);
      } else if (form.id) {
        /* `beziehung` haengt an der Verknuepfung und wird nur mitgeschickt,
           wenn sie sich geaendert hat. Sonst wuerde ein Speichern aus der
           Elternliste — wo alle Kinder in einer Zeile stehen — den
           zusammengefassten Wert („Mutter, Stiefmutter") auf alle
           Verknuepfungen zurueckschreiben und die Unterscheidung
           einebnen. `mitgliedId` ist dort null, im ElternTab gesetzt. */
        const beziehungGeaendert = (form.beziehung || null) !== (data.beziehung || null);
        const error = await updateElternkontakt(
          sb, form.id,
          beziehungGeaendert ? { ...felder, beziehung: form.beziehung || null } : felder,
          mitgliedId,
        );
        if (error) throw error;
        const alterName = [data.vorname, data.nachname].filter(Boolean).join(" ");
        const kontaktId = form.id;
        /* Aenderung betrifft alle verknuepften Kinder, nicht nur das, ueber
           das man das Modal geoeffnet hat. */
        await logFuerAlleKinder(sb, kontaktId, vereinId, (kindId) => {
          if (alterName && name && alterName !== name)
            logAenderung(sb, kindId, vereinId, "elternkontakte", alterName, name, geaendertVon);
          else
            logAktivitaet(sb, kindId, vereinId, AKTIVITAET_TYP.ELTERN_GEAENDERT, `Elternkontakt bearbeitet: ${name}`, "elternkontakte", name, geaendertVon);
        });
      }
      setMsg({ ok: true, text: "Gespeichert ✓" });
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
    setSaving(false);
  }
  async function loeschen() {
    if (!sb || !form.id) return;
    const name = [form.vorname, form.nachname].filter(Boolean).join(" ") || "Dieser Kontakt";
    const ok = await confirm({
      title: `${name} als Elternkontakt entfernen?`,
      message: "Alle Verknüpfungen zu Kindern werden getrennt. Die Person selbst bleibt bestehen — sie ist womöglich auch Mitglied. Zum Trennen einer einzelnen Verknüpfung stattdessen das Kind entknüpfen.",
      danger: true,
      confirmLabel: "Entfernen",
    });
    if (!ok) return;
    /* Reihenfolge: erst loggen, dann loeschen — danach gibt es die
       Verknuepfungen nicht mehr, aus denen die Kinder abgeleitet werden. */
    if (vereinId) {
      await logFuerAlleKinder(sb, form.id, vereinId, (kindId) => {
        logAktivitaet(sb, kindId, vereinId, AKTIVITAET_TYP.ELTERN_ENTFERNT, `Elternkontakt entfernt: ${name}`, "elternkontakte", name, geaendertVon);
      });
    }
    await entferneElternVerknuepfung(sb, form.id);
    onSaved();
    onClose();
  }
  return (
    <ModalOrSheet open={true} onClose={onClose} maxWidth={480}>
      {confirmDialog}
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">
          {mode === "neu" ? "Neuer Elternkontakt" : canEdit ? "Elternkontakt bearbeiten" : "Elternkontakt"}
        </div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14}/></Btn>
      </div>
      <div className="cc-modal-body">
        {canEdit ? <ElternFelder form={form} onChange={set}/> : <ElternLeseAnsicht form={form}/>}
        {mode === "edit" && <ElternPortalSection e={form} sb={sb} onReload={onSaved} canEdit={canEdit}/>}
        {mode === "edit" && form.id && (
          <ElternKinderSektion
            personId={form.id}
            benutzerId={form.benutzer_id}
            personName={`${form.vorname||""} ${form.nachname||""}`.trim()||null}
            sb={sb}
            vereinId={vereinId}
            geaendertVon={geaendertVon}
            canEdit={canEdit}
            onKindHinzufuegen={onKindHinzufuegen}
            neuesKind={neuesKind}
            onKindVerknuepft={onKindVerknuepft}
            onChanged={onSaved}
          />
        )}
        {msg && <div className={`cc-badge ${msg.ok ? "cc-badge-success" : "cc-badge-danger"} cc-mt-8`}>{msg.text}</div>}
      </div>
      <div className="cc-modal-ftr cc-between">
        {canEdit && mode === "edit"
          ? <Btn variant="danger" onClick={loeschen}><TI n="unlink" size={14}/> Entfernen</Btn>
          : <span/>
        }
        <div className="cc-row cc-gap-8">
          <Btn onClick={onClose}>{canEdit ? "Abbrechen" : "Schliessen"}</Btn>
          {canEdit && (
            <Btn variant="primary" onClick={speichern} disabled={saving}>
              {saving ? "Speichert…" : "Speichern"}
            </Btn>
          )}
        </div>
      </div>
    </ModalOrSheet>
  );
}
