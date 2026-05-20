// db.js — Supabase config, init, and readiness waiter
// config.js
//
// ⚠️  These values are injected at build time by your hosting platform.
//     Never hardcode real keys here.  Set the following environment
//     variables in Netlify / Vercel / Cloudflare Pages:
//
//       SUPABASE_URL      → https://<your-project>.supabase.co
//       SUPABASE_ANON_KEY → your project's anon/public JWT
//
//     Netlify:  Site settings → Environment variables
//     Vercel:   Project settings → Environment variables
//
//     The %%VAR%% tokens below are replaced by the build plugin / edge
//     function before the file is served.  If you see a literal
//     "%%SUPABASE_URL%%" in the browser, the substitution step is missing.
//
const SUPABASE_URL      = '%%SUPABASE_URL%%';
const SUPABASE_ANON_KEY = '%%SUPABASE_ANON_KEY%%';
console.log('Config loaded');
// wait.js - Waits for Supabase to be ready
(function() {
    window.waitForSupabase = function() {
        return new Promise((resolve) => {
            if (window.supabase && window.supabaseReady) {
                resolve(window.supabase);
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (window.supabase && window.supabaseReady) {
                    clearInterval(checkInterval);
                    resolve(window.supabase);
                }
            }, 50);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('Supabase timeout');
                resolve(null);
            }, 5000);
        });
    };
    
    console.log('✅ wait.js loaded');
})();
// supabase-init.js — fetch-based Supabase client (no ES module needed)
(function () {
    function getToken() {
        return sessionStorage.getItem('breedlink_token') || '';
    }

    function getRefreshToken() {
        return sessionStorage.getItem('breedlink_refresh_token') || '';
    }

    // ── Check if a JWT is expired (or about to expire within 60s) ────────
    function isTokenExpired(token) {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // exp is in seconds; add 60s buffer so we refresh before it actually expires
            return (payload.exp * 1000) < (Date.now() + 60000);
        } catch (e) {
            return false; // Can't decode — assume valid, let server decide
        }
    }

    // ── Prevent concurrent refresh races ─────────────────────────────────
    let _refreshPromise = null;

    async function refreshAccessToken() {
        // If already refreshing, wait for that to finish instead of firing twice
        if (_refreshPromise) return _refreshPromise;

        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        _refreshPromise = (async () => {
            try {
                console.log('🔄 Refreshing access token...');
                const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });
                if (!response.ok) {
                    console.warn('Token refresh returned', response.status, '— keeping existing tokens');
                    return false;
                }
                const data = await response.json();
                if (data.access_token) {
                    sessionStorage.setItem('breedlink_token', data.access_token);
                    console.log('✅ Token refreshed successfully');
                }
                if (data.refresh_token) {
                    sessionStorage.setItem('breedlink_refresh_token', data.refresh_token);
                }
                return !!data.access_token;
            } catch (e) {
                console.warn('Token refresh network error:', e);
                return false;
            } finally {
                _refreshPromise = null;
            }
        })();

        return _refreshPromise;
    }

    // ── authedFetch: proactively refresh if expired, retry on 401/400 ────
    async function authedFetch(url, options = {}) {
        // Clone headers so we don't mutate the caller's object across retries
        options.headers = Object.assign({}, options.headers || {});
        options.headers['apikey'] = SUPABASE_ANON_KEY;

        // PROACTIVE refresh — check token expiry before sending
        const token = getToken();
        if (token && isTokenExpired(token)) {
            console.log('⚠️ Token expired — refreshing before request');
            await refreshAccessToken();
        }

        // Always read getToken() fresh after potential refresh above
        const freshToken = getToken();
        if (freshToken) {
            options.headers['Authorization'] = `Bearer ${freshToken}`;
        } else {
            // No token — send anon key only, no Authorization header (avoids invalid Bearer errors)
            delete options.headers['Authorization'];
        }
        let response = await fetch(url, options);

        // REACTIVE refresh — handle 401 or JWT error responses
        if (response.status === 401 || response.status === 400) {
            // Always use clone() so the original response body is never consumed here
            let isJwtError = response.status === 401;
            if (response.status === 400) {
                try {
                    const body = await response.clone().json();
                    const msg = (body?.message || body?.error || body?.hint || '').toLowerCase();
                    isJwtError = msg.includes('exp') || msg.includes('jwt') || msg.includes('expired') || msg.includes('token');
                } catch (e) { isJwtError = false; }
            }

            if (isJwtError) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    options.headers['Authorization'] = `Bearer ${getToken()}`;
                    response = await fetch(url, options);
                }
            }
        }

        return response;
    }

    // ── URL builder ──────────────────────────────────────────────────────
    function buildUrl(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN) {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}`;
        for (const [col, val] of filters) {
            url += `&${encodeURIComponent(col)}=eq.${encodeURIComponent(val)}`;
        }
        if (orFilter) {
            url += `&or=(${orFilter})`;
        }
        for (const [col, op, val] of notFilters) {
            url += `&${encodeURIComponent(col)}=${op}.${val}`;
        }
        if (orderCol) url += `&order=${encodeURIComponent(orderCol)}.${orderAsc ? 'asc' : 'desc'}`;
        if (limitN !== null) url += `&limit=${limitN}`;
        return url;
    }

    // ── Select chain ─────────────────────────────────────────────────────
    function makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, isSingle, extraFilters) {
        // Same as makeSelectChain but appends raw pre-encoded filter strings
        const chain = makeSelectChain(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, isSingle);
        const origThen = chain.then.bind(chain);
        chain.then = function(resolve) {
            // Patch: re-build url with extra filters
            const origBuild = buildUrl;
            const url = buildUrl(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN) + (extraFilters.length ? '&' + extraFilters.join('&') : '');
            const headers = {};
            if (isSingle) headers['Accept'] = 'application/vnd.pgrst.object+json';
            return authedFetch(url, { headers })
                .then(response => {
                    if (response.status === 406 || (isSingle && response.status === 404)) {
                        return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
                    }
                    return response.json().then(data => ({
                        data: response.ok ? data : null,
                        error: response.ok ? null : data
                    }));
                })
                .then(resolve)
                .catch(err => resolve({ data: null, error: err }));
        };
        // Add chainable methods that pass extra filters through
        chain.order = function(col, { ascending = true } = {}) {
            return makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, col, ascending, limitN, isSingle, extraFilters);
        };
        chain.limit = function(n) {
            return makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, n, isSingle, extraFilters);
        };
        chain.eq = function(col, val) {
            return makeSelectChainWithExtra(table, columns, [...filters, [col, val]], orFilter, notFilters, orderCol, orderAsc, limitN, isSingle, extraFilters);
        };
        chain.neq = function(col, val) {
            return makeSelectChainWithExtra(table, columns, filters, orFilter, [...notFilters, [col, 'neq', encodeURIComponent(val)]], orderCol, orderAsc, limitN, isSingle, extraFilters);
        };
        chain.filter = function(col, op, val) {
            const encoded = `${encodeURIComponent(col)}=${op}.${encodeURIComponent(val)}`;
            return makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, isSingle, [...extraFilters, encoded]);
        };
        chain.in = function(col, vals) {
            const newFilter = `${encodeURIComponent(col)}=in.(${vals.map(v => encodeURIComponent(v)).join(',')})`;
            return makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, isSingle, [...extraFilters, newFilter]);
        };
        chain.single = function() {
            return makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, true, extraFilters);
        };
        chain.maybeSingle = function() {
            // Like single() but returns { data: null, error: null } on no row found
            const inner = makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, 1, false, extraFilters);
            const origThen = inner.then.bind(inner);
            inner.then = function(resolve) {
                return origThen(function(result) {
                    if (result.data && Array.isArray(result.data)) {
                        return resolve({ data: result.data[0] || null, error: null });
                    }
                    return resolve({ data: result.data || null, error: null });
                });
            };
            return inner;
        };
        return chain;
    }

    function makeSelectChain(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, isSingle) {
        const chain = {
            eq(col, val) {
                return makeSelectChain(table, columns, [...filters, [col, val]], orFilter, notFilters, orderCol, orderAsc, limitN, isSingle);
            },
            neq(col, val) {
                // neq: not equal — adds as a notFilter with 'neq' operator
                return makeSelectChain(table, columns, filters, orFilter, [...notFilters, [col, 'neq', encodeURIComponent(val)]], orderCol, orderAsc, limitN, isSingle);
            },
            in(col, vals) {
                // in: value must be in the given array
                const inFilter = `${encodeURIComponent(col)}=in.(${vals.map(v => encodeURIComponent(v)).join(',')})`;
                return makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, isSingle, [inFilter]);
            },
            or(filter) {
                return makeSelectChain(table, columns, filters, filter, notFilters, orderCol, orderAsc, limitN, isSingle);
            },
            filter(col, op, val) {
                // Supports PostgREST operators like 'eq', 'neq', 'cs', etc.
                // Also supports JSONB path filters like 'contact->>email'
                const encoded = `${encodeURIComponent(col)}=${op}.${encodeURIComponent(val)}`;
                return makeSelectChainWithExtra(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, isSingle, [encoded]);
            },
            not(col, op, val) {
                return makeSelectChain(table, columns, filters, orFilter, [...notFilters, [col, op, val]], orderCol, orderAsc, limitN, isSingle);
            },
            order(col, { ascending = true } = {}) {
                return makeSelectChain(table, columns, filters, orFilter, notFilters, col, ascending, limitN, isSingle);
            },
            limit(n) {
                return makeSelectChain(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, n, isSingle);
            },
            single() {
                return makeSelectChain(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN, true);
            },
            maybeSingle() {
                // Like single() but returns { data: null, error: null } when no row found (instead of error)
                const chain = makeSelectChain(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, 1, false);
                const origThen = chain.then.bind(chain);
                chain.then = function(resolve) {
                    return origThen(function(result) {
                        if (result.data && Array.isArray(result.data)) {
                            return resolve({ data: result.data[0] || null, error: null });
                        }
                        return resolve({ data: result.data || null, error: null });
                    });
                };
                return chain;
            },
            then(resolve) {
                const url = buildUrl(table, columns, filters, orFilter, notFilters, orderCol, orderAsc, limitN);
                const headers = {};
                if (isSingle) headers['Accept'] = 'application/vnd.pgrst.object+json';
                return authedFetch(url, { headers })
                    .then(response => {
                        if (response.status === 406 || (isSingle && response.status === 404)) {
                            return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
                        }
                        return response.json().then(data => ({
                            data: response.ok ? data : null,
                            error: response.ok ? null : data
                        }));
                    })
                    .then(resolve)
                    .catch(err => resolve({ data: null, error: err }));
            }
        };
        return chain;
    }

    // ── Delete chain ─────────────────────────────────────────────────────
    function makeDeleteChain(table, filters, neqFilters) {
        neqFilters = neqFilters || [];
        const chain = {
            eq(col, val) {
                return makeDeleteChain(table, [...filters, [col, val]], neqFilters);
            },
            neq(col, val) {
                return makeDeleteChain(table, filters, [...neqFilters, [col, val]]);
            },
            then(resolve) {
                let url = `${SUPABASE_URL}/rest/v1/${table}?`;
                const parts = filters.map(([c, v]) => `${encodeURIComponent(c)}=eq.${encodeURIComponent(v)}`);
                const neqParts = neqFilters.map(([c, v]) => `${encodeURIComponent(c)}=neq.${encodeURIComponent(v)}`);
                url += [...parts, ...neqParts].join('&');
                return authedFetch(url, { method: 'DELETE' })
                    .then(() => resolve({ data: null, error: null }))
                    .catch(err => resolve({ data: null, error: err }));
            }
        };
        return chain;
    }

    // ── Update chain ─────────────────────────────────────────────────────
    function makeUpdateChain(table, data, filters) {
        const chain = {
            eq(col, val) {
                return makeUpdateChain(table, data, [...filters, [col, val]]);
            },
            then(resolve) {
                let url = `${SUPABASE_URL}/rest/v1/${table}?`;
                url += filters.map(([c, v]) => `${encodeURIComponent(c)}=eq.${encodeURIComponent(v)}`).join('&');
                return authedFetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (response.status === 204) return { data: null, error: null };
                    return response.json().then(result => ({
                        data: response.ok ? result : null,
                        error: response.ok ? null : result
                    }));
                })
                .then(resolve)
                .catch(err => resolve({ data: null, error: err }));
            }
        };
        return chain;
    }

    // ── Insert chain (supports .select() chaining) ────────────────────────
    function makeInsertChain(table, data, wantSelect) {
        const chain = {
            select() {
                return makeInsertChain(table, data, true);
            },
            then(resolve) {
                const prefer = wantSelect ? 'return=representation' : 'return=minimal';
                return authedFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Prefer': prefer
                    },
                    body: JSON.stringify(data)
                })
                .then(async response => {
                    // 200 or 201 with body (return=representation), 204 = no body (return=minimal)
                    if (response.status === 204) {
                        return { data: null, error: null };
                    }
                    if (response.ok) {
                        try {
                            const result = await response.json();
                            return { data: Array.isArray(result) ? result : [result], error: null };
                        } catch(e) {
                            return { data: null, error: null };
                        }
                    }
                    try {
                        const result = await response.json();
                        return { data: null, error: result };
                    } catch(e) {
                        return { data: null, error: { message: 'Insert failed with status ' + response.status } };
                    }
                })
                .then(resolve)
                .catch(err => resolve({ data: null, error: err }));
            }
        };
        return chain;
    }

    // ── Upsert ────────────────────────────────────────────────────────────
    async function doUpsert(table, data, options = {}) {
        // Remove spaces around commas for onConflict (Supabase expects no spaces)
        const onConflict = options.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict.replace(/\s*,\s*/g, ','))}` : '';
        try {
            const response = await authedFetch(`${SUPABASE_URL}/rest/v1/${table}${onConflict}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(data)
            });
            const result = (response.status === 204) ? null : await response.json().catch(() => null);
            return { data: response.ok ? result : null, error: response.ok ? null : result };
        } catch (error) {
            return { data: null, error };
        }
    }

    // ── Auth ──────────────────────────────────────────────────────────────
    window.supabase = {
        auth: {
            async signInWithPassword({ email, password }) {
                try {
                    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error_description || data.message || 'Login failed');
                    if (data.access_token) sessionStorage.setItem('breedlink_token', data.access_token);
                    if (data.refresh_token) sessionStorage.setItem('breedlink_refresh_token', data.refresh_token);
                    return { data: { user: data.user, session: { access_token: data.access_token } }, error: null };
                } catch (error) {
                    return { data: null, error };
                }
            },

            async signUp({ email, password, options }) {
                try {
                    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify({ email, password, data: options?.data || {} })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error_description || data.message || 'Signup failed');
                    if (data.access_token) sessionStorage.setItem('breedlink_token', data.access_token);
                    if (data.refresh_token) sessionStorage.setItem('breedlink_refresh_token', data.refresh_token);
                    // If no access_token, user needs OTP verification — return null session
                    // so auth.js correctly triggers the OTP flow instead of assuming login
                    const session = data.access_token
                        ? { access_token: data.access_token }
                        : null;
                    // Raw /auth/v1/signup returns user at top level, not nested under data.user
                    // Only use top-level data as user if it has an 'id' field (is actually a user object)
                    const user = data.user || (data.id ? data : null);
                    if (!user || !user.id) throw new Error('Signup failed — no user returned. Please try again.');
                    return { data: { user, session }, error: null };
                } catch (error) {
                    return { data: null, error };
                }
            },

            async signOut() {
                const token = getToken();
                if (token) {
                    try {
                        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                            method: 'POST',
                            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
                        });
                    } catch (e) {}
                }
                return { error: null };
            },

            async getUser() {
                const token = getToken();
                if (!token) return { data: { user: null }, error: null };
                try {
                    const response = await authedFetch(`${SUPABASE_URL}/auth/v1/user`);
                    if (!response.ok) return { data: { user: null }, error: null };
                    const user = await response.json();
                    return { data: { user }, error: null };
                } catch (e) {
                    return { data: { user: null }, error: e };
                }
            },

            async refreshSession() {
                const ok = await refreshAccessToken();
                return { data: { session: ok ? { access_token: getToken() } : null }, error: ok ? null : new Error('Refresh failed') };
            },

            async resetPasswordForEmail(email, options = {}) {
                try {
                    const redirectTo = options.redirectTo || window.location.origin;
                    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify({ email, options: { redirect_to: redirectTo } })
                    });
                    if (!response.ok) {
                        const data = await response.json();
                        return { data: null, error: new Error(data.error_description || data.message || 'Failed to send reset email') };
                    }
                    return { data: {}, error: null };
                } catch (e) {
                    return { data: null, error: e };
                }
            },

            async updateUser(updates) {
                // Always refresh token first to ensure session is valid
                await refreshAccessToken();
                const token = getToken();
                if (!token) return { data: null, error: new Error('Not authenticated') };
                try {
                    const response = await authedFetch(`${SUPABASE_URL}/auth/v1/user`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    const data = await response.json();
                    if (!response.ok) return { data: null, error: new Error(data.error_description || data.message || 'Update failed') };
                    return { data: { user: data }, error: null };
                } catch (e) {
                    return { data: null, error: e };
                }
            },

            async signInWithOtp({ email, phone, options = {} }) {
                try {
                    let body;
                    if (phone) {
                        body = { phone };
                    } else {
                        body = {
                            email,
                            create_user: options.shouldCreateUser !== false,
                            data: options.data || {},
                            // Force 6-digit OTP code instead of magic link
                            options: { shouldSendMagicLink: false }
                        };
                        // Support recovery type for forgot-password OTP flow
                        if (options.type) body.type = options.type;
                    }
                    const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify(body)
                    });
                    if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        return { data: null, error: new Error(data.error_description || data.message || 'Failed to send OTP') };
                    }
                    return { data: {}, error: null };
                } catch (e) {
                    return { data: null, error: e };
                }
            },

            async resend({ type, email, options = {} }) {
                try {
                    const body = { email, type: type || 'signup' };
                    if (options.emailRedirectTo) body.options = { email_redirect_to: options.emailRedirectTo };
                    const response = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify(body)
                    });
                    if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        return { data: null, error: new Error(data.error_description || data.message || 'Failed to resend email') };
                    }
                    return { data: {}, error: null };
                } catch (e) {
                    return { data: null, error: e };
                }
            },

            async verifyOtp({ email, phone, token, type }) {
                try {
                    const body = { token, type: type || 'email' };
                    if (email) body.email = email;
                    if (phone) body.phone = phone;
                    const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify(body)
                    });
                    const data = await response.json();
                    if (!response.ok) return { data: null, error: new Error(data.error_description || data.message || 'OTP verification failed') };
                    if (data.access_token) sessionStorage.setItem('breedlink_token', data.access_token);
                    if (data.refresh_token) sessionStorage.setItem('breedlink_refresh_token', data.refresh_token);
                    return { data: { user: data.user, session: { access_token: data.access_token } }, error: null };
                } catch (e) {
                    return { data: null, error: e };
                }
            }
        },

        from(table) {
            return {
                select(columns = '*') {
                    return makeSelectChain(table, columns, [], null, [], null, true, null, false);
                },
                insert(data) {
                    return makeInsertChain(table, data, false);
                },
                update(data) {
                    return makeUpdateChain(table, data, []);
                },
                delete() {
                    return makeDeleteChain(table, []);
                },
                upsert(data, options) {
                    return doUpsert(table, data, options);
                }
            };
        },

        storage: {
            from(bucket) {
                return {
                    async upload(path, file, options = {}) {
                        const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

                        // Inner helper: build a fresh fetch with the latest token each time
                        const doUpload = async () => {
                            const token = getToken();
                            return fetch(url, {
                                method: 'POST',
                                headers: {
                                    'apikey': SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${token}`,
                                    'x-upsert': 'true'
                            },
                                body: file
                            });
                        };

                        // Step 1: always force-refresh BEFORE the first attempt
                        await refreshAccessToken();

                        // Step 2: attempt upload
                        let response = await doUpload();

                        // Step 3: if it still fails with a JWT/exp error, refresh once more and retry
                        if (!response.ok) {
                            let errBody = {};
                            try { errBody = await response.clone().json(); } catch(e) {}
                            const msg = (
                                errBody?.message || errBody?.error ||
                                errBody?.error_description || ''
                            ).toLowerCase();
                            const isJwtErr = response.status === 401 ||
                                msg.includes('exp') || msg.includes('jwt') ||
                                msg.includes('expired') || msg.includes('token') ||
                                msg.includes('claim') || msg.includes('invalid');
                            if (isJwtErr) {
                                console.warn('[storage] JWT error on upload, refreshing and retrying:', msg);
                                await refreshAccessToken();
                                response = await doUpload();
                            }
                        }

                        if (!response.ok) {
                            const err = await response.json().catch(() => ({ message: 'Upload failed with status ' + response.status }));
                            throw new Error(err.message || err.error || 'Upload failed');
                        }
                        const data = await response.json().catch(() => ({}));
                        return { data, error: null };
                    },
                    getPublicUrl(path) {
                        return { data: { publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` } };
                    }
                };
            }
        }
    };

    // ── Auto-refresh token every 50 minutes to keep session alive ─────────
    setInterval(async () => {
        const token = getToken();
        if (token && isTokenExpired(token)) {
            console.log('⏰ Scheduled token refresh triggered');
            await refreshAccessToken();
        }
    }, 3 * 60 * 1000); // check every 3 minutes

    // Expose credentials on window so other modules (e.g. auth.js resolveLoginIdentifier) can use them
    window.SUPABASE_URL      = SUPABASE_URL;
    window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

    window.supabaseReady = true;
    console.log('✅ Supabase client ready (fetch-based, proactive token refresh + race-safe)');
})();
