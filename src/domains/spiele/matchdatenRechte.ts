/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/spiele/matchdatenRechte.ts

   Wer darf Matchdaten korrigieren? EINE Stelle, die die RLS-Policy
   spiegelt — keine zweite Prüfung, die von ihr abweichen kann.

   Erlaubt die Oberfläche mehr als die Datenbank, sieht der Nutzer einen
   Stift, der beim Speichern scheitert. Erlaubt sie weniger, fehlt ein
   Knopf ohne Begründung. Beides ist schlecht, das erste schlimmer.

   DIE POLICY, wörtlich aus supabase/migration_matchdaten.sql:

     using (verein_id = get_my_verein_id()
            and (is_admin()
              or get_my_role() = 'trainer'
              or hat_modul_recht('schedule','schreiben')))
   ═══════════════════════════════════════════════════════════════ */

/**
 * Spiegelt `spiel_ereignisse_write`.
 *
 * `kannSchreiben` ist die Funktion aus getPermissions — für die Rolle
 * `funktionaer` liest sie `getEffektiveStufeForFunktionaer()`, das
 * Gegenstück zu `hat_modul_recht()`. Für andere Rollen liest sie
 * `module_config`/`APP_ZUGRIFF_DEFAULT`, was die Datenbank NICHT
 * kennt — deshalb ist der dritte Zweig auf `funktionaer` eingegrenzt.
 * Ohne diese Eingrenzung könnte ein Admin einer Rolle in der
 * Portalverwaltung `schedule: schreiben` geben und die Oberfläche
 * zeigte einen Stift, den die Datenbank ablehnt.
 *
 * ⚠ EINE ASYMMETRIE BLEIBT, bewusst und in die sichere Richtung:
 * `hat_modul_recht()` liest Gruppen unabhängig von der Rolle. Ein
 * Spieler in einer Gruppe mit `schedule: schreiben` käme also durch die
 * Policy, sieht hier aber keinen Stift. Die Oberfläche zeigt damit
 * weniger als erlaubt — das kostet einen Knopf, nicht einen
 * Fehlschlag. Umgekehrt wäre es ein Fehler.
 *
 * Sie verschwindet mit den Gruppenrechten: dann fällt auch der
 * Trainer-Zweig weg (siehe CLAUDE.md → „Übergang: get_my_role() =
 * 'trainer' in spiel_ereignisse_write").
 */
export function darfMatchdatenKorrigieren(
  role: string | null | undefined,
  kannSchreiben: (modul: string) => boolean,
): boolean {
  /* is_admin() ist in SQL `ist_admin OR role = 'administration'`; im
     Frontend ist `role` bereits 'administrator', solange das Kennzeichen
     gesetzt ist (CLAUDE.md, Adminstatus). */
  if (role === "administrator" || role === "administration") return true;
  if (role === "trainer") return true;
  if (role === "funktionaer") return kannSchreiben("schedule");
  return false;
}

export const MATCHDATEN_MODUL = "schedule";
