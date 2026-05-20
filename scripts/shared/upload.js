// storage.js — BreedLink image/file upload helpers
const StorageAPI = {

    // Get a guaranteed-fresh JWT by always hitting the refresh endpoint directly.
    // Returns the fresh access token string, or throws if login is required.
    async _getFreshToken() {
        const SUPABASE_URL      = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

        const refreshToken = sessionStorage.getItem('breedlink_refresh_token');
        if (!refreshToken) {
            throw new Error('Session expired — please log out and log back in');
        }

        try {
            const response = await fetch(
                SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({ refresh_token: refreshToken })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                // Refresh token itself is expired/invalid — user must log in again
                console.error('[StorageAPI] Refresh token rejected:', data);
                // Clear stale tokens so the app redirects to login
                sessionStorage.removeItem('breedlink_token');
                sessionStorage.removeItem('breedlink_refresh_token');
                throw new Error('Session expired — please log out and log back in');
            }

            // Store the new tokens
            if (data.access_token) {
                sessionStorage.setItem('breedlink_token', data.access_token);
            }
            if (data.refresh_token) {
                sessionStorage.setItem('breedlink_refresh_token', data.refresh_token);
            }

            console.log('[StorageAPI] Token refreshed successfully before upload');
            return data.access_token;

        } catch (err) {
            if (err.message && err.message.includes('log')) throw err; // rethrow our own errors
            throw new Error('Could not refresh session: ' + err.message);
        }
    },

    async uploadImage(file, bucket) {
        console.log('[StorageAPI] Uploading to', bucket, ':', file.name);

        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            throw new Error('Supabase not configured');
        }

        // Validate file type and size before uploading
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and AVIF images are allowed.');
        }
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error('File exceeds the 10 MB size limit.');
        }

        // Resolve userId
        let userId = null;
        if (window.User && window.User.current && window.User.current.id) {
            userId = window.User.current.id;
        }
        if (!userId) {
            try {
                const str = sessionStorage.getItem('breedlink_user');
                if (str) {
                    const u = JSON.parse(str);
                    if (u && u.id && u.id !== 'null') userId = u.id;
                }
            } catch (e) {}
        }
        if (!userId) {
            try {
                const { data } = await window.supabase.auth.getUser();
                userId = data?.user?.id || null;
            } catch (e) {}
        }
        if (!userId) throw new Error('Not authenticated — please log in again');

        // Always get a guaranteed-fresh token before uploading
        const freshToken = await this._getFreshToken();

        const timestamp  = Date.now();
        const randomStr  = Math.random().toString(36).substring(2, 8);
        const fileExt    = file.name.split('.').pop().toLowerCase();
        const filePath   = `${userId}/${timestamp}_${randomStr}.${fileExt}`;

        console.log('[StorageAPI] Upload path:', filePath);

        // Upload directly with the fresh token — bypass authedFetch entirely
        const uploadUrl = `${window.SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;

        let response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'apikey':        window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${freshToken}`,
                'x-upsert':     'true'
            },
            body: file
        });

        // If still rejected (e.g. clock skew), try once more with another refresh
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            const msg = (errBody?.message || errBody?.error || '').toLowerCase();
            console.warn('[StorageAPI] Upload failed first attempt:', response.status, msg);

            if (response.status === 400 || response.status === 401) {
                console.log('[StorageAPI] Retrying with second token refresh...');
                const retryToken = await this._getFreshToken();
                response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'apikey':        window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${retryToken}`,
                        'x-upsert':     'true'
                    },
                    body: file
                });
            }
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Upload failed with status ' + response.status }));
            throw new Error(err.message || err.error || 'Upload failed');
        }

        const { data } = window.supabase.storage.from(bucket).getPublicUrl(filePath);
        console.log('[StorageAPI] Uploaded URL:', data.publicUrl);
        return data.publicUrl;
    },

    async uploadProfilePicture(file) { return this.uploadImage(file, 'avatars'); },
    async uploadCoverPhoto(file)     { return this.uploadImage(file, 'covers'); },
    async uploadAnimalImage(file)    { return this.uploadImage(file, 'animals'); },
    async uploadPostImage(file)      { return this.uploadImage(file, 'posts'); },
    async uploadMessageImage(file)   { return this.uploadImage(file, 'messages'); },
    async uploadAnimalDocument(file) { return this.uploadDocument(file); },

    async uploadDocument(file) {
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            throw new Error('Supabase not configured');
        }

        let userId = null;
        if (window.User && window.User.current && window.User.current.id) {
            userId = window.User.current.id;
        }
        if (!userId) {
            try {
                const { data } = await window.supabase.auth.getUser();
                userId = data?.user?.id || null;
            } catch (e) {}
        }
        if (!userId) throw new Error('Please log in first');

        const freshToken = await this._getFreshToken();

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileExt   = file.name.split('.').pop().toLowerCase();
        const filePath  = `${userId}/${timestamp}_${randomStr}.${fileExt}`;
        const uploadUrl = `${window.SUPABASE_URL}/storage/v1/object/documents/${filePath}`;

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'apikey':        window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${freshToken}`,
                'x-upsert':     'true'
            },
            body: file
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(err.message || 'Document upload failed');
        }

        const { data } = window.supabase.storage.from('documents').getPublicUrl(filePath);
        return { url: data.publicUrl, name: file.name, type: file.type, size: file.size };
    }
};

window.StorageAPI = StorageAPI;
console.log('✅ StorageAPI ready');
