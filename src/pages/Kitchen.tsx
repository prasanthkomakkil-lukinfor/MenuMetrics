import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type KOT = Database['public']['Tables']['kots']['Row'];

export function Kitchen() {
  const { business } = useAuth();
  const [kots, setKots] = useState<KOT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadKOTs();
      const interval = setInterval(loadKOTs, 10000);
      return () => clearInterval(interval);
    }
  }, [business]);

  const loadKOTs = async () => {
    if (!business) return;

    try {
      const { data } = await supabase
        .from('kots')
        .select('*')
        .eq('business_id', business.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      setKots(data || []);
    } catch (error) {
      console.error('Error loading KOTs:', error);
    } finally {
      setLoading(false);
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
    return `${minutes}m`;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Kitchen Display</h1>
        <p className="text-gray-600 mt-1">Manage orders and track preparation</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pending Column */}
          <div className="bg-red-50 rounded-xl border-2 border-red-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-red-900">
                Pending ({kotsByStatus.pending.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {kotsByStatus.pending.map((kot) => (
                <KOTCard
                  key={kot.id}
                  kot={kot}
                  timeColor={getTimeColor(kot.created_at)}
                  timeDisplay={getTimeDisplay(kot.created_at)}
                  onStatusChange={() => loadKOTs()}
                />
              ))}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="bg-yellow-50 rounded-xl border-2 border-yellow-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-bold text-yellow-900">
                Preparing ({kotsByStatus.preparing.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {kotsByStatus.preparing.map((kot) => (
                <KOTCard
                  key={kot.id}
                  kot={kot}
                  timeColor={getTimeColor(kot.created_at)}
                  timeDisplay={getTimeDisplay(kot.created_at)}
                  onStatusChange={() => loadKOTs()}
                />
              ))}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-green-50 rounded-xl border-2 border-green-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-green-900">
                Ready ({kotsByStatus.ready.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {kotsByStatus.ready.map((kot) => (
                <KOTCard
                  key={kot.id}
                  kot={kot}
                  timeColor={getTimeColor(kot.created_at)}
                  timeDisplay={getTimeDisplay(kot.created_at)}
                  onStatusChange={() => loadKOTs()}
                  isReady={true}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

interface KOTCardProps {
  kot: KOT;
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
      await supabase.from('kots').update({ status: newStatus }).eq('id', kot.id);
      onStatusChange();
    } catch (error) {
      console.error('Error updating KOT:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border-l-4 border-amber-500">
      <div className="flex items-start justify-between mb-3">
        <span className="font-bold text-lg text-gray-900">KOT #{kot.kot_number}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded ${timeColor}`}>
          {timeDisplay}
        </span>
      </div>
      <div className="flex gap-2">
        {!isReady && (
          <button
            onClick={() => updateStatus(kot.status === 'pending' ? 'preparing' : 'ready')}
            disabled={updating}
            className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {kot.status === 'pending' ? 'Start' : 'Ready'}
          </button>
        )}
        {isReady && (
          <button
            onClick={() => updateStatus('done')}
            disabled={updating}
            className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
