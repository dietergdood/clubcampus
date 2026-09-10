#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   deploy — nur hinter der Prüfkette erreichbar
   10.09.2026

   ⚠ ⚠  ANLASS: EIN DEPLOY HAT EINEN ROTEN TESTLAUF UEBERLEBT.

   Die Befehlskette lautete

     npm test > log ; ... ; git commit && push && supabase deploy

   — mit `;` statt `&&`. Sie lief durch, egal wie der Test ausging, und
   das Ergebnis wurde erst danach angesehen. Sechs Dateien waren rot
   (jsdom-Zeitueberschreitungen unter Last, kein Baufehler), aber
   gewusst war das erst, als der Deploy schon draussen war.

   ⚠ **Die Zaehlprobe schuetzt vor verlorenen Dateien, nicht vor der
   Befehlskette dessen, der sie ruft.** Und eine Regel, an die jemand
   denken muss, ist die schwaechste Loesung — derselbe Satz, der eine
   Stunde vorher aufgeschrieben wurde.

   Deshalb: `npm run deploy` laeuft ueber `npm run pruefkette`, und npm
   verkettet mit `&&`. Ein roter Schritt beendet die Kette; dieses
   Skript wird dann gar nicht erst gestartet.

   ⚠ Umgehen kann man es weiterhin — `npx supabase functions deploy`
   direkt. **Bewusst ist der Unterschied**, genau wie bei `test:roh`.
   ══════════════════════════════════════════════════════════════════════ */
import { execFileSync } from "node:child_process";

const FUNKTIONEN = ["sfv-sync", "wp-export", "invite-user", "person-loeschen"];
const gewuenscht = process.argv.slice(2);

/* Ohne Argument: nichts raten. Wer alles deployen will, sagt es. */
if (gewuenscht.length === 0) {
  console.error("deploy: welche Function? Zum Beispiel:\n");
  console.error("  npm run deploy -- wp-export");
  console.error("  npm run deploy -- sfv-sync wp-export");
  console.error("  npm run deploy -- alle\n");
  console.error("Bekannt: " + FUNKTIONEN.join(", "));
  process.exit(1);
}

const liste = gewuenscht[0] === "alle" ? FUNKTIONEN : gewuenscht;
const unbekannt = liste.filter((f) => !FUNKTIONEN.includes(f));
if (unbekannt.length) {
  /* ⚠ Die gueltigen aufzaehlen, nicht nur die falsche nennen — eine
     Meldung, die die Antwort kennt und verschweigt, kostet eine
     Rueckfrage. */
  console.error(`deploy: unbekannt — ${unbekannt.join(", ")}`);
  console.error("Gueltig: " + FUNKTIONEN.join(", "));
  process.exit(1);
}

for (const f of liste) {
  console.log(`\n── ${f} ──────────────────────────────────────────`);
  execFileSync("npx", ["supabase", "functions", "deploy", f],
    { stdio: "inherit", shell: true });
}
console.log("\nDeploy durch — hinter der vollstaendigen Pruefkette.");
