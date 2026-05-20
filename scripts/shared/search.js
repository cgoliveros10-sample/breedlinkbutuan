// ── Global Search ─────────────────────────────────────────────────────────
(function () {
  'use strict';

  var _debounceTimer = null;
  var _lastQuery     = '';
  var _isOpen        = false;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ── Inject CSS ───────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('bl-search-styles')) return;
    var s = document.createElement('style');
    s.id  = 'bl-search-styles';
    s.textContent = `
      .bl-search-toggle {
        width:44px;height:44px;border-radius:50%;border:none;
        background:rgba(46,107,78,0.1);color:var(--green-primary,#2E6B4E);
        font-size:18px;cursor:pointer;display:flex;align-items:center;
        justify-content:center;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        flex-shrink:0;
      }
      .bl-search-toggle:hover { background:rgba(46,107,78,0.18); transform:scale(1.08); }
      .bl-search-toggle.active { background:var(--green-primary,#2E6B4E); color:white; }

      .bl-search-container {
        position:relative;display:flex;align-items:center;
      }

      .bl-search-bar {
        position:absolute;top:50%;right:0;
        transform:translateY(-50%) scaleX(0);transform-origin:right center;
        width:300px;background:white;border-radius:50px;
        border:2px solid rgba(46,107,78,0.25);
        box-shadow:0 8px 32px rgba(46,107,78,0.15);
        display:flex;align-items:center;gap:8px;padding:0 14px;
        opacity:0;pointer-events:none;
        transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s ease;
        z-index:2000;
      }
      .bl-search-bar.open {
        transform:translateY(-50%) scaleX(1);opacity:1;pointer-events:all;
      }
      .bl-search-bar input {
        flex:1;border:none;outline:none;font-size:14px;font-family:inherit;
        color:#111;background:transparent;padding:11px 0;min-width:0;
      }
      .bl-search-bar input::placeholder { color:#9ca3af; }
      .bl-search-icon { color:var(--green-primary,#2E6B4E);font-size:15px;flex-shrink:0; }
      .bl-search-clear {
        background:none;border:none;cursor:pointer;color:#9ca3af;
        font-size:15px;padding:4px;line-height:1;display:none;flex-shrink:0;
        border-radius:50%;transition:color 0.2s,background 0.2s;align-items:center;justify-content:center;
      }
      .bl-search-clear:hover { color:#374151;background:rgba(0,0,0,0.06); }
      .bl-search-clear.visible { display:flex; }

      .bl-search-results {
        position:absolute;top:calc(100% + 54px);right:0;width:320px;
        background:white;border-radius:20px;
        box-shadow:0 20px 60px rgba(0,0,0,0.15);
        border:1px solid rgba(46,107,78,0.12);
        overflow:hidden;z-index:2001;display:none;
        animation:blDropIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
        max-height:400px;overflow-y:auto;
      }
      .bl-search-results.visible { display:block; }
      @keyframes blDropIn {
        from { opacity:0;transform:translateY(-8px) scale(0.97); }
        to   { opacity:1;transform:translateY(0) scale(1); }
      }

      .bl-result-item {
        display:flex;align-items:center;gap:12px;padding:12px 16px;
        cursor:pointer;transition:background 0.15s;
        border-bottom:1px solid rgba(46,107,78,0.06);
      }
      .bl-result-item:last-child { border-bottom:none; }
      .bl-result-item:hover { background:rgba(46,107,78,0.06); }

      .bl-result-avatar {
        width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0;
        background:rgba(46,107,78,0.1);display:flex;align-items:center;
        justify-content:center;border:2px solid rgba(46,107,78,0.15);
      }
      .bl-result-avatar img { width:100%;height:100%;object-fit:cover; }
      .bl-result-info { flex:1;min-width:0; }
      .bl-result-name {
        font-size:14px;font-weight:700;color:#111827;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      }
      .bl-result-sub {
        font-size:12px;color:#6b7280;margin-top:2px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      }
      .bl-result-arrow { color:var(--green-primary,#2E6B4E);font-size:16px;flex-shrink:0;opacity:0.5; }

      .bl-search-state {
        padding:28px 16px;text-align:center;color:#9ca3af;font-size:13px;
      }
      .bl-state-icon { font-size:28px;margin-bottom:8px; }

      /* spinner */
      .bl-spinner {
        width:18px;height:18px;border:2px solid rgba(46,107,78,0.2);
        border-top-color:var(--green-primary,#2E6B4E);border-radius:50%;
        animation:blSpin 0.6s linear infinite;display:inline-block;flex-shrink:0;
      }
      @keyframes blSpin { to { transform:rotate(360deg); } }

      /* ── Mobile drawer search ── */
      .bl-drawer-search-wrap {
        padding:12px 16px 8px;
        border-bottom:1px solid rgba(46,107,78,0.1);
      }
      .bl-drawer-search-inner {
        display:flex;align-items:center;gap:10px;
        background:rgba(46,107,78,0.07);border-radius:50px;
        padding:0 14px;border:1.5px solid rgba(46,107,78,0.15);
        transition:border-color 0.2s,box-shadow 0.2s;
      }
      .bl-drawer-search-inner:focus-within {
        border-color:var(--green-primary,#2E6B4E);
        box-shadow:0 0 0 3px rgba(46,107,78,0.1);
      }
      .bl-drawer-search-inner .bl-dsearch-icon { color:var(--green-primary,#2E6B4E);font-size:15px; }
      .bl-drawer-search-inner input {
        flex:1;border:none;outline:none;background:transparent;
        font-size:14px;font-family:inherit;color:#111;padding:12px 0;
      }
      .bl-drawer-search-inner input::placeholder { color:#9ca3af; }

      .bl-drawer-results {
        margin-top:8px;border-radius:16px;overflow:hidden;
        background:white;box-shadow:0 4px 20px rgba(0,0,0,0.08);
        display:none;border:1px solid rgba(46,107,78,0.1);
        max-height:300px;overflow-y:auto;
      }
      .bl-drawer-results.visible { display:block; }

      @media (max-width:700px) {
        .bl-search-container { display:none !important; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Query: search both name AND username ─────────────────────────────────
  async function queryProfiles(q) {
    if (!window.supabase || !q || q.length < 2) return [];
    if (typeof User === 'undefined' || !User.isAuthenticated()) return [];
    try {
      // db.js buildUrl appends orFilter RAW into the URL: &or=(...)
      // So we must pre-encode % as %25 ourselves — buildUrl won't do it.
      // Also escape PostgREST special chars inside the or() string: ( ) ,
      var safe = encodeURIComponent(q)          // encode the query itself
                  .replace(/[(),'*]/g, '\\$&'); // escape PostgREST specials

      // Pattern: %25<encoded-query>%25 → decodes to %query% in PostgREST
      var pattern = '%25' + safe + '%25';
      var orFilter = 'name.ilike.' + pattern + ',username.ilike.' + pattern;

      var { data, error } = await window.supabase
        .from('profiles')
        .select('id, name, username, profile_picture, location, tags, is_deleted, deletion_requested_at')
        .or(orFilter)
        .limit(8);

      if (error) {
        console.warn('[BL Search] OR query failed:', error.message);
        return [];
      }

      // Filter out deleted/pending-deletion profiles client-side
      return (data || []).filter(function (p) {
        return !p.is_deleted && !p.deletion_requested_at;
      });
    } catch (e) {
      console.warn('[BL Search] query error:', e);
      return [];
    }
  }

  // ── Render result items ──────────────────────────────────────────────────
  function renderResults(profiles, container, query) {
    if (!profiles || !profiles.length) {
      container.innerHTML = `
        <div class="bl-search-state">
          <div class="bl-state-icon">🔍</div>
          <div>No breeders found for "<strong>${esc(query)}</strong>"</div>
        </div>`;
      return;
    }

    container.innerHTML = profiles.map(function (p) {
      var displayName = p.name || p.username || 'Unknown';
      var subLine = p.username ? '@' + p.username : (p.location || 'BreedLink Member');
      if (p.username && p.location) subLine = '@' + p.username + ' · ' + p.location;
      var avatarSrc = p.profile_picture || (typeof defaultAvatar === 'function' ? defaultAvatar(displayName) : '');
      return `
        <div class="bl-result-item" data-uid="${esc(p.id)}" tabindex="0" role="option">
          <div class="bl-result-avatar">
            <img src="${esc(avatarSrc)}" alt="${esc(displayName)}"
              onerror="this.src='${typeof defaultAvatar === 'function' ? esc(defaultAvatar(displayName)) : ''}'">
          </div>
          <div class="bl-result-info">
            <div class="bl-result-name">${esc(displayName)}</div>
            <div class="bl-result-sub">${esc(subLine)}</div>
          </div>
          <div class="bl-result-arrow">›</div>
        </div>`;
    }).join('');

    container.querySelectorAll('.bl-result-item').forEach(function (item) {
      function openProfile() {
        var uid = item.dataset.uid;
        closeDesktopSearch();
        if (typeof closeMobileDrawer === 'function') closeMobileDrawer();
        ensureBreederModal(function () {
          if (typeof openBreederProfile === 'function') openBreederProfile(uid);
        });
      }
      item.addEventListener('click', openProfile);
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(); }
      });
    });
  }

  // ── Ensure ownerProfileModal + breeder-profile.js on pages that lack it ──
  function ensureBreederModal(cb) {
    if (document.getElementById('ownerProfileModal')) { cb(); return; }

    document.body.insertAdjacentHTML('beforeend', `
      <div id="ownerProfileModal"
        style="display:none;position:fixed;inset:0;z-index:4000;
          background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);
          -webkit-backdrop-filter:blur(6px);align-items:center;
          justify-content:center;padding:12px;box-sizing:border-box;">
        <div onclick="closeBreederProfile()" style="position:absolute;inset:0;z-index:0;"></div>
        <div style="max-width:620px;width:100%;max-height:calc(100vh - 40px);
          border-radius:22px;position:relative;margin:0 auto;
          box-shadow:0 20px 60px rgba(0,0,0,0.35);z-index:1;display:flex;flex-direction:column;">
          <button onclick="closeBreederProfile()" id="breederProfileCloseBtn"
            style="display:none;position:absolute;top:-9999px;pointer-events:none;visibility:hidden;">×</button>
          <div style="background:#fff;border-radius:22px;overflow-y:auto;overflow-x:hidden;
            -webkit-overflow-scrolling:touch;overscroll-behavior:contain;flex:1;min-height:0;">
            <div id="ownerProfileBody" style="border-radius:22px;overflow:hidden;min-width:0;"></div>
          </div>
        </div>
      </div>`);

    if (typeof openBreederProfile !== 'function') {
      var sc = document.createElement('script');
      var inPages = window.location.pathname.includes('/pages/');
      sc.src = (inPages ? '../' : '') + 'scripts/shared/breeder-profile.js';
      sc.onload = cb;
      sc.onerror = function () { console.error('[BL Search] Failed to load breeder-profile.js'); };
      document.head.appendChild(sc);
    } else {
      cb();
    }
  }

  // ── Shared query handler with debounce ───────────────────────────────────
  function handleQuery(q, resultsEl) {
    clearTimeout(_debounceTimer);
    q = (q || '').trim();

    if (q.length < 2) {
      resultsEl.classList.remove('visible');
      resultsEl.innerHTML = '';
      _lastQuery = '';
      return;
    }

    // Show loading immediately
    resultsEl.classList.add('visible');
    resultsEl.innerHTML = `
      <div class="bl-search-state" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:20px;">
        <div class="bl-spinner"></div><span>Searching…</span>
      </div>`;

    _lastQuery = q;
    _debounceTimer = setTimeout(async function () {
      if (_lastQuery !== q) return; // stale
      var profiles = await queryProfiles(q);
      if (_lastQuery === q) renderResults(profiles, resultsEl, q);
    }, 350);
  }

  // ── Desktop search ───────────────────────────────────────────────────────
  function buildDesktopSearch(navRight) {
    if (navRight.querySelector('.bl-search-container')) return;
    if (typeof User === 'undefined' || !User.isAuthenticated()) return;

    var container = document.createElement('div');
    container.className = 'bl-search-container';
    container.innerHTML = `
      <button class="bl-search-toggle" id="blSearchToggle" title="Search breeders" aria-label="Search breeders">🔍</button>
      <div class="bl-search-bar" id="blSearchBar" role="search" aria-label="Search">
        <span class="bl-search-icon">🔍</span>
        <input type="text" id="blSearchInput" placeholder="Search by name or username…" autocomplete="off" aria-label="Search breeders">
        <button class="bl-search-clear" id="blSearchClear" aria-label="Clear search">✕</button>
      </div>
      <div class="bl-search-results" id="blSearchResults" role="listbox"></div>
    `;

    // Insert before the first child (before message icon)
    navRight.insertBefore(container, navRight.firstChild);

    var toggle  = document.getElementById('blSearchToggle');
    var bar     = document.getElementById('blSearchBar');
    var input   = document.getElementById('blSearchInput');
    var clear   = document.getElementById('blSearchClear');
    var results = document.getElementById('blSearchResults');

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      _isOpen ? closeDesktopSearch() : openDesktopSearch();
    });

    input.addEventListener('input', function () {
      clear.classList.toggle('visible', input.value.length > 0);
      handleQuery(input.value, results);
    });

    clear.addEventListener('click', function () {
      input.value = ''; clear.classList.remove('visible');
      results.classList.remove('visible'); results.innerHTML = '';
      input.focus();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDesktopSearch();
    });

    document.addEventListener('click', function (e) {
      if (!container.contains(e.target)) closeDesktopSearch();
    });
  }

  function openDesktopSearch() {
    _isOpen = true;
    var bar = document.getElementById('blSearchBar');
    var tog = document.getElementById('blSearchToggle');
    if (bar) bar.classList.add('open');
    if (tog) tog.classList.add('active');
    setTimeout(function () {
      var inp = document.getElementById('blSearchInput');
      if (inp) inp.focus();
    }, 200);
  }

  function closeDesktopSearch() {
    _isOpen = false;
    var bar = document.getElementById('blSearchBar');
    var tog = document.getElementById('blSearchToggle');
    var res = document.getElementById('blSearchResults');
    if (bar) bar.classList.remove('open');
    if (tog) tog.classList.remove('active');
    if (res) res.classList.remove('visible');
  }

  // ── Mobile: inject search into drawer ────────────────────────────────────
  function injectDrawerSearch(drawer) {
    if (drawer.querySelector('.bl-drawer-search-wrap')) return;
    if (typeof User === 'undefined' || !User.isAuthenticated()) return;

    var wrap = document.createElement('div');
    wrap.className = 'bl-drawer-search-wrap';
    wrap.innerHTML = `
      <div class="bl-drawer-search-inner">
        <span class="bl-dsearch-icon">🔍</span>
        <input type="text" placeholder="Search by name or username…"
          autocomplete="off" class="bl-dsearch-input" aria-label="Search breeders">
      </div>
      <div class="bl-drawer-results" id="blDrawerResults" role="listbox"></div>
    `;

    var header = drawer.querySelector('.mobile-drawer-header');
    if (header && header.nextSibling) {
      drawer.insertBefore(wrap, header.nextSibling);
    } else {
      drawer.appendChild(wrap);
    }

    var input   = wrap.querySelector('.bl-dsearch-input');
    var results = wrap.querySelector('.bl-drawer-results');
    input.addEventListener('input', function () {
      handleQuery(input.value, results);
    });
  }

  // Watch for drawer being created dynamically
  function watchDrawer() {
    var existing = document.getElementById('mobileDrawer');
    if (existing) injectDrawerSearch(existing);

    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.id === 'mobileDrawer') injectDrawerSearch(node);
        });
      });
    }).observe(document.body, { childList: true });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  window.closeGlobalSearch = closeDesktopSearch;

  function init() {
    injectStyles();
    var navRight = document.getElementById('navRight');
    if (navRight) buildDesktopSearch(navRight);
    watchDrawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
