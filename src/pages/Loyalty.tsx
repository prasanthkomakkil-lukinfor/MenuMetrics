import { useState, useEffect } from 'react';
import { Gift, Zap, Users, TrendingUp } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

export function Loyalty() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadLoyaltyData();
    }
  }, [business]);

  const loadLoyaltyData = async () => {
    if (!business) return;

    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('loyalty_points', { ascending: false });

      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
  const goldCustomers = customers.filter((c) => c.loyalty_tier === 'gold').length;
  const silverCustomers = customers.filter((c) => c.loyalty_tier === 'silver').length;
  const bronzeCustomers = customers.filter((c) => c.loyalty_tier === 'bronze').length;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Loyalty Program</h1>
        <p className="text-gray-600">Manage customer rewards and loyalty tiers</p>
      </div>

      <PlanGate plan="pro" feature="Loyalty Program">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Points</p>
                <p className="text-3xl font-bold text-gray-900">{totalPoints.toLocaleString()}</p>
              </div>
              <Zap className="w-12 h-12 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Gold Members</p>
                <p className="text-3xl font-bold text-yellow-600">{goldCustomers}</p>
              </div>
              <Gift className="w-12 h-12 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Silver Members</p>
                <p className="text-3xl font-bold text-gray-400">{silverCustomers}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-gray-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Bronze Members</p>
                <p className="text-3xl font-bold text-amber-600">{bronzeCustomers}</p>
              </div>
              <Users className="w-12 h-12 text-amber-500 opacity-20" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Tiers</h2>
            <div className="space-y-3">
              {[
                { name: 'Bronze', color: 'bg-amber-100', textColor: 'text-amber-700', requirement: '₹0+' },
                { name: 'Silver', color: 'bg-gray-200', textColor: 'text-gray-700', requirement: '₹10,000+' },
                { name: 'Gold', color: 'bg-yellow-100', textColor: 'text-yellow-700', requirement: '₹50,000+' },
              ].map((tier) => (
                <div key={tier.name} className={`${tier.color} ${tier.textColor} p-4 rounded-lg`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{tier.name}</span>
                    <span className="text-sm font-medium">{tier.requirement}</span>
                  </div>
                  <div className="text-sm opacity-75">1.5x points earning • Free upgrades</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customers.slice(0, 10).map((customer, idx) => (
                <div key={customer.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">
                      #{idx + 1} {customer.name || 'Guest'}
                    </div>
                    <div className="text-xs text-gray-600">{customer.total_visits} visits</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{customer.loyalty_points} pts</div>
                    <span
                      className={`text-xs font-semibold ${
                        customer.loyalty_tier === 'gold'
                          ? 'text-yellow-700'
                          : customer.loyalty_tier === 'silver'
                            ? 'text-gray-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {customer.loyalty_tier.charAt(0).toUpperCase() + customer.loyalty_tier.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Points Per Rupee</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  defaultValue="10"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">₹10 = 1 point</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Redemption Rate</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  defaultValue="100"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">100 pts = ₹50</span>
              </div>
            </div>
          </div>
          <button className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors">
            Save Settings
          </button>
        </div>
      </PlanGate>
    </Layout>
  );
}
