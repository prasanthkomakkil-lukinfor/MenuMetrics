import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Shield, User } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type StaffMember = Database['public']['Tables']['staff']['Row'];

const roleIcons = {
  owner: Shield,
  manager: Shield,
  supervisor: User,
  waiter: User,
  cashier: User,
  kitchen: User,
};

const roleColors = {
  owner: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-indigo-100 text-indigo-700',
  waiter: 'bg-green-100 text-green-700',
  cashier: 'bg-amber-100 text-amber-700',
  kitchen: 'bg-orange-100 text-orange-700',
};

export function Staff() {
  const { business } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'waiter' as const,
    pin: '',
  });

  useEffect(() => {
    if (business) {
      loadStaff();
    }
  }, [business]);

  const loadStaff = async () => {
    if (!business) return;

    try {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('role');

      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    try {
      setLoading(true);
      if (editingId) {
        await supabase
          .from('staff')
          .update({
            name: formData.name,
            role: formData.role,
            pin: formData.pin || null,
          })
          .eq('id', editingId);
      } else {
        await supabase.from('staff').insert({
          business_id: business.id,
          user_id: crypto.randomUUID(),
          name: formData.name,
          role: formData.role,
          pin: formData.pin || null,
          is_active: true,
        });
      }

      setFormData({ name: '', role: 'waiter', pin: '' });
      setEditingId(null);
      setShowModal(false);
      loadStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Staff Management</h1>
          <p className="text-gray-600">Manage your restaurant team and roles</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', role: 'waiter', pin: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffMembers.map((member) => {
            const RoleIcon = roleIcons[member.role];
            return (
              <div
                key={member.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <RoleIcon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold inline-block mt-1 ${
                          roleColors[member.role]
                        }`}
                      >
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(member.id);
                        setFormData({
                          name: member.name,
                          role: member.role as typeof formData.role,
                          pin: member.pin || '',
                        });
                        setShowModal(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                {member.pin && (
                  <p className="text-xs text-gray-600">
                    PIN: <span className="font-mono font-semibold">****</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Staff' : 'Add Staff Member'}
            </h2>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="waiter">Waiter</option>
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN (4 digits, optional)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  placeholder="1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
                >
                  {editingId ? 'Update' : 'Add'} Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
