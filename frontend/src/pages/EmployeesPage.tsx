import { useEffect, useState, FormEvent } from 'react';
import { getUsers, createUser, updateUser, deleteUser, type User, type CreateUserPayload } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../context/ToastContext';
import RoleBadge from '../components/RoleBadge';

const defaultForm: CreateUserPayload & { password: string } = {
  email: '', password: '', first_name: '', last_name: '', phone: '', role: 'operator', is_active: true,
};

const roleOptions = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'operations_manager', label: 'Ops Manager' },
  { value: 'finance', label: 'Finance' },
  { value: 'field_supervisor', label: 'Field Supervisor' },
  { value: 'operator', label: 'Operator' },
];

const filterOptions = [
  { value: '', label: 'All Employees' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'operations_manager', label: 'Ops Manager' },
  { value: 'finance', label: 'Finance' },
  { value: 'field_supervisor', label: 'Field Supervisor' },
  { value: 'operator', label: 'Operator' },
];

export default function EmployeesPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateUserPayload & { password: string }>({ ...defaultForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');

  const load = () => {
    setLoading(true);
    const params = roleFilter ? `?role=${roleFilter}` : '';
    getUsers(params).then(setUsers).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [roleFilter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || (!editingId && !form.password)) return;
    try {
      if (editingId) {
        const { password, ...payload } = form;
        await updateUser(editingId, password ? { ...payload, password } : payload);
        toast.success('Employee updated successfully');
      } else {
        await createUser(form);
        toast.success('Employee created successfully');
      }
      resetForm();
      load();
    } catch { toast.error('Failed to save employee'); }
  };

  const handleEdit = (u: User) => {
    setForm({
      email: u.email, password: '',
      first_name: u.first_name, last_name: u.last_name,
      phone: u.phone, role: u.role, is_active: u.is_active,
    });
    setEditingId(u.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteUser(id);
      toast.success('Employee deleted');
      load();
    } catch { toast.error('Failed to delete employee'); }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      toast.success(`Employee ${u.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Employees</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{editingId ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input name="password" type="password" value={form.password} onChange={handleChange}
              required={!editingId} minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">First Name</label>
            <input name="first_name" value={form.first_name} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Last Name</label>
            <input name="last_name" value={form.last_name} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Role *</label>
            <select name="role" value={form.role} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange}
                className="rounded border-gray-300 text-blue-600" />
              Active
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            {editingId ? 'Update Employee' : 'Create Employee'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-500 font-medium">Filter by role:</label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
        >
          {filterOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? <div className="p-6 text-center text-gray-500">Loading...</div>
        : users.length === 0 ? <div className="p-6 text-center text-gray-400">No employees found</div>
        : <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(u)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer border-0 ${u.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(u.date_joined).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleEdit(u)} className="text-xs text-blue-600 hover:text-blue-700 mr-2">Edit</button>
                    {user?.role === 'super_admin' && (
                      <button onClick={() => handleDelete(u.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}
