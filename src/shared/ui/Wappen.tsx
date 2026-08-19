/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Wappen.tsx

   Vereinswappen neben einem Resultat.

   ⚠ NUR IM SPIELBERICHT UND SPIELPLAN. Fremde Wappen zu zeigen ist
   berichtende Verwendung — dieselbe, die jede Sportzeitung macht, und
   der SFV liefert sie über eine API, die die Vereine bezahlen. Als
   Schmuck anderswo ist es etwas anderes; für die öffentliche
   Vereinswebsite wird vorher neu entschieden (20.08.2026).

   Fehlt ein Wappen, steht dort nichts — kein Platzhalter, kein
   Fragezeichen. Ein leerer Fleck neben dem Namen fällt weniger auf als
   ein graues Kästchen, und der Name trägt die Zeile ohnehin.
   ═══════════════════════════════════════════════════════════════ */

interface WappenProps {
  /** Öffentliche Adresse aus dem Bucket, oder das eigene aus vereine.theme. */
  url?: string | null;
  name: string;
  groesse?: number;
}

export function Wappen({ url, name, groesse = 28 }: WappenProps) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      /* alt bleibt leer: der Vereinsname steht daneben, eine zweite
         Vorlesung desselben Namens stört mehr, als sie hilft. title
         trägt ihn für die Maus. */
      title={name}
      width={groesse}
      height={groesse}
      loading="lazy"
      style={{ width: groesse, height: groesse, objectFit: "contain", flexShrink: 0 }}
    />
  );
}
