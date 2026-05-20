// Extracted inline script from signup.html
var currentStep = 1;
    var selectedAccountType = 'breeder';
    var TOTAL_STEPS = 3;
    var pendingSignupData = null;
    var _usernameAvail = null;  // null=unknown, true=available, false=taken
    var _emailAvail = null;     // null=unknown, true=available, false=taken

    // ── Real-time username/email availability debounce ──────────────────────
    var _usernameTimer = null;
    var _emailTimer = null;

    function debounceCheckUsername(val) {
      clearTimeout(_usernameTimer);
      _usernameAvail = null;
      var el = document.getElementById('usernameAvailability');
      if (!val || val.length < 3 || val.length > 20) { el.style.display = 'none'; return; }
      el.textContent = '⏳ Checking...';
      el.style.color = '#9caa9f';
      el.style.display = 'block';
      _usernameTimer = setTimeout(async function() {
        try {
          const { data, error } = await window.supabase
            .from('profiles')
            .select('username')
            .eq('username', val)
            .maybeSingle();
          if (error) { el.style.display = 'none'; return; }
          if (data) {
            _usernameAvail = false;
            el.textContent = '❌ Username already taken';
            el.style.color = '#dc2626';
            document.getElementById('username').classList.add('error');
          } else {
            _usernameAvail = true;
            el.textContent = '✅ Username available';
            el.style.color = '#16a34a';
            document.getElementById('username').classList.remove('error');
          }
        } catch(e) { el.style.display = 'none'; }
      }, 500);
    }

    function debounceCheckEmail(val) {
      clearTimeout(_emailTimer);
      _emailAvail = null;
      var el = document.getElementById('emailAvailability');
      if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { el.style.display = 'none'; return; }
      el.textContent = '⏳ Checking...';
      el.style.color = '#9caa9f';
      el.style.display = 'block';
      _emailTimer = setTimeout(async function() {
        try {
          const { data, error } = await window.supabase
            .from('profiles')
            .select('id')
            .filter('contact->>email', 'eq', val)
            .maybeSingle();
          if (error) { el.style.display = 'none'; return; }
          if (data) {
            _emailAvail = false;
            el.textContent = '❌ Email already registered';
            el.style.color = '#dc2626';
            document.getElementById('emailAddress').classList.add('error');
          } else {
            _emailAvail = true;
            el.textContent = '✅ Email available';
            el.style.color = '#16a34a';
            document.getElementById('emailAddress').classList.remove('error');
          }
        } catch(e) { el.style.display = 'none'; }
      }, 600);
    }

    function updateProgress(step) {
      var displayStep = Math.min(step, TOTAL_STEPS);
      var pct = ((displayStep - 1) / (TOTAL_STEPS - 1)) * 100;
      document.getElementById('progressFill').style.width = pct + '%';
      for (var i = 1; i <= TOTAL_STEPS; i++) {
        var s = document.getElementById('step' + i);
        s.classList.remove('active', 'completed');
        if (i < displayStep) s.classList.add('completed');
        if (i === displayStep) s.classList.add('active');
      }
    }

    function goToStep(n) {
      document.getElementById('formStep' + currentStep).classList.remove('active');
      currentStep = n;
      document.getElementById('formStep' + currentStep).classList.add('active');
      updateProgress(currentStep);
    }

    async function checkUsernameAvailable(username) {
      try {
        const { data, error } = await window.supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();
        if (error) return true;
        return !data;
      } catch (e) {
        return true;
      }
    }

    async function goToStep2() {
      var name     = document.getElementById('fullName').value.trim();
      var username = document.getElementById('username').value.trim();
      var email    = document.getElementById('emailAddress').value.trim();
      var valid    = true;

      if (!name || name.length < 2) {
        document.getElementById('nameError').classList.add('visible');
        document.getElementById('fullName').classList.add('error');
        valid = false;
      } else {
        document.getElementById('nameError').classList.remove('visible');
        document.getElementById('fullName').classList.remove('error');
      }

      if (!username || username.length < 3 || username.length > 20) {
        document.getElementById('usernameError').textContent = 'Username must be 3–20 characters.';
        document.getElementById('usernameError').classList.add('visible');
        document.getElementById('username').classList.add('error');
        valid = false;
      } else {
        document.getElementById('usernameError').classList.remove('visible');
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('emailError').classList.add('visible');
        document.getElementById('emailAddress').classList.add('error');
        valid = false;
      } else {
        document.getElementById('emailError').classList.remove('visible');
        document.getElementById('emailAddress').classList.remove('error');
      }

      if (!valid) return;

      const btn = document.querySelector('#formStep1 .btn-primary');
      btn.disabled = true;
      btn.textContent = 'Checking...';

      // Check username availability (use cached result if available)
      if (_usernameAvail === null) {
        const available = await checkUsernameAvailable(username);
        _usernameAvail = available;
      }
      if (!_usernameAvail) {
        document.getElementById('usernameError').textContent = 'This username is already taken.';
        document.getElementById('usernameError').classList.add('visible');
        document.getElementById('username').classList.add('error');
        btn.disabled = false;
        btn.textContent = 'Continue →';
        return;
      }

      // Check email availability (use cached result if available)
      if (_emailAvail === null) {
        try {
          const { data, error } = await window.supabase
            .from('profiles')
            .select('id')
            .filter('contact->>email', 'eq', email)
            .maybeSingle();
          _emailAvail = error ? true : !data;
        } catch(e) { _emailAvail = true; }
      }
      if (!_emailAvail) {
        document.getElementById('emailError').textContent = 'This email is already registered.';
        document.getElementById('emailError').classList.add('visible');
        document.getElementById('emailAddress').classList.add('error');
        btn.disabled = false;
        btn.textContent = 'Continue →';
        return;
      }

      btn.disabled = false;
      btn.textContent = 'Continue →';
      goToStep(2);
    }

    function goToStep3() { goToStep(3); }

    function selectType(el, type) {
      document.querySelectorAll('.account-type').forEach(function(t) { t.classList.remove('selected'); });
      el.classList.add('selected');
      selectedAccountType = type;
    }

    function togglePassword(id, icon) {
      var input = document.getElementById(id);
      if (input.type === 'password') { input.type = 'text'; icon.textContent = '🙈'; }
      else { input.type = 'password'; icon.textContent = '👁️'; }
    }

    function checkPasswordStrength(pw) {
      var segs = [document.getElementById('seg1'), document.getElementById('seg2'), document.getElementById('seg3')];
      var txt  = document.getElementById('strengthText');
      segs.forEach(function(s) { s.className = 'strength-segment'; });
      if (pw.length === 0) { txt.textContent = 'Enter a password'; return; }
      var score = 0;
      if (pw.length >= 8) score++;
      if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;
      var levels = [{ cls: 'weak', label: 'Weak' }, { cls: 'medium', label: 'Medium' }, { cls: 'strong', label: 'Strong' }];
      for (var i = 0; i < score; i++) segs[i].classList.add(levels[score - 1].cls);
      txt.textContent = levels[Math.max(0, score - 1)].label;
    }

    // ── createAccount: registers with Supabase, Supabase sends confirmation email ──
    async function createAccount() {
      var pw  = document.getElementById('password').value;
      var cpw = document.getElementById('confirmPassword').value;
      var termsChecked = document.getElementById('terms').checked;
      var valid = true;

      if (pw.length < 8) {
        document.getElementById('passwordError').classList.add('visible');
        document.getElementById('password').classList.add('error');
        valid = false;
      } else {
        document.getElementById('passwordError').classList.remove('visible');
        document.getElementById('password').classList.remove('error');
      }
      if (pw !== cpw) {
        document.getElementById('confirmError').classList.add('visible');
        document.getElementById('confirmPassword').classList.add('error');
        valid = false;
      } else {
        document.getElementById('confirmError').classList.remove('visible');
        document.getElementById('confirmPassword').classList.remove('error');
      }
      if (!termsChecked) {
        var grp = document.getElementById('termsCheckboxGroup');
        grp.classList.remove('shake'); void grp.offsetWidth; grp.classList.add('shake');
        setTimeout(function() { grp.classList.remove('shake'); }, 500);
        if (typeof showToast === 'function') showToast('You must agree to the Terms & Conditions.', 'error');
        valid = false;
      }
      if (!valid) return;

      var btn = document.getElementById('createBtn');
      btn.disabled = true;
      btn.textContent = 'Creating account...';

      var name     = document.getElementById('fullName').value.trim();
      var username = document.getElementById('username').value.trim();
      var email    = document.getElementById('emailAddress').value.trim();

      pendingSignupData = { name: name, username: username, email: email, password: pw, accountType: selectedAccountType };

      try {

        const { data: signUpData, error: signUpError } = await window.supabase.auth.signUp({
          email: email,
          password: pw,
          options: {
            data: {
              name: name,
              username: username,
              account_type: selectedAccountType,
              location: ''
            }
          }
        });
        if (signUpError) throw signUpError;
        if (!signUpData || !signUpData.user) throw new Error('Signup failed. Please try again.');

        // Store pending data so verify-otp.html can create the profile after verification.
        // sessionStorage is tab-scoped and clears on close — sufficient for the OTP flow.
        const pendingPayload = JSON.stringify({
          userId:      signUpData.user.id,
          email:       email,
          phone:       '',
          name:        name,
          username:    username,
          accountType: selectedAccountType,
          location:    ''
        });
        sessionStorage.setItem('breedlink_pending_signup', pendingPayload);

        // If Supabase returned a session immediately (email confirmation disabled),
        // create the profile now and go straight to profile page
        if (signUpData.session) {
          await window.supabase.from('profiles').upsert({
            id: signUpData.user.id,
            name: name,
            username: username,
            account_type: selectedAccountType,
            profile_picture: defaultAvatar(name),
            cover_photo: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
            bio: '', tags: [],
            contact: { email: email, phone: '', location: '' },
            stats: { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 },
            location: ''
          }, { onConflict: 'id' });
          sessionStorage.setItem('breedlink_token', signUpData.session.access_token);
          if (signUpData.session.refresh_token) {
            sessionStorage.setItem('breedlink_refresh_token', signUpData.session.refresh_token);
          }
          // Profile created — clear pending data
          sessionStorage.removeItem('breedlink_pending_signup');
          if (typeof showToast === 'function') showToast('Account created! Welcome to BREEDLINK 🐾', 'success');
          setTimeout(function() { window.location.href = 'profile.html'; }, 800);
          return;
        }

        // No session = Supabase sent a 6-digit OTP — redirect to verify page
        if (typeof showToast === 'function') showToast('Check your email for a 6-digit code! 📧', 'success');
        setTimeout(function() { window.location.href = 'verify-otp.html'; }, 900);

      } catch (err) {
        var msg = (err && err.message) || 'Failed to create account.';
        if (msg.includes('already registered') || msg.includes('User already registered')) msg = 'This email is already registered. Please log in instead.';
        if (msg.includes('rate_limit') || msg.includes('too many')) msg = 'Too many attempts. Please wait a minute.';
        if (typeof showToast === 'function') showToast(msg, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    }

    function closeCheckEmail() {
      document.getElementById('checkEmailOverlay').style.display = 'none';
      var btn = document.getElementById('createBtn');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    }

    // Allow clicking outside panel to close
    document.getElementById('checkEmailOverlay').addEventListener('click', function(e) {
      if (e.target === this) closeCheckEmail();
    });

    // Resend confirmation email via Supabase
    async function resendConfirmation() {
      var email = (pendingSignupData && pendingSignupData.email) || document.getElementById('ceSentTo').textContent.trim();
      if (!email) return;
      var btn = document.getElementById('ceResendBtn');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        var confirmUrl = window.location.origin + window.location.pathname.replace('signup.html','') + 'email-action.html';
        const { error } = await window.supabase.auth.resend({ type: 'signup', email: email, options: { emailRedirectTo: confirmUrl } });
        if (error) throw error;
        var msg = document.getElementById('ceResendMsg');
        msg.textContent = 'Email resent! Check your inbox.';
        msg.style.display = 'block';
        setTimeout(function() { msg.style.display = 'none'; }, 4000);
      } catch (err) {
        if (typeof showToast === 'function') showToast((err && err.message) || 'Failed to resend.', 'error');
      }
      // 2-minute cooldown before allowing another resend
      var _ceSeconds = 120;
      btn.textContent = 'Resend in 2:00';
      var _ceTimer = setInterval(function() {
        _ceSeconds--;
        var m = Math.floor(_ceSeconds / 60);
        var s = _ceSeconds % 60;
        btn.textContent = 'Resend in ' + m + ':' + (s < 10 ? '0' : '') + s;
        if (_ceSeconds <= 0) {
          clearInterval(_ceTimer);
          btn.disabled = false;
          btn.textContent = 'Resend Email';
        }
      }, 1000);
    }

// Expose all functions to window so onclick handlers in HTML can reach them
window.goToStep = goToStep;
window.goToStep2 = goToStep2;
window.goToStep3 = goToStep3;
window.selectType = selectType;
window.togglePassword = togglePassword;
window.createAccount = createAccount;
window.closeCheckEmail = closeCheckEmail;
window.resendConfirmation = resendConfirmation;
