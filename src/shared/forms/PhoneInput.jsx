/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/forms/PhoneInput.jsx
   Telefon-Eingabe mit Länderauswahl
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { TI } from "../../icons.jsx";
import { FONT, AM, GB, GR} from "../../constants.ts";

const PHONE_COUNTRIES=[
  {flag:"🇨🇭",name:"Schweiz",dial:"+41",code:"CH"},
  {flag:"🇩🇪",name:"Deutschland",dial:"+49",code:"DE"},
  {flag:"🇦🇹",name:"Österreich",dial:"+43",code:"AT"},
  {flag:"🇫🇷",name:"Frankreich",dial:"+33",code:"FR"},
  {flag:"🇮🇹",name:"Italien",dial:"+39",code:"IT"},
  {flag:"🇱🇮",name:"Liechtenstein",dial:"+423",code:"LI"},
  {flag:"🇱🇺",name:"Luxemburg",dial:"+352",code:"LU"},
  {flag:"🇧🇪",name:"Belgien",dial:"+32",code:"BE"},
  {flag:"🇳🇱",name:"Niederlande",dial:"+31",code:"NL"},
  {flag:"🇪🇸",name:"Spanien",dial:"+34",code:"ES"},
  {flag:"🇵🇹",name:"Portugal",dial:"+351",code:"PT"},
  {flag:"🇬🇧",name:"Grossbritannien",dial:"+44",code:"GB"},
  {flag:"🇮🇪",name:"Irland",dial:"+353",code:"IE"},
  {flag:"🇸🇪",name:"Schweden",dial:"+46",code:"SE"},
  {flag:"🇳🇴",name:"Norwegen",dial:"+47",code:"NO"},
  {flag:"🇩🇰",name:"Dänemark",dial:"+45",code:"DK"},
  {flag:"🇫🇮",name:"Finnland",dial:"+358",code:"FI"},
  {flag:"🇮🇸",name:"Island",dial:"+354",code:"IS"},
  {flag:"🇵🇱",name:"Polen",dial:"+48",code:"PL"},
  {flag:"🇨🇿",name:"Tschechien",dial:"+420",code:"CZ"},
  {flag:"🇸🇰",name:"Slowakei",dial:"+421",code:"SK"},
  {flag:"🇭🇺",name:"Ungarn",dial:"+36",code:"HU"},
  {flag:"🇷🇴",name:"Rumänien",dial:"+40",code:"RO"},
  {flag:"🇧🇬",name:"Bulgarien",dial:"+359",code:"BG"},
  {flag:"🇭🇷",name:"Kroatien",dial:"+385",code:"HR"},
  {flag:"🇸🇮",name:"Slowenien",dial:"+386",code:"SI"},
  {flag:"🇷🇸",name:"Serbien",dial:"+381",code:"RS"},
  {flag:"🇧🇦",name:"Bosnien",dial:"+387",code:"BA"},
  {flag:"🇲🇪",name:"Montenegro",dial:"+382",code:"ME"},
  {flag:"🇲🇰",name:"Nordmazedonien",dial:"+389",code:"MK"},
  {flag:"🇦🇱",name:"Albanien",dial:"+355",code:"AL"},
  {flag:"🇽🇰",name:"Kosovo",dial:"+383",code:"XK"},
  {flag:"🇬🇷",name:"Griechenland",dial:"+30",code:"GR"},
  {flag:"🇹🇷",name:"Türkei",dial:"+90",code:"TR"},
  {flag:"🇷🇺",name:"Russland",dial:"+7",code:"RU"},
  {flag:"🇺🇦",name:"Ukraine",dial:"+380",code:"UA"},
  {flag:"🇧🇾",name:"Belarus",dial:"+375",code:"BY"},
  {flag:"🇲🇩",name:"Moldau",dial:"+373",code:"MD"},
  {flag:"🇱🇻",name:"Lettland",dial:"+371",code:"LV"},
  {flag:"🇱🇹",name:"Litauen",dial:"+370",code:"LT"},
  {flag:"🇪🇪",name:"Estland",dial:"+372",code:"EE"},
  {flag:"🇺🇸",name:"USA",dial:"+1",code:"US"},
  {flag:"🇨🇦",name:"Kanada",dial:"+1",code:"CA"},
  {flag:"🇲🇽",name:"Mexiko",dial:"+52",code:"MX"},
  {flag:"🇧🇷",name:"Brasilien",dial:"+55",code:"BR"},
  {flag:"🇦🇷",name:"Argentinien",dial:"+54",code:"AR"},
  {flag:"🇨🇱",name:"Chile",dial:"+56",code:"CL"},
  {flag:"🇨🇴",name:"Kolumbien",dial:"+57",code:"CO"},
  {flag:"🇵🇪",name:"Peru",dial:"+51",code:"PE"},
  {flag:"🇻🇪",name:"Venezuela",dial:"+58",code:"VE"},
  {flag:"🇺🇾",name:"Uruguay",dial:"+598",code:"UY"},
  {flag:"🇵🇾",name:"Paraguay",dial:"+595",code:"PY"},
  {flag:"🇧🇴",name:"Bolivien",dial:"+591",code:"BO"},
  {flag:"🇪🇨",name:"Ecuador",dial:"+593",code:"EC"},
  {flag:"🇨🇳",name:"China",dial:"+86",code:"CN"},
  {flag:"🇯🇵",name:"Japan",dial:"+81",code:"JP"},
  {flag:"🇰🇷",name:"Südkorea",dial:"+82",code:"KR"},
  {flag:"🇮🇳",name:"Indien",dial:"+91",code:"IN"},
  {flag:"🇮🇩",name:"Indonesien",dial:"+62",code:"ID"},
  {flag:"🇵🇭",name:"Philippinen",dial:"+63",code:"PH"},
  {flag:"🇻🇳",name:"Vietnam",dial:"+84",code:"VN"},
  {flag:"🇹🇭",name:"Thailand",dial:"+66",code:"TH"},
  {flag:"🇲🇾",name:"Malaysia",dial:"+60",code:"MY"},
  {flag:"🇸🇬",name:"Singapur",dial:"+65",code:"SG"},
  {flag:"🇵🇰",name:"Pakistan",dial:"+92",code:"PK"},
  {flag:"🇧🇩",name:"Bangladesch",dial:"+880",code:"BD"},
  {flag:"🇱🇰",name:"Sri Lanka",dial:"+94",code:"LK"},
  {flag:"🇳🇵",name:"Nepal",dial:"+977",code:"NP"},
  {flag:"🇲🇲",name:"Myanmar",dial:"+95",code:"MM"},
  {flag:"🇰🇭",name:"Kambodscha",dial:"+855",code:"KH"},
  {flag:"🇱🇦",name:"Laos",dial:"+856",code:"LA"},
  {flag:"🇹🇼",name:"Taiwan",dial:"+886",code:"TW"},
  {flag:"🇭🇰",name:"Hongkong",dial:"+852",code:"HK"},
  {flag:"🇲🇴",name:"Macau",dial:"+853",code:"MO"},
  {flag:"🇦🇺",name:"Australien",dial:"+61",code:"AU"},
  {flag:"🇳🇿",name:"Neuseeland",dial:"+64",code:"NZ"},
  {flag:"🇵🇬",name:"Papua-Neuguinea",dial:"+675",code:"PG"},
  {flag:"🇿🇦",name:"Südafrika",dial:"+27",code:"ZA"},
  {flag:"🇳🇬",name:"Nigeria",dial:"+234",code:"NG"},
  {flag:"🇪🇬",name:"Ägypten",dial:"+20",code:"EG"},
  {flag:"🇲🇦",name:"Marokko",dial:"+212",code:"MA"},
  {flag:"🇩🇿",name:"Algerien",dial:"+213",code:"DZ"},
  {flag:"🇹🇳",name:"Tunesien",dial:"+216",code:"TN"},
  {flag:"🇱🇾",name:"Libyen",dial:"+218",code:"LY"},
  {flag:"🇸🇩",name:"Sudan",dial:"+249",code:"SD"},
  {flag:"🇪🇹",name:"Äthiopien",dial:"+251",code:"ET"},
  {flag:"🇰🇪",name:"Kenia",dial:"+254",code:"KE"},
  {flag:"🇹🇿",name:"Tansania",dial:"+255",code:"TZ"},
  {flag:"🇺🇬",name:"Uganda",dial:"+256",code:"UG"},
  {flag:"🇷🇼",name:"Ruanda",dial:"+250",code:"RW"},
  {flag:"🇬🇭",name:"Ghana",dial:"+233",code:"GH"},
  {flag:"🇸🇳",name:"Senegal",dial:"+221",code:"SN"},
  {flag:"🇨🇮",name:"Côte d'Ivoire",dial:"+225",code:"CI"},
  {flag:"🇨🇲",name:"Kamerun",dial:"+237",code:"CM"},
  {flag:"🇦🇴",name:"Angola",dial:"+244",code:"AO"},
  {flag:"🇲🇿",name:"Mosambik",dial:"+258",code:"MZ"},
  {flag:"🇿🇲",name:"Sambia",dial:"+260",code:"ZM"},
  {flag:"🇿🇼",name:"Simbabwe",dial:"+263",code:"ZW"},
  {flag:"🇮🇱",name:"Israel",dial:"+972",code:"IL"},
  {flag:"🇸🇦",name:"Saudi-Arabien",dial:"+966",code:"SA"},
  {flag:"🇦🇪",name:"Vereinigte Arab. Emirate",dial:"+971",code:"AE"},
  {flag:"🇶🇦",name:"Katar",dial:"+974",code:"QA"},
  {flag:"🇰🇼",name:"Kuwait",dial:"+965",code:"KW"},
  {flag:"🇧🇭",name:"Bahrain",dial:"+973",code:"BH"},
  {flag:"🇴🇲",name:"Oman",dial:"+968",code:"OM"},
  {flag:"🇮🇶",name:"Irak",dial:"+964",code:"IQ"},
  {flag:"🇮🇷",name:"Iran",dial:"+98",code:"IR"},
  {flag:"🇯🇴",name:"Jordanien",dial:"+962",code:"JO"},
  {flag:"🇱🇧",name:"Libanon",dial:"+961",code:"LB"},
  {flag:"🇸🇾",name:"Syrien",dial:"+963",code:"SY"},
  {flag:"🇾🇪",name:"Jemen",dial:"+967",code:"YE"},
  {flag:"🇦🇫",name:"Afghanistan",dial:"+93",code:"AF"},
  {flag:"🇰🇿",name:"Kasachstan",dial:"+7",code:"KZ"},
  {flag:"🇺🇿",name:"Usbekistan",dial:"+998",code:"UZ"},
  {flag:"🇦🇿",name:"Aserbaidschan",dial:"+994",code:"AZ"},
  {flag:"🇬🇪",name:"Georgien",dial:"+995",code:"GE"},
  {flag:"🇦🇲",name:"Armenien",dial:"+374",code:"AM"},
];

function formatPhoneNum(raw){
  const digits=raw.replace(/\D/g,"");
  if(!digits) return "";
  if(digits.length<=2) return digits;
  if(digits.length<=5) return digits.slice(0,2)+" "+digits.slice(2);
  if(digits.length<=7) return digits.slice(0,2)+" "+digits.slice(2,5)+" "+digits.slice(5);
  if(digits.length<=9) return digits.slice(0,2)+" "+digits.slice(2,5)+" "+digits.slice(5,7)+" "+digits.slice(7);
  return digits.slice(0,2)+" "+digits.slice(2,5)+" "+digits.slice(5,7)+" "+digits.slice(7,9)+(digits.length>9?" "+digits.slice(9):"");
}

function isPhoneValid(num){
  const digits=num.replace(/\D/g,"");
  return digits.length>=7&&digits.length<=15;
}

export function PhoneInput({value="",onChange,placeholder="79 123 45 67",showHint=true,className=""}){
  const [country,setCountry]=useState(()=>{
    if(value&&value.startsWith("+")){
      const m=PHONE_COUNTRIES.find(c=>value.startsWith(c.dial));
      if(m) return m;
    }
    return PHONE_COUNTRIES[0];
  });
  const [num,setNum]=useState(()=>{
    if(value&&value.startsWith(country.dial)){
      return value.slice(country.dial.length).trim();
    }
    return value||"";
  });
  const [ddOpen,setDdOpen]=useState(false);
  const [search,setSearch]=useState("");
  const wrapRef=useRef(null);

  useEffect(()=>{
    const h=e=>{if(wrapRef.current&&!wrapRef.current.contains(e.target)){setDdOpen(false);setSearch("");}};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    if(value&&value.startsWith("+")){
      const m=PHONE_COUNTRIES.find(c=>value.startsWith(c.dial));
      if(m&&m.code!==country.code){
        setCountry(m);
        setNum(value.slice(m.dial.length).trim());
      }
    }
  },[value]);

  function handleNumChange(e){
    const raw=e.target.value.replace(/[^0-9\s]/g,"");
    const formatted=formatPhoneNum(raw);
    setNum(formatted);
    const full=formatted.trim()?`${country.dial} ${formatted.trim()}`:"";
    onChange(full);
  }

  function selectCountry(c){
    setCountry(c);
    setDdOpen(false);
    setSearch("");
    const full=num.trim()?`${c.dial} ${num.trim()}`:"";
    onChange(full);
  }

  const full=num.trim()?`${country.dial} ${num.trim()}`:"";
  const valid=num.trim()&&isPhoneValid(num);
  const invalid=num.trim()&&!isPhoneValid(num);

  const filtered=search
    ?PHONE_COUNTRIES.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.dial.includes(search))
    :PHONE_COUNTRIES;

  const wrapCls=`cc-phone-wrap${valid?" cc-phone-wrap-ok":invalid?" cc-phone-wrap-err":""} ${className}`;

  return(
    <div className="cc-relative" ref={wrapRef}>
      <div className={wrapCls}>
        <button type="button" className="cc-phone-flag-btn" onClick={()=>setDdOpen(o=>!o)} style={{borderRight:"0.5px solid var(--border)"}}>
          <span className="cc-phone-flag">{country.flag}</span>
          <span className="cc-phone-dial">{country.dial}</span>
          <TI n={ddOpen?"chevron-up":"chevron-down"} size={12} className="cc-phone-chev"/>
        </button>
        <input
          type="tel"
          className="cc-phone-input"
          value={num}
          onChange={handleNumChange}
          placeholder={placeholder}
        />
        {valid&&<TI n="check" size={14} style={{color:"#16a34a",flexShrink:0,marginRight:8,alignSelf:"center"}}/>}
      </div>
      {showHint&&(
        valid?<div className="cc-phone-hint-ok"><TI n="check" size={11}/>{full}</div>
        :invalid?<div className="cc-phone-hint-err">Zu kurz — mind. 7 Ziffern</div>
        :num?<div className="cc-phone-hint">{full||"—"}</div>
        :<div className="cc-phone-hint">Ohne Vorwahl eingeben</div>
      )}
      {ddOpen&&(
        <div className="cc-phone-dropdown">
          <div className="cc-phone-dd-search">
            <TI n="search" size={13} style={{color:"var(--sub)",flexShrink:0}}/>
            <input autoFocus placeholder="Land suchen…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="cc-phone-dd-list">
            {filtered.map((c,i)=>(
              <div key={c.code+i} className={`cc-phone-dd-item${c.code===country.code?" cc-phone-dd-item-active":""}`} onMouseDown={()=>selectCountry(c)}>
                <span className="cc-phone-flag">{c.flag}</span>
                <span className="cc-phone-dd-name">{c.name}</span>
                <span className="cc-phone-dd-code">{c.dial}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ── AddressInput: Adress-Autocomplete via swisstopo ── */
// PLZ→Kanton Map für CH (aus Photon state-Feld ableiten)

