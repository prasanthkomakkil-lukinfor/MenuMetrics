import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search, X, DollarSign, Tag, FolderPlus, Folder, Image, ToggleLeft, ToggleRight } from 'lucide-react';
import { Layout } from '../components/Layout';
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
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    item_type: 'veg' as 'veg' | 'non_veg' | 'egg',
    gst_percent: '5',
    hsn_code: '',
    photo_url: '',
    recipe_cost: '',
    available_dine_in: true,
    available_takeaway: true,
    available_qr: true,
  });
  const [catForm, setCatForm] = useState({ name: '', display_order: '0' });

  useEffect(() => {
    if (business) loadMenuData();
  }, [business]);

  const loadMenuData = async () => {
    if (!business) return;
    try {
      const [catRes, itemRes] = await Promise.all([
        supabase.from('categories').select('*').eq('business_id', business.id).order('display_order'),
        supabase.from('items').select('*').eq('business_id', business.id).order('name'),
      ]);
      setCategories(catRes.data || []);
      setItems(itemRes.data || []);
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

  const itemTypeDot: Record<string, string> = {
    veg: 'bg-green-500',
    non_veg: 'bg-red-500',
    egg: 'bg-yellow-500',
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '', description: '', price: '', category_id: categories[0]?.id || '',
      item_type: 'veg', gst_percent: '5', hsn_code: '', photo_url: '', recipe_cost: '',
      available_dine_in: true, available_takeaway: true, available_qr: true,
    });
    setShowModal(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: item.category_id || '',
      item_type: item.item_type,
      gst_percent: String(item.gst_percent),
      hsn_code: item.hsn_code || '',
      photo_url: item.photo_url || '',
      recipe_cost: item.recipe_cost ? String(item.recipe_cost) : '',
      available_dine_in: item.available_dine_in,
      available_takeaway: item.available_takeaway,
      available_qr: item.available_qr,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setLoading(true);
    try {
      const payload = {
        business_id: business.id,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category_id: formData.category_id || null,
        item_type: formData.item_type,
        gst_percent: parseFloat(formData.gst_percent),
        hsn_code: formData.hsn_code || null,
        photo_url: formData.photo_url || null,
        recipe_cost: formData.recipe_cost ? parseFloat(formData.recipe_cost) : null,
        available_dine_in: formData.available_dine_in,
        available_takeaway: formData.available_takeaway,
        available_qr: formData.available_qr,
      };
      if (editingItem) {
        await supabase.from('items').update(payload as never).eq('id', editingItem.id);
      } else {
        await supabase.from('items').insert(payload as never);
      }
      setShowModal(false);
      loadMenuData();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await supabase.from('items').delete().eq('id', id);
    loadMenuData();
  };

  const toggleSoldOut = async (item: Item) => {
    await supabase.from('items').update({ is_sold_out: !item.is_sold_out } as never).eq('id', item.id);
    loadMenuData();
  };

  // Category CRUD
  const openAddCategory = () => {
    setEditingCategory(null);
    setCatForm({ name: '', display_order: '0' });
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatForm({ name: cat.name, display_order: String(cat.display_order) });
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!business || !catForm.name) return;
    const payload = {
      business_id: business.id,
      name: catForm.name,
      display_order: parseInt(catForm.display_order) || 0,
      is_active: true,
    };
    if (editingCategory) {
      await supabase.from('categories').update(payload as never).eq('id', editingCategory.id);
    } else {
      await supabase.from('categories').insert(payload as never);
    }
    setShowCategoryModal(false);
    loadMenuData();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Items in it will become uncategorized.')) return;
    await supabase.from('items').update({ category_id: null } as never).eq('category_id', id);
    await supabase.from('categories').delete().eq('id', id);
    loadMenuData();
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Menu Management</h1>
          <p className="text-gray-600">Manage items, categories, pricing, and availability</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAddCategory}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
            Category
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Categories bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Folder className="w-4 h-4 text-gray-400" />
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <button
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                className={`text-sm font-medium ${selectedCategory === cat.id ? 'text-amber-600' : 'text-gray-700'}`}
              >
                {cat.name}
              </button>
              <button onClick={() => openEditCategory(cat)} className="text-gray-400 hover:text-gray-600">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No items found</p>
          <button onClick={openAddModal} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-200 relative">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {item.is_sold_out && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">SOLD OUT</span>
                  </div>
                )}
                <div className={`absolute top-2 left-2 w-4 h-4 rounded border-2 border-white ${itemTypeDot[item.item_type]}`} />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                {item.description && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>}
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.hsn_code && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">HSN: {item.hsn_code}</span>}
                  {item.recipe_cost != null && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Cost: ₹{item.recipe_cost}</span>}
                  {!item.available_dine_in && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">No Dine-in</span>}
                  {!item.available_takeaway && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">No Takeaway</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">₹{item.price}</span>
                    <span className="text-xs text-gray-500 ml-1">+{item.gst_percent}% GST</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleSoldOut(item)}
                      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${item.is_sold_out ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {item.is_sold_out ? 'Available' : 'Sold Out'}
                    </button>
                    <button onClick={() => openEditModal(item)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Item' : 'Add Menu Item'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" required min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Cost (₹)</label>
                  <input type="number" min="0" step="0.01" value={formData.recipe_cost} onChange={(e) => setFormData({ ...formData, recipe_cost: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                  <input type="number" min="0" step="0.5" value={formData.gst_percent} onChange={(e) => setFormData({ ...formData, gst_percent: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input type="text" value={formData.hsn_code} onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={formData.item_type} onChange={(e) => setFormData({ ...formData, item_type: e.target.value as 'veg' | 'non_veg' | 'egg' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                    <option value="veg">Veg</option>
                    <option value="non_veg">Non-Veg</option>
                    <option value="egg">Egg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
                <input type="url" value={formData.photo_url} onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })} placeholder="https://images.pexels.com/..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                {formData.photo_url && <img src={formData.photo_url} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                <div className="flex gap-3">
                  {([
                    { key: 'available_dine_in', label: 'Dine-In' },
                    { key: 'available_takeaway', label: 'Takeaway' },
                    { key: 'available_qr', label: 'QR Order' },
                  ] as const).map((av) => (
                    <button
                      key={av.key}
                      type="button"
                      onClick={() => setFormData({ ...formData, [av.key]: !formData[av.key] })}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      {formData[av.key] ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold disabled:opacity-50">
                  {loading ? 'Saving...' : editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" min="0" value={catForm.display_order} onChange={(e) => setCatForm({ ...catForm, display_order: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button onClick={saveCategory} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">{editingCategory ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
