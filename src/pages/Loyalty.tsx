import { useState, useEffect, useCallback } from 'react';
import { Gift, Zap, Users, TrendingUp, Save, History, Award } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];
type LoyaltyTx = Database['public']['Tables']['loyalty_transactions']['Row'] & { customer?: { name: string | null } };

export function Loyalty() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [redeemPointsInput, setRedeemPointsInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const [settings, setSettings] = useState({
    points_per_rupee: '0.1',
    redemption_rate: '0.5',
    gold_threshold: '50000',
    silver_threshold: '10000',
  });

  const loadData = useCallback(async () => {
    if (!business) return;
    try {
      const [custRes, txRes] = await Promise.all([
        supabase.from('customers').select('*').eq('business_id', business.id).order('loyalty_points', { ascending: false }),
        supabase.from('loyalty_transactions').select('*, customer:customers(name)').eq('business_id', business.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setCustomers(custRes.data || []);
      setTransactions(txRes.data || []);

      setSettings({
        points_per_rupee: String(business.loyalty_points_per_rupee ?? 0.1),
        redemption_rate: String(business.loyalty_redemption_rate ?? 0.5),
        gold_threshold: String(business.loyalty_gold_threshold ?? 50000),
        silver_threshold: String(business.loyalty_silver_threshold ?? 10000),
      });
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSettings = async () => {
    if (!business) return;
    setSaving(true);
    try {
      await supabase.from('businesses').update({
        loyalty_points_per_rupee: parseFloat(settings.points_per_rupee) || 0.1,
        loyalty_redemption_rate: parseFloat(settings.redemption_rate) || 0.5,
        loyalty_gold_threshold: parseFloat(settings.gold_threshold) || 50000,
        loyalty_silver_threshold: parseFloat(settings.silver_threshold) || 10000,
      } as never).eq('id', business.id);
      alert('Loyalty settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getTier = (totalSpent: number) => {
    const gold = parseFloat(settings.gold_threshold) || 50000;
    const silver = parseFloat(settings.silver_threshold) || 10000;
    if (totalSpent >= gold) return 'gold';
    if (totalSpent >= silver) return 'silver';
    return 'bronze';
  };

  const handleRedeem = async () => {
    if (!business || !selectedCustomerId) return;
    const pts = parseInt(redeemPointsInput);
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer || pts <= 0) {
      alert('Enter valid points to redeem');
      return;
    }
    if (pts > customer.loyalty_points) {
      alert('Insufficient points');
      return;
    }

    setRedeeming(true);
    try {
      const newPoints = customer.loyalty_points - pts;
      await supabase.from('customers').update({ loyalty_points: newPoints } as never).eq('id', customer.id);

      await supabase.from('loyalty_transactions').insert({
        business_id: business.id,
        customer_id: customer.id,
        type: 'redeem',
        points: -pts,
        description: `Redeemed ${pts} points`,
      } as never);

      setRedeemPointsInput('');
      setSelectedCustomerId(null);
      loadData();
    } catch (error) {
      console.error('Error redeeming points:', error);
      alert('Failed to redeem points');
    } finally {
      setRedeeming(false);
    }
  };

  const totalPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
  const goldCustomers = customers.filter((c) => getTier(c.total_spent) === 'gold').length;
  const silverCustomers = customers.filter((c) => getTier(c.total_spent) === 'silver').length;
  const bronzeCustomers = customers.filter((c) => getTier(c.total_spent) === 'bronze').length;

  const redemptionValue = (pts: number) => pts * (parseFloat(settings.redemption_rate) || 0.5);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Loyalty Program</h1>
        <p className="text-gray-600">Manage customer rewards and loyalty tiers</p>
      </div>

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
              { name: 'Bronze', color: 'bg-amber-100', textColor: 'text-amber-700', requirement: `₹0+ spent` },
              { name: 'Silver', color: 'bg-gray-200', textColor: 'text-gray-700', requirement: `₹${parseFloat(settings.silver_threshold).toLocaleString()}+ spent` },
              { name: 'Gold', color: 'bg-yellow-100', textColor: 'text-yellow-700', requirement: `₹${parseFloat(settings.gold_threshold).toLocaleString()}+ spent` },
            ].map((tier) => (
              <div key={tier.name} className={`${tier.color} ${tier.textColor} p-4 rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{tier.name}</span>
                  <span className="text-sm font-medium">{tier.requirement}</span>
                </div>
                <div className="text-sm opacity-75">Auto-promoted based on total spend</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Points Per Rupee Spent</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.points_per_rupee}
                onChange={(e) => setSettings({ ...settings, points_per_rupee: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">e.g. 0.1 = 1 point per ₹10 spent</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Redemption Rate (₹ per point)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.redemption_rate}
                onChange={(e) => setSettings({ ...settings, redemption_rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">e.g. 0.5 = 100 points = ₹50</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Silver Threshold (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.silver_threshold}
                  onChange={(e) => setSettings({ ...settings, silver_threshold: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gold Threshold (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.gold_threshold}
                  onChange={(e) => setSettings({ ...settings, gold_threshold: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
          </div>
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading...</p>
          ) : customers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No customers yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customers.slice(0, 10).map((customer, idx) => {
                const tier = getTier(customer.total_spent);
                return (
                  <div key={customer.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">#{idx + 1} {customer.name || 'Guest'}</div>
                      <div className="text-xs text-gray-600">{customer.total_visits} visits · ₹{customer.total_spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{customer.loyalty_points} pts</div>
                      <span className={`text-xs font-semibold ${tier === 'gold' ? 'text-yellow-700' : tier === 'silver' ? 'text-gray-700' : 'text-amber-700'}`}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No loyalty transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{tx.customer?.name || 'Customer'}</span>
                    <span className="text-gray-500 ml-2">{tx.description}</span>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Redeem Points */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Redeem Points</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">Select customer...</option>
              {customers.filter((c) => c.loyalty_points > 0).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.loyalty_points} pts)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Points to Redeem</label>
            <input
              type="number"
              min="1"
              value={redeemPointsInput}
              onChange={(e) => setRedeemPointsInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="0"
            />
            {redeemPointsInput && parseInt(redeemPointsInput) > 0 && (
              <p className="text-xs text-green-600 mt-1">Value: ₹{redemptionValue(parseInt(redeemPointsInput)).toFixed(2)}</p>
            )}
          </div>
          <button
            onClick={handleRedeem}
            disabled={redeeming || !selectedCustomerId}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {redeeming ? 'Redeeming...' : 'Redeem'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
