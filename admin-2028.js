/* ElectionLab 2028 Admin Studio.
 * Keeps the proven 2028 primary, generic ballot, approval and workbook
 * handlers in admin.js/admin-import-v3.js; adds party workspaces and
 * native first-class presidential and primary candidate tables.
 */
(() => {
  'use strict';
  const q = selector => document.querySelector(selector);
  const set = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = String(value); };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const current = { primaryCandidates: [], presidentialPolls: [], candidatesReady: false, presidentialReady: false, refreshing: false };
  const pageTitle = {
    dashboardPanel: ['Overview','Your polling data, organized in one place.'],
    demPrimaryAdminPanel: ['Democratic Primary','Candidates and polling for the 2028 Democratic nomination.'],
    repPrimaryAdminPanel: ['Republican Primary','Candidates and polling for the 2028 Republican nomination.'],
    presidentialAdminPanel: ['Presidential Polls','Head-to-head national and state polls for the 2028 general election.'],
    genericBallotPanel: ['National Polling','Manage generic ballot surveys and national political trends.'],
    approvalPanel: ['Trump Approval','Manage approval and disapproval survey results.'],
    modelImportPanel: ['Import Center','Upload and validate your existing Excel workbook.']
  };
  const stateList = [
    ['US','National'],['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
  ];
  const stateNames = Object.fromEntries(stateList);
  const errorText = error => esc(error?.message || 'The database request failed.');
  function setupError(result) {
    return result.error && /PGRST205|42P01|does not exist|schema cache|could not find the table/i.test(`${result.error.code || ''} ${result.error.message || ''}`);
  }
  function renderBanner(id, message) {
    const el = document.getElementById(id);
    if (el) { el.hidden = !message; if (message) el.textContent = message; }
  }
  function renderDataHealth(errorC, errorP) {
    const checks = [
      ['Democratic and Republican primary polls', true],
      ['Generic ballot and approval trackers', true],
      ['2028 candidate roster', current.candidatesReady],
      ['Presidential matchup polling', current.presidentialReady]
    ];
    const element = q('#el28HealthRows');
    if (!element) return;
    element.innerHTML = checks.map(([label, available], i) => {
      const error = i === 2 ? errorC : i === 3 ? errorP : null;
      const status = available ? 'Connected' : setupError({error}) ? 'Setup needed' : 'Unavailable';
      return `<div class="el28HealthRow"><span class="el28HealthLabel">${label}</span><span class="el28HealthStatus ${available ? '' : 'warning'}">${available ? '✓' : '○'} ${status}</span></div>`;
    }).join('');
  }
  function renderPrimaryPollsParty(party) {
    const filtered = (state.primaryPolls || []).filter(poll => normalizePrimaryParty(poll.primary_party ?? poll.party) === party);
    set(`el28PollCount${party}`, filtered.length);
    set(party === 'D' ? 'el28DemCount':'el28RepCount',filtered.length);
    const tbody = document.getElementById(`el28PrimaryPolls${party}`);
    if (!tbody) return;
    tbody.innerHTML = filtered.map(poll => {
      const results = poll.candidate_results ?? poll.results ?? poll.candidates ?? [];
      return `<tr><td><b>${esc(poll.pollster)}</b></td><td>${esc(fmtDateRange(poll.start_date,poll.end_date))}</td><td>${poll.sample_size == null ? '—' : Number(poll.sample_size).toLocaleString()} <small>${esc(poll.population||'')}</small></td><td>${esc(primaryResultsSummary(results))}</td><td><span class="el28Pill ${poll.status==='published'?'published':'draft'}">${esc(poll.status||'draft')}</span></td><td class="el28Right"><button type="button" class="el28IconButton" data-el28-edit-poll="${esc(poll.id)}">Edit</button><button type="button" class="el28IconButton el28Danger" data-el28-delete-poll="${esc(poll.id)}">Delete</button></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty">No primary polls yet. Add one to get started.</td></tr>';
  }
  function renderCandidateRosters() {
    for (const party of ['D','R']) {
      const filtered = current.primaryCandidates.filter(c => c.party === party);
      set(`el28CandidateCount${party}`, current.candidatesReady ? filtered.length : '—');
      const body = document.getElementById(`el28Candidates${party}`);
      if (!body) continue;
      if (!current.candidatesReady) { body.innerHTML='<tr><td class="empty" colspan="4">Candidate roster not connected yet.</td></tr>';continue; }
      body.innerHTML=filtered.map(c=>{
        const initials = String(c.name||'?').split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
        const site = c.website_url ? `<a href="${esc(c.website_url)}" target="_blank" rel="noopener noreferrer">Visit ↗</a>` : '<span class="el28Muted">—</span>';
        return `<tr><td><span class="el28Name"><span class="el28Avatar">${esc(initials)}</span><span><b>${esc(c.name)}</b><small>${party==='D'?'Democratic':'Republican'}</small></span></span></td><td>${site}</td><td><span class="el28Pill ${c.status==='active'?'active':''}">${esc(c.status||'active')}</span></td><td class="el28Right"><button type="button" class="el28IconButton" data-el28-edit-candidate="${esc(c.id)}">Edit</button><button type="button" class="el28IconButton el28Danger" data-el28-delete-candidate="${esc(c.id)}">Delete</button></td></tr>`;
      }).join('') || '<tr><td class="empty" colspan="4">No candidates yet. Add your first candidate.</td></tr>';
    }
  }
  function renderPresidentialPolls() {
    set('el28PresCount', current.presidentialReady ? current.presidentialPolls.length : '—');
    set('el28PresCountInline', current.presidentialReady ? current.presidentialPolls.length : '—');
    const body=q('#el28PresBody');if (!body)return;
    if (!current.presidentialReady){body.innerHTML='<tr><td class="empty" colspan="7">Presidential polls table not connected yet.</td></tr>';return;}
    body.innerHTML=current.presidentialPolls.map(p=>`<tr><td><b>${esc(p.pollster)}</b></td><td>${esc(p.dem_candidate)} <span class="el28Muted">vs</span> ${esc(p.rep_candidate)}</td><td>${esc(stateNames[p.state_code]||p.state_code)}</td><td>${esc(fmtDateRange(p.start_date,p.end_date))}</td><td><span style="color:#205ba7">D ${Number(p.dem_pct).toFixed(1)}%</span> / <span style="color:#aa3144">R ${Number(p.rep_pct).toFixed(1)}%</span></td><td><span class="el28Pill ${p.status==='published'?'published':'draft'}">${esc(p.status)}</span></td><td class="el28Right"><button type="button" class="el28IconButton" data-el28-edit-pres="${esc(p.id)}">Edit</button><button type="button" class="el28IconButton el28Danger" data-el28-delete-pres="${esc(p.id)}">Delete</button></td></tr>`).join('') || '<tr><td class="empty" colspan="7">No presidential polls yet.</td></tr>';
  }
  function renderBaseCounts(){
    set('el28GenericCount',(state.genericBallotPolls||[]).length);
    set('el28ApprovalCount',(state.approvalPolls||[]).length);
    renderPrimaryPollsParty('D');renderPrimaryPollsParty('R');
  }
  async function refresh2028(){
    if(current.refreshing || !sb || !state.session)return;
    current.refreshing=true;
    try {
      const [cr,pr]=await Promise.all([
        sb.from('primary_candidates').select('*').order('name',{ascending:true}),
        sb.from('presidential_polls').select('*').order('end_date',{ascending:false})
      ]);
      current.candidatesReady=!cr.error;
      current.presidentialReady=!pr.error;
      current.primaryCandidates=cr.data||[];
      current.presidentialPolls=pr.data||[];
      renderBaseCounts();renderCandidateRosters();renderPresidentialPolls();
      renderBanner('el28RosterMessageD',cr.error ? (setupError(cr)?'Run ADMIN-SETUP-2028.sql in Supabase once to enable the candidate roster.':`Candidate roster error: ${cr.error.message}`) : null);
      renderBanner('el28RosterMessageR',cr.error ? (setupError(cr)?'Run ADMIN-SETUP-2028.sql in Supabase once to enable the candidate roster.':`Candidate roster error: ${cr.error.message}`) : null);
      renderBanner('el28PresMessage',pr.error ? (setupError(pr)?'Run ADMIN-SETUP-2028.sql in Supabase once to enable presidential polling.':`Presidential polling error: ${pr.error.message}`) : null);
      renderDataHealth(cr.error,pr.error);
      document.querySelectorAll('[data-create-candidate]').forEach(b=>b.disabled=!current.candidatesReady);
      if (q('#el28AddPresPoll')) q('#el28AddPresPoll').disabled = !current.presidentialReady;
    }catch(e){ console.warn('ElectionLab 2028 refresh failed:',e);renderBaseCounts();renderBanner('el28PresMessage',`Unable to refresh. ${e.message||e}`); }
    finally{current.refreshing=false;}
  }
  function showPanel(id){
    if(!pageTitle[id])return;
    showAdminPanel(id);
    set('el28PageTitle',pageTitle[id][0]);set('el28PageSubtitle',pageTitle[id][1]);
    // No legacy/2026 navigation is exposed to editors.
  }
  function openEditor(id){if(typeof openModal==='function')openModal(id);}
  function closeEditor(id){if(typeof closeModal==='function')closeModal(id);}
  function openCandidate(candidate=null,party='D'){
    if(!current.candidatesReady){msg('Run the 2028 database setup SQL to enable the candidate roster.','error');return;}
    q('#el28CandidateForm').reset();
    q('#el28CandidateId').value=candidate?.id||'';
    q('#el28CandidateParty').value=candidate?.party||party;
    q('#el28CandidateName').value=candidate?.name||'';
    q('#el28CandidateWebsite').value=candidate?.website_url||'';
    q('#el28CandidatePhoto').value=candidate?.photo_url||'';
    q('#el28CandidateStatus').value=candidate?.status||'active';
    set('el28CandidateModalTitle',`${candidate?'Edit':'Add'} ${q('#el28CandidateParty').value==='D'?'Democratic':'Republican'} candidate`);
    openEditor('el28CandidateModal');
  }
  async function saveCandidate(e){
    e.preventDefault();
    const id=q('#el28CandidateId').value;
    const payload={party:q('#el28CandidateParty').value,name:q('#el28CandidateName').value.trim(),status:q('#el28CandidateStatus').value,website_url:q('#el28CandidateWebsite').value.trim()||null,photo_url:q('#el28CandidatePhoto').value.trim()||null,updated_at:new Date().toISOString()};
    if(!payload.name){msg('Enter a candidate name.','error');return;}
    const button=e.submitter; if(button) button.disabled=true;
    try{
      const r=id ? await sb.from('primary_candidates').update(payload).eq('id',id) : await sb.from('primary_candidates').insert(payload);
      if(r.error)throw r.error;
      closeEditor('el28CandidateModal');await refresh2028();msg('Candidate saved.');
    }catch(error){msg(error.message||'Candidate could not be saved.','error');}
    finally{if(button)button.disabled=false;}
  }
  async function deleteCandidate(id){
    const candidate=current.primaryCandidates.find(c=>c.id===id);if(!candidate)return;
    if(!confirm(`Delete ${candidate.name} from the ${candidate.party==='D'?'Democratic':'Republican'} candidate roster? Existing poll results will not be deleted.`))return;
    const r=await sb.from('primary_candidates').delete().eq('id',id);
    if(r.error){msg(r.error.message,'error');return;}
    await refresh2028();msg('Candidate deleted.');
  }
  function openPresidential(p=null){
    if(!current.presidentialReady){msg('Run the 2028 database setup SQL to enable presidential polls.','error');return;}
    q('#el28PresForm').reset();
    const field=id=>q('#'+id);
    field('el28PresId').value=p?.id||'';
    field('el28PresPollster').value=p?.pollster||'';
    field('el28PresDem').value=p?.dem_candidate||'';
    field('el28PresRep').value=p?.rep_candidate||'';
    field('el28PresState').value=p?.state_code||'US';
    field('el28PresPopulation').value=p?.population||'LV';
    field('el28PresStart').value=p?.start_date||'';
    field('el28PresEnd').value=p?.end_date||'';
    field('el28PresSample').value=p?.sample_size??'';
    field('el28PresQuality').value=p?.quality_weight??1;
    field('el28PresDemPct').value=p?.dem_pct??'';
    field('el28PresRepPct').value=p?.rep_pct??'';
    field('el28PresStatus').value=p?.status||'draft';
    field('el28PresSource').value=p?.source_url||'';
    set('el28PresModalTitle',p?'Edit presidential poll':'Add presidential poll');
    openEditor('el28PresModal');
  }
  async function savePresidential(e){
    e.preventDefault();const el=id=>q('#el28Pres'+id).value;
    const dem=Number(el('DemPct')),rep=Number(el('RepPct'));
    if(el('End')<el('Start')){msg('Fieldwork end date must be after the start date.','error');return;}
    if(dem+rep>100.01){msg('Democratic and Republican percentages cannot total more than 100%.','error');return;}
    const payload={pollster:el('Pollster').trim(),dem_candidate:el('Dem').trim(),rep_candidate:el('Rep').trim(),state_code:el('State'),population:el('Population'),start_date:el('Start'),end_date:el('End'),sample_size:el('Sample') ? Number(el('Sample')):null,quality_weight:Number(el('Quality')||1),dem_pct:dem,rep_pct:rep,status:el('Status'),source_url:el('Source').trim()||null,updated_at:new Date().toISOString()};
    const id=el('Id');const button=e.submitter;if(button)button.disabled=true;
    try{
      const r=id?await sb.from('presidential_polls').update(payload).eq('id',id):await sb.from('presidential_polls').insert(payload);
      if(r.error)throw r.error;
      closeEditor('el28PresModal');await refresh2028();msg('Presidential poll saved.');
    }catch(error){msg(error.message||'Presidential poll could not be saved.','error');}
    finally{if(button)button.disabled=false;}
  }
  async function deletePresidential(id){
    const p=current.presidentialPolls.find(r=>r.id===id);if(!p)return;
    if(!confirm(`Delete the ${p.pollster} poll (${p.dem_candidate} vs ${p.rep_candidate})?`))return;
    const r=await sb.from('presidential_polls').delete().eq('id',id);
    if(r.error){msg(r.error.message,'error');return;}
    await refresh2028();msg('Presidential poll deleted.');
  }
  function wire(){
    const baseReloadAll=reloadAll;
    // The existing editors and importer call reloadAll; refresh the new views too.
    reloadAll=async function(...args){const result=await baseReloadAll(...args);await refresh2028();return result;};
    const baseShow=showAdminPanel;
    showAdminPanel=function(id){baseShow(id);if(pageTitle[id]){set('el28PageTitle',pageTitle[id][0]);set('el28PageSubtitle',pageTitle[id][1]);}};
    q('#el28PresState').innerHTML=stateList.map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
    document.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.panelLink){showPanel(b.dataset.panelLink);return;}
      if(b.dataset.partyAction){showPanel(b.dataset.partyAction==='D'?'demPrimaryAdminPanel':'repPrimaryAdminPanel');editPrimaryPoll();q('#primaryPollParty').value=b.dataset.partyAction;return;}
      if(b.dataset.createPoll){editPrimaryPoll();q('#primaryPollParty').value=b.dataset.createPoll;return;}
      if(b.dataset.createCandidate){openCandidate(null,b.dataset.createCandidate);return;}
      if(b.dataset.el28EditPoll){editPrimaryPoll(b.dataset.el28EditPoll);return;}
      if(b.dataset.el28DeletePoll){deletePrimaryPoll(b.dataset.el28DeletePoll);return;}
      if(b.dataset.el28EditCandidate){openCandidate(current.primaryCandidates.find(c=>c.id===b.dataset.el28EditCandidate));return;}
      if(b.dataset.el28DeleteCandidate){deleteCandidate(b.dataset.el28DeleteCandidate);return;}
      if(b.dataset.el28EditPres){openPresidential(current.presidentialPolls.find(p=>p.id===b.dataset.el28EditPres));return;}
      if(b.dataset.el28DeletePres){deletePresidential(b.dataset.el28DeletePres);return;}
      if(b.dataset.el28Close){closeEditor(b.dataset.el28Close);return;}
    });
    q('#el28CandidateForm').addEventListener('submit',saveCandidate);
    q('#el28PresForm').addEventListener('submit',savePresidential);
    q('#el28AddPresPoll').addEventListener('click',()=>openPresidential());
    q('#el28Refresh').addEventListener('click',async()=>{await reloadAll();msg('Dashboard refreshed.');});
    // Also keep side navigation title synchronized with original handler.
    document.querySelectorAll('.el28Sidebar [data-panel]').forEach(b=>b.addEventListener('click',()=>{set('el28PageTitle',pageTitle[b.dataset.panel][0]);set('el28PageSubtitle',pageTitle[b.dataset.panel][1]);}));
  }
  document.addEventListener('DOMContentLoaded',wire);
})();
