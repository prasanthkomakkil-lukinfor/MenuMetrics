import { useState, useEffect, useCallback } from 'react';
import { Plus, X, ChefHat, ShoppingBag, Receipt, Trash2, Minus, Users, Phone, Search, Bike } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type Table = Database['public']['Tables']['tables']['Row'];
type Item = Database['public']['Tables']['items']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type OrderItem = {
  id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  gst_percent: number;
  kot_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

interface CartItem {
  item: Item;
  quantity: number;
  notes: string;
}

export function Orders() {
  const { business, staff } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'floor' | 'takeaway' | 'delivery'>('floor');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [guestCount, setGuestCount] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeOrderItems, setActiveOrderItems] = useState<(OrderItem & { item?: Item })[]>([]);

  const loadData = useCallback(async () => {
    if (!business) return;
    try {
      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('table_number');

      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .eq('is_sold_out', false)
        .order('name');

      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('display_order');

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setTables(tablesData || []);
      setItems(itemsData || []);
      setCategories(catData || []);
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (business) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [business, loadData]);

  const loadActiveOrderItems = async (orderId: string) => {
    try {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at');
      setActiveOrderItems(data || []);
    } catch (error) {
      console.error('Error loading order items:', error);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const billRequestedTables = tables.filter((t) => t.status === 'bill_requested').length;

  const openNewOrder = (table: Table | null, type: 'dine_in' | 'takeaway' | 'delivery') => {
    setSelectedTable(table);
    setActiveOrder(null);
    setActiveOrderItems([]);
    setCart([]);
    setGuestCount(2);
    setCustomerName('');
    setCustomerMobile('');
    setDeliveryAddress('');
    setDeliveryInstructions('');
    setDeliveryCharge('');
    setOrderType(type);
    setShowOrderPanel(true);
  };

  const openExistingOrder = async (order: Order) => {
    setActiveOrder(order);
    setSelectedTable(tables.find((t) => t.id === order.table_id) || null);
    setOrderType(order.order_type as 'dine_in' | 'takeaway' | 'delivery');
    setGuestCount(order.guest_count);
    setCustomerName(order.customer_name || '');
    setCustomerMobile(order.customer_mobile || '');
    setDeliveryAddress(order.delivery_address || '');
    setDeliveryInstructions(order.delivery_instructions || '');
    setDeliveryCharge(order.delivery_charge ? String(order.delivery_charge) : '');
    setCart([]);
    setShowOrderPanel(true);
    await loadActiveOrderItems(order.id);
  };

  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((c) => {
        if (c.item.id === itemId) {
          const newQty = c.quantity + delta;
          return { ...c, quantity: Math.max(0, newQty) };
        }
        return c;
      }).filter((c) => c.quantity > 0);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0);
  const cartTax = cart.reduce((sum, c) => sum + (Number(c.item.price) * c.quantity * Number(c.item.gst_percent)) / 100, 0);
  const deliveryAmt = orderType === 'delivery' ? (parseFloat(deliveryCharge) || 0) : 0;
  const cartTotal = cartSubtotal + cartTax + deliveryAmt;

  const createOrder = async () => {
    if (!business || !staff) return;
    if (cart.length === 0) {
      alert('Please add items to the order first.');
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = `ORD${Date.now().toString().slice(-6)}`;

      const orderPayload = {
        business_id: business.id,
        order_type: orderType,
        table_id: orderType === 'dine_in' ? selectedTable?.id : null,
        customer_name: customerName || null,
        customer_mobile: customerMobile || null,
        staff_id: staff.id,
        guest_count: guestCount,
        status: 'active',
        subtotal: cartSubtotal,
        discount_amount: 0,
        discount_percent: 0,
        tax_amount: cartTax,
        total_amount: cartTotal,
        delivery_address: orderType === 'delivery' ? deliveryAddress || null : null,
        delivery_instructions: orderType === 'delivery' ? deliveryInstructions || null : null,
        delivery_charge: deliveryAmt,
        notes: null,
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload as never)
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItemsPayload = cart.map((c) => ({
        order_id: newOrder.id,
        item_id: c.item.id,
        item_name: c.item.name,
        quantity: c.quantity,
        unit_price: Number(c.item.price),
        total_price: Number(c.item.price) * c.quantity,
        gst_percent: Number(c.item.gst_percent),
        kot_status: 'pending',
        notes: c.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload as never);

      if (itemsError) throw itemsError;

      // Create KOT
      const kotNumber = `KOT${Date.now().toString().slice(-6)}`;
      const { error: kotError } = await supabase
        .from('kots')
        .insert({
          business_id: business.id,
          order_id: newOrder.id,
          kot_number: kotNumber,
          kot_type: 'new',
          status: 'pending',
          created_by: staff.id,
        } as never);

      if (kotError) throw kotError;

      // Update table status to occupied
      if (orderType === 'dine_in' && selectedTable) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' } as never)
          .eq('id', selectedTable.id);
      }

      setShowOrderPanel(false);
      setCart([]);
      setSelectedTable(null);
      setActiveOrder(null);
      loadData();
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const addItemsToExistingOrder = async () => {
    if (!activeOrder || cart.length === 0) return;
    setSubmitting(true);
    try {
      const orderItemsPayload = cart.map((c) => ({
        order_id: activeOrder.id,
        item_id: c.item.id,
        item_name: c.item.name,
        quantity: c.quantity,
        unit_price: Number(c.item.price),
        total_price: Number(c.item.price) * c.quantity,
        gst_percent: Number(c.item.gst_percent),
        kot_status: 'pending',
        notes: c.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload as never);
      if (itemsError) throw itemsError;

      // Create new KOT for the additional items
      const kotNumber = `KOT${Date.now().toString().slice(-6)}`;
      await supabase
        .from('kots')
        .insert({
          business_id: business!.id,
          order_id: activeOrder.id,
          kot_number: kotNumber,
          kot_type: 'additional',
          status: 'pending',
          created_by: staff!.id,
        } as never);

      // Update order total
      const newSubtotal = Number(activeOrder.subtotal) + cartSubtotal;
      const newTax = Number(activeOrder.tax_amount) + cartTax;
      const newDelivery = Number(activeOrder.delivery_charge || 0) + deliveryAmt;
      const newTotal = newSubtotal + newTax + newDelivery;
      await supabase
        .from('orders')
        .update({
          subtotal: newSubtotal,
          tax_amount: newTax,
          total_amount: newTotal,
          delivery_charge: newDelivery,
        } as never)
        .eq('id', activeOrder.id);

      setCart([]);
      await loadActiveOrderItems(activeOrder.id);
      setActiveOrder({ ...activeOrder, subtotal: newSubtotal, tax_amount: newTax, total_amount: newTotal, delivery_charge: newDelivery });
      loadData();
    } catch (error) {
      console.error('Error adding items:', error);
      alert('Failed to add items to order');
    } finally {
      setSubmitting(false);
    }
  };

  const requestBill = async (order: Order) => {
    try {
      const billNumber = `BILL${Date.now().toString().slice(-6)}`;
      const { error } = await supabase
        .from('bills')
        .insert({
          business_id: business!.id,
          order_id: order.id,
          bill_number: billNumber,
          subtotal: Number(order.subtotal),
          discount_amount: 0,
          cgst_amount: Number(order.tax_amount) / 2,
          sgst_amount: Number(order.tax_amount) / 2,
          total_amount: Number(order.total_amount),
          payment_status: 'pending',
          paid_amount: 0,
          generated_by: staff!.id,
        } as never);

      if (error) throw error;

      // Update order and table status
      await supabase.from('orders').update({ status: 'billed' } as never).eq('id', order.id);
      if (order.table_id) {
        await supabase.from('tables').update({ status: 'bill_requested' } as never).eq('id', order.table_id);
      }

      setShowOrderPanel(false);
      setActiveOrder(null);
      loadData();
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Failed to generate bill');
    }
  };

  const itemTypeColor: Record<string, string> = {
    veg: 'border-green-500',
    non_veg: 'border-red-500',
    egg: 'border-yellow-500',
  };

  const itemTypeBg: Record<string, string> = {
    veg: 'bg-green-50',
    non_veg: 'bg-red-50',
    egg: 'bg-yellow-50',
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Orders</h1>
          <p className="text-gray-600">Take and manage orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setView('floor'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              view === 'floor' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Dine-In
          </button>
          <button
            onClick={() => { setView('takeaway'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              view === 'takeaway' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Takeaway
          </button>
          <button
            onClick={() => { setView('delivery'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              view === 'delivery' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Bike className="w-4 h-4" />
            Delivery
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Active Orders</p>
          <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Occupied Tables</p>
          <p className="text-3xl font-bold text-yellow-600">{occupiedTables}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Bill Requested</p>
          <p className="text-3xl font-bold text-red-600">{billRequestedTables}</p>
        </div>
      </div>

      {view === 'floor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Floor Plan</h2>
                <p className="text-sm text-gray-500">Tap a table to start or view an order</p>
              </div>
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No tables set up yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {tables.map((table) => {
                    const tableOrder = orders.find((o) => o.table_id === table.id);
                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          if (tableOrder) {
                            openExistingOrder(tableOrder);
                          } else {
                            openNewOrder(table, 'dine_in');
                          }
                        }}
                        className={`p-4 rounded-lg font-semibold transition-all border-2 ${
                          table.status === 'free'
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : table.status === 'occupied'
                              ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                              : table.status === 'bill_requested'
                                ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-lg font-bold">T{table.table_number}</div>
                        <div className="text-xs mt-1 opacity-75">
                          {table.capacity} seats
                        </div>
                        <div className="text-xs mt-1">
                          {table.status === 'free' && 'Free'}
                          {table.status === 'occupied' && 'Occupied'}
                          {table.status === 'bill_requested' && 'Bill'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {orders.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Orders</h2>
                <div className="space-y-2">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => openExistingOrder(order)}
                      className="w-full p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-amber-300 text-left transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-gray-900">
                          {order.order_type === 'dine_in' ? 'Dine-In' : 'Takeaway'}
                        </span>
                        {order.customer_name && (
                          <span className="text-gray-600 ml-2">{order.customer_name}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">₹{order.total_amount}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : view === 'takeaway' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Takeaway Orders</h2>
            <button
              onClick={() => openNewOrder(null, 'takeaway')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Takeaway
            </button>
          </div>
          {orders.filter((o) => o.order_type === 'takeaway').length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active takeaway orders</p>
          ) : (
            <div className="space-y-2">
              {orders.filter((o) => o.order_type === 'takeaway').map((order) => (
                <button
                  key={order.id}
                  onClick={() => openExistingOrder(order)}
                  className="w-full p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-amber-300 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-gray-900">{order.customer_name || 'Walk-in'}</span>
                    {order.customer_mobile && (
                      <span className="text-gray-600 ml-2">{order.customer_mobile}</span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900">₹{order.total_amount}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Delivery Orders</h2>
            <button
              onClick={() => openNewOrder(null, 'delivery')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Delivery
            </button>
          </div>
          {orders.filter((o) => o.order_type === 'delivery').length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active delivery orders</p>
          ) : (
            <div className="space-y-2">
              {orders.filter((o) => o.order_type === 'delivery').map((order) => (
                <button
                  key={order.id}
                  onClick={() => openExistingOrder(order)}
                  className="w-full p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-amber-300 text-left transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{order.customer_name || 'Walk-in'}</span>
                    <span className="font-bold text-gray-900">₹{order.total_amount}</span>
                  </div>
                  {order.customer_mobile && (
                    <p className="text-sm text-gray-600">{order.customer_mobile}</p>
                  )}
                  {order.delivery_address && (
                    <p className="text-xs text-gray-500 mt-1">{order.delivery_address}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Panel Modal */}
      {showOrderPanel && (
        <div className="fixed inset-0 z-50 flex bg-black/30">
          <div className="ml-auto w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {activeOrder ? 'Add Items' : 'New Order'}
                </h2>
                <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                  {orderType === 'dine_in' ? `Table ${selectedTable?.table_number || ''}` : orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                </span>
              </div>
              <button
                onClick={() => { setShowOrderPanel(false); setCart([]); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Item Selection */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Customer Info */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-3 gap-3">
                    {orderType === 'dine_in' && (
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Guests</label>
                        <input
                          type="number"
                          min="1"
                          value={guestCount}
                          onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Customer Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Mobile</label>
                      <input
                        type="tel"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                  {orderType === 'delivery' && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Delivery Address</label>
                        <textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Full delivery address"
                          rows={2}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Delivery Instructions</label>
                          <input
                            type="text"
                            value={deliveryInstructions}
                            onChange={(e) => setDeliveryInstructions(e.target.value)}
                            placeholder="e.g. Ring doorbell"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Delivery Charge (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={deliveryCharge}
                            onChange={(e) => setDeliveryCharge(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search + Categories */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === 'all' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategory === cat.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  {items.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-2">No menu items available</p>
                      <p className="text-sm text-gray-400">Add items in the Menu page first</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className={`p-3 rounded-lg border-l-4 ${itemTypeColor[item.item_type]} ${itemTypeBg[item.item_type]} hover:shadow-md transition-all text-left`}
                        >
                          <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</div>
                          )}
                          <div className="font-bold text-gray-900 mt-2">₹{item.price}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Sidebar */}
              <div className="w-80 border-l border-gray-200 flex flex-col bg-gray-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">
                    {activeOrder ? 'New Items' : 'Cart'}
                    {cart.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500">({cart.reduce((s, c) => s + c.quantity, 0)})</span>
                    )}
                  </h3>
                </div>

                {/* Existing order items */}
                {activeOrder && activeOrderItems.length > 0 && (
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Already Ordered</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {activeOrderItems.map((oi) => (
                        <div key={oi.id} className="flex justify-between text-sm text-gray-600">
                          <span>{oi.quantity}x {oi.item_name}</span>
                          <span>₹{oi.total_price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cart items */}
                <div className="flex-1 overflow-y-auto p-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🛒</div>
                      <p className="text-gray-500 text-sm">Tap items to add them</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((c) => (
                        <div key={c.item.id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{c.item.name}</p>
                              <p className="text-xs text-gray-500">₹{c.item.price} each</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(c.item.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartQty(c.item.id, -1)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-semibold text-gray-900 w-8 text-center">{c.quantity}</span>
                              <button
                                onClick={() => updateCartQty(c.item.id, 1)}
                                className="w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-gray-900">₹{Number(c.item.price) * c.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Summary + Actions */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  {cart.length > 0 && (
                    <div className="space-y-1 mb-3 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>₹{cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>GST</span>
                        <span>₹{cartTax.toFixed(2)}</span>
                      </div>
                      {orderType === 'delivery' && deliveryAmt > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Delivery Charge</span>
                          <span>₹{deliveryAmt.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                        <span>Total</span>
                        <span>₹{cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {activeOrder ? (
                      <button
                        onClick={addItemsToExistingOrder}
                        disabled={submitting || cart.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        {submitting ? 'Adding...' : 'Add Items & Send KOT'}
                      </button>
                    ) : (
                      <button
                        onClick={createOrder}
                        disabled={submitting || cart.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        <ChefHat className="w-4 h-4" />
                        {submitting ? 'Creating...' : 'Place Order & Send KOT'}
                      </button>
                    )}

                    {activeOrder && (
                      <button
                        onClick={() => requestBill(activeOrder)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        <Receipt className="w-4 h-4" />
                        Generate Bill (₹{activeOrder.total_amount})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
