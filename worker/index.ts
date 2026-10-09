interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_KV?: KVNamespace;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_REDIRECT_URI?: string;
  APP_BASE_URL?: string;
  APP_SESSION_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  IG_API_VERSION?: string;
}

interface AccountSession {
  accountId: string;
  username: string;
  accountType: string;
  tokenCiphertext: string;
  expiresAt: number;
  createdAt: number;
  refreshedAt?: number;
}

const SESSION_COOKIE = '__Host-offline_social';
const SESSION_SECONDS = 60 * 60 * 24 * 14;
const OAUTH_STATE_SECONDS = 10 * 60;
const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: RESPONSE_HEADERS });
}

function redirect(url: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: url, ...RESPONSE_HEADERS } });
}

function randomToken(size = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}

async function encryptToken(token: string, env: Env): Promise<string> {
  if (!env.TOKEN_ENCRYPTION_KEY) throw new Error('encryption_not_configured');
  const rawKey = base64ToBytes(env.TOKEN_ENCRYPTION_KEY);
  if (rawKey.length !== 32) throw new Error('invalid_encryption_key');
  const key = await crypto.subtle.importKey('raw', rawKey as BufferSource, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(cipher), iv.length);
  return bytesToBase64Url(packed);
}

async function decryptToken(ciphertext: string, env: Env): Promise<string> {
  if (!env.TOKEN_ENCRYPTION_KEY) throw new Error('encryption_not_configured');
  const packed = base64ToBytes(ciphertext);
  const rawKey = base64ToBytes(env.TOKEN_ENCRYPTION_KEY);
  if (rawKey.length !== 32 || packed.length < 29) throw new Error('invalid_encryption_key');
  const key = await crypto.subtle.importKey('raw', rawKey as BufferSource, 'AES-GCM', false, ['decrypt']);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(0, 12) }, key, packed.slice(12));
  return new TextDecoder().decode(clear);
}

function cookies(request: Request): Record<string, string> {
  return Object.fromEntries((request.headers.get('Cookie') ?? '').split(';').map((piece) => {
    const index = piece.indexOf('=');
    return index < 0 ? ['', ''] : [piece.slice(0, index).trim(), piece.slice(index + 1).trim()];
  }).filter(([key]) => key));
}

async function sessionId(request: Request, env: Env): Promise<string | null> {
  const secret = env.APP_SESSION_SECRET;
  if (!secret) return null;
  const value = cookies(request)[SESSION_COOKIE];
  if (!value) return null;
  const [id, signature, extra] = value.split('.');
  if (!id || !signature || extra) return null;
  const expected = await hmac(id, secret);
  const a = new TextEncoder().encode(signature);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length || !(await safeEqual(a, b))) return null;
  return id;
}

async function safeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return mismatch === 0;
}

async function readSession(request: Request, env: Env): Promise<{ id: string; record: AccountSession } | null> {
  const id = await sessionId(request, env);
  if (!id || !env.APP_KV) return null;
  const raw = await env.APP_KV.get(`session:${id}`);
  if (!raw) return null;
  try {
    return { id, record: JSON.parse(raw) as AccountSession };
  } catch {
    await env.APP_KV.delete(`session:${id}`);
    return null;
  }
}

async function sessionCookie(id: string, secret: string): Promise<string> {
  return `${SESSION_COOKIE}=${id}.${await hmac(id, secret)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function safeError(code: string): { code: string; message: string } {
  const messages: Record<string, string> = {
    not_configured: 'Instagram sign-in is not configured yet. Add the Meta app settings to Cloudflare first.',
    not_connected: 'Connect an Instagram professional account to use this feature.',
    unsupported_account: 'This account is not an eligible Instagram professional account. Instagram Login supports Business and Creator accounts.',
    permission_denied: 'Meta did not grant the permission needed for this action. Check app roles, permissions, and review status.',
    rate_limited: 'Instagram is temporarily limiting requests. Wait a little and try again.',
    unavailable: 'Instagram could not complete that request. Try again later.',
    invalid_state: 'The sign-in request expired or could not be verified. Start again from this app.',
    oauth_cancelled: 'Instagram sign-in was cancelled.',
    invalid_response: 'Instagram returned an unexpected response. No account was connected.',
  };
  return { code, message: messages[code] ?? messages.unavailable };
}

function settingsReady(env: Env): boolean {
  return Boolean(env.APP_KV && env.META_APP_ID && env.META_APP_SECRET && env.META_REDIRECT_URI && env.APP_SESSION_SECRET && env.TOKEN_ENCRYPTION_KEY);
}

function apiVersion(env: Env): string {
  return (env.IG_API_VERSION || 'v26.0').replace(/^v?/, 'v');
}

async function instagramJson(url: URL, token: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = body.error as Record<string, unknown> | undefined;
    const code = Number(error?.code);
    if (response.status === 401 || code === 190) throw new Error('not_connected');
    if (response.status === 403 || code === 10 || code === 200) throw new Error('permission_denied');
    if (response.status === 429 || code === 4 || code === 17) throw new Error('rate_limited');
    throw new Error('unavailable');
  }
  return body;
}

async function profile(token: string, env: Env): Promise<{ id: string; username: string; accountType: string }> {
  const url = new URL(`https://graph.instagram.com/${apiVersion(env)}/me`);
  url.searchParams.set('fields', 'id,username,account_type,profile_picture_url');
  const data = await instagramJson(url, token);
  if (typeof data.id !== 'string' || typeof data.username !== 'string') throw new Error('invalid_response');
  const accountType = typeof data.account_type === 'string' ? data.account_type.toLowerCase() : 'professional';
  if (accountType === 'personal') throw new Error('unsupported_account');
  return { id: data.id, username: data.username, accountType };
}

function apiError(error: unknown): Response {
  const code = error instanceof Error ? error.message : 'unavailable';
  const status = code === 'not_connected' ? 401 : code === 'not_configured' ? 503 : code === 'permission_denied' ? 403 : code === 'rate_limited' ? 429 : code === 'unsupported_account' ? 422 : 502;
  return json({ error: safeError(code) }, status);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

async function exchangeCode(code: string, env: Env): Promise<{ token: string; expiresIn: number }> {
  const form = new URLSearchParams({
    client_id: env.META_APP_ID!,
    client_secret: env.META_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: env.META_REDIRECT_URI!,
    code,
  });
  const shortResponse = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const shortData = await shortResponse.json().catch(() => ({})) as Record<string, unknown>;
  if (!shortResponse.ok || typeof shortData.access_token !== 'string') throw new Error('invalid_response');
  const longUrl = new URL('https://graph.instagram.com/access_token');
  longUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longUrl.searchParams.set('client_secret', env.META_APP_SECRET!);
  longUrl.searchParams.set('access_token', shortData.access_token);
  const longResponse = await fetch(longUrl);
  const longData = await longResponse.json().catch(() => ({})) as Record<string, unknown>;
  if (!longResponse.ok || typeof longData.access_token !== 'string') throw new Error('invalid_response');
  return { token: longData.access_token, expiresIn: Number(longData.expires_in) || 60 * 24 * 60 * 60 };
}

async function currentToken(session: { id: string; record: AccountSession }, env: Env): Promise<string> {
  const token = await decryptToken(session.record.tokenCiphertext, env);
  const now = Date.now();
  const oldEnough = now - Math.max(session.record.createdAt, session.record.refreshedAt ?? 0) >= 24 * 60 * 60 * 1000;
  const expiresSoon = session.record.expiresAt - now < 30 * 24 * 60 * 60 * 1000;
  if (!oldEnough || !expiresSoon || !env.APP_KV) return token;

  const refreshUrl = new URL('https://graph.instagram.com/refresh_access_token');
  refreshUrl.searchParams.set('grant_type', 'ig_refresh_token');
  refreshUrl.searchParams.set('access_token', token);
  try {
    const refreshed = await fetch(refreshUrl);
    const data = await refreshed.json().catch(() => ({})) as Record<string, unknown>;
    if (refreshed.ok && typeof data.access_token === 'string') {
      const expiresIn = Number(data.expires_in) || 60 * 24 * 60 * 60;
      session.record.tokenCiphertext = await encryptToken(data.access_token, env);
      session.record.expiresAt = now + expiresIn * 1000;
      session.record.refreshedAt = now;
      await env.APP_KV.put(`session:${session.id}`, JSON.stringify(session.record), { expirationTtl: Math.min(60 * 60 * 24 * 60, Math.max(60, expiresIn)) });
      return data.access_token;
    }
  } catch { /* a valid current token remains usable if refresh is temporarily unavailable */ }
  if (session.record.expiresAt <= now) throw new Error('not_connected');
  return token;
}

function appReturnUrl(request: Request, env: Env): URL {
  let configured = new URL(request.url);
  if (env.APP_BASE_URL) {
    try {
      const candidate = new URL(env.APP_BASE_URL);
      if (candidate.origin === configured.origin) configured = candidate;
    } catch { /* use the verified request origin */ }
  }
  configured.pathname = '/';
  configured.search = '';
  configured.hash = '';
  return configured;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true, instagramLoginConfigured: settingsReady(env) });
  }

  if (url.pathname === '/api/instagram/login' && request.method === 'GET') {
    if (!settingsReady(env)) return redirect(new URL('?connect=not_configured', appReturnUrl(request, env)).toString());
    try {
      const callback = new URL(env.META_REDIRECT_URI!);
      if (callback.origin !== url.origin || callback.pathname !== '/api/instagram/callback') throw new Error('not_configured');
    } catch {
      return redirect(new URL('?connect=not_configured', appReturnUrl(request, env)).toString());
    }
    const state = randomToken();
    const csrf = randomToken();
    await env.APP_KV!.put(`oauth:${state}`, JSON.stringify({ csrf, createdAt: Date.now() }), { expirationTtl: OAUTH_STATE_SECONDS });
    const authorize = new URL('https://www.instagram.com/oauth/authorize');
    authorize.searchParams.set('client_id', env.META_APP_ID!);
    authorize.searchParams.set('redirect_uri', env.META_REDIRECT_URI!);
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('scope', 'instagram_business_basic');
    authorize.searchParams.set('state', state);
    return new Response(null, { status: 302, headers: { Location: authorize.toString(), 'Set-Cookie': `__Host-offline_oauth=${csrf}; Path=/; Max-Age=${OAUTH_STATE_SECONDS}; HttpOnly; Secure; SameSite=Lax`, ...RESPONSE_HEADERS } });
  }

  if (url.pathname === '/api/instagram/callback' && request.method === 'GET') {
    const resultUrl = appReturnUrl(request, env);
    const providerError = url.searchParams.get('error');
    const state = url.searchParams.get('state') ?? '';
    const cookieState = cookies(request)['__Host-offline_oauth'];
    const saved = env.APP_KV ? await env.APP_KV.get(`oauth:${state}`) : null;
    if (env.APP_KV) await env.APP_KV.delete(`oauth:${state}`);
    let savedState: { csrf?: string } = {};
    try { savedState = saved ? JSON.parse(saved) as { csrf?: string } : {}; } catch { /* invalid state */ }
    if (providerError) {
      resultUrl.searchParams.set('connect', 'oauth_cancelled');
      return new Response(null, { status: 302, headers: { Location: resultUrl.toString(), 'Set-Cookie': '__Host-offline_oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax', ...RESPONSE_HEADERS } });
    }
    if (!state || !cookieState || !savedState.csrf || !(await safeEqual(new TextEncoder().encode(cookieState), new TextEncoder().encode(savedState.csrf)))) {
      resultUrl.searchParams.set('connect', 'invalid_state');
      return new Response(null, { status: 302, headers: { Location: resultUrl.toString(), 'Set-Cookie': '__Host-offline_oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax', ...RESPONSE_HEADERS } });
    }
    if (!settingsReady(env) || !url.searchParams.get('code')) {
      resultUrl.searchParams.set('connect', 'not_configured');
      return redirect(resultUrl.toString());
    }
    try {
      const { token, expiresIn } = await exchangeCode(url.searchParams.get('code')!, env);
      const account = await profile(token, env);
      const id = randomToken(24);
      const record: AccountSession = {
        accountId: account.id,
        username: account.username,
        accountType: account.accountType,
        tokenCiphertext: await encryptToken(token, env),
        expiresAt: Date.now() + expiresIn * 1000,
        createdAt: Date.now(),
      };
      await env.APP_KV!.put(`session:${id}`, JSON.stringify(record), { expirationTtl: Math.min(60 * 60 * 24 * 60, Math.max(60, expiresIn)) });
      resultUrl.searchParams.set('connect', 'success');
      const headers = new Headers({ Location: resultUrl.toString(), ...RESPONSE_HEADERS });
      headers.append('Set-Cookie', await sessionCookie(id, env.APP_SESSION_SECRET!));
      headers.append('Set-Cookie', '__Host-offline_oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
      return new Response(null, { status: 302, headers });
    } catch (error) {
      resultUrl.searchParams.set('connect', error instanceof Error && error.message === 'unsupported_account' ? 'unsupported_account' : 'unavailable');
      return redirect(resultUrl.toString());
    }
  }

  if (!url.pathname.startsWith('/api/instagram/')) return env.ASSETS.fetch(request);
  if (url.pathname === '/api/instagram/status' && request.method === 'GET') {
    const session = await readSession(request, env);
    if (!session) return json({ connected: false });
    return json({ connected: true, account: { username: session.record.username, accountType: session.record.accountType }, expiresAt: session.record.expiresAt });
  }

  if (url.pathname === '/api/instagram/disconnect' && request.method === 'POST') {
    if (!isSameOrigin(request)) return json({ error: safeError('invalid_state') }, 403);
    const session = await readSession(request, env);
    if (session) await env.APP_KV!.delete(`session:${session.id}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...RESPONSE_HEADERS, 'Content-Type': 'application/json', 'Set-Cookie': clearCookie() } });
  }

  if (!settingsReady(env)) return apiError(new Error('not_configured'));

  if (url.pathname === '/api/instagram/media' && request.method === 'GET') {
    try {
      const session = await readSession(request, env);
      if (!session) throw new Error('not_connected');
      const token = await currentToken(session, env);
      const pageSize = Math.max(1, Math.min(15, Math.floor(Number(url.searchParams.get('limit')) || 10)));
      const mediaUrl = new URL(`https://graph.instagram.com/${apiVersion(env)}/${session.record.accountId}/media`);
      mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url');
      mediaUrl.searchParams.set('limit', String(pageSize));
      const after = url.searchParams.get('after');
      if (after && after.length <= 2048) mediaUrl.searchParams.set('after', after);
      const data = await instagramJson(mediaUrl, token);
      const paging = data.paging as { cursors?: { after?: string }; next?: string } | undefined;
      const items = Array.isArray(data.data) ? data.data.map((item) => {
        const media = item as Record<string, unknown>;
        return {
          id: typeof media.id === 'string' ? media.id : '',
          caption: typeof media.caption === 'string' ? media.caption : '',
          mediaType: typeof media.media_type === 'string' ? media.media_type : 'UNKNOWN',
          mediaUrl: typeof media.media_url === 'string' ? media.media_url : null,
          thumbnailUrl: typeof media.thumbnail_url === 'string' ? media.thumbnail_url : null,
          permalink: typeof media.permalink === 'string' ? media.permalink : null,
          timestamp: typeof media.timestamp === 'string' ? media.timestamp : null,
        };
      }).filter((item) => item.id) : [];
      return json({ items, nextCursor: paging?.next && paging.cursors?.after ? paging.cursors.after : null });
    } catch (error) {
      return apiError(error);
    }
  }

  return json({ error: { code: 'not_found', message: 'That API route is not available.' } }, 404);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};

export default worker;

