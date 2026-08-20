/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/tabs/PortalTab.tsx
   Portal-Zugang Tab: Status, Rolle editierbar, Deaktivieren
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Card, Chip } from "../../../theme.ts";
import { TI } from "../../../icons.tsx";
import { GN, R, RL } from "../../../constants.ts";
import { updateBenutzerRolle } from "../../../domains/members/elternService.ts";
import { updateMitgliedRolle, logAenderung, fetchBenutzerFuerPerson } from "../../../domains/members/memberService.ts";
import { formatDatum, formatDatumZeit } from "../../../domains/person/personUtils.ts";
import type { Account, Mitglied, Sb, PersonZeile } from "../../../types.ts";
import type { PortalRolleOption } from "../../../domains/members/useMemberMeta.ts";
import type { StatusMeldung } from "./DatenpruefungTab.tsx";

/* Aus der Service-Rückgabe abgeleitet — dieselben Felder, die
   fetchBenutzerFuerPerson selektiert. */
export type PortalBenutzer = NonNullable<Awaited<ReturnType<typeof fetchBenutzerFuerPerson>>>;

interface PortalTabProps {
  raw: PersonZeile;
  /**
   * Die MITGLIEDSCHAFT, oder `null`.
   *
   * ⚠ Der Portal-Tab ist der einzige, der auch OHNE Mitgliedschaft erscheint
   * — ein Supporter und ein Elternteil haben einen Zugang. Deshalb kein
   * `nur_mitgliedschaft` an `tab_portal`.
   *
   * Für die Rolle heisst das: `updateMitgliedRolle()` schreibt heute
   * `mitglieder.rolle` UND `benutzer.role`. Ohne Mitgliedschaft gibt es nur
   * das zweite. Entschieden am 21.08.2026 (Didi): dann nur `benutzer.role`.
   * `mitglieder.rolle` ganz aufzugeben wäre die saubere Zielrichtung — sie
   * ist ohnehin ein abgeleiteter Wert —, aber ein eigener Umbau.
   */
  mitgliedId: number | null;
  benutzer?: PortalBenutzer | null;
  sb: Sb;
  dbPortalRollen?: PortalRolleOption[] | null;
  portalMsg?: StatusMeldung | null;
  portalLoading?: boolean;
  handleUnlink: () => void;
  handleReactivate: () => void;
  onReload?: (() => void) | null;
  setBenutzer?: ((update: (prev: PortalBenutzer | null) => PortalBenutzer | null) => void) | null;
  vereinId?: string | null;
  account?: Account | null;
}

/**
 * Die Portalrolle als Inline-Feld.
 *
 * ⚠ STEHT AUSSERHALB VON `PortalTab`, und das ist kein Stil, sondern
 * Funktion. Bis zum 21.08.2026 war sie darin deklariert: damit entstand bei
 * JEDEM Render ein neuer Komponententyp, React hängte den Teilbaum ab und
 * neu an, und das `<select>` verlor bei jedem Tastendruck den Fokus. Das
 * fällt nirgends als Fehler auf — nur als Bedienung, die sich falsch anfühlt
 * und die niemand meldet.
 *
 * Gefunden hat es ein Test: `it.skip('ruft updateMitgliedRolle auf beim
 * Speichern via Enter')` stand seit damals übersprungen da, weil das
 * `<select>` nach `fireEvent.change` ein anderer DOM-Knoten war.
 */
function RolleField({
  currentRole, portalRollen, editing, wert,
  onStart, onWert, onSpeichern, onAbbrechen,
}: {
  currentRole?: string | null;
  portalRollen: { name: string; label: string }[];
  editing: boolean;
  wert: string;
  onStart: (aktuell: string) => void;
  onWert: (v: string) => void;
  onSpeichern: () => void;
  onAbbrechen: () => void;
}) {
  const label = portalRollen.find(r => r.name === currentRole)?.label || currentRole || "—";
  if (!editing) return (
    <span className="cc-inline-field cc-info-val" onClick={() => onStart(currentRole || "")}>
      {label}
      <span className="cc-inline-pencil"><TI n="pencil" size={11}/></span>
    </span>
  );
  return (
    <div className="cc-col cc-flex-1">
      <select className="cc-inline-select" value={wert} autoFocus
        onChange={e => onWert(e.target.value)}
        onBlur={onSpeichern}
        onKeyDown={e => { if (e.key === "Escape") onAbbrechen(); if (e.key === "Enter") onSpeichern(); }}>
        <option value="">— keine —</option>
        {portalRollen.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
      </select>
      <div className="cc-inline-hint">Esc abbrechen</div>
    </div>
  );
}

function PortalTab({ mitgliedId,
  raw, benutzer, sb, dbPortalRollen,
  portalMsg, portalLoading,
  handleUnlink, handleReactivate, onReload, setBenutzer,
  vereinId=null, account=null,
}: PortalTabProps) {
  /* Der Zustand kommt aus dem Konto selbst, nicht aus einem Kennzeichen am
     Mitglied (gestrichen in Etappe 6c). */
  const aktiv = !!benutzer && benutzer.aktiv !== false;
  const deaktiviert = !!benutzer && benutzer.aktiv === false;
  const [rolleEditing, setRolleEditing] = useState(false);
  const [rolleVal, setRolleVal] = useState("");
  const [rolleSaving, setRolleSaving] = useState(false);

  const portalRollen: PortalRolleOption[] = dbPortalRollen && dbPortalRollen.length > 0
    ? dbPortalRollen
    : [
        { name: "administrator",  label: "Administrator" },
        { name: "administration", label: "Verwaltung" },
        { name: "funktionaer",   label: "Funktionär" },
        { name: "trainer",       label: "Trainer/in" },
        { name: "spieler",       label: "Spieler/in" },
        { name: "eltern",        label: "Elternteil" },
        { name: "mitglied",      label: "Mitglied" },
        { name: "mitglied",      label: "Mitglied" },
        { name: "supporter",     label: "Supporter" },
      ];

  async function saveRolle() {
    if (!sb) return;
    setRolleSaving(true);
    /* ⚠ `benutzer.role` zuerst: `mitglieder.rolle` gibt es ohne Mitgliedschaft
       nicht, und selbst mit einer ist sie nur ein abgeleiteter Zweitschlag
       (ableitUndSaveRolle schreibt beides). Sie ganz aufzugeben ist die
       Zielrichtung — siehe offener Punkt in CLAUDE.md. */
    const alterRolle = benutzer?.role || (mitgliedId != null ? raw.rolle : null) || null;
    if (mitgliedId != null) {
      await updateMitgliedRolle(sb, mitgliedId, rolleVal, benutzer?.id);
    } else if (benutzer?.id) {
      /* Ohne Mitgliedschaft gibt es keine `mitglieder.rolle` — die Rolle
         steht dann allein am Konto. */
      await updateBenutzerRolle(sb, benutzer.id, rolleVal);
    }
    if (vereinId) {
      const von = account?.name||account?.email||"Administrator";
      /* Kein Verlauf ohne Mitgliedschaft — mitglieder_aenderungen führt
       mitglied_id NOT NULL. Entfällt, statt zu scheitern. */
    if (mitgliedId != null) logAenderung(sb, mitgliedId, vereinId, "rolle", alterRolle, rolleVal||null, von);
    }
    setRolleSaving(false);
    setRolleEditing(false);
    if (setBenutzer) setBenutzer(prev => prev ? { ...prev, role: rolleVal } : prev);
    if (onReload) onReload();
  }

  return (
    <div className="cc-col cc-gap-16">
      <Card>
        <div className="cc-between cc-mb-12">
          <div className="cc-text-bold cc-text-lg">Portal-Zugang</div>
          <Chip
            text={aktiv ? "Aktiv" : deaktiviert ? "Deaktiviert" : "Kein Zugang"}
            color={aktiv ? GN : R}
            bg={aktiv ? "#ECFDF5" : RL}
          />
        </div>

        {/* Aktiv */}
        {aktiv && benutzer && (
          <>
            <div className="cc-info-grid cc-mb-12">
              <div className="cc-info-row">
                <span className="cc-info-key">E-Mail</span>
                <span className="cc-info-val">{benutzer.email || "—"}</span>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Rolle</span>
                <RolleField currentRole={benutzer.role} portalRollen={portalRollen}
                  editing={rolleEditing} wert={rolleVal}
                  onStart={a => { setRolleVal(a); setRolleEditing(true); }}
                  onWert={setRolleVal} onSpeichern={saveRolle}
                  onAbbrechen={() => setRolleEditing(false)}/>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Erstellt</span>
                <span className="cc-info-val">{formatDatum(benutzer.created_at)}</span>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Letztes Login</span>
                <span className="cc-info-val">{benutzer.last_sign_in_at ? formatDatumZeit(benutzer.last_sign_in_at) : "Noch nie"}</span>
              </div>
            </div>
            <button className="cc-btn-danger cc-w-full" onClick={handleUnlink} disabled={portalLoading}>
              {portalLoading ? "Wird deaktiviert…" : "Zugang deaktivieren"}
            </button>
          </>
        )}

        {/* Deaktiviert */}
        {deaktiviert && benutzer && (
          <>
            <div className="cc-info-grid cc-mb-12">
              <div className="cc-info-row">
                <span className="cc-info-key">E-Mail</span>
                <span className="cc-info-val">{benutzer.email || "—"}</span>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Rolle</span>
                <RolleField currentRole={benutzer.role} portalRollen={portalRollen}
                  editing={rolleEditing} wert={rolleVal}
                  onStart={a => { setRolleVal(a); setRolleEditing(true); }}
                  onWert={setRolleVal} onSpeichern={saveRolle}
                  onAbbrechen={() => setRolleEditing(false)}/>
              </div>
              <div className="cc-info-row">
                <span className="cc-info-key">Letztes Login</span>
                <span className="cc-info-val">{benutzer.last_sign_in_at ? formatDatumZeit(benutzer.last_sign_in_at) : "Noch nie"}</span>
              </div>
            </div>
            <button className="cc-btn-success cc-w-full" onClick={handleReactivate} disabled={portalLoading}>
              {portalLoading ? "Wird reaktiviert…" : "Zugang reaktivieren"}
            </button>
          </>
        )}

        {/* Kein Zugang */}
        {!aktiv && !deaktiviert && (
          <div className="cc-warn-box">
            <TI n="info-circle" size={14}/>
            <span>
              {/* ⚠ „Diese Person" statt „Das Mitglied": der Tab erscheint seit
                  dem 21.08.2026 auch ohne Mitgliedschaft — ein Supporter und
                  ein Elternteil haben einen Zugang, aber keine Mitgliedschaft.
                  `tab_portal` traegt deshalb kein `nur_mitgliedschaft`.

                  ⚠ Und „im Profil" statt „im Kontakt-Tab": einen Kontakt-Tab
                  gibt es nicht. Die Tabs heissen Profil, Eltern, Statistik,
                  Portal-Zugang, Datenpruefung und Verlauf — die Kontaktfelder
                  stehen im Profil. Die Anleitung schickte den Nutzer an einen
                  Ort, den er nie findet. */}
              {raw.email
                ? <>Diese Person kann sich mit <strong>{raw.email}</strong> unter "Registrieren" ein Konto erstellen. Die Verknüpfung erfolgt automatisch.</>
                : <>Keine E-Mail-Adresse hinterlegt. Bitte zuerst eine E-Mail im Profil erfassen.</>
              }
            </span>
          </div>
        )}

        {portalMsg && (
          <div className={`cc-badge ${portalMsg.ok ? "cc-badge-success" : "cc-badge-danger"} cc-mt-8`}>
            {portalMsg.text}
          </div>
        )}
      </Card>
    </div>
  );
}

export { PortalTab };
