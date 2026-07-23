/* ═══════════════════════════════════════════════════════════════
   ClubCampus Design System — constants.js
   Zentrale Design-Tokens für alle Module
   ═══════════════════════════════════════════════════════════════ */

/* ── Typografie ────────────────────────────────────────────────
   Min. 13px für Mobile (iOS zoomt bei <13px automatisch)
   ──────────────────────────────────────────────────────────── */
export const FONT = "'Inter','SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

export const TEXT = {
  xs:    11,  // Badges, Meta, Labels (uppercase)
  sm:    12,  // Chips, sekundäre Info
  base:  13,  // Mobile Base (iOS min für kein Zoom)
  md:    14,  // Desktop Base (Standard Fliesstext)
  lg:    16,  // Section Titles
  xl:    18,  // Modal Titles
  h2:    21,  // Page Titles (H2)
  h1:    24,  // Haupttitel (H1)
};

/* ── Abstände ──────────────────────────────────────────────────
   Konsistentes 4px-Raster
   ──────────────────────────────────────────────────────────── */
export const SPACE = {
  1:  4,    // micro
  2:  8,    // small gap
  3:  12,   // medium gap
  4:  16,   // section gap
  5:  20,   // panel padding
  6:  24,   // large spacing
  8:  32,   // page padding desktop
  12: 48,   // section spacing
};

/* ── Border Radius ─────────────────────────────────────────────
   ──────────────────────────────────────────────────────────── */
export const RADIUS = {
  xs:  4,    // Micro badges, tags
  sm:  6,    // Buttons, inputs (Standard)
  md:  8,    // Segments, dropdowns
  lg:  10,   // Cards, panels
  xl:  12,   // Grosse Cards, Modals
  pill:20,   // Pill-Buttons, Chips
  full:"50%",// Avatare
};

/* ── Buttons ───────────────────────────────────────────────────
   Min. 44px Höhe für Touch-Targets (Apple HIG / Material)
   ──────────────────────────────────────────────────────────── */
export const BTN = {
  /* Padding: vertical muss 44px Gesamthöhe ergeben */
  pad: {
    sm:  "8px 14px",    // ~32px hoch — nur für dichte UI (Tabellen)
    md:  "10px 16px",   // ~38px hoch — Standard
    lg:  "12px 20px",   // ~44px hoch — PWA-tauglich, Hauptaktionen
    xl:  "14px 24px",   // ~48px hoch — Login, CTAs
  },
  radius: 10,           // Einheitlicher Button-Radius
};

/* ── Touch Targets ─────────────────────────────────────────────
   Mindestgrössen für Mobile
   ──────────────────────────────────────────────────────────── */
export const TOUCH = {
  min:    44,   // Minimum Touch-Target (Apple/Google Guideline)
  icon:   44,   // Icon-Buttons
  nav:    56,   // Bottom-Nav-Items
  input:  44,   // Inputs
};

/* ── Farben ────────────────────────────────────────────────────
   Semantische Farben (unabhängig vom Theme)
   ──────────────────────────────────────────────────────────── */

/* Status */
export const COLOR = {
  /* Fehler / Gefahr */
  danger:     "#E24B4A",
  dangerBg:   "#FEF2F2",
  dangerText: "#C8102E",

  /* Erfolg */
  success:    "#22C55E",
  successBg:  "#ECFDF5",
  successText:"#15803D",

  /* Warnung */
  warning:    "#F97316",
  warningBg:  "#FFF7ED",
  warningText:"#C2410C",

  /* Info */
  info:       "#3B82F6",
  infoBg:     "#EFF6FF",
  infoText:   "#1D4ED8",

  /* Neutral */
  dark:       "#1A1A1A",
  gray:       "#888780",
  lightGray:  "#F5F5F3",
  border:     "#E0DED8",
};

/* Theme-abhängige Farben (via CSS-Variablen) */
export const THEME = {
  /* Vereinsfarben (überschrieben via applyThemeCss) */
  accent:     "var(--cc-accent,#FEC604)",
  accent2:    "var(--cc-accent2,#000000)",
  accent20:   "var(--cc-accent-20,rgba(254,198,4,0.12))",
  accent15:   "var(--cc-accent-15,rgba(254,198,4,0.09))",
  accent12:   "var(--cc-accent-12,rgba(254,198,4,0.07))",

  /* Buttons */
  btnPrimary: "var(--btn-primary,#FEC604)",
  btnText:    "var(--btn-primary-text,#000)",
  btnHover:   "var(--btn-hover,#E6AC00)",

  /* Navigation */
  nav:        "var(--nav,#000000)",
  navText:    "var(--nav-t,#FFFFFF)",
  navAccent:  "var(--nav-a,#FEC604)",

  /* Surfaces */
  bg:         "var(--bg)",
  surface:    "var(--surface)",
  surface2:   "var(--surface2)",
  text:       "var(--text)",
  sub:        "var(--sub)",
  border:     "var(--border)",
};

/* Kurzaliase (Kompatibilität mit bestehendem Code) */
export const BTN_COLOR  = THEME.btnPrimary;
export const BTN_TXT    = THEME.btnText;
export const BTN_HOV    = THEME.btnHover;
export const ACCENT     = THEME.accent;
export const ACCENT2    = THEME.accent2;
export const ACCENT20   = THEME.accent20;
export const ACCENT15   = THEME.accent15;
export const ACCENT12   = THEME.accent12;
export const GN         = COLOR.success;     // Grün
export const GNL        = COLOR.successBg;
export const R          = COLOR.dangerText;  // Rot
export const RL         = COLOR.dangerBg;
export const BL         = COLOR.info;        // Blau
export const BLL        = COLOR.infoBg;
export const AM         = COLOR.warning;     // Amber/Orange
export const AML        = COLOR.warningBg;
export const BK         = COLOR.dark;        // Schwarz
export const GR         = COLOR.lightGray;
export const GB         = COLOR.border;

/* ── Breakpoints ───────────────────────────────────────────── */
export const BP = {
  mobile: 768,
  tablet: 1024,
};
export const BP_MOBILE = BP.mobile;
export const BP_TABLET = BP.tablet;

/* ── Schatten ──────────────────────────────────────────────── */
export const SHADOW = {
  card:   "0 1px 4px rgba(0,0,0,0.06)",
  modal:  "0 8px 40px rgba(0,0,0,0.18)",
  nav:    "0 -2px 16px rgba(0,0,0,0.25)",
};

/* ── Animationen ───────────────────────────────────────────── */
export const TRANSITION = {
  fast:   "0.1s ease",
  normal: "0.15s ease",
  slow:   "0.25s ease",
};

/* ── Avatar-Grössen ────────────────────────────────────────── */
export const AV = { SM: 24, MD: 32, LG: 44 };

/* ── Icon-Grössen ──────────────────────────────────────────── */
export const ICON = { SM: 14, MD: 16, LG: 20 };

/* ── Status-Hintergründe ───────────────────────────────────── */
export const STATUS_BG  = { warn:"#FEF3C7", danger:"#FEF2F2", info:"#EFF6FF", success:"#ECFDF5" };
export const STATUS_CLR = { warn:"#92400E", danger:"#991B1B", info:"#1E40AF", success:"#065F46" };

/* ── Font Weights ─────────────────────────────────────────── */
export const FW = {
  normal:   400,  // Fliesstext
  medium:   500,  // Labels, Werte, Buttons ← Standard
  semibold: 600,  // Überschriften, wichtige Werte
  bold:     700,  // Page Headers (sparsam)
};

/* ── Hardcoded Werte als Konstanten ───────────────────────── */
export const WHITE   = "#fff";
export const AM_DARK = "#92400E";
export const VIOLET  = "#7C3AED";
export const CYAN    = "#0891B2";
