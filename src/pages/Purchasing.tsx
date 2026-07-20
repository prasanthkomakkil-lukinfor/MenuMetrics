import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Truck, FileText, Package, Search, CreditCard as Edit, Trash2, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row'];
type Ingredient = Database['public']['Tables']['ingredients']['Row'];

type POWithItems = PurchaseOrder & {
  supplier?: { name: string | null } | null;
  purchase_order_items?: PurchaseOrderItem[];
};

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  draft: { color: 'bg-gray-100 text-gray-700', icon: FileText, label: 'Draft' },
  sent: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Sent' },
  partial: { color: 'bg-amber-100 text-amber-700', icon: AlertCircle, label: 'Partial' },
  received: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Received' },
  cancelled: { color: 'bg-red-100 text-red-700', icon: X, label: 'Cancelled' },
};

export function Purchasing() {
  const { business, staff } = useAuth();
  const [tab, setTab] = useState<'purchase_orders' | 'suppliers'>('purchase_orders');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<POWithItems[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '', contact_person: '', mobile: '', email: '', address: '', gstin: '', lead_time_days: '3',
  });

  const [showPOModal, setShowPOModal] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    expected_delivery: '',
    notes: '',
  });
  const [poItems, setPoItems] = useState<{ ingredient_id: string; item_name: string; quantity: string; unit: string; unit_cost: string }[]>([]);

  const [showReceiveModal, setShowReceiveModal] = useState<POWithItems | null>(null);

  const loadData = useCallback(async () => {
    if (!business) return;
    try {
      const [supRes, poRes, ingRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('business_id', business.id).order('name'),
        supabase
          .from('purchase_orders')
          .select('*, supplier:suppliers(name), purchase_order_items(*)')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false }),
        supabase.from('ingredients').select('*').eq('business_id', business.id).order('name'),
      ]);
      setSuppliers(supRes.data || []);
      setPurchaseOrders((poRes.data as unknown as POWithItems[]) || []);
      setIngredients(ingRes.data || []);
    } catch (error) {
      console.error('Error loading purchasing data:', error);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Suppliers ---
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contact_person: '', mobile: '', email: '', address: '', gstin: '', lead_time_days: '3' });
    setShowSupplierModal(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      contact_person: s.contact_person || '',
      mobile: s.mobile || '',
      email: s.email || '',
      address: s.address || '',
      gstin: s.gstin || '',
      lead_time_days: String(s.lead_time_days),
    });
    setShowSupplierModal(true);
  };

  const saveSupplier = async () => {
    if (!business) return;
    if (!supplierForm.name) { alert('Supplier name is required'); return; }
    try {
      const payload = {
        business_id: business.id,
        name: supplierForm.name,
        contact_person: supplierForm.contact_person || null,
        mobile: supplierForm.mobile || null,
        email: supplierForm.email || null,
        address: supplierForm.address || null,
        gstin: supplierForm.gstin || null,
        lead_time_days: parseInt(supplierForm.lead_time_days) || 3,
        is_active: true,
      };
      if (editingSupplier) {
        await supabase.from('suppliers').update(payload as never).eq('id', editingSupplier.id);
      } else {
        await supabase.from('suppliers').insert(payload as never);
      }
      setShowSupplierModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Failed to save supplier');
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    loadData();
  };

  // --- Purchase Orders ---
  const openAddPO = () => {
    setPoForm({ supplier_id: '', expected_delivery: '', notes: '' });
    setPoItems([{ ingredient_id: '', item_name: '', quantity: '', unit: 'kg', unit_cost: '' }]);
    setShowPOModal(true);
  };

  const addPOItemRow = () => {
    setPoItems([...poItems, { ingredient_id: '', item_name: '', quantity: '', unit: 'kg', unit_cost: '' }]);
  };

  const removePOItemRow = (idx: number) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const updatePOItem = (idx: number, field: string, value: string) => {
    const updated = [...poItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'ingredient_id' && value) {
      const ing = ingredients.find((i) => i.id === value);
      if (ing) {
        updated[idx].item_name = ing.name;
        updated[idx].unit = ing.unit;
        updated[idx].unit_cost = String(ing.cost_per_unit);
      }
    }
    setPoItems(updated);
  };

  const poTotal = poItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0), 0);

  const savePO = async () => {
    if (!business || !staff) return;
    if (!poForm.supplier_id) { alert('Please select a supplier'); return; }
    const validItems = poItems.filter((i) => i.item_name && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) { alert('Add at least one item'); return; }

    try {
      const poNumber = `PO-${Date.now().toString().slice(-8)}`;
      const { data: poData, error: poError } = await supabase.from('purchase_orders').insert({
        business_id: business.id,
        supplier_id: poForm.supplier_id,
        po_number: poNumber,
        status: 'draft',
        total_amount: poTotal,
        expected_delivery: poForm.expected_delivery || null,
        notes: poForm.notes || null,
        created_by: staff.id,
      } as never).select().single();

      if (poError) throw poError;

      const itemsPayload = validItems.map((item) => ({
        purchase_order_id: poData.id,
        item_name: item.item_name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        unit_cost: parseFloat(item.unit_cost) || 0,
        total_cost: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0),
        received_quantity: 0,
      }));

      await supabase.from('purchase_order_items').insert(itemsPayload as never);
      setShowPOModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving PO:', error);
      alert('Failed to save purchase order');
    }
  };

  const updatePOStatus = async (po: PurchaseOrder, status: string) => {
    await supabase.from('purchase_orders').update({ status } as never).eq('id', po.id);
    loadData();
  };

  const receivePO = async (po: POWithItems, receivedQtys: Record<string, string>) => {
    if (!business || !staff) return;
    try {
      let allFullyReceived = true;
      for (const item of po.purchase_order_items || []) {
        const recvQty = parseFloat(receivedQtys[item.id] || '0');
        if (recvQty > 0) {
          await supabase.from('purchase_order_items').update({
            received_quantity: item.received_quantity + recvQty,
          } as never).eq('id', item.id);

          if (recvQty < (item.quantity - item.received_quantity)) {
            allFullyReceived = false;
          }

          // Update ingredient stock
          const ing = ingredients.find((i) => i.name.toLowerCase() === item.item_name.toLowerCase());
          if (ing) {
            const newStock = ing.stock_qty + recvQty;
            await supabase.from('ingredients').update({
              stock_qty: newStock,
              updated_at: new Date().toISOString(),
            } as never).eq('id', ing.id);

            await supabase.from('stock_movements').insert({
              business_id: business.id,
              ingredient_id: ing.id,
              movement_type: 'purchase',
              quantity: recvQty,
              reason: `PO: ${po.po_number}`,
              staff_id: staff.id,
            } as never);
          }
        } else {
          allFullyReceived = false;
        }
      }

      await supabase.from('purchase_orders').update({
        status: allFullyReceived ? 'received' : 'partial',
      } as never).eq('id', po.id);

      setShowReceiveModal(null);
      loadData();
    } catch (error) {
      console.error('Error receiving PO:', error);
      alert('Failed to process receipt');
    }
  };

  // --- Stats ---
  const totalPOValue = purchaseOrders
    .filter((p) => p.status !== 'cancelled')
    .reduce((sum, p) => sum + Number(p.total_amount), 0);
  const pendingPOs = purchaseOrders.filter((p) => p.status === 'sent' || p.status === 'draft' || p.status === 'partial').length;
  const activeSuppliers = suppliers.filter((s) => s.is_active).length;

  const filteredPOs = purchaseOrders.filter((po) => {
    const supplierName = po.supplier?.name || '';
    const matchesSearch = po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Purchasing & Suppliers</h1>
          <p className="text-gray-600">Manage suppliers, purchase orders, and goods receipt</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-600">Active Suppliers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeSuppliers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-600">Total POs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{pendingPOs}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Total PO Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{totalPOValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {([
            { id: 'purchase_orders', label: 'Purchase Orders' },
            { id: 'suppliers', label: 'Suppliers' },
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
        {tab === 'purchase_orders' ? (
          <button
            onClick={openAddPO}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Purchase Order
          </button>
        ) : (
          <button
            onClick={openAddSupplier}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : tab === 'purchase_orders' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by PO number or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {filteredPOs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No purchase orders found. Create your first PO to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">PO Number</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Supplier</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Expected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Items</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Total</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.map((po) => {
                    const sc = statusConfig[po.status] || statusConfig.draft;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{po.po_number}</td>
                        <td className="py-3 px-4 text-gray-700">{po.supplier?.name || '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{new Date(po.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">{po.purchase_order_items?.length || 0}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          ₹{Number(po.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {po.status === 'draft' && (
                              <button
                                onClick={() => updatePOStatus(po, 'sent')}
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium"
                              >
                                Send
                              </button>
                            )}
                            {(po.status === 'sent' || po.status === 'partial') && (
                              <button
                                onClick={() => setShowReceiveModal(po)}
                                className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded font-medium"
                              >
                                Receive
                              </button>
                            )}
                            {po.status !== 'received' && po.status !== 'cancelled' && (
                              <button
                                onClick={() => updatePOStatus(po, 'cancelled')}
                                className="px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded font-medium"
                              >
                                Cancel
                              </button>
                            )}
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
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {suppliers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No suppliers yet. Add your first supplier to start creating purchase orders.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((s) => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.contact_person || 'No contact'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {s.mobile && (
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{s.mobile}</p>
                    )}
                    {s.email && (
                      <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{s.email}</p>
                    )}
                    {s.address && (
                      <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{s.address}</p>
                    )}
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />Lead time: {s.lead_time_days} days</p>
                    {s.gstin && <p className="text-xs text-gray-500">GSTIN: {s.gstin}</p>}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditSupplier(s)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => deleteSupplier(s.id)}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowSupplierModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={supplierForm.mobile}
                    onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supplierForm.gstin}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={supplierForm.lead_time_days}
                    onChange={(e) => setSupplierForm({ ...supplierForm, lead_time_days: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSupplierModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button onClick={saveSupplier} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">{editingSupplier ? 'Update' : 'Add'} Supplier</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">New Purchase Order</h2>
              <button onClick={() => setShowPOModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    value={poForm.supplier_id}
                    onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.filter((s) => s.is_active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={poForm.expected_delivery}
                    onChange={(e) => setPoForm({ ...poForm, expected_delivery: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* PO Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <button onClick={addPOItemRow} className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={item.ingredient_id}
                        onChange={(e) => updatePOItem(idx, 'ingredient_id', e.target.value)}
                        className="col-span-4 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">Custom item</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.item_name}
                        onChange={(e) => updatePOItem(idx, 'item_name', e.target.value)}
                        className="col-span-3 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updatePOItem(idx, 'quantity', e.target.value)}
                        className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={item.unit_cost}
                        onChange={(e) => updatePOItem(idx, 'unit_cost', e.target.value)}
                        className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      <button
                        onClick={() => removePOItemRow(idx)}
                        className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3">
                  <p className="text-sm text-gray-600">Total: <span className="text-lg font-bold text-gray-900">₹{poTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPOModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button onClick={savePO} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">Create PO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && showReceiveModal.purchase_order_items && (
        <ReceiveModal po={showReceiveModal} onClose={() => setShowReceiveModal(null)} onReceive={receivePO} />
      )}
    </Layout>
  );
}

function ReceiveModal({
  po,
  onClose,
  onReceive,
}: {
  po: POWithItems;
  onClose: () => void;
  onReceive: (po: POWithItems, receivedQtys: Record<string, string>) => void;
}) {
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({});

  const items = po.purchase_order_items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Receive Goods — {po.po_number}</h2>
            <p className="text-sm text-gray-500">Enter quantities received for each item</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item) => {
            const remaining = Number(item.quantity) - Number(item.received_quantity);
            return (
              <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.item_name}</p>
                  <p className="text-xs text-gray-500">
                    Ordered: {item.quantity} {item.unit} · Received: {item.received_quantity} · Pending: {remaining}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  max={remaining}
                  placeholder="0"
                  value={receivedQtys[item.id] || ''}
                  onChange={(e) => setReceivedQtys({ ...receivedQtys, [item.id]: e.target.value })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
          <button
            onClick={() => onReceive(po, receivedQtys)}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
          >
            Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
