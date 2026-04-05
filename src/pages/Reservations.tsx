import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, Users, Phone, CheckCircle, MapPin, Mail, Truck, Package } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type AdvanceOrder = Database['public']['Tables']['advance_orders']['Row'];

export function Reservations() {
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState<'reservations' | 'delivery' | 'takeaway'>('reservations');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [advanceOrders, setAdvanceOrders] = useState<AdvanceOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_email: '',
    order_date: new Date().toISOString().split('T')[0],
    order_time: '',
    delivery_address: '',
    delivery_instructions: '',
    special_instructions: '',
  });

  useEffect(() => {
    if (business) {
      loadData();
    }
  }, [business, selectedDate, activeTab]);

  const loadData = async () => {
    if (!business) return;

    try {
      if (activeTab === 'reservations') {
        const { data } = await supabase
          .from('reservations')
          .select('*')
          .eq('business_id', business.id)
          .eq('reservation_date', selectedDate)
          .order('reservation_time');
        setReservations(data || []);
      } else {
        const orderType = activeTab === 'delivery' ? 'delivery' : 'takeaway';
        const { data } = await supabase
          .from('advance_orders')
          .select('*')
          .eq('business_id', business.id)
          .eq('order_type', orderType)
          .eq('order_date', selectedDate)
          .order('order_time');
        setAdvanceOrders(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    try {
      if (activeTab === 'reservations') {
        await supabase.from('reservations').insert({
          business_id: business.id,
          customer_name: formData.customer_name,
          customer_mobile: formData.customer_mobile,
          reservation_date: formData.order_date,
          reservation_time: formData.order_time,
          party_size: 2,
          status: 'pending',
          special_requests: formData.special_instructions,
        });
      } else {
        await supabase.from('advance_orders').insert({
          business_id: business.id,
          customer_name: formData.customer_name,
          customer_mobile: formData.customer_mobile,
          customer_email: formData.customer_email || null,
          order_date: formData.order_date,
          order_time: formData.order_time,
          order_type: activeTab,
          delivery_address: activeTab === 'delivery' ? formData.delivery_address : null,
          delivery_instructions: activeTab === 'delivery' ? formData.delivery_instructions : null,
          special_instructions: formData.special_instructions || null,
          status: 'pending',
        });
      }

      setShowAddModal(false);
      setFormData({
        customer_name: '',
        customer_mobile: '',
        customer_email: '',
        order_date: new Date().toISOString().split('T')[0],
        order_time: '',
        delivery_address: '',
        delivery_instructions: '',
        special_instructions: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    seated: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-gray-100 text-gray-700',
  };

  return (
    <Layout>
      <PlanGate plan="pro" feature="Advance Orders & Reservations">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Orders & Reservations</h1>
            <p className="text-gray-600">Manage reservations, delivery and takeaway orders</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            New {activeTab === 'reservations' ? 'Reservation' : activeTab === 'delivery' ? 'Delivery' : 'Takeaway'}
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'reservations'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Reservations
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'delivery'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Truck className="w-5 h-5" />
            Delivery
          </button>
          <button
            onClick={() => setActiveTab('takeaway')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'takeaway'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5" />
            Takeaway
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <Calendar className="w-5 h-5 text-amber-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === 'reservations' ? (
                <>
                  {reservations.map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      statusColors={statusColors}
                      onUpdate={loadData}
                    />
                  ))}
                  {reservations.length === 0 && (
                    <p className="text-gray-500 text-sm py-8 text-center">No reservations for this date</p>
                  )}
                </>
              ) : (
                <>
                  {advanceOrders.map((order) => (
                    <AdvanceOrderCard
                      key={order.id}
                      order={order}
                      statusColors={statusColors}
                      onUpdate={loadData}
                      type={activeTab}
                    />
                  ))}
                  {advanceOrders.length === 0 && (
                    <p className="text-gray-500 text-sm py-8 text-center">
                      No {activeTab} orders for this date
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                New {activeTab === 'reservations' ? 'Reservation' : activeTab === 'delivery' ? 'Delivery Order' : 'Takeaway Order'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.customer_mobile}
                    onChange={(e) => setFormData({ ...formData, customer_mobile: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {activeTab !== 'reservations' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                )}

                {activeTab === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                      <textarea
                        required
                        rows={3}
                        value={formData.delivery_address}
                        onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                        placeholder="Enter complete delivery address with landmark"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
                      <input
                        type="text"
                        value={formData.delivery_instructions}
                        onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                        placeholder="e.g., Ring doorbell, Leave at gate"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.order_time}
                      onChange={(e) => setFormData({ ...formData, order_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                  <textarea
                    rows={2}
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PlanGate>
    </Layout>
  );
}

interface ReservationCardProps {
  reservation: Reservation;
  statusColors: Record<string, string>;
  onUpdate: () => void;
}

function ReservationCard({ reservation, statusColors, onUpdate }: ReservationCardProps) {
  const updateStatus = async (newStatus: string) => {
    try {
      await supabase
        .from('reservations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reservation.id);
      onUpdate();
    } catch (error) {
      console.error('Error updating reservation:', error);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{reservation.customer_name}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Phone className="w-4 h-4" />
            {reservation.customer_mobile}
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[reservation.status]}`}>
          {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1).replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {reservation.reservation_time}
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {reservation.party_size} guests
        </div>
      </div>

      {reservation.special_requests && (
        <p className="text-sm text-gray-600 mb-3 italic">"{reservation.special_requests}"</p>
      )}

      {reservation.status !== 'seated' && reservation.status !== 'cancelled' && (
        <div className="flex gap-2">
          {reservation.status === 'pending' && (
            <button
              onClick={() => updateStatus('confirmed')}
              className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-semibold transition-colors"
            >
              Confirm
            </button>
          )}
          {reservation.status === 'confirmed' && (
            <button
              onClick={() => updateStatus('seated')}
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-semibold transition-colors"
            >
              Mark Seated
            </button>
          )}
          <button
            onClick={() => updateStatus('cancelled')}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

interface AdvanceOrderCardProps {
  order: AdvanceOrder;
  statusColors: Record<string, string>;
  onUpdate: () => void;
  type: 'delivery' | 'takeaway';
}

function AdvanceOrderCard({ order, statusColors, onUpdate, type }: AdvanceOrderCardProps) {
  const updateStatus = async (newStatus: string) => {
    try {
      await supabase
        .from('advance_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      onUpdate();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{order.customer_name}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Phone className="w-4 h-4" />
            {order.customer_mobile}
          </div>
          {order.customer_email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Mail className="w-4 h-4" />
              {order.customer_email}
            </div>
          )}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[order.status || 'pending']}`}>
          {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
        </span>
      </div>

      {type === 'delivery' && order.delivery_address && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Delivery Address:</p>
              <p>{order.delivery_address}</p>
              {order.delivery_instructions && (
                <p className="text-gray-600 mt-1 italic">Note: {order.delivery_instructions}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {order.order_time}
        </div>
        {order.total_amount && (
          <div className="flex items-center gap-1 font-semibold">
            Total: ₹{order.total_amount}
          </div>
        )}
      </div>

      {order.special_instructions && (
        <p className="text-sm text-gray-600 mb-3 italic">"{order.special_instructions}"</p>
      )}

      {order.status !== 'completed' && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <button
              onClick={() => updateStatus('confirmed')}
              className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-semibold transition-colors"
            >
              Confirm
            </button>
          )}
          {order.status === 'confirmed' && (
            <button
              onClick={() => updateStatus('preparing')}
              className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded font-semibold transition-colors"
            >
              Start Preparing
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              onClick={() => updateStatus('ready')}
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-semibold transition-colors"
            >
              Mark Ready
            </button>
          )}
          {order.status === 'ready' && (
            <button
              onClick={() => updateStatus(type === 'delivery' ? 'delivered' : 'completed')}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-semibold transition-colors"
            >
              {type === 'delivery' ? 'Mark Delivered' : 'Mark Completed'}
            </button>
          )}
          <button
            onClick={() => updateStatus('cancelled')}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
