// terms.js — BreedLink Terms & Conditions page interactions

document.addEventListener('DOMContentLoaded', function () {

  // ── Scroll progress bar ──────────────────────────────────────────────────
  const progressBar = document.getElementById('tocProgress');

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }

  // ── Active TOC link on scroll ────────────────────────────────────────────
  const sections  = document.querySelectorAll('.terms-section');
  const tocLinks  = document.querySelectorAll('.toc-link');

  function updateActiveToc() {
    let current = '';
    sections.forEach(section => {
      const top = section.getBoundingClientRect().top;
      if (top <= 140) current = section.id;
    });

    tocLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  // ── Smooth scroll for TOC links ──────────────────────────────────────────
  tocLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const offset = 100;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  // ── Scroll event (throttled) ─────────────────────────────────────────────
  let ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        updateProgress();
        updateActiveToc();
        ticking = false;
      });
      ticking = true;
    }
  });

  // ── Navbar scroll effect ─────────────────────────────────────────────────
  const navbar = document.querySelector('.navigation');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // Initial calls
  updateProgress();
  updateActiveToc();

  // ── Hide sign-up CTA when already logged in ────────────────────────────
  function updateTermsCta() {
    const cta = document.getElementById('termsCta');
    if (!cta) return;
    try {
      const user = (typeof User !== 'undefined' && User.getUser) ? User.getUser() : null;
      const stored = sessionStorage.getItem('breedlink_user');
      if (user || stored) {
        cta.style.display = 'none';
      }
    } catch(_) {}
  }
  updateTermsCta();
  // Also run after auth module may have loaded
  setTimeout(updateTermsCta, 800);

  console.log('✅ terms.js loaded');
});
