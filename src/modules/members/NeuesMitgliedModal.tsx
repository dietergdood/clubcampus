/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/NeuesMitgliedModal.tsx
   Modal zum Anlegen eines neuen Mitglieds.

   Mitgliedtyp zuerst wählen → dynamische Pflichtfelder erscheinen.

   Welche Felder Pflicht sind, steht ausschliesslich in der Matrix
   `mitgliedtyp_pflichtfelder` (Portalverwaltung → Mitglieder-Konfiguration).
   Die Logik dazu liegt in domains/members/pflichtfelder.ts — es gibt
   KEINE Rückfallliste mehr.

   Immer sichtbar: mitgliedtyp*, vorname*, nachname*
   Alles Weitere erscheint, sobald es für den gewählten Typ konfiguriert
   ist. Ein Feld, das Pflicht ist, muss auch ausfüllbar sein: früher
   verlangte die Prüfung bei Passiv-, Ehren- und Freimitgliedern eine
   E-Mail, während das Formular das Feld ausblendete — diese drei Typen
   liessen sich dadurch gar nicht anlegen.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Btn, ModalOrSheet, PhoneInput } from "../../theme.ts";
import { AdresseFormular } from "./AdresseFormular.tsx";
import { TI } from "../../icons.tsx";
import { insertMitglied, logAktivitaet, AKTIVITAET_TYP, FELD_LABEL } from "../../domains/members/memberService.ts";
import type { Account, Mitgliedtyp, MitgliedtypPflichtfeld, PortalRolle, Sb } from "../../types.ts";
import { getEffektivePflichtfelder } from "../../domains/members/pflichtfelder.ts";
import { NeuesMitgliedElternSektion, speichereEltern } from "./NeuesMitgliedElternSektion.tsx";
import type { ElternEintrag } from "./NeuesMitgliedElternSektion.tsx";
import type { StatusMeldung } from "./tabs/DatenpruefungTab.tsx";

/* Eingabefelder des Formulars — alle optional, validate() prüft die
   Pflichtfelder je Mitgliedtyp. */
interface MitgliedFormular {
  mitgliedtyp: string;
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  geschlecht?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  kanton?: string;
  telefon?: string;
  email?: string;
  ahv_nr?: string;
  nationalitaet?: string;
  heimatort?: string;
  rolle?: string;
}


const GESCHLECHT_OPTS = [
  { v: "m", l: "Männlich" },
  { v: "w", l: "Weiblich" },
  { v: "d", l: "Divers" },
];


interface NeuesMitgliedModalProps {
  open: boolean;
  onClose: () => void;
  sb: Sb;
  dbMitgliedtypen?: Mitgliedtyp[] | null;
  dbPortalRollen?: Pick<PortalRolle, "name" | "label">[] | null;
  dbPflichtfelder?: MitgliedtypPflichtfeld[];
  vereinId: string | null;
  onSuccess?: ((id: number) => void) | null;
  account?: Account | null;
}

export function NeuesMitgliedModal({ open, onClose, sb, dbMitgliedtypen, dbPortalRollen, dbPflichtfelder=[], vereinId, onSuccess, account=null }: NeuesMitgliedModalProps) {
  const [form, setForm] = useState<MitgliedFormular>({ mitgliedtyp: "" });
  const [elternEintraege, setElternEintraege] = useState<ElternEintrag[]>([]);
  /* Gesetzt, sobald das Kind in der Datenbank steht. Scheitert danach das
     Anlegen der Elternteile, bleibt das Modal offen und ein zweiter Versuch
     schreibt nur noch die Eltern — die Eingabe geht nicht verloren. */
  const [angelegtesKind, setAngelegtesKind] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<StatusMeldung | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /* Erfolgs-Timer bei Unmount abbrechen (sonst setState nach Unmount) */
  useEffect(() => () => clearTimeout(successTimer.current), []);

  const mitgliedtypen = dbMitgliedtypen && dbMitgliedtypen.length > 0
    ? dbMitgliedtypen.map(t => t.name)
    : ["Aktivmitglied", "Juniormitglied", "Passivmitglied", "Ehrenmitglied"];

  const portalRollen = dbPortalRollen && dbPortalRollen.length > 0
    ? dbPortalRollen
    : [
        { name: "trainer",     label: "Trainer/in" },
        { name: "spieler",     label: "Spieler/in" },
        { name: "funktionaer", label: "Funktionär" },
        { name: "eltern",      label: "Elternteil" },
        { name: "mitglied",    label: "Mitglied" },
      ];

  /* Nur die Mitgliedtyp-Matrix — die Rollen-Zusatzfelder greifen erst in
     der Datenprüfung, weil beim Anlegen die sportliche Rolle noch nicht
     feststeht (sie kommt übers Kader). */
  const pflichtfelder = getEffektivePflichtfelder({
    mitgliedtyp: form.mitgliedtyp,
    typMatrix: dbPflichtfelder,
  });

  const istPflicht = (feld: string) => pflichtfelder.includes(feld);

  /* Bei diesen Mitgliedtypen ist ein Hauptkontakt vorgesehen — der
     Elternabschnitt erscheint dann im gleichen Ablauf. Erzwungen wird er
     nicht: wer die Elterndaten nicht zur Hand hat, soll nicht blockiert
     sein, das Kind erscheint dann in der Datenprüfung. */
  const hauptkontaktPflicht = (dbMitgliedtypen || [])
    .some(t => t.name === form.mitgliedtyp && t.hauptkontakt_pflicht);

  function set(key: keyof MitgliedFormular, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    setMsg(null);
  }

  function validate() {
    if (!form.mitgliedtyp) return "Bitte Mitgliedtyp wählen.";
    if (!form.vorname?.trim()) return "Vorname ist Pflicht.";
    if (!form.nachname?.trim()) return "Nachname ist Pflicht.";
    const BEKANNTE_FELDER = ["geburtsdatum","geschlecht","strasse","plz","ort","telefon","email","ahv_nr","nationalitaet","heimatort"] as const;
    for (const feld of pflichtfelder) {
      /* unbekannte Felder überspringen — mitgliedtyp_pflichtfelder kann
         Felder enthalten, die dieses Formular nicht anbietet */
      if (!(BEKANNTE_FELDER as readonly string[]).includes(feld)) continue;
      if (!form[feld as (typeof BEKANNTE_FELDER)[number]]?.trim()) {
        return `${FELD_LABEL[feld] || feld} ist Pflicht.`;
      }
    }
    return null;
  }

  async function handleSave() {
    if (!sb || !vereinId) return;
    const von = account?.name || account?.email || "Administrator";

    /* Zweiter Anlauf: das Kind steht bereits, nur die Elternteile fehlen
       noch. Dann nicht nochmals anlegen — sonst entstünde eine Dublette. */
    if (angelegtesKind !== null) {
      setSaving(true); setMsg(null);
      const elternFehler = await speichereEltern(sb, vereinId, angelegtesKind, elternEintraege, von);
      setSaving(false);
      if (elternFehler) { setMsg({ ok: false, text: `Elternteil nicht gespeichert: ${elternFehler}` }); return; }
      abschliessen(angelegtesKind);
      return;
    }

    const err = validate();
    if (err) { setMsg({ ok: false, text: err }); return; }
    setSaving(true); setMsg(null);
    const id = await insertMitglied(sb, {
      /* vorname und nachname sind in mitglieder NOT NULL; validate() oben
         hat beide bereits als nicht leer geprüft. */
      vorname:      form.vorname!.trim(),
      nachname:     form.nachname!.trim(),
      geburtsdatum: form.geburtsdatum || null,
      geschlecht:   form.geschlecht || null,
      strasse:      form.strasse?.trim() || null,
      plz:          form.plz?.trim() || null,
      ort:          form.ort?.trim() || null,
      telefon:      form.telefon?.trim() || null,
      /* Leer als null, nicht als "" — sonst stehen zwei Schreibweisen für
         dasselbe in der Datenbank, und der partielle Unique-Index auf der
         E-Mail greift bei "" nicht. */
      email:        form.email?.trim() || null,
      ahv_nr:        form.ahv_nr?.trim() || null,
      nationalitaet: form.nationalitaet?.trim() || null,
      heimatort:     form.heimatort?.trim() || null,
      mitgliedtyp:  form.mitgliedtyp || null,
      rolle:        form.rolle || null,
    }, vereinId);
    if (!id) { setSaving(false); setMsg({ ok: false, text: "Fehler beim Speichern." }); return; }

    logAktivitaet(sb, id, vereinId, AKTIVITAET_TYP.ANGELEGT, "Mitglied angelegt", null, null, von);

    /* Erst jetzt die Elternteile: eltern_kinder braucht die mitglied_id, und
       elternkontakte.mitglied_id ist NOT NULL. Scheitert es hier, bleibt das
       Kind stehen — es ist gültig, nur ohne Hauptkontakt. Ein Zurückrollen
       würde die ganze Eingabe vernichten. */
    const elternFehler = await speichereEltern(sb, vereinId, id, elternEintraege, von);
    setSaving(false);
    if (elternFehler) {
      setAngelegtesKind(id);
      setMsg({ ok: false, text: `Mitglied angelegt — Elternteil nicht gespeichert: ${elternFehler}` });
      return;
    }
    abschliessen(id);
  }

  function abschliessen(id: number) {
    setMsg({ ok: true, text: "Mitglied angelegt ✓" });
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => {
      setForm({ mitgliedtyp: "" });
      setElternEintraege([]);
      setAngelegtesKind(null);
      setMsg(null);
      onClose();
      if (onSuccess) onSuccess(id);
    }, 800);
  }

  function handleClose() {
    setForm({ mitgliedtyp: "" });
    setElternEintraege([]);
    /* Wurde das Kind schon angelegt, muss die Liste sich aktualisieren —
       sonst fehlt es dort, obwohl es in der Datenbank steht. */
    const id = angelegtesKind;
    setAngelegtesKind(null);
    setMsg(null);
    onClose();
    if (id !== null && onSuccess) onSuccess(id);
  }

  return (
    <ModalOrSheet open={open} onClose={handleClose} maxWidth={520}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">Neues Mitglied</div>
        <Btn variant="ghost" small onClick={handleClose}><TI n="x" size={14}/></Btn>
      </div>

      <div className="cc-modal-body">
        <div className="cc-form-row">

          {/* Mitgliedtyp — immer zuerst */}
          <div className="cc-form-full">
            <label className="cc-label">
              Mitgliedtyp <span className="cc-label-req">*</span>
            </label>
            <select className="cc-input" value={form.mitgliedtyp} onChange={e => set("mitgliedtyp", e.target.value)}
              style={!form.mitgliedtyp ? {borderColor:"var(--cc-accent,#FEC604)"} : {}}>
              <option value="">— zuerst wählen —</option>
              {mitgliedtypen.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {!form.mitgliedtyp && (
              <div className="cc-hint-sub">
                Bestimmt welche Pflichtfelder erscheinen
              </div>
            )}
          </div>

          {/* Felder nur wenn Mitgliedtyp gewählt */}
          {form.mitgliedtyp && (<>

            {/* Vorname / Nachname */}
            <div>
              <label className="cc-label">Vorname <span className="cc-label-req">*</span></label>
              <input className="cc-input" type="text" value={form.vorname||""} onChange={e=>set("vorname",e.target.value)} placeholder="Adrian"/>
            </div>
            <div>
              <label className="cc-label">Nachname <span className="cc-label-req">*</span></label>
              <input className="cc-input" type="text" value={form.nachname||""} onChange={e=>set("nachname",e.target.value)} placeholder="Bürgi"/>
            </div>

            {/* Geburtsdatum / Geschlecht */}
            {(istPflicht("geburtsdatum")||istPflicht("geschlecht")) && (<>
              <div>
                <label className="cc-label">
                  Geburtsdatum {istPflicht("geburtsdatum")&&<span className="cc-label-req">*</span>}
                </label>
                <input className="cc-input" type="date" value={form.geburtsdatum||""} onChange={e=>set("geburtsdatum",e.target.value)}/>
              </div>
              <div>
                <label className="cc-label">
                  Geschlecht {istPflicht("geschlecht")&&<span className="cc-label-req">*</span>}
                </label>
                <select className="cc-input" value={form.geschlecht||""} onChange={e=>set("geschlecht",e.target.value)}>
                  <option value="">— wählen —</option>
                  {GESCHLECHT_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            </>)}

            {/* Adresse */}
            {(istPflicht("strasse")||istPflicht("plz")||istPflicht("ort")) && (
              <AdresseFormular
                strasse={form.strasse||""}
                plz={form.plz||""}
                ort={form.ort||""}
                kanton={form.kanton||""}
                onStrasse={v=>set("strasse",v)}
                onPlz={v=>set("plz",v)}
                onOrt={v=>set("ort",v)}
                onKanton={v=>set("kanton",v)}
                pflichtStrasse={istPflicht("strasse")}
                pflichtPlz={istPflicht("plz")}
                pflichtOrt={istPflicht("ort")}
              />
            )}

            {/* Telefon */}
            {istPflicht("telefon") && (
              <div className="cc-form-full">
                <label className="cc-label">Telefon <span className="cc-label-req">*</span></label>
                <PhoneInput value={form.telefon||""} onChange={v=>set("telefon",v)} showHint={false}/>
              </div>
            )}

            {/* E-Mail — immer sichtbar. Sie ist der Login-Name und darf pro
                Verein nur einmal vorkommen (Index personen_email_pro_verein).
                Früher hing die Sichtbarkeit an einer Liste von Passivtypen;
                verlangte die Matrix dort eine E-Mail, war das Formular nicht
                mehr absendbar. */}
            <div className="cc-form-full">
              <label className="cc-label">
                E-Mail {istPflicht("email")&&<span className="cc-label-req">*</span>}
              </label>
              <input className="cc-input" type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} placeholder="adrian@example.ch"/>
              <div className="cc-hint-sub">
                {istPflicht("email")
                  ? "Wird zum Login-Namen für das Portal"
                  : "Optional — ohne E-Mail kein eigener Portal-Zugang"}
              </div>
            </div>

            {/* AHV-Nr. / Nationalität / Heimatort — nur wenn konfiguriert.
                Sie standen bisher in der Prüfliste, hatten aber kein
                Eingabefeld: sobald jemand sie in der Matrix ankreuzte, war
                das Formular nicht mehr absendbar. */}
            {istPflicht("ahv_nr") && (
              <div className="cc-form-full">
                <label className="cc-label">AHV-Nr. <span className="cc-label-req">*</span></label>
                <input className="cc-input" type="text" value={form.ahv_nr||""} onChange={e=>set("ahv_nr",e.target.value)} placeholder="756.1234.5678.90"/>
              </div>
            )}
            {(istPflicht("nationalitaet")||istPflicht("heimatort")) && (<>
              <div>
                <label className="cc-label">
                  Nationalität {istPflicht("nationalitaet")&&<span className="cc-label-req">*</span>}
                </label>
                <input className="cc-input" type="text" value={form.nationalitaet||""} onChange={e=>set("nationalitaet",e.target.value)} placeholder="CH"/>
              </div>
              <div>
                <label className="cc-label">
                  Heimatort {istPflicht("heimatort")&&<span className="cc-label-req">*</span>}
                </label>
                <input className="cc-input" type="text" value={form.heimatort||""} onChange={e=>set("heimatort",e.target.value)} placeholder="Herrliberg ZH"/>
              </div>
            </>)}

            {/* Portalrolle — optional, unabhängig vom Mitgliedtyp */}
            <div className="cc-form-full">
              <label className="cc-label">Portalrolle</label>
              <select className="cc-input" value={form.rolle||""} onChange={e=>set("rolle",e.target.value)}>
                <option value="">— keine —</option>
                {portalRollen.map(r=><option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
            </div>

            <div className="cc-form-full">
              <div className="cc-info-hint">
                <TI n="info-circle" size={13}/> Alle weiteren Angaben (Spielerpass, J+S-Nr. etc.) können danach im Profil ergänzt werden.
              </div>
            </div>

            {hauptkontaktPflicht && (
              <NeuesMitgliedElternSektion
                sb={sb}
                vereinId={vereinId}
                eintraege={elternEintraege}
                setEintraege={fn => setElternEintraege(fn)}
              />
            )}


          </>)}

        </div>

        {msg && (
          <div className={`cc-badge ${msg.ok?"cc-badge-success":"cc-badge-danger"} cc-mt-8`}>{msg.text}</div>
        )}
      </div>

      <div className="cc-modal-ftr">
        <Btn onClick={handleClose}>{angelegtesKind !== null ? "Schliessen" : "Abbrechen"}</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving || !form.mitgliedtyp}>
          {saving ? "Wird gespeichert…"
            : angelegtesKind !== null ? "Elternteile erneut speichern"
            : "Mitglied anlegen"}
        </Btn>
      </div>
    </ModalOrSheet>
  );
}
