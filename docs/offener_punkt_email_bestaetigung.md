# Offener Punkt — Registrierung ohne E-Mail-Bestätigung

**Festgestellt am 21.08.2026** beim Anlegen des Testkontos: Die Registrierung
auf clubcampus.app verlangt **keine Bestätigung der E-Mail-Adresse**. Wer sich
anmeldet, ist sofort drin.

## Warum das hier zählt

`handle_new_user()` prüft, ob die Adresse dem Verein **bekannt** ist — nicht,
ob sie der anmeldenden Person **gehört**:

```sql
SELECT id, verein_id INTO v_person_id, v_verein_id
  FROM public.personen
 WHERE lower(btrim(email)) = lower(btrim(NEW.email))
 LIMIT 1;

IF v_person_id IS NULL THEN
  RAISE EXCEPTION 'Diese E-Mail ist dem Verein nicht bekannt. …';
END IF;
```

Die Prüfung ist richtig gedacht — sie hält Fremde draussen. Aber sie ist die
**einzige** Hürde. Ohne Bestätigungsmail heisst das: Wer eine Adresse kennt,
die im Verein hinterlegt ist, bekommt das Konto dieser Person — mit ihrer
Rolle, ihren Rechten und ihren Daten.

Im Verein stehen rund 910 Adressen. Viele davon sind öffentlich bekannt
(Vorstand auf der Website) oder leicht zu erraten
(`vorname.nachname@bluewin.ch`).

## Was daran hängt

Seit dem 21.08. ist die Wirkung grösser als vorher: Ein Elternteil-Konto sieht
jetzt die Personendaten seiner Kinder — Geburtsdatum, Adresse, AHV-Nummer.
Genau das war der Zweck des Umbaus. Wer sich mit einer fremden Elternadresse
anmeldet, sieht dasselbe.

Ein Funktionärskonto sieht über `mitglieder_select_priv` alle 512
Mitgliederzeilen samt AHV-Nummern.

## Was zu tun ist

Es ist eine Einstellung im Supabase-Projekt (Authentication → Providers →
Email → „Confirm email"), kein Code. **Aber:** Sie einzuschalten trifft
sofort alle künftigen Registrierungen — und alle 394 Elternteile, die noch
kein Konto haben, laufen genau dort durch. Bevor sie eingeschaltet wird,
muss geprüft sein, dass der Mailversand tatsächlich funktioniert (Absender,
SPF/DKIM, Zustellbarkeit). Sonst kommt niemand mehr hinein, und der Ausfall
sieht aus wie ein kaputter Registrierungsablauf.

Reihenfolge deshalb:
1. Mailversand prüfen — eine Testregistrierung mit eingeschalteter
   Bestätigung, an eine Adresse ausserhalb des Vereins.
2. Danach dauerhaft einschalten.
3. Erst dann die Eltern zur Anmeldung einladen.

## Einordnung

Gehört zu denselben Punkten wie die RLS-Gruppenrechte und die
Bucket-Policies: **kein Fehler im Code, sondern eine Einstellung ausserhalb
von `public`, die im Dump nicht steht.** Der vierte blinde Fleck derselben
Familie.

Für den internen FCH-Betrieb mit Testdaten: unkritisch.
Vor dem ersten echten Datenbestand und vor jedem externen Pilotverein:
**blockierend.**
