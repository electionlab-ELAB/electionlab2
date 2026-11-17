/* ElectionLab 2028 — weighted polling averages and interactive published-poll trends. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known={
 'gavin newsom':'https://upload.wikimedia.org/wikipedia/commons/b/b0/Gavin_Newsom_2025.jpg',
 'jd vance':'https://commons.wikimedia.org/wiki/Special:FilePath/January_2025_Official_Vice_Presidential_Portrait_of_JD_Vance.jpg?width=650',
 'donald trump':'https://commons.wikimedia.org/wiki/Special:FilePath/January_2025_Official_Presidential_Portrait_of_Donald_J._Trump_%28Transparent_Version%29.png?width=700'
};
let polls=[],roster={},range='ALL',showDem=true,showRep=true,selectedPoint=null;
const dateMs=s=>{const n=Date.parse(String(s||'').slice(0,10)+'T12:00:00Z');return Number.isFinite(n)?n:NaN};
const pct=n=>Number.isFinite(n)?n.toFixed(1)+'%':'—';
const days=n=>n*86400000;
function photo(name,id){const el=$(id);if(!el)return;el.replaceChildren();const link=roster[String(name||'').toLowerCase()]||known[String(name||'').toLowerCase()];if(!link)return;
 try{const u=new URL(link);if(u.protocol!=='https:')return;const img=document.createElement('img');img.src=u.href;img.alt='';img.onerror=()=>el.replaceChildren();el.append(img)}catch{}
}
function weightedAt(scoped,t){
 const recent=scoped.filter(p=>{const d=t-dateMs(p.end_date);return d>=0&&d<=days(35)});
 if(!recent.length)return null;
 let dem=0,rep=0,total=0;
 for(const p of recent){
  const age=(t-dateMs(p.end_date))/86400000;
  const recency=Math.exp(-Math.LN2*age/14);
  const n=Number(p.sample_size||p.sample||0);
  const sample=Number.isFinite(n)&&n>0?Math.min(1.6,Math.max(.65,Math.sqrt(n/1000))):1;
  const q=Number(p.pollster_quality||p.quality_score||p.quality||1);
  const quality=Number.isFinite(q)&&q>0?Math.min(1.5,Math.max(.35,q)):1;
  const w=recency*sample*quality;dem+=p.dem_pct*w;rep+=p.rep_pct*w;total+=w;
 }
 return total?{dem:dem/total,rep:rep/total,count:recent.length,updated:new Date(t).toISOString().slice(0,10),carried:false}:null;
}
function rollingSeries(scoped){
 if(!scoped.length)return [];
 const ordered=[...scoped].sort((a,b)=>dateMs(a.end_date)-dateMs(b.end_date));
 const start=dateMs(ordered[0].end_date),today=dateMs(new Date().toISOString().slice(0,10));
 const finish=Math.max(start,today);let last=null,series=[];
 for(let t=start;t<=finish;t+=days(1)){
  const calculated=weightedAt(ordered,t);
  if(calculated)last=calculated;
  if(last)series.push({t,dem:last.dem,rep:last.rep,count:calculated?calculated.count:0,updated:calculated?calculated.updated:last.updated,carried:!calculated});
 }
 return series;
}
function average(scoped){const series=rollingSeries(scoped);return series.length?series[series.length-1]:null}
function controls(){const chart=$('presChartSvg');if(!chart||$('el28ChartControls'))return;
 const box=document.createElement('div');box.id='el28ChartControls';box.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 16px';
 box.innerHTML='<span style="font-size:12px;color:#63748a;margin-right:6px">Show:</span>'+['30D','90D','6M','1Y','ALL'].map(v=>`<button type="button" data-range="${v}" style="border:1px solid #d8e2ed;background:white;border-radius:8px;padding:8px 11px;cursor:pointer;font-size:12px">${v==='ALL'?'All time':v}</button>`).join('')+'<label style="font-size:12px;display:flex;align-items:center;gap:5px"><input type="checkbox" id="el28ShowDem" checked> Democratic</label><label style="font-size:12px;display:flex;align-items:center;gap:5px"><input type="checkbox" id="el28ShowRep" checked> Republican</label>';
 chart.parentNode.insertBefore(box,chart);
 const details=document.createElement('div');details.id='el28PollDetails';details.setAttribute('aria-live','polite');details.style.cssText='min-height:36px;margin-top:9px;font-size:13px;color:#344963';chart.insertAdjacentElement('afterend',details);
 box.addEventListener('click',e=>{const b=e.target.closest('[data-range]');if(!b)return;range=b.dataset.range;selectedPoint=null;renderChart();});
 box.querySelector('#el28ShowDem').addEventListener('change',e=>{showDem=e.target.checked;renderChart()});
 box.querySelector('#el28ShowRep').addEventListener('change',e=>{showRep=e.target.checked;renderChart()});
 chart.addEventListener('click',e=>{const mark=e.target.closest('[data-poll]');if(!mark)return;selectedPoint=Number(mark.dataset.poll);renderChart()});
 chart.addEventListener('pointerover',e=>{const mark=e.target.closest('[data-poll]');if(mark)showDetails(Number(mark.dataset.poll))});
 chart.addEventListener('pointerout',e=>{if(e.target.closest('[data-poll]'))showDetails(selectedPoint)});
}
let chartData=[];
function showDetails(i){const el=$('el28PollDetails');if(!el)return;const p=chartData[i];
 el.textContent=p?`${new Date(p.t).toLocaleDateString('en-US',{dateStyle:'medium',timeZone:'UTC'})} · Democratic: ${pct(p.dem)} · Republican: ${pct(p.rep)} · Margin: ${Math.abs(p.dem-p.rep).toFixed(1)} pts ${p.dem===p.rep?'(tied)':p.dem>p.rep?'(D)':'(R)'} · ${p.carried?'Carried forward from '+p.updated:p.count+' polls in trailing 35 days'}`:'Hover or select the rolling average to see its values and freshness.';
}
function renderChart(){const el=$('presChartSvg');if(!el)return;const state=$('presState')?.value||'US';const pair=$('presMatchup')?.value||el.dataset.pair||'';
 const scoped=polls.filter(p=>p.state_code===state&&(p.dem_candidate+'|||'+p.rep_candidate)===pair);
 const series=rollingSeries(scoped);const latest=series.length?series[series.length-1].t:NaN;
 const windows={'30D':30,'90D':90,'6M':183,'1Y':365,'ALL':Infinity};
 chartData=series.filter(p=>latest-p.t<=days(windows[range]));
 const ctrl=$('el28ChartControls');if(ctrl)ctrl.querySelectorAll('[data-range]').forEach(b=>{const active=b.dataset.range===range;b.style.background=active?'#152d4d':'white';b.style.color=active?'white':'#344963';b.setAttribute('aria-pressed',String(active))});
 if(!chartData.length){el.innerHTML='<div class="el28-trend-empty">No published polls for this matchup yet.</div>';if($('presChartMeta'))$('presChartMeta').textContent='';showDetails(null);return}
 const W=900,H=310,L=48,R=22,T=20,B=52,plotW=W-L-R,plotH=H-T-B;
 let min=chartData[0].t,max=chartData[chartData.length-1].t;if(min===max){min-=days(1);max+=days(1)}
 const x=t=>L+(t-min)/(max-min)*plotW,y=v=>T+(70-v)/70*plotH;
 let out='';for(let v=0;v<=70;v+=10){const yy=y(v);out+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#e3eaf2"/><text x="${L-9}" y="${yy+4}" fill="#8192a4" text-anchor="end" font-size="12">${v}%</text>`}
 const dateLabel=t=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit',timeZone:'UTC'});
 for(let i=0;i<=4;i++){const t=min+(max-min)*i/4;out+=`<text x="${x(t)}" y="${H-17}" text-anchor="middle" font-size="12" fill="#8192a4">${safe(dateLabel(t))}</text>`}
 for(const [field,color,enabled] of [['dem','#2467b7',showDem],['rep','#ba4050',showRep]]){if(!enabled)continue;
  out+=`<polyline points="${chartData.map(p=>`${x(p.t).toFixed(2)},${y(p[field]).toFixed(2)}`).join(' ')}" stroke="${color}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
 }
 // Transparent daily hit targets make the rolling averages interactive without cluttering the lines.
 chartData.forEach((p,i)=>{out+=`<rect data-poll="${i}" tabindex="0" role="button" aria-label="${safe(dateLabel(p.t))} Democratic ${pct(p.dem)}, Republican ${pct(p.rep)}${p.carried?', carried forward':''}" x="${x(p.t)-Math.max(2,plotW/chartData.length/2)}" y="${T}" width="${Math.max(4,plotW/chartData.length)}" height="${plotH}" fill="transparent" style="cursor:crosshair"/>`});
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Interactive 35-day rolling presidential polling averages">${out}</svg>`;
 el.querySelectorAll('[data-poll]').forEach(c=>c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectedPoint=Number(c.dataset.poll);showDetails(selectedPoint)}}));
 if($('presChartMeta'))$('presChartMeta').textContent=`${scoped.length} published polls · ${range==='ALL'?'All available dates':range} · 35-day weighted rolling average · Last values carried forward during polling gaps · Not a forecast`;
 showDetails(selectedPoint);
}
function render(){const state=$('presState').value,prior=$('presMatchup').value;
 const statePolls=polls.filter(p=>p.state_code===state);
 const matchups=[...new Set(statePolls.map(p=>p.dem_candidate+'|||'+p.rep_candidate))].sort();
 $('presMatchup').innerHTML='<option value="">Latest matchup</option>'+matchups.map(m=>`<option value="${safe(m)}" ${prior===m?'selected':''}>${safe(m.replace('|||',' vs '))}</option>`).join('');
 if(prior&&!matchups.includes(prior))$('presMatchup').value='';
 const pair=$('presMatchup').value||(statePolls.length?statePolls[0].dem_candidate+'|||'+statePolls[0].rep_candidate:'');
 const scoped=statePolls.filter(p=>p.dem_candidate+'|||'+p.rep_candidate===pair);
 const latest=[...scoped].sort((a,b)=>dateMs(b.end_date)-dateMs(a.end_date))[0],avg=average(scoped);
 // Always display the latest available rolling average, labeled when carried forward.
 const fresh=avg&&!avg.carried;
 $('presDem').textContent=avg?pct(avg.dem):'—';$('presRep').textContent=avg?pct(avg.rep):'—';
 $('presDemName').textContent=latest?.dem_candidate||'Awaiting polls';$('presRepName').textContent=latest?.rep_candidate||'Awaiting polls';
 $('presLatestMeta').textContent=avg?`35-day weighted polling average · ${fresh?avg.count+' eligible poll(s)':'Carried forward (no polls in the last 35 days)'} · Last calculated ${avg.updated} · Margin ${Math.abs(avg.dem-avg.rep).toFixed(1)} pts ${avg.dem===avg.rep?'(tied)':avg.dem>avg.rep?'(D)':'(R)'} · Not a forecast.`:'No published polling for this selection yet.';
 $('presDataStatus').textContent=`${statePolls.length} published poll${statePolls.length===1?'':'s'} in ${state==='US'?'national polling':state}`;
 $('presPollRows').innerHTML=statePolls.length?statePolls.slice(0,100).map(p=>`<tr><td>${safe(p.pollster)}</td><td>${safe(p.dem_candidate)} vs ${safe(p.rep_candidate)}</td><td>${safe(p.state_code)}</td><td>${safe(p.end_date)}</td><td>${pct(p.dem_pct)}</td><td>${pct(p.rep_pct)}</td></tr>`).join(''):'<tr><td colspan="6">No published polling found.</td></tr>';
 photo(latest?.dem_candidate||'','presDemPortrait');photo(latest?.rep_candidate||'','presRepPortrait');$('presChartSvg').dataset.pair=pair;renderChart();
}
$('presState')?.addEventListener('change',()=>{selectedPoint=null;render()});$('presMatchup')?.addEventListener('change',()=>{selectedPoint=null;render()});
async function load(){const sb=window.sb;if(!sb||typeof sb.from!=='function'){$('presDataStatus').textContent='Database not connected';return}
 try{
  // Fetch all pages, not only the most recent 1,000 polls.
  let rows=[],offset=0;while(offset<10000){const result=await sb.from('presidential_polls').select('*').eq('status','published').order('end_date',{ascending:false}).range(offset,offset+999);if(result.error)throw result.error;const batch=result.data||[];rows.push(...batch);if(batch.length<1000)break;offset+=1000}
  polls=rows.map(p=>({...p,dem_pct:Number(p.dem_pct),rep_pct:Number(p.rep_pct)})).filter(p=>Number.isFinite(p.dem_pct)&&Number.isFinite(p.rep_pct)&&Number.isFinite(dateMs(p.end_date)));
  const people=await sb.from('primary_candidates').select('name,photo_url').eq('status','active');
  for(const c of people.data||[]){if(c.photo_url)roster[String(c.name).trim().toLowerCase()]=c.photo_url}
  const states=[...new Set(polls.map(p=>p.state_code))].filter(x=>x&&x!=='US').sort();
  $('presState').innerHTML='<option value="US">National</option>'+states.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('');controls();render();
 }catch(e){console.warn('Presidential polls not available',e);$('presDataStatus').textContent='Polling unavailable';$('presPollRows').innerHTML='<tr><td colspan="6">Could not load published polling. Check Supabase setup.</td></tr>'}
}
load();
})();
