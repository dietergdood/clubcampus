/* ═══════════════════════════════════════════════════════════════
   ClubCampus Icons — icons.jsx
   Tabler Icons als SVG-Komponente
   ═══════════════════════════════════════════════════════════════ */

const TI_PATHS={
    "ball-football":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 3c0 0 2 4 2 9s-2 9-2 9\"/><path d=\"M3 12c0 0 4-2 9-2s9 2 9 2\"/><path d=\"M5.6 5.6c0 0 3.4 1.4 6.4 6.4s1.4 6.4 1.4 6.4\"/>",
    "jersey":"<path d=\"M15 3l3 3l-2 2l4 4l-4 1v8H8v-8l-4-1l4-4l-2-2l3-3c0 0 1 2 4 2s4-2 4-2z\"/>",
    "wappen":"<path d=\"M4 3 L20 3 L20 14 C20 14 20 20 12 22 C4 20 4 14 4 14 Z\" fill=\"none\"/>",
    "dots":"<circle cx=\"5\" cy=\"12\" r=\"1.5\"/><circle cx=\"12\" cy=\"12\" r=\"1.5\"/><circle cx=\"19\" cy=\"12\" r=\"1.5\"/>",
    "message":"<path d=\"M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z\" fill=\"none\"/>",
    "send":"<path d=\"M10 14L21 3M21 3l-6.5 18-3.5-8-8-3.5L21 3z\" fill=\"none\"/>",
    "paperclip":"<path d=\"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48\" fill=\"none\"/>",
    "bolt":"<path d=\"M13 3l-6 9h5l-1 9l6-9h-5l1-9z\"/>",
    "book":"<path d=\"M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0\"/><path d=\"M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0\"/><line x1=\"3\" y1=\"6\" x2=\"3\" y2=\"19\"/><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"19\"/><line x1=\"21\" y1=\"6\" x2=\"21\" y2=\"19\"/>",
    "briefcase":"<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M16 7v-2a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2\"/><line x1=\"12\" y1=\"12\" x2=\"12\" y2=\"12.01\"/>",
    "bus":"<path d=\"M6 17l0 .01\"/><path d=\"M18 17l0 .01\"/><path d=\"M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4\"/><rect x=\"2\" y=\"11\" width=\"20\" height=\"8\" rx=\"1\"/><path d=\"M12 3v8\"/>",
    "calendar":"<rect x=\"4\" y=\"5\" width=\"16\" height=\"16\" rx=\"2\"/><line x1=\"16\" y1=\"3\" x2=\"16\" y2=\"7\"/><line x1=\"8\" y1=\"3\" x2=\"8\" y2=\"7\"/><line x1=\"4\" y1=\"11\" x2=\"20\" y2=\"11\"/>",
    "calendar-event":"<rect x=\"4\" y=\"5\" width=\"16\" height=\"16\" rx=\"2\"/><line x1=\"16\" y1=\"3\" x2=\"16\" y2=\"7\"/><line x1=\"8\" y1=\"3\" x2=\"8\" y2=\"7\"/><line x1=\"4\" y1=\"11\" x2=\"20\" y2=\"11\"/><rect x=\"8\" y=\"15\" width=\"2\" height=\"2\"/>",
    "chart-bar":"<rect x=\"3\" y=\"12\" width=\"4\" height=\"8\" rx=\"1\"/><rect x=\"9\" y=\"8\" width=\"4\" height=\"12\" rx=\"1\"/><rect x=\"15\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\"/>",
    "layout":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"3\" y1=\"9\" x2=\"21\" y2=\"9\"/><line x1=\"9\" y1=\"21\" x2=\"9\" y2=\"9\"/>",
    "bookmark":"<path d=\"M6 3h12a1 1 0 0 1 1 1v17l-7-3-7 3V4a1 1 0 0 1 1-1z\"/>",
    "chart-pie":"<path d=\"M12 2a10 10 0 0 1 10 10h-10z\"/><path d=\"M12 2a10 10 0 1 0 10 10l-10 0z\"/>",
    "device-floppy":"<path d=\"M6 4h9l3 3v11a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z\"/><path d=\"M9 4v6h6v-6\"/><path d=\"M8 18v-4h8v4\"/>",
    "check":"<path d=\"M5 12l5 5l10-10\"/>",
    "clipboard-list":"<path d=\"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2\"/><rect x=\"9\" y=\"3\" width=\"6\" height=\"4\" rx=\"2\"/><line x1=\"9\" y1=\"12\" x2=\"15\" y2=\"12\"/><line x1=\"9\" y1=\"16\" x2=\"12\" y2=\"16\"/>",
    "clock":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><polyline points=\"12 7 12 12 15 15\"/>",
    "door-exit":"<path d=\"M13 12v.01\"/><path d=\"M3 21h18\"/><path d=\"M5 21v-16a2 2 0 0 1 2-2h7.5\"/><path d=\"M14 7l3 3l-3 3\"/><path d=\"M14 10h-7\"/>",
    "edit":"<path d=\"M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1\"/><path d=\"M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z\"/>",
    "pencil":"<path d=\"M4 20h4l10.5-10.5a2.828 2.828 0 1 0-4-4L4 16v4\"/><path d=\"m13.5 6.5 4 4\"/>",
    "history":"<path d=\"M12 8v4l3 3\"/><path d=\"M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5\"/>",
    "eye":"<circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7\"/>",
    "eye-off":"<path d=\"M10.585 10.587a2 2 0 0 0 2.829 2.828\"/><path d=\"M16.681 16.673A8.717 8.717 0 0 1 12 18c-3.6 0-6.6-2-9-6c1.272-2.12 2.712-3.678 4.32-4.674m2.86-1.146A9.055 9.055 0 0 1 12 6c3.6 0 6.6 2 9 6c-.538.9-1.12 1.7-1.742 2.404\"/><path d=\"M3 3l18 18\"/>",
    "download":"<path d=\"M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2\"/><polyline points=\"7 11 12 16 17 11\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"16\"/>",
    "table":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"3\" y1=\"9\" x2=\"21\" y2=\"9\"/><line x1=\"3\" y1=\"15\" x2=\"21\" y2=\"15\"/><line x1=\"9\" y1=\"3\" x2=\"9\" y2=\"21\"/>",
    "grip-vertical":"<circle cx=\"9\" cy=\"5\" r=\"1\"/><circle cx=\"9\" cy=\"12\" r=\"1\"/><circle cx=\"9\" cy=\"19\" r=\"1\"/><circle cx=\"15\" cy=\"5\" r=\"1\"/><circle cx=\"15\" cy=\"12\" r=\"1\"/><circle cx=\"15\" cy=\"19\" r=\"1\"/>",
    "checkbox":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M9 12l2 2 4-4\"/>",
    "user-off":"<path d=\"M8.18 8.18A4 4 0 0 0 12 16a4 4 0 0 0 3.82-2.82M3 3l18 18M10.18 10.18A4 4 0 0 1 16 12M17.5 17.5A10 10 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10 10 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19\"/>",
    "minus":"<line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>",
    "user-check":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><polyline points=\"16 11 18 13 22 9\"/>",
    "archive":"<polyline points=\"21 8 21 21 3 21 3 8\"/><rect x=\"1\" y=\"3\" width=\"22\" height=\"5\"/><line x1=\"10\" y1=\"12\" x2=\"14\" y2=\"12\"/>",
    "info-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/>",
    "lock":"<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>",
    "file-text":"<path d=\"M14 3v4a1 1 0 0 0 1 1h4\"/><path d=\"M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z\"/><line x1=\"9\" y1=\"9\" x2=\"10\" y2=\"9\"/><line x1=\"9\" y1=\"13\" x2=\"15\" y2=\"13\"/><line x1=\"9\" y1=\"17\" x2=\"15\" y2=\"17\"/>",
    "flag":"<path d=\"M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1-7 0a5 5 0 0 0-7 0v-9z\"/><line x1=\"5\" y1=\"19\" x2=\"5\" y2=\"14\"/>",
    "heart-handshake":"<path d=\"M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572\"/><path d=\"M12 6l-3.293 3.293a1 1 0 0 0 0 1.414l.543 .543c.69 .69 1.81 .69 2.5 0l1-1a3.182 3.182 0 0 1 4.5 0l2.25 2.25\"/><path d=\"M12.5 15.5l2 2\"/><path d=\"M15 13l2 2\"/>",
    "layout-dashboard":"<rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"3\" rx=\"1\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"3\" rx=\"1\"/><rect x=\"13\" y=\"9\" width=\"7\" height=\"11\" rx=\"1\"/>",
    "layout-grid":"<rect x=\"4\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"14\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"4\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"/>",
    "map-pin":"<path d=\"M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0\"/><path d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z\"/>",
    "news":"<path d=\"M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1-4 0V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a3 3 0 0 0 3 3h11\"/><line x1=\"8\" y1=\"8\" x2=\"12\" y2=\"8\"/><line x1=\"8\" y1=\"12\" x2=\"12\" y2=\"12\"/><line x1=\"8\" y1=\"16\" x2=\"12\" y2=\"16\"/>",
    "package":"<path d=\"M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3\"/><line x1=\"12\" y1=\"12\" x2=\"20\" y2=\"7.5\"/><line x1=\"12\" y1=\"12\" x2=\"12\" y2=\"21\"/><line x1=\"12\" y1=\"12\" x2=\"4\" y2=\"7.5\"/><line x1=\"8\" y1=\"5.25\" x2=\"16\" y2=\"9.75\"/>",
    "plug":"<path d=\"M9.785 6L18 14.215l-2.828 2.828L7.957 8.828L9.785 6z\"/><path d=\"M8 6l-2-2\"/><path d=\"M16 14l2 2\"/><path d=\"M5.828 8.172L3 11a3 3 0 1 0 4.243 4.243l2.828-2.829M13 16l-1 3l-3-1\"/>",
    "refresh":"<path d=\"M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4\"/><path d=\"M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4\"/>",
    "scale":"<path d=\"M7 20l4-16m2 16l4-16\"/><path d=\"M3 8h18\"/><path d=\"M3 16h18\"/>",
    "search":"<circle cx=\"10\" cy=\"10\" r=\"7\"/><line x1=\"21\" y1=\"21\" x2=\"15\" y2=\"15\"/>",
    "filter":"<path d=\"M4 4h16v2.172a2 2 0 0 1-.586 1.414L13 14v7l-2-1v-6L4.586 7.586A2 2 0 0 1 4 6.172V4z\"/>",
    "layout-rows":"<rect x=\"4\" y=\"4\" width=\"16\" height=\"6\" rx=\"1\"/><rect x=\"4\" y=\"14\" width=\"16\" height=\"6\" rx=\"1\"/>",
    "layout-columns":"<rect x=\"4\" y=\"4\" width=\"6\" height=\"16\" rx=\"1\"/><rect x=\"14\" y=\"4\" width=\"6\" height=\"16\" rx=\"1\"/>",
    "settings":"<path d=\"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
    "speakerphone":"<path d=\"M18 8a3 3 0 0 1 0 6\"/><path d=\"M10 8v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5\"/><path d=\"M12 8h0l4.524-3.77A.9.9 0 0 1 18 5v14a.9.9 0 0 1-1.476.692L12 16H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h8\"/>",
    "target":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
    "trash":"<line x1=\"4\" y1=\"7\" x2=\"20\" y2=\"7\"/><line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"/><line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"/><path d=\"M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12\"/><path d=\"M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3\"/>",
    "upload":"<path d=\"M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2\"/><polyline points=\"7 9 12 4 17 9\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"16\"/>",
    "user":"<circle cx=\"12\" cy=\"7\" r=\"4\"/><path d=\"M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2\"/>",
    "users":"<circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/><path d=\"M21 21v-2a4 4 0 0 0-3-3.85\"/>",
    "circle":"<circle cx=\"12\" cy=\"12\" r=\"9\"/>",
    "chevron-left":"<polyline points=\"15 18 9 12 15 6\"/>",
    "chevron-right":"<polyline points=\"9 18 15 12 9 6\"/>",
    "chevrons-left":"<polyline points=\"11 17 6 12 11 7\"/><polyline points=\"18 17 13 12 18 7\"/>",
    "chevrons-right":"<polyline points=\"13 17 18 12 13 7\"/><polyline points=\"6 17 11 12 6 7\"/>",
    "chevrons-up":"<polyline points=\"7 11 12 6 17 11\"/><polyline points=\"7 18 12 13 17 18\"/>",
    "chevrons-down":"<polyline points=\"7 6 12 11 17 6\"/><polyline points=\"7 13 12 18 17 13\"/>",
    "arrow-left":"<path d=\"M5 12h14\"/><path d=\"M5 12l6 6\"/><path d=\"M5 12l6-6\"/>",
    "arrow-right":"<path d=\"M19 12H5\"/><path d=\"M19 12l-6 6\"/><path d=\"M19 12l-6-6\"/>",
    "address-book":"<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/><path d=\"M9.5 17h5\"/>",
    "circle-check":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 12l2 2l4-4\"/>",
    "hourglass":"<path d=\"M6.5 7h11\"/><path d=\"M6.5 17h11\"/><path d=\"M6 7l6 5l6-5\"/><path d=\"M6 17l6-5l6 5\"/>",
    "id-badge-2":"<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M9 7h6\"/><path d=\"M9 11h6\"/><path d=\"M9 15h4\"/>",
    "logout":"<path d=\"M14 8v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2\"/><path d=\"M9 12h12\"/><path d=\"M17 9l3 3l-3 3\"/>",
    "mail":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6l9-6\"/>",
    "notes":"<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M9 7h6\"/><path d=\"M9 11h6\"/><path d=\"M9 15h4\"/>",
    "phone":"<path d=\"M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2\"/>",
    "photo":"<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M3 16l5-5l4 4l3-3l4 4\"/><circle cx=\"15\" cy=\"10\" r=\"1\"/>",
    "plus":"<path d=\"M12 5v14\"/><path d=\"M5 12h14\"/>",
    "shirt":"<path d=\"M15 3l3 3l-2 2l4 4l-4 1v8H8v-8l-4-1l4-4l-2-2l3-3c0 0 1 2 4 2s4-2 4-2z\"/>",
    "x":"<path d=\"M18 6L6 18\"/><path d=\"M6 6l12 12\"/>",
    "dots-vertical":"<circle cx=\"12\" cy=\"5\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"19\" r=\"1\"/>",
    "heart":"<path d=\"M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572\"/>",
    "key":"<circle cx=\"8\" cy=\"15\" r=\"4\"/><path d=\"M11 12l5-5\"/><path d=\"M14 10l2 2\"/>",
    "shield-check":"<path d=\"M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1-8.5 15a12 12 0 0 1-8.5-15a12 12 0 0 0 8.5-3\"/><path d=\"M9 12l2 2l4-4\"/>",
    "star":"<path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87l1.18 6.88L12 17.77l-6.18 3.25L7 14.14L2 9.27l6.91-1.01L12 2z\"/>",
    "alert-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/>",
    "alert-triangle":"<path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"/><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"/>",
    "building-community":"<path d=\"M3 21h18\"/><path d=\"M5 21V7l8-4v18\"/><path d=\"M19 21V11l-6-4\"/><path d=\"M9 9v.01\"/><path d=\"M9 12v.01\"/><path d=\"M9 15v.01\"/><path d=\"M9 18v.01\"/>",
    "camera":"<path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>",
    "shield-lock":"<path d=\"M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1-8.5 15a12 12 0 0 1-8.5-15a12 12 0 0 0 8.5-3\"/><circle cx=\"12\" cy=\"11\" r=\"1\"/><path d=\"M12 12v3\"/>",
    "sitemap":"<rect x=\"3\" y=\"15\" width=\"4\" height=\"4\" rx=\"1\"/><rect x=\"10\" y=\"15\" width=\"4\" height=\"4\" rx=\"1\"/><rect x=\"17\" y=\"15\" width=\"4\" height=\"4\" rx=\"1\"/><rect x=\"10\" y=\"5\" width=\"4\" height=\"4\" rx=\"1\"/><path d=\"M12 9v3m-6 3V9h12v3\"/>",
    "palette":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"9\" cy=\"10\" r=\"1.5\"/><circle cx=\"15\" cy=\"10\" r=\"1.5\"/><circle cx=\"17\" cy=\"14\" r=\"1.5\"/><circle cx=\"7\" cy=\"14\" r=\"1.5\"/><path d=\"M12 21a3 3 0 0 0 3-3h-6a3 3 0 0 0 3 3z\"/>",
    "adjustments-horizontal":"<circle cx=\"14\" cy=\"6\" r=\"2\"/><path d=\"M4 6h8\"/><path d=\"M16 6h4\"/><circle cx=\"8\" cy=\"12\" r=\"2\"/><path d=\"M4 12h2\"/><path d=\"M10 12h10\"/><circle cx=\"14\" cy=\"18\" r=\"2\"/><path d=\"M4 18h8\"/><path d=\"M16 18h4\"/>",
    "id-badge":"<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/><path d=\"M9 16h6\"/>",
    "layout-2":"<rect x=\"4\" y=\"4\" width=\"7\" height=\"16\" rx=\"1\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1\"/>",
    "code":"<polyline points=\"7 8 3 12 7 16\"/><polyline points=\"17 8 21 12 17 16\"/><line x1=\"14\" y1=\"4\" x2=\"10\" y2=\"20\"/>",
    "list-check":"<path d=\"M3.5 5.5l1.5 1.5l2.5-2.5\"/><path d=\"M3.5 11.5l1.5 1.5l2.5-2.5\"/><path d=\"M3.5 17.5l1.5 1.5l2.5-2.5\"/><line x1=\"11\" y1=\"6\" x2=\"20\" y2=\"6\"/><line x1=\"11\" y1=\"12\" x2=\"20\" y2=\"12\"/><line x1=\"11\" y1=\"18\" x2=\"20\" y2=\"18\"/>",
    "arrow-narrow-right":"<path d=\"M5 12h14\"/><path d=\"M15 8l4 4l-4 4\"/>",
    "chevron-up":"<polyline points=\"18 15 12 9 6 15\"/>",
    "chevron-down":"<polyline points=\"6 9 12 15 18 9\"/>",
    "trending-up":"<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>",
};
function TI({n, size=16, style={}}){
  const p = TI_PATHS[n];
  if(!p) return <span style={{display:"inline-block",width:size,height:size,...style}}/>;
  return(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      dangerouslySetInnerHTML={{__html:p}}
    />
  );
}

export { TI_PATHS, TI };
