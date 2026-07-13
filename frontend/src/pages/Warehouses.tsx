import { useEffect, useState, FormEvent } from 'react';
import type { Warehouse } from '../api/equipment';
import api from '../api/equipment';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({
    name: '', address: '', city: '', state: '', pincode: '',
    contact_person: '', contact_phone: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.warehouses.list().then(setWarehouses).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await api.warehouses.update(editingId, form);
      } else {
        await api.warehouses.create(form);
      }
      resetForm();
      load();
    } catch {
      alert('Failed to save warehouse');
    }
  };

  const handleEdit = (w: Warehouse) => {
    setForm({
      name: w.name, address: w.address, city: w.city, state: w.state,
      pincode: w.pincode, contact_person: w.contact_person, contact_phone: w.contact_phone,
    });
    setEditingId(w.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this warehouse?')) return;
    try { await api.warehouses.delete(id); load(); } catch { alert('Failed to delete'); }
  };

  const resetForm = () => {
    setForm({ name: '', address: '', city: '', state: '', pincode: '', contact_person: '', contact_phone: '' });
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Warehouses</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">City</label>
            <input name="city" value={form.city} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">State</label>
            <input name="state" value={form.state} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pincode</label>
            <input name="pincode" value={form.pincode} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Address</label>
            <input name="address" value={form.address} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Person</label>
            <input name="contact_person" value={form.contact_person} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Phone</label>
            <input name="contact_phone" value={form.contact_phone} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            {editingId ? 'Update' : 'Add Warehouse'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : warehouses.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No warehouses yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{w.city || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {w.contact_person && <div>{w.contact_person}</div>}
                    {w.contact_phone && <div className="text-xs">{w.contact_phone}</div>}
                    {!w.contact_person && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${w.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleEdit(w)} className="text-xs text-blue-600 hover:text-blue-700 mr-2">Edit</button>
                    <button onClick={() => handleDelete(w.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
