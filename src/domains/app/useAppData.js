/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/app/useAppData.js
   Supabase Lade-Funktionen für App-Level Daten
   ═══════════════════════════════════════════════════════════════ */
import { THEME_DEFAULT_STATIC, hexToRgba, darkenHex, contrastColor } from "../../theme.jsx";

export function useAppData({ sb, setAppTheme, setModuleAktiv, setModuleRechte, setDbStufen,
  setDbFunktionen, setDbMitglieder, setDbMitgliedtypen, setDbPortalRollen, setDbKaderRollen,
  setSession, setDbUser }) {

  async function loadTheme() {
    if (!sb) return;
    try {
      const { data, error } = await sb.from("vereine").select("theme").single();
      if (error || !data) return;
      const saved = data.theme || {};
      const t = { ...THEME_DEFAULT_STATIC, ...saved };
      setAppTheme(t);
      applyThemeCss(t);
      try { localStorage.setItem("cc-theme", JSON.stringify(t)); } catch {}
    } catch (e) {
      console.warn("[CC] loadTheme:", e.message);
    }
  }

  function applyThemeCss(t) {
    let s = document.getElementById("cc-theme-vars");
    if (!s) { s = document.createElement("style"); s.id = "cc-theme-vars"; document.head.appendChild(s); }
    const nav = t.navBg || "#000000";
    const navT = t.navText || "#FFFFFF";
    const navA = t.navAccent || t.vereinsfarbe1 || "#FEC604";
    const navAT = t.navAccentText || contrastColor(navA);
    const avBg = t.avatarBg || t.vereinsfarbe1 || "#FEC604";
    const avTxt = t.avatarText || contrastColor(avBg);
    const navH = t.navHover || "#1A1A1A";
    const acc = t.vereinsfarbe1 || "#FEC604";
    const acc2 = t.vereinsfarbe2 || "#000000";
    const btn = t.btnPrimary || "#FEC604";
    const btnT = t.btnPrimaryText || contrastColor(btn);
    const btnHov = darkenHex(t.btnPrimary || "#FEC604");
    s.textContent = `:root,[data-theme],[data-theme=dark],[data-theme=light]{
      --cc-accent:${acc}!important;
      --cc-accent2:${acc2}!important;
      --cc-hover:${hexToRgba(acc, 0.19)}!important;
      --cc-accent-25:${hexToRgba(acc, 0.25)}!important;
      --cc-accent-20:${hexToRgba(acc, 0.12)}!important;
      --cc-accent-15:${hexToRgba(acc, 0.09)}!important;
      --cc-accent-12:${hexToRgba(acc, 0.07)}!important;
      --cc-accent-10:${hexToRgba(acc, 0.10)}!important;
      --cc-accent-5:${hexToRgba(acc, 0.05)}!important;
      --nav:${nav}!important;
      --nav-t:${navT}!important;
      --nav-a:${navA}!important;
      --nav-accent-text:${navAT}!important;
      --avatar-bg:${avBg}!important;
      --cc-avatar-text:${avTxt}!important;
      --avatar-text:${avTxt}!important;
      --nav-b:color-mix(in srgb,${nav} 80%,white 20%)!important;
      --nav-hover:${navH}!important;
      --btn-primary:${btn}!important;
      --btn-primary-text:${btnT}!important;
      --btn-hover:${btnHov}!important;
    }
    .cc-btn-primary:hover{background:var(--btn-hover)!important;transition:background 0.15s;}`;
  }

  async function loadModuleConfig() {
    if (!sb) return;
    try {
      const [mcR, mrR] = await Promise.all([
        sb.from("module_config").select("modul,aktiv"),
        sb.from("modul_rechte").select("modul,rolle,hat_zugriff,stufe"),
      ]);
      if (mcR.data?.length > 0) {
        const ma = {};
        mcR.data.forEach(r => { ma[r.modul] = r.aktiv !== false; });
        setModuleAktiv(ma);
        try { localStorage.setItem("cc-module-aktiv", JSON.stringify(ma)); } catch {}
      }
      if (mrR.data?.length > 0) {
        const mr = {};
        mrR.data.forEach(r => {
          if (!mr[r.rolle]) mr[r.rolle] = [];
          if (r.hat_zugriff) mr[r.rolle].push(r.modul);
        });
        setModuleRechte(mr);
        try { localStorage.setItem("cc-module-rechte", JSON.stringify(mr)); } catch {}
      }
    } catch (e) { console.warn("[FCH] loadModuleConfig:", e.message); }
  }

  async function loadDbStufen() {
    if (!sb) return;
    try {
      const { data } = await sb.from("team_stufen").select("*").order("ebene").order("sortorder");
      if (data?.length > 0) setDbStufen(data);
    } catch (e) { console.warn("[FCH] loadDbStufen:", e.message); }
  }

  async function loadDbFunktionen(uid) {
    if (!sb || !uid) return;
    try {
      const { data } = await sb.from("benutzer_funktionen")
        .select("funktion_id, portal_funktionen(*, portal_gruppen(*))")
        .eq("benutzer_id", uid);
      if (data) setDbFunktionen(data.map(d => d.portal_funktionen).filter(Boolean));
    } catch (e) { console.warn("[FCH] loadDbFunktionen:", e.message); }
  }

  async function updatePortalZugang(mitgliedId, aktiv) {
    if (!sb) return;
    try {
      const { data: bu } = await sb.from("benutzer").select("id").eq("mitglied_id", mitgliedId).maybeSingle();
      if (!bu) return;
      if (aktiv) {
        await sb.from("benutzer").update({ aktiv: true }).eq("id", bu.id);
      } else {
        const { data: elternLinks } = await sb.from("elternkontakte")
          .select("id,mitglied_id,mitglieder(aktiv)")
          .eq("benutzer_id", bu.id);
        const hatAndereAktiveKinder = (elternLinks || []).some(e =>
          e.mitglied_id !== mitgliedId && e.mitglieder?.aktiv === true
        );
        if (!hatAndereAktiveKinder) {
          await sb.from("benutzer").update({ aktiv: false }).eq("id", bu.id);
        }
      }
    } catch (e) { console.warn("[CCH] updatePortalZugang:", e.message); }
  }

  async function loadDbMitglieder() {
    if (!sb) return;
    try {
      const [mitgliederRes, kaderRes, benutzerRes] = await Promise.all([
        sb.from("mitglieder").select("*").eq("aktiv", true).order("nachname").order("vorname"),
        sb.from("kader").select("mitglied_id,rollen,teams(id,name,kurzname)").eq("aktiv", true),
        sb.from("benutzer").select("mitglied_id,aktiv"),
      ]);
      const benutzerMap = {};
      (benutzerRes.data || []).forEach(b => {
        if (b.mitglied_id) benutzerMap[b.mitglied_id] = { exists: true, aktiv: b.aktiv !== false };
      });
      const kaderMap = {};
      (kaderRes.data || []).forEach(k => {
        if (!kaderMap[k.mitglied_id]) kaderMap[k.mitglied_id] = { rollen: [], teams: [], kader: [] };
        (k.rollen || []).forEach(r => {
          if (!kaderMap[k.mitglied_id].rollen.includes(r)) kaderMap[k.mitglied_id].rollen.push(r);
        });
        if (k.teams?.name && !kaderMap[k.mitglied_id].teams.find(t => t.name === k.teams.name))
          kaderMap[k.mitglied_id].teams.push({ name: k.teams.name, kurz: k.teams.kurzname || k.teams.name });
        kaderMap[k.mitglied_id].kader.push({
          team: { name: k.teams?.name, kurz: k.teams?.kurzname || k.teams?.name },
          rollen: k.rollen || []
        });
      });
      const data = (mitgliederRes.data || []).map(m => ({
        ...m,
        kader_rollen: kaderMap[m.id]?.rollen || [],
        kader_teams: kaderMap[m.id]?.teams || [],
        kader_eintraege: kaderMap[m.id]?.kader || [],
        hat_benutzer: !!benutzerMap[m.id],
        benutzer_deaktiviert: benutzerMap[m.id]?.exists && !benutzerMap[m.id]?.aktiv,
      }));
      if (data.length > 0) setDbMitglieder(data);
    } catch (e) { console.warn("[FCH] loadDbMitglieder:", e.message); }
  }

  async function loadDbMitgliedtypen() {
    if (!sb) return;
    try {
      const { data } = await sb.from("mitgliedtypen").select("*").eq("aktiv", true).order("sort_order");
      if (data) setDbMitgliedtypen(data);
    } catch (e) { console.warn("[FCH] loadDbMitgliedtypen:", e.message); }
  }

  async function loadDbPortalRollen() {
    if (!sb) return;
    try {
      const { data } = await sb.from("portal_rollen").select("*").eq("aktiv", true).order("prioritaet");
      if (data) setDbPortalRollen(data);
    } catch (e) { console.warn("[FCH] loadDbPortalRollen:", e.message); }
  }

  async function loadDbKaderRollen() {
    if (!sb) return;
    try {
      const { data } = await sb.from("kader_rollen").select("*").eq("aktiv", true).order("sort_order");
      if (data) setDbKaderRollen(data);
    } catch (e) { console.warn("[FCH] loadDbKaderRollen:", e.message); }
  }

  async function handleLogout() {
    if (sb) await sb.auth.signOut();
    setSession(null); setDbUser(null);
  }

  return {
    loadTheme, applyThemeCss, loadModuleConfig,
    loadDbStufen, loadDbFunktionen, updatePortalZugang,
    loadDbMitglieder, loadDbMitgliedtypen,
    loadDbPortalRollen, loadDbKaderRollen,
    handleLogout,
  };
}
