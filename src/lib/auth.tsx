import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API, SessionUser } from './api';

type AuthState = {
  ready: boolean;              // finished reading stored session
  user: SessionUser | null;
  school: any | null;
  signIn: (schoolSlug: string | undefined, username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
    try { await API.post('/api/auth/logout', {}); } catch {}
    await API.clearSession();
    setUser(null);
    setSchool(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await API.get('/api/auth/me');
      if (res?.user) { setUser(res.user); }
    } catch {}
  }, []);

  return (
    <Ctx.Provider value={{ ready, user, school, signIn, signOut, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}
