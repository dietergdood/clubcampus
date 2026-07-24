/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/person/personUtils.ts
   Personen-Utilities — einmal definiert, überall nutzbar
   ═══════════════════════════════════════════════════════════════ */

interface PersonLike {
  vorname?: string;
  firstName?: string;
  nachname?: string;
  lastName?: string;
  name?: string;
}

export function vollname(m: PersonLike | null | undefined): string {
  if (!m) return '?';
  const v = m.vorname || m.firstName || '';
  const n = m.nachname || m.lastName || '';
  return `${v} ${n}`.trim() || m.name || '?';
}

export function initials(m: PersonLike | null | undefined): string {
  const name = vollname(m);
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function age(geburtsdatum: string | null | undefined): number | null {
  if (!geburtsdatum) return null;
  return Math.floor((Date.now() - new Date(geburtsdatum).getTime()) / 31557600000);
}

export function formatDatum(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('de-CH');
}

export function formatDatumZeit(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function relativTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 172800) return 'gestern';
  return `vor ${Math.floor(diff / 86400)} Tagen`;
}

export interface Land {
  c: string;
  n: string;
}

export const LAENDER: Land[] = [
  {c:'CH',n:'Schweiz'},{c:'DE',n:'Deutschland'},{c:'AT',n:'Österreich'},
  {c:'IT',n:'Italien'},{c:'FR',n:'Frankreich'},{c:'PT',n:'Portugal'},
  {c:'ES',n:'Spanien'},{c:'TR',n:'Türkei'},{c:'XK',n:'Kosovo'},
  {c:'RS',n:'Serbien'},{c:'HR',n:'Kroatien'},{c:'BA',n:'Bosnien-Herzegowina'},
  {c:'MK',n:'Nordmazedonien'},{c:'AL',n:'Albanien'},{c:'ME',n:'Montenegro'},
  {c:'SI',n:'Slowenien'},{c:'SK',n:'Slowakei'},{c:'CZ',n:'Tschechien'},
  {c:'PL',n:'Polen'},{c:'RO',n:'Rumänien'},{c:'HU',n:'Ungarn'},
  {c:'BG',n:'Bulgarien'},{c:'GR',n:'Griechenland'},{c:'NL',n:'Niederlande'},
  {c:'BE',n:'Belgien'},{c:'LU',n:'Luxemburg'},{c:'GB',n:'Grossbritannien'},
  {c:'IE',n:'Irland'},{c:'DK',n:'Dänemark'},{c:'SE',n:'Schweden'},
  {c:'NO',n:'Norwegen'},{c:'FI',n:'Finnland'},{c:'IS',n:'Island'},
  {c:'RU',n:'Russland'},{c:'UA',n:'Ukraine'},{c:'BY',n:'Belarus'},
  {c:'LT',n:'Litauen'},{c:'LV',n:'Lettland'},{c:'EE',n:'Estland'},
  {c:'MD',n:'Moldau'},{c:'GE',n:'Georgien'},{c:'AM',n:'Armenien'},
  {c:'AZ',n:'Aserbaidschan'},{c:'KZ',n:'Kasachstan'},{c:'US',n:'USA'},
  {c:'CA',n:'Kanada'},{c:'MX',n:'Mexiko'},{c:'BR',n:'Brasilien'},
  {c:'AR',n:'Argentinien'},{c:'CO',n:'Kolumbien'},{c:'CL',n:'Chile'},
  {c:'PE',n:'Peru'},{c:'UY',n:'Uruguay'},{c:'PY',n:'Paraguay'},
  {c:'BO',n:'Bolivien'},{c:'VE',n:'Venezuela'},{c:'EC',n:'Ecuador'},
  {c:'MA',n:'Marokko'},{c:'DZ',n:'Algerien'},{c:'TN',n:'Tunesien'},
  {c:'EG',n:'Ägypten'},{c:'NG',n:'Nigeria'},{c:'GH',n:'Ghana'},
  {c:'SN',n:'Senegal'},{c:'CM',n:'Kamerun'},{c:'CI',n:'Elfenbeinküste'},
  {c:'ZA',n:'Südafrika'},{c:'KE',n:'Kenia'},{c:'ET',n:'Äthiopien'},
  {c:'TZ',n:'Tansania'},{c:'UG',n:'Uganda'},{c:'AO',n:'Angola'},
  {c:'CD',n:'DR Kongo'},{c:'IR',n:'Iran'},{c:'IQ',n:'Irak'},
  {c:'SY',n:'Syrien'},{c:'LB',n:'Libanon'},{c:'JO',n:'Jordanien'},
  {c:'SA',n:'Saudi-Arabien'},{c:'AE',n:'Vereinigte Arab. Emirate'},
  {c:'IL',n:'Israel'},{c:'PS',n:'Palästina'},{c:'AF',n:'Afghanistan'},
  {c:'PK',n:'Pakistan'},{c:'IN',n:'Indien'},{c:'BD',n:'Bangladesch'},
  {c:'LK',n:'Sri Lanka'},{c:'NP',n:'Nepal'},{c:'CN',n:'China'},
  {c:'JP',n:'Japan'},{c:'KR',n:'Südkorea'},{c:'VN',n:'Vietnam'},
  {c:'TH',n:'Thailand'},{c:'PH',n:'Philippinen'},{c:'ID',n:'Indonesien'},
  {c:'MY',n:'Malaysia'},{c:'SG',n:'Singapur'},{c:'AU',n:'Australien'},
  {c:'NZ',n:'Neuseeland'},{c:'LI',n:'Liechtenstein'},{c:'MC',n:'Monaco'},
  {c:'SM',n:'San Marino'},{c:'MT',n:'Malta'},{c:'CY',n:'Zypern'},
].sort((a, b) => a.n.localeCompare(b.n, 'de'));

export function getLandName(code: string | null | undefined): string | null {
  if (!code) return null;
  return LAENDER.find(l => l.c === code.toUpperCase())?.n || code;
}
