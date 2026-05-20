/* ===================================================
   AVATAR HELPERS
   =================================================== */
function getInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/**
 * messages.js — BreedLink Messaging (Supabase-connected)
 *
 * Supabase table: messages
 *   id          uuid  PK
 *   sender_id   uuid  FK → profiles.id
 *   receiver_id uuid  FK → profiles.id
 *   text        text
 *   image_url   text  nullable
 *   is_read     bool  default false
 *   read_at     timestamptz nullable
 *   created_at  timestamptz default now()
 */
// ── Security helper ──────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// ─────────────────────────────────────────────────────────────────────────────


/* ===================================================
   EMOJI SET
   =================================================== */
const EMOJIS = [
  '😀','😂','😍','🥰','😎','🤔','😅','🙏',
  '❤️','🔥','👍','👏','🎉','✅','💯','🐾',
  '🐕','🐈','🐄','🐖','🦮','🐇','🐓','🦆',
  '🌿','🌱','🌾','🍃','🌟','⭐','💚','🤝',
];

/* ===================================================
   APP STATE
   =================================================== */
const MessagesApp = {
  contacts: [],
  conversations: {},
  activeId: null,
  filter: 'all',
  searchQuery: '',
  chatInfoOpen: false,
  unreadMap: {},
  currentUserId: null,
  _pollTimer: null,
  _lastPollTs: {},

  async getCurrentUserId() {
    if (this.currentUserId) return this.currentUserId;
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (user) this.currentUserId = user.id;
    } catch (_) {}
    return this.currentUserId;
  },

  async loadMatchesFromSupabase() {
    try {
      if (!window.supabase) return;
      const uid = await this.getCurrentUserId();
      if (!uid) return;

      const [{ data: fwd }, { data: rev }] = await Promise.all([
        window.supabase
          .from('matches')
          .select('matched_user_id, profiles:matched_user_id(id, name, profile_picture, account_type)')
          .eq('user_id', uid)
          .eq('status', 'matched'),
        window.supabase
          .from('matches')
          .select('user_id, profiles:user_id(id, name, profile_picture, account_type)')
          .eq('matched_user_id', uid)
          .eq('status', 'matched'),
      ]);

      const contactMap = new Map();
      this.contacts.forEach(c => contactMap.set(c.id, c));

      (fwd || []).forEach(m => {
        const p = m.profiles;
        if (p && p.id && p.id !== uid && !contactMap.has(p.id)) {
          contactMap.set(p.id, { id: p.id, name: p.name || 'Breeder', avatar: p.profile_picture || '', role: p.account_type || 'Breeder', isMatch: true, online: false });
        }
      });

      (rev || []).forEach(m => {
        const p = m.profiles;
        if (p && p.id && p.id !== uid && !contactMap.has(p.id)) {
          contactMap.set(p.id, { id: p.id, name: p.name || 'Breeder', avatar: p.profile_picture || '', role: p.account_type || 'Breeder', isMatch: true, online: false });
        }
      });

      this.contacts = Array.from(contactMap.values());
    } catch (err) {
      console.error('[Messages] loadMatchesFromSupabase:', err);
    }
  },

  /**
   * Preload conversations from the messages table directly.
   * This runs independently of contacts — it finds ALL people the user
   * has ever messaged, merges them into contacts if missing, fetches their
   * profile names/avatars, and populates sidebar previews with the latest
   * message per conversation. Works correctly after a full page refresh.
   */
  async preloadLatestMessages() {
    try {
      const uid = await this.getCurrentUserId();
      if (!uid) return;

      // 1. Fetch ALL messages involving this user (sent or received), newest first
      const { data, error } = await window.supabase
        .from('messages')
        .select('id, sender_id, receiver_id, text, image_url, is_read, created_at')
        .or('sender_id.eq.' + uid + ',receiver_id.eq.' + uid)
        .order('created_at', { ascending: false });

      if (error || !data || !data.length) return;

      // 2. Collect unique contact IDs from message history
      const contactIdSet = new Set();
      data.forEach(row => {
        const otherId = row.sender_id === uid ? row.receiver_id : row.sender_id;
        contactIdSet.add(otherId);
      });

      // 3. For any contact not already in contacts list, fetch their profile
      const missingIds = [...contactIdSet].filter(id => !this.getContact(id));
      if (missingIds.length > 0) {
        const { data: profiles } = await window.supabase
          .from('profiles')
          .select('id, name, profile_picture, account_type')
          .in('id', missingIds);
        (profiles || []).forEach(p => {
          this.contacts.push({
            id: p.id,
            name: p.name || 'Breeder',
            avatar: p.profile_picture || '',
            role: p.account_type || 'Breeder',
            isMatch: false,
            online: false,
          });
        });
      }

      // 4. Store the latest message per conversation and count unreads
      // Soft-delete: skip any message that was sent before the user deleted
      // that conversation — only THIS user's view is affected.
      const seen = new Set();
      data.forEach(row => {
        const contactId = row.sender_id === uid ? row.receiver_id : row.sender_id;
        const deletedAt = this.getConversationDeletedAt(uid, contactId);
        const deletedAtMs = deletedAt ? new Date(deletedAt).getTime() : 0;
        if (deletedAtMs && new Date(row.created_at).getTime() <= deletedAtMs) return; // hidden for this user
        if (!this.conversations[contactId]) this.conversations[contactId] = [];
        // Add message if not already stored
        const existingIds = new Set(this.conversations[contactId].map(m => m.id));
        if (!existingIds.has(row.id)) {
          this.conversations[contactId].unshift(this._rowToMsg(row, uid));
        }
        // Unread count (only count once per contact, and never for contacts
        // whose conversation has already been loaded/read this session)
        if (!seen.has(contactId) && !row.is_read && row.receiver_id === uid) {
          // If unreadMap is already explicitly set to 0 for this contact,
          // it means we marked it read this session — don't restore the badge.
          if (this.unreadMap[contactId] !== 0) {
            this.unreadMap[contactId] = (this.unreadMap[contactId] || 0) + 1;
          }
        }
        seen.add(contactId);
      });

    } catch (err) {
      console.error('[Messages] preloadLatestMessages:', err);
    }
  },

  async loadMessagesFromSupabase(contactId) {
    try {
      const uid = await this.getCurrentUserId();
      if (!uid) return;
      const { data, error } = await window.supabase
        .from('messages')
        .select('id, sender_id, receiver_id, text, image_url, is_read, created_at')
        .or('and(sender_id.eq.' + uid + ',receiver_id.eq.' + contactId + '),and(sender_id.eq.' + contactId + ',receiver_id.eq.' + uid + ')')
        .order('created_at', { ascending: true });
      if (error) { console.error('[Messages] loadMessages error:', error); return; }
      // Soft-delete filter: hide messages sent before this user deleted the conversation
      const deletedAt = this.getConversationDeletedAt(uid, contactId);
      const deletedAtMs = deletedAt ? new Date(deletedAt).getTime() : 0;
      const rows = (data || []).filter(row => !deletedAtMs || new Date(row.created_at).getTime() > deletedAtMs);
      this.conversations[contactId] = rows.map(row => this._rowToMsg(row, uid));
      if (rows.length > 0) {
        this._lastPollTs[contactId] = rows[rows.length - 1].created_at;
      }
    } catch (err) {
      console.error('[Messages] loadMessagesFromSupabase:', err);
    }
  },

  _rowToMsg(row, myUserId) {
    return {
      id: row.id,
      from: row.sender_id === myUserId ? 'me' : row.sender_id,
      text: row.text || '',
      src: row.image_url || null,
      type: row.image_url ? 'image' : 'text',
      ts: new Date(row.created_at).getTime(),
    };
  },

  async sendToSupabase(contactId, text, imageUrl) {
    const uid = await this.getCurrentUserId();
    if (!uid) return null;
    // If the user had previously soft-deleted this conversation, clear that
    // marker now so the new message (and future ones) are visible again.
    this.clearConversationDeletedAt(uid, contactId);
    const { data, error } = await window.supabase
      .from('messages')
      .insert({ sender_id: uid, receiver_id: contactId, text: text || '', image_url: imageUrl || null, is_read: false })
      .select();
    if (error) { console.error('[Messages] sendToSupabase error:', error); return null; }
    if (!data || !data[0]) return null;
    // NOTE: do NOT push into conversations[] here.
    // sendMessage() owns the optimistic-temp → confirmed swap and calls
    // renderMessages() itself.  A push here would create a duplicate entry.
    const msg = this._rowToMsg(data[0], uid);
    this._lastPollTs[contactId] = data[0].created_at;
    return msg;
  },

  async markReadInSupabase(contactId) {
    const uid = await this.getCurrentUserId();
    if (!uid) return;
    this.unreadMap[contactId] = 0;
    try {
      await window.supabase.from('messages').update({ is_read: true, read_at: new Date().toISOString() })
        .eq('receiver_id', uid).eq('sender_id', contactId).eq('is_read', false);
    } catch (err) { console.error('[Messages] markReadInSupabase:', err); }
  },

  async deleteConversationInSupabase(contactId) {
    // SOFT-DELETE: we never remove rows from the database.
    // We record a deletion timestamp in localStorage so only THIS user's
    // view is cleared. The other person keeps their full conversation intact.
    const uid = await this.getCurrentUserId();
    if (!uid) return;
    const key = 'bl_conv_deleted__' + uid + '__' + contactId;
    localStorage.setItem(key, new Date().toISOString());
  },

  // Returns the ISO timestamp at which the current user soft-deleted a
  // conversation, or null if they never did.
  getConversationDeletedAt(myUserId, contactId) {
    if (!myUserId || !contactId) return null;
    const key = 'bl_conv_deleted__' + myUserId + '__' + contactId;
    return localStorage.getItem(key) || null;
  },

  // Wipe the soft-delete marker when the user sends a new message after
  // having previously deleted — so the chat reappears naturally.
  clearConversationDeletedAt(myUserId, contactId) {
    if (!myUserId || !contactId) return;
    const key = 'bl_conv_deleted__' + myUserId + '__' + contactId;
    localStorage.removeItem(key);
  },

  async pollNewMessages(contactId) {
    try {
      const uid = await this.getCurrentUserId();
      if (!uid) return;
      const since = this._lastPollTs[contactId];
      const { data } = await window.supabase
        .from('messages')
        .select('id, sender_id, receiver_id, text, image_url, is_read, created_at')
        .eq('sender_id', contactId)
        .eq('receiver_id', uid)
        .order('created_at', { ascending: true });
      if (!data || data.length === 0) return;
      // Use the later of: last-poll timestamp OR soft-delete timestamp, so
      // messages sent before the user deleted the conversation are never shown.
      const sinceMs = since ? new Date(since).getTime() : 0;
      const deletedAt = this.getConversationDeletedAt(uid, contactId);
      const deletedAtMs = deletedAt ? new Date(deletedAt).getTime() : 0;
      const floorMs = Math.max(sinceMs, deletedAtMs);
      const newRows = data.filter(r => new Date(r.created_at).getTime() > floorMs);
      if (newRows.length === 0) return;
      this._lastPollTs[contactId] = newRows[newRows.length - 1].created_at;
      const existingIds = new Set((this.conversations[contactId] || []).map(m => m.id));
      const trulyNew = newRows.filter(r => !existingIds.has(r.id));
      if (trulyNew.length === 0) return;
      if (!this.conversations[contactId]) this.conversations[contactId] = [];
      trulyNew.forEach(r => this.conversations[contactId].push(this._rowToMsg(r, uid)));
      if (this.activeId === contactId) {
        renderMessages(contactId);
        await this.markReadInSupabase(contactId);
      } else {
        this.unreadMap[contactId] = (this.unreadMap[contactId] || 0) + trulyNew.length;
        renderSidebar();
        const c = this.getContact(contactId);
        showToast('New message from ' + (c ? c.name : 'someone'));
      }
    } catch (err) {
      console.error('[Messages] pollNewMessages:', err);
    }
  },

  startPolling() {
    this.stopPolling();
    this._pollTimer = setInterval(async () => {
      for (const contact of this.contacts) {
        await this.pollNewMessages(contact.id);
      }
      renderSidebar();
    }, 5000);
  },

  stopPolling() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  },

  getContact(id) { return this.contacts.find(c => c.id === id); },
  getMessages(id) { return this.conversations[id] || []; },
  getLastMessage(userId) { const msgs = this.getMessages(userId); return msgs[msgs.length - 1] || null; },

  filteredContacts() {
    let list = this.contacts;
    if (this.filter === 'unread') list = list.filter(c => (this.unreadMap[c.id] || 0) > 0);
    else if (this.filter === 'matches') list = list.filter(c => c.isMatch);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const la = this.getLastMessage(a.id);
      const lb = this.getLastMessage(b.id);
      return (lb ? lb.ts : 0) - (la ? la.ts : 0);
    });
  },
};

/* ===================================================
   UTILITIES
   =================================================== */
function formatTime(ts) {
  const d = new Date(ts), now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDateLabel(ts) {
  const d = new Date(ts), now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function uidLocal() { return 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

function showToast(msg, duration) {
  duration = duration || 2500;
  const t = document.getElementById('msgToast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, duration);
}

/* ===================================================
   RENDER: SIDEBAR
   =================================================== */
function renderSidebar() {
  const list = document.getElementById('conversationsList');
  const emptyEl = document.getElementById('sidebarEmpty');
  if (!list || !emptyEl) return;
  const contacts = MessagesApp.filteredContacts();
  if (contacts.length === 0) { list.innerHTML = ''; emptyEl.style.display = 'flex'; return; }
  emptyEl.style.display = 'none';
  list.innerHTML = contacts.map(c => {
    const last = MessagesApp.getLastMessage(c.id);
    const unread = MessagesApp.unreadMap[c.id] || 0;
    const isActive = MessagesApp.activeId === c.id;
    const preview = last ? (last.type === 'image' ? '📷 Image' : escHtml((last.text || '').slice(0, 42))) : 'No messages yet';
    const time = last ? formatTime(last.ts) : '';
    return '<div class="conversation-item ' + (isActive ? 'active' : '') + ' ' + (unread > 0 ? 'unread' : '') + '" onclick="openConversation(\'' + c.id + '\')" data-id="' + c.id + '">' +
      '<div class="conv-avatar">' + (c.avatar ? '<img src="' + escHtml(c.avatar) + '" alt="' + escHtml(c.name) + '" onerror="this.outerHTML='<div class=conv-avatar-placeholder>'+getInitials(c.name)+'</div>'">' : '<div class="conv-avatar-placeholder">' + getInitials(c.name) + '</div>') + (c.online ? '<span class="conv-online-dot"></span>' : '') + '</div>' +
      '<div class="conv-body"><div class="conv-top"><span class="conv-name">' + escHtml(c.name) + '</span><span class="conv-time">' + time + '</span></div>' +
      '<div class="conv-bottom"><span class="conv-preview">' + preview + '</span>' + (unread > 0 ? '<span class="conv-unread-badge">' + unread + '</span>' : (c.isMatch ? '<span class="conv-match-badge">💚 Match</span>' : '')) + '</div></div></div>';
  }).join('');
}

/* ===================================================
   RENDER: MESSAGES
   =================================================== */
function renderMessages(userId) {
  const area = document.getElementById('messagesArea');
  if (!area) return;
  const msgs = MessagesApp.getMessages(userId);
  const contact = MessagesApp.getContact(userId);
  if (!msgs.length) {
    area.innerHTML = '<div class="chat-welcome" style="flex:1;"><div class="welcome-illustration" style="font-size:52px;margin-bottom:16px;">💬</div><p style="color:var(--text-muted);font-size:14px;">Say hello to ' + (contact ? escHtml(contact.name) : 'your match') + '!</p></div>';
    return;
  }
  let html = '', lastDateLabel = '';
  msgs.forEach((msg, i) => {
    const dateLabel = formatDateLabel(msg.ts);
    if (dateLabel !== lastDateLabel) { html += '<div class="date-divider">' + dateLabel + '</div>'; lastDateLabel = dateLabel; }
    const isSent = msg.from === 'me';
    const showAvatar = !isSent && (i === msgs.length - 1 || msgs[i + 1].from !== msg.from);
    const cName = contact ? contact.name : '';
    const cAvatar = contact && contact.avatar ? contact.avatar : '';
    const hideCls = showAvatar ? '' : ' hidden';
    const cInitials = getInitials(cName);
    const avatarHtml = !isSent ? (
      cAvatar
        ? '<img class="msg-avatar' + hideCls + '" src="' + cAvatar + '" alt="' + escHtml(cName) + '" onerror="this.outerHTML='<div class=\"msg-avatar' + hideCls + ' avatar-initials\">' + cInitials + '</div>'">'
        : '<div class="msg-avatar' + hideCls + ' avatar-initials">' + cInitials + '</div>'
    ) : '';
    const bubbleContent = msg.type === 'image'
      ? '<img class="msg-image" src="' + msg.src + '" alt="Image" onclick="openLightbox(\'' + msg.src + '\')" loading="lazy">'
      : escHtml(msg.text) + '<span class="msg-time">' + formatTime(msg.ts) + (isSent ? ' <span class="msg-status">✓</span>' : '') + '</span>';
    html += '<div class="message-row ' + (isSent ? 'sent' : 'received') + '">' + avatarHtml + '<div class="message-bubble">' + bubbleContent + '</div></div>';
  });
  area.innerHTML = html;
  area.scrollTop = area.scrollHeight;
}

/* ===================================================
   OPEN / CLOSE CONVERSATION
   =================================================== */
async function openConversation(userId) {
  const contact = MessagesApp.getContact(userId);
  if (!contact) return;
  MessagesApp.activeId = userId;

  const chatPanel = document.getElementById('chatPanel');
  const sidebar = document.getElementById('conversationsSidebar');
  const welcome = document.getElementById('chatWelcome');
  const activeChat = document.getElementById('activeChat');
  if (chatPanel) chatPanel.classList.add('visible');
  if (sidebar) sidebar.classList.add('hidden');
  if (welcome) welcome.style.display = 'none';
  if (activeChat) activeChat.style.display = 'flex';

  const avatarImg = document.getElementById('chatAvatarImg');
  const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
  if (avatarImg && contact.avatar) {
    avatarImg.src = contact.avatar;
    avatarImg.style.display = 'block';
    if (chatHeaderAvatar) chatHeaderAvatar.classList.remove('initials-mode');
  } else if (chatHeaderAvatar) {
    avatarImg.style.display = 'none';
    chatHeaderAvatar.classList.add('initials-mode');
    chatHeaderAvatar.setAttribute('data-initials', getInitials(contact.name));
  }
  const nameEl = document.getElementById('chatHeaderName');
  const statusEl = document.getElementById('chatHeaderStatus');
  const dotEl = document.getElementById('onlineDot');
  if (nameEl) nameEl.textContent = contact.name;
  if (statusEl) statusEl.textContent = contact.online ? '🟢 Online' : contact.role;
  if (dotEl) dotEl.classList.toggle('visible', contact.online);
  updateInfoPanel(contact);

  const area = document.getElementById('messagesArea');
  if (area) area.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;">Loading messages…</div>';

  await MessagesApp.loadMessagesFromSupabase(userId);
  await MessagesApp.markReadInSupabase(userId);
  MessagesApp.unreadMap[userId] = 0;

  renderMessages(userId);
  renderSidebar();

  setTimeout(() => { const input = document.getElementById('messageInput'); if (input) input.focus(); }, 100);
}

function backToList() {
  MessagesApp.activeId = null;
  const chatPanel = document.getElementById('chatPanel');
  const sidebar = document.getElementById('conversationsSidebar');
  const activeChat = document.getElementById('activeChat');
  const welcome = document.getElementById('chatWelcome');
  if (chatPanel) chatPanel.classList.remove('visible');
  if (sidebar) sidebar.classList.remove('hidden');
  if (activeChat) activeChat.style.display = 'none';
  if (welcome) welcome.style.display = 'flex';
  renderSidebar();
}

/* ===================================================
   SEND MESSAGE
   =================================================== */
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = (input ? input.value : '').trim();
  if (!text || !MessagesApp.activeId) return;

  const tempId = uidLocal();
  const tempMsg = { id: tempId, from: 'me', text: text, type: 'text', ts: Date.now() };
  if (!MessagesApp.conversations[MessagesApp.activeId]) MessagesApp.conversations[MessagesApp.activeId] = [];
  MessagesApp.conversations[MessagesApp.activeId].push(tempMsg);
  if (input) { input.value = ''; input.style.height = 'auto'; }
  renderMessages(MessagesApp.activeId);
  renderSidebar();

  const saved = await MessagesApp.sendToSupabase(MessagesApp.activeId, text, null);
  if (saved) {
    const msgs = MessagesApp.conversations[MessagesApp.activeId];
    const idx = msgs.findIndex(m => m.id === tempId);
    if (idx !== -1) msgs[idx] = saved;
    renderMessages(MessagesApp.activeId);
    renderSidebar();
  }
}

function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* ===================================================
   IMAGE UPLOAD
   =================================================== */
async function handleImageUpload(input) {
  if (!input.files || !input.files[0] || !MessagesApp.activeId) return;
  const file = input.files[0];
  input.value = '';
  showToast('Uploading image…');
  let imageUrl = null;
  try {
    const uid_val = await MessagesApp.getCurrentUserId();
    const path = uid_val + '/' + Date.now() + '_' + file.name;
    const { data } = await window.supabase.storage.from('messages').upload(path, file);
    if (data) {
      const { data: urlData } = window.supabase.storage.from('messages').getPublicUrl(path);
      imageUrl = urlData && urlData.publicUrl ? urlData.publicUrl : null;
    }
  } catch (err) { console.error('[Messages] image upload error:', err); showToast('Image upload failed'); return; }
  if (!imageUrl) { showToast('Image upload failed'); return; }

  const tempId = uidLocal();
  const tempMsg = { id: tempId, from: 'me', src: imageUrl, type: 'image', ts: Date.now() };
  if (!MessagesApp.conversations[MessagesApp.activeId]) MessagesApp.conversations[MessagesApp.activeId] = [];
  MessagesApp.conversations[MessagesApp.activeId].push(tempMsg);
  renderMessages(MessagesApp.activeId);
  renderSidebar();

  const saved = await MessagesApp.sendToSupabase(MessagesApp.activeId, '', imageUrl);
  if (saved) {
    const msgs = MessagesApp.conversations[MessagesApp.activeId];
    const idx = msgs.findIndex(m => m.id === tempId);
    if (idx !== -1) msgs[idx] = saved;
    renderMessages(MessagesApp.activeId);
    renderSidebar();
    showToast('Image sent! 📷');
  }
}

function handleTyping() {}

/* ===================================================
   EMOJI PICKER
   =================================================== */
function toggleEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  if (!picker) return;
  if (picker.style.display === 'none') { renderEmojiGrid(); picker.style.display = 'block'; document.addEventListener('click', closeEmojiOnOutside, { once: true }); }
  else picker.style.display = 'none';
}

function renderEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  grid.innerHTML = EMOJIS.map(e => '<button class="emoji-btn-item" onclick="insertEmoji(\'' + e + '\')">' + e + '</button>').join('');
}

function insertEmoji(emoji) {
  const input = document.getElementById('messageInput');
  if (!input) return;
  const start = input.selectionStart, end = input.selectionEnd;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  input.focus(); autoResize(input);
  const picker = document.getElementById('emojiPicker');
  if (picker) picker.style.display = 'none';
}

function closeEmojiOnOutside(e) {
  const picker = document.getElementById('emojiPicker');
  if (picker && !picker.contains(e.target)) picker.style.display = 'none';
}

/* ===================================================
   FILTER / SEARCH
   =================================================== */
function setFilter(filter, btn) {
  MessagesApp.filter = filter;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderSidebar();
}

function filterConversations(query) {
  MessagesApp.searchQuery = query;
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
  renderSidebar();
}

function clearSearch() {
  const input = document.getElementById('sidebarSearch');
  if (input) input.value = '';
  filterConversations('');
}

/* ===================================================
   NEW CHAT MODAL
   =================================================== */
function openNewChat() {
  const modal = document.getElementById('newChatModal');
  if (!modal) return;
  modal.style.display = 'flex';
  const si = document.getElementById('newChatSearchInput');
  if (si) si.value = '';
  renderNewChatList(MessagesApp.contacts);
  setTimeout(() => { if (si) si.focus(); }, 100);
}

function closeNewChat() { const m = document.getElementById('newChatModal'); if (m) m.style.display = 'none'; }

function searchNewChatContacts(query) {
  const q = query.toLowerCase();
  const filtered = q ? MessagesApp.contacts.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)) : MessagesApp.contacts;
  renderNewChatList(filtered);
}

function renderNewChatList(contacts) {
  const list = document.getElementById('newChatList');
  if (!list) return;
  if (!contacts.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;font-size:14px;">No contacts found</p>'; return; }
  list.innerHTML = contacts.map(c =>
    '<div class="new-chat-user" onclick="startChat(\'' + c.id + '\')">' +
    '<div class="nc-avatar">' + (c.avatar ? '<img src="' + escHtml(c.avatar) + '" alt="' + escHtml(c.name) + '" onerror="this.outerHTML=\'<div class=\\\"nc-avatar-initials\\\">\'+getInitials(\'' + escHtml(c.name) + '\')+\'</div>\'">' : '<div class="nc-avatar-initials">' + getInitials(c.name) + '</div>') + '</div>' +
    '<div class="nc-info"><h4>' + escHtml(c.name) + '</h4><span>' + escHtml(c.role) + '</span></div>' +
    (c.isMatch ? '<span class="nc-match-badge">💚 Match</span>' : '') + '</div>'
  ).join('');
}

function startChat(userId) { closeNewChat(); openConversation(userId); }

/* ===================================================
   INFO PANEL
   =================================================== */
function toggleChatInfo() {
  const panel = document.getElementById('chatInfoPanel');
  if (!panel) return;
  MessagesApp.chatInfoOpen = !MessagesApp.chatInfoOpen;
  panel.style.display = MessagesApp.chatInfoOpen ? 'block' : 'none';
}

function updateInfoPanel(contact) {
  const n = document.getElementById('infoName'), r = document.getElementById('infoRole'), a = document.getElementById('infoAvatar');
  if (n) n.textContent = contact.name;
  if (r) r.textContent = contact.role;
  if (a) a.innerHTML = contact.avatar ? '<img src="' + escHtml(contact.avatar) + '" alt="' + escHtml(contact.name) + '">' : '<div class="info-avatar-initials">' + getInitials(contact.name) + '</div>';
  const grid = document.getElementById('infoAnimalsGrid'), sec = document.getElementById('infoAnimals');
  if (grid && sec) {
    if (contact.animals && contact.animals.length) {
      grid.innerHTML = contact.animals.map(a => '<div class="info-animal-card"><span class="animal-emoji">' + escHtml(a.emoji||'') + '</span><div class="animal-name">' + escHtml(a.name||'') + '</div><div class="animal-breed">' + escHtml(a.breed||'') + '</div></div>').join('');
      sec.style.display = 'block';
    } else { sec.style.display = 'none'; }
  }
}

function viewProfile() {
  if (!MessagesApp.activeId) return;
  const userId = MessagesApp.activeId;
  // Close messages modal first, then open the breeder profile panel
  closeMessagesModal();
  // Give the modal time to close before opening the profile panel
  setTimeout(() => {
    if (typeof openBreederProfile === 'function') {
      openBreederProfile(userId);
    } else {
      // Fallback: navigate to profile page with user param
      const inSubfolder = window.location.pathname.includes('/pages/');
      window.location.href = (inSubfolder ? '' : 'pages/') + 'profile.html?user=' + userId;
    }
  }, 150);
}

/* ===================================================
   DELETE CONVERSATION
   =================================================== */
function confirmDeleteConversation() { const m = document.getElementById('deleteModal'); if (m) m.style.display = 'flex'; }
function closeDeleteModal() { const m = document.getElementById('deleteModal'); if (m) m.style.display = 'none'; }

async function deleteConversation() {
  if (!MessagesApp.activeId) return;
  const contactId = MessagesApp.activeId;
  closeDeleteModal();
  showToast('Clearing messages…');
  await MessagesApp.deleteConversationInSupabase(contactId);
  // Only clear messages — keep the contact in the sidebar
  MessagesApp.conversations[contactId] = [];
  MessagesApp.unreadMap[contactId] = 0;
  if (MessagesApp.chatInfoOpen) toggleChatInfo();
  showToast('Messages cleared');
  renderMessages(contactId);
  renderSidebar();
}

/* ===================================================
   LIGHTBOX
   =================================================== */
function openLightbox(src) {
  const lb = document.getElementById('lightbox'), img = document.getElementById('lightboxImg');
  if (!lb || !img) return;
  img.src = src; lb.style.display = 'flex';
  document.body.classList.add('messages-open');
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'none';
  if (!document.getElementById('messagesModalOverlay') || !document.getElementById('messagesModalOverlay').classList.contains('active')) {
    document.body.classList.remove('messages-open');
  }
}

/* ===================================================
   OPEN / CLOSE MODAL
   =================================================== */
async function openMessagesModal(chatDataArg) {
  const overlay = document.getElementById('messagesModalOverlay');
  if (!overlay) return;

  // ── Resolve the target contact from argument OR sessionStorage ──────────
  // Prefer the explicit argument (passed by messageBreederFromProfile /
  // messageMatchBreeder) so the right conversation always opens regardless
  // of modal state.  Fall back to sessionStorage for legacy callers.
  let targetChat = chatDataArg || null;
  if (!targetChat) {
    const stored = sessionStorage.getItem('chatWith');
    if (stored) {
      try { targetChat = JSON.parse(stored); } catch (_) {}
    }
  }
  // Always clear sessionStorage so a stale entry never hijacks a later open.
  sessionStorage.removeItem('chatWith');

  // ── If modal already open: just navigate to the requested conversation ──
  if (overlay.classList.contains('active')) {
    if (targetChat && targetChat.id) {
      if (!MessagesApp.getContact(targetChat.id)) {
        MessagesApp.contacts.push({ id: targetChat.id, name: targetChat.name || 'Breeder', avatar: targetChat.avatar || '', role: 'Breeder', isMatch: true, online: false });
        renderSidebar();
      }
      openConversation(targetChat.id);
    }
    return;
  }

  // ── Open the modal fresh ────────────────────────────────────────────────
  overlay.classList.add('active');
  document.body.classList.add('messages-open');

  const isFirstLoad = MessagesApp.contacts.length === 0;
  if (isFirstLoad) {
    await MessagesApp.loadMatchesFromSupabase();
    await MessagesApp.preloadLatestMessages();
  } else {
    // Re-load matches in case new ones appeared, but do NOT re-run
    // preloadLatestMessages — that would restore unread badges for
    // conversations the user already read this session.
    await MessagesApp.loadMatchesFromSupabase();
  }
  renderSidebar();
  renderEmojiGrid();
  MessagesApp.startPolling();

  if (targetChat && targetChat.id) {
    if (!MessagesApp.getContact(targetChat.id)) {
      MessagesApp.contacts.push({ id: targetChat.id, name: targetChat.name || 'Breeder', avatar: targetChat.avatar || '', role: 'Breeder', isMatch: true, online: false });
      renderSidebar();
    }
    setTimeout(() => openConversation(targetChat.id), 150);
  }
}

function closeMessagesModal() {
  const overlay = document.getElementById('messagesModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.classList.remove('messages-open');
  MessagesApp.stopPolling();
  // Preserve unreadMap and conversations so re-opening doesn't reset read state.
  // Only clean up UI elements.
  const newChat = document.getElementById('newChatModal');
  const delModal = document.getElementById('deleteModal');
  const emojiPicker = document.getElementById('emojiPicker');
  if (newChat) newChat.style.display = 'none';
  if (delModal) delModal.style.display = 'none';
  if (emojiPicker) emojiPicker.style.display = 'none';
  closeLightbox();
}

/* ===================================================
   GLOBAL EXPORTS
   =================================================== */
window.openMessagesModal           = openMessagesModal;
window.closeMessagesModal          = closeMessagesModal;
window.openMessengerGlobal         = openMessagesModal;
window.openMessenger               = openMessagesModal;
window.closeMessenger              = closeMessagesModal;
window.MessagesApp                 = MessagesApp;
window.backToList                  = backToList;
window.sendMessage                 = sendMessage;
window.handleInputKeydown          = handleInputKeydown;
window.autoResize                  = autoResize;
window.handleTyping                = handleTyping;
window.handleImageUpload           = handleImageUpload;
window.toggleEmojiPicker           = toggleEmojiPicker;
window.renderEmojiGrid             = renderEmojiGrid;
window.insertEmoji                 = insertEmoji;
window.setFilter                   = setFilter;
window.filterConversations         = filterConversations;
window.clearSearch                 = clearSearch;
window.openConversation            = openConversation;
window.viewProfile                 = viewProfile;
window.toggleChatInfo              = toggleChatInfo;
window.confirmDeleteConversation   = confirmDeleteConversation;
window.closeDeleteModal            = closeDeleteModal;
window.deleteConversation          = deleteConversation;
window.openNewChat                 = openNewChat;
window.closeNewChat                = closeNewChat;
window.searchNewChatContacts       = searchNewChatContacts;
window.startChat                   = startChat;
window.openLightbox                = openLightbox;
window.closeLightbox               = closeLightbox;

/* ===================================================
   INIT
   =================================================== */
function _messagesInit() {
  MessagesApp.contacts = [];
  MessagesApp.conversations = {};
  MessagesApp.unreadMap = {};

  renderSidebar();
  renderEmojiGrid();

  ['newChatModal', 'deleteModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
  });

  const msgInput = document.getElementById('messageInput');
  if (msgInput) msgInput.addEventListener('click', () => { const p = document.getElementById('emojiPicker'); if (p) p.style.display = 'none'; });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const nc = document.getElementById('newChatModal');
    const dm = document.getElementById('deleteModal');
    const ep = document.getElementById('emojiPicker');
    if (nc) nc.style.display = 'none';
    if (dm) dm.style.display = 'none';
    if (ep) ep.style.display = 'none';
    closeLightbox();
    closeMessagesModal();
  });

  const navMessages = document.getElementById('nav-messages');
  if (navMessages) navMessages.classList.add('active');

  const overlay = document.getElementById('messagesModalOverlay');
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === this) closeMessagesModal(); });

  if (window.location.pathname.split('/').pop() === 'messages.html') openMessagesModal();

  const params = new URLSearchParams(window.location.search);
  const openId = params.get('open');
  if (openId) {
    openMessagesModal().then(() => { if (MessagesApp.getContact(openId)) openConversation(openId); });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _messagesInit);
} else {
  setTimeout(_messagesInit, 0);
}

// ── Live avatar sync ──────────────────────────────────────────────────────
// When the logged-in user changes their profile picture, update their avatar
// in all already-rendered message bubbles, conversation headers, and the
// sent-side chat avatar (shown on the receiver's screen after a reload, but
// also used locally if the sender's own avatar appears anywhere).
window.addEventListener('breedlink:avatarChanged', function (e) {
    const { userId, avatarUrl } = e.detail || {};
    if (!userId || !avatarUrl) return;

    // Update in-memory contacts list so future renders use the fresh URL
    if (MessagesApp && Array.isArray(MessagesApp.contacts)) {
        MessagesApp.contacts.forEach(function (c) {
            if (c.id === userId) c.avatar = avatarUrl;
        });
    }

    // Update all avatar <img> elements already in the DOM
    document.querySelectorAll(
        '.conv-avatar img, .msg-avatar, #chatAvatarImg, .nc-avatar img'
    ).forEach(function (img) {
        const src = img.getAttribute('src') || '';
        if (src.includes('/avatars/') && src.includes(userId)) {
            img.src = avatarUrl;
        }
    });

    // If a conversation sidebar is currently open, re-render it
    if (typeof renderConversations === 'function') {
        try { renderConversations(); } catch (e) { /* non-fatal */ }
    }
});
