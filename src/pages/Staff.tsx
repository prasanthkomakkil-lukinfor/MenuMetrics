import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Shield, User, Mail, Lock, Key } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type StaffMember = Database['public']['Tables']['staff']['Row'] & {
  permissions?: string[];
};

const roleIcons = {
  owner: Shield,
  manager: Shield,
  supervisor: User,
  waiter: User,
  cashier: User,
  kitchen: User,
};

const roleColors = {
  owner: 'bg-rose-100 text-rose-700',
  manager: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-emerald-100 text-emerald-700',
  waiter: 'bg-green-100 text-green-700',
  cashier: 'bg-amber-100 text-amber-700',
  kitchen: 'bg-orange-100 text-orange-700',
};

const ALL_PERMISSIONS = [
  { id: 'view_orders', label: 'View Orders' },
  { id: 'create_orders', label: 'Create Orders' },
  { id: 'update_orders', label: 'Update Orders' },
  { id: 'delete_orders', label: 'Delete Orders' },
  { id: 'view_menu', label: 'View Menu' },
  { id: 'manage_menu', label: 'Manage Menu' },
  { id: 'view_inventory', label: 'View Inventory' },
  { id: 'manage_inventory', label: 'Manage Inventory' },
  { id: 'view_customers', label: 'View Customers' },
  { id: 'manage_customers', label: 'Manage Customers' },
  { id: 'view_reservations', label: 'View Reservations' },
  { id: 'manage_reservations', label: 'Manage Reservations' },
  { id: 'view_staff', label: 'View Staff' },
  { id: 'manage_staff', label: 'Manage Staff' },
  { id: 'view_reports', label: 'View Reports' },
  { id: 'view_billing', label: 'View Billing' },
  { id: 'manage_settings', label: 'Manage Settings' },
];

export function Staff() {
  const { business, staff: currentStaff } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter' as const,
    permissions: [] as string[],
  });

  const isOwner = currentStaff?.role === 'owner';

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
            permissions: formData.permissions,
          })
          .eq('id', editingId);
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        const permissions = formData.role === 'owner'
          ? ALL_PERMISSIONS.map(p => p.id)
          : formData.permissions;

        await supabase.from('staff').insert({
          business_id: business.id,
          user_id: authData.user.id,
          name: formData.name,
          role: formData.role,
          permissions: permissions,
          is_active: true,
        });
      }

      setFormData({ name: '', email: '', password: '', role: 'waiter', permissions: [] });
      setEditingId(null);
      setShowModal(false);
      loadStaff();
    } catch (error: any) {
      alert(error.message || 'Error saving staff');
      console.error('Error saving staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      await supabase
        .from('staff')
        .update({ is_active: false })
        .eq('id', id);
      loadStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  if (!isOwner) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only owners can manage staff members.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Staff Management</h1>
          <p className="text-gray-600">Manage your restaurant team, roles, and access levels</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', email: '', password: '', role: 'waiter', permissions: [] });
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
            const permissions = Array.isArray(member.permissions) ? member.permissions : [];

            return (
              <div
                key={member.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                      <RoleIcon className="w-6 h-6 text-gray-700" />
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
                          email: '',
                          password: '',
                          role: member.role as typeof formData.role,
                          permissions: permissions,
                        });
                        setShowModal(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {permissions.length > 0 ? (
                      permissions.slice(0, 3).map(perm => (
                        <span key={perm} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {perm.replace('_', ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No permissions</span>
                    )}
                    {permissions.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        +{permissions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
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

              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </>
              )}

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

              {formData.role !== 'owner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Key className="w-4 h-4 inline mr-1" />
                    Access Permissions
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_PERMISSIONS.map(permission => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm text-gray-700">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {editingId ? 'Update' : 'Create'} Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
