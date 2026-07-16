import { useState, useEffect } from 'react';
import { Printer, Share2, CircleAlert as AlertCircle, DollarSign, CircleCheck as CheckCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Bill = Database['public']['Tables']['bills']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];

export function Billing() {
  const { business, staff } = useAuth();
  const [bills, setBills] = useState<(Bill & { order?: Order })[]>([]);
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (business) {
      loadBills();
    }
  }, [business, filterStatus]);

  const loadBills = async () => {
    if (!business) return;
    try {
      let query = supabase
        .from('bills')
        .select('*, orders(*)')
        .eq('business_id', business.id);

      if (filterStatus !== 'all') {
        query = query.eq('payment_status', filterStatus);
      }

      const { data } = await query.order('created_at', { ascending: false }).limit(50);
      setBills(data || []);
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedBillData = bills.find((b) => b.id === selectedBill);
  const pendingAmount = selectedBillData
    ? Number(selectedBillData.total_amount) - Number(selectedBillData.paid_amount)
    : 0;

  const collectPayment = async () => {
    if (!selectedBillData || !business || !staff) return;
    const amount = parseFloat(paidAmount);
    if (!amount || amount <= 0) {
      alert('Enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      // Insert payment record
      const { error: payError } = await supabase
        .from('payments')
        .insert({
          business_id: business.id,
          bill_id: selectedBillData.id,
          payment_mode: paymentMode,
          amount: amount,
          processed_by: staff.id,
        } as never);

      if (payError) throw payError;

      const newPaidAmount = Number(selectedBillData.paid_amount) + amount;
      const newStatus = newPaidAmount >= Number(selectedBillData.total_amount) ? 'paid' : 'partial';

      // Update bill
      const { error: billError } = await supabase
        .from('bills')
        .update({
          paid_amount: newPaidAmount,
          payment_status: newStatus,
        } as never)
        .eq('id', selectedBillData.id);

      if (billError) throw billError;

      // If fully paid, free the table
      if (newStatus === 'paid' && selectedBillData.order?.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'free' } as never)
          .eq('id', selectedBillData.order.table_id);
      }

      setShowPaymentModal(false);
      setPaidAmount('');
      loadBills();
    } catch (error) {
      console.error('Error collecting payment:', error);
      alert('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const printBill = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Billing & Payments</h1>
        <p className="text-gray-600">Manage bills and payment collection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <input
                type="text"
                placeholder="Search bill number..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <div className="flex gap-2">
                {(['all', 'pending', 'partial', 'paid'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === status
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🧾</div>
                <p className="text-gray-500">No bills yet. Generate a bill from the Orders page.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {bills.map((bill) => (
                  <button
                    key={bill.id}
                    onClick={() => setSelectedBill(bill.id)}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      selectedBill === bill.id
                        ? 'bg-amber-50 border-2 border-amber-500'
                        : 'bg-gray-50 border border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">Bill #{bill.bill_number}</span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          bill.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : bill.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {bill.payment_status.charAt(0).toUpperCase() + bill.payment_status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>₹{bill.total_amount}</span>
                      <span>{new Date(bill.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedBillData && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bill Preview</h2>

              <div className="border-b border-gray-200 pb-4 mb-4">
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  ₹{selectedBillData.total_amount}
                </p>
                <p className="text-sm text-gray-600">Bill #{selectedBillData.bill_number}</p>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{selectedBillData.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium">-₹{selectedBillData.discount_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST + SGST</span>
                  <span className="font-medium">
                    ₹{Number(selectedBillData.cgst_amount) + Number(selectedBillData.sgst_amount)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>₹{selectedBillData.total_amount}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid</span>
                  <span>₹{selectedBillData.paid_amount}</span>
                </div>
                {selectedBillData.payment_status !== 'paid' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mt-4">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Pending Amount</p>
                    <p className="text-xl font-bold text-yellow-900">₹{pendingAmount}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={printBill}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors">
                  <Share2 className="w-4 h-4" />
                  WhatsApp
                </button>
                {selectedBillData.payment_status !== 'paid' && (
                  <button
                    onClick={() => {
                      setPaidAmount(String(pendingAmount));
                      setShowPaymentModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Collect Payment
                  </button>
                )}
                {selectedBillData.payment_status === 'paid' && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    Fully Paid
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBillData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Collect Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <Share2 className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Bill Total</span>
                <span className="font-semibold">₹{selectedBillData.total_amount}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Already Paid</span>
                <span className="font-semibold text-green-600">₹{selectedBillData.paid_amount}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>Pending</span>
                <span>₹{pendingAmount}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'upi'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        paymentMode === mode
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={collectPayment}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Collect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
