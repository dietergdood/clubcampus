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
import {
  insertElternkontakt, updateElternkontakt, deleteElternkontakt, logFuerAlleKinder,
  unlinkElternBenutzer,
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

interface ElternPortalSectionProps {
  e: ElternFormular;
  sb: Sb;
  onReload?: (() => void) | null;
}

export function ElternPortalSection({ e, sb, onReload }: ElternPortalSectionProps) {
  const [loading, setLoading] = useState(false);
  async function unlink() {
    if (!sb || !e.id) return;
    setLoading(true);
    await unlinkElternBenutzer(sb, e.id);
    setLoading(false);
    if (onReload) onReload();
  }
  /* Aufbau wie die Kinder-Sektion darunter: Trennlinie, Ueberschrift mit
     Aktion rechts, Inhalt darunter. Kein Warn-Kasten mehr — ein fehlender
     Zugang ist der Normalfall, keine Auffaelligkeit. Einrichten kann der
     Admin nicht: das Elternteil registriert sich selbst. */
  return (
    <>
      <div className="cc-divider cc-mt-12"/>
      <div className="cc-mt-12">
        <div className="cc-section-title cc-between">
          <span className="cc-row cc-gap-6"><TI n="key" size={14}/> Portal-Zugang</span>
          {e.benutzer_id && (
            <button className="cc-btn-danger" onClick={unlink} disabled={loading}>
              {loading ? "…" : "Deaktivieren"}
            </button>
          )}
        </div>
        <div className="cc-mt-4">
          {e.benutzer_id
            ? <span className="cc-status-active">Aktiv</span>
            : <span className="cc-text-sm cc-text-sub">
                {e.email
                  ? `Kein Zugang — Registrierung mit ${e.email} möglich`
                  : "Kein Zugang — keine E-Mail hinterlegt"}
              </span>
          }
        </div>
      </div>
    </>
  );
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

interface ElternkontaktModalProps {
  /* "neu" braucht mitgliedId — ein Kontakt ohne Kind haengt im Nichts */
  mode: "neu" | "edit";
  data: ElternFormular;
  mitgliedId?: number | null;
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
  mode, data, mitgliedId = null, sb, vereinId, geaendertVon,
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
      const felder = {
        vorname:   form.vorname   || null,
        nachname:  form.nachname  || null,
        name,
        email:     form.email     || null,
        telefon:   form.telefon   || null,
        beziehung: form.beziehung || null,
      };

      if (mode === "neu") {
        if (!mitgliedId) throw new Error("Kein Kind angegeben");
        const error = await insertElternkontakt(sb, { mitglied_id: mitgliedId, ...felder }, vereinId);
        if (error) throw error;
        logAktivitaet(sb, mitgliedId, vereinId, AKTIVITAET_TYP.ELTERN_HINZUGEFUEGT, `Elternkontakt hinzugefügt: ${name}`, "elternkontakte", name, geaendertVon);
      } else if (form.id) {
        const error = await updateElternkontakt(sb, form.id, felder);
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
      title: `${name} löschen?`,
      message: "Die Person wird aus dem System entfernt, samt allen Verknüpfungen zu Kindern. Zum Trennen einer einzelnen Verknüpfung stattdessen das Kind entknüpfen.",
      danger: true,
      confirmLabel: "Löschen",
    });
    if (!ok) return;
    /* Reihenfolge: erst loggen, dann loeschen — danach gibt es die
       Verknuepfungen nicht mehr, aus denen die Kinder abgeleitet werden. */
    if (vereinId) {
      await logFuerAlleKinder(sb, form.id, vereinId, (kindId) => {
        logAktivitaet(sb, kindId, vereinId, AKTIVITAET_TYP.ELTERN_ENTFERNT, `Elternkontakt gelöscht: ${name}`, "elternkontakte", name, geaendertVon);
      });
    }
    await deleteElternkontakt(sb, form.id);
    onSaved();
    onClose();
  }

  return (
    <ModalOrSheet open={true} onClose={onClose} maxWidth={480}>
      {confirmDialog}
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">{mode === "neu" ? "Neuer Elternkontakt" : "Elternkontakt bearbeiten"}</div>
        <Btn variant="ghost" small onClick={onClose}><TI n="x" size={14}/></Btn>
      </div>

      <div className="cc-modal-body">
        <ElternFelder form={form} onChange={set}/>

        {mode === "edit" && <ElternPortalSection e={form} sb={sb} onReload={onSaved}/>}

        {mode === "edit" && form.id && (
          <ElternKinderSektion
            elternId={form.id}
            benutzerId={form.benutzer_id}
            sb={sb}
            vereinId={vereinId}
            geaendertVon={geaendertVon}
            onKindHinzufuegen={onKindHinzufuegen}
            neuesKind={neuesKind}
            onKindVerknuepft={onKindVerknuepft}
            onChanged={onSaved}
          />
        )}

        {msg && <div className={`cc-badge ${msg.ok ? "cc-badge-success" : "cc-badge-danger"} cc-mt-8`}>{msg.text}</div>}
      </div>

      <div className="cc-modal-ftr cc-between">
        {mode === "edit"
          ? <Btn variant="danger" onClick={loeschen}><TI n="trash" size={14}/> Löschen</Btn>
          : <span/>
        }
        <div className="cc-row cc-gap-8">
          <Btn onClick={onClose}>Abbrechen</Btn>
          <Btn variant="primary" onClick={speichern} disabled={saving}>
            {saving ? "Speichert…" : "Speichern"}
          </Btn>
        </div>
      </div>
    </ModalOrSheet>
  );
}
