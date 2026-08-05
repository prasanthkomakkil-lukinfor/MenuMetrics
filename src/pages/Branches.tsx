import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Building2, MapPin, Phone, Mail, Store, CreditCard as Edit, Trash2, CircleCheck as CheckCircle, Circle, Copy, ArrowLeft } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Business = Database['public']['Tables']['businesses']['Row'];

interface BranchWithStats extends Business {
  todayRevenue: number;
  todayBills: number;
  staffCount: number;
}

export function Branches() {
  const { brand, branches, loadBranches, user, switchBranch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branchList, setBranchList] = useState<BranchWithStats[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Business | null>(null);
  const [creatingBrand, setCreatingBrand] = useState(false);

  const [form, setForm] = useState({
    name: '',
    branch_name: '',
    branch_code: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    gst_number: '',
  });

  const [brandName, setBrandName] = useState('');

  const loadBranchData = useCallback(async () => {
    if (!brand) return;
    setLoading(true);
    try {
      const { data: branchData } = await supabase
        .from('businesses')
        .select('*')
        .eq('brand_id', brand.id)
        .order('branch_name');

      if (!branchData) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const withStats = await Promise.all(
        (branchData as Business[]).map(async (b) => {
          const [billsRes, staffRes] = await Promise.all([
            supabase
              .from('bills')
              .select('total_amount')
              .eq('business_id', b.id)
              .gte('created_at', today.toISOString()),
            supabase
              .from('staff')
              .select('id')
              .eq('business_id', b.id)
              .eq('is_active', true),
          ]);
          return {
            ...b,
            todayRevenue: billsRes.data?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0,
            todayBills: billsRes.data?.length || 0,
            staffCount: staffRes.data?.length || 0,
          };
        })
      );

      setBranchList(withStats);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  }, [brand]);

  useEffect(() => {
    if (brand) {
      loadBranchData();
    } else {
      setLoading(false);
    }
  }, [brand, loadBranchData]);

  const openAdd = () => {
    setEditingBranch(null);
    setForm({
      name: '',
      branch_name: '',
      branch_code: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      gst_number: '',
    });
    setShowModal(true);
  };

  const openEdit = (b: Business) => {
    setEditingBranch(b);
    setForm({
      name: b.name,
      branch_name: b.branch_name || '',
      branch_code: b.branch_code || '',
      city: b.city || '',
      address: b.address || '',
      phone: b.phone || '',
      email: b.email || '',
      gst_number: b.gst_number || '',
    });
    setShowModal(true);
  };

  const saveBranch = async () => {
    if (!brand || !user) return;
    if (!form.branch_name) { alert('Branch name is required'); return; }

    try {
      if (editingBranch) {
        await supabase.from('businesses').update({
          name: form.name || form.branch_name,
          branch_name: form.branch_name,
          branch_code: form.branch_code || null,
          city: form.city || null,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          gst_number: form.gst_number || null,
        } as never).eq('id', editingBranch.id);
      } else {
        // Create a new branch under this brand
        const branchName = form.branch_name;
        const { data: newBusiness, error: bizError } = await supabase.from('businesses').insert({
          name: form.name || branchName,
          brand_id: brand.id,
          branch_name: branchName,
          branch_code: form.branch_code || null,
          city: form.city || null,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          gst_number: form.gst_number || null,
          plan: 'pro',
          is_active: true,
          loyalty_points_per_rupee: 1,
          loyalty_redemption_rate: 0.01,
          loyalty_gold_threshold: 10000,
          loyalty_silver_threshold: 5000,
          cgst_rate: 2.5,
          sgst_rate: 2.5,
          igst_rate: 5,
          service_charge_rate: 0,
          enable_service_charge: false,
        } as never).select().single();

        if (bizError) throw bizError;

        // Create a staff row for the brand owner in the new branch
        await supabase.from('staff').insert({
          business_id: newBusiness.id,
          user_id: user.id,
          name: user.email || 'Brand Owner',
          role: 'owner',
          pin: '0000',
          is_active: true,
          brand_id: brand.id,
          permissions: ['all'],
        } as never);
      }

      setShowModal(false);
      loadBranchData();
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Failed to save branch');
    }
  };

  const toggleActive = async (b: Business) => {
    await supabase.from('businesses').update({ is_active: !b.is_active } as never).eq('id', b.id);
    loadBranchData();
    loadBranches();
  };

  const createBrand = async () => {
    if (!user || !brandName) { alert('Brand name is required'); return; }
    try {
      const { data: newBrand, error } = await supabase.from('brands').insert({
        name: brandName,
        owner_user_id: user.id,
      } as never).select().single();

      if (error) throw error;

      // Update current staff to have brand_id
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, business_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (staffData) {
        await supabase.from('staff').update({ brand_id: newBrand.id } as never).eq('id', staffData.id);

        // Update current business to be first branch
        await supabase.from('businesses').update({
          brand_id: newBrand.id,
          branch_name: staffData.business_id ? 'Main Branch' : null,
          is_active: true,
        } as never).eq('id', staffData.business_id);
      }

      setCreatingBrand(false);
      setBrandName('');
      window.location.reload();
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('Failed to create brand');
    }
  };

  const totalRevenue = branchList.reduce((sum, b) => sum + b.todayRevenue, 0);
  const totalBills = branchList.reduce((sum, b) => sum + b.todayBills, 0);
  const totalStaff = branchList.reduce((sum, b) => sum + b.staffCount, 0);
  const activeBranchCount = branchList.filter((b) => b.is_active).length;

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Branch Management</h1>
          <p className="text-gray-600">
            {brand ? `${brand.name} — ${branchList.length} branches` : 'Manage your restaurant chain'}
          </p>
        </div>
        {brand && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        )}
      </div>

      {/* Brand setup prompt */}
      {!brand && !creatingBrand && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Store className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Set Up Your Brand</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create a brand to manage multiple branches. You'll be able to see aggregated reports
            across all your outlets and switch between them.
          </p>
          <button
            onClick={() => setCreatingBrand(true)}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
          >
            Create Brand
          </button>
        </div>
      )}

      {creatingBrand && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create Your Brand</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. KFC, Pizza Hut, Domino's"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCreatingBrand(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createBrand}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold"
              >
                Create Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand overview stats */}
      {brand && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-gray-600">Active Branches</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{activeBranchCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Today's Revenue</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Copy className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">Today's Bills</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalBills}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-600">Total Staff</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : branchList.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500 mb-4">No branches yet. Add your first branch to get started.</p>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold"
              >
                <Plus className="w-4 h-4" /> Add First Branch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchList.map((b) => (
                <div
                  key={b.id}
                  className={`bg-white rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md ${
                    b.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Store className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{b.branch_name || b.name}</p>
                        {b.branch_code && <p className="text-xs text-gray-500">{b.branch_code}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(b)}
                      className="text-gray-400 hover:text-gray-600"
                      title={b.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {b.is_active ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                    {b.city && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{b.city}</p>}
                    {b.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{b.phone}</p>}
                    {b.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{b.email}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-y border-gray-100">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Revenue</p>
                      <p className="text-sm font-bold text-gray-900">₹{b.todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Bills</p>
                      <p className="text-sm font-bold text-gray-900">{b.todayBills}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Staff</p>
                      <p className="text-sm font-bold text-gray-900">{b.staffCount}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => switchBranch(b.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" /> View
                    </button>
                    <button
                      onClick={() => openEdit(b)}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {b.id !== branches[0]?.id && (
                      <button
                        onClick={() => { if (confirm('Delete this branch?')) { supabase.from('businesses').update({ is_active: false } as never).eq('id', b.id); loadBranchData(); } }}
                        className="px-3 py-1.5 text-sm border border-gray-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    value={form.branch_name}
                    onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
                    placeholder="e.g. MG Road Outlet"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={form.branch_code}
                    onChange={(e) => setForm({ ...form, branch_code: e.target.value })}
                    placeholder="e.g. KFC-001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button onClick={saveBranch} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">{editingBranch ? 'Update' : 'Add'} Branch</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
