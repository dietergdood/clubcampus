/* ═══════════════════════════════════════════════════════════════
   ClubCampus — modules/members/NeuesMitgliedModal.tsx
   Modal zum Anlegen eines neuen Mitglieds.

   Mitgliedtyp zuerst wählen → dynamische Pflichtfelder erscheinen.

   Welche Felder Pflicht sind, steht ausschliesslich in der Matrix
   `mitgliedtyp_pflichtfelder` (Portalverwaltung → Mitglieder-Konfiguration).
   Die Logik dazu liegt in domains/members/pflichtfelder.ts — es gibt
   KEINE Rückfallliste mehr.

   KEINE PORTALROLLE. Sie ist kein Eingabewert, sondern ein berechneter:
   ableitRolle() bestimmt sie aus den Kader-Rollen, ersatzweise aus
   mitgliedtypen.standard_rolle, dann aus den Funktionen. Geschrieben wird
   sie von ableitUndSaveRolle() — bei jeder Kader-Zuweisung, bei jeder
   Änderung an Teams oder Funktionen, und beim Login setzt useDbUser sie
   ohnehin neu. Eine hier von Hand gewählte Rolle hielte also nur bis zum
   ersten dieser Ereignisse. Wo sie doch von Hand gesetzt werden muss,
   gehört das ins Profil (PortalTab) — dort sieht man, was die Ableitung
   ergeben hat.

   Immer sichtbar: mitgliedtyp*, vorname*, nachname*
   Alles Weitere erscheint, sobald es für den gewählten Typ konfiguriert
   ist. Ein Feld, das Pflicht ist, muss auch ausfüllbar sein: früher
   verlangte die Prüfung bei Passiv-, Ehren- und Freimitgliedern eine
   E-Mail, während das Formular das Feld ausblendete — diese drei Typen
   liessen sich dadurch gar nicht anlegen.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { Btn, ModalOrSheet, PhoneInput } from "../../theme.ts";
import { AdresseFormular } from "./AdresseFormular.tsx";
import { TI } from "../../icons.tsx";
import { insertMitglied, logAktivitaet, AKTIVITAET_TYP, FELD_LABEL } from "../../domains/members/memberService.ts";
import type { Account, Mitgliedtyp, Sb } from "../../types.ts";
import { getFeldkonfig, fuerMitgliedtyp, istPflicht as istPflichtKonfig, istSichtbar, pflichtfelderAus, IMMER_PFLICHT_KEYS } from "../../domains/members/feldkonfig.ts";
import type { FeldkonfigZeile } from "../../domains/members/feldkonfig.ts";
import { ableitUndSaveRolle } from "../../domains/roles/roleUtils.ts";
import { GESCHLECHT_OPTS } from "../../domains/person/personUtils.ts";
import { suchePersonen, macheZuMitglied } from "../../domains/members/supporterService.ts";
import type { PersonTreffer } from "../../domains/members/supporterService.ts";
import { NeuesMitgliedElternSektion, speichereEltern } from "./NeuesMitgliedElternSektion.tsx";
import type { ElternEintrag } from "./NeuesMitgliedElternSektion.tsx";
import type { StatusMeldung } from "./tabs/DatenpruefungTab.tsx";

/* Eingabefelder des Formulars — alle optional, validate() prüft die
   Pflichtfelder je Mitgliedtyp. */
interface MitgliedFormular {
  mitgliedtyp: string;
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  geschlecht?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  kanton?: string;
  telefon?: string;
  email?: string;
  ahv_nr?: string;
  nationalitaet?: string;
  heimatort?: string;
}



interface NeuesMitgliedModalProps {
  open: boolean;
  onClose: () => void;
  sb: Sb;
  dbMitgliedtypen?: Mitgliedtyp[] | null;
  feldkonfig?: FeldkonfigZeile[];
  vereinId: string | null;
  onSuccess?: ((id: number) => void) | null;
  account?: Account | null;
}

export function NeuesMitgliedModal({ open, onClose, sb, dbMitgliedtypen, feldkonfig=[], vereinId, onSuccess, account=null }: NeuesMitgliedModalProps) {
  const [form, setForm] = useState<MitgliedFormular>({ mitgliedtyp: "" });
  const [elternEintraege, setElternEintraege] = useState<ElternEintrag[]>([]);
  /* Gesetzt, sobald das Kind in der Datenbank steht. Scheitert danach das
     Anlegen der Elternteile, bleibt das Modal offen und ein zweiter Versuch
     schreibt nur noch die Eltern — die Eingabe geht nicht verloren. */
  const [angelegtesKind, setAngelegtesKind] = useState<number | null>(null);
  /* Welche Felder bei der letzten Prüfung leer waren — sie werden rot
     umrandet. Ohne das steht die Meldung unten und man sucht bei acht
     fehlenden Feldern von Hand nach oben. */
  const [fehlerFelder, setFehlerFelder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [treffer, setTreffer] = useState<PersonTreffer[]>([]);
  /* null = noch nicht gesucht. Getrennt von `treffer`, weil eine leere Liste
     zwei Dinge heissen kann (siehe SucheErgebnis in supporterService). */
  const [sucheOk, setSucheOk] = useState<boolean | null>(null);
  const [bestehendePerson, setBestehendePerson] = useState<PersonTreffer | null>(null);
  const [msg, setMsg] = useState<StatusMeldung | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /* Erfolgs-Timer bei Unmount abbrechen (sonst setState nach Unmount) */
  useEffect(() => () => clearTimeout(successTimer.current), []);

  const mitgliedtypen = dbMitgliedtypen && dbMitgliedtypen.length > 0
    ? dbMitgliedtypen.map(t => t.name)
    : ["Aktivmitglied", "Juniormitglied", "Passivmitglied", "Ehrenmitglied"];


  /* Die Mitgliedtyp-Konfiguration entscheidet beides: ob es das Feld gibt
     (`zeige`) und ob es ausgefüllt sein muss (`istPflicht`).

     Bis zum 19.08.2026 hing hier die SICHTBARKEIT am Pflicht-Häkchen: was
     nicht Pflicht war, liess sich beim Anlegen gar nicht erfassen. Jetzt
     ist ein freiwilliges Feld sichtbar und darf leer bleiben — nur "Gibt
     es nicht" blendet es aus. */
  /* MITGLIEDTYP: beim Anlegen gibt es immer einen — das Formular verlangt
     ihn als erstes Feld. */
  const konfig = getFeldkonfig(fuerMitgliedtyp(form.mitgliedtyp), feldkonfig);
  const pflichtfelder = pflichtfelderAus(konfig);

  const istPflicht = (feld: string) => istPflichtKonfig(konfig, feld);
  const zeige = (feld: string) => istSichtbar(konfig, feld);

  /* Bei diesen Mitgliedtypen ist ein Hauptkontakt vorgesehen — der
     Elternabschnitt erscheint dann im gleichen Ablauf. Erzwungen wird er
     nicht: wer die Elterndaten nicht zur Hand hat, soll nicht blockiert
     sein, das Kind erscheint dann in der Datenprüfung. */
  const hauptkontaktPflicht = (dbMitgliedtypen || [])
    .some(t => t.name === form.mitgliedtyp && t.hauptkontakt_pflicht);


  function set(key: keyof MitgliedFormular, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    setMsg(null);
    /* Sobald etwas drinsteht, verschwindet die Markierung — nicht erst beim
       nächsten Klick auf Speichern. */
    if (val.trim()) setFehlerFelder(prev => prev.filter(f => f !== key));
  }

  /* Rote Umrandung für ein Pflichtfeld, das leer geblieben ist. */
  const feldCls = (feld: string, basis = "cc-input") =>
    fehlerFelder.includes(feld) ? `${basis} cc-input-error` : basis;

  /* Sammelt ALLE fehlenden Pflichtfelder. Vorher wurde beim ersten Treffer
     abgebrochen — bei neun Pflichtfeldern hiess das: ausfüllen, klicken,
     nächste Meldung, wieder klicken. */
  function validate() {
    if (!form.mitgliedtyp) return { text: "Bitte Mitgliedtyp wählen.", felder: ["mitgliedtyp"] };

    const BEKANNTE_FELDER = ["geburtsdatum","geschlecht","strasse","plz","ort","telefon","email","ahv_nr","nationalitaet","heimatort"] as const;
    const fehlend: string[] = [];
    const fehlendKeys: string[] = [];

    for (const feld of IMMER_PFLICHT_KEYS) {
      const wert = form[feld as keyof MitgliedFormular];
      if (!wert?.trim()) { fehlend.push(FELD_LABEL[feld] || feld); fehlendKeys.push(feld); }
    }
    for (const feld of pflichtfelder) {
      /* unbekannte Felder überspringen — mitgliedtyp_pflichtfelder kann
         Felder enthalten, die dieses Formular nicht anbietet */
      if (!(BEKANNTE_FELDER as readonly string[]).includes(feld)) continue;
      if (!form[feld as (typeof BEKANNTE_FELDER)[number]]?.trim()) {
        fehlend.push(FELD_LABEL[feld] || feld);
        fehlendKeys.push(feld);
      }
    }

    if (!fehlendKeys.length) return null;
    return {
      felder: fehlendKeys,
      text: fehlend.length === 1
        ? `${fehlend[0]} ist Pflicht.`
        : `Es fehlt noch: ${fehlend.join(", ")}.`,
    };
  }

  /* ── Dublettenprüfung ──────────────────────────────────────────────────
     „Mitglied anlegen prüft nicht auf Dubletten" stand seit Monaten unter den
     bekannten Defekten. Die Suche läuft mit, sobald ein Name getippt ist —
     ohne eigenen Schritt und ohne Sperre: sie zeigt, was es schon gibt, und
     überlässt die Entscheidung dem Menschen. */
  useEffect(() => {
    if (!sb || !vereinId) return;
    const q = `${form.vorname || ""} ${form.nachname || ""}`.trim();
    if (bestehendePerson || q.length < 3) { setTreffer([]); setSucheOk(null); return; }
    let abgebrochen = false;
    /* Kurz warten: sonst eine Abfrage pro Tastendruck. */
    const t = setTimeout(async () => {
      const { treffer: raus, verfuegbar } = await suchePersonen(sb, vereinId, q);
      if (abgebrochen) return;
      setTreffer(raus);
      setSucheOk(verfuegbar);
    }, 350);
    return () => { abgebrochen = true; clearTimeout(t); };
  }, [form.vorname, form.nachname, bestehendePerson, sb, vereinId]);

  async function handleSave() {
    if (!sb || !vereinId) return;
    const von = account?.name || account?.email || "Administrator";

    /* Zweiter Anlauf: das Kind steht bereits, nur die Elternteile fehlen
       noch. Dann nicht nochmals anlegen — sonst entstünde eine Dublette. */
    if (angelegtesKind !== null) {
      setSaving(true); setMsg(null);
      const elternFehler = await speichereEltern(sb, vereinId, angelegtesKind, elternEintraege, von);
      setSaving(false);
      if (elternFehler) { setMsg({ ok: false, text: `Elternteil nicht gespeichert: ${elternFehler}` }); return; }
      abschliessen(angelegtesKind);
      return;
    }

    const err = validate();
    if (err) { setMsg({ ok: false, text: err.text }); setFehlerFelder(err.felder); return; }
    setFehlerFelder([]);
    setSaving(true); setMsg(null);

    /* ⚠ Bestehende Person → Mitgliedschaft DAZU, keine zweite Person.
       insertMitglied() legt immer eine neue an; hier wäre das genau die
       Dublette, die die Suche darüber verhindern soll. */
    if (bestehendePerson) {
      const { mitgliedId, fehler } = await macheZuMitglied(sb, bestehendePerson.id, vereinId, {
        mitgliedtyp: form.mitgliedtyp || "",
        eintrittsdatum: null,
      });
      if (fehler || mitgliedId == null) {
        setSaving(false);
        setMsg({ ok: false, text: fehler ?? "Die Mitgliedschaft konnte nicht angelegt werden." });
        return;
      }
      logAktivitaet(sb, { mitgliedId }, vereinId, AKTIVITAET_TYP.ANGELEGT,
        "Mitgliedschaft angelegt für bestehende Person", null, null, von);
      await ableitUndSaveRolle(sb, mitgliedId, [], form.mitgliedtyp || null, []);
      setSaving(false);
      abschliessen(mitgliedId);
      return;
    }

    const id = await insertMitglied(sb, {
      /* vorname und nachname sind in mitglieder NOT NULL; validate() oben
         hat beide bereits als nicht leer geprüft. */
      vorname:      form.vorname!.trim(),
      nachname:     form.nachname!.trim(),
      geburtsdatum: form.geburtsdatum || null,
      geschlecht:   form.geschlecht || null,
      strasse:      form.strasse?.trim() || null,
      plz:          form.plz?.trim() || null,
      ort:          form.ort?.trim() || null,
      telefon:      form.telefon?.trim() || null,
      /* Leer als null, nicht als "" — sonst stehen zwei Schreibweisen für
         dasselbe in der Datenbank, und der partielle Unique-Index auf der
         E-Mail greift bei "" nicht. */
      email:        form.email?.trim() || null,
      ahv_nr:        form.ahv_nr?.trim() || null,
      nationalitaet: form.nationalitaet?.trim() || null,
      heimatort:     form.heimatort?.trim() || null,
      mitgliedtyp:  form.mitgliedtyp || null,
    }, vereinId);
    if (!id) { setSaving(false); setMsg({ ok: false, text: "Fehler beim Speichern." }); return; }

    logAktivitaet(sb, { mitgliedId: id }, vereinId, AKTIVITAET_TYP.ANGELEGT, "Mitglied angelegt", null, null, von);

    /* Rolle sofort ableiten, sonst zeigt die Mitgliederliste "-", bis die
       erste Kader- oder Funktionsänderung sie berechnet. dbKaderRollen ist
       hier leer und darf es sein: ein eben angelegtes Mitglied steht in
       keinem Kader, die Ableitung fällt also ohnehin auf
       mitgliedtypen.standard_rolle zurück. */
    await ableitUndSaveRolle(sb, id, [], form.mitgliedtyp || null, []);

    /* Erst jetzt die Elternteile: eltern_kinder braucht die mitglied_id.
       Scheitert es hier, bleibt das Kind stehen — es ist gültig, nur ohne
       Hauptkontakt. Ein Zurückrollen würde die ganze Eingabe vernichten. */
    const elternFehler = await speichereEltern(sb, vereinId, id, elternEintraege, von);
    setSaving(false);
    if (elternFehler) {
      setAngelegtesKind(id);
      setMsg({ ok: false, text: `Mitglied angelegt — Elternteil nicht gespeichert: ${elternFehler}` });
      return;
    }
    abschliessen(id);
  }

  function abschliessen(id: number) {
    setMsg({ ok: true, text: "Mitglied angelegt ✓" });
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => {
      setForm({ mitgliedtyp: "" });
      setElternEintraege([]);
      setFehlerFelder([]);
      setAngelegtesKind(null);
      setMsg(null);
      onClose();
      if (onSuccess) onSuccess(id);
    }, 800);
  }

  function handleClose() {
    setForm({ mitgliedtyp: "" });
    setElternEintraege([]);
    setFehlerFelder([]);
    /* Wurde das Kind schon angelegt, muss die Liste sich aktualisieren —
       sonst fehlt es dort, obwohl es in der Datenbank steht. */
    const id = angelegtesKind;
    setAngelegtesKind(null);
    setMsg(null);
    onClose();
    if (id !== null && onSuccess) onSuccess(id);
  }

  return (
    <ModalOrSheet open={open} onClose={handleClose} maxWidth={520}>
      <div className="cc-modal-hdr">
        <div className="cc-modal-title">Neues Mitglied</div>
        <Btn variant="ghost" small onClick={handleClose}><TI n="x" size={14}/></Btn>
      </div>

      <div className="cc-modal-body">
        {/* ⚠ Die Trefferliste SPERRT NICHTS. Sie zeigt, was es schon gibt, und
            überlässt die Entscheidung — ein Namensgleichklang ist keine
            Dublette, und eine Sperre auf Verdacht wäre schlimmer als der
            Doppeleintrag, den sie verhindern soll. */}
        {bestehendePerson ? (
          <div className="cc-card cc-mb-12" style={{padding:"10px 14px"}}>
            <div className="cc-between">
              <div>
                <div className="cc-text-bold">
                  {`${bestehendePerson.vorname||""} ${bestehendePerson.nachname||""}`.trim()}
                </div>
                <div className="cc-text-sm">
                  Bestehende Person — es entsteht nur die Mitgliedschaft dazu.
                  Kontaktdaten, Portal-Zugang und Funktionen bleiben.
                </div>
              </div>
              <Btn small onClick={()=>setBestehendePerson(null)}>Doch neu anlegen</Btn>
            </div>
          </div>
        ) : sucheOk === false ? (
          /* ⚠ „Konnte nicht suchen" ist NICHT „nichts gefunden". Ohne diese
             Zeile sähe der Nutzer eine leere Liste und legte guten Gewissens
             an — womöglich eine Dublette. Bis zum 20.08.2026 warf die Suche
             hier sogar, aber in einem setTimeout, wo es niemand sah. */
          <div className="cc-card cc-mb-12" style={{padding:"10px 14px"}}>
            <div className="cc-text-sm">
              ⚠ Die Dublettenprüfung ist gerade nicht verfügbar. Es wurde
              <strong> nicht </strong>geprüft, ob es diese Person schon gibt —
              vor dem Anlegen bitte in der Mitgliederliste nachsehen.
            </div>
          </div>
        ) : treffer.length > 0 && (
          <div className="cc-card cc-mb-12" style={{padding:"10px 14px"}}>
            <div className="cc-text-sm cc-mb-8">
              {treffer.length === 1 ? "Diese Person gibt es schon:" : `${treffer.length} Personen mit ähnlichem Namen:`}
            </div>
            <div className="cc-col cc-gap-6">
              {treffer.map(t => (
                <div key={t.id} className="cc-between">
                  <div>
                    <span className="cc-text-bold">{`${t.vorname||""} ${t.nachname||""}`.trim()}</span>
                    <span className="cc-text-sm">
                      {t.email ? ` · ${t.email}` : ""}
                      {t.hatAktiveMitgliedschaft ? ` · bereits ${t.mitgliedtyp||"Mitglied"}`
                        : t.kinder > 0 ? ` · Elternteil (${t.kinder})`
                        : " · ohne Mitgliedschaft"}
                    </span>
                  </div>
                  {/* Wer schon eine aktive Mitgliedschaft hat, ist kein
                      Kandidat — er wird trotzdem GEZEIGT, sonst legt ihn
                      jemand ein zweites Mal an. */}
                  {!t.hatAktiveMitgliedschaft && (
                    <Btn small onClick={()=>{setBestehendePerson(t);setTreffer([]);}}>Diese verwenden</Btn>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="cc-form-row">

          {/* Mitgliedtyp — immer zuerst */}
          <div className="cc-form-full">
            <label className="cc-label">
              Mitgliedtyp <span className="cc-label-req">*</span>
            </label>
            <select className={`cc-input${!form.mitgliedtyp ? " cc-input-hervorgehoben" : ""}`}
              value={form.mitgliedtyp} onChange={e => set("mitgliedtyp", e.target.value)}>
              <option value="">— zuerst wählen —</option>
              {mitgliedtypen.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {!form.mitgliedtyp && (
              <div className="cc-hint-sub">
                Bestimmt welche Pflichtfelder erscheinen
              </div>
            )}
          </div>

          {/* Felder nur wenn Mitgliedtyp gewählt */}
          {form.mitgliedtyp && (<>

            {/* Vorname / Nachname */}
            <div>
              <label className="cc-label">Vorname <span className="cc-label-req">*</span></label>
              <input className={feldCls("vorname")} type="text" value={form.vorname||""} onChange={e=>set("vorname",e.target.value)} placeholder="Adrian"/>
            </div>
            <div>
              <label className="cc-label">Nachname <span className="cc-label-req">*</span></label>
              <input className={feldCls("nachname")} type="text" value={form.nachname||""} onChange={e=>set("nachname",e.target.value)} placeholder="Bürgi"/>
            </div>

            {/* Geburtsdatum / Geschlecht */}
            {zeige("geburtsdatum") && (
              <div>
                <label className="cc-label">
                  Geburtsdatum {istPflicht("geburtsdatum")&&<span className="cc-label-req">*</span>}
                </label>
                <input className={feldCls("geburtsdatum")} type="date" value={form.geburtsdatum||""} onChange={e=>set("geburtsdatum",e.target.value)}/>
              </div>
            )}
            {zeige("geschlecht") && (
              <div>
                <label className="cc-label">
                  Geschlecht {istPflicht("geschlecht")&&<span className="cc-label-req">*</span>}
                </label>
                <select className={feldCls("geschlecht")} value={form.geschlecht||""} onChange={e=>set("geschlecht",e.target.value)}>
                  <option value="">— wählen —</option>
                  {GESCHLECHT_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            )}

            {/* Adresse */}
            {zeige("strasse") && (
              <AdresseFormular
                strasse={form.strasse||""}
                plz={form.plz||""}
                ort={form.ort||""}
                kanton={form.kanton||""}
                onStrasse={v=>set("strasse",v)}
                onPlz={v=>set("plz",v)}
                onOrt={v=>set("ort",v)}
                onKanton={v=>set("kanton",v)}
                pflichtStrasse={istPflicht("strasse")}
                pflichtPlz={istPflicht("plz")}
                pflichtOrt={istPflicht("ort")}
                fehlerStrasse={fehlerFelder.includes("strasse")}
                fehlerPlz={fehlerFelder.includes("plz")}
                fehlerOrt={fehlerFelder.includes("ort")}
              />
            )}

            {/* Telefon */}
            {zeige("telefon") && (
              <div className="cc-form-full">
                <label className="cc-label">Telefon {istPflicht("telefon")&&<span className="cc-label-req">*</span>}</label>
                <PhoneInput value={form.telefon||""} onChange={v=>set("telefon",v)} showHint={false}
                  /* cc-input-error statt cc-phone-wrap-err: letzteres färbt nur
                     den 0.5px-Rahmen und ist neben dem Ring der übrigen Felder
                     kaum zu sehen. cc-input-error bringt beides mit. */
                  className={fehlerFelder.includes("telefon") ? "cc-input-error" : ""}/>
              </div>
            )}

            {/* E-Mail — Login-Name, pro Verein nur einmal (Index
                personen_email_pro_verein). Früher hing die Sichtbarkeit an
                einer Liste von Passivtypen; verlangte die Matrix dort eine
                E-Mail, war das Formular nicht mehr absendbar. Jetzt sagt es
                die Konfiguration, und Pflicht und Sichtbarkeit können nicht
                mehr auseinanderlaufen. */}
            {zeige("email") && <div className="cc-form-full">
              <label className="cc-label">
                E-Mail {istPflicht("email")&&<span className="cc-label-req">*</span>}
              </label>
              <input className={feldCls("email")} type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} placeholder="adrian@example.ch"/>
              <div className="cc-hint-sub">
                {istPflicht("email")
                  ? "Wird zum Login-Namen für das Portal"
                  : "Optional — ohne E-Mail kein eigener Portal-Zugang"}
              </div>
            </div>}

            {/* AHV-Nr. / Nationalität / Heimatort — nur wenn konfiguriert.
                Sie standen bisher in der Prüfliste, hatten aber kein
                Eingabefeld: sobald jemand sie in der Matrix ankreuzte, war
                das Formular nicht mehr absendbar. */}
            {zeige("ahv_nr") && (
              <div className="cc-form-full">
                <label className="cc-label">AHV-Nr. {istPflicht("ahv_nr")&&<span className="cc-label-req">*</span>}</label>
                <input className={feldCls("ahv_nr")} type="text" value={form.ahv_nr||""} onChange={e=>set("ahv_nr",e.target.value)} placeholder="756.1234.5678.90"/>
              </div>
            )}
            {zeige("nationalitaet") && (
              <div>
                <label className="cc-label">
                  Nationalität {istPflicht("nationalitaet")&&<span className="cc-label-req">*</span>}
                </label>
                <input className={feldCls("nationalitaet")} type="text" value={form.nationalitaet||""} onChange={e=>set("nationalitaet",e.target.value)} placeholder="CH"/>
              </div>
            )}
            {zeige("heimatort") && (
              <div>
                <label className="cc-label">
                  Heimatort {istPflicht("heimatort")&&<span className="cc-label-req">*</span>}
                </label>
                <input className={feldCls("heimatort")} type="text" value={form.heimatort||""} onChange={e=>set("heimatort",e.target.value)} placeholder="Herrliberg ZH"/>
              </div>
            )}


            <div className="cc-form-full">
              <div className="cc-info-hint">
                <TI n="info-circle" size={13}/> Alle weiteren Angaben (Spielerpass, J+S-Nr. etc.) können danach im Profil ergänzt werden.
              </div>
            </div>

            {hauptkontaktPflicht && (
              <NeuesMitgliedElternSektion
                sb={sb}
                vereinId={vereinId}
                eintraege={elternEintraege}
                setEintraege={fn => setElternEintraege(fn)}
              />
            )}


          </>)}

        </div>

        {msg && (
          /* Nur die Erfolgsmeldung ist ein Badge — sie ist kurz. Die
             Fehlermeldung zählt alle fehlenden Felder auf und würde in einem
             cc-badge wegen white-space:nowrap einen waagrechten Rollbalken
             erzeugen. cc-error-msg ist die Formular-Fehlermeldung. */
          msg.ok
            ? <div className="cc-badge cc-badge-success cc-mt-8">{msg.text}</div>
            : <div className="cc-error-msg cc-mt-8"><TI n="alert-triangle" size={13}/> {msg.text}</div>
        )}
      </div>

      <div className="cc-modal-ftr">
        <Btn onClick={handleClose}>{angelegtesKind !== null ? "Schliessen" : "Abbrechen"}</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving || !form.mitgliedtyp}>
          {saving ? "Wird gespeichert…"
            : angelegtesKind !== null ? "Elternteile erneut speichern"
            : "Mitglied anlegen"}
        </Btn>
      </div>
    </ModalOrSheet>
  );
}
