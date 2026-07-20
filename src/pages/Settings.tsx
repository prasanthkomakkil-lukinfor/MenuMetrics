import { useState, useEffect } from 'react';
import { Save, Building2, CreditCard, Bell, Shield, Crown, Receipt } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function Settings() {
  const { business } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gst_number: '',
    address: '',
    phone: '',
    email: '',
  });
  const [taxData, setTaxData] = useState({
    cgst_rate: '2.5',
    sgst_rate: '2.5',
    igst_rate: '5',
    service_charge_rate: '0',
    enable_service_charge: false,
  });

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        gst_number: business.gst_number || '',
        address: business.address || '',
        phone: business.phone || '',
        email: business.email || '',
      });
      setTaxData({
        cgst_rate: String(business.cgst_rate ?? 2.5),
        sgst_rate: String(business.sgst_rate ?? 2.5),
        igst_rate: String(business.igst_rate ?? 5),
        service_charge_rate: String(business.service_charge_rate ?? 0),
        enable_service_charge: business.enable_service_charge ?? false,
      });
    }
  }, [business]);

  const handleTaxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          cgst_rate: parseFloat(taxData.cgst_rate) || 0,
          sgst_rate: parseFloat(taxData.sgst_rate) || 0,
          igst_rate: parseFloat(taxData.igst_rate) || 0,
          service_charge_rate: parseFloat(taxData.service_charge_rate) || 0,
          enable_service_charge: taxData.enable_service_charge,
        } as never)
        .eq('id', business.id);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error updating tax settings:', error);
      alert('Failed to save tax settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update(formData as never)
        .eq('id', business.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-gray-600">Manage your restaurant settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>

              {saved && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  Settings saved successfully!
                </div>
              )}
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Receipt className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Tax & Service Charge</h2>
            </div>
            <form onSubmit={handleTaxSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxData.cgst_rate}
                    onChange={(e) => setTaxData({ ...taxData, cgst_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxData.sgst_rate}
                    onChange={(e) => setTaxData({ ...taxData, sgst_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxData.igst_rate}
                    onChange={(e) => setTaxData({ ...taxData, igst_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Enable Service Charge</p>
                  <p className="text-sm text-gray-600">Optional charge added to bills (e.g., 5% service charge)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxData.enable_service_charge}
                    onChange={(e) => setTaxData({ ...taxData, enable_service_charge: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              {taxData.enable_service_charge && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxData.service_charge_rate}
                    onChange={(e) => setTaxData({ ...taxData, service_charge_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Tax Settings'}
              </button>
              {saved && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  Tax settings saved successfully!
                </div>
              )}
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              {[
                { id: 'order_notifications', label: 'New Order Notifications', description: 'Get notified when new orders arrive' },
                { id: 'low_stock', label: 'Low Stock Alerts', description: 'Alert when inventory is running low' },
                { id: 'daily_reports', label: 'Daily Reports', description: 'Receive end-of-day sales reports' },
                { id: 'customer_feedback', label: 'Customer Feedback', description: 'Get notified of new customer feedback' },
              ].map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{notification.label}</p>
                    <p className="text-sm text-gray-600">{notification.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl mb-3">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Active Plan</p>
              <p className="text-2xl font-bold text-gray-900 mb-2">Pro</p>
              <p className="text-sm text-gray-600">All features unlocked</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>

            <div className="space-y-3">
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-left">
                Change Password
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-left">
                Two-Factor Authentication
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-left">
                Session Management
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
