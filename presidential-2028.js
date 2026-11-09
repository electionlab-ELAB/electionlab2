/* Public 2028 presidential tracker — published polls only, never simulated results */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known={
 'gavin newsom':'https://upload.wikimedia.org/wikipedia/commons/b/b0/Gavin_Newsom_2025.jpg',
 'jd vance':'https://commons.wikimedia.org/wiki/Special:FilePath/January_2025_Official_Vice_Presidential_Portrait_of_JD_Vance.jpg?width=650',
 'donald trump':'https://commons.wikimedia.org/wiki/Special:FilePath/January_2025_Official_Presidential_Portrait_of_Donald_J._Trump_%28Transparent_Version%29.png?width=700'
};
let polls=[],roster={};
function photo(name,id){
 const el=$(id);if(!el)return;el.replaceChildren();const link=roster[name.toLowerCase()]||known[name.toLowerCase()];if(!link)return;
 try{const u=new URL(link);if(u.protocol!=='https:')return;const img=document.createElement('img');img.src=u.href;img.alt='';img.onerror=()=>el.replaceChildren();el.append(img)}catch{}
}
function svg(scoped){
 const el=$('presChartSvg');if(!el)return;
 if(scoped.length<2){el.innerHTML='<div class="el28-trend-empty">Add at least two published polls for this matchup to display a trend.</div>';$('presChartMeta').textContent='';return;}
 const sorted=[...scoped].sort((a,b)=>a.end_date.localeCompare(b.end_date)).slice(-30);
 const W=900,H=260,P=42,low=0,high=70;let result='';
 const x=i=>P+i/Math.max(1,sorted.length-1)*(W-P*2),y=v=>H-P-Number(v)/70*(H-P*2);
 for(let v=0;v<=70;v+=10){const q=y(v);result+=`<line x1="${P}" y1="${q}" x2="${W-P}" y2="${q}" stroke="#e3eaf2"/><text x="${P-10}" y="${q+4}" fill="#8192a4" text-anchor="end" font-size="12">${v}%</text>`}
 for(const [field,color] of [['dem_pct','#2467b7'],['rep_pct','#ba4050']]){
  result+=`<polyline points="${sorted.map((p,i)=>`${x(i)},${y(p[field])}`).join(' ')}" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  sorted.forEach((p,i)=>result+=`<circle cx="${x(i)}" cy="${y(p[field])}" r="3" fill="white" stroke="${color}" stroke-width="2"><title>${safe(p.pollster)} · ${safe(p.end_date)} · ${Number(p[field]).toFixed(1)}%</title></circle>`);
 }
 result+=`<text x="${P}" y="${H-8}" fill="#8192a4" font-size="12">${safe(sorted[0].end_date)}</text><text x="${W-P}" y="${H-8}" text-anchor="end" fill="#8192a4" font-size="12">${safe(sorted.at(-1).end_date)}</text>`;
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Published presidential matchup survey trends">${result}</svg>`;
 $('presChartMeta').textContent=`${sorted.length} survey results displayed for this matchup · Not an election forecast`;
}
function render(){
 const state=$('presState').value,prior=$('presMatchup').value;
 const statePolls=polls.filter(p=>p.state_code===state);
 const matchups=[...new Set(statePolls.map(p=>p.dem_candidate+'|||'+p.rep_candidate))].sort();
 $('presMatchup').innerHTML='<option value="">Latest matchup</option>'+matchups.map(m=>`<option value="${safe(m)}" ${prior===m?'selected':''}>${safe(m.replace('|||',' vs '))}</option>`).join('');
 if(prior&&!matchups.includes(prior))$('presMatchup').value='';
 const pair=$('presMatchup').value || (statePolls.length?statePolls[0].dem_candidate+'|||'+statePolls[0].rep_candidate:'');
 const scoped=statePolls.filter(p=>p.dem_candidate+'|||'+p.rep_candidate===pair);
 const latest=scoped[0];
 $('presDem').textContent=latest?Number(latest.dem_pct).toFixed(1)+'%':'—';
 $('presRep').textContent=latest?Number(latest.rep_pct).toFixed(1)+'%':'—';
 $('presDemName').textContent=latest?.dem_candidate||'Awaiting polls';$('presRepName').textContent=latest?.rep_candidate||'Awaiting polls';
 $('presLatestMeta').textContent=latest?`Latest survey: ${latest.pollster} · Fieldwork ended ${latest.end_date} · Not an average.`:'No published polling for this selection yet.';
 $('presDataStatus').textContent=`${statePolls.length} published poll${statePolls.length===1?'':'s'} in ${state==='US'?'national polling':state}`;
 $('presPollRows').innerHTML=statePolls.length?statePolls.slice(0,100).map(p=>`<tr><td>${safe(p.pollster)}</td><td>${safe(p.dem_candidate)} vs ${safe(p.rep_candidate)}</td><td>${safe(p.state_code)}</td><td>${safe(p.end_date)}</td><td>${Number(p.dem_pct).toFixed(1)}%</td><td>${Number(p.rep_pct).toFixed(1)}%</td></tr>`).join(''):'<tr><td colspan="6">No published polling found.</td></tr>';
 photo(latest?.dem_candidate||'','presDemPortrait');photo(latest?.rep_candidate||'','presRepPortrait');svg(scoped);
}
$('presState').addEventListener('change',render);$('presMatchup').addEventListener('change',render);
async function load(){
 const sb=window.sb;
 if(!sb||typeof sb.from!=='function'){$('presDataStatus').textContent='Database not connected';$('presPollRows').innerHTML='<tr><td colspan="6">Supabase is not configured.</td></tr>';return}
 try{
  const [result,people]=await Promise.all([
   sb.from('presidential_polls').select('pollster,dem_candidate,rep_candidate,state_code,end_date,dem_pct,rep_pct').eq('status','published').order('end_date',{ascending:false}).limit(1000),
   sb.from('primary_candidates').select('name,photo_url').eq('status','active')
  ]);
  if(result.error)throw result.error;
  polls=result.data||[];
  for(const c of people.data||[]){if(c.photo_url)roster[String(c.name).trim().toLowerCase()]=c.photo_url}
  const states=[...new Set(polls.map(p=>p.state_code))].filter(x=>x!=='US').sort();
  $('presState').innerHTML='<option value="US">National</option>'+states.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('');render();
 }catch(e){console.warn('Presidential polls not available',e);$('presDataStatus').textContent='Polling unavailable';$('presPollRows').innerHTML='<tr><td colspan="6">Could not load published polling. Check Supabase setup.</td></tr>';}
}
load();
})();