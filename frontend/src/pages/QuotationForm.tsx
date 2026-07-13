import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CustomerListItem } from '../api/crm';
import type { EquipmentListItem } from '../api/equipment';
import type { QuotationLineItem } from '../api/quotations';
import crmApi from '../api/crm';
import eqApi from '../api/equipment';
import api, { RENTAL_PERIODS } from '../api/quotations';

export default function QuotationForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentListItem[]>([]);

  const [form, setForm] = useState<Record<string, any>>({
    quotation_number: '', customer: '', contact_person: '', contact_phone: '',
    contact_email: '', valid_until: '', tax_percentage: '',
    terms_conditions: '', notes: '',
  });

  const [lineItems, setLineItems] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    Promise.all([
      crmApi.customers.list({ page_size: 200 }),
      eqApi.equipment.list({ page_size: 200 }),
    ]).then(([cRes, eRes]) => {
      setCustomers(cRes.results);
      setEquipmentList(eRes.results);
    });
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.quotations.get(id).then((q) => {
        setForm({
          quotation_number: q.quotation_number, customer: q.customer,
          contact_person: q.contact_person, contact_phone: q.contact_phone,
          contact_email: q.contact_email, valid_until: q.valid_until || '',
          tax_percentage: q.tax_percentage ? q.tax_percentage.toString() : '',
          terms_conditions: q.terms_conditions, notes: q.notes,
        });
        setLineItems(q.line_items.map((li: QuotationLineItem) => ({
          equipment: li.equipment || '',
          description: li.description,
          quantity: li.quantity,
          rental_period: li.rental_period,
          start_date: li.start_date || '',
          end_date: li.end_date || '',
          unit_price: li.unit_price,
        })));
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addLineItem = () => {
    const today = new Date().toISOString().split('T')[0];
    setLineItems([...lineItems, {
      equipment: '', description: '', quantity: 1, rental_period: 'daily',
      start_date: today, end_date: today, unit_price: 0,
    }]);
  };

  const updateLineItem = (idx: number, field: string, value: any) => {
    const items = [...lineItems];
    items[idx] = { ...items[idx], [field]: value };

    // Auto-fill unit_price when equipment or period changes
    if (field === 'equipment' || field === 'rental_period') {
      const equipId = field === 'equipment' ? value : items[idx].equipment;
      const period = field === 'rental_period' ? value : items[idx].rental_period;
      const equip = equipmentList.find((e) => e.id === equipId);
      if (equip) {
        const priceMap: Record<string, string> = {
          hourly: 'rental_price_hourly', daily: 'rental_price_daily',
          weekly: 'rental_price_weekly', monthly: 'rental_price_monthly',
        };
        const priceField = priceMap[period || 'daily'];
        if (priceField) {
          const price = (equip as any)[priceField];
          if (price) items[idx].unit_price = price;
        }
      }
    }

    setLineItems(items);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const computeDuration = (startDate: string, endDate: string, rentalPeriod: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    switch (rentalPeriod) {
      case 'daily': return days;
      case 'weekly': return Math.max(1, days / 7);
      case 'monthly': return Math.max(1, days / 30);
      case 'hourly': return days * 8;
      default: return days;
    }
  };

  const calcLineTotal = (item: Record<string, any>) => {
    const qty = Number(item.quantity) || 0;
    const dur = computeDuration(item.start_date, item.end_date, item.rental_period);
    const price = Number(item.unit_price) || 0;
    return qty * dur * price;
  };

  const calcSubtotal = () => lineItems.reduce((sum, item) => sum + calcLineTotal(item), 0);
  const calcTax = () => calcSubtotal() * (Number(form.tax_percentage) || 0) / 100;
  const calcTotal = () => calcSubtotal() + calcTax();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.quotation_number || !form.customer) return;
    if (lineItems.length === 0) { alert('Add at least one line item'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(form).forEach(([k, v]) => {
        payload[k] = v === '' ? null : v;
      });
      // These fields have blank=True but not null=True — send '' instead of null
      for (const field of ['contact_person', 'contact_phone', 'contact_email', 'terms_conditions', 'notes']) {
        if (payload[field] === null) payload[field] = '';
      }
      payload.tax_percentage = Number(payload.tax_percentage) || 0;
      payload.line_items = lineItems.map((item) => ({
        ...item,
        unit_price: Number(item.unit_price) || 0,
        quantity: Number(item.quantity) || 1,
      }));
      if (isEdit) await api.quotations.update(id!, payload);
      else await api.quotations.create(payload);
      navigate('/quotations');
    } catch { alert('Failed to save quotation'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500';
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Quotation' : 'New Quotation'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Quotation Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Quotation Number *</label>
              <input name="quotation_number" value={form.quotation_number} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Customer *</label>
              <select name="customer" value={form.customer} onChange={handleChange} required className={inputClass}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Valid Until</label>
              <input name="valid_until" type="date" value={form.valid_until} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Contact Person</label>
              <input name="contact_person" value={form.contact_person} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Phone</label>
              <input name="contact_phone" value={form.contact_phone} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Email</label>
              <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
            <button type="button" onClick={addLineItem}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No line items. Click "Add Item" to add equipment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Equipment</th>
                    <th className="pb-2 font-medium w-32">Period</th>
                    <th className="pb-2 font-medium text-right w-20">Qty</th>
                    <th className="pb-2 font-medium w-28">Start Date</th>
                    <th className="pb-2 font-medium w-28">End Date</th>
                    <th className="pb-2 font-medium text-right w-28 pr-4">Unit Price</th>
                    <th className="pb-2 font-medium text-right w-28">Total</th>
                    <th className="pb-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-1.5 pr-2">
                        <select value={item.equipment} onChange={(e) => updateLineItem(idx, 'equipment', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                          <option value="">Select equipment</option>
                          {equipmentList.map((e) => (
                            <option key={e.id} value={e.id}>{e.name} ({e.serial_number || e.id.slice(0, 8)})</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <select value={item.rental_period} onChange={(e) => updateLineItem(idx, 'rental_period', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                          {RENTAL_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-right outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input type="date" value={item.start_date} onChange={(e) => updateLineItem(idx, 'start_date', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input type="date" value={item.end_date} onChange={(e) => updateLineItem(idx, 'end_date', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 pr-4">
                        <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-right outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 text-right text-gray-900 font-medium pr-2">
                        ₹{calcLineTotal(item).toLocaleString()}
                      </td>
                      <td className="py-1.5 text-center">
                        <button type="button" onClick={() => removeLineItem(idx)}
                          className="text-red-500 text-xs hover:text-red-700">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Totals</h2>
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{calcSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Tax (%)</span>
                <input name="tax_percentage" type="number" step="0.01" value={form.tax_percentage} placeholder="0"
                  onChange={handleChange} className="w-20 rounded border border-gray-300 px-2 py-1 text-xs text-right outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax Amount</span>
                <span>₹{calcTax().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-900 font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>₹{calcTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Terms & Notes</h2>
          <div>
            <label className={labelClass}>Terms & Conditions</label>
            <textarea name="terms_conditions" value={form.terms_conditions} onChange={handleChange} rows={3} className={inputClass} placeholder="Payment terms, delivery terms, etc." />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputClass} />
          </div>
        </section>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/quotations')}
            className="px-4 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Saving...' : isEdit ? 'Update Quotation' : 'Save Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
