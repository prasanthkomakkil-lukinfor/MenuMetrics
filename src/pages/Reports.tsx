import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Bill = Database['public']['Tables']['bills']['Row'];

export function Reports() {
  const { business } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadReports();
    }
  }, [business, dateRange]);

  const loadReports = async () => {
    if (!business) return;

    try {
      const now = new Date();
      let startDate = new Date();

      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const { data } = await supabase
        .from('bills')
        .select('*')
        .eq('business_id', business.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      setBills(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = bills.reduce((sum, bill) => sum + Number(bill.total_amount), 0);
  const totalBills = bills.length;
  const avgBill = totalBills > 0 ? totalRevenue / totalBills : 0;
  const totalDiscount = bills.reduce((sum, bill) => sum + Number(bill.discount_amount), 0);
  const totalTax = bills.reduce(
    (sum, bill) => sum + Number(bill.cgst_amount) + Number(bill.sgst_amount) + Number(bill.igst_amount),
    0
  );

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reports & Analytics</h1>

        <div className="flex gap-3">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-2">+12.5% from last period</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Bills</h3>
          <p className="text-3xl font-bold text-gray-900">{totalBills}</p>
          <p className="text-xs text-gray-500 mt-2">Transactions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Average Bill Value</h3>
          <p className="text-3xl font-bold text-gray-900">₹{Math.round(avgBill).toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-2">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Discount</h3>
          <p className="text-3xl font-bold text-red-600">₹{totalDiscount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-2">{((totalDiscount / totalRevenue) * 100).toFixed(1)}% of revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Dine-in', value: 65, amount: 32500 },
              { name: 'Takeaway', value: 20, amount: 10000 },
              { name: 'Delivery', value: 15, amount: 7500 },
            ].map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{item.name}</span>
                  <span className="font-semibold">₹{item.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <PlanGate plan="growth" feature="Hourly Sales Heatmap">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Hourly Sales</h2>
            </div>
            <div className="space-y-2">
              {[
                { hour: '11-12', revenue: 2000, orders: 12 },
                { hour: '12-1', revenue: 8400, orders: 45 },
                { hour: '1-2', revenue: 7200, orders: 38 },
                { hour: '7-8', revenue: 5600, orders: 28 },
              ].map((item) => (
                <div key={item.hour}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.hour}PM</span>
                    <span className="font-semibold">₹{item.revenue} • {item.orders} orders</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-amber-600 h-3 rounded-full"
                      style={{ width: `${(item.revenue / 10000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PlanGate>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Bill #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 10).map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900">#{bill.bill_number}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(bill.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ₹{bill.total_amount}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          bill.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : bill.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {bill.payment_status.charAt(0).toUpperCase() + bill.payment_status.slice(1)}
                      </span>
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
