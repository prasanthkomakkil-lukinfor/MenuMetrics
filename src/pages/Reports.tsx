import { useState, useEffect } from 'react';
import { ChartBar as BarChart3, TrendingUp, Download, Calendar } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Bill = Database['public']['Tables']['bills']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'] & { item?: { name: string | null } };

type BillWithOrder = Bill & { order?: { order_type: string; customer_name: string | null; table_id: string | null } };

export function Reports() {
  const { business } = useAuth();
  const [bills, setBills] = useState<BillWithOrder[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [loading, setLoading] = useState(true);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('23:59');
  const [topItems, setTopItems] = useState<{ name: string; qty: number; revenue: number }[]>([]);

  useEffect(() => {
    if (business) {
      loadReports();
    }
  }, [business, dateRange, customStart, customEnd, customStartTime, customEndTime]);

  const loadReports = async () => {
    if (!business) return;

    try {
      setLoading(true);
      let startDate: Date;
      let endDate: Date | undefined;

      if (dateRange === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (dateRange === 'custom') {
        if (!customStart || !customEnd) {
          setLoading(false);
          return;
        }
        startDate = new Date(`${customStart}T${customStartTime || '00:00'}`);
        endDate = new Date(`${customEnd}T${customEndTime || '23:59'}`);
      } else {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      }

      let query = supabase
        .from('bills')
        .select('*, order:orders(*)')
        .eq('business_id', business.id)
        .gte('created_at', startDate.toISOString());

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data } = await query.order('created_at', { ascending: false });

      setBills((data as BillWithOrder[]) || []);

      // Load order items for top-selling analysis
      if (data && data.length > 0) {
        const orderIds = data
          .map((b) => (b as { order_id?: string }).order_id)
          .filter(Boolean) as string[];
        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from('order_items')
            .select('*, item:items(name)')
            .in('order_id', orderIds);
          const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
          (items as OrderItem[] || []).forEach((oi) => {
            const name = oi.item?.name || 'Unknown Item';
            const existing = itemMap.get(name) || { name, qty: 0, revenue: 0 };
            existing.qty += Number(oi.quantity);
            existing.revenue += Number(oi.total_price);
            itemMap.set(name, existing);
          });
          setTopItems(Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10));
        } else {
          setTopItems([]);
        }
      } else {
        setTopItems([]);
      }
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
    0,
  );
  const totalPaid = bills.reduce((sum, bill) => sum + Number(bill.paid_amount), 0);

  // Real revenue breakdown by order type
  const orderTypes = ['dine_in', 'takeaway', 'delivery'];
  const revenueByType = orderTypes
    .map((type) => {
      const typeBills = bills.filter((b) => b.order?.order_type === type);
      const amount = typeBills.reduce((sum, b) => sum + Number(b.total_amount), 0);
      return {
        name: type === 'dine_in' ? 'Dine-in' : type === 'takeaway' ? 'Takeaway' : 'Delivery',
        value: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
        amount,
        count: typeBills.length,
      };
    })
    .filter((t) => t.count > 0);

  // Real hourly sales
  const hourlyMap = new Map<string, { revenue: number; orders: number }>();
  bills.forEach((bill) => {
    const date = new Date(bill.created_at);
    const hour = date.getHours();
    const key = `${hour}-${hour + 1}`;
    const existing = hourlyMap.get(key) || { revenue: 0, orders: 0 };
    existing.revenue += Number(bill.total_amount);
    existing.orders += 1;
    hourlyMap.set(key, existing);
  });
  const hourlyData = Array.from(hourlyMap.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  const maxHourlyRevenue = Math.max(...hourlyData.map((h) => h.revenue), 1);

  // Payment mode breakdown
  const paymentModes = ['cash', 'card', 'upi'];
  const [payments, setPayments] = useState<Database['public']['Tables']['payments']['Row'][]>([]);

  useEffect(() => {
    if (bills.length === 0) {
      setPayments([]);
      return;
    }
    supabase
      .from('payments')
      .select('*')
      .in('bill_id', bills.map((b) => b.id))
      .order('created_at', { ascending: false })
      .then(({ data }) => setPayments(data || []));
  }, [bills]);

  const revenueByPayment = paymentModes
    .map((mode) => {
      const modePayments = payments.filter((p) => p.payment_mode === mode);
      const amount = modePayments.reduce((sum, p) => sum + Number(p.amount), 0);
      return { name: mode.toUpperCase(), amount, count: modePayments.length };
    })
    .filter((p) => p.count > 0);

  const exportCSV = () => {
    const headers = ['Bill #', 'Date', 'Order Type', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Status'];
    const rows = bills.map((b) => [
      b.bill_number,
      new Date(b.created_at).toLocaleString(),
      b.order?.order_type || '',
      b.order?.customer_name || '',
      b.subtotal,
      b.discount_amount,
      Number(b.cgst_amount) + Number(b.sgst_amount) + Number(b.igst_amount),
      b.total_amount,
      b.paid_amount,
      b.payment_status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reports & Analytics</h1>

        <div className="flex flex-wrap items-center gap-3">
          {(['today', 'week', 'month', 'custom'] as const).map((range) => (
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

          {dateRange === 'custom' && (
            <div className="flex flex-wrap items-end gap-2 bg-white border border-gray-200 rounded-lg p-3">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <span className="text-gray-400 pb-2">to</span>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={exportCSV}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-500 mt-2">{totalBills} transactions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Collected</h3>
          <p className="text-3xl font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-500 mt-2">Pending: ₹{(totalRevenue - totalPaid).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Average Bill Value</h3>
          <p className="text-3xl font-bold text-gray-900">₹{Math.round(avgBill).toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-2">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Discount</h3>
          <p className="text-3xl font-bold text-red-600">₹{totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-500 mt-2">
            {totalRevenue > 0 ? ((totalDiscount / totalRevenue) * 100).toFixed(1) : 0}% of revenue
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Top 10 Best-Selling Items</h2>
        </div>
        {topItems.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No data for this period</p>
        ) : (
          <div className="space-y-2">
            {topItems.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{item.name}</span>
                    <span className="font-semibold">{item.qty} sold · ₹{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all"
                      style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Revenue by Order Type</h2>
          </div>
          {revenueByType.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data for this period</p>
          ) : (
            <div className="space-y-3">
              {revenueByType.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{item.name} ({item.count} bills)</span>
                    <span className="font-semibold">₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Hourly Sales</h2>
          </div>
          {hourlyData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data for this period</p>
          ) : (
            <div className="space-y-2">
              {hourlyData.map((item) => (
                <div key={item.hour}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.hour.replace('-', '-')}:00</span>
                    <span className="font-semibold">₹{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} • {item.orders} orders</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-amber-600 h-3 rounded-full transition-all"
                      style={{ width: `${(item.revenue / maxHourlyRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {revenueByPayment.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Mode Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revenueByPayment.map((p) => (
              <div key={p.name} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">{p.name} ({p.count} payments)</p>
                <p className="text-2xl font-bold text-gray-900">₹{p.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : bills.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No transactions in this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Bill #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date & Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 50).map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900">#{bill.bill_number}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(bill.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {bill.order?.order_type === 'dine_in' ? 'Dine-In' : bill.order?.order_type === 'takeaway' ? 'Takeaway' : bill.order?.order_type === 'delivery' ? 'Delivery' : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{bill.order?.customer_name || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 text-right">₹{bill.total_amount}</td>
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
