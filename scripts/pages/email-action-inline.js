// Extracted inline script from email-action.html
// ── Supabase client (inline — this page loads standalone) ─────────────────
const SUPABASE_URL      = '%%SUPABASE_URL%%';
const SUPABASE_ANON_KEY = '%%SUPABASE_ANON_KEY%%';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── UI helpers ─────────────────────────────────────────────────────────────
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showError(title, desc) {
  document.getElementById('errTitle').textContent = title || 'Something went wrong';
  document.getElementById('errDesc').textContent  = desc  || 'This link may have expired.';
  showPanel('panelError');
}

function showToast(msg, type) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3500);
}

// ── Main handler ───────────────────────────────────────────────────────────
//
// Supabase sends email confirmation links in TWO formats:
//
// 1. Hash-fragment (older / PKCE-off):
//    .../email-action.html#access_token=...&refresh_token=...&type=signup
//
// 2. Query-string token_hash (newer):
//    .../email-action.html?token_hash=...&type=signup
//
// We detect and handle both.

// ── Fetch profile from Supabase and cache it as breedlink_user ─────────────
// This ensures auth.js sees a logged-in user immediately after email confirmation.
async function fetchAndStoreUser(accessToken) {
  try {
    // Get the user's id from Supabase auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` }
    });
    if (!authRes.ok) return;
    const authUser = await authRes.json();
    const userId = authUser.id;
    if (!userId) return;

    // Fetch the profile row
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*&limit=1`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` } }
    );
    const profiles = profRes.ok ? await profRes.json() : [];

    // ── Create profile row if it doesn't exist yet (OTP signup path) ──────
    if (!profiles[0]) {
      const pending = (() => {
        try { return JSON.parse(localStorage.getItem('breedlink_pending_signup') || sessionStorage.getItem('breedlink_pending_signup') || '{}'); }
        catch(e) { return {}; }
      })();
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id:              userId,
          name:            pending.name            || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          account_type:    pending.accountType     || authUser.user_metadata?.account_type || 'breeder',
          profile_picture: null,
          cover_photo:     'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
          bio:             '',
          tags:            [],
          contact:         { email: authUser.email || '', phone: pending.phone || '', location: pending.location || 'Butuan City, Philippines' },
          stats:           { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 },
          location:        pending.location        || 'Butuan City, Philippines',
          is_deleted:      false
        })
      });
      // Re-fetch so the user object below is populated from the real row
      const refetch = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*&limit=1`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` } }
      );
      if (refetch.ok) profiles.push(...(await refetch.json()));
      localStorage.removeItem('breedlink_pending_signup');
      sessionStorage.removeItem('breedlink_pending_signup');
    }

    const profile  = profiles[0] || {};

    const user = {
      id:          userId,
      name:        profile.name        || authUser.user_metadata?.name || 'User',
      email:       profile.contact?.email || authUser.email || '',
      avatar:      profile.profile_picture || defaultAvatar(user.name || 'User'),
      coverPhoto:  profile.cover_photo || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
      bio:         profile.bio         || '',
      tags:        profile.tags        || [],
      accountType: profile.account_type || authUser.user_metadata?.account_type || 'breeder',
      contact:     profile.contact     || { email: authUser.email || '', phone: '', location: '' },
      stats:       profile.stats       || { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 },
      location:    profile.location    || 'Butuan City, Philippines'
    };

    sessionStorage.setItem('breedlink_user', JSON.stringify(user));
    console.log('[email-action] User profile cached:', user.name);
  } catch (e) {
    console.warn('[email-action] fetchAndStoreUser failed (non-fatal):', e);
  }
}

async function handleAction() {
  const hashParams  = new URLSearchParams(window.location.hash.slice(1));
  const queryParams = new URLSearchParams(window.location.search.slice(1));

  // Surface any embedded error first
  const urlError = hashParams.get('error_description') || queryParams.get('error_description');
  if (urlError) {
    showError('Link error', decodeURIComponent(urlError.replace(/\+/g,' ')));
    return;
  }

  const accessToken  = hashParams.get('access_token')  || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const type         = (hashParams.get('type') || queryParams.get('type') || '').toLowerCase();
  const tokenHash    = queryParams.get('token_hash');

  // ── Format 1: access_token in hash ──────────────────────────────────────
  if (accessToken) {
    try {
      const { error } = await sb.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken || ''
      });
      if (error) throw error;

      // Persist tokens so auth.js sees the session
      sessionStorage.setItem('breedlink_token', accessToken);
      if (refreshToken) sessionStorage.setItem('breedlink_refresh_token', refreshToken);

      if (type === 'recovery') {
        showPanel('panelReset');
      } else if (type === 'email_change') {
        showPanel('panelRecovered');
        startCountdown('recoveredSecs', 'login.html');
      } else {
        // signup / email → fetch profile and store user, then show verified panel
        await fetchAndStoreUser(accessToken);
        showPanel('panelVerified');
        startCountdown('verifiedSecs', 'profile.html');
      }
    } catch (err) {
      console.error('[email-action] setSession error:', err);
      showError('Verification failed', err.message || 'Could not validate this link. Please try again.');
    }
    return;
  }

  // ── Format 2: token_hash in query string ─────────────────────────────────
  if (tokenHash && type) {
    try {
      const { data, error } = await sb.auth.verifyOtp({
        token_hash: tokenHash,
        type:       type   // 'signup' | 'recovery' | 'email_change' | 'magiclink'
      });
      if (error) throw error;

      // Persist session
      if (data?.session) {
        sessionStorage.setItem('breedlink_token', data.session.access_token);
        if (data.session.refresh_token) {
          sessionStorage.setItem('breedlink_refresh_token', data.session.refresh_token);
        }
        if (type !== 'recovery' && type !== 'email_change') {
          await fetchAndStoreUser(data.session.access_token);
        }
      }

      if (type === 'recovery') {
        showPanel('panelReset');
      } else if (type === 'email_change') {
        showPanel('panelRecovered');
        startCountdown('recoveredSecs', 'login.html');
      } else {
        showPanel('panelVerified');
        startCountdown('verifiedSecs', 'profile.html');
      }
    } catch (err) {
      console.error('[email-action] verifyOtp error:', err);
      let desc = err.message || 'Please request a new link.';
      if (desc.includes('expired'))      desc = 'This link has expired. Please request a new confirmation email.';
      if (desc.includes('already used') || desc.includes('invalid')) {
        desc = 'This link has already been used or is invalid. Please request a new one.';
      }
      showError('Link expired or invalid', desc);
    }
    return;
  }

  // ── Nothing we recognise ──────────────────────────────────────────────────
  showError(
    'Invalid confirmation link',
    'No verification token was found in the URL. Please use the link directly from your email, or request a new one.'
  );
}

handleAction();

// ── Auto-redirect helpers ──────────────────────────────────────────────────
function startCountdown(secsElId, targetUrl) {
  var el = document.getElementById(secsElId);
  var n = 3;
  var iv = setInterval(function() {
    n--;
    if (el) el.textContent = n;
    if (n <= 0) { clearInterval(iv); window.location.href = targetUrl; }
  }, 1000);
}

// ── Password reset form ────────────────────────────────────────────────────
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

function onPwInput() {
  const pw   = document.getElementById('newPw').value;
  const segs = ['seg1','seg2','seg3'].map(id => document.getElementById(id));
  const lbl  = document.getElementById('strengthLabel');
  segs.forEach(s => s.className = 'strength-seg');
  if (!pw) { lbl.textContent = 'Enter a password'; return; }
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { cls:'weak',   label:'Weak' },
    { cls:'medium', label:'Medium' },
    { cls:'strong', label:'Strong' }
  ];
  const lvl = levels[Math.max(0, score - 1)];
  for (let i = 0; i < score; i++) segs[i].classList.add(lvl.cls);
  lbl.textContent = lvl.label;
}

async function doResetPassword() {
  const pw  = document.getElementById('newPw').value;
  const cpw = document.getElementById('confirmPw').value;
  let valid = true;

  ['newPwError','confirmPwError'].forEach(id => document.getElementById(id).classList.remove('visible'));
  ['newPw','confirmPw'].forEach(id => document.getElementById(id).classList.remove('error'));

  if (pw.length < 8) {
    document.getElementById('newPwError').classList.add('visible');
    document.getElementById('newPw').classList.add('error');
    valid = false;
  }
  if (pw !== cpw) {
    document.getElementById('confirmPwError').classList.add('visible');
    document.getElementById('confirmPw').classList.add('error');
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('resetBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    // Session is already set from handleAction() above
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw error;

    showToast('Password updated! Redirecting…', 'success');
    setTimeout(() => { window.location.href = 'login.html'; }, 1800);

  } catch (err) {
    let msg = err.message || 'Failed to reset password. Please try again.';
    if (msg.includes('expired'))       msg = 'This reset link has expired. Please request a new one.';
    if (msg.includes('same password')) msg = 'Your new password must be different from the old one.';
    showToast(msg, 'error');
    btn.disabled = false;
    btn.textContent = 'Set New Password';
  }
}
