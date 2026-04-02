import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search, Filter } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Item = Database['public']['Tables']['items']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export function Menu() {
  const { business } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadMenuData();
    }
  }, [business]);

  const loadMenuData = async () => {
    if (!business) return;

    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('display_order');

      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      setCategories(categoriesData || []);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const itemTypeEmoji = {
    veg: '🟢',
    non_veg: '🔴',
    egg: '🟡',
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Menu Management</h1>
          <p className="text-gray-600">Manage your menu items and categories</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-5 h-5" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading menu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-48 bg-gray-200 relative">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    🍽️
                  </div>
                )}
                {item.is_sold_out && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
                      SOLD OUT
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{itemTypeEmoji[item.item_type]}</span>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <span className="text-2xl font-bold font-mono text-gray-900">
                      ₹{item.price}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">+GST {item.gst_percent}%</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.available_dine_in && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      Dine-in
                    </span>
                  )}
                  {item.available_takeaway && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Takeaway
                    </span>
                  )}
                  {item.available_qr && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      QR
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-gray-600 mb-4">No items found</p>
          <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">
            Add Your First Item
          </button>
        </div>
      )}
    </Layout>
  );
}
