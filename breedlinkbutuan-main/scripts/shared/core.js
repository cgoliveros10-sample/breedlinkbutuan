// ===== SIMPLE ICONS (ADDED) =====
// Replaces the old emoji on wordless buttons (like, search, message, etc.).
// Usage inside templates:  ${BL_ICON.heart(true)}   ${BL_ICON.search()}
// Icons use currentColor, so they follow the button's text color.
window.BL_ICON = (function () {
  var P = {
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    comment: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  };
  function svg(name, filled, size) {
    size = size || '1.1em';
    return '<svg class="bl-icon" xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-0.15em;">' + P[name] + '</svg>';
  }
  var api = {};
  Object.keys(P).forEach(function (name) {
    api[name] = function (filled, size) { return svg(name, filled, size); };
  });
  return api;
})();
// ===== END SIMPLE ICONS =====
// core.js — Shared utilities and page bootstrap

// ── Default avatar helper ─────────────────────────────────────────────────
// Returns a self-contained SVG data-URL showing the user's initials.
// Used everywhere a profile_picture is missing — no external request needed.
function defaultAvatar(name) {
    const n = (name || '?').trim();
    const parts = n.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : n.slice(0, 2).toUpperCase();

    // Pick a colour from a small palette based on the first char code
    const colours = ['#2E6B4E','#3B7A57','#1A5276','#6C3483','#784212','#B03A2E','#117864','#1F618D'];
    const colour = colours[(n.charCodeAt(0) || 0) % colours.length];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
        `<circle cx="100" cy="100" r="100" fill="${colour}"/>` +
        `<text x="100" y="100" dy="0.35em" text-anchor="middle" ` +
        `font-family="system-ui,sans-serif" font-size="80" font-weight="700" fill="white">${initials}</text>` +
        `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
window.defaultAvatar = defaultAvatar;
// ─────────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  // CHANGED: toasts no longer show an emoji icon (the color still shows success / error / info)
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);
  
  toast.offsetHeight;
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.4s var(--transition-bounce) reverse';
    setTimeout(() => {
      if (toast && toast.remove) toast.remove();
    }, 400);
  }, 3000);
}

// Make sure showToast exists
if (typeof window.showToast === 'undefined') {
    window.showToast = function(message, type = 'success') {
        console.log(`${type}: ${message}`);
        alert(message);
    };
}

function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length === 0) return;
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  revealElements.forEach(el => revealObserver.observe(el));
}

function initNavbarScroll() {
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

function initCounters() {
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

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal.active').forEach(modal => {
    modal.classList.remove('active');
    modal.style.display = 'none';
  });
  document.body.style.overflow = '';
}

function previewImage(input, previewId) {
  const preview = document.getElementById(previewId);
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.classList.add('has-image');
      preview.innerHTML = '';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function previewMultipleImages(input, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !input.files) return;
  
  container.innerHTML = '';
  
  Array.from(input.files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const imgDiv = document.createElement('div');
      imgDiv.className = 'image-preview-thumb';
      imgDiv.style.backgroundImage = `url(${e.target.result})`;
      imgDiv.setAttribute('data-index', index);
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-preview-btn';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = function() {
        imgDiv.remove();
      };
      
      imgDiv.appendChild(removeBtn);
      container.appendChild(imgDiv);
    };
    reader.readAsDataURL(file);
  });
}

function openLightbox(src) {
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  if (modal && img) {
    img.src = src;
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

const Storage = {
  get: (key, defaultValue = null) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error writing to localStorage:', e);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Error removing from localStorage:', e);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Error clearing localStorage:', e);
      return false;
    }
  }
};

const Validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  password: (password) => {
    return password.length >= 8;
  },
  
  phone: (phone) => {
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return re.test(phone);
  },
  
  name: (name) => {
    return name.trim().length >= 2;
  },
  
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function formatDate(date, timeOnly = false) {
  const d = new Date(date);
  if (timeOnly) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const now = new Date();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString();
}

function smoothScroll(target, offset = 0) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
    return true;
  } catch (err) {
    showToast('Failed to copy', 'error');
    return false;
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

function getUrlParams() {
  const params = {};
  const queryString = window.location.search.substring(1);
  const pairs = queryString.split('&');
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    if (pair[0]) {
      params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
  }
  
  return params;
}

function setUrlParams(params) {
  const url = new URL(window.location.href);
  Object.keys(params).forEach(key => {
    if (params[key]) {
      url.searchParams.set(key, params[key]);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.pushState({}, '', url);
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function initLazyLoad() {
  const images = document.querySelectorAll('img[data-src]');
  if (images.length === 0) return;
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '50px' });
  
  images.forEach(img => imageObserver.observe(img));
}

function preloadImages(images) {
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('[data-animate]');
  if (animatedElements.length === 0) return;
  
  let ticking = false;
  
  function checkAnimations() {
    animatedElements.forEach(el => {
      if (isInViewport(el) && !el.classList.contains('animated')) {
        const animation = el.getAttribute('data-animate');
        el.style.animation = `${animation} 0.6s var(--transition-smooth) forwards`;
        el.classList.add('animated');
      }
    });
    ticking = false;
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(checkAnimations);
      ticking = true;
    }
  });
  
  checkAnimations();
}

window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.showToast = showToast;
window.Storage = Storage;
window.Validators = Validators;
window.formatDate = formatDate;
window.copyToClipboard = copyToClipboard;
window.smoothScroll = smoothScroll;
window.isMobileDevice = isMobileDevice;
window.truncateText = truncateText;
window.getUrlParams = getUrlParams;
window.setUrlParams = setUrlParams;
window.generateId = generateId;
window.debounce = debounce;
window.throttle = throttle;
window.preloadImages = preloadImages;
window.previewImage = previewImage;
window.previewMultipleImages = previewMultipleImages;
window.openLightbox = openLightbox;
// ── escapeHtml — prevent XSS in dynamic HTML ─────────────────────────────
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

function checkAuthAndUpdateNav() {
  if (typeof User === 'undefined') return; // auth.js not loaded on this page
  const isLoggedIn = User.isAuthenticated();
  const user = User.getUser();

  const messageBtn = document.getElementById('messageBtn');
  const profileMenu = document.getElementById('profileMenuContainer');
  const guestOptions = document.getElementById('guestOptions');
  const searchToggle = document.getElementById('searchToggle');
  const searchBoxContent = document.getElementById('searchBoxContent');

  if (isLoggedIn && user) {
    if (messageBtn) {
      messageBtn.style.display = 'flex';
      messageBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        // openMessengerGlobal is set synchronously by messages-loader.js stub,
        // so this will always find a function — even before messages.js finishes loading.
        if (typeof window.openMessengerGlobal === 'function') {
          window.openMessengerGlobal();
        } else if (typeof window.openMessagesModal === 'function') {
          window.openMessagesModal();
        } else if (typeof window.openMessenger === 'function') {
          window.openMessenger();
        }
      };
    }
    if (profileMenu) {
      profileMenu.style.display = 'block';
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) {
        const avatarSrc = user.avatar || defaultAvatar(user.name || 'User');
        profileBtn.innerHTML = `<img src="${avatarSrc}" alt="${user.name || 'User'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      }
    }
    if (guestOptions) guestOptions.style.display = 'none';

    if (searchToggle) {
      searchToggle.disabled = false;
      searchToggle.title = "Search";
    }

  } else {
    if (messageBtn) messageBtn.style.display = 'none';
    if (profileMenu) profileMenu.style.display = 'none';
    if (guestOptions) guestOptions.style.display = 'flex';

    if (searchToggle) {
      searchToggle.disabled = true;
      searchToggle.title = "Sign in to search";
    }

    if (searchBoxContent) {
      searchBoxContent.innerHTML = `
        <div class="search-locked">
          <p>Please sign in to search</p>
          <a href="login.html">Sign In</a>
          <a href="sign_up.html">Sign Up</a>
        </div>
      `;
    }
  }
}

function initModalCloseOnOutsideClick() {
  window.addEventListener('click', function(event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
      closeModal(event.target.id);
    }
  });
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAllModals();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const statusInput = document.getElementById('statusInput');
      if (document.activeElement === statusInput && typeof window.addPost === 'function') {
        e.preventDefault();
        window.addPost();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearch');
      if (searchInput) {
        searchInput.focus();
      }
    }
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href !== '#' && href !== '#') {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          smoothScroll(target, 80);
        }
      }
    });
  });
}

function initPageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => {
        if (loader && loader.remove) loader.remove();
      }, 500);
    }, 500);
  }
}

// REMOVED: initBackgroundParallax() (scroll-based moving hero/background effect)

function trackPageView(pageName) {
  console.log(`Page viewed: ${pageName} at ${new Date().toLocaleTimeString()}`);
}

document.addEventListener('DOMContentLoaded', function() {
  checkAuthAndUpdateNav();
  if (typeof initNavigation === 'function') {
    initNavigation();
  }
  if (typeof protectSwipePage === 'function') {
    protectSwipePage();
  }
  if (typeof initNavbarScroll === 'function') {
    initNavbarScroll();
  }
  if (typeof initScrollReveal === 'function') {
    initScrollReveal();
  }
  if (typeof initCounters === 'function') {
    initCounters();
  }
  initModalCloseOnOutsideClick();
  initKeyboardShortcuts();
  initSmoothScroll();
  initPageLoader();
  if (typeof initLazyLoad === 'function') {
    initLazyLoad();
  }
  if (typeof initScrollAnimations === 'function') {
    initScrollAnimations();
  }
  // REMOVED: initBackgroundParallax() - the moving background/hero effect was too complex
  trackPageView(document.title);
});

window.addEventListener('popstate', function() {
  if (typeof initSwipe === 'function') {
    initSwipe();
  }
  if (typeof initProfile === 'function') {
    initProfile();
  }
  if (typeof initNavigation === 'function') {
    initNavigation();
  }
});

window.BreedLink = {
  showToast: typeof showToast !== 'undefined' ? showToast : function() {},
  openModal: typeof openModal !== 'undefined' ? openModal : function() {},
  closeModal: typeof closeModal !== 'undefined' ? closeModal : function() {},
  closeAllModals: typeof closeAllModals !== 'undefined' ? closeAllModals : function() {},
  previewImage: typeof previewImage !== 'undefined' ? previewImage : function() {},
  openLightbox: typeof openLightbox !== 'undefined' ? openLightbox : function() {},
  Storage: typeof Storage !== 'undefined' ? Storage : { get: function() {}, set: function() {} },
  Validators: typeof Validators !== 'undefined' ? Validators : {},
  formatDate: typeof formatDate !== 'undefined' ? formatDate : function() {},
  copyToClipboard: typeof copyToClipboard !== 'undefined' ? copyToClipboard : function() {},
  smoothScroll: typeof smoothScroll !== 'undefined' ? smoothScroll : function() {},
  isMobileDevice: typeof isMobileDevice !== 'undefined' ? isMobileDevice : function() {},
  truncateText: typeof truncateText !== 'undefined' ? truncateText : function() {},
  getUrlParams: typeof getUrlParams !== 'undefined' ? getUrlParams : function() {},
  setUrlParams: typeof setUrlParams !== 'undefined' ? setUrlParams : function() {},
  generateId: typeof generateId !== 'undefined' ? generateId : function() {},
  debounce: typeof debounce !== 'undefined' ? debounce : function() {},
  throttle: typeof throttle !== 'undefined' ? throttle : function() {},
  preloadImages: typeof preloadImages !== 'undefined' ? preloadImages : function() {}
};
// ── Hamburger / Mobile Drawer ─────────────────────────────────────────────
(function () {
  function buildDrawer() {
    if (document.getElementById('mobileDrawer')) return;

    // Detect guest vs logged-in
    var guestOptions = document.getElementById('guestOptions');
    var isGuest = !guestOptions || guestOptions.style.display !== 'none';

    // Detect active page for highlighting
    var path = window.location.pathname;
    var homeActive    = (path.endsWith('index.html') || path.endsWith('/')) ? 'active' : '';
    var aboutActive   = path.includes('about') ? 'active' : '';
    var swipeActive   = path.includes('swipe') ? 'active' : '';

    // Detect if we're at root level or inside /pages/
    var inPagesDir = path.includes('/pages/');
    var prefix = inPagesDir ? '' : 'pages/';
    var homeHref = inPagesDir ? '../index.html' : 'index.html';
    var loginHref = prefix + 'login.html';
    var signupHref = prefix + 'signup.html';

    var authHTML = isGuest ? `
      <div class="mobile-drawer-divider"></div>
      <div class="mobile-drawer-auth">
        <a href="${loginHref}" class="drawer-signin">Sign In</a>
        <a href="${signupHref}" class="drawer-signup">Sign Up</a>
      </div>` : '';

    var drawerHTML = `
      <div id="mobileDrawerBackdrop" class="mobile-drawer-backdrop"></div>
      <div id="mobileDrawer" class="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div class="mobile-drawer-header">
          <img class="mobile-drawer-logo"
            src="${inPagesDir ? '../assets/logo.png' : 'assets/logo.png'}"
            alt="BreedLink">
          <button class="mobile-drawer-close" onclick="closeMobileDrawer()" aria-label="Close menu">✕</button>
        </div>
        <div class="mobile-drawer-nav">
          <a href="${homeHref}" class="${homeActive}">Home</a>
          <a href="${prefix}about.html" class="${aboutActive}">About</a>
          <a href="${prefix}swipe.html" class="${swipeActive}">Breeders</a>
        </div>
        ${authHTML}
      </div>`;

    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    // Backdrop click closes drawer
    document.getElementById('mobileDrawerBackdrop').addEventListener('click', closeMobileDrawer);

    // Close drawer when a nav link is clicked
    document.querySelectorAll('.mobile-drawer-nav a, .mobile-drawer-auth a').forEach(function (a) {
      a.addEventListener('click', closeMobileDrawer);
    });
  }

  window.toggleMobileMenu = function () {
    buildDrawer();
    var drawer   = document.getElementById('mobileDrawer');
    var backdrop = document.getElementById('mobileDrawerBackdrop');
    var btn      = document.getElementById('hamburgerBtn');
    if (!drawer) return;

    var isOpen = drawer.classList.toggle('open');
    backdrop.classList.toggle('open', isOpen);
    if (btn) btn.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  window.closeMobileDrawer = function () {
    var drawer   = document.getElementById('mobileDrawer');
    var backdrop = document.getElementById('mobileDrawerBackdrop');
    var btn      = document.getElementById('hamburgerBtn');
    if (!drawer) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    if (btn) btn.classList.remove('open');
    document.body.style.overflow = '';
  };

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeMobileDrawer();
  });

  // Show hamburger button (starts hidden; CSS reveals at ≤700px)
  document.addEventListener('DOMContentLoaded', function () {
    var hamburger = document.getElementById('hamburgerBtn');
    if (hamburger) hamburger.style.display = '';
  });
})();
