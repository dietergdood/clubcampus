/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/spiele/HeimAuswaertsKarte.tsx

   Die Heim- und Auswaertsbilanz EINES eigenen Teams.

   ⚠ SIE STEHT UNTER DEM SPIELPLAN, NICHT UNTER DER TABELLE — und das ist
   keine Geschmacksfrage. Sie fasst die Spiele zusammen, die direkt darueber
   stehen; unter der Verbandstabelle gelesen behauptet sie eine
   Gruppenauswertung, die sie nicht ist. Der erste Einbau (28.08.2026) hing
   sie unter die Tabelle und brauchte dafuer einen langen Abgrenzungssatz —
   ein Erklaersatz, der eine Platzierung geradebiegen muss, ist das
   Eingestaendnis der falschen Platzierung.

   ⚠ NUR DAS EIGENE TEAM. Eine Gruppentabelle mit Heim-/Auswaertstrennung
   ist nicht zu haben: der Verband liefert ueber /api/club/schedule
   ausschliesslich Spiele mit eigener Beteiligung (gemessen 28.08.2026,
   `ohne_team` in allen 185 Laeufen 0), einen gruppenweiten Endpunkt gibt es
   nicht (Swagger v26.7.10.1, 15 Endpunkte), und die ClubId fremder Vereine
   steht nirgends im Bestand. Der kurze Satz unter der Tabelle bleibt
   deshalb: die Verbandstabelle steht im selben Tab.
   ═══════════════════════════════════════════════════════════════ */
import { Card } from "../../theme.ts";
import { useSpiele } from "../../domains/spiele/useSpiele.ts";
import type { Sb } from "../../types.ts";
import { heimAuswaertsBilanz } from "../../domains/spiele/heimAuswaerts.ts";
import type { BilanzZeile } from "../../domains/spiele/heimAuswaerts.ts";
import type { SpielUi } from "../../domains/spiele/spielMapper.ts";
import { GN, R } from "../../constants.ts";

interface Props {
  spiele: SpielUi[];
}

const SPALTEN = ["", "Sp", "S", "U", "N", "Tore", "+/-", "Pts"];

function Zeile({ label, b, fett }: { label: string; b: BilanzZeile; fett: boolean }) {
  const zellen = [b.sp, b.s, b.u, b.n];
  return (
    <tr style={{ borderTop: "0.5px solid var(--border)", fontWeight: fett ? 700 : 400 }}>
      <td className="cc-td" style={{ fontWeight: fett ? 700 : 600 }}>{label}</td>
      {zellen.map((v, i) => (
        <td key={i} className="cc-td" style={{ textAlign: "center", color: "var(--sub)" }}>{v}</td>
      ))}
      <td className="cc-td" style={{ textAlign: "center", color: "var(--sub)" }}>
        {`${b.tore}:${b.gegentore}`}
      </td>
      <td className="cc-td" style={{ textAlign: "center", fontWeight: 600, color: b.diff > 0 ? GN : b.diff < 0 ? R : "var(--sub)" }}>
        {b.diff > 0 ? "+" : ""}{b.diff}
      </td>
      <td className="cc-td" style={{ textAlign: "center", fontWeight: 800 }}>{b.pts}</td>
    </tr>
  );
}

export function HeimAuswaertsKarte({ spiele }: Props) {
  const { heim, auswaerts, gesamt } = heimAuswaertsBilanz(spiele);

  /* Keine Komponente, die bei fehlenden Daten null zurueckgibt — eine
     Karte, die still verschwindet, ist von einer nicht gerenderten nicht zu
     unterscheiden. Stattdessen ein Satz, der sagt, warum sie leer ist. */
  if (gesamt.sp === 0) {
    return (
      <Card>
        <div className="cc-empty">
          Noch kein ausgetragenes Meisterschaftsspiel. Cup- und Trainingsspiele
          zählen hier nicht mit.
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0, overflowX: "auto" }}>
      <div className="cc-table-wrap">
        <table className="cc-table">
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              {SPALTEN.map((h, i) => (
                <th className="cc-th" key={i} style={{ cursor: "default" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Zeile label="Heim" b={heim} fett={false} />
            <Zeile label="Auswärts" b={auswaerts} fett={false} />
            <Zeile label="Gesamt" b={gesamt} fett />
          </tbody>
        </table>
      </div>
      <div style={{ padding: "10px 13px 13px", fontSize: 12, color: "var(--sub)" }}>
        Aus den eigenen Meisterschaftsspielen. Nicht die Gruppe: Spiele ohne
        eigene Beteiligung liefert der Verband nicht.
      </div>
    </Card>
  );
}

/* Der Block, wie ihn das Team-Modul einsetzt: holt die Spiele dieses Teams
   und reicht sie hinein. Getrennt von der Karte, damit die Karte ohne
   Supabase testbar bleibt — und damit der Abruf erst laeuft, wenn der Tab
   offen ist. */
export function HeimAuswaertsBlock(
  { team, sb, vereinId }: { team: string | null; sb: Sb; vereinId: string | null },
) {
  const { spiele } = useSpiele(sb, vereinId, team);
  return <HeimAuswaertsKarte spiele={spiele} />;
}
