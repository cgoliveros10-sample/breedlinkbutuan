// Extracted inline script from verify-otp.html
// Capture createClient BEFORE db.js overwrites window.supabase
const _supabaseCreateClient = supabase.createClient.bind(supabase);

// ── Init ──────────────────────────────────────────────────────────────────
const SUPABASE_URL      = window.SUPABASE_URL || '%%SUPABASE_URL%%';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
const sb = _supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Load pending signup data ──────────────────────────────────────────────
let pendingData = null;
try {
  // Try sessionStorage first, fall back to localStorage so resend works after reload
  const raw = sessionStorage.getItem('breedlink_pending_signup')
           || localStorage.getItem('breedlink_pending_signup');
  if (raw) {
    pendingData = JSON.parse(raw);
    // Mirror to both so it survives navigation
    sessionStorage.setItem('breedlink_pending_signup', raw);
    localStorage.setItem('breedlink_pending_signup', raw);
  }
} catch(e) {}

// Show email in description
if (pendingData && pendingData.email) {
  document.getElementById('emailDisplay').textContent = pendingData.email;
}

// ── OTP Inputs: keyboard navigation & auto-advance ────────────────────────
const inputs = Array.from(document.querySelectorAll('.otp-input'));

inputs.forEach((inp, idx) => {
  inp.addEventListener('keydown', (e) => {
    // Allow: backspace, delete, arrows, tab
    if (['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) return;
    // Block non-digits
    if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
    // Clear current box so new digit replaces it
    inp.value = '';
    inp.classList.remove('filled');
  });

  inp.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 1);
    e.target.value = val;
    e.target.classList.toggle('filled', val.length > 0);
    // Auto-advance to next input
    if (val && idx < 5) {
      inputs[idx + 1].focus();
      inputs[idx + 1].select();
    }
    // Auto-submit when all 6 filled
    if (inputs.every(i => i.value.length === 1)) {
      setTimeout(window.verifyCode, 300);
    }
  });

  // Backspace: clear current or go to previous
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      if (!inp.value && idx > 0) {
        inputs[idx - 1].value = '';
        inputs[idx - 1].classList.remove('filled');
        inputs[idx - 1].focus();
      } else {
        inp.value = '';
        inp.classList.remove('filled');
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs[idx - 1].focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputs[idx + 1].focus();
    }
  });

  // Handle paste into any cell
  inp.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
    if (!pasted) return;
    pasted.slice(0, 6).split('').forEach((ch, i) => {
      if (inputs[idx + i]) {
        inputs[idx + i].value = ch;
        inputs[idx + i].classList.add('filled');
      }
    });
    const nextEmpty = inputs.findIndex(i => !i.value);
    (nextEmpty >= 0 ? inputs[nextEmpty] : inputs[5]).focus();
    if (inputs.every(i => i.value.length === 1)) setTimeout(verifyCode, 200);
  });
});

// Focus first input on load
inputs[0].focus();

// ── Toast helper ─────────────────────────────────────────────────────────
function showToast(msg, type) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3800);
}

// ── Shake error animation ────────────────────────────────────────────────
function shakeInputs() {
  inputs.forEach(i => {
    i.classList.add('error-shake');
    i.style.borderColor = 'var(--red)';
  });
  setTimeout(() => {
    inputs.forEach(i => {
      i.classList.remove('error-shake');
      i.style.borderColor = '';
    });
    inputs[0].focus();
    inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
  }, 500);
}

// ── Create profile after OTP verification ────────────────────────────────
// SECURITY: This function must ONLY be called after verifyOtp() has returned
// a valid session. Never call it speculatively or before verification completes.
async function createProfile(userId, accessToken) {
  if (!pendingData) return;
  // Guard: require a valid access token — refuse to create profile without confirmed auth
  if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 20) {
    console.error('[verify-otp] createProfile blocked: no valid access token provided');
    return;
  }
  const defaultContact = {
    email:    pendingData.email    || '',
    phone:    pendingData.phone    || '',
    location: pendingData.location || 'Butuan City, Philippines'
  };
  const defaultStats = { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 };

  try {
    // Use Supabase REST API with the fresh access token so RLS allows insert
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify({
        id: userId,
        name: pendingData.name,
        username: pendingData.username || null,
        account_type: pendingData.accountType || 'breeder',
        profile_picture: defaultAvatar(pendingData.name || 'User'),
        cover_photo: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
        bio: '',
        tags: [],
        contact: defaultContact,
        stats: defaultStats,
        location: pendingData.location || 'Butuan City, Philippines'
      })
    });
  } catch(e) {
    console.warn('Profile create failed (non-fatal):', e);
  }

  // Cache user for auth.js
  const user = {
    id: userId,
    name: pendingData.name,
    email: pendingData.email,
    avatar: defaultAvatar(pendingData.name || 'User'),
    coverPhoto: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
    bio: '',
    tags: [],
    accountType: pendingData.accountType || 'breeder',
    contact: defaultContact,
    stats: defaultStats,
    location: pendingData.location || 'Butuan City, Philippines'
  };
  sessionStorage.setItem('breedlink_user', JSON.stringify(user));
  // Clear pending signup data from BOTH storages so stale data never bleeds into a future signup
  sessionStorage.removeItem('breedlink_pending_signup');
  localStorage.removeItem('breedlink_pending_signup');
}

// ── Verify the 6-digit code ──────────────────────────────────────────────
window.verifyCode = async function verifyCode() {
  const code = inputs.map(i => i.value).join('');
  if (code.length < 6) {
    showToast('Please enter all 6 digits', 'error');
    return;
  }

  const btn = document.getElementById('verifyBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Verifying…';

  try {
    const email = pendingData?.email;
    if (!email) throw new Error('Session expired. Please sign up again.');

    const { data, error } = await sb.auth.verifyOtp({
      email,
      token: code,
      type: 'signup'   // always 'signup' for new account verification
    });

    if (error) throw error;
    if (!data?.session) throw new Error('Verification failed. Please try again.');

    // Store tokens
    const { access_token, refresh_token } = data.session;
    sessionStorage.setItem('breedlink_token', access_token);
    if (refresh_token) sessionStorage.setItem('breedlink_refresh_token', refresh_token);

    // Create the profile row now that auth is confirmed
    await createProfile(data.user.id, access_token);

    // Mark profile as verified — DB trigger handles auto-follow securely
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({ is_verified: true })
      });
    } catch(e) { console.warn('Could not mark profile verified (non-fatal):', e); }

    // Show success panel and countdown redirect
    document.getElementById('verifyPanel').style.display = 'none';
    document.getElementById('successPanel').classList.add('visible');
    showToast('Email verified! Welcome to BreedLink 🐾', 'success');

    let secs = 3;
    const secEl = document.getElementById('redirectSecs');
    const iv = setInterval(() => {
      secs--;
      if (secEl) secEl.textContent = secs;
      if (secs <= 0) { clearInterval(iv); window.location.href = 'profile.html'; }
    }, 1000);

  } catch (err) {
    let msg = err.message || 'Incorrect code. Please try again.';
    if (msg.toLowerCase().includes('expired'))    msg = 'This code has expired. Please request a new one.';
    if (msg.toLowerCase().includes('invalid'))    msg = 'Incorrect code. Please check and try again.';
    if (msg.toLowerCase().includes('already'))    msg = 'This code was already used. Please request a new one.';
    showToast(msg, 'error');
    shakeInputs();
    btn.disabled = false;
    btn.textContent = 'Verify Account →';
  }
}

// ── Resend OTP ───────────────────────────────────────────────────────────
let resendTimer = null;
let resendSeconds = 120;

function startResendTimer() {
  const btn       = document.getElementById('resendBtn');
  const timerSpan = document.getElementById('timerDisplay');
  resendSeconds = 120;
  btn.disabled = true;

  resendTimer = setInterval(() => {
    resendSeconds--;
    if (timerSpan) {
      const m = Math.floor(resendSeconds / 60);
      const s = resendSeconds % 60;
      timerSpan.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }
    if (resendSeconds <= 0) {
      clearInterval(resendTimer);
      btn.disabled = false;
      document.getElementById('resendBtnText').textContent = 'Resend Code';
    }
  }, 1000);
}

startResendTimer(); // start timer immediately on page load

window.resendCode = async function resendCode() {
  const email = pendingData?.email;
  if (!email) {
    showToast('Could not find your email. Please sign up again.', 'error');
    return;
  }

  const btn = document.getElementById('resendBtn');
  btn.disabled = true;
  document.getElementById('resendBtnText').textContent = 'Sending…';

  try {
    const { error } = await sb.auth.resend({
      type: 'signup',
      email: email
    });
    if (error) throw error;
    showToast('New code sent! Check your inbox 📧', 'success');
    document.getElementById('resendBtnText').innerHTML = 'Resend Code in <span id="timerDisplay">2:00</span>';
    startResendTimer();
    inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
    inputs[0].focus();
  } catch(err) {
    const msg = err.message || 'Failed to resend. Please wait and try again.';
    showToast(msg, 'error');
    btn.disabled = false;
    document.getElementById('resendBtnText').textContent = 'Resend Code';
  }
}

// Allow pressing Enter to submit
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifyCode();
});
