/* ElectionLab Owner / Worker control panel. Uses existing `sb` Supabase client. */
(() => {
  'use strict';
  const q = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {
    edit_polls: 'Add, edit and delete polls',
    edit_candidates: 'Manage candidates and races',
    edit_forecasts: 'Change forecast inputs and models',
    edit_website: 'Edit website settings',
    import_spreadsheets: 'Show spreadsheet import controls (UI only)'
  };
  let staff = [];
  let owner = false;
  const status = (message, bad = false) => {
    const area = q('#elStaffMessage');
    if (area) { area.textContent = message; area.className = `elStaffAlert ${bad ? 'error' : 'good'}`; area.hidden = false; }
  };
  const call = async body => {
    const { data, error } = await sb.functions.invoke('manage-staff', { body });
    if (error) throw new Error(data?.error || error.message || 'Staff service unavailable');
    if (data?.error) throw new Error(data.error);
    return data;
  };
  const allStaff = async () => {
    const { data, error } = await sb.from('admins')
      .select('user_id,email,display_name,role,is_active,permissions,created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    staff = data || [];
    render();
  };
  const render = () => {
    const body = q('#elStaffRows');
    if (!body) return;
    body.innerHTML = staff.map(a => {
      const isOwner = a.role === 'owner';
      const p = a.permissions || {};
      const checks = Object.entries(labels).map(([key, text]) =>
        `<label class="elStaffCheck"><input type="checkbox" data-allow="${key}" ${p[key] !== false ? 'checked' : ''}> ${esc(text)}</label>`
      ).join('');
      return `<tr data-user-id="${esc(a.user_id)}">
        <td><strong>${esc(a.display_name || (isOwner ? 'Owner' : 'Worker'))}</strong><small>${esc(a.email || '')}</small></td>
        <td><span class="elStaffRole ${isOwner?'owner':''}">${isOwner?'👑 Owner':'Worker'}</span></td>
        <td><span class="elStaffState ${a.is_active?'on':'off'}">${a.is_active?'Active':'Disabled'}</span></td>
        <td>${isOwner?'<span class="elStaffProtected">Protected</span>':`<button type="button" class="el28IconButton" data-manage="${esc(a.user_id)}">Manage</button>`}</td>
      </tr>${isOwner?'':`<tr class="elStaffDetails" data-editor="${esc(a.user_id)}" hidden><td colspan="4">
        <div class="elStaffEditor"><h4>Manage ${esc(a.display_name || a.email || 'worker')}</h4>
          <label class="elStaffInput">Display name <input type="text" maxlength="100" data-name value="${esc(a.display_name || '')}"></label>
          <div class="elStaffChecks">${checks}</div>
          <label class="elStaffCheck elStaffSwitch"><input type="checkbox" data-active ${a.is_active?'checked':''}> Account enabled</label>
          <div class="elStaffButtons"><button type="button" class="el28Btn" data-save="${esc(a.user_id)}">Save changes</button>
            <button type="button" class="el28IconButton el28Danger" data-delete="${esc(a.user_id)}">Delete worker permanently</button></div>
          <p class="elStaffTip">Changes to database permissions take effect on the worker's next protected request.</p>
        </div></td></tr>`}`;
    }).join('') || '<tr><td colspan="4">No staff accounts found.</td></tr>';
  };
  const loadLog = async () => {
    const { data, error } = await sb.from('el_staff_audit')
      .select('created_at,actor_id,target_user_id,action,details')
      .order('created_at', { ascending: false }).limit(25);
    const box = q('#elStaffAudit');
    if (!box) return;
    if (error) { box.textContent = `Audit log unavailable: ${error.message}`; return; }
    box.replaceChildren(...(data || []).map(row => {
      const div = document.createElement('div');
      div.className = 'elStaffAuditRow';
      div.textContent = `${new Date(row.created_at).toLocaleString()} • ${row.action} • ${row.details?.email || row.target_user_id || ''}`;
      return div;
    }));
  };
  const refresh = async () => { await allStaff(); await loadLog(); };
  const init = async () => {
    if (!window.sb) return;
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) return;
    const { data, error } = await sb.from('admins')
      .select('role,is_active,permissions').eq('user_id', user.id).maybeSingle();
    if (error || !data || !data.is_active) return;
    owner = data.role === 'owner';
    const roleBadge = q('#elAccountRole');
    if (roleBadge) roleBadge.textContent = owner ? 'OWNER' : 'WORKER';
    if (!owner) {
      // UI convenience only. Database RLS remains the true authority.
      window.elStaffCanImport = data.permissions?.import_spreadsheets !== false;
      if (!window.elStaffCanImport) {
        const importTab = q('.sidebar [data-panel="modelImportPanel"]');
        if (importTab) importTab.hidden = true;
        q('#modelImportRun')?.setAttribute('disabled','disabled');
      }
      return;
    }
    const nav = q('#elStaffNav');
    if (nav) nav.hidden = false;
    nav?.addEventListener('click', () => refresh().catch(e => status(e.message, true)));
    q('#elStaffRefresh')?.addEventListener('click', () => refresh().catch(e => status(e.message, true)));
    q('#elStaffInviteForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const btn = q('#elStaffInviteForm button[type="submit"]');
      btn.disabled = true;
      try {
        const result = await call({action:'invite', display_name:q('#elInviteName').value, email:q('#elInviteEmail').value});
        status(result.message || 'Invitation sent');
        event.target.reset(); await refresh();
      } catch (e) { status(e.message, true); } finally { btn.disabled = false; }
    });
    q('#elStaffRows')?.addEventListener('click', async event => {
      const b = event.target.closest('button');
      if (!b) return;
      const id = b.dataset.manage || b.dataset.save || b.dataset.delete;
      if (!id) return;
      if (b.dataset.manage) { const editor = q(`[data-editor="${id}"]`); if (editor) editor.hidden = !editor.hidden; return; }
      const worker = staff.find(a => a.user_id === id);
      if (!worker || worker.role !== 'worker') return;
      if (b.dataset.delete && !confirm(`Permanently delete the worker account for ${worker.email || worker.display_name}? This cannot be undone.`)) return;
      b.disabled = true;
      try {
        let result;
        if (b.dataset.delete) result = await call({action:'delete',user_id:id});
        else {
          const editor = q(`[data-editor="${id}"]`);
          const permissions = {};
          editor.querySelectorAll('[data-allow]').forEach(input => { permissions[input.dataset.allow] = input.checked; });
          result = await call({action:'update',user_id:id,display_name:editor.querySelector('[data-name]').value,
            is_active:editor.querySelector('[data-active]').checked,permissions});
        }
        status(result.message || 'Saved'); await refresh();
      } catch (e) { status(e.message, true); } finally { b.disabled = false; }
    });
    await refresh();
  };
  document.addEventListener('DOMContentLoaded', () => init().catch(e => console.error('Staff panel:', e)));
})();
