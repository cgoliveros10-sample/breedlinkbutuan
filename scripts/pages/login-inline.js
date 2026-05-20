// Extracted inline script from login.html
// If already logged in (e.g. came from email confirmation), skip login page
  if (typeof User !== 'undefined' && User.isAuthenticated()) {
    window.location.replace('profile.html');
  }
  if (typeof autoFillRememberedEmail === 'function') {
    autoFillRememberedEmail();
  }

var _fpEmail = '';
  var _fpResendTimer = null;
  var _fpResendSeconds = 0;

  function startFpResendTimer() {
    var btn = document.getElementById('fpResendBtn2');
    _fpResendSeconds = 120;
    btn.disabled = true;
    btn.textContent = 'Resend in 2:00';
    if (_fpResendTimer) clearInterval(_fpResendTimer);
    _fpResendTimer = setInterval(function() {
      _fpResendSeconds--;
      var m = Math.floor(_fpResendSeconds / 60);
      var s = _fpResendSeconds % 60;
      btn.textContent = 'Resend in ' + m + ':' + (s < 10 ? '0' : '') + s;
      if (_fpResendSeconds <= 0) {
        clearInterval(_fpResendTimer);
        btn.disabled = false;
        btn.textContent = 'Resend Code';
      }
    }, 1000);
  }

  function openForgotPanel() {
    var emailVal = document.getElementById('email').value.trim();
    document.getElementById('fpEmail').value = emailVal;
    document.getElementById('fpStep1').style.display = 'block';
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpEmailError').style.display = 'none';
    document.getElementById('forgotOverlay').style.display = 'flex';
    document.getElementById('fpEmail').focus();
  }

  function closeForgotPanel() {
    document.getElementById('forgotOverlay').style.display = 'none';
  }

  function fpGoBack() {
    document.getElementById('fpStep3').style.display = 'none';
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpStep1').style.display = 'block';
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpEmailError').style.display = 'none';
  }

  document.getElementById('forgotOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeForgotPanel();
  });

  // Step 1 — send 6-digit OTP via signInWithOtp with type recovery
  async function sendForgotOtp() {
    var email = document.getElementById('fpEmail').value.trim();
    var errEl = document.getElementById('fpEmailError');
    errEl.style.display = 'none';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Please enter a valid email address.';
      errEl.style.display = 'block';
      return;
    }

    var btn = document.getElementById('fpSendBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    _fpEmail = email;

    try {
      var { error } = await window.supabase.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: false, type: 'recovery' }
      });
      if (error) throw error;

      document.getElementById('fpSentTo').textContent = email;
      document.getElementById('fpStep1').style.display = 'none';
      document.getElementById('fpStep2').style.display = 'block';
      setTimeout(function() { document.getElementById('fpOtpInput').focus(); }, 100);
      startFpResendTimer();
    } catch (err) {
      errEl.textContent = (err && err.message) || 'Failed to send OTP. Please try again.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Reset Code →';
    }
  }

  // Step 2 — verify OTP
  async function verifyForgotOtp() {
    var otp = document.getElementById('fpOtpInput').value.trim();
    var errEl = document.getElementById('fpOtpError');
    errEl.style.display = 'none';

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      errEl.textContent = 'Please enter the 6-digit code.';
      errEl.style.display = 'block';
      return;
    }

    var btn = document.getElementById('fpVerifyBtn');
    btn.disabled = true;
    btn.textContent = 'Verifying…';

    try {
      var { error } = await window.supabase.auth.verifyOtp({
        email: _fpEmail, token: otp, type: 'recovery'
      });
      if (error) throw error;

      document.getElementById('fpStep2').style.display = 'none';
      document.getElementById('fpStep3').style.display = 'block';
      setTimeout(function() { document.getElementById('fpNewPw').focus(); }, 100);
    } catch (err) {
      errEl.textContent = (err && err.message) || 'Invalid or expired code. Try again.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify Code →';
    }
  }

  // Step 3 — save new password
  async function saveForgotPassword() {
    var newPw = document.getElementById('fpNewPw').value;
    var confirmPw = document.getElementById('fpConfirmPw').value;
    var errEl = document.getElementById('fpPwError');
    errEl.style.display = 'none';

    if (newPw.length < 8) {
      errEl.textContent = 'Password must be at least 8 characters.';
      errEl.style.display = 'block'; return;
    }
    if (newPw !== confirmPw) {
      errEl.textContent = 'Passwords do not match.';
      errEl.style.display = 'block'; return;
    }

    var btn = document.getElementById('fpSavePwBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      var { error } = await window.supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      closeForgotPanel();
      if (typeof showToast === 'function') showToast('✅ Password updated! Please log in.', 'success');
    } catch (err) {
      errEl.textContent = (err && err.message) || 'Failed to update password.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save New Password →';
    }
  }

  // Resend OTP
  async function resendForgotOtp() {
    if (!_fpEmail) return;
    var btn = document.getElementById('fpResendBtn2');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      var { error } = await window.supabase.auth.signInWithOtp({
        email: _fpEmail,
        options: { shouldCreateUser: false, type: 'recovery' }
      });
      if (error) throw error;
      var msg = document.getElementById('fpResendMsg');
      msg.textContent = 'Code resent! Check your inbox.';
      msg.style.display = 'block';
      setTimeout(function() { msg.style.display = 'none'; }, 5000);
    } catch (e) {
      if (typeof showToast === 'function') showToast('Failed to resend. Please wait a moment.', 'error');
    }
    startFpResendTimer();
  }

  // Toggle password visibility
  function toggleFpPw(id, btn) {
    var inp = document.getElementById(id);
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
    else { inp.type = 'password'; btn.textContent = '👁️'; }
  }

var _dpUser = null;

  function showDeletionPrompt(user) {
    _dpUser = user;
    var deadline = user.deletion_deadline
      ? new Date(user.deletion_deadline).toLocaleDateString([], {weekday:'long',month:'long',day:'numeric',year:'numeric'})
      : 'soon';
    document.getElementById('dp-deadline').textContent = deadline;
    var overlay = document.getElementById('deletionPromptOverlay');
    overlay.style.display = 'flex';
  }

  async function cancelDeletionFromLogin() {
    if (!_dpUser) return;
    var statusEl = document.getElementById('dp-status');
    statusEl.style.color = '#6b7280';
    statusEl.textContent = 'Restoring account...';
    try {
      var res = await window.supabase.from('profiles')
        .update({ deletion_requested_at: null, deletion_deadline: null, is_deleted: false })
        .eq('id', _dpUser.id);
      if (res.error) throw res.error;
      document.getElementById('deletionPromptOverlay').style.display = 'none';
      if (typeof showToast === 'function') showToast('Welcome back, ' + _dpUser.name + '! Account restored 🎉', 'success');
      setTimeout(function() { window.location.href = 'swipe.html'; }, 900);
    } catch(e) {
      statusEl.style.color = '#dc2626';
      statusEl.textContent = '❌ Failed to restore. Please try again.';
    }
  }

  async function proceedWithDeletion() {
    try { await window.supabase.auth.signOut(); } catch(e) {}
    sessionStorage.removeItem('breedlink_token');
    sessionStorage.removeItem('breedlink_refresh_token');
    localStorage.removeItem('breedlink_refresh_token');
    sessionStorage.removeItem('breedlink_user');
    document.getElementById('deletionPromptOverlay').style.display = 'none';
    if (typeof showToast === 'function') showToast('Logged out. Your account will be deleted as scheduled.', 'info');
  }

// Expose all functions to window so onclick handlers in HTML can reach them
window.openForgotPanel = openForgotPanel;
window.closeForgotPanel = closeForgotPanel;
window.fpGoBack = fpGoBack;
window.sendForgotOtp = sendForgotOtp;
window.verifyForgotOtp = verifyForgotOtp;
window.saveForgotPassword = saveForgotPassword;
window.resendForgotOtp = resendForgotOtp;
window.toggleFpPw = toggleFpPw;
window.showDeletionPrompt = showDeletionPrompt;
window.cancelDeletionFromLogin = cancelDeletionFromLogin;
window.proceedWithDeletion = proceedWithDeletion;
