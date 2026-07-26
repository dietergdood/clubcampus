/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungEltern.tsx
   Self-Service Datenprüfung für Elternkontakte
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, PhoneInput, useAddrSearch, usePlzLookup } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { updateMitglied } from "../../../domains/members/memberService.ts";
import { updateElternkontakt } from "../../../domains/members/elternService.ts";
import { vollname, formatDatum } from "../../../domains/person/personUtils.ts";
import { KANTON_OPTS } from "./datenpruefungUtils.ts";
import type { Mitglied, Sb } from "../../../types.ts";
import type { StatusMeldung } from "./DatenpruefungTab.tsx";

interface ElternkontaktMitKind {
  id: string;
  vorname?: string | null;
  nachname?: string | null;
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  beziehung?: string | null;
  profil_geprueft_at?: string | null;
}

interface KindForm {
  mitglied_id: number;
  name: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  nationalitaet: string;
  strasse: string;
  plz: string;
  ort: string;
  kanton: string;
  ahv_nr: string | null;
  ahvVisible: boolean;
}

interface DatenpruefungElternProps {
  raw: Mitglied;
  sb: Sb;
  elternkontakt: ElternkontaktMitKind;
  kinder: Mitglied[];
  setPortalMsg: (msg: StatusMeldung | null) => void;
  onReload?: (() => void) | null;
}

export function DatenpruefungEltern({ raw, sb, elternkontakt, kinder, setPortalMsg, onReload }: DatenpruefungElternProps) {
  const [elternForm, setElternForm] = useState({
    vorname:  elternkontakt.vorname  || "",
    nachname: elternkontakt.nachname || "",
    telefon:  elternkontakt.telefon  || "",
  });

  const [kinderForms, setKinderForms] = useState<KindForm[]>(
    kinder.map(k => ({
      mitglied_id:   k.id,
      name:          vollname(k),
      vorname:       k.vorname       || "",
      nachname:      k.nachname      || "",
      geburtsdatum:  k.geburtsdatum  || "",
      nationalitaet: k.nationalitaet || "",
      strasse:       k.strasse       || "",
      plz:           k.plz           || "",
      ort:           k.ort           || "",
      kanton:        k.kanton        || "",
      ahv_nr:        k.ahv_nr        || null,
      ahvVisible:    false,
    }))
  );

  const [saving, setSaving] = useState(false);

  function setKindField(idx: number, k: keyof KindForm, v: string | boolean) {
    setKinderForms(prev => prev.map((f, i) => i === idx ? { ...f, [k]: v } : f));
  }

  async function alleBestaetigen() {
    if (!sb) return;
    setSaving(true);

    /* Eigene Kontaktdaten speichern */
    await updateElternkontakt(sb, elternkontakt.id, {
      vorname:  elternForm.vorname  || null,
      nachname: elternForm.nachname || null,
      telefon:  elternForm.telefon  || null,
      profil_geprueft_at: new Date().toISOString(),
    });

    /* Kinder-Daten speichern + profil_geprueft_at setzen */
    for (const kf of kinderForms) {
      await updateMitglied(sb, kf.mitglied_id, {
        vorname:       kf.vorname       || null,
        nachname:      kf.nachname      || null,
        geburtsdatum:  kf.geburtsdatum  || null,
        nationalitaet: kf.nationalitaet || null,
        strasse:       kf.strasse       || null,
        plz:           kf.plz           || null,
        ort:           kf.ort           || null,
        kanton:        kf.kanton        || null,
        profil_geprueft_at: new Date().toISOString(),
      });
    }

    setSaving(false);
    setPortalMsg({ ok: true, text: "Alles bestätigt ✓" });
    if (onReload) setTimeout(onReload, 500);
  }

  return (
    <div className="cc-col cc-gap-16">
      {/* Profil-Status */}
      <Card>
        <div className="cc-between">
          <div>
            <div className="cc-text-bold cc-text-lg">Profil-Status</div>
            <div className="cc-text-sm cc-mt-4">
              {elternkontakt.profil_geprueft_at
                ? `Zuletzt bestätigt am ${formatDatum(elternkontakt.profil_geprueft_at)}`
                : "Noch nie bestätigt"}
            </div>
          </div>
          <span className={`cc-badge ${elternkontakt.profil_geprueft_at ? "cc-badge-success" : "cc-badge-warning"}`}>
            {elternkontakt.profil_geprueft_at ? "Geprüft" : "Ausstehend"}
          </span>
        </div>
      </Card>

      {/* Eigene Kontaktdaten */}
      <Card>
        <div className="cc-text-bold cc-text-lg cc-mb-4">Meine Kontaktdaten</div>
        <div className="cc-text-sm cc-text-sub cc-mb-16">Prüfe deine eigenen Angaben.</div>
        <div className="cc-form-row">
          <div>
            <label className="cc-label">Vorname</label>
            <input className="cc-input" value={elternForm.vorname} onChange={e => setElternForm(p => ({ ...p, vorname: e.target.value }))}/>
          </div>
          <div>
            <label className="cc-label">Nachname</label>
            <input className="cc-input" value={elternForm.nachname} onChange={e => setElternForm(p => ({ ...p, nachname: e.target.value }))}/>
          </div>
          <div className="cc-form-full">
            <label className="cc-label">E-Mail</label>
            <input className="cc-input" value={elternkontakt.email || ""} disabled style={{opacity:0.6}}/>
            <div className="cc-text-xs cc-text-sub cc-mt-4">E-Mail-Adresse nur durch den Administrator änderbar</div>
          </div>
          <div className="cc-form-full">
            <label className="cc-label">Telefon</label>
            <PhoneInput value={elternForm.telefon} onChange={v => setElternForm(p => ({ ...p, telefon: v }))} showHint={false}/>
          </div>
        </div>
      </Card>

      {/* Pro Kind eine Card */}
      {kinderForms.map((kf, idx) => (
        <KindCard key={kf.mitglied_id} kf={kf} idx={idx} setKindField={setKindField}/>
      ))}

      <div className="cc-row cc-gap-8 cc-justify-end">
        <Btn variant="primary" onClick={alleBestaetigen} disabled={saving}>
          {saving ? "Speichert…" : "Alles geprüft und korrekt ✓"}
        </Btn>
      </div>
    </div>
  );
}

/* ── Kind-Card ── */
interface KindCardProps {
  kf: KindForm;
  idx: number;
  setKindField: (idx: number, k: keyof KindForm, v: string | boolean) => void;
}

function KindCard({ kf, idx, setKindField }: KindCardProps) {
  const addrSuggestions = useAddrSearch(kf.strasse, kf.plz);
  const plzResult = usePlzLookup(kf.plz);

  function applyAddr(s: { strasse: string; plz: string; ort: string; kanton: string }) {
    setKindField(idx, "strasse", s.strasse);
    setKindField(idx, "plz", s.plz);
    setKindField(idx, "ort", s.ort);
    setKindField(idx, "kanton", s.kanton);
  }

  return (
    <Card>
      <div className="cc-row cc-gap-8 cc-items-center cc-mb-16">
        <div className="cc-av cc-av-sm" style={{background:"var(--cc-accent)",color:"#000",fontSize:11,fontWeight:700}}>
          {kf.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
        </div>
        <div className="cc-text-bold cc-text-lg">{kf.name}</div>
      </div>
      <div className="cc-form-row">
        <div>
          <label className="cc-label">Vorname</label>
          <input className="cc-input" value={kf.vorname} onChange={e => setKindField(idx, "vorname", e.target.value)}/>
        </div>
        <div>
          <label className="cc-label">Nachname</label>
          <input className="cc-input" value={kf.nachname} onChange={e => setKindField(idx, "nachname", e.target.value)}/>
        </div>
        <div>
          <label className="cc-label">Geburtsdatum</label>
          <input className="cc-input" type="date" value={kf.geburtsdatum} onChange={e => setKindField(idx, "geburtsdatum", e.target.value)}/>
        </div>
        <div>
          <label className="cc-label">Nationalität</label>
          <input className="cc-input" value={kf.nationalitaet} onChange={e => setKindField(idx, "nationalitaet", e.target.value)} placeholder="z.B. Schweiz"/>
        </div>

        <div className="cc-form-full cc-relative">
          <label className="cc-label">Strasse</label>
          <input className="cc-input" value={kf.strasse}
            onChange={e => setKindField(idx, "strasse", e.target.value)}
            placeholder="Strasse suchen…"/>
          {addrSuggestions.length > 0 && (
            <div className="cc-addr-dropdown">
              {addrSuggestions.map((s, i) => (
                <div key={i} className="cc-addr-option" onClick={() => applyAddr(s)}>
                  {s.strasse}, {s.plz} {s.ort}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="cc-label">PLZ</label>
          <input className="cc-input" value={kf.plz}
            onChange={e => {
              setKindField(idx, "plz", e.target.value);
              if (plzResult) {
                setKindField(idx, "ort", plzResult.ort);
                setKindField(idx, "kanton", plzResult.kanton);
              }
            }}/>
        </div>
        <div>
          <label className="cc-label">Ort</label>
          <input className="cc-input" value={kf.ort} onChange={e => setKindField(idx, "ort", e.target.value)}/>
        </div>
        <div>
          <label className="cc-label">Kanton</label>
          <select className="cc-input" value={kf.kanton} onChange={e => setKindField(idx, "kanton", e.target.value)}>
            <option value="">– wählen –</option>
            {KANTON_OPTS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* AHV read-only */}
        <div className="cc-form-full">
          <label className="cc-label">AHV-Nummer</label>
          <div className="cc-row cc-gap-8 cc-items-center cc-input" style={{opacity:0.8}}>
            <span className="cc-flex-1" style={{letterSpacing:"0.08em"}}>
              {kf.ahvVisible ? (kf.ahv_nr || "—") : "• • • • • • • • •"}
            </span>
            <button className="cc-btn-ghost cc-text-xs" onClick={() => setKindField(idx, "ahvVisible", !kf.ahvVisible)}>
              <TI n={kf.ahvVisible ? "eye-off" : "eye"} size={14}/> {kf.ahvVisible ? "ausblenden" : "anzeigen"}
            </button>
          </div>
          <div className="cc-text-xs cc-text-sub cc-mt-4">Nur lesbar — Änderungen durch den Administrator</div>
        </div>
      </div>
    </Card>
  );
}
