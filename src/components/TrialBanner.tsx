import { AlertCircle, Sparkles } from 'lucide-react';
import { usePlan } from '../hooks/usePlan';

export function TrialBanner() {
  const { isOnTrial, trialDaysRemaining } = usePlan();

  if (!isOnTrial) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      {trialDaysRemaining > 3 ? (
        <>
          <Sparkles className="w-4 h-4" />
          <span>
            {trialDaysRemaining} days left in your free trial with Pro features
          </span>
          <a
            href="/pricing"
            className="ml-2 px-3 py-1 bg-white text-amber-600 rounded-md hover:bg-amber-50 font-semibold transition-colors"
          >
            Upgrade Now
          </a>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4" />
          <span className="font-semibold">
            Trial ending in {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}!
          </span>
          <a
            href="/pricing"
            className="ml-2 px-3 py-1 bg-white text-amber-600 rounded-md hover:bg-amber-50 font-semibold transition-colors"
          >
            Upgrade to Continue
          </a>
        </>
      )}
    </div>
  );
}
