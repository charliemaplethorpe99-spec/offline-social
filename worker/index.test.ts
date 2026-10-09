import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

class MemoryKV {
  values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async put(key: string, value: string) { this.values.set(key, value); }
  async delete(key: string) { this.values.delete(key); }
}

const kv = new MemoryKV();
const env = {
  APP_KV: kv,
  META_APP_ID: 'test-app-id',
  META_APP_SECRET: 'test-app-secret',
  META_REDIRECT_URI: 'https://offline.test/api/instagram/callback',
  APP_BASE_URL: 'https://offline.test',
  APP_SESSION_SECRET: 'a'.repeat(48),
  TOKEN_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
  IG_API_VERSION: 'v26.0',
  ASSETS: { fetch: async () => new Response('asset') },
} as Parameters<typeof worker.fetch>[1];

afterEach(() => {
  vi.restoreAllMocks();
  kv.values.clear();
});

describe('Cloudflare Instagram OAuth worker', () => {
  it('keeps the app honest when Meta credentials are not configured', async () => {
    const response = await worker.fetch(new Request('https://offline.test/api/health'), { ...env, META_APP_ID: undefined } as typeof env);
    expect(await response.json()).toEqual({ ok: true, instagramLoginConfigured: false });
    const login = await worker.fetch(new Request('https://offline.test/api/instagram/login'), { ...env, META_APP_ID: undefined } as typeof env);
    expect(login.headers.get('location')).toContain('connect=not_configured');
  });

  it('validates one-time OAuth state, exchanges tokens server-side, encrypts the session token, and never returns it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === 'https://api.instagram.com/oauth/access_token') {
        expect(init?.method).toBe('POST');
        expect(String(init?.body)).not.toContain('test-short-token');
        return Response.json({ access_token: 'test-short-token', user_id: '123' });
      }
      if (url.startsWith('https://graph.instagram.com/access_token')) return Response.json({ access_token: 'test-long-lived-token', expires_in: 5184000 });
      if (url.startsWith('https://graph.instagram.com/v26.0/me')) {
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-long-lived-token');
        return Response.json({ id: '1784', username: 'quiet.creator', account_type: 'CREATOR' });
      }
      if (url.startsWith('https://graph.instagram.com/v26.0/1784/media')) {
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-long-lived-token');
        return Response.json({ data: [{ id: 'm-1', media_type: 'IMAGE', caption: 'Morning light', media_url: 'https://cdn.example/image.jpg', permalink: 'https://www.instagram.com/p/abc/' }], paging: {} });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const start = await worker.fetch(new Request('https://offline.test/api/instagram/login'), env);
    const authorize = new URL(start.headers.get('location')!);
    expect(authorize.origin).toBe('https://www.instagram.com');
    expect(authorize.searchParams.get('scope')).toBe('instagram_business_basic');
    const oauthCookie = start.headers.get('set-cookie')!.split(';')[0];
    expect([...kv.values.keys()].some((key) => key.startsWith('oauth:'))).toBe(true);
    const callback = await worker.fetch(new Request(`https://offline.test/api/instagram/callback?code=authorization-code&state=${authorize.searchParams.get('state')}`, { headers: { Cookie: oauthCookie } }), env);
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toContain('connect=success');
    const sessionCookie = callback.headers.getSetCookie().find((cookie) => cookie.startsWith('__Host-offline_social='))!.split(';')[0];
    const storedSession = [...kv.values.entries()].find(([key]) => key.startsWith('session:'))?.[1];
    expect(storedSession).toBeTruthy();
    expect(storedSession).not.toContain('test-long-lived-token');

    const status = await worker.fetch(new Request('https://offline.test/api/instagram/status', { headers: { Cookie: sessionCookie } }), env);
    const statusBody = await status.text();
    expect(statusBody).toContain('quiet.creator');
    expect(statusBody).not.toContain('test-long-lived-token');

    const media = await worker.fetch(new Request('https://offline.test/api/instagram/media?limit=10', { headers: { Cookie: sessionCookie } }), env);
    expect(await media.json()).toMatchObject({ items: [{ id: 'm-1', caption: 'Morning light', mediaType: 'IMAGE' }], nextCursor: null });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it('rejects an altered OAuth state and refuses cross-origin disconnect requests', async () => {
    const start = await worker.fetch(new Request('https://offline.test/api/instagram/login'), env);
    const cookie = start.headers.get('set-cookie')!.split(';')[0];
    const callback = await worker.fetch(new Request('https://offline.test/api/instagram/callback?code=x&state=altered', { headers: { Cookie: cookie } }), env);
    expect(callback.headers.get('location')).toContain('connect=invalid_state');
    const disconnect = await worker.fetch(new Request('https://offline.test/api/instagram/disconnect', { method: 'POST', headers: { Origin: 'https://attacker.test' } }), env);
    expect(disconnect.status).toBe(403);
  });
});
