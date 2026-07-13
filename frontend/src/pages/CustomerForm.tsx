import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CustomerSite } from '../api/crm';
import api, { CUSTOMER_TYPES } from '../api/crm';

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<Record<string, any>>({
    customer_code: '', name: '', customer_type: 'company',
    email: '', phone: '', alternate_phone: '',
    billing_address: '', city: '', state: '', pincode: '',
    gst_number: '', pan_number: '',
    credit_limit: '', outstanding_amount: '0',
    payment_terms: '', notes: '', is_active: true,
  });

  const [sites, setSites] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        api.customers.get(id),
        api.customers.sites.list(id),
      ]).then(([cust, siteList]) => {
        setForm({
          customer_code: cust.customer_code,
          name: cust.name,
          customer_type: cust.customer_type,
          email: cust.email,
          phone: cust.phone,
          alternate_phone: cust.alternate_phone,
          billing_address: cust.billing_address,
          city: cust.city,
          state: cust.state,
          pincode: cust.pincode,
          gst_number: cust.gst_number,
          pan_number: cust.pan_number,
          credit_limit: cust.credit_limit?.toString() || '',
          outstanding_amount: cust.outstanding_amount.toString(),
          payment_terms: cust.payment_terms,
          notes: cust.notes,
          is_active: cust.is_active,
        });
        setSites(siteList.map((s: CustomerSite) => ({
          id: s.id, name: s.name, address: s.address, city: s.city, state: s.state,
          pincode: s.pincode, contact_person: s.contact_person, contact_phone: s.contact_phone,
          contact_email: s.contact_email,
        })));
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'credit_limit') payload[k] = v === '' ? null : Number(v);
        else if (k === 'outstanding_amount') payload[k] = v === '' ? 0 : Number(v);
        else payload[k] = v;
      });
      if (isEdit) {
        await api.customers.update(id!, payload);
      } else {
        await api.customers.create(payload);
      }
      navigate('/customers');
    } catch { alert('Failed to save customer'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500';
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Customer' : 'New Customer'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Customer Code *</label>
              <input name="customer_code" value={form.customer_code} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Customer Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select name="customer_type" value={form.customer_type} onChange={handleChange} className={inputClass}>
                {CUSTOMER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Alternate Phone</label>
              <input name="alternate_phone" value={form.alternate_phone} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange}
              className="rounded border-gray-300" />
            <label className="text-sm text-gray-600">Active</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Billing Details</h2>
          <div>
            <label className={labelClass}>Billing Address</label>
            <textarea name="billing_address" value={form.billing_address} onChange={handleChange} rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>City</label>
              <input name="city" value={form.city} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input name="state" value={form.state} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input name="pincode" value={form.pincode} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>GST Number</label>
              <input name="gst_number" value={form.gst_number} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>PAN Number</label>
            <input name="pan_number" value={form.pan_number} onChange={handleChange} className={`${inputClass} max-w-xs`} />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Credit & Payments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Credit Limit (₹)</label>
              <input name="credit_limit" type="number" step="0.01" value={form.credit_limit} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Outstanding Amount (₹)</label>
              <input name="outstanding_amount" type="number" step="0.01" value={form.outstanding_amount} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payment Terms</label>
              <input name="payment_terms" value={form.payment_terms} onChange={handleChange} placeholder="e.g. Net 30" className={inputClass} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <label className={labelClass}>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputClass} />
        </section>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/customers')}
            className="px-4 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
