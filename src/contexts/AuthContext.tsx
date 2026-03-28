import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "student" | "employer" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: any | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    const requestId = ++requestIdRef.current;

    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setRole(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", nextSession.user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", nextSession.user.id).maybeSingle(),
      ]);

      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      setRole((roleData?.role as AppRole | null) ?? null);
      setProfile(profileData ?? null);
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      console.error("Error fetching user data:", error);
      setRole(null);
      setProfile(null);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current || event === "INITIAL_SESSION") return;
      void syncAuthState(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      void syncAuthState(session);
    });

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoading(false);
    return { error };
  };

  const signOut = async () => {
    requestIdRef.current += 1;
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setLoading(false);

    supabase.auth.signOut().catch((error) => {
      console.error("Sign out error:", error);
    });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (mountedRef.current) {
      setProfile(profileData ?? null);
    }
  }, [user]);

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, refreshProfile, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
