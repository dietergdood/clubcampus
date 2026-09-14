import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { availableParallelism } from 'node:os'

/* Hoechstens so viele Worker — siehe die Begruendung an `maxWorkers`.
   `availableParallelism()` statt `cpus().length`: es beruecksichtigt eine
   Container-Begrenzung, und die Pruefkette laeuft in einem Container. */
const WORKER_DECKEL = Math.max(1, Math.min(12, availableParallelism()))

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  test: {
    /* ⚠ `node`, NICHT `jsdom` — und das ist eine Messung, keine Vorliebe.
       Von 47 Testdateien brauchen 14 einen DOM; die anderen 33 sind reine
       Logik und bezahlten trotzdem fuer eine jsdom-Instanz. In der Ausgabe
       war `environment` mit 428–485 s die mit Abstand groesste Position,
       waehrend die Tests selbst 70 s brauchten.

       Die Folge war nicht nur Langsamkeit: unter der Last liefen zwei
       Komponententests in den 5-Sekunden-Timeout — dieselben, die einzeln
       in 2 s durchlaufen. Damit hiess rot zwei Dinge, Defekt oder
       Rechnerlast, und wer die beiden verwechselt, verliert immer dieselbe
       von beiden.

       ⚠ KEINE FESTE WORKER-ZAHL. Naheliegend waere `maxWorkers` gewesen —
       aber die Prueflaufkette laeuft auf `ubuntu-latest` mit 4 Kernen,
       diese Maschine hat 22. Eine Zahl waere dort eine Bremse und hier
       eine Verschwendung. Weniger Arbeit schlaegt anders verteilte Arbeit.

       ⚠ ⚠ ERGAENZT AM 14.09.2026 — eine OBERGRENZE, keine feste Zahl.
       Siehe `WORKER_DECKEL` unten; der Absatz darueber bleibt richtig und
       hat einen anderen Gegenstand.

       Wer einen DOM braucht, sagt es oben in seiner Datei:
           // @vitest-environment jsdom
       Das steht dort, wo es gilt, und ueberlebt jeden Umbau der Konfiguration
       (`environmentMatchGlobs` ist in Vitest 3 abgekuendigt worden). */
    environment: 'node',
    /* ⚠ ⚠  EINE OBERGRENZE, KEINE FESTE ZAHL — und der Unterschied ist der
       ganze Einwand vom 22.08.2026. Abgelehnt wurde damals ein `maxWorkers`,
       das eine kleinere Maschine drosselt. `min(12, verfuegbar)` tut das
       nie: auf `ubuntu-latest` (4 Kerne) ist es wirkungslos, auf dieser
       Maschine (22) ist es die ganze Reparatur.

       ⚠ GEMESSEN AM 14.09.2026, und das Ergebnis dreht die Intuition um.
       Sieben jsdom-Faelle liefen in den 5000er-Deckel. Die Frage war: ist
       der Deckel zu niedrig oder der Lauf zu voll?

       | | Wanduhr | environment | tests | Timeouts |
       |---|---|---|---|---|
       | Vorgabe (~21 Worker) | 97.7 s | 675 s | 260 s | 7 |
       | dieselbe, Deckel 20000 | 78.0 s | 603 s | 174 s | 0 |
       | maxWorkers=4  | 91.5 s | 132 s |  46 s | 0 |
       | maxWorkers=12 | 60.9 s |   —   |   —   | 0 |

       Die Wanduhr ist ueberall gleich, aber die Arbeit ist bei wenigen
       Workern vier- bis fuenfmal kleiner. **Die Faelle brechen den Deckel
       nicht, weil sie langsam sind, sondern weil sie ausgehungert werden.**
       Und die 22 jsdom-Dateien ALLEIN laufen alle gruen im 5000er-Deckel.

       ⚠ ⚠ EIN HOEHERER DECKEL HAETTE ES VERSTECKT. Bei 20000 ist alles
       gruen, die Wanduhr sieht mit 78 s gut aus — und 603 Sekunden
       `environment` stehen daneben, wo niemand hinsieht. **Die Zahl, die
       den Befund traegt, ist nicht die, auf die man schaut.**

       ⚠ Die Kante liegt zwischen 12 und ~21 und ist nicht genauer
       gemessen; 12 war die schnellste der gruenen Einstellungen. Ein Lauf
       je Einstellung — dass die Vorgabe manchmal gruen war, heisst, dass
       sie auf der Kante sitzt, nicht dass sie traegt. */
    maxWorkers: WORKER_DECKEL,
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
