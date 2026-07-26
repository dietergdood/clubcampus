/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungMitglied.tsx
   Self-Service Datenprüfung für Mitglieder (Spieler, Trainer, Funktionäre etc.)
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Btn, Card, PhoneInput, useAddrSearch, usePlzLookup } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { updateMitglied } from "../../../domains/members/memberService.ts";
import { formatDatum } from "../../../domains/person/personUtils.ts";
import { KANTON_OPTS } from "./datenpruefungUtils.ts";
import type { Mitglied, Sb } from "../../../types.ts";
import type { StatusMeldung } from "./DatenpruefungTab.tsx";

interface DatenpruefungMitgliedProps {
  raw: Mitglied;
  sb: Sb;
  setPortalMsg: (msg: StatusMeldung | null) => void;
  onReload?: (() => void) | null;
}

export function DatenpruefungMitglied({ raw, sb, setPortalMsg, onReload }: DatenpruefungMitgliedProps) {
  const [form, setForm] = useState({
    vorname:      raw.vorname      || "",
    nachname:     raw.nachname     || "",
    geburtsdatum: raw.geburtsdatum || "",
    nationalitaet:raw.nationalitaet|| "",
    nationalitaet2:raw.nationalitaet2||"",
    strasse:      raw.strasse      || "",
    plz:          raw.plz          || "",
    ort:          raw.ort          || "",
    kanton:       raw.kanton       || "",
    telefon:      raw.telefon      || "",
  });
  const [ahvVisible, setAhvVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  /* Adress-Autocomplete */
  const addrSuggestions = useAddrSearch(form.strasse, form.plz);
  const plzResult = usePlzLookup(form.plz);

  function applyAddrSuggestion(s: { strasse: string; plz: string; ort: string; kanton: string }) {
    setForm(p => ({ ...p, strasse: s.strasse, plz: s.plz, ort: s.ort, kanton: s.kanton }));
  }

  async function speichernUndBestaetigen() {
    if (!sb) return;
    setSaving(true);
    const err = await updateMitglied(sb, raw.id, {
      vorname:       form.vorname       || null,
      nachname:      form.nachname      || null,
      geburtsdatum:  form.geburtsdatum  || null,
      nationalitaet: form.nationalitaet || null,
      nationalitaet2:form.nationalitaet2|| null,
      strasse:       form.strasse       || null,
      plz:           form.plz           || null,
      ort:           form.ort           || null,
      kanton:        form.kanton        || null,
      telefon:       form.telefon       || null,
      profil_geprueft_at: new Date().toISOString(),
    });
    setSaving(false);
    if (err) {
      setPortalMsg({ ok: false, text: "Fehler beim Speichern" });
    } else {
      setPortalMsg({ ok: true, text: "Profil bestätigt ✓" });
      if (onReload) setTimeout(onReload, 500);
    }
  }

  const telefonFehlt = !form.telefon;

  return (
    <div className="cc-col cc-gap-16">
      <Card>
        <div className="cc-between">
          <div>
            <div className="cc-text-bold cc-text-lg">Profil-Status</div>
            <div className="cc-text-sm cc-mt-4">
              {raw.profil_geprueft_at
                ? `Zuletzt bestätigt am ${formatDatum(raw.profil_geprueft_at)}`
                : "Noch nie bestätigt"}
            </div>
          </div>
          <span className={`cc-badge ${raw.profil_geprueft_at ? "cc-badge-success" : "cc-badge-warning"}`}>
            {raw.profil_geprueft_at ? "Geprüft" : "Ausstehend"}
          </span>
        </div>
      </Card>

      <Card>
        <div className="cc-text-bold cc-text-lg cc-mb-4">Daten prüfen und bestätigen</div>
        <div className="cc-text-sm cc-text-sub cc-mb-16">Prüfe deine Angaben — korrigiere falls nötig, dann bestätige.</div>

        <div className="cc-form-row">
          <div>
            <label className="cc-label">Vorname <span className="cc-label-req">*</span></label>
            <input className="cc-input" value={form.vorname} onChange={e => set("vorname", e.target.value)}/>
          </div>
          <div>
            <label className="cc-label">Nachname <span className="cc-label-req">*</span></label>
            <input className="cc-input" value={form.nachname} onChange={e => set("nachname", e.target.value)}/>
          </div>
          <div>
            <label className="cc-label">Geburtsdatum</label>
            <input className="cc-input" type="date" value={form.geburtsdatum} onChange={e => set("geburtsdatum", e.target.value)}/>
          </div>
          <div>
            <label className="cc-label">Nationalität</label>
            <input className="cc-input" value={form.nationalitaet} onChange={e => set("nationalitaet", e.target.value)} placeholder="z.B. Schweiz"/>
          </div>

          {/* Adresse mit Autocomplete */}
          <div className="cc-form-full cc-relative">
            <label className="cc-label">Strasse</label>
            <input className="cc-input" value={form.strasse}
              onChange={e => set("strasse", e.target.value)}
              placeholder="Strasse suchen…"/>
            {addrSuggestions.length > 0 && (
              <div className="cc-addr-dropdown">
                {addrSuggestions.map((s, i) => (
                  <div key={i} className="cc-addr-option" onClick={() => applyAddrSuggestion(s)}>
                    {s.strasse}, {s.plz} {s.ort}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="cc-label">PLZ</label>
            <input className="cc-input" value={form.plz}
              onChange={e => {
                set("plz", e.target.value);
                if (plzResult) setForm(p => ({ ...p, ort: plzResult.ort, kanton: plzResult.kanton }));
              }}/>
          </div>
          <div>
            <label className="cc-label">Ort</label>
            <input className="cc-input" value={form.ort} onChange={e => set("ort", e.target.value)}/>
          </div>
          <div>
            <label className="cc-label">Kanton</label>
            <select className="cc-input" value={form.kanton} onChange={e => set("kanton", e.target.value)}>
              <option value="">– wählen –</option>
              {KANTON_OPTS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* E-Mail read-only */}
          <div className="cc-form-full">
            <label className="cc-label">E-Mail</label>
            <input className="cc-input" value={raw.email || ""} disabled style={{opacity:0.6}}/>
            <div className="cc-text-xs cc-text-sub cc-mt-4">E-Mail-Adresse nur durch den Administrator änderbar</div>
          </div>

          {/* Telefon mit PhoneInput */}
          <div className="cc-form-full">
            <label className="cc-label">Telefon {telefonFehlt && <span className="cc-label-req">*</span>}</label>
            <PhoneInput value={form.telefon} onChange={v => set("telefon", v)} showHint={false}/>
            {telefonFehlt && <div className="cc-text-xs cc-text-warning cc-mt-4">Pflichtfeld — bitte ergänze deine Nummer</div>}
          </div>

          {/* AHV read-only mit Auge */}
          <div className="cc-form-full">
            <label className="cc-label">AHV-Nummer</label>
            <div className="cc-row cc-gap-8 cc-items-center cc-input" style={{opacity:0.8}}>
              <span className="cc-flex-1" style={{letterSpacing:"0.08em"}}>
                {ahvVisible ? (raw.ahv_nr || "—") : "• • • • • • • • •"}
              </span>
              <button className="cc-btn-ghost cc-text-xs" onClick={() => setAhvVisible(v => !v)}>
                <TI n={ahvVisible ? "eye-off" : "eye"} size={14}/> {ahvVisible ? "ausblenden" : "anzeigen"}
              </button>
            </div>
            <div className="cc-text-xs cc-text-sub cc-mt-4">Nur lesbar — Änderungen durch den Administrator</div>
          </div>
        </div>

        <div className="cc-row cc-gap-8 cc-justify-end cc-mt-16">
          <Btn variant="primary" onClick={speichernUndBestaetigen} disabled={saving}>
            {saving ? "Speichert…" : "Speichern und bestätigen ✓"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
