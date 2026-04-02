import { useState, useEffect } from 'react';
import { Search, Plus, Phone, DollarSign, Calendar } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

export function Customers() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'bronze' | 'silver' | 'gold'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadCustomers();
    }
  }, [business]);

  const loadCustomers = async () => {
    if (!business) return;

    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('total_spent', { ascending: false });

      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.mobile?.includes(searchQuery);
    const matchesTier = filterTier === 'all' || customer.loyalty_tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const tierColors = {
    bronze: 'bg-amber-100 text-amber-700',
    silver: 'bg-gray-200 text-gray-700',
    gold: 'bg-yellow-100 text-yellow-700',
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + Number(c.total_spent), 0);
  const avgSpent = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Customers</h1>
        <p className="text-gray-600">Manage customer profiles and loyalty</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Avg Spent per Customer</p>
          <p className="text-3xl font-bold text-gray-900">₹{Math.round(avgSpent).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'bronze', 'silver', 'gold'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterTier === tier
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Mobile</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Visits</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Spent</th>
                  <PlanGate plan="pro" feature="Loyalty Tier">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Tier</th>
                  </PlanGate>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900">{customer.name || 'Guest'}</td>
                    <td className="py-3 px-4">
                      {customer.mobile ? (
                        <a href={`tel:${customer.mobile}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {customer.mobile}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{customer.total_visits}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ₹{customer.total_spent.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${tierColors[customer.loyalty_tier]}`}>
                        {customer.loyalty_tier.charAt(0).toUpperCase() + customer.loyalty_tier.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
