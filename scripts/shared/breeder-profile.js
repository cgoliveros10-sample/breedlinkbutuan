// ============================================
// RATE BREEDER
// ============================================

if (typeof currentRating === "undefined") { var currentRating = 0; }
if (typeof currentRateUserId === "undefined") { var currentRateUserId = null; }
if (typeof currentRateUserName === "undefined") { var currentRateUserName = ''; }

// ── Build the rate modal once and append directly to <body> ──────────────
function _ensureEditCommentModal() {
    if (document.getElementById('bpEditCommentModal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'bpEditCommentModal';
    overlay.style.cssText = [
        'display:none',
        'position:fixed',
        'inset:0',
        'z-index:9999999',
        'background:rgba(0,0,0,0.6)',
        'backdrop-filter:blur(6px)',
        '-webkit-backdrop-filter:blur(6px)',
        'align-items:center',
        'justify-content:center',
        'padding:16px',
        'box-sizing:border-box',
    ].join(';');
    overlay.innerHTML = `
    <div style="
        max-width:480px;width:100%;background:#fff;border-radius:28px;
        padding:32px 28px 24px;position:relative;
        box-shadow:0 25px 60px rgba(0,0,0,0.3);border:1px solid #e5e7eb;
        animation:ecmSlideUp .22s ease;font-family:inherit;
    ">
      <style>@keyframes ecmSlideUp{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}</style>
      <button id="bpEditCommentCloseX" style="
          position:absolute;top:14px;right:14px;background:#f3f4f6;border:none;
          font-size:18px;cursor:pointer;color:#6b7280;border-radius:50%;
          width:34px;height:34px;display:flex;align-items:center;justify-content:center;line-height:1;
          transition:background .2s;
      " onmouseover="this.style.background='#fee2e2';this.style.color='#ef4444'" onmouseout="this.style.background='#f3f4f6';this.style.color='#6b7280'">×</button>
      <h3 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#2E6B4E;padding-right:40px;">✏️ Edit Comment</h3>
      <textarea id="bpEditCommentText" rows="3" placeholder="Edit your comment..." style="
          width:100%;box-sizing:border-box;
          padding:14px 18px;margin-bottom:16px;
          border:2px solid #e5e7eb;border-radius:14px;
          font-size:15px;font-family:inherit;color:#111827;
          resize:vertical;outline:none;transition:all .3s;
          background:#f9fafb;line-height:1.5;
      " onfocus="this.style.borderColor='#2E6B4E';this.style.background='#fff';this.style.boxShadow='0 0 0 4px rgba(46,107,78,0.1)'" onblur="this.style.borderColor='#e5e7eb';this.style.background='#f9fafb';this.style.boxShadow='none'"></textarea>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button id="bpEditCommentSave" style="
            flex:1;padding:14px;border-radius:14px;border:none;
            background:linear-gradient(135deg,#2E6B4E,#3B7A57);color:#fff;
            font-size:15px;font-weight:600;cursor:pointer;
            box-shadow:0 4px 15px rgba(46,107,78,0.3);
            transition:all .3s;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 25px rgba(46,107,78,0.4)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 15px rgba(46,107,78,0.3)'">💾 Save</button>
        <button id="bpEditCommentCancel" style="
            flex:1;padding:14px;border-radius:14px;border:none;
            background:#f3f4f6;color:#374151;
            font-size:15px;font-weight:600;cursor:pointer;
            transition:all .3s;
        " onmouseover="this.style.background='#fee2e2';this.style.color='#ef4444'" onmouseout="this.style.background='#f3f4f6';this.style.color='#374151'">❌ Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('bpEditCommentCancel').addEventListener('click', _closeEditCommentModal);
    document.getElementById('bpEditCommentCloseX').addEventListener('click', _closeEditCommentModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) _closeEditCommentModal(); });
}

function _closeEditCommentModal() {
    const m = document.getElementById('bpEditCommentModal');
    if (m) m.style.display = 'none';
}

// Returns a Promise that resolves with the new text or null if cancelled
function _showEditCommentModal(currentText) {
    _ensureEditCommentModal();
    const modal = document.getElementById('bpEditCommentModal');
    const ta = document.getElementById('bpEditCommentText');
    const saveBtn = document.getElementById('bpEditCommentSave');
    ta.value = currentText || '';
    document.body.appendChild(modal); // move to top of stacking order
    modal.style.display = 'flex';
    setTimeout(() => ta.focus(), 50);
    return new Promise((resolve) => {
        // Remove old listeners by cloning
        const newSave = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSave, saveBtn);
        const cancelEl = document.getElementById('bpEditCommentCancel');
        const newCancel = cancelEl.cloneNode(true);
        cancelEl.parentNode.replaceChild(newCancel, cancelEl);
        const closeX = document.getElementById('bpEditCommentCloseX');
        if (closeX) { const newX = closeX.cloneNode(true); closeX.parentNode.replaceChild(newX, closeX); newX.addEventListener('click', function() { _closeEditCommentModal(); resolve(null); }); }
        newSave.addEventListener('click', function() {
            const val = ta.value.trim();
            if (!val) return;
            _closeEditCommentModal();
            resolve(val);
        });
        newCancel.addEventListener('click', function() {
            _closeEditCommentModal();
            resolve(null);
        });
        // re-wire overlay click
        modal.onclick = function(e) { if (e.target === modal) { _closeEditCommentModal(); resolve(null); } };
    });
}

function _ensureRateModal() {
    if (document.getElementById('rateModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'rateModal';
    overlay.style.cssText = [
        'display:none',
        'position:fixed',
        'inset:0',
        'z-index:999999',
        'background:rgba(0,0,0,0.6)',
        'backdrop-filter:blur(6px)',
        '-webkit-backdrop-filter:blur(6px)',
        'align-items:center',
        'justify-content:center',
        'padding:16px',
        'box-sizing:border-box',
    ].join(';');

    overlay.innerHTML = `
    <div id="rateModalCard" style="
        max-width:420px;width:100%;background:#fff;border-radius:24px;
        padding:28px 24px 24px;position:relative;
        box-shadow:0 32px 80px rgba(0,0,0,0.35);
        animation:rmSlideUp .22s ease;
        font-family:inherit;
    ">
      <style>@keyframes rmSlideUp{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}</style>

      <!-- close -->
      <button id="rateCloseBtn" style="
          position:absolute;top:14px;right:14px;
          background:#f3f4f6;border:none;font-size:18px;
          cursor:pointer;color:#6b7280;border-radius:50%;
          width:34px;height:34px;display:flex;
          align-items:center;justify-content:center;line-height:1;">×</button>

      <!-- header -->
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:36px;margin-bottom:6px;">⭐</div>
        <h3 style="margin:0 0 6px;font-size:18px;font-weight:800;color:#111827;">Write a Review</h3>
        <p id="rateBreederName" style="margin:0;color:#6b7280;font-size:13px;"></p>
      </div>

      <!-- stars -->
      <div style="margin-bottom:18px;">
        <div id="starRating" style="display:flex;gap:8px;justify-content:center;margin-bottom:10px;">
          ${[1,2,3,4,5].map(v=>`<span class="star-btn" data-val="${v}" style="
              font-size:44px;cursor:pointer;color:#d1d5db;
              transition:transform .15s,color .15s;
              user-select:none;line-height:1;display:inline-block;">★</span>`).join('')}
        </div>
        <div style="text-align:center;">
          <span id="rateSelectedText" style="
              font-size:13px;font-weight:600;color:#d97706;
              background:#fffbeb;padding:5px 16px;
              border-radius:50px;border:1px solid #fde68a;
              display:inline-block;">Tap a star to rate</span>
        </div>
      </div>

      <!-- comment -->
      <textarea id="rateComment" placeholder="Share your experience (optional)..." rows="3" style="
          width:100%;padding:12px 14px;border-radius:12px;
          border:1.5px solid #e5e7eb;font-size:13px;
          resize:none;box-sizing:border-box;margin-bottom:16px;
          font-family:inherit;color:#374151;outline:none;
          transition:border-color .2s;"></textarea>

      <!-- submit -->
      <button id="submitRatingBtn" style="
          width:100%;padding:14px;
          background:linear-gradient(135deg,#f59e0b,#d97706);
          color:white;border:none;border-radius:12px;
          font-size:15px;font-weight:700;cursor:pointer;
          box-shadow:0 4px 14px rgba(217,119,6,0.3);
          transition:all .2s;letter-spacing:.3px;">
        Submit Review
      </button>
    </div>`;

    document.body.appendChild(overlay);

    // Wire up close button
    document.getElementById('rateCloseBtn').addEventListener('click', closeRateModal);

    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeRateModal();
    });

    // Note: star click/hover listeners are attached fresh in openRateModal()
    // each time the modal opens, to guarantee currentRating closure is current.

    // Submit
    document.getElementById('submitRatingBtn').addEventListener('click', submitRating);

    // Textarea focus styles
    const ta = document.getElementById('rateComment');
    ta.addEventListener('focus', () => ta.style.borderColor = '#d97706');
    ta.addEventListener('blur',  () => ta.style.borderColor = '#e5e7eb');
}

function _updateStars(val, preview) {
    const colors = ['','#ef4444','#f97316','#eab308','#84cc16','#22c55e'];
    const labels = ['','Poor','Fair','Good','Great','Excellent!'];
    document.querySelectorAll('#starRating .star-btn').forEach(star => {
        const sv = parseInt(star.dataset.val);
        const active = sv <= val;
        star.style.color     = active ? (colors[val] || '#f59e0b') : '#d1d5db';
        star.style.transform = active ? 'scale(1.2)' : 'scale(1)';
    });
    if (!preview) {
        const el = document.getElementById('rateSelectedText');
        if (el) el.textContent = val ? `${val} star${val>1?'s':''} — ${labels[val]}` : 'Tap a star to rate';
    }
}

function openRateModal(userId, userName, isEditMode) {
    if (!userId || userId === 'null' || userId === 'undefined') {
        showToast('Cannot identify this user', 'error'); return;
    }
    _ensureRateModal();

    currentRateUserId   = String(userId);
    currentRateUserName = userName || 'Breeder';
    currentRating       = 0;
    // Track whether this was opened via the Edit button on an existing review
    window._bpIsEditMode = !!isEditMode;

    const nameEl  = document.getElementById('rateBreederName');
    const comment = document.getElementById('rateComment');
    const selText = document.getElementById('rateSelectedText');
    const btn     = document.getElementById('submitRatingBtn');

    // Check if user already has a review — pre-fill for editing
    const existingReview = _bp.ratings?.find(r => _bp.meId && String(r.rater_id) === String(_bp.meId));
    const prefillRating  = existingReview?.rating || 0;

    if (nameEl)  nameEl.textContent  = existingReview
        ? `Edit your review for ${currentRateUserName}`
        : `How was your experience with ${currentRateUserName}?`;
    if (comment) comment.value = existingReview?.comment || '';
    if (selText) selText.textContent = existingReview ? `${prefillRating} star${prefillRating>1?'s':''} selected` : 'Tap a star to rate';
    if (btn) {
        btn.disabled    = false;
        btn.textContent = existingReview ? 'Update Review' : 'Submit Review';
        btn.style.opacity = '1';
        // Store whether this is an edit so the finally block can restore correctly
        btn.dataset.isEdit = existingReview ? '1' : '0';
    }

    // Set currentRating BEFORE calling _updateStars so the label renders correctly
    currentRating = prefillRating;
    _updateStars(prefillRating);

    // Re-wire star click/hover handlers every time the modal opens to prevent
    // stale closures or detached-listener bugs when the modal is reused
    const starContainer = document.getElementById('starRating');
    if (starContainer) {
        // Clone the container to remove any previously attached listeners
        const fresh = starContainer.cloneNode(true);
        starContainer.parentNode.replaceChild(fresh, starContainer);

        fresh.addEventListener('click', function(e) {
            const star = e.target.closest('.star-btn');
            if (!star) return;
            const val = parseInt(star.dataset.val);
            if (val) {
                currentRating = val;
                _updateStars(val);
                console.log('[openRateModal] star clicked → currentRating =', currentRating);
            }
        });

        fresh.addEventListener('mouseover', function(e) {
            const star = e.target.closest('.star-btn');
            if (!star) return;
            _updateStars(parseInt(star.dataset.val), true);
        });

        fresh.addEventListener('mouseout', function() {
            _updateStars(currentRating);
        });
    }

    const overlay = document.getElementById('rateModal');
    overlay.style.display = 'flex';

    // Force paint so animation runs
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}

function closeRateModal() {
    const overlay = document.getElementById('rateModal');
    if (overlay) overlay.style.display = 'none';
}

// keep backward-compat alias
function setRating(val) { currentRating = val; _updateStars(val); }


async function submitRating() {
    console.log('[submitRating] called — rating:', currentRating, 'userId:', currentRateUserId, 'meId:', _bp.meId);
    if (!currentRating) { showToast('Please select a rating', 'error'); return; }
    if (!currentRateUserId) { showToast('No user selected to rate', 'error'); return; }

    // Use _bp.meId as the authoritative current user ID
    if (!_bp.meId) {
        try {
            const { data } = await window.supabase.auth.getUser();
            _bp.meId = data?.user?.id || null;
        } catch(_) {}
    }
    if (!_bp.meId) { showToast('Please sign in to rate', 'error'); return; }

    // Prevent rating yourself — but allow editing an existing review even on own profile
    if (!window._bpIsEditMode && _bp.meId === currentRateUserId) { showToast("You can't rate yourself!", 'error'); return; }

    const comment = document.getElementById('rateComment')?.value.trim() || '';
    const btn = document.getElementById('submitRatingBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; btn.style.opacity = '0.7'; }

    try {
        // Force-refresh token before DB operations
        try {
            const rToken = sessionStorage.getItem('breedlink_refresh_token');
            if (rToken) {
                const rRes = await fetch(
                    window.SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token',
                    { method:'POST', headers:{'Content-Type':'application/json','apikey':window.SUPABASE_ANON_KEY},
                      body: JSON.stringify({ refresh_token: rToken }) }
                );
                const rData = await rRes.json();
                if (rData.access_token) sessionStorage.setItem('breedlink_token', rData.access_token);
                if (rData.refresh_token) sessionStorage.setItem('breedlink_refresh_token', rData.refresh_token);
            }
        } catch(_) {}

        // Use explicit UPDATE if editing, INSERT if new — avoids the
        // Supabase upsert bug where it tries to set "updated_at" which doesn't exist.
        const isEditing = window._bpIsEditMode || btn?.dataset.isEdit === '1';
        console.log('[submitRating]', isEditing ? 'updating' : 'inserting',
            '— rater_id:', _bp.meId, 'rated_user_id:', currentRateUserId, 'rating:', currentRating);

        if (isEditing) {
            const { error: updateErr } = await window.supabase
                .from('ratings')
                .update({ rating: currentRating, comment: comment })
                .eq('rater_id', _bp.meId)
                .eq('rated_user_id', currentRateUserId);
            if (updateErr) throw updateErr;
        } else {
            const { error: insertErr } = await window.supabase
                .from('ratings')
                .insert({ rater_id: _bp.meId, rated_user_id: currentRateUserId, rating: currentRating, comment: comment });
            if (insertErr) throw insertErr;
        }

        // Recalculate and update average rating in profiles.stats (best-effort)
        try {
            const { data: ratingData, error: fetchErr } = await window.supabase
                .from('ratings').select('rating').eq('rated_user_id', currentRateUserId);

            if (!fetchErr && ratingData && ratingData.length > 0) {
                const avg = parseFloat((ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length).toFixed(1));
                const { data: profileData } = await window.supabase.from('profiles').select('stats').eq('id', currentRateUserId).single();
                const existingStats = profileData?.stats || {};
                const { error: updateErr } = await window.supabase.from('profiles').update({
                    stats: { ...existingStats, rating: avg }
                }).eq('id', currentRateUserId);
                if (updateErr) console.warn('[submitRating] profile stats update failed (non-fatal):', updateErr);
            }
        } catch (statsErr) {
            console.warn('[submitRating] profile stats update threw (non-fatal):', statsErr);
        }

        showToast(`⭐ Review saved! Thank you.`);
        closeRateModal();

        // Re-fetch ratings from DB and re-render the reviews tab directly
        if (_bp.userId) {
            try {
                const { data: freshRatings } = await window.supabase
                    .from('ratings').select('id,rater_id,rated_user_id,rating,comment,created_at,updated_at').eq('rated_user_id', _bp.userId).order('created_at', {ascending: false});
                _bp.ratings = freshRatings || [];

                // Re-attach rater profiles
                const raterIds = [...new Set(_bp.ratings.map(r => r.rater_id).filter(Boolean))];
                if (raterIds.length) {
                    const { data: rp } = await window.supabase.from('profiles').select('id,name,profile_picture').in('id', raterIds);
                    const raterMap = {};
                    (rp||[]).forEach(r => raterMap[r.id] = r);
                    _bp.ratings = _bp.ratings.map(r => ({...r, raterProfile: raterMap[r.rater_id] || null}));
                }

                // Switch to reviews tab and re-render just the tab content
                _bp.tab = 'reviews';
                const tabContent = document.getElementById('opTabContent');
                if (tabContent) tabContent.innerHTML = _bpReviewsHTML();
                // Re-attach delegated click handler (innerHTML wipe breaks nothing but be safe)
                const body = document.getElementById('ownerProfileBody');
                if (body) body.onclick = _bpClick;
                // Update the rating strip in the profile header
                _bpUpdateRatingStrip();
            } catch(e) {
                console.warn('[submitRating] reviews refresh failed:', e);
            }
        }
    } catch (err) {
        console.error('submitRating error:', err);
        showToast('Failed to submit rating: ' + (err.message || 'Unknown error'), 'error');
    } finally {
        if (btn) {
            btn.disabled      = false;
            btn.textContent   = btn.dataset.isEdit === '1' ? 'Update Review' : 'Submit Review';
            btn.style.opacity = '1';
        }
    }
}

// ============================================
// VIEW BREEDER PROFILE
// ============================================

// ═══════════════════════════════════════════════════════════════════════════
// OWNER PROFILE PANEL  –  fully self-contained, event-delegation based
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scroll the breeder-profile panel to a specific post and flash it.
 * Works by finding the scrollable container (parent of ownerProfileBody)
 * and scrolling it so the [data-post="<pid>"] element is in view.
 */
function _bpScrollToPost(pid) {
    const postEl = document.querySelector(`[data-post="${pid}"]`);
    if (!postEl) return false;

    // The scroll container is the overflow-y:auto div wrapping ownerProfileBody
    const body = document.getElementById('ownerProfileBody');
    const scrollContainer = body ? body.parentElement : null;

    if (scrollContainer) {
        // Calculate offset relative to scroll container
        const containerTop = scrollContainer.getBoundingClientRect().top;
        const postTop = postEl.getBoundingClientRect().top;
        const offset = postTop - containerTop + scrollContainer.scrollTop - 60; // 60px padding
        scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
    } else {
        postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Highlight flash
    postEl.style.transition = 'outline 0.2s, box-shadow 0.2s';
    postEl.style.outline = '2.5px solid #4CAF50';
    postEl.style.boxShadow = '0 0 0 4px rgba(76,175,80,0.18)';
    setTimeout(() => {
        postEl.style.outline = '';
        postEl.style.boxShadow = '';
    }, 1800);
    return true;
}

let _bp = {
    userId: null, profile: null, posts: [], animals: [],
    ratings: [], likedIds: new Set(), savedIds: new Set(), tab: 'posts', meId: null, meName: null, meAvatar: null,
    followersCount: 0, followingCount: 0, isFollowing: false, followId: null, starFilter: 0,
    followersList: null, followingList: null
};

async function openBreederProfile(userId) {
    if (!userId || userId === 'undefined' || userId === 'null') {
        showToast('Could not identify this breeder', 'error'); return;
    }
    const modal = document.getElementById('ownerProfileModal');
    if (!modal) { console.error('ownerProfileModal not found'); return; }

    _bp.userId = String(userId);
    _bp.tab    = 'posts';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Show close button (sticky inside panel)
    const closeBtn = document.getElementById('breederProfileCloseBtn');
    if (closeBtn) { closeBtn.style.display = 'flex'; }
    document.getElementById('ownerProfileBody').innerHTML =
        '<div style="padding:80px 0;text-align:center;color:var(--text-muted);"><div style="font-size:40px;margin-bottom:12px;">🐾</div><p>Loading profile…</p></div>';

    try {
        // Get current viewer identity
        try {
            const meRes = await window.supabase.auth.getUser();
            _bp.meId = meRes?.data?.user?.id || currentUserId || null;
            if (_bp.meId) {
                const { data: mePr } = await window.supabase.from('profiles').select('name, profile_picture').eq('id', _bp.meId).single();
                _bp.meName   = mePr?.name || 'You';
                _bp.meAvatar = mePr?.profile_picture || '';
            }
        } catch(_) { _bp.meId = currentUserId || null; }

        // Fetch all owner data in parallel
        const [profileRes, animalsRes, ratingsRes, postsRes, followersRes, followingRes] = await Promise.all([
            window.supabase.from('profiles').select('id,name,profile_picture,cover_photo,bio,account_type,is_verified,location,contact,tags,stats,username').eq('id', _bp.userId).single(),
            window.supabase.from('animals').select('id,name,breed,species,image_url,status,user_id,created_at').eq('user_id', _bp.userId).order('created_at', {ascending: false}),
            window.supabase.from('ratings').select('id,rater_id,rated_user_id,rating,comment,created_at,updated_at').eq('rated_user_id', _bp.userId).order('created_at', {ascending: false}),
            window.supabase.from('posts').select('id,user_id,text,images,likes,shares,comments,created_at').eq('user_id', _bp.userId).order('created_at', {ascending: false}).limit(30),
            window.supabase.from('follows').select('id').eq('following_id', _bp.userId).eq('status', 'accepted'),
            window.supabase.from('follows').select('id').eq('follower_id', _bp.userId).eq('status', 'accepted')
        ]);

        _bp.followersCount = (followersRes.data || []).length;
        _bp.followingCount = (followingRes.data || []).length;

        // Check if current viewer already follows this user
        _bp.isFollowing = false;
        _bp.followId    = null;
        if (_bp.meId && _bp.meId !== String(_bp.userId)) {
            try {
                const { data: followCheck } = await window.supabase
                    .from('follows').select('id')
                    .eq('follower_id', _bp.meId)
                    .eq('following_id', _bp.userId);
                if (followCheck && followCheck.length > 0) {
                    _bp.isFollowing = true;
                    _bp.followId    = followCheck[0].id;
                }
            } catch(_) {}
        }
        _bp.profile = profileRes.data;
        if (!_bp.profile) {
            document.getElementById('ownerProfileBody').innerHTML =
                '<div style="padding:80px;text-align:center;">Profile not found</div>'; return;
        }
        _bp.animals = animalsRes.data || [];
        _bp.ratings = ratingsRes.data || [];
        _bp.posts   = postsRes.data   || [];

        // Fetch rater profiles for reviews
        const raterIds = [...new Set(_bp.ratings.map(r => r.rater_id).filter(Boolean))];
        let raterMap = {};
        if (raterIds.length) {
            try {
                const { data: rp } = await window.supabase.from('profiles').select('id,name,profile_picture').in('id', raterIds);
                (rp||[]).forEach(r => raterMap[r.id] = r);
            } catch(_) {}
        }
        _bp.ratings = _bp.ratings.map(r => ({...r, raterProfile: raterMap[r.rater_id] || null}));

        // Which posts did the viewer already like/save?
        _bp.likedIds = new Set();
        _bp.savedIds = new Set();
        if (_bp.meId && _bp.posts.length) {
            try {
                const postIds = _bp.posts.map(p => p.id);
                const [{ data: lk }, { data: sv }] = await Promise.all([
                    window.supabase.from('likes').select('post_id').eq('user_id', _bp.meId).in('post_id', postIds),
                    window.supabase.from('saved_posts').select('post_id').eq('user_id', _bp.meId).in('post_id', postIds)
                ]);
                _bp.likedIds = new Set((lk||[]).map(l => String(l.post_id)));
                _bp.savedIds = new Set((sv||[]).map(s => String(s.post_id)));
            } catch(_) {}
        }

        _bpDraw();
    } catch(err) {
        console.error('openBreederProfile error:', err);
        document.getElementById('ownerProfileBody').innerHTML =
            '<div style="padding:80px;text-align:center;color:var(--text-muted);">Failed to load profile</div>';
    }
}

async function _bpToggleFollow() {
    if (!_bp.meId) { showToast('Please sign in to follow', 'error'); return; }
    if (!_bp.userId || _bp.meId === String(_bp.userId)) return;

    const btn = document.getElementById('opFollowBtn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

    try {
        if (_bp.isFollowing) {
            // Unfollow — delete the row
            if (_bp.followId) {
                const { error } = await window.supabase
                    .from('follows').delete().eq('id', _bp.followId);
                if (error) throw error;
            } else {
                // fallback: delete by follower+following pair
                const { error } = await window.supabase
                    .from('follows').delete()
                    .eq('follower_id', _bp.meId)
                    .eq('following_id', _bp.userId);
                if (error) throw error;
            }
            _bp.isFollowing    = false;
            _bp.followId       = null;
            _bp.followersCount = Math.max(0, _bp.followersCount - 1);
            showToast('Unfollowed');
        } else {
            // Follow — insert new row
            const { data: inserted, error } = await window.supabase
                .from('follows').insert({
                    follower_id:  _bp.meId,
                    following_id: _bp.userId,
                    status: 'accepted'
                }).select();
            if (error) throw error;
            _bp.isFollowing    = true;
            _bp.followId       = inserted?.[0]?.id || null;
            _bp.followersCount = _bp.followersCount + 1;
            showToast('Following ' + (_bp.profile?.name || 'this breeder') + '!');
        }
        // Redraw to update button state + follower count
        _bpDraw();
    } catch (err) {
        console.error('_bpToggleFollow error:', err);
        showToast('Could not update follow: ' + (err.message || 'Unknown error'), 'error');
    } finally {
        const b = document.getElementById('opFollowBtn');
        if (b) { b.disabled = false; b.style.opacity = '1'; }
    }
}

function _bpDraw() {
    const p      = _bp.profile;
    const cover  = p.cover_photo || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop';
    const avatar = p.profile_picture || defaultAvatar(p.name || '?') + encodeURIComponent(p.name||'?') + '&background=2E6B4E&color=fff&size=200';
    const name   = p.name   || 'Unknown Breeder';
    const bio    = p.bio    || '';
    const loc    = p.location || p.contact?.location || '';
    const email  = p.contact?.email  || '';
    const phone  = p.contact?.phone  || '';
    const tags   = p.tags   || [];
    const stats  = p.stats  || {};

    const avgR      = _bp.ratings.length
        ? (_bp.ratings.reduce((s,r)=>s+r.rating,0) / _bp.ratings.length).toFixed(1) : null;
    const starsFull = avgR ? Math.round(parseFloat(avgR)) : 0;
    const starsHTML = [1,2,3,4,5].map(i =>
        `<span style="color:${i<=starsFull?'#f59e0b':'#d1d5db'};font-size:15px;line-height:1;">★</span>`
    ).join('');

    const isOwnProfile  = _bp.meId && String(_bp.meId) === String(_bp.userId);
    const accountLabel  = (p.account_type || 'breeder');
    const accountColor  = accountLabel === 'buyer' ? '#3b82f6' : '#2E6B4E';
    const accountBg     = accountLabel === 'buyer' ? '#eff6ff' : '#f0fdf4';
    const accountBorder = accountLabel === 'buyer' ? '#bfdbfe' : '#bbf7d0';
    const followersCount = _bp.followersCount ?? stats.followers ?? 0;
    const followingCount = _bp.followingCount ?? stats.following ?? 0;

    document.getElementById('ownerProfileBody').innerHTML = `
<div style="font-family:inherit;width:100%;background:#ffffff;">

  <!-- COVER PHOTO — clean, no pills on top -->
  <div style="position:relative;height:clamp(120px,32vw,180px);background:url('${_esc(cover)}') center/cover no-repeat;border-radius:20px 20px 0 0;overflow:hidden;">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.0) 40%,rgba(0,0,0,0.45) 100%);"></div>
    <!-- Close button — inside the card, top-right of cover -->
    <button onclick="closeBreederProfile()" style="position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:background .2s;box-shadow:0 2px 8px rgba(0,0,0,0.25);" onmouseover="this.style.background='rgba(220,38,38,0.85)'" onmouseout="this.style.background='rgba(0,0,0,0.45)'">×</button>
  </div>

  <!-- BODY -->
  <div style="padding:0 clamp(12px,4vw,18px) 0;background:#ffffff;">

    <!-- AVATAR ROW: avatar left, buttons right -->
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:clamp(-38px,-9vw,-44px);margin-bottom:12px;">
      <div style="position:relative;flex-shrink:0;z-index:3;">
        <div style="width:clamp(64px,16vw,84px);height:clamp(64px,16vw,84px);border-radius:50%;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,0.18);overflow:hidden;background:#e5e7eb;">
          <img src="${_esc(avatar)}" id="opAvatar"
               onerror="this.src=defaultAvatar(this.alt||'User')"
               style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
        ${p.is_verified ? `<span style="position:absolute;bottom:2px;right:2px;background:#2E6B4E;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid white;">✓</span>` : ''}
      </div>
      ${!isOwnProfile ? `
      <div style="display:flex;gap:5px;padding-bottom:6px;z-index:3;flex-shrink:0;max-width:60%;">
        <button id="opFollowBtn"
          style="padding:7px 10px;background:${_bp.isFollowing?'#f3f4f6':'#2E6B4E'};color:${_bp.isFollowing?'#374151':'white'};border:${_bp.isFollowing?'1.5px solid #d1d5db':'none'};border-radius:50px;font-weight:700;cursor:pointer;font-size:11px;white-space:nowrap;transition:all .2s;flex-shrink:0;">
          ${_bp.isFollowing?'✓ Following':'+ Follow'}
        </button>
        <button id="opRateBtn"
          style="padding:7px 10px;background:#fffbeb;color:#d97706;border:1.5px solid #fde68a;border-radius:50px;font-weight:700;cursor:pointer;font-size:11px;white-space:nowrap;flex-shrink:0;">
          ★ Rate
        </button>
        <button id="opMsgBtn"
          style="padding:7px 10px;background:#1d4ed8;color:white;border:none;border-radius:50px;font-weight:700;cursor:pointer;font-size:11px;white-space:nowrap;box-shadow:0 3px 10px rgba(29,78,216,0.3);flex-shrink:0;">
          💬
        </button>
      </div>` : `<div style="padding-bottom:6px;"><span style="font-size:11px;background:#f0fdf4;color:#2E6B4E;padding:5px 12px;border-radius:50px;font-weight:600;border:1px solid #bbf7d0;">Your Profile</span></div>`}
    </div>

    <!-- NAME + VERIFIED + ACCOUNT TYPE + LOCATION -->
    <div style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px;">
        <span style="font-size:20px;font-weight:800;color:#111827;line-height:1.2;">${_esc(name)}</span>
        ${p.is_verified ? `<span style="background:#dcfce7;color:#16a34a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:50px;border:1px solid #bbf7d0;">✓ Verified</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;padding:3px 9px;border-radius:50px;background:${accountBg};color:${accountColor};border:1px solid ${accountBorder};">${_esc(accountLabel)}</span>
        ${loc ? `<span style="font-size:12px;color:#6b7280;">📍 ${_esc(loc)}</span>` : ''}
      </div>
    </div>

    <!-- STATS ROW — clickable, redirect within panel -->
    <div style="display:flex;gap:6px;margin-bottom:14px;">
      ${[
        { val: _bp.animals.length, label: 'Animals',   tab: 'animals'   },
        { val: followersCount,     label: 'Followers', tab: 'followers' },
        { val: followingCount,     label: 'Following', tab: 'following' },
        { val: _bp.posts.length,   label: 'Posts',     tab: 'posts'     }
      ].map(s => `
      <div data-tab="${s.tab}" style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 4px;text-align:center;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f0fdf4';this.style.borderColor='#bbf7d0';" onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';">
        <div style="font-size:16px;font-weight:800;color:#111827;line-height:1;">${s.val}</div>
        <div style="font-size:9px;color:#64748b;font-weight:500;margin-top:2px;white-space:normal;word-break:break-word;">${s.label}</div>
      </div>`).join('')}
    </div>
    <!-- RATING STRIP (clickable → goes to Reviews tab) -->
    <div data-tab="reviews" style="display:flex;align-items:center;gap:8px;padding:9px 13px;background:#fffbeb;border-radius:10px;border:1px solid #fde68a;margin-bottom:12px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fffbeb'">
      <div style="display:flex;gap:2px;">${starsHTML}</div>
      ${avgR
        ? `<span style="font-size:14px;font-weight:800;color:#92400e;">${avgR}</span>
           <span style="font-size:11px;color:#b45309;">(${_bp.ratings.length} review${_bp.ratings.length!==1?'s':''})</span>
           <span style="font-size:10px;color:#b45309;margin-left:auto;">tap to view →</span>`
        : `<span style="font-size:11px;color:#b45309;font-style:italic;">No reviews yet${!isOwnProfile?' — be the first!':''}</span>`}
    </div>

    <!-- BIO -->
    ${bio ? `<p style="font-size:13px;color:#374151;line-height:1.7;margin:0 0 12px;word-wrap:break-word;overflow-wrap:break-word;white-space:pre-wrap;max-width:100%;overflow:hidden;">${_esc(bio)}</p>` : ''}

    <!-- TAGS -->
    ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;">${tags.map(t=>`<span style="background:#f0fdf4;color:#2E6B4E;padding:4px 10px;border-radius:50px;font-size:11px;font-weight:600;border:1px solid #bbf7d0;">${_esc(t)}</span>`).join('')}</div>` : ''}

    <!-- CONTACT -->
    ${(email||phone||p.website) ? `
    <div style="background:#f9fafb;border-radius:12px;padding:11px 13px;margin-bottom:14px;display:flex;flex-direction:column;gap:8px;border:1px solid #e5e7eb;">
      ${email ? `<a href="mailto:${_esc(email)}" style="font-size:12.5px;color:#374151;text-decoration:none;display:flex;align-items:center;gap:9px;"><span style="width:26px;height:26px;background:#e0f2fe;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">📧</span>${_esc(email)}</a>` : ''}
      ${phone ? `<a href="tel:${_esc(phone)}" style="font-size:12.5px;color:#374151;text-decoration:none;display:flex;align-items:center;gap:9px;"><span style="width:26px;height:26px;background:#dcfce7;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">📞</span>${_esc(phone)}</a>` : ''}
      ${p.website ? `<a href="${_esc(_safeUrl(p.website))}" target="_blank" rel="noopener noreferrer" style="font-size:12.5px;color:#2E6B4E;text-decoration:none;font-weight:600;display:flex;align-items:center;gap:9px;"><span style="width:26px;height:26px;background:#f0fdf4;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">🌐</span>${_esc(p.website)}</a>` : ''}
    </div>` : ''}

    <!-- TABS -->
    <div style="display:flex;gap:3px;background:#f3f4f6;border-radius:12px;padding:4px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none;">
      <button data-tab="posts"     style="${_bpTabStyle('posts')}">📋 Posts (${_bp.posts.length})</button>
      <button data-tab="animals"   style="${_bpTabStyle('animals')}">🐾 Animals (${_bp.animals.length})</button>
      <button data-tab="followers" style="${_bpTabStyle('followers')}">👥 Followers</button>
      <button data-tab="following" style="${_bpTabStyle('following')}">➕ Following</button>
      <button data-tab="reviews"   style="${_bpTabStyle('reviews')}">★ Reviews (${_bp.ratings.length})</button>
    </div>

    <!-- TAB CONTENT -->
    <div id="opTabContent" style="background:#ffffff;border-radius:0 0 22px 22px;min-height:80px;">${_bpTabHTML()}</div>
  </div>

</div>`;

    // Attach delegated listener
    const body = document.getElementById('ownerProfileBody');
    body.onclick    = _bpClick;
    body.onkeypress = _bpKeypress;

    // Direct bindings on Follow + Rate + Message
    const followBtn = document.getElementById('opFollowBtn');
    const rateBtn   = document.getElementById('opRateBtn');
    const msgBtn    = document.getElementById('opMsgBtn');

    if (followBtn) {
        followBtn.onclick = async function(e) {
            e.stopPropagation();
            await _bpToggleFollow();
        };
    }
    if (rateBtn) {
        rateBtn.onclick = function(e) {
            e.stopPropagation();
            // Switch to Reviews tab so user can see existing reviews
            _bp.tab = 'reviews';
            _bpDraw();
            // Then open the rate modal after a tiny delay so the redraw completes
            setTimeout(() => openRateModal(_bp.userId, _bp.profile?.name || 'Breeder'), 80);
        };
    }
    if (msgBtn) {
        msgBtn.onclick = function(e) {
            e.stopPropagation();
            // Capture BEFORE closeBreederProfile() resets _bp
            var _msgUserId = _bp.userId;
            var _msgName = _bp.profile?.name || '';
            var _msgAvatar = _bp.profile?.profile_picture || '';
            closeBreederProfile();
            ((typeof messageMatchBreeder === "function") ? messageMatchBreeder : (typeof messageBreederFromProfile === "function" ? messageBreederFromProfile : function(){}))(_msgUserId, _msgName, _msgAvatar);
        };
    }
}

// Updates the rating strip in the profile header without a full redraw
function _bpUpdateRatingStrip() {
    const strip = document.querySelector('[data-tab="reviews"][style*="fffbeb"]');
    if (!strip) return;
    const avgR = _bp.ratings.length
        ? (_bp.ratings.reduce((s, r) => s + r.rating, 0) / _bp.ratings.length).toFixed(1)
        : null;
    const starsHTML = [1,2,3,4,5].map(i =>
        `<span style="color:${i <= Math.round(parseFloat(avgR||0))?'#f59e0b':'#d1d5db'};font-size:16px;">&#9733;</span>`
    ).join('');
    strip.innerHTML = `
        <div style="display:flex;gap:2px;">${starsHTML}</div>
        ${avgR
            ? `<span style="font-size:14px;font-weight:800;color:#92400e;">${avgR}</span>
               <span style="font-size:11px;color:#b45309;">(${_bp.ratings.length} review${_bp.ratings.length!==1?'s':''})</span>
               <span style="font-size:10px;color:#b45309;margin-left:auto;">tap to view →</span>`
            : `<span style="font-size:11px;color:#b45309;font-style:italic;">No reviews yet</span>`}`;
    // Also update the tab label
    const reviewsTab = document.querySelector('[data-tab="reviews"]');
    if (reviewsTab && reviewsTab !== strip) {
        reviewsTab.textContent = `★ Reviews (${_bp.ratings.length})`;
    }
}

function _bpTabStyle(id) {
    const active = id === _bp.tab;
    return active
        ? 'flex:1;padding:8px 4px;border:none;border-radius:9px;font-size:10.5px;font-weight:700;cursor:pointer;background:#ffffff;color:#2E6B4E;transition:all .2s;box-shadow:0 1px 6px rgba(0,0,0,0.1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
        : 'flex:1;padding:8px 4px;border:none;border-radius:9px;font-size:10.5px;font-weight:600;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
}

function _bpTabHTML() {
    if (_bp.tab === 'posts')     return _bpPostsHTML();
    if (_bp.tab === 'animals')   return _bpAnimalsHTML();
    if (_bp.tab === 'reviews')   return _bpReviewsHTML();
    if (_bp.tab === 'followers') return _bpFollowHTML('followers');
    if (_bp.tab === 'following') return _bpFollowHTML('following');
    return '';
}

function _bpPostsHTML() {
    if (!_bp.posts.length) return '<div style="text-align:center;padding:40px 0;color:var(--text-muted);">No posts yet</div>';
    const av   = _esc(_bp.profile.profile_picture || '');
    const auth = _esc(_bp.profile.name || 'Owner');
    const postsHTML = _bp.posts.map(p => {
        const pid    = String(p.id);
        const liked  = _bp.likedIds.has(pid);
        const imgs   = p.images || [];
        const cmts   = p.comments || [];
        return `
<div data-post="${pid}" style="background:var(--bg-secondary);border-radius:14px;padding:14px;margin-bottom:12px;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
    <img src="${av}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border-light);">
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${auth}</div>
      <div style="font-size:11px;color:var(--text-muted);">${_fmtDate(p.created_at)}</div>
    </div>
  </div>
  ${p.text ? `<div style="font-size:13px;color:var(--text-primary);line-height:1.65;margin-bottom:10px;white-space:pre-wrap;cursor:pointer;" data-op="open-post" data-pid="${pid}">${_esc(p.text)}</div>` : ''}
  ${imgs.length ? `<div style="display:grid;grid-template-columns:${imgs.length>1?'1fr 1fr':'1fr'};gap:4px;border-radius:10px;overflow:hidden;margin-bottom:10px;cursor:pointer;" data-op="open-post" data-pid="${pid}">
    ${imgs.slice(0,4).map((img,ii)=>`<div style="position:relative;overflow:hidden;">${imgs.length>4&&ii===3?`<div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:800;z-index:1;">+${imgs.length-4}</div>`:''}<img src="${_esc(img)}" onerror="this.style.display='none'" style="width:100%;${imgs.length===1?'height:auto;max-height:480px;object-fit:contain;background:#f3f4f6;':'height:160px;object-fit:cover;'}display:block;"></div>`).join('')}
  </div>` : ''}
  <div style="font-size:11px;color:var(--text-muted);padding-top:8px;margin-bottom:2px;">
    ❤️ <span data-like-count="${pid}">${p.likes||0}</span> likes • 💬 <span data-cmt-count="${pid}">${cmts.length}</span> comments${p.shares ? ` • 🔗 <span data-share-count="${pid}">${p.shares}</span> shares` : ` • 🔗 <span data-share-count="${pid}">0</span> shares`}
  </div>
  <div style="display:flex;gap:6px;margin-bottom:10px;">
    <button data-op="like" data-pid="${pid}"
      style="flex:1;padding:9px 6px;background:${liked?'#4CAF50':'#E8F5E9'};color:${liked?'white':'#4CAF50'};border:none;border-radius:12px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.08);transition:all .2s;"
      onmouseover="if(!this.dataset.liked){this.style.background='#4CAF50';this.style.color='white';}" onmouseout="if(!this.dataset.liked){this.style.background='#E8F5E9';this.style.color='#4CAF50';}">
      ${liked?'❤️ Liked':'🤍 Like'}
    </button>
    <button data-op="toggle-cmt" data-pid="${pid}"
      style="flex:1;padding:9px 6px;background:#E3F2FD;color:#3B9AE1;border:none;border-radius:12px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.08);transition:all .2s;"
      onmouseover="this.style.background='#3B9AE1';this.style.color='white';" onmouseout="this.style.background='#E3F2FD';this.style.color='#3B9AE1';">
      💬 Comment
    </button>
    <button data-op="save-post" data-pid="${pid}"
      style="flex:1;padding:9px 6px;background:${_bp.savedIds&&_bp.savedIds.has(pid)?'#D97706':'#FEF3C7'};color:${_bp.savedIds&&_bp.savedIds.has(pid)?'white':'#D97706'};border:none;border-radius:12px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.08);transition:all .2s;"
      onmouseover="this.style.background='#D97706';this.style.color='white';" onmouseout="this.style.background=_bp.savedIds&&_bp.savedIds.has(this.dataset.pid)?'#D97706':'#FEF3C7';this.style.color=_bp.savedIds&&_bp.savedIds.has(this.dataset.pid)?'white':'#D97706';">
      ${_bp.savedIds&&_bp.savedIds.has(pid)?'🔖 Saved':'📑 Save'}
    </button>
    <button data-op="share-post" data-pid="${pid}"
      style="flex:1;padding:9px 6px;background:linear-gradient(135deg,#C97C5D,#E5B567);color:white;border:none;border-radius:12px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(201,124,93,0.25);transition:all .2s;"
      onmouseover="this.style.boxShadow='0 4px 14px rgba(201,124,93,0.45)';" onmouseout="this.style.boxShadow='0 2px 6px rgba(201,124,93,0.25)';">
      🔗 Share${p.shares ? ` <span data-share-count="${pid}" style="opacity:.85">${p.shares}</span>` : ` <span data-share-count="${pid}"></span>`}
    </button>
  </div>
  <div data-cmt-box="${pid}" style="display:none;margin-top:10px;">
    <div data-cmt-list="${pid}">${_bpRenderCommentList(cmts, pid)}</div>
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
      <input data-cmt-input="${pid}" type="text" placeholder="Write a comment…"
        style="flex:1;border:1px solid var(--border-light);border-radius:50px;padding:8px 14px;font-size:13px;outline:none;background:white;min-width:0;"
        onkeypress="if(event.key==='Enter'){event.preventDefault();document.querySelector('[data-op=post-cmt][data-pid=\'${pid}\']')?.click();}">
      <button data-op="post-cmt" data-pid="${pid}"
        style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">Post</button>
    </div>
  </div>
</div>`;
    }).join('');
    return `<div style="background:#ffffff;padding:0 0 24px;">${postsHTML}</div>`;
}

function _bpAnimalsHTML() {
    if (!_bp.animals.length) return '<div style="text-align:center;padding:40px 0;color:var(--text-muted);">No animals listed yet</div>';
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">
    ${_bp.animals.map(a=>`
    <div data-op="animal" data-aid="${a.id}"
         style="border-radius:14px;overflow:hidden;border:1px solid var(--border-light);background:white;cursor:pointer;transition:transform .15s,box-shadow .15s;"
         onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'"
         onmouseout="this.style.transform='';this.style.boxShadow=''">
      <img src="${_esc(a.image_url||'')}" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200'"
           style="width:100%;height:90px;object-fit:cover;">
      <div style="padding:7px 9px;">
        <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary);">${_esc(a.name)}</div>
        <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(a.breed)}</div>
        <div style="font-size:10px;font-weight:600;margin-top:3px;color:${a.status==='Available'?'var(--green-primary)':'var(--text-muted)'};">${_esc(a.status||'')}</div>
      </div>
    </div>`).join('')}
  </div>`;
}

async function _bpLoadFollowList(type) {
    // Fetch follower or following list from Supabase and re-render tab
    try {
        let profileIds;
        if (type === 'followers') {
            const { data } = await window.supabase.from('follows').select('follower_id').eq('following_id', _bp.userId).eq('status', 'accepted');
            profileIds = (data || []).map(r => r.follower_id).filter(Boolean);
        } else {
            const { data } = await window.supabase.from('follows').select('following_id').eq('follower_id', _bp.userId).eq('status', 'accepted');
            profileIds = (data || []).map(r => r.following_id).filter(Boolean);
        }
        if (!profileIds.length) {
            _bp[type + 'List'] = [];
        } else {
            const { data: profiles } = await window.supabase.from('profiles').select('id,name,profile_picture,account_type,location').in('id', profileIds);
            _bp[type + 'List'] = profiles || [];
        }
        // Re-render just the tab content
        const tc = document.getElementById('opTabContent');
        if (tc) {
            tc.innerHTML = _bpFollowHTML(type);
            document.getElementById('ownerProfileBody').onclick = _bpClick;
        }
    } catch(err) { console.error('_bpLoadFollowList error:', err); }
}

function _bpFollowHTML(type) {
    const list = _bp[type + 'List'];
    const label = type === 'followers' ? 'Followers' : 'Following';
    const emptyMsg = type === 'followers' ? 'No followers yet' : 'Not following anyone yet';

    if (!list) {
        // Trigger async load, show spinner
        _bpLoadFollowList(type);
        return `<div style="text-align:center;padding:40px 0;color:var(--text-muted);"><div style="font-size:28px;margin-bottom:8px;">👥</div><p>Loading ${label}…</p></div>`;
    }
    if (!list.length) return `<div style="text-align:center;padding:40px 0;color:var(--text-muted);"><div style="font-size:28px;margin-bottom:10px;">👥</div><p>${emptyMsg}</p></div>`;

    return `<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:8px;">
    ${list.map(p => `
    <div data-op="open-profile" data-uid="${p.id}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f0fdf4';this.style.borderColor='#bbf7d0';" onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';">
      <div style="width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#e5e7eb;">
        ${p.profile_picture ? `<img src="${_esc(p.profile_picture)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.innerHTML='<span style=\\'font-size:18px;font-weight:700;color:#6b7280;display:flex;align-items:center;justify-content:center;height:100%;\\'>'+${JSON.stringify((p.name||'?').charAt(0))}+'</span>'">` : `<span style="font-size:18px;font-weight:700;color:#6b7280;display:flex;align-items:center;justify-content:center;height:100%;">${_esc((p.name||'?').charAt(0))}</span>`}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(p.name||'Unknown')}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px;">${p.account_type ? _esc(p.account_type) : ''}${p.location ? (p.account_type ? ' · ' : '') + '📍 ' + _esc(p.location) : ''}</div>
      </div>
      <span style="font-size:12px;color:#2E6B4E;font-weight:600;">View →</span>
    </div>`).join('')}
  </div>`;
}

function _bpReviewsHTML() {
    const isOwn    = _bp.meId && String(_bp.meId) === String(_bp.userId);
    const avgR     = _bp.ratings.length
        ? (_bp.ratings.reduce((s,r)=>s+r.rating,0) / _bp.ratings.length).toFixed(1) : null;
    const starsFull = avgR ? Math.round(parseFloat(avgR)) : 0;

    const hasMyReview = !isOwn && _bp.meId && _bp.ratings.some(r => String(r.rater_id) === String(_bp.meId));
    const writeReviewBtn = isOwn ? '' : `
    <button data-op="rate" style="
        width:100%;padding:13px 16px;
        background:linear-gradient(135deg,#f59e0b,#d97706);
        color:white;border:none;border-radius:14px;
        font-weight:700;cursor:pointer;font-size:14px;
        margin-bottom:16px;display:flex;align-items:center;
        justify-content:center;gap:8px;
        box-shadow:0 4px 14px rgba(217,119,6,0.3);
        transition:all .2s;letter-spacing:.3px;">
      &#x270F;&#xFE0F; ${hasMyReview ? 'Edit Your Review' : 'Write a Review'}
    </button>`;

    if (!_bp.ratings.length) {
        return `
        <div style="padding:0 0 20px;">
          ${writeReviewBtn}
          <div style="text-align:center;padding:32px 0 16px;">
            <div style="font-size:40px;margin-bottom:10px;">📝</div>
            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">No reviews yet</div>
            <div style="font-size:13px;color:var(--text-muted);">${!isOwn ? 'Be the first to leave a review!' : 'No one has reviewed your profile yet.'}</div>
          </div>
        </div>`;
    }

    const dist = [5,4,3,2,1].map(star => {
        const cnt = _bp.ratings.filter(r => r.rating === star).length;
        const pct = Math.round((cnt / _bp.ratings.length) * 100);
        const active = _bp.starFilter === star;
        return `
        <div data-op="star-filter" data-star="${star}" style="display:flex;align-items:center;gap:8px;margin-bottom:5px;cursor:pointer;border-radius:6px;padding:2px 4px;background:${active?'#fef9c3':'transparent'};transition:background .15s;">
          <span style="font-size:11px;color:#92400e;width:8px;text-align:right;font-weight:700;">${star}</span>
          <span style="color:#f59e0b;font-size:11px;">★</span>
          <div style="flex:1;height:8px;background:#fef3c7;border-radius:50px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:50px;"></div>
          </div>
          <span style="font-size:11px;color:#92400e;width:22px;font-weight:600;">${cnt}</span>
        </div>`;
    }).join('');

    const filterBar = `
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
      <span style="font-size:11px;color:#b45309;font-weight:600;">Filter:</span>
      ${[0,5,4,3,2,1].map(s => `
        <button data-op="star-filter" data-star="${s}" style="
            padding:4px 10px;border-radius:50px;border:1.5px solid ${_bp.starFilter===s?'#d97706':'#fde68a'};
            background:${_bp.starFilter===s?'#f59e0b':'#fffbeb'};
            color:${_bp.starFilter===s?'white':'#92400e'};
            font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;">
          ${s === 0 ? 'All' : s + '&#9733;'}
        </button>`).join('')}
    </div>`;

    const filteredRatings = _bp.starFilter > 0
        ? _bp.ratings.filter(r => r.rating === _bp.starFilter)
        : _bp.ratings;

    const reviewCards = filteredRatings.map(r => {
        const stars = [1,2,3,4,5].map(i =>
            `<span style="color:${i<=r.rating?'#f59e0b':'#d1d5db'};font-size:15px;">&#9733;</span>`
        ).join('');
        const avatarUrl = _esc(r.raterProfile?.profile_picture || '');
        const raterName = _esc(r.raterProfile?.name || 'User');
        const initial   = (r.raterProfile?.name || 'U').charAt(0).toUpperCase();
        const isMyReview = _bp.meId && String(r.rater_id) === String(_bp.meId);
        return `
    <div style="background:white;border:1px solid ${isMyReview?'#fde68a':'#e5e7eb'};border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:38px;height:38px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#6b7280;">
          ${avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.textContent='${initial}'">` : initial}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${raterName}${isMyReview?' <span style="font-size:10px;color:#d97706;background:#fef9c3;border-radius:50px;padding:1px 6px;">Your review</span>':''}</div>
          <div style="font-size:11px;color:var(--text-muted);">${_fmtDate(r.created_at)}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          <div style="display:flex;gap:1px;">${stars}</div>
          ${isMyReview ? `
            <button data-op="edit-review" data-rated-id="${_esc(String(r.rated_user_id))}" style="background:#f59e0b;color:white;border:none;border-radius:50px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;">✏️ Edit</button>
            <button data-op="del-review" data-review-id="${_esc(String(r.id))}" data-rated-id="${_esc(String(r.rated_user_id))}" style="background:#fee2e2;color:#ef4444;border:none;border-radius:50px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;">🗑️</button>
          ` : ''}
        </div>
      </div>
      ${r.comment ? `<p style="font-size:13px;color:#374151;line-height:1.6;margin:0;background:#fafafa;border-radius:10px;padding:10px 13px;border:1px solid #f3f4f6;word-wrap:break-word;overflow-wrap:break-word;">"${_esc(r.comment)}"</p>` : ''}
    </div>`;
    }).join('');

    const emptyFilter = filteredRatings.length === 0 ? `
      <div style="text-align:center;padding:24px 0;color:var(--text-muted);">
        <div style="font-size:30px;margin-bottom:8px;">🔍</div>
        <div>No ${_bp.starFilter}&#9733; reviews found</div>
      </div>` : '';

    return `
    <div style="padding:0 0 20px;">
      ${writeReviewBtn}
      <div style="display:flex;gap:18px;align-items:center;background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:16px 18px;margin-bottom:14px;">
        <div style="text-align:center;flex-shrink:0;">
          <div style="font-size:48px;font-weight:900;color:#92400e;line-height:1;">${avgR}</div>
          <div style="display:flex;gap:1px;justify-content:center;margin:4px 0;">${[1,2,3,4,5].map(i=>`<span style="color:${i<=starsFull?'#f59e0b':'#d1d5db'};font-size:15px;">&#9733;</span>`).join('')}</div>
          <div style="font-size:11px;color:#b45309;font-weight:600;">${_bp.ratings.length} review${_bp.ratings.length!==1?'s':''}</div>
        </div>
        <div style="flex:1;">${dist}</div>
      </div>
      ${filterBar}
      ${reviewCards || emptyFilter}
    </div>`;
}



function _bpClick(e) {
    const el = e.target.closest('[data-op],[data-tab],[data-op]');
    if (!el) return;

    const op  = el.dataset.op;
    const tab = el.dataset.tab;

    if (tab) {
        // Stat box clicks: animals and posts switch tab content; followers/following scroll to tab bar and switch to posts
        if (tab === 'followers' || tab === 'following') {
            // Show a follow-list overlay within the panel
            _bp.tab = tab;
        } else {
            _bp.tab = tab;
        }
        _bpDraw();
        // Scroll the tab content into view
        setTimeout(() => {
            const tc = document.getElementById('opTabContent');
            if (tc) tc.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
        return;
    }

    if (op === 'open-profile') {
        const uid = el.dataset.uid;
        if (uid) { closeBreederProfile(); setTimeout(() => openBreederProfile(uid), 120); }
        return;
    }
    if (op === 'edit-review') {
        // Edit your own existing review — use the rated_user_id stored on the button
        // so this works correctly even when viewing your own profile (avoids self-rate guard).
        const ratedId = el.dataset.ratedId;
        const name = _bp.profile?.name || 'Breeder';
        openRateModal(ratedId, name, true); return;
    }
    if (op === 'del-review') {
        if (!confirm('Delete your review? This cannot be undone.')) return;
        _bpDeleteReview(el.dataset.reviewId, el.dataset.ratedId); return;
    }
    if (op === 'rate') {
        const name = _bp.profile?.name || 'Breeder';
        openRateModal(_bp.userId, name, false); return;
    }
    if (op === 'msg') {
        var _msgUserId2 = _bp.userId;
        var _msgName2 = _bp.profile?.name || '';
        var _msgAvatar2 = _bp.profile?.profile_picture || '';
        closeBreederProfile();
        ((typeof messageMatchBreeder === "function") ? messageMatchBreeder : (typeof messageBreederFromProfile === "function" ? messageBreederFromProfile : function(){}))(_msgUserId2, _msgName2, _msgAvatar2); return;
    }
    if (op === 'like') {
        e.stopPropagation();
        _bpToggleLike(el.dataset.pid); return;
    }
    if (op === 'toggle-cmt') {
        e.stopPropagation();
        const box = document.querySelector(`[data-cmt-box="${el.dataset.pid}"]`);
        if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
        return;
    }
    if (op === 'post-cmt') {
        e.stopPropagation();
        _bpAddComment(el.dataset.pid); return;
    }
    if (op === 'animal') {
        closeBreederProfile();
        if (typeof showPetDetails === "function") showPetDetails(parseInt(el.dataset.aid)); return;
    }
    if (op === 'star-filter') {
        const star = parseInt(el.dataset.star);
        _bp.starFilter = (_bp.starFilter === star) ? 0 : star; // toggle
        const tabContent = document.getElementById('opTabContent');
        if (tabContent) tabContent.innerHTML = _bpReviewsHTML();
        // Re-attach events in new content
        document.getElementById('ownerProfileBody').onclick = _bpClick;
        return;
    }
    if (op === 'del-cmt') {
        e.stopPropagation();
        if (!_bp.meId) return;
        if (!confirm('Delete this comment?')) return;
        _bpDeleteComment(el.dataset.pid, el.dataset.cid); return;
    }
    if (op === 'edit-cmt') {
        e.stopPropagation();
        if (!_bp.meId) return;
        _bpEditComment(el.dataset.pid, el.dataset.cid); return;
    }
    if (op === 'hist-cmt') {
        e.stopPropagation();
        _bpShowCommentHistory(el.dataset.pid, el.dataset.cid); return;
    }
    if (op === 'like-cmt') {
        e.stopPropagation();
        _bpLikeComment(el.dataset.pid, el.dataset.cid); return;
    }
    if (op === 'like-reply') {
        e.stopPropagation();
        _bpLikeReply(el.dataset.pid, el.dataset.cid, el.dataset.rid); return;
    }
    if (op === 'reply-cmt') {
        e.stopPropagation();
        const rb = document.getElementById('bp-reply-input-' + el.dataset.cid);
        if (rb) { rb.style.display = rb.style.display === 'none' || rb.style.display === '' ? 'flex' : 'none'; }
        const ri = document.getElementById('bp-reply-text-' + el.dataset.cid);
        if (ri && document.getElementById('bp-reply-input-' + el.dataset.cid)?.style.display === 'flex') ri.focus();
        return;
    }
    if (op === 'post-reply') {
        e.stopPropagation();
        _bpPostReply(el.dataset.pid, el.dataset.cid, el.dataset.parentCid); return;
    }
    if (op === 'del-reply') {
        e.stopPropagation();
        if (!_bp.meId) return;
        if (!confirm('Delete this reply?')) return;
        (async () => {
            const { data } = await window.supabase.from('posts').select('comments').eq('id', el.dataset.pid).single();
            const comments = data?.comments || [];
            // Remove the reply from wherever it lives in the tree
            function removeNode(arr, rid) {
                for (let i = 0; i < arr.length; i++) {
                    if (String(arr[i].id) === String(rid)) { arr.splice(i, 1); return true; }
                    if (arr[i].replies && removeNode(arr[i].replies, rid)) return true;
                }
                return false;
            }
            removeNode(comments, el.dataset.rid);
            await window.supabase.from('posts').update({ comments }).eq('id', el.dataset.pid);
            const post = _bp.posts.find(p => String(p.id) === String(el.dataset.pid));
            if (post) post.comments = comments;
            const listEl = document.querySelector(`[data-cmt-list="${el.dataset.pid}"]`);
            if (listEl) listEl.innerHTML = _bpRenderCommentList(comments, el.dataset.pid);
            showToast('Reply deleted');
        })();
        return;
    }
    if (op === 'edit-reply') {
        e.stopPropagation();
        if (!_bp.meId) return;
        (async () => {
            const { data } = await window.supabase.from('posts').select('comments').eq('id', el.dataset.pid).single();
            const comments = data?.comments || [];
            const found = _bpFindNode(comments, el.dataset.rid);
            if (!found) return;
            const r = found.node;
            const newText = await _showEditCommentModal(r.text);
            if (newText === null) return;
            r.text = newText.trim();
            r.edited = true;
            r.editedAt = new Date().toISOString();
            await window.supabase.from('posts').update({ comments }).eq('id', el.dataset.pid);
            const post = _bp.posts.find(p => String(p.id) === String(el.dataset.pid));
            if (post) post.comments = comments;
            const listEl = document.querySelector(`[data-cmt-list="${el.dataset.pid}"]`);
            if (listEl) listEl.innerHTML = _bpRenderCommentList(comments, el.dataset.pid);
            showToast('Reply updated ✏️');
        })();
        return;
    }
    if (op === 'see-more-replies') {
        e.stopPropagation();
        const cid = el.dataset.cid;
        const moreEl = document.getElementById('bp-more-replies-' + cid);
        if (moreEl) moreEl.style.display = 'block';
        el.style.display = 'none';
        return;
    }
    if (op === 'see-more-cmts') {
        e.stopPropagation();
        const pid = el.dataset.pid;
        const moreEl = document.getElementById('bp-more-cmts-' + pid);
        if (moreEl) moreEl.style.display = 'block';
        el.style.display = 'none';
        return;
    }
    if (op === 'open-post') {
        e.stopPropagation();
        const pid = el.dataset.pid;
        const post = _bp.posts.find(p => String(p.id) === String(pid));
        if (post) _bpOpenPostDetail(post);
        return;
    }
    if (op === 'save-post') {
        e.stopPropagation();
        _bpToggleSave(el.dataset.pid, el); return;
    }
    if (op === 'share-post') {
        e.stopPropagation();
        const pid = el.dataset.pid;
        const shareUrl = window.location.origin + '/pages/profile.html?post=' + pid;
        const post = _bp.posts.find(p => String(p.id) === String(pid));

        // Increment share counter
        if (post) {
            const newShares = (post.shares || 0) + 1;
            post.shares = newShares;
            window.supabase.from('posts').update({ shares: newShares }).eq('id', pid).catch(err => console.warn('share counter error:', err));
            const cntEl = document.querySelector(`[data-share-count="${pid}"]`);
            if (cntEl) cntEl.textContent = newShares;
        }

        // Scroll to the post inside the panel and highlight it
        _bpScrollToPost(pid);

        // Share or copy the shareable link
        if (navigator.share) {
            navigator.share({
                title: 'BreedLink Post',
                text: post?.text ? post.text.slice(0, 100) : 'Check out this post on BreedLink',
                url: shareUrl
            }).catch(() => {
                navigator.clipboard.writeText(shareUrl).then(() => showToast('Scrolled to post \u2022 Link copied \uD83D\uDD17'));
            });
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('Scrolled to post \u2022 Link copied \uD83D\uDD17');
            }).catch(() => showToast('Post link: ' + shareUrl));
        }
        return;
    }
}

async function _bpDeleteComment(postId, commentId) {
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = (data?.comments || []).filter(c => String(c.id) !== String(commentId));
        await window.supabase.from('posts').update({ comments }).eq('id', postId);
        const post = _bp.posts.find(p => String(p.id) === String(postId));
        if (post) post.comments = comments;
        showToast('Comment deleted');
        const listEl = document.querySelector(`[data-cmt-list="${postId}"]`);
        if (listEl) listEl.innerHTML = _bpRenderCommentList(comments, postId);
        const cntEl = document.querySelector(`[data-cmt-count="${postId}"]`);
        if (cntEl) cntEl.textContent = comments.length;
    } catch(err) { console.error('_bpDeleteComment error:', err); showToast('Failed to delete', 'error'); }
}

async function _bpEditComment(postId, commentId) {
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const c = (data?.comments || []).find(cm => String(cm.id) === String(commentId));
        if (!c) return;
        const newText = await _showEditCommentModal(c.text);
        if (newText === null) return;
        const editHistory = c.editHistory || [];
        editHistory.push({ text: c.text, editedAt: new Date().toISOString() });
        const comments = (data.comments || []).map(cm =>
            String(cm.id) === String(commentId)
                ? { ...cm, text: newText.trim(), edited: true, editedAt: new Date().toISOString(), editHistory }
                : cm
        );
        await window.supabase.from('posts').update({ comments }).eq('id', postId);
        const post = _bp.posts.find(p => String(p.id) === String(postId));
        if (post) post.comments = comments;
        showToast('Comment updated ✏️');
        const listEl = document.querySelector(`[data-cmt-list="${postId}"]`);
        if (listEl) listEl.innerHTML = _bpRenderCommentList(comments, postId);
    } catch(err) { console.error('_bpEditComment error:', err); showToast('Failed to edit', 'error'); }
}

async function _bpDeleteReview(reviewId, ratedUserId) {
    if (!_bp.meId) { showToast('Please sign in', 'error'); return; }
    const numericId = Number(reviewId); // bigint column — cast to number for PostgREST safety
    try {
        const { error } = await window.supabase
            .from('ratings')
            .delete()
            .eq('id', numericId)
            .eq('rater_id', _bp.meId);
        if (error) throw error;

        // Remove from local cache
        _bp.ratings = _bp.ratings.filter(r => Number(r.id) !== numericId);

        // Recalculate average in profiles.stats (best-effort)
        try {
            const { data: ratingData } = await window.supabase
                .from('ratings').select('rating').eq('rated_user_id', ratedUserId);
            const { data: profileData } = await window.supabase.from('profiles').select('stats').eq('id', ratedUserId).single();
            const existingStats = profileData?.stats || {};
            const avg = ratingData && ratingData.length > 0
                ? parseFloat((ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length).toFixed(1))
                : 0;
            await window.supabase.from('profiles').update({
                stats: { ...existingStats, rating: avg }
            }).eq('id', ratedUserId);
        } catch (_) {}

        showToast('Review deleted');

        // Re-render reviews tab and update rating strip
        const tabContent = document.getElementById('opTabContent');
        if (tabContent) tabContent.innerHTML = _bpReviewsHTML();
        document.getElementById('ownerProfileBody').onclick = _bpClick;
        _bpUpdateRatingStrip();
    } catch (err) {
        console.error('_bpDeleteReview error:', err);
        showToast('Failed to delete review: ' + (err.message || 'Unknown error'), 'error');
    }
}

function _bpShowCommentHistory(postId, commentId) {
    const post = _bp.posts.find(p => String(p.id) === String(postId));
    const c = post?.comments?.find(cm => String(cm.id) === String(commentId));
    const history = c?.editHistory || [];
    if (!history.length) { showToast('No edit history available', 'info'); return; }
    const rows = history.map((h, i) => `
        <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Edit ${i+1} — ${new Date(h.editedAt).toLocaleString()}</div>
            <div style="font-size:13px;color:#374151;">${_esc(h.text)}</div>
        </div>`).join('');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:18px;max-width:420px;width:100%;max-height:70vh;overflow-y:auto;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">
            <button onclick="this.closest('[style*=fixed]').remove()" style="position:absolute;top:14px;right:14px;background:#f3f4f6;border:none;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
            <h4 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;">✏️ Edit History</h4>
            ${rows}
            <div style="padding:8px 0 0;margin-top:4px;">
                <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Current</div>
                <div style="font-size:13px;color:#374151;font-weight:600;">${_esc(c?.text||'')}</div>
            </div>
        </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// ── Facebook-style nested comment renderer ────────────────────────────────
// Supports: unlimited reply nesting, per-user like tracking, "see X more replies"
const BP_REPLIES_SHOWN = 2; // replies visible before "see more"

function _bpRenderReply(r, postId, parentCid, depth) {
    const meId = _bp.meId;
    const likedBy = r.likedBy || [];
    const iLiked = meId && likedBy.includes(meId);
    const replies = r.replies || [];
    const rid = String(r.id);
    const indent = Math.min(depth, 3) * 20; // cap visual indent at 3 levels
    return `
    <div data-reply-id="${rid}" style="display:flex;gap:7px;margin-top:7px;margin-left:${indent}px;align-items:flex-start;">
      <img src="${_esc(r.authorImg||'')}" onerror="this.style.display='none'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--border-light);">
      <div style="flex:1;min-width:0;">
        <div style="background:white;border-radius:10px;padding:6px 10px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${_esc(r.author||'User')}</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;word-break:break-word;">${_esc(r.text||'')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:2px;padding-left:4px;">
          <span style="font-size:10px;color:var(--text-muted);">${_fmtDate(r.created_at||'')}</span>
          <button data-op="like-reply" data-pid="${postId}" data-cid="${parentCid}" data-rid="${rid}"
            style="background:none;border:none;cursor:pointer;font-size:11px;color:${iLiked?'#e0245e':'#6b7280'};font-weight:600;padding:0;">
            ${iLiked?'❤️':'🤍'} ${r.likes||0}
          </button>
          <button data-op="reply-cmt" data-pid="${postId}" data-cid="${rid}" data-parent-cid="${parentCid}"
            style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">Reply</button>
          ${meId && String(r.user_id)===String(meId) ? `<button data-op="del-reply" data-pid="${postId}" data-cid="${parentCid}" data-rid="${rid}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
          ${meId && String(r.user_id)===String(meId) ? `<button data-op="edit-reply" data-pid="${postId}" data-cid="${parentCid}" data-rid="${rid}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:600;padding:0;">Edit</button>` : ''}
        </div>
        <div id="bp-reply-input-${rid}" style="display:none;gap:6px;margin-top:6px;flex-direction:row;">
          <input type="text" id="bp-reply-text-${rid}" placeholder="Write a reply…" style="flex:1;padding:5px 10px;border:1.5px solid var(--border-light);border-radius:50px;font-size:12px;outline:none;min-width:0;">
          <button data-op="post-reply" data-pid="${postId}" data-cid="${rid}" data-parent-cid="${parentCid}" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">↩</button>
        </div>
        ${replies.length ? _bpRenderRepliesBlock(replies, postId, rid, depth+1) : ''}
      </div>
    </div>`;
}

function _bpRenderRepliesBlock(replies, postId, parentCid, depth) {
    if (!replies.length) return '';
    const shown = replies.slice(0, BP_REPLIES_SHOWN);
    const hidden = replies.slice(BP_REPLIES_SHOWN);
    const hiddenHtml = hidden.length ? `
      <div id="bp-more-replies-${parentCid}" style="display:none;">
        ${hidden.map(r => _bpRenderReply(r, postId, parentCid, depth)).join('')}
      </div>
      <button data-op="see-more-replies" data-cid="${parentCid}"
        id="bp-see-more-btn-${parentCid}"
        style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--green-primary);font-weight:700;padding:4px 0 0 ${Math.min(depth,3)*20}px;">
        ↳ See ${hidden.length} more repl${hidden.length===1?'y':'ies'}
      </button>` : '';
    return shown.map(r => _bpRenderReply(r, postId, parentCid, depth)).join('') + hiddenHtml;
}

function _bpRenderCommentList(comments, postId) {
    if (!comments.length) return '';
    const meId = _bp.meId;
    const SHOWN = 5;
    const shown = comments.slice(0, SHOWN);
    const hidden = comments.slice(SHOWN);
    const hiddenHtml = hidden.length ? `
      <div id="bp-more-cmts-${postId}" style="display:none;">
        ${hidden.map(c => _bpRenderOneComment(c, postId)).join('')}
      </div>
      <button data-op="see-more-cmts" data-pid="${postId}"
        id="bp-see-more-cmts-btn-${postId}"
        style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--green-primary);font-weight:700;padding:4px 0;width:100%;text-align:left;">
        ↳ See ${hidden.length} more comment${hidden.length===1?'':'s'}
      </button>` : '';
    return shown.map(c => _bpRenderOneComment(c, postId)).join('') + hiddenHtml;
}

function _bpRenderOneComment(c, postId) {
    const meId = _bp.meId;
    const cid = String(c.id);
    const likedBy = c.likedBy || [];
    const iLiked = meId && likedBy.includes(meId);
    const replies = c.replies || [];
    return `
    <div data-cmt-id="${cid}" style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;">
      <img src="${_esc(c.authorImg||'')}" onerror="this.style.display='none'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-top:2px;background:var(--border-light);">
      <div style="flex:1;min-width:0;">
        <div style="background:white;border-radius:10px;padding:7px 11px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">${_esc(c.author||'User')}</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;word-break:break-word;">${_esc(c.text||'')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:2px;padding-left:4px;">
          <span style="font-size:10px;color:var(--text-muted);">${_fmtDate(c.created_at||'')}</span>
          <button data-op="like-cmt" data-pid="${postId}" data-cid="${cid}"
            style="background:none;border:none;cursor:pointer;font-size:11px;color:${iLiked?'#e0245e':'#6b7280'};font-weight:600;padding:0;">
            ${iLiked?'❤️':'🤍'} ${c.likes||0}
          </button>
          <button data-op="reply-cmt" data-pid="${postId}" data-cid="${cid}"
            style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">Reply</button>
          ${meId && String(c.user_id)===String(meId) ? `<button data-op="del-cmt" data-pid="${postId}" data-cid="${cid}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
          ${meId && String(c.user_id)===String(meId) ? `<button data-op="edit-cmt" data-pid="${postId}" data-cid="${cid}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:600;padding:0;">Edit</button>` : ''}
          ${c.edited ? `<span data-op="hist-cmt" data-pid="${postId}" data-cid="${cid}" style="cursor:pointer;font-size:10px;color:#9ca3af;font-weight:500;font-style:italic;">(edited)</span>` : ''}
        </div>
        <div id="bp-reply-input-${cid}" style="display:none;gap:6px;margin-top:6px;flex-direction:row;">
          <input type="text" id="bp-reply-text-${cid}" placeholder="Write a reply…" style="flex:1;padding:5px 10px;border:1.5px solid var(--border-light);border-radius:50px;font-size:12px;outline:none;min-width:0;">
          <button data-op="post-reply" data-pid="${postId}" data-cid="${cid}" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">↩</button>
        </div>
        ${replies.length ? _bpRenderRepliesBlock(replies, postId, cid, 1) : ''}
      </div>
    </div>`;
}

// ── Find a comment or reply by id anywhere in the tree ────────────────────
function _bpFindNode(comments, targetId) {
    for (const c of comments) {
        if (String(c.id) === String(targetId)) return { node: c, parent: null, parentArr: comments };
        const result = _bpFindInReplies(c.replies || [], targetId, c, comments);
        if (result) return result;
    }
    return null;
}
function _bpFindInReplies(replies, targetId, parent, parentArr) {
    for (const r of replies) {
        if (String(r.id) === String(targetId)) return { node: r, parent, parentArr: replies };
        const result = _bpFindInReplies(r.replies || [], targetId, r, replies);
        if (result) return result;
    }
    return null;
}

async function _bpLikeComment(postId, commentId) {
    if (!_bp.meId) { showToast('Sign in to like comments', 'error'); return; }
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = data?.comments || [];
        const found = _bpFindNode(comments, commentId);
        if (!found) return;
        const c = found.node;
        const likedBy = c.likedBy || [];
        if (likedBy.includes(_bp.meId)) {
            c.likedBy = likedBy.filter(id => id !== _bp.meId);
            c.likes = Math.max(0, (c.likes || 1) - 1);
        } else {
            c.likedBy = [...likedBy, _bp.meId];
            c.likes = (c.likes || 0) + 1;
        }
        await window.supabase.from('posts').update({ comments }).eq('id', postId);
        const post = _bp.posts.find(p => String(p.id) === String(postId));
        if (post) post.comments = comments;
        // Update button in-place
        const btn = document.querySelector(`[data-op="like-cmt"][data-pid="${postId}"][data-cid="${commentId}"]`);
        if (btn) { btn.style.color = (c.likedBy||[]).includes(_bp.meId)?'#e0245e':'#6b7280'; btn.innerHTML = `${(c.likes||0)>0?'❤️':'🤍'} ${c.likes||0}`; }
    } catch(err) { console.error('_bpLikeComment error:', err); }
}

async function _bpLikeReply(postId, commentId, replyId) {
    if (!_bp.meId) { showToast('Sign in to like', 'error'); return; }
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = data?.comments || [];
        const found = _bpFindNode(comments, replyId);
        if (!found) return;
        const r = found.node;
        const likedBy = r.likedBy || [];
        if (likedBy.includes(_bp.meId)) {
            r.likedBy = likedBy.filter(id => id !== _bp.meId);
            r.likes = Math.max(0, (r.likes || 1) - 1);
        } else {
            r.likedBy = [...likedBy, _bp.meId];
            r.likes = (r.likes || 0) + 1;
        }
        await window.supabase.from('posts').update({ comments }).eq('id', postId);
        const post = _bp.posts.find(p => String(p.id) === String(postId));
        if (post) post.comments = comments;
        const btn = document.querySelector(`[data-op="like-reply"][data-pid="${postId}"][data-rid="${replyId}"]`);
        if (btn) { btn.style.color = (r.likedBy||[]).includes(_bp.meId)?'#e0245e':'#6b7280'; btn.innerHTML = `${(r.likes||0)>0?'❤️':'🤍'} ${r.likes||0}`; }
    } catch(err) { console.error('_bpLikeReply error:', err); }
}

async function _bpPostReply(postId, commentId, parentCid) {
    if (!_bp.meId) { showToast('Sign in to reply', 'error'); return; }
    const inp = document.getElementById('bp-reply-text-' + commentId);
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = data?.comments || [];
        // Find the target node (could be top-level comment or nested reply)
        const found = _bpFindNode(comments, commentId);
        if (!found) return;
        const reply = {
            id: Date.now(),
            user_id: _bp.meId,
            author: _bp.meName || 'You',
            authorImg: _bp.meAvatar || '',
            text,
            likes: 0,
            likedBy: [],
            replies: [],
            created_at: new Date().toISOString()
        };
        found.node.replies = [...(found.node.replies || []), reply];
        await window.supabase.from('posts').update({ comments }).eq('id', postId);
        const post = _bp.posts.find(p => String(p.id) === String(postId));
        if (post) post.comments = comments;
        inp.value = '';
        const replyBox = document.getElementById('bp-reply-input-' + commentId);
        if (replyBox) replyBox.style.display = 'none';
        // Re-render the whole comment list in-place
        const listEl = document.querySelector(`[data-cmt-list="${postId}"]`);
        if (listEl) listEl.innerHTML = _bpRenderCommentList(comments, postId);
        showToast('Reply added! 💬');
    } catch(err) { console.error('_bpPostReply error:', err); showToast('Failed to reply', 'error'); }
}

async function _bpToggleSave(pid, btn) {
    if (!_bp.meId) { showToast('Sign in to save posts', 'error'); return; }
    const isSaved = _bp.savedIds.has(pid);
    try {
        if (isSaved) {
            await window.supabase.from('saved_posts').delete().eq('user_id', _bp.meId).eq('post_id', parseInt(pid));
            _bp.savedIds.delete(pid);
            showToast('Post unsaved 📑');
        } else {
            await window.supabase.from('saved_posts').upsert({ user_id: _bp.meId, post_id: parseInt(pid) }, { onConflict: 'user_id,post_id' });
            _bp.savedIds.add(pid);
            showToast('Post saved! 🔖');
        }
        if (btn) {
            const saved = _bp.savedIds.has(pid);
            btn.style.background = saved ? '#D97706' : '#FEF3C7';
            btn.style.color = saved ? 'white' : '#D97706';
            btn.textContent = saved ? '🔖 Saved' : '📑 Save';
        }
        // Clear the saved posts panel cache so it re-fetches next render
        if (typeof window._savedPostsCache !== 'undefined') window._savedPostsCache = null;
    } catch(err) {
        console.error('_bpToggleSave error:', err);
        showToast('Failed to save', 'error');
    }
}

function _bpKeypress(e) {
    if (e.key !== 'Enter') return;
    const inp = e.target.closest('[data-cmt-input]');
    if (inp) _bpAddComment(inp.dataset.cmtInput);
}

const _bpLikeInFlight = new Set();

async function _bpToggleLike(postId) {
    const pid  = String(postId);
    if (_bpLikeInFlight.has(pid)) return; // prevent double-click
    _bpLikeInFlight.add(pid);
    const post = _bp.posts.find(p => String(p.id) === pid);
    if (!post) return;
    if (!_bp.meId) { showToast('Sign in to like posts', 'error'); return; }

    const liked   = _bp.likedIds.has(pid);
    const btn     = document.querySelector(`[data-op="like"][data-pid="${pid}"]`);
    const countEl = document.querySelector(`[data-like-count="${pid}"]`);

    try {
        if (liked) {
            await window.supabase.from('likes').delete().eq('user_id', _bp.meId).eq('post_id', pid);
            await window.supabase.rpc('decrement_post_likes', { post_id: pid });
            post.likes = Math.max(0, (post.likes||1)-1);
            _bp.likedIds.delete(pid);
            if (btn) { btn.style.background='#E8F5E9'; btn.style.color='#4CAF50'; btn.style.fontWeight='600'; btn.textContent='🤍 Like'; }
        } else {
            const {error} = await window.supabase.from('likes').insert({user_id: _bp.meId, post_id: Number(pid)});
            if (error && error.code !== '23505') throw error;
            await window.supabase.rpc('increment_post_likes', { post_id: pid });
            post.likes = (post.likes||0)+1;
            _bp.likedIds.add(pid);
            if (btn) { btn.style.background='#4CAF50'; btn.style.color='white'; btn.style.fontWeight='600'; btn.textContent='❤️ Liked'; }
        }
        // Update the meta line count
        const metaCount = document.querySelector(`[data-like-count="${pid}"]`);
        if (metaCount) metaCount.textContent = post.likes;
    } catch(err) {
        console.error('_bpToggleLike:', err);
        showToast('Could not update like', 'error');
    } finally {
        _bpLikeInFlight.delete(pid);
    }
}

async function _bpAddComment(postId) {
    const pid  = String(postId);
    const inp  = document.querySelector(`[data-cmt-input="${pid}"]`);
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    if (!_bp.meId) { showToast('Sign in to comment', 'error'); return; }

    const post = _bp.posts.find(p => String(p.id) === pid);
    if (!post) return;

    const newCmt = {
        id: Date.now(), user_id: _bp.meId,
        author: _bp.meName || 'You', authorImg: _bp.meAvatar || '',
        text, likes: 0, likedBy: [], replies: [],
        created_at: new Date().toISOString()
    };
    const updated = [...(post.comments||[]), newCmt];

    try {
        await window.supabase.from('posts').update({comments: updated}).eq('id', pid);
        post.comments = updated;
        inp.value = '';
        const listEl = document.querySelector(`[data-cmt-list="${pid}"]`);
        if (listEl) listEl.innerHTML = _bpRenderCommentList(updated, pid);
        const cntEl = document.querySelector(`[data-cmt-count="${pid}"]`);
        if (cntEl) cntEl.textContent = updated.length;
        showToast('Comment posted! 💬');
    } catch(err) {
        console.error('_bpAddComment:', err);
        showToast('Could not post comment', 'error');
    }
}

// Helpers
function _esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function _safeUrl(url) {
    try {
        var u = new URL(String(url || ''));
        return (u.protocol === 'https:' || u.protocol === 'http:') ? url : '#';
    } catch(e) { return '#'; }
}
function _fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch(_){return '';}
}

// ============================================
// SWIPE BREEDER PROFILE — POST DETAIL LIGHTBOX
// ============================================
function _bpOpenPostDetail(post) {
    const imgs = post.images || [];
    let imgIdx = 0;
    const existing = document.getElementById('bpSwipePostDetail');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bpSwipePostDetail';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() {
        overlay.remove();
        document.removeEventListener('keydown', keyH);
    }

    function renderMedia(el) {
        if (!imgs.length) {
            el.style.background = 'linear-gradient(135deg,var(--green-primary),var(--green-secondary))';
            el.innerHTML = `<div style="padding:40px;color:white;font-size:20px;font-weight:700;text-align:center;line-height:1.5;">${_esc(post.text||'')}</div>`;
            return;
        }
        const prev = imgs.length > 1 ? `<button id="bspd-prev" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.55);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;">‹</button>` : '';
        const next = imgs.length > 1 ? `<button id="bspd-next" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.55);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;">›</button>` : '';
        const dots = imgs.length > 1 ? `<div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;">${imgs.map((_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===imgIdx?'white':'rgba(255,255,255,0.4)'};transition:background .2s;"></div>`).join('')}</div>` : '';
        el.style.background = '#000';
        el.innerHTML = `<img src="${_esc(imgs[imgIdx])}" style="max-width:100%;max-height:88vh;object-fit:contain;display:block;" onerror="this.style.display='none'">${prev}${next}${dots}`;
        el.querySelector('#bspd-prev')?.addEventListener('click', e => { e.stopPropagation(); imgIdx = (imgIdx-1+imgs.length)%imgs.length; renderMedia(el); });
        el.querySelector('#bspd-next')?.addEventListener('click', e => { e.stopPropagation(); imgIdx = (imgIdx+1)%imgs.length; renderMedia(el); });
    }

    function renderComments(comments, listEl) {
        if (!listEl) return;
        if (!comments.length) {
            listEl.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:20px;">No comments yet. Be the first! 💬</div>`;
            return;
        }
        listEl.innerHTML = comments.map(c => {
            const replies = c.replies || [];
            return `
            <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
                <img src="${_esc(c.authorImg||_esc(_bp.meAvatar||''))}" onerror="this.style.display='none'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--border-light);">
                <div style="flex:1;min-width:0;">
                    <div style="background:var(--bg-secondary);border-radius:14px;padding:8px 12px;">
                        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px;">${_esc(c.author||'User')}</div>
                        <div style="font-size:13px;color:var(--text-secondary);word-break:break-word;">${_esc(c.text||'')}</div>
                    </div>
                    <div style="display:flex;gap:10px;margin-top:3px;padding-left:6px;align-items:center;">
                        <span style="font-size:11px;color:var(--text-muted);">${_fmtDate(c.created_at||'')}</span>
                        <button data-bspd-op="like-cmt" data-cid="${_esc(String(c.id))}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">${(c.likes||0)>0?'❤️':'🤍'} ${c.likes||0}</button>
                        <button data-bspd-op="reply-toggle" data-cid="${_esc(String(c.id))}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">Reply</button>
                        ${_bp.meId && String(c.user_id)===String(_bp.meId) ? `<button data-bspd-op="edit-cmt" data-cid="${_esc(String(c.id))}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:600;padding:0;">Edit</button>` : ''}
                        ${_bp.meId && String(c.user_id)===String(_bp.meId) ? `<button data-bspd-op="del-cmt" data-cid="${_esc(String(c.id))}" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
                        ${c.edited ? `<span data-bspd-op="hist-cmt" data-cid="${_esc(String(c.id))}" style="cursor:pointer;font-size:10px;color:#9ca3af;font-weight:500;font-style:italic;">(edited)</span>` : ''}
                    </div>
                    <div id="bspd-reply-box-${_esc(String(c.id))}" style="display:none;gap:6px;margin-top:6px;align-items:center;">
                        <input type="text" id="bspd-reply-inp-${_esc(String(c.id))}" placeholder="Write a reply…" style="flex:1;padding:5px 10px;border:1.5px solid var(--border-light);border-radius:50px;font-size:12px;outline:none;min-width:0;">
                        <button data-bspd-op="post-reply" data-cid="${_esc(String(c.id))}" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">↩</button>
                    </div>
                    ${replies.length ? `<div style="margin-top:8px;padding-left:16px;display:flex;flex-direction:column;gap:6px;">${replies.map(r=>`
                    <div style="display:flex;gap:8px;align-items:flex-start;">
                        <img src="${_esc(r.authorImg||'')}" onerror="this.style.display='none'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--border-light);">
                        <div style="background:var(--bg-secondary);border-radius:10px;padding:5px 10px;flex:1;min-width:0;">
                            <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${_esc(r.author||'User')}</div>
                            <div style="font-size:12px;color:var(--text-secondary);word-break:break-word;">${_esc(r.text||'')}</div>
                        </div>
                    </div>`).join('')}</div>` : ''}
                </div>
            </div>`;
        }).join('');
        listEl.scrollTop = listEl.scrollHeight;
    }

    overlay.innerHTML = `
        <div style="display:flex;width:92vw;max-width:960px;max-height:90vh;background:var(--surface-white);border-radius:20px;overflow:hidden;position:relative;box-shadow:0 30px 80px rgba(0,0,0,0.5);">
            <button id="bspd-close" style="position:absolute;top:14px;right:14px;z-index:10;background:rgba(0,0,0,0.45);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">×</button>
            <div id="bspd-media" style="flex:1;min-width:0;background:#000;display:flex;align-items:center;justify-content:center;position:relative;max-height:90vh;overflow:hidden;"></div>
            <div id="bspd-side" style="width:340px;flex-shrink:0;display:flex;flex-direction:column;border-left:1px solid var(--border-light);max-height:90vh;overflow:hidden;background:var(--surface-white);">
                <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border-light);flex-shrink:0;">
                    <img src="${_esc(_bp.profile?.profile_picture||'')}" onerror="this.style.display='none'" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--green-primary);flex-shrink:0;">
                    <div>
                        <div style="font-weight:700;font-size:14px;color:var(--text-primary);">${_esc(_bp.profile?.name||'Owner')}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${_fmtDate(post.created_at)}</div>
                    </div>
                </div>
                ${post.text ? `<div style="padding:12px 16px;font-size:14px;color:var(--text-primary);line-height:1.65;border-bottom:1px solid var(--border-light);flex-shrink:0;word-break:break-word;">${_esc(post.text)}</div>` : ''}
                <div id="bspd-meta" style="padding:8px 16px;font-size:12px;color:var(--text-muted);border-bottom:1px solid var(--border-light);flex-shrink:0;">❤️ ${post.likes||0} likes &nbsp;•&nbsp; 💬 ${(post.comments||[]).length} comments${post.shares ? ` &nbsp;•&nbsp; 🔗 ${post.shares} shares` : ''}</div>
                <div style="display:flex;border-bottom:1px solid var(--border-light);flex-shrink:0;">
                    <button id="bspd-like-btn" style="flex:1;padding:10px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:${_bp.likedIds?.has(String(post.id))?'#e0245e':'var(--text-secondary)'};border-right:1px solid var(--border-light);transition:background .15s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">${_bp.likedIds?.has(String(post.id))?'❤️ Liked':'🤍 Like'}</button>
                    <button onclick="document.getElementById('bspd-comment-input').focus()" style="flex:1;padding:10px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);transition:background .15s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">💬 Comment</button>
                </div>
                <div id="bspd-comments-list" style="flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;"></div>
                <div style="padding:10px 16px;border-top:1px solid var(--border-light);display:flex;gap:8px;align-items:center;flex-shrink:0;background:var(--surface-white);">
                    <img src="${_esc(_bp.meAvatar||'')}" onerror="this.style.display='none'" style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--border-light);">
                    <input type="text" id="bspd-comment-input" placeholder="Write a comment…" style="flex:1;border:1.5px solid var(--border-light);border-radius:50px;padding:7px 13px;font-size:13px;outline:none;background:var(--bg-secondary);min-width:0;" onfocus="this.style.borderColor='var(--green-primary)'" onblur="this.style.borderColor='var(--border-light)'">
                    <button id="bspd-post-cmt-btn" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">Post</button>
                </div>
            </div>
        </div>`;

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('bspd-close')?.addEventListener('click', close);

    // Render media
    const mediaEl = document.getElementById('bspd-media');
    renderMedia(mediaEl);

    // Load & render comments
    let _post = { ...post };
    window.supabase.from('posts').select('id,user_id,text,images,likes,shares,comments,created_at').eq('id', post.id).single().then(({data}) => {
        if (data) _post = data;
        renderComments(_post.comments||[], document.getElementById('bspd-comments-list'));
        const meta = document.getElementById('bspd-meta');
        if (meta) meta.innerHTML = `❤️ ${_post.likes||0} likes &nbsp;•&nbsp; 💬 ${(_post.comments||[]).length} comments${_post.shares ? ` &nbsp;•&nbsp; 🔗 ${_post.shares} shares` : ''}`;
    });

    // Like button
    document.getElementById('bspd-like-btn')?.addEventListener('click', async () => {
        if (!_bp.meId) { showToast('Sign in to like', 'error'); return; }
        const pid = String(post.id);
        const liked = _bp.likedIds?.has(pid);
        const btn = document.getElementById('bspd-like-btn');
        try {
            if (liked) {
                await window.supabase.from('likes').delete().eq('user_id', _bp.meId).eq('post_id', pid);
                await window.supabase.rpc('decrement_post_likes', { post_id: Number(pid) });
                _post.likes = Math.max(0, (_post.likes||1)-1); _bp.likedIds?.delete(pid);
                if (btn) { btn.style.color='var(--text-secondary)'; btn.innerHTML='🤍 Like'; }
            } else {
                const {error} = await window.supabase.from('likes').insert({user_id: _bp.meId, post_id: Number(pid)});
                if (error && error.code !== '23505') throw error;
                await window.supabase.rpc('increment_post_likes', { post_id: Number(pid) });
                _post.likes = (_post.likes||0)+1; _bp.likedIds?.add(pid);
                if (btn) { btn.style.color='#e0245e'; btn.innerHTML='❤️ Liked'; }
            }
            const meta = document.getElementById('bspd-meta');
            if (meta) meta.innerHTML = `❤️ ${_post.likes} likes &nbsp;•&nbsp; 💬 ${(_post.comments||[]).length} comments${_post.shares ? ` &nbsp;•&nbsp; 🔗 ${_post.shares} shares` : ''}`;
        } catch(err) { showToast('Could not update like', 'error'); }
    });

    // Post comment button
    document.getElementById('bspd-post-cmt-btn')?.addEventListener('click', async () => {
        const inp = document.getElementById('bspd-comment-input');
        if (!inp) return;
        const text = inp.value.trim();
        if (!text) return;
        if (!_bp.meId) { showToast('Sign in to comment', 'error'); return; }
        inp.value = '';
        const newCmt = { id: Date.now(), user_id: _bp.meId, author: _bp.meName||'You', authorImg: _bp.meAvatar||'', text, created_at: new Date().toISOString() };
        const updated = [...(_post.comments||[]), newCmt];
        try {
            await window.supabase.from('posts').update({comments: updated}).eq('id', post.id);
            _post.comments = updated;
            // Also update in _bp.posts cache
            const bpPost = _bp.posts.find(p => String(p.id) === String(post.id));
            if (bpPost) bpPost.comments = updated;
            renderComments(updated, document.getElementById('bspd-comments-list'));
            const meta = document.getElementById('bspd-meta');
            if (meta) meta.innerHTML = `❤️ ${_post.likes||0} likes &nbsp;•&nbsp; 💬 ${updated.length} comments${_post.shares ? ` &nbsp;•&nbsp; 🔗 ${_post.shares} shares` : ''}`;
            showToast('Comment posted! 💬');
        } catch(err) { showToast('Failed to post comment', 'error'); }
    });

    // Comment input enter key
    document.getElementById('bspd-comment-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('bspd-post-cmt-btn')?.click();
    });

    // Delegate comment actions (like-cmt, reply-toggle, del-cmt, post-reply)
    document.getElementById('bspd-comments-list')?.addEventListener('click', async e => {
        const btn = e.target.closest('[data-bspd-op]');
        if (!btn) return;
        const op = btn.dataset.bspdOp;
        const cid = btn.dataset.cid;

        if (op === 'reply-toggle') {
            const box = document.getElementById('bspd-reply-box-' + cid);
            if (box) { const showing = box.style.display !== 'none' && box.style.display !== ''; box.style.display = showing ? 'none' : 'flex'; if (!showing) document.getElementById('bspd-reply-inp-'+cid)?.focus(); }
            return;
        }
        if (op === 'post-reply') {
            if (!_bp.meId) return;
            const ri = document.getElementById('bspd-reply-inp-'+cid);
            if (!ri) return;
            const text = ri.value.trim();
            if (!text) return;
            ri.value = '';
            const { data } = await window.supabase.from('posts').select('comments').eq('id', post.id).single();
            const comments = data?.comments || [];
            const idx = comments.findIndex(c => String(c.id) === String(cid));
            if (idx !== -1) {
                const reply = { id: Date.now(), user_id: _bp.meId, author: _bp.meName||'You', authorImg: _bp.meAvatar||'', text, created_at: new Date().toISOString() };
                comments[idx].replies = [...(comments[idx].replies||[]), reply];
                await window.supabase.from('posts').update({comments}).eq('id', post.id);
                _post.comments = comments;
                const bpPost = _bp.posts.find(p => String(p.id) === String(post.id));
                if (bpPost) bpPost.comments = comments;
                renderComments(comments, document.getElementById('bspd-comments-list'));
                showToast('Reply added! 💬');
            }
            return;
        }
        if (op === 'like-cmt') {
            if (!_bp.meId) return;
            const { data } = await window.supabase.from('posts').select('comments').eq('id', post.id).single();
            const comments = data?.comments || [];
            const idx = comments.findIndex(c => String(c.id) === String(cid));
            if (idx === -1) return;
            const c = comments[idx];
            const likedBy = c.likedBy || [];
            if (likedBy.includes(_bp.meId)) { c.likedBy = likedBy.filter(id=>id!==_bp.meId); c.likes = Math.max(0,(c.likes||1)-1); }
            else { c.likedBy = [...likedBy, _bp.meId]; c.likes = (c.likes||0)+1; }
            comments[idx] = c;
            await window.supabase.from('posts').update({comments}).eq('id', post.id);
            _post.comments = comments;
            renderComments(comments, document.getElementById('bspd-comments-list'));
            return;
        }
        if (op === 'del-cmt') {
            if (!_bp.meId) return;
            if (!confirm('Delete this comment?')) return;
            const { data } = await window.supabase.from('posts').select('comments').eq('id', post.id).single();
            const comments = (data?.comments||[]).filter(c => String(c.id)!==String(cid));
            await window.supabase.from('posts').update({comments}).eq('id', post.id);
            _post.comments = comments;
            const bpPost = _bp.posts.find(p => String(p.id) === String(post.id));
            if (bpPost) bpPost.comments = comments;
            renderComments(comments, document.getElementById('bspd-comments-list'));
            showToast('Comment deleted');
            return;
        }
        if (op === 'edit-cmt') {
            if (!_bp.meId) return;
            const { data } = await window.supabase.from('posts').select('comments').eq('id', post.id).single();
            const c = (data?.comments||[]).find(cm => String(cm.id)===String(cid));
            if (!c) return;
            const newText = await _showEditCommentModal(c.text);
            if (newText === null) return;
            const editHistory = c.editHistory || [];
            editHistory.push({ text: c.text, editedAt: new Date().toISOString() });
            const comments = (data.comments||[]).map(cm =>
                String(cm.id)===String(cid) ? {...cm, text:newText.trim(), edited:true, editedAt:new Date().toISOString(), editHistory} : cm
            );
            await window.supabase.from('posts').update({comments}).eq('id', post.id);
            _post.comments = comments;
            const bpPost2 = _bp.posts.find(p => String(p.id) === String(post.id));
            if (bpPost2) bpPost2.comments = comments;
            renderComments(comments, document.getElementById('bspd-comments-list'));
            showToast('Comment updated ✏️');
            return;
        }
        if (op === 'hist-cmt') {
            const c2 = (_post.comments||[]).find(cm => String(cm.id)===String(cid));
            const history = c2?.editHistory || [];
            if (!history.length) { showToast('No edit history', 'info'); return; }
            const rows = history.map((h, i) => `<div style="padding:7px 0;border-bottom:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;">Edit ${i+1} — ${new Date(h.editedAt).toLocaleString()}</div><div style="font-size:13px;color:#374151;margin-top:2px;">${_esc(h.text)}</div></div>`).join('');
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';
            ov.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:400px;width:100%;max-height:65vh;overflow-y:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;"><button onclick="this.closest('[style*=fixed]').remove()" style="position:absolute;top:12px;right:12px;background:#f3f4f6;border:none;width:28px;height:28px;border-radius:50%;font-size:15px;cursor:pointer;">×</button><h4 style="margin:0 0 12px;font-size:14px;font-weight:700;">✏️ Edit History</h4>${rows}<div style="padding:8px 0 0;"><div style="font-size:10px;color:#9ca3af;">Current</div><div style="font-size:13px;color:#111;font-weight:600;margin-top:2px;">${_esc(c2?.text||'')}</div></div></div>`;
            ov.addEventListener('click', e => { if (e.target===ov) ov.remove(); });
            document.body.appendChild(ov);
            return;
        }
    });

    function keyH(e) {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight' && imgs.length > 1) { imgIdx = (imgIdx+1)%imgs.length; renderMedia(mediaEl); }
        if (e.key === 'ArrowLeft'  && imgs.length > 1) { imgIdx = (imgIdx-1+imgs.length)%imgs.length; renderMedia(mediaEl); }
    }
    document.addEventListener('keydown', keyH);
}

function closeBreederProfile() {
    const modal = document.getElementById('ownerProfileModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
    // Hide fixed close button
    const closeBtn = document.getElementById('breederProfileCloseBtn');
    if (closeBtn) closeBtn.style.display = 'none';
    _bp = { userId:null, profile:null, posts:[], animals:[], ratings:[], likedIds:new Set(), savedIds:new Set(), tab:'posts', meId:null, meName:null, meAvatar:null, followersCount:0, followingCount:0, isFollowing:false, followId:null, starFilter:0, followersList:null, followingList:null };
}


// Initialize
function init() {
    if (!protectSwipePage()) return;
    
    cardStack = document.getElementById('cardStack');
    emptyState = document.getElementById('emptyState');
    indicatorNope = document.getElementById('indicatorNope');
    indicatorLike = document.getElementById('indicatorLike');
    matchesList = document.getElementById('matchesList');
    matchCount = document.getElementById('matchCount');
    
    if (!cardStack) {
        console.error('cardStack element not found');
        return;
    }
    
    liked = [];
    passed = [];
    loadSwipeAnimals();
    
    // chatWith is handled by messages.js when the user opens the messenger
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Only run swipe init if cardStack exists (i.e. we're on the swipe page)
    if (document.getElementById('cardStack')) init();
});

document.getElementById('matchOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeMatch();
});

// Expose functions to window
// swipe is defined in swipe.js — only expose if it's loaded
if (typeof swipe !== 'undefined') window.swipe = swipe;
// Export swipe-only functions only if they are defined
if (typeof toggleFilters !== 'undefined') window.toggleFilters = toggleFilters;
if (typeof updateBreeds !== 'undefined') window.updateBreeds = updateBreeds;
if (typeof applyFilters !== 'undefined') window.applyFilters = applyFilters;
if (typeof resetFilters !== 'undefined') window.resetFilters = resetFilters;
if (typeof showPassed !== 'undefined') window.showPassed = showPassed;
if (typeof renderBreedersTab !== 'undefined') window.renderBreedersTab = renderBreedersTab;
if (typeof closeMatch !== 'undefined') window.closeMatch = closeMatch;
if (typeof messageMatch !== 'undefined') window.messageMatch = messageMatch;
if (typeof viewMatchProfile !== 'undefined') window.viewMatchProfile = viewMatchProfile;
if (typeof messageMatchBreeder !== 'undefined') window.messageMatchBreeder = messageMatchBreeder;
if (typeof showPetDetails !== 'undefined') window.showPetDetails = showPetDetails;
if (typeof closePetDetails !== 'undefined') window.closePetDetails = closePetDetails;
if (typeof showDocuments !== 'undefined') window.showDocuments = showDocuments;
if (typeof messageOwner !== 'undefined') window.messageOwner = messageOwner;
if (typeof rateMatchBreeder !== 'undefined') window.rateMatchBreeder = rateMatchBreeder;
if (typeof deleteLikedAnimal !== 'undefined') window.deleteLikedAnimal = deleteLikedAnimal;
if (typeof likePassedAnimal !== 'undefined') window.likePassedAnimal = likePassedAnimal;
// These are always available in this file
window.openRateModal = openRateModal;
window.closeRateModal = closeRateModal;
window.setRating = setRating;
window.submitRating = submitRating;
window.openBreederProfile  = openBreederProfile;
window._bpToggleFollow    = _bpToggleFollow;
window.closeBreederProfile = closeBreederProfile;
// ── Live avatar sync ──────────────────────────────────────────────────────
// Refresh the current user's own avatar in any swipe-page elements that show it
// (e.g. the open breeder profile panel or match list avatars).
window.addEventListener('breedlink:avatarChanged', function (e) {
    const { userId, avatarUrl } = e.detail || {};
    if (!userId || !avatarUrl) return;
    document.querySelectorAll('img[src*="/avatars/"]').forEach(function (img) {
        if ((img.getAttribute('src') || '').includes(userId)) {
            img.src = avatarUrl;
        }
    });
    // Also update opAvatar if the open breeder profile is the current user
    var opAvatar = document.getElementById('opAvatar');
    if (opAvatar && (opAvatar.getAttribute('src') || '').includes(userId)) {
        opAvatar.src = avatarUrl;
    }
});

// ── Share URL deep-link: ?post=<id> ──────────────────────────────────────
// When someone opens a shared post link, open the breeder profile panel
// and then immediately open that specific post's detail lightbox.
(function _bpHandlePostDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (!postId) return;

    // Wait until auth + page are ready, then resolve the post's owner and open
    function tryOpen(attempts) {
        if (attempts <= 0) return;
        // Need supabase ready and user authenticated
        if (!window.supabase || !window.supabaseReady) {
            return setTimeout(() => tryOpen(attempts - 1), 300);
        }
        window.supabase.from('posts').select('id,user_id,text,images,likes,shares,comments,created_at').eq('id', postId).single().then(({ data: post, error }) => {
            if (error || !post) { console.warn('Post deep-link: post not found', postId); return; }
            const userId = post.user_id;
            if (!userId) return;
            // Open breeder profile, then scroll to post and open its detail
            openBreederProfile(userId).then(() => {
                // Clean up URL only after successful open so refresh doesn't re-trigger
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('post');
                window.history.replaceState({}, '', cleanUrl.toString());
                // Small delay to let the panel render, then scroll + open detail
                setTimeout(() => {
                    const p = _bp.posts.find(p => String(p.id) === String(postId));
                    if (p) {
                        // First scroll the panel to the post so the user sees where it is
                        _bpScrollToPost(String(p.id));
                        // Then open the post detail lightbox
                        setTimeout(() => _bpOpenPostDetail(p), 300);
                    }
                }, 450);
            }).catch(err => console.warn('Post deep-link: openBreederProfile failed', err));
        });
    }

    // Wait for DOMContentLoaded + supabase init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(() => tryOpen(20), 500));
    } else {
        setTimeout(() => tryOpen(20), 500);
    }
})();
