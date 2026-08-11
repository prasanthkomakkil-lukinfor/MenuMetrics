import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingCart, DollarSign, Users, CircleAlert as AlertCircle, Sparkles, Store, ChefHat, Package } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  todaySales: number;
  billsCount: number;
  avgBill: number;
  activeTables: number;
}

interface BranchStat {
  branchId: string;
  branchName: string;
  city: string | null;
  todaySales: number;
  billsCount: number;
}

interface ChannelStat {
  name: string;
  value: number;
  amount: number;
  count: number;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  message: string;
}

export function Dashboard() {
  const { business, branches, isAllBranches } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    billsCount: 0,
    avgBill: 0,
    activeTables: 0,
  });
  const [branchStats, setBranchStats] = useState<BranchStat[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStat[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business || isAllBranches) {
      loadDashboardStats();
      const interval = setInterval(loadDashboardStats, 60000);
      return () => clearInterval(interval);
    }
  }, [business, isAllBranches, branches]);

  const loadDashboardStats = async () => {
    if (!business && !isAllBranches) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const businessIds = isAllBranches ? branches.map((b) => b.id) : [business!.id];

      const { data: bills } = await supabase
        .from('bills')
        .select('total_amount, business_id, order:orders(order_type)')
        .in('business_id', businessIds)
        .gte('created_at', todayISO);

      const todaySales = bills?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
      const billsCount = bills?.length || 0;

      const { data: tables } = await supabase
        .from('tables')
        .select('status')
        .in('business_id', businessIds)
        .eq('status', 'occupied');

      setStats({
        todaySales,
        billsCount,
        avgBill: billsCount > 0 ? todaySales / billsCount : 0,
        activeTables: tables?.length || 0,
      });

      // Real channel breakdown
      const channelMap: Record<string, { amount: number; count: number }> = { dine_in: { amount: 0, count: 0 }, takeaway: { amount: 0, count: 0 }, delivery: { amount: 0, count: 0 } };
      (bills || []).forEach((bill: any) => {
        const ot = (bill.order as any[])?.[0]?.order_type || (bill.order as any)?.order_type || 'dine_in';
        if (channelMap[ot]) {
          channelMap[ot].amount += Number(bill.total_amount);
          channelMap[ot].count += 1;
        }
      });
      const chStats: ChannelStat[] = [
        { name: 'Dine-in', amount: channelMap.dine_in.amount, count: channelMap.dine_in.count, value: todaySales > 0 ? (channelMap.dine_in.amount / todaySales) * 100 : 0 },
        { name: 'Takeaway', amount: channelMap.takeaway.amount, count: channelMap.takeaway.count, value: todaySales > 0 ? (channelMap.takeaway.amount / todaySales) * 100 : 0 },
        { name: 'Delivery', amount: channelMap.delivery.amount, count: channelMap.delivery.count, value: todaySales > 0 ? (channelMap.delivery.amount / todaySales) * 100 : 0 },
      ].filter((c) => c.count > 0);
      setChannelStats(chStats);

      // Per-branch stats
      if (isAllBranches) {
        const perBranch = await Promise.all(
          branches.map(async (b) => {
            const { data: bBills } = await supabase
              .from('bills')
              .select('total_amount')
              .eq('business_id', b.id)
              .gte('created_at', todayISO);
            return {
              branchId: b.id,
              branchName: b.branch_name || b.name,
              city: b.city,
              todaySales: bBills?.reduce((s, x) => s + Number(x.total_amount), 0) || 0,
              billsCount: bBills?.length || 0,
            };
          })
        );
        setBranchStats(perBranch.sort((a, b) => b.todaySales - a.todaySales));
      } else {
        setBranchStats([]);
      }

      // Generate real insights
      const generatedInsights: Insight[] = [];

      // 1. Top selling item today
      const orderIds = (bills || []).map((b: any) => b.order_id).filter(Boolean) as string[];
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('quantity, total_price, item:items(name)')
          .in('order_id', orderIds);
        if (orderItems && orderItems.length > 0) {
          const itemMap = new Map<string, { qty: number; revenue: number }>();
          orderItems.forEach((oi: any) => {
            const name = (oi.item as any[])?.[0]?.name || (oi.item as any)?.name || 'Unknown';
            const existing = itemMap.get(name) || { qty: 0, revenue: 0 };
            existing.qty += Number(oi.quantity);
            existing.revenue += Number(oi.total_price);
            itemMap.set(name, existing);
          });
          const sorted = Array.from(itemMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
          if (sorted.length > 0) {
            const [topName, topData] = sorted[0];
            generatedInsights.push({
              type: 'success',
              message: `${topName} is your top seller today with ${topData.qty} sold generating ₹${topData.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in revenue.`,
            });
          }
          // Least selling item
          if (sorted.length > 1) {
            const [lowName, lowData] = sorted[sorted.length - 1];
            if (lowData.qty <= 2) {
              generatedInsights.push({
                type: 'warning',
                message: `${lowName} has only ${lowData.qty} sale(s) today. Consider promoting it or reviewing its menu placement.`,
              });
            }
          }
        }
      }

      // 2. Channel insight
      if (chStats.length > 0) {
        const topChannel = [...chStats].sort((a, b) => b.amount - a.amount)[0];
        generatedInsights.push({
          type: 'info',
          message: `${topChannel.name} is your leading channel today at ${topChannel.value.toFixed(0)}% of sales (₹${topChannel.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} across ${topChannel.count} bills).`,
        });
      }

      // 3. Low stock alert (use ingredients table)
      const { data: lowStockItems } = await supabase
        .from('ingredients')
        .select('name, stock_qty, unit, reorder_level')
        .in('business_id', businessIds)
        .lt('stock_qty', 10);
      if (lowStockItems && lowStockItems.length > 0) {
        const names = lowStockItems.slice(0, 3).map((i: { name: string }) => i.name).join(', ');
        generatedInsights.push({
          type: 'warning',
          message: `${lowStockItems.length} inventory item(s) running low: ${names}${lowStockItems.length > 3 ? ' and more' : ''}. Reorder soon to avoid stockouts.`,
        });
      }

      // 4. Average bill insight
      if (billsCount > 0 && stats.avgBill > 0) {
        generatedInsights.push({
          type: 'info',
          message: `Your average bill value today is ₹${Math.round(stats.avgBill).toLocaleString('en-IN')} across ${billsCount} transactions.`,
        });
      }

      // 5. Purchase order insights
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('id, status, total_amount')
        .in('business_id', businessIds)
        .gte('created_at', todayISO);
      if (purchaseOrders && purchaseOrders.length > 0) {
        const totalPurchase = purchaseOrders.reduce((s: number, po: any) => s + Number(po.total_amount || 0), 0);
        const pending = purchaseOrders.filter((po: any) => po.status === 'pending' || po.status === 'sent').length;
        generatedInsights.push({
          type: 'info',
          message: `You placed ${purchaseOrders.length} purchase order(s) today totaling ₹${totalPurchase.toLocaleString('en-IN', { maximumFractionDigits: 0 })}${pending > 0 ? `. ${pending} order(s) pending delivery.` : '.'}`,
        });
      }

      // 6. Cost vs Revenue analysis
      if (billsCount > 0 && orderIds.length > 0) {
        const { data: allRecipes } = await supabase
          .from('recipes')
          .select('item_id, total_cost')
          .in('business_id', businessIds);
        const { data: oiData } = await supabase
          .from('order_items')
          .select('item_id, quantity, total_price')
          .in('order_id', orderIds);
        const recipeCostMap = new Map<string, number>();
        (allRecipes || []).forEach((r: any) => recipeCostMap.set(r.item_id, Number(r.total_cost || 0)));
        let totalCost = 0;
        let totalRevenue = 0;
        (oiData || []).forEach((oi: any) => {
          const cost = recipeCostMap.get(oi.item_id) || 0;
          const qty = Number(oi.quantity) || 1;
          totalCost += cost * qty;
          totalRevenue += Number(oi.total_price) || 0;
        });
        if (totalRevenue > 0) {
          const foodCostPct = (totalCost / totalRevenue) * 100;
          if (foodCostPct > 40) {
            generatedInsights.push({
              type: 'warning',
              message: `Your food cost ratio today is ${foodCostPct.toFixed(0)}% (₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} cost vs ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue). Target should be 25-35%. Review recipe costs or pricing.`,
            });
          } else if (foodCostPct > 0) {
            generatedInsights.push({
              type: 'success',
              message: `Healthy food cost ratio at ${foodCostPct.toFixed(0)}% (₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} cost vs ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue). Gross profit: ₹${(totalRevenue - totalCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`,
            });
          }
        }
      }

      // 7. Branch comparison insight
      if (isAllBranches && branchStats.length > 1) {
        const top = branchStats[0];
        const bottom = branchStats[branchStats.length - 1];
        if (top.todaySales > 0 && bottom.todaySales < top.todaySales * 0.5) {
          generatedInsights.push({
            type: 'warning',
            message: `${top.branchName} is outperforming ${bottom.branchName} by ${((top.todaySales / (bottom.todaySales || 1)) - 1).toFixed(0)}% today. Consider sharing best practices.`,
          });
        }
      }

      if (generatedInsights.length === 0) {
        generatedInsights.push({
          type: 'info',
          message: 'No sales data yet today. Insights will appear once orders start coming in.',
        });
      }

      setInsights(generatedInsights);
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
    },
    {
      title: 'Bills Count',
      value: stats.billsCount.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Avg Bill Value',
      value: `₹${Math.round(stats.avgBill).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-amber-500',
    },
    {
      title: 'Active Tables',
      value: stats.activeTables.toString(),
      icon: Users,
      color: 'bg-teal-500',
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
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      {isAllBranches && branchStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">Branch Comparison — Today</h3>
          </div>
          <div className="space-y-3">
            {branchStats.map((bs, idx) => {
              const maxSales = branchStats[0].todaySales || 1;
              return (
                <div key={bs.branchId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      {idx === 0 && <span className="text-amber-500 mr-1">#1</span>}
                      {bs.branchName}{bs.city && <span className="text-gray-400 ml-1">· {bs.city}</span>}
                    </span>
                    <span className="font-semibold">₹{bs.todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {bs.billsCount} bills</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-amber-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${(bs.todaySales / maxSales) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Channel</h3>
          {channelStats.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No sales data yet today</p>
          ) : (
            <div className="space-y-3">
              {channelStats.map((channel) => (
                <div key={channel.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{channel.name} ({channel.count} bills)</span>
                    <span className="font-semibold">₹{channel.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${channel.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/orders?type=dine_in"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <UtensilsIcon />
              <div className="text-sm font-medium text-gray-900">Dine-In</div>
            </a>
            <a
              href="/orders?type=takeaway"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <ShoppingBagIcon />
              <div className="text-sm font-medium text-gray-900">Takeaway</div>
            </a>
            <a
              href="/orders?type=delivery"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <TruckIcon />
              <div className="text-sm font-medium text-gray-900">Delivery</div>
            </a>
            <a
              href="/recipes"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
            >
              <ChefHat className="w-7 h-7 mx-auto mb-2 text-amber-500" />
              <div className="text-sm font-medium text-gray-900">Recipes</div>
            </a>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6" />
          <h3 className="text-lg font-semibold">AI Business Insights</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">
                  {insight.type === 'success' && <TrendingUp className="w-4 h-4" />}
                  {insight.type === 'warning' && <AlertCircle className="w-4 h-4" />}
                  {insight.type === 'info' && <Sparkles className="w-4 h-4" />}
                </span>
                <p className="text-sm">{insight.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function UtensilsIcon() {
  return <ChefHat className="w-7 h-7 mx-auto mb-2 text-amber-500" />;
}
function ShoppingBagIcon() {
  return <ShoppingCart className="w-7 h-7 mx-auto mb-2 text-amber-500" />;
}
function TruckIcon() {
  return <Package className="w-7 h-7 mx-auto mb-2 text-amber-500" />;
}
