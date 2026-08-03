/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/ElternKinderSektion.tsx
   Verknüpfte Kinder eines Elternkontakts: anzeigen, hinzufügen,
   Hauptkontakt setzen, entkoppeln.

   Wird im ElternkontaktModal aus der Elternliste heraus gezeigt.
   Im ElternTab steht man bereits beim Kind — dort ausgeblendet.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { Btn, useConfirm } from "../../theme.ts";
import { TI } from "../../icons.tsx";
import {
  fetchKinderFuerElternteil, linkKind, setHauptkontakt,
  clearHauptkontaktFuerKind, entkoppleKind,
} from "../../domains/members/elternService.ts";
import { logAktivitaet, AKTIVITAET_TYP } from "../../domains/members/memberService.ts";
import type { Sb } from "../../types.ts";

export interface KindZeile {
  mitglied_id: number;
  name: string;
  hauptkontakt: boolean;
}

interface ElternKinderSektionProps {
  elternId: string;
  benutzerId?: string | null;
  sb: Sb;
  vereinId: string | null;
  geaendertVon: string;
  /* Auswahl eines Kindes zum Verknüpfen — öffnet den Dialog im Parent */
  onKindHinzufuegen?: (() => void) | null;
  /* Vom Parent gesetzt, nachdem dort ein Kind ausgewählt wurde. Die Sektion
     verknüpft es und meldet über onKindVerknuepft, dass sie fertig ist. */
  neuesKind?: number | null;
  onKindVerknuepft?: (() => void) | null;
  /* Meldet dem Parent, dass sich die Verknüpfungen geändert haben */
  onChanged?: (() => void) | null;
}

export function ElternKinderSektion({
  elternId, benutzerId, sb, vereinId, geaendertVon,
  onKindHinzufuegen = null, neuesKind = null, onKindVerknuepft = null, onChanged = null,
}: ElternKinderSektionProps) {
  const [kinder, setKinder] = useState<KindZeile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  async function load() {
    if (!sb) return;
    const roh = await fetchKinderFuerElternteil(sb, elternId);
    setKinder(roh.map(k => ({
      mitglied_id:  k.mitglied_id,
      name:         `${k.mitglieder?.vorname || ""} ${k.mitglieder?.nachname || ""}`.trim() || "?",
      hauptkontakt: k.hauptkontakt === true,
    })));
  }

  useEffect(() => { load(); }, [elternId]);

  async function toggleHauptkontakt(k: KindZeile) {
    if (!sb || busy) return;
    setBusy(true);
    if (k.hauptkontakt) {
      await clearHauptkontaktFuerKind(sb, elternId, k.mitglied_id);
      if (vereinId) logAktivitaet(sb, k.mitglied_id, vereinId, AKTIVITAET_TYP.ELTERN_GEAENDERT, `Hauptkontakt entfernt: ${k.name}`, "elternkontakte", k.name, geaendertVon);
    } else {
      await setHauptkontakt(sb, k.mitglied_id, elternId, vereinId);
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
        ? "Das ist das letzte verknüpfte Kind. Der Elternkontakt wird danach zum Supporter oder entfernt."
        : "Die Verknüpfung zu diesem Kind wird getrennt.",
      danger: true,
      confirmLabel: "Entknüpfen",
    });
    if (!ok) return;

    setBusy(true);
    await entkoppleKind(sb, elternId, k.mitglied_id, benutzerId);
    if (vereinId) logAktivitaet(sb, k.mitglied_id, vereinId, AKTIVITAET_TYP.ELTERN_ENTFERNT, `Elternkontakt entknüpft: ${k.name}`, "elternkontakte", k.name, geaendertVon);
    await load();
    setBusy(false);
    if (onChanged) onChanged();
  }

  /* Kind verknüpfen, sobald der Parent eines ausgewählt hat */
  useEffect(() => {
    if (!sb || !vereinId || !neuesKind) return;
    let abgebrochen = false;
    (async () => {
      setBusy(true);
      await linkKind(sb, elternId, neuesKind, vereinId, false);
      if (abgebrochen) return;
      await load();
      setBusy(false);
      if (onKindVerknuepft) onKindVerknuepft();
      if (onChanged) onChanged();
    })();
    return () => { abgebrochen = true; };
  }, [neuesKind]);

  return (
    <div className="cc-mt-12">
      {confirmDialog}
      <div className="cc-between cc-mb-8">
        <span className="cc-label">Verknüpfte Kinder</span>
        {onKindHinzufuegen && (
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
          <div key={k.mitglied_id} className="cc-row cc-gap-8 cc-items-center">
            <span className="cc-flex-1 cc-text-sm">{k.name}</span>
            {k.hauptkontakt && <span className="cc-status-hauptkontakt">★ Hauptkontakt</span>}
            <button className="cc-link-btn cc-text-sm cc-text-sub" onClick={() => toggleHauptkontakt(k)} disabled={busy}>
              {k.hauptkontakt ? "entfernen" : "Als Hauptkontakt"}
            </button>
            <button className="cc-btn-ghost cc-text-danger" onClick={() => entkoppeln(k)} disabled={busy} title="Kind entknüpfen">
              <TI n="unlink" size={14}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
