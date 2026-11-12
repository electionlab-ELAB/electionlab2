(()=>{'use strict';
const target=document.getElementById('el28GenericChart');if(!target)return;
const detail=document.getElementById('el28GenericChartMeta');
function draw(polls){
 polls=polls.filter(x=>isFinite(+x.dem_pct)&&isFinite(+x.rep_pct)&&x.end_date).sort((a,b)=>a.end_date.localeCompare(b.end_date)).slice(-36);
 if(!polls.length){target.innerHTML='<div class="el28-trend-empty">No published polling yet. Add polls in the admin portal.</div>';return;}
 const W=900,H=255,P=48,lo=30,hi=65;const sx=i=>P+(i/Math.max(1,polls.length-1))*(W-P*2),sy=v=>H-P-(Math.min(hi,Math.max(lo,v))-lo)/(hi-lo)*(H-P*2);
 const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let lines='';for(let t=30;t<=60;t+=10){let y=sy(t);lines+=`<line x1="${P}" y1="${y}" x2="${W-P}" y2="${y}" stroke="#dce6f0"/><text x="${P-14}" y="${y+4}" text-anchor="end" font-size="12" fill="#788ba1">${t}%</text>`}
 for(const [field,color] of [['dem_pct','#2570c4'],['rep_pct','#c53d4b']]){
  const points=polls.map((p,i)=>`${sx(i)},${sy(Number(p[field]))}`).join(' ');
  lines+=`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
  polls.forEach((p,i)=>{if(polls.length<=20||i%3===0){lines+=`<circle cx="${sx(i)}" cy="${sy(Number(p[field]))}" r="3" fill="white" stroke="${color}" stroke-width="2"><title>${safe(p.pollster)} · ${safe(p.end_date)} · ${field==='dem_pct'?'Dem.':'Rep.'} ${Number(p[field]).toFixed(1)}%</title></circle>`}});
 }
 target.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recent Democratic and Republican generic ballot surveys">${lines}<text x="${P}" y="${H-8}" font-size="12" fill="#788ba1">${safe(polls[0].end_date)}</text><text x="${W-P}" y="${H-8}" font-size="12" text-anchor="end" fill="#788ba1">${safe(polls.at(-1).end_date)}</text></svg>`;
 detail.textContent=`${polls.length} recent published polls shown · Individual surveys, not a polling average`;
}
if(!window.sb){target.innerHTML='<div class="el28-trend-empty">Polling database is not connected.</div>';return}
window.sb.from('generic_ballot_polls').select('pollster,end_date,dem_pct,rep_pct').eq('status','published').order('end_date',{ascending:true}).limit(500).then(({data,error})=>{if(error){target.innerHTML='<div class="el28-trend-empty">Could not load survey chart.</div>';return}draw(data||[])})
})();