import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Staff = Database['public']['Tables']['staff']['Row'];
type Business = Database['public']['Tables']['businesses']['Row'];

interface PendingVerification {
  email: string;
  password: string;
  name: string;
  businessName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  staff: Staff | null;
  business: Business | null;
  loading: boolean;
  pendingVerification: PendingVerification | null;
  signIn: (email: string, password: string, remember: boolean) => Promise<{ needsVerification?: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, businessName: string, remember: boolean) => Promise<{ needsVerification?: boolean; error?: string }>;
  verifyOTP: (email: string, token: string) => Promise<{ error?: string }>;
  resendOTP: (email: string) => Promise<{ error?: string }>;
  cancelVerification: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REMEMBER_KEY = 'serveup_remember_email';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setStaff(null);
        setBusiness(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string, retries = 3) => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (staffError) throw staffError;

      if (!staffData && retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return loadUserData(userId, retries - 1);
      }

      setStaff(staffData);

      if (staffData) {
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', staffData.business_id)
          .maybeSingle();

        if (businessError) throw businessError;
        setBusiness(businessData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, remember: boolean) => {
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string, name: string, businessName: string, remember: boolean) => {
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            business_name: businessName,
          },
        },
      });

      if (authError) throw authError;

      setPendingVerification({ email, password, name, businessName });
      return { needsVerification: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw error;
      setPendingVerification(null);
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Verification failed' };
    }
  };

  const resendOTP = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({ email, type: 'signup' });
      if (error) throw error;
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to resend code' };
    }
  };

  const cancelVerification = () => {
    setPendingVerification(null);
  };

  const signOut = async () => {
    localStorage.removeItem(REMEMBER_KEY);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value: AuthContextType = {
    user,
    session,
    staff,
    business,
    loading,
    pendingVerification,
    signIn,
    signUp,
    verifyOTP,
    resendOTP,
    cancelVerification,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function getRememberedEmail(): string | null {
  return localStorage.getItem(REMEMBER_KEY);
}
