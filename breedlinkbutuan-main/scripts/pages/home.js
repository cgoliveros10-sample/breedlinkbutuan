    (function() {
      window.addEventListener('load', function() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
          setTimeout(function() {
            loader.classList.add('hidden');
          }, 800);
        }
      });
      setTimeout(function() {
        const loader = document.getElementById('pageLoader');
        if (loader && !loader.classList.contains('hidden')) {
          loader.classList.add('hidden');
        }
      }, 2000);
    })();
    
    // Animated Counter Function
    function animateCounter(element, target) {
      let current = 0;
      const duration = 2000;
      const stepTime = 20;
      const steps = duration / stepTime;
      const increment = target / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        current += increment;
        
        if (currentStep >= steps || current >= target) {
          element.textContent = target.toLocaleString() + (target < 100 ? '' : '+');
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString();
        }
      }, stepTime);
    }
    
    // Initialize Counters with Intersection Observer
    function initHomeCounters() {
      const counters = document.querySelectorAll('.stat-number');
      if (counters.length === 0) return;
      
      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const target = parseInt(entry.target.getAttribute('data-target'));
            if (!isNaN(target)) {
              animateCounter(entry.target, target);
            }
            counterObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      
      counters.forEach(counter => counterObserver.observe(counter));
    }
    
    // Initialize Scroll Reveal
    function initHomeScrollReveal() {
      const revealElements = document.querySelectorAll('.reveal');
      if (revealElements.length === 0) return;
      
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      }, { threshold: 0.1 });
      
      revealElements.forEach(el => revealObserver.observe(el));
    }
    
    // Navbar Scroll Effect
    function initHomeNavbarScroll() {
      const navbar = document.querySelector('.navigation');
      if (!navbar) return;
      
      window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      });
    }
    
    // Global Search
    function initHomeSearch() {
      const searchInput = document.getElementById('globalSearch');
      if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
              alert(`Searching for "${query}"...`);
            }
          }
        });
      }
    }
    
    // Fix: Update Get Started button + hide CTA when user is already logged in
    function initHomeAuthButtons() {
      function applyAuthState() {
        let isLoggedIn = false;

        // Check localStorage first (fastest)
        try {
          const stored = sessionStorage.getItem('breedlink_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            isLoggedIn = !!(parsed && parsed.id);
          }
        } catch (e) { /* ignore */ }

        // Also check window.Auth if available
        if (!isLoggedIn && window.Auth && window.Auth.current && window.Auth.current.id) {
          isLoggedIn = true;
        }

        // Fix: Get Started button → swipe.html when logged in
        const getStartedBtn = document.getElementById('getStartedBtn');
        if (getStartedBtn) {
          getStartedBtn.href = isLoggedIn ? 'pages/swipe.html' : 'pages/login.html';
        }

        // Fix 3: Hide "Create Free Account" CTA section when logged in
        const ctaBtn = document.getElementById('ctaCreateAccount');
        if (ctaBtn) {
          const ctaSection = ctaBtn.closest('.cta-section');
          if (ctaSection) {
            ctaSection.style.display = isLoggedIn ? 'none' : '';
          }
        }
      }

      // Run immediately
      applyAuthState();
      // Run again after auth may have resolved asynchronously
      setTimeout(applyAuthState, 600);
      setTimeout(applyAuthState, 1500);

      // Poll until window.Auth is ready, then stop
      const authPoll = setInterval(function () {
        if (window.Auth && window.Auth.current !== undefined) {
          applyAuthState();
          clearInterval(authPoll);
        }
      }, 150);
    }

    // Initialize everything when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      initHomeNavbarScroll();
      initHomeScrollReveal();
      initHomeCounters();
      initHomeSearch();
      initHomeAuthButtons();
    });