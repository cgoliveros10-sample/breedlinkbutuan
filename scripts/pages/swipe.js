console.log('=== Swipe.js Loading ===');

let currentAnimals = [];
let liked = [];
let passed = [];
let cardStack, emptyState, indicatorNope, indicatorLike, matchesList, matchCount;
let isAnimating = false;
let dragData = null;
let currentUserId = null;
let currentUserProfile = null;

async function loadSwipeAnimals() {
    let user = User.getUser();
    if (!user || !user.id) {
        user = await User.getFreshUser();
    }
    if (!user || !user.id) return;
    
    currentUserId = user.id;
    currentUserProfile = user;
    
    try {
        // Get all animals from OTHER users (exclude current user's own animals by user_id)
        const { data, error } = await window.supabase
            .from('animals')
            .select(`*,profiles:user_id (id, name, profile_picture, location, bio, contact, tags, website, is_verified, account_type)`)
            .neq('user_id', currentUserId);
        
        if (error) throw error;
        
        currentAnimals = (data || []).map(animal => ({
            id: animal.id,
            user_id: animal.user_id,
            name: animal.name,
            breed: animal.breed,
            category: animal.category || '',
            type: animal.type || animal.species || '',
            gender: animal.gender,
            age: animal.age,
            birthDate: animal.birth_date || '',
            weight: animal.weight || '',
            color: animal.color || '',
            status: animal.status,
            price: animal.price || '',
            image: animal.image_url,
            imageUrls: animal.image_urls || [],
            description: animal.description,
            isVaccinated: animal.is_vaccinated || false,
            isDewormed: animal.is_dewormed || false,
            lastVetCheck: animal.last_vet_check || '',
            parentSire: animal.parent_sire || '',
            parentDam: animal.parent_dam || '',
            litterReg: animal.litter_registration || '',
            owner: animal.profiles?.name || 'Unknown',
            ownerAvatar: animal.profiles?.profile_picture,
            ownerBio: animal.profiles?.bio || '',
            ownerContact: animal.profiles?.contact || {},
            ownerTags: animal.profiles?.tags || [],
            ownerWebsite: animal.profiles?.website || '',
            ownerAccountType: animal.profiles?.account_type || 'breeder',
            ownerVerified: animal.profiles?.is_verified || false,
            location: animal.profiles?.location || animal.profiles?.contact?.location || 'Unknown'
        }));
        
        // Get swipe history to filter out already swiped animals
        const { data: swipeHistory } = await window.supabase
            .from('swipe_history')
            .select('animal_id, direction')
            .eq('user_id', currentUserId);
        
        // Build set of swiped IDs and populate passed[] from left-swipes
        const swipedIds = new Set();
        const passedIds = new Set();
        for (const s of (swipeHistory || [])) {
            swipedIds.add(String(s.animal_id));
            if (s.direction === 'left') passedIds.add(String(s.animal_id));
        }
        
        // All animals (before filtering) — used to re-hydrate passed[]
        const allFetchedAnimals = [...currentAnimals];
        passed = allFetchedAnimals.filter(a => passedIds.has(String(a.id)));
        
        currentAnimals = currentAnimals.filter(a => !swipedIds.has(String(a.id)));
        // Cache the full unfiltered deck for applyFilters()
        // Also dynamically populate the type dropdown from actual DB data
        _allSwipeAnimals = [...currentAnimals];
        _populateFilterDropdowns();
        
        // Only filter pending matches (not matched ones — they go to sidebar)
        const { data: pendingMatches } = await window.supabase
            .from('matches')
            .select('animal_id')
            .eq('user_id', currentUserId)
            .eq('status', 'pending');
        
        const pendingIds = new Set((pendingMatches || []).map(m => String(m.animal_id)));
        currentAnimals = currentAnimals.filter(a => !pendingIds.has(String(a.id)));
        
        renderCards();
        await loadMatches();
        
        if (currentAnimals.length > 0 && currentAnimals[currentAnimals.length - 1]) {
            showPetDetails(currentAnimals[currentAnimals.length - 1].id);
        }
    } catch (err) {
        console.error('loadSwipeAnimals error:', err);
        showToast('Failed to load breeders', 'error');
    }
}

async function loadMatches() {
    try {
        // Step 1: Fetch matches rows (plain columns only — no nested joins)
        const { data: matchRows, error } = await window.supabase
            .from('matches')
            .select('id, animal_id, matched_user_id, status, created_at')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const rows = matchRows || [];
        if (rows.length === 0) { liked = []; updateMatches(); return; }

        // Step 2: Collect unique animal IDs and user IDs to fetch separately
        const animalIds   = [...new Set(rows.map(r => r.animal_id).filter(Boolean))];
        const userIds     = [...new Set(rows.map(r => r.matched_user_id).filter(Boolean))];

        // Step 3: Fetch animals by IDs
        let animalsMap = {};
        if (animalIds.length > 0) {
            try {
                const { data: animalRows } = await window.supabase
                    .from('animals')
                    .select('id, name, breed, image_url')
                    .in('id', animalIds);
                for (const a of (animalRows || [])) animalsMap[String(a.id)] = a;
            } catch (_) {}
        }

        // Step 4: Fetch profiles by IDs
        let profilesMap = {};
        if (userIds.length > 0) {
            try {
                const { data: profileRows } = await window.supabase
                    .from('profiles')
                    .select('id, name, profile_picture, location, bio, contact, tags, website, is_verified, account_type')
                    .in('id', userIds);
                for (const p of (profileRows || [])) profilesMap[String(p.id)] = p;
            } catch (_) {}
        }

        // Step 5: Merge into liked array
        liked = rows.map(match => {
            const animal = animalsMap[String(match.animal_id)] || null;
            const profile = profilesMap[String(match.matched_user_id)] || null;
            return {
                id: match.animal_id,
                user_id: match.matched_user_id,
                name: animal?.name || 'Unknown Animal',
                breed: animal?.breed || '',
                image: animal?.image_url || '',
                owner: profile?.name || 'Breeder',
                ownerAvatar: profile?.profile_picture || '',
                ownerBio: profile?.bio || '',
                ownerContact: profile?.contact || {},
                ownerTags: profile?.tags || [],
                ownerWebsite: profile?.website || '',
                ownerAccountType: profile?.account_type || 'breeder',
                ownerVerified: profile?.is_verified || false,
                location: profile?.location || profile?.contact?.location || '',
                match_id: match.id,
                isMatched: match.status === 'matched'
            };
        });

        updateMatches();
    } catch (err) {
        console.error('loadMatches error:', err);
        liked = [];
        updateMatches();
    }
}

function renderCards() {
    if (!cardStack) return;
    cardStack.innerHTML = '';
    
    if (currentAnimals.length === 0) {
        if (emptyState) emptyState.classList.add('active');
        return;
    }
    
    if (emptyState) emptyState.classList.remove('active');
    
    const cardsToShow = currentAnimals.slice(-3);
    
    cardsToShow.forEach((animal) => {
        const card = createCard(animal);
        cardStack.appendChild(card);
    });
}

function createCard(animal) {
    const card = document.createElement('div');
    card.className = 'breed-card';
    card.setAttribute('data-id', animal.id);
    
    card.innerHTML = `
        <img class="card-image" src="${animal.image}" alt="${animal.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'">
        <button class="info-btn" onclick="event.stopPropagation(); showPetDetails(${animal.id})">ℹ️</button>
        <div class="card-content">
            <div class="card-header">
                <div class="card-name">${escapeHtml(animal.name)}</div>
                <span class="card-badge">${animal.gender === 'Male' ? '♂️' : '♀️'}</span>
            </div>
            <div class="card-meta">
                <span>📍 ${escapeHtml(animal.location)}</span>
                <span>🏷️ ${escapeHtml(animal.breed)}</span>
            </div>
            <div class="card-stats">
                <div class="stat"><span>⭐</span><strong>${escapeHtml(animal.owner)}</strong></div>
                <div class="stat"><span>🐾</span><strong>${escapeHtml(animal.age || 'Unknown')}</strong></div>
            </div>
        </div>
    `;
    
    card.addEventListener('mousedown', (e) => onDragStart(e, card, animal));
    card.addEventListener('touchstart', (e) => onDragStart(e, card, animal), { passive: false });
    card.style.cursor = 'grab';
    
    return card;
}

function onDragStart(e, card, animal) {
    if (isAnimating) return;
    e.preventDefault();
    
    dragData = {
        card, animal,
        startX: e.type.includes('mouse') ? e.clientX : e.touches[0].clientX,
        currentX: e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
    };
    
    card.style.transition = 'none';
    card.style.cursor = 'grabbing';
    
    document.addEventListener('mousemove', onGlobalDragMove);
    document.addEventListener('mouseup', onGlobalDragEnd);
    document.addEventListener('touchmove', onGlobalDragMove, { passive: false });
    document.addEventListener('touchend', onGlobalDragEnd);
}

function onGlobalDragMove(e) {
    if (!dragData) return;
    e.preventDefault();
    
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    dragData.currentX = clientX;
    const diff = dragData.currentX - dragData.startX;
    const rotate = diff * 0.05;
    dragData.card.style.transform = `translateX(${diff}px) rotate(${rotate}deg)`;
    
    if (diff > 50) {
        if (indicatorLike) indicatorLike.style.opacity = Math.min(diff / 150, 1);
        if (indicatorNope) indicatorNope.style.opacity = 0;
    } else if (diff < -50) {
        if (indicatorNope) indicatorNope.style.opacity = Math.min(Math.abs(diff) / 150, 1);
        if (indicatorLike) indicatorLike.style.opacity = 0;
    } else {
        if (indicatorLike) indicatorLike.style.opacity = 0;
        if (indicatorNope) indicatorNope.style.opacity = 0;
    }
}

function onGlobalDragEnd() {
    if (!dragData) return;
    
    const diff = dragData.currentX - dragData.startX;
    const card = dragData.card;
    const animal = dragData.animal;
    
    card.style.transition = 'transform 0.3s ease';
    
    if (diff > 100) {
        card.style.transform = 'translateX(1000px) rotate(30deg)';
        setTimeout(() => handleSwipe('right', animal), 300);
    } else if (diff < -100) {
        card.style.transform = 'translateX(-1000px) rotate(-30deg)';
        setTimeout(() => handleSwipe('left', animal), 300);
    } else {
        card.style.transform = '';
    }
    
    if (indicatorLike) indicatorLike.style.opacity = 0;
    if (indicatorNope) indicatorNope.style.opacity = 0;
    
    dragData = null;
    document.removeEventListener('mousemove', onGlobalDragMove);
    document.removeEventListener('mouseup', onGlobalDragEnd);
    document.removeEventListener('touchmove', onGlobalDragMove);
    document.removeEventListener('touchend', onGlobalDragEnd);
}

function swipe(direction) {
    if (isAnimating) return;
    if (!cardStack) return;
    
    const topCard = cardStack.lastElementChild;
    if (!topCard) return;
    
    const animalId = parseInt(topCard.getAttribute('data-id'));
    const animal = currentAnimals.find(a => a.id === animalId);
    if (!animal) return;
    
    isAnimating = true;
    topCard.style.transition = 'transform 0.3s ease';
    topCard.style.transform = direction === 'right' ? 'translateX(1000px) rotate(30deg)' : 'translateX(-1000px) rotate(-30deg)';
    
    setTimeout(() => handleSwipe(direction, animal), 300);
}

async function handleSwipe(direction, animal) {
    // Record swipe in swipe_history
    try {
        await window.supabase
            .from('swipe_history')
            .upsert({
                user_id: currentUserId,
                animal_id: animal.id,
                direction: direction === 'right' ? 'right' : 'left'
            }, { onConflict: 'user_id,animal_id' });
    } catch (err) {
        console.error('Save swipe error:', err);
    }
    
    if (direction === 'right') {
        // Check if the other user already liked this animal
        const { data: existingMatch } = await window.supabase
            .from('matches')
            .select('id,status')
            .eq('user_id', animal.user_id)
            .eq('matched_user_id', currentUserId)
            .eq('animal_id', animal.id)
            .single();
        
        if (existingMatch) {
            // It's a match! Update both matches
            await window.supabase
                .from('matches')
                .update({ status: 'matched', viewed: false })
                .eq('id', existingMatch.id);
            
            await window.supabase
                .from('matches')
                .upsert({
                    user_id: currentUserId,
                    matched_user_id: animal.user_id,
                    animal_id: animal.id,
                    status: 'matched'
                }, { onConflict: 'user_id,matched_user_id,animal_id' });
            
            // Create notifications
            await window.supabase
                .from('notifications')
                .insert([
                    {
                        user_id: currentUserId,
                        type: 'match',
                        reference_id: animal.id,
                        title: 'New Match! 🎉',
                        message: `You matched with ${animal.owner}'s ${animal.name}!`
                    },
                    {
                        user_id: animal.user_id,
                        type: 'match',
                        reference_id: animal.id,
                        title: 'New Match! 🎉',
                        message: `${currentUserProfile?.name} matched with your ${animal.name}!`
                    }
                ]);
            
            showMatchAnimation(animal);
            await loadMatches();
        } else {
            // One-sided like — create pending match
            await window.supabase
                .from('matches')
                .insert({
                    user_id: currentUserId,
                    matched_user_id: animal.user_id,
                    animal_id: animal.id,
                    status: 'pending'
                });
            // Refresh liked tab immediately so user sees their like
            await loadMatches();
        }
        
        // Log activity
        await User.logActivity('swipe_right', 'animal', animal.id, { name: animal.name });
        
    } else {
        // Track passed animals locally for the session
        if (!passed.find(a => a.id === animal.id)) {
            passed.push(animal);
        }
        // Log activity for left swipe
        await User.logActivity('swipe_left', 'animal', animal.id, { name: animal.name });
    }
    
    currentAnimals = currentAnimals.filter(a => a.id !== animal.id);
    renderCards();
    isAnimating = false;
    
    if (currentAnimals.length > 0 && currentAnimals[currentAnimals.length - 1]) {
        showPetDetails(currentAnimals[currentAnimals.length - 1].id);
    } else {
        const panel = document.getElementById('petDetailsPanel');
        const content = document.getElementById('petDetailsContent');
        if (panel && content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🐾</div>
                    <p>No more animals to show</p>
                    <button class="empty-btn primary" onclick="resetFilters()" style="margin-top: 20px;">Reset Filters</button>
                </div>
            `;
        }
    }
}

function updateMatches() {
    if (matchCount) matchCount.textContent = liked.length;
    if (!matchesList) return;
    // Bug fix: preserve whichever tab the user is currently on instead of always resetting to 'liked'
    renderBreedersTab(_currentBreedersTab || 'liked');
}

let _currentBreedersTab = 'liked';

function renderBreedersTab(tab) {
    _currentBreedersTab = tab;
    if (!matchesList) return;

    // Update tab buttons
    const likedTab = document.getElementById('tabLiked');
    const passedTab = document.getElementById('tabPassed');
    if (likedTab) likedTab.classList.toggle('active', tab === 'liked');
    if (passedTab) passedTab.classList.toggle('active', tab === 'passed');

    const list = tab === 'liked' ? liked : passed;
    if (matchCount) matchCount.textContent = liked.length;

    if (list.length === 0) {
        matchesList.innerHTML = tab === 'liked'
            ? '<div class="empty-matches">Start swiping to find matches!</div>'
            : '<div class="empty-matches">No passed animals yet.</div>';
        return;
    }

    matchesList.innerHTML = list.map((animal, idx) => {
        const isLiked = tab === 'liked';
        const imgSrc = animal.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400';
        return `
        <div class="match-item" data-animal-id="${animal.id}">
            <div style="position:relative;flex-shrink:0;">
                <img src="${imgSrc}" alt="${escapeHtml(animal.name || '')}" loading="lazy"
                     style="width:52px;height:52px;border-radius:12px;object-fit:cover;"
                     onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'">
                <span style="position:absolute;bottom:-4px;right:-4px;font-size:14px;">${isLiked ? (animal.isMatched ? '💚' : '❤️') : '✕'}</span>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(animal.name || 'Unknown Animal')}</div>
                <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(animal.owner || 'Breeder')} · ${escapeHtml(animal.breed || '')}</div>
            </div>
            <div class="match-btn-group">
                <button class="match-message-btn btn-details" data-action="details" data-animal-id="${animal.id}">🐾 Details</button>
                <button class="match-message-btn btn-message" data-action="message" data-user-id="${animal.user_id || ''}" data-owner="${encodeURIComponent(animal.owner || '')}" data-avatar="${encodeURIComponent(animal.ownerAvatar || '')}">💬 Message</button>
                <button class="match-message-btn btn-profile" data-action="profile" data-user-id="${animal.user_id || ''}">👤 See Profile</button>
                ${isLiked
                    ? `<button class="match-message-btn btn-pass" data-action="pass-liked" data-animal-id="${animal.id}">👎 Pass</button>`
                    : `<button class="match-message-btn btn-like" data-action="like-passed" data-animal-id="${animal.id}">❤️ Like</button>`
                }
            </div>
        </div>
        `;
    }).join('');

    // Bug fix: clone node to remove previously stacked onclick listeners before re-attaching
    const freshList = matchesList.cloneNode(false);
    freshList.innerHTML = matchesList.innerHTML;
    matchesList.parentNode.replaceChild(freshList, matchesList);
    matchesList = freshList;

    // Delegated click handler — attached fresh each render, no duplicates
    matchesList.onclick = function(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'details') {
            const id = parseInt(btn.dataset.animalId || btn.closest('[data-animal-id]')?.dataset.animalId);
            if (id) viewMatchProfile(id);
        } else if (action === 'message') {
            const uid  = btn.dataset.userId;
            const name = decodeURIComponent(btn.dataset.owner || '');
            const av   = decodeURIComponent(btn.dataset.avatar || '');
            if (uid) messageMatchBreeder(uid, name, av);
            else showToast('Owner info not available', 'error');
        } else if (action === 'profile') {
            const uid = btn.dataset.userId;
            if (uid) openBreederProfile(uid);
            else showToast('Could not identify this breeder', 'error');
        } else if (action === 'pass-liked') {
            const id = parseInt(btn.dataset.animalId);
            if (id) passLikedAnimal(id);
        } else if (action === 'like-passed') {
            const id = parseInt(btn.dataset.animalId);
            if (id) likePassedAnimal(id);
        }
    };
}

async function passLikedAnimal(animalId) {
    try {
        // Remove from matches (unlink)
        await window.supabase
            .from('matches')
            .delete()
            .eq('user_id', currentUserId)
            .eq('animal_id', animalId);
        // Update swipe history to left (passed)
        await window.supabase
            .from('swipe_history')
            .update({ direction: 'left' })
            .eq('user_id', currentUserId)
            .eq('animal_id', animalId);
        const animal = liked.find(a => a.id === animalId);
        liked = liked.filter(a => a.id !== animalId);
        if (animal && !passed.find(a => a.id === animalId)) passed.push(animal);
        showToast('Moved to passed 👎');
        renderBreedersTab(_currentBreedersTab);
    } catch (err) {
        console.error('passLikedAnimal error:', err);
        showToast('Failed to pass', 'error');
    }
}

async function deleteLikedAnimal(animalId) {
    try {
        await window.supabase
            .from('matches')
            .delete()
            .eq('user_id', currentUserId)
            .eq('animal_id', animalId);
        await window.supabase
            .from('swipe_history')
            .delete()
            .eq('user_id', currentUserId)
            .eq('animal_id', animalId);
        liked = liked.filter(a => a.id !== animalId);
        showToast('Removed from liked');
        renderBreedersTab(_currentBreedersTab);
    } catch (err) {
        console.error('deleteLikedAnimal error:', err);
        showToast('Failed to remove', 'error');
    }
}

async function likePassedAnimal(animalId) {
    const animal = passed.find(a => a.id === animalId);
    if (!animal) return;
    try {
        // Update swipe_history to right
        await window.supabase
            .from('swipe_history')
            .upsert({ user_id: currentUserId, animal_id: animalId, direction: 'right' }, { onConflict: 'user_id,animal_id' });
        // Create pending match
        await window.supabase
            .from('matches')
            .insert({ user_id: currentUserId, matched_user_id: animal.user_id, animal_id: animalId, status: 'pending' });
        passed = passed.filter(a => a.id !== animalId);
        await loadMatches();
        showToast('Added to liked! ❤️');
        renderBreedersTab(_currentBreedersTab);
    } catch (err) {
        console.error('likePassedAnimal error:', err);
        showToast('Failed to like', 'error');
    }
}

function viewMatchProfile(animalId) {
    showPetDetails(animalId);
    document.getElementById('petDetailsPanel').scrollIntoView({ behavior: 'smooth' });
}

function messageMatchBreeder(userId, userName, userAvatar) {
    const chatData = { id: String(userId), name: userName || 'Breeder', avatar: userAvatar || '' };

    // Pass chatData directly to the opener so the correct conversation always
    // opens — whether the modal is already visible or being opened fresh.
    function tryOpen() {
        const opener = window.openMessengerGlobal || window.openMessagesModal;
        if (typeof opener === 'function') {
            opener(chatData);
            return true;
        }
        return false;
    }

    if (!tryOpen()) {
        // messages.js not yet loaded — retry every 100 ms for up to 3 s
        let attempts = 0;
        const interval = setInterval(function () {
            attempts++;
            if (tryOpen() || attempts >= 30) clearInterval(interval);
        }, 100);
    }
}

let currentMatchUserId = null;
let currentMatchUserName = null;

function showMatchAnimation(animal) {
    const matchImage = document.getElementById('matchImage');
    const matchName = document.getElementById('matchName');
    const matchOverlay = document.getElementById('matchOverlay');
    
    currentMatchUserId = animal.user_id;
    currentMatchUserName = animal.owner;
    
    if (matchImage) matchImage.src = animal.image;
    if (matchName) matchName.textContent = animal.name;
    if (matchOverlay) {
        matchOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Auto-close after 5 seconds (slightly longer to let user rate)
        setTimeout(() => {
            closeMatch();
        }, 5000);
    }
}

function rateMatchBreeder() {
    if (currentMatchUserId && currentMatchUserName) {
        closeMatch();
        setTimeout(() => openRateModal(currentMatchUserId, currentMatchUserName), 200);
    }
}

function closeMatch() {
    const matchOverlay = document.getElementById('matchOverlay');
    if (matchOverlay) {
        matchOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function messageMatch() {
    const matchName = document.getElementById('matchName')?.textContent;
    const animal = liked.find(a => a.name === matchName);
    if (animal) {
        closeMatch();
        messageMatchBreeder(animal.user_id, animal.owner, animal.ownerAvatar);
    }
}

async function showPetDetails(animalId) {
    const panel = document.getElementById('petDetailsPanel');
    const content = document.getElementById('petDetailsContent');
    if (!panel || !content) return;

    // Show loading immediately so panel opens fast
    panel.classList.add('active');
    content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);"><div style="font-size:36px;margin-bottom:12px;">🐾</div><p>Loading...</p></div>`;

    let animal = [...currentAnimals, ...liked, ...passed].find(a => a.id === animalId);

    // If the animal is missing owner details (came from liked[] which has minimal data),
    // fetch fresh full data from Supabase
    if (!animal || !animal.owner || animal.owner === 'Unknown' || !animal.ownerContact) {
        try {
            const { data, error } = await window.supabase
                .from('animals')
                .select(`*,profiles:user_id (id, name, profile_picture, location, bio, contact, tags, website, is_verified, account_type)`)
                .eq('id', animalId)
                .single();
            if (!error && data) {
                animal = {
                    id: data.id,
                    user_id: data.user_id,
                    name: data.name,
                    breed: data.breed,
                    category: data.category || '',
                    type: data.type || data.species || '',
                    gender: data.gender,
                    age: data.age,
                    birthDate: data.birth_date || '',
                    weight: data.weight || '',
                    color: data.color || '',
                    status: data.status,
                    price: data.price || '',
                    image: data.image_url,
                    imageUrls: data.image_urls || [],
                    description: data.description,
                    isVaccinated: data.is_vaccinated || false,
                    isDewormed: data.is_dewormed || false,
                    lastVetCheck: data.last_vet_check || '',
                    parentSire: data.parent_sire || '',
                    parentDam: data.parent_dam || '',
                    litterReg: data.litter_registration || '',
                    owner: data.profiles?.name || 'Unknown',
                    ownerAvatar: data.profiles?.profile_picture,
                    ownerBio: data.profiles?.bio || '',
                    ownerContact: data.profiles?.contact || {},
                    ownerTags: data.profiles?.tags || [],
                    ownerWebsite: data.profiles?.website || '',
                    ownerAccountType: data.profiles?.account_type || 'breeder',
                    ownerVerified: data.profiles?.is_verified || false,
                    location: data.profiles?.location || data.profiles?.contact?.location || 'Unknown'
                };
                // Update the cached entry so future lookups are fast
                const idx = currentAnimals.findIndex(a => a.id === animalId);
                if (idx !== -1) currentAnimals[idx] = { ...currentAnimals[idx], ...animal };
                const lidx = liked.findIndex(a => a.id === animalId);
                if (lidx !== -1) liked[lidx] = { ...liked[lidx], ...animal };
                const pidx = passed.findIndex(a => a.id === animalId);
                if (pidx !== -1) passed[pidx] = { ...passed[pidx], ...animal };
            }
        } catch (err) {
            console.error('showPetDetails fetch error:', err);
        }
    }

    if (!animal) {
        content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">Animal not found</div>`;
        return;
    }
    
    // Build image gallery
    const allImgs = [animal.image, ...(animal.imageUrls||[])].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
    // Store images on window for lightbox access
    window._swipePetImgs = allImgs;
    window._swipePetImgIdx = 0;
    const galleryHTML = allImgs.length > 1
        ? `<div style="display:flex;gap:6px;overflow-x:auto;padding:0 16px 12px;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
            ${allImgs.map((img,i)=>`<img src="${escapeHtml(img)}" onclick="window._swipePetThumbClick(${i})" onerror="this.style.display='none'" data-thumb-idx="${i}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;flex-shrink:0;cursor:pointer;border:2px solid ${i===0?'var(--green-primary)':'transparent'};transition:border .15s;">`).join('')}
          </div>` : '';
    window._swipePetThumbClick = function(idx) {
        window._swipePetImgIdx = idx;
        const main = document.querySelector('.pet-details-img');
        if (main) main.src = window._swipePetImgs[idx] || '';
        document.querySelectorAll('[data-thumb-idx]').forEach(t => {
            t.style.border = String(t.dataset.thumbIdx) === String(idx) ? '2px solid var(--green-primary)' : '2px solid transparent';
        });
    };

    const infoRows = [
        animal.category ? ['Category', `${animal.category === 'Livestock' || animal.category === 'livestock' ? '🐄' : '🐕'} ${escapeHtml(animal.category)}`] : null,
        animal.type ? ['Type', escapeHtml(animal.type)] : null,
        animal.breed ? ['Breed', escapeHtml(animal.breed)] : null,
        ['Gender', animal.gender === 'Male' ? '♂️ Male' : '♀️ Female'],
        animal.age ? ['Age', escapeHtml(animal.age)] : null,
        animal.birthDate ? ['Birth Date', escapeHtml(String(animal.birthDate))] : null,
        animal.color ? ['Color', escapeHtml(animal.color)] : null,
        animal.weight ? ['Weight', escapeHtml(String(animal.weight)) + ' kg'] : null,
        animal.price ? ['Price', '₱ ' + Number(animal.price).toLocaleString()] : null,
        ['Status', escapeHtml(animal.status || 'Available')],
        ['Vaccinated', animal.isVaccinated ? '✅ Yes' : '❌ No'],
        ['Dewormed', animal.isDewormed ? '✅ Yes' : '❌ No'],
        animal.lastVetCheck ? ['Last Vet Check', escapeHtml(String(animal.lastVetCheck))] : null,
        animal.parentSire ? ['Sire (Father)', escapeHtml(animal.parentSire)] : null,
        animal.parentDam ? ['Dam (Mother)', escapeHtml(animal.parentDam)] : null,
        animal.litterReg ? ['Litter Registration', escapeHtml(animal.litterReg)] : null,
    ].filter(Boolean);

    content.innerHTML = `
        <div class="pet-details-header">
            <img src="${animal.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'}" alt="${escapeHtml(animal.name)}" class="pet-details-img" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'" style="cursor:zoom-in;" onclick="window._openSwipePetLightbox(window._swipePetImgIdx||0)">
            <div class="pet-details-name">${escapeHtml(animal.name)}</div>
            <div class="pet-details-breed">${escapeHtml(animal.breed || animal.type || '')} ${animal.location ? '• ' + escapeHtml(animal.location) : ''}</div>
        </div>
        ${galleryHTML}

        <div style="display:flex;gap:8px;padding:0 16px 12px;">
            <button class="documents-btn" onclick="showDocuments(${animal.id})" style="flex:1;margin:0;">
                📋 Health Records
            </button>
            <button class="message-owner-btn" onclick="messageOwner('${animal.user_id}', '${escapeHtml(animal.owner)}', '${escapeHtml(animal.ownerAvatar || '')}')" style="flex:1;margin:0;">
                💬 Message
            </button>
        </div>
        <div style="padding:0 16px 12px;">
            <button class="message-owner-btn" onclick="openBreederProfile('${animal.user_id}')" style="background:var(--bg-secondary);color:var(--text-primary);margin:0;width:100%;">
                👤 See Full Profile
            </button>
        </div>
        
        <div class="detail-section">
            <h4>📊 Animal Information</h4>
            ${infoRows.map(([label, val]) => `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${val}</span></div>`).join('')}
        </div>

        ${animal.description ? `
        <div class="detail-section">
            <h4>📝 About</h4>
            <p style="color:var(--text-secondary);line-height:1.6;margin:0;">${escapeHtml(animal.description)}</p>
        </div>` : ''}
        
        <div class="detail-section">
            <h4>👤 Owner</h4>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <img src="${animal.ownerAvatar || defaultAvatar('User')}" 
                     onerror="this.src=defaultAvatar('User')"
                     style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--border-light);flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:var(--text-primary);font-size:15px;">
                        ${escapeHtml(animal.owner)}
                        ${animal.ownerVerified ? '<span style="color:var(--green-primary);font-size:12px;margin-left:4px;">✔ Verified</span>' : ''}
                    </div>
                    <div style="font-size:12px;color:var(--text-muted);">📍 ${escapeHtml(animal.location)}</div>
                    ${animal.ownerAccountType ? `<div style="font-size:11px;color:var(--green-primary);text-transform:capitalize;margin-top:2px;">🏷️ ${escapeHtml(animal.ownerAccountType)}</div>` : ''}
                </div>
            </div>
            ${animal.ownerBio ? `<div style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:10px;word-wrap:break-word;overflow-wrap:break-word;white-space:pre-wrap;">${escapeHtml(animal.ownerBio)}</div>` : ''}
            ${animal.ownerContact?.email ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">📧 ${escapeHtml(animal.ownerContact.email)}</div>` : ''}
            ${animal.ownerContact?.phone ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">📞 ${escapeHtml(animal.ownerContact.phone)}</div>` : ''}
            ${animal.ownerWebsite ? `<div style="font-size:13px;margin-bottom:4px;"><a href="${escapeHtml(animal.ownerWebsite)}" target="_blank" rel="noopener" style="color:var(--green-primary);text-decoration:none;">🌐 ${escapeHtml(animal.ownerWebsite)}</a></div>` : ''}
            ${(animal.ownerTags||[]).length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">${animal.ownerTags.map(t=>`<span style="background:var(--green-light);color:var(--green-primary);padding:2px 8px;border-radius:50px;font-size:11px;">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            <button onclick="openBreederProfile('${animal.user_id}')" style="margin-top:12px;width:100%;padding:10px;background:var(--green-primary);color:white;border:none;border-radius:50px;font-weight:600;cursor:pointer;font-size:13px;">
                👤 See ${escapeHtml(animal.owner)}'s Profile
            </button>
        </div>
    `;
    
    panel.classList.add('active');
}

function closePetDetails() {
    const panel = document.getElementById('petDetailsPanel');
    if (panel) panel.classList.remove('active');
}

// ============================================
// SWIPE PET DETAILS IMAGE LIGHTBOX
// ============================================
window._openSwipePetLightbox = function(startIdx) {
    const imgs = window._swipePetImgs || [];
    if (!imgs.length) return;
    let idx = startIdx || 0;

    const existing = document.getElementById('swipePetLightbox');
    if (existing) existing.remove();

    const lb = document.createElement('div');
    lb.id = 'swipePetLightbox';
    lb.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.93);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';

    function render() {
        const prev = imgs.length > 1 ? `<button id="spl-prev" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:white;width:44px;height:44px;border-radius:50%;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>` : '';
        const next = imgs.length > 1 ? `<button id="spl-next" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:white;width:44px;height:44px;border-radius:50%;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>` : '';
        const dots = imgs.length > 1 ? `<div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;">${imgs.map((_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===idx?'white':'rgba(255,255,255,0.35)'};transition:background .2s;"></div>`).join('')}</div>` : '';
        lb.innerHTML = `
            <button id="spl-close" style="position:absolute;top:16px;right:16px;z-index:10;background:rgba(255,255,255,0.15);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">×</button>
            <img src="${escapeHtml(imgs[idx])}" style="max-width:90vw;max-height:88vh;object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.6);" onerror="this.style.display='none'">
            ${prev}${next}${dots}
            <div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;">${imgs.length > 1 ? (idx+1) + ' / ' + imgs.length : ''}</div>
        `;
        document.getElementById('spl-close')?.addEventListener('click', closeLb);
        document.getElementById('spl-prev')?.addEventListener('click', e => { e.stopPropagation(); idx = (idx - 1 + imgs.length) % imgs.length; render(); });
        document.getElementById('spl-next')?.addEventListener('click', e => { e.stopPropagation(); idx = (idx + 1) % imgs.length; render(); });
    }

    function closeLb() {
        lb.remove();
        document.removeEventListener('keydown', keyHandler);
    }

    function keyHandler(e) {
        if (e.key === 'Escape') closeLb();
        if (e.key === 'ArrowRight' && imgs.length > 1) { idx = (idx + 1) % imgs.length; render(); }
        if (e.key === 'ArrowLeft' && imgs.length > 1) { idx = (idx - 1 + imgs.length) % imgs.length; render(); }
    }

    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', keyHandler);
    document.body.appendChild(lb);
    render();
};

async function showDocuments(animalId) {
    const animal = [...currentAnimals, ...liked, ...passed].find(a => a.id === animalId);
    if (!animal) { showToast('Animal not found', 'error'); return; }

    // Fetch fresh animal data to get health_documents
    try {
        const { data, error } = await window.supabase
            .from('animals')
            .select('health_documents, name')
            .eq('id', animalId)
            .single();

        if (error) throw error;

        const docs = data?.health_documents || [];
        if (!docs.length) { showToast('No health documents uploaded for this animal.'); return; }

        // Build a quick modal
        const existing = document.getElementById('docsQuickModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'docsQuickModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:4000;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:var(--surface-white);border-radius:24px;padding:28px;max-width:440px;width:90%;position:relative;">
                <button onclick="document.getElementById('docsQuickModal').remove();document.body.style.overflow='';"
                    style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-muted);">×</button>
                <h3 style="margin-bottom:16px;">📋 Health Documents — ${escapeHtml(data.name)}</h3>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    ${docs.map(doc => `
                        <a href="${doc.url || doc}" target="_blank" rel="noopener"
                           style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--bg-secondary);border-radius:12px;text-decoration:none;color:var(--text-primary);font-weight:500;font-size:14px;border:1px solid var(--border-light);">
                            <span style="font-size:24px;">${(doc.type && doc.type.includes('image')) ? '🖼️' : '📄'}</span>
                            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(doc.name || 'Document')}</span>
                            <span style="color:var(--green-primary);font-size:13px;">View →</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
        modal.addEventListener('click', e => { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; } });
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error('showDocuments error:', err);
        showToast('Failed to load documents', 'error');
    }
}

function messageOwner(userId, userName, userAvatar) {
    closePetDetails();
    messageMatchBreeder(String(userId), userName, userAvatar);
}

// Filter functions
function toggleFilters() {
    const toggle = document.getElementById('filterToggle');
    const panel = document.getElementById('filterPanel');
    if (toggle) toggle.classList.toggle('active');
    if (panel) panel.classList.toggle('active');
}

// Dynamically populate the filter dropdowns from loaded animal data
function _populateFilterDropdowns() {
    const breedSelect = document.getElementById('breedSelect');
    if (!breedSelect) return;

    // Collect all distinct types from the DB animals
    const petTypes = new Set(PET_TYPES);
    const livestockTypes = new Set(LIVESTOCK_TYPES);
    const otherTypes = new Set();

    (_allSwipeAnimals.length ? _allSwipeAnimals : currentAnimals).forEach(a => {
        const t = (a.type || a.breed || '').trim();
        if (!t || t.toLowerCase() === 'unknown') return;
        const tl = t.toLowerCase();
        if (!petTypes.has(tl) && !livestockTypes.has(tl)) otherTypes.add(t);
    });

    // Remove old "Other" group if exists, rebuild
    let otherGroup = document.getElementById('otherTypes');
    if (otherGroup) otherGroup.remove();

    if (otherTypes.size > 0) {
        otherGroup = document.createElement('optgroup');
        otherGroup.label = '🐾 Other';
        otherGroup.id = 'otherTypes';
        [...otherTypes].sort().forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = '🐾 ' + t;
            otherGroup.appendChild(opt);
        });
        breedSelect.appendChild(otherGroup);
    }
}

// Mapping of which types belong to which category
const PET_TYPES = ['dog','cat','bird','rabbit','mouse','hamster','fish','turtle'];
const LIVESTOCK_TYPES = ['pig','cow','goat','horse','chicken','duck','sheep','carabao'];

function updateBreeds() {
    const category = document.getElementById('categorySelect')?.value?.toLowerCase();
    const petGroup = document.getElementById('petTypes');
    const livestockGroup = document.getElementById('livestockTypes');
    const breedSelect = document.getElementById('breedSelect');

    if (petGroup) petGroup.style.display = (!category || category === 'pet') ? '' : 'none';
    if (livestockGroup) livestockGroup.style.display = (!category || category === 'livestock') ? '' : 'none';

    // Reset type selection when category changes
    if (breedSelect) breedSelect.value = '';
    applyFilters();
}

// Cache of all unfiltered animals (populated on initial load)
let _allSwipeAnimals = [];

function applyFilters() {
    const animalType = document.getElementById('breedSelect')?.value?.toLowerCase();
    const category = document.getElementById('categorySelect')?.value?.toLowerCase();

    // If no filters, restore from cache
    if (!animalType && !category) {
        if (_allSwipeAnimals.length > 0) {
            currentAnimals = [..._allSwipeAnimals];
            renderCards();
            if (currentAnimals.length > 0) showPetDetails(currentAnimals[currentAnimals.length - 1].id);
        }
        return;
    }

    // Filter from the full cache
    const source = _allSwipeAnimals.length > 0 ? _allSwipeAnimals : currentAnimals;
    currentAnimals = source.filter(a => {
        const aCategory = (a.category || '').toLowerCase();
        const aType = (a.type || a.species || '').toLowerCase();
        const aBreed = (a.breed || '').toLowerCase();
        const aName = (a.name || '').toLowerCase();
        const combined = aType + ' ' + aBreed + ' ' + aName;

        if (category === 'pet') {
            const isPet = aCategory === 'pet' || PET_TYPES.some(t => combined.includes(t));
            if (!isPet) return false;
        } else if (category === 'livestock') {
            const isLivestock = aCategory === 'livestock' || LIVESTOCK_TYPES.some(t => combined.includes(t));
            if (!isLivestock) return false;
        }

        if (animalType && animalType !== '') {
            if (!combined.includes(animalType)) return false;
        }
        return true;
    });

    renderCards();
    if (currentAnimals.length > 0) {
        showPetDetails(currentAnimals[currentAnimals.length - 1].id);
    } else {
        const content = document.getElementById('petDetailsContent');
        if (content) content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><div style="font-size:40px;">🔍</div><p>No animals match this filter</p><button class="empty-btn primary" onclick="resetFilters()" style="margin-top:16px;">Clear Filters</button></div>';
    }
}

async function resetFilters() {
    showToast('Resetting swipe deck...');
    try {
        // Only delete left-swipes (passed) — keep right-swipes (liked/matched) intact
        await window.supabase
            .from('swipe_history')
            .delete()
            .eq('user_id', currentUserId)
            .eq('direction', 'left');
    } catch (err) {
        console.error('resetFilters error:', err);
    }
    // Reset only passed in-memory state — keep liked intact
    passed = [];
    currentAnimals = [];
    _allSwipeAnimals = [];
    const breedSelect = document.getElementById('breedSelect');
    if (breedSelect) breedSelect.value = '';
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) categorySelect.value = '';
    if (matchesList) renderBreedersTab('liked');
    await loadSwipeAnimals();
    showToast('Swipe deck reset! 🔄');
}

function showPassed() {
    renderBreedersTab('passed');
    const passedTab = document.getElementById('tabPassed');
    if (passedTab) passedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Old messenger functions removed — the unified messages modal
// (injected by messages-loader.js + messages.js) is the single messaging system.


// Close the static document modal (swipe.html #documentModal)
function closeDocumentModal() {
    const modal = document.getElementById('documentModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}
window.closeDocumentModal = closeDocumentModal;
window.showDocuments = showDocuments;
window.showPetDetails = showPetDetails;
window.closePetDetails = closePetDetails;
window.swipe = swipe;
window.toggleFilters = toggleFilters;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.showPassed = showPassed;
window.renderBreedersTab = renderBreedersTab;
window.closeMatch = closeMatch;
window.messageMatch = messageMatch;
window.rateMatchBreeder = rateMatchBreeder;
