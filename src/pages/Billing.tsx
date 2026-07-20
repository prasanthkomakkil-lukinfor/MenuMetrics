import { useState, useEffect, useCallback } from 'react';
import { Printer, Share2, DollarSign, CircleCheck as CheckCircle, Tag, CreditCard, X, Receipt } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Bill = Database['public']['Tables']['bills']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Table = Database['public']['Tables']['tables']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

const cardTypes = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex', label: 'Amex' },
  { id: 'rupay', label: 'RuPay' },
  { id: 'diners', label: 'Diners' },
  { id: 'other', label: 'Other' },
];

export function Billing() {
  const { business, staff } = useAuth();
  const [bills, setBills] = useState<(Bill & { order?: Order })[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi'>('cash');
  const [cardType, setCardType] = useState<string>('visa');
  const [cardLast4, setCardLast4] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);

  const loadBills = useCallback(async () => {
    if (!business) return;
    try {
      let query = supabase
        .from('bills')
        .select('*, order:orders(*)')
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
  }, [business, filterStatus]);

  useEffect(() => {
    if (business) loadBills();
  }, [business, loadBills]);

  const loadBillDetails = async (bill: Bill & { order?: Order }) => {
    if (!bill.order) return;
    try {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', bill.order.id)
        .order('created_at');
      setOrderItems(items || []);

      if (bill.order.table_id) {
        const { data: table } = await supabase
          .from('tables')
          .select('*')
          .eq('id', bill.order.table_id)
          .maybeSingle();
        setTableInfo(table);
      } else {
        setTableInfo(null);
      }

      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('bill_id', bill.id)
        .order('created_at');
      setPayments(pays || []);
    } catch (error) {
      console.error('Error loading bill details:', error);
    }
  };

  const selectedBill = bills.find((b) => b.id === selectedBillId);
  const pendingAmount = selectedBill
    ? Number(selectedBill.total_amount) - Number(selectedBill.paid_amount)
    : 0;

  const handleSelectBill = (bill: Bill & { order?: Order }) => {
    setSelectedBillId(bill.id);
    loadBillDetails(bill);
  };

  const collectPayment = async () => {
    if (!selectedBill || !business || !staff) return;
    const amount = parseFloat(paidAmount);
    if (!amount || amount <= 0) {
      alert('Enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const paymentPayload: Record<string, unknown> = {
        business_id: business.id,
        bill_id: selectedBill.id,
        payment_mode: paymentMode,
        amount: amount,
        processed_by: staff.id,
      };

      if (paymentMode === 'card') {
        paymentPayload.card_type = cardType;
        paymentPayload.card_last_4 = cardLast4 || null;
      } else if (paymentMode === 'upi') {
        paymentPayload.upi_ref = upiRef || null;
      }

      const { error: payError } = await supabase
        .from('payments')
        .insert(paymentPayload as never);

      if (payError) throw payError;

      const newPaidAmount = Number(selectedBill.paid_amount) + amount;
      const newStatus = newPaidAmount >= Number(selectedBill.total_amount) ? 'paid' : 'partial';

      await supabase
        .from('bills')
        .update({
          paid_amount: newPaidAmount,
          payment_status: newStatus,
        } as never)
        .eq('id', selectedBill.id);

      if (newStatus === 'paid' && selectedBill.order?.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'free' } as never)
          .eq('id', selectedBill.order.table_id);
      }

      setShowPaymentModal(false);
      setPaidAmount('');
      setCardLast4('');
      setUpiRef('');
      loadBills();
    } catch (error) {
      console.error('Error collecting payment:', error);
      alert('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const applyDiscount = async () => {
    if (!selectedBill || !business) return;
    setSavingDiscount(true);
    try {
      const order = selectedBill.order;
      if (!order) return;

      const subtotal = Number(order.subtotal);
      let discAmount = 0;
      let discPercent = 0;

      if (discountAmount) {
        discAmount = parseFloat(discountAmount);
      } else if (discountPercent) {
        discPercent = parseFloat(discountPercent);
        discAmount = (subtotal * discPercent) / 100;
      }

      const newTotal = subtotal - discAmount + Number(order.tax_amount);
      const cgst = Number(order.tax_amount) / 2;
      const sgst = Number(order.tax_amount) / 2;

      await supabase
        .from('bills')
        .update({
          discount_amount: discAmount,
          total_amount: newTotal,
        } as never)
        .eq('id', selectedBill.id);

      await supabase
        .from('orders')
        .update({
          discount_amount: discAmount,
          discount_percent: discPercent,
          total_amount: newTotal,
        } as never)
        .eq('id', order.id);

      setShowDiscountModal(false);
      setDiscountAmount('');
      setDiscountPercent('');
      loadBills();
    } catch (error) {
      console.error('Error applying discount:', error);
      alert('Failed to apply discount');
    } finally {
      setSavingDiscount(false);
    }
  };

  const printBill = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Billing & Payments</h1>
        <p className="text-gray-600">Manage bills, discounts, and payment collection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bills List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex gap-2 flex-wrap">
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
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No bills yet. Generate a bill from the Orders page.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {bills.map((bill) => (
                  <button
                    key={bill.id}
                    onClick={() => handleSelectBill(bill)}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      selectedBillId === bill.id
                        ? 'bg-amber-50 border-2 border-amber-500'
                        : 'bg-gray-50 border border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
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
                      <span>
                        {bill.order?.order_type === 'dine_in' ? 'Dine-In' : bill.order?.order_type === 'takeaway' ? 'Takeaway' : bill.order?.order_type === 'delivery' ? 'Delivery' : 'Order'}
                        {bill.order?.customer_name && ` · ${bill.order.customer_name}`}
                      </span>
                      <span className="font-bold text-gray-900">₹{bill.total_amount}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(bill.created_at).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bill Preview */}
        {selectedBill ? (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Bill Preview</h2>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    selectedBill.payment_status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : selectedBill.payment_status === 'partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedBill.payment_status.charAt(0).toUpperCase() + selectedBill.payment_status.slice(1)}
                </span>
              </div>

              {/* Bill Header */}
              <div className="border-b border-gray-200 pb-3 mb-3">
                <p className="text-sm font-semibold text-gray-900">{business?.name}</p>
                <p className="text-sm text-gray-600">Bill #{selectedBill.bill_number}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{new Date(selectedBill.created_at).toLocaleString()}</span>
                </div>
                {tableInfo && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                    Table {tableInfo.table_number} · {tableInfo.capacity} seats
                  </div>
                )}
                {selectedBill.order?.order_type === 'takeaway' && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
                    Takeaway Order
                  </div>
                )}
                {selectedBill.order?.order_type === 'delivery' && (
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                      Delivery Order
                    </div>
                    {selectedBill.order.delivery_address && (
                      <p className="text-xs text-gray-600 mt-1">Address: {selectedBill.order.delivery_address}</p>
                    )}
                    {selectedBill.order.delivery_instructions && (
                      <p className="text-xs text-gray-500">Instructions: {selectedBill.order.delivery_instructions}</p>
                    )}
                  </div>
                )}
                {selectedBill.order?.customer_name && (
                  <p className="text-xs text-gray-600 mt-1">Customer: {selectedBill.order.customer_name}</p>
                )}
                {selectedBill.order?.customer_mobile && (
                  <p className="text-xs text-gray-600">Mobile: {selectedBill.order.customer_mobile}</p>
                )}
              </div>

              {/* Order Items */}
              {orderItems.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                  <div className="space-y-1">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                        <div className="flex-1">
                          <span className="text-gray-900 font-medium">{item.quantity}× {item.item_name}</span>
                          <span className="text-xs text-gray-400 ml-2">₹{item.unit_price} each</span>
                        </div>
                        <span className="font-semibold text-gray-900">₹{item.total_price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bill Summary */}
              <div className="space-y-1.5 text-sm border-t border-gray-200 pt-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{selectedBill.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-red-600">-₹{selectedBill.discount_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST</span>
                  <span className="font-medium">₹{selectedBill.cgst_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST</span>
                  <span className="font-medium">₹{selectedBill.sgst_amount}</span>
                </div>
                {selectedBill.order?.order_type === 'delivery' && Number(selectedBill.order?.delivery_charge || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="font-medium">₹{selectedBill.order.delivery_charge}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-100">
                  <span>Total</span>
                  <span>₹{selectedBill.total_amount}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid</span>
                  <span>₹{selectedBill.paid_amount}</span>
                </div>
                {selectedBill.payment_status !== 'paid' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mt-2">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Pending Amount</p>
                    <p className="text-xl font-bold text-yellow-900">₹{pendingAmount}</p>
                  </div>
                )}
              </div>

              {/* Payments History */}
              {payments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment History</p>
                  <div className="space-y-1">
                    {payments.map((pay) => (
                      <div key={pay.id} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                        <span className="text-gray-700">
                          {pay.payment_mode.toUpperCase()}
                          {pay.payment_mode === 'card' && pay.card_type && ` · ${pay.card_type}`}
                          {pay.payment_mode === 'card' && pay.card_last_4 && ` · ****${pay.card_last_4}`}
                          {pay.payment_mode === 'upi' && pay.upi_ref && ` · ${pay.upi_ref}`}
                        </span>
                        <span className="font-semibold text-gray-900">₹{pay.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {selectedBill.payment_status !== 'paid' && (
                  <>
                    <button
                      onClick={() => setShowDiscountModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                    >
                      <Tag className="w-4 h-4" />
                      Apply Discount
                    </button>
                    <button
                      onClick={() => {
                        setPaidAmount(String(pendingAmount));
                        setPaymentMode('cash');
                        setShowPaymentModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      <DollarSign className="w-4 h-4" />
                      Collect Payment
                    </button>
                  </>
                )}
                <button
                  onClick={printBill}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Bill
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors">
                  <Share2 className="w-4 h-4" />
                  Send WhatsApp
                </button>
                {selectedBill.payment_status === 'paid' && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    Fully Paid
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center sticky top-4">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a bill to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Collect Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Bill Total</span>
                <span className="font-semibold">₹{selectedBill.total_amount}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Already Paid</span>
                <span className="font-semibold text-green-600">₹{selectedBill.paid_amount}</span>
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
                      className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        paymentMode === mode
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mode === 'cash' && <DollarSign className="w-4 h-4" />}
                      {mode === 'card' && <CreditCard className="w-4 h-4" />}
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMode === 'card' && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {cardTypes.map((ct) => (
                        <button
                          key={ct.id}
                          onClick={() => setCardType(ct.id)}
                          className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            cardType === ct.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {paymentMode === 'upi' && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI Reference (optional)</label>
                  <input
                    type="text"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="UPI transaction ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              )}

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
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setPaidAmount(String(pendingAmount))}
                    className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Full (₹{pendingAmount})
                  </button>
                  <button
                    onClick={() => setPaidAmount(String(Math.ceil(pendingAmount / 2)))}
                    className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Half
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
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

      {/* Discount Modal */}
      {showDiscountModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Apply Discount</h2>
              <button onClick={() => setShowDiscountModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{selectedBill.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Current Discount</span>
                <span className="font-semibold text-red-600">₹{selectedBill.discount_amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold">₹{selectedBill.cgst_amount + selectedBill.sgst_amount}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => {
                    setDiscountAmount(e.target.value);
                    setDiscountPercent('');
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="text-center text-xs text-gray-400">— OR —</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percent (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => {
                    setDiscountPercent(e.target.value);
                    setDiscountAmount('');
                  }}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      setDiscountPercent(String(pct));
                      setDiscountAmount('');
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-amber-100 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyDiscount}
                  disabled={savingDiscount || (!discountAmount && !discountPercent)}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {savingDiscount ? 'Applying...' : 'Apply Discount'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
