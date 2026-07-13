import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { EquipmentCategory, Warehouse } from '../api/equipment';
import api from '../api/equipment';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../context/ToastContext';

export default function EquipmentForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canEdit = user && ['super_admin', 'operations_manager', 'field_supervisor', 'operator'].includes(user.role);

  useEffect(() => {
    if (user && !canEdit) {
      toast.error('Access Denied', 'You do not have permission to add or edit equipment.');
      navigate('/equipment');
    }
  }, [user]);

  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', brand: '', model: '', serial_number: '',
    category: '', warehouse: '', status: 'available',
    purchase_price: '', rental_price_hourly: '', rental_price_daily: '',
    rental_price_weekly: '', rental_price_monthly: '', deposit_amount: '',
    location_details: '', notes: '',
  });

  useEffect(() => {
    Promise.all([
      api.categories.list(),
      api.warehouses.list(),
    ]).then(([cats, whs]) => {
      setCategories(cats);
      setWarehouses(whs.filter((w) => w.is_active));
    });
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.equipment.get(id).then((eq) => {
        setForm({
          name: eq.name, brand: eq.brand, model: eq.model,
          serial_number: eq.serial_number || '',
          category: eq.category || '', warehouse: eq.warehouse || '',
          status: eq.status,
          purchase_price: eq.purchase_price?.toString() || '',
          rental_price_hourly: eq.rental_price_hourly?.toString() || '',
          rental_price_daily: eq.rental_price_daily?.toString() || '',
          rental_price_weekly: eq.rental_price_weekly?.toString() || '',
          rental_price_monthly: eq.rental_price_monthly?.toString() || '',
          deposit_amount: eq.deposit_amount?.toString() || '',
          location_details: eq.location_details || '',
          notes: eq.notes || '',
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        ...form,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        rental_price_hourly: form.rental_price_hourly ? Number(form.rental_price_hourly) : null,
        rental_price_daily: form.rental_price_daily ? Number(form.rental_price_daily) : null,
        rental_price_weekly: form.rental_price_weekly ? Number(form.rental_price_weekly) : null,
        rental_price_monthly: form.rental_price_monthly ? Number(form.rental_price_monthly) : null,
        deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null,
        category: form.category || null,
        warehouse: form.warehouse || null,
      };
      if (isEdit) {
        await api.equipment.update(id!, payload);
        toast.success('Equipment Updated', `Equipment "${payload.name}" has been updated successfully.`);
      } else {
        await api.equipment.create(payload);
        toast.success('Equipment Created', `Equipment "${payload.name}" has been added to the catalog.`);
      }
      navigate('/equipment');
    } catch {
      toast.error('Failed to save equipment', 'An error occurred while saving the equipment details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Equipment' : 'Add Equipment'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input name="brand" value={form.brand} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input name="model" value={form.model} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
            <input name="serial_number" value={form.serial_number} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="category" value={form.category} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
            <select name="warehouse" value={form.warehouse} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} — {w.city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="in_transit">In Transit</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Details</label>
            <input name="location_details" value={form.location_details} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Purchase Price (₹)</label>
              <input name="purchase_price" type="number" value={form.purchase_price} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hourly (₹)</label>
              <input name="rental_price_hourly" type="number" value={form.rental_price_hourly} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Daily (₹)</label>
              <input name="rental_price_daily" type="number" value={form.rental_price_daily} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Weekly (₹)</label>
              <input name="rental_price_weekly" type="number" value={form.rental_price_weekly} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monthly (₹)</label>
              <input name="rental_price_monthly" type="number" value={form.rental_price_monthly} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Deposit (₹)</label>
              <input name="deposit_amount" type="number" value={form.deposit_amount} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t">
          <button type="button" onClick={() => navigate('/equipment')}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Saving...' : isEdit ? 'Update Equipment' : 'Create Equipment'}
          </button>
        </div>
      </form>
    </div>
  );
}
