import { useMemo } from 'react';
import type { Plan } from '../lib/database.types';

export interface PlanStatus {
  currentPlan: Plan;
  isOnTrial: boolean;
  trialDaysRemaining: number;
  hasAccess: (requiredPlan: Plan) => boolean;
  requiresPlan: (requiredPlan: Plan) => Plan | null;
  devOverridePlan: Plan | null;
  setDevOverridePlan: (plan: Plan | null) => void;
}

export function setGlobalDevPlan(_plan: Plan | null) {}

export function usePlan(): PlanStatus {
  return useMemo(() => ({
    currentPlan: 'pro' as Plan,
    isOnTrial: false,
    trialDaysRemaining: 0,
    hasAccess: () => true,
    requiresPlan: () => null,
    devOverridePlan: null,
    setDevOverridePlan: () => {},
  }), []);
}
