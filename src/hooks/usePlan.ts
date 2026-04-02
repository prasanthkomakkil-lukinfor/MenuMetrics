import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Plan } from '../lib/database.types';

const planHierarchy: Record<Plan, number> = {
  starter: 1,
  growth: 2,
  pro: 3,
  enterprise: 4,
};

export interface PlanStatus {
  currentPlan: Plan;
  isOnTrial: boolean;
  trialDaysRemaining: number;
  hasAccess: (requiredPlan: Plan) => boolean;
  requiresPlan: (requiredPlan: Plan) => Plan | null;
  devOverridePlan: Plan | null;
  setDevOverridePlan: (plan: Plan | null) => void;
}

let devPlanOverride: Plan | null = null;
const devPlanListeners = new Set<(plan: Plan | null) => void>();

export function setGlobalDevPlan(plan: Plan | null) {
  devPlanOverride = plan;
  devPlanListeners.forEach(listener => listener(plan));
}

export function usePlan(): PlanStatus {
  const { business } = useAuth();
  const [devOverridePlan, setDevOverridePlanState] = useState<Plan | null>(devPlanOverride);

  useEffect(() => {
    const listener = (plan: Plan | null) => setDevOverridePlanState(plan);
    devPlanListeners.add(listener);
    return () => { devPlanListeners.delete(listener); };
  }, []);

  return useMemo(() => {
    if (!business) {
      return {
        currentPlan: 'starter' as Plan,
        isOnTrial: false,
        trialDaysRemaining: 0,
        hasAccess: () => false,
        requiresPlan: () => 'starter' as Plan,
        devOverridePlan,
        setDevOverridePlan: setGlobalDevPlan,
      };
    }

    const now = new Date();
    const trialEnds = business.trial_ends_at ? new Date(business.trial_ends_at) : null;
    const isOnTrial = trialEnds ? trialEnds > now : false;
    const trialDaysRemaining = trialEnds
      ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const basePlan = isOnTrial ? 'pro' : business.plan;
    const effectivePlan = devOverridePlan || basePlan;

    const hasAccess = (requiredPlan: Plan): boolean => {
      return planHierarchy[effectivePlan] >= planHierarchy[requiredPlan];
    };

    const requiresPlan = (requiredPlan: Plan): Plan | null => {
      return hasAccess(requiredPlan) ? null : requiredPlan;
    };

    return {
      currentPlan: business.plan,
      isOnTrial,
      trialDaysRemaining,
      hasAccess,
      requiresPlan,
      devOverridePlan,
      setDevOverridePlan: setGlobalDevPlan,
    };
  }, [business, devOverridePlan]);
}
