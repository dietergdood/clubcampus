/* ═══════════════════════════════════════════════════════════════
   ClubCampus Theme — theme.jsx
   Theme-System, Logo, CSS-Variablen, Default-Farben
   ═══════════════════════════════════════════════════════════════ */
import { createContext, useContext, useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { TI } from "./icons.jsx";
import { ACCENT, ACCENT2, ACCENT20, BK, BL, BP_MOBILE, BP_TABLET, BTN_COLOR as BTN, BTN_TXT, FONT, R } from "./constants.js";


const LOGO_B64="data:image/png;base64,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";

const ThemeCtx = createContext({dark:false, toggle:()=>{}});
const useTheme = ()=>useContext(ThemeCtx);

const PWA_CSS=`
body{font-size:14px;font-family:inherit;margin:0;padding:0}
:root{
  --bg:#F5F5F3;
  --surface:#FFFFFF;
  --surface2:#F0F0F0;
  --border:#E0DED8;
  --text:#1A1A1A;
  --sub:#888780;
  --card-shadow:0 1px 4px rgba(0,0,0,0.06);
}
[data-theme=dark]{
  --bg:#111111;
  --surface:#1C1C1E;
  --surface2:#2C2C2E;
  --border:#3A3A3C;
  --text:#F5F5F3;
  --sub:#888780;
  --card-shadow:0 1px 4px rgba(0,0,0,0.3);
}
@keyframes cc-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes cc-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes cc-dot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}

/* ── Base ── */
.cc-page{animation:cc-in 0.15s ease-out}
.cc-card{background:var(--surface)!important;border:none!important;box-shadow:0 1px 4px rgba(0,0,0,0.06)!important}
.cc-stat-card{background:var(--surface);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);flex:1;min-width:0;display:flex;flex-direction:column}
.cc-topbar{background:var(--bg)!important;border-color:var(--border)!important}
.cc-main{background:var(--bg)!important}

/* ── Nav (nur font tweaks, kein Layout) ── */
.cc-nav-item{font-size:14px!important;font-weight:400!important}
.cc-nav-item:not(.cc-nav-active):hover{background:var(--nav-hover,#1A1A1A)!important}
.cc-nav-active{font-weight:500!important}

/* ── Icon Button ── */
.cc-icon-btn{width:32px;height:32px;border-radius:6px;border:1px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background 0.1s,border-color 0.1s,color 0.1s;color:var(--sub);padding:0}
.cc-icon-btn:hover{background:var(--surface2)!important;border-color:var(--border)!important;color:var(--text)!important}
.cc-icon-btn:active{transform:scale(0.95)}
.cc-input-icon{color:var(--sub);flex-shrink:0}
.cc-empty-icon{color:var(--border);display:block;margin:0 auto 12px}

/* ── Button Group ── */
.cc-btn-group{display:flex;align-items:center;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--surface2)}
.cc-btn-group-item{height:32px;min-width:32px;padding:0 10px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--sub);transition:background 0.1s,color 0.1s;flex-shrink:0;font-size:14px}
.cc-btn-group-item:hover{background:var(--surface);color:var(--text)}
.cc-btn-group-item:active{transform:scale(0.95)}
.cc-btn-group-active{background:var(--text)!important;color:var(--bg)!important}
.cc-btn-group-sep{width:1px;height:20px;background:var(--border);flex-shrink:0}

/* ── Segment ── */
.cc-seg{display:flex;gap:2px;background:var(--surface2);border-radius:8px;padding:3px}
.cc-seg-item{flex:1;padding:5px 10px;border-radius:6px;border:none;cursor:pointer;font-size:14px;font-weight:400;background:transparent;color:var(--sub);transition:all 0.1s;white-space:nowrap;font-family:inherit}
.cc-seg-item:hover{color:var(--text)}
.cc-seg-item:active{transform:scale(0.98)}
.cc-seg-active{background:var(--surface)!important;color:var(--text)!important;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,0.08)}

/* ── Chip Toggle ── */
.cc-chip-toggle{padding:3px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--sub);font-size:12px;font-weight:500;cursor:pointer;transition:all 0.1s;white-space:nowrap;flex-shrink:0;font-family:inherit}
.cc-chip-toggle:hover{border-color:var(--text);color:var(--text)}
.cc-chip-toggle:active{transform:scale(0.97)}
.cc-chip-active{border-color:var(--text)!important;background:var(--text)!important;color:var(--bg)!important}

/* ── Input ── */
.cc-input{width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;transition:border-color 0.1s,box-shadow 0.1s}
.cc-input:focus{border-color:var(--cc-accent,#FFBF00);box-shadow:0 0 0 3px var(--cc-accent-20,rgba(255,191,0,0.15))}
select.cc-input{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:32px;cursor:pointer}

/* ── Label ── */
.cc-label{font-size:12px;font-weight:600;color:var(--sub);margin-bottom:5px;display:block;letter-spacing:0.01em}

/* ── Toggle ── */
.cc-toggle{width:44px;height:24px;border-radius:12px;border:none;cursor:pointer;background:var(--border);position:relative;flex-shrink:0;transition:background 0.15s;padding:0;outline:none}
.cc-toggle:active{transform:scale(0.96)}
.cc-toggle-on{background:#16A34A}
.cc-toggle-dark.cc-toggle-on{background:#1A1A1A}
.cc-toggle-knob{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:left 0.15s cubic-bezier(0.34,1.2,0.64,1);display:flex;align-items:center;justify-content:center}
.cc-toggle-knob-on{left:23px;background:#fff}
.cc-toggle-dark .cc-toggle-knob-on{background:var(--cc-accent,#FFBF00)}

/* ── Primary Button ── */
.cc-btn-primary:hover{background:var(--btn-hover)!important;}
.cc-btn-primary:active{transform:scale(0.97)}
.cc-btn-outline{font-size:12px;font-weight:500;color:var(--sub);border:0.5px solid var(--border);border-radius:6px;padding:4px 10px;background:transparent;cursor:pointer;white-space:nowrap;font-family:inherit;transition:background 0.15s,color 0.15s;display:inline-flex;align-items:center;gap:4px}
.cc-btn-outline:hover{background:var(--surface2);color:var(--text)}

/* ── Unread dot ── */
.cc-unread-dot{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;border:2px solid var(--surface)}

/* ── Utilities ── */
.cc-flex-center{display:flex;align-items:center;justify-content:center}
.cc-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-divider{height:1px;background:var(--border);flex-shrink:0}
.cc-form-field{display:flex;flex-direction:column;gap:4px}
.cc-shimmer{background:linear-gradient(90deg,var(--surface2) 25%,var(--border) 50%,var(--surface2) 75%);background-size:200% 100%;animation:cc-shimmer 1.4s ease-in-out infinite}
.cc-hov-row:hover{background:var(--surface2)!important;cursor:pointer}

/* ── Tabellen ── */
.cc-table{width:100%;border-collapse:collapse;font-size:14px}
.cc-th{padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--sub);border-top:1px solid var(--border);border-bottom:1px solid var(--cc-accent,#FFBF00);border-left:none;border-right:none;background:var(--surface2);white-space:nowrap;cursor:pointer}
.cc-th:first-child{border-left:1px solid var(--border)}
.cc-th:last-child{border-right:1px solid var(--border)}
.cc-th-center{text-align:center}
.cc-td{padding:9px 12px;border-bottom:0.5px solid var(--border);color:var(--text);vertical-align:middle}
.cc-tr:hover .cc-td{background:var(--cc-hover,rgba(255,191,0,0.19));cursor:pointer}
.cc-tr:last-child .cc-td{border-bottom:none}
.cc-tr-zebra:nth-child(even) .cc-td{background:var(--surface2)}
.cc-tr-zebra:nth-child(odd) .cc-td{background:var(--surface)}

/* ── Listen ── */
.cc-list{border:0.5px solid var(--border);border-radius:10px;overflow:hidden}
.cc-list-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:0.5px solid var(--border);transition:background 0.1s}
.cc-list-row:last-child{border-bottom:none}
.cc-list-row:hover{background:var(--cc-hover,rgba(255,191,0,0.19));cursor:pointer}
.cc-list-name{font-weight:500;font-size:14px;color:var(--text);white-space:nowrap}
.cc-detail-label{font-size:14px;color:var(--sub);min-width:120px;flex-shrink:0}
.cc-empty{padding:32px;text-align:center;color:var(--sub);font-size:14px}
.cc-inline-field{position:relative;cursor:pointer;border-radius:5px;padding:2px 6px;margin:-2px -6px;transition:background 0.1s}
.cc-inline-field:hover{background:var(--surface)}
.cc-inline-field:hover .cc-inline-pencil{opacity:1}
.cc-inline-pencil{opacity:0;color:var(--sub);font-size:12px;margin-left:5px;transition:opacity 0.1s}
.cc-inline-empty{color:var(--sub);font-style:italic}
.cc-inline-input{width:100%;font-size:13px;height:28px;border:1.5px solid var(--cc-accent,#FFBF00);border-radius:5px;padding:0 8px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box}
.cc-inline-select{width:100%;font-size:13px;height:28px;border:1.5px solid var(--cc-accent,#FFBF00);border-radius:5px;padding:0 6px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box}
.cc-inline-hint{font-size:10px;color:var(--sub);margin-top:2px}
.cc-inline-feedback-ok{font-size:13px;color:var(--green,#3B6D11);display:flex;align-items:center;gap:4px}
.cc-inline-feedback-err{font-size:13px;color:var(--red,#A32D2D);display:flex;align-items:center;gap:4px}
.cc-empty-state{padding:32px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px}
.cc-empty-state-icon{width:48px;height:48px;border-radius:12px;background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--sub);margin-bottom:4px}
.cc-empty-state-icon-danger{color:var(--red,#E24B4A)}
.cc-empty-state-title{font-size:14px;font-weight:500;color:var(--text)}
.cc-empty-state-sub{font-size:12px;color:var(--sub);line-height:1.5;max-width:240px}
.cc-empty-state-btn{margin-top:8px;font-size:12px;padding:6px 14px;border-radius:var(--cc-radius,8px);border:0.5px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}
.cc-empty-state-btn:hover{background:var(--surface)}
.cc-verlauf-list{display:flex;flex-direction:column}
.cc-verlauf-date-sep{display:flex;align-items:center;gap:10px;padding:10px 0 4px}
.cc-verlauf-date-line{flex:1;height:0.5px;background:var(--border)}
.cc-verlauf-date-label{font-size:11px;font-weight:500;color:var(--sub);white-space:nowrap}
.cc-verlauf-item{padding:10px 0}
.cc-verlauf-item-border{border-bottom:0.5px solid var(--border)}
.cc-verlauf-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.cc-verlauf-feld{font-size:13px;font-weight:500;color:var(--text)}
.cc-verlauf-aktivitaet{font-size:13px;color:var(--text);display:flex;align-items:center;gap:6px}
.cc-verlauf-aktivitaet-icon{display:flex;align-items:center;color:var(--sub)}
.cc-verlauf-meta{display:flex;align-items:center;gap:10px}
.cc-verlauf-user{font-size:11px;color:var(--sub);display:flex;align-items:center;gap:3px}
.cc-verlauf-datum{font-size:11px;color:var(--sub)}
.cc-verlauf-werte{display:flex;align-items:center;gap:8px;font-size:13px}
.cc-verlauf-alt{color:var(--sub);text-decoration:line-through}
.cc-verlauf-neu{color:var(--text);font-weight:500}
.cc-table-wrap{background:var(--surface);border-radius:0 0 11px 11px}
.cc-table-wrap-inner{overflow-x:auto;overflow-y:auto;width:100%;max-height:calc(100vh - 268px)}
.cc-table-wrap-inner{overflow-x:auto}
.cc-grid-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;align-items:stretch}
.cc-grid-stats-sm{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.cc-grid-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start}
.cc-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:stretch}
.cc-grid-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cc-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.cc-count{font-size:11px;font-weight:400;color:var(--sub);opacity:0.7;margin-left:4px}
.cc-check-row{display:flex;align-items:center;gap:12px;padding:7px 10px;border-radius:8px;background:var(--surface2);cursor:pointer}

/* ── Formulare ── */
.cc-field{display:flex;flex-direction:column;gap:5px}
.cc-input-error{border-color:#C8102E!important;box-shadow:0 0 0 3px rgba(200,16,46,0.1)!important}
.cc-error-msg{font-size:11px;color:#C8102E;display:flex;align-items:center;gap:4px;margin-top:3px}

/* ── Section Header ── */
.cc-section-hdr{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:var(--sub);padding:6px 12px;border-bottom:0.5px solid var(--border);border-top:0.5px solid var(--border);margin-bottom:0;display:flex;align-items:center;gap:6px;background:var(--bg)}

/* ── Modal Layout ── */
.cc-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px}
.cc-modal-box{background:var(--surface);border-radius:20px;width:100%;max-height:95vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,0.18)}
.cc-modal-scroll{overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.cc-modal-scroll::-webkit-scrollbar{width:4px}
.cc-modal-scroll::-webkit-scrollbar-track{background:transparent}
.cc-modal-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.cc-modal-scroll::-webkit-scrollbar-thumb:hover{background:var(--sub)}
.cc-modal-scroll-wrap{position:relative;flex:1;overflow:hidden;display:flex;flex-direction:column}
.cc-modal-scroll-fade{position:absolute;bottom:0;left:0;right:0;height:32px;background:linear-gradient(transparent,var(--surface));pointer-events:none;z-index:1}
.cc-sheet-overlay{position:fixed;inset:0;z-index:2000;display:flex;flex-direction:column;justify-content:flex-end}
.cc-sheet-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.5)}
.cc-sheet-box{position:relative;background:var(--surface);border-radius:20px 20px 0 0;max-height:95vh;display:flex;flex-direction:column;box-shadow:0 -4px 32px rgba(0,0,0,0.18)}
.cc-sheet-handle{display:flex;justify-content:center;padding:12px 0 4px}
.cc-sheet-handle-bar{width:40px;height:4px;border-radius:2px;background:var(--border)}
.cc-modal-hdr{padding:16px 20px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.cc-modal-title{font-size:16px;font-weight:700;color:var(--text)}
.cc-modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1}
.cc-modal-ftr{padding:12px 20px 20px;border-top:0.5px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0}

/* ── Page Title ── */
.cc-page-title{font-size:21px;font-weight:700;color:var(--text);letter-spacing:-0.3px;margin-bottom:4px}
.cc-page-sub{font-size:14px;color:var(--sub);margin-bottom:20px}

/* ── Avatar ── */
.cc-av{display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0}
.cc-av-sm{width:24px;height:24px;border-radius:6px;font-size:9px}
.cc-av-md{width:32px;height:32px;border-radius:8px;font-size:11px}
.cc-av-lg{width:40px;height:40px;border-radius:10px;font-size:14px}

@media(max-width:680px){
  .cc-grid-stats{grid-template-columns:repeat(2,1fr)!important}
  .cc-grid-cards{grid-template-columns:1fr!important;}
}
.cc-stat-value{font-size:28px;font-weight:600}
.cc-h1{font-size:24px;font-weight:700;color:var(--text);letter-spacing:-0.3px}
.cc-h2{font-size:18px;font-weight:600;color:var(--text);letter-spacing:-0.2px}
.cc-stitle{display:flex;justify-content:space-between;align-items:center}
.cc-stitle-text{margin:0;font-size:14px;font-weight:600;letter-spacing:-0.2px;color:var(--text)}

/* ── Layout Utilities ── */
.cc-row{display:flex;align-items:center;gap:8px}
.cc-col{display:flex;flex-direction:column;gap:8px}
.cc-between{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.cc-page-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
.cc-gap-4{gap:4px!important}.cc-gap-5{gap:5px!important}.cc-gap-6{gap:6px!important}.cc-gap-8{gap:8px!important}.cc-gap-12{gap:12px!important}.cc-gap-16{gap:16px!important}.cc-gap-20{gap:20px!important}
.cc-mb-4{margin-bottom:4px!important}.cc-mb-8{margin-bottom:8px!important}.cc-mb-12{margin-bottom:12px!important}.cc-mb-16{margin-bottom:16px!important}.cc-mb-20{margin-bottom:20px!important}.cc-mb-24{margin-bottom:24px!important}
.cc-mt-8{margin-top:8px!important}.cc-mt-10{margin-top:10px!important}.cc-mt-12{margin-top:12px!important}.cc-mt-16{margin-top:16px!important}.cc-mt-20{margin-top:20px!important}
.cc-ml-12{margin-left:12px!important}.cc-py-16{padding-top:16px!important;padding-bottom:16px!important}
.cc-w-full{width:100%}.cc-flex-1{flex:1}.cc-shrink-0{flex-shrink:0}
.cc-text-right{text-align:right}.cc-relative{position:relative}.cc-cursor-pointer{cursor:pointer}
.cc-label-req{color:var(--red,#A32D2D)}
.cc-hint-sub{font-size:11px;color:var(--sub);margin-top:3px}
.cc-info-hint{font-size:12px;color:var(--sub);padding:8px 10px;background:var(--surface);border-radius:6px;border:0.5px solid var(--border);display:flex;gap:6px;align-items:flex-start}

/* ── Typography Utilities ── */
.cc-text-sm{font-size:13px;color:var(--sub)}.cc-text-xs{font-size:12px;color:var(--sub)}
.cc-text-bold{font-weight:600;color:var(--text)}.cc-text-sub{color:var(--sub)}
.cc-text-body{font-size:14px;color:var(--text);line-height:1.6}
.cc-text-muted{opacity:0.6;font-weight:400}
.cc-text-center{text-align:center}
.cc-text-lg{font-size:15px}
.cc-stat-val{font-size:22px;font-weight:700;color:var(--text);line-height:1}
.cc-surface2{background:var(--surface2)}
.cc-surface-card{background:var(--surface2);border-radius:10px;overflow:hidden}
.cc-card-table{padding:0;overflow:visible;border-radius:0 0 12px 12px;border-top:none}
.cc-card-flush{padding:0;overflow:visible}
.cc-clickable{cursor:pointer;user-select:none}
.cc-chip-row{display:flex;flex-wrap:wrap;gap:6px}
.cc-tabs-bar{border-top:0.5px solid var(--border);padding:0 20px;display:flex;gap:0;overflow-x:auto}
.cc-sort-arrow{margin-left:4px;font-size:11px;opacity:1;color:var(--sub)}
.cc-sort-hover-icon{margin-left:3px;font-size:9px;color:var(--sub);opacity:0;transition:opacity 0.15s}
.cc-members-th:hover .cc-sort-hover-icon{opacity:0.4}
.cc-hint-box{padding:8px 12px;background:var(--surface);border-radius:8px;font-size:14px;color:var(--sub);display:flex;align-items:center;gap:8px}
.cc-hero-tabs-wrap{padding:0 20px}
.cc-empty-lg{padding:60px}
.cc-filter-row{flex-wrap:wrap;align-items:center}
.cc-filter-pill{padding:4px 10px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;background:none;font-family:inherit;border:0.5px solid var(--border);color:var(--sub);transition:all 0.1s}
.cc-back-btn{margin-left:-8px;margin-bottom:4px}
.cc-section-label{padding:10px 13px 6px;background:var(--surface2);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--sub)}
.cc-land-badge{font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;background:var(--surface2);border:0.5px solid var(--border);color:var(--sub);letter-spacing:0.05em;flex-shrink:0}
.cc-land-wrap{position:relative;width:100%}
.cc-land-trigger{display:flex;align-items:center;gap:8px;padding:7px 10px;border:0.5px solid var(--border);border-radius:8px;background:var(--surface2);cursor:pointer;font-size:14px;color:var(--text);width:100%;text-align:left;font-family:inherit}
.cc-land-trigger:focus{outline:2px solid var(--cc-accent,#FFBF00);outline-offset:1px}
.cc-land-flag{font-size:18px;flex-shrink:0;line-height:1}
.cc-land-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-land-chevron{flex-shrink:0;color:var(--sub);font-size:12px}
.cc-land-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.12);z-index:500;overflow:hidden}
.cc-land-search{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--border)}
.cc-land-search-input{border:none;background:transparent;font-size:13px;color:var(--text);outline:none;flex:1;font-family:inherit}
.cc-land-list{max-height:220px;overflow-y:auto;overscroll-behavior:contain}
.cc-land-option{display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;font-size:13px;color:var(--text)}
.cc-land-option:hover{background:var(--surface2)}
.cc-land-option-flag{font-size:18px;flex-shrink:0;line-height:1}
.cc-land-option-name{flex:1}
.cc-land-option-active{background:var(--surface2);font-weight:600}
.cc-land-empty{padding:12px;font-size:13px;color:var(--sub);text-align:center}
.cc-eltern-av{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.cc-eltern-badge{font-size:11px;padding:2px 7px;border-radius:20px;border:0.5px solid var(--border);color:var(--sub)}
.cc-eltern-badge[data-rel="mutter"],.cc-eltern-badge[data-rel="grossmutter"]{background:#FDF2F8;border-color:#FBCFE8;color:#9D174D}
.cc-eltern-badge[data-rel="vater"],.cc-eltern-badge[data-rel="grossvater"]{background:#EFF6FF;border-color:#BFDBFE;color:#1E40AF}
.cc-eltern-portal-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;margin-top:10px;border-top:0.5px solid var(--border);gap:12px}
.cc-flex-wrap{flex-wrap:wrap}
/* ── Dropdown Menu ── */
.cc-menu-wrap{position:relative;flex-shrink:0}
.cc-menu-trigger{width:28px;height:28px;border-radius:7px;border:0.5px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--sub)}
.cc-menu-trigger:hover{background:var(--surface2)}
.cc-hero-banner-actions .cc-menu-trigger{border-color:var(--border);background:var(--surface2);color:var(--text)}
.cc-hero-banner-actions .cc-menu-trigger:hover{background:var(--surface)}
.cc-menu{background:var(--surface);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.1);min-width:160px;overflow:hidden;z-index:9999}
.cc-menu-item{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13px;color:var(--text);cursor:pointer;background:none;border:none;width:100%;text-align:left;font-family:inherit}
.cc-menu-item:hover{background:var(--surface2)}
.cc-menu-item-danger{color:var(--r,#DC2626)}
.cc-menu-item-danger:hover{background:var(--rl,#FEF2F2)}
.cc-menu-sep{height:0.5px;background:var(--border)}
.cc-btn-success{padding:5px 12px;border-radius:8px;background:#F0FDF4;border:0.5px solid #BBF7D0;color:#166534;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit}
.cc-btn-success:hover{background:#DCFCE7}
.cc-btn-danger{padding:5px 12px;border-radius:8px;background:#FEF2F2;border:0.5px solid #FECACA;color:#991B1B;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit}
.cc-btn-danger:hover{background:#FEE2E2}
.cc-items-end{align-items:flex-end}
.cc-items-center{align-items:center}
.cc-status-active{font-size:12px;color:#16A34A;font-weight:600;display:flex;align-items:center;gap:4px}
.cc-status-active::before{content:"";width:7px;height:7px;border-radius:50%;background:#16A34A;flex-shrink:0;display:inline-block}
.cc-status-inactive{font-size:12px;color:#DC2626;font-weight:600;display:flex;align-items:center;gap:4px}
.cc-status-inactive::before{content:"";width:7px;height:7px;border-radius:50%;background:#DC2626;flex-shrink:0;display:inline-block}
.cc-status-hauptkontakt{font-size:12px;color:#c2410c;font-weight:600}
.cc-ml-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:0;padding:7px 12px;border-bottom:0.5px solid var(--border);background:var(--surface);border:0.5px solid var(--border);border-radius:12px 12px 0 0;border-bottom:0.5px solid var(--border)}
.cc-ml-dropdown-wrap{position:relative;flex-shrink:0;z-index:300}
.cc-ml-dropdown{position:absolute;top:calc(100% + 4px);right:0;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.12);overflow:visible;z-index:200}
.cc-ml-filter-dropdown{min-width:240px}
.cc-filter-search{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:0.5px solid var(--border)}
.cc-filter-search input{flex:1;border:0.5px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--surface-1,#f5f5f5);color:var(--text);outline:none;font-family:inherit}
.cc-filter-search input:focus{border-color:var(--cc-accent,#FFBF00)}
@media(max-width:680px){.cc-filter-search{padding:8px 20px}.cc-filter-search input{font-size:16px;padding:6px 12px;border-radius:8px}}
.cc-filter-sec-hdr{display:flex;align-items:center;gap:6px;padding:8px 12px 5px;cursor:pointer;border-bottom:2px solid var(--cc-accent,#FFBF00);user-select:none}
.cc-filter-divider{height:0;border:none;border-top:1px solid var(--border-strong);margin:8px 0}
.cc-filter-sec-name{flex:1;font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.05em}
.cc-filter-sec-badge{font-size:10px;background:var(--cc-accent,#FFBF00);color:#000;font-weight:600;border-radius:10px;padding:1px 6px;min-width:18px;text-align:center}
.cc-filter-sec-body{padding:4px 0 8px}
.cc-range-slider{width:100%;accent-color:var(--cc-accent,#FFBF00)}
.cc-filter-sec-body .cc-col-menu-item{padding:8px 12px}
.cc-filter-checkbox{width:14px;height:14px;accent-color:#000;flex-shrink:0;pointer-events:none}
.cc-range-filter-wrap{padding:8px 12px 10px}
.cc-range-filter-wrap-lg{padding:8px 20px 10px}
.cc-range-input{width:72px;border:0.5px solid var(--border);border-radius:6px;padding:4px 7px;font-size:12px;background:var(--surface-1,#f5f5f5);color:var(--text);outline:none;font-family:inherit}
.cc-range-sep{font-size:11px;color:var(--sub)}
.cc-range-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--sub);margin-top:3px}
.cc-filter-mobile-sec{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.07em;padding:14px 20px 6px;background:var(--surface-1);border-bottom:0.5px solid var(--border)}
.cc-filter-mobile-item{display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:0.5px solid var(--border);cursor:pointer}
.cc-filter-mobile-item span{font-size:14px;color:var(--text)}
.cc-filter-mobile-divider{height:8px;background:var(--surface-1);border-top:0.5px solid var(--border);border-bottom:0.5px solid var(--border)}
.cc-filter-mobile-footer{padding:12px 20px}
.cc-filter-or-badge{font-size:9px;font-weight:700;background:var(--surface2);border:0.5px solid var(--border);color:var(--sub);padding:2px 6px;border-radius:3px;align-self:center}
.cc-filter-und-badge{font-size:9px;font-weight:700;background:var(--surface2);border:0.5px solid var(--border);color:var(--sub);padding:2px 6px;border-radius:3px;align-self:center}
.cc-filter-or-sep{display:flex;align-items:center;gap:8px;padding:4px 12px;border-top:0.5px solid var(--border)}
.cc-filter-or-line{flex:1;height:0.5px;background:var(--border)}
.cc-ml-chip-or{font-size:11px;color:var(--sub);padding:0 2px;font-style:italic}
.cc-group-drag-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--border);cursor:grab;background:var(--surface2);font-size:13px}
.cc-group-drag-item:hover{background:var(--surface2)}
.cc-group-drag-item.cc-drag-over{border-top:2px solid var(--cc-accent,#FFBF00)}
.cc-group-drag-handle{color:var(--sub);cursor:grab;font-size:14px;flex-shrink:0}
.cc-group-drag-nr{width:18px;height:18px;border-radius:50%;background:var(--cc-accent,#FFBF00);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;flex-shrink:0}
.cc-group-inactive-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--border);cursor:pointer;font-size:13px;color:var(--text)}
.cc-group-inactive-item:hover{background:var(--surface2);color:var(--text)}
.cc-group-mobile-level{display:flex;align-items:center;gap:10px;padding:13px 20px;border-bottom:0.5px solid var(--border);cursor:pointer}
.cc-group-mobile-dot{width:22px;height:22px;border-radius:50%;background:var(--cc-accent,#FFBF00);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;flex-shrink:0}
.cc-group-mobile-dot-empty{width:22px;height:22px;border-radius:50%;background:var(--surface2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--sub);flex-shrink:0}
.cc-group-mobile-lbl{flex:1;font-size:15px;color:var(--text)}
.cc-group-mobile-lbl-empty{flex:1;font-size:14px;color:var(--sub)}
.cc-group-preview{padding:10px 20px;font-size:12px;color:var(--sub);border-top:0.5px solid var(--border);background:var(--surface2)}
.cc-filter-mobile-checkbox{width:16px;height:16px;accent-color:#000;flex-shrink:0;pointer-events:none}
@media(max-width:680px){.cc-filter-sec-hdr{padding:15px 20px 17px}.cc-filter-sec-name{font-size:13px}.cc-filter-sec-badge{font-size:12px;padding:2px 8px}.cc-mehr-sheet-item{padding:14px 20px;font-size:15px}.cc-filter-divider{margin:8px 0}}
.cc-ml-group-dropdown{min-width:200px;white-space:nowrap}
.cc-ml-dropdown-section-lbl{padding:13px 12px 13px;font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.05em;border-top:0.5px solid var(--border)}
.cc-ml-dropdown-footer{padding:8px 12px;border-top:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.cc-filter-footer{padding:8px 12px;border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.cc-ml-dropdown-clear{font-size:12px;color:var(--sub);background:none;border:none;cursor:pointer;font-family:inherit}
.cc-ml-dropdown-clear:hover{color:var(--text)}
@media(max-width:680px){.cc-ml-dropdown-clear{font-size:15px;padding:4px 0}}
.cc-ml-dropdown-apply{font-size:12px;font-weight:600;color:#000;background:var(--cc-accent,#FFBF00);border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-family:inherit}
.cc-multiselect{position:relative;width:100%}
.cc-multiselect-trigger{width:100%;padding:8px 12px;border:0.5px solid var(--border);border-radius:8px;background:var(--surface2);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:var(--text);text-align:left;font-family:inherit}
.cc-multiselect-chips{display:flex;gap:4px;flex-wrap:wrap;flex:1;min-width:0}
.cc-multiselect-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500;background:var(--surface);border:0.5px solid var(--border);color:var(--text);white-space:nowrap}
.cc-multiselect-chip-x{cursor:pointer;color:var(--sub);font-size:13px;line-height:1}
.cc-multiselect-chip-x:hover{color:var(--text)}
.cc-multiselect-placeholder{color:var(--sub);font-size:13px}
.cc-multiselect-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.12);z-index:300;overflow:hidden;max-height:320px;display:flex;flex-direction:column}
.cc-multiselect-search{width:100%;padding:8px 12px;border:none;border-bottom:0.5px solid var(--border);font-size:13px;background:var(--surface2);color:var(--text);outline:none;font-family:inherit}
.cc-multiselect-list{max-height:300px;overflow-y:auto;flex:1}
.cc-multiselect-group{padding:5px 12px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sub);background:var(--surface2);border-top:0.5px solid var(--border)}
.cc-multiselect-group:first-child{border-top:none}
.cc-multiselect-item{display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;font-size:13px;color:var(--text)}
.cc-multiselect-item:hover{background:var(--surface2)}
.cc-multiselect-cb{width:16px;height:16px;border-radius:4px;border:0.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface)}
.cc-multiselect-cb-on{width:16px;height:16px;border-radius:4px;border:0.5px solid #22c55e;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#ECFDF5}
.cc-multiselect-footer{padding:8px 12px;border-top:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--sub)}
.cc-ml-srch{flex:1;max-width:65%;display:flex;align-items:center;gap:8px;padding:0 12px;height:36px;border:0.5px solid var(--border);border-radius:8px;background:var(--surface)}
.cc-ml-srch input{border:none;outline:none;background:transparent;font-size:14px;color:var(--text);flex:1;font-family:inherit}
.cc-ml-srch input::placeholder{color:var(--sub)}
@media(max-width:680px){.cc-ml-srch{max-width:60%;min-width:0}}
.cc-ml-btn{height:36px;padding:0 12px;display:flex;align-items:center;gap:6px;border:0.5px solid var(--border);border-radius:8px;background:var(--surface);color:var(--sub);font-size:13px;cursor:pointer;font-family:inherit;white-space:nowrap;position:relative}
.cc-ml-btn:hover{background:var(--surface2);color:var(--text)}
.cc-ml-btn.cc-active{border-color:var(--text);color:var(--text)}
.cc-ml-icon-btn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:0.5px solid var(--border);border-radius:8px;background:var(--surface);color:var(--sub);cursor:pointer;position:relative;flex-shrink:0}
.cc-ml-icon-btn:hover{background:var(--surface2);color:var(--text)}
.cc-ml-filter-dot{width:7px;height:7px;border-radius:50%;background:#f59e0b;position:absolute;top:5px;right:5px;border:1.5px solid var(--surface)}
.cc-ml-chips{display:flex;gap:6px;flex-wrap:wrap;padding:6px 12px;border-bottom:0.5px solid var(--border);margin-bottom:0}
.cc-ml-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 8px 3px 10px;border-radius:6px;font-size:12px;font-weight:500;background:var(--surface2);border:0.5px solid var(--border);color:var(--text);cursor:pointer}
.cc-ml-chip:hover{border-color:var(--sub)}
.cc-ml-chip-x{font-size:13px;color:var(--sub)}
/* Spalten-Icon im Tabellen-Header */
.cc-col-icon-btn{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:5px;border:0.5px solid var(--border);background:transparent;color:var(--sub);cursor:pointer;flex-shrink:0}
.cc-col-icon-btn:hover{background:var(--surface);color:var(--text);border-color:var(--sub)}
.cc-col-menu-wrap{position:relative;flex-shrink:0}
.cc-col-menu-dropdown{position:absolute;top:calc(100% + 4px);right:0;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.12);min-width:180px;overflow:hidden;z-index:200}
.cc-col-menu-hdr{padding:8px 12px;font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.05em;border-bottom:0.5px solid var(--border)}
.cc-col-menu-item{display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;color:var(--text);cursor:pointer}
.cc-col-menu-item:hover{background:var(--surface2)}
.cc-col-menu-check{width:16px;height:16px;border-radius:4px;border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cc-col-menu-check-on{background:var(--text);border-color:var(--text);color:var(--surface)}
/* Desktop Tabelle */
.cc-members-table{width:100%;border-collapse:collapse}
.cc-members-th{position:sticky;top:0;z-index:10;font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.06em;padding:6px 14px;border-top:1px solid var(--border);border-bottom:1px solid var(--cc-accent,#FFBF00);border-left:none;border-right:none;text-align:left;cursor:pointer;white-space:nowrap;background:var(--surface2)}
.cc-members-th:hover{color:var(--text)}
.cc-members-th:first-child{border-left:1px solid var(--border)}
.cc-members-th:last-child{border-right:1px solid var(--border)}
.cc-members-th-last{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cc-members-tr{border-bottom:0.5px solid var(--border);cursor:pointer;transition:background 0.1s}
.cc-members-tr:last-child{border-bottom:none}

.cc-members-tr:hover{background:var(--cc-accent-10,rgba(255,191,0,0.10))}
.cc-members-td{padding:10px 14px;font-size:14px;color:var(--text);white-space:nowrap;vertical-align:middle}
.cc-members-td-sub{font-size:13px;color:var(--sub)}
.cc-members-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0;margin-right:5px;vertical-align:middle}
.cc-members-dot-ok{background:#22c55e}
.cc-members-dot-warn{background:#f59e0b}
.cc-members-dot-err{background:#ef4444}
.cc-members-group-hdr{cursor:pointer}.cc-members-group-hdr td{padding:9px 14px;background:#EBEBEB;border-top:1px solid var(--border);border-bottom:0.5px solid var(--border)}.cc-members-group-hdr:hover td{background:#E0E0E0}.cc-members-group-hdr-inner{display:flex;align-items:center;gap:8px}.cc-members-group-hdr-chevron{color:var(--sub);flex-shrink:0}.cc-members-group-hdr-grip{color:var(--sub);margin-left:auto;opacity:0.25;flex-shrink:0;cursor:grab}.cc-members-group-hdr:hover .cc-members-group-hdr-grip{opacity:0.6}
.cc-members-tr-draggable{cursor:grab}.cc-members-tr-draggable:active{cursor:grabbing}.cc-group-drag-over td{box-shadow:inset 0 -3px 0 var(--cc-accent,#FFBF00)}.cc-members-group-hdr-name{font-size:11px;font-weight:600;color:var(--text);text-transform:uppercase;letter-spacing:0.07em}.cc-members-group-hdr-count{font-size:10px;color:var(--sub);font-weight:500;background:var(--border);border-radius:4px;padding:1px 5px;margin-left:2px}.cc-members-group-hdr-sub td{padding:7px 14px}
/* Mobile Liste */
.cc-members-list-group-hdr{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.08em;padding:8px 14px 4px;background:var(--surface2)}
.cc-members-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;background:var(--surface);transition:background 0.1s;justify-content:space-between}
.cc-members-item-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.cc-members-item-body{flex:1;min-width:0}
.cc-members-item-right{display:flex;align-items:center;flex-shrink:0}
.cc-members-item:last-child{border-bottom:none}
.cc-members-item:active{background:var(--surface2)}
.cc-members-item-meta{flex:1;min-width:0}
.cc-members-item-name{font-size:15px;font-weight:600;color:var(--text);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cc-members-item-sub{font-size:13px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cc-members-item-chevron{color:var(--border);flex-shrink:0}
.cc-members-item-more{font-size:11px;font-weight:600;color:var(--sub);background:var(--surface2);border:0.5px solid var(--border);border-radius:4px;padding:1px 5px;flex-shrink:0}
/* Foto-Klassen (auch für Kader) */
.cc-avatar-foto-sm{width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0}
.cc-avatar-foto-md{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0}
.cc-avatar-foto-lg{width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0}
.cc-warn-box{background:#fffbeb;border:0.5px solid var(--cc-accent-border,#fde68a);border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:6px}


.cc-team-position-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:0.5px solid var(--border)}
.cc-team-position-row:last-child{border-bottom:none}
.cc-team-position-body{flex:1;min-width:0}
.cc-team-position-name{font-size:14px;font-weight:500;color:var(--text);margin-bottom:8px}
.cc-team-position-name-link{font-size:14px;font-weight:500;color:var(--text);margin-bottom:8px;cursor:pointer;text-decoration:none}
.cc-team-position-name-link:hover{text-decoration:underline}
.cc-team-position-row-mobile{cursor:pointer}
.cc-team-position-chips{display:flex;flex-wrap:wrap;gap:4px}
.cc-team-role-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.cc-team-nr{width:26px;height:26px;border-radius:6px;background:var(--cc-accent,#FFBF00);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#7a5000;flex-shrink:0}
.cc-team-nr-empty{background:var(--surface2);color:var(--sub);font-weight:400;border:0.5px dashed var(--border)}
.cc-team-add-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:0.5px dashed var(--border);background:transparent;color:var(--sub);font-size:13px;cursor:pointer;width:100%;margin-top:10px;font-family:inherit;transition:border-color 0.15s,color 0.15s}
.cc-team-add-btn:hover{border-color:var(--text);color:var(--text)}
.cc-team-remove-btn{background:none;border:none;cursor:pointer;color:var(--sub);padding:4px;display:flex;align-items:center;opacity:0.6;transition:opacity 0.15s}
.cc-team-remove-btn:hover{opacity:1;color:var(--danger,#ef4444)}
.cc-pt-8{padding-top:8px}
.cc-mb-14{margin-bottom:14px}
.cc-text-accent{color:var(--cc-accent,#FFBF00);font-weight:600}
.cc-text-success{color:#16A34A}.cc-text-danger{color:#DC2626}.cc-text-warning{color:#D97706}

/* ── Card variants ── */
.cc-card-flat{background:var(--surface);border:0.5px solid var(--border);border-radius:12px;padding:16px 20px}
.cc-card-accent{background:var(--cc-accent-12,rgba(255,191,0,0.07));border:1px solid var(--cc-accent-20,rgba(255,191,0,0.2));border-radius:12px;padding:16px 20px}
.cc-card-success{background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:16px 20px}

/* ── Badges ── */
.cc-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:12px;font-weight:500;white-space:nowrap}
.cc-badge-success{background:#ECFDF5;color:#16A34A;border:1px solid #A7F3D0}
.cc-badge-danger{background:#FEF2F2;color:#DC2626;border:1px solid #FECACA}
.cc-badge-warning{background:#FFFBEB;color:#D97706;border:1px solid #FDE68A}
.cc-badge-neutral{background:var(--surface2);color:var(--sub);border:0.5px solid var(--border)}
.cc-badge-accent{background:var(--cc-accent-20,rgba(255,191,0,0.15));color:var(--cc-accent,#FFBF00);border:1px solid var(--cc-accent-20,rgba(255,191,0,0.3))}

/* ── Forms ── */
.cc-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cc-form-full{grid-column:1/-1}
.cc-textarea{resize:vertical;min-height:80px}
.cc-form-section-title{grid-column:1/-1;display:flex;align-items:center;gap:10px;margin:8px 0 2px}
.cc-form-section-title::before{content:attr(data-label);font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap}
.cc-form-section-title::after{content:"";flex:1;height:0.5px;background:var(--border)}
.cc-form-section-title:first-child{margin-top:0}
.cc-save-row{display:flex;gap:8px;margin-top:16px;padding-top:12px;border-top:0.5px solid var(--border)}

/* ── Info rows ── */


/* ── Section titles ── */
.cc-section-title{font-size:10px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.6px;margin:0 0 12px;display:flex;align-items:center;gap:5px}

/* ── Action buttons ── */
.cc-btn-danger{padding:8px 16px;border-radius:8px;border:0.5px solid #FECACA;background:#FEF2F2;color:#DC2626;font-size:14px;cursor:pointer;font-family:inherit;font-weight:500;transition:background 0.1s}
.cc-btn-danger:hover{background:#FEE2E2}
.cc-btn-success{padding:8px 16px;border-radius:8px;border:0.5px solid #A7F3D0;background:#ECFDF5;color:#16A34A;font-size:14px;cursor:pointer;font-family:inherit;font-weight:500;transition:background 0.1s}
.cc-btn-success:hover{background:#D1FAE5}
.cc-btn-ghost{padding:8px 16px;border-radius:8px;border:0.5px solid var(--border);background:var(--surface);color:var(--sub);font-size:14px;cursor:pointer;font-family:inherit;font-weight:400;transition:background 0.1s}
.cc-btn-ghost:hover{background:var(--surface2);color:var(--text)}

/* ── Profil-spezifisch (minimale Ergänzungen) ── */
.cc-profile-name{font-size:20px;font-weight:500;margin:0 0 2px;color:var(--text)}
.cc-member-hero{background:transparent;border:none;border-radius:16px;overflow:visible;margin-bottom:0;position:relative}
.cc-member-hero-banner{background:var(--nav,#000000);padding:12px 16px 10px;position:relative;display:flex;align-items:center;gap:12px;border-radius:16px 16px 0 0;border-bottom:3px solid var(--cc-accent,#FFBF00)}
[data-theme=dark] .cc-member-hero-banner{background:var(--nav,#000000)}
.cc-member-hero-banner .cc-page-title{color:var(--nav-t,#FFFFFF)}
.cc-hero-banner-actions{position:absolute;top:50%;right:12px;transform:translateY(-50%);display:flex;gap:8px;align-items:center}
.cc-hero-status-strip{display:flex;gap:6px;align-items:center}
.cc-hero-status-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;color:var(--nav-t,rgba(255,255,255,0.6));background:rgba(255,255,255,0.08);border:0.5px solid rgba(255,255,255,0.12);padding:3px 8px;border-radius:20px;white-space:nowrap}
.cc-hero-status-pill-ok{color:#86EFAC;background:rgba(134,239,172,0.1);border-color:rgba(134,239,172,0.2)}
.cc-hero-status-pill-warn{color:#FCD34D;background:rgba(252,211,77,0.1);border-color:rgba(252,211,77,0.2)}
.cc-hero-status-pill-err{color:#FCA5A5;background:rgba(252,165,165,0.1);border-color:rgba(252,165,165,0.2)}
.cc-hero-banner-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:0.5px solid rgba(128,128,128,0.3);background:rgba(128,128,128,0.15);color:var(--nav-t,#FFFFFF);cursor:pointer}
.cc-hero-banner-btn:hover{background:rgba(255,255,255,0.15)}
.cc-hero-menu-trigger .cc-menu-trigger{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:0.5px solid rgba(128,128,128,0.3);background:rgba(128,128,128,0.15);color:var(--nav-t,#FFFFFF);cursor:pointer}
.cc-hero-menu-trigger .cc-menu-trigger:hover{background:rgba(255,255,255,0.15)}
.cc-hero-av-wrap{position:relative;width:56px;height:56px;flex-shrink:0}
.cc-hero-av-edit{position:absolute;bottom:0;right:0;width:22px;height:22px;border-radius:50%;background:var(--surface2);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text)}
.cc-hero-av-edit:hover{background:var(--surface)}
.cc-hero-av-cam-overlay{position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;pointer-events:none;color:#fff;font-size:18px}
.cc-hero-av-hoverable:hover .cc-hero-av-cam-overlay{opacity:1}
.cc-member-hero-body{display:none}
.cc-member-hero-av{width:56px;height:56px;border-radius:50%;background:var(--avatar-bg);border:2px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;color:var(--cc-avatar-text);overflow:hidden}
.cc-member-hero-info{flex:1;min-width:0}
.cc-member-hero-sub{font-size:13px;color:var(--sub);margin-top:3px;margin-bottom:0}
.cc-hero-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.cc-hero-chip{font-size:12px;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.9);border:0.5px solid rgba(255,255,255,0.2);font-weight:500}
.cc-hero-chip-primary{background:var(--cc-accent-20,rgba(255,191,0,0.2));color:var(--cc-accent,#FFBF00);border-color:var(--cc-accent-35,rgba(255,191,0,0.35))}
.cc-hero-tabs{display:flex;gap:0;border-top:1px solid rgba(255,255,255,0.08);overflow-x:auto;scrollbar-width:none;background:var(--nav,#000000);padding:0 16px;border-radius:0}
.cc-hero-tabs::-webkit-scrollbar{display:none}
.cc-hero-tab{padding:10px 14px;font-size:13px;color:var(--nav-t,rgba(255,255,255,0.4));opacity:0.55;cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;white-space:nowrap;font-family:inherit;display:flex;align-items:center;gap:6px;transition:color 0.15s,opacity 0.15s;WebkitTapHighlightColor:transparent}
.cc-hero-tab:hover{opacity:0.85}
.cc-hero-tab-active{color:var(--nav-a,var(--cc-accent,#FFBF00))!important;border-bottom-color:var(--nav-a,var(--cc-accent,#FFBF00))!important;opacity:1!important}
.cc-hero-tab-soon{opacity:0.25!important;cursor:default}
.cc-hero-tab-soon-badge{font-size:9px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.3);padding:1px 5px;border-radius:6px}
.cc-member-tabs{display:flex;gap:0;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;padding:4px;overflow:visible;scrollbar-width:none;flex-shrink:0}
.cc-member-tabs::-webkit-scrollbar{display:none}
.cc-member-tab{padding:6px 12px;border-radius:7px;background:transparent;border:none;color:var(--sub);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap;display:flex;align-items:center;gap:6px;transition:background 0.1s,color 0.1s;min-height:34px}
.cc-member-tab:hover{background:var(--surface2);color:var(--text)}
.cc-member-tab-active{background:var(--surface2);color:var(--text);font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.cc-mehr-dropdown{position:absolute;top:calc(100% + 6px);right:0;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;padding:4px;min-width:170px;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.cc-mehr-item{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:7px;font-size:13px;color:var(--text);cursor:pointer;border:none;background:transparent;width:100%;font-family:inherit;text-align:left}
.cc-mehr-item:hover{background:var(--surface2)}
.cc-mehr-item-active{background:var(--cc-accent-5,rgba(255,191,0,0.05));color:var(--cc-accent,#FFBF00);font-weight:500}
.cc-mehr-sheet-overlay{position:fixed;inset:0;z-index:3000;display:flex;flex-direction:column;justify-content:flex-end}
.cc-mehr-sheet-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.5)}
.cc-mehr-sheet-box{position:relative;background:var(--surface);border-radius:20px 20px 0 0;padding:12px 16px 32px;font-family:inherit;overflow:visible}
.cc-mehr-sheet-handle{width:36px;height:4px;background:var(--border-strong);border-radius:2px;margin:0 auto 16px}
.cc-mehr-sheet-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--sub);margin-bottom:8px}
.cc-mehr-sheet-item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 20px;border:none;border-bottom:0.5px solid var(--border);background:transparent;font-size:14px;color:var(--text);font-weight:400;cursor:pointer;font-family:inherit;text-align:left}
.cc-sheet-nav-item{display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 20px;border:none;border-bottom:0.5px solid var(--border);background:transparent;font-size:15px;color:var(--text);cursor:pointer;font-family:inherit;text-align:left}
.cc-sheet-nav-item:active{background:var(--cc-hover)}
.cc-sheet-nav-left{display:flex;align-items:center;gap:12px}
.cc-sheet-subhdr{display:flex;align-items:center;justify-content:space-between;padding:12px 20px 8px}
.cc-sheet-subhdr-title{font-size:15px;font-weight:600;color:var(--text)}
.cc-sheet-scroll{border-top:0.5px solid var(--border);max-height:60vh;overflow-y:auto;overflow-x:visible}
.cc-sheet-trash{color:var(--sub);flex-shrink:0;margin-right:20px;width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;overflow:visible}
.cc-mehr-sheet-item:last-child{border-bottom:none}
.cc-mehr-sheet-item-active{color:var(--cc-accent,#FFBF00);font-weight:600}
.cc-mehr-sheet-item-danger{color:#DC2626!important}
.cc-notiz-list{display:flex;flex-direction:column;gap:0}
.cc-mehr-btn-wrap{position:relative;margin-left:auto}
.cc-check-icon{color:#15803d}
.cc-trainer-badge{font-size:10px;padding:1px 6px;border-radius:10px;background:#FEF3C7;color:#B45309}
.cc-card-full{grid-column:1/-1}
.cc-list-scroll{max-height:320px;overflow-y:auto}
.cc-role-list-wrap{border:0.5px solid var(--border);border-radius:8px;overflow:hidden;max-height:220px;overflow-y:auto}
.cc-search-input-wrap{position:relative;margin-bottom:6px}
.cc-search-input-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--sub);pointer-events:none;display:flex}
.cc-search-input{padding-left:34px;width:100%}
.cc-justify-end{justify-content:flex-end}
.cc-hero-av-img{width:100%;height:100%;object-fit:cover}
.cc-member-hero-name{margin:0}
.cc-empty-italic{font-style:italic}
.cc-role-name{font-size:13px;flex:1}
.cc-ml-views{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.cc-kpi-breakdown{background:var(--surface);border:0.5px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:0}
.cc-kpi-breakdown-toggle{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:transparent;border:none;cursor:pointer;font-family:inherit;text-align:left}
.cc-kpi-preview{display:flex;gap:5px;flex-wrap:wrap;flex:1}
.cc-kpi-pill{font-size:11px;padding:1px 8px;border-radius:20px;font-weight:500}
.cc-kpi-pill-ok{background:#DCFCE7;color:#166534}
.cc-kpi-pill-accent{background:#DBEAFE;color:#1e40af}
.cc-kpi-pill-muted{background:var(--surface2);color:var(--sub)}
.cc-kpi-pill-warn{background:#FEF3C7;color:#B45309}
.cc-kpi-pill-trainer{background:#F3E8FF;color:#7c3aed}
.cc-kpi-breakdown-body{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;padding:10px 14px;border-top:0.5px solid var(--border)}
.cc-kpi-tile{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;cursor:pointer;border:0.5px solid var(--border);background:var(--surface2);font-family:inherit;text-align:left}
.cc-kpi-tile:hover{background:var(--surface2);filter:brightness(0.97)}
.cc-kpi-tile-label{font-size:12px;color:var(--sub)}
.cc-kpi-tile-value{font-size:15px;font-weight:600;color:var(--text)}
.cc-kpi-tile-ok{background:#DCFCE720;border-color:#166534 30}
.cc-kpi-tile-ok .cc-kpi-tile-value{color:#166534}
.cc-kpi-tile-ok .cc-kpi-tile-label{color:#166534}
.cc-kpi-tile-accent{background:#DBEAFE20;border-color:#1e40af30}
.cc-kpi-tile-accent .cc-kpi-tile-value{color:#1e40af}
.cc-kpi-tile-accent .cc-kpi-tile-label{color:#1e40af}
.cc-kpi-tile-warn{background:#FEF3C720;border-color:#B4530930}
.cc-kpi-tile-warn .cc-kpi-tile-value{color:#B45309}
.cc-kpi-tile-warn .cc-kpi-tile-label{color:#B45309}
.cc-kpi-tile-trainer{background:#F3E8FF20;border-color:#7c3aed30}
.cc-kpi-tile-trainer .cc-kpi-tile-value{color:#7c3aed}
.cc-kpi-tile-trainer .cc-kpi-tile-label{color:#7c3aed}
.cc-mb-8{margin-bottom:8px}
.cc-ml-view-btn{padding:5px 12px;border-radius:20px;border:0.5px solid var(--border);background:transparent;font-size:12px;font-weight:500;color:var(--sub);cursor:pointer;font-family:inherit;transition:all 0.1s}
.cc-ml-view-btn:hover{background:var(--surface2);color:var(--text)}
.cc-ml-view-btn-active{background:var(--cc-accent,#FFBF00);color:#000;border-color:var(--cc-accent,#FFBF00)}
.cc-ml-view-custom{display:flex;align-items:center;gap:2px}
.cc-ml-view-custom{display:inline-flex;align-items:center}
.cc-ml-view-custom-active{background:var(--cc-accent,#FFBF00);border-radius:20px;padding-right:4px}
.cc-ml-view-custom-active .cc-ml-view-btn-active{border-radius:20px 0 0 20px;padding-right:6px;background:var(--cc-accent,#FFBF00);color:var(--cc-accent-text,#000);border-color:var(--cc-accent,#FFBF00)}
.cc-ml-view-del-active{display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.15);color:var(--cc-accent-text,#000);cursor:pointer;flex-shrink:0}
.cc-ml-view-del-active:hover{background:rgba(0,0,0,0.25)}
.cc-ml-view-save-form{display:flex;align-items:center;gap:6px}
.cc-ml-view-save-input{padding:4px 10px;border:0.5px solid var(--border);border-radius:20px;font-size:12px;font-family:inherit;background:var(--surface2);color:var(--text);outline:none;width:160px}
.cc-ml-view-save-input:focus{border-color:var(--cc-accent,#FFBF00)}
.cc-ml-view-btn-add{color:var(--sub);border-style:dashed}
.cc-ml-view-btn-add:hover{color:var(--text);border-style:solid}
.cc-ml-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500}
.cc-ml-badge-ok{background:#DCFCE7;color:#166534}
.cc-ml-badge-warn{background:#FEF3C7;color:#B45309}
.cc-dp-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500}
.cc-dp-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0}
.cc-dp-status-warn{color:var(--sub)}.cc-dp-status-warn .cc-dp-dot{background:#D97706}
.cc-dp-status-ok{color:#16A34A}.cc-dp-status-ok .cc-dp-dot{background:#16A34A}
.cc-dp-status-err{color:#DC2626}.cc-dp-status-err .cc-dp-dot{background:#DC2626}
.cc-ml-badge-err{background:#FEE2E2;color:#991B1B}
.cc-ml-badge-muted{background:var(--surface2);color:var(--sub)}
.cc-role-chip-sm{font-size:10px;padding:1px 5px}
.cc-ml-more{font-size:11px;color:var(--sub);margin-left:4px}
.cc-team-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;background:var(--surface2);color:var(--text);border:0.5px solid var(--border)}
.cc-ml-more-btn{font-size:11px;color:var(--text-accent,#0369a1);background:var(--bg-accent,#e0f2fe);border:none;border-radius:10px;padding:1px 7px;cursor:pointer;font-family:inherit;font-weight:500}
.cc-ml-more-btn:hover{background:var(--border-accent,#bae6fd)}
.cc-teams-popover{position:fixed;z-index:2000;pointer-events:none}
.cc-teams-popover-backdrop{position:fixed;inset:0;pointer-events:all}
.cc-teams-popover-box{position:relative;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;padding:4px;min-width:180px;box-shadow:0 4px 16px rgba(0,0,0,0.1);pointer-events:all}
.cc-teams-popover-item{display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;color:var(--text);border-bottom:0.5px solid var(--border)}
.cc-teams-popover-item:last-child{border-bottom:none}
.cc-members-th-actions{width:40px}
.cc-members-td-actions{width:40px}
.cc-col-menu-dropdown-wide{min-width:300px;max-height:420px;overflow-y:auto}
.cc-col-menu-item-disabled{opacity:0.5;cursor:default}
.cc-members-th-drop-target{background:var(--cc-accent-5,rgba(255,191,0,0.05));cursor:crosshair}
.cc-members-th-dragging{background:var(--cc-accent-12,rgba(255,191,0,0.08));border-bottom:1px solid var(--cc-accent,#FFBF00)}
.cc-members-th-inner{display:flex;align-items:center;gap:4px}
.cc-col-drag-handle{color:var(--border-strong);opacity:0;transition:opacity 0.1s;cursor:pointer;display:inline-flex;align-items:center;padding:0 2px}
.cc-col-drag-handle-active{opacity:1!important;color:var(--cc-accent,#FFBF00)}
.cc-members-th:hover .cc-col-drag-handle{opacity:1}
.cc-col-arrows{display:flex;flex-direction:column;gap:1px;margin-left:auto}
.cc-col-arrow-btn{display:flex;align-items:center;justify-content:center;width:16px;height:14px;border:none;background:transparent;cursor:pointer;color:var(--sub);padding:0}
.cc-col-arrow-btn:hover{color:var(--text)}
.cc-archiv-footer{padding:8px 16px;font-size:12px;color:var(--sub);border-top:0.5px solid var(--border)}
.cc-page-title-mr{margin-right:24px}
.cc-filter-sheet-box{max-height:80vh;overflow-y:auto}
.cc-col-menu-icon-drag{opacity:0.4;cursor:grab}
.cc-col-menu-icon-lock{opacity:0.3;margin-right:2px}
.cc-col-menu-hdr-mt{margin-top:8px}
.cc-ml-more-subpanel{border-top:0.5px solid var(--border);padding:4px 0;margin-top:2px}
.cc-col-menu-group-hdr{font-size:10px;font-weight:500;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;padding:8px 12px 4px}
.cc-members-name-link{cursor:pointer}
.cc-members-name-link:hover{text-decoration:underline;text-underline-offset:2px}
.cc-col-search-wrap{display:flex;align-items:center;gap:6px;margin:4px 8px 2px;padding:4px 8px;background:var(--surface1);border:0.5px solid var(--border);border-radius:6px}
.cc-col-search-icon{color:var(--sub);flex-shrink:0}
.cc-col-search-input{border:none;background:transparent;outline:none;font-size:12px;color:var(--text);width:100%;font-family:inherit}
.cc-col-search-input::placeholder{color:var(--sub)}
.cc-col-search-clear{border:none;background:transparent;cursor:pointer;color:var(--sub);padding:0;display:flex;align-items:center}
.cc-col-search-empty{padding:10px 12px;font-size:12px;color:var(--sub);font-style:italic}
.cc-members-cb-col{width:36px;padding:8px 12px}
.cc-col-menu-item-active{background:var(--surface2);border-radius:6px;margin:1px 4px}
.cc-ml-tabs-bar{display:flex;gap:0;border-bottom:0.5px solid var(--border);align-self:flex-end}
.cc-ml-tab{padding:8px 14px;font-size:13px;font-weight:500;color:var(--sub);cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;margin-bottom:-0.5px;font-family:inherit}
.cc-ml-tab:hover{color:var(--text)}
.cc-ml-tab-active{color:var(--text)!important;border-bottom-color:var(--text)}
.cc-ml-tab-count{font-size:11px;color:var(--sub);margin-left:5px}
.cc-info-box{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:13px}
.cc-info-box-warn{background:var(--bg-warning,#FEF3C7);border:0.5px solid #FDE68A;color:var(--text-warning,#B45309)}
.cc-mb-16{margin-bottom:16px}
.cc-sel-bar{display:flex;align-items:center;gap:8px;padding:8px 16px;background:#FFFBEB;border:0.5px solid #FDE68A;border-radius:8px;margin-bottom:8px;flex-wrap:wrap}
.cc-sel-bar-info{font-size:13px;font-weight:500;color:#92400E;flex:1;min-width:100px}
.cc-sel-all{cursor:pointer;flex-shrink:0}
.cc-ml-btn-danger{border-color:#FCA5A5!important;background:#FEE2E2!important;color:#991B1B!important}
.cc-ml-btn-danger:hover{background:#FEE2E2!important}
.cc-btn-ghost{border:none;background:transparent;color:var(--sub);font-size:12px;cursor:pointer;padding:5px 8px;font-family:inherit;display:flex;align-items:center;gap:4px}
.cc-ml-filter-badge{min-width:16px;height:16px;border-radius:8px;background:var(--cc-accent-text,#000);color:var(--cc-accent,#FFBF00);font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;margin-left:4px}
.cc-ml-sep{width:1px;height:20px;background:var(--border);margin:0 2px;flex-shrink:0}
.cc-ml-toolbar{flex-wrap:nowrap;overflow:visible}
.cc-members-tr-selected td{background:#FFFBEB!important}
.cc-col-menu-item-dragover{border-top:2px solid var(--cc-accent,#FFBF00);background:var(--cc-accent-5,rgba(255,191,0,0.05))}
.cc-col-menu-hdr-hint{font-size:10px;font-weight:400;color:var(--sub);margin-left:6px}
[data-theme=dark] .cc-ml-badge-ok{background:rgba(22,101,52,0.3);color:#86EFAC}
[data-theme=dark] .cc-ml-badge-warn{background:rgba(180,83,9,0.25);color:#FCD34D}
[data-theme=dark] .cc-ml-badge-err{background:rgba(153,27,27,0.3);color:#FCA5A5}
[data-theme=dark] .cc-ml-view-btn-active{color:#000}
.cc-foto-overlay{position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center}
.cc-foto-overlay-box{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;max-width:360px;width:90%}
.cc-foto-overlay-img{width:100%;max-width:320px;height:320px;object-fit:cover;border-radius:16px;border:2px solid rgba(255,255,255,0.15)}
.cc-foto-overlay-actions{display:flex;gap:8px;align-items:center}
.cc-foto-overlay-close{position:absolute;top:-12px;right:-12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cc-page-shell{width:min(100%,1400px);margin:0 auto}
.cc-page-narrow{max-width:960px;margin:0 auto}
.cc-page-default{max-width:1400px;margin:0 auto}
.cc-page-wide{max-width:1600px;margin:0 auto}
.cc-member-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.cc-status-tile{background:var(--surface);border:0.5px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;min-width:0}
.cc-status-tile-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cc-status-tile-icon-neutral{background:var(--surface2);color:var(--sub)}
.cc-status-tile-icon-warn{background:var(--bg-warning,#FEF3C7);color:var(--text-warning,#B45309)}
.cc-status-tile-icon-ok{background:var(--bg-success,#DCFCE7);color:var(--text-success,#166534)}
.cc-status-tile-icon-danger{background:var(--bg-danger,#FEE2E2);color:var(--text-danger,#991B1B)}
.cc-status-tile-body{display:flex;flex-direction:column;gap:2px;min-width:0}
.cc-status-tile-label{font-size:11px;color:var(--sub);white-space:nowrap}
.cc-status-tile-action{font-size:10px;color:#B45309;font-weight:500;margin-top:3px;cursor:pointer;background:none;border:none;padding:0;font-family:inherit;text-align:left}
.cc-status-tile-action:hover{text-decoration:underline}
.cc-status-tile-value{font-size:14px;font-weight:500;color:var(--text);white-space:nowrap}
.cc-status-tile-value-warn{font-size:14px;font-weight:600;color:#B45309}
.cc-status-tile-value-ok{font-size:14px;font-weight:600;color:#166534}
.cc-status-tile-value-danger{font-size:14px;font-weight:600;color:#991B1B}
.cc-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch}
.cc-info-row{padding:8px 0;border-bottom:0.5px solid var(--border);display:flex;flex-direction:column;justify-content:center}
.cc-info-row:last-child{border-bottom:none}
.cc-info-row:nth-last-child(2):nth-child(odd){border-bottom:none}
.cc-info-row:nth-child(odd){padding-right:14px;border-right:0.5px solid var(--border)}
.cc-info-row:nth-child(even){padding-left:14px;border-right:none}
.cc-info-key{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--sub);margin-bottom:2px;display:block}
.cc-info-val{font-size:14px;font-weight:500;color:var(--text);text-align:left}
.cc-info-val-empty{font-size:14px;color:var(--sub);text-align:left}
.cc-list-item-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--border)}
.cc-role-list-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:0.5px solid var(--border);cursor:pointer}
.cc-role-list-item:last-child{border-bottom:none}
.cc-role-list-item:hover{background:var(--surface2)}
.cc-role-list-item-selected{background:var(--cc-accent-5,rgba(255,191,0,0.05))}
.cc-list-item-row:last-child{border-bottom:none}
.cc-list-item-icon{width:28px;height:28px;border-radius:6px;background:var(--surface2);border:0.5px solid var(--border);color:var(--sub);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cc-hk-card{border:0.5px solid var(--border);border-left:3px solid var(--cc-accent,#FFBF00);border-radius:0 8px 8px 0;padding:10px 12px;background:var(--surface2);display:flex;align-items:center;gap:10px;margin-top:8px}
.cc-hk-sub-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--sub);margin:12px 0 6px;display:flex;align-items:center;justify-content:space-between;border-top:0.5px solid var(--border);padding-top:10px}
.cc-hk-sub-label-text{display:flex;align-items:center;gap:4px}
.cc-hk-tab-link{font-size:12px;font-weight:500;color:var(--cc-blue,#185FA5);display:flex;align-items:center;gap:2px;cursor:pointer;text-transform:none;letter-spacing:normal;background:none;border:none;padding:0}
.cc-hk-content{flex:1;min-width:0}
.cc-card-secondary{background:var(--surface2);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px}
.cc-role-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;background:#EFF6FF;color:#1E40AF;border:0.5px solid rgba(30,64,175,0.2)}
.cc-role-chip-admin{background:#334155;color:#F1F5F9;border-color:#334155}
.cc-role-chip-trainer{background:#FEF3C7;color:#92400E;border-color:rgba(146,64,14,0.2)}
.cc-role-chip-spieler{background:#EFF6FF;color:#1E40AF;border-color:rgba(30,64,175,0.2)}
.cc-role-chip-funktionaer{background:#EDE9FE;color:#5B21B6;border-color:rgba(91,33,182,0.2)}
.cc-role-chip-eltern{background:#F3F4F6;color:#374151;border-color:rgba(55,65,81,0.2)}
.cc-role-chip-trainer{background:#FEF3C7;color:#B45309;border-color:rgba(180,83,9,0.2)}
.cc-pos-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:400;background:var(--surface2);color:var(--sub);border:0.5px solid var(--border)}
.cc-funk-chip{display:inline-flex;align-items:center;padding:4px 10px;border-radius:8px;font-size:13px;font-weight:400;background:var(--surface2);color:var(--text);border:0.5px solid var(--border)}
.cc-funk-gruppe-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;background:var(--surface2);color:var(--sub);border:0.5px solid var(--border)}
.cc-notiz-entry{display:flex;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--border)}
.cc-notiz-entry:last-of-type{border-bottom:none}
.cc-notiz-av{width:28px;height:28px;border-radius:50%;background:var(--surface2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--sub);flex-shrink:0}
.cc-notiz-av-me{background:var(--cc-accent-12,rgba(255,191,0,0.08));color:var(--cc-accent,#FFBF00);margin-top:2px}
.cc-notiz-meta{font-size:11px;color:var(--sub);margin-bottom:3px;display:flex;gap:5px;align-items:center;flex-wrap:wrap}
.cc-notiz-author{font-weight:500;color:var(--text)}
.cc-notiz-dot{width:3px;height:3px;border-radius:50%;background:var(--border);flex-shrink:0}
.cc-notiz-text{font-size:13px;color:var(--text)!important;line-height:1.5;text-decoration:none!important}
.cc-notiz-edit-area{border-color:var(--cc-accent,#FFBF00)!important;background:rgba(255,191,0,0.04)!important}
.cc-notiz-input-wrap{display:flex;gap:10px;align-items:flex-start;margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)}
.cc-funk-group-label{font-size:11px;color:var(--sub);margin-bottom:6px;display:block}
.cc-detail-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
.cc-ahv-mask{letter-spacing:2px;color:var(--sub);font-size:13px}
.cc-ahv-row{display:flex;align-items:center;gap:6px}
.cc-ahv-toggle{background:none;border:none;padding:2px;cursor:pointer;color:var(--sub);display:flex;align-items:center;line-height:1;border-radius:4px}
.cc-ahv-toggle:hover{color:var(--text)}
.cc-notiz-count-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;font-size:11px;font-weight:600;background:rgba(255,191,0,0.15);color:#856404;border:0.5px solid rgba(255,191,0,0.3);margin-left:6px}
.cc-hero-status-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.cc-hero-status-badge-warn{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;background:var(--surface2);color:#92400e;border:0.5px solid var(--border)}
.cc-hero-status-badge-ok{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;background:var(--surface2);color:#166534;border:0.5px solid var(--border)}
.cc-hero-badge-type{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;background:var(--surface2);color:var(--text);border:0.5px solid var(--border)}
.cc-hero-av-initials{font-size:22px;font-weight:600;color:var(--cc-avatar-text)}
.cc-form-nr{width:90px}
.cc-hero-back{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:0.5px solid var(--border);background:var(--surface);color:var(--sub);cursor:pointer;flex-shrink:0}
.cc-hero-back:hover{background:var(--surface2)}
.cc-profile-nr{position:absolute;bottom:-8px;right:-8px;background:var(--text);color:var(--bg);font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;line-height:1.4}
/* ── Hero Header ── */
.cc-hero-stripe{height:4px;background:var(--cc-accent,#FFBF00);border-radius:12px 12px 0 0}
.cc-hero-body{display:flex;align-items:center;gap:12px;padding:12px 16px}
@media(min-width:681px){.cc-hero-body{padding:20px 16px}}
.cc-hero-back{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:0.5px solid var(--border);background:var(--surface);color:var(--sub);cursor:pointer;flex-shrink:0}
.cc-hero-back:hover{background:var(--surface2)}
.cc-hero-meta{flex:1;min-width:0}
.cc-hero-sub{font-size:13px;color:var(--sub);margin-bottom:6px;line-height:1.5}
.cc-hero-role{font-weight:600;color:var(--text)}
.cc-hero-sep{color:var(--border);margin:0 6px}
.cc-hero-edit{flex-shrink:0;align-self:flex-start}
/* ── Foto ── */
.cc-foto-row{display:flex;align-items:center;gap:14px;padding-bottom:14px;border-bottom:0.5px solid var(--border);margin-bottom:12px}
.cc-foto-img{width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0;border:0.5px solid var(--border)}
.cc-foto-placeholder{width:64px;height:64px;border-radius:12px;border:1.5px dashed var(--border);background:var(--surface2);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--sub)}
.cc-hidden{display:none}
.cc-contact-link{display:flex;align-items:center;gap:5px;font-size:13px;color:#2563EB;text-decoration:none;font-weight:500}
.cc-contact-link-muted{display:flex;align-items:center;gap:5px;font-size:13px;color:var(--sub);text-decoration:none}
.cc-contact-link-plain{font-size:14px;font-weight:500;color:var(--text)!important;text-decoration:none!important;display:inline}
.cc-teams-rollen-row{font-size:12px;color:var(--text);line-height:1.5}
.cc-members-td-mitglied{font-size:12px;color:var(--text)}
.cc-kpi-breakdown-label{flex:1}
.cc-kpi-breakdown-value{font-weight:500}
.cc-teams-rollen-team{font-weight:600}
.cc-teams-rollen-sep{color:var(--sub);margin:0 4px}
.cc-teams-rollen-rolle{color:var(--text-secondary,#555)}
.cc-teams-rollen-more{font-size:11px;color:var(--sub);display:flex;align-items:center;gap:3px;font-family:inherit;background:none;border:none;cursor:pointer;padding:0}.cc-teams-rollen-more:hover{color:var(--text)}
.cc-funk-row{display:flex;align-items:center;gap:6px;line-height:1.8;margin-bottom:2px}
.cc-funk-row .cc-text-sm{color:var(--text)!important}
.cc-portal-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500}
.cc-portal-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0}
.cc-portal-status-aktiv{color:#16A34A}.cc-portal-status-aktiv .cc-portal-dot{background:#16A34A}
.cc-portal-status-deaktiviert{color:#D97706}.cc-portal-status-deaktiviert .cc-portal-dot{background:#D97706}
.cc-portal-status-kein{color:var(--sub)}.cc-portal-status-kein .cc-portal-dot{background:var(--sub)}
.cc-funk-gruppe-badge-sm{padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;border:0.5px solid transparent;flex-shrink:0}
.cc-breakdown-popover{position:absolute;top:calc(100% + 6px);left:0;background:var(--surface);border:0.5px solid var(--border);border-radius:10px;padding:8px;min-width:220px;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.cc-breakdown-popover-title{font-size:10px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.06em;padding:4px 8px 8px}
.cc-breakdown-popover-item{display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 8px;border-radius:6px;border:none;background:transparent;font-size:13px;color:var(--text);cursor:pointer;font-family:inherit;gap:12px}
.cc-breakdown-popover-item:hover{background:var(--cc-hover)}
.cc-views-dropdown{position:absolute;top:calc(100% + 6px);left:0;background:var(--surface2);border:0.5px solid var(--border);border-radius:10px;padding:4px;min-width:200px;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.cc-views-dropdown-empty{padding:8px 12px;font-size:12px;color:var(--sub)}
.cc-views-dropdown-item{display:flex;align-items:center;border-radius:6px}
.cc-views-dropdown-item:hover{background:var(--cc-hover)}
.cc-views-dropdown-item-active .cc-views-dropdown-label{font-weight:500;color:var(--cc-accent)}
.cc-views-dropdown-label{flex:1;padding:8px 12px;font-size:13px;color:var(--text);background:none;border:none;cursor:pointer;text-align:left;font-family:inherit}
.cc-views-dropdown-del{padding:6px 8px;background:none;border:none;cursor:pointer;color:var(--sub);opacity:0;transition:opacity 0.15s}
.cc-views-dropdown-item:hover .cc-views-dropdown-del{opacity:1}
.cc-views-dropdown-sep{border-top:0.5px solid var(--border);margin:4px 0}
.cc-views-dropdown-save{display:flex;align-items:center;gap:6px;padding:6px 8px}
.cc-views-dropdown-save-btn{padding:5px 8px;border-radius:6px;border:none;background:var(--cc-accent);color:#000;cursor:pointer;display:flex;align-items:center}
.cc-views-dropdown-add{display:flex;align-items:center;gap:6px;padding:8px 12px;font-size:13px;color:var(--sub);background:none;border:none;cursor:pointer;width:100%;font-family:inherit}
.cc-views-dropdown-add:hover{color:var(--text);background:var(--cc-hover);border-radius:6px}
.cc-divider-label{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--sub);text-align:center}.cc-divider-label::before,.cc-divider-label::after{content:"";flex:1;border-top:0.5px solid var(--border)}

/* ── Mobile responsive ── */
@media(max-width:680px){
  .cc-form-row,.cc-grid-2,.cc-grid-3{grid-template-columns:1fr!important}
  .cc-page-hdr{flex-direction:column;align-items:flex-start}
  .cc-info-grid{grid-template-columns:1fr}
  .cc-info-row:nth-child(odd){padding-right:0;border-right:none}
  .cc-info-row:nth-child(even){padding-left:0}
  .cc-member-tabs{width:100%}
  .cc-member-tab{flex:1;justify-content:center;padding:6px 6px;font-size:12px}
  .cc-mehr-btn-wrap{flex:1;margin-left:0!important}
  .cc-info-key{font-size:10px}
  .cc-member-hero-banner{padding:12px 12px 14px;padding-right:12px;gap:10px}
  .cc-hero-av-wrap{width:52px;height:52px}
  .cc-member-hero-av{width:52px;height:52px;font-size:16px}
  .cc-hero-av-edit{width:18px;height:18px}
  .cc-profile-name{font-size:16px}
  .cc-member-hero-sub{font-size:11px}
  .cc-hero-status-badge-warn,.cc-hero-status-badge-ok{font-size:10px;padding:2px 7px}
  .cc-hero-banner-btn{width:26px;height:26px}
  .cc-hero-banner-actions{position:static;gap:4px;margin-left:auto;flex-shrink:0}
  .cc-hero-status-strip{display:none}
  .cc-member-stats{grid-template-columns:repeat(2,1fr)!important}
  .cc-status-tile{padding:8px 10px}
  .cc-status-tile-icon{width:26px;height:26px}
  .cc-status-tile-value,.cc-status-tile-value-warn,.cc-status-tile-value-ok,.cc-status-tile-value-danger{font-size:13px}
  .cc-detail-grid-2{grid-template-columns:1fr!important}
  .cc-member-detail-wrap .cc-card{padding:10px 12px}
  .cc-member-detail-wrap .cc-info-row{padding:6px 0}
  .cc-member-detail-wrap .cc-info-row:nth-child(odd){padding-right:0}
  .cc-member-detail-wrap .cc-info-row:nth-child(even){padding-left:0}
  .cc-member-detail-wrap .cc-grid-2{gap:8px}
}
.cc-member-detail-wrap .cc-card{padding:14px 16px}
.cc-member-detail-wrap .cc-info-row{padding:7px 0}
@media(min-width:681px){
  .cc-member-detail-wrap .cc-info-row:nth-child(odd){padding-right:14px}
  .cc-member-detail-wrap .cc-info-row:nth-child(even){padding-left:14px}
}
[data-theme=dark] .cc-status-tile-icon-warn{background:rgba(180,83,9,0.25);color:#FCD34D}
[data-theme=dark] .cc-status-tile-icon-ok{background:rgba(22,101,52,0.25);color:#86EFAC}
[data-theme=dark] .cc-status-tile-icon-danger{background:rgba(153,27,27,0.25);color:#FCA5A5}
[data-theme=dark] .cc-status-tile-value-warn{color:#FCD34D}
[data-theme=dark] .cc-status-tile-value-ok{color:#86EFAC}
[data-theme=dark] .cc-status-tile-value-danger{color:#FCA5A5}
[data-theme=dark] .cc-role-chip{background:rgba(30,64,175,0.25);color:#93C5FD;border-color:rgba(147,197,253,0.2)}
[data-theme=dark] .cc-role-chip-admin{background:#475569;color:#F1F5F9;border-color:#475569}
[data-theme=dark] .cc-role-chip-trainer{background:rgba(146,64,14,0.25);color:#FCD34D;border-color:rgba(252,211,77,0.2)}
[data-theme=dark] .cc-role-chip-funktionaer{background:rgba(91,33,182,0.25);color:#C4B5FD;border-color:rgba(196,181,253,0.2)}
[data-theme=dark] .cc-role-chip-trainer{background:rgba(180,83,9,0.25);color:#FCD34D;border-color:rgba(252,211,77,0.2)}
[data-theme=dark] .cc-hero-status-badge-warn{background:rgba(0,0,0,0.4);color:#FCD34D;border-color:rgba(252,211,77,0.3)}
[data-theme=dark] .cc-hero-status-badge-ok{background:rgba(0,0,0,0.4);color:#86EFAC;border-color:rgba(134,239,172,0.3)}
[data-theme=dark] .cc-hero-banner-btn:hover{background:rgba(255,255,255,0.12)}
[data-theme=dark] .cc-member-hero-av{background:rgba(0,0,0,0.2);border-color:rgba(255,255,255,0.15)}
[data-theme=dark] .cc-hero-av-edit{background:#a07800;border-color:#8a6800}`;
/* localStorage polyfill voor window.storage */

/* ── Semantische Farben ────────────────────────────────────────
   Löst "success"|"danger"|"warning"|"info"|"primary"|"neutral"
   auf konkrete Farb-Paare {text, bg}
   ──────────────────────────────────────────────────────────── */
const SEMANTIC = {
  success: { text:"#15803D", bg:"#DCFCE7" },
  danger:  { text:"#C8102E", bg:"#FEF2F2" },
  warning: { text:"#C2410C", bg:"#FEF3C7" },
  info:    { text:"#1D4ED8", bg:"#DBEAFE" },
  primary: { text:"var(--btn-primary-text,#000)", bg:"var(--btn-primary,#FFBF00)" },
  neutral: { text:"var(--text)", bg:"var(--surface2)" },
};
export function resolveColor(sem, fallbackColor){
  if(sem && SEMANTIC[sem]) return SEMANTIC[sem];
  const c = fallbackColor||"var(--text)";
  return {text:c, bg:c+"20"};
}

function hexToRgba(hex,alpha){
  const h=(hex||"#F8DE09").replace("#","");
  const r=parseInt(h.slice(0,2),16);
  const g=parseInt(h.slice(2,4),16);
  const b=parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function darkenHex(hex,pct=0.12){
  const h=(hex||"#FFBF00").replace("#","");
  const r=Math.max(0,Math.round(parseInt(h.slice(0,2),16)*(1-pct)));
  const g=Math.max(0,Math.round(parseInt(h.slice(2,4),16)*(1-pct)));
  const b=Math.max(0,Math.round(parseInt(h.slice(4,6),16)*(1-pct)));
  return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function contrastColor(hex){
  const h=(hex||"#000000").replace("#","");
  const r=parseInt(h.slice(0,2),16);
  const g=parseInt(h.slice(2,4),16);
  const b=parseInt(h.slice(4,6),16);
  const luminance=(0.299*r+0.587*g+0.114*b)/255;
  return luminance>0.5?"#000000":"#FFFFFF";
}
/* ClubCampus-Farben: Standard-Branding für neue Vereine */
const THEME_DEFAULT_STATIC={
  vereinsfarbe1:"#FFBF00", vereinsfarbe2:"#000000",
  navBg:"#000000", navText:"#FFFFFF", navAccent:null, navAccentText:null, navHover:"#1A1A1A", avatarBg:null, avatarText:null,
  btnPrimary:"#FFBF00", btnPrimaryText:"#000000",
  vereinsname:"Mein Verein", logo:null,
};




function useBreakpoint(){const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth:1200);useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return{isMobile:w<BP_MOBILE,isTablet:w>=BP_MOBILE&&w<BP_TABLET,isDesktop:w>=BP_TABLET,width:w};}
function useIsMobile(){return useBreakpoint().isMobile;}

function ModalOrSheet({open,onClose,children,maxWidth=660}){
  const isMobile=useIsMobile();
  if(!open) return null;
  if(isMobile) return(
    <div className="cc-sheet-overlay">
      <div onClick={onClose} className="cc-sheet-backdrop"/>
      <div className="cc-sheet-box" onClick={e=>e.stopPropagation()}>
        <div className="cc-sheet-handle"><div className="cc-sheet-handle-bar"/></div>
        <div className="cc-modal-scroll-wrap">
          <div className="cc-modal-scroll">{children}</div>
          <div className="cc-modal-scroll-fade"/>
        </div>
      </div>
    </div>
  );
  return(
    <div onClick={onClose} className="cc-modal-overlay">
      <div onClick={e=>e.stopPropagation()} className="cc-modal-box" style={{maxWidth}}>
        <div className="cc-modal-scroll-wrap">
          <div className="cc-modal-scroll">{children}</div>
          <div className="cc-modal-scroll-fade"/>
        </div>
      </div>
    </div>
  );
}

/* -- ROLLEN-DEFINITIONEN -- */
/* ── PORTAL-ROLLEN (Zugriffsrechte) ────────────────────────────
   Steuern Navigation + Sichtbarkeit im Portal.
   Unabhängig von der Vereinsfunktion (FUNKTIONEN).
───────────────────────────────────────────────────────────── */
/* ── ClubCampus-Farben (Standard-Branding) ── */
/* Vereinsname global lesbar (aus localStorage wenn kein appTheme prop) */

function InfoBox({text,color=BL}){
  return <div style={{padding:"10px 14px",background:color+"12",borderRadius:10,fontSize:14,color:"var(--text)",marginTop:14,borderLeft:`3px solid ${color}`,lineHeight:1.5,fontFamily:FONT}}>{text}</div>;
}

/* ==========================================
   ROLLEN-SWITCHER MODAL
========================================== */

function Btn({children,onClick,variant="outline",color=null,small,disabled=false,type="button",style={}}){
  const p=small?"4px 10px":"7px 14px";
  const base={
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
    padding:p,borderRadius:6,fontSize:small?12:13,fontWeight:500,
    cursor:disabled?"not-allowed":"pointer",fontFamily:FONT,
    minHeight:small?30:36,opacity:disabled?0.5:1,border:"none",
    transition:"all 0.1s",...style
  };
  const activeStyle={transform:"scale(0.97)"};
  if(variant==="primary"){
    const bg=color||"var(--btn-primary,#FFBF00)";
    const fg=color?(color==="#F3F4F6"||color==="#E5E7EB"||color==="#F9FAFB"?"#374151":"var(--btn-primary-text,#000)"):"var(--btn-primary-text,#000)";
    return <button type={type} onClick={onClick} disabled={disabled}
      className="cc-btn-primary"
      style={{...base,background:bg,color:fg}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity="0.88";}}
      onMouseLeave={e=>{e.currentTarget.style.opacity=disabled?"0.5":"1";}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
      onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
      onTouchStart={e=>{if(!disabled)e.currentTarget.style.opacity="0.75";}}
      onTouchEnd={e=>{e.currentTarget.style.opacity=disabled?"0.5":"1";}}
    >{children}</button>;
  }
  if(variant==="ghost"){
    return <button type={type} onClick={onClick} disabled={disabled}
      style={{...base,background:"none",border:"none",color:color==="BK"?"var(--text)":color||"var(--sub)",
        padding:small?"4px 8px":"5px 10px"}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background="var(--surface2)";}}
      onMouseLeave={e=>{e.currentTarget.style.background="none";}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
      onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
    >{children}</button>;
  }
  if(variant==="danger"){
    return <button type={type} onClick={onClick} disabled={disabled}
      style={{...base,background:"#FEF2F2",border:"1px solid #FECACA",color:"#C8102E"}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background="#FEE2E2";}}
      onMouseLeave={e=>{e.currentTarget.style.background="#FEF2F2";}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
      onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
    >{children}</button>;
  }
  return <button type={type} onClick={onClick} disabled={disabled}
    style={{...base,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)"}}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background="var(--surface2)";}}
    onMouseLeave={e=>{e.currentTarget.style.background="var(--surface)";}}
    onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}}
    onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
    onTouchStart={e=>{if(!disabled)e.currentTarget.style.opacity="0.7";}}
    onTouchEnd={e=>{e.currentTarget.style.opacity=disabled?"0.5":"1";}}
  >{children}</button>;
}

function Card({children,mb=0,mt=0,style={},onClick,flush=false,className=""}){
  return <div onClick={onClick} className={`cc-card${flush?" cc-card-flush":""}${className?" "+className:""}`} style={{borderRadius:12,padding:flush?0:"16px 20px",overflow:"visible",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:mb,marginTop:mt,...style}}>{children}</div>;
}

function Chip({text,color,bg,semantic,size="sm"}){
  const c=semantic?resolveColor(semantic):null;
  const clr=c?c.text:(color||"var(--sub)");
  const bgc=bg||(c?c.bg:clr+"15");
  const fs=size==="sm"?11:size==="md"?12:13;
  return <span style={{background:bgc,color:clr,fontSize:fs,fontWeight:500,padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:0.2,border:`0.5px solid ${clr}30`}}>{text}</span>;
}



function Stat({label,value,sub,color,semantic,icon,onClick}){
  const c=semantic?resolveColor(semantic):{text:color||"var(--text)",bg:(color||"var(--sub)")+"20"};
  return(
    <div
      onClick={onClick}
      style={{background:"var(--surface)",border:"0.5px solid var(--border)",borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:4,cursor:onClick?"pointer":"default",userSelect:"none"}}
    >
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <span style={{fontSize:22,fontWeight:700,color:c.text,letterSpacing:-0.5,lineHeight:1}}>{value}</span>
        {onClick&&<TI n="chart-pie" size={13} style={{color:"var(--sub)",marginTop:4}}/>}
      </div>
      <span style={{fontSize:11,color:"var(--sub)",textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
      {sub&&<span style={{fontSize:12,color:"var(--sub)"}}>{sub}</span>}
    </div>
  );
}

/* StatusTile — wiederverwendbare Status-Kachel mit Icon + Label + Wert
   semantic: "neutral"|"ok"|"warn"|"danger"
   Verwendung: MitgliederModul, Dashboard, etc. */
function StatusTile({label,value,icon,semantic="neutral",action=null}){
  return(
    <div className="cc-status-tile">
      <div className={`cc-status-tile-icon cc-status-tile-icon-${semantic}`}>
        <TI n={icon} size={16}/>
      </div>
      <div className="cc-status-tile-body">
        <span className="cc-status-tile-label">{label}</span>
        <span className={semantic==="neutral"?"cc-status-tile-value":`cc-status-tile-value-${semantic}`}>{value}</span>
        {action&&<button className="cc-status-tile-action" onClick={action.onClick}>{action.label} →</button>}
      </div>
    </div>
  );
}

/* Konsistente Farben aus Name-Hash */
const AV_PALETTES=[
  {bg:"#E6F1FB",text:"#0C447C"},{bg:"#EEEDFE",text:"#3C3489"},
  {bg:"#E1F5EE",text:"#085041"},{bg:"#FAEEDA",text:"#633806"},
  {bg:"#EAF3DE",text:"#27500A"},{bg:"#FCEBEB",text:"#791F1F"},
  {bg:"#FEF3C7",text:"#92400E"},{bg:"#F0F4FF",text:"#3730A3"},
];
export function avColor(name){
  const i=Math.abs((name||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%AV_PALETTES.length;
  return AV_PALETTES[i];
}

function Av({name,init,size="md",bg,useTheme=false}){
  name=name||"";
  /* size: "sm"=24, "md"=32, "lg"=40 — oder direkte Zahl für Rückwärtskompatibilität */
  const px = typeof size==="number" ? size : {sm:24,md:32,lg:40}[size]||32;
  const r = Math.round(px/4);
  const palette = bg ? {bg, text:bg.includes("cc-hover")||bg.includes("cc-accent")||bg.includes("rgba(255")||bg==="#FFBF00"?"var(--cc-avatar-text,#7A6000)":"#fff"} : avColor(name);
  const isIcon = init && TI_PATHS[init];
  const l = isIcon ? null : (init||(name||"?").split(" ").filter(Boolean).map(n=>n[0]||"").join("").slice(0,2).toUpperCase()||"?");
  const fs = px<=24?9:px<=32?11:13;
  return(
    <div style={{width:px,height:px,borderRadius:r,background:palette.bg,
      display:"flex",alignItems:"center",justifyContent:"center",
      color:palette.text,fontWeight:600,fontSize:fs,flexShrink:0,userSelect:"none"}}>
      {isIcon ? <TI n={init} size={px*0.5} style={{color:palette.text}}/> : l}
    </div>
  );
}



function Tabs({tabs,active,setActive,mb=18}){
  const isMobile=useIsMobile();
  return(
    <div style={{display:"flex",gap:2,background:"var(--surface2)",borderRadius:10,padding:4,marginBottom:mb,overflowX:"auto",flexShrink:0}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>!t.soon&&setActive(t.key)} style={{
          padding:isMobile?"6px 10px":"6px 12px",borderRadius:7,
          background:active===t.key?"var(--surface)":"transparent",
          color:active===t.key?"var(--text)":t.soon?"var(--border)":"var(--sub)",
          fontWeight:active===t.key?600:400,
          cursor:t.soon?"default":"pointer",fontSize:14,
          boxShadow:active===t.key?"0 1px 3px rgba(0,0,0,0.12)":"none",
          border:"none",
          whiteSpace:"nowrap",fontFamily:FONT,minHeight:34,transition:"none",
          display:"flex",alignItems:"center",gap:6,WebkitTapHighlightColor:"transparent"
        }}>
          {t.icon&&<TI n={t.icon} size={13} style={{flexShrink:0}}/>}
          {isMobile&&t.short?t.short:t.label}
          {t.soon&&<span style={{fontSize:9,background:"var(--surface2)",color:"var(--sub)",padding:"1px 5px",borderRadius:6}}>bald</span>}
        </button>
      ))}
    </div>
  );
}
/* InfoBox via ./hooks.jsx */



function STitle({children,action,mb=14}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mb}}>
      <h2 style={{margin:0,fontSize:16,fontWeight:700,letterSpacing:-0.2,color:"var(--text)"}}>{children}</h2>
      {action}
    </div>
  );
}


/* ── Layout-Komponenten ── */
function Row({children, gap=8, wrap=false, justify="flex-start", align="center", style={}, ...props}){
  return <div style={{display:"flex",alignItems:align,justifyContent:justify,gap,flexWrap:wrap?"wrap":"nowrap",...style}} {...props}>{children}</div>;
}
function Col({children, gap=8, style={}, ...props}){
  return <div style={{display:"flex",flexDirection:"column",gap,...style}} {...props}>{children}</div>;
}
function Between({children, gap=8, style={}, ...props}){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap,...style}} {...props}>{children}</div>;
}

/* ── Typografie-Komponenten ── */
function Sub({children, style={}, mb=0}){
}
function Label({children, style={}}){
}
function H1({children, style={}, mb=0}){
  return <h1 className="cc-h1" style={{margin:mb?`0 0 ${mb}px`:"0",...style}}>{children}</h1>;
}
function H2({children, style={}}){
  return <h2 className="cc-h2" style={{margin:0,...style}}>{children}</h2>;
}
function PageHeader({children, action=null, mb=18}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mb}}>
      <H1>{children}</H1>
      {action}
    </div>
  );
}

/* ── Form-Komponenten ── */
function Input({style={}, ...props}){
  return <input style={{width:"100%",padding:"8px 10px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,background:"var(--surface)",color:"var(--text)",fontFamily:"inherit",outline:"none",...style}} {...props}/>;
}
function Select({children, style={}, ...props}){
  return <select style={{width:"100%",padding:"8px 10px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,background:"var(--surface)",color:"var(--text)",fontFamily:"inherit",outline:"none",...style}} {...props}>{children}</select>;
}
function Textarea({style={}, ...props}){
  return <textarea style={{width:"100%",padding:"8px 10px",border:"0.5px solid var(--border)",borderRadius:8,fontSize:14,background:"var(--surface)",color:"var(--text)",fontFamily:"inherit",outline:"none",resize:"vertical",...style}} {...props}/>;
}

/* ── Feedback-Komponenten ── */
function SectionLabel({children, style={}}){
  return <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:"var(--sub)",margin:"12px 0 6px",...style}}>{children}</div>;
}
function Empty({icon="inbox", text="Keine Einträge", sub=null, style={}}){
  return(
    <div style={{textAlign:"center",padding:"32px 16px",color:"var(--sub)",...style}}>
      <TI n={icon} size={32} style={{opacity:0.3,marginBottom:8,display:"block"}}/>
      <div style={{fontSize:14}}>{text}</div>
      {sub&&<div style={{fontSize:12,marginTop:4}}>{sub}</div>}
    </div>
  );
}
function ModalTitle({children, style={}}){
  return <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"var(--text)",...style}}>{children}</h2>;
}
function Truncate({children, lines=1, style={}}){
  const s = lines===1
    ? {overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}
    : {overflow:"hidden",display:"-webkit-box",WebkitLineClamp:lines,WebkitBoxOrient:"vertical"};
}

/* ── DropMenu: Dreipunkt-Menü ── */
function DropMenu({items}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,right:0});
  const btnRef=useRef(null);
  const wrapRef=useRef(null);
  const isMobile=useIsMobile();

  useEffect(()=>{
    function handleClick(e){ 
      if(wrapRef.current&&!wrapRef.current.contains(e.target)) setOpen(false); 
    }
    document.addEventListener("mousedown",handleClick);
    return()=>document.removeEventListener("mousedown",handleClick);
  },[]);

  function handleOpen(){
    if(!isMobile&&btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+4, right:window.innerWidth-r.right});
    }
    setOpen(o=>!o);
  }

  const visibleItems=items.filter(item=>item!=="sep"&&!item.hidden);

  return(
    <div className="cc-menu-wrap" ref={wrapRef}>
      <button className="cc-menu-trigger" ref={btnRef} onClick={e=>{e.stopPropagation();handleOpen();}} onMouseDown={e=>e.stopPropagation()}>
        <TI n="dots-vertical" size={16}/>
      </button>
      {open&&(
        isMobile?createPortal(
          <div className="cc-mehr-sheet-overlay" onMouseDown={()=>setOpen(false)}>
            <div className="cc-mehr-sheet-backdrop"/>
            <div className="cc-mehr-sheet-box" style={{fontFamily:FONT}} onMouseDown={e=>e.stopPropagation()}>
              <div className="cc-mehr-sheet-handle"/>
              {items.map((item,i)=>item==="sep"?null:item.hidden?null:(
                <button key={i}
                  className={`cc-mehr-sheet-item${item.danger?" cc-mehr-sheet-item-danger":""}`}
                  style={{borderBottom:i<items.length-1?"0.5px solid var(--border)":"none"}}
                  onMouseDown={e=>{e.stopPropagation();setOpen(false);item.onClick();}}
                >
                  {item.icon&&<TI n={item.icon} size={16}/>}
                  {item.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        ):createPortal(
          <div className="cc-menu" style={{position:"fixed",top:pos.top,right:pos.right,left:"auto",zIndex:9999,fontFamily:FONT}}>
            {items.map((item,i)=>item==="sep"
              ?<div key={i} className="cc-menu-sep"/>
              :item.hidden?null
              :<button key={i}
                  className={`cc-menu-item${item.danger?" cc-menu-item-danger":""}`}
                  onMouseDown={e=>{e.stopPropagation();}}
                  onClick={()=>{setOpen(false);item.onClick();}}
                >
                  {item.icon&&<TI n={item.icon} size={13}/>}
                  {item.label}
                </button>
            )}
          </div>,
          document.body
        )
      )}
    </div>
  );
}

function LandSelect({value,onChange,laender,placeholder="–"}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const wrapRef=useRef(null);

  useEffect(()=>{
    function handleClick(e){
      if(wrapRef.current&&!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown",handleClick);
  },[]);

  const filtered=laender.filter(l=>
    !search||l.n.toLowerCase().includes(search.toLowerCase())||l.c.toLowerCase().includes(search.toLowerCase())
  );
  const selected=value?laender.find(l=>l.c===value):null;

  function select(code){ onChange(code); setOpen(false); setSearch(""); }

  return(
    <div className="cc-land-wrap" ref={wrapRef}>
      <button type="button" className="cc-land-trigger" onClick={()=>setOpen(o=>!o)}>
        {selected?(
          <>
            <span className="cc-land-badge">{selected.c}</span>
            <span className="cc-land-name">{selected.n}</span>
          </>
        ):(
          <span className="cc-land-name cc-text-sub">{placeholder}</span>
        )}
        <span className="cc-land-chevron">{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div className="cc-land-dropdown">
          <div className="cc-land-search">
            <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
            <input className="cc-land-search-input" autoFocus placeholder="Suchen…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="cc-land-list">
            <div className="cc-land-option" onClick={()=>select("")}>
              <span className="cc-land-option-name cc-text-sub">– Keine Angabe</span>
            </div>
            {filtered.map(l=>(
              <div key={l.c} className="cc-land-option" onClick={()=>select(l.c)}>
                <span className="cc-land-badge">{l.c}</span>
                <span className="cc-land-option-name">{l.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}






function FunktionenMultiSelect({funktionen=[],selected=[],onChange}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const ref=useRef(null);

  useEffect(()=>{
    function handleClick(e){ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown",handleClick);
  },[]);

  // Gruppieren
  const filtered=funktionen.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())||
    (f.portal_gruppen?.name||"").toLowerCase().includes(search.toLowerCase()));
  const groups=[...new Set(filtered.map(f=>f.portal_gruppen?.name||"Weitere"))];

  function toggle(name){
    const next=selected.includes(name)?selected.filter(x=>x!==name):[...selected,name];
    onChange(next);
  }

  return(
    <div className="cc-multiselect" ref={ref}>
      <button type="button" className="cc-multiselect-trigger" onClick={()=>setOpen(o=>!o)}>
        <div className="cc-multiselect-chips">
          {selected.length===0
            ?<span className="cc-multiselect-placeholder">+ Funktion wählen</span>
            :selected.slice(0,3).map(s=>(
              <span key={s} className="cc-multiselect-chip">
                {s}
                <span className="cc-multiselect-chip-x" onMouseDown={e=>{e.stopPropagation();toggle(s);}}>×</span>
              </span>
            ))
          }
          {selected.length>3&&<span className="cc-multiselect-chip" style={{color:"var(--sub)"}}>+{selected.length-3} weitere</span>}
        </div>
        <TI n={open?"chevron-up":"chevron-down"} size={14} style={{color:"var(--sub)",flexShrink:0}}/>
      </button>
      {open&&(
        <div className="cc-multiselect-dropdown">
          <input className="cc-multiselect-search" placeholder="Funktion suchen…" value={search}
            onChange={e=>setSearch(e.target.value)} autoFocus/>
          <div className="cc-multiselect-list">
            {groups.map(g=>(
              <div key={g}>
                <div className="cc-multiselect-group-label">{g}</div>
                {filtered.filter(f=>(f.portal_gruppen?.name||"Weitere")===g).map(f=>{
                  const on=selected.includes(f.name);
                  return(
                    <div key={f.name} className="cc-multiselect-item" onClick={()=>toggle(f.name)}>
                      <div className={on?"cc-multiselect-cb-on":"cc-multiselect-cb"}>
                        {on&&<TI n="check" size={10} style={{color:"#15803d"}}/>}
                      </div>
                      <span>{f.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {selected.length>0&&(
            <div className="cc-multiselect-footer">
              <span>{selected.length} ausgewählt</span>
              <button className="cc-ml-dropdown-clear" onClick={()=>onChange([])}>Alle entfernen</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ── Toolbar: Wiederverwendbare Such/Filter/Gruppier-Leiste ── */
function RangeFilter({min,max,suffix,rv,rangeKey,onFilterChange,padLeft=12}){
  const [localVon,setLocalVon]=useState(String(rv.von??min));
  const [localBis,setLocalBis]=useState(String(rv.bis??max));
  useEffect(()=>{setLocalVon(String(rv.von??min));setLocalBis(String(rv.bis??max));},[rv.von,rv.bis,min,max]);
  const commitVon=()=>{const v=Math.max(min,Math.min(max,Number(localVon)||min));setLocalVon(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:v,bis:rv.bis??max});};
  const commitBis=()=>{const v=Math.max(min,Math.min(max,Number(localBis)||max));setLocalBis(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:rv.von??min,bis:v});};
  const wrapClass=padLeft>12?"cc-range-filter-wrap-lg":"cc-range-filter-wrap";
  return(
    <div className={wrapClass}>
      <div className="cc-row cc-gap-6" style={{marginBottom:6}}>
        <input type="number" min={min} max={max} step={1} className="cc-range-input"
          value={localVon}
          onChange={e=>setLocalVon(e.target.value)}
          onBlur={commitVon}
          onKeyDown={e=>e.key==="Enter"&&commitVon()}/>
        <span className="cc-range-sep">–</span>
        <input type="number" min={min} max={max} step={1} className="cc-range-input"
          value={localBis}
          onChange={e=>setLocalBis(e.target.value)}
          onBlur={commitBis}
          onKeyDown={e=>e.key==="Enter"&&commitBis()}/>
        {suffix&&<span className="cc-range-sep">{suffix}</span>}
      </div>
      <input type="range" min={min} max={max} value={rv.von??min} step={1} className="cc-range-slider" style={{marginBottom:3}}
        onChange={e=>{const v=Number(e.target.value);setLocalVon(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:v,bis:rv.bis??max});}}/>
      <input type="range" min={min} max={max} value={rv.bis??max} step={1} className="cc-range-slider"
        onChange={e=>{const v=Number(e.target.value);setLocalBis(String(v));onFilterChange&&onFilterChange("__range",{rangeKey,von:rv.von??min,bis:v});}}/>
      <div className="cc-range-labels">
        <span>{min}{suffix||""}</span><span>{max}{suffix||""}</span>
      </div>
    </div>
  );
}

function Toolbar({
  /* Suche */
  search="", onSearch=null,
  /* Filter */
  filterDefs=[], filterVals={}, onFilterChange=null,
  /* Gruppieren */
  groupOptions=[], groupOptionsMore=[], groupBy="none", onGroupChange=null, multiGroup=false,
  externalFilterOpen=false, onExternalFilterClose=null,
  externalGroupOpen=false, onExternalGroupClose=null,
  /* Mehr-Menu */
  moreItems=[],
  /* Spalten */
  colMenu=null,
  /* Rechter Slot */
  right=null,
}){
  const isMobile=useIsMobile();
  const [filterOpen,setFilterOpen]=useState(false);
  const [filterSearch,setFilterSearch]=useState("");
  const [openSecs,setOpenSecs]=useState(new Set());
  const [groupOpen,setGroupOpen]=useState(false);
  useEffect(()=>{if(externalFilterOpen>0){setFilterOpen(true);setGroupOpen(false);setMoreOpen(false);}},[externalFilterOpen]);
  useEffect(()=>{if(externalGroupOpen>0){setGroupOpen(true);setFilterOpen(false);setMoreOpen(false);}},[externalGroupOpen]);
  const [moreOpen,setMoreOpen]=useState(false);
  const [moreSubPanel,setMoreSubPanel]=useState(null);
  const [groupMoreOpen,setGroupMoreOpen]=useState(false);
  const [openMoreSections,setOpenMoreSections]=useState(new Set());
  const [dragGroup,setDragGroup]=useState(null);
  const [dragOverGroup,setDragOverGroup]=useState(null);
  const [mobileGroupPicker,setMobileGroupPicker]=useState(null); // index of level being picked
  const [mobileSubMenu,setMobileSubMenu]=useState(null); // null | "filter" | "group" | "views" | "export"
  const filterRef=useRef(null);
  const groupRef=useRef(null);
  const moreRef=useRef(null);
  useEffect(()=>{
    if(filterOpen){
      setFilterSearch("");
      setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));
    }
  },[filterOpen]);
  useEffect(()=>{
    if(!filterOpen){onExternalFilterClose&&onExternalFilterClose(); return;}
    const h=e=>{if(filterRef.current&&!filterRef.current.contains(e.target))setFilterOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[filterOpen]);
  useEffect(()=>{
    if(!groupOpen) return;
    const h=e=>{if(groupRef.current&&!groupRef.current.contains(e.target))setGroupOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[groupOpen]);
  useEffect(()=>{
    if(!moreOpen||isMobile) return;
    const h=e=>{if(moreRef.current&&!moreRef.current.contains(e.target))setMoreOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[moreOpen,isMobile]);

  const hasActiveFilter=Object.values(filterVals).some(v=>{if(!v) return false; if(Array.isArray(v)) return v.length>0; if(typeof v==="object") return v.von!=null||v.bis!=null; return false;});
  const activeFilterCount=Object.values(filterVals).reduce((n,v)=>{if(!v) return n; if(Array.isArray(v)) return n+(v.length||0); if(typeof v==="object") return n+((v.von!=null||v.bis!=null)?1:0); return n;},0);
  const groupByArr=Array.isArray(groupBy)?groupBy:[groupBy];
  const isGrouped=groupByArr.some(g=>g&&g!=="none");

  const accentStyle={background:"var(--cc-accent,#FFBF00)",borderColor:"var(--cc-accent,#FFBF00)",color:"var(--cc-accent-text,#000)"};
  const isGroupActive=v=>groupByArr.includes(v);
  function toggleGroup(val){
    if(!onGroupChange) return;
    if(!multiGroup){ onGroupChange(val==="none"?"none":val); return; }
    if(val==="none"){ onGroupChange(["none"]); return; }
    const curr=groupByArr.filter(g=>g&&g!=="none");
    if(curr.includes(val)) onGroupChange(curr.filter(g=>g!==val).length>0?curr.filter(g=>g!==val):["none"]);
    else onGroupChange([...curr,val]);
  }

  return(
    <div>
      <div className="cc-ml-toolbar">
        {/* Suche */}
        {onSearch!==null&&(
          <div className="cc-ml-srch">
            <TI n="search" size={15} className="cc-input-icon"/>
            <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Suchen…"/>
          </div>
        )}

        {/* Filter */}
        {filterDefs.length>0&&(
          <div ref={filterRef} className="cc-ml-dropdown-wrap">
            <button
              className="cc-ml-btn"
              style={hasActiveFilter?accentStyle:{}}
              onClick={()=>{
                if(isMobile){setFilterSearch("");setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));setMoreOpen(true);setMobileSubMenu("filter");}
                else{setFilterOpen(o=>!o);setGroupOpen(false);setMoreOpen(false);}
              }}>
              <TI n="filter" size={15}/>
              {!isMobile&&"Filter"}
              {hasActiveFilter&&<span className="cc-ml-filter-badge">{activeFilterCount}</span>}
            </button>
            {filterOpen&&!isMobile&&(
                <div className="cc-ml-dropdown cc-ml-filter-dropdown">
                  <div className="cc-filter-footer">
                    <button className="cc-ml-dropdown-clear" onClick={()=>onFilterChange&&onFilterChange("__reset")}>Zurücksetzen</button>
                    <button className="cc-ml-dropdown-apply" onClick={()=>setFilterOpen(false)}>Fertig</button>
                  </div>
                  <div className="cc-filter-search">
                    <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
                    <input
                      autoFocus
                      placeholder="Filtern…"
                      value={filterSearch}
                      onChange={e=>{
                        const q=e.target.value;
                        setFilterSearch(q);
                        if(q){
                          const matching=new Set(filterDefs.filter(({vals,type})=>type!=="range"&&(vals||[]).some(v=>v.toLowerCase().includes(q.toLowerCase()))).map(({key})=>key));
                          setOpenSecs(matching);
                        } else {
                          setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));
                        }
                      }}
                    />
                  </div>
                  {filterDefs.map(({key,label,vals,type,min,max,suffix})=>{
                    const q=filterSearch.toLowerCase();
                    if(type==="divider") return q?null:<div key={key} className="cc-filter-divider"/>;
                    if(type==="or-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-or-badge">ODER</span><div className="cc-filter-or-line"/></div>;
                    if(type==="und-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-und-badge">UND</span><div className="cc-filter-or-line"/></div>;
                    const isRange=type==="range";
                    const visVals=isRange?[]:(q?vals.filter(v=>v.toLowerCase().includes(q)):vals);
                    if(!isRange&&visVals.length===0) return null;
                    if(isRange&&q&&!label.toLowerCase().includes(q)) return null;
                    const isOpen=openSecs.has(key);
                    const rv=filterVals[key]||{};
                    const rangeActive=isRange&&(rv.von!=null||rv.bis!=null);
                    const selCount=isRange?(rangeActive?1:0):(filterVals[key]||[]).length;
                    return(
                      <div key={key}>
                        <div className="cc-ml-dropdown-section-lbl cc-between" style={{cursor:"pointer"}} onClick={()=>setOpenSecs(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;})}>
                          <span>{label}</span>
                          <span className="cc-row cc-gap-6">
                            {selCount>0&&<span className="cc-filter-sec-badge">{isRange?`${rv.von??min}–${rv.bis??max}`:selCount}</span>}
                            <TI n={isOpen?"chevron-down":"chevron-right"} size={13} style={{color:"var(--sub)"}}/>
                          </span>
                        </div>
                        {isOpen&&(isRange?(
                          <RangeFilter key={key} min={min} max={max} suffix={suffix} rv={rv} rangeKey={key} onFilterChange={onFilterChange} padLeft={12}/>
                        ):(
                          <div className="cc-filter-sec-body">
                            {visVals.map(v=>{
                              const active=(filterVals[key]||[]).includes(v);
                              return(
                                <div key={v} className="cc-col-menu-item"
                                  onClick={()=>onFilterChange&&onFilterChange(key,v,!active)}>
                                  <div className={`cc-col-menu-check${active?" cc-col-menu-check-on":""}`}>{active&&<TI n="check" size={10}/>}</div>
                                  {v}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
            )}
          </div>
        )}

        {/* Gruppieren */}
        {groupOptions.length>0&&(
          <div ref={groupRef} className="cc-ml-dropdown-wrap">
            <button
              className="cc-ml-btn"
              style={isGrouped?accentStyle:{}}
              onClick={()=>{
                if(isMobile){setMoreOpen(true);setMobileSubMenu("group");}
                else{setGroupOpen(o=>!o);setFilterOpen(false);setMoreOpen(false);}
              }}>
              <TI n="layout-rows" size={15}/>
              {!isMobile&&"Gruppieren"}
              {isGrouped&&!isMobile&&<span className="cc-ml-filter-badge">{groupByArr.filter(g=>g&&g!=="none").length}</span>}
            </button>
            {groupOpen&&(
              isMobile?(
                <div className="cc-mehr-sheet-overlay" onClick={()=>setGroupOpen(false)}>
                  <div className="cc-mehr-sheet-backdrop"/>
                  <div className="cc-mehr-sheet-box" onClick={e=>e.stopPropagation()}>
                    <div className="cc-mehr-sheet-handle"/>
                    <div className="cc-mehr-sheet-title">Gruppieren nach</div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"0 16px 12px",borderBottom:"0.5px solid var(--border)",marginBottom:4}}>
                      <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();onGroupChange&&onGroupChange(["none"]);setGroupOpen(false);}}>Zurücksetzen</button>
                      <button className="cc-ml-dropdown-apply" onMouseDown={e=>{e.stopPropagation();setGroupOpen(false);}}>Fertig</button>
                    </div>
                    {groupOptions.map(o=>(
                      <div key={o.val} className="cc-mehr-sheet-item"
                        style={{fontWeight:isGroupActive(o.val)?600:400,color:isGroupActive(o.val)?"var(--cc-accent,#FFBF00)":"var(--text)"}}
                        onMouseDown={e=>{e.stopPropagation();toggleGroup(o.val);if(!multiGroup)setGroupOpen(false);}}>
                        {isGroupActive(o.val)&&<TI n="check" size={14}/>}{o.label}
                        {o.val==="__teams_funktionen"&&<TI n="info-circle" size={13} style={{marginLeft:"auto",color:"var(--sub)"}}/>}
                      </div>
                    ))}
                    {isGroupActive("__teams_funktionen")&&(
                      <div style={{margin:"0 16px 8px",background:"var(--bg-accent,#EFF6FF)",border:"0.5px solid var(--border-accent,#BFDBFE)",borderRadius:8,padding:"8px 10px",fontSize:12,color:"var(--text-secondary)",lineHeight:1.5}}>
                        Zeigt Trainer und Funktionäre in einer gemeinsamen Liste — ideal für Kontaktlisten oder Vereinsverzeichnisse.
                      </div>
                    )}
                    {groupOptionsMore.length>0&&(
                      <>
                        <div className="cc-mehr-sheet-item" style={{color:"var(--sub)",fontWeight:500}}
                          onMouseDown={e=>{e.stopPropagation();setGroupMoreOpen(o=>!o);}}>
                          <TI n={groupMoreOpen?"chevron-up":"chevron-down"} size={14}/>
                          Weitere ({groupOptionsMore.length})
                        </div>
                        {groupMoreOpen&&groupOptionsMore.map(o=>(
                          <div key={o.val} className="cc-mehr-sheet-item"
                            style={{fontWeight:isGroupActive(o.val)?600:400,color:isGroupActive(o.val)?"var(--cc-accent,#FFBF00)":"var(--text)"}}
                            onMouseDown={e=>{e.stopPropagation();toggleGroup(o.val);if(!multiGroup)setGroupOpen(false);}}>
                            {isGroupActive(o.val)&&<TI n="check" size={14}/>}{o.label}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ):(
                <div className="cc-ml-dropdown cc-ml-group-dropdown" style={{minWidth:240}}>
                  <div className="cc-filter-footer">
                    <button className="cc-ml-dropdown-clear" onClick={()=>{onGroupChange&&onGroupChange(["none"]);setGroupOpen(false);}}>Zurücksetzen</button>
                    <button className="cc-ml-dropdown-apply" onClick={()=>setGroupOpen(false)}>Fertig</button>
                  </div>
                  {groupByArr.filter(g=>g&&g!=="none").length>0&&(
                    <>
                      <div className="cc-ml-dropdown-section-lbl">Aktiv <span className="cc-col-menu-hdr-hint">ziehen zum sortieren</span></div>
                      {groupByArr.filter(g=>g&&g!=="none").map((val,idx)=>{
                        const opt=[...groupOptions,...groupOptionsMore].find(o=>o.val===val);
                        if(!opt) return null;
                        return(
                          <div key={val}
                            className={`cc-group-drag-item${dragOverGroup===val?" cc-drag-over":""}`}
                            draggable
                            onDragStart={()=>setDragGroup(val)}
                            onDragOver={e=>{e.preventDefault();setDragOverGroup(val);}}
                            onDrop={e=>{
                              e.preventDefault();
                              if(dragGroup&&dragGroup!==val){
                                const curr=groupByArr.filter(g=>g&&g!=="none");
                                const from=curr.indexOf(dragGroup),to=curr.indexOf(val);
                                const next=[...curr];
                                next.splice(from,1);next.splice(to,0,dragGroup);
                                onGroupChange&&onGroupChange(next);
                              }
                              setDragGroup(null);setDragOverGroup(null);
                            }}
                            onDragEnd={()=>{setDragGroup(null);setDragOverGroup(null);}}>
                            <TI n="grip-vertical" size={14} className="cc-group-drag-handle"/>
                            <div className="cc-group-drag-nr">{idx+1}</div>
                            <span style={{flex:1,fontSize:13}}>{opt.label}</span>
                            <button style={{background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:15,padding:"0 2px"}}
                              onClick={e=>{e.stopPropagation();toggleGroup(val);}}>×</button>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className="cc-ml-dropdown-section-lbl">Hinzufügen</div>
                  {groupOptions.filter(o=>!groupByArr.includes(o.val)).map(o=>(
                    <div key={o.val} className="cc-group-inactive-item"
                      onClick={()=>toggleGroup(o.val)}>
                      <TI n="plus" size={12}/>
                      {o.label}
                      {o.val==="__teams_funktionen"&&<TI n="info-circle" size={12} style={{marginLeft:"auto",color:"var(--sub)"}}/>}
                    </div>
                  ))}
                  {groupOptionsMore.filter(o=>!groupByArr.includes(o.val)).length>0&&(
                    <>
                      <div className="cc-group-inactive-item cc-text-sub" style={{fontWeight:500}}
                        onClick={()=>setGroupMoreOpen(o=>!o)}>
                        <TI n={groupMoreOpen?"chevron-up":"chevron-down"} size={12}/>
                        Weitere ({groupOptionsMore.filter(o=>!groupByArr.includes(o.val)).length})
                      </div>
                      {groupMoreOpen&&groupOptionsMore.filter(o=>!groupByArr.includes(o.val)).map(o=>(
                        <div key={o.val} className="cc-group-inactive-item"
                          onClick={()=>toggleGroup(o.val)}>
                          <TI n="plus" size={12}/>
                          {o.label}
                        </div>
                      ))}
                    </>
                  )}
                  {groupByArr.filter(g=>g&&g!=="none").length>0&&(
                    <div style={{padding:"6px 12px 8px",fontSize:11,color:"var(--sub)",borderTop:"0.5px solid var(--border)"}}>
                      {groupByArr.filter(g=>g&&g!=="none").map(v=>[...groupOptions,...groupOptionsMore].find(o=>o.val===v)?.label).filter(Boolean).join(" › ")}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* Separator vor Mehr/Spalten */}


        {/* Spalten-Slot */}
        {colMenu&&<div className="cc-ml-dropdown-wrap">{colMenu}</div>}

        {/* Mehr-Menu */}
        {moreItems.length>0&&(
          <div ref={moreRef} className="cc-ml-dropdown-wrap">
            <button className="cc-ml-btn"
              onClick={()=>{setMoreOpen(o=>{const next=!o;if(next)setOpenMoreSections(new Set(["Aktionen"]));return next;});setFilterOpen(false);setGroupOpen(false);setMobileSubMenu(null);}}>
              <TI n="dots" size={15}/>
            </button>
            {moreOpen&&(
              isMobile?(
                <div className="cc-mehr-sheet-overlay" onClick={()=>{setMoreOpen(false);setMobileSubMenu(null);}}>
                  <div className="cc-mehr-sheet-backdrop"/>
                  <div className="cc-mehr-sheet-box" style={{padding:"0 0 32px"}} onClick={e=>e.stopPropagation()}>
                    <div className="cc-mehr-sheet-handle" style={{margin:"10px auto 0"}}/>
                    {mobileSubMenu===null?(
                      // Stufe 1: Hauptmenü
                      <div>

                        {(()=>{
                          let inAktionen=false;
                          return moreItems.map((item,i)=>{
                            if(item==="sep"){inAktionen=false;return null;}
                            if(item.header){inAktionen=item.label==="Aktionen";return null;}
                            if(!inAktionen) return null;
                            return(
                              <button key={i} className="cc-sheet-nav-item"
                                onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);item.onClick();}}>
                                <span className="cc-sheet-nav-left">{item.icon&&<TI n={item.icon} size={18}/>}{item.label}</span>
                              </button>
                            );
                          });
                        })()}

                        {moreItems.filter(item=>item!=="sep"&&item.header&&item.label==="Ansichten").length>0&&(
                          <button className="cc-sheet-nav-item"
                            onMouseDown={e=>{e.stopPropagation();setMobileSubMenu("views");}}>
                            <span className="cc-sheet-nav-left"><TI n="bookmark" size={18}/> Ansichten</span>
                            <TI n="chevron-right" size={14}/>
                          </button>
                        )}

                        {moreItems.filter(item=>item!=="sep"&&item.header&&item.label==="Export").length>0&&(
                          <button className="cc-sheet-nav-item"
                            onMouseDown={e=>{e.stopPropagation();setMobileSubMenu("export");}}>
                            <span className="cc-sheet-nav-left"><TI n="download" size={18}/> Exportieren</span>
                            <TI n="chevron-right" size={14}/>
                          </button>
                        )}
                      </div>
                    ):mobileSubMenu==="filter"?(
                      // Stufe 2: Filter
                      <div>
                        <div className="cc-sheet-subhdr">
                          <button className="cc-icon-btn" onMouseDown={e=>{e.stopPropagation();setMobileSubMenu(null);}}>
                            <TI n="chevron-left" size={16}/>
                          </button>
                          <span className="cc-sheet-subhdr-title">Filter</span>
                          <button className="cc-ml-dropdown-apply" onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);}}>Fertig</button>
                        </div>
                        <div className="cc-filter-search">
                          <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
                          <input
                            placeholder="Filtern…"
                            value={filterSearch}
                            onChange={e=>{
                              const q=e.target.value;
                              setFilterSearch(q);
                              if(q){
                                const matching=new Set(filterDefs.filter(({vals,type})=>type!=="range"&&(vals||[]).some(v=>v.toLowerCase().includes(q.toLowerCase()))).map(({key})=>key));
                                setOpenSecs(matching);
                              } else {
                                setOpenSecs(new Set(filterDefs.filter(({key,type})=>type==="range"?(filterVals[key]&&(filterVals[key].von!=null||filterVals[key].bis!=null)):(filterVals[key]||[]).length>0).map(({key})=>key)));
                              }
                            }}
                          />
                        </div>
                        <div className="cc-sheet-scroll">
                          {filterDefs.map(({key,label,vals,type,min,max,suffix})=>{
                            const q=filterSearch.toLowerCase();
                            if(type==="divider") return q?null:<div key={key} className="cc-filter-mobile-divider"/>;
                            if(type==="or-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-or-badge">ODER</span><div className="cc-filter-or-line"/></div>;
                    if(type==="und-divider") return q?null:<div key={key} className="cc-filter-or-sep"><div className="cc-filter-or-line"/><span className="cc-filter-und-badge">UND</span><div className="cc-filter-or-line"/></div>;
                            const isRange=type==="range";
                            const visVals=isRange?[]:(q?vals.filter(v=>v.toLowerCase().includes(q)):vals);
                            if(!isRange&&visVals.length===0) return null;
                            if(isRange&&q&&!label.toLowerCase().includes(q)) return null;
                            const rv=filterVals[key]||{};
                            const rangeActive=isRange&&(rv.von!=null||rv.bis!=null);
                            const selCount=isRange?(rangeActive?1:0):(filterVals[key]||[]).length;
                            return(
                              <div key={key}>
                                <div className="cc-filter-mobile-sec">
                                  {label}{selCount>0&&<span className="cc-filter-sec-badge" style={{marginLeft:8}}>{isRange?`${rv.von??min}–${rv.bis??max}`:selCount}</span>}
                                </div>
                                {isRange?(
                                  <RangeFilter key={key} min={min} max={max} suffix={suffix} rv={rv} rangeKey={key} onFilterChange={onFilterChange} padLeft={20}/>
                                ):(
                                  visVals.map(v=>{
                                    const active=(filterVals[key]||[]).includes(v);
                                    return(
                                      <div key={v} className="cc-filter-mobile-item"
                                        onMouseDown={e=>{e.stopPropagation();onFilterChange&&onFilterChange(key,v,!active);}}>
                                        <input type="checkbox" readOnly checked={active} className="cc-filter-mobile-checkbox"/>
                                        <span>{v}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            );
                          })}
                          {hasActiveFilter&&(
                            <div className="cc-filter-mobile-footer">
                              <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();onFilterChange&&onFilterChange("__reset");}}>Alle Filter zurücksetzen</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ):mobileSubMenu==="group"?(
                      // Stufe 2: Gruppieren — Ebenen
                      <div>
                        <div className="cc-sheet-subhdr">
                          <button className="cc-icon-btn" onMouseDown={e=>{e.stopPropagation();setMobileSubMenu(null);}}>
                            <TI n="chevron-left" size={16}/>
                          </button>
                          <span className="cc-sheet-subhdr-title">Gruppieren</span>
                          <button className="cc-ml-dropdown-apply" onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);}}>Fertig</button>
                        </div>
                        <div className="cc-sheet-scroll">
                          {groupByArr.filter(g=>g&&g!=="none").map((val,idx)=>{
                            const opt=[...groupOptions,...groupOptionsMore].find(o=>o.val===val);
                            if(!opt) return null;
                            return(
                              <div key={val} className="cc-group-mobile-level"
                                onMouseDown={e=>{e.stopPropagation();setMobileGroupPicker(idx);}}>
                                <div className="cc-group-mobile-dot">{idx+1}</div>
                                <span className="cc-group-mobile-lbl">{opt.label}</span>
                                <button style={{background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:18,padding:"0 2px"}}
                                  onMouseDown={e=>{e.stopPropagation();toggleGroup(val);}}>×</button>
                              </div>
                            );
                          })}
                          {groupByArr.filter(g=>g&&g!=="none").length<3&&(
                            <div className="cc-group-mobile-level" style={{opacity:0.5}}
                              onMouseDown={e=>{e.stopPropagation();setMobileGroupPicker(groupByArr.filter(g=>g&&g!=="none").length);}}>
                              <div className="cc-group-mobile-dot-empty"><TI n="plus" size={10}/></div>
                              <span className="cc-group-mobile-lbl-empty">Ebene hinzufügen</span>
                              <TI n="chevron-right" size={14} style={{color:"var(--sub)"}}/>
                            </div>
                          )}
                          {mobileGroupPicker!==null&&(
                            <div style={{borderTop:"1px solid var(--border)",marginTop:4}}>
                              <div style={{padding:"10px 20px 4px",fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:".06em",background:"var(--surface2)"}}>Ebene {mobileGroupPicker+1} wählen</div>
                              {[...groupOptions,...groupOptionsMore].filter(o=>!groupByArr.includes(o.val)).map(o=>(
                                <div key={o.val} className="cc-filter-mobile-item"
                                  onMouseDown={e=>{
                                    e.stopPropagation();
                                    const curr=groupByArr.filter(g=>g&&g!=="none");
                                    curr.splice(mobileGroupPicker,0,o.val);
                                    onGroupChange&&onGroupChange(curr);
                                    setMobileGroupPicker(null);
                                  }}>
                                  <span style={{flex:1}}>{o.label}</span>
                                  <TI n="chevron-right" size={13} style={{color:"var(--sub)"}}/>
                                </div>
                              ))}
                              <div className="cc-filter-mobile-footer">
                                <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();setMobileGroupPicker(null);}}>Abbrechen</button>
                              </div>
                            </div>
                          )}
                          {isGrouped&&(
                            <div className="cc-group-preview">
                              {groupByArr.filter(g=>g&&g!=="none").map(v=>[...groupOptions,...groupOptionsMore].find(o=>o.val===v)?.label).filter(Boolean).join(" › ")}
                            </div>
                          )}
                          {isGrouped&&(
                            <div className="cc-filter-mobile-footer">
                              <button className="cc-ml-dropdown-clear" onMouseDown={e=>{e.stopPropagation();onGroupChange&&onGroupChange(["none"]);setMobileGroupPicker(null);}}>Alle zurücksetzen</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ):(
                      // Stufe 2: Ansichten / Aktionen / Export
                      <div>
                        <div className="cc-sheet-subhdr">
                          <button className="cc-icon-btn" onMouseDown={e=>{e.stopPropagation();setMobileSubMenu(null);}}>
                            <TI n="chevron-left" size={16}/>
                          </button>
                          <span className="cc-sheet-subhdr-title">{mobileSubMenu==="views"?"Ansichten":mobileSubMenu==="export"?"Exportieren":"Aktionen"}</span>
                          <div style={{width:32}}/>
                        </div>
                        <div className="cc-sheet-scroll">
                          {(()=>{
                            const section=mobileSubMenu==="views"?"Ansichten":mobileSubMenu==="export"?"Export":"Aktionen";
                            let inSection=false;
                            return moreItems.map((item,i)=>{
                              if(item==="sep"){inSection=false;return null;}
                              if(item.header){inSection=item.label===section;return null;}
                              if(!inSection) return null;
                              return(
                                <div key={i} style={{display:"flex",alignItems:"center",borderBottom:"0.5px solid var(--border)",overflow:"visible"}}>
                                  <button className="cc-mehr-sheet-item" style={{flex:1,borderBottom:"none",padding:"13px 20px",minWidth:0}}
                                    onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);item.onClick();}}>
                                    {item.icon?<TI n={item.icon} size={16}/>:<TI n="layout" size={16}/>}{item.label}
                                  </button>
                                  {item.onDelete&&(
                                    <button className="cc-sheet-trash"
                                      onMouseDown={e=>{e.stopPropagation();setMoreOpen(false);setMobileSubMenu(null);item.onDelete();}}>
                                      <TI n="trash" size={15}/>
                                    </button>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ):(
                <div className="cc-ml-dropdown" style={{right:0,left:"auto",minWidth:220}}>
                  {(()=>{
                    let currentSection=null;
                    return moreItems.map((item,i)=>{
                      if(item==="sep") return openMoreSections.has(currentSection)?<div key={i} className="cc-menu-sep"/>:null;
                      if(item.header){
                        currentSection=item.label;
                        const isOpen=openMoreSections.has(item.label);
                        return(
                          <div key={i} className="cc-ml-dropdown-section-lbl cc-between" style={{cursor:"pointer"}}
                            onClick={()=>setOpenMoreSections(prev=>{const n=new Set(prev);n.has(item.label)?n.delete(item.label):n.add(item.label);return n;})}>
                            <span>{item.label}</span>
                            <TI n={isOpen?"chevron-down":"chevron-right"} size={12}/>
                          </div>
                        );
                      }
                      if(!openMoreSections.has(currentSection)) return null;
                      if(item.hidden) return null;
                      if(item.subPanel) return(
                        <Fragment key={i}>
                          <div className="cc-col-menu-item" style={{justifyContent:"space-between"}}
                            onClick={()=>setMoreSubPanel(p=>p===i?null:i)}>
                            <span style={{display:"flex",alignItems:"center",gap:8}}>{item.icon&&<TI n={item.icon} size={14}/>}{item.label}</span>
                            <TI n="chevron-right" size={12}/>
                          </div>
                          {moreSubPanel===i&&<div className="cc-ml-more-subpanel">{item.subPanel}</div>}
                        </Fragment>
                      );
                      return(
                        <div key={i} className={`cc-col-menu-item${item.danger?" cc-menu-item-danger":""}`}
                          style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}
                          onClick={()=>{setMoreOpen(false);setMoreSubPanel(null);item.onClick();}}>
                          <span style={{display:"flex",alignItems:"center",gap:8}}>
                            {item.icon&&<TI n={item.icon} size={14}/>}{item.label}
                          </span>
                          {item.onDelete&&(
                            <button
                              className="cc-icon-btn"
                              style={{color:"var(--sub)",opacity:0.6,padding:"2px 4px"}}
                              onClick={e=>{e.stopPropagation();setMoreOpen(false);item.onDelete();}}>
                              <TI n="trash" size={12}/>
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )
            )}
          </div>
        )}

        {/* Rechter Slot */}
        {right&&<><div className="cc-ml-sep"/>{right}</>}
      </div>

      {/* Aktive Filter Chips */}
      {hasActiveFilter&&(
        <div className="cc-ml-chips" style={{justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(()=>{
            const OR_GROUPS=[["kaderrollen","funktionen"],["teams","funktionsgruppen"]];
            const chips=[];
            let lastGroup=null;
            Object.entries(filterVals).forEach(([k,vals])=>{
              if(!vals) return;
              if(typeof vals==="object"&&!Array.isArray(vals)){
                if(vals.von==null&&vals.bis==null) return;
                const def=filterDefs.find(d=>d.key===k);
                const label=def?def.label:k;
                const display=`${label}: ${vals.von??def?.min??''}–${vals.bis??def?.max??''}${def?.suffix||''}`;
                chips.push(<div key={k} className="cc-ml-chip" onClick={()=>onFilterChange&&onFilterChange("__range",{rangeKey:k,von:null,bis:null})}>{display} <span className="cc-ml-chip-x">×</span></div>);
                return;
              }
              const currentGroup=OR_GROUPS.find(g=>g.includes(k));
              if(currentGroup&&lastGroup&&currentGroup===lastGroup){
                chips.push(<span key={k+"_or"} className="cc-ml-chip-or">oder</span>);
              }
              lastGroup=currentGroup||null;
              (vals||[]).forEach(v=>{
                chips.push(<div key={k+v} className="cc-ml-chip" onClick={()=>onFilterChange&&onFilterChange(k,v,false)}>{v} <span className="cc-ml-chip-x">×</span></div>);
              });
            });
            return chips;
          })()}
          </div>
          <button className="cc-ml-dropdown-clear" style={{flexShrink:0,marginLeft:4}}
            onClick={()=>onFilterChange&&onFilterChange("__reset")}>Zurücksetzen</button>
        </div>
      )}
    </div>
  );
}


function ColMenuContent({colGroups,visibleCols,onVisibleColsChange,dragCol,onDragStart,onDragOver,onDrop,onDragEnd,search,setSearch}){
  const allCols=colGroups.flatMap(g=>g.cols);
  const [openGroups,setOpenGroups]=useState(new Set());
  const toggleGroup=g=>setOpenGroups(prev=>{const n=new Set(prev);n.has(g)?n.delete(g):n.add(g);return n;});
  return(
    <div>
      <div className="cc-col-menu-group-hdr">Aktive Spalten <span className="cc-col-menu-hdr-hint">ziehen zum sortieren</span></div>
      {visibleCols.filter(k=>allCols.find(c=>c.key===k)).map(key=>{
        const col=allCols.find(c=>c.key===key);
        if(!col) return null;
        return(
          <div key={key}
            className={`cc-col-menu-item cc-col-menu-item-active${dragCol===key?" cc-col-menu-item-dragging":""}`}
            draggable={!col.alwaysOn}
            onDragStart={()=>onDragStart&&onDragStart(key)}
            onDragOver={e=>{e.preventDefault();onDragOver&&onDragOver(key);}}
            onDrop={()=>onDrop&&onDrop(key,dragCol)}
            onDragEnd={()=>onDragEnd&&onDragEnd()}
            onClick={()=>!col.alwaysOn&&onVisibleColsChange&&onVisibleColsChange(visibleCols.filter(k=>k!==key))}>
            {!col.alwaysOn&&<TI n="grip-vertical" size={13} className="cc-col-drag-handle cc-col-menu-icon-drag"/>}
            {col.alwaysOn&&<TI n="lock" size={11} className="cc-col-menu-icon-lock"/>}
            <span className="cc-flex-1" style={{fontSize:13}}>{col.label}</span>
            {!col.alwaysOn&&<TI n="x" size={11} style={{opacity:0.4}}/>}
          </div>
        );
      })}
      <div className="cc-col-menu-group-hdr cc-col-menu-hdr-mt">Inaktive Spalten</div>
      <div className="cc-col-search-wrap">
        <TI n="search" size={13} className="cc-col-search-icon"/>
        <input className="cc-col-search-input" value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Spalte suchen…"/>
        {search&&<button className="cc-col-search-clear" onClick={()=>setSearch("")}><TI n="x" size={11}/></button>}
      </div>
      {(()=>{
        const q=search.toLowerCase();
        const groups=colGroups.map(g=>({...g,
          cols:g.cols.filter(c=>!c.hidden&&!visibleCols.includes(c.key)&&(!q||c.label.toLowerCase().includes(q)))
            .sort((a,b)=>a.label.localeCompare(b.label))
        })).filter(g=>g.cols.length>0);
        if(groups.length===0) return <div className="cc-col-search-empty">Keine Spalte gefunden</div>;
        return groups.map(g=>{
          const isOpen=search?true:openGroups.has(g.group);
          return(
            <div key={g.group}>
              <div className="cc-ml-dropdown-section-lbl cc-between" style={{cursor:"pointer"}}
                onClick={()=>toggleGroup(g.group)}>
                <span>{g.group}</span>
                <TI n={isOpen?"chevron-down":"chevron-right"} size={12}/>
              </div>
              {isOpen&&g.cols.map(c=>(
                <div key={c.key} className="cc-col-menu-item"
                  onClick={()=>onVisibleColsChange&&onVisibleColsChange([...visibleCols,c.key])}>
                  <div className="cc-col-menu-check"/>
                  <span className="cc-flex-1" style={{fontSize:13}}>{c.label}</span>
                </div>
              ))}
            </div>
          );
        });
      })()}
    </div>
  );
}

/* ── ColMenuButton: Spalten-Auswahl Button + Dropdown ── */
function ColMenuButton({
  /* Spalten-Gruppen: [{group, cols:[{key,label,alwaysOn?}]}] */
  colGroups=[],
  /* Aktive Spalten-Keys */
  visibleCols=[],
  onVisibleColsChange=null,
  /* Drag & Drop handlers */
  dragCol=null,
  dragOverCol=null,
  onDragStart=null,
  onDragOver=null,
  onDrop=null,
  onDragEnd=null,
  inline=false,
}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const ref=useRef(null);

  useEffect(()=>{
    function handleClick(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    document.addEventListener("mousedown",handleClick);
    return()=>document.removeEventListener("mousedown",handleClick);
  },[]);

  const allCols=colGroups.flatMap(g=>g.cols);

  if(inline) return <ColMenuContent colGroups={colGroups} visibleCols={visibleCols} onVisibleColsChange={onVisibleColsChange} dragCol={dragCol} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd} search={search} setSearch={setSearch}/>;

  return(
    <div className="cc-ml-dropdown-wrap" ref={ref}>
      <button className={`cc-ml-btn${open?" cc-active":""}`}
        onClick={()=>setOpen(o=>!o)}>
        <TI n="table" size={15}/>
      </button>
      {open&&(
        <div className="cc-ml-dropdown cc-ml-filter-dropdown">
          <ColMenuContent
            colGroups={colGroups}
            visibleCols={visibleCols}
            onVisibleColsChange={onVisibleColsChange}
            dragCol={dragCol}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            search={search}
            setSearch={setSearch}
          />
        </div>
      )}
    </div>
  );
}


/* ── BulkBar: Auswahl-Aktionsleiste ── */
function BulkBar({
  count=0,
  total=0,
  onSelectAll=null,
  actions=[],
  onCancel=null,
  show=true,
}){
  if(!show) return null;
  const allSelected=count>0&&count===total;
  return(
    <div className="cc-sel-bar">
      {onSelectAll&&(
        <div className="cc-col-menu-check cc-col-menu-check-on cc-sel-all" onClick={onSelectAll}>
          <TI n={allSelected?"check":"minus"} size={10}/>
        </div>
      )}
      <span className="cc-sel-bar-info">{count} ausgewählt</span>
      {actions.map((a,i)=>(
        <button key={i}
          className={`cc-ml-btn${a.danger?" cc-ml-btn-danger":""}`}
          onClick={a.onClick}
          disabled={a.requiresSelection&&count===0}>
          {a.icon&&<TI n={a.icon} size={14}/>} {a.label}
        </button>
      ))}
      {onCancel&&(
        <button className="cc-btn-ghost" onClick={onCancel}>
          <TI n="x" size={13}/> Abbrechen
        </button>
      )}
    </div>
  );
}


/* ── SortHeader: Sortierbarer Tabellen-Header ── */
function SortHeader({label, col, sortCol, sortDir, onSort, style={}, className="cc-members-th"}){
  const active=sortCol===col;
  return(
    <th
      className={`${className}${active?" cc-members-th-sorted":""}`}
      style={{cursor:"pointer",...style}}
      onClick={()=>onSort(col)}>
      <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
        {label}
        {active
          ?<span className="cc-sort-arrow">{sortDir==="asc"?"▲":"▼"}</span>
          :<span className="cc-sort-hover-icon">↕</span>
        }
      </span>
    </th>
  );
}


/* ── useConfirm: ConfirmDialog Hook + Komponente ── */
function ConfirmDialog({open, title, message, confirmLabel="Bestätigen", cancelLabel="Abbrechen", danger=false, onConfirm, onCancel}){
  if(!open) return null;
  return createPortal(
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)",fontFamily:FONT}}>
      <div style={{background:"var(--surface)",borderRadius:12,padding:"24px 28px",maxWidth:380,width:"90%",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
        <div style={{fontSize:16,fontWeight:600,color:"var(--text)",marginBottom:8}}>{title}</div>
        {message&&<div style={{fontSize:14,color:"var(--sub)",marginBottom:20,lineHeight:1.5}}>{message}</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={{padding:"7px 16px",borderRadius:7,border:"0.5px solid var(--border)",background:"transparent",color:"var(--text)",fontSize:13,cursor:"pointer",fontFamily:FONT}} onClick={onCancel}>{cancelLabel}</button>
          <button style={{padding:"7px 16px",borderRadius:7,border:"none",background:danger?"#DC2626":"var(--cc-accent,#FFBF00)",color:danger?"#fff":"var(--cc-accent-text,#000)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT}} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function useConfirm(){
  const [state,setState]=useState({open:false,title:"",message:"",danger:false,confirmLabel:"Bestätigen",resolve:null});
  const confirm=({title,message,danger=false,confirmLabel="Bestätigen"})=>new Promise(resolve=>{
    setState({open:true,title,message,danger,confirmLabel,resolve});
  });
  const dialog=(
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      danger={state.danger}
      confirmLabel={state.confirmLabel}
      onConfirm={()=>{setState(s=>({...s,open:false}));state.resolve(true);}}
      onCancel={()=>{setState(s=>({...s,open:false}));state.resolve(false);}}
    />
  );
  return [confirm, dialog];
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT_REGISTRY — Alle wiederverwendbaren UI-Komponenten
   Neue Komponenten IMMER hier eintragen (siehe ARCHITECTURE.md)
   ═══════════════════════════════════════════════════════════════ */
export const COMPONENT_REGISTRY = [
  {
    name: "Toolbar",
    desc: "Suche, Filter, Gruppieren, Mehr-Menu, Spaltenauswahl. Wird in allen Listen-Modulen verwendet.",
    category: "Listen",
    usedIn: ["MitgliederModul", "KaderModul", "HelferModul"],
    props: ["search+onSearch", "filterDefs+filterVals+onFilterChange", "groupOptions+groupBy+onGroupChange", "colMenu", "moreItems"],
    css: ["cc-filter-search", "cc-filter-sec-hdr", "cc-filter-sec-name", "cc-filter-sec-badge", "cc-filter-sec-body", "cc-ml-chip", "cc-ml-chips", "cc-ml-chip-x"],
  },
  {
    name: "RangeFilter",
    desc: "Zahlen-Range-Filter mit zwei Slidern + editierbaren Inputs (von/bis). Wird in Toolbar filterDefs mit type:'range' verwendet.",
    category: "Formulare",
    usedIn: ["MitgliederModul"],
    props: ["min", "max", "suffix", "rv", "rangeKey", "onFilterChange", "padLeft"],
    css: ["cc-range-slider"],
  },
  {
    name: "ColMenuButton",
    desc: "Spaltenauswahl mit Drag&Drop und Suche. Immer zusammen mit Toolbar verwendet.",
    category: "Listen",
    usedIn: ["MitgliederModul"],
    props: ["allCols", "visibleCols", "onChangeVisible"],
  },
  {
    name: "BulkBar",
    desc: "Aktionsleiste für Mehrfachauswahl. Erscheint wenn Zeilen selektiert sind.",
    category: "Listen",
    usedIn: ["MitgliederModul"],
    props: ["count", "onClear", "actions[]"],
  },
  {
    name: "SortHeader",
    desc: "Sortierbarer Tabellen-Header mit Pfeil-Indikator.",
    category: "Listen",
    usedIn: ["MitgliederModul", "KaderModul"],
    props: ["label", "col", "sortCol", "sortDir", "onSort"],
  },
  {
    name: "DropMenu",
    desc: "Kontext-Menu mit Items. Auf Mobile automatisch Bottom Sheet.",
    category: "Navigation",
    usedIn: ["MitgliederModul", "KaderModul", "PortalverwaltungModul"],
    props: ["items[]", "trigger"],
  },
  {
    name: "ModalOrSheet",
    desc: "Modal auf Desktop, Bottom Sheet auf Mobile. Immer verwenden statt eigenem Modal.",
    category: "Overlays",
    usedIn: ["MitgliederModul", "ElternTab", "KaderModul"],
    props: ["open", "onClose", "title", "maxWidth"],
  },
  {
    name: "ConfirmDialog + useConfirm",
    desc: "Ersetzt window.confirm(). Hook gibt [confirm, dialog] zurück. confirmDialog ins JSX rendern.",
    category: "Overlays",
    usedIn: ["MitgliederModul", "PortalverwaltungModul", "TrainingsplanModul"],
    props: ["useConfirm() → [confirm, confirmDialog]", "confirm({title, message, confirmLabel})"],
  },
  {
    name: "InfoBox",
    desc: "Farbiger Hinweiskasten. Farbe via color prop (BL=Info, GN=Erfolg, AM=Warnung, R=Fehler).",
    category: "Feedback",
    usedIn: ["Überall"],
    props: ["text", "color"],
  },
  {
    name: "StatusTile",
    desc: "Status-Kachel mit Icon, Label und Wert. Für Profil-Übersichten.",
    category: "Feedback",
    usedIn: ["MemberDetail", "DashboardModul"],
    props: ["label", "value", "icon", "semantic (ok|warn|danger|neutral)", "action"],
  },
  {
    name: "Btn",
    desc: "Primär-Button mit Vereinsfarbe. Für Sekundär-Aktionen cc-btn-outline verwenden.",
    category: "Basics",
    usedIn: ["Überall"],
    props: ["onClick", "color", "textColor", "small", "disabled"],
  },
  {
    name: "Card",
    desc: "Weisser Container mit Border und Schatten.",
    category: "Basics",
    usedIn: ["Überall"],
    props: ["mb", "mt", "flush", "onClick"],
  },
  {
    name: "Chip",
    desc: "Farbiger Badge. text-Prop für Label, color für Textfarbe, bg für Hintergrund.",
    category: "Basics",
    usedIn: ["Überall"],
    props: ["text", "color", "bg", "semantic", "size"],
  },
  {
    name: "Stat",
    desc: "Statistik-Kachel mit Label, Wert und optionaler Farbe.",
    category: "Basics",
    usedIn: ["DashboardModul", "PortalverwaltungModul"],
    props: ["label", "value", "sub", "color", "semantic", "icon"],
  },
  {
    name: "Av",
    desc: "Avatar mit Initialen und automatischer Farbzuweisung aus Name-Hash.",
    category: "Basics",
    usedIn: ["Überall"],
    props: ["name", "size (sm|md|lg oder px-Zahl)", "bg"],
  },
  {
    name: "Tabs",
    desc: "Tab-Navigation. Für Segment-Control cc-seg/cc-seg-item/cc-seg-active verwenden.",
    category: "Navigation",
    usedIn: ["MemberDetail", "KaderModul"],
    props: ["tabs[] (key+label)", "active", "setActive", "mb"],
  },
  {
    name: "Row / Col / Between",
    desc: "Layout-Helfer. Row=horizontal, Col=vertikal, Between=space-between.",
    category: "Layout",
    usedIn: ["Überall"],
    props: ["gap", "wrap", "justify", "align", "style"],
  },
  {
    name: "H1 / H2 / STitle / Sub / Label",
    desc: "Typografie-Komponenten. STitle für Section-Überschriften, Sub für sekundären Text.",
    category: "Layout",
    usedIn: ["Überall"],
    props: ["children", "mb", "style"],
  },
  {
    name: "Input / Select / Textarea",
    desc: "Formular-Elemente mit cc-input Styling.",
    category: "Formulare",
    usedIn: ["Überall"],
    props: ["Standard HTML props + style"],
  },
  {
    name: "Empty",
    desc: "Leer-Zustand mit Icon und Text.",
    category: "Feedback",
    usedIn: ["Überall"],
    props: ["icon", "text", "sub"],
  },
  {
    name: "FunktionenMultiSelect",
    desc: "Multi-Select für Vereinsfunktionen mit Suche und Gruppenfilter.",
    category: "Formulare",
    usedIn: ["MitgliederModul", "GruppenTab"],
    props: ["funktionen[]", "selected[]", "onChange"],
  },
  {
    name: "LandSelect",
    desc: "Länder-Auswahl mit Flaggen und Suche.",
    category: "Formulare",
    usedIn: ["MitgliederModul"],
    props: ["value", "onChange", "laender[]", "placeholder"],
  },
];


/* ── InlineField: Klickbares Feld mit Inline-Editing ── */
function InlineField({ label, value, field, type="text", opts=null, canEdit=false, editing, editVal, setEditVal, startEdit, saveEdit, cancelEdit, handleKey, feedback, saving }){
  const isEditing = editing === field;
  const hasFeedback = feedback?.field === field;
  if(!canEdit) return(
    <div className="cc-info-row">
      <span className="cc-info-key">{label}</span>
      <span className={value?"cc-info-val":"cc-info-val-empty"}>{value||"—"}</span>
    </div>
  );
  return(
    <div className="cc-info-row">
      <span className="cc-info-key">{label}</span>
      {hasFeedback?(
        <span className={feedback.ok?"cc-inline-feedback-ok":"cc-inline-feedback-err"}>
          <TI n={feedback.ok?"check":"alert-circle"} size={13}/>
          {feedback.ok?"Gespeichert":"Fehler"}
        </span>
      ):isEditing?(
        <div style={{flex:1}}>
          {opts?(
            <select className="cc-inline-select" value={editVal} autoFocus
              onChange={e=>{setEditVal(e.target.value);saveEdit(field,e.target.value);}}
              onKeyDown={e=>e.key==="Escape"&&cancelEdit()}
              onBlur={cancelEdit}>
              <option value="">— wählen —</option>
              {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
            </select>
          ):(
            <input className="cc-inline-input" type={type} value={editVal} autoFocus
              onChange={e=>setEditVal(e.target.value)}
              onKeyDown={e=>handleKey(e,field)}
              onBlur={()=>saveEdit(field,editVal)}/>
          )}
          {!opts&&<div className="cc-inline-hint">Enter speichern · Esc abbrechen</div>}
          {opts&&<div className="cc-inline-hint">Esc abbrechen</div>}
        </div>
      ):(
        <span className={`cc-inline-field ${value?"cc-info-val":"cc-info-val-empty"}`}
          onClick={()=>startEdit(field,value||"")}>
          {value||<span className="cc-inline-empty">nicht erfasst</span>}
          <span className="cc-inline-pencil"><TI n="pencil" size={11}/></span>
        </span>
      )}
    </div>
  );
}


function EmptyState({icon, title, subtitle, action, onAction, danger=false}){
  return(
    <div className="cc-empty-state">
      {icon&&<div className={`cc-empty-state-icon${danger?" cc-empty-state-icon-danger":""}`}><TI n={icon} size={22}/></div>}
      <div className="cc-empty-state-title">{title}</div>
      {subtitle&&<div className="cc-empty-state-sub">{subtitle}</div>}
      {action&&onAction&&<button className="cc-empty-state-btn" onClick={onAction}>{action}</button>}
    </div>
  );
}


function PortalBadge({val}){
  if(val==="Aktiv") return <span className="cc-portal-status cc-portal-status-aktiv"><span className="cc-portal-dot"/> Aktiv</span>;
  if(val==="Deaktiviert") return <span className="cc-portal-status cc-portal-status-deaktiviert"><span className="cc-portal-dot"/> Deaktiviert</span>;
  return <span className="cc-portal-status cc-portal-status-kein"><span className="cc-portal-dot"/> Kein Zugang</span>;
}

/* ── DpBadge: Datenprüfungs-Status ── */
function DpBadge({val}){
  if(val==="Geprueft") return <span className="cc-dp-status cc-dp-status-ok"><span className="cc-dp-dot"/> Geprüft</span>;
  if(val==="Ausstehend") return <span className="cc-dp-status cc-dp-status-warn"><span className="cc-dp-dot"/> Ausstehend</span>;
  return <span className="cc-dp-status cc-dp-status-err"><span className="cc-dp-dot"/> {val||"Unbekannt"}</span>;
}

export { LOGO_B64, ThemeCtx, useTheme, PWA_CSS, hexToRgba, darkenHex, contrastColor, THEME_DEFAULT_STATIC, useBreakpoint, useIsMobile, ModalOrSheet, InfoBox, Btn, Card, Chip, Stat, StatusTile, Av, Tabs, STitle, Row, Col, Between, Sub, Label, H1, H2, PageHeader, Input, Select, Textarea, SectionLabel, Empty, ModalTitle, Truncate, LandSelect, DropMenu, FunktionenMultiSelect, Toolbar, ColMenuButton, BulkBar, SortHeader, ConfirmDialog, useConfirm, PortalBadge, DpBadge, EmptyState, InlineField };
