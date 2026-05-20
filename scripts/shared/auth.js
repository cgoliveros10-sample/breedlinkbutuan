// auth.js - BreedLink Authentication System
// Supabase client is initialized in supabase-init.js

function getToken() {
    return sessionStorage.getItem('breedlink_token') || '';
}

// USER OBJECT (Complete)
// ============================================
// ── Login rate-limit (client-side defence-in-depth) ─────────────────────────
// Max 5 attempts per 15-minute window, stored in sessionStorage so it resets
// when the tab is closed. Supabase's own server-side limiting is the real guard.
const _rl = {
    MAX: 5,
    WINDOW_MS: 15 * 60 * 1000,
    key: 'bl_login_attempts',
    _load() {
        try { return JSON.parse(sessionStorage.getItem(this.key)) || { count: 0, since: Date.now() }; }
        catch(_) { return { count: 0, since: Date.now() }; }
    },
    _save(state) {
        try { sessionStorage.setItem(this.key, JSON.stringify(state)); } catch(_) {}
    },
    check() {
        const s = this._load();
        if (Date.now() - s.since > this.WINDOW_MS) {
            this._save({ count: 0, since: Date.now() });
            return true; // window reset
        }
        if (s.count >= this.MAX) {
            const waitMin = Math.ceil((this.WINDOW_MS - (Date.now() - s.since)) / 60000);
            throw new Error(`Too many login attempts. Please wait ${waitMin} minute${waitMin !== 1 ? 's' : ''} before trying again.`);
        }
        return true;
    },
    record() {
        const s = this._load();
        if (Date.now() - s.since > this.WINDOW_MS) { this._save({ count: 1, since: Date.now() }); return; }
        this._save({ count: s.count + 1, since: s.since });
    },
    reset() {
        try { sessionStorage.removeItem(this.key); } catch(_) {}
    }
};

const User = {
    current: null,

    async fetchFromSupabase(userId) {
        try {
            const { data: profile, error } = await window.supabase
                .from('profiles')
                .select('id,name,profile_picture,cover_photo,bio,account_type,location,contact,tags,stats,username')
                .eq('id', userId)
                .single();
            
            // PGRST116 = row not found, that is not an error worth throwing
            if (error && error.code !== 'PGRST116') throw error;
            if (!profile) return null;
            
            return {
                id: userId,
                name: profile?.name || 'User',
                email: profile?.contact?.email || '',
                avatar: profile?.profile_picture || defaultAvatar(profile?.name || 'User'),
                coverPhoto: profile?.cover_photo || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
                bio: profile?.bio || '',
                tags: profile?.tags || [],
                accountType: profile?.account_type || 'breeder',
                contact: profile?.contact || { email: '', phone: '', location: '' },
                stats: profile?.stats || { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 },
                location: profile?.location || ''
            };
        } catch (error) {
            console.error('Fetch from Supabase error:', error);
            return null;
        }
    },

    async getFreshUser() {
        try {
            const token = sessionStorage.getItem('breedlink_token');
            if (!token) return null;

            let userId = null;

            if (this.current && this.current.id) {
                userId = this.current.id;
            } else {
                const storedUser = sessionStorage.getItem('breedlink_user');
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        userId = parsed.id;
                    } catch(e) {}
                }
            }

            // If still no userId, get it from Supabase auth endpoint
            if (!userId) {
                try {
                    const { data } = await window.supabase.auth.getUser();
                    userId = data?.user?.id || null;
                } catch (e) {}
            }

            if (!userId) return null;

            const freshUser = await this.fetchFromSupabase(userId);
            if (freshUser) {
                this.current = freshUser;
                sessionStorage.setItem('breedlink_user', JSON.stringify(freshUser));
                return freshUser;
            }

            return this.current;
        } catch(e) {
            console.warn('getFreshUser() error (non-fatal):', e);
            return this.current;
        }
    },

    async login(email, password) {
        try {
            _rl.check(); // client-side rate limit check
            const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
            
            if (error) { _rl.record(); throw new Error(error.message); }
            if (!data || !data.user) { _rl.record(); throw new Error('Please check your username/email or password and try again.'); }
            
            const freshUser = await this.fetchFromSupabase(data.user.id);
            _rl.reset(); // clear failed attempts on successful login
            if (freshUser) {
                this.current = freshUser;
            } else {
                // Profile row missing — create a fallback and upsert it so it exists going forward
                const fallback = {
                    id: data.user.id,
                    name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
                    email: data.user.email,
                    avatar: defaultAvatar(data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'),
                    coverPhoto: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
                    bio: '',
                    tags: [],
                    accountType: data.user.user_metadata?.account_type || 'breeder',
                    contact: { email: data.user.email, phone: '', location: '' },
                    stats: { connections: 0, litters: 0, rating: 0, followers: 0, following: 0 },
                    location: data.user.user_metadata?.location || ''
                };
                // Upsert so future logins will find this row
                try {
                    await window.supabase.from('profiles').upsert({
                        id: data.user.id,
                        name: fallback.name,
                        account_type: fallback.accountType,
                        profile_picture: fallback.avatar,
                        cover_photo: fallback.coverPhoto,
                        bio: '',
                        tags: [],
                        contact: fallback.contact,
                        stats: fallback.stats,
                        location: fallback.location
                    }, { onConflict: 'id' });
                } catch(e) { console.warn('Profile upsert on login failed:', e); }
                this.current = fallback;
            }
            
            // Store session tokens so isAuthenticated() works
            if (data.session) {
                sessionStorage.setItem('breedlink_token', data.session.access_token);
                if (data.session.refresh_token) {
                    sessionStorage.setItem('breedlink_refresh_token', data.session.refresh_token);
                }
            }
            sessionStorage.setItem('breedlink_user', JSON.stringify(this.current));

            // Check if account is pending deletion
            try {
                const { data: delCheck } = await window.supabase
                    .from('profiles')
                    .select('deletion_requested_at, deletion_deadline')
                    .eq('id', data.user.id)
                    .maybeSingle();
                if (delCheck && delCheck.deletion_requested_at) {
                    return { ...this.current, __pendingDeletion: true, deletion_deadline: delCheck.deletion_deadline };
                }
            } catch(e) {}

            return this.current;
            
        } catch (error) {
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('invalid login credentials') || msg.includes('invalid email or password') || msg.includes('invalid_grant')) {
                throw new Error('Incorrect email or password. Please try again.');
            }
            if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
                throw new Error('Please verify your email address before logging in. Check your inbox.');
            }
            if (msg.includes('user not found')) {
                throw new Error('No account found with that email. Please sign up instead.');
            }
            if (msg.includes('too many') || msg.includes('rate')) {
                throw new Error('Too many login attempts. Please wait a moment and try again.');
            }
            // Don't expose raw Supabase errors to the user
            const safeMsg = error.message && !error.message.includes('supabase') && !error.message.includes('pgrst') ? error.message : null;
            throw new Error(safeMsg || 'Please check your username/email or password and try again.');
        }
    },

    async signup(userData) {
        try {
            // Build Supabase signUp payload — OTP (6-digit code) mode for email
            let signUpPayload;
            if (userData.phone && !userData.email) {
                // Phone-based signup
                signUpPayload = {
                    phone: userData.phone,
                    password: userData.password,
                    options: {
                        data: {
                            name: userData.name,
                            account_type: userData.accountType,
                            location: userData.location || ''
                        }
                    }
                };
            } else {
                // Email-based signup — Supabase will send a 6-digit OTP code
                // (requires "Enable email OTP" ON and "OTP length = 6" in Supabase Auth settings)
                signUpPayload = {
                    email: userData.email,
                    password: userData.password,
                    options: {
                        // emailRedirectTo is not used when OTP mode is active,
                        // but we keep it as fallback for magic-link mode
                        emailRedirectTo: window.location.origin + window.location.pathname.replace(/\/pages\/.*$/, '/') + 'pages/email-action.html',
                        data: {
                            name: userData.name,
                            account_type: userData.accountType,
                            phone: userData.phone || '',
                            location: userData.location || ''
                        }
                    }
                };
            }

            const { data, error } = await window.supabase.auth.signUp(signUpPayload);
            
            if (error) throw new Error(error.message);
            if (!data || !data.user) throw new Error('Signup failed');

            // ── OTP flow: session is null until user verifies the 6-digit code ──
            // Store pending signup data so verify-otp.html can create the profile after verification
            const pendingData = {
                userId: data.user.id,
                email: userData.email || '',
                phone: userData.phone || '',
                name: userData.name,
                username: userData.username || '',
                accountType: userData.accountType || 'breeder',
                location: userData.location || ''
            };
            sessionStorage.setItem('breedlink_pending_signup', JSON.stringify(pendingData));

            // If Supabase returned no session the user must verify OTP — redirect to verify page
            if (!data.session) {
                return { __awaitingOtp: true, email: userData.email, phone: userData.phone };
            }
            
            const defaultContact = {
                email: userData.email || '',
                phone: userData.phone || '',
                location: userData.location || ''
            };
            
            const defaultStats = {
                connections: 0,
                litters: 0,
                rating: 0,
                followers: 0,
                following: 0
            };
            
            await window.supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    name: userData.name,
                    account_type: userData.accountType,
                    profile_picture: null,
                    cover_photo: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
                    bio: '',
                    tags: [],
                    contact: defaultContact,
                    stats: defaultStats,
                    location: userData.location || ''
                });
            
            this.current = {
                id: data.user.id,
                name: userData.name,
                email: userData.email,
                avatar: defaultAvatar(userData.name),
                coverPhoto: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
                bio: '',
                tags: [],
                accountType: userData.accountType,
                contact: defaultContact,
                stats: defaultStats,
                location: userData.location || ''
            };
            
            // Store session tokens
            if (data.session) {
                sessionStorage.setItem('breedlink_token', data.session.access_token);
                if (data.session.refresh_token) {
                    sessionStorage.setItem('breedlink_refresh_token', data.session.refresh_token);
                }
                // Profile created without OTP — clear pending data
                sessionStorage.removeItem('breedlink_pending_signup');
            }
            sessionStorage.setItem('breedlink_user', JSON.stringify(this.current));
            return this.current;
            
        } catch (error) {
            const msg = error.message || '';
            if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already been registered')) {
                throw new Error('An account with this email already exists. Please sign in instead.');
            }
            if (msg.toLowerCase().includes('email already')) {
                throw new Error('This email is already in use. Please log in or use a different email.');
            }
            if (msg.toLowerCase().includes('password')) {
                throw new Error('Password is too weak. Please use at least 6 characters.');
            }
            throw new Error(msg || 'Signup failed. Please try again.');
        }
    },

    async logout() {
        try { await window.supabase.auth.signOut(); } catch(e) {}
        this.current = null;
        sessionStorage.removeItem('breedlink_token');
        sessionStorage.removeItem('breedlink_refresh_token');
        sessionStorage.removeItem('breedlink_user');
        localStorage.removeItem('breedlink_remember');
        sessionStorage.clear();

        // Show toast if available, otherwise just redirect
        if (typeof showToast === 'function') showToast('Logged out successfully! 👋');

        // Build the correct path to index.html regardless of current folder depth
        // Pages are inside /pages/ subfolder; index.html sits one level up
        const inSubfolder = window.location.pathname.includes('/pages/');
        let indexPath;
        if (inSubfolder) {
            indexPath = window.location.pathname.replace(/\/pages\/[^\/]*$/, '/index.html');
        } else {
            // Already at root level (e.g. index.html itself)
            indexPath = window.location.pathname.replace(/\/[^\/]*$/, '/index.html');
        }

        setTimeout(() => {
            window.location.href = indexPath || '../index.html';
        }, 300);
    },

    isAuthenticated() {
        const token = sessionStorage.getItem('breedlink_token');
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // If token is expired, clear stale session data and treat as logged out
            if ((payload.exp * 1000) < Date.now()) {
                sessionStorage.removeItem('breedlink_token');
                sessionStorage.removeItem('breedlink_refresh_token');
                sessionStorage.removeItem('breedlink_user');
                return false;
            }
        } catch (e) {
            // Can't decode token — clear it to be safe
            sessionStorage.removeItem('breedlink_token');
            sessionStorage.removeItem('breedlink_user');
            return false;
        }
        return true;
    },

    getUser() {
        if (this.current && this.current.id) return this.current;
        const stored = sessionStorage.getItem('breedlink_user');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Guard against stored user with null/undefined id (corrupted state)
                if (parsed && parsed.id && parsed.id !== 'null' && parsed.id !== 'undefined') {
                    this.current = parsed;
                    return this.current;
                } else {
                    // Corrupted — clear it
                    sessionStorage.removeItem('breedlink_user');
                    return null;
                }
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    async updateUser(updates) {
        let user = this.getUser();
        // If getUser() returned null or no id, try a live recovery from Supabase
        if (!user || !user.id || user.id === 'null') {
            try {
                const { data } = await window.supabase.auth.getUser();
                if (data?.user?.id) {
                    const freshUser = await this.fetchFromSupabase(data.user.id);
                    if (freshUser) {
                        this.current = freshUser;
                        sessionStorage.setItem('breedlink_user', JSON.stringify(freshUser));
                        user = freshUser;
                    }
                }
            } catch(e) {}
        }
        if (!user) throw new Error('Not authenticated');
        if (!user.id || user.id === 'null') throw new Error('User ID is missing — please log out and log back in');

        try {
            const updateData = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.bio !== undefined) updateData.bio = updates.bio;
            if (updates.tags !== undefined) updateData.tags = updates.tags;
            if (updates.contact !== undefined) updateData.contact = updates.contact;
            if (updates.stats !== undefined) updateData.stats = updates.stats;
            if (updates.profilePicture !== undefined) updateData.profile_picture = updates.profilePicture;
            if (updates.coverPhoto !== undefined) updateData.cover_photo = updates.coverPhoto;
            if (updates.location !== undefined) updateData.location = updates.location;

            if (Object.keys(updateData).length > 0) {
                const { error } = await window.supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', user.id);
                if (error) throw error;
            }

            // Merge updates into current, normalizing profilePicture -> avatar
            const merged = { ...user, ...updates };
            if (updates.profilePicture !== undefined) {
                merged.avatar = updates.profilePicture;
            }
            this.current = merged;
            sessionStorage.setItem('breedlink_user', JSON.stringify(this.current));

            // Update navbar avatar immediately
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) {
                const avatarSrc = this.current.avatar || defaultAvatar(this.current.name || 'User');
                profileBtn.innerHTML = `<img src="${avatarSrc}" alt="${this.current.name || 'User'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            }

            // Broadcast avatar change so posts, comments, conversations, and
            // swipe cards all update without a page reload
            if (updates.profilePicture !== undefined) {
                try {
                    window.dispatchEvent(new CustomEvent('breedlink:avatarChanged', {
                        detail: { userId: this.current.id, avatarUrl: this.current.avatar }
                    }));
                } catch (e) { /* non-fatal */ }
            }

            return this.current;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    async refresh() {
        try {
            const freshUser = await this.getFreshUser();
            if (freshUser) {
                this.current = freshUser;
                sessionStorage.setItem('breedlink_user', JSON.stringify(freshUser));
                
                // Update profile button
                const profileBtn = document.getElementById('profileBtn');
                if (profileBtn) {
                    const avatarSrc = this.current.avatar || defaultAvatar(this.current.name || 'User');
                    profileBtn.innerHTML = `<img src="${avatarSrc}" alt="${this.current.name || 'User'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }
            }
            return this.current;
        } catch(e) {
            console.warn('User.refresh() failed (non-fatal):', e);
            return this.current;
        }
    },

    async getProfile(userId) {
        try {
            const { data, error } = await window.supabase
                .from('profiles')
                .select('id,name,profile_picture,cover_photo,bio,account_type,location,contact,tags,stats,username')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            return null;
        }
    },

    async logActivity(action, entityType, entityId, details = {}) {
        const user = this.getUser();
        if (!user) return;
        
        try {
            await window.supabase
                .from('activity_log')
                .insert({
                    user_id: user.id,
                    action: action,
                    entity_type: entityType,
                    entity_id: entityId,
                    details: details,
                    user_agent: navigator.userAgent
                });
        } catch (e) {
            console.error('Activity log error:', e);
        }
    },

    async getNotifications(limit = 20) {
        const user = this.getUser();
        if (!user) return [];
        
        try {
            const { data, error } = await window.supabase
                .from('notifications')
                .select('id,user_id,type,message,read,created_at,data')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get notifications error:', error);
            return [];
        }
    },

    async createNotification(userId, type, referenceId, title, message) {
        try {
            await window.supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    type: type,
                    reference_id: referenceId,
                    title: title,
                    message: message
                });
        } catch (e) {
            console.error('Notification error:', e);
        }
    },

    async followUser(userIdToFollow) {
        const user = this.getUser();
        if (!user) throw new Error('Not authenticated');
        
        try {
            await window.supabase
                .from('follows')
                .insert({
                    follower_id: user.id,
                    following_id: userIdToFollow,
                    status: 'accepted'
                });
            
            await this.updateUser({ 
                stats: { ...user.stats, following: (user.stats?.following || 0) + 1 }
            });
            
            return true;
        } catch (error) {
            console.error('Follow user error:', error);
            return false;
        }
    },

    async unfollowUser(userIdToUnfollow) {
        const user = this.getUser();
        if (!user) throw new Error('Not authenticated');
        
        try {
            await window.supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', userIdToUnfollow);
            
            await this.updateUser({ 
                stats: { ...user.stats, following: Math.max(0, (user.stats?.following || 0) - 1) }
            });
            
            return true;
        } catch (error) {
            console.error('Unfollow user error:', error);
            return false;
        }
    },

    async getFollowers() {
        const user = this.getUser();
        if (!user) return [];
        
        try {
            const { data, error } = await window.supabase
                .from('follows')
                .select('follower_id, profiles:follower_id (id, name, profile_picture)')
                .eq('following_id', user.id);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get followers error:', error);
            return [];
        }
    },

    async getFollowing() {
        const user = this.getUser();
        if (!user) return [];
        
        try {
            const { data, error } = await window.supabase
                .from('follows')
                .select('following_id, profiles:following_id (id, name, profile_picture)')
                .eq('follower_id', user.id);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get following error:', error);
            return [];
        }
    }
};

// ============================================
// PASSWORD STRENGTH CHECKER
// ============================================
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) {
        strength++;
    } else {
        feedback.push('At least 8 characters');
    }
    
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
        strength++;
    } else {
        feedback.push('Include both uppercase and lowercase letters');
    }
    
    if (password.match(/[0-9]/) && password.match(/[^a-zA-Z0-9]/)) {
        strength++;
    } else {
        feedback.push('Include numbers and special characters');
    }
    
    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Strong'];
    const strengthColors = ['#FF6B6B', '#FFA06B', '#FFD93D', '#4CAF50'];
    
    return { score: strength, text: strengthLevels[strength], color: strengthColors[strength], feedback };
}

function updatePasswordStrength(passwordInput, strengthContainerId) {
    if (!passwordInput) return;
    const container = document.getElementById(strengthContainerId);
    if (!container) return;
    
    const password = passwordInput.value;
    const strength = checkPasswordStrength(password);
    
    const segments = container.querySelectorAll('.strength-segment');
    segments.forEach((segment, index) => {
        segment.className = 'strength-segment';
        if (index < strength.score) {
            if (strength.score === 1) segment.classList.add('weak');
            else if (strength.score === 2) segment.classList.add('medium');
            else if (strength.score === 3) segment.classList.add('strong');
        }
    });
    
    const strengthText = container.querySelector('.strength-text');
    if (strengthText) {
        strengthText.innerHTML = `<span style="color: ${strength.color}">${strength.text}</span>`;
    }
    
    const feedbackDiv = container.querySelector('.strength-feedback');
    if (feedbackDiv) {
        if (strength.score < 3 && password.length > 0) {
            feedbackDiv.innerHTML = strength.feedback.map(f => `• ${f}`).join('<br>');
            feedbackDiv.style.display = 'block';
        } else {
            feedbackDiv.style.display = 'none';
        }
    }
}

// ============================================
// PASSWORD TOGGLE
// ============================================
function togglePassword(inputId, buttonElement) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            buttonElement.textContent = '🙈';
        } else {
            input.type = 'password';
            buttonElement.textContent = '👁️';
        }
    }
}

// ============================================
// LOGIN/SIGNUP HANDLERS
// ============================================
async function handleForgotPassword(event) {
    // Forgot password now uses a 6-digit OTP flow via the overlay panel in login.html.
    // This function opens that panel instead of sending a reset link.
    if (event) event.preventDefault();
    if (typeof openForgotPanel === 'function') {
        const email = document.getElementById('email')?.value?.trim() || '';
        openForgotPanel(email);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const submitBtn = document.getElementById('submitBtn');
    const rememberMe = document.getElementById('rememberMe')?.checked;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
    }
    
    try {
        const user = await User.login(email, password);
        
        if (rememberMe) {
            localStorage.setItem('breedlink_remember', email);
        } else {
            localStorage.removeItem('breedlink_remember');
        }
        
        // Account pending deletion — show recovery prompt
        if (user.__pendingDeletion) {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In →'; }
            showDeletionPrompt(user);
            return;
        }

        showToast(`Welcome back, ${user.name}! 🎉`);
        
        setTimeout(() => {
            window.location.href = 'swipe.html';
        }, 800);
    } catch (error) {
        showToast(error.message, 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In →';
        }
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    const terms = document.getElementById('terms')?.checked;
    const phone = document.getElementById('phone')?.value;
    
    const selected = document.querySelector('.account-type.selected');
    const accountType = selected?.getAttribute('data-type') || 'breeder';
    
    if (!name || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (!terms) {
        showToast('Please accept the Terms of Service', 'error');
        return;
    }
    
    const btn = document.getElementById('createBtn');
    if (btn) {
        btn.textContent = 'Creating...';
        btn.disabled = true;
    }
    
    try {
        const result = await User.signup({ name, email, password, accountType, phone });

        // OTP flow — Supabase sent a 6-digit code; redirect user to enter it
        if (result && result.__awaitingOtp) {
            showToast(`Check your email for a 6-digit code! 📧`, 'success');
            setTimeout(() => {
                window.location.href = 'verify-otp.html';
            }, 900);
            return;
        }

        showToast(`Welcome to BreedLink, ${result.name}! 🎉`);
        
        setTimeout(() => {
            window.location.href = 'swipe.html';
        }, 800);
    } catch (error) {
        const errMsg = error.message || 'Signup failed. Please try again.';
        const isExisting = errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('already in use');
        showToast(errMsg, 'error');
        if (isExisting) {
            // Show a helper link to the login page after a short delay
            setTimeout(() => {
                showToast('Already have an account? → Sign In', 'info');
            }, 2500);
        }
        if (btn) {
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    }
}

function autoFillRememberedEmail() {
    const remembered = localStorage.getItem('breedlink_remember');
    const emailInput = document.getElementById('email');
    if (remembered && emailInput) {
        emailInput.value = remembered;
    }
}

// ============================================
// NAVIGATION (Runs on EVERY page)
// ============================================
async function initNavigation() {
    // Refresh user data from server on every page load — but NEVER let this cause a logout
    if (User.isAuthenticated()) {
        try {
            await User.refresh();
        } catch(e) {
            // Network error or Supabase down — keep the user logged in, just use cached data
            console.warn('User refresh failed (non-fatal):', e);
        }
    }
    updateNavForAuthStatus();
    highlightActiveNavLink();

    // If nav avatar didn't render (user not yet in memory), fetch async and update
    (async () => {
        const profileBtn = document.getElementById('profileBtn');
        if (!profileBtn) return;
        // If already showing an image, skip
        if (profileBtn.querySelector('img')) return;
        try {
            const freshUser = await User.getFreshUser();
            if (freshUser && freshUser.avatar) {
                profileBtn.innerHTML = `<img src="${freshUser.avatar}" alt="${freshUser.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                profileBtn.onclick = () => toggleProfileDropdown();
            }
        } catch(_) {}
    })();
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('profileDropdown');
        const btn = document.getElementById('profileBtn');
        if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

function updateNavForAuthStatus() {
    const isLoggedIn = User.isAuthenticated();
    const user = User.getUser();
    const messageBtn = document.getElementById('messageBtn');
    const profileMenu = document.getElementById('profileMenuContainer');
    const guestOptions = document.getElementById('guestOptions');

    // Always reveal the hamburger button (CSS hides it above 480px anyway)
    const hamburger = document.getElementById('hamburgerBtn');
    if (hamburger) hamburger.style.display = '';

    if (isLoggedIn && user) {
        if (messageBtn) {
            messageBtn.style.display = 'flex';
            messageBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.openMessenger === 'function') {
                    window.openMessenger();
                } else if (typeof openMessenger === 'function') {
                    openMessenger();
                }
            };
        }
        if (profileMenu) {
            profileMenu.style.display = 'block';
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) {
                const avatarSrc = user.avatar || defaultAvatar(user.name || 'User');
                profileBtn.innerHTML = `<img src="${avatarSrc}" alt="${user.name || 'User'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                profileBtn.onclick = () => toggleProfileDropdown();
            }
        }
        if (guestOptions) guestOptions.style.display = 'none';
    } else {
        if (messageBtn) messageBtn.style.display = 'none';
        if (profileMenu) profileMenu.style.display = 'none';
        if (guestOptions) guestOptions.style.display = 'flex';
    }
}

function highlightActiveNavLink() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'home.html';
    
    const navLinks = {
        'home.html': 'nav-home',
        'about.html': 'nav-about',
        'swipe.html': 'nav-breeders'
    };
    
    document.querySelectorAll('.menu a').forEach(link => link.classList.remove('active'));
    
    if (navLinks[currentFile]) {
        const activeLink = document.getElementById(navLinks[currentFile]);
        if (activeLink) activeLink.classList.add('active');
    }
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function handleLogout() {
    // No confirm() — it gets swallowed by dropdown close events.
    // Just log out immediately.
    User.logout();
}

function protectSwipePage() {
    if (!window.location.pathname.includes('swipe.html')) return true;
    if (!User.isAuthenticated()) {
        sessionStorage.setItem('redirectAfterLogin', 'swipe.html');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ============================================
// MODAL FUNCTIONS
// ============================================
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
        setTimeout(() => {
            if (!modal.classList.contains('active')) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }, 300);
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
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.style.backgroundImage = `url('${e.target.result}')`;
                preview.classList.add('has-image');
                preview.innerHTML = '';
            }
        };
        reader.readAsDataURL(file);
    }
}

function openLightbox(src) {
    const modal = document.getElementById('lightboxModal');
    const img = document.getElementById('lightboxImg');
    if (modal && img) {
        img.src = src;
        openModal('lightboxModal');
    }
}

function formatDate(dateStr) {
    if (!dateStr) return 'Just now';
    try {
        const d = new Date(dateStr);
        if (isNaN(d)) return 'Just now';
        const now = new Date();
        const diff = now - d;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString();
    } catch (e) {
        return 'Just now';
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard! 📋');
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    await initNavigation();
    
    if (window.location.pathname.includes('login.html')) {
        autoFillRememberedEmail();
    }
    
    if (window.location.pathname.includes('swipe.html')) {
        protectSwipePage();
    }
});

// ============================================
// EXPOSE TO WINDOW
// ============================================
window.User = User;
window.showToast = showToast;
window.checkPasswordStrength = checkPasswordStrength;
window.updatePasswordStrength = updatePasswordStrength;
window.togglePassword = togglePassword;
window.handleForgotPassword = handleForgotPassword;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.autoFillRememberedEmail = autoFillRememberedEmail;
window.initNavigation = initNavigation;
window.updateNavForAuthStatus = updateNavForAuthStatus;
window.toggleProfileDropdown = toggleProfileDropdown;
window.handleLogout = handleLogout;
window.protectSwipePage = protectSwipePage;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.previewImage = previewImage;
window.openLightbox = openLightbox;
window.formatDate = formatDate;
window.copyToClipboard = copyToClipboard;

console.log('✅ auth.js loaded successfully - Full version with all features')

;
// ============================================
// USERNAME → EMAIL RESOLVER
// ============================================
async function resolveLoginIdentifier(identifier) {
    // If it looks like an email, use as-is
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return identifier;
    // Otherwise treat as username — look up their email in profiles
    // profiles has no top-level 'email' column — email lives inside contact JSONB
    try {
        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
        // Use a direct REST call with only the anon key (no Bearer token needed for public read)
        const url = SUPABASE_URL + '/rest/v1/profiles?select=contact,username&username=eq.' + encodeURIComponent(identifier.toLowerCase()) + '&limit=1';
        const resp = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Accept': 'application/json'
            }
        });
        if (!resp.ok) return null;
        const rows = await resp.json();
        if (!rows || !rows.length || !rows[0]) return null;
        const row = rows[0];
        // Email is stored in contact JSONB field
        return (row.contact && row.contact.email) || null;
    } catch (e) {
        return null;
    }
}

// Patch handleLogin to support username login
const _originalHandleLogin = window.handleLogin;
window.handleLogin = async function(event) {
    event.preventDefault();
    const rawIdentifier = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const submitBtn = document.getElementById('submitBtn');

    if (!rawIdentifier || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier);

    try {
        let email = await resolveLoginIdentifier(rawIdentifier);
        if (!email) {
            // Username not found in database
            if (!isEmail) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In →'; }
                showToast('Username not found. Please check your username or use your email.', 'error');
                return;
            }
            email = rawIdentifier;
        }

        const user = await User.login(email, password);
        const rememberMe = document.getElementById('rememberMe')?.checked;
        if (rememberMe) {
            localStorage.setItem('breedlink_remember', rawIdentifier);
        } else {
            localStorage.removeItem('breedlink_remember');
        }
        showToast('Welcome back, ' + user.name + '! 🎉');
        setTimeout(() => { window.location.href = 'swipe.html'; }, 800);
    } catch (error) {
        const rawMsg = (error.message || '').toLowerCase();
        let friendlyMsg;
        if (rawMsg.includes('incorrect email or password') || rawMsg.includes('invalid login credentials') || rawMsg.includes('invalid email or password') || rawMsg.includes('login failed')) {
            friendlyMsg = isEmail
                ? 'Please check your email or password and try again.'
                : 'Please check your username/email or password and try again.';
        } else if (rawMsg.includes('email not confirmed') || rawMsg.includes('not confirmed')) {
            friendlyMsg = 'Please verify your email address before logging in. Check your inbox.';
        } else if (rawMsg.includes('user not found') || rawMsg.includes('no account')) {
            friendlyMsg = isEmail
                ? 'No account found with that email. Please sign up instead.'
                : 'No account found with that username. Please sign up instead.';
        } else if (rawMsg.includes('network') || rawMsg === '') {
            friendlyMsg = 'Login failed. Please check your connection and try again.';
        } else {
            friendlyMsg = error.message || 'Please check your username/email or password and try again.';
        }
        showToast(friendlyMsg, 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In →'; }
    }
};

// ============================================
// ACCOUNT SETTINGS FUNCTIONS
// ============================================
window.AccountSettings = {

    // Change email (sends confirmation to new email via Supabase)
    async changeEmail(newEmail) {
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            throw new Error('Please enter a valid email address.');
        }
        // Verify session is active before attempting email change
        const { data: { user: sessionUser } } = await window.supabase.auth.getUser();
        if (!sessionUser) throw new Error('Session expired. Please log in again.');
        const { error } = await window.supabase.auth.updateUser(
            { email: newEmail },
            { emailRedirectTo: window.location.origin + window.location.pathname.replace(/\/pages\/.*$/, '/') + 'pages/email-action.html' }
        );
        if (error) throw error;
        // Optimistically update local profile
        const user = User.getUser();
        if (user) {
            await User.updateUser({ contact: { ...user.contact, email: newEmail } });
        }
    },

    // Change password (requires current password re-auth)
    async changePassword(currentPassword, newPassword) {
        if (!newPassword || newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters.');
        }
        // Get live email from Supabase session (not stale localStorage)
        const { data: { user: sessionUser } } = await window.supabase.auth.getUser();
        const email = sessionUser?.email || User.getUser()?.email;
        if (!email) throw new Error('Could not determine current account email. Please log in again.');
        // Re-authenticate with current password
        const { error: reAuthError } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: currentPassword
        });
        if (reAuthError) throw new Error('Current password is incorrect.');
        // Update to new password (token refreshed inside updateUser)
        const { error } = await window.supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    },

    // Soft-delete account (marks for deletion, recoverable within 7 days)
    async deleteAccount(password) {
        const user = User.getUser();
        if (!user || !user.email) throw new Error('Not authenticated.');
        // Re-auth to confirm — save the fresh token so the PATCH below uses a valid session
        const { data: reAuthData, error: reAuthError } = await window.supabase.auth.signInWithPassword({
            email: user.email,
            password: password
        });
        if (reAuthError) throw new Error('Incorrect password. Account not deleted.');
        if (reAuthData?.session?.access_token) {
            sessionStorage.setItem('breedlink_token', reAuthData.session.access_token);
            if (reAuthData.session.refresh_token) {
                sessionStorage.setItem('breedlink_refresh_token', reAuthData.session.refresh_token);
            }
        }

        const deletedAt = new Date().toISOString();
        const recoverDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // Mark profile as pending deletion
        const { error } = await window.supabase
            .from('profiles')
            .update({
                deletion_requested_at: deletedAt,
                deletion_deadline: recoverDeadline
                // is_deleted set to true by DB trigger
            })
            .eq('id', user.id);
        if (error) throw error;

        // Sign out cleanly
        try { await window.supabase.auth.signOut(); } catch(e) {}
        this.current = null;
        sessionStorage.removeItem('breedlink_token');
        sessionStorage.removeItem('breedlink_refresh_token');
        sessionStorage.removeItem('breedlink_user');
        localStorage.removeItem('breedlink_remember');
        sessionStorage.clear();

        if (typeof showToast === 'function') showToast('Account scheduled for deletion. You have 7 days to recover it.', 'success');

        const inSubfolder = window.location.pathname.includes('/pages/');
        const loginPath = inSubfolder
            ? window.location.pathname.replace(/\/pages\/[^\/]*$/, '/pages/login.html')
            : window.location.pathname.replace(/\/[^\/]*$/, '/pages/login.html');
        setTimeout(() => { window.location.href = loginPath || '../pages/login.html'; }, 1200);
    },

    // Recover account within 7-day window (call from a recovery page)
    async recoverAccount(email, password) {
        const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { error: recoverError } = await window.supabase
            .from('profiles')
            .update({
                deletion_requested_at: null,
                deletion_deadline: null,
                is_deleted: false
            })
            .eq('id', data.user.id);
        if (recoverError) throw recoverError;
        return true;
    }
};
