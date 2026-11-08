/* ElectionLab — candidate image decoration, no fabricated polling data */
(()=>{
'use strict';
const party=window.ELECTIONLAB_PRIMARY_PARTY;
if(!['D','R'].includes(party))return;
const FALLBACK={
 'gavin newsom': 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Gavin_Newsom_2025.jpg',
 'jd vance': 'https://commons.wikimedia.org/wiki/Special:FilePath/January_2025_Official_Vice_Presidential_Portrait_of_JD_Vance.jpg?width=650',
 'donald trump': 'https://commons.wikimedia.org/wiki/Special:FilePath/January_2025_Official_Presidential_Portrait_of_Donald_J._Trump_%28Transparent_Version%29.png?width=700'
};
const initials=n=>String(n||'').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const photoUrl=u=>{ try {const url=new URL(u);return url.protocol==='https:'?url.href:null} catch{return null} };
const byName=new Map();
function makeImg(url,alt=''){
 const img=document.createElement('img');img.src=url;img.alt=alt;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
 return img;
}
function apply(){
 const list=document.getElementById('primaryCandidateAverageList');if(!list)return;
 for(const row of list.querySelectorAll('.trackerCandidateRow')){
  if(row.querySelector('.el28-candidate-avatar'))continue;
  const name=row.querySelector('b')?.textContent.trim();if(!name)continue;
  const pic=photoUrl(byName.get(name.toLowerCase())?.photo_url)||FALLBACK[name.toLowerCase()];
  const holder=document.createElement('span');holder.className='el28-candidate-avatar';
  if(pic){const image=makeImg(pic);image.onerror=()=>{holder.textContent=initials(name)};holder.append(image)}
  else holder.textContent=initials(name);
  const dot=row.querySelector('.partyDot');if(dot)dot.replaceWith(holder);
 }
 const name=list.querySelector('.trackerCandidateRow b')?.textContent.trim();
 const hero=document.getElementById('el28HeroPortrait');if(!hero)return;
 if(!name){return;} // Editorial illustration remains until a leader is available.
 const pic=photoUrl(byName.get(name.toLowerCase())?.photo_url)||FALLBACK[name.toLowerCase()];
 if(!pic){hero.innerHTML='<span class="el28-photo-empty">2028</span>';return;}
 if(hero.dataset.photo===pic)return;
 const image=makeImg(pic,'Portrait of '+name);image.loading='eager';
 image.onerror=()=>{hero.innerHTML='<span class="el28-photo-empty">2028</span>'};
 hero.replaceChildren(image);hero.dataset.photo=pic;
}
let observer;
function watch(){const list=document.getElementById('primaryCandidateAverageList');if(!list)return;
 observer=new MutationObserver(()=>apply());observer.observe(list,{childList:true});apply();}
watch();
const sb=window.sb;
if(!sb||typeof sb.from!=='function')return;
(async()=>{try{const r=await sb.from('primary_candidates').select('name,photo_url').eq('party',party).eq('status','active');
if(r.error)return;for(const c of r.data||[]){byName.set(String(c.name||'').trim().toLowerCase(),c)}apply();}
catch(e){console.warn('Candidate portrait lookup failed',e)}})();
})();