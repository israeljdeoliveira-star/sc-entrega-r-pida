import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  adminCheckComplete: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const syncRequestRef = useRef(0);

  const checkAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (error) {
        console.error("checkAdmin error:", error.message);
        return false;
      }

      return !!data;
    } catch (e) {
      console.error("checkAdmin exception:", e);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (nextSession: Session | null) => {
      const requestId = ++syncRequestRef.current;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        if (!mounted || requestId !== syncRequestRef.current) return;
        setIsAdmin(false);
        setAdminCheckComplete(true);
        setLoading(false);
        return;
      }

      setAdminCheckComplete(false);
      const admin = await checkAdmin(nextSession.user.id);

      if (!mounted || requestId !== syncRequestRef.current) return;
      setIsAdmin(admin);
      setAdminCheckComplete(true);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        await syncAuthState(nextSession);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      await syncAuthState(currentSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminCheckComplete(false);
  };

  const signInWithGoogle = async () => {
    const redirectUrl = window.location.origin + window.location.pathname + window.location.search;
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUrl,
    });
    return { error: (result as any).error as Error | null ?? null };
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, adminCheckComplete, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
