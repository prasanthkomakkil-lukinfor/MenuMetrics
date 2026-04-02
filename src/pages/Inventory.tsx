import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, CreditCard as Edit2, TrendingDown } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Item = Database['public']['Tables']['items']['Row'];

export function Inventory() {
  const { business } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadInventory();
    }
  }, [business]);

  const loadInventory = async () => {
    if (!business) return;

    try {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      setItems(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = items.filter((item) => item.recipe_cost > 0 && Number(item.recipe_cost) > 100);
  const totalInventoryValue = items.reduce((sum, item) => sum + Number(item.recipe_cost || 0), 0);

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Inventory Management</h1>
          <p className="text-gray-600">Track raw materials and stock levels</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      <PlanGate plan="growth" feature="Inventory Management">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-gray-600 text-sm mb-2">Total Items</p>
            <p className="text-3xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-gray-600 text-sm mb-2">Low Stock Items</p>
            <p className="text-3xl font-bold text-red-600">{lowStockItems.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-gray-600 text-sm mb-2">Total Inventory Value</p>
            <p className="text-3xl font-bold text-gray-900">₹{totalInventoryValue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">Low Stock Alert</h2>
            </div>
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map((item) => (
                <p key={item.id} className="text-sm text-red-800">
                  • <span className="font-semibold">{item.name}</span> - ₹{item.recipe_cost} remaining
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Items</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Item Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Cost</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 text-gray-600">{item.category_id || '—'}</td>
                      <td className="py-3 px-4 text-gray-900">₹{item.recipe_cost}</td>
                      <td className="py-3 px-4">
                        {Number(item.recipe_cost || 0) > 100 ? (
                          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-green-100 text-green-700">
                            In Stock
                          </span>
                        ) : (
                          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                            <TrendingDown className="w-3 h-3" />
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-amber-600 hover:text-amber-700 font-semibold text-sm">
                          <Edit2 className="w-4 h-4 inline mr-1" />
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PlanGate>
    </Layout>
  );
}
