/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungTab.tsx
   Router: Admin-Sicht / Spieler Self-Service / Eltern Self-Service
   ═══════════════════════════════════════════════════════════════ */
import { Card, Chip } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { GN, AM } from "../../../constants.ts";
import { updateMitglied } from "../../../domains/members/memberService.ts";
import { formatDatum } from "../../../domains/person/personUtils.ts";
import { DatenpruefungMitglied } from "./DatenpruefungMitglied.tsx";
import { DatenpruefungEltern } from "./DatenpruefungEltern.tsx";
import type { Mitglied, Sb } from "../../../types.ts";

export interface StatusMeldung {
  ok: boolean;
  text: string;
}

interface DatenpruefungTabProps {
  raw: Mitglied;
  sb: Sb;
  role?: string;
  portalMsg?: StatusMeldung | null;
  setPortalMsg: (msg: StatusMeldung | null) => void;
  onReload?: (() => void) | null;
  /** Pflichtfeld-Schlüssel des Mitgliedtyps — vom Profil durchgereicht.
      Ohne sie verhält sich die Maske wie vor dem 20.08.2026 und verlangt
      nichts (Ladezustand). */
  pflichtfelder?: string[];
  /* Eltern-Sicht: eigener Elternkontakt + verknüpfte Kinder */
  elternkontakt?: {
    id: string;
    vorname?: string | null;
    nachname?: string | null;
    name?: string | null;
    email?: string | null;
    telefon?: string | null;
    beziehung?: string | null;
    profil_geprueft_at?: string | null;
  } | null;
  kinder?: Mitglied[];
}

function DatenpruefungTab({ raw, sb, role, portalMsg, setPortalMsg, onReload, pflichtfelder = [], elternkontakt, kinder }: DatenpruefungTabProps) {

  /* Eltern Self-Service */
  if (role === "eltern" && elternkontakt) {
    return (
      <DatenpruefungEltern
        raw={raw} sb={sb}
        elternkontakt={elternkontakt}
        kinder={kinder || []}
        setPortalMsg={setPortalMsg}
        onReload={onReload}
      />
    );
  }

  /* Mitglied Self-Service (Spieler, Trainer, Funktionär etc.) */
  if (role === "spieler" || role === "trainer" || role === "funktionaer" || role === "funktionär") {
    return (
      <DatenpruefungMitglied
        raw={raw} sb={sb}
        pflichtfelder={pflichtfelder}
        setPortalMsg={setPortalMsg}
        onReload={onReload}
      />
    );
  }

  /* Admin-Sicht (default) */
  const felder = [
    { l: "Vorname",      ok: !!raw.vorname },
    { l: "Nachname",     ok: !!raw.nachname },
    { l: "Geburtsdatum", ok: !!raw.geburtsdatum },
    { l: "Nationalität", ok: !!raw.nationalitaet },
    { l: "Adresse",      ok: !!(raw.strasse && raw.plz && raw.ort) },
    { l: "E-Mail",       ok: !!raw.email },
    { l: "Telefon",      ok: !!raw.telefon },
    { l: "AHV-Nummer",   ok: !!raw.ahv_nr },
  ];

  async function anfordern() {
    if (!sb) return;
    await updateMitglied(sb, raw.id, { profil_geprueft_at: null });
    setPortalMsg({ ok: true, text: "Datenprüfung angefordert ✓" });
    if (onReload) setTimeout(onReload, 500);
  }

  return (
    <div className="cc-col cc-gap-16">
      <Card>
        <div className="cc-between cc-mb-12">
          <div>
            <div className="cc-text-bold cc-text-lg">Profil-Status</div>
            <div className="cc-text-sm cc-mt-4">
              {raw.profil_geprueft_at
                ? `Zuletzt geprüft am ${formatDatum(raw.profil_geprueft_at)}`
                : "Noch nie geprüft"}
            </div>
          </div>
          <Chip
            text={raw.profil_geprueft_at ? "Geprüft" : "Ausstehend"}
            color={raw.profil_geprueft_at ? GN : AM}
            bg={raw.profil_geprueft_at ? "#ECFDF5" : "#FFFBEB"}
          />
        </div>
        <div className="cc-info-grid">
          {felder.map((f, i) => (
            <div key={i} className="cc-info-row">
              <span className="cc-info-key">{f.l}</span>
              <span>{f.ok
                ? <span className="cc-badge cc-badge-success"><TI n="check" size={10}/> OK</span>
                : <span className="cc-badge cc-badge-warning">Fehlt</span>
              }</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="cc-text-bold cc-mb-4">Datenprüfung anfordern</div>
        <div className="cc-text-sm cc-mb-12">
          Das Mitglied wird beim nächsten Login aufgefordert, seine Daten zu prüfen und zu bestätigen.
        </div>
        <button className="cc-btn-outline" onClick={anfordern}>
          <TI n="refresh"/> Datenprüfung anfordern
        </button>
        {portalMsg && (
          <div className={`cc-badge ${portalMsg.ok ? "cc-badge-success" : "cc-badge-danger"} cc-mt-8`}>
            {portalMsg.text}
          </div>
        )}
      </Card>
    </div>
  );
}

export { DatenpruefungTab };
