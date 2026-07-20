import { useState, useEffect, useCallback } from 'react';
import { Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, ChefHat, Volume2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type KOT = Database['public']['Tables']['kots']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];

type KOTWithDetails = KOT & {
  order?: Order;
  items?: OrderItem[];
};

export function Kitchen() {
  const { business } = useAuth();
  const [kots, setKots] = useState<KOTWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevPendingCount, setPrevPendingCount] = useState(0);

  const loadKOTs = useCallback(async () => {
    if (!business) return;
    try {
      const { data } = await supabase
        .from('kots')
        .select('*, order:orders(*)')
        .eq('business_id', business.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      const kotList = (data || []) as KOTWithDetails[];

      if (kotList.length > 0) {
        const orderIds = kotList.map((k) => k.order_id).filter(Boolean);
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at');

        const itemsByOrder = new Map<string, OrderItem[]>();
        (items || []).forEach((item) => {
          const arr = itemsByOrder.get(item.order_id) || [];
          arr.push(item);
          itemsByOrder.set(item.order_id, arr);
        });

        kotList.forEach((k) => {
          k.items = itemsByOrder.get(k.order_id) || [];
        });
      }

      const pendingCount = kotList.filter((k) => k.status === 'pending').length;
      if (pendingCount > prevPendingCount && prevPendingCount > 0) {
        playAlert();
      }
      setPrevPendingCount(pendingCount);
      setKots(kotList);
    } catch (error) {
      console.error('Error loading KOTs:', error);
    } finally {
      setLoading(false);
    }
  }, [business, prevPendingCount]);

  useEffect(() => {
    if (business) {
      loadKOTs();
      const interval = setInterval(loadKOTs, 10000);
      return () => clearInterval(interval);
    }
  }, [business, loadKOTs]);

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // audio not available
    }
  };

  const kotsByStatus = {
    pending: kots.filter((k) => k.status === 'pending'),
    preparing: kots.filter((k) => k.status === 'preparing'),
    ready: kots.filter((k) => k.status === 'ready'),
  };

  const getTimeColor = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 10) return 'bg-green-100 text-green-700';
    if (minutes < 20) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getTimeDisplay = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kitchen Display</h1>
          <p className="text-gray-600 mt-1">Track orders from prep to ready</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Volume2 className="w-4 h-4" />
          <span>Auto-refreshes every 10s</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Column */}
          <div className="bg-red-50 rounded-xl border-2 border-red-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-red-900">
                New ({kotsByStatus.pending.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-[75vh] overflow-y-auto">
              {kotsByStatus.pending.map((kot) => (
                <KOTCard
                  key={kot.id}
                  kot={kot}
                  timeColor={getTimeColor(kot.created_at)}
                  timeDisplay={getTimeDisplay(kot.created_at)}
                  onStatusChange={loadKOTs}
                />
              ))}
              {kotsByStatus.pending.length === 0 && (
                <p className="text-red-400 text-sm text-center py-4">No new orders</p>
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="bg-yellow-50 rounded-xl border-2 border-yellow-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-bold text-yellow-900">
                Preparing ({kotsByStatus.preparing.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-[75vh] overflow-y-auto">
              {kotsByStatus.preparing.map((kot) => (
                <KOTCard
                  key={kot.id}
                  kot={kot}
                  timeColor={getTimeColor(kot.created_at)}
                  timeDisplay={getTimeDisplay(kot.created_at)}
                  onStatusChange={loadKOTs}
                />
              ))}
              {kotsByStatus.preparing.length === 0 && (
                <p className="text-yellow-400 text-sm text-center py-4">Nothing in prep</p>
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-green-50 rounded-xl border-2 border-green-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-green-900">
                Ready ({kotsByStatus.ready.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-[75vh] overflow-y-auto">
              {kotsByStatus.ready.map((kot) => (
                <KOTCard
                  key={kot.id}
                  kot={kot}
                  timeColor={getTimeColor(kot.created_at)}
                  timeDisplay={getTimeDisplay(kot.created_at)}
                  onStatusChange={loadKOTs}
                  isReady={true}
                />
              ))}
              {kotsByStatus.ready.length === 0 && (
                <p className="text-green-400 text-sm text-center py-4">No orders ready</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

interface KOTCardProps {
  kot: KOTWithDetails;
  timeColor: string;
  timeDisplay: string;
  onStatusChange: () => void;
  isReady?: boolean;
}

function KOTCard({ kot, timeColor, timeDisplay, onStatusChange, isReady }: KOTCardProps) {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'preparing' && !kot.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (newStatus === 'ready') {
        updates.completed_at = new Date().toISOString();
      }
      await supabase.from('kots').update(updates as never).eq('id', kot.id);
      onStatusChange();
    } catch (error) {
      console.error('Error updating KOT:', error);
    } finally {
      setUpdating(false);
    }
  };

  const orderType = kot.order?.order_type;
  const tableId = kot.order?.table_id;
  const customerName = kot.order?.customer_name;

  return (
    <div className="bg-white rounded-lg p-3 border-l-4 border-amber-500 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-bold text-base text-gray-900">KOT #{kot.kot_number}</span>
          <div className="flex items-center gap-2 mt-1">
            {orderType === 'dine_in' && tableId && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                Dine-In
              </span>
            )}
            {orderType === 'takeaway' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                Takeaway
              </span>
            )}
            {orderType === 'delivery' && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                Delivery
              </span>
            )}
            {customerName && (
              <span className="text-xs text-gray-600">{customerName}</span>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${timeColor}`}>
          {timeDisplay}
        </span>
      </div>

      {/* Order Items */}
      {kot.items && kot.items.length > 0 && (
        <div className="mb-3 border-t border-gray-100 pt-2">
          <div className="space-y-1">
            {kot.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div className="flex-1">
                  <span className="font-semibold text-gray-900">{item.quantity}× {item.item_name}</span>
                  {item.notes && (
                    <p className="text-xs text-orange-600 ml-1">📝 {item.notes}</p>
                  )}
                  {item.is_foc && (
                    <span className="text-xs text-red-600 ml-1">FOC</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isReady && (
          <button
            onClick={() => updateStatus(kot.status === 'pending' ? 'preparing' : 'ready')}
            disabled={updating}
            className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {kot.status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
          </button>
        )}
        {isReady && (
          <button
            onClick={() => updateStatus('done')}
            disabled={updating}
            className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Bump / Done
          </button>
        )}
      </div>
    </div>
  );
}
