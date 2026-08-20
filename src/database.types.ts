export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      _etappe6_altspalten_mitglieder: {
        Row: {
          ahv_nr: string | null
          email: string | null
          foto_url: string | null
          funktionen: string[] | null
          geburtsdatum: string | null
          geschlecht: string | null
          gesichert_am: string | null
          heimatort: string | null
          id: number | null
          kanton: string | null
          land: string | null
          nachname: string | null
          nationalitaet: string | null
          nationalitaet2: string | null
          ort: string | null
          person_id: string | null
          plz: string | null
          profil_geprueft_at: string | null
          strasse: string | null
          telefon: string | null
          vorname: string | null
        }
        Insert: {
          ahv_nr?: string | null
          email?: string | null
          foto_url?: string | null
          funktionen?: string[] | null
          geburtsdatum?: string | null
          geschlecht?: string | null
          gesichert_am?: string | null
          heimatort?: string | null
          id?: number | null
          kanton?: string | null
          land?: string | null
          nachname?: string | null
          nationalitaet?: string | null
          nationalitaet2?: string | null
          ort?: string | null
          person_id?: string | null
          plz?: string | null
          profil_geprueft_at?: string | null
          strasse?: string | null
          telefon?: string | null
          vorname?: string | null
        }
        Update: {
          ahv_nr?: string | null
          email?: string | null
          foto_url?: string | null
          funktionen?: string[] | null
          geburtsdatum?: string | null
          geschlecht?: string | null
          gesichert_am?: string | null
          heimatort?: string | null
          id?: number | null
          kanton?: string | null
          land?: string | null
          nachname?: string | null
          nationalitaet?: string | null
          nationalitaet2?: string | null
          ort?: string | null
          person_id?: string | null
          plz?: string | null
          profil_geprueft_at?: string | null
          strasse?: string | null
          telefon?: string | null
          vorname?: string | null
        }
        Relationships: []
      }
      _etappe6b_position_mitglieder: {
        Row: {
          gesichert_am: string | null
          id: number | null
          person_id: string | null
          position: string | null
          rueckennr: string | null
        }
        Insert: {
          gesichert_am?: string | null
          id?: number | null
          person_id?: string | null
          position?: string | null
          rueckennr?: string | null
        }
        Update: {
          gesichert_am?: string | null
          id?: number | null
          person_id?: string | null
          position?: string | null
          rueckennr?: string | null
        }
        Relationships: []
      }
      _etappe6c_altspalten_mitglieder: {
        Row: {
          datenstatus: string | null
          eltern: Json | null
          fairgate_sync_at: string | null
          gesichert_am: string | null
          hat_portal_zugang: boolean | null
          id: number | null
          notizen: string | null
          person_id: string | null
        }
        Insert: {
          datenstatus?: string | null
          eltern?: Json | null
          fairgate_sync_at?: string | null
          gesichert_am?: string | null
          hat_portal_zugang?: boolean | null
          id?: number | null
          notizen?: string | null
          person_id?: string | null
        }
        Update: {
          datenstatus?: string | null
          eltern?: Json | null
          fairgate_sync_at?: string | null
          gesichert_am?: string | null
          hat_portal_zugang?: boolean | null
          id?: number | null
          notizen?: string | null
          person_id?: string | null
        }
        Relationships: []
      }
      _supporter_rueckbau_aenderungen: {
        Row: {
          alter_wert: string | null
          feld: string | null
          geaendert_at: string | null
          geaendert_von: string | null
          id: string | null
          mitglied_id: number | null
          neuer_wert: string | null
          verein_id: string | null
        }
        Insert: {
          alter_wert?: string | null
          feld?: string | null
          geaendert_at?: string | null
          geaendert_von?: string | null
          id?: string | null
          mitglied_id?: number | null
          neuer_wert?: string | null
          verein_id?: string | null
        }
        Update: {
          alter_wert?: string | null
          feld?: string | null
          geaendert_at?: string | null
          geaendert_von?: string | null
          id?: string | null
          mitglied_id?: number | null
          neuer_wert?: string | null
          verein_id?: string | null
        }
        Relationships: []
      }
      _supporter_rueckbau_aktivitaeten: {
        Row: {
          beschreibung: string | null
          feld: string | null
          geaendert_at: string | null
          geaendert_von: string | null
          id: string | null
          mitglied_id: number | null
          typ: string | null
          verein_id: string | null
          wert: string | null
        }
        Insert: {
          beschreibung?: string | null
          feld?: string | null
          geaendert_at?: string | null
          geaendert_von?: string | null
          id?: string | null
          mitglied_id?: number | null
          typ?: string | null
          verein_id?: string | null
          wert?: string | null
        }
        Update: {
          beschreibung?: string | null
          feld?: string | null
          geaendert_at?: string | null
          geaendert_von?: string | null
          id?: string | null
          mitglied_id?: number | null
          typ?: string | null
          verein_id?: string | null
          wert?: string | null
        }
        Relationships: []
      }
      _supporter_rueckbau_mitglieder: {
        Row: {
          aktiv: boolean | null
          created_at: string | null
          deaktiviert_am: string | null
          deaktiviert_von: string | null
          eintrittsdatum: string | null
          email: string | null
          fairgate_id: string | null
          id: number | null
          js_nr: string | null
          mitgliedtyp: string | null
          nachname: string | null
          person_id: string | null
          rolle: string | null
          spielerpass: string | null
          updated_at: string | null
          verein_id: string | null
          vorname: string | null
        }
        Insert: {
          aktiv?: boolean | null
          created_at?: string | null
          deaktiviert_am?: string | null
          deaktiviert_von?: string | null
          eintrittsdatum?: string | null
          email?: string | null
          fairgate_id?: string | null
          id?: number | null
          js_nr?: string | null
          mitgliedtyp?: string | null
          nachname?: string | null
          person_id?: string | null
          rolle?: string | null
          spielerpass?: string | null
          updated_at?: string | null
          verein_id?: string | null
          vorname?: string | null
        }
        Update: {
          aktiv?: boolean | null
          created_at?: string | null
          deaktiviert_am?: string | null
          deaktiviert_von?: string | null
          eintrittsdatum?: string | null
          email?: string | null
          fairgate_id?: string | null
          id?: number | null
          js_nr?: string | null
          mitgliedtyp?: string | null
          nachname?: string | null
          person_id?: string | null
          rolle?: string | null
          spielerpass?: string | null
          updated_at?: string | null
          verein_id?: string | null
          vorname?: string | null
        }
        Relationships: []
      }
      _supporter_rueckbau_notizen: {
        Row: {
          autor_id: string | null
          autor_name: string | null
          created_at: string | null
          id: number | null
          mitglied_id: number | null
          text: string | null
          updated_at: string | null
          verein_id: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_name?: string | null
          created_at?: string | null
          id?: number | null
          mitglied_id?: number | null
          text?: string | null
          updated_at?: string | null
          verein_id?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_name?: string | null
          created_at?: string | null
          id?: number | null
          mitglied_id?: number | null
          text?: string | null
          updated_at?: string | null
          verein_id?: string | null
        }
        Relationships: []
      }
      abstimmung_antworten: {
        Row: {
          abstimmung_id: string
          antwort: string
          created_at: string | null
          eingetragen_von: string | null
          id: string
          mitglied_id: string | null
          verein_id: string
        }
        Insert: {
          abstimmung_id: string
          antwort: string
          created_at?: string | null
          eingetragen_von?: string | null
          id?: string
          mitglied_id?: string | null
          verein_id: string
        }
        Update: {
          abstimmung_id?: string
          antwort?: string
          created_at?: string | null
          eingetragen_von?: string | null
          id?: string
          mitglied_id?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abstimmung_antworten_abstimmung_id_fkey"
            columns: ["abstimmung_id"]
            isOneToOne: false
            referencedRelation: "abstimmungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abstimmung_antworten_eingetragen_von_fkey"
            columns: ["eingetragen_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abstimmung_antworten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      abstimmungen: {
        Row: {
          ablauf_datum: string | null
          active: boolean | null
          created_at: string | null
          erstellt_von: string | null
          frage: string
          id: string
          optionen: Json
          rollen: string[] | null
          teams: string[] | null
          verein_id: string
        }
        Insert: {
          ablauf_datum?: string | null
          active?: boolean | null
          created_at?: string | null
          erstellt_von?: string | null
          frage: string
          id?: string
          optionen: Json
          rollen?: string[] | null
          teams?: string[] | null
          verein_id: string
        }
        Update: {
          ablauf_datum?: string | null
          active?: boolean | null
          created_at?: string | null
          erstellt_von?: string | null
          frage?: string
          id?: string
          optionen?: Json
          rollen?: string[] | null
          teams?: string[] | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abstimmungen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abstimmungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      anwesenheiten: {
        Row: {
          eingetragen_von: string | null
          event_id: string
          event_type: string
          id: string
          mitglied_id: number | null
          notes: string | null
          status: string
          updated_at: string | null
          verein_id: string
        }
        Insert: {
          eingetragen_von?: string | null
          event_id: string
          event_type: string
          id?: string
          mitglied_id?: number | null
          notes?: string | null
          status: string
          updated_at?: string | null
          verein_id: string
        }
        Update: {
          eingetragen_von?: string | null
          event_id?: string
          event_type?: string
          id?: string
          mitglied_id?: number | null
          notes?: string | null
          status?: string
          updated_at?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anwesenheiten_eingetragen_von_fkey"
            columns: ["eingetragen_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anwesenheiten_mitglied_fkey"
            columns: ["mitglied_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id", "verein_id"]
          },
          {
            foreignKeyName: "anwesenheiten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      api_sync_log: {
        Row: {
          beendet_am: string | null
          datensaetze_aktualisiert: number | null
          datensaetze_fehler: number | null
          datensaetze_neu: number | null
          details: Json | null
          gestartet_am: string | null
          gestartet_von: string | null
          id: string
          meldung: string | null
          status: string | null
          verbindung_id: string
          verein_id: string
        }
        Insert: {
          beendet_am?: string | null
          datensaetze_aktualisiert?: number | null
          datensaetze_fehler?: number | null
          datensaetze_neu?: number | null
          details?: Json | null
          gestartet_am?: string | null
          gestartet_von?: string | null
          id?: string
          meldung?: string | null
          status?: string | null
          verbindung_id: string
          verein_id: string
        }
        Update: {
          beendet_am?: string | null
          datensaetze_aktualisiert?: number | null
          datensaetze_fehler?: number | null
          datensaetze_neu?: number | null
          details?: Json | null
          gestartet_am?: string | null
          gestartet_von?: string | null
          id?: string
          meldung?: string | null
          status?: string | null
          verbindung_id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_sync_log_gestartet_von_fkey"
            columns: ["gestartet_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_sync_log_verbindung_id_fkey"
            columns: ["verbindung_id"]
            isOneToOne: false
            referencedRelation: "api_verbindungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_sync_log_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      api_verbindungen: {
        Row: {
          active: boolean | null
          api_url: string | null
          auto_sync: boolean | null
          created_at: string | null
          icon: string | null
          id: string
          key: string
          konfiguriert: boolean | null
          label: string
          letzter_sync: string | null
          sort_order: number | null
          sync_felder: Json | null
          sync_intervall: string | null
          sync_laeuft_seit: string | null
          sync_meldung: string | null
          sync_status: string | null
          sync_uhrzeit: string | null
          updated_at: string | null
          verein_id: string
        }
        Insert: {
          active?: boolean | null
          api_url?: string | null
          auto_sync?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          key: string
          konfiguriert?: boolean | null
          label: string
          letzter_sync?: string | null
          sort_order?: number | null
          sync_felder?: Json | null
          sync_intervall?: string | null
          sync_laeuft_seit?: string | null
          sync_meldung?: string | null
          sync_status?: string | null
          sync_uhrzeit?: string | null
          updated_at?: string | null
          verein_id: string
        }
        Update: {
          active?: boolean | null
          api_url?: string | null
          auto_sync?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          key?: string
          konfiguriert?: boolean | null
          label?: string
          letzter_sync?: string | null
          sort_order?: number | null
          sync_felder?: Json | null
          sync_intervall?: string | null
          sync_laeuft_seit?: string | null
          sync_meldung?: string | null
          sync_status?: string | null
          sync_uhrzeit?: string | null
          updated_at?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_verbindungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          aktion: string
          benutzer_id: string | null
          created_at: string | null
          datensatz_id: string | null
          id: string
          ip_adresse: string | null
          nachher: Json | null
          tabelle: string | null
          verein_id: string
          vorher: Json | null
        }
        Insert: {
          aktion: string
          benutzer_id?: string | null
          created_at?: string | null
          datensatz_id?: string | null
          id?: string
          ip_adresse?: string | null
          nachher?: Json | null
          tabelle?: string | null
          verein_id: string
          vorher?: Json | null
        }
        Update: {
          aktion?: string
          benutzer_id?: string | null
          created_at?: string | null
          datensatz_id?: string | null
          id?: string
          ip_adresse?: string | null
          nachher?: Json | null
          tabelle?: string | null
          verein_id?: string
          vorher?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      aufgebote: {
        Row: {
          created_at: string | null
          id: string
          mitglied_id: string
          notes: string | null
          spiel_id: string
          status: string | null
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mitglied_id: string
          notes?: string | null
          spiel_id: string
          status?: string | null
          verein_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mitglied_id?: string
          notes?: string | null
          spiel_id?: string
          status?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aufgebote_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aufgebote_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      benachrichtigungen: {
        Row: {
          benutzer_id: string | null
          content: string | null
          created_at: string | null
          gelesen: boolean | null
          id: string
          referenz_id: string | null
          referenz_typ: string | null
          title: string
          type: string
          verein_id: string
        }
        Insert: {
          benutzer_id?: string | null
          content?: string | null
          created_at?: string | null
          gelesen?: boolean | null
          id?: string
          referenz_id?: string | null
          referenz_typ?: string | null
          title: string
          type: string
          verein_id: string
        }
        Update: {
          benutzer_id?: string | null
          content?: string | null
          created_at?: string | null
          gelesen?: boolean | null
          id?: string
          referenz_id?: string | null
          referenz_typ?: string | null
          title?: string
          type?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benachrichtigungen_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benachrichtigungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      benutzer: {
        Row: {
          aktiv: boolean | null
          created_at: string | null
          email: string
          id: string
          ist_admin: boolean
          last_sign_in_at: string | null
          mitglied_id: number | null
          name: string | null
          person_id: string | null
          role: string
          rollen: string[] | null
          teams: string[] | null
          teams_kontext: Json | null
          verein_id: string
        }
        Insert: {
          aktiv?: boolean | null
          created_at?: string | null
          email: string
          id: string
          ist_admin?: boolean
          last_sign_in_at?: string | null
          mitglied_id?: number | null
          name?: string | null
          person_id?: string | null
          role?: string
          rollen?: string[] | null
          teams?: string[] | null
          teams_kontext?: Json | null
          verein_id: string
        }
        Update: {
          aktiv?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          ist_admin?: boolean
          last_sign_in_at?: string | null
          mitglied_id?: number | null
          name?: string | null
          person_id?: string | null
          role?: string
          rollen?: string[] | null
          teams?: string[] | null
          teams_kontext?: Json | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benutzer_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benutzer_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_benutzer_mitglied"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
        ]
      }
      benutzer_funktionen: {
        Row: {
          benutzer_id: string
          bis: string | null
          funktion_id: number
          seit: string | null
          verein_id: string
        }
        Insert: {
          benutzer_id: string
          bis?: string | null
          funktion_id: number
          seit?: string | null
          verein_id: string
        }
        Update: {
          benutzer_id?: string
          bis?: string | null
          funktion_id?: number
          seit?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benutzer_funktionen_funktion_id_fkey"
            columns: ["funktion_id"]
            isOneToOne: false
            referencedRelation: "portal_funktionen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benutzer_funktionen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      benutzer_teams: {
        Row: {
          active: boolean | null
          benutzer_id: string
          created_at: string | null
          funktion: string | null
          id: string
          team_id: number
          verein_id: string
        }
        Insert: {
          active?: boolean | null
          benutzer_id: string
          created_at?: string | null
          funktion?: string | null
          id?: string
          team_id: number
          verein_id: string
        }
        Update: {
          active?: boolean | null
          benutzer_id?: string
          created_at?: string | null
          funktion?: string | null
          id?: string
          team_id?: number
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benutzer_teams_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benutzer_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benutzer_teams_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_anmeldungen: {
        Row: {
          bus_id: string
          created_at: string | null
          eingetragen_von: string | null
          id: string
          mitglied_id: string | null
          verein_id: string
        }
        Insert: {
          bus_id: string
          created_at?: string | null
          eingetragen_von?: string | null
          id?: string
          mitglied_id?: string | null
          verein_id: string
        }
        Update: {
          bus_id?: string
          created_at?: string | null
          eingetragen_von?: string | null
          id?: string
          mitglied_id?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_anmeldungen_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "busse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_anmeldungen_eingetragen_von_fkey"
            columns: ["eingetragen_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_anmeldungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      busse: {
        Row: {
          abfahrt_ort: string | null
          abfahrt_zeit: string | null
          created_at: string | null
          id: string
          notes: string | null
          plaetze: number | null
          spiel_id: string | null
          termin_id: string | null
          title: string | null
          verein_id: string
        }
        Insert: {
          abfahrt_ort?: string | null
          abfahrt_zeit?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          plaetze?: number | null
          spiel_id?: string | null
          termin_id?: string | null
          title?: string | null
          verein_id: string
        }
        Update: {
          abfahrt_ort?: string | null
          abfahrt_zeit?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          plaetze?: number | null
          spiel_id?: string | null
          termin_id?: string | null
          title?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "busse_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "busse_termin_id_fkey"
            columns: ["termin_id"]
            isOneToOne: false
            referencedRelation: "termine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "busse_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      dokumente: {
        Row: {
          autor_id: string | null
          category: string | null
          created_at: string | null
          datei_url: string
          id: string
          publiziert: boolean | null
          rollen: string[] | null
          teams: string[] | null
          title: string
          verein_id: string
        }
        Insert: {
          autor_id?: string | null
          category?: string | null
          created_at?: string | null
          datei_url: string
          id?: string
          publiziert?: boolean | null
          rollen?: string[] | null
          teams?: string[] | null
          title: string
          verein_id: string
        }
        Update: {
          autor_id?: string | null
          category?: string | null
          created_at?: string | null
          datei_url?: string
          id?: string
          publiziert?: boolean | null
          rollen?: string[] | null
          teams?: string[] | null
          title?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dokumente_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumente_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      eltern_kinder: {
        Row: {
          beziehung: string | null
          created_at: string
          eltern_id: string | null
          hauptkontakt: boolean
          id: number
          mitglied_id: number
          person_id: string
          verein_id: string
        }
        Insert: {
          beziehung?: string | null
          created_at?: string
          eltern_id?: string | null
          hauptkontakt?: boolean
          id?: never
          mitglied_id: number
          person_id: string
          verein_id: string
        }
        Update: {
          beziehung?: string | null
          created_at?: string
          eltern_id?: string | null
          hauptkontakt?: boolean
          id?: never
          mitglied_id?: number
          person_id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eltern_kinder_eltern_id_fkey"
            columns: ["eltern_id"]
            isOneToOne: false
            referencedRelation: "elternkontakte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eltern_kinder_mitglied_id_fkey"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eltern_kinder_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eltern_kinder_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      elternkontakte: {
        Row: {
          benutzer_id: string | null
          beziehung: string | null
          created_at: string | null
          email: string | null
          hauptkontakt: boolean | null
          id: string
          mitglied_id: number
          nachname: string | null
          name: string
          profil_geprueft_at: string | null
          supporter: boolean | null
          tel: string | null
          telefon: string | null
          verein_id: string
          vorname: string | null
        }
        Insert: {
          benutzer_id?: string | null
          beziehung?: string | null
          created_at?: string | null
          email?: string | null
          hauptkontakt?: boolean | null
          id?: string
          mitglied_id: number
          nachname?: string | null
          name: string
          profil_geprueft_at?: string | null
          supporter?: boolean | null
          tel?: string | null
          telefon?: string | null
          verein_id: string
          vorname?: string | null
        }
        Update: {
          benutzer_id?: string | null
          beziehung?: string | null
          created_at?: string | null
          email?: string | null
          hauptkontakt?: boolean | null
          id?: string
          mitglied_id?: number
          nachname?: string | null
          name?: string
          profil_geprueft_at?: string | null
          supporter?: boolean | null
          tel?: string | null
          telefon?: string | null
          verein_id?: string
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elternkontakte_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elternkontakte_mitglied_id_fkey"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elternkontakte_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      feldsichtbarkeit: {
        Row: {
          created_at: string | null
          feld_key: string
          feld_label: string
          id: string
          role: string
          sichtbar: boolean | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          feld_key: string
          feld_label: string
          id?: string
          role: string
          sichtbar?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          verein_id: string
        }
        Update: {
          created_at?: string | null
          feld_key?: string
          feld_label?: string
          id?: string
          role?: string
          sichtbar?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feldsichtbarkeit_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feldsichtbarkeit_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      helper_einsaetze: {
        Row: {
          created_at: string | null
          date: string | null
          event_id: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          verein_id: string
          zeit: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          event_id?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          verein_id: string
          zeit?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          event_id?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          verein_id?: string
          zeit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helper_einsaetze_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "helper_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_einsaetze_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      helper_einsatz_pflicht: {
        Row: {
          created_at: string | null
          gilt_fuer: string
          gilt_fuer_wert: string | null
          id: string
          min_einsaetze: number
          notes: string | null
          saison: string
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          gilt_fuer: string
          gilt_fuer_wert?: string | null
          id?: string
          min_einsaetze?: number
          notes?: string | null
          saison: string
          verein_id: string
        }
        Update: {
          created_at?: string | null
          gilt_fuer?: string
          gilt_fuer_wert?: string | null
          id?: string
          min_einsaetze?: number
          notes?: string | null
          saison?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helper_einsatz_pflicht_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      helper_einsatz_pflicht_mitglied: {
        Row: {
          created_at: string | null
          gesetzt_von: string | null
          id: string
          min_einsaetze: number
          mitglied_id: number
          notes: string | null
          saison: string
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          gesetzt_von?: string | null
          id?: string
          min_einsaetze: number
          mitglied_id: number
          notes?: string | null
          saison: string
          verein_id: string
        }
        Update: {
          created_at?: string | null
          gesetzt_von?: string | null
          id?: string
          min_einsaetze?: number
          mitglied_id?: number
          notes?: string | null
          saison?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helper_einsatz_pflicht_mitglied_gesetzt_von_fkey"
            columns: ["gesetzt_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_einsatz_pflicht_mitglied_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_pflicht_m_mitglied_fkey"
            columns: ["mitglied_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id", "verein_id"]
          },
        ]
      }
      helper_events: {
        Row: {
          color: string | null
          created_at: string | null
          date: string
          id: string
          location: string | null
          name: string
          verein_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          date: string
          id?: string
          location?: string | null
          name: string
          verein_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          date?: string
          id?: string
          location?: string | null
          name?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helper_events_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      helper_schichten: {
        Row: {
          created_at: string | null
          einsatz_id: string | null
          id: string
          label: string
          max_helfer: number | null
          notes: string | null
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          einsatz_id?: string | null
          id?: string
          label: string
          max_helfer?: number | null
          notes?: string | null
          verein_id: string
        }
        Update: {
          created_at?: string | null
          einsatz_id?: string | null
          id?: string
          label?: string
          max_helfer?: number | null
          notes?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helper_schichten_einsatz_id_fkey"
            columns: ["einsatz_id"]
            isOneToOne: false
            referencedRelation: "helper_einsaetze"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_schichten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      helper_zuteilungen: {
        Row: {
          als_stellvertreter: boolean | null
          created_at: string | null
          eingetragen_von: string | null
          freigabe_angefragt: boolean | null
          id: string
          person_id: string | null
          schicht_id: string | null
          status: string | null
          verein_id: string
        }
        Insert: {
          als_stellvertreter?: boolean | null
          created_at?: string | null
          eingetragen_von?: string | null
          freigabe_angefragt?: boolean | null
          id?: string
          person_id?: string | null
          schicht_id?: string | null
          status?: string | null
          verein_id: string
        }
        Update: {
          als_stellvertreter?: boolean | null
          created_at?: string | null
          eingetragen_von?: string | null
          freigabe_angefragt?: boolean | null
          id?: string
          person_id?: string | null
          schicht_id?: string | null
          status?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helper_zuteilungen_eingetragen_von_fkey"
            columns: ["eingetragen_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_zuteilungen_person_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_zuteilungen_schicht_id_fkey"
            columns: ["schicht_id"]
            isOneToOne: false
            referencedRelation: "helper_schichten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_zuteilungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      kader: {
        Row: {
          aktiv: boolean | null
          created_at: string | null
          id: number
          mitglied_id: number | null
          position: string | null
          rollen: string[] | null
          rueckennr: string | null
          saison: string | null
          team_id: number | null
          verein_id: string
        }
        Insert: {
          aktiv?: boolean | null
          created_at?: string | null
          id?: never
          mitglied_id?: number | null
          position?: string | null
          rollen?: string[] | null
          rueckennr?: string | null
          saison?: string | null
          team_id?: number | null
          verein_id: string
        }
        Update: {
          aktiv?: boolean | null
          created_at?: string | null
          id?: never
          mitglied_id?: number | null
          position?: string | null
          rollen?: string[] | null
          rueckennr?: string | null
          saison?: string | null
          team_id?: number | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kader_mitglied_id_fkey"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kader_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kader_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      kader_rollen: {
        Row: {
          aktiv: boolean
          id: number
          ist_trainer: boolean
          name: string
          sort_order: number
          verein_id: string
        }
        Insert: {
          aktiv?: boolean
          id?: number
          ist_trainer?: boolean
          name: string
          sort_order?: number
          verein_id: string
        }
        Update: {
          aktiv?: boolean
          id?: number
          ist_trainer?: boolean
          name?: string
          sort_order?: number
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kader_rollen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      kommunikationsgruppen: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          funktion: string | null
          id: string
          name: string
          role: string | null
          sort_order: number | null
          team_ebene: number | null
          type: string
          verein_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          funktion?: string | null
          id?: string
          name: string
          role?: string | null
          sort_order?: number | null
          team_ebene?: number | null
          type: string
          verein_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          funktion?: string | null
          id?: string
          name?: string
          role?: string | null
          sort_order?: number | null
          team_ebene?: number | null
          type?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kommunikationsgruppen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      kommunikationsgruppen_mitglieder: {
        Row: {
          benutzer_id: string
          created_at: string | null
          gruppe_id: string
          id: string
          verein_id: string
        }
        Insert: {
          benutzer_id: string
          created_at?: string | null
          gruppe_id: string
          id?: string
          verein_id: string
        }
        Update: {
          benutzer_id?: string
          created_at?: string | null
          gruppe_id?: string
          id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kommunikationsgruppen_mitglieder_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kommunikationsgruppen_mitglieder_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "kommunikationsgruppen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kommunikationsgruppen_mitglieder_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      material: {
        Row: {
          anzahl: number | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          team: string | null
          verein_id: string
          zustand: string | null
        }
        Insert: {
          anzahl?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          team?: string | null
          verein_id: string
          zustand?: string | null
        }
        Update: {
          anzahl?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          team?: string | null
          verein_id?: string
          zustand?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      material_ausleihen: {
        Row: {
          bis: string | null
          created_at: string | null
          id: string
          material_id: string
          mitglied_id: string | null
          notes: string | null
          status: string | null
          verein_id: string
          von: string
        }
        Insert: {
          bis?: string | null
          created_at?: string | null
          id?: string
          material_id: string
          mitglied_id?: string | null
          notes?: string | null
          status?: string | null
          verein_id: string
          von: string
        }
        Update: {
          bis?: string | null
          created_at?: string | null
          id?: string
          material_id?: string
          mitglied_id?: string | null
          notes?: string | null
          status?: string | null
          verein_id?: string
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_ausleihen_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_ausleihen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      medien: {
        Row: {
          autor_id: string | null
          created_at: string | null
          id: string
          publiziert: boolean | null
          spiel_id: string | null
          team: string | null
          title: string | null
          type: string
          url: string
          verein_id: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string | null
          id?: string
          publiziert?: boolean | null
          spiel_id?: string | null
          team?: string | null
          title?: string | null
          type: string
          url: string
          verein_id: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string | null
          id?: string
          publiziert?: boolean | null
          spiel_id?: string | null
          team?: string | null
          title?: string | null
          type?: string
          url?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medien_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medien_spiel_id_fkey"
            columns: ["spiel_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medien_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitglieder: {
        Row: {
          aktiv: boolean | null
          created_at: string | null
          deaktiviert_am: string | null
          deaktiviert_von: string | null
          eintrittsdatum: string | null
          fairgate_id: string | null
          id: number
          js_nr: string | null
          mitgliedtyp: string | null
          person_id: string
          rolle: string | null
          spielerpass: string | null
          updated_at: string | null
          verein_id: string
        }
        Insert: {
          aktiv?: boolean | null
          created_at?: string | null
          deaktiviert_am?: string | null
          deaktiviert_von?: string | null
          eintrittsdatum?: string | null
          fairgate_id?: string | null
          id?: number
          js_nr?: string | null
          mitgliedtyp?: string | null
          person_id: string
          rolle?: string | null
          spielerpass?: string | null
          updated_at?: string | null
          verein_id: string
        }
        Update: {
          aktiv?: boolean | null
          created_at?: string | null
          deaktiviert_am?: string | null
          deaktiviert_von?: string | null
          eintrittsdatum?: string | null
          fairgate_id?: string | null
          id?: number
          js_nr?: string | null
          mitgliedtyp?: string | null
          person_id?: string
          rolle?: string | null
          spielerpass?: string | null
          updated_at?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mitglieder_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitglieder_aenderungen: {
        Row: {
          alter_wert: string | null
          feld: string
          geaendert_at: string
          geaendert_von: string | null
          id: string
          mitglied_id: number | null
          neuer_wert: string | null
          person_id: string
          verein_id: string
        }
        Insert: {
          alter_wert?: string | null
          feld: string
          geaendert_at?: string
          geaendert_von?: string | null
          id?: string
          mitglied_id?: number | null
          neuer_wert?: string | null
          person_id: string
          verein_id: string
        }
        Update: {
          alter_wert?: string | null
          feld?: string
          geaendert_at?: string
          geaendert_von?: string | null
          id?: string
          mitglied_id?: number | null
          neuer_wert?: string | null
          person_id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mitglieder_aenderungen_mitglied_id_fkey"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_aenderungen_person_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_aenderungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitglieder_aktivitaeten: {
        Row: {
          beschreibung: string
          feld: string | null
          geaendert_at: string
          geaendert_von: string | null
          id: string
          mitglied_id: number | null
          person_id: string
          typ: string
          verein_id: string
          wert: string | null
        }
        Insert: {
          beschreibung: string
          feld?: string | null
          geaendert_at?: string
          geaendert_von?: string | null
          id?: string
          mitglied_id?: number | null
          person_id: string
          typ: string
          verein_id: string
          wert?: string | null
        }
        Update: {
          beschreibung?: string
          feld?: string | null
          geaendert_at?: string
          geaendert_von?: string | null
          id?: string
          mitglied_id?: number | null
          person_id?: string
          typ?: string
          verein_id?: string
          wert?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mitglieder_aktivitaeten_mitglied_id_fkey"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_aktivitaeten_person_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_aktivitaeten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitglieder_ansichten: {
        Row: {
          benutzer_id: string | null
          created_at: string | null
          filter: Json | null
          geteilt: boolean | null
          gruppenreihenfolge: Json | null
          gruppierung: Json | null
          id: string
          ist_standard: boolean | null
          name: string
          sortierung: Json | null
          spalten: string[]
          typ: string | null
          updated_at: string | null
          verein_id: string | null
          zeilenreihenfolge: Json | null
        }
        Insert: {
          benutzer_id?: string | null
          created_at?: string | null
          filter?: Json | null
          geteilt?: boolean | null
          gruppenreihenfolge?: Json | null
          gruppierung?: Json | null
          id?: string
          ist_standard?: boolean | null
          name: string
          sortierung?: Json | null
          spalten?: string[]
          typ?: string | null
          updated_at?: string | null
          verein_id?: string | null
          zeilenreihenfolge?: Json | null
        }
        Update: {
          benutzer_id?: string | null
          created_at?: string | null
          filter?: Json | null
          geteilt?: boolean | null
          gruppenreihenfolge?: Json | null
          gruppierung?: Json | null
          id?: string
          ist_standard?: boolean | null
          name?: string
          sortierung?: Json | null
          spalten?: string[]
          typ?: string | null
          updated_at?: string | null
          verein_id?: string | null
          zeilenreihenfolge?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mitglieder_ansichten_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_ansichten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitglieder_notizen: {
        Row: {
          autor_id: string | null
          autor_name: string | null
          created_at: string | null
          id: number
          mitglied_id: number | null
          person_id: string
          text: string
          updated_at: string | null
          verein_id: string
        }
        Insert: {
          autor_id?: string | null
          autor_name?: string | null
          created_at?: string | null
          id?: number
          mitglied_id?: number | null
          person_id: string
          text: string
          updated_at?: string | null
          verein_id: string
        }
        Update: {
          autor_id?: string | null
          autor_name?: string | null
          created_at?: string | null
          id?: number
          mitglied_id?: number | null
          person_id?: string
          text?: string
          updated_at?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notizen_autor"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_notizen_mitglied_id_fkey"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_notizen_person_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_notizen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitglieder_team_details: {
        Row: {
          id: number
          mitglied_id: number
          position: string | null
          rueckennr: string | null
          team_name: string
          updated_at: string | null
          verein_id: string
        }
        Insert: {
          id?: number
          mitglied_id: number
          position?: string | null
          rueckennr?: string | null
          team_name: string
          updated_at?: string | null
          verein_id: string
        }
        Update: {
          id?: number
          mitglied_id?: number
          position?: string | null
          rueckennr?: string | null
          team_name?: string
          updated_at?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mitglieder_team_details_mitglied_id_fkey"
            columns: ["mitglied_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitglieder_team_details_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitgliedtyp_feldkonfig: {
        Row: {
          art_id: string | null
          created_at: string | null
          id: string
          mitgliedtyp_id: string | null
          modus: string
          schluessel: string
          verein_id: string
        }
        Insert: {
          art_id?: string | null
          created_at?: string | null
          id?: string
          mitgliedtyp_id?: string | null
          modus: string
          schluessel: string
          verein_id: string
        }
        Update: {
          art_id?: string | null
          created_at?: string | null
          id?: string
          mitgliedtyp_id?: string | null
          modus?: string
          schluessel?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mitgliedtyp_feldkonfig_art_fkey"
            columns: ["art_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "personenarten"
            referencedColumns: ["id", "verein_id"]
          },
          {
            foreignKeyName: "mitgliedtyp_feldkonfig_typ_fkey"
            columns: ["mitgliedtyp_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "mitgliedtypen"
            referencedColumns: ["id", "verein_id"]
          },
          {
            foreignKeyName: "mitgliedtyp_feldkonfig_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitgliedtyp_pflichtfelder: {
        Row: {
          feld: string
          id: string
          mitgliedtyp: string
          pflicht: boolean | null
          verein_id: string
        }
        Insert: {
          feld: string
          id?: string
          mitgliedtyp: string
          pflicht?: boolean | null
          verein_id: string
        }
        Update: {
          feld?: string
          id?: string
          mitgliedtyp?: string
          pflicht?: boolean | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mitgliedtyp_pflichtfelder_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      mitgliedtypen: {
        Row: {
          aktiv: boolean | null
          beitragsinfo: string | null
          hauptkontakt_pflicht: boolean | null
          id: string
          name: string
          sort_order: number | null
          standard_rolle: string | null
          verein_id: string
          zaehlt_als_mitgliedschaft: boolean
        }
        Insert: {
          aktiv?: boolean | null
          beitragsinfo?: string | null
          hauptkontakt_pflicht?: boolean | null
          id?: string
          name: string
          sort_order?: number | null
          standard_rolle?: string | null
          verein_id: string
          zaehlt_als_mitgliedschaft?: boolean
        }
        Update: {
          aktiv?: boolean | null
          beitragsinfo?: string | null
          hauptkontakt_pflicht?: boolean | null
          id?: string
          name?: string
          sort_order?: number | null
          standard_rolle?: string | null
          verein_id?: string
          zaehlt_als_mitgliedschaft?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "mitgliedtypen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      modul_benutzer: {
        Row: {
          active: boolean
          benutzer_id: string
          created_at: string | null
          gesetzt_von: string | null
          id: string
          modul_id: string
          verein_id: string
        }
        Insert: {
          active: boolean
          benutzer_id: string
          created_at?: string | null
          gesetzt_von?: string | null
          id?: string
          modul_id: string
          verein_id: string
        }
        Update: {
          active?: boolean
          benutzer_id?: string
          created_at?: string | null
          gesetzt_von?: string | null
          id?: string
          modul_id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modul_benutzer_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modul_benutzer_gesetzt_von_fkey"
            columns: ["gesetzt_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modul_benutzer_modul_id_fkey"
            columns: ["modul_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modul_benutzer_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      modul_rechte: {
        Row: {
          hat_zugriff: boolean | null
          modul: string
          rolle: string
          stufe: string | null
          updated_at: string | null
          updated_by: string | null
          verein_id: string
        }
        Insert: {
          hat_zugriff?: boolean | null
          modul: string
          rolle: string
          stufe?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verein_id: string
        }
        Update: {
          hat_zugriff?: boolean | null
          modul?: string
          rolle?: string
          stufe?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modul_rechte_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      modul_rollen: {
        Row: {
          active: boolean | null
          id: string
          modul_id: string
          role: string
          verein_id: string
        }
        Insert: {
          active?: boolean | null
          id?: string
          modul_id: string
          role: string
          verein_id: string
        }
        Update: {
          active?: boolean | null
          id?: string
          modul_id?: string
          role?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modul_rollen_modul_id_fkey"
            columns: ["modul_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modul_rollen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      module: {
        Row: {
          category: string | null
          description: string | null
          icon: string | null
          id: string
          key: string
          label: string
          sort_order: number | null
          verein_id: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number | null
          verein_id: string
        }
        Update: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      module_berechtigungen: {
        Row: {
          created_at: string | null
          id: string
          kann_lesen: boolean | null
          kann_schreiben: boolean | null
          kann_verwalten: boolean | null
          modul_id: string
          role: string
          updated_at: string | null
          updated_by: string | null
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kann_lesen?: boolean | null
          kann_schreiben?: boolean | null
          kann_verwalten?: boolean | null
          modul_id: string
          role: string
          updated_at?: string | null
          updated_by?: string | null
          verein_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kann_lesen?: boolean | null
          kann_schreiben?: boolean | null
          kann_verwalten?: boolean | null
          modul_id?: string
          role?: string
          updated_at?: string | null
          updated_by?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_berechtigungen_modul_id_fkey"
            columns: ["modul_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_berechtigungen_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_berechtigungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      module_config: {
        Row: {
          aktiv: boolean | null
          modul: string
          updated_at: string | null
          updated_by: string | null
          verein_id: string
        }
        Insert: {
          aktiv?: boolean | null
          modul: string
          updated_at?: string | null
          updated_by?: string | null
          verein_id: string
        }
        Update: {
          aktiv?: boolean | null
          modul?: string
          updated_at?: string | null
          updated_by?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_config_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      module_delegationen: {
        Row: {
          active: boolean | null
          benutzer_id: string
          created_at: string | null
          delegiert_von: string | null
          id: string
          modul_id: string
          stufe: number
          verein_id: string
        }
        Insert: {
          active?: boolean | null
          benutzer_id: string
          created_at?: string | null
          delegiert_von?: string | null
          id?: string
          modul_id: string
          stufe: number
          verein_id: string
        }
        Update: {
          active?: boolean | null
          benutzer_id?: string
          created_at?: string | null
          delegiert_von?: string | null
          id?: string
          modul_id?: string
          stufe?: number
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_delegationen_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_delegationen_delegiert_von_fkey"
            columns: ["delegiert_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_delegationen_modul_id_fkey"
            columns: ["modul_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_delegationen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten: {
        Row: {
          autor_id: string | null
          autor_name: string | null
          empfaenger_gruppe_id: number | null
          empfaenger_rolle: string | null
          empfaenger_team: string | null
          empfaenger_typ: string
          erstellt_am: string | null
          id: string
          inhalt: string
          titel: string
          typ: string
          verein_id: string
        }
        Insert: {
          autor_id?: string | null
          autor_name?: string | null
          empfaenger_gruppe_id?: number | null
          empfaenger_rolle?: string | null
          empfaenger_team?: string | null
          empfaenger_typ: string
          erstellt_am?: string | null
          id?: string
          inhalt: string
          titel: string
          typ: string
          verein_id: string
        }
        Update: {
          autor_id?: string | null
          autor_name?: string | null
          empfaenger_gruppe_id?: number | null
          empfaenger_rolle?: string | null
          empfaenger_team?: string | null
          empfaenger_typ?: string
          erstellt_am?: string | null
          id?: string
          inhalt?: string
          titel?: string
          typ?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_empfaenger_gruppe_id_fkey"
            columns: ["empfaenger_gruppe_id"]
            isOneToOne: false
            referencedRelation: "portal_gruppen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten_antworten: {
        Row: {
          autor_id: string | null
          autor_name: string | null
          erstellt_am: string | null
          id: string
          inhalt: string
          nachricht_id: string | null
          verein_id: string
        }
        Insert: {
          autor_id?: string | null
          autor_name?: string | null
          erstellt_am?: string | null
          id?: string
          inhalt: string
          nachricht_id?: string | null
          verein_id: string
        }
        Update: {
          autor_id?: string | null
          autor_name?: string | null
          erstellt_am?: string | null
          id?: string
          inhalt?: string
          nachricht_id?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_antworten_nachricht_id_fkey"
            columns: ["nachricht_id"]
            isOneToOne: false
            referencedRelation: "nachrichten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_antworten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten_dateien: {
        Row: {
          datei_groesse: number | null
          datei_name: string
          datei_url: string
          erstellt_am: string | null
          id: string
          nachricht_id: string | null
          verein_id: string
        }
        Insert: {
          datei_groesse?: number | null
          datei_name: string
          datei_url: string
          erstellt_am?: string | null
          id?: string
          nachricht_id?: string | null
          verein_id: string
        }
        Update: {
          datei_groesse?: number | null
          datei_name?: string
          datei_url?: string
          erstellt_am?: string | null
          id?: string
          nachricht_id?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_dateien_nachricht_id_fkey"
            columns: ["nachricht_id"]
            isOneToOne: false
            referencedRelation: "nachrichten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_dateien_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten_gelesen: {
        Row: {
          gelesen_am: string | null
          nachricht_id: string
          user_id: string
          verein_id: string
        }
        Insert: {
          gelesen_am?: string | null
          nachricht_id: string
          user_id: string
          verein_id: string
        }
        Update: {
          gelesen_am?: string | null
          nachricht_id?: string
          user_id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_gelesen_nachricht_id_fkey"
            columns: ["nachricht_id"]
            isOneToOne: false
            referencedRelation: "nachrichten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_gelesen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          autor_id: string | null
          bild_url: string | null
          content: string | null
          created_at: string | null
          email_senden: boolean | null
          id: string
          internal: boolean | null
          kategorie_id: string | null
          mitglied_ids: string[] | null
          publiziert: boolean | null
          push_senden: boolean | null
          rollen: string[] | null
          teams: string[] | null
          title: string
          verein_id: string
        }
        Insert: {
          autor_id?: string | null
          bild_url?: string | null
          content?: string | null
          created_at?: string | null
          email_senden?: boolean | null
          id?: string
          internal?: boolean | null
          kategorie_id?: string | null
          mitglied_ids?: string[] | null
          publiziert?: boolean | null
          push_senden?: boolean | null
          rollen?: string[] | null
          teams?: string[] | null
          title: string
          verein_id: string
        }
        Update: {
          autor_id?: string | null
          bild_url?: string | null
          content?: string | null
          created_at?: string | null
          email_senden?: boolean | null
          id?: string
          internal?: boolean | null
          kategorie_id?: string | null
          mitglied_ids?: string[] | null
          publiziert?: boolean | null
          push_senden?: boolean | null
          rollen?: string[] | null
          teams?: string[] | null
          title?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_kategorie_id_fkey"
            columns: ["kategorie_id"]
            isOneToOne: false
            referencedRelation: "news_kategorien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      news_kategorien: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          internal: boolean | null
          name: string
          sort_order: number | null
          verein_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          internal?: boolean | null
          name: string
          sort_order?: number | null
          verein_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          internal?: boolean | null
          name?: string
          sort_order?: number | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_kategorien_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      news_lesestatus: {
        Row: {
          benutzer_id: string
          gelesen_at: string | null
          id: string
          news_id: string
          verein_id: string
        }
        Insert: {
          benutzer_id: string
          gelesen_at?: string | null
          id?: string
          news_id: string
          verein_id: string
        }
        Update: {
          benutzer_id?: string
          gelesen_at?: string | null
          id?: string
          news_id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_lesestatus_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_lesestatus_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_lesestatus_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      personen: {
        Row: {
          ahv_nr: string | null
          created_at: string
          email: string | null
          foto_url: string | null
          funktionen: string[]
          geburtsdatum: string | null
          geschlecht: string | null
          heimatort: string | null
          id: string
          kanton: string | null
          land: string | null
          nachname: string
          nationalitaet: string | null
          nationalitaet2: string | null
          ort: string | null
          plz: string | null
          profil_geprueft_at: string | null
          strasse: string | null
          telefon: string | null
          updated_at: string
          verein_id: string
          vorname: string
        }
        Insert: {
          ahv_nr?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          funktionen?: string[]
          geburtsdatum?: string | null
          geschlecht?: string | null
          heimatort?: string | null
          id?: string
          kanton?: string | null
          land?: string | null
          nachname: string
          nationalitaet?: string | null
          nationalitaet2?: string | null
          ort?: string | null
          plz?: string | null
          profil_geprueft_at?: string | null
          strasse?: string | null
          telefon?: string | null
          updated_at?: string
          verein_id: string
          vorname: string
        }
        Update: {
          ahv_nr?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          funktionen?: string[]
          geburtsdatum?: string | null
          geschlecht?: string | null
          heimatort?: string | null
          id?: string
          kanton?: string | null
          land?: string | null
          nachname?: string
          nationalitaet?: string | null
          nationalitaet2?: string | null
          ort?: string | null
          plz?: string | null
          profil_geprueft_at?: string | null
          strasse?: string | null
          telefon?: string | null
          updated_at?: string
          verein_id?: string
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: "personen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      personenart_pro_person: {
        Row: {
          art_id: string
          created_at: string | null
          id: string
          person_id: string
          verein_id: string
        }
        Insert: {
          art_id: string
          created_at?: string | null
          id?: string
          person_id: string
          verein_id: string
        }
        Update: {
          art_id?: string
          created_at?: string | null
          id?: string
          person_id?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personenart_pro_person_art_fkey"
            columns: ["art_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "personenarten"
            referencedColumns: ["id", "verein_id"]
          },
          {
            foreignKeyName: "personenart_pro_person_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personenart_pro_person_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      personenarten: {
        Row: {
          ableitung: string | null
          aktiv: boolean
          created_at: string | null
          id: string
          name: string
          sort_order: number
          verein_id: string
        }
        Insert: {
          ableitung?: string | null
          aktiv?: boolean
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number
          verein_id: string
        }
        Update: {
          ableitung?: string | null
          aktiv?: boolean
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personenarten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_einstellungen: {
        Row: {
          schluessel: string
          updated_at: string | null
          updated_by: string | null
          verein_id: string
          wert: Json
        }
        Insert: {
          schluessel: string
          updated_at?: string | null
          updated_by?: string | null
          verein_id: string
          wert?: Json
        }
        Update: {
          schluessel?: string
          updated_at?: string | null
          updated_by?: string | null
          verein_id?: string
          wert?: Json
        }
        Relationships: [
          {
            foreignKeyName: "portal_einstellungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_funktionen: {
        Row: {
          aktiv: boolean | null
          beschreibung: string | null
          created_at: string | null
          filter: Json | null
          gruppe_id: number | null
          id: number
          module_override: string[] | null
          name: string
          stufe_override: Json | null
          teams: string[] | null
          verein_id: string
        }
        Insert: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          filter?: Json | null
          gruppe_id?: number | null
          id?: number
          module_override?: string[] | null
          name: string
          stufe_override?: Json | null
          teams?: string[] | null
          verein_id: string
        }
        Update: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          filter?: Json | null
          gruppe_id?: number | null
          id?: number
          module_override?: string[] | null
          name?: string
          stufe_override?: Json | null
          teams?: string[] | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_funktionen_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "portal_gruppen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_funktionen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_gruppen: {
        Row: {
          aktiv: boolean | null
          beschreibung: string | null
          created_at: string | null
          farbe: string | null
          id: number
          modul_stufen: Json | null
          module: string[] | null
          name: string
          verein_id: string
        }
        Insert: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          farbe?: string | null
          id?: number
          modul_stufen?: Json | null
          module?: string[] | null
          name: string
          verein_id: string
        }
        Update: {
          aktiv?: boolean | null
          beschreibung?: string | null
          created_at?: string | null
          farbe?: string | null
          id?: number
          modul_stufen?: Json | null
          module?: string[] | null
          name?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_gruppen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_gruppen_teams: {
        Row: {
          gruppe_id: number | null
          id: string
          team_id: number | null
          verein_id: string
        }
        Insert: {
          gruppe_id?: number | null
          id?: string
          team_id?: number | null
          verein_id: string
        }
        Update: {
          gruppe_id?: number | null
          id?: string
          team_id?: number | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_gruppen_teams_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "portal_gruppen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_gruppen_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_gruppen_teams_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_rollen: {
        Row: {
          aktiv: boolean
          id: number
          label: string
          name: string
          prioritaet: number
          verein_id: string
        }
        Insert: {
          aktiv?: boolean
          id?: number
          label: string
          name: string
          prioritaet?: number
          verein_id: string
        }
        Update: {
          aktiv?: boolean
          id?: number
          label?: string
          name?: string
          prioritaet?: number
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_rollen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          benutzer_id: string | null
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string | null
          verein_id: string
        }
        Insert: {
          auth?: string | null
          benutzer_id?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh?: string | null
          verein_id: string
        }
        Update: {
          auth?: string | null
          benutzer_id?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_benutzer_id_fkey"
            columns: ["benutzer_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      ranglisten: {
        Row: {
          anzahl_spiele: number | null
          club_nummer: number | null
          created_at: string | null
          fairplay_punkte: number | null
          gegentore: number | null
          id: string
          niederlagen: number | null
          position: number | null
          punkte: number | null
          sfv_division_id: number
          sfv_division_name: string | null
          sfv_gruppe: string | null
          sfv_gruppe_id: number
          sfv_liga_id: number
          sfv_liga_name: string | null
          sfv_saison_id: number
          sfv_team_id: number
          siege: number | null
          stand_vom: string | null
          team_name: string | null
          tore: number | null
          unentschieden: number | null
          verein_id: string
        }
        Insert: {
          anzahl_spiele?: number | null
          club_nummer?: number | null
          created_at?: string | null
          fairplay_punkte?: number | null
          gegentore?: number | null
          id?: string
          niederlagen?: number | null
          position?: number | null
          punkte?: number | null
          sfv_division_id?: number
          sfv_division_name?: string | null
          sfv_gruppe?: string | null
          sfv_gruppe_id?: number
          sfv_liga_id: number
          sfv_liga_name?: string | null
          sfv_saison_id: number
          sfv_team_id: number
          siege?: number | null
          stand_vom?: string | null
          team_name?: string | null
          tore?: number | null
          unentschieden?: number | null
          verein_id: string
        }
        Update: {
          anzahl_spiele?: number | null
          club_nummer?: number | null
          created_at?: string | null
          fairplay_punkte?: number | null
          gegentore?: number | null
          id?: string
          niederlagen?: number | null
          position?: number | null
          punkte?: number | null
          sfv_division_id?: number
          sfv_division_name?: string | null
          sfv_gruppe?: string | null
          sfv_gruppe_id?: number
          sfv_liga_id?: number
          sfv_liga_name?: string | null
          sfv_saison_id?: number
          sfv_team_id?: number
          siege?: number | null
          stand_vom?: string | null
          team_name?: string | null
          tore?: number | null
          unentschieden?: number | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranglisten_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      rolle_pflichtfelder: {
        Row: {
          feld: string
          id: string
          pflicht: boolean | null
          rolle: string
          verein_id: string
        }
        Insert: {
          feld: string
          id?: string
          pflicht?: boolean | null
          rolle: string
          verein_id: string
        }
        Update: {
          feld?: string
          id?: string
          pflicht?: boolean | null
          rolle?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolle_pflichtfelder_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      rollen: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          verein_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      sfv_team_logos: {
        Row: {
          fehlt_seit: string | null
          geholt_am: string | null
          id: string
          mime: string | null
          pfad: string | null
          sfv_team_id: number
          verein_id: string
        }
        Insert: {
          fehlt_seit?: string | null
          geholt_am?: string | null
          id?: string
          mime?: string | null
          pfad?: string | null
          sfv_team_id: number
          verein_id: string
        }
        Update: {
          fehlt_seit?: string | null
          geholt_am?: string | null
          id?: string
          mime?: string | null
          pfad?: string | null
          sfv_team_id?: number
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sfv_team_logos_verein_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      sfv_zuordnung: {
        Row: {
          id: string
          mitglied_id: number
          notiz: string | null
          sfv_person_id: number
          verein_id: string
          zugeordnet_am: string
          zugeordnet_von: string | null
        }
        Insert: {
          id?: string
          mitglied_id: number
          notiz?: string | null
          sfv_person_id: number
          verein_id: string
          zugeordnet_am?: string
          zugeordnet_von?: string | null
        }
        Update: {
          id?: string
          mitglied_id?: number
          notiz?: string | null
          sfv_person_id?: number
          verein_id?: string
          zugeordnet_am?: string
          zugeordnet_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sfv_zuordnung_mitglied_fkey"
            columns: ["mitglied_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "mitglieder"
            referencedColumns: ["id", "verein_id"]
          },
          {
            foreignKeyName: "sfv_zuordnung_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfv_zuordnung_zugeordnet_von_fkey"
            columns: ["zugeordnet_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
        ]
      }
      spiel_aufstellung: {
        Row: {
          bis_minute: number | null
          id: string
          position_id: number | null
          position_name: string | null
          rueckennr: number | null
          sfv_person_id: number
          sfv_team_id: number | null
          spiel_id: string
          spielzeit: number | null
          verein_id: string
          von_minute: number | null
          zuletzt_synchronisiert: string
        }
        Insert: {
          bis_minute?: number | null
          id?: string
          position_id?: number | null
          position_name?: string | null
          rueckennr?: number | null
          sfv_person_id: number
          sfv_team_id?: number | null
          spiel_id: string
          spielzeit?: number | null
          verein_id: string
          von_minute?: number | null
          zuletzt_synchronisiert?: string
        }
        Update: {
          bis_minute?: number | null
          id?: string
          position_id?: number | null
          position_name?: string | null
          rueckennr?: number | null
          sfv_person_id?: number
          sfv_team_id?: number | null
          spiel_id?: string
          spielzeit?: number | null
          verein_id?: string
          von_minute?: number | null
          zuletzt_synchronisiert?: string
        }
        Relationships: [
          {
            foreignKeyName: "spiel_aufstellung_spiel_fkey"
            columns: ["spiel_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id", "verein_id"]
          },
          {
            foreignKeyName: "spiel_aufstellung_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      spiel_ereignisse: {
        Row: {
          ein_rueckennr: number | null
          ein_sfv_person_id: number | null
          ersetzt_ereignis_id: string | null
          geaenderte_felder: string[] | null
          gegner_club_name: string | null
          herkunft: string
          id: string
          ist_eigener: boolean
          korrigiert_am: string | null
          korrigiert_von: string | null
          minute: number | null
          rueckennr: number | null
          sfv_event_id: number | null
          sfv_person_id: number | null
          sfv_team_id: number | null
          spiel_id: string
          subtyp: string | null
          subtyp_id: number | null
          typ: string | null
          typ_id: number
          verein_id: string
          verworfen_am: string | null
          zuletzt_synchronisiert: string
          zusatzminute: number | null
        }
        Insert: {
          ein_rueckennr?: number | null
          ein_sfv_person_id?: number | null
          ersetzt_ereignis_id?: string | null
          geaenderte_felder?: string[] | null
          gegner_club_name?: string | null
          herkunft: string
          id?: string
          ist_eigener: boolean
          korrigiert_am?: string | null
          korrigiert_von?: string | null
          minute?: number | null
          rueckennr?: number | null
          sfv_event_id?: number | null
          sfv_person_id?: number | null
          sfv_team_id?: number | null
          spiel_id: string
          subtyp?: string | null
          subtyp_id?: number | null
          typ?: string | null
          typ_id: number
          verein_id: string
          verworfen_am?: string | null
          zuletzt_synchronisiert?: string
          zusatzminute?: number | null
        }
        Update: {
          ein_rueckennr?: number | null
          ein_sfv_person_id?: number | null
          ersetzt_ereignis_id?: string | null
          geaenderte_felder?: string[] | null
          gegner_club_name?: string | null
          herkunft?: string
          id?: string
          ist_eigener?: boolean
          korrigiert_am?: string | null
          korrigiert_von?: string | null
          minute?: number | null
          rueckennr?: number | null
          sfv_event_id?: number | null
          sfv_person_id?: number | null
          sfv_team_id?: number | null
          spiel_id?: string
          subtyp?: string | null
          subtyp_id?: number | null
          typ?: string | null
          typ_id?: number
          verein_id?: string
          verworfen_am?: string | null
          zuletzt_synchronisiert?: string
          zusatzminute?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spiel_ereignisse_ersetzt_ereignis_id_fkey"
            columns: ["ersetzt_ereignis_id"]
            isOneToOne: false
            referencedRelation: "spiel_ereignisse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spiel_ereignisse_korrigiert_von_fkey"
            columns: ["korrigiert_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spiel_ereignisse_spiel_fkey"
            columns: ["spiel_id", "verein_id"]
            isOneToOne: false
            referencedRelation: "spiele"
            referencedColumns: ["id", "verein_id"]
          },
          {
            foreignKeyName: "spiel_ereignisse_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      spiele: {
        Row: {
          created_at: string | null
          date: string
          delegierter: string | null
          gegner: string | null
          heimspiel: boolean | null
          ht_resultat: string | null
          id: string
          liga: string | null
          matchdaten_geholt_am: string | null
          notes: string | null
          resultat: string | null
          schiedsrichter: string | null
          sfv_gegner_team_id: number | null
          sfv_gruppe: string | null
          sfv_gruppe_id: number | null
          sfv_liga_id: number | null
          sfv_match_id: number | null
          sfv_saison_id: number | null
          sfv_spiel_nr: string | null
          sfv_spiel_typ: number | null
          sfv_stand: Json | null
          sfv_status: number | null
          sfv_team_id: number | null
          spiel_nr: string | null
          status: string | null
          team: string
          treffpunkt: string | null
          venue: string | null
          venue_addr: string | null
          verein_id: string
          wettbewerb: string | null
          zeit: string | null
          zuletzt_synchronisiert: string | null
          zuschauer: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          delegierter?: string | null
          gegner?: string | null
          heimspiel?: boolean | null
          ht_resultat?: string | null
          id?: string
          liga?: string | null
          matchdaten_geholt_am?: string | null
          notes?: string | null
          resultat?: string | null
          schiedsrichter?: string | null
          sfv_gegner_team_id?: number | null
          sfv_gruppe?: string | null
          sfv_gruppe_id?: number | null
          sfv_liga_id?: number | null
          sfv_match_id?: number | null
          sfv_saison_id?: number | null
          sfv_spiel_nr?: string | null
          sfv_spiel_typ?: number | null
          sfv_stand?: Json | null
          sfv_status?: number | null
          sfv_team_id?: number | null
          spiel_nr?: string | null
          status?: string | null
          team: string
          treffpunkt?: string | null
          venue?: string | null
          venue_addr?: string | null
          verein_id: string
          wettbewerb?: string | null
          zeit?: string | null
          zuletzt_synchronisiert?: string | null
          zuschauer?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          delegierter?: string | null
          gegner?: string | null
          heimspiel?: boolean | null
          ht_resultat?: string | null
          id?: string
          liga?: string | null
          matchdaten_geholt_am?: string | null
          notes?: string | null
          resultat?: string | null
          schiedsrichter?: string | null
          sfv_gegner_team_id?: number | null
          sfv_gruppe?: string | null
          sfv_gruppe_id?: number | null
          sfv_liga_id?: number | null
          sfv_match_id?: number | null
          sfv_saison_id?: number | null
          sfv_spiel_nr?: string | null
          sfv_spiel_typ?: number | null
          sfv_stand?: Json | null
          sfv_status?: number | null
          sfv_team_id?: number | null
          spiel_nr?: string | null
          status?: string | null
          team?: string
          treffpunkt?: string | null
          venue?: string | null
          venue_addr?: string | null
          verein_id?: string
          wettbewerb?: string | null
          zeit?: string | null
          zuletzt_synchronisiert?: string | null
          zuschauer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spiele_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      team_helfer_zuteilungen: {
        Row: {
          als_stellvertreter: boolean | null
          aufgabe_id: string
          created_at: string | null
          eingetragen_von: string | null
          id: string
          person_id: string | null
          status: string | null
          verein_id: string
        }
        Insert: {
          als_stellvertreter?: boolean | null
          aufgabe_id: string
          created_at?: string | null
          eingetragen_von?: string | null
          id?: string
          person_id?: string | null
          status?: string | null
          verein_id: string
        }
        Update: {
          als_stellvertreter?: boolean | null
          aufgabe_id?: string
          created_at?: string | null
          eingetragen_von?: string | null
          id?: string
          person_id?: string | null
          status?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_helfer_zuteilungen_aufgabe_id_fkey"
            columns: ["aufgabe_id"]
            isOneToOne: false
            referencedRelation: "team_helferaufgaben"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_helfer_zuteilungen_eingetragen_von_fkey"
            columns: ["eingetragen_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_helfer_zuteilungen_person_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_helfer_zuteilungen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      team_helferaufgaben: {
        Row: {
          beschreibung: string | null
          created_at: string | null
          erstellt_von: string | null
          event_id: string | null
          event_type: string | null
          id: string
          max_helfer: number | null
          team: string
          typ: string
          verein_id: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          max_helfer?: number | null
          team: string
          typ: string
          verein_id: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          max_helfer?: number | null
          team?: string
          typ?: string
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_helferaufgaben_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_helferaufgaben_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      team_module: {
        Row: {
          aktiv: boolean | null
          modul: string
          team_id: number
          verein_id: string
        }
        Insert: {
          aktiv?: boolean | null
          modul: string
          team_id: number
          verein_id: string
        }
        Update: {
          aktiv?: boolean | null
          modul?: string
          team_id?: number
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_module_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_module_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      team_stufen: {
        Row: {
          created_at: string | null
          ebene: number
          id: number
          kurzname: string | null
          name: string
          parent_id: number | null
          sortorder: number | null
          stufenleitung: string | null
          verein_id: string
        }
        Insert: {
          created_at?: string | null
          ebene: number
          id?: number
          kurzname?: string | null
          name: string
          parent_id?: number | null
          sortorder?: number | null
          stufenleitung?: string | null
          verein_id: string
        }
        Update: {
          created_at?: string | null
          ebene?: number
          id?: number
          kurzname?: string | null
          name?: string
          parent_id?: number | null
          sortorder?: number | null
          stufenleitung?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_stufen_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "team_stufen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_stufen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          aktiv: boolean
          beschreibung: string | null
          co_trainers: string[] | null
          created_at: string | null
          hauptbereich: string | null
          haupttrainer: string[] | null
          id: number
          kategorie: string
          kurzname: string | null
          liga: string | null
          name: string
          saison: string | null
          sfv_division: string | null
          sfv_liga_id: number | null
          sfv_liga_name: string | null
          sfv_team_id: number | null
          staff: string[] | null
          stufe_id: number | null
          stufenleitung: string | null
          trainer: string | null
          trainer2: string | null
          updated_at: string | null
          verbandskategorie: string | null
          verein_id: string
          vereinsstufe: string | null
        }
        Insert: {
          aktiv?: boolean
          beschreibung?: string | null
          co_trainers?: string[] | null
          created_at?: string | null
          hauptbereich?: string | null
          haupttrainer?: string[] | null
          id?: number
          kategorie?: string
          kurzname?: string | null
          liga?: string | null
          name: string
          saison?: string | null
          sfv_division?: string | null
          sfv_liga_id?: number | null
          sfv_liga_name?: string | null
          sfv_team_id?: number | null
          staff?: string[] | null
          stufe_id?: number | null
          stufenleitung?: string | null
          trainer?: string | null
          trainer2?: string | null
          updated_at?: string | null
          verbandskategorie?: string | null
          verein_id: string
          vereinsstufe?: string | null
        }
        Update: {
          aktiv?: boolean
          beschreibung?: string | null
          co_trainers?: string[] | null
          created_at?: string | null
          hauptbereich?: string | null
          haupttrainer?: string[] | null
          id?: number
          kategorie?: string
          kurzname?: string | null
          liga?: string | null
          name?: string
          saison?: string | null
          sfv_division?: string | null
          sfv_liga_id?: number | null
          sfv_liga_name?: string | null
          sfv_team_id?: number | null
          staff?: string[] | null
          stufe_id?: number | null
          stufenleitung?: string | null
          trainer?: string | null
          trainer2?: string | null
          updated_at?: string | null
          verbandskategorie?: string | null
          verein_id?: string
          vereinsstufe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_stufe_id_fkey"
            columns: ["stufe_id"]
            isOneToOne: false
            referencedRelation: "team_stufen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      termine: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          end_datum: string | null
          end_zeit: string | null
          id: string
          location: string | null
          rsvp: boolean | null
          teams: string[] | null
          title: string
          type: string
          verein_id: string
          zeit: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          end_datum?: string | null
          end_zeit?: string | null
          id?: string
          location?: string | null
          rsvp?: boolean | null
          teams?: string[] | null
          title: string
          type: string
          verein_id: string
          zeit?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          end_datum?: string | null
          end_zeit?: string | null
          id?: string
          location?: string | null
          rsvp?: boolean | null
          teams?: string[] | null
          title?: string
          type?: string
          verein_id?: string
          zeit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "termine_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          abgesagt: boolean | null
          created_at: string | null
          date: string
          end_ort: string | null
          id: string
          location: string | null
          notes: string | null
          team: string
          thema: string | null
          trainingsplan_slot_id: string | null
          verein_id: string
          zeit_bis: string | null
          zeit_von: string | null
        }
        Insert: {
          abgesagt?: boolean | null
          created_at?: string | null
          date: string
          end_ort?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          team: string
          thema?: string | null
          trainingsplan_slot_id?: string | null
          verein_id: string
          zeit_bis?: string | null
          zeit_von?: string | null
        }
        Update: {
          abgesagt?: boolean | null
          created_at?: string | null
          date?: string
          end_ort?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          team?: string
          thema?: string | null
          trainingsplan_slot_id?: string | null
          verein_id?: string
          zeit_bis?: string | null
          zeit_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_trainingsplan_slot_id_fkey"
            columns: ["trainingsplan_slot_id"]
            isOneToOne: false
            referencedRelation: "trainingsplan_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      trainingsplaetze: {
        Row: {
          active: boolean | null
          created_at: string | null
          haelften: string[] | null
          id: string
          name: string
          sort_order: number | null
          verein_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          haelften?: string[] | null
          id?: string
          name: string
          sort_order?: number | null
          verein_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          haelften?: string[] | null
          id?: string
          name?: string
          sort_order?: number | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainingsplaetze_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      trainingsplan_ausnahmen: {
        Row: {
          begruendung: string | null
          created_at: string | null
          erstellt_von: string | null
          id: string
          neue_end_zeit: number | null
          neue_haelfte: string | null
          neue_start_zeit: number | null
          neue_wechsel_zeit: number | null
          neuer_ort: string | null
          neues_end_haelfte: string | null
          neues_end_ort: string | null
          slot_id: string | null
          type: string
          verein_id: string
          von_trainer: boolean | null
          week_nr: number
          year: number
          zusatz_end_haelfte: string | null
          zusatz_end_ort: string | null
          zusatz_end_zeit: number | null
          zusatz_farbe: string | null
          zusatz_haelfte: string | null
          zusatz_ort: string | null
          zusatz_start_zeit: number | null
          zusatz_team: string | null
          zusatz_wechsel_zeit: number | null
          zusatz_wochentag: string | null
        }
        Insert: {
          begruendung?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          id?: string
          neue_end_zeit?: number | null
          neue_haelfte?: string | null
          neue_start_zeit?: number | null
          neue_wechsel_zeit?: number | null
          neuer_ort?: string | null
          neues_end_haelfte?: string | null
          neues_end_ort?: string | null
          slot_id?: string | null
          type: string
          verein_id: string
          von_trainer?: boolean | null
          week_nr: number
          year: number
          zusatz_end_haelfte?: string | null
          zusatz_end_ort?: string | null
          zusatz_end_zeit?: number | null
          zusatz_farbe?: string | null
          zusatz_haelfte?: string | null
          zusatz_ort?: string | null
          zusatz_start_zeit?: number | null
          zusatz_team?: string | null
          zusatz_wechsel_zeit?: number | null
          zusatz_wochentag?: string | null
        }
        Update: {
          begruendung?: string | null
          created_at?: string | null
          erstellt_von?: string | null
          id?: string
          neue_end_zeit?: number | null
          neue_haelfte?: string | null
          neue_start_zeit?: number | null
          neue_wechsel_zeit?: number | null
          neuer_ort?: string | null
          neues_end_haelfte?: string | null
          neues_end_ort?: string | null
          slot_id?: string | null
          type?: string
          verein_id?: string
          von_trainer?: boolean | null
          week_nr?: number
          year?: number
          zusatz_end_haelfte?: string | null
          zusatz_end_ort?: string | null
          zusatz_end_zeit?: number | null
          zusatz_farbe?: string | null
          zusatz_haelfte?: string | null
          zusatz_ort?: string | null
          zusatz_start_zeit?: number | null
          zusatz_team?: string | null
          zusatz_wechsel_zeit?: number | null
          zusatz_wochentag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainingsplan_ausnahmen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainingsplan_ausnahmen_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "trainingsplan_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainingsplan_ausnahmen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      trainingsplan_slots: {
        Row: {
          color: string | null
          created_at: string | null
          end_half: string | null
          end_ort: string | null
          end_platz_id: string | null
          end_zeit: number
          half: string | null
          id: string
          location: string | null
          platz_id: string | null
          start_zeit: number
          team: string
          template_id: string
          valid_from_week: string | null
          valid_from_week_nr: number | null
          valid_from_week_year: number | null
          verein_id: string
          wechsel_zeit: number | null
          weekday: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          end_half?: string | null
          end_ort?: string | null
          end_platz_id?: string | null
          end_zeit: number
          half?: string | null
          id?: string
          location?: string | null
          platz_id?: string | null
          start_zeit: number
          team: string
          template_id: string
          valid_from_week?: string | null
          valid_from_week_nr?: number | null
          valid_from_week_year?: number | null
          verein_id: string
          wechsel_zeit?: number | null
          weekday: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          end_half?: string | null
          end_ort?: string | null
          end_platz_id?: string | null
          end_zeit?: number
          half?: string | null
          id?: string
          location?: string | null
          platz_id?: string | null
          start_zeit?: number
          team?: string
          template_id?: string
          valid_from_week?: string | null
          valid_from_week_nr?: number | null
          valid_from_week_year?: number | null
          verein_id?: string
          wechsel_zeit?: number | null
          weekday?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainingsplan_slots_end_platz_id_fkey"
            columns: ["end_platz_id"]
            isOneToOne: false
            referencedRelation: "trainingsplaetze"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainingsplan_slots_platz_id_fkey"
            columns: ["platz_id"]
            isOneToOne: false
            referencedRelation: "trainingsplaetze"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainingsplan_slots_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainingsplan_slots_vorlage_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "trainingsplan_vorlagen"
            referencedColumns: ["id"]
          },
        ]
      }
      trainingsplan_vorlagen: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          valid_from: string
          valid_until: string | null
          verein_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          valid_from: string
          valid_until?: string | null
          verein_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          valid_from?: string
          valid_until?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainingsplan_vorlagen_erstellt_von_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainingsplan_vorlagen_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
      vereine: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sfv_club_nummer: number | null
          slug: string | null
          theme: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sfv_club_nummer?: number | null
          slug?: string | null
          theme?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sfv_club_nummer?: number | null
          slug?: string | null
          theme?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wiki_artikel: {
        Row: {
          autor_id: string | null
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          publiziert: boolean | null
          title: string
          updated_at: string | null
          verein_id: string
        }
        Insert: {
          autor_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          publiziert?: boolean | null
          title: string
          updated_at?: string | null
          verein_id: string
        }
        Update: {
          autor_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          publiziert?: boolean | null
          title?: string
          updated_at?: string | null
          verein_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_artikel_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "benutzer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_artikel_verein_id_fkey"
            columns: ["verein_id"]
            isOneToOne: false
            referencedRelation: "vereine"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      personenarten_effektiv: {
        Row: {
          ableitung: string | null
          art_id: string | null
          name: string | null
          person_id: string | null
          sort_order: number | null
          verein_id: string | null
        }
        Relationships: []
      }
      portal_zugang: {
        Row: {
          hat_zugang: boolean | null
          person_id: string | null
        }
        Insert: {
          hat_zugang?: never
          person_id?: string | null
        }
        Update: {
          hat_zugang?: never
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benutzer_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "personen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_email_bekannt: {
        Args: { p_email: string; p_verein_id: string }
        Returns: Json
      }
      get_my_mitglied_id: { Args: never; Returns: number }
      get_my_person_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_verein_id: { Args: never; Returns: string }
      hat_modul_recht: {
        Args: { p_min_stufe?: string; p_modul: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_above: { Args: never; Returns: boolean }
      is_trainer_or_above: { Args: never; Returns: boolean }
      mitglied_ist_mein_kind: {
        Args: { p_mitglied_id: number }
        Returns: boolean
      }
      person_ist_mein_kind: { Args: { p_person_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
