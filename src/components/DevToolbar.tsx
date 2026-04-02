import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import type { Plan } from '../lib/database.types';

interface DevToolbarProps {
  currentPlan: Plan;
  onPlanChange: (plan: Plan) => void;
}

export function DevToolbar({ currentPlan, onPlanChange }: DevToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-4 w-64 border-2 border-amber-500">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm">Dev Tools</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Switch Plan (Dev Only)
            </label>
            <select
              value={currentPlan}
              onChange={(e) => onPlanChange(e.target.value as Plan)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              This only affects the UI. Database plan unchanged.
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-900 text-white p-3 rounded-full shadow-2xl hover:bg-gray-800 transition-colors border-2 border-amber-500"
          title="Dev Tools"
        >
          <Settings className="w-5 h-5 text-amber-500" />
        </button>
      )}
    </div>
  );
}
