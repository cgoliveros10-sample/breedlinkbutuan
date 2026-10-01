// Extracted inline script from about.html
// Fix 2: Hide "Create Free Account" CTA section when user is already logged in
  (function hideCTAIfLoggedIn() {
    function checkAndHide() {
      const ctaBtn = document.getElementById('ctaCreateAccount');
      if (!ctaBtn) return;
      const stored = sessionStorage.getItem('breedlink_user');
      const isLoggedIn = stored && JSON.parse(stored)?.id;
      if (isLoggedIn) {
        const ctaSection = ctaBtn.closest('.cta-section');
        if (ctaSection) ctaSection.style.display = 'none';
      }
    }
    // Check immediately and after auth resolves
    checkAndHide();
    setTimeout(checkAndHide, 800);
    const authCheck = setInterval(function() {
      if (window.Auth && window.Auth.current !== undefined) {
        const ctaBtn = document.getElementById('ctaCreateAccount');
        if (!ctaBtn) { clearInterval(authCheck); return; }
        if (window.Auth.current && window.Auth.current.id) {
          const ctaSection = ctaBtn.closest('.cta-section');
          if (ctaSection) ctaSection.style.display = 'none';
        }
        clearInterval(authCheck);
      }
    }, 200);
  })();
