/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungTab.tsx
   Router: Admin-Sicht / Spieler Self-Service / Eltern Self-Service
   ═══════════════════════════════════════════════════════════════ */
import { Card, Chip } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { GN, AM } from "../../../constants.ts";
import { updatePerson } from "../../../domains/person/personService.ts";
import { formatDatum } from "../../../domains/person/personUtils.ts";
import { DatenpruefungMitglied } from "./DatenpruefungMitglied.tsx";
import type { Sb, PersonZeile } from "../../../types.ts";

export interface StatusMeldung {
  ok: boolean;
  text: string;
}

interface DatenpruefungTabProps {
  raw: PersonZeile;
  sb: Sb;
  role?: string;
  portalMsg?: StatusMeldung | null;
  setPortalMsg: (msg: StatusMeldung | null) => void;
  onReload?: (() => void) | null;
  /** Pflichtfeld-Schlüssel des Mitgliedtyps — vom Profil durchgereicht.
      Ohne sie verhält sich die Maske wie vor dem 20.08.2026 und verlangt
      nichts (Ladezustand). */
  pflichtfelder?: string[];
}

function DatenpruefungTab({ raw, sb, role, portalMsg, setPortalMsg, onReload, pflichtfelder = [] }: DatenpruefungTabProps) {

  /* ⚠ HIER STAND EIN ELTERN-ZWEIG, und er war zweifach falsch.

     Unerreichbar: die Rolle `eltern` hat in NAV_BY_ROLE keinen Eintrag
     `members` — ein Elternteil kommt gar nicht auf eine Mitgliederseite.
     Die Datenpruefung des Elternteils laeuft ueber „Profil / Daten pruefen"
     (clubcampus.tsx, case "profile") und ueber das Pflicht-Overlay.

     Und mit dem falschen Datensatz: als „meine Kontaktdaten" reichte
     MemberDetail `eltern[0]` durch — den ERSTEN Elternkontakt des gerade
     angezeigten Kindes. Bei zwei Elternteilen waere das die Zeile des
     anderen gewesen. Zusammengebaut aus sieben von Hand aufgezaehlten
     Feldern; Adresse, Geburtsdatum und AHV-Nummer fehlten darin, waeren im
     neuen, konfigurationsgesteuerten Formular aber erschienen — leer, und
     von fehlenden Daten nicht zu unterscheiden.

     Entfernt am 21.08.2026. `raw` bleibt: es ist der Mitglieds-Zweig. */

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
    await updatePerson(sb as never, raw.person_id, { profil_geprueft_at: null });
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
