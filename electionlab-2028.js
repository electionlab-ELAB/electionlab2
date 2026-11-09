/* ElectionLab 2028: admin-selected portraits on primary poll rankings. */
(() => {
  'use strict';
  const party = window.ELECTIONLAB_PRIMARY_PARTY;
  if (!['D','R'].includes(party)) return;

  const byName = new Map();
  const canonical = name => String(name || '').trim().toLowerCase()
    .replace(/[’']/g, '').replace(/\./g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const initials = name => String(name||'').trim().split(/\s+/)
    .filter(Boolean).slice(0,2).map(piece=>piece[0]).join('').toUpperCase() || '?';
  const safeUrl = source => {
    if (!source) return '';
    try { const url = new URL(source, location.href); return url.protocol === 'https:' ? url.href : ''; }
    catch { return ''; }
  };
  const list = document.getElementById('primaryCandidateAverageList');
  if (!list) return;

  function renderAvatars() {
    for (const row of list.querySelectorAll('.trackerCandidateRow')) {
      const name = row.querySelector('b')?.textContent?.trim();
      if (!name) continue;
      const photoUrl = safeUrl(byName.get(canonical(name)) || '');
      let avatar = row.querySelector('.el28-candidate-avatar');
      if (!avatar) {
        avatar = document.createElement('span');
        avatar.className = 'el28-candidate-avatar';
        avatar.setAttribute('aria-hidden','true');
        const dot = row.querySelector('.partyDot');
        if (dot) dot.replaceWith(avatar);
        else row.querySelector('div')?.prepend(avatar);
      }
      // Avoid re-render loops with MutationObserver and preserve failed-image state.
      if (avatar.dataset.photoKey === (photoUrl || 'no-photo')) continue;
      avatar.dataset.photoKey = photoUrl || 'no-photo';
      avatar.replaceChildren();
      if (!photoUrl) { avatar.textContent = initials(name); continue; }
      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { if (img.parentNode === avatar) avatar.textContent = initials(name); };
      img.src = photoUrl;
      avatar.append(img);
    }
  }

  // The primary tracker replaces list rows after every data refresh.
  const observer = new MutationObserver(() => renderAvatars());
  observer.observe(list, {childList:true,subtree:false});
  renderAvatars();

  const client = window.sb;
  if (!client || typeof client.from !== 'function') return;
  (async () => {
    try {
      const {data,error} = await client.from('primary_candidates')
        .select('name,photo_url').eq('party',party).eq('status','active');
      if (error) { console.warn('Candidate roster could not load:',error.message); return; }
      for (const candidate of data || []) {
        const url = safeUrl(candidate.photo_url);
        if (url) byName.set(canonical(candidate.name), url);
      }
      renderAvatars();
    } catch (error) { console.warn('Candidate portraits unavailable:',error); }
  })();
})();
