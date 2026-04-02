import { ReactNode, useState } from 'react';
import { Lock, X, Sparkles } from 'lucide-react';
import { usePlan } from '../hooks/usePlan';
import type { Plan } from '../lib/database.types';

interface PlanGateProps {
  plan: Plan;
  children: ReactNode;
  feature?: string;
}

const planNames: Record<Plan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const planPrices: Record<Plan, string> = {
  starter: '₹999',
  growth: '₹1,999',
  pro: '₹3,499',
  enterprise: 'Custom',
};

export function PlanGate({ plan, children, feature }: PlanGateProps) {
  const { hasAccess, isOnTrial } = usePlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (hasAccess(plan)) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none opacity-50 blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 backdrop-blur-sm rounded-lg">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors shadow-lg"
          >
            <Lock className="w-5 h-5" />
            Upgrade to {planNames[plan]}
          </button>
        </div>
      </div>

      {showUpgradeModal && (
        <UpgradeModal
          requiredPlan={plan}
          feature={feature}
          isOnTrial={isOnTrial}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
}

interface UpgradeModalProps {
  requiredPlan: Plan;
  feature?: string;
  isOnTrial: boolean;
  onClose: () => void;
}

function UpgradeModal({ requiredPlan, feature, isOnTrial, onClose }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upgrade Required</h2>
            <p className="text-sm text-gray-500">Unlock premium features</p>
          </div>
        </div>

        {feature && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{feature}</span> is available on the{' '}
              <span className="font-semibold text-amber-600">{planNames[requiredPlan]}</span> plan
              and above.
            </p>
          </div>
        )}

        {isOnTrial && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              You're currently on a free trial with Pro features. Upgrade now to continue using this
              feature after your trial ends.
            </p>
          </div>
        )}

        <div className="mb-6 p-4 border-2 border-amber-200 rounded-lg bg-amber-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold text-gray-900">{planNames[requiredPlan]} Plan</span>
            <span className="text-2xl font-bold text-amber-600">{planPrices[requiredPlan]}</span>
          </div>
          {requiredPlan !== 'enterprise' && (
            <p className="text-sm text-gray-600">per month</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              window.location.href = '/pricing';
            }}
            className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}
