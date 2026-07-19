import Constants from 'expo-constants';
import { getItem, setItem, removeItem } from './storage';

// Direct-to-.NET API client. Behaviourally identical to the web app's api.ts:
//   - Bearer token on every call
//   - silent refresh on 401 TOKEN_EXPIRED (single-flight), retry once
//   - hard logout on TOKEN_EXPIRED-after-refresh / TOKEN_REVOKED / INVALID_TOKEN
//   - Joi/FluentValidation detail surfaced into the thrown error message
// Difference from web: tokens live in expo-secure-store (encrypted), not
// localStorage, and base is the absolute .NET URL (no Next.js proxy on mobile).

// Resolution order:
//   1. EXPO_PUBLIC_API_URL (set per-platform in .env for local dev)
//   2. app.json -> expo.extra.apiBase (deployed backend, used as default/prod)
// Local dev note: 'localhost' only reaches your machine's own backend from
// web and iOS simulator. Android emulator must use 10.0.2.2, and a physical
// device must use your machine's LAN IP — set EXPO_PUBLIC_API_URL accordingly.
const configuredBase = (Constants.expoConfig?.extra as any)?.apiBase as string | undefined;
const envBase = process.env.EXPO_PUBLIC_API_URL;

const BASE: string =
  envBase ??
  configuredBase ??
  'https://schoolnet-production-ac7d.up.railway.app';

export type SessionUser = {
  _id?: string;
  id?: string;
  name?: string;
  role:
    | 'superadmin' | 'school_admin' | 'principal' | 'accountant'
    | 'teacher' | 'parent' | 'student' | string;
  [k: string]: any;
};

export class ApiError extends Error {
  status?: number;
  data?: any;
  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// SecureStore keys (mirror the web vy_* names for continuity).
const K = {
  token: 'vy_token',
  refresh: 'vy_refresh',
  user: 'vy_user',
  school: 'vy_school',
};

let refreshInFlight: Promise<boolean> | null = null;

const get = getItem;
const set = setItem;
const del = removeItem;

export const API = {
  base: BASE,

  async token() { return get(K.token); },
  async refreshToken() { return get(K.refresh); },

  async user(): Promise<SessionUser | null> {
    const raw = await get(K.user);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async school() {
    const raw = await get(K.school);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },

  async setSession(token: string, user: SessionUser, school?: any, refreshToken?: string) {
    await set(K.token, token);
    await set(K.user, JSON.stringify(user));
    if (school) await set(K.school, JSON.stringify(school));
    if (refreshToken) await set(K.refresh, refreshToken);
  },

  async clearSession() {
    await del(K.token); await del(K.refresh); await del(K.user); await del(K.school);
  },

  async call<T = any>(method: string, path: string, body?: any, isRetry = false): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const tok = await this.token();
    if (tok) headers.Authorization = 'Bearer ' + tok;

    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      let msg = (data && (data as any).error) || `HTTP ${res.status}`;
      if (data && Array.isArray((data as any).details) && (data as any).details.length) {
        const d = (data as any).details[0];
        msg += ': ' + (d.message || d.error || JSON.stringify(d));
      }
      const code = data && (data as any).code;

      // Silent refresh once on expiry.
      if (res.status === 401 && code === 'TOKEN_EXPIRED' && !isRetry &&
          path !== '/api/auth/refresh' && (await this._tryRefresh())) {
        return this.call<T>(method, path, body, true);
      }
      // Hard logout on unrecoverable auth failures.
      if (res.status === 401 && ['TOKEN_EXPIRED', 'TOKEN_REVOKED', 'INVALID_TOKEN'].includes(code)) {
        await this.clearSession();
      }
      throw new ApiError(msg, res.status, data);
    }
    return data as T;
  },

  async _tryRefresh(): Promise<boolean> {
    const rt = await this.refreshToken();
    if (!rt) return false;
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          const res = await fetch(this.base + '/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          });
          if (!res.ok) return false;
          const d = await res.json();
          const at = d.accessToken || d.token;
          if (!at) return false;
          await set(K.token, at);
          if (d.refreshToken) await set(K.refresh, d.refreshToken);
          return true;
        } catch { return false; }
        finally { setTimeout(() => { refreshInFlight = null; }, 0); }
      })();
    }
    return refreshInFlight;
  },

  get<T = any>(path: string) { return this.call<T>('GET', path); },
  post<T = any>(path: string, body?: any) { return this.call<T>('POST', path, body); },
  put<T = any>(path: string, body?: any) { return this.call<T>('PUT', path, body); },
  del<T = any>(path: string) { return this.call<T>('DELETE', path); },
};

// Role → home route. Same switch as the web app's dashboardPath().
export function homeForRole(role?: string): string {
  switch (role) {
    case 'superadmin': return '/(app)/superadmin';
    case 'school_admin':
    case 'principal':
    case 'accountant':
    case 'teacher': return '/(app)/dashboard';
    case 'parent':
    case 'student': return '/(app)/portal';
    default: return '/(auth)/login';
  }
}
