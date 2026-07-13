import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Operator } from '../api/logsheet';
import api from '../api/logsheet';

export default function Operators() {
  const user = useAuthStore((s) => s.user);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({
    name: '', phone: '', email: '', license_type: '', license_number: '',
    license_expiry: '', certifications: '', experience_years: '', notes: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const canManage = user && ['super_admin', 'operations_manager'].includes(user.role);

  const load = () => {
    setLoading(true);
    api.operators.list().then(setOperators).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const payload = { ...form, experience_years: form.experience_years ? Number(form.experience_years) : null, license_expiry: form.license_expiry || null };
      if (editingId) {
        await api.operators.update(editingId, payload);
      } else {
        await api.operators.create(payload);
      }
      resetForm();
      load();
    } catch { alert('Failed to save operator'); }
  };

  const handleEdit = (op: Operator) => {
    setForm({
      name: op.name, phone: op.phone, email: op.email,
      license_type: op.license_type, license_number: op.license_number,
      license_expiry: op.license_expiry || '', certifications: op.certifications,
      experience_years: op.experience_years?.toString() || '', notes: op.notes,
    });
    setEditingId(op.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this operator?')) return;
    try { await api.operators.delete(id); load(); } catch { alert('Failed to delete'); }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', license_type: '', license_number: '',
      license_expiry: '', certifications: '', experience_years: '', notes: '' });
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Operators</h1>

      {canManage && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">License Type</label>
              <input name="license_type" value={form.license_type} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">License Expiry</label>
              <input name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              {editingId ? 'Update' : 'Add Operator'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            )}
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? <div className="p-6 text-center text-gray-500">Loading...</div>
        : operators.length === 0 ? <div className="p-6 text-center text-gray-400">No operators</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">License</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {canManage && <th className="px-4 py-3 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/operators/${op.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {op.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{op.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{op.license_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{op.license_expiry || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${op.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {op.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleEdit(op)} className="text-xs text-blue-600 hover:text-blue-700 mr-2">Quick Edit</button>
                        <button onClick={() => handleDelete(op.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}
