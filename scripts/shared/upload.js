// upload.js — BreedLink image/file upload helpers
// Uses window.supabase.storage (from db.js) for all uploads.
// db.js owns ALL token refresh logic — this file never touches tokens directly.

const StorageAPI = {

    // Resolve the current user's ID from multiple fallback sources
    async _getUserId() {
        if (window.User && window.User.current && window.User.current.id) {
            return window.User.current.id;
        }
        try {
            const str = sessionStorage.getItem('breedlink_user');
            if (str) {
                const u = JSON.parse(str);
                if (u && u.id && u.id !== 'null') return u.id;
            }
        } catch (e) {}
        try {
            const { data } = await window.supabase.auth.getUser();
            if (data?.user?.id) return data.user.id;
        } catch (e) {}
        return null;
    },

    async uploadImage(file, bucket) {
        console.log('[StorageAPI] Uploading to', bucket, ':', file.name);

        if (!window.supabase) throw new Error('Supabase not configured');

        // Validate file type and size
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and AVIF are allowed.');
        }
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error('File exceeds the 10 MB size limit.');
        }

        const userId = await this._getUserId();
        if (!userId) throw new Error('Not authenticated — please log in again');

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileExt   = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const filePath  = `${userId}/${timestamp}_${randomStr}.${fileExt}`;

        console.log('[StorageAPI] Upload path:', filePath);

        // Delegate entirely to db.js's supabase.storage — it handles token refresh
        const { error } = await window.supabase.storage.from(bucket).upload(filePath, file);
        if (error) throw new Error(error.message || error.error || 'Upload failed');

        const { data } = window.supabase.storage.from(bucket).getPublicUrl(filePath);
        console.log('[StorageAPI] Uploaded URL:', data.publicUrl);
        return data.publicUrl;
    },

    async uploadDocument(file) {
        if (!window.supabase) throw new Error('Supabase not configured');

        const userId = await this._getUserId();
        if (!userId) throw new Error('Please log in first');

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileExt   = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const filePath  = `${userId}/${timestamp}_${randomStr}.${fileExt}`;

        const { error } = await window.supabase.storage.from('documents').upload(filePath, file);
        if (error) throw new Error(error.message || 'Document upload failed');

        const { data } = window.supabase.storage.from('documents').getPublicUrl(filePath);
        return { url: data.publicUrl, name: file.name, type: file.type, size: file.size };
    },

    async uploadProfilePicture(file) { return this.uploadImage(file, 'avatars');   },
    async uploadCoverPhoto(file)     { return this.uploadImage(file, 'covers');    },
    async uploadAnimalImage(file)    { return this.uploadImage(file, 'animals');   },
    async uploadPostImage(file)      { return this.uploadImage(file, 'posts');     },
    async uploadMessageImage(file)   { return this.uploadImage(file, 'messages'); },
    async uploadAnimalDocument(file) { return this.uploadDocument(file);           },
};

window.StorageAPI = StorageAPI;
console.log('✅ StorageAPI ready');
