/* ═══════════════════════════════════════════════════════════════
   ClubCampus — shared/ui/Skeleton.jsx
   Loading Skeleton Komponenten
   ═══════════════════════════════════════════════════════════════ */

export function Skel({h=14,w="100%",br=6,mb=0,style={}}){
  return <div style={{height:h,width:w,borderRadius:br,marginBottom:mb,background:"linear-gradient(90deg,var(--border) 25%,var(--surface2) 50%,var(--border) 75%)",backgroundSize:"200% 100%",animation:"cc-shimmer 1.5s infinite",...style}}/>;
}

export function SkelCard(){
  return(
    <div className="cc-card" style={{borderRadius:14,padding:"20px 22px",border:"0.5px solid"}}>
      <Skel h={10} w="38%" br={4} mb={14}/>
      <Skel h={30} w="55%" br={6} mb={8}/>
      <Skel h={10} w="72%" br={4}/>
    </div>
  );
}

export function SkelList({rows=4}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {Array.from({length:rows},(_,i)=>(
        <div key={i} className="cc-card" style={{borderRadius:12,padding:"14px 18px",border:"0.5px solid",display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:"var(--border)",animation:"cc-shimmer 1.5s infinite",flexShrink:0}}/>
          <div className="cc-flex-1"><Skel h={11} w="60%" br={4} mb={7}/><Skel h={9} w="40%" br={4}/></div>
        </div>
      ))}
    </div>
  );
}
