/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/portal/portalUtils.js
   Gemeinsame Konstanten für alle Portalverwaltungs-Tabs
   ═══════════════════════════════════════════════════════════════ */

export const ZUGRIFF_ORDER = ["lesen","schreiben","verwalten"];
export const ZUGRIFF_LABELS = {"lesen":"Lesen","schreiben":"Schreiben","verwalten":"Verwalten"};
export const ZUGRIFF_COLORS = {"lesen":"#3B82F6","schreiben":"#F97316","verwalten":"#22C55E"};
export const ZUGRIFF_ICONS  = {"lesen":"eye","schreiben":"edit","verwalten":"settings"};

export const KATEGORIEN = ["kern","sport","kommunikation","betrieb","verwaltung","admin"];
export const KAT_LABELS = {kern:"Kern",sport:"Sport",kommunikation:"Kommunikation",betrieb:"Betrieb",verwaltung:"Verwaltung",admin:"Admin"};

export const API_INFOS={
    fairgate:   {description:"Mitglieder, Gruppen, Stammdaten automatisch synchronisieren",felder:["Personen & Adressen","Kontaktdaten","Elternkontakte","Teams & Gruppen","Spielerpassdaten","J+S Nummern"]},
    football_ch:{description:"Spielpläne, Resultate und Ranglisten von Football.ch importieren",felder:["Spielplan","Resultate","Ranglisten","Teaminfos"]},
    fvrz:       {description:"Spielplan und Tabelle vom FVRZ (Fussballverband Region Zürich)",felder:["Spielplan","Tabelle","Resultate","Spielernummern"]},
    clubdesk:   {description:"Mitgliederdaten und Vereinsverwaltung aus ClubDesk synchronisieren",felder:["Mitglieder","Adressen","Mitgliedschaften","Beiträge"]},
    sfa:        {description:"Spielerdaten und Lizenzen von Swiss Football Association",felder:["Spielerlizenzen","Transferdaten","Sperren"]},
  };

  /* ── Alle Module als Fallback ── */
export const ALLE_MODULE=[
    {key:"dashboard",  label:"Dashboard",         icon:"layout-dashboard", kat:"kern",          pflicht:true},
    {key:"members",    label:"Mitglieder",         icon:"users",            kat:"verwaltung"},
    {key:"team",       label:"Teams",              icon:"ball-football",    kat:"sport"},
    {key:"training",   label:"Trainingsplan",      icon:"calendar",         kat:"sport"},
    {key:"schedule",   label:"Spielplan/FVRZ",     icon:"flag",             kat:"sport"},
    {key:"attendance_central",label:"Anwesenheitsstatistik",icon:"chart-bar",kat:"sport"},
    {key:"events",     label:"Termine",            icon:"calendar-event",   kat:"sport"},
    {key:"helpers",    label:"Helfereinsätze",     icon:"heart-handshake",  kat:"betrieb"},
    {key:"buses",      label:"Vereinsbusse",       icon:"bus",              kat:"betrieb"},
    {key:"material",   label:"Material",           icon:"package",          kat:"betrieb"},
    {key:"lockers",    label:"Garderoben",         icon:"door-exit",        kat:"betrieb"},
    {key:"media",      label:"Medien & Berichte",  icon:"speakerphone",     kat:"kommunikation"},
    {key:"news",       label:"News",               icon:"news",             kat:"kommunikation"},
    {key:"wiki",       label:"Wiki",               icon:"book",             kat:"kommunikation"},
    {key:"docs",       label:"Dokumente",          icon:"file-text",        kat:"kommunikation"},
    {key:"portal",     label:"Portalverwaltung",   icon:"settings",         kat:"admin",         pflicht:true},
  ];

export const ROLLEN_MODULE_DEFAULT={
    administrator:   ALLE_MODULE.map(m=>m.key),
    administration:  ["dashboard","members","team","training","schedule","attendance_central","events","helpers","buses","material","lockers","media","news","wiki","docs","portal"],
    funktionaer:     ["dashboard"],
    trainer:         ["dashboard","team","training","events","helpers","buses","material","lockers","news","wiki","docs"],
    spieler:         ["dashboard","team","events","helpers","docs","news"],
    eltern:          ["dashboard","team","events","helpers","docs","news"],
    supporter:       ["dashboard","events","helpers","news"],
  };

  /* Modul-Aktionen für Detail-Ansicht */
export const MODUL_AKTIONEN={
    dashboard:  [{label:"Übersicht ansehen",wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"}],
    team:       [
      {label:"Team + Kader ansehen",          wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Position / Nummer ändern",      wer:["administrator","administration","trainer"],min:"schreiben",   spez:"Trainer: nur eigene Spieler"},
      {label:"Spieler hinzufügen / entfernen",wer:["administrator","administration"],         min:"verwalten"},
      {label:"Team erstellen / bearbeiten",   wer:["administrator","administration"],         min:"verwalten"},
      {label:"Trainer zuweisen",              wer:["administrator","administration"],         min:"verwalten"},
    ],
    members:    [
      {label:"Name, Tel, E-Mail sehen",           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Basis-Felder bearbeiten",           wer:["administrator","administration","trainer"],min:"schreiben",spez:"Trainer: nur eigene Spieler"},
      {label:"AHV, Bankdaten sehen",              wer:["administrator","administration"],         min:"verwalten"},
      {label:"Neue Mitglieder, Export, löschen",  wer:["administrator","administration"],         min:"verwalten"},
    ],
    training:   [
      {label:"Trainings ansehen",              wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Training absagen",               wer:["administrator","administration","trainer"],min:"schreiben",  spez:"Trainer: nur eigene Teams"},
      {label:"Training erstellen / bearbeiten",wer:["administrator","administration","trainer"],min:"verwalten",  spez:"Trainer: nur eigene Teams"},
      {label:"Vorlagen verwalten",             wer:["administrator","administration"],min:"verwalten"},
    ],
    schedule:   [
      {label:"Spielplan + Tabelle ansehen",wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Daten ändern",               wer:[],                                              min:"verwalten",  note:"Nur via FVRZ-Sync"},
    ],
    attendance_central:[
      {label:"Eigene Statistik sehen",           wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Anwesenheiten eintragen / ändern", wer:["administrator","administration","trainer"],min:"schreiben", spez:"Trainer: nur eigene Spieler"},
      {label:"Alle Teams auswerten, exportieren",wer:["administrator","administration"],         min:"verwalten"},
    ],
    events:     [
      {label:"Termine ansehen",                           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                           wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinsanlass erstellen / bearbeiten",      wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsanlass absagen / löschen",           wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Event erstellen / bearbeiten",         wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Team-Event absagen / löschen",              wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Spiel-Termin bearbeiten (Treffpunkt etc.)", wer:["administrator","trainer"],        min:"verwalten", spez:"Trainer: nur eigene Teams", note:"Auto-generiert via Spielplan"},
    ],
    helpers:    [
      {label:"Einsätze ansehen",                  wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"An- / Abmelden",                   wer:["administrator","administration","funktionaer","trainer","spieler","eltern"],min:"schreiben"},
      {label:"Vereinseinsatz erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Team-Einsatz erstellen / verwalten", wer:["administrator","trainer"],               min:"verwalten", spez:"Trainer: nur eigene Teams"},
      {label:"Zuteilungen verwalten",              wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    buses:      [
      {label:"Fahrten + Belegung ansehen",   wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Platz reservieren / abmelden", wer:["administrator","administration","trainer","spieler"],min:"schreiben"},
      {label:"Fahrten erstellen / verwalten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    material:   [
      {label:"Inventar ansehen",              wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler"],min:"lesen"},
      {label:"Ausleihe beantragen",           wer:["administrator","administration","trainer"], min:"schreiben"},
      {label:"Ausleihen genehmigen",          wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Inventar + Bestände verwalten", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    lockers:    [
      {label:"Eigene Zuteilung ansehen", wer:["administrator","funktionaer","administration","funktionaer","trainer"],min:"lesen"},
      {label:"Zuteilungen verwalten",    wer:["administrator","administration"],min:"verwalten"},
    ],
    news:       [
      {label:"Artikel lesen",                    wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Vereinsnews erstellen / bearbeiten",wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Vereinsnews publizieren / löschen", wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    wiki:       [
      {label:"Artikel lesen",                      wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Artikel bearbeiten",                 wer:["administrator","administration","funktionaer","trainer"],min:"schreiben"},
      {label:"Artikel erstellen, löschen, Kategorien",wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    docs:       [
      {label:"Herunterladen",                  wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler","eltern"],min:"lesen"},
      {label:"Hochladen, löschen",             wer:["administrator","administration","funktionaer"],min:"verwalten"},
      {label:"Ordner / Kategorien verwalten",  wer:["administrator","administration"],             min:"verwalten"},
    ],
    media:      [
      {label:"Anschauen",                           wer:["administrator","funktionaer","administration","funktionaer","trainer","spieler"],min:"lesen"},
      {label:"Fotos hochladen",                     wer:["administrator","administration","funktionaer","trainer"],min:"schreiben"},
      {label:"Team-Matchbericht schreiben",         wer:["administrator","trainer"],               min:"schreiben",  spez:"Trainer: nur eigene Teams"},
      {label:"Vereinsbericht schreiben",            wer:["administrator","administration","funktionaer"],min:"schreiben"},
      {label:"Publizieren, Alben verwalten",        wer:["administrator","administration","funktionaer"],min:"verwalten"},
    ],
    portal:     [{label:"Benutzer, Module, Berechtigungen",wer:["administrator","administration"],min:"verwalten"}],
  };

  /* Standard-Stufen pro Rolle (nur für Module mit Zugriff) */
export const ZUGRIFF_DEFAULT={
    administrator:  {_all:"verwalten"},
    administration: {
      _all:"verwalten",
      dashboard:"lesen",
    },
    funktionaer:    {_all:"lesen"},
    trainer:        {
      _all:"lesen",
      team:"verwalten",
      training:"verwalten",
      events:"verwalten",
      schedule:"lesen",            // Spielplan = nur anzeigen, Interaktion via Termine
      attendance_central:"schreiben",
      helpers:"verwalten",
      buses:"schreiben",
      material:"schreiben",
      media:"schreiben",
      wiki:"schreiben",
      members:"schreiben",
    },
    spieler:        {
      _all:"lesen",
      events:"schreiben",          // An-/Abmelden (inkl. auto-generierte Spiel-Termine)
      helpers:"schreiben",
      buses:"schreiben",
      schedule:"lesen",
    },
    eltern:         {
      _all:"lesen",
      events:"schreiben",
      helpers:"schreiben",
      schedule:"lesen",
    },
    supporter:      {
      _all:"lesen",
      helpers:"schreiben",
    },
  };

