/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternKinderSektion.tsx
   Verknüpfte Kinder eines Elternkontakts: anzeigen, hinzufügen,
   Hauptkontakt setzen, entkoppeln.

   Wird im ElternkontaktModal aus der Elternliste heraus gezeigt.
   Im ElternTab steht man bereits beim Kind — dort ausgeblendet.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Av, Btn, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import {
  fetchKinderFuerElternteil, linkKind, setHauptkontakt,
  clearHauptkontaktFuerKind, entkoppleKind, updateBenutzerRolle, loeschePersonWennVerwaist,
} from "../../domains/members/elternService.ts";
import { logAktivitaet, AKTIVITAET_TYP } from "../../domains/members/memberService.ts";
import type { EntkoppelWunsch } from "../../domains/members/elternService.ts";
import { EntkopplungModal } from "./EntkopplungModal.tsx";
import type { Sb } from "../../types.ts";

export interface KindZeile {
  mitglied_id: number;
  name: string;
  teams: string[];
  hauptkontakt: boolean;
}

interface ElternKinderSektionProps {
  personId: string;
  benutzerId?: string | null;
  /** Name für die Rückfrage nach dem letzten Kind. Ohne Angabe steht dort
      eine neutrale Formulierung — die Frage entfällt deswegen nicht. */
  personName?: string | null;
  sb: Sb;
  vereinId: string | null;
  geaendertVon: string;
  /* Auswahl eines Kindes zum Verknüpfen — öffnet den Dialog im Parent */
  /* Ohne Bearbeitungsrecht nur anzeigen — kein Verknuepfen, kein Stern,
     kein Entknuepfen. */
  canEdit?: boolean;
  onKindHinzufuegen?: (() => void) | null;
  /* Vom Parent gesetzt, nachdem dort ein Kind ausgewählt wurde. Die Sektion
     verknüpft es und meldet über onKindVerknuepft, dass sie fertig ist. */
  neuesKind?: number | null;
  onKindVerknuepft?: (() => void) | null;
  /* Meldet dem Parent, dass sich die Verknüpfungen geändert haben */
  onChanged?: (() => void) | null;
}

export function ElternKinderSektion({
  personId, benutzerId, personName = null, sb, vereinId, geaendertVon,
  canEdit = true, onKindHinzufuegen = null, neuesKind = null, onKindVerknuepft = null, onChanged = null,
}: ElternKinderSektionProps) {
  const [kinder, setKinder] = useState<KindZeile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [frageOffen, setFrageOffen] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  async function load() {
    if (!sb) return;
    const roh = await fetchKinderFuerElternteil(sb, personId);
    setKinder(roh.map(k => {
      const m = k.mitglieder;
      /* kader kann je nach Supabase-Antwort Objekt oder Array sein */
      const kaderArr = Array.isArray(m?.kader) ? m.kader : (m?.kader ? [m.kader] : []);
      const teams = kaderArr
        .filter(ka => ka.aktiv === true)
        .map(ka => {
          const t = Array.isArray(ka.teams) ? ka.teams[0] : ka.teams;
          return t?.kurzname || t?.name || "";
        })
        .filter(Boolean);
      return {
        mitglied_id:  k.mitglied_id,
        name:         `${m?.vorname || ""} ${m?.nachname || ""}`.trim() || "?",
        teams,
        hauptkontakt: k.hauptkontakt === true,
      };
    }));
  }

  useEffect(() => { load(); }, [personId]);

  async function toggleHauptkontakt(k: KindZeile) {
    if (!sb || busy) return;
    setBusy(true);
    if (k.hauptkontakt) {
      await clearHauptkontaktFuerKind(sb, personId, k.mitglied_id);
      if (vereinId) logAktivitaet(sb, k.mitglied_id, vereinId, AKTIVITAET_TYP.ELTERN_GEAENDERT, `Hauptkontakt entfernt: ${k.name}`, "elternkontakte", k.name, geaendertVon);
    } else {
      await setHauptkontakt(sb, k.mitglied_id, personId, vereinId);
      if (vereinId) logAktivitaet(sb, k.mitglied_id, vereinId, AKTIVITAET_TYP.ELTERN_GEAENDERT, `Hauptkontakt gesetzt: ${k.name}`, "elternkontakte", k.name, geaendertVon);
    }
    await load();
    setBusy(false);
    if (onChanged) onChanged();
  }

  async function entkoppeln(k: KindZeile) {
    if (!sb || busy) return;
    const letztes = (kinder || []).length <= 1;
    const ok = await confirm({
      title: `${k.name} entknüpfen?`,
      message: letztes
        ? "Das ist das letzte verknüpfte Kind. Anschliessend wird gefragt, ob der Verein den Kontakt behält."
        : "Die Verknüpfung zu diesem Kind wird getrennt.",
      danger: true,
      confirmLabel: "Entknüpfen",
    });
    if (!ok) return;

    setBusy(true);
    const folge = await entkoppleKind(sb, personId, k.mitglied_id, benutzerId);
    if (vereinId) logAktivitaet(sb, k.mitglied_id, vereinId, AKTIVITAET_TYP.ELTERN_ENTFERNT, `Elternkontakt entknüpft: ${k.name}`, "elternkontakte", k.name, geaendertVon);
    await load();
    setBusy(false);
    /* "frage" heisst: die Verknuepfung ist geloest, aber was mit der Person
       geschieht, hat noch niemand entschieden. Frueher entschied
       entkoppleKind() selbst — an einem Nebenumstand. */
    if (folge === "frage") setFrageOffen(true);
    if (onChanged) onChanged();
  }

  /* Die Antwort auf die Rueckfrage austragen. */
  async function entscheideNachEntkopplung(wunsch: EntkoppelWunsch): Promise<string | null> {
    if (!sb) return "Keine Verbindung zur Datenbank.";
    if (wunsch === "supporter") {
      if (benutzerId) await updateBenutzerRolle(sb, benutzerId, "supporter");
      /* Ohne Konto ist nichts zu tun: die Person steht bereits ohne
         Mitgliedschaft und ohne Kind da — das IST ein Supporter. */
    } else {
      await loeschePersonWennVerwaist(sb, personId);
    }
    await load();
    if (onChanged) onChanged();
    return null;
  }

  /* Kind verknüpfen, sobald der Parent eines ausgewählt hat */
  useEffect(() => {
    if (!sb || !vereinId || !neuesKind) return;
    let abgebrochen = false;
    (async () => {
      setBusy(true);
      await linkKind(sb, personId, neuesKind, vereinId, false);
      if (abgebrochen) return;
      await load();
      setBusy(false);
      if (onKindVerknuepft) onKindVerknuepft();
      if (onChanged) onChanged();
    })();
    return () => { abgebrochen = true; };
  }, [neuesKind]);

  return (
    <>
      <div className="cc-divider cc-mt-12"/>
      <div className="cc-mt-12">
      {confirmDialog}
      <EntkopplungModal
        open={frageOffen}
        onClose={() => setFrageOffen(false)}
        name={personName || "Diese Person"}
        onEntscheiden={entscheideNachEntkopplung}
      />
      <div className="cc-section-title cc-between">
        <span className="cc-row cc-gap-6"><TI n="users" size={14}/> Verknüpfte Kinder</span>
        {canEdit && onKindHinzufuegen && (
          <Btn small onClick={onKindHinzufuegen} disabled={busy}>
            <TI n="plus" size={12}/> Kind hinzufügen
          </Btn>
        )}
      </div>

      {kinder === null && <div className="cc-text-sm cc-text-sub">Wird geladen…</div>}
      {kinder !== null && kinder.length === 0 && (
        <div className="cc-text-sm cc-text-sub">Keine Kinder verknüpft.</div>
      )}

      <div className="cc-col cc-gap-6">
        {(kinder || []).map(k => (
          <div key={k.mitglied_id} className="cc-kind-row">
            <Av name={k.name} size={28}/>
            <div className="cc-flex-1">
              <div className="cc-row cc-gap-6 cc-items-center">
                <span className="cc-text-sm">{k.name}</span>
                {k.hauptkontakt && <span className="cc-badge-haupt">Hauptkontakt</span>}
              </div>
              {k.teams.length > 0 && <div className="cc-text-xs cc-text-sub">{k.teams.join(", ")}</div>}
            </div>
            {canEdit ? (
              <>
                <button
                  className={`cc-star-btn${k.hauptkontakt ? " cc-star-btn-on" : ""}`}
                  onClick={() => toggleHauptkontakt(k)}
                  disabled={busy}
                  title={k.hauptkontakt ? "Hauptkontakt entfernen" : "Als Hauptkontakt setzen"}
                >
                  <TI n="star" size={16}/>
                </button>
                <button className="cc-icon-btn-danger" onClick={() => entkoppeln(k)} disabled={busy} title="Kind entknüpfen">
                  <TI n="unlink" size={15}/>
                </button>
              </>
            ) : k.hauptkontakt && (
              /* Ohne Recht bleibt der Stern als reine Anzeige */
              <span className="cc-star-btn cc-star-btn-on" title="Hauptkontakt"><TI n="star" size={16}/></span>
            )}
          </div>
        ))}
      </div>
      </div>
    </>
  );
}
