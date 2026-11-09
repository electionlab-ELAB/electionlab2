document.addEventListener('DOMContentLoaded', async () => {
  const msg = document.querySelector('#inviteMessage');
  const form = document.querySelector('#inviteForm');
  if (typeof configured === 'undefined' || !configured || !window.sb) { msg.textContent = 'Authentication configuration is missing.'; return; }
  try {
    // The Supabase JS client in common.js parses standard invitation callback tokens.
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) { msg.textContent = 'Invitation is invalid or expired. Ask the owner to send a fresh invitation.'; msg.className = 'notice error'; return; }
    form.hidden = false;
    msg.textContent = 'Invitation verified. Choose a password (12 characters or more).';
  } catch (e) { msg.textContent = e.message; msg.className = 'notice error'; return; }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const a = document.querySelector('#invitePassword').value;
    const b = document.querySelector('#invitePassword2').value;
    if (a !== b) { msg.textContent = 'Passwords do not match.'; msg.className = 'notice error'; return; }
    if (a.length < 12) { msg.textContent = 'Use at least 12 characters.'; msg.className = 'notice error'; return; }
    const btn = form.querySelector('button'); btn.disabled = true;
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { msg.textContent = error.message; msg.className = 'notice error'; btn.disabled = false; return; }
    location.href = 'admin.html';
  });
});
