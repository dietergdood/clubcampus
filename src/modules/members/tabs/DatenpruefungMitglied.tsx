/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungMitglied.tsx
   Self-Service Datenprüfung für Mitglieder (Spieler, Trainer, Funktionäre etc.)
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { Btn, Card, PhoneInput, useAddrSearch, usePlzLookup } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { updateMitglied, FELD_LABEL } from "../../../domains/members/memberService.ts";
import { formatDatum, GESCHLECHT_OPTS } from "../../../domains/person/personUtils.ts";
import { KANTON_OPTS } from "./datenpruefungUtils.ts";
import type { Mitglied, Sb } from "../../../types.ts";
import type { StatusMeldung } from "./DatenpruefungTab.tsx";
import type { AddressSuggestion } from "../../../shared/forms/AddressInput.tsx";

/* ── Addr Dropdown mit position:fixed ── */
interface AddrDropdownProps {
  suggestions: AddressSuggestion[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (s: AddressSuggestion) => void;
  onClose: () => void;
}

function AddrDropdown({ suggestions, inputRef, onSelect, onClose }: AddrDropdownProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  }, [suggestions]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(".cc-addr-dropdown-fixed")) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (!rect || suggestions.length === 0) return null;

  return (
    <div
      className="cc-addr-dropdown-fixed"
      style={{
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      {suggestions.map((s, i) => (
        <div key={i} className="cc-addr-suggestion"
          onMouseDown={e => { e.preventDefault(); onSelect(s); onClose(); }}>
          <span className="cc-addr-suggestion-main">{s.strasse}</span>
          <span className="cc-addr-suggestion-sub">{s.plz} {s.ort}</span>
        </div>
      ))}
    </div>
  );
}

interface DatenpruefungMitgliedProps {
  raw: Mitglied;
  sb: Sb;
  setPortalMsg: (msg: StatusMeldung | null) => void;
  onReload?: (() => void) | null;
  /**
   * Pflichtfeld-SCHLUESSEL aus der Mitgliedtyp-Konfiguration (nicht Labels).
   *
   * Solange eines davon leer ist, das dieses Formular erfassen kann, bleibt
   * „Bestätigen" gesperrt. Bis zum 20.08.2026 gab es diese Prüfung nicht:
   * `profil_geprueft_at` wurde bedingungslos gesetzt, und die ganze Matrix
   * war in der Datenprüfung wirkungslos — ein grünes Häkchen ohne Deckung.
   *
   * Leer gelassen (Standard) verhält sich die Komponente wie zuvor. Das ist
   * kein Schlupfloch, sondern der Ladezustand: wer die Konfiguration noch
   * nicht hat, darf nichts verlangen.
   */
  pflichtfelder?: string[];
}

export function DatenpruefungMitglied({ raw, sb, setPortalMsg, onReload, pflichtfelder = [] }: DatenpruefungMitgliedProps) {
  const [form, setForm] = useState({
    vorname:      raw.vorname      || "",
    nachname:     raw.nachname     || "",
    geburtsdatum: raw.geburtsdatum || "",
    nationalitaet:raw.nationalitaet|| "",
    nationalitaet2:raw.nationalitaet2||"",
    /* Ergaenzt am 20.08.2026: beide sind in der Mitgliedtyp-Konfiguration
       als Pflicht einstellbar, hatten hier aber kein Eingabefeld. Ein Feld,
       das Pflicht sein kann, braucht eines — sonst blockiert die Pruefung
       ein Formular, das den Wert gar nicht erfassen kann. */
    geschlecht:   raw.geschlecht   || "",
    heimatort:    raw.heimatort    || "",
    strasse:      raw.strasse      || "",
    plz:          raw.plz          || "",
    ort:          raw.ort          || "",
    kanton:       raw.kanton       || "",
    telefon:      raw.telefon      || "",
    ahv_nr:       raw.ahv_nr       || "",
  });
  const [ahvVisible, setAhvVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const strasseRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  /* Adress-Autocomplete */
  const addrSuggestions = useAddrSearch(form.strasse, form.plz);
  usePlzLookup(form.plz, (r) => setForm(p => ({ ...p, ort: r.ort, kanton: r.kanton || p.kanton })));

  function applyAddrSuggestion(s: AddressSuggestion) {
    setForm(p => ({ ...p, strasse: s.strasse, plz: s.plz, ort: s.ort, kanton: s.kanton }));
    setShowSuggestions(false);
  }

  async function speichernUndBestaetigen() {
    if (!sb) return;
    /* Auch hier prüfen, nicht nur am Knopf: ein deaktivierter Knopf ist eine
       Bequemlichkeit, keine Zusicherung. */
    if (fehlendSelbst.length > 0) {
      setPortalMsg({ ok: false, text: `Bitte zuerst ausfüllen: ${fehlendSelbst.map(k => FELD_LABEL[k] || k).join(", ")}` });
      return;
    }
    setSaving(true);
    const err = await updateMitglied(sb, raw.id, {
      vorname:       form.vorname       || undefined,
      nachname:      form.nachname      || undefined,
      geburtsdatum:  form.geburtsdatum  || undefined,
      nationalitaet: form.nationalitaet || undefined,
      nationalitaet2:form.nationalitaet2|| undefined,
      strasse:       form.strasse       || undefined,
      plz:           form.plz           || undefined,
      ort:           form.ort           || undefined,
      kanton:        form.kanton        || undefined,
      telefon:       form.telefon       || undefined,
      ahv_nr:        form.ahv_nr        || undefined,
      geschlecht:    form.geschlecht    || undefined,
      heimatort:     form.heimatort     || undefined,
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

  /* ── Was fehlt, und wer kann es füllen? ─────────────────────────────────
     Getrennt nach ZUSTÄNDIGKEIT, nicht nach Bearbeitbarkeit:

       selbst      Personendaten, die dieses Formular erfasst → sperren
       Verwaltung  alles andere (E-Mail ist hier schreibgeschützt, Spielerpass
                   und Fairgate-ID gehören ohnehin dem Verein) → nur nennen

     Ein Mitglied für Felder zu sperren, die es gar nicht ändern kann, wäre
     eine Sackgasse — und ein Feld, das Pflicht sein kann, braucht ein
     Eingabefeld (CLAUDE.md). Deshalb wurden am 20.08.2026 Geschlecht und
     Heimatort ergänzt; E-Mail bleibt bewusst schreibgeschützt, weil sie der
     Login-Name ist.

     Gerechnet wird gegen `form`, nicht gegen `raw`: sonst bliebe der Knopf
     gesperrt, bis jemand neu lädt. */
  const fehlendSelbst = pflichtfelder.filter(
    k => k in form && !String((form as Record<string, string>)[k] ?? "").trim());
  const fehlendVerwaltung = pflichtfelder.filter(k => {
    if (k in form) return false;
    const w = (raw as unknown as Record<string, unknown>)[k];
    return w === null || w === undefined || (typeof w === "string" && !w.trim());
  });
  const kannBestaetigen = fehlendSelbst.length === 0;

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

        {fehlendSelbst.length > 0 && (
          <div className="cc-mb-16" style={{padding:"10px 14px",borderRadius:10,background:"var(--warn-bg,#FFFBEB)",border:"0.5px solid var(--border)"}}>
            <div className="cc-text-sm cc-text-bold">Noch auszufüllen</div>
            <div className="cc-text-sm">{fehlendSelbst.map(k => FELD_LABEL[k] || k).join(" · ")}</div>
          </div>
        )}

        {/* Getrennt genannt, nicht mit dem Obigen vermischt: hier kann das
            Mitglied nichts tun, und ein Hinweis, den man nicht befolgen kann,
            gehoert als solcher gekennzeichnet. */}
        {fehlendVerwaltung.length > 0 && (
          <div className="cc-mb-16" style={{padding:"10px 14px",borderRadius:10,border:"0.5px solid var(--border)"}}>
            <div className="cc-text-sm cc-text-bold">Fehlt noch, kann hier aber nicht geändert werden</div>
            <div className="cc-text-sm">{fehlendVerwaltung.map(k => FELD_LABEL[k] || k).join(" · ")}</div>
            <div className="cc-text-xs cc-text-sub cc-mt-4">Bitte die Vereinsverwaltung um Ergänzung bitten. Das Bestätigen ist trotzdem möglich.</div>
          </div>
        )}

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
          <div>
            <label className="cc-label">Geschlecht</label>
            <select className="cc-input" value={form.geschlecht} onChange={e => set("geschlecht", e.target.value)}>
              <option value="">– wählen –</option>
              {GESCHLECHT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div>
            <label className="cc-label">Heimatort</label>
            <input className="cc-input" value={form.heimatort} onChange={e => set("heimatort", e.target.value)} placeholder="z.B. Herrliberg ZH"/>
          </div>

          {/* Adresse mit Autocomplete */}
          <div className="cc-form-full">
            <label className="cc-label">Strasse</label>
            <input
              ref={strasseRef}
              className="cc-input"
              value={form.strasse}
              onChange={e => { set("strasse", e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Strasse suchen…"
            />
            {showSuggestions && addrSuggestions.length > 0 && (
              <AddrDropdown
                suggestions={addrSuggestions}
                inputRef={strasseRef}
                onSelect={applyAddrSuggestion}
                onClose={() => setShowSuggestions(false)}
              />
            )}
          </div>
          <div>
            <label className="cc-label">PLZ</label>
            <input className="cc-input" value={form.plz}
              onChange={e => set("plz", e.target.value)}/>
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

          {/* AHV-Nummer editierbar mit Sichtbarkeits-Toggle */}
          <div className="cc-form-full">
            <label className="cc-label">AHV-Nummer</label>
            <div className="cc-relative">
              <input
                className="cc-input"
                type={ahvVisible ? "text" : "password"}
                value={form.ahv_nr}
                onChange={e => set("ahv_nr", e.target.value)}
                placeholder="756.XXXX.XXXX.XX"
                style={{paddingRight: 80}}
              />
              <button
                className="cc-btn-ghost cc-text-xs"
                style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)"}}
                onClick={() => setAhvVisible(v => !v)}
                type="button"
              >
                <TI n={ahvVisible ? "eye-off" : "eye"} size={14}/> {ahvVisible ? "ausblenden" : "anzeigen"}
              </button>
            </div>
          </div>
        </div>

        <div className="cc-row cc-gap-8 cc-justify-end cc-mt-16">
          <Btn variant="primary" onClick={speichernUndBestaetigen} disabled={saving || !kannBestaetigen}>
            {saving ? "Speichert…" : "Speichern und bestätigen ✓"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
