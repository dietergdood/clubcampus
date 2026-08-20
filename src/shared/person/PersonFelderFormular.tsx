/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/person/PersonFelderFormular.tsx

   Die Personenfelder als Formular, gesteuert von der
   Feldkonfiguration.

   Sie bekommt eine Konfiguration und einen Datensatz und rendert
   daraus die sichtbaren Felder — mehr weiss sie nicht. Kein
   Speichern, keine Bestätigung, keine Sperre eines Knopfs: die
   Datenprüfung ist ein eigener Ablauf (eine Aufforderung mit
   Bestätigung, halbjährlich), die Personenseite eine Profilseite.
   Gemeinsam ist allein die Felddarstellung.

   ⚠ WARUM GEMEINSAM. Dieselben Felder derselben Menschen werden
   an drei Stellen gezeigt: Datenprüfung des Mitglieds, Datenprüfung
   des Elternteils (für sich und für jedes Kind) und — unmittelbar
   danach — die Personenseite. Ohne gemeinsame Komponente stünden
   drei Formulare für dieselbe Sache nebeneinander, und die nächste
   Feldänderung müsste an allen dreien gemacht werden. Genau die
   Sorte Dublette, die `cc.css` heute zehnmal hat.

   Sie liegt unter `shared/person/`, weil die Personenseite ohnehin
   dorthin zieht.
   ═══════════════════════════════════════════════════════════════ */
import { useId, useState } from "react";
import { PhoneInput, useAddrSearch, usePlzLookup } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import { GESCHLECHT_OPTS, KANTONE } from "../../domains/person/personUtils.ts";
import {
  FELD_REGISTRY, istPflicht, istSichtbar, labelFuer,
  type FeldModus,
} from "../../domains/members/feldkonfig.ts";

/** Nur Felder, die dieses Formular darstellen kann. Bereiche und Tabs
    (`teams`, `notizen`, `tab_*`) sind keine Eingaben. */
export const FORMULAR_FELDER = [
  "vorname", "nachname", "geburtsdatum", "geschlecht",
  "nationalitaet", "nationalitaet2", "heimatort", "ahv_nr",
  "email", "telefon", "strasse", "plz", "ort", "kanton",
] as const;

const DARSTELLBAR: ReadonlySet<string> = new Set(FORMULAR_FELDER);

export type FelderWerte = Record<string, string>;

/**
 * Eine Datenbankzeile in Formularwerte übersetzen.
 *
 * ⚠ Immer ALLE darstellbaren Felder, nicht nur die sichtbaren: was die
 * Konfiguration ausblendet, soll beim Speichern unverändert bleiben und nicht
 * als "" ankommen. Der Vergleich gegen die Ausgangswerte (siehe `geaenderte`)
 * findet dann von selbst nichts.
 */
export function werteAusZeile(zeile: Record<string, unknown> | null | undefined): FelderWerte {
  const werte: FelderWerte = {};
  for (const k of FORMULAR_FELDER) {
    const v = zeile?.[k];
    werte[k] = v == null ? "" : String(v);
  }
  return werte;
}

/**
 * Nur was sich geändert hat — leere Eingaben als `null`.
 *
 * Ein `update` mit unveränderten Werten schriebe `updated_at` fort und sähe
 * im Verlauf wie eine Bearbeitung aus, die nie stattgefunden hat.
 */
export function geaenderte(werte: FelderWerte, ausgang: FelderWerte): Record<string, string | null> {
  const diff: Record<string, string | null> = {};
  for (const k of FORMULAR_FELDER) {
    if ((werte[k] ?? "") !== (ausgang[k] ?? "")) diff[k] = werte[k].trim() || null;
  }
  return diff;
}

export interface PersonFelderFormularProps {
  /** Modus je Schlüssel — aus `getFeldkonfig()`. */
  konfig: Record<string, FeldModus>;
  werte: FelderWerte;
  onChange: (schluessel: string, wert: string) => void;
  /**
   * Schlüssel, die dieses Formular nicht schreiben darf. Sie werden
   * angezeigt, aber gesperrt — mit einem Satz, wer sie ändern kann.
   *
   * ⚠ Anzeigen und nicht weglassen: ein Feld, das verschwindet, ist von
   * einem nicht konfigurierten nicht zu unterscheiden. Wer seine E-Mail
   * sucht und sie nirgends findet, meldet einen Fehler.
   */
  gesperrt?: ReadonlySet<string>;
  /** Beschriftung des Hinweises an einem gesperrten Feld. */
  gesperrtHinweis?: string;
  /** Ohne Schreibrecht ist alles nur lesbar. */
  canEdit?: boolean;
}

export function PersonFelderFormular({
  konfig, werte, onChange,
  gesperrt = new Set<string>(),
  gesperrtHinweis = "Änderungen durch die Vereinsverwaltung",
  canEdit = true,
}: PersonFelderFormularProps) {
  const [ahvSichtbar, setAhvSichtbar] = useState(false);
  const [zeigeVorschlaege, setZeigeVorschlaege] = useState(false);

  /* ⚠ Ein `<label>` ohne `htmlFor` ist nur Text daneben: der Klick setzt
     keinen Fokus, und der Screenreader liest ein Feld ohne Namen vor. Bis zum
     21.08.2026 stand es hier so — aufgefallen erst, als ein Test das Feld
     ueber seine Beschriftung suchen wollte und es nicht fand.

     `useId()` statt einer Prop, weil dasselbe Formular auf einer Seite
     mehrfach steht (Elternteil + je ein Kind) und doppelte Ids die
     Verknuepfung wieder zerstoerten. */
  const uid = useId();
  const feldId = (schluessel: string) => `${uid}-${schluessel}`;

  const vorschlaege = useAddrSearch(werte.strasse, werte.plz);
  /* PLZ füllt Ort und Kanton. Deshalb steht "Gibt es nicht" in der
     Konfiguration nur am Adressblock als Ganzem (ADRESS_FELDER) — einzeln
     abschaltbar wäre es ein Formular, das sich selbst die Eingabe wegnimmt. */
  usePlzLookup(werte.plz, r => {
    onChange("ort", r.ort);
    if (r.kanton) onChange("kanton", r.kanton);
  });

  /* Reihenfolge der Registry, damit die Felder überall gleich stehen und
     eine Fehlermeldung nicht von der Zeilenreihenfolge der Datenbank
     abhängt. */
  const felder = FELD_REGISTRY
    .filter(e => DARSTELLBAR.has(e.schluessel))
    .filter(e => istSichtbar(konfig, e.schluessel));

  function feldEingabe(schluessel: string) {
    const aus = !canEdit || gesperrt.has(schluessel);
    const wert = werte[schluessel] ?? "";
    const setzen = (v: string) => onChange(schluessel, v);

    if (schluessel === "telefon") {
      return aus
        ? <input id={feldId(schluessel)} className="cc-input" value={wert} disabled readOnly style={{ opacity: 0.6 }}/>
        : <PhoneInput id={feldId(schluessel)} value={wert} onChange={setzen} showHint={false}/>;
    }

    if (schluessel === "geschlecht" || schluessel === "kanton") {
      const opts = schluessel === "geschlecht"
        ? GESCHLECHT_OPTS.map(o => ({ v: o.v, l: o.l }))
        : KANTONE.map(k => ({ v: k, l: k }));
      return (
        <select id={feldId(schluessel)} className="cc-input" value={wert} disabled={aus}
                onChange={e => setzen(e.target.value)}>
          <option value="">– wählen –</option>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      );
    }

    if (schluessel === "ahv_nr") {
      /* Maskiert bleibt sie, schreibbar wird sie: die Nummer steht auf der
         Krankenkassenkarte des Kindes — der Elternteil hat sie, die
         Verwaltung nicht. Ohne diesen Weg bleiben 372 Junioren gesperrt. */
      return (
        <div className="cc-row cc-gap-6">
          <input id={feldId(schluessel)} className="cc-input" style={{ flex: 1 }}
                 type={ahvSichtbar ? "text" : "password"}
                 value={wert} disabled={aus}
                 onChange={e => setzen(e.target.value)}/>
          <button type="button" className="cc-btn-ghost cc-text-xs"
                  onClick={() => setAhvSichtbar(v => !v)}>
            <TI n={ahvSichtbar ? "eye-off" : "eye"} size={14}/>
          </button>
        </div>
      );
    }

    if (schluessel === "strasse") {
      return (
        <div className="cc-relative">
          <input id={feldId(schluessel)} className="cc-input" value={wert} disabled={aus}
                 placeholder="Strasse suchen…"
                 onChange={e => { setzen(e.target.value); setZeigeVorschlaege(true); }}
                 onFocus={() => setZeigeVorschlaege(true)}/>
          {zeigeVorschlaege && !aus && vorschlaege.length > 0 && (
            <div className="cc-addr-dropdown">
              {vorschlaege.map((s, i) => (
                <div key={i} className="cc-addr-suggestion"
                     onMouseDown={e => {
                       e.preventDefault();
                       onChange("strasse", s.strasse);
                       onChange("plz", s.plz);
                       onChange("ort", s.ort);
                       onChange("kanton", s.kanton);
                       setZeigeVorschlaege(false);
                     }}>
                  <span className="cc-addr-suggestion-main">{s.strasse}</span>
                  <span className="cc-addr-suggestion-sub">{s.plz} {s.ort}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <input id={feldId(schluessel)} className="cc-input"
             type={schluessel === "geburtsdatum" ? "date" : "text"}
             value={wert} disabled={aus}
             style={aus ? { opacity: 0.6 } : undefined}
             onChange={e => setzen(e.target.value)}/>
    );
  }

  return (
    <div className="cc-form-row">
      {felder.map(e => {
        const voll = e.schluessel === "strasse" || e.schluessel === "email";
        return (
          <div key={e.schluessel} className={voll ? "cc-form-full" : undefined}>
            <label className="cc-label" htmlFor={feldId(e.schluessel)}>
              {labelFuer(e.schluessel)}
              {istPflicht(konfig, e.schluessel) && <span className="cc-label-req"> *</span>}
            </label>
            {feldEingabe(e.schluessel)}
            {gesperrt.has(e.schluessel) && (
              <div className="cc-text-xs cc-text-sub cc-mt-4">{gesperrtHinweis}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
