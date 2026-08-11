import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Staff = Database['public']['Tables']['staff']['Row'];
type Business = Database['public']['Tables']['businesses']['Row'];
type Brand = Database['public']['Tables']['brands']['Row'];

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
  brand: Brand | null;
  branches: Business[];
  activeBranchId: string | null;
  isAllBranches: boolean;
  loading: boolean;
  pendingVerification: PendingVerification | null;
  signIn: (email: string, password: string, remember: boolean) => Promise<{ needsVerification?: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, businessName: string, remember: boolean) => Promise<{ needsVerification?: boolean; error?: string }>;
  verifyOTP: (email: string, token: string) => Promise<{ error?: string }>;
  resendOTP: (email: string) => Promise<{ error?: string }>;
  cancelVerification: () => void;
  signOut: () => Promise<void>;
  switchBranch: (branchId: string | null) => void;
  loadBranches: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REMEMBER_KEY = 'serveup_remember_email';
const ACTIVE_BRANCH_KEY = 'serveup_active_branch';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [branches, setBranches] = useState<Business[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  const isAllBranches = activeBranchId === null && branches.length > 1;

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
        setBrand(null);
        setBranches([]);
        setActiveBranchId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string, retries = 3) => {
    try {
      const { data: staffRecords, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at');

      if (staffError) throw staffError;

      const staffData = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null;
      const allStaffRecords = staffRecords || [];

      if (!staffData && retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return loadUserData(userId, retries - 1);
      }

      setStaff(staffData);

      if (staffData) {
        // Check all staff records for a brand_id (user may have staff rows in multiple branches)
        const brandStaffRecord = allStaffRecords.find((s: any) => s.brand_id);
        const brandId = brandStaffRecord?.brand_id || staffData.brand_id;

        if (brandId) {
          // Brand mode: load all branches under this brand
          const { data: brandData } = await supabase
            .from('brands')
            .select('*')
            .eq('id', brandId)
            .maybeSingle();

          setBrand(brandData);

          const { data: branchList } = await supabase
            .from('businesses')
            .select('*')
            .eq('brand_id', brandId)
            .order('branch_name');

          const activeBranches = (branchList || []).filter((b) => b.is_active);
          setBranches(activeBranches);

          // Determine active branch
          const savedBranchId = localStorage.getItem(ACTIVE_BRANCH_KEY);
          if (savedBranchId === 'all' || (savedBranchId === null && activeBranches.length > 1)) {
            setActiveBranchId(null);
          } else if (savedBranchId && activeBranches.some((b) => b.id === savedBranchId)) {
            setActiveBranchId(savedBranchId);
            const active = activeBranches.find((b) => b.id === savedBranchId);
            setBusiness(active || null);
          } else if (activeBranches.length === 1) {
            setActiveBranchId(activeBranches[0].id);
            setBusiness(activeBranches[0]);
          } else {
            setActiveBranchId(null);
            setBusiness(null);
          }
        } else {
          // Single-branch mode: user has no brand, only sees their own branch
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', staffData.business_id)
            .maybeSingle();

          if (businessError) throw businessError;
          setBusiness(businessData);
          setBranches(businessData ? [businessData] : []);
          setActiveBranchId(businessData?.id ?? null);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchBranch = (branchId: string | null) => {
    if (branchId === null) {
      setActiveBranchId(null);
      setBusiness(null);
      localStorage.setItem(ACTIVE_BRANCH_KEY, 'all');
    } else {
      const selected = branches.find((b) => b.id === branchId);
      if (selected) {
        setActiveBranchId(branchId);
        setBusiness(selected);
        localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
      }
    }
  };

  const loadBranches = async () => {
    if (!brand) return;
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('brand_id', brand.id)
      .order('branch_name');
    setBranches((data || []).filter((b) => b.is_active));
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
    localStorage.removeItem(ACTIVE_BRANCH_KEY);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value: AuthContextType = {
    user,
    session,
    staff,
    business,
    brand,
    branches,
    activeBranchId,
    isAllBranches,
    loading,
    pendingVerification,
    signIn,
    signUp,
    verifyOTP,
    resendOTP,
    cancelVerification,
    signOut,
    switchBranch,
    loadBranches,
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
