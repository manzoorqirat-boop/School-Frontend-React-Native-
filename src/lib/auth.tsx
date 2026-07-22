import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API, SessionUser } from './api';

type AuthState = {
  ready: boolean;              // finished reading stored session
  user: SessionUser | null;
  school: any | null;
  signIn: (schoolSlug: string | undefined, username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSchool: () => Promise<void>;
};

const Ctx = createContext<AuthState>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [school, setSchool] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setUser(await API.user());
      setSchool(await API.school());
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (schoolSlug: string | undefined, username: string, password: string) => {
    // Same payload the web login sends. superadmin logs in with no slug.
    const body: any = { username, password };
    if (schoolSlug && schoolSlug.trim()) body.schoolSlug = schoolSlug.trim().toLowerCase();

    const res = await API.post('/api/auth/login', body);
    const token = res.accessToken || res.token;
    await API.setSession(token, res.user, res.school, res.refreshToken);
    setUser(res.user);
    setSchool(res.school ?? null);
  }, []);

  const signOut = useCallback(async () => {
    // Revoke server-side first, but with a hard timeout so a slow/offline
    // network can't hold the UI on an authed screen. `call()` reads the token
    // asynchronously, so this must complete (or time out) BEFORE clearSession,
    // otherwise the request goes out unauthenticated and the refresh token
    // survives on the server.
    await Promise.race([
      API.post('/api/auth/logout', {}).catch(() => {}),
      new Promise(res => setTimeout(res, 1500)),
    ]);
    await API.clearSession();
    setUser(null);
    setSchool(null);
  }, []);

  // Re-pull the school after master data changes so class/section pickers
  // across the app pick up the new lists without a re-login.
  const refreshSchool = useCallback(async () => {
    try {
      const stored = await API.school();
      if (!stored?._id) return;
      const fresh = await API.get(`/api/schools/${stored._id}`);
      if (fresh) { setSchool(fresh); await API.setSchool(fresh); }
    } catch {}
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await API.get('/api/auth/me');
      if (res?.user) { setUser(res.user); }
    } catch {}
  }, []);

  return (
    <Ctx.Provider value={{ ready, user, school, signIn, signOut, refreshUser, refreshSchool }}>
      {children}
    </Ctx.Provider>
  );
}