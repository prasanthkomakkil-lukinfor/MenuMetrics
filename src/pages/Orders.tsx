import { useState, useEffect } from 'react';
import { Plus, X, ChefHat, Clock, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Table = Database['public']['Tables']['tables']['Row'];

export function Orders() {
  const { business, staff } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [business]);

  const loadData = async () => {
    if (!business) return;

    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .eq('business_id', business.id)
        .order('table_number');

      setOrders(ordersData || []);
      setTables(tablesData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTableStatus = (tableId: string) => {
    return tables.find((t) => t.id === tableId);
  };

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const billRequestedTables = tables.filter((t) => t.status === 'bill_requested').length;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dine-In Orders</h1>
        <p className="text-gray-600">Manage table orders and floor plan</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Active Tables</p>
          <p className="text-3xl font-bold text-gray-900">{occupiedTables}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Bill Requested</p>
          <p className="text-3xl font-bold text-red-600">{billRequestedTables}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Total Tables</p>
          <p className="text-3xl font-bold text-gray-900">{tables.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Floor Plan</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading tables...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setSelectedTable(table.id);
                      const order = orders.find((o) => o.table_id === table.id);
                      setActiveOrder(order || null);
                    }}
                    className={`p-4 rounded-lg font-semibold transition-all border-2 ${
                      table.status === 'free'
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : table.status === 'occupied'
                          ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                          : table.status === 'bill_requested'
                            ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    } ${selectedTable === table.id ? 'ring-2 ring-amber-500' : ''}`}
                  >
                    <div className="text-sm">T{table.table_number}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {table.status === 'free' ? '🟢 Free' : ''}
                      {table.status === 'occupied' ? '🟠 Occupied' : ''}
                      {table.status === 'bill_requested' ? '🔴 Bill' : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          {activeOrder ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                <button
                  onClick={() => {
                    setSelectedTable(null);
                    setActiveOrder(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Table:</span> {activeOrder.customer_name || 'Guest'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Guests:</span> {activeOrder.guest_count}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Total:</span> ₹{activeOrder.total_amount}
                </p>
              </div>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Items
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors">
                  <ChefHat className="w-4 h-4" />
                  Send KOT
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors">
                  Generate Bill
                </button>
              </div>
            </div>
          ) : selectedTable ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">New Order</h2>
              <button className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors">
                Start New Order
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-4 text-center">
              <p className="text-gray-600 text-sm mb-4">Select a table to view or create an order</p>
              <div className="text-4xl mb-2">📋</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
