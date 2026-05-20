// account-settings.js — BreedLink Account Settings Panel
// Injects a slide-in settings panel with: Change Email, Change Password, Delete Account

(function () {
  // ── Inject CSS ──────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ── Settings Overlay ── */
    #settingsOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 9000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    #settingsOverlay.open {
      opacity: 1;
      pointer-events: all;
    }

    /* ── Settings Panel ── */
    #settingsPanel {
      position: fixed;
      top: 0;
      right: 0;
      height: 100%;
      width: 380px;
      max-width: 95vw;
      background: #fff;
      z-index: 9001;
      box-shadow: -8px 0 40px rgba(0,0,0,0.18);
      transform: translateX(110%);
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #settingsPanel.open {
      transform: translateX(0);
    }

    /* ── Panel Header ── */
    .sp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 22px 24px 16px;
      border-bottom: 1px solid #e8f0ea;
      flex-shrink: 0;
    }
    .sp-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #1a2e1f);
    }
    .sp-close-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: #f0f4f1;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .sp-close-btn:hover { background: #e0ece3; }

    /* ── Panel Body ── */
    .sp-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
    }

    /* ── Section card ── */
    .sp-section {
      background: #f8faf8;
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 14px;
      border: 1px solid #e4ede6;
    }
    .sp-section-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--green-primary, #2e6b4e);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 14px;
    }

    /* ── Inputs inside panel ── */
    .sp-input {
      width: 100%;
      padding: 12px 14px;
      border: 2px solid #dde8df;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      background: white;
      font-family: inherit;
      color: #1a2e1f;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
      margin-bottom: 10px;
    }
    .sp-input:focus {
      border-color: var(--green-primary, #2e6b4e);
      box-shadow: 0 0 0 3px rgba(46,107,78,0.12);
    }
    .sp-input::placeholder { color: #9cb0a0; }

    .sp-label {
      font-size: 12px;
      font-weight: 600;
      color: #5a7a63;
      margin-bottom: 5px;
      display: block;
    }

    /* ── Buttons ── */
    .sp-btn {
      width: 100%;
      padding: 12px;
      border-radius: 50px;
      border: none;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s;
      font-family: inherit;
    }
    .sp-btn-primary {
      background: linear-gradient(135deg, #2e6b4e, #3a8c64);
      color: white;
      box-shadow: 0 4px 12px rgba(46,107,78,0.3);
    }
    .sp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(46,107,78,0.4); }
    .sp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .sp-btn-danger {
      background: transparent;
      color: #dc2626;
      border: 2px solid #fca5a5;
    }
    .sp-btn-danger:hover { background: #fff1f0; border-color: #dc2626; }

    /* ── Status message ── */
    .sp-status {
      font-size: 12px;
      margin-top: 8px;
      display: none;
      padding: 8px 12px;
      border-radius: 8px;
    }
    .sp-status.success { display: block; background: #ecfdf5; color: #166534; }
    .sp-status.error   { display: block; background: #fff1f0; color: #dc2626; }

    /* ── Delete account confirm area ── */
    .sp-delete-info {
      font-size: 12px;
      color: #9b6060;
      line-height: 1.5;
      margin-bottom: 12px;
      background: #fff5f5;
      border-radius: 10px;
      padding: 10px 12px;
      border: 1px solid #fecaca;
    }

    /* ── Footer ── */
    .sp-footer {
      padding: 14px 24px;
      border-top: 1px solid #e8f0ea;
      font-size: 11px;
      color: #9caa9f;
      text-align: center;
      flex-shrink: 0;
    }

    /* ── Deletion countdown ── */
    .sp-countdown-box {
      background: #fff5f5;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      text-align: center;
    }
    .sp-countdown-days {
      font-size: 36px;
      font-weight: 800;
      color: #dc2626;
      line-height: 1;
    }
    .sp-countdown-label {
      font-size: 11px;
      color: #9b6060;
      margin-top: 2px;
    }
    .sp-countdown-date {
      font-size: 11px;
      color: #9b6060;
      margin-top: 6px;
    }
    .sp-btn-cancel-delete {
      background: transparent;
      color: #166534;
      border: 2px solid #86efac;
      margin-top: 8px;
    }
    .sp-btn-cancel-delete:hover { background: #f0fdf4; border-color: #166534; }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ─────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'settingsOverlay';
  overlay.onclick = function (e) { if (e.target === overlay) closeSettingsPanel(); };

  const panel = document.createElement('div');
  panel.id = 'settingsPanel';
  panel.innerHTML = `
    <div class="sp-header">
      <h3>⚙️ Account Settings</h3>
      <button class="sp-close-btn" onclick="closeSettingsPanel()">✕</button>
    </div>
    <div class="sp-body">

      <!-- Change Username -->
      <div class="sp-section">
        <div class="sp-section-title">👤 Change Username</div>

        <!-- Step 1: enter new username -->
        <div id="sp-uname-step1">
          <label class="sp-label">New Username</label>
          <input type="text" class="sp-input" id="sp-new-uname"
            placeholder="e.g. john_doe123" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false"
            oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,20)">
          <p style="font-size:11px;color:#9caa9f;margin:0 0 10px;">3–20 chars. Lowercase, numbers, dots and underscores only.</p>
          <button class="sp-btn sp-btn-primary" id="sp-uname-btn" onclick="settingsSendUnameOtp()">Send OTP to Verify</button>
          <div class="sp-status" id="sp-uname-status"></div>
        </div>

        <!-- Step 2: enter OTP -->
        <div id="sp-uname-step2" style="display:none;">
          <div style="text-align:center;padding:10px 0 14px;">
            <div style="font-size:32px;margin-bottom:8px;">📨</div>
            <p style="font-size:14px;font-weight:600;color:#2e6b4e;margin-bottom:4px;">Enter OTP Code</p>
            <p style="font-size:12px;color:#6b8070;line-height:1.5;">We sent a 6-digit code to your registered email to confirm this change.</p>
          </div>
          <label class="sp-label">6-Digit OTP Code</label>
          <input type="text" class="sp-input" id="sp-uname-otp-input"
            placeholder="000000" maxlength="6" inputmode="numeric" pattern="[0-9]*"
            oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,6)"
            style="font-size:24px;font-weight:700;letter-spacing:10px;text-align:center;font-family:monospace;">
          <button class="sp-btn sp-btn-primary" id="sp-uname-verify-btn" onclick="settingsVerifyUnameOtp()" style="margin-top:8px;">Verify & Change Username</button>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button onclick="settingsResetUnameStep()" style="flex:1;padding:10px;background:transparent;color:#6b8070;border:1.5px solid #dde8e2;border-radius:10px;font-size:12px;cursor:pointer;font-family:inherit;">← Back</button>
            <button id="sp-uname-resend-btn" onclick="settingsResendUnameOtp()" style="flex:1;padding:10px;background:transparent;color:#2e6b4e;border:1.5px solid #2e6b4e;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Resend Code</button>
          </div>
          <div class="sp-status" id="sp-uname-otp-status"></div>
        </div>
      </div>

      <!-- Change Email -->
      <div class="sp-section">
        <div class="sp-section-title">📧 Change Login Email</div>

        <!-- Step 1: enter new email -->
        <div id="sp-email-step1">
          <label class="sp-label">New Email Address</label>
          <input type="email" class="sp-input" id="sp-new-email" placeholder="new@example.com" autocomplete="email">
          <label class="sp-label">Confirm New Email</label>
          <input type="email" class="sp-input" id="sp-confirm-email" placeholder="Repeat new email">
          <button class="sp-btn sp-btn-primary" id="sp-email-btn" onclick="settingsSendEmailOtp()">Send OTP Code</button>
          <div class="sp-status" id="sp-email-status"></div>
          <p style="font-size:11px;color:#9caa9f;margin-top:8px;">A 6-digit verification code will be sent to your new email address.</p>
        </div>

        <!-- Step 2: Enter OTP -->
        <div id="sp-email-step2" style="display:none;">
          <div style="text-align:center;padding:10px 0 14px;">
            <div style="font-size:32px;margin-bottom:8px;">📨</div>
            <p style="font-size:14px;font-weight:600;color:#2e6b4e;margin-bottom:4px;">Enter OTP Code</p>
            <p style="font-size:12px;color:#6b8070;line-height:1.5;">We sent a 6-digit code to <strong id="sp-email-otp-sent-to" style="color:#2e6b4e;"></strong></p>
          </div>
          <label class="sp-label">6-Digit OTP Code</label>
          <input type="text" class="sp-input" id="sp-email-otp-input"
            placeholder="000000" maxlength="6" inputmode="numeric" pattern="[0-9]*"
            oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,6)"
            style="font-size:24px;font-weight:700;letter-spacing:10px;text-align:center;font-family:monospace;">
          <button class="sp-btn sp-btn-primary" id="sp-email-verify-btn" onclick="settingsVerifyEmailOtp()" style="margin-top:8px;">Verify & Change Email</button>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button onclick="settingsResetEmailStep()" style="flex:1;padding:10px;background:transparent;color:#6b8070;border:1.5px solid #dde8e2;border-radius:10px;font-size:12px;cursor:pointer;font-family:inherit;">← Back</button>
            <button id="sp-email-resend-btn" onclick="settingsResendEmailOtp()" style="flex:1;padding:10px;background:transparent;color:#2e6b4e;border:1.5px solid #2e6b4e;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Resend Code</button>
          </div>
          <div class="sp-status" id="sp-email-otp-status"></div>
        </div>
      </div>

      <!-- Change Password -->
      <div class="sp-section">
        <div class="sp-section-title">🔒 Change Password</div>

        <!-- Step 1: request OTP -->
        <div id="sp-pw-step1">
          <p style="font-size:12px;color:#6b8070;margin-bottom:10px;line-height:1.5;">For security, we'll send a 6-digit OTP to your email before you can change your password.</p>
          <button class="sp-btn sp-btn-primary" id="sp-pw-send-otp-btn" onclick="settingsSendPwOtp()">Send OTP to My Email</button>
          <div class="sp-status" id="sp-pw-otp-send-status"></div>
        </div>

        <!-- Step 2: verify OTP -->
        <div id="sp-pw-step2" style="display:none;">
          <div style="text-align:center;padding:10px 0 14px;">
            <div style="font-size:32px;margin-bottom:8px;">📨</div>
            <p style="font-size:14px;font-weight:600;color:#2e6b4e;margin-bottom:4px;">Enter OTP Code</p>
            <p style="font-size:12px;color:#6b8070;">Code sent to your registered email</p>
          </div>
          <label class="sp-label">6-Digit OTP Code</label>
          <input type="text" class="sp-input" id="sp-pw-otp-input"
            placeholder="000000" maxlength="6" inputmode="numeric" pattern="[0-9]*"
            oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,6)"
            style="font-size:24px;font-weight:700;letter-spacing:10px;text-align:center;font-family:monospace;">
          <button class="sp-btn sp-btn-primary" id="sp-pw-verify-otp-btn" onclick="settingsVerifyPwOtp()" style="margin-top:8px;">Verify OTP</button>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button onclick="settingsResetPwStep()" style="flex:1;padding:10px;background:transparent;color:#6b8070;border:1.5px solid #dde8e2;border-radius:10px;font-size:12px;cursor:pointer;font-family:inherit;">← Back</button>
            <button id="sp-pw-resend-otp-btn" onclick="settingsResendPwOtp()" style="flex:1;padding:10px;background:transparent;color:#2e6b4e;border:1.5px solid #2e6b4e;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Resend</button>
          </div>
          <div class="sp-status" id="sp-pw-otp-status"></div>
        </div>

        <!-- Step 3: set new password (after OTP verified) -->
        <div id="sp-pw-step3" style="display:none;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:12px;">
            <p style="font-size:12px;color:#166534;font-weight:600;margin:0;">✅ OTP Verified — set your new password below</p>
          </div>
          <label class="sp-label">New Password</label>
          <input type="password" class="sp-input" id="sp-new-pw" placeholder="Min 8 characters" autocomplete="new-password">
          <label class="sp-label">Confirm New Password</label>
          <input type="password" class="sp-input" id="sp-confirm-pw" placeholder="Repeat new password" autocomplete="new-password">
          <button class="sp-btn sp-btn-primary" id="sp-pw-btn" onclick="settingsSavePassword()">Update Password</button>
          <div class="sp-status" id="sp-pw-status"></div>
        </div>
      </div>

      <!-- Delete Account -->
      <div class="sp-section">
        <div class="sp-section-title" style="color:#dc2626;">🗑️ Delete Account</div>

        <!-- Pending deletion state (shown when already scheduled) -->
        <div id="sp-pending-delete-area" style="display:none;">
          <div class="sp-countdown-box">
            <div class="sp-countdown-days" id="sp-days-left">7</div>
            <div class="sp-countdown-label">days until permanent deletion</div>
            <div class="sp-countdown-date" id="sp-delete-date"></div>
          </div>
          <p style="font-size:12px;color:#9b6060;margin-bottom:10px;line-height:1.5;">
            Your account is scheduled for deletion. Log back in or cancel below to recover it.
          </p>
          <button class="sp-btn sp-btn-cancel-delete" onclick="settingsCancelDeletion()">
            ↩ Cancel Deletion & Keep My Account
          </button>
          <div class="sp-status" id="sp-cancel-status"></div>
        </div>

        <!-- Normal state (request deletion) -->
        <div id="sp-normal-delete-area">
          <div class="sp-delete-info">
            Your account will be <strong>scheduled for deletion</strong>. You have <strong>7 days</strong> to
            recover it by logging back in. After 7 days, your data will be permanently removed.
          </div>
          <label class="sp-label">Confirm with your password</label>
          <input type="password" class="sp-input" id="sp-delete-pw" placeholder="Enter your password">
          <div id="sp-delete-confirm-area" style="display:none;margin-bottom:10px;">
            <p style="font-size:12px;color:#dc2626;font-weight:600;margin-bottom:8px;">
              ⚠️ Are you absolutely sure? Type <strong>DELETE</strong> below to confirm.
            </p>
            <input type="text" class="sp-input" id="sp-delete-confirm-word" placeholder="Type DELETE to confirm"
              oninput="document.getElementById('sp-delete-final-btn').disabled = this.value !== 'DELETE'">
            <button class="sp-btn sp-btn-danger" id="sp-delete-final-btn" disabled onclick="settingsDeleteAccount()">
              Yes, Delete My Account
            </button>
          </div>
          <button class="sp-btn sp-btn-danger" id="sp-delete-btn" onclick="settingsShowDeleteConfirm()">
            Request Account Deletion
          </button>
        </div>

        <div class="sp-status" id="sp-delete-status"></div>
      </div>

    </div>
    <div class="sp-footer">BreedLink · Account changes are secure and encrypted</div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  // ── Panel open/close ────────────────────────────────────────────────────────
  window.openSettingsPanel = async function () {
    overlay.classList.add('open');
    panel.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Reset all multi-step sections to step 1
    if (typeof window.settingsResetUnameStep === 'function') window.settingsResetUnameStep();
    if (typeof window.settingsResetEmailStep === 'function') window.settingsResetEmailStep();
    if (typeof window.settingsResetPwStep === 'function') window.settingsResetPwStep();
    await checkPendingDeletion();
  };

  window.closeSettingsPanel = function () {
    overlay.classList.remove('open');
    panel.classList.remove('open');
    document.body.style.overflow = '';
  };

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) closeSettingsPanel();
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function setStatus(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'sp-status ' + type;
  }

  function clearStatus(id) {
    const el = document.getElementById(id);
    el.className = 'sp-status';
  }

  // ── Change Email (OTP flow) ──────────────────────────────────────────────
  var _spPendingNewEmail = null;


  // ── Shared OTP resend countdown (2 minutes) ────────────────────────────
  function startOtpResendCountdown(btnId, seconds) {
    seconds = seconds || 120;
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = true;
    var timer = setInterval(function() {
      seconds--;
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      btn.textContent = 'Resend in ' + m + ':' + (s < 10 ? '0' : '') + s;
      if (seconds <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = 'Resend Code';
      }
    }, 1000);
  }

  window.settingsResetEmailStep = function () {
    _spPendingNewEmail = null;
    document.getElementById('sp-email-step1').style.display = 'block';
    document.getElementById('sp-email-step2').style.display = 'none';
    if (document.getElementById('sp-email-otp-input')) document.getElementById('sp-email-otp-input').value = '';
    clearStatus('sp-email-status');
    clearStatus('sp-email-otp-status');
  };

  window.settingsSendEmailOtp = async function () {
    const newEmail     = document.getElementById('sp-new-email').value.trim();
    const confirmEmail = document.getElementById('sp-confirm-email').value.trim();
    clearStatus('sp-email-status');

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setStatus('sp-email-status', 'Please enter a valid email address.', 'error'); return;
    }
    if (newEmail !== confirmEmail) {
      setStatus('sp-email-status', 'Email addresses do not match.', 'error'); return;
    }

    const btn = document.getElementById('sp-email-btn');
    btn.disabled = true; btn.textContent = 'Sending OTP...';

    try {
      const { error } = await window.supabase.auth.signInWithOtp({
        email: newEmail,
        options: { shouldCreateUser: false }
      });
      if (error && !error.message.toLowerCase().includes('rate')) throw error;

      _spPendingNewEmail = newEmail;
      window.localStorage.setItem('breedlink_ce_email', newEmail);
      document.getElementById('sp-email-otp-sent-to').textContent = newEmail;
      document.getElementById('sp-email-step1').style.display = 'none';
      document.getElementById('sp-email-step2').style.display = 'block';
      setTimeout(function() { document.getElementById('sp-email-otp-input').focus(); }, 100);
      startOtpResendCountdown('sp-email-resend-btn');
    } catch (err) {
      setStatus('sp-email-status', '❌ ' + (err.message || 'Failed to send OTP.'), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Send OTP Code';
    }
  };

  window.settingsVerifyEmailOtp = async function () {
    const otp = document.getElementById('sp-email-otp-input').value.trim();
    const newEmail = _spPendingNewEmail || window.localStorage.getItem('breedlink_ce_email');
    clearStatus('sp-email-otp-status');

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setStatus('sp-email-otp-status', 'Please enter the 6-digit code.', 'error'); return;
    }
    const btn = document.getElementById('sp-email-verify-btn');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      const { error: verifyError } = await window.supabase.auth.verifyOtp({
        email: newEmail, token: otp, type: 'email'
      });
      if (verifyError) throw verifyError;

      const { error: updateError } = await window.supabase.auth.updateUser({ email: newEmail });
      if (updateError) throw updateError;

      const user = typeof User !== 'undefined' ? User.getUser() : null;
      if (user) {
        await window.supabase.from('profiles')
          .update({ contact: { ...user.contact, email: newEmail } })
          .eq('id', user.id);
      }
      window.localStorage.removeItem('breedlink_ce_email');
      setStatus('sp-email-otp-status', '✅ Email updated successfully!', 'success');
      setTimeout(function () { window.settingsResetEmailStep(); clearStatus('sp-email-otp-status'); }, 3000);
    } catch (err) {
      setStatus('sp-email-otp-status', '❌ ' + (err.message || 'Invalid or expired code.'), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Verify & Change Email';
    }
  };

  window.settingsResendEmailOtp = async function () {
    const newEmail = _spPendingNewEmail || window.localStorage.getItem('breedlink_ce_email');
    if (!newEmail) return;
    const btn = document.getElementById('sp-email-resend-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const { error } = await window.supabase.auth.signInWithOtp({
        email: newEmail, options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setStatus('sp-email-otp-status', '✅ OTP resent! Check your inbox.', 'success');
      setTimeout(function () { clearStatus('sp-email-otp-status'); }, 4000);
    } catch (e) {
      setStatus('sp-email-otp-status', '❌ Failed to resend. Please wait a moment.', 'error');
    } finally {
      startOtpResendCountdown('sp-email-resend-btn');
    }
  };

  // ── Change Username (OTP flow) ──────────────────────────────────────────────
  var _spPendingNewUname = null;

  window.settingsResetUnameStep = function () {
    _spPendingNewUname = null;
    document.getElementById('sp-uname-step1').style.display = 'block';
    document.getElementById('sp-uname-step2').style.display = 'none';
    var otpInput = document.getElementById('sp-uname-otp-input');
    if (otpInput) otpInput.value = '';
    clearStatus('sp-uname-status');
    clearStatus('sp-uname-otp-status');
  };

  window.settingsSendUnameOtp = async function () {
    var newUname = document.getElementById('sp-new-uname').value.trim();
    clearStatus('sp-uname-status');

    // Validate format against username_format check constraint: ^[a-z0-9_.]{3,20}$
    if (!newUname || !/^[a-z0-9_.]{3,20}$/.test(newUname)) {
      setStatus('sp-uname-status', 'Username must be 3–20 characters: lowercase letters, numbers, dots, underscores only.', 'error');
      return;
    }

    // Check if username is already taken
    var btn = document.getElementById('sp-uname-btn');
    btn.disabled = true; btn.textContent = 'Checking...';
    try {
      var { data: existing, error: checkErr } = await window.supabase
        .from('profiles')
        .select('id')
        .eq('username', newUname)
        .limit(1);
      if (checkErr) throw checkErr;
      if (existing && existing.length > 0) {
        setStatus('sp-uname-status', '❌ That username is already taken. Please choose another.', 'error');
        btn.disabled = false; btn.textContent = 'Send OTP to Verify';
        return;
      }

      // Send OTP to current email
      btn.textContent = 'Sending OTP...';
      var { data: { user: sessionUser } } = await window.supabase.auth.getUser();
      var email = sessionUser && sessionUser.email;
      if (!email) throw new Error('Could not determine your email. Please log in again.');

      var { error: otpErr } = await window.supabase.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: false }
      });
      if (otpErr && !otpErr.message.toLowerCase().includes('rate')) throw otpErr;

      _spPendingNewUname = newUname;
      window.localStorage.setItem('breedlink_cu_uname', newUname);
      document.getElementById('sp-uname-step1').style.display = 'none';
      document.getElementById('sp-uname-step2').style.display = 'block';
      setTimeout(function () { document.getElementById('sp-uname-otp-input').focus(); }, 100);
      startOtpResendCountdown('sp-uname-resend-btn');
    } catch (err) {
      setStatus('sp-uname-status', '❌ ' + (err.message || 'Failed to send OTP.'), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Send OTP to Verify';
    }
  };

  window.settingsVerifyUnameOtp = async function () {
    var otp = document.getElementById('sp-uname-otp-input').value.trim();
    var newUname = _spPendingNewUname || window.localStorage.getItem('breedlink_cu_uname');
    clearStatus('sp-uname-otp-status');

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setStatus('sp-uname-otp-status', 'Please enter the 6-digit code.', 'error'); return;
    }
    if (!newUname) {
      setStatus('sp-uname-otp-status', 'Session expired. Please go back and try again.', 'error'); return;
    }

    var btn = document.getElementById('sp-uname-verify-btn');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      var { data: { user: sessionUser } } = await window.supabase.auth.getUser();
      var email = sessionUser && sessionUser.email;
      if (!email) throw new Error('Not authenticated.');

      // Verify OTP
      var { error: verifyErr } = await window.supabase.auth.verifyOtp({
        email: email, token: otp, type: 'email'
      });
      if (verifyErr) throw verifyErr;

      // Update username in profiles table
      var { error: updateErr } = await window.supabase
        .from('profiles')
        .update({ username: newUname })
        .eq('id', sessionUser.id);
      if (updateErr) {
        if (updateErr.message && updateErr.message.toLowerCase().includes('unique')) {
          throw new Error('That username was just taken. Please go back and choose another.');
        }
        throw updateErr;
      }

      window.localStorage.removeItem('breedlink_cu_uname');
      setStatus('sp-uname-otp-status', '✅ Username updated to @' + newUname + '!', 'success');
      setTimeout(function () {
        window.settingsResetUnameStep();
        clearStatus('sp-uname-otp-status');
        document.getElementById('sp-new-uname').value = '';
      }, 3000);
    } catch (err) {
      setStatus('sp-uname-otp-status', '❌ ' + (err.message || 'Invalid or expired code.'), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Verify & Change Username';
    }
  };

  window.settingsResendUnameOtp = async function () {
    var btn = document.getElementById('sp-uname-resend-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      var { data: { user: sessionUser } } = await window.supabase.auth.getUser();
      var email = sessionUser && sessionUser.email;
      if (!email) throw new Error('Not authenticated.');
      var { error } = await window.supabase.auth.signInWithOtp({
        email: email, options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setStatus('sp-uname-otp-status', '✅ OTP resent! Check your inbox.', 'success');
      setTimeout(function () { clearStatus('sp-uname-otp-status'); }, 4000);
    } catch (e) {
      setStatus('sp-uname-otp-status', '❌ Failed to resend. Please wait a moment.', 'error');
    } finally {
      startOtpResendCountdown('sp-uname-resend-btn');
    }
  };

  // ── Change Password (OTP flow) ───────────────────────────────────────────
  var _spPwOtpVerified = false;

  window.settingsResetPwStep = function () {
    _spPwOtpVerified = false;
    document.getElementById('sp-pw-step1').style.display = 'block';
    document.getElementById('sp-pw-step2').style.display = 'none';
    document.getElementById('sp-pw-step3').style.display = 'none';
    if (document.getElementById('sp-pw-otp-input')) document.getElementById('sp-pw-otp-input').value = '';
    clearStatus('sp-pw-otp-send-status');
    clearStatus('sp-pw-otp-status');
    clearStatus('sp-pw-status');
  };

  window.settingsSendPwOtp = async function () {
    const { data: { user: sessionUser } } = await window.supabase.auth.getUser();
    const email = sessionUser?.email;
    if (!email) { setStatus('sp-pw-otp-send-status', 'Could not determine your email. Please log in again.', 'error'); return; }
    const btn = document.getElementById('sp-pw-send-otp-btn');
    btn.disabled = true; btn.textContent = 'Sending OTP...';
    clearStatus('sp-pw-otp-send-status');
    try {
      const { error } = await window.supabase.auth.signInWithOtp({
        email: email, options: { shouldCreateUser: false }
      });
      if (error && !error.message.toLowerCase().includes('rate')) throw error;
      document.getElementById('sp-pw-step1').style.display = 'none';
      document.getElementById('sp-pw-step2').style.display = 'block';
      setTimeout(function() { document.getElementById('sp-pw-otp-input').focus(); }, 100);
      startOtpResendCountdown('sp-pw-resend-otp-btn');
    } catch (err) {
      setStatus('sp-pw-otp-send-status', '❌ ' + (err.message || 'Failed to send OTP.'), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Send OTP to My Email';
    }
  };

  window.settingsVerifyPwOtp = async function () {
    const otp = document.getElementById('sp-pw-otp-input').value.trim();
    const { data: { user: sessionUser } } = await window.supabase.auth.getUser();
    const email = sessionUser?.email;
    clearStatus('sp-pw-otp-status');
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setStatus('sp-pw-otp-status', 'Please enter the 6-digit code.', 'error'); return;
    }
    const btn = document.getElementById('sp-pw-verify-otp-btn');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      const { error } = await window.supabase.auth.verifyOtp({
        email: email, token: otp, type: 'email'
      });
      if (error) throw error;
      _spPwOtpVerified = true;
      document.getElementById('sp-pw-step2').style.display = 'none';
      document.getElementById('sp-pw-step3').style.display = 'block';
      setTimeout(function() { document.getElementById('sp-new-pw').focus(); }, 100);
    } catch (err) {
      setStatus('sp-pw-otp-status', '❌ ' + (err.message || 'Invalid or expired code.'), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Verify OTP';
    }
  };

  window.settingsResendPwOtp = async function () {
    const { data: { user: sessionUser } } = await window.supabase.auth.getUser();
    const email = sessionUser?.email;
    if (!email) return;
    const btn = document.getElementById('sp-pw-resend-otp-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const { error } = await window.supabase.auth.signInWithOtp({
        email: email, options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setStatus('sp-pw-otp-status', '✅ New OTP sent!', 'success');
      setTimeout(function () { clearStatus('sp-pw-otp-status'); }, 4000);
    } catch (e) {
      setStatus('sp-pw-otp-status', '❌ Failed to resend.', 'error');
    } finally {
      startOtpResendCountdown('sp-pw-resend-otp-btn');
    }
  };

  window.settingsSavePassword = async function () {
    if (!_spPwOtpVerified) {
      setStatus('sp-pw-status', 'Please verify your OTP first.', 'error'); return;
    }
    const newPw   = document.getElementById('sp-new-pw').value;
    const confirm = document.getElementById('sp-confirm-pw').value;
    clearStatus('sp-pw-status');
    if (newPw.length < 8) { setStatus('sp-pw-status', 'New password must be at least 8 characters.', 'error'); return; }
    if (newPw !== confirm) { setStatus('sp-pw-status', 'New passwords do not match.', 'error'); return; }
    const btn = document.getElementById('sp-pw-btn');
    btn.disabled = true; btn.textContent = 'Updating...';
    try {
      const { error } = await window.supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setStatus('sp-pw-status', '✅ Password updated successfully!', 'success');
      _spPwOtpVerified = false;
      document.getElementById('sp-new-pw').value = '';
      document.getElementById('sp-confirm-pw').value = '';
      setTimeout(function () { window.settingsResetPwStep(); clearStatus('sp-pw-status'); }, 2500);
    } catch (err) {
      setStatus('sp-pw-status', '❌ ' + (err.message || 'Failed to update password.'), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Update Password';
    }
  };

  // ── Delete Account ───────────────────────────────────────────────────────────

  async function checkPendingDeletion() {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await window.supabase
        .from('profiles')
        .select('deletion_deadline')
        .eq('id', user.id)
        .single();
      if (profile && profile.deletion_deadline) {
        showDeletionCountdown(profile.deletion_deadline);
      } else {
        showNormalDeleteArea();
      }
    } catch (e) { /* not critical */ }
  }

  function showDeletionCountdown(deadline) {
    const deadlineMs = new Date(deadline).getTime();
    const now = Date.now();
    const daysLeft = Math.max(0, Math.ceil((deadlineMs - now) / 86400000));
    const dateStr = new Date(deadline).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    document.getElementById('sp-days-left').textContent = daysLeft;
    document.getElementById('sp-delete-date').textContent = 'Deletes permanently on: ' + dateStr;
    document.getElementById('sp-pending-delete-area').style.display = 'block';
    document.getElementById('sp-normal-delete-area').style.display = 'none';
  }

  function showNormalDeleteArea() {
    document.getElementById('sp-pending-delete-area').style.display = 'none';
    document.getElementById('sp-normal-delete-area').style.display = 'block';
    document.getElementById('sp-delete-btn').style.display = 'block';
    document.getElementById('sp-delete-confirm-area').style.display = 'none';
    document.getElementById('sp-delete-pw').value = '';
    const word = document.getElementById('sp-delete-confirm-word');
    if (word) word.value = '';
  }

  window.settingsShowDeleteConfirm = function () {
    const pw = document.getElementById('sp-delete-pw').value;
    if (!pw) {
      setStatus('sp-delete-status', 'Please enter your password first.', 'error'); return;
    }
    clearStatus('sp-delete-status');
    document.getElementById('sp-delete-btn').style.display = 'none';
    document.getElementById('sp-delete-confirm-area').style.display = 'block';
  };

  window.settingsDeleteAccount = async function () {
    const pw = document.getElementById('sp-delete-pw').value;
    clearStatus('sp-delete-status');

    const finalBtn = document.getElementById('sp-delete-final-btn');
    finalBtn.disabled = true; finalBtn.textContent = 'Scheduling deletion...';

    try {
      await window.AccountSettings.deleteAccount(pw);
      // deleteAccount signs the user out — page will redirect
    } catch (err) {
      setStatus('sp-delete-status', '❌ ' + (err.message || 'Failed to delete account.'), 'error');
      finalBtn.disabled = false; finalBtn.textContent = 'Yes, Delete My Account';
      document.getElementById('sp-delete-confirm-area').style.display = 'none';
      document.getElementById('sp-delete-btn').style.display = 'block';
      document.getElementById('sp-delete-confirm-word').value = '';
    }
  };

  window.settingsCancelDeletion = async function () {
    const btn = document.querySelector('.sp-btn-cancel-delete');
    btn.disabled = true; btn.textContent = 'Cancelling...';
    clearStatus('sp-cancel-status');
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');
      const { error } = await window.supabase
        .from('profiles')
        .update({ deletion_requested_at: null, deletion_deadline: null, is_deleted: false })
        .eq('id', user.id);
      if (error) throw error;
      setStatus('sp-cancel-status', '✅ Deletion cancelled. Your account is safe!', 'success');
      setTimeout(() => { showNormalDeleteArea(); clearStatus('sp-cancel-status'); }, 1800);
    } catch (err) {
      setStatus('sp-cancel-status', '❌ ' + (err.message || 'Failed to cancel. Try again.'), 'error');
      btn.disabled = false; btn.textContent = '↩ Cancel Deletion & Keep My Account';
    }
  };
})();
