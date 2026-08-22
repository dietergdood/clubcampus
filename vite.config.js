import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

       Wer einen DOM braucht, sagt es oben in seiner Datei:
           // @vitest-environment jsdom
       Das steht dort, wo es gilt, und ueberlebt jeden Umbau der Konfiguration
       (`environmentMatchGlobs` ist in Vitest 3 abgekuendigt worden). */
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
