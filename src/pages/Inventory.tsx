import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Package, AlertTriangle, TrendingDown, Boxes, Trash2, Edit, ArrowDownUp } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
type Item = Database['public']['Tables']['items']['Row'];

const units = ['kg', 'g', 'litre', 'ml', 'piece', 'dozen', 'pack'];

export function Inventory() {
  const { business, staff } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ingredients' | 'menuitems' | 'movements'>('ingredients');
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState<Ingredient | null>(null);
  const [adjustType, setAdjustType] = useState<'purchase' | 'wastage' | 'adjustment'>('purchase');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [form, setForm] = useState({
    name: '',
    unit: 'kg',
    stock_qty: '',
    reorder_level: '',
    cost_per_unit: '',
  });

  const loadData = useCallback(async () => {
    if (!business) return;
    try {
      const [ingRes, itemRes, movRes] = await Promise.all([
        supabase.from('ingredients').select('*').eq('business_id', business.id).order('name'),
        supabase.from('items').select('*').eq('business_id', business.id).order('name'),
        supabase.from('stock_movements').select('*').eq('business_id', business.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setIngredients(ingRes.data || []);
      setItems(itemRes.data || []);
      setMovements(movRes.data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const lowStockItems = ingredients.filter((i) => i.reorder_level > 0 && i.stock_qty <= i.reorder_level);
  const totalStockValue = ingredients.reduce((sum, i) => sum + i.stock_qty * i.cost_per_unit, 0);
  const outOfStockMenuItems = items.filter((i) => i.is_sold_out);

  const openAdd = () => {
    setEditingIngredient(null);
    setForm({ name: '', unit: 'kg', stock_qty: '', reorder_level: '', cost_per_unit: '' });
    setShowModal(true);
  };

  const openEdit = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setForm({
      name: ing.name,
      unit: ing.unit,
      stock_qty: String(ing.stock_qty),
      reorder_level: String(ing.reorder_level),
      cost_per_unit: String(ing.cost_per_unit),
    });
    setShowModal(true);
  };

  const saveIngredient = async () => {
    if (!business) return;
    if (!form.name) {
      alert('Name is required');
      return;
    }
    try {
      const payload = {
        business_id: business.id,
        name: form.name,
        unit: form.unit,
        stock_qty: parseFloat(form.stock_qty) || 0,
        reorder_level: parseFloat(form.reorder_level) || 0,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      };

      if (editingIngredient) {
        await supabase.from('ingredients').update(payload as never).eq('id', editingIngredient.id);
      } else {
        const { data } = await supabase.from('ingredients').insert(payload as never).select().single();
        if (data && parseFloat(form.stock_qty) > 0) {
          await supabase.from('stock_movements').insert({
            business_id: business.id,
            ingredient_id: data.id,
            movement_type: 'opening',
            quantity: parseFloat(form.stock_qty),
            reason: 'Opening stock',
            staff_id: staff?.id,
          } as never);
        }
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Failed to save');
    }
  };

  const deleteIngredient = async (id: string) => {
    if (!confirm('Delete this ingredient?')) return;
    await supabase.from('ingredients').delete().eq('id', id);
    loadData();
  };

  const submitAdjustment = async () => {
    if (!business || !staff || !showAdjustModal) return;
    const qty = parseFloat(adjustQty);
    if (!qty || qty <= 0) {
      alert('Enter a valid quantity');
      return;
    }

    try {
      let newStock = Number(showAdjustModal.stock_qty);
      let movementQty = qty;

      if (adjustType === 'purchase') {
        newStock += qty;
      } else if (adjustType === 'wastage') {
        newStock -= qty;
        movementQty = -qty;
      } else {
        newStock = qty;
      }

      if (newStock < 0) newStock = 0;

      await supabase.from('ingredients').update({ stock_qty: newStock, updated_at: new Date().toISOString() } as never).eq('id', showAdjustModal.id);

      await supabase.from('stock_movements').insert({
        business_id: business.id,
        ingredient_id: showAdjustModal.id,
        movement_type: adjustType,
        quantity: movementQty,
        reason: adjustReason || adjustType,
        staff_id: staff.id,
      } as never);

      setShowAdjustModal(null);
      setAdjustQty('');
      setAdjustReason('');
      loadData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Failed to adjust stock');
    }
  };

  const toggleSoldOut = async (item: Item) => {
    await supabase.from('items').update({ is_sold_out: !item.is_sold_out } as never).eq('id', item.id);
    loadData();
  };

  const updateItemStock = async (item: Item, qty: string) => {
    const stockQty = parseFloat(qty);
    if (isNaN(stockQty)) return;
    await supabase.from('items').update({ stock_qty: stockQty } as never).eq('id', item.id);
    loadData();
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Inventory Management</h1>
        <p className="text-gray-600">Track ingredients, stock levels, and wastage</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-600">Ingredients</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-600">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Stock Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-600">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{outOfStockMenuItems.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'ingredients', label: 'Ingredients' },
          { id: 'menuitems', label: 'Menu Items' },
          { id: 'movements', label: 'Stock Movements' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === t.id ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : tab === 'ingredients' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Ingredients</h2>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
          </div>

          {ingredients.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No ingredients yet. Add your first ingredient to start tracking stock.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Unit</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">In Stock</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Reorder Level</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Cost/Unit</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Value</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing) => {
                    const isLow = ing.reorder_level > 0 && ing.stock_qty <= ing.reorder_level;
                    return (
                      <tr key={ing.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{ing.name}</td>
                        <td className="py-3 px-4 text-gray-600">{ing.unit}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">{ing.stock_qty}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{ing.reorder_level}</td>
                        <td className="py-3 px-4 text-right text-gray-600">₹{ing.cost_per_unit}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">₹{(ing.stock_qty * ing.cost_per_unit).toFixed(0)}</td>
                        <td className="py-3 px-4 text-center">
                          {isLow ? (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">Low Stock</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">OK</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setShowAdjustModal(ing)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Adjust Stock"
                            >
                              <ArrowDownUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(ing)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteIngredient(ing.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'menuitems' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Item Stock</h2>
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No menu items.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Item</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Stock Qty</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Sold Out</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 text-right text-gray-600">₹{item.price}</td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          min="0"
                          defaultValue={item.stock_qty ?? ''}
                          onBlur={(e) => updateItemStock(item, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSoldOut(item)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            item.is_sold_out
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {item.is_sold_out ? 'Sold Out' : 'Available'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Movements</h2>
          {movements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No stock movements recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Quantity</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          m.movement_type === 'purchase' ? 'bg-green-100 text-green-700' :
                          m.movement_type === 'wastage' ? 'bg-red-100 text-red-700' :
                          m.movement_type === 'opening' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${Number(m.quantity) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Number(m.quantity) > 0 ? '+' : ''}{m.quantity}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{m.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Ingredient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingIngredient ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Tomatoes"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost/Unit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_per_unit}
                    onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.stock_qty}
                    onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.reorder_level}
                    onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button onClick={saveIngredient} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">{editingIngredient ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Adjust Stock — {showAdjustModal.name}</h2>
              <button onClick={() => setShowAdjustModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">Current Stock: <span className="font-bold text-gray-900">{showAdjustModal.stock_qty} {showAdjustModal.unit}</span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'purchase', label: 'Purchase (+)' },
                    { id: 'wastage', label: 'Wastage (−)' },
                    { id: 'adjustment', label: 'Set Exact' },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAdjustType(t.id)}
                      className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        adjustType === t.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {adjustType === 'adjustment' ? 'New Stock Quantity' : 'Quantity'} ({showAdjustModal.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier delivery, spoilage, stock count"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdjustModal(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button onClick={submitAdjustment} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
