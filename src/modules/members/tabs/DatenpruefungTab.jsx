/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/DatenpruefungTab.jsx
   Datenprüfung Tab: Profil-Status, Felder-Checkliste, Anfordern
   ═══════════════════════════════════════════════════════════════ */
import { Card, Chip } from "../../../theme.jsx";
import { TI } from "../../../icons.jsx";
import { GN, AM } from "../../../constants.ts";
import { updateMitglied } from "../../../domains/members/memberService.js";

function DatenpruefungTab({ raw, sb, portalMsg, setPortalMsg, onReload }) {
  const felder = [
    { l: "Vorname",      ok: !!raw.vorname },
    { l: "Nachname",     ok: !!raw.nachname },
    { l: "Geburtsdatum", ok: !!raw.geburtsdatum },
    { l: "Nationalität", ok: !!raw.nationalitaet },
    { l: "Adresse",      ok: !!(raw.strasse && raw.plz && raw.ort) },
    { l: "E-Mail",       ok: !!raw.email },
    { l: "Telefon",      ok: !!raw.telefon },
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
                ? `Zuletzt geprüft am ${new Date(raw.profil_geprueft_at).toLocaleDateString("de-CH")}`
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
        <button className="cc-btn-ghost cc-w-full" onClick={anfordern}>
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
