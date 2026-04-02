import { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  todaySales: number;
  billsCount: number;
  avgBill: number;
  activeTables: number;
}

export function Dashboard() {
  const { business } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    billsCount: 0,
    avgBill: 0,
    activeTables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadDashboardStats();
      const interval = setInterval(loadDashboardStats, 60000);
      return () => clearInterval(interval);
    }
  }, [business]);

  const loadDashboardStats = async () => {
    if (!business) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: bills } = await supabase
        .from('bills')
        .select('total_amount')
        .eq('business_id', business.id)
        .gte('created_at', today.toISOString());

      const todaySales = bills?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
      const billsCount = bills?.length || 0;
      const avgBill = billsCount > 0 ? todaySales / billsCount : 0;

      const { data: tables } = await supabase
        .from('tables')
        .select('status')
        .eq('business_id', business.id)
        .eq('status', 'occupied');

      const activeTables = tables?.length || 0;

      setStats({
        todaySales,
        billsCount,
        avgBill,
        activeTables,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: `₹${stats.todaySales.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-green-500',
      change: '+12.5%',
    },
    {
      title: 'Bills Count',
      value: stats.billsCount.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
      change: '+8.2%',
    },
    {
      title: 'Avg Bill Value',
      value: `₹${Math.round(stats.avgBill).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-amber-500',
      change: '+3.1%',
    },
    {
      title: 'Active Tables',
      value: stats.activeTables.toString(),
      icon: Users,
      color: 'bg-purple-500',
      change: '',
    },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              {stat.change && (
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PlanGate plan="growth" feature="Sales by Channel">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Channel</h3>
            <div className="space-y-3">
              {[
                { name: 'Dine-in', value: 65, amount: 32500 },
                { name: 'Takeaway', value: 20, amount: 10000 },
                { name: 'Delivery', value: 15, amount: 7500 },
              ].map((channel) => (
                <div key={channel.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{channel.name}</span>
                    <span className="font-semibold">₹{channel.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${channel.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PlanGate>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/orders?type=dine_in"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">🍽️</div>
              <div className="text-sm font-medium text-gray-900">Dine-In</div>
            </a>
            <a
              href="/orders?type=takeaway"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">🛍️</div>
              <div className="text-sm font-medium text-gray-900">Takeaway</div>
            </a>
            <a
              href="/orders?type=delivery"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">🚚</div>
              <div className="text-sm font-medium text-gray-900">Delivery</div>
            </a>
            <a
              href="/menu"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="text-sm font-medium text-gray-900">Menu</div>
            </a>
          </div>
        </div>
      </div>

      <PlanGate plan="pro" feature="AI Business Insights">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6" />
            <h3 className="text-lg font-semibold">AI Business Insights</h3>
          </div>
          <div className="space-y-3">
            {[
              {
                type: 'success',
                message: 'Friday evenings generate 34% of your weekly revenue. Consider weekend specials.',
              },
              {
                type: 'warning',
                message: 'Food cost rose to 38% this week. Review chicken and paneer pricing.',
              },
              {
                type: 'info',
                message: 'Butter Chicken is your most profitable item with 71% margin.',
              },
            ].map((insight, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-sm">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      </PlanGate>
    </Layout>
  );
}
