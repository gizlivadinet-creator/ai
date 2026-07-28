import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      let current = (data as Profile) || null;

      // Chicken-and-egg fix: the DB has an `admin_bootstrap_first_admin()`
      // RPC that lets the very first authenticated user claim the admin
      // role, but nothing in the UI ever called it, so there was no way to
      // ever become an admin. If this user isn't already an admin, try the
      // bootstrap (it's a safe no-op after the first admin exists) and
      // reload the profile if it just promoted us.
      if (current && current.role !== 'admin') {
        try {
          const { data: promoted } = await supabase.rpc('admin_bootstrap_first_admin');
          if (promoted) {
            const { data: refreshed } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            current = (refreshed as Profile) || current;
          }
        } catch {
          // RPC missing/not migrated yet — ignore, keep whatever we loaded.
        }
      }

      setProfile(current);
    } catch (err) {
      // If this ever throws uncaught, the caller's `setLoading(false)` never
      // runs and the header permanently shows neither the sign-in button
      // nor the user menu (both are gated on `!loading`). Never let that
      // happen — log it and fall back to "no profile" instead.
      console.error('loadProfile failed:', err);
      setProfile(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      try {
        setSession(data.session);
        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        }
      } finally {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // IMPORTANT: this callback must stay synchronous and must not itself
    // await any supabase.auth.* or supabase.from()/rpc() call.
    //
    // On a plain page refresh (no OAuth redirect), supabase-js's client
    // construction runs GoTrueClient.initialize() -> _initialize() ->
    // _recoverAndRefresh(), all inside a single _acquireLock(-1, ...) call
    // that is only released once _notifyAllSubscribers() has *awaited every
    // registered onAuthStateChange listener*. If a listener here awaits
    // loadProfile(), which calls supabase.from('profiles').select(...),
    // that data call needs a fresh access token and internally calls
    // supabase.auth.getSession() -> which itself first awaits
    // `initializePromise` and then tries to _acquireLock() again. Since the
    // lock is still held by the very initialize() call that is waiting on
    // this listener, the two promises wait on each other forever: loading
    // never resolves, the header never decides sign-in vs. signed-in, and
    // every admin-only UI (nav link, Kod Kütüphanesi, code generation gate)
    // stays stuck in its "loading" state permanently.
    //
    // Supabase's own SDK works around this exact hazard for the OAuth
    // callback path by wrapping its own post-recovery notification in
    // setTimeout(..., 0) (see auth-js GoTrueClient#_initialize, the
    // `detectSessionInUrl` branch). We do the same here for the storage
    // recovery path, which is the one that isn't already deferred.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const userId = newSession.user.id;
        setTimeout(() => {
          if (mounted) loadProfile(userId);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Live-update profile (role/ban status changes from an admin) without reload.
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' && !profile?.is_banned,
    isBanned: !!profile?.is_banned,
    signIn: signInWithGoogle,
    signOut,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
