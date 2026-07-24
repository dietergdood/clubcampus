/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/app/useProfilCheck.js
   Profil-Vollständigkeit und Prüfung
   ═══════════════════════════════════════════════════════════════ */

export function useProfilCheck({ sb, dbUser, role, dbMitglieder, setDbUser }) {

  function getProfilFehlend() {
    if (!dbUser) return [];
    const isEltern = role === "eltern" && !dbMitglieder.find(m => m.id === dbUser.mitglied_id);
    if (isEltern) {
      const fehlend = [];
      if (!dbUser.vorname) fehlend.push("vorname");
      if (!dbUser.nachname) fehlend.push("nachname");
      if (!dbUser.telefon) fehlend.push("telefon");
      const kinder = dbMitglieder.filter(m =>
        (m.eltern || []).some(e => e.benutzer_id === dbUser.id)
      );
      kinder.forEach(kind => {
        if (!kind.geburtsdatum) fehlend.push(`${kind.vorname}: Geburtsdatum`);
        if (!kind.nationalitaet) fehlend.push(`${kind.vorname}: Nationalität`);
        if (!kind.strasse) fehlend.push(`${kind.vorname}: Adresse`);
      });
      return fehlend;
    }
    const raw = dbMitglieder.find(m => m.id === dbUser.mitglied_id) || {};
    const isPassiv = ["Passivmitglied", "Ehrenmitglied", "Gönner"].includes(raw.mitgliedtyp);
    const fehlend = [];
    if (!raw.vorname) fehlend.push("vorname");
    if (!raw.nachname) fehlend.push("nachname");
    if (!isPassiv && !raw.geburtsdatum) fehlend.push("geburtsdatum");
    if (!raw.telefon && !raw.email) fehlend.push("telefon");
    return fehlend;
  }

  function sollProfilPruefen() {
    if (!dbUser || role === "administrator" || role === "administration") return false;
    const raw = dbMitglieder.find(m => m.id === dbUser.mitglied_id) || null;
    const sechsMonate = new Date();
    sechsMonate.setMonth(sechsMonate.getMonth() - 6);
    const eigenesGeprueft = raw?.profil_geprueft_at || dbUser.profil_geprueft_at;
    if (!eigenesGeprueft) return true;
    if (new Date(eigenesGeprueft) < sechsMonate) return true;
    if (role === "eltern") {
      const kinder = dbMitglieder.filter(m =>
        (m.eltern || []).some(e => e.benutzer_id === dbUser.id)
      );
      for (const kind of kinder) {
        if (!kind.profil_geprueft_at) return true;
        if (new Date(kind.profil_geprueft_at) < sechsMonate) return true;
      }
    }
    return false;
  }

  async function markiereProfilGeprueft() {
    if (!sb || !dbUser) return;
    const now = new Date().toISOString();
    await sb.from("benutzer").update({ profil_geprueft_at: now }).eq("id", dbUser.id);
    if (role === "eltern") {
      const kinder = dbMitglieder.filter(m =>
        (m.eltern || []).some(e => e.benutzer_id === dbUser.id)
      );
      for (const kind of kinder) {
        await sb.from("mitglieder").update({ profil_geprueft_at: now }).eq("id", kind.id);
      }
    }
    setDbUser(u => u ? { ...u, profil_geprueft_at: now } : u);
  }

  return { getProfilFehlend, sollProfilPruefen, markiereProfilGeprueft };
}
