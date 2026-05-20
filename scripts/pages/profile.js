console.log('=== Profile Script Loading ===');

let isEditMode = false;
let pendingPostImages = []; // array of { dataUrl, file }
let pendingPostImage = null; // kept for legacy references, mirrors pendingPostImages[0]?.dataUrl
let currentUserId = null;
let currentPostId = null;
let currentAnimalId = null;
let currentComment = null;
let pendingAnimalImages = [];
let pendingAnimalDocuments = [];

console.log('Profile script ready');

// Profile Data
let profileData = {
    id: null,
    name: '',
    bio: '',
    tags: [],
    contact: { email: '', phone: '', location: '' },
    stats: { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 },
    profileImg: defaultAvatar('User'),
    coverImg: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200'
};

let posts = [];
let animals = [];

// Messenger variables
let messengerContacts = [];
let messengerMessages = {};
let currentChatId = null;

// ============================================
// HELPER FUNCTIONS
// ============================================
function previewPostImage(input, previewContainerId) {
    const container = document.getElementById(previewContainerId);
    if (!container) return;
    if (!input.files || !input.files.length) return;

    const files = Array.from(input.files).slice(0, 6); // max 6 images
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversized.length) {
        showToast('Some images exceed 10MB and were skipped', 'error');
    }
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (!validFiles.length) return;

    // Reset pending
    pendingPostImages = [];

    let loaded = 0;
    const results = new Array(validFiles.length);

    validFiles.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            results[i] = { dataUrl: e.target.result, file };
            loaded++;
            if (loaded === validFiles.length) {
                pendingPostImages = results;
                pendingPostImage = results[0]?.dataUrl || null; // legacy compat
                renderPostImagePreview(container, input);
                showToast(`${validFiles.length} image${validFiles.length > 1 ? 's' : ''} attached 📷`);
            }
        };
        reader.readAsDataURL(file);
    });
}

function renderPostImagePreview(container, input) {
    container.innerHTML = '';
    if (!pendingPostImages.length) return;

    const count = pendingPostImages.length;
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        gap: 6px;
        margin-top: 12px;
        border-radius: 14px;
        overflow: hidden;
        grid-template-columns: ${count === 1 ? '1fr' : count === 2 ? '1fr 1fr' : count === 3 ? '2fr 1fr' : 'repeat(2, 1fr)'};
        grid-template-rows: ${count === 3 ? 'auto' : 'auto'};
    `;

    pendingPostImages.forEach((item, idx) => {
        const cell = document.createElement('div');
        cell.style.cssText = `position:relative;overflow:hidden;border-radius:10px;background:#000;${
            count === 3 && idx === 0 ? 'grid-row: span 2;' : ''
        }`;

        const img = document.createElement('img');
        img.src = item.dataUrl;
        img.style.cssText = `width:100%;height:${count === 1 ? 'auto' : '180px'};object-fit:${count === 1 ? 'contain' : 'cover'};display:block;max-height:${count === 1 ? '380px' : '220px'};background:#000;`;

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove';
        removeBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,0.65);color:white;border:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1;transition:background .2s;';
        removeBtn.onmouseover = () => removeBtn.style.background = 'rgba(220,38,38,0.85)';
        removeBtn.onmouseout = () => removeBtn.style.background = 'rgba(0,0,0,0.65)';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            pendingPostImages.splice(idx, 1);
            pendingPostImage = pendingPostImages[0]?.dataUrl || null;
            if (!pendingPostImages.length) { input.value = ''; container.innerHTML = ''; return; }
            renderPostImagePreview(container, input);
        };

        // show image count badge on last cell if > 6
        cell.appendChild(img);
        cell.appendChild(removeBtn);
        grid.appendChild(cell);
    });

    container.appendChild(grid);
}

function openLightbox(src) {
    const img = document.getElementById('lightboxImg');
    if (img) img.src = src;
    openModal('lightboxModal');
}

function previewAnimalImage(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.style.backgroundImage = `url('${e.target.result}')`;
                preview.classList.add('has-image');
                preview.innerHTML = '';
                pendingAnimalImages = [file];
            }
        };
        reader.readAsDataURL(file);
    }
}

function previewAnimalDocuments(input, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    pendingAnimalDocuments = Array.from(input.files);
    container.innerHTML = '';
    
    pendingAnimalDocuments.forEach((file, index) => {
        const docDiv = document.createElement('div');
        docDiv.className = 'document-preview-item';
        docDiv.innerHTML = `
            <div class="doc-icon">${file.type.includes('image') ? '🖼️' : '📄'}</div>
            <div class="doc-name">${escapeHtml(file.name)}</div>
            <button class="remove-doc-btn" onclick="this.parentElement.remove(); pendingAnimalDocuments.splice(${index}, 1)">×</button>
        `;
        container.appendChild(docDiv);
    });
}

function previewMultipleFiles(input, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container || !input.files) return;
    
    Array.from(input.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'document-preview-item';
            
            if (type === 'image') {
                itemDiv.style.backgroundImage = `url('${e.target.result}')`;
                itemDiv.innerHTML = `<button class="remove-doc-btn" data-index="${index}">×</button>`;
            } else {
                itemDiv.innerHTML = `
                    <div class="doc-icon">📄</div>
                    <div class="doc-name">${escapeHtml(file.name)}</div>
                    <button class="remove-doc-btn" data-index="${index}">×</button>
                `;
            }
            container.appendChild(itemDiv);
        };
        reader.readAsDataURL(file);
    });
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadProfile() {
    let user = User.getUser();

    // If no valid user or user.id is missing, try refreshing from Supabase
    if (!user || !user.id) {
        user = await User.getFreshUser();
    }

    if (!user || !user.id) return;
    
    currentUserId = user.id;
    
    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('id,name,profile_picture,cover_photo,bio,account_type,is_verified,location,contact,tags,stats,username')
            .eq('id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Profile fetch error:', error);
        }
        
        if (profile) {
            profileData.id = profile.id;
            profileData.name = profile.name || user.name;
            profileData.bio = profile.bio || '';
            profileData.tags = profile.tags || [];
            profileData.contact = profile.contact || { email: user.email, phone: '', location: '' };
            profileData.stats = profile.stats || { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 };
            profileData.profileImg = profile.profile_picture || user.avatar || defaultAvatar(profile.name || user.name || 'User');
            profileData.coverImg = profile.cover_photo || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200';
        } else {
            profileData.name = user.name;
            profileData.contact.email = user.email;
            profileData.profileImg = user.avatar || defaultAvatar(user.name || 'User');
        }
        
        if (typeof User !== 'undefined' && User.current) {
            // Only merge profile display fields — NEVER overwrite id, email, or auth tokens
            User.current.name = profileData.name || User.current.name;
            User.current.bio = profileData.bio;
            User.current.tags = profileData.tags;
            User.current.contact = profileData.contact;
            User.current.stats = profileData.stats;
            User.current.avatar = profileData.profileImg || User.current.avatar;
            User.current.coverPhoto = profileData.coverImg || User.current.coverPhoto;
            // Preserve id — never let profileData.id (which defaults to null) overwrite it
            sessionStorage.setItem('breedlink_user', JSON.stringify(User.current));
        }
        
        updateProfileUI();
        updateContactDOM();
        
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            const avatarSrc = profileData.profileImg || defaultAvatar(profileData.name || 'User');
            profileBtn.innerHTML = `<img src="${avatarSrc}" alt="${profileData.name || 'User'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
        
        // Re-sync nav — ensures login/signup buttons are hidden if user is authenticated
        if (typeof updateNavForAuthStatus === 'function') updateNavForAuthStatus();

        // Backfill: if contact.location exists but top-level profiles.location is empty,
        // sync it now so animal cards on the swipe page show the correct location
        if (profile && !profile.location && profileData.contact?.location) {
            try { await User.updateUser({ location: profileData.contact.location }); } catch(e) {}
        }

        // Fetch live ratings count and average (not from cached stats)
        loadAndDisplayRatings();
        
    } catch (err) {
        console.error('loadProfile error:', err);
    }
}

function updateContactDOM() {
    const emailSpan = document.querySelector('#contactEmail span:last-child');
    const phoneSpan = document.querySelector('#contactPhone span:last-child');
    const locationSpan = document.querySelector('#contactLocation span:last-child');
    if (emailSpan) emailSpan.textContent = profileData.contact.email || '';
    if (phoneSpan) phoneSpan.textContent = profileData.contact.phone || '';
    if (locationSpan) locationSpan.textContent = profileData.contact.location || '';
}

async function loadPosts() {
    if (!currentUserId) return;
    try {
        const { data, error } = await window.supabase
            .from('posts')
            .select(`
                *,
                profiles:user_id (name, profile_picture)
            `)
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        // Fetch liked + saved state — isolated so it never kills posts load
        const postIds = (data || []).map(p => String(p.id));
        let likedPostIds = new Set();
        let savedPostIds = new Set();
        try {
            if (postIds.length > 0) {
                const [likeRes, savedRes] = await Promise.all([
                    window.supabase.from('likes').select('post_id').eq('user_id', currentUserId).in('post_id', postIds),
                    window.supabase.from('saved_posts').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
                ]);
                likedPostIds = new Set((likeRes.data || []).map(l => String(l.post_id)));
                savedPostIds = new Set((savedRes.data || []).map(s => String(s.post_id)));
            }
        } catch (likeErr) {
            console.warn('Could not load likes/saved (non-fatal):', likeErr);
        }
        
        posts = (data || []).map(post => ({
            id: post.id,
            user_id: post.user_id,
            text: post.text,
            images: post.images || [],
            likes: post.likes || 0,
            liked: likedPostIds.has(String(post.id)),
            saved: savedPostIds.has(String(post.id)),
            shares: post.shares || 0,
            comments: post.comments || [],
            created_at: post.created_at,
            author: post.profiles?.name || profileData.name,
            authorImg: post.profiles?.profile_picture || profileData.profileImg
        }));
        
        renderPosts();
    } catch (err) {
        console.error('loadPosts error:', err);
        posts = [];
        renderPosts();
    }
}

async function loadAnimals() {
    // If currentUserId is not yet set (e.g. auth race condition on first load),
    // try to resolve it from the session before giving up.
    if (!currentUserId) {
        try {
            const freshUser = await User.getFreshUser();
            if (freshUser && freshUser.id) {
                currentUserId = freshUser.id;
            }
        } catch (_) {}
    }
    if (!currentUserId) return;
    try {
        console.log('[loadAnimals] Querying for user_id:', currentUserId);
        const { data, error } = await window.supabase
            .from('animals')
            .select('id,name,breed,species,image_url,status,description,age,gender,color,user_id,created_at,updated_at,price,image_urls,video_url,health_certificates,health_documents,genetic_tests,is_vaccinated,is_dewormed,category,type')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });
        
        console.log('[loadAnimals] Result - data:', data, '| error:', error);

        if (error) throw error;
        
        animals = data || [];
        renderAnimals();
        
        if (profileData.stats) {
            profileData.stats.litters = animals.length;
            updateProfileUI();
        }
    } catch (err) {
        console.error('loadAnimals error:', err);
        animals = [];
        renderAnimals();
    }
}

// ============================================
// UI RENDERING FUNCTIONS
// ============================================

function updateProfileUI() {
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = profileData.name;
    
    const bioContent = document.getElementById('bioContent');
    if (bioContent) {
        if (profileData.bio) {
            bioContent.innerHTML = profileData.bio.split('\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('');
        } else {
            bioContent.innerHTML = '<p style="color:var(--text-muted);font-style:italic;">No bio yet.</p>';
        }
        bioContent.style.maxWidth = '100%';
    }
    
    const followersCount = document.getElementById('followersCount');
    if (followersCount) followersCount.textContent = profileData.stats?.followers || 0;

    const followingCount = document.getElementById('followingCount');
    if (followingCount) followingCount.textContent = profileData.stats?.following || 0;
    
    const littersCount = document.getElementById('littersCount');
    if (littersCount) littersCount.textContent = animals.length;

    const postsCount = document.getElementById('postsCount');
    if (postsCount) postsCount.textContent = posts.length;
    
    const reviewsCount = document.getElementById('reviewsCount');
    if (reviewsCount) reviewsCount.textContent = profileData.stats?.reviewCount || profileData.stats?.rating || 0;
    
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) {
        tagsContainer.innerHTML = (profileData.tags || []).map(tag =>
            `<span class="tag">${escapeHtml(tag)} ${isEditMode ? '<span class="remove-tag" onclick="removeTag(this)">×</span>' : ''}</span>`
        ).join('') + (isEditMode ? '<button class="add-tag-btn" onclick="addNewTag()">➕ Add Tag</button>' : '');
    }
    
    const editNameBtn = document.querySelector('.edit-name-btn');
    const editBioBtn = document.querySelector('.edit-bio-btn');
    const editContactBtn = document.querySelector('.edit-contact-btn');
    const addAnimalBtn = document.querySelector('.add-animal-btn');
    
    if (editNameBtn) editNameBtn.style.display = isEditMode ? 'inline-flex' : 'none';
    if (editBioBtn) editBioBtn.style.display = isEditMode ? 'inline-flex' : 'none';
    if (editContactBtn) editContactBtn.style.display = isEditMode ? 'inline-flex' : 'none';
    if (addAnimalBtn) addAnimalBtn.style.display = 'inline-flex'; // Always visible on own profile
    
    const coverOverlay = document.querySelector('.cover-overlay');
    if (coverOverlay) coverOverlay.style.display = isEditMode ? 'flex' : 'none';
    
    // Toggle edit-mode class on container — CSS handles overlay visibility
    const profileImgContainer = document.querySelector('.profile-img-container');
    if (profileImgContainer) {
        if (isEditMode) profileImgContainer.classList.add('edit-mode');
        else profileImgContainer.classList.remove('edit-mode');
    }
    
    const profileImg = document.getElementById('profileImg');
    if (profileImg && profileData.profileImg) {
        profileImg.src = profileData.profileImg;
        profileImg.onerror = function() {
            this.src = defaultAvatar(profileData && profileData.name || 'User');
        };
    }
    
    const coverPhoto = document.getElementById('coverPhoto');
    if (coverPhoto) coverPhoto.style.backgroundImage = `url('${profileData.coverImg}')`;
    
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        const avatarSrc = profileData.profileImg || defaultAvatar(profileData.name || 'User');
        profileBtn.innerHTML = `<img src="${avatarSrc}" alt="${profileData.name || 'User'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
}

function renderPosts() {
    const postsCountEl = document.getElementById('postsCount');
    if (postsCountEl) postsCountEl.textContent = posts.length;
    const container = document.getElementById('postsContainer');
    if (!container) return;
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
                <div style="font-size: 40px; margin-bottom: 12px;">🐾</div>
                <p style="font-size: 14px;">No posts yet. Share your first update!</p>
            </div>`;
        return;
    }
    
    container.innerHTML = posts.map(post => {
        const imgs = post.images || [];
        const count = imgs.length;
        let imagesHtml = '';
        if (count > 0) {
            const gridCols = count === 1 ? '1fr' : count === 2 ? '1fr 1fr' : count === 3 ? '2fr 1fr' : 'repeat(2,1fr)';
            const cellHeight = count === 1 ? 'auto' : '200px';
            const maxH = count === 1 ? '420px' : '220px';
            const objFit = count === 1 ? 'contain' : 'cover';
            const bg = count === 1 ? '#000' : 'var(--bg-secondary)';
            imagesHtml = `
                <div class="post-images-grid" style="display:grid;gap:4px;grid-template-columns:${gridCols};border-radius:14px;overflow:hidden;margin-bottom:14px;cursor:pointer;" onclick="openPostDetail(${post.id})">
                    ${imgs.slice(0, 4).map((img, idx) => {
                        const span = count === 3 && idx === 0 ? 'grid-row:span 2;' : '';
                        const overlay = count > 4 && idx === 3 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:800;">+${count - 4}</div>` : '';
                        return `<div style="position:relative;overflow:hidden;background:${bg};${span}">
                            <img src="${img}" style="width:100%;height:${cellHeight};max-height:${maxH};object-fit:${objFit};display:block;transition:transform .3s;" loading="lazy" onerror="this.parentElement.style.display='none'">
                            ${overlay}
                        </div>`;
                    }).join('')}
                </div>`;
        }
        return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${post.authorImg || profileData.profileImg}" alt="${escapeHtml(post.author)}"
                     onerror="this.src=defaultAvatar(this.alt||'User')"
                     onclick="openBreederProfile('${post.user_id}')" style="cursor:pointer;" title="View profile">
                <div class="post-header-info" onclick="openBreederProfile('${post.user_id}')" style="cursor:pointer;">
                    <div class="post-author">${escapeHtml(post.author)}</div>
                    <div class="post-time">${formatDate(post.created_at)}</div>
                </div>
                <button class="post-menu" onclick="event.stopPropagation(); openPostMenu(${post.id})" style="display: flex !important;">⋮</button>
            </div>
            ${post.text ? `<div class="post-text" style="cursor:pointer;" onclick="openPostDetail(${post.id})">${escapeHtml(post.text)}</div>` : ''}
            ${imagesHtml}
            <div class="post-meta">
                <span>${post.likes} likes • ${post.comments?.length || 0} comments${post.shares ? ` • ${post.shares} shares` : ''}</span>
                <span style="font-size:11px;color:var(--text-muted);cursor:pointer;" onclick="openPostDetail(${post.id})">View all comments</span>
            </div>
            <div class="post-actions">
                <button class="${post.liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <span>${post.liked ? '❤️' : '🤍'}</span> ${post.liked ? 'Liked' : 'Like'}
                </button>
                <button onclick="openPostDetail(${post.id})">💬 Comment</button>
                <button class="${post.saved ? 'saved' : ''}" onclick="toggleSave(${post.id})">
                    <span>${post.saved ? '🔖' : '📑'}</span> ${post.saved ? 'Saved' : 'Save'}
                </button>
                <button onclick="sharePost(${post.id})">🔗 Share</button>
            </div>
        </div>`;
    }).join('');
}

function renderAnimals() {
    const grid = document.getElementById('animalsGrid');
    if (!grid) return;
    
    if (animals.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No animals added yet. Click "Add Animal" to get started! 🐾</div>';
        return;
    }
    
    grid.innerHTML = animals.map(animal => `
        <div class="animal-card">
            <div class="animal-image-container" onclick="viewAnimal(${animal.id})">
                <img src="${animal.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'}" alt="${escapeHtml(animal.name)}" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'">
                <div class="view-overlay"><span class="view-text">👁️ View Profile</span></div>
            </div>
            <div class="animal-actions" onclick="event.stopPropagation()">
                    <button class="animal-btn view-btn" onclick="viewAnimal(${animal.id})">👁️</button>
                    <button class="animal-btn edit-btn" onclick="editAnimal(${animal.id})">✏️</button>
                    <button class="animal-btn delete-btn" onclick="deleteAnimal(${animal.id})">🗑️</button>
                </div>
            <div class="animal-info">
                <div class="animal-name">${escapeHtml(animal.name)}</div>
                <div class="animal-breed">${escapeHtml(animal.breed)}</div>
                <div class="animal-meta">
                    <span>${animal.gender === 'Male' ? '♂️' : '♀️'} ${escapeHtml(animal.age || 'Unknown')}</span>
                    <span class="animal-badge">${escapeHtml(animal.status || 'Available')}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// POST ACTIONS
// ============================================

async function addPost() {
    const statusInput = document.getElementById('statusInput');
    if (!statusInput) return;
    const text = statusInput.value.trim();
    
    if (text || pendingPostImages.length > 0) {
        showToast('Publishing post...');
        
        try {
            // Recover currentUserId if it got lost
            if (!currentUserId) {
                const u = User.getUser() || await User.getFreshUser();
                if (u && u.id) currentUserId = u.id;
            }
            if (!currentUserId) {
                showToast('Please log in to post', 'error');
                return;
            }

            // Upload all images
            const imageUrls = [];
            for (const item of pendingPostImages) {
                const blob = await (await fetch(item.dataUrl)).blob();
                const ext = item.file?.name?.split('.').pop() || 'jpg';
                const file = new File([blob], `post-image-${Date.now()}.${ext}`, { type: item.file?.type || 'image/jpeg' });
                const url = await StorageAPI.uploadPostImage(file);
                if (url) imageUrls.push(url);
            }
            
            const { data, error } = await window.supabase
                .from('posts')
                .insert({
                    user_id: currentUserId,
                    text: text || '',
                    images: imageUrls,
                    likes: 0,
                    comments: []
                })
                .select();
            
            if (error) throw error;
            
            // Reload from DB to get the real persisted post with proper id
            await loadPosts();
            statusInput.value = '';
            pendingPostImages = [];
            pendingPostImage = null;
            const postImageInput = document.getElementById('postImageInput');
            if (postImageInput) postImageInput.value = '';
            const imagePreview = document.getElementById('postImagePreview');
            if (imagePreview) imagePreview.innerHTML = '';
            showToast('Post published! 📢');
        } catch (err) {
            console.error('addPost error:', err);
            showToast('Failed to create post: ' + err.message, 'error');
        }
    } else {
        showToast('Please write something or attach an image', 'error');
    }
}

// For owner-only edits (text, delete) — enforced by RLS on user_id
async function updatePostInSupabase(postId, updates) {
    const { error } = await window.supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
        .eq('user_id', currentUserId);
    
    if (error) throw error;
}

// For public interactions (likes, comments) — only filters by post id, RLS handles the rest
async function updatePostPublic(postId, updates) {
    const { error } = await window.supabase
        .from('posts')
        .update(updates)
        .eq('id', postId);
    
    if (error) throw error;
}

async function deletePostFromSupabase(postId) {
    const { error } = await window.supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUserId);
    
    if (error) throw error;
}

async function toggleLike(postId) {
    if (!currentUserId) { showToast('Please sign in to like posts', 'error'); return; }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    try {
        if (post.liked) {
            // Unlike: remove from likes table then decrement via RPC (atomic, no race condition)
            await window.supabase
                .from('likes')
                .delete()
                .eq('user_id', currentUserId)
                .eq('post_id', postId);
            await window.supabase.rpc('decrement_post_likes', { post_id: postId });
            post.liked = false;
            post.likes = Math.max(0, (post.likes || 1) - 1);
        } else {
            // Like: insert (UNIQUE constraint blocks duplicates) then increment via RPC
            const { error } = await window.supabase
                .from('likes')
                .insert({ user_id: currentUserId, post_id: postId });
            if (error) {
                if (error.code === '23505') { post.liked = true; renderPosts(); return; }
                throw error;
            }
            await window.supabase.rpc('increment_post_likes', { post_id: postId });
            post.liked = true;
            post.likes = (post.likes || 0) + 1;
        }
        renderPosts();
    } catch (err) {
        console.error('toggleLike error:', err);
        showToast('Failed to update like', 'error');
    }
}

async function toggleSave(postId) {
    const post = posts.find(p => p.id === postId || String(p.id) === String(postId));
    if (!post) return;
    const user = User.getUser();
    if (!user) { showToast('Sign in to save posts', 'error'); return; }

    post.saved = !post.saved;
    renderPosts();
    showToast(post.saved ? 'Post saved! 🔖' : 'Post unsaved 📑');

    try {
        if (post.saved) {
            await window.supabase.from('saved_posts').upsert(
                { user_id: user.id, post_id: postId },
                { onConflict: 'user_id,post_id' }
            );
        } else {
            await window.supabase.from('saved_posts')
                .delete()
                .eq('user_id', user.id)
                .eq('post_id', postId);
        }
        // Clear cache so saved posts panel re-fetches with latest data
        _savedPostsCache = null;
    } catch (err) {
        console.error('toggleSave error:', err);
    }
}

async function addComment(postId, overrideText) {
    const user = User.getUser();
    if (!user || !user.id) { showToast('Please sign in to comment', 'error'); return; }

    const input = document.getElementById(`comment-input-${postId}`);
    const text = overrideText || (input ? input.value.trim() : '');
    
    if (text) {
        const post = posts.find(p => String(p.id) === String(postId));
        if (post) {
            const newComment = {
                id: Date.now(),
                user_id: currentUserId,
                author: profileData.name,
                authorImg: profileData.profileImg,
                text: text,
                time: new Date().toISOString(),
                created_at: new Date().toISOString(),
                likes: 0,
                likedBy: [],
                replies: []
            };
            
            const updatedComments = [...(post.comments || []), newComment];
            
            try {
                await updatePostPublic(postId, { comments: updatedComments });
                post.comments = updatedComments;
                renderPosts();
                showToast('Comment added! 💬');
                if (input) input.value = '';
            } catch (err) {
                console.error('addComment error:', err);
            }
        }
    }
}

function openPostMenu(postId) {
    currentPostId = postId;
    openModal('postMenuModal');
}

function editCurrentPost() {
    const post = posts.find(p => p.id === currentPostId);
    if (post) {
        const editText = document.getElementById('editPostText');
        if (editText) editText.value = post.text;
        closeModal('postMenuModal');
        openModal('editPostModal');
    }
}

async function savePostEdit() {
    const newText = document.getElementById('editPostText');
    if (currentPostId && newText) {
        const post = posts.find(p => p.id === currentPostId);
        if (post) {
            try {
                await updatePostInSupabase(currentPostId, { text: newText.value.trim() || '' });
                post.text = newText.value.trim() || '';
                renderPosts();
                showToast('Post updated! ✏️');
                closeModal('editPostModal');
            } catch (err) {
                console.error('savePostEdit error:', err);
            }
        }
    }
}

async function deleteCurrentPost() {
    if (confirm('Are you sure you want to delete this post?')) {
        try {
            await deletePostFromSupabase(currentPostId);
            posts = posts.filter(p => p.id !== currentPostId);
            renderPosts();
            showToast('Post deleted 🗑️');
            closeModal('postMenuModal');
        } catch (err) {
            console.error('deleteCurrentPost error:', err);
        }
    }
}

function focusComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (input) input.focus();
}

async function sharePost(postId) {
    const postLink = window.location.origin + '/pages/profile.html?post=' + postId;
    const post = posts.find(p => String(p.id) === String(postId));

    // Increment share counter in DB (fire-and-forget)
    if (post) {
        const newShares = (post.shares || 0) + 1;
        post.shares = newShares;
        updatePostPublic(postId, { shares: newShares }).catch(err => console.warn('sharePost counter error:', err));
        const card = document.querySelector(`.post-card[data-post-id="${postId}"] .post-meta span`);
        if (card) card.textContent = `${post.likes} likes • ${(post.comments||[]).length} comments • ${newShares} share${newShares !== 1 ? 's' : ''}`;
    }

    // Clipboard helper — works without HTTPS focus
    function _copyLink(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => _fallbackCopy(text));
        }
        return Promise.resolve(_fallbackCopy(text));
    }
    function _fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch(_) {}
    }

    // Determine whose profile to open
    const ownerId = post?.user_id || currentUserId;

    // If it's the current user's own post, scroll to it in the feed
    if (String(ownerId) === String(currentUserId)) {
        const postEl = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (postEl) {
            postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postEl.style.transition = 'outline 0.2s, box-shadow 0.2s';
            postEl.style.outline = '2.5px solid var(--green-primary)';
            postEl.style.boxShadow = '0 0 0 4px rgba(76,175,80,0.18)';
            setTimeout(() => { postEl.style.outline = ''; postEl.style.boxShadow = ''; }, 1800);
        }
        _copyLink(postLink);
        showToast('Scrolled to post \u2022 Link copied \uD83D\uDD17');
        return;
    }

    // Open the breeder profile panel and scroll to the post
    if (typeof openBreederProfile === 'function') {
        try {
            await openBreederProfile(ownerId);
            // Switch to posts tab if needed, then scroll to the specific post
            setTimeout(() => {
                const postsTabBtn = document.querySelector('button[data-tab="posts"]');
                if (postsTabBtn) postsTabBtn.click();

                // After tab renders, scroll the panel's scroll container to the post
                setTimeout(() => {
                    const postEl = document.querySelector(`[data-post="${postId}"]`);
                    if (postEl) {
                        const body = document.getElementById('ownerProfileBody');
                        const scrollContainer = body ? body.parentElement : null;
                        if (scrollContainer) {
                            const containerTop = scrollContainer.getBoundingClientRect().top;
                            const postTop = postEl.getBoundingClientRect().top;
                            const offset = postTop - containerTop + scrollContainer.scrollTop - 60;
                            scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
                        } else {
                            postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        postEl.style.transition = 'outline 0.2s, box-shadow 0.2s';
                        postEl.style.outline = '2.5px solid var(--green-primary)';
                        postEl.style.boxShadow = '0 0 0 4px rgba(76,175,80,0.18)';
                        setTimeout(() => { postEl.style.outline = ''; postEl.style.boxShadow = ''; }, 1800);
                    }
                }, 350);
            }, 450);
        } catch(e) {
            console.warn('sharePost: openBreederProfile failed', e);
        }
    }

    _copyLink(postLink);
    showToast('Opening post \u2022 Link copied \uD83D\uDD17');
}

function editComment(postId, commentId, currentText) {
    currentComment = { postId, commentId };
    const editText = document.getElementById('editCommentText');
    if (editText) editText.value = currentText;
    openModal('commentEditModal');
}

async function saveCommentEdit() {
    if (!currentComment) return;
    const newText = document.getElementById('editCommentText');
    if (newText && newText.value.trim()) {
        const post = posts.find(p => p.id === currentComment.postId);
        if (post) {
            const updatedComments = (post.comments || []).map(c => {
                if (c.id === currentComment.commentId) {
                    const editHistory = c.editHistory || [];
                    editHistory.push({ text: c.text, editedAt: new Date().toISOString() });
                    return { ...c, text: newText.value.trim(), edited: true, editedAt: new Date().toISOString(), editHistory };
                }
                return c;
            });
            
            try {
                await updatePostPublic(currentComment.postId, { comments: updatedComments });
                post.comments = updatedComments;
                renderPosts();
                showToast('Comment updated ✏️');
                // Re-render post detail side if open
                const sideEl = document.getElementById('postDetailSide');
                if (sideEl && sideEl.innerHTML) _renderPostDetailSide(sideEl, post);
            } catch (err) {
                console.error('saveCommentEdit error:', err);
            }
        }
    }
    closeModal('commentEditModal');
    currentComment = null;
}

async function showCommentEditHistory(postId, commentId) {
    let post = posts.find(p => String(p.id) === String(postId));
    let c;
    if (post) {
        c = (post.comments || []).find(cm => String(cm.id) === String(commentId));
    }
    // If not found locally (e.g. bppd context), fetch from Supabase
    if (!c) {
        try {
            const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
            c = (data?.comments || []).find(cm => String(cm.id) === String(commentId));
        } catch(e) {}
    }
    if (!c || !c.editHistory || !c.editHistory.length) { showToast('No edit history found'); return; }
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px;max-width:420px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #f3f4f6;flex-shrink:0;">
                <h3 style="margin:0;font-size:16px;font-weight:800;color:#111827;">📝 Edit History</h3>
                <button onclick="this.closest('[style*=fixed]').remove()" style="background:#f3f4f6;border:none;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;color:#6b7280;display:flex;align-items:center;justify-content:center;">×</button>
            </div>
            <div style="overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:10px;">
                ${c.editHistory.map((h, i) => `
                    <div style="background:#f9fafb;border-radius:12px;padding:10px 14px;border:1px solid #f3f4f6;">
                        <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;font-weight:600;">Version ${i + 1} · ${formatDate(h.editedAt)}</div>
                        <div style="font-size:13px;color:#374151;">${escapeHtml(h.text)}</div>
                    </div>`).join('')}
                <div style="background:#e9f5ee;border-radius:12px;padding:10px 14px;border:1px solid #bbf7d0;">
                    <div style="font-size:10px;color:#059669;margin-bottom:4px;font-weight:600;">Current · ${formatDate(c.editedAt || c.created_at)}</div>
                    <div style="font-size:13px;color:#374151;">${escapeHtml(c.text)}</div>
                </div>
            </div>
        </div>`;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

async function deleteComment(postId, commentId) {
    if (confirm('Delete this comment?')) {
        const post = posts.find(p => p.id === postId);
        if (post) {
            const updatedComments = (post.comments || []).filter(c => c.id !== commentId);
            try {
                await updatePostPublic(postId, { comments: updatedComments });
                post.comments = updatedComments;
                renderPosts();
                showToast('Comment deleted 🗑️');
            } catch (err) {
                console.error('deleteComment error:', err);
            }
        }
    }
}

// ============================================
// ANIMAL ACTIONS
// ============================================

async function saveAnimal() {
    const name = document.getElementById('animalName')?.value.trim();
    const breed = document.getElementById('animalBreed')?.value.trim();
    const gender = document.getElementById('animalGender')?.value;
    const age = document.getElementById('animalAge')?.value.trim();
    const status = document.getElementById('animalStatus')?.value;
    const isVaccinated = document.getElementById('animalVaccinated')?.checked || false;
    const isDewormed = document.getElementById('animalDewormed')?.checked || false;
    const description = document.getElementById('animalDescription')?.value.trim();
    const animalImageInput = document.getElementById('animalInput');
    const animalDocsInput = document.getElementById('animalDocuments');
    
    if (!name || !breed) {
        showToast('Please fill in Name and Breed!', 'error');
        return;
    }
    
    showToast('Uploading animal information...');
    
    try {
        let imageUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400';
        
        if (animalImageInput && animalImageInput.files && animalImageInput.files[0]) {
            imageUrl = await StorageAPI.uploadAnimalImage(animalImageInput.files[0]);
        }
        
        const uploadedDocuments = [];
        if (animalDocsInput && animalDocsInput.files) {
            for (const doc of animalDocsInput.files) {
                const docData = await StorageAPI.uploadAnimalDocument(doc);
                uploadedDocuments.push(docData);
            }
        }
        
        const animalCategory = document.getElementById('animalCategory')?.value || '';
        const animalTypeSelect = document.getElementById('animalTypeSelect')?.value || '';
        const animalTypeOther = document.getElementById('animalTypeOther')?.value.trim() || '';
        const animalType = animalTypeSelect === 'Other' ? (animalTypeOther || 'Other') : animalTypeSelect;

        // Build base payload (always safe columns)
        const animalPayload = {
            user_id: currentUserId,
            name: name,
            breed: breed,
            gender: gender || 'Unknown',
            age: age || 'Unknown',
            status: status || 'Not Available',
            image_url: imageUrl,
            description: description || '',
            health_documents: uploadedDocuments,
            is_vaccinated: isVaccinated,
            is_dewormed: isDewormed
        };

        // Try insert with category/type first; fall back without them if columns missing
        let data, error;
        const withExtra = { ...animalPayload, category: animalCategory || null, type: animalType || null };
        ({ data, error } = await window.supabase.from('animals').insert(withExtra).select());
        if (error && (error.message?.includes('category') || error.message?.includes('type') || error.code === '42703')) {
            // Columns don't exist yet — insert without them
            ({ data, error } = await window.supabase.from('animals').insert(animalPayload).select());
        }
        
        if (error) throw error;
        
        // Reload animals from DB to get the real id
        await loadAnimals();
        
        document.getElementById('animalName').value = '';
        document.getElementById('animalBreed').value = '';
        document.getElementById('animalGender').value = '';
        document.getElementById('animalAge').value = '';
        document.getElementById('animalStatus').value = '';
        document.getElementById('animalDescription').value = '';
        const vacEl = document.getElementById('animalVaccinated');
        if (vacEl) vacEl.checked = false;
        const dewEl = document.getElementById('animalDewormed');
        if (dewEl) dewEl.checked = false;
        const catEl = document.getElementById('animalCategory');
        if (catEl) catEl.value = '';
        const typeEl = document.getElementById('animalTypeSelect');
        if (typeEl) typeEl.value = '';
        const typeOtherEl = document.getElementById('animalTypeOther');
        if (typeOtherEl) typeOtherEl.value = '';
        const otherWrap = document.getElementById('animalTypeOtherWrapper');
        if (otherWrap) otherWrap.style.display = 'none';
        
        const preview = document.getElementById('animalPreview');
        if (preview) {
            preview.style.backgroundImage = '';
            preview.classList.remove('has-image');
            preview.innerHTML = '<span>📤 Click to upload animal photo</span>';
        }
        
        const docPreview = document.getElementById('animalDocumentsPreview');
        if (docPreview) docPreview.innerHTML = '';
        
        if (animalImageInput) animalImageInput.value = '';
        if (animalDocsInput) animalDocsInput.value = '';
        
        pendingAnimalImages = [];
        pendingAnimalDocuments = [];
        
        showToast('Animal added successfully! 🐾');
        closeModal('animalModal');
    } catch (err) {
        console.error('saveAnimal error:', err);
        showToast('Failed to add animal: ' + err.message, 'error');
    }
}

async function deleteAnimal(id) {
    if (confirm('Are you sure you want to remove this animal?')) {
        try {
            const { error } = await window.supabase
                .from('animals')
                .delete()
                .eq('id', id)
                .eq('user_id', currentUserId);
            
            if (error) throw error;
            
            animals = animals.filter(a => a.id !== id);
            renderAnimals();
            showToast('Animal removed 🗑️');
        } catch (err) {
            console.error('deleteAnimal error:', err);
            showToast('Failed to delete animal', 'error');
        }
    }
}

function viewAnimal(animalId) {
    const animal = animals.find(a => a.id === animalId);
    if (!animal) return;
    
    const content = document.getElementById('viewAnimalContent');
    content.innerHTML = `
        <div class="view-animal-content">
            <div class="view-animal-image-wrap">
                <img src="${animal.image_url}" alt="${escapeHtml(animal.name)}" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'">
            </div>
            <div class="view-animal-name">${escapeHtml(animal.name)} ${animal.gender === 'Male' ? '♂️' : '♀️'}</div>
            <div class="view-animal-breed">${escapeHtml(animal.breed)}</div>
            <div class="view-animal-details">
                ${animal.category ? `<div class="view-detail-item"><div class="view-detail-label">Category</div><div class="view-detail-value">${escapeHtml(animal.category)}</div></div>` : ''}
                ${animal.type ? `<div class="view-detail-item"><div class="view-detail-label">Type</div><div class="view-detail-value">${escapeHtml(animal.type)}</div></div>` : ''}
                <div class="view-detail-item"><div class="view-detail-label">Breed</div><div class="view-detail-value">${escapeHtml(animal.breed || 'N/A')}</div></div>
                <div class="view-detail-item"><div class="view-detail-label">Age</div><div class="view-detail-value">${escapeHtml(animal.age || 'N/A')}</div></div>
                <div class="view-detail-item"><div class="view-detail-label">Status</div><div class="view-detail-value">${escapeHtml(animal.status || 'N/A')}</div></div>
                <div class="view-detail-item"><div class="view-detail-label">Gender</div><div class="view-detail-value">${animal.gender === 'Male' ? '♂️ Male' : '♀️ Female'}</div></div>
                ${animal.color ? `<div class="view-detail-item"><div class="view-detail-label">Color</div><div class="view-detail-value">${escapeHtml(animal.color)}</div></div>` : ''}
                ${animal.weight ? `<div class="view-detail-item"><div class="view-detail-label">Weight</div><div class="view-detail-value">${escapeHtml(animal.weight)} kg</div></div>` : ''}
                ${animal.birth_date ? `<div class="view-detail-item"><div class="view-detail-label">Birth Date</div><div class="view-detail-value">${escapeHtml(String(animal.birth_date))}</div></div>` : ''}
                ${animal.price ? `<div class="view-detail-item"><div class="view-detail-label">Price</div><div class="view-detail-value">₱ ${Number(animal.price).toLocaleString()}</div></div>` : ''}
                <div class="view-detail-item"><div class="view-detail-label">Vaccinated</div><div class="view-detail-value">${animal.is_vaccinated ? '✅ Yes' : '❌ No'}</div></div>
                <div class="view-detail-item"><div class="view-detail-label">Dewormed</div><div class="view-detail-value">${animal.is_dewormed ? '✅ Yes' : '❌ No'}</div></div>
                ${animal.last_vet_check ? `<div class="view-detail-item"><div class="view-detail-label">Last Vet Check</div><div class="view-detail-value">${escapeHtml(String(animal.last_vet_check))}</div></div>` : ''}
                ${animal.parent_sire ? `<div class="view-detail-item"><div class="view-detail-label">Sire (Father)</div><div class="view-detail-value">${escapeHtml(animal.parent_sire)}</div></div>` : ''}
                ${animal.parent_dam ? `<div class="view-detail-item"><div class="view-detail-label">Dam (Mother)</div><div class="view-detail-value">${escapeHtml(animal.parent_dam)}</div></div>` : ''}
                ${animal.litter_registration ? `<div class="view-detail-item"><div class="view-detail-label">Litter Registration</div><div class="view-detail-value">${escapeHtml(animal.litter_registration)}</div></div>` : ''}
                ${animal.location ? `<div class="view-detail-item"><div class="view-detail-label">Location</div><div class="view-detail-value">${escapeHtml(animal.location)}</div></div>` : ''}
            </div>
            ${animal.health_documents && animal.health_documents.length > 0 ? `
                <div class="detail-section">
                    <h4>📋 Health Documents</h4>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                        ${animal.health_documents.map(doc => `
                            <a href="${doc.url || doc}" target="_blank" rel="noopener"
                               style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--green-light);color:var(--green-primary);border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid var(--green-primary);transition:all 0.2s;"
                               onmouseover="this.style.background='var(--green-primary)';this.style.color='white';"
                               onmouseout="this.style.background='var(--green-light)';this.style.color='var(--green-primary)';">
                                ${(doc.type && doc.type.includes('image')) ? '🖼️' : '📄'} ${escapeHtml(doc.name || 'Document')}
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${animal.description ? `
                <div class="detail-section">
                    <h4>📝 Description</h4>
                    <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHtml(animal.description)}</p>
                </div>
            ` : ''}
            <div class="view-modal-actions">
                <button class="btn-close-view" onclick="closeModal('viewAnimalModal')">Close</button>
                ${isEditMode ? `<button class="btn-edit" onclick="closeModal('viewAnimalModal'); editAnimal(${animal.id})">✏️ Edit Animal</button>` : `<button class="btn-edit" onclick="closeModal('viewAnimalModal'); editAnimal(${animal.id})">✏️ Edit Animal</button>`}
            </div>
        </div>
    `;
    openModal('viewAnimalModal');
}

function messageAboutAnimal(animalId) {
    // This function is for own profile page animals — no messaging yourself.
    // For messaging another breeder, use messageBreederFromProfile() from openBreederProfile modal.
    showToast('This is your own animal. Use Messages to contact other breeders.', 'info');
}

/**
 * Opens the unified messages modal and navigates directly to the conversation
 * with the specified breeder. Called from openBreederProfile() Message button.
 */
function messageBreederFromProfile(userId, userName, userAvatar) {
    if (!userId) return;
    const chatData = { id: String(userId), name: userName || 'Breeder', avatar: userAvatar || '' };

    // Pass chatData directly to the opener so the correct conversation always
    // opens — whether the modal is already visible or being opened fresh.
    function tryOpen() {
        const opener = window.openMessengerGlobal || window.openMessagesModal;
        if (typeof opener === 'function') { opener(chatData); return true; }
        return false;
    }
    if (!tryOpen()) {
        let attempts = 0;
        const interval = setInterval(function () {
            attempts++;
            if (tryOpen() || attempts >= 30) clearInterval(interval);
        }, 100);
    }
}

function editAnimal(animalId) {
    currentAnimalId = animalId;
    const animal = animals.find(a => a.id === animalId);
    if (!animal) return;
    
    const content = document.getElementById('animalDetailContent');
    const title = document.getElementById('animalDetailTitle');
    title.innerText = `✏️ Edit ${animal.name}`;
    
    content.innerHTML = `
        <div class="animal-detail-grid">
            <div class="animal-detail-item"><label>Name *</label><input type="text" id="edit_name" value="${escapeHtml(animal.name)}"></div>
            <div class="animal-detail-item"><label>Breed *</label><input type="text" id="edit_breed" value="${escapeHtml(animal.breed)}"></div>
            <div class="animal-detail-item"><label>Category</label>
                <select id="edit_category" onchange="updateEditAnimalTypeOptions()" style="width:100%;padding:10px 12px;border:1.5px solid var(--border-light);border-radius:10px;font-size:14px;outline:none;background:white;color:var(--text-primary);">
                    <option value="">Select Category</option>
                    <option value="Pet" ${animal.category === 'Pet' ? 'selected' : ''}>🐕 Pet</option>
                    <option value="Livestock" ${animal.category === 'Livestock' ? 'selected' : ''}>🐄 Livestock</option>
                </select>
            </div>
            <div class="animal-detail-item"><label>Type</label>
                <select id="edit_type" style="width:100%;padding:10px 12px;border:1.5px solid var(--border-light);border-radius:10px;font-size:14px;outline:none;background:white;color:var(--text-primary);">
                    <option value="">Select Type</option>
                    <optgroup label="🐕 Pets" id="editPetTypeGroup">
                        <option value="Dog" ${animal.type === 'Dog' ? 'selected' : ''}>🐕 Dog</option>
                        <option value="Cat" ${animal.type === 'Cat' ? 'selected' : ''}>🐈 Cat</option>
                        <option value="Bird" ${animal.type === 'Bird' ? 'selected' : ''}>🐦 Bird</option>
                        <option value="Rabbit" ${animal.type === 'Rabbit' ? 'selected' : ''}>🐇 Rabbit</option>
                        <option value="Mouse" ${animal.type === 'Mouse' ? 'selected' : ''}>🐭 Mouse</option>
                        <option value="Hamster" ${animal.type === 'Hamster' ? 'selected' : ''}>🐹 Hamster</option>
                        <option value="Fish" ${animal.type === 'Fish' ? 'selected' : ''}>🐠 Fish</option>
                        <option value="Turtle" ${animal.type === 'Turtle' ? 'selected' : ''}>🐢 Turtle</option>
                    </optgroup>
                    <optgroup label="🐄 Livestock" id="editLivestockTypeGroup">
                        <option value="Pig" ${animal.type === 'Pig' ? 'selected' : ''}>🐖 Pig</option>
                        <option value="Cow" ${animal.type === 'Cow' ? 'selected' : ''}>🐄 Cow</option>
                        <option value="Goat" ${animal.type === 'Goat' ? 'selected' : ''}>🐐 Goat</option>
                        <option value="Horse" ${animal.type === 'Horse' ? 'selected' : ''}>🐎 Horse</option>
                        <option value="Chicken" ${animal.type === 'Chicken' ? 'selected' : ''}>🐓 Chicken</option>
                        <option value="Duck" ${animal.type === 'Duck' ? 'selected' : ''}>🦆 Duck</option>
                        <option value="Sheep" ${animal.type === 'Sheep' ? 'selected' : ''}>🐑 Sheep</option>
                        <option value="Carabao" ${animal.type === 'Carabao' ? 'selected' : ''}>🐃 Carabao</option>
                    </optgroup>
                    <option value="Other" ${animal.type === 'Other' ? 'selected' : ''}>🐾 Other</option>
                </select>
            </div>
            <div class="animal-detail-item"><label>Gender</label>
                <select id="edit_gender">
                    <option value="Male" ${animal.gender === 'Male' ? 'selected' : ''}>♂️ Male</option>
                    <option value="Female" ${animal.gender === 'Female' ? 'selected' : ''}>♀️ Female</option>
                </select>
            </div>
            <div class="animal-detail-item"><label>Age</label><input type="text" id="edit_age" value="${escapeHtml(animal.age)}"></div>
            <div class="animal-detail-item"><label>Status</label>
                <select id="edit_status" style="width:100%;padding:10px 12px;border:1.5px solid var(--border-light);border-radius:10px;font-size:14px;outline:none;background:white;color:var(--text-primary);">
                    <option value="Available for Stud" ${animal.status === 'Available for Stud' ? 'selected' : ''}>🐾 Available for Stud</option>
                    <option value="Available for Breeding" ${animal.status === 'Available for Breeding' ? 'selected' : ''}>💕 Available for Breeding</option>
                    <option value="Puppies/Kittens Available" ${animal.status === 'Puppies/Kittens Available' ? 'selected' : ''}>🍼 Puppies/Kittens Available</option>
                    <option value="Offspring Available" ${animal.status === 'Offspring Available' ? 'selected' : ''}>🐣 Offspring Available</option>
                    <option value="Not Available" ${animal.status === 'Not Available' ? 'selected' : ''}>🚫 Not Available</option>
                    <option value="Retired" ${animal.status === 'Retired' ? 'selected' : ''}>🏠 Retired</option>
                </select>
            </div>
            <div class="animal-detail-item" style="grid-column:1/-1;">
                <label>Health Status</label>
                <div style="display:flex;gap:20px;padding:10px 14px;background:#f9fafb;border-radius:10px;border:1.5px solid var(--border-light);">
                    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;font-weight:500;">
                        <input type="checkbox" id="edit_vaccinated" ${animal.is_vaccinated ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--green-primary);">
                        💉 Vaccinated
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;font-weight:500;">
                        <input type="checkbox" id="edit_dewormed" ${animal.is_dewormed ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--green-primary);">
                        💊 Dewormed
                    </label>
                </div>
            </div>
            <div class="animal-detail-item" style="grid-column:1/-1;"><label>Description</label><textarea id="edit_description" rows="3">${escapeHtml(animal.description || '')}</textarea></div>
        </div>
        <div class="image-upload-group">
            <label style="font-weight:600;font-size:13px;display:block;margin-bottom:8px;">Animal Photo</label>
            <div id="edit_animalDropZone" class="upload-drop-zone animal-upload-zone" onclick="document.getElementById('edit_imageInput').click()" style="margin-bottom:8px;">
                <div id="edit_animalPreviewWrap" class="animal-preview-wrap" style="background-image:url('${escapeHtml(animal.image_url)}');background-size:cover;background-position:center;">
                    <div class="upload-placeholder" style="background:rgba(0,0,0,0.45);border-radius:12px;padding:8px 14px;">
                        <div style="font-size:22px;">📷</div>
                        <div style="font-size:11px;color:#fff;font-weight:600;">Click to change photo</div>
                    </div>
                </div>
            </div>
            <input type="file" id="edit_imageInput" accept="image/*" style="display:none;" onchange="openCropModal(this,'animalEdit','4:3')">
            <div id="animalEditCropInfo" class="upload-crop-info" style="display:none;">✂️ Cropped to 4:3</div>
        </div>
        <div style="margin-top:14px;">
            <label style="font-weight:600;font-size:13px;display:block;margin-bottom:8px;">📋 Health Documents</label>
            ${(animal.health_documents && animal.health_documents.length > 0) ? `
            <div id="edit_existingDocs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                ${animal.health_documents.map((doc, idx) => `
                    <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--green-light);color:var(--green-primary);border-radius:50px;font-size:12px;font-weight:600;border:1px solid var(--green-primary);">
                        ${(doc.type && doc.type.includes('image')) ? '🖼️' : '📄'} ${escapeHtml(doc.name || 'Document')}
                        <button onclick="removeAnimalDoc(${animalId}, ${idx})" style="background:none;border:none;color:#d64242;cursor:pointer;font-size:14px;padding:0;line-height:1;" title="Remove">×</button>
                    </div>
                `).join('')}
            </div>` : '<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">No documents yet.</p>'}
            <div onclick="document.getElementById('edit_docsInput').click()" style="border:2px dashed var(--border-light);border-radius:10px;padding:14px;text-align:center;cursor:pointer;color:var(--text-muted);font-size:13px;">
                📄 Click to add more documents (PDF, Images)
            </div>
            <input type="file" id="edit_docsInput" accept="image/*,application/pdf" multiple style="display:none;" onchange="previewEditDocs(this)">
            <div id="edit_newDocsPreview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>
        </div>
    `;
    openModal('animalDetailModal');
}

async function saveAnimalDetails() {
    const animal = animals.find(a => a.id === currentAnimalId);
    if (!animal) return;
    
    const name = document.getElementById('edit_name')?.value.trim();
    const breed = document.getElementById('edit_breed')?.value.trim();
    
    if (!name || !breed) {
        showToast('Name and breed are required!', 'error');
        return;
    }
    
    animal.name = name;
    animal.breed = breed;
    animal.gender = document.getElementById('edit_gender')?.value || animal.gender;
    animal.age = document.getElementById('edit_age')?.value.trim() || animal.age;
    animal.status = document.getElementById('edit_status')?.value || animal.status;
    animal.description = document.getElementById('edit_description')?.value.trim() || '';
    animal.category = document.getElementById('edit_category')?.value || animal.category || '';
    animal.type = document.getElementById('edit_type')?.value || animal.type || '';
    animal.is_vaccinated = document.getElementById('edit_vaccinated')?.checked || false;
    animal.is_dewormed = document.getElementById('edit_dewormed')?.checked || false;
    
    const imgInput = document.getElementById('edit_imageInput');
    const croppedEditFile = window._croppedFiles && window._croppedFiles['animalEdit'];
    if (croppedEditFile) {
        const imageUrl = await StorageAPI.uploadAnimalImage(croppedEditFile);
        animal.image_url = imageUrl;
        delete window._croppedFiles['animalEdit'];
        delete window._croppedPreviews['animalEdit'];
    } else if (imgInput && imgInput.files && imgInput.files[0]) {
        const imageUrl = await StorageAPI.uploadAnimalImage(imgInput.files[0]);
        animal.image_url = imageUrl;
    }

    // Handle new document uploads
    const docsInput = document.getElementById('edit_docsInput');
    if (docsInput && docsInput.files && docsInput.files.length > 0) {
        const existingDocs = animal.health_documents || [];
        for (const doc of docsInput.files) {
            const docData = await StorageAPI.uploadAnimalDocument(doc);
            existingDocs.push(docData);
        }
        animal.health_documents = existingDocs;
    }
    
    try {
        await window.supabase
            .from('animals')
            .update({
                name: animal.name,
                breed: animal.breed,
                gender: animal.gender,
                age: animal.age,
                status: animal.status,
                description: animal.description,
                image_url: animal.image_url,
                category: animal.category || null,
                type: animal.type || null,
                is_vaccinated: animal.is_vaccinated,
                is_dewormed: animal.is_dewormed,
                health_documents: animal.health_documents || []
            })
            .eq('id', currentAnimalId)
            .eq('user_id', currentUserId);
        
        renderAnimals();
        showToast('Animal updated successfully! 🐾');
        closeModal('animalDetailModal');
    } catch (err) {
        console.error('saveAnimalDetails error:', err);
        showToast('Failed to update animal', 'error');
    }
}

// ============================================
// PROFILE EDIT FUNCTIONS
// ============================================

function enableEditMode() {
    isEditMode = true;
    updateProfileUI();
    renderPosts();
    renderAnimals();
    showToast('Edit mode enabled! You can now edit your profile ✏️');
}

function openCoverModal() {
    if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
    // Directly trigger file picker; the cover modal will open after crop is applied
    const coverInput = document.getElementById('coverInput');
    if (coverInput) {
        coverInput.value = ''; // reset so same file can be re-selected
        coverInput.click();
    }
}

function openProfileModal() {
    if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
    // Directly trigger file picker; the profile modal will open after crop is applied
    const profileInput = document.getElementById('profileInput');
    if (profileInput) {
        profileInput.value = ''; // reset so same file can be re-selected
        profileInput.click();
    }
}

function editName() {
    if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
    const nameInput = document.getElementById('nameInput');
    if (nameInput) nameInput.value = profileData.name;
    openModal('nameModal');
}

function editBio() {
    if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
    const bioInput = document.getElementById('bioInput');
    if (bioInput) bioInput.value = profileData.bio;
    openModal('bioModal');
}

function addNewTag() {
    if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
    openModal('tagModal');
}

function openAddAnimalModal() {
    openModal('animalModal');
}

function openContactModal() {
    if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
    openModal('contactModal');
}

async function saveCover() {
    // Prefer the cropped file if available, otherwise fall back to raw input
    const file = (window._croppedFiles && window._croppedFiles['cover'])
        || (document.getElementById('coverInput')?.files?.[0]);
    if (file) {
        showToast('Uploading cover photo...');
        try {
            const imageUrl = await StorageAPI.uploadCoverPhoto(file);
            await User.updateUser({ coverPhoto: imageUrl });
            profileData.coverImg = imageUrl;
            updateProfileUI();
            showToast('Cover photo updated!');
            // Clean up cropped data
            if (window._croppedFiles) delete window._croppedFiles['cover'];
            if (window._croppedPreviews) delete window._croppedPreviews['cover'];
            closeModal('coverModal');
        } catch (err) {
            console.error('saveCover error:', err);
            showToast('Failed to update cover: ' + err.message, 'error');
        }
    } else {
        showToast('Please select an image first', 'error');
    }
}
async function saveProfile() {
    // Prefer the cropped file if available, otherwise fall back to raw input
    const file = (window._croppedFiles && window._croppedFiles['profile'])
        || (document.getElementById('profileInput')?.files?.[0]);
    if (file) {
        showToast('Uploading profile photo...');
        try {
            const imageUrl = await StorageAPI.uploadProfilePicture(file);
            await User.updateUser({ profilePicture: imageUrl });
            profileData.profileImg = imageUrl;
            posts.forEach(post => {
                if (post.author === profileData.name) post.authorImg = imageUrl;
            });
            updateProfileUI();
            renderPosts();
            showToast('Profile photo updated!');
            // Clean up cropped data
            if (window._croppedFiles) delete window._croppedFiles['profile'];
            if (window._croppedPreviews) delete window._croppedPreviews['profile'];
            closeModal('profileModal');
        } catch (err) {
            console.error('saveProfile error:', err);
            showToast('Failed to update profile photo: ' + err.message, 'error');
        }
    } else {
        showToast('Please select an image first', 'error');
    }
}
async function saveName() {
    const input = document.getElementById('nameInput');
    if (input && input.value.trim()) {
        try {
            await User.updateUser({ name: input.value.trim() });
            profileData.name = input.value.trim();
            updateProfileUI();
            showToast('Name updated! ✏️');
            closeModal('nameModal');
        } catch (err) {
            showToast('Failed to update name: ' + err.message, 'error');
        }
    }
}

async function saveBio() {
    const input = document.getElementById('bioInput');
    if (input && input.value.trim()) {
        try {
            await User.updateUser({ bio: input.value.trim() });
            profileData.bio = input.value.trim();
            updateProfileUI();
            showToast('Bio updated! 📝');
            closeModal('bioModal');
        } catch (err) {
            showToast('Failed to update bio: ' + err.message, 'error');
        }
    }
}

async function saveTag() {
    const input = document.getElementById('tagInput');
    if (input && input.value.trim()) {
        const newTags = [...(profileData.tags || []), input.value.trim()];
        try {
            await User.updateUser({ tags: newTags });
            profileData.tags = newTags;
            updateProfileUI();
            input.value = '';
            showToast('Tag added! 🏷️');
            closeModal('tagModal');
        } catch (err) {
            showToast('Failed to add tag: ' + err.message, 'error');
        }
    }
}

async function removeTag(element) {
    if (element && element.parentElement) {
        const tagText = element.parentElement.textContent.replace('×', '').trim();
        const newTags = (profileData.tags || []).filter(t => t !== tagText);
        try {
            await User.updateUser({ tags: newTags });
            profileData.tags = newTags;
            element.parentElement.remove();
            showToast('Tag removed 🗑️');
        } catch (err) {
            showToast('Failed to remove tag: ' + err.message, 'error');
        }
    }
}

async function saveContact() {
    const email = document.getElementById('contactEmailInput')?.value.trim();
    const phone = document.getElementById('contactPhoneInput')?.value.trim();
    const location = document.getElementById('contactLocationInput')?.value.trim();

    if (!email || !phone || !location) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const newContact = { email, phone, location };
    try {
        // Save contact JSON and also sync the top-level location column so
        // animal cards on the swipe/discovery page show the correct location
        await User.updateUser({ contact: newContact, location: location });
        profileData.contact = newContact;
        updateContactDOM();
        showToast('Contact info updated! ✉️');
        closeModal('contactModal');
    } catch (err) {
        showToast('Failed to update contact: ' + err.message, 'error');
    }
}

// ── Follow counts (live from DB) ─────────────────────────────────────────
let _followCache = { followers: [], following: [] };

async function loadFollowCounts() {
    if (!currentUserId) return;
    try {
        const [followersRes, followingRes] = await Promise.all([
            window.supabase.from('follows').select('follower_id').eq('following_id', currentUserId).eq('status', 'accepted'),
            window.supabase.from('follows').select('following_id').eq('follower_id', currentUserId).eq('status', 'accepted')
        ]);
        const fCount = (followersRes.data || []).length;
        const fgCount = (followingRes.data || []).length;
        profileData.stats = profileData.stats || {};
        profileData.stats.followers = fCount;
        profileData.stats.following = fgCount;
        const el1 = document.getElementById('followersCount');
        const el2 = document.getElementById('followingCount');
        if (el1) el1.textContent = fCount;
        if (el2) el2.textContent = fgCount;
    } catch (err) {
        console.warn('loadFollowCounts error:', err);
    }
}

let _activeFollowTab = 'followers';

async function openFollowPanel(tab = 'followers') {
    _activeFollowTab = tab;
    const overlay = document.getElementById('followPanelOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    switchFollowTab(tab);
}

function closeFollowPanel() {
    const overlay = document.getElementById('followPanelOverlay');
    if (overlay) { overlay.style.display = 'none'; document.body.style.overflow = ''; }
}

async function switchFollowTab(tab) {
    _activeFollowTab = tab;
    // Update tab button styles
    const tF  = document.getElementById('followTabFollowers');
    const tFg = document.getElementById('followTabFollowing');
    if (tF && tFg) {
        const active   = 'padding:8px 18px;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:var(--green-primary);box-shadow:0 1px 4px rgba(0,0,0,0.1);transition:all .2s;';
        const inactive = 'padding:8px 18px;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s;';
        tF.style.cssText  = tab === 'followers' ? active : inactive;
        tFg.style.cssText = tab === 'following' ? active : inactive;
    }
    const list  = document.getElementById('followPanelList');
    const count = document.getElementById('followPanelCount');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;"><div style="font-size:28px;margin-bottom:8px;">👥</div><p>Loading…</p></div>';
    try {
        let userIds = [];
        if (tab === 'followers') {
            const { data } = await window.supabase.from('follows').select('follower_id').eq('following_id', currentUserId).eq('status', 'accepted');
            userIds = (data || []).map(r => r.follower_id);
        } else {
            const { data } = await window.supabase.from('follows').select('following_id').eq('follower_id', currentUserId).eq('status', 'accepted');
            userIds = (data || []).map(r => r.following_id);
        }
        if (count) count.textContent = `${userIds.length} ${tab === 'followers' ? 'follower' : 'account'}${userIds.length !== 1 ? 's' : ''}`;
        if (!userIds.length) {
            list.innerHTML = `<div style="text-align:center;padding:40px 0;color:#9ca3af;"><div style="font-size:28px;margin-bottom:10px;">👥</div><p style="font-size:14px;">${tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</p></div>`;
            return;
        }
        // Fetch profiles
        const { data: profiles } = await window.supabase.from('profiles').select('id,name,profile_picture,account_type,location').in('id', userIds);
        const profileMap = {};
        (profiles || []).forEach(p => profileMap[p.id] = p);

        const cards = userIds.map(uid => {
            const p = profileMap[uid] || {};
            const name     = escapeHtml(p.name || 'Unknown User');
            const type     = p.account_type || 'breeder';
            const loc      = p.location ? (type ? ' · ' : '') + '📍 ' + escapeHtml(p.location) : '';
            const initials = (p.name || '?')[0].toUpperCase();
            const avatarHTML = p.profile_picture
                ? `<img src="${escapeHtml(p.profile_picture)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.innerHTML='<span style=\\'font-size:18px;font-weight:700;color:#6b7280;display:flex;align-items:center;justify-content:center;height:100%;\\'>'+${JSON.stringify(initials)}+'</span>'">`
                : `<span style="font-size:18px;font-weight:700;color:#6b7280;display:flex;align-items:center;justify-content:center;height:100%;">${initials}</span>`;
            return `<div data-follow-uid="${escapeHtml(uid)}"
                 style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;cursor:pointer;transition:background .15s;"
                 onmouseover="this.style.background='#f0fdf4';this.style.borderColor='#bbf7d0';"
                 onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';">
              <div style="width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#e5e7eb;">
                ${avatarHTML}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:1px;">${type ? escapeHtml(type) : ''}${loc}</div>
              </div>
              <span style="font-size:12px;color:#2E6B4E;font-weight:600;flex-shrink:0;">View →</span>
            </div>`;
        }).join('');
        list.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:8px;">${cards}</div>`;

        // Attach event delegation — safe, no inline onclick needed
        list.onclick = function(e) {
            const card = e.target.closest('[data-follow-uid]');
            if (!card) return;
            const uid = card.dataset.followUid;
            if (uid) { closeFollowPanel(); setTimeout(() => openBreederProfile(uid), 80); }
        };
    } catch (err) {
        console.error('switchFollowTab error:', err);
        list.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;"><p>Failed to load</p></div>';
    }
}

function showLitters() { scrollToAnimals(); }

function scrollToAnimals() {
    const section = document.getElementById('animalsSection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToPosts() {
    const container = document.getElementById('postsContainer');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function showReviews() {
    openMyReviewsPanel();
}

// Load and display ratings count in the stat box
async function loadAndDisplayRatings() {
    if (!currentUserId) return;
    try {
        const { data, error } = await window.supabase
            .from('ratings')
            .select('id,rater_id,rated_user_id,rating,comment,created_at,updated_at')
            .eq('rated_user_id', currentUserId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        const ratings = data || [];
        const reviewsCount = document.getElementById('reviewsCount');
        if (reviewsCount) reviewsCount.textContent = ratings.length;

        // Also update the average in stats
        if (ratings.length > 0) {
            const avg = parseFloat((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1));
            profileData.stats = profileData.stats || {};
            profileData.stats.rating = avg;
            profileData.stats.reviewCount = ratings.length;
        }
        return ratings;
    } catch (err) {
        console.error('loadAndDisplayRatings error:', err);
        return [];
    }
}

// Open own reviews panel
async function openMyReviewsPanel() {
    // Create or show panel
    let panel = document.getElementById('myReviewsPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'myReviewsPanel';
        panel.style.cssText = 'display:none;position:fixed;inset:0;z-index:3500;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:12px 10px 60px;box-sizing:border-box;overflow-y:auto;';
        panel.innerHTML = `
          <div onclick="closeMyReviewsPanel()" style="position:fixed;inset:0;z-index:0;"></div>
          <div style="max-width:500px;width:100%;background:#fff;border-radius:22px;position:relative;margin:20px auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:1;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px 12px;border-bottom:1px solid var(--border-light);">
              <h3 style="margin:0;font-size:17px;font-weight:800;color:var(--text-primary);">⭐ My Reviews</h3>
              <button onclick="closeMyReviewsPanel()" style="background:#f3f4f6;border:none;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;line-height:1;">×</button>
            </div>
            <div id="myReviewsListHeader" style="padding:12px 18px 0;"></div>
            <div id="myReviewsFilterBar" style="padding:0 18px;"></div>
            <div id="myReviewsList" style="padding:12px 18px 20px;max-height:70vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
              <div style="text-align:center;padding:40px 0;color:var(--text-muted);"><div style="font-size:32px;">⭐</div><p>Loading reviews...</p></div>
            </div>
          </div>`;
        document.body.appendChild(panel);
    }
    panel.style.display = 'block';
    document.body.style.overflow = 'hidden';
    renderMyReviews();
}

function closeMyReviewsPanel() {
    const panel = document.getElementById('myReviewsPanel');
    if (panel) { panel.style.display = 'none'; document.body.style.overflow = ''; }
    _myReviewsCache = null; // Reset cache so next open fetches fresh data
}

async function renderMyReviews() {
    const list = document.getElementById('myReviewsList');
    const header = document.getElementById('myReviewsListHeader');
    if (!list) return;

    try {
        // Use cached data if available (avoids re-fetch on star filter change)
        let ratings, raterMap;
        if (_myReviewsCache) {
            ratings  = _myReviewsCache.ratings;
            raterMap = _myReviewsCache.raterMap;
        } else {
            ratings = await loadAndDisplayRatings();
            const raterIds = [...new Set(ratings.map(r => r.rater_id).filter(Boolean))];
            raterMap = {};
            if (raterIds.length) {
                const { data: rp } = await window.supabase.from('profiles').select('id,name,profile_picture').in('id', raterIds);
                (rp || []).forEach(r => raterMap[r.id] = r);
            }
            _myReviewsCache = { ratings, raterMap };
        }

        if (!ratings.length) {
            if (header) header.innerHTML = '';
            list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);"><div style="font-size:40px;margin-bottom:10px;">📝</div><p>No reviews yet. Build your reputation by connecting with other breeders!</p></div>';
            return;
        }

        const avg = (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1);
        const starsFull = Math.round(parseFloat(avg));
        const starsHTML = [1,2,3,4,5].map(i => `<span style="color:${i<=starsFull?'#f59e0b':'#d1d5db'};font-size:18px;">★</span>`).join('');

        if (header) {
            header.innerHTML = `
            <div style="display:flex;align-items:center;gap:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:14px 16px;margin-bottom:4px;">
              <div style="text-align:center;flex-shrink:0;">
                <div style="font-size:40px;font-weight:900;color:#92400e;line-height:1;">${avg}</div>
                <div style="display:flex;gap:1px;justify-content:center;margin:4px 0;">${starsHTML}</div>
                <div style="font-size:11px;color:#b45309;font-weight:600;">${ratings.length} review${ratings.length!==1?'s':''}</div>
              </div>
              <div style="flex:1;font-size:13px;color:#92400e;">Your average rating from breeders you've connected with.</div>
            </div>`;
        }

        // Star filter bar
        const filterBarHtml = `
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;align-items:center;padding:0 0 8px;">
          <span style="font-size:11px;color:#b45309;font-weight:600;">Filter:</span>
          ${[0,5,4,3,2,1].map(s => `
            <button onclick="window._setMyReviewFilter(${s})" style="
                padding:4px 10px;border-radius:50px;border:1.5px solid ${_myReviewsStarFilter===s?'#d97706':'#fde68a'};
                background:${_myReviewsStarFilter===s?'#f59e0b':'#fffbeb'};
                color:${_myReviewsStarFilter===s?'white':'#92400e'};
                font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;">
              ${s === 0 ? 'All' : s + '★'}
            </button>`).join('')}
        </div>`;

        const filteredRatings = _myReviewsStarFilter > 0
            ? ratings.filter(r => r.rating === _myReviewsStarFilter)
            : ratings;

        if (list && list.dataset) list.dataset.filterHtml = filterBarHtml;
        const filterEl = document.getElementById('myReviewsFilterBar');
        if (filterEl) filterEl.innerHTML = filterBarHtml;

        list.innerHTML = (filteredRatings.length === 0 ? `<div style="text-align:center;padding:24px;color:var(--text-muted);"><div style="font-size:30px;margin-bottom:8px;">🔍</div><div>No ${_myReviewsStarFilter}★ reviews found</div></div>` : '') + filteredRatings.map(r => {
            const rater = raterMap[r.rater_id] || {};
            const raterName = escapeHtml(rater.name || 'Anonymous');
            const raterAvatar = escapeHtml(rater.profile_picture || '');
            const initial = (rater.name || 'A').charAt(0).toUpperCase();
            const stars = [1,2,3,4,5].map(i => `<span style="color:${i<=r.rating?'#f59e0b':'#d1d5db'};font-size:15px;">★</span>`).join('');
            const isMine = r.rater_id === currentUserId;
            return `
            <div id="review-${r.id}" style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="width:38px;height:38px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#6b7280;">
                  ${raterAvatar ? `<img src="${raterAvatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.textContent='${initial}'">` : initial}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:700;color:#111827;">${raterName}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${formatDate(r.created_at)}</div>
                </div>
                <div style="display:flex;gap:1px;">${stars}</div>
              </div>
              ${r.comment ? `<p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 8px;background:#fafafa;border-radius:10px;padding:10px 13px;border:1px solid #f3f4f6;word-wrap:break-word;">"${escapeHtml(r.comment)}"</p>` : ''}
              ${isMine ? `
              <div id="editReview-${r.id}" style="display:none;margin-top:8px;">
                <div style="display:flex;gap:6px;margin-bottom:8px;justify-content:center;">
                  ${[1,2,3,4,5].map(v => `<span onclick="setEditStar(${r.id},${v})" data-edit-star="${r.id}" data-val="${v}" style="font-size:32px;cursor:pointer;color:${v<=r.rating?'#f59e0b':'#d1d5db'};transition:all .15s;user-select:none;">★</span>`).join('')}
                </div>
                <textarea id="editComment-${r.id}" rows="2" style="width:100%;padding:10px;border-radius:10px;border:1.5px solid #e5e7eb;font-size:13px;resize:none;box-sizing:border-box;font-family:inherit;">${escapeHtml(r.comment || '')}</textarea>
                <div style="display:flex;gap:8px;margin-top:8px;">
                  <button onclick="saveEditReview(${r.id})" style="flex:1;padding:9px;background:#f59e0b;color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px;">💾 Save</button>
                  <button onclick="cancelEditReview(${r.id})" style="flex:1;padding:9px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:13px;">Cancel</button>
                </div>
              </div>
              <button onclick="toggleEditReview(${r.id},${r.rating})" id="editBtn-${r.id}" style="background:#fffbeb;color:#d97706;border:1.5px solid #fde68a;border-radius:50px;padding:5px 14px;font-size:12px;font-weight:700;cursor:pointer;margin-top:4px;">✏️ Edit My Review</button>
              ` : ''}
            </div>`;
        }).join('');
        // Inject filter bar above list
        const fb = document.getElementById('myReviewsFilterBar');
        if (fb) fb.innerHTML = filterBarHtml;
    } catch (err) {
        console.error('renderMyReviews error:', err);
        list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Failed to load reviews</div>';
    }
}

let _editStarVal = {};
window._setMyReviewFilter = function(star) {
    _myReviewsStarFilter = (_myReviewsStarFilter === star && star !== 0) ? 0 : star;
    renderMyReviews();
};
let _myReviewsStarFilter = 0;
let _myReviewsCache = null; // Cached { ratings, raterMap } — cleared when panel closes

function toggleEditReview(reviewId, currentRating) {
    const box = document.getElementById(`editReview-${reviewId}`);
    const btn = document.getElementById(`editBtn-${reviewId}`);
    if (!box) return;
    const isOpen = box.style.display !== 'none';
    box.style.display = isOpen ? 'none' : 'block';
    if (btn) btn.textContent = isOpen ? '✏️ Edit My Review' : '✕ Cancel Edit';
    // Always pre-populate _editStarVal with the current DB rating when opening
    // so clicking Save without touching stars saves the correct current rating.
    if (!isOpen) {
        _editStarVal[reviewId] = currentRating;
        // Re-paint stars to match DB value in case a previous edit left them stale
        document.querySelectorAll(`[data-edit-star="${reviewId}"]`).forEach(star => {
            const sv = parseInt(star.dataset.val);
            star.style.color     = sv <= currentRating ? '#f59e0b' : '#d1d5db';
            star.style.transform = 'scale(1)';
        });
    }
}

function cancelEditReview(reviewId) {
    const box = document.getElementById(`editReview-${reviewId}`);
    const btn = document.getElementById(`editBtn-${reviewId}`);
    if (box) box.style.display = 'none';
    if (btn) btn.textContent = '✏️ Edit My Review';
    delete _editStarVal[reviewId];
}

function setEditStar(reviewId, val) {
    _editStarVal[reviewId] = val;
    document.querySelectorAll(`[data-edit-star="${reviewId}"]`).forEach(star => {
        const sv = parseInt(star.dataset.val);
        star.style.color = sv <= val ? '#f59e0b' : '#d1d5db';
        star.style.transform = sv <= val ? 'scale(1.15)' : 'scale(1)';
    });
}

async function saveEditReview(reviewId) {
    const newRating = _editStarVal[reviewId];
    const commentEl = document.getElementById(`editComment-${reviewId}`);
    const comment = commentEl?.value.trim() || '';
    if (!newRating) { showToast('Please select a star rating', 'error'); return; }

    try {
        const { error } = await window.supabase
            .from('ratings')
            .update({ rating: newRating, comment: comment })
            .eq('id', reviewId)
            .eq('rater_id', currentUserId);
        if (error) throw error;
        showToast('Review updated! ⭐');
        delete _editStarVal[reviewId]; // clear so next open re-reads fresh DB value
        _myReviewsCache = null;        // force re-fetch so updated rating shows
        renderMyReviews();
    } catch (err) {
        console.error('saveEditReview error:', err);
        showToast('Failed to update review: ' + err.message, 'error');
    }
}

function showBioModal() {
    const bioContent = document.getElementById('bioContent');
    if (bioContent) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">×</button>
                <h3>📝 About Me</h3>
                <div style="line-height: 1.8; color: var(--text-primary);">${bioContent.innerHTML}</div>
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button class="cancel-btn" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }
}

// ============================================
// MESSENGER FUNCTIONS
// ============================================

async function loadConversations() {
    if (!currentUserId) return;
    
    try {
        const { data: matches, error } = await window.supabase
            .from('matches')
            .select('id, matched_user_id, status, created_at, profiles:matched_user_id(id, name, profile_picture)')
            .eq('user_id', currentUserId)
            .eq('status', 'matched')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const contactMap = new Map();
        
        for (const match of matches || []) {
            const otherUser = match.profiles;
            if (otherUser && otherUser.id !== currentUserId) {
                if (!contactMap.has(otherUser.id)) {
                    contactMap.set(otherUser.id, {
                        id: otherUser.id,
                        name: otherUser.name || 'User',
                        avatar: otherUser.profile_picture || defaultAvatar(otherUser?.name || 'User'),
                        lastMessage: '',
                        time: '',
                        unread: 0
                    });
                }
            }
        }
        
        messengerContacts = Array.from(contactMap.values());
        renderContactsList();
    } catch (err) {
        console.error('loadConversations error:', err);
    }
}

async function loadMessages(contactId) {
    try {
        const { data, error } = await window.supabase
            .from('messages')
            .select('id,sender_id,receiver_id,text,image_url,type,created_at,read')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        messengerMessages[contactId] = (data || []).map(msg => ({
            id: msg.id,
            sender: msg.sender_id === currentUserId ? 'me' : 'them',
            text: msg.text,
            image: msg.image_url,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        renderMessages(contactId);
        
        await window.supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('receiver_id', currentUserId)
            .eq('sender_id', contactId);
        
    } catch (err) {
        console.error('loadMessages error:', err);
    }
}

async function sendMessageToApi(contactId, text, file) {
    let imageUrl = null;
    
    if (file) {
        showToast('Uploading image...');
        imageUrl = await StorageAPI.uploadMessageImage(file);
    }
    
    await saveMessage(contactId, text, imageUrl);
}

async function saveMessage(contactId, text, imageUrl) {
    try {
        const { data, error } = await window.supabase
            .from('messages')
            .insert({
                sender_id: currentUserId,
                receiver_id: contactId,
                text: text || '',
                image_url: imageUrl,
                is_read: false
            })
            .select();
        
        if (error) throw error;
        
        if (!messengerMessages[contactId]) messengerMessages[contactId] = [];
        
        messengerMessages[contactId].push({
            id: data[0].id,
            sender: 'me',
            text: text || '',
            image: imageUrl,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        renderMessages(contactId);
        
        if (imageUrl) showToast('Image sent! 📷');
        
    } catch (err) {
        console.error('saveMessage error:', err);
        showToast('Failed to send message: ' + err.message, 'error');
    }
}

function openMessenger() {
    // Delegate to the unified messages modal injected by messages-loader.js / messages.js
    const opener = window.openMessengerGlobal || window.openMessagesModal;
    if (typeof opener === 'function') {
        opener();
    }
}

function closeMessenger() {
    // Delegate to the unified messages modal
    const closer = window.closeMessagesModal;
    if (typeof closer === 'function') {
        closer();
    }
}

function renderContactsList() {
    const container = document.getElementById('contactsListContainer');
    if (!container) return;
    
    if (messengerContacts.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">No conversations yet. Start swiping to find matches!</div>';
        return;
    }
    
    container.innerHTML = messengerContacts.map(contact => `
        <div class="contact-item" onclick="startChat(${contact.id})">
            <img src="${contact.avatar}" alt="${contact.name}" onerror="this.src=defaultAvatar(this.alt||'User')">
            <div class="contact-info">
                <div class="contact-name">${escapeHtml(contact.name)}</div>
                <div class="contact-preview">${escapeHtml(contact.lastMessage) || 'Start a conversation'}</div>
            </div>
            <div class="contact-meta">
                <div class="contact-time">${contact.time}</div>
                ${contact.unread > 0 ? `<div class="unread-badge">${contact.unread}</div>` : ''}
            </div>
        </div>
    `).join('');
}

async function startChat(contactId) {
    currentChatId = contactId;
    const contact = messengerContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    document.getElementById('messengerContacts').classList.remove('active');
    document.getElementById('messengerEmpty').classList.add('hidden');
    document.getElementById('messengerChat').classList.add('active');
    document.getElementById('chatHeaderAvatar').src = contact.avatar;
    document.getElementById('chatHeaderName').textContent = contact.name;
    
    await loadMessages(contactId);
    contact.unread = 0;
    renderContactsList();
}

function closeChat() {
    document.getElementById('messengerContacts').classList.add('active');
    document.getElementById('messengerEmpty').classList.remove('hidden');
    document.getElementById('messengerChat').classList.remove('active');
    currentChatId = null;
    renderContactsList();
}

function renderMessages(contactId) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    const messages = messengerMessages[contactId] || [];
    
    if (messages.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">Start a conversation! Say hello 👋</div>';
    } else {
        container.innerHTML = messages.map(msg => {
            if (msg.image) {
                return `
                    <div class="message ${msg.sender === 'me' ? 'sent' : 'received'}">
                        <div class="message-bubble"><img src="${msg.image}" style="max-width: 200px; border-radius: 12px;" onclick="openLightbox('${msg.image}')"></div>
                    </div>
                `;
            }
            return `
                <div class="message ${msg.sender === 'me' ? 'sent' : 'received'}">
                    <div class="message-bubble">${escapeHtml(msg.text)}</div>
                </div>
            `;
        }).join('');
    }
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input || !currentChatId) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    await sendMessageToApi(currentChatId, text, null);
}

function handleMessageInput(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendImage(fileInput) {
    const file = fileInput.files[0];
    if (!file || !currentChatId) return;
    await sendMessageToApi(currentChatId, null, file);
    fileInput.value = '';
}

function searchContacts(query) {
    const container = document.getElementById('contactsListContainer');
    if (!container) return;
    
    const filtered = messengerContacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
    
    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">No contacts found</div>';
        return;
    }
    
    container.innerHTML = filtered.map(contact => `
        <div class="contact-item" onclick="startChat(${contact.id})">
            <img src="${contact.avatar}" alt="${contact.name}">
            <div class="contact-info">
                <div class="contact-name">${escapeHtml(contact.name)}</div>
                <div class="contact-preview">${escapeHtml(contact.lastMessage)}</div>
            </div>
            <div class="contact-meta">
                <div class="contact-time">${contact.time}</div>
                ${contact.unread > 0 ? `<div class="unread-badge">${contact.unread}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// INITIALIZATION
// ============================================

function setupEventListeners() {
    const postImageInput = document.getElementById('postImageInput');
    if (postImageInput) {
        postImageInput.addEventListener('change', function(e) {
            previewPostImage(e.target, 'postImagePreview');
        });
    }
    
    const animalImageInput = document.getElementById('animalInput');
    if (animalImageInput) {
        animalImageInput.addEventListener('change', function(e) {
            previewAnimalImage(e.target, 'animalPreview');
        });
    }
    
    const animalDocsInput = document.getElementById('animalDocuments');
    if (animalDocsInput) {
        animalDocsInput.addEventListener('change', function(e) {
            previewAnimalDocuments(e.target, 'animalDocumentsPreview');
        });
    }
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal(this.id);
        });
    });
    
    const lightboxModal = document.getElementById('lightboxModal');
    if (lightboxModal) {
        lightboxModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal('lightboxModal');
                document.body.style.overflow = '';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Profile page loaded - Edit mode:', isEditMode);
    
    if (!User.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    await loadProfile();

    // If loadProfile couldn't resolve the user (e.g. token refresh race on first load),
    // wait briefly and retry once before giving up.
    if (!currentUserId) {
        await new Promise(r => setTimeout(r, 800));
        await loadProfile();
    }

    await loadPosts();
    await loadAnimals();

    // Safety net: if animals came back empty AND we have a valid user, retry once
    // after a short delay — guards against auth token race on first load.
    if (animals.length === 0 && currentUserId) {
        await new Promise(r => setTimeout(r, 1000));
        await loadAnimals();
    }

    loadFollowCounts();
    
    setupEventListeners();

    // If ?user=<id> is in URL (e.g. from messages viewProfile or swipe See Full Profile)
    // open that user's breeder profile panel
    const _urlParams = new URLSearchParams(window.location.search);
    const _viewUserId = _urlParams.get('user');
    if (_viewUserId && _viewUserId !== String(currentUserId)) {
        setTimeout(function() {
            if (typeof openBreederProfile === 'function') openBreederProfile(_viewUserId);
        }, 500);
    }
});

// ============================================
// EXPOSE FUNCTIONS TO WINDOW
// ============================================
window.openModal = openModal;
window.closeModal = closeModal;
window.previewImage = previewImage;
window.previewPostImage = previewPostImage;
window.previewAnimalImage = previewAnimalImage;
window.previewAnimalDocuments = previewAnimalDocuments;
window.previewMultipleFiles = previewMultipleFiles;
window.openLightbox = openLightbox;
window.viewAnimal = viewAnimal;
window.editAnimal = editAnimal;
window.deleteAnimal = deleteAnimal;
window.saveAnimal = saveAnimal;
window.saveAnimalDetails = saveAnimalDetails;
window.openAddAnimalModal = openAddAnimalModal;
window.openCoverModal = openCoverModal;
window.openProfileModal = openProfileModal;
window.editName = editName;
window.editBio = editBio;
window.addNewTag = addNewTag;
window.saveCover = saveCover;
window.saveProfile = saveProfile;
window.saveName = saveName;
window.saveBio = saveBio;
window.saveTag = saveTag;
window.removeTag = removeTag;
window.saveContact = saveContact;
window.openContactModal = openContactModal;
window.addPost = addPost;
window.openPostMenu = openPostMenu;
window.editCurrentPost = editCurrentPost;
window.savePostEdit = savePostEdit;
window.deleteCurrentPost = deleteCurrentPost;
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.addComment = addComment;
window.focusComment = focusComment;
window.sharePost = sharePost;
window.editComment = editComment;
window.saveCommentEdit = saveCommentEdit;
window.deleteComment = deleteComment;
window.enableEditMode = enableEditMode;
window.showLitters = showLitters;
window.scrollToAnimals = scrollToAnimals;
window.scrollToPosts = scrollToPosts;
window.showBioModal = showBioModal;
window.showReviews = showReviews;
window.openMyReviewsPanel = openMyReviewsPanel;
window.closeMyReviewsPanel = closeMyReviewsPanel;
window.toggleEditReview = toggleEditReview;
window.cancelEditReview = cancelEditReview;
window.setEditStar = setEditStar;
window.saveEditReview = saveEditReview;
window.messageAboutAnimal = messageAboutAnimal;
window.messageBreederFromProfile = messageBreederFromProfile;
window.loadProfile = loadProfile;
window.openFollowPanel = openFollowPanel;
window.closeFollowPanel = closeFollowPanel;
window.switchFollowTab = switchFollowTab;
window.openPostDetail = openPostDetail;
window.closePostDetail = closePostDetail;
window.addPostDetailComment = addPostDetailComment;

// ── Post detail comment interactions ──────────────────────────────────────
async function toggleDetailCommentLike(postId, commentId) {
    const user = User.getUser();
    if (!user) { showToast('Please sign in', 'error'); return; }
    let post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;
    const comments = post.comments || [];
    const idx = comments.findIndex(c => String(c.id) === String(commentId));
    if (idx === -1) return;
    const c = comments[idx];
    const likedBy = c.likedBy || [];
    if (likedBy.includes(user.id)) {
        c.likedBy = likedBy.filter(id => id !== user.id);
        c.likes = Math.max(0, (c.likes || 1) - 1);
    } else {
        c.likedBy = [...likedBy, user.id];
        c.likes = (c.likes || 0) + 1;
    }
    comments[idx] = c;
    post.comments = comments;
    try {
        await updatePostPublic(postId, { comments });
        const sideEl = document.getElementById('postDetailSide');
        if (sideEl) _renderPostDetailSide(sideEl, post);
    } catch(err) { console.error('toggleDetailCommentLike error:', err); }
}

function toggleDetailCommentReply(commentId, postId) {
    const box = document.getElementById('detail-reply-' + commentId);
    if (!box) return;
    const showing = box.style.display === 'flex';
    box.style.display = showing ? 'none' : 'flex';
    if (!showing) {
        const inp = document.getElementById('detail-reply-input-' + commentId);
        if (inp) inp.focus();
    }
}

async function postDetailReply(postId, commentId) {
    const user = User.getUser();
    if (!user) { showToast('Please sign in', 'error'); return; }
    const inp = document.getElementById('detail-reply-input-' + commentId);
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    let post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;
    const comments = post.comments || [];
    const idx = comments.findIndex(c => String(c.id) === String(commentId));
    if (idx === -1) return;
    const reply = {
        id: Date.now(),
        user_id: user.id,
        author: profileData.name || user.email,
        authorImg: profileData.profileImg || '',
        text,
        created_at: new Date().toISOString()
    };
    comments[idx].replies = [...(comments[idx].replies || []), reply];
    post.comments = comments;
    try {
        await updatePostPublic(postId, { comments });
        inp.value = '';
        showToast('Reply added! 💬');
        const sideEl = document.getElementById('postDetailSide');
        if (sideEl) _renderPostDetailSide(sideEl, post);
    } catch(err) { console.error('postDetailReply error:', err); showToast('Failed to reply', 'error'); }
}

async function deleteDetailComment(postId, commentId) {
    const user = User.getUser();
    if (!user) return;
    if (!confirm('Delete this comment?')) return;
    let post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;
    post.comments = (post.comments || []).filter(c => String(c.id) !== String(commentId));
    try {
        await updatePostPublic(postId, { comments: post.comments });
        showToast('Comment deleted');
        const sideEl = document.getElementById('postDetailSide');
        if (sideEl) _renderPostDetailSide(sideEl, post);
        renderPosts();
    } catch(err) { console.error('deleteDetailComment error:', err); showToast('Failed to delete', 'error'); }
}

async function editDetailComment(postId, commentId) {
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;
    const c = (post.comments || []).find(cm => String(cm.id) === String(commentId));
    if (!c) return;
    currentComment = { postId: post.id, commentId: c.id };
    const editText = document.getElementById('editCommentText');
    if (editText) editText.value = c.text;
    openModal('commentEditModal');
}

async function toggleDetailReplyLike(postId, commentId, replyId) {
    const user = User.getUser();
    if (!user) { showToast('Please sign in', 'error'); return; }
    let post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;
    const comments = post.comments || [];
    const cidx = comments.findIndex(c => String(c.id) === String(commentId));
    if (cidx === -1) return;
    const replies = comments[cidx].replies || [];
    const ridx = replies.findIndex(r => String(r.id) === String(replyId));
    if (ridx === -1) return;
    const r = replies[ridx];
    const likedBy = r.likedBy || [];
    if (likedBy.includes(user.id)) {
        r.likedBy = likedBy.filter(id => id !== user.id);
        r.likes = Math.max(0, (r.likes || 1) - 1);
    } else {
        r.likedBy = [...likedBy, user.id];
        r.likes = (r.likes || 0) + 1;
    }
    replies[ridx] = r;
    comments[cidx].replies = replies;
    post.comments = comments;
    try {
        await updatePostPublic(postId, { comments });
        const sideEl = document.getElementById('postDetailSide');
        if (sideEl) _renderPostDetailSide(sideEl, post);
    } catch(err) { console.error('toggleDetailReplyLike error:', err); }
}

async function deleteDetailReply(postId, commentId, replyId) {
    const user = User.getUser();
    if (!user) return;
    if (!confirm('Delete this reply?')) return;
    let post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;
    const comments = post.comments || [];
    const cidx = comments.findIndex(c => String(c.id) === String(commentId));
    if (cidx === -1) return;
    comments[cidx].replies = (comments[cidx].replies || []).filter(r => String(r.id) !== String(replyId));
    post.comments = comments;
    try {
        await updatePostPublic(postId, { comments });
        showToast('Reply deleted');
        const sideEl = document.getElementById('postDetailSide');
        if (sideEl) _renderPostDetailSide(sideEl, post);
        renderPosts();
    } catch(err) { console.error('deleteDetailReply error:', err); showToast('Failed to delete', 'error'); }
}

window.toggleDetailCommentLike  = toggleDetailCommentLike;
window.toggleDetailCommentReply = toggleDetailCommentReply;
window.postDetailReply          = postDetailReply;
window.deleteDetailComment      = deleteDetailComment;
window.editDetailComment        = editDetailComment;
window.showCommentEditHistory   = showCommentEditHistory;
window.toggleDetailReplyLike    = toggleDetailReplyLike;
window.deleteDetailReply        = deleteDetailReply;

// ============================================
// POST DETAIL PANEL (Facebook-style)
// ============================================

let _postDetailCurrentImageIdx = 0;
let _postDetailImages = [];

function openPostDetail(postId) {
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;

    _postDetailImages = post.images || [];
    _postDetailCurrentImageIdx = 0;

    const modal = document.getElementById('postDetailModal');
    const mediaEl = document.getElementById('postDetailMedia');
    const sideEl = document.getElementById('postDetailSide');
    if (!modal || !mediaEl || !sideEl) return;

    _renderPostDetailMedia(mediaEl, post);
    _renderPostDetailSide(sideEl, post);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Fetch fresh comments from DB to stay in sync with other views
    if (window.supabase) {
        window.supabase.from('posts').select('comments').eq('id', post.id).single().then(({ data }) => {
            if (data && data.comments) {
                post.comments = data.comments;
                const side = document.getElementById('postDetailSide');
                if (side && modal.style.display === 'flex') _renderPostDetailSide(side, post);
            }
        });
    }

    // Close on backdrop click
    modal.onclick = (e) => { if (e.target === modal) closePostDetail(); };

    // Keyboard nav
    document._postDetailKeyHandler = (e) => {
        if (e.key === 'Escape') closePostDetail();
        if (e.key === 'ArrowRight' && _postDetailImages.length > 1) {
            _postDetailCurrentImageIdx = (_postDetailCurrentImageIdx + 1) % _postDetailImages.length;
            _renderPostDetailMedia(mediaEl, post);
        }
        if (e.key === 'ArrowLeft' && _postDetailImages.length > 1) {
            _postDetailCurrentImageIdx = (_postDetailCurrentImageIdx - 1 + _postDetailImages.length) % _postDetailImages.length;
            _renderPostDetailMedia(mediaEl, post);
        }
    };
    document.addEventListener('keydown', document._postDetailKeyHandler);
}

function _renderPostDetailMedia(mediaEl, post) {
    const imgs = _postDetailImages;
    const idx = _postDetailCurrentImageIdx;

    if (!imgs.length) {
        // Text-only post — show a styled card
        mediaEl.style.background = 'linear-gradient(135deg,var(--green-primary),var(--green-secondary))';
        mediaEl.innerHTML = `<div style="padding:40px;color:white;font-size:22px;font-weight:700;text-align:center;line-height:1.5;">${escapeHtml(post.text || '')}</div>`;
        return;
    }

    const prevBtn = imgs.length > 1 ? `<button onclick="window._pdPrev()" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.55);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;">‹</button>` : '';
    const nextBtn = imgs.length > 1 ? `<button onclick="window._pdNext()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.55);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;">›</button>` : '';
    const dots = imgs.length > 1 ? `<div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;">${imgs.map((_,i) => `<div style="width:8px;height:8px;border-radius:50%;background:${i===idx?'white':'rgba(255,255,255,0.45)'};transition:background .2s;"></div>`).join('')}</div>` : '';

    mediaEl.style.background = '#000';
    mediaEl.innerHTML = `
        <img src="${imgs[idx]}" style="max-width:100%;max-height:90vh;object-fit:contain;display:block;" onerror="this.style.display='none'">
        ${prevBtn}${nextBtn}${dots}`;

    window._pdPrev = () => {
        _postDetailCurrentImageIdx = (_postDetailCurrentImageIdx - 1 + imgs.length) % imgs.length;
        _renderPostDetailMedia(mediaEl, post);
    };
    window._pdNext = () => {
        _postDetailCurrentImageIdx = (_postDetailCurrentImageIdx + 1) % imgs.length;
        _renderPostDetailMedia(mediaEl, post);
    };
}

// Enrich comments with up-to-date profile data for the current logged-in user only.
// Other commenters' data is already stored correctly in the comment JSONB at write time.
// This avoids any Supabase query — everything needed is already in memory.
function _fetchCommentProfiles(comments) {
    if (!comments || !comments.length) return comments;
    const me = User.getUser();
    if (!me) return comments;
    const myName   = profileData.name   || me.name   || 'You';
    const myAvatar = profileData.profileImg || me.avatar || '';
    return comments.map(c => {
        if (String(c.user_id) === String(me.id)) {
            return { ...c, author: myName, authorImg: myAvatar };
        }
        return c;
    });
}

function _renderPostDetailSide(sideEl, post) {
    const user = User.getUser();
    const authorAvatar = post.authorImg || profileData.profileImg || defaultAvatar('User');
    // Fetch real profile data for comment authors
    const comments = _fetchCommentProfiles(post.comments || []);

    sideEl.innerHTML = `
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--border-light);flex-shrink:0;">
            <img src="${authorAvatar}" onerror="this.src=defaultAvatar(this.alt||'User')" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid var(--green-primary);">
            <div>
                <div style="font-weight:700;font-size:14px;color:var(--text-primary);">${escapeHtml(post.author || 'User')}</div>
                <div style="font-size:11px;color:var(--text-muted);">${formatDate(post.created_at)}</div>
            </div>
        </div>
        <!-- Post text -->
        ${post.text ? `<div style="padding:14px 18px;font-size:14px;color:var(--text-primary);line-height:1.65;border-bottom:1px solid var(--border-light);flex-shrink:0;word-break:break-word;">${escapeHtml(post.text)}</div>` : ''}
        <!-- Meta -->
        <div style="padding:8px 18px;font-size:12px;color:var(--text-muted);border-bottom:1px solid var(--border-light);flex-shrink:0;">
            ❤️ ${post.likes} likes &nbsp;•&nbsp; 💬 ${comments.length} comments${post.shares ? ` &nbsp;•&nbsp; 🔗 ${post.shares} shares` : ''}
        </div>
        <!-- Action buttons -->
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border-light);flex-shrink:0;">
            <button id="pd-like-btn-${post.id}" onclick="window._pdToggleLike(${post.id})" style="flex:1;padding:10px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:${post.liked?'#e11d48':'var(--text-secondary)'};border-right:1px solid var(--border-light);transition:background .15s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                ${post.liked ? '❤️ Liked' : '🤍 Like'}
            </button>
            <button id="pd-save-btn-${post.id}" onclick="window._pdToggleSave(${post.id})" style="flex:1;padding:10px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);transition:background .15s;border-right:1px solid var(--border-light);" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                ${post.saved ? '🔖 Saved' : '📑 Save'}
            </button>
            <button onclick="sharePost(${post.id})" style="flex:1;padding:10px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);transition:background .15s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                🔗 Share
            </button>
        </div>
        <!-- Comments list -->
        <div id="postDetailCommentsList" style="flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px;">
            ${comments.length === 0 ? `<div style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:20px;">No comments yet. Be the first! 💬</div>` :
            comments.map(c => {
                const replies = c.replies || [];
                return `
                <div style="display:flex;gap:10px;align-items:flex-start;">
                    <img src="${c.authorImg || authorAvatar}" onerror="this.src=defaultAvatar(this.alt||'User')" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="background:var(--bg-secondary);border-radius:14px;padding:8px 12px;">
                            <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px;">${escapeHtml(c.author || 'User')}</div>
                            <div style="font-size:13px;color:var(--text-secondary);word-break:break-word;">${escapeHtml(c.text || '')}</div>
                        </div>
                          <div style="display:flex;gap:12px;margin-top:3px;padding-left:6px;align-items:center;">
                      <span style="font-size:11px;color:var(--text-muted);">${formatDate(c.created_at || '')}</span>
                      <button onclick="toggleDetailCommentLike(${post.id},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:${(c.likedBy||[]).includes(user?.id)?'#e11d48':'#6b7280'};font-weight:600;padding:0;">${(c.likedBy||[]).includes(user?.id)?'❤️':'🤍'} ${c.likes||0}</button>
                      <button onclick="toggleDetailCommentReply('${c.id}',${post.id})" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">Reply</button>
                      ${user && String(c.user_id) === String(user.id) ? `<button onclick="editDetailComment(${post.id},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:600;padding:0;">Edit</button>` : ''}
                      ${user && String(c.user_id) === String(user.id) ? `<button onclick="deleteDetailComment(${post.id},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
                      ${c.edited ? `<button onclick="showCommentEditHistory(${post.id},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:#9ca3af;font-weight:500;padding:0;font-style:italic;">(edited)</button>` : ''}
                  </div>
                  <div id="detail-reply-${c.id}" style="display:none;gap:6px;margin-top:6px;margin-left:42px;">
                    <input type="text" id="detail-reply-input-${c.id}" placeholder="Write a reply…" style="flex:1;padding:6px 10px;border:1.5px solid var(--border-light);border-radius:50px;font-size:12px;outline:none;min-width:0;">
                    <button onclick="postDetailReply(${post.id},'${c.id}')" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">↩</button>
                  </div>
                  ${replies.length ? `<div style="margin-top:8px;padding-left:16px;display:flex;flex-direction:column;gap:6px;">
                      ${replies.map(r=>`
                      <div style="display:flex;gap:8px;align-items:flex-start;">
                          <img src="${escapeHtml(r.authorImg||authorAvatar)}" onerror="this.src=defaultAvatar(this.alt||'User')" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                          <div style="flex:1;min-width:0;">
                              <div style="background:var(--bg-secondary);border-radius:10px;padding:5px 10px;">
                                  <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${escapeHtml(r.author||'User')}</div>
                                  <div style="font-size:12px;color:var(--text-secondary);word-break:break-word;">${escapeHtml(r.text||'')}</div>
                              </div>
                              <div style="display:flex;gap:10px;margin-top:2px;padding-left:4px;align-items:center;">
                                  <span style="font-size:10px;color:var(--text-muted);">${formatDate(r.created_at||'')}</span>
                                  <button onclick="toggleDetailReplyLike(${post.id},'${c.id}','${r.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:${(r.likedBy||[]).includes(user?.id)?'#e11d48':'#6b7280'};font-weight:600;padding:0;">${(r.likedBy||[]).includes(user?.id)?'❤️':'🤍'} ${r.likes||0}</button>
                                  ${user && String(r.user_id) === String(user.id) ? `<button onclick="deleteDetailReply(${post.id},'${c.id}','${r.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
                              </div>
                          </div>
                      </div>`).join('')}
                  </div>` : ''}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        <!-- Comment input -->
        <div style="padding:12px 18px;border-top:1px solid var(--border-light);display:flex;gap:8px;align-items:center;flex-shrink:0;background:var(--surface-white);">
            <img src="${user?.avatar || authorAvatar}" onerror="this.src=defaultAvatar(this.alt||'User')" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">
            <input type="text" id="postDetailCommentInput" placeholder="Write a comment…"
                style="flex:1;border:1.5px solid var(--border-light);border-radius:50px;padding:8px 14px;font-size:13px;outline:none;background:var(--bg-secondary);"
                onkeypress="if(event.key==='Enter') addPostDetailComment(${post.id})"
                onfocus="this.style.borderColor='var(--green-primary)'"
                onblur="this.style.borderColor='var(--border-light)'">
            <button onclick="addPostDetailComment(${post.id})" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;transition:opacity .2s;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">Post</button>
        </div>`;

    // Scroll comments to bottom
    setTimeout(() => {
        const list = document.getElementById('postDetailCommentsList');
        if (list) list.scrollTop = list.scrollHeight;
    }, 50);
}

async function addPostDetailComment(postId) {
    const input = document.getElementById('postDetailCommentInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await addComment(postId, text);
    // Re-render side panel with updated post
    const post = posts.find(p => String(p.id) === String(postId));
    const sideEl = document.getElementById('postDetailSide');
    if (post && sideEl) _renderPostDetailSide(sideEl, post);
}

// In-place like/save for post detail (no modal close/reopen)
window._pdToggleLike = async function(postId) {
    const btn = document.getElementById('pd-like-btn-' + postId);
    await toggleLike(postId);
    const post = posts.find(p => String(p.id) === String(postId));
    if (btn && post) {
        btn.style.color = post.liked ? '#e11d48' : 'var(--text-secondary)';
        btn.innerHTML = post.liked ? '❤️ Liked' : '🤍 Like';
    }
    // Update meta count
    const metaEl = document.querySelector('#postDetailSide [style*="text-muted"][style*="border-bottom"]');
    if (metaEl && post) metaEl.innerHTML = `❤️ ${post.likes} likes &nbsp;•&nbsp; 💬 ${(post.comments||[]).length} comments${post.shares ? ` &nbsp;•&nbsp; 🔗 ${post.shares} shares` : ''}`;
};
window._pdToggleSave = async function(postId) {
    const btn = document.getElementById('pd-save-btn-' + postId);
    await toggleSave(postId);
    const post = posts.find(p => String(p.id) === String(postId));
    if (btn && post) { btn.innerHTML = post.saved ? '🔖 Saved' : '📑 Save'; }
};

function closePostDetail() {
    const modal = document.getElementById('postDetailModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    if (document._postDetailKeyHandler) {
        document.removeEventListener('keydown', document._postDetailKeyHandler);
        document._postDetailKeyHandler = null;
    }
}

// ============================================
// VIEW ANY BREEDER PROFILE (from post header)
// ============================================

async function _legacyOpenBreederProfile(userId) {
    // If it's the current user's own profile, just scroll to top
    if (userId && String(userId) === String(currentUserId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    let modal = document.getElementById('breederProfileModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'breederProfileModal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:3000;align-items:center;justify-content:center;overflow:hidden;';
        modal.innerHTML = `
            <div style="max-width:520px;width:min(92%, 520px);height:clamp(70vh, 88vh, 92vh);background:var(--surface-white);border-radius:24px;overflow:hidden;position:relative;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,0.4);">
                <style>
                @media (max-width: 400px) {
                    #breederProfileModal > div { border-radius: 18px !important; width: 96% !important; }
                }
                @media (max-width: 320px) {
                    #breederProfileModal > div { border-radius: 14px !important; width: 98% !important; }
                }
                </style>
                <!-- Sticky header with close button — never scrolls away -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-light);flex-shrink:0;background:var(--surface-white);z-index:2;">
                    <span style="font-weight:700;font-size:15px;color:var(--text-primary);">Breeder Profile</span>
                    <button onclick="_legacyCloseBreederProfile()" style="background:#f3f4f6;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;transition:background .2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">×</button>
                </div>
                <!-- Scrollable content area -->
                <div id="breederProfileContent" style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;"></div>
            </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) _legacyCloseBreederProfile(); });
        document.body.appendChild(modal);
    }

    const content = document.getElementById('breederProfileContent');
    content.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-muted);">Loading profile...</div>';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
        const currentUser = User.getUser();
        const [profileRes, animalsRes, ratingsRes, postsRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
            window.supabase.from('profiles').select('id,name,profile_picture,cover_photo,bio,account_type,is_verified,location,contact,tags,stats,username').eq('id', userId).single(),
            window.supabase.from('animals').select('id,name,breed,species,image_url,status,user_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
            window.supabase.from('ratings').select('id,rater_id,rated_user_id,rating,comment,created_at,updated_at').eq('rated_user_id', userId),
            window.supabase.from('posts').select('id,user_id,text,images,likes,shares,comments,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
            window.supabase.from('follows').select('follower_id').eq('following_id', userId).eq('status', 'accepted'),
            window.supabase.from('follows').select('following_id').eq('follower_id', userId).eq('status', 'accepted'),
            currentUser ? window.supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).eq('status', 'accepted') : Promise.resolve({ data: [] })
        ]);

        const profile = profileRes.data;
        const animals = animalsRes.data || [];
        const ratings = ratingsRes.data || [];
        const breederPosts = postsRes.data || [];
        const followersCount = (followersRes.data || []).length;
        const followingCount = (followingRes.data || []).length;
        let isFollowing = (isFollowingRes.data || []).length > 0;
        const avgRating = ratings.length > 0
            ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
            : null;

        if (!profile) {
            content.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-muted);">Profile not found</div>';
            return;
        }

        const coverImg = profile.cover_photo || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200';
        const avatarImg = profile.profile_picture || '';
        const name = profile.name || 'Unknown Breeder';
        const bio = profile.bio || '';
        const contact = profile.contact || {};
        const accountType = (profile.account_type || 'breeder').toUpperCase();
        const location = contact.location || profile.location || '';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        // Avatar: use image if available, else colored initials circle
        const avatarHtml = avatarImg
            ? `<img class="bp-avatar" src="${escapeHtml(avatarImg)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" style="width:72px;height:72px;border-radius:50%;border:3px solid white;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
               <div class="bp-avatar-fallback" style="display:none;width:72px;height:72px;border-radius:50%;border:3px solid white;background:var(--green-primary);align-items:center;justify-content:center;font-size:24px;font-weight:800;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.15);">${escapeHtml(initials)}</div>`
            : `<div class="bp-avatar-fallback" style="width:72px;height:72px;border-radius:50%;border:3px solid white;background:var(--green-primary);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.15);">${escapeHtml(initials)}</div>`;

        // Build action buttons
        const isOwnProfile = currentUser && currentUser.id === userId;
        const followBtnHtml = !isOwnProfile && currentUser ? `
            <button id="bpFollowBtn" onclick="window._bpToggleFollow('${escapeHtml(String(userId))}')"
                class="bp-action-btn"
                style="padding:7px 16px;background:${isFollowing ? '#f3f4f6' : 'transparent'};color:${isFollowing ? 'var(--text-primary)' : 'var(--text-primary)'};border:1.5px solid ${isFollowing ? '#d1d5db' : '#d1d5db'};border-radius:50px;font-weight:600;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:5px;transition:all .2s;">
                ${isFollowing ? '✓ Following' : '+ Follow'}
            </button>` : '';
        const rateBtnHtml = !isOwnProfile && currentUser ? `
            <button onclick="typeof openRateModal !== 'undefined' ? openRateModal('${escapeHtml(String(userId))}', '${escapeHtml(name)}') : null"
                class="bp-action-btn"
                style="padding:7px 16px;background:transparent;color:#d97706;border:1.5px solid #fde68a;border-radius:50px;font-weight:600;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:5px;">
                ★ Rate
            </button>` : '';
        const msgBtnHtml = !isOwnProfile && currentUser ? `
            <button onclick="_legacyCloseBreederProfile(); messageBreederFromProfile('${escapeHtml(String(userId))}', '${escapeHtml(name)}', '${escapeHtml(avatarImg)}')"
                class="bp-msg-btn"
                style="width:36px;height:36px;background:#1d4ed8;color:white;border:none;border-radius:50%;font-weight:600;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(29,78,216,0.3);">
                💬
            </button>` : '';

        // Tabs state — default to Posts
        const tabsId = 'bpTabs_' + userId;
        const tabContentId = 'bpTabContent_' + userId;

        // Render posts tab content
        function renderBPPosts(posts) {
            if (!posts.length) return '<div style="padding:40px 0;text-align:center;color:var(--text-muted);font-size:14px;">No posts yet</div>';
            return posts.map(p => {
                const imgs = p.images || [];
                const count = imgs.length;
                let gridHtml = '';
                if (count > 0) {
                    const cols = count === 1 ? '1fr' : count === 2 ? '1fr 1fr' : 'repeat(2,1fr)';
                    gridHtml = `<div style="display:grid;grid-template-columns:${cols};gap:3px;border-radius:10px;overflow:hidden;margin-bottom:8px;cursor:pointer;" onclick="openBPPostDetail('${userId}','${p.id}',${JSON.stringify(imgs).replace(/"/g,'&quot;')})">
                        ${imgs.slice(0,4).map((img,i) => {
                            const overlay = count > 4 && i === 3 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:800;">+${count-4}</div>` : '';
                            return `<div style="position:relative;overflow:hidden;background:#000;${count===3&&i===0?'grid-row:span 2;':''}">
                                <img src="${escapeHtml(img)}" style="width:100%;height:${count===1?'auto':'160px'};max-height:${count===1?'280px':'180px'};object-fit:${count===1?'contain':'cover'};display:block;" onerror="this.parentElement.style.display='none'">${overlay}</div>`;
                        }).join('')}
                    </div>`;
                }
                const postComments = p.comments || [];
                return `<div style="background:var(--bg-secondary);border-radius:14px;padding:14px;margin-bottom:12px;">
                    ${p.text ? `<div style="font-size:13px;color:var(--text-primary);line-height:1.65;margin-bottom:8px;white-space:pre-wrap;cursor:pointer;" onclick="openBPPostDetail('${userId}','${p.id}',${JSON.stringify(imgs).replace(/"/g,'&quot;')})">${escapeHtml(p.text)}</div>` : ''}
                    ${gridHtml}
                    <div style="font-size:11px;color:var(--text-muted);">❤️ ${p.likes||0} • 💬 ${postComments.length} • ${formatDate(p.created_at)}</div>
                </div>`;
            }).join('');
        }

        function renderBPAnimals(anims) {
            if (!anims.length) return '<div style="padding:40px 0;text-align:center;color:var(--text-muted);font-size:14px;">No animals listed</div>';
            return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">
                ${anims.map(a => `
                    <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border-light);background:var(--surface-white);">
                        <img src="${a.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'}"
                            onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'"
                            style="width:100%;height:90px;object-fit:cover;">
                        <div style="padding:8px 6px 4px;font-size:12px;font-weight:700;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.name)}</div>
                        <div style="padding:0 6px 8px;font-size:11px;text-align:center;color:var(--text-muted);">${escapeHtml(a.breed)}</div>
                    </div>
                `).join('')}
            </div>`;
        }

        function renderBPReviews(revs) {
            if (!revs.length) return '<div style="padding:40px 0;text-align:center;color:var(--text-muted);font-size:14px;">No reviews yet</div>';
            return revs.map(r => `
                <div style="padding:14px;background:var(--bg-secondary);border-radius:12px;margin-bottom:10px;">
                    <div style="margin-bottom:6px;">${[1,2,3,4,5].map(i=>`<span style="color:${i<=r.rating?'#f59e0b':'#d1d5db'};font-size:16px;">★</span>`).join('')}</div>
                    ${r.comment ? `<div style="font-size:13px;color:var(--text-secondary);line-height:1.6;word-wrap:break-word;">${escapeHtml(r.comment)}</div>` : ''}
                </div>
            `).join('');
        }

        content.innerHTML = `
            <style>
                .bp-cover { height: clamp(110px, 30vw, 160px); }
                .bp-avatar-wrap { margin-top: clamp(-28px, -7vw, -36px); }
                .bp-avatar, .bp-avatar-fallback {
                    width: clamp(56px, 14vw, 72px) !important;
                    height: clamp(56px, 14vw, 72px) !important;
                    font-size: clamp(16px, 4vw, 24px) !important;
                }
                @media (max-width: 400px) {
                    .bp-cover { height: 110px; }
                    .bp-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
                    .bp-tabs button { padding: 8px 8px !important; font-size: 11px !important; }
                    .bp-action-btn { padding: 6px 10px !important; font-size: 12px !important; }
                    .bp-msg-btn { width: 30px !important; height: 30px !important; font-size: 14px !important; }
                }
                @media (max-width: 320px) {
                    .bp-cover { height: 90px; }
                    .bp-avatar, .bp-avatar-fallback { width: 50px !important; height: 50px !important; font-size: 14px !important; }
                    .bp-avatar-wrap { margin-top: -24px; }
                    .bp-header { padding: 0 12px 0 !important; }
                    .bp-tab-content { padding: 12px 12px 20px !important; }
                }
            </style>
            <!-- Cover -->
            <div class="bp-cover" style="background:url('${escapeHtml(coverImg)}') center/cover no-repeat;width:100%;flex-shrink:0;"></div>

            <!-- Profile header -->
            <div class="bp-header" style="padding:0 18px 0;">
                <!-- Avatar row -->
                <div class="bp-avatar-wrap" style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:14px;">
                    <div style="display:flex;align-items:flex-end;">
                        ${avatarHtml}
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;padding-bottom:4px;">
                        ${followBtnHtml}
                        ${rateBtnHtml}
                        ${msgBtnHtml}
                    </div>
                </div>

                <!-- Name + badge + location -->
                <div style="font-size:20px;font-weight:800;color:var(--text-primary);margin-bottom:6px;">${escapeHtml(name)}</div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
                    <span style="background:var(--green-light);color:var(--green-primary);padding:3px 10px;border-radius:50px;font-size:11px;font-weight:700;letter-spacing:.5px;">${escapeHtml(accountType)}</span>
                    ${location ? `<span style="color:var(--text-muted);font-size:13px;display:flex;align-items:center;gap:4px;">📍 ${escapeHtml(location)}</span>` : ''}
                </div>

                <!-- Stats row -->
                <div class="bp-stat-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
                    ${[
                        { n: animals.length, l: 'Animals' },
                        { n: followersCount, l: 'Followers' },
                        { n: followingCount, l: 'Following' },
                        { n: breederPosts.length, l: 'Posts' }
                    ].map(s => `
                        <div style="text-align:center;padding:12px 6px;border-radius:16px;background:var(--surface-white);border:1px solid var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                            <div style="font-size:18px;font-weight:800;color:var(--green-primary);">${s.n}</div>
                            <div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.4px;font-weight:600;">${s.l}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Rating banner -->
                ${avgRating ? `
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;cursor:pointer;" onclick="document.getElementById('bpTab_reviews_${userId}').click()">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="color:#f59e0b;font-size:16px;white-space:nowrap;">${[1,2,3,4,5].map(i=>`<span style="color:${i<=Math.round(parseFloat(avgRating))?'#f59e0b':'#d1d5db'};">★</span>`).join('')}</span>
                        <span style="font-size:16px;font-weight:800;color:#92400e;white-space:nowrap;">${avgRating}</span>
                        <span style="font-size:12px;color:#b45309;white-space:nowrap;">(${ratings.length} review${ratings.length!==1?'s':''})</span>
                    </div>
                    <span style="font-size:12px;color:#b45309;font-weight:600;white-space:nowrap;">tap to view →</span>
                </div>` : ''}

                <!-- Bio -->
                ${bio ? `<div style="color:var(--text-secondary);font-size:14px;line-height:1.7;margin-bottom:14px;word-wrap:break-word;">${escapeHtml(bio)}</div>` : ''}

                <!-- Contact -->
                ${(contact.email || contact.phone) ? `
                <div style="background:var(--surface-white);border:1px solid var(--border-light);border-radius:14px;padding:10px 14px;margin-bottom:14px;">
                    ${contact.email ? `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text-secondary);"><span style="font-size:15px;">📧</span> ${escapeHtml(contact.email)}</div>` : ''}
                    ${contact.phone ? `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text-secondary);"><span style="font-size:15px;">📱</span> ${escapeHtml(contact.phone)}</div>` : ''}
                </div>` : ''}
            </div>

            <!-- Tabs -->
            <div class="bp-tabs" style="display:flex;border-bottom:2px solid var(--border-light);margin:0 18px;overflow-x:auto;gap:0;flex-shrink:0;" id="${tabsId}">
                ${[
                    { id: 'posts', icon: '📋', label: `Posts (${breederPosts.length})` },
                    { id: 'animals', icon: '🐾', label: `Animals (${animals.length})` },
                    { id: 'followers', icon: '👥', label: 'Followers' },
                    { id: 'following', icon: '➕', label: 'Following' },
                    { id: 'reviews', icon: '★', label: `Reviews (${ratings.length})` }
                ].map((t, i) => `
                    <button id="bpTab_${t.id}_${userId}" onclick="window._bpSwitchTab('${userId}','${t.id}')"
                        style="padding:10px 12px;border:none;background:none;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;color:${i===0?'var(--green-primary)':'var(--text-muted)'};border-bottom:${i===0?'2px solid var(--green-primary)':'2px solid transparent'};margin-bottom:-2px;transition:all .2s;">
                        ${t.icon} ${t.label}
                    </button>
                `).join('')}
            </div>

            <!-- Tab content -->
            <div class="bp-tab-content" id="${tabContentId}" style="padding:16px 18px 24px;">
                ${renderBPPosts(breederPosts)}
            </div>
        `;

        // Follow toggle helper
        window._bpToggleFollow = async function(uid) {
            const btn = document.getElementById('bpFollowBtn');
            if (!btn) return;
            btn.disabled = true;
            try {
                if (isFollowing) {
                    await User.unfollowUser(uid);
                    isFollowing = false;
                    btn.innerHTML = '+ Follow';
                    btn.style.background = 'transparent';
                    btn.style.borderColor = '#d1d5db';
                } else {
                    await User.followUser(uid);
                    isFollowing = true;
                    btn.innerHTML = '✓ Following';
                    btn.style.background = '#f3f4f6';
                }
            } catch(e) { console.error(e); }
            btn.disabled = false;
        };

        // Tab switching helper
        window._bpSwitchTab = async function(uid, tabId) {
            const tabsEl = document.getElementById(`bpTabs_${uid}`);
            const contentEl = document.getElementById(`bpTabContent_${uid}`);
            if (!tabsEl || !contentEl) return;
            // Update tab styles
            ['posts','animals','followers','following','reviews'].forEach(t => {
                const btn = document.getElementById(`bpTab_${t}_${uid}`);
                if (!btn) return;
                const active = t === tabId;
                btn.style.color = active ? 'var(--green-primary)' : 'var(--text-muted)';
                btn.style.borderBottom = active ? '2px solid var(--green-primary)' : '2px solid transparent';
            });
            contentEl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading…</div>';
            if (tabId === 'posts') {
                contentEl.innerHTML = renderBPPosts(breederPosts);
            } else if (tabId === 'animals') {
                contentEl.innerHTML = renderBPAnimals(animals);
            } else if (tabId === 'reviews') {
                contentEl.innerHTML = renderBPReviews(ratings);
            } else if (tabId === 'followers' || tabId === 'following') {
                try {
                    let userIds;
                    if (tabId === 'followers') {
                        const { data } = await window.supabase.from('follows').select('follower_id').eq('following_id', uid).eq('status','accepted');
                        userIds = (data||[]).map(r=>r.follower_id);
                    } else {
                        const { data } = await window.supabase.from('follows').select('following_id').eq('follower_id', uid).eq('status','accepted');
                        userIds = (data||[]).map(r=>r.following_id);
                    }
                    if (!userIds.length) { contentEl.innerHTML = `<div style="padding:40px 0;text-align:center;color:var(--text-muted);font-size:14px;">No ${tabId} yet</div>`; return; }
                    const { data: profiles } = await window.supabase.from('profiles').select('id,name,profile_picture,account_type,location').in('id',userIds);
                    const profileMap = {};
                    (profiles||[]).forEach(p => profileMap[p.id] = p);
                    const cards = userIds.map(uid2 => {
                        const p = profileMap[uid2] || {};
                        const ini = (p.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
                        const avatarEl = p.profile_picture
                            ? `<img src="${escapeHtml(p.profile_picture)}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;display:block;" onerror="this.parentNode.innerHTML='<span style=\\'font-size:18px;font-weight:700;color:#6b7280;display:flex;align-items:center;justify-content:center;height:100%;\\'>'+${JSON.stringify(ini)}+'</span>'">`
                            : `<span style="font-size:18px;font-weight:700;color:#6b7280;display:flex;align-items:center;justify-content:center;height:100%;">${escapeHtml(ini)}</span>`;
                        const locStr = p.location ? (p.account_type ? ' · ' : '') + '📍 ' + escapeHtml(p.location) : '';
                        return `<div data-bp-follow-uid="${escapeHtml(uid2)}"
                            style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;cursor:pointer;transition:background .15s;margin-bottom:8px;"
                            onmouseover="this.style.background='#f0fdf4';this.style.borderColor='#bbf7d0';"
                            onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';">
                          <div style="width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#e5e7eb;">${avatarEl}</div>
                          <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:700;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.name||'Unknown')}</div>
                            <div style="font-size:11px;color:#6b7280;margin-top:1px;">${p.account_type ? escapeHtml(p.account_type) : ''}${locStr}</div>
                          </div>
                          <span style="font-size:12px;color:#2E6B4E;font-weight:600;flex-shrink:0;">View →</span>
                        </div>`;
                    }).join('');
                    contentEl.innerHTML = `<div style="padding-bottom:8px;">${cards}</div>`;
                    contentEl.onclick = function(ev) {
                        const card = ev.target.closest('[data-bp-follow-uid]');
                        if (!card) return;
                        const uid2 = card.dataset.bpFollowUid;
                        if (uid2) openBreederProfile(uid2);
                    };
                } catch(e) { contentEl.innerHTML = '<div style="padding:40px 0;text-align:center;color:var(--text-muted);">Failed to load</div>'; }
            }
        };
    } catch (err) {
        console.error('openBreederProfile error:', err);
        content.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-muted);">Failed to load profile</div>';
    }
}

async function addBreederPostComment(userId, postId, overrideText) {
    const input = document.getElementById(`bp-comment-input-${postId}`);
    const text = overrideText || (input ? input.value.trim() : '');
    if (!text) return;
    const user = User.getUser();
    if (!user) { showToast('Please sign in to comment', 'error'); return; }
    try {
        const { data: postData } = await window.supabase.from('posts').select('id,user_id,text,images,likes,shares,comments,created_at').eq('id', postId).single();
        if (!postData) { showToast('Post not found', 'error'); return; }
        const newComment = {
            id: Date.now(),
            user_id: user.id,
            author: profileData.name || user.email,
            authorImg: profileData.profileImg || '',
            text: text,
            created_at: new Date().toISOString()
        };
        const updatedComments = [...(postData.comments || []), newComment];
        await updatePostPublic(postId, { comments: updatedComments });
        if (input) input.value = '';
        showToast('Comment added! 💬');
        if (!overrideText) openBreederProfile(userId); // only re-render modal if not from detail panel
    } catch (err) {
        console.error('addBreederPostComment error:', err);
        showToast('Failed to add comment', 'error');
    }
}

function _legacyCloseBreederProfile() {
    const modal = document.getElementById('breederProfileModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}


// ============================================
// SAVE ALL PROFILE
// ============================================
async function saveAllProfile() {
    try {
        const user = User.getUser();
        if (!user) { showToast('Not signed in', 'error'); return; }

        showToast('Saving profile...');

        const updates = {
            name: profileData.name,
            bio: profileData.bio,
            tags: profileData.tags,
            contact: profileData.contact,
            stats: profileData.stats,
            location: profileData.contact?.location || profileData.location || ''
        };
        if (profileData.profileImg) updates.profilePicture = profileData.profileImg;
        if (profileData.coverImg) updates.coverPhoto = profileData.coverImg;

        await User.updateUser(updates);
        showToast('Profile saved! ✓');
    } catch (err) {
        console.error('saveAllProfile error:', err);
        showToast('Failed to save: ' + err.message, 'error');
    }
}

// ============================================
// SAVED POSTS PANEL — loads from Supabase
// ============================================
let _savedPostsCache = null; // { rows: [...] } — cleared when panel closes
let _savedLikedIds = new Set(); // which saved posts the current user has liked
Object.defineProperty(window, '_savedPostsCache', { get: () => _savedPostsCache, set: v => { _savedPostsCache = v; } });

function openSavedPostsPanel() {
    const panel = document.getElementById('savedPostsPanel');
    if (!panel) return;
    panel.style.display = 'block';
    document.body.style.overflow = 'hidden';
    _savedPostsCache = null; // Fresh load when opening
    renderSavedPosts();
}

function closeSavedPostsPanel() {
    const panel = document.getElementById('savedPostsPanel');
    if (panel) { panel.style.display = 'none'; document.body.style.overflow = ''; }
    _savedPostsCache = null;
}

async function renderSavedPosts() {
    const list = document.getElementById('savedPostsList');
    if (!list) return;

    try {
        const user = User.getUser();
        if (!user) { list.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text-muted);">Not signed in</div>'; return; }

        let rows;
        if (_savedPostsCache) {
            rows = _savedPostsCache.rows;
        } else {
            list.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text-muted);"><div style="font-size:28px;margin-bottom:8px;">🔖</div><p>Loading saved posts…</p></div>';
            // Fetch from Supabase saved_posts table joined with posts and poster profile (include comments)
            const { data, error } = await window.supabase
                .from('saved_posts')
                .select('post_id, posts:post_id(id, text, images, likes, shares, comments, created_at, user_id, profiles:user_id(id, name, profile_picture))')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            rows = (data || []).filter(r => r.posts);
            _savedPostsCache = { rows };
        }
        if (!rows.length) {
            list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);"><div style="font-size:36px;margin-bottom:10px;">🔖</div><p>No saved posts yet.<br>Tap the bookmark icon on posts to save them.</p></div>';
            return;
        }

        // Fetch which saved posts the current user has already liked
        const savedPostIds = rows.map(r => String(r.posts.id));
        try {
            const { data: likeData } = await window.supabase
                .from('likes').select('post_id').eq('user_id', user.id).in('post_id', savedPostIds);
            _savedLikedIds = new Set((likeData || []).map(l => String(l.post_id)));
        } catch(_) { _savedLikedIds = new Set(); }

        list.innerHTML = rows.map(row => {
            const post = row.posts;
            const poster = post.profiles || {};
            const imgs = post.images || [];
            const comments = post.comments || [];
            const av = escapeHtml(poster.profile_picture || '');
            const name = escapeHtml(poster.name || 'User');
            const savedUser = User.getUser();
            const renderSavedComment = (c, postId) => `
              <div id="saved-cmt-${c.id}" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--border-light);display:flex;align-items:center;justify-content:center;">
                  ${c.authorImg ? `<img src="${escapeHtml(c.authorImg)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.textContent='${escapeHtml((c.author||'?').charAt(0))}'">` : `<span style="font-size:12px;font-weight:700;color:#6b7280;">${escapeHtml((c.author||'?').charAt(0))}</span>`}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="background:#f3f4f6;border-radius:12px;padding:6px 10px;">
                    <span style="font-size:12px;font-weight:700;color:var(--text-primary);display:block;">${escapeHtml(c.author||'User')}</span>
                    <span style="font-size:12px;color:var(--text-secondary);word-break:break-word;">${escapeHtml(c.text||'')}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;margin-top:3px;padding-left:4px;">
                    <button onclick="toggleSavedCommentLike(${postId},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">
                      ${(c.likedBy||[]).includes(savedUser?.id)?'❤️':'🤍'} ${c.likes||0}
                    </button>
                    <button onclick="toggleSavedCommentReply(${postId},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">Reply</button>
                    ${savedUser && String(c.user_id) === String(savedUser.id) ? `<button onclick="deleteSavedComment(${postId},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
                  </div>
                  <div id="reply-input-${c.id}" style="display:none;margin-top:6px;gap:6px;flex-direction:row;">
                    <input type="text" id="reply-text-${c.id}" placeholder="Write a reply…" style="flex:1;padding:6px 10px;border:1.5px solid var(--border-light);border-radius:50px;font-size:12px;outline:none;" onkeypress="if(event.key==='Enter') addSavedCommentReply(${postId},'${c.id}')">
                    <button onclick="addSavedCommentReply(${postId},'${c.id}')" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">Reply</button>
                  </div>
                  ${(c.replies||[]).length>0?`<div style="margin-top:6px;margin-left:8px;">${(c.replies||[]).map(r=>`<div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start;"><div style="width:22px;height:22px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--border-light);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#6b7280;">${r.authorImg?`<img src="${escapeHtml(r.authorImg)}" style="width:100%;height:100%;object-fit:cover;">`:escapeHtml((r.author||'?').charAt(0))}</div><div style="background:#e9f5ee;border-radius:10px;padding:5px 9px;flex:1;"><span style="font-size:11px;font-weight:700;color:var(--green-primary);">${escapeHtml(r.author||'User')}</span><span style="font-size:11px;color:var(--text-secondary);display:block;">${escapeHtml(r.text||'')}</span></div>${savedUser&&String(r.user_id)===String(savedUser.id)?`<button onclick="deleteSavedReply(${postId},'${c.id}','${r.id}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:#ef4444;padding:0;align-self:center;">✕</button>`:''}</div>`).join('')}</div>`:''
                }
                </div>
              </div>`;
            // ── image grid (mirrors regular post grid) ──────────────────
            const count = imgs.length;
            let imagesHtml = '';
            if (count > 0) {
                const gridCols = count === 1 ? '1fr' : count === 2 ? '1fr 1fr' : count === 3 ? '2fr 1fr' : 'repeat(2,1fr)';
                const cellHeight = count === 1 ? 'auto' : '180px';
                const maxH = count === 1 ? '360px' : '200px';
                const objFit = count === 1 ? 'contain' : 'cover';
                const bg = count === 1 ? '#000' : 'var(--bg-secondary)';
                imagesHtml = `
                <div style="display:grid;gap:4px;grid-template-columns:${gridCols};border-radius:12px;overflow:hidden;margin-bottom:10px;cursor:pointer;" onclick="openSavedPostDetail(${post.id})">
                    ${imgs.slice(0, 4).map((img, idx) => {
                        const span = count === 3 && idx === 0 ? 'grid-row:span 2;' : '';
                        const overlay = count > 4 && idx === 3 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:800;">+${count - 4}</div>` : '';
                        return `<div style="position:relative;overflow:hidden;background:${bg};${span}">
                            <img src="${escapeHtml(img)}" style="width:100%;height:${cellHeight};max-height:${maxH};object-fit:${objFit};display:block;" loading="lazy" onerror="this.parentElement.style.display='none'">
                            ${overlay}
                        </div>`;
                    }).join('')}
                </div>`;
            }
            // ── like state for this saved post ──────────────────────────
            const currentUser = User.getUser();
            const isLiked = _savedLikedIds.has(String(post.id));
            return `
        <div style="background:var(--bg-secondary);border-radius:14px;padding:14px;margin-bottom:12px;">
          <!-- Header -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer;" onclick="openSavedPostDetail(${post.id})">
              <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--border-light);display:flex;align-items:center;justify-content:center;">
                ${av ? `<img src="${av}" onerror="this.parentNode.textContent='${name.charAt(0)}'" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:15px;font-weight:700;color:#6b7280;">${name.charAt(0)}</span>`}
              </div>
              <div style="min-width:0;">
                <div style="font-size:13px;font-weight:700;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
                <div style="font-size:11px;color:var(--text-muted);">${formatDate(post.created_at)}</div>
              </div>
            </div>
            <button onclick="unsavePost(${post.id})" style="background:#fff1f0;color:#d64242;border:none;border-radius:50px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">✕ Unsave</button>
          </div>
          <!-- Post text -->
          ${post.text ? `<div style="font-size:13px;color:var(--text-primary);line-height:1.65;margin-bottom:10px;white-space:pre-wrap;cursor:pointer;" onclick="openSavedPostDetail(${post.id})">${escapeHtml(post.text)}</div>` : ''}
          <!-- Images grid -->
          ${imagesHtml}
          <!-- Meta -->
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">❤️ ${post.likes || 0} likes • 💬 ${comments.length} comments${post.shares ? ` • 🔗 ${post.shares} shares` : ''}</div>
          <!-- Action buttons -->
          <div style="display:flex;gap:0;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);margin-bottom:10px;">
            <button id="sp-like-btn-${post.id}" onclick="toggleSavedPostLike(${post.id})" style="flex:1;padding:9px 4px;background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:${isLiked ? '#e11d48' : 'var(--text-secondary)'};border-right:1px solid var(--border-light);transition:background .15s;" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='none'">
              ${isLiked ? '❤️ Liked' : '🤍 Like'}
            </button>
            <button onclick="openSavedPostDetail(${post.id})" style="flex:1;padding:9px 4px;background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-secondary);border-right:1px solid var(--border-light);transition:background .15s;" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='none'">
              💬 Comment
            </button>
            <button onclick="unsavePost(${post.id})" style="flex:1;padding:9px 4px;background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:#d97706;border-right:1px solid var(--border-light);transition:background .15s;" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='none'">
              🔖 Unsave
            </button>
            <button onclick="sharePost(${post.id})" style="flex:1;padding:9px 4px;background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-secondary);transition:background .15s;" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='none'">
              🔗 Share
            </button>
          </div>
          <!-- See comments shortcut -->
          ${comments.length > 0 ? `<button onclick="openSavedPostDetail(${post.id})" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--green-primary);font-weight:600;padding:0 0 8px;display:block;">💬 See Comments (${comments.length})</button>` : ''}
        </div>`;
        }).join('');
    } catch (err) {
        console.error('renderSavedPosts error:', err);
        list.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text-muted);">Failed to load saved posts</div>';
    }
}

async function addSavedPostComment(postId) {
    const input = document.getElementById(`saved-comment-input-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const user = User.getUser();
    if (!user) { showToast('Please sign in to comment', 'error'); return; }

    // Find post in local posts array, or fetch from supabase
    let post = posts.find(p => p.id === postId || String(p.id) === String(postId));
    try {
        if (!post) {
            const { data } = await window.supabase.from('posts').select('id,user_id,text,images,likes,shares,comments,created_at').eq('id', postId).single();
            post = data;
        }
        if (!post) { showToast('Post not found', 'error'); return; }
        const newComment = {
            id: Date.now(),
            user_id: user.id,
            author: profileData.name || user.email,
            authorImg: profileData.profileImg || '',
            text: text,
            created_at: new Date().toISOString()
        };
        const updatedComments = [...(post.comments || []), newComment];
        await updatePostPublic(postId, { comments: updatedComments });
        post.comments = updatedComments;
        input.value = '';
        showToast('Comment added! 💬');
        _savedPostsCache = null; // force re-fetch so new comment shows
        renderSavedPosts();
    } catch (err) {
        console.error('addSavedPostComment error:', err);
        showToast('Failed to add comment', 'error');
    }
}

async function unsavePost(postId) {

    try {
        const user = User.getUser();
        if (!user) return;
        await window.supabase
            .from('saved_posts')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', postId);
        // Also update local posts array if visible
        const post = posts.find(p => p.id === postId || String(p.id) === String(postId));
        if (post) { post.saved = false; renderPosts(); }
        // Remove from local cache so panel updates instantly without re-fetch
        if (_savedPostsCache) {
            _savedPostsCache.rows = _savedPostsCache.rows.filter(r => String(r.post_id) !== String(postId));
        }
        renderSavedPosts();
        showToast('Post unsaved');
    } catch (err) {
        console.error('unsavePost error:', err);
        showToast('Failed to unsave', 'error');
    }
}

// ── Open the full post-detail modal for a saved post ─────────────
// Saved posts may belong to other users and won't be in the local
// `posts[]` array. We bridge that by temporarily injecting the post
// data so openPostDetail() (and all its edit/delete/like/comment
// logic) works exactly the same as for owned posts.
async function openSavedPostDetail(postId) {
    // Check if it's already in the posts array (own post that was saved)
    let found = posts.find(p => String(p.id) === String(postId));
    if (!found) {
        // Not in local array — fetch fresh from Supabase
        try {
            const user = User.getUser();
            const [postRes, likeRes, savedRes] = await Promise.all([
                window.supabase
                    .from('posts')
                    .select('*, profiles:user_id(name, profile_picture)')
                    .eq('id', postId)
                    .single(),
                user ? window.supabase.from('likes').select('post_id').eq('user_id', user.id).eq('post_id', postId) : Promise.resolve({ data: [] }),
                user ? window.supabase.from('saved_posts').select('post_id').eq('user_id', user.id).eq('post_id', postId) : Promise.resolve({ data: [] })
            ]);
            if (postRes.error || !postRes.data) { showToast('Could not load post', 'error'); return; }
            const p = postRes.data;
            found = {
                id: p.id,
                user_id: p.user_id,
                text: p.text,
                images: p.images || [],
                likes: p.likes || 0,
                liked: (likeRes.data || []).length > 0,
                saved: (savedRes.data || []).length > 0,
                comments: p.comments || [],
                created_at: p.created_at,
                author: p.profiles?.name || 'User',
                authorImg: p.profiles?.profile_picture || ''
            };
            // Temporarily inject so openPostDetail can find it
            posts.push(found);
        } catch (err) {
            console.error('openSavedPostDetail fetch error:', err);
            showToast('Could not load post', 'error');
            return;
        }
    }
    // Close the saved panel first so the detail modal sits on top cleanly
    closeSavedPostsPanel();
    openPostDetail(found.id);
}

async function toggleSavedPostLike(postId) {
    const user = User.getUser();
    if (!user) { showToast('Sign in to like posts', 'error'); return; }
    const btn = document.getElementById('sp-like-btn-' + postId);
    const alreadyLiked = _savedLikedIds.has(String(postId));
    try {
        // Get current likes count from cache
        const row = _savedPostsCache?.rows?.find(r => String(r.posts.id) === String(postId));
        const currentLikes = row?.posts?.likes || 0;
        if (alreadyLiked) {
            await window.supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
            await window.supabase.rpc('decrement_post_likes', { post_id: postId });
            _savedLikedIds.delete(String(postId));
            if (row) row.posts.likes = Math.max(0, currentLikes - 1);
        } else {
            const { error } = await window.supabase.from('likes').insert({ user_id: user.id, post_id: postId });
            if (error && error.code !== '23505') throw error;
            await window.supabase.rpc('increment_post_likes', { post_id: postId });
            _savedLikedIds.add(String(postId));
            if (row) row.posts.likes = currentLikes + 1;
        }
        // Also sync the local posts[] entry if it exists
        const localPost = posts.find(p => String(p.id) === String(postId));
        if (localPost) { localPost.liked = !alreadyLiked; localPost.likes = row?.posts?.likes ?? localPost.likes; }
        // Update button in-place without full re-render
        if (btn) {
            const nowLiked = _savedLikedIds.has(String(postId));
            btn.style.color = nowLiked ? '#e11d48' : 'var(--text-secondary)';
            btn.textContent = nowLiked ? '❤️ Liked' : '🤍 Like';
        }
        // Refresh meta line (likes count)
        renderSavedPosts();
    } catch (err) {
        console.error('toggleSavedPostLike error:', err);
        showToast('Failed to update like', 'error');
    }
}
function updateAnimalTypeOptions() {
    const category = document.getElementById('animalCategory')?.value?.toLowerCase();
    const petGroup = document.getElementById('animalPetTypeGroup');
    const livestockGroup = document.getElementById('animalLivestockTypeGroup');
    const typeSelect = document.getElementById('animalTypeSelect');

    if (petGroup) petGroup.style.display = (!category || category === 'pet') ? '' : 'none';
    if (livestockGroup) livestockGroup.style.display = (!category || category === 'livestock') ? '' : 'none';
    if (typeSelect) typeSelect.value = '';

    const otherWrapper = document.getElementById('animalTypeOtherWrapper');
    if (otherWrapper) otherWrapper.style.display = 'none';
}

// Watch for "Other" selection in type dropdown
document.addEventListener('DOMContentLoaded', function() {
    const typeSelect = document.getElementById('animalTypeSelect');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            const otherWrapper = document.getElementById('animalTypeOtherWrapper');
            if (otherWrapper) otherWrapper.style.display = this.value === 'Other' ? 'block' : 'none';
        });
    }
});

// openBreederProfile is provided by breeder-profile.js
// window.openBreederProfile = _legacyOpenBreederProfile; // legacy — do not override
// closeBreederProfile is provided by breeder-profile.js
window.saveAllProfile = saveAllProfile;
window.openSavedPostsPanel = openSavedPostsPanel;
window.closeSavedPostsPanel = closeSavedPostsPanel;
window.unsavePost = unsavePost;
window.openSavedPostDetail = openSavedPostDetail;
window.toggleSavedPostLike = toggleSavedPostLike;
window.updateAnimalTypeOptions = updateAnimalTypeOptions;

// ============================================
// SAVED POSTS COMMENT INTERACTIONS
// ============================================

// Storage for which posts have comments expanded
let _savedCmtsExpanded = {};

function toggleSavedCommentsView(postId, totalCount) {
    const list = document.getElementById(`saved-cmts-list-${postId}`);
    const btn = document.getElementById(`saved-cmt-toggle-${postId}`);
    if (!list) return;
    const isHidden = list.style.display === 'none' || list.style.display === '';
    list.style.display = isHidden ? 'block' : 'none';
    if (btn) btn.textContent = isHidden ? `💬 Hide Comments (${totalCount})` : `💬 See Comments (${totalCount})`;
}

function hideSavedComments(postId) {
    const list = document.getElementById(`saved-cmts-list-${postId}`);
    const btn = document.getElementById(`saved-cmt-toggle-${postId}`);
    if (list) list.style.display = 'none';
    if (btn) {
        const inner = document.getElementById(`saved-cmts-inner-${postId}`);
        const count = inner ? inner.children.length : 0;
        btn.textContent = `💬 See Comments (${count})`;
    }
}

async function showMoreSavedComments(postId) {
    // Fetch all comments and render them
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = data?.comments || [];
        const inner = document.getElementById(`saved-cmts-inner-${postId}`);
        const moreBtn = document.getElementById(`saved-more-btn-${postId}`);
        const savedUser = User.getUser();
        if (inner) {
            const renderSC = (c) => `
              <div id="saved-cmt-${c.id}" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--border-light);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#6b7280;">
                  ${c.authorImg ? `<img src="${escapeHtml(c.authorImg)}" style="width:100%;height:100%;object-fit:cover;">` : escapeHtml((c.author||'?').charAt(0))}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="background:#f3f4f6;border-radius:12px;padding:6px 10px;">
                    <span style="font-size:12px;font-weight:700;color:var(--text-primary);display:block;">${escapeHtml(c.author||'User')}</span>
                    <span style="font-size:12px;color:var(--text-secondary);word-break:break-word;">${escapeHtml(c.text||'')}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;margin-top:3px;padding-left:4px;">
                    <button onclick="toggleSavedCommentLike(${postId},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">
                      ${(c.likedBy||[]).includes(savedUser?.id)?'❤️':'🤍'} ${c.likes||0}
                    </button>
                    <button onclick="toggleSavedCommentReply(${postId},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">Reply</button>
                    ${savedUser && String(c.user_id) === String(savedUser.id) ? `<button onclick="deleteSavedComment(${postId},'${c.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
                  </div>
                </div>
              </div>`;
            inner.innerHTML = comments.map(renderSC).join('');
        }
        if (moreBtn) moreBtn.style.display = 'none';
    } catch(err) { console.error('showMoreSavedComments error:', err); }
}

async function toggleSavedCommentLike(postId, commentId) {
    const user = User.getUser();
    if (!user) { showToast('Please sign in', 'error'); return; }
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = data?.comments || [];
        const idx = comments.findIndex(c => String(c.id) === String(commentId));
        if (idx === -1) return;
        const c = comments[idx];
        const likedBy = c.likedBy || [];
        const alreadyLiked = likedBy.includes(user.id);
        if (alreadyLiked) {
            c.likedBy = likedBy.filter(id => id !== user.id);
            c.likes = Math.max(0, (c.likes || 1) - 1);
        } else {
            c.likedBy = [...likedBy, user.id];
            c.likes = (c.likes || 0) + 1;
        }
        comments[idx] = c;
        await updatePostPublic(postId, { comments });
        _savedPostsCache = null; // force re-fetch so updated like count shows
        renderSavedPosts();
    } catch(err) { console.error('toggleSavedCommentLike error:', err); }
}

function toggleSavedCommentReply(postId, commentId) {
    const replyBox = document.getElementById(`reply-input-${commentId}`);
    if (!replyBox) return;
    replyBox.style.display = replyBox.style.display === 'none' || replyBox.style.display === '' ? 'flex' : 'none';
    const inp = document.getElementById(`reply-text-${commentId}`);
    if (inp && replyBox.style.display === 'flex') inp.focus();
}

async function addSavedCommentReply(postId, commentId) {
    const user = User.getUser();
    if (!user) { showToast('Please sign in', 'error'); return; }
    const inp = document.getElementById(`reply-text-${commentId}`);
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = data?.comments || [];
        const idx = comments.findIndex(c => String(c.id) === String(commentId));
        if (idx === -1) return;
        const reply = {
            id: Date.now(),
            user_id: user.id,
            author: profileData.name || user.email,
            authorImg: profileData.profileImg || '',
            text,
            created_at: new Date().toISOString()
        };
        comments[idx].replies = [...(comments[idx].replies || []), reply];
        await updatePostPublic(postId, { comments });
        inp.value = '';
        showToast('Reply added! 💬');
        _savedPostsCache = null; // force re-fetch so new reply shows
        renderSavedPosts();
    } catch(err) { console.error('addSavedCommentReply error:', err); showToast('Failed to add reply', 'error'); }
}

async function deleteSavedComment(postId, commentId) {
    const user = User.getUser();
    if (!user) return;
    if (!confirm('Delete this comment?')) return;
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = (data?.comments || []).filter(c => String(c.id) !== String(commentId));
        await updatePostPublic(postId, { comments });
        showToast('Comment deleted');
        _savedPostsCache = null; // force re-fetch so deleted comment disappears
        renderSavedPosts();
    } catch(err) { console.error('deleteSavedComment error:', err); showToast('Failed to delete', 'error'); }
}

async function deleteSavedReply(postId, commentId, replyId) {
    const user = User.getUser();
    if (!user) return;
    try {
        const { data } = await window.supabase.from('posts').select('comments').eq('id', postId).single();
        const comments = data?.comments || [];
        const idx = comments.findIndex(c => String(c.id) === String(commentId));
        if (idx === -1) return;
        comments[idx].replies = (comments[idx].replies || []).filter(r => String(r.id) !== String(replyId));
        await updatePostPublic(postId, { comments });
        showToast('Reply deleted');
        _savedPostsCache = null; // force re-fetch so deleted reply disappears
        renderSavedPosts();
    } catch(err) { console.error('deleteSavedReply error:', err); }
}

window.toggleSavedCommentsView = toggleSavedCommentsView;
window.hideSavedComments = hideSavedComments;
window.showMoreSavedComments = showMoreSavedComments;
window.toggleSavedCommentLike = toggleSavedCommentLike;
window.toggleSavedCommentReply = toggleSavedCommentReply;
window.addSavedCommentReply = addSavedCommentReply;
window.deleteSavedComment = deleteSavedComment;
window.deleteSavedReply = deleteSavedReply;

// ============================================
// EDIT ANIMAL HELPERS
// ============================================
function updateEditAnimalTypeOptions() {
    const cat = document.getElementById('edit_category')?.value;
    const petGroup = document.getElementById('editPetTypeGroup');
    const livestockGroup = document.getElementById('editLivestockTypeGroup');
    if (!petGroup || !livestockGroup) return;
    if (cat === 'Pet') {
        petGroup.style.display = '';
        livestockGroup.style.display = 'none';
    } else if (cat === 'Livestock') {
        petGroup.style.display = 'none';
        livestockGroup.style.display = '';
    } else {
        petGroup.style.display = '';
        livestockGroup.style.display = '';
    }
}

async function removeAnimalDoc(animalId, docIdx) {
    const animal = animals.find(a => a.id === animalId);
    if (!animal || !animal.health_documents) return;
    if (!confirm('Remove this document?')) return;
    animal.health_documents.splice(docIdx, 1);
    try {
        await window.supabase
            .from('animals')
            .update({ health_documents: animal.health_documents })
            .eq('id', animalId)
            .eq('user_id', currentUserId);
        showToast('Document removed');
        editAnimal(animalId); // re-render edit modal
    } catch (err) {
        showToast('Failed to remove document', 'error');
    }
}

function previewEditDocs(input) {
    const preview = document.getElementById('edit_newDocsPreview');
    if (!preview) return;
    preview.innerHTML = '';
    for (const file of input.files) {
        const span = document.createElement('div');
        span.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#e0f2fe;color:#0369a1;border-radius:50px;font-size:12px;font-weight:600;border:1px solid #7dd3fc;';
        span.textContent = (file.type.includes('image') ? '🖼️ ' : '📄 ') + file.name;
        preview.appendChild(span);
    }
}

window.updateEditAnimalTypeOptions = updateEditAnimalTypeOptions;
window.removeAnimalDoc = removeAnimalDoc;
window.previewEditDocs = previewEditDocs;
window.addSavedPostComment = addSavedPostComment;
window.addBreederPostComment = addBreederPostComment;
window.openBPPostDetail = openBPPostDetail;

// ============================================
// BREEDER PROFILE POST DETAIL (opens over the breeder modal)
// ============================================
function openBPPostDetail(userId, postId, imagesJson) {
    let images = [];
    try { images = typeof imagesJson === 'string' ? JSON.parse(imagesJson.replace(/&quot;/g,'"')) : imagesJson; } catch(e) {}

    let imgIdx = 0;

    // Remove old overlay if present
    const existing = document.getElementById('bpPostDetailOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bpPostDetailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function closeBPPD() {
        overlay.remove();
        document.body.style.overflow = '';
        if (document._bppdKeyHandler) {
            document.removeEventListener('keydown', document._bppdKeyHandler);
            document._bppdKeyHandler = null;
        }
    }

    function renderMedia() {
        const mediaEl = document.getElementById('bppdMedia');
        if (!mediaEl) return;
        if (!images.length) {
            mediaEl.style.background = 'linear-gradient(135deg,var(--green-primary),var(--green-secondary))';
            mediaEl.innerHTML = `<div style="padding:40px;color:white;font-size:20px;font-weight:700;text-align:center;line-height:1.5;">No images</div>`;
            return;
        }
        const prevBtn = images.length > 1 ? `<button id="bppdPrev" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.55);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;line-height:1;">‹</button>` : '';
        const nextBtn = images.length > 1 ? `<button id="bppdNext" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.55);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;line-height:1;">›</button>` : '';
        const dots  = images.length > 1 ? `<div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;">${images.map((_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===imgIdx?'white':'rgba(255,255,255,0.4)'};transition:background .2s;"></div>`).join('')}</div>` : '';
        mediaEl.style.background = '#000';
        mediaEl.innerHTML = `
            <img src="${escapeHtml(images[imgIdx])}" style="max-width:100%;max-height:88vh;object-fit:contain;display:block;" onerror="this.style.display='none'">
            ${prevBtn}${nextBtn}${dots}`;
        const prevEl = document.getElementById('bppdPrev');
        const nextEl = document.getElementById('bppdNext');
        if (prevEl) prevEl.onclick = (e) => { e.stopPropagation(); imgIdx = (imgIdx - 1 + images.length) % images.length; renderMedia(); };
        if (nextEl) nextEl.onclick = (e) => { e.stopPropagation(); imgIdx = (imgIdx + 1) % images.length; renderMedia(); };
    }

    function renderComments(postData, targetEl) {
        const listEl = targetEl || document.getElementById('bppdCommentsList');
        if (!listEl) return;
        const rawComs = postData?.comments || [];
        const coms = _fetchCommentProfiles(rawComs);
        const currentUser = User.getUser();
        if (!coms.length) {
            listEl.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:24px;">No comments yet. Be the first! 💬</div>`;
            return;
        }
        listEl.innerHTML = coms.map(c => {
            const replies = c.replies || [];
            const isMe = currentUser && String(c.user_id) === String(currentUser.id);
            return `
            <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--green-light);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--green-primary);">
                    ${c.authorImg ? `<img src="${escapeHtml(c.authorImg)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : escapeHtml((c.author||'?').charAt(0).toUpperCase())}
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="background:var(--bg-secondary);border-radius:14px;padding:8px 12px;">
                        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px;">${escapeHtml(c.author||'User')}</div>
                        <div style="font-size:13px;color:var(--text-secondary);word-break:break-word;">${escapeHtml(c.text||'')}</div>
                    </div>
                    <div style="display:flex;gap:10px;margin-top:3px;padding-left:6px;align-items:center;">
                        <span style="font-size:11px;color:var(--text-muted);">${formatDate(c.created_at||'')}</span>
                        <button onclick="window._bppdLikeCmt('${postId}','${escapeHtml(String(c.id))}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;" id="bppd-cmt-like-${escapeHtml(String(c.id))}">${(c.likedBy||[]).includes(currentUser?.id)?'❤️':'🤍'} ${c.likes||0}</button>
                        <button onclick="window._bppdToggleReply('${escapeHtml(String(c.id))}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;font-weight:600;padding:0;">Reply</button>
                        ${isMe ? `<button onclick="window._bppdEditCmt('${postId}','${escapeHtml(String(c.id))}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:600;padding:0;">Edit</button>` : ''}
                        ${isMe ? `<button onclick="window._bppdDelCmt('${postId}','${escapeHtml(String(c.id))}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
                        ${c.edited ? `<button onclick="showCommentEditHistory('${postId}','${escapeHtml(String(c.id))}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:#9ca3af;font-weight:500;padding:0;font-style:italic;">(edited)</button>` : ''}
                    </div>
                    <div id="bppd-reply-box-${escapeHtml(String(c.id))}" style="display:none;gap:6px;margin-top:6px;align-items:center;">
                        <input type="text" id="bppd-reply-inp-${escapeHtml(String(c.id))}" placeholder="Write a reply…" style="flex:1;padding:5px 10px;border:1.5px solid var(--border-light);border-radius:50px;font-size:12px;outline:none;min-width:0;">
                        <button onclick="window._bppdPostReply('${postId}','${escapeHtml(String(c.id))}')" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">↩</button>
                    </div>
                    ${replies.length ? `<div style="margin-top:8px;padding-left:16px;display:flex;flex-direction:column;gap:6px;">
                        ${replies.map(r=>`
                        <div style="display:flex;gap:8px;align-items:flex-start;">
                            <div style="width:24px;height:24px;border-radius:50%;background:var(--green-light);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--green-primary);">
                                ${r.authorImg?`<img src="${escapeHtml(r.authorImg)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`:escapeHtml((r.author||'?').charAt(0).toUpperCase())}
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="background:var(--bg-secondary);border-radius:10px;padding:5px 10px;">
                                    <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${escapeHtml(r.author||'User')}</div>
                                    <div style="font-size:12px;color:var(--text-secondary);word-break:break-word;">${escapeHtml(r.text||'')}</div>
                                </div>
                                <div style="display:flex;gap:10px;margin-top:2px;padding-left:4px;align-items:center;">
                                    <span style="font-size:10px;color:var(--text-muted);">${formatDate(r.created_at||'')}</span>
                                    <button onclick="window._bppdLikeReply('${postId}','${escapeHtml(String(c.id))}','${escapeHtml(String(r.id))}')" id="bppd-reply-like-${escapeHtml(String(r.id))}" style="background:none;border:none;cursor:pointer;font-size:11px;color:${(r.likedBy||[]).includes(currentUser?.id)?'#e11d48':'#6b7280'};font-weight:600;padding:0;">${(r.likedBy||[]).includes(currentUser?.id)?'❤️':'🤍'} ${r.likes||0}</button>
                                    ${currentUser && String(r.user_id)===String(currentUser.id) ? `<button onclick="window._bppdEditReply('${postId}','${escapeHtml(String(c.id))}','${escapeHtml(String(r.id))}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:#3b82f6;font-weight:600;padding:0;">Edit</button>` : ''}
                                    ${currentUser && String(r.user_id)===String(currentUser.id) ? `<button onclick="window._bppdDelReply('${postId}','${escapeHtml(String(c.id))}','${escapeHtml(String(r.id))}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:#ef4444;font-weight:600;padding:0;">Delete</button>` : ''}
                                </div>
                            </div>
                        </div>`).join('')}
                    </div>` : ''}
                </div>
            </div>`;
        }).join('');
        listEl.scrollTop = listEl.scrollHeight;

        // Bind reply helpers (scoped to this overlay)
        window._bppdToggleReply = (cid) => {
            const box = document.getElementById('bppd-reply-box-'+cid);
            if (!box) return;
            const showing = box.style.display === 'flex';
            box.style.display = showing ? 'none' : 'flex';
            if (!showing) document.getElementById('bppd-reply-inp-'+cid)?.focus();
        };
        window._bppdPostReply = async (pid, cid) => {
            if (!currentUser) { showToast('Sign in to reply', 'error'); return; }
            const ri = document.getElementById('bppd-reply-inp-'+cid);
            if (!ri) return;
            const text = ri.value.trim();
            if (!text) return;
            ri.value = '';
            const { data } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const comments = data?.comments || [];
            const idx = comments.findIndex(c => String(c.id) === String(cid));
            if (idx !== -1) {
                const rep = { id: Date.now(), user_id: currentUser.id, author: currentUser.name||currentUser.email||'You', authorImg: currentUser.avatar || (profileData && profileData.profileImg) || '', text, created_at: new Date().toISOString() };
                comments[idx].replies = [...(comments[idx].replies||[]), rep];
                await window.supabase.from('posts').update({comments}).eq('id', pid);
                // Update the cache in breederPosts if accessible
                renderComments({comments}, listEl);
                showToast('Reply added! 💬');
            }
        };
        window._bppdLikeCmt = async (pid, cid) => {
            if (!currentUser) { showToast('Sign in to like', 'error'); return; }
            const { data } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const comments = data?.comments || [];
            const idx = comments.findIndex(c => String(c.id) === String(cid));
            if (idx === -1) return;
            const c = comments[idx];
            const lb = c.likedBy || [];
            if (lb.includes(currentUser.id)) { c.likedBy = lb.filter(id=>id!==currentUser.id); c.likes = Math.max(0,(c.likes||1)-1); }
            else { c.likedBy = [...lb, currentUser.id]; c.likes = (c.likes||0)+1; }
            comments[idx] = c;
            await window.supabase.from('posts').update({comments}).eq('id', pid);
            const btn = document.getElementById('bppd-cmt-like-'+cid);
            if (btn) btn.innerHTML = `${(c.likedBy||[]).includes(currentUser?.id)?'❤️':'🤍'} ${c.likes||0}`;
        };
        window._bppdEditReply = async (pid, cid, rid) => {
            if (!currentUser) return;
            const { data } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const comments = data?.comments || [];
            const comment = comments.find(c => String(c.id) === String(cid));
            if (!comment) return;
            const reply = (comment.replies || []).find(r => String(r.id) === String(rid));
            if (!reply) return;
            const newText = await _showEditCommentModal(reply.text);
            if (newText === null) return;
            reply.text = newText.trim();
            reply.edited = true;
            reply.editedAt = new Date().toISOString();
            await window.supabase.from('posts').update({comments}).eq('id', pid);
            renderComments({comments}, listEl);
            showToast('Reply updated ✏️');
        };
        window._bppdLikeReply = async (pid, cid, rid) => {
            if (!currentUser) { showToast('Sign in to like', 'error'); return; }
            const { data } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const comments = data?.comments || [];
            const cidx = comments.findIndex(c => String(c.id) === String(cid));
            if (cidx === -1) return;
            const replies = comments[cidx].replies || [];
            const ridx = replies.findIndex(r => String(r.id) === String(rid));
            if (ridx === -1) return;
            const r = replies[ridx];
            const lb = r.likedBy || [];
            if (lb.includes(currentUser.id)) { r.likedBy = lb.filter(id => id !== currentUser.id); r.likes = Math.max(0, (r.likes||1) - 1); }
            else { r.likedBy = [...lb, currentUser.id]; r.likes = (r.likes||0) + 1; }
            replies[ridx] = r;
            comments[cidx].replies = replies;
            await window.supabase.from('posts').update({ comments }).eq('id', pid);
            const btn = document.getElementById('bppd-reply-like-' + rid);
            if (btn) { btn.style.color = (r.likedBy||[]).includes(currentUser.id) ? '#e11d48' : '#6b7280'; btn.innerHTML = `${(r.likedBy||[]).includes(currentUser.id)?'❤️':'🤍'} ${r.likes||0}`; }
        };
        window._bppdDelReply = async (pid, cid, rid) => {
            if (!currentUser) return;
            if (!confirm('Delete this reply?')) return;
            const { data } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const comments = data?.comments || [];
            const cidx = comments.findIndex(c => String(c.id) === String(cid));
            if (cidx === -1) return;
            comments[cidx].replies = (comments[cidx].replies || []).filter(r => String(r.id) !== String(rid));
            await window.supabase.from('posts').update({ comments }).eq('id', pid);
            renderComments({ comments }, listEl);
            showToast('Reply deleted');
        };
        window._bppdDelCmt = async (pid, cid) => {
            if (!currentUser) return;
            if (!confirm('Delete this comment?')) return;
            const { data } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const comments = (data?.comments||[]).filter(c => String(c.id)!==String(cid));
            await window.supabase.from('posts').update({comments}).eq('id', pid);
            renderComments({comments}, listEl);
            showToast('Comment deleted');
        };
        window._bppdEditCmt = async (pid, cid) => {
            if (!currentUser) return;
            const { data } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const c = (data?.comments||[]).find(cm => String(cm.id)===String(cid));
            if (!c) return;
            const newText = await _showEditCommentModal(c.text);
            if (newText === null) return;
            const editHistory = c.editHistory || [];
            editHistory.push({ text: c.text, editedAt: new Date().toISOString() });
            const updatedComments = (data.comments||[]).map(cm =>
                String(cm.id)===String(cid) ? {...cm, text: newText.trim(), edited: true, editedAt: new Date().toISOString(), editHistory} : cm
            );
            await window.supabase.from('posts').update({comments: updatedComments}).eq('id', pid);
            renderComments({comments: updatedComments}, listEl);
            showToast('Comment updated ✏️');
        };
    }

    let _bppdIsLiked = false;

    function renderSide(postData) {
        const sideEl = document.getElementById('bppdSide');
        if (!sideEl) return;
        const authorAvatar = postData?.author_picture || postData?.authorImg || defaultAvatar('User');
        const authorName   = postData?.author || postData?.name || 'Breeder';
        const postText     = postData?.text || '';
        const likes        = postData?.likes || 0;
        const coms         = postData?.comments || [];
        const currentUser  = User.getUser();

        sideEl.innerHTML = `
            <!-- Author header -->
            <div style="display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--border-light);flex-shrink:0;">
                <img src="${escapeHtml(authorAvatar)}" onerror="this.src=defaultAvatar(this.alt||'User')" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid var(--green-primary);flex-shrink:0;">
                <div style="min-width:0;">
                    <div style="font-weight:700;font-size:14px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(authorName)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${formatDate(postData?.created_at||'')}</div>
                </div>
            </div>
            <!-- Post text -->
            ${postText ? `<div style="padding:14px 18px;font-size:14px;color:var(--text-primary);line-height:1.65;border-bottom:1px solid var(--border-light);flex-shrink:0;word-break:break-word;">${escapeHtml(postText)}</div>` : ''}
            <!-- Meta -->
            <div style="padding:8px 18px;font-size:12px;color:var(--text-muted);border-bottom:1px solid var(--border-light);flex-shrink:0;">
                ❤️ ${likes} like${likes !== 1 ? 's' : ''} &nbsp;•&nbsp; 💬 ${coms.length} comment${coms.length !== 1 ? 's' : ''}
            </div>
            <!-- Action row -->
            <div style="display:flex;border-bottom:1px solid var(--border-light);flex-shrink:0;">
                <button id="bppd-post-like-btn" onclick="window._bppdToggleLike('${userId}','${postId}')" style="flex:1;padding:10px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:${_bppdIsLiked?'#e11d48':'var(--text-secondary)'};border-right:1px solid var(--border-light);transition:background .15s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                    ${_bppdIsLiked ? '❤️ Liked' : '🤍 Like'}
                </button>
                <button onclick="document.getElementById('bppdCommentInput').focus()" style="flex:1;padding:10px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);transition:background .15s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                    💬 Comment
                </button>
            </div>
            <!-- Comments list -->
            <div id="bppdCommentsList" style="flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;">
                <div style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:20px;">Loading comments…</div>
            </div>
            <!-- Comment input -->
            <div style="padding:12px 18px;border-top:1px solid var(--border-light);display:flex;gap:8px;align-items:center;flex-shrink:0;background:var(--surface-white);">
                <img src="${escapeHtml(profileData.profileImg || authorAvatar)}" onerror="this.src=defaultAvatar(this.alt||'User')" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                <input type="text" id="bppdCommentInput" placeholder="Write a comment…"
                    style="flex:1;border:1.5px solid var(--border-light);border-radius:50px;padding:8px 14px;font-size:13px;outline:none;background:var(--bg-secondary);"
                    onkeypress="if(event.key==='Enter') window._bppdPostComment('${userId}','${postId}')"
                    onfocus="this.style.borderColor='var(--green-primary)'"
                    onblur="this.style.borderColor='var(--border-light)'">
                <button onclick="window._bppdPostComment('${userId}','${postId}')" style="background:var(--green-primary);color:white;border:none;border-radius:50px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;transition:opacity .2s;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">Post</button>
            </div>`;

        // Load comments
        window.supabase.from('posts').select('comments,text,likes,shares,author,created_at').eq('id', postId).single().then(({data}) => {
            renderComments(data);
        });
    }

    // Build the panel shell
    overlay.innerHTML = `
        <div id="bppdInner" style="display:flex;flex-direction:row;width:96vw;max-width:960px;max-height:94vh;background:var(--surface-white);border-radius:20px;overflow:hidden;position:relative;box-shadow:0 30px 80px rgba(0,0,0,0.5);">
            <button onclick="document.getElementById('bpPostDetailOverlay').remove(); document.body.style.overflow='';" style="position:absolute;top:10px;right:10px;z-index:10;background:rgba(0,0,0,0.55);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">×</button>
            <!-- Left: media -->
            <div id="bppdMedia" style="flex:1;min-width:0;background:#000;display:flex;align-items:center;justify-content:center;position:relative;max-height:94vh;overflow:hidden;"></div>
            <!-- Right: info + comments -->
            <div id="bppdSide" style="width:360px;flex-shrink:0;display:flex;flex-direction:column;border-left:1px solid var(--border-light);max-height:94vh;overflow:hidden;background:var(--surface-white);"></div>
        </div>
        <style>
        @media(max-width:640px){
          #bppdInner{flex-direction:column!important;width:100vw!important;max-width:100vw!important;max-height:100dvh!important;border-radius:0!important;height:100dvh;}
          #bppdMedia{max-height:42vh!important;flex:0 0 42vh!important;}
          #bppdSide{width:100%!important;flex:1!important;max-height:none!important;border-left:none!important;border-top:1px solid var(--border-light);}
          #bpPostDetailOverlay{align-items:flex-start!important;}
        }
        </style>`;

    overlay.onclick = (e) => { if (e.target === overlay) closeBPPD(); };

    // Keyboard nav
    document._bppdKeyHandler = (e) => {
        if (e.key === 'Escape') closeBPPD();
        if (e.key === 'ArrowRight' && images.length > 1) { imgIdx = (imgIdx + 1) % images.length; renderMedia(); }
        if (e.key === 'ArrowLeft'  && images.length > 1) { imgIdx = (imgIdx - 1 + images.length) % images.length; renderMedia(); }
    };
    document.addEventListener('keydown', document._bppdKeyHandler);

    // Fetch full post data + liked state then render both panes
    (async () => {
        const [{ data: postData }, { data: likeRow }] = await Promise.all([
            window.supabase.from('posts').select('id,user_id,text,images,likes,shares,comments,created_at').eq('id', postId).single(),
            (() => { const u = User.getUser(); return u ? window.supabase.from('likes').select('id').eq('user_id', u.id).eq('post_id', postId).maybeSingle() : Promise.resolve({ data: null }); })()
        ]);
        _bppdIsLiked = !!likeRow;
        renderMedia();
        renderSide(postData || {});
    })();

    let _bppdLikeInFlight = false;
    window._bppdToggleLike = async (uid, pid) => {
        const user = User.getUser();
        if (!user) { showToast('Please sign in to like', 'error'); return; }
        if (_bppdLikeInFlight) return;
        _bppdLikeInFlight = true;
        const btn = document.getElementById('bppd-post-like-btn');
        try {
            const { data: postData } = await window.supabase.from('posts').select('likes').eq('id', pid).single();
            const currentLikes = postData?.likes || 0;
            if (_bppdIsLiked) {
                // Unlike
                await window.supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', pid);
                await window.supabase.rpc('decrement_post_likes', { post_id: pid });
                _bppdIsLiked = false;
                if (btn) { btn.style.color = 'var(--text-secondary)'; btn.textContent = '🤍 Like'; }
            } else {
                // Like
                const { error } = await window.supabase.from('likes').insert({ user_id: user.id, post_id: Number(pid) });
                if (error && error.code !== '23505') throw error;
                await window.supabase.rpc('increment_post_likes', { post_id: pid });
                _bppdIsLiked = true;
                if (btn) { btn.style.color = '#e11d48'; btn.textContent = '❤️ Liked'; }
            }
            // Sync back to local posts[] cache if entry exists
            const localPost = posts.find(p => String(p.id) === String(pid));
            if (localPost) { localPost.liked = _bppdIsLiked; localPost.likes = Math.max(0, currentLikes + (_bppdIsLiked ? 1 : -1)); }
        } catch(err) {
            console.error('_bppdToggleLike error:', err);
            showToast('Failed to update like', 'error');
        } finally { _bppdLikeInFlight = false; }
    };

    window._bppdPostComment = async (uid, pid) => {
        const input = document.getElementById('bppdCommentInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const user = User.getUser();
        if (!user) { showToast('Sign in to comment', 'error'); return; }
        input.value = '';
        try {
            const { data: postData } = await window.supabase.from('posts').select('comments').eq('id', pid).single();
            const newCmt = {
                id: Date.now(), user_id: user.id,
                author: profileData?.name || user.email || 'You',
                authorImg: profileData?.profileImg || '',
                text, created_at: new Date().toISOString()
            };
            const updatedComments = [...(postData?.comments||[]), newCmt];
            await window.supabase.from('posts').update({comments: updatedComments}).eq('id', pid);
            showToast('Comment added! 💬');
            // Refresh comments inline
            const { data } = await window.supabase.from('posts').select('comments,likes,shares').eq('id', pid).single();
            renderComments(data, document.getElementById('bppdCommentsList'));
            // Update meta
            const coms = data?.comments || [];
            const metaEl = document.querySelector('#bppdSide [style*="border-bottom"][style*="text-muted"]');
            if (metaEl) metaEl.innerHTML = `❤️ ${data?.likes||0} like${(data?.likes||0)!==1?'s':''} &nbsp;•&nbsp; 💬 ${coms.length} comment${coms.length!==1?'s':''}${data?.shares ? ` &nbsp;•&nbsp; 🔗 ${data.shares} share${data.shares!==1?'s':''}` : ''}`;
        } catch(err) {
            console.error('_bppdPostComment error:', err);
            showToast('Failed to post comment', 'error');
        }
    };
}

// ── Live avatar sync ──────────────────────────────────────────────────────
// When the user uploads a new profile picture (auth.js fires breedlink:avatarChanged),
// refresh every post avatar, the profile header, and any comment author images
// that belong to the current user — without requiring a page reload.
window.addEventListener('breedlink:avatarChanged', function (e) {
    const { userId, avatarUrl } = e.detail || {};
    if (!avatarUrl) return;

    // 1. Update in-memory post authorImgs AND comment authorImgs so renderPosts()
    //    uses the new picture everywhere — posts, comments, and replies.
    if (Array.isArray(window._profilePosts || posts)) {
        const arr = window._profilePosts || posts;
        arr.forEach(function (post) {
            // Update post header avatar
            if (!post.user_id || post.user_id === userId ||
                post.author === (profileData && profileData.name)) {
                post.authorImg = avatarUrl;
            }
            // Update avatars inside comments[] and their replies[]
            if (Array.isArray(post.comments)) {
                post.comments.forEach(function (c) {
                    if (String(c.user_id) === String(userId)) {
                        c.authorImg = avatarUrl;
                    }
                    if (Array.isArray(c.replies)) {
                        c.replies.forEach(function (r) {
                            if (String(r.user_id) === String(userId)) {
                                r.authorImg = avatarUrl;
                            }
                        });
                    }
                });
            }
        });
        renderPosts();
    }

    // 2. Update profileData so new posts and the header use the fresh avatar
    if (typeof profileData !== 'undefined') {
        profileData.profileImg = avatarUrl;
    }

    // 3. Update the profile header avatar image directly
    const headerAvatar = document.querySelector('.profile-avatar img, .profile-pic img, #profileAvatar img');
    if (headerAvatar) headerAvatar.src = avatarUrl;

    // 4. Update any comment author avatars already rendered in the DOM
    document.querySelectorAll('img[data-author-id="' + userId + '"]').forEach(function (img) {
        img.src = avatarUrl;
    });

    // 5. Update all inline post-header avatars in the DOM immediately
    //    (catches posts whose author is the current user)
    document.querySelectorAll('.post-card .post-header img').forEach(function (img) {
        // Only update avatars that are already showing the old URL *or* that
        // belong to the current user's posts (identified by matching the old src
        // pattern from the avatars bucket)
        const src = img.getAttribute('src') || '';
        if (src.includes('/avatars/') && src.includes(userId)) {
            img.src = avatarUrl;
        }
    });
});

// ============================================================
// IMAGE CROP MODAL  — v100
// ============================================================
(function() {
'use strict';

// State
let _cropTarget = null;   // 'cover' | 'profile' | 'animal'
let _cropRatio  = 'free'; // 'free' | '1:1' | '4:3' | '16:9' | '16:5'
let _cropFile   = null;
let _cropImg    = null;   // natural image element
let _cropCallback = null; // function(blob, dataUrl)

// Per-target cropped data stores (blob + dataUrl)
window._croppedFiles = {};  // { cover: File, profile: File, animal: File }
window._croppedPreviews = {};  // { cover: dataUrl, profile: dataUrl, animal: dataUrl }

// Open the crop modal for a given file input
window.openCropModal = function(inputEl, target, ratioHint) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('File exceeds 10MB limit', 'error'); return; }

    _cropTarget = target;
    _cropFile   = file;
    _cropRatio  = ratioHint || 'free';

    // Clear previous cropped data when a new file is chosen
    delete window._croppedFiles[target];
    delete window._croppedPreviews[target];

    const reader = new FileReader();
    reader.onload = function(e) {
        _cropImg = new Image();
        _cropImg.onload = function() {
            _initCropModal(e.target.result, _cropRatio);
        };
        _cropImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

function _initCropModal(dataUrl, ratio) {
    const modal   = document.getElementById('cropModal');
    const srcImg  = document.getElementById('cropSourceImg');
    const cropBox = document.getElementById('cropBox');

    if (!modal || !srcImg) return;

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    srcImg.src = dataUrl;

    // Set active ratio pill
    document.querySelectorAll('.crop-ratio-btn').forEach(b => {
        const active = b.dataset.ratio === ratio || (ratio === 'free' && b.dataset.ratio === 'free');
        b.style.background = active ? 'var(--green-primary)' : 'transparent';
        b.style.color       = active ? '#fff' : '#888';
        b.style.borderColor = active ? 'var(--green-primary)' : '#444';
    });
    _cropRatio = ratio;

    srcImg.onload = function() { _resetCropBox(); };
    if (srcImg.complete) _resetCropBox();
}

function _ratioParts(ratioStr) {
    if (!ratioStr || ratioStr === 'free') return null;
    const parts = ratioStr.split(':').map(Number);
    return parts.length === 2 ? parts : null;
}

function _resetCropBox() {
    const container = document.getElementById('cropContainer');
    const srcImg    = document.getElementById('cropSourceImg');
    const cropBox   = document.getElementById('cropBox');
    if (!container || !srcImg || !cropBox) return;

    const W = srcImg.offsetWidth;
    const H = srcImg.offsetHeight;
    if (!W || !H) return;

    const parts = _ratioParts(_cropRatio);
    let bw, bh;
    if (parts) {
        const [rw, rh] = parts;
        // Fit box to image preserving ratio
        if (W / H < rw / rh) {
            bw = W * 0.9;
            bh = bw * rh / rw;
        } else {
            bh = H * 0.9;
            bw = bh * rw / rh;
        }
    } else {
        bw = W * 0.85;
        bh = H * 0.85;
    }
    bw = Math.round(bw);
    bh = Math.round(bh);
    const bx = Math.round((W - bw) / 2);
    const by = Math.round((H - bh) / 2);

    _setCropBox(bx, by, bw, bh);
    _makeCropInteractive();
}

function _setCropBox(x, y, w, h) {
    const cropBox = document.getElementById('cropBox');
    if (!cropBox) return;
    cropBox.style.left   = x + 'px';
    cropBox.style.top    = y + 'px';
    cropBox.style.width  = w + 'px';
    cropBox.style.height = h + 'px';
}

function _getCropBox() {
    const cropBox = document.getElementById('cropBox');
    if (!cropBox) return null;
    return {
        x: parseInt(cropBox.style.left)  || 0,
        y: parseInt(cropBox.style.top)   || 0,
        w: parseInt(cropBox.style.width) || 0,
        h: parseInt(cropBox.style.height)|| 0
    };
}

function _clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function _makeCropInteractive() {
    const container = document.getElementById('cropContainer');
    const srcImg    = document.getElementById('cropSourceImg');
    const cropBox   = document.getElementById('cropBox');
    if (!container || !cropBox) return;

    // Clean up old listeners
    cropBox._removeCropListeners && cropBox._removeCropListeners();

    let mode = null;  // 'move' | 'tl'|'tr'|'bl'|'br'
    let startX, startY, startBox;

    function getXY(e) {
        const touch = e.touches ? e.touches[0] : e;
        const rect  = container.getBoundingClientRect();
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function onDown(e) {
        const corner = e.target.dataset && e.target.dataset.corner;
        mode = corner || 'move';
        const pos = getXY(e);
        startX = pos.x; startY = pos.y;
        startBox = _getCropBox();
        e.preventDefault();
        e.stopPropagation();
    }

    function onMove(e) {
        if (!mode || !startBox) return;
        const pos = getXY(e);
        const dx = pos.x - startX;
        const dy = pos.y - startY;
        const W  = srcImg.offsetWidth;
        const H  = srcImg.offsetHeight;
        const parts = _ratioParts(_cropRatio);
        let { x, y, w, h } = startBox;
        const MIN = 40;

        if (mode === 'move') {
            x = _clamp(x + dx, 0, W - w);
            y = _clamp(y + dy, 0, H - h);
        } else {
            let nx = x, ny = y, nw = w, nh = h;
            if (mode === 'br') {
                nw = _clamp(w + dx, MIN, W - x);
                nh = parts ? nw * parts[1] / parts[0] : _clamp(h + dy, MIN, H - y);
                if (y + nh > H) { nh = H - y; nw = parts ? nh * parts[0] / parts[1] : nw; }
            } else if (mode === 'bl') {
                nw = _clamp(w - dx, MIN, x + w);
                nh = parts ? nw * parts[1] / parts[0] : _clamp(h + dy, MIN, H - y);
                nx = x + w - nw;
                if (y + nh > H) { nh = H - y; nw = parts ? nh * parts[0] / parts[1] : nw; nx = x + w - nw; }
            } else if (mode === 'tr') {
                nw = _clamp(w + dx, MIN, W - x);
                nh = parts ? nw * parts[1] / parts[0] : _clamp(h - dy, MIN, y + h);
                ny = parts ? y + h - nh : y + h - nh;
                if (ny < 0) { ny = 0; nh = y + h; nw = parts ? nh * parts[0] / parts[1] : nw; }
            } else if (mode === 'tl') {
                nw = _clamp(w - dx, MIN, x + w);
                nh = parts ? nw * parts[1] / parts[0] : _clamp(h - dy, MIN, y + h);
                nx = x + w - nw;
                ny = y + h - nh;
                if (nx < 0) { nx = 0; nw = x + w; nh = parts ? nw * parts[1] / parts[0] : nh; ny = y + h - nh; }
                if (ny < 0) { ny = 0; nh = y + h; nw = parts ? nh * parts[0] / parts[1] : nw; nx = x + w - nw; }
            }
            x = nx; y = ny; w = nw; h = nh;
        }

        _setCropBox(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        e.preventDefault();
    }

    function onUp() { mode = null; startBox = null; }

    cropBox.addEventListener('mousedown',  onDown);
    cropBox.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove',  onMove);
    document.addEventListener('touchmove',  onMove, { passive: false });
    document.addEventListener('mouseup',    onUp);
    document.addEventListener('touchend',   onUp);

    // Also let user draw a new crop on the image (not on the box)
    function onContainerDown(e) {
        if (e.target === cropBox || cropBox.contains(e.target)) return;
        const pos = getXY(e);
        startX = pos.x; startY = pos.y;
        mode = 'draw-new';
        startBox = { x: pos.x, y: pos.y, w: 0, h: 0 };
        e.preventDefault();
    }
    function onContainerMove(e) {
        if (mode !== 'draw-new') return;
        const pos  = getXY(e);
        const W    = srcImg.offsetWidth;
        const H    = srcImg.offsetHeight;
        let dx = pos.x - startX, dy = pos.y - startY;
        let bx = dx < 0 ? pos.x : startX;
        let by = dy < 0 ? pos.y : startY;
        let bw = Math.abs(dx);
        let bh = Math.abs(dy);
        const parts = _ratioParts(_cropRatio);
        if (parts) { bh = bw * parts[1] / parts[0]; if (dy < 0) by = startY - bh; }
        bx = _clamp(bx, 0, W); by = _clamp(by, 0, H);
        bw = _clamp(bw, 0, W - bx); bh = _clamp(bh, 0, H - by);
        if (bw > 10 && bh > 10) _setCropBox(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh));
        e.preventDefault();
    }
    container.addEventListener('mousedown',  onContainerDown);
    container.addEventListener('touchstart', onContainerDown, { passive: false });
    document.addEventListener('mousemove',  onContainerMove);
    document.addEventListener('touchmove',  onContainerMove, { passive: false });

    cropBox._removeCropListeners = function() {
        cropBox.removeEventListener('mousedown',  onDown);
        cropBox.removeEventListener('touchstart', onDown);
        document.removeEventListener('mousemove',  onMove);
        document.removeEventListener('touchmove',  onMove);
        document.removeEventListener('mouseup',    onUp);
        document.removeEventListener('touchend',   onUp);
        container.removeEventListener('mousedown',  onContainerDown);
        container.removeEventListener('touchstart', onContainerDown);
        document.removeEventListener('mousemove',  onContainerMove);
        document.removeEventListener('touchmove',  onContainerMove);
    };
}

function _applyCrop() {
    const srcImg  = document.getElementById('cropSourceImg');
    const box     = _getCropBox();
    if (!srcImg || !box) return;

    // Scale from display coords to natural image coords
    const scaleX = _cropImg.naturalWidth  / srcImg.offsetWidth;
    const scaleY = _cropImg.naturalHeight / srcImg.offsetHeight;
    const sx = Math.round(box.x * scaleX);
    const sy = Math.round(box.y * scaleY);
    const sw = Math.round(box.w * scaleX);
    const sh = Math.round(box.h * scaleY);

    const canvas  = document.createElement('canvas');
    canvas.width  = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(_cropImg, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob(function(blob) {
        if (!blob) { showToast('Crop failed, using original', 'error'); _skipCrop(); return; }
        const ext  = (_cropFile.name || 'image').split('.').pop() || 'jpg';
        const file = new File([blob], `cropped_${Date.now()}.${ext}`, { type: blob.type });
        const dataUrl = canvas.toDataURL();
        const target = _cropTarget;
        window._croppedFiles[target]    = file;
        window._croppedPreviews[target] = dataUrl;
        _applyPreview(target, dataUrl);
        _closeCropModal();
        // After crop, open the respective modal so user can review and save
        if (target === 'profile') {
            openModal('profileModal');
        } else if (target === 'cover') {
            openModal('coverModal');
        }
    }, _cropFile.type || 'image/jpeg', 0.9);
}

function _skipCrop() {
    // No crop — use original file
    const target = _cropTarget;
    const reader = new FileReader();
    reader.onload = function(e) {
        window._croppedFiles[target]    = _cropFile;
        window._croppedPreviews[target] = e.target.result;
        _applyPreview(target, e.target.result);
        // After skip crop, open the respective modal so user can review and save
        if (target === 'profile') {
            openModal('profileModal');
        } else if (target === 'cover') {
            openModal('coverModal');
        }
    };
    reader.readAsDataURL(_cropFile);
    _closeCropModal();
}

function _applyPreview(target, dataUrl) {
    if (target === 'cover') {
        const wrap = document.getElementById('coverPreviewWrap');
        if (wrap) {
            wrap.style.backgroundImage = `url(${dataUrl})`;
            wrap.querySelector('.upload-placeholder') && (wrap.querySelector('.upload-placeholder').style.display = 'none');
        }
        const info = document.getElementById('coverCropInfo');
        if (info) info.style.display = 'block';
    } else if (target === 'profile') {
        const wrap = document.getElementById('profilePreviewWrap');
        if (wrap) {
            wrap.style.backgroundImage = `url(${dataUrl})`;
            wrap.style.backgroundSize  = 'cover';
            wrap.querySelector('.upload-placeholder') && (wrap.querySelector('.upload-placeholder').style.display = 'none');
        }
        const info = document.getElementById('profileCropInfo');
        if (info) info.style.display = 'block';
    } else if (target === 'animal') {
        const inner = document.getElementById('animalPreview');
        if (inner) {
            inner.style.backgroundImage = `url(${dataUrl})`;
            inner.style.backgroundSize  = 'cover';
            inner.style.backgroundPosition = 'center';
            inner.querySelector('.upload-placeholder') && (inner.querySelector('.upload-placeholder').style.display = 'none');
        }
        const wrap = document.getElementById('animalPreviewWrap');
        if (wrap) { wrap.style.backgroundImage = `url(${dataUrl})`; wrap.style.backgroundSize = 'cover'; wrap.style.backgroundPosition = 'center'; }
        const info = document.getElementById('animalCropInfo');
        if (info) info.style.display = 'block';
        // Also keep pendingAnimalImages in sync
        pendingAnimalImages = [window._croppedFiles['animal']];
    } else if (target === 'animalEdit') {
        const wrap = document.getElementById('edit_animalPreviewWrap');
        if (wrap) { wrap.style.backgroundImage = `url(${dataUrl})`; wrap.style.backgroundSize = 'cover'; wrap.style.backgroundPosition = 'center'; wrap.querySelector('.upload-placeholder') && (wrap.querySelector('.upload-placeholder').style.display = 'none'); }
        const info = document.getElementById('animalEditCropInfo');
        if (info) info.style.display = 'block';
    }
}

function _closeCropModal() {
    const modal = document.getElementById('cropModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    const cropBox = document.getElementById('cropBox');
    if (cropBox && cropBox._removeCropListeners) cropBox._removeCropListeners();
}

// Wire up ratio pills
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.crop-ratio-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            _cropRatio = this.dataset.ratio;
            document.querySelectorAll('.crop-ratio-btn').forEach(b => {
                const a = b === this;
                b.style.background  = a ? 'var(--green-primary)' : 'transparent';
                b.style.color       = a ? '#fff' : '#888';
                b.style.borderColor = a ? 'var(--green-primary)' : '#444';
            });
            _resetCropBox();
        });
    });

    document.getElementById('cropApplyBtn')?.addEventListener('click', _applyCrop);
    document.getElementById('cropSkipBtn')?.addEventListener('click',  _skipCrop);
    document.getElementById('cropCancelBtn')?.addEventListener('click', function() {
        _closeCropModal();
        // Reset the input so user can re-pick same file
        const inputId = _cropTarget === 'cover' ? 'coverInput' : _cropTarget === 'profile' ? 'profileInput' : 'animalInput';
        const inp = document.getElementById(inputId);
        if (inp) inp.value = '';
    });
    document.getElementById('cropResetBtn')?.addEventListener('click', _resetCropBox);

    // Drag-and-drop on upload zones
    ['cover', 'profile', 'animal', 'animalEdit'].forEach(t => {
        const zoneId = t === 'animalEdit' ? 'edit_animalDropZone' : t + 'DropZone';
        const zone = document.getElementById(zoneId);
        if (!zone) return;
        zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', e => { zone.classList.remove('drag-over'); });
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            const inputId = t === 'cover' ? 'coverInput' : t === 'profile' ? 'profileInput' : 'animalInput';
            const inp = document.getElementById(inputId);
            if (!inp) return;
            // Set file via DataTransfer
            try {
                const dt = new DataTransfer();
                dt.items.add(file);
                inp.files = dt.files;
            } catch(err) {}
            const ratioMap = { cover: '16:5', profile: '1:1', animal: '4:3', animalEdit: '4:3' };
            openCropModal(inp, t, ratioMap[t]);
        });
    });
});

// Patch saveCover to use cropped file if available
const _origSaveCover = window.saveCover;
window.saveCover = async function() {
    const croppedFile = window._croppedFiles && window._croppedFiles['cover'];
    if (croppedFile) {
        showToast('Uploading cover photo...');
        try {
            const imageUrl = await StorageAPI.uploadCoverPhoto(croppedFile);
            await User.updateUser({ coverPhoto: imageUrl });
            profileData.coverImg = imageUrl;
            updateProfileUI();
            showToast('Cover photo updated! 🖼️');
            closeModal('coverModal');
            delete window._croppedFiles['cover'];
            delete window._croppedPreviews['cover'];
        } catch(err) {
            console.error('saveCover error:', err);
            showToast('Failed to update cover: ' + err.message, 'error');
        }
    } else {
        // Fall back to original behavior (no crop selected)
        const coverInput = document.getElementById('coverInput');
        if (coverInput && coverInput.files && coverInput.files[0]) {
            if (_origSaveCover) { await _origSaveCover(); }
        } else {
            showToast('Please select an image first', 'error');
        }
    }
};

// Patch saveProfile to use cropped file if available
const _origSaveProfile = window.saveProfile;
window.saveProfile = async function() {
    const croppedFile = window._croppedFiles && window._croppedFiles['profile'];
    if (croppedFile) {
        showToast('Uploading profile photo...');
        try {
            const imageUrl = await StorageAPI.uploadProfilePicture(croppedFile);
            await User.updateUser({ profilePicture: imageUrl });
            profileData.profileImg = imageUrl;
            posts.forEach(post => { if (post.author === profileData.name) post.authorImg = imageUrl; });
            updateProfileUI();
            renderPosts();
            showToast('Profile photo updated! 👤');
            closeModal('profileModal');
            delete window._croppedFiles['profile'];
            delete window._croppedPreviews['profile'];
        } catch(err) {
            console.error('saveProfile error:', err);
            showToast('Failed to update profile photo: ' + err.message, 'error');
        }
    } else {
        const profileInput = document.getElementById('profileInput');
        if (profileInput && profileInput.files && profileInput.files[0]) {
            if (_origSaveProfile) { await _origSaveProfile(); }
        } else {
            showToast('Please select an image first', 'error');
        }
    }
};

// Patch saveAnimal to prefer cropped file
const _origSaveAnimal = window.saveAnimal;
window.saveAnimal = async function() {
    const croppedAnimal = window._croppedFiles && window._croppedFiles['animal'];
    if (croppedAnimal) {
        // Temporarily splice cropped file into the input's slot by overriding the storage upload
        const _origUploadAnimalImage = StorageAPI.uploadAnimalImage.bind(StorageAPI);
        let usedCrop = false;
        StorageAPI.uploadAnimalImage = async function(file) {
            if (!usedCrop) { usedCrop = true; return await _origUploadAnimalImage(croppedAnimal); }
            return await _origUploadAnimalImage(file);
        };
        try {
            await _origSaveAnimal();
        } finally {
            StorageAPI.uploadAnimalImage = _origUploadAnimalImage;
            delete window._croppedFiles['animal'];
            delete window._croppedPreviews['animal'];
        }
    } else {
        await _origSaveAnimal();
    }
};

// Reset crop state when modals close
const _origCloseModal = window.closeModal;
window.closeModal = function(id) {
    const targetMap = { coverModal: 'cover', profileModal: 'profile', animalModal: 'animal' };
    if (targetMap[id]) {
        // Only clear preview state, keep crop if same session
    }
    if (_origCloseModal) _origCloseModal(id);
};

})(); // end IIFE
