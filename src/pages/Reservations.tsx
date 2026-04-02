import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, Users, Phone, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PlanGate } from '../components/PlanGate';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Reservation {
  id: string;
  customer_name: string;
  customer_mobile: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  special_requests: string | null;
  table_id: string | null;
}

export function Reservations() {
  const { business } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (business) {
      loadReservations();
    }
  }, [business, selectedDate]);

  const loadReservations = async () => {
    if (!business) return;

    try {
      const { data } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', business.id)
        .eq('reservation_date', selectedDate)
        .order('reservation_time');

      setReservations(data || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    seated: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-gray-100 text-gray-700',
  };

  const upcomingReservations = reservations.filter((r) => r.status !== 'seated' && r.status !== 'cancelled');
  const completedReservations = reservations.filter((r) => r.status === 'seated' || r.status === 'cancelled');

  return (
    <Layout>
      <PlanGate plan="pro" feature="Advance Orders & Reservations">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reservations</h1>
            <p className="text-gray-600">Manage table bookings and advance orders</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Reservation
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-gray-600 text-sm mb-1">Today's Reservations</p>
            <p className="text-3xl font-bold text-gray-900">{reservations.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-gray-600 text-sm mb-1">Confirmed</p>
            <p className="text-3xl font-bold text-blue-600">
              {reservations.filter((r) => r.status === 'confirmed').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-gray-600 text-sm mb-1">Seated</p>
            <p className="text-3xl font-bold text-green-600">
              {reservations.filter((r) => r.status === 'seated').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-gray-600 text-sm mb-1">Total Guests</p>
            <p className="text-3xl font-bold text-gray-900">
              {reservations.reduce((sum, r) => sum + r.party_size, 0)}
            </p>
          </div>
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
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today.toISOString().split('T')[0]);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow.toISOString().split('T')[0]);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Tomorrow
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Upcoming ({upcomingReservations.length})
                </h3>
                <div className="space-y-3">
                  {upcomingReservations.map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      statusColors={statusColors}
                      onUpdate={loadReservations}
                    />
                  ))}
                  {upcomingReservations.length === 0 && (
                    <p className="text-gray-500 text-sm py-8 text-center">
                      No upcoming reservations
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Completed ({completedReservations.length})
                </h3>
                <div className="space-y-3">
                  {completedReservations.map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      statusColors={statusColors}
                      onUpdate={loadReservations}
                      isCompleted
                    />
                  ))}
                  {completedReservations.length === 0 && (
                    <p className="text-gray-500 text-sm py-8 text-center">
                      No completed reservations
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </PlanGate>
    </Layout>
  );
}

interface ReservationCardProps {
  reservation: Reservation;
  statusColors: Record<string, string>;
  onUpdate: () => void;
  isCompleted?: boolean;
}

function ReservationCard({ reservation, statusColors, onUpdate, isCompleted }: ReservationCardProps) {
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

      {!isCompleted && (
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
