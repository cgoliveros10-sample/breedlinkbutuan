/**
 * messages-loader.js — BreedLink Universal Messages Modal Loader
 *
 * Drop ONE script tag on any page that has a #messageBtn and this script will:
 *   1. Detect the correct relative path to /css/ and /js/ based on the page's depth
 *   2. Inject messages.css into <head>
 *   3. Inject the full messages modal HTML into <body>
 *   4. Register a synchronous openMessengerGlobal stub IMMEDIATELY so the nav
 *      button always works, even if messages.js is still loading
 *   5. Load messages.js (which wires up the real openMessengerGlobal)
 *
 * No other changes needed on any page.
 */

(function () {
  /* ---------------------------------------------------
     1.  Figure out the root-relative prefix
         Pages at root (index.html)  → prefix = ""
         Pages in /html/             → prefix = "../"
  --------------------------------------------------- */
  const inSubfolder = window.location.pathname.includes('/pages/');
  const prefix = inSubfolder ? '../' : '';

  /* ---------------------------------------------------
     2.  Inject messages.css (only once)
  --------------------------------------------------- */
  if (!document.querySelector('link[data-bl-messages-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = prefix + 'styles/pages/messages.css';
    link.setAttribute('data-bl-messages-css', '1');
    document.head.appendChild(link);
  }

  /* ---------------------------------------------------
     3.  Inject the modal keyframe animation style (only once)
  --------------------------------------------------- */
  if (!document.querySelector('style[data-bl-messages-anim]')) {
    const style = document.createElement('style');
    style.setAttribute('data-bl-messages-anim', '1');
    style.textContent = `
      @keyframes modalSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------------------------------------------------
     4.  Register a synchronous stub for openMessengerGlobal IMMEDIATELY.
         This runs before messages.js loads, so the nav button never
         falls through to stale/wrong handlers.
         Once messages.js loads and sets the real function, all future
         calls use it directly. Any call that fires while messages.js is
         still loading is queued and replayed once it is ready.
  --------------------------------------------------- */
  if (typeof window.openMessengerGlobal !== 'function') {
    window.openMessengerGlobal = function (chatData) {
      // Capture chatData at call-time before any async delay.
      // If messages.js is already loaded, call it immediately.
      if (typeof window.openMessagesModal === 'function') {
        window.openMessagesModal(chatData || null);
        return;
      }
      // messages.js not yet loaded — retry every 100 ms for up to 5 s.
      var attempts = 0;
      var interval = setInterval(function () {
        attempts++;
        if (typeof window.openMessagesModal === 'function') {
          clearInterval(interval);
          window.openMessagesModal(chatData || null);
        } else if (attempts >= 50) {
          clearInterval(interval); // give up after 5 s
        }
      }, 100);
    };

    // Also alias so inline onclick="openMessenger()" works
    window.openMessenger = window.openMessengerGlobal;
  }

  /* ---------------------------------------------------
     5.  Build and inject the modal HTML (only once)
  --------------------------------------------------- */
  function injectModalHTML() {
    if (document.getElementById('messagesModalOverlay')) return; // already present

    const swipeLink = inSubfolder ? 'swipe.html' : 'pages/swipe.html';

    const html = `
<!-- BreedLink Messages Modal — injected by messages-loader.js -->
<div class="messages-modal-overlay" id="messagesModalOverlay" style="display:none;">
  <div class="messages-modal">
    <button class="messages-modal-close" onclick="closeMessagesModal()" aria-label="Close messages window">×</button>
    <main class="messages-page">
      <aside class="conversations-sidebar" id="conversationsSidebar">
        <div class="sidebar-header">
          <div class="sidebar-title-row">
            <h2>💬 Messages</h2>
          </div>
          <div class="sidebar-search">
            <span class="search-icon">🔍</span>
            <input type="text" id="sidebarSearch" placeholder="Search conversations..." oninput="filterConversations(this.value)">
            <button class="search-clear" id="searchClear" onclick="clearSearch()" style="display:none;">✕</button>
          </div>
          <div class="filter-tabs">
            <button class="filter-tab active" onclick="setFilter('all', this)">All</button>
            <button class="filter-tab" onclick="setFilter('unread', this)">Unread</button>
            <button class="filter-tab" onclick="setFilter('matches', this)">Matches</button>
          </div>
        </div>
        <div class="conversations-list" id="conversationsList"></div>
        <div class="sidebar-empty" id="sidebarEmpty" style="display: none;">
          <div class="sidebar-empty-icon">💬</div>
          <p>No conversations found</p>
          <span>Start swiping to make matches!</span>
        </div>
      </aside>

      <section class="chat-panel" id="chatPanel">
        <div class="chat-welcome" id="chatWelcome">
          <div class="welcome-illustration">🐾</div>
          <h2>Your Conversations</h2>
          <p>Select a conversation to start chatting, or find a match on the Breeders page.</p>
          <a href="${swipeLink}" class="btn btn-primary">Find Breeders →</a>
        </div>
        <div class="active-chat" id="activeChat" style="display: none;">
          <div class="chat-header" id="chatHeader">
            <button class="back-to-list" onclick="backToList()" title="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div class="chat-header-avatar" id="chatHeaderAvatar">
              <img src="" alt="" id="chatAvatarImg">
              <span class="online-dot" id="onlineDot"></span>
            </div>
            <div class="chat-header-info">
              <h3 id="chatHeaderName">—</h3>
              <span class="chat-header-status" id="chatHeaderStatus">—</span>
            </div>
            <div class="chat-header-actions">
              <button class="chat-action-btn" onclick="viewProfile()" title="View Profile">👁️</button>
              <button class="chat-action-btn" onclick="toggleChatInfo()" title="Info">ℹ️</button>
            </div>
          </div>
          <div class="messages-area" id="messagesArea"></div>
          <div class="typing-indicator" id="typingIndicator" style="display: none;">
            <div class="typing-avatar" id="typingAvatar"></div>
            <div class="typing-bubble"><span></span><span></span><span></span></div>
          </div>
          <div class="chat-input-area">
            <div class="input-toolbar">
              <button class="toolbar-btn" onclick="document.getElementById('fileInput').click()" title="Send Image">📷</button>
              <input type="file" id="fileInput" accept="image/*" style="display:none;" onchange="handleImageUpload(this)">
            </div>
            <div class="input-wrapper-msg">
              <textarea id="messageInput" placeholder="Type a message..." rows="1"
                oninput="autoResize(this); handleTyping();"
                onkeydown="handleInputKeydown(event)"></textarea>
            </div>
            <button class="send-btn" id="sendBtn" onclick="sendMessage()" title="Send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div class="emoji-picker" id="emojiPicker" style="display:none;"><div class="emoji-grid" id="emojiGrid"></div></div>
        </div>
      </section>

      <aside class="chat-info-panel" id="chatInfoPanel" style="display: none;">
        <button class="close-info-btn" onclick="toggleChatInfo()">✕</button>
        <div class="info-avatar-section">
          <div class="info-avatar" id="infoAvatar"></div>
          <h3 id="infoName">—</h3>
          <span id="infoRole" class="info-role">—</span>
        </div>
        <div class="info-animals" id="infoAnimals">
          <h4>🐾 Animals Listed</h4>
          <div class="info-animals-grid" id="infoAnimalsGrid"></div>
        </div>
        <div class="info-actions">
          <button class="info-action-btn primary" onclick="viewProfile()">View Full Profile</button>
          <button class="info-action-btn danger" onclick="confirmDeleteConversation()">Delete Conversation</button>
        </div>
      </aside>
    </main>
  </div>
</div>

<!-- New Chat Modal -->
<div class="msg-modal" id="newChatModal" style="display:none;">
  <div class="msg-modal-content">
    <div class="msg-modal-header">
      <h3>Start New Conversation</h3>
      <button class="msg-modal-close" onclick="closeNewChat()">✕</button>
    </div>
    <div class="new-chat-search">
      <input type="text" id="newChatSearchInput" placeholder="Search breeders or matches..." oninput="searchNewChatContacts(this.value)">
    </div>
    <div class="new-chat-list" id="newChatList"></div>
  </div>
</div>

<!-- Delete Confirm Modal -->
<div class="msg-modal" id="deleteModal" style="display:none;">
  <div class="msg-modal-content small">
    <div class="msg-modal-header">
      <h3>Delete Conversation</h3>
      <button class="msg-modal-close" onclick="closeDeleteModal()">✕</button>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 15px;">Are you sure you want to delete this conversation? This cannot be undone.</p>
    <div class="msg-modal-actions">
      <button class="info-action-btn" onclick="closeDeleteModal()">Cancel</button>
      <button class="info-action-btn danger" onclick="deleteConversation()">Delete</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="msg-toast" id="msgToast" style="display:none;"></div>

<!-- Image Lightbox -->
<div class="lightbox" id="lightbox" style="display:none;" onclick="closeLightbox()">
  <button class="lightbox-close" onclick="closeLightbox()">✕</button>
  <img id="lightboxImg" src="" alt="Preview">
</div>
<!-- END BreedLink Messages Modal -->
`;

    const container = document.createElement('div');
    container.innerHTML = html.trim();
    // Append each top-level node directly to body
    while (container.firstChild) {
      document.body.appendChild(container.firstChild);
    }
  }

  /* ---------------------------------------------------
     6.  Load messages.js dynamically (only once)
  --------------------------------------------------- */
  function loadMessagesScript() {
    if (document.querySelector('script[data-bl-messages-js]')) return;
    // messages.html already has the overlay in its static HTML and loads
    // messages.js directly — injecting it again would run _messagesInit twice.
    if (window.location.pathname.split('/').pop() === 'messages.html') return;
    const script = document.createElement('script');
    script.src = prefix + 'scripts/pages/messages.js';
    script.setAttribute('data-bl-messages-js', '1');
    document.body.appendChild(script);
  }

  /* ---------------------------------------------------
     6b. Background nav-badge poller
         Runs only on pages OTHER than messages.html (that page
         uses the full polling system inside messages.js).
         Fetches unread count from Supabase every 30 s and
         updates the #messageBadge element in the nav.
  --------------------------------------------------- */
  function startNavBadgePoller() {
    // Don't run on messages.html — the full system handles it there.
    if (window.location.pathname.split('/').pop() === 'messages.html') return;

    async function refreshBadge() {
      try {
        if (!window.supabase) return;
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return;
        const { count } = await window.supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        const badge = document.getElementById('messageBadge');
        if (!badge) return;
        const total = count || 0;
        if (total > 0) {
          badge.textContent = total > 99 ? '99+' : total;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      } catch (_) { /* non-fatal */ }
    }

    // First run after a short delay (let auth settle), then every 30 s.
    setTimeout(refreshBadge, 2000);
    setInterval(refreshBadge, 30000);
  }

  /* ---------------------------------------------------
     7.  Run after DOM is ready
  --------------------------------------------------- */
  function init() {
    injectModalHTML();
    loadMessagesScript();
    startNavBadgePoller();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
