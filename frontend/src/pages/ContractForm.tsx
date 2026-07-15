import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CustomerListItem } from '../api/crm';
import type { EquipmentListItem } from '../api/equipment';
import api, { CONTRACT_TYPES, CONTRACT_STATUSES, RENTAL_PERIODS } from '../api/crm';
import crmApi from '../api/crm';
import eqApi from '../api/equipment';

export default function ContractForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentListItem[]>([]);
  const [customerSites, setCustomerSites] = useState<Record<string, any[]>>({});

  const [form, setForm] = useState<Record<string, any>>({
    contract_number: '', customer: '', contract_type: 'rental',
    start_date: '', end_date: '', value: '', status: 'draft',
    payment_terms: '', notes: '',
    mobilization_charges: '', demobilization_charges: '',
    security_deposit: '', insurance_amount: '', insurance_policy_number: '',
    auto_renew: false, renewal_reminder_days: '30',
    diesel_cost_covered_by: 'customer',
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
      api.contracts.get(id).then((c) => {
        setForm({
          contract_number: c.contract_number,
          customer: c.customer,
          contract_type: c.contract_type,
          start_date: c.start_date,
          end_date: c.end_date || '',
          value: c.value?.toString() || '',
          status: c.status,
          payment_terms: c.payment_terms,
          notes: c.notes,
          mobilization_charges: c.mobilization_charges?.toString() || '',
          demobilization_charges: c.demobilization_charges?.toString() || '',
          security_deposit: c.security_deposit?.toString() || '',
          insurance_amount: c.insurance_amount?.toString() || '',
          insurance_policy_number: c.insurance_policy_number || '',
          auto_renew: c.auto_renew,
          renewal_reminder_days: c.renewal_reminder_days.toString(),
          diesel_cost_covered_by: c.diesel_cost_covered_by || 'customer',
        });
        setLineItems(c.line_items.map((li) => ({
          equipment: li.equipment || '',
          site: li.site || '',
          description: li.description,
          quantity: li.quantity,
          rental_period: li.rental_period,
          unit_price: li.unit_price,
          start_date: li.start_date,
          end_date: li.end_date || '',
        })));
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const loadSites = (customerId: string) => {
    if (customerId && !customerSites[customerId]) {
      crmApi.customers.sites.list(customerId).then((sites) => {
        setCustomerSites({ ...customerSites, [customerId]: sites });
      });
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      equipment: '', site: '', description: '', quantity: 1,
      rental_period: 'monthly', unit_price: 0,
      start_date: form.start_date || '', end_date: '',
    }]);
  };

  const updateLineItem = (idx: number, field: string, value: any) => {
    const items = [...lineItems];
    items[idx] = { ...items[idx], [field]: value };
    const equip = equipmentList.find((e) => e.id === items[idx].equipment);
    if (equip) {
      const priceMap: Record<string, string> = {
        hourly: 'rental_price_hourly', daily: 'rental_price_daily',
        weekly: 'rental_price_weekly', monthly: 'rental_price_monthly',
      };
      const period = items[idx].rental_period || 'monthly';
      if (field === 'equipment' || field === 'rental_period') {
        const priceField = priceMap[period];
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

  const calcLineTotal = (item: Record<string, any>) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return qty * price;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.contract_number || !form.customer) return;
    if (lineItems.length === 0) { alert('Add at least one line item'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(form).forEach(([k, v]) => {
        payload[k] = v === '' ? null : v;
      });
      for (const field of ['payment_terms', 'notes', 'insurance_policy_number']) {
        if (payload[field] === null) payload[field] = '';
      }
      payload.value = payload.value ? Number(payload.value) : null;
      payload.mobilization_charges = payload.mobilization_charges ? Number(payload.mobilization_charges) : null;
      payload.demobilization_charges = payload.demobilization_charges ? Number(payload.demobilization_charges) : null;
      payload.security_deposit = payload.security_deposit ? Number(payload.security_deposit) : null;
      payload.insurance_amount = payload.insurance_amount ? Number(payload.insurance_amount) : null;
      payload.renewal_reminder_days = Number(payload.renewal_reminder_days) || 30;
      payload.line_items = lineItems.map((item) => ({
        ...item,
        unit_price: Number(item.unit_price) || 0,
        quantity: Number(item.quantity) || 1,
      }));
      if (isEdit) await api.contracts.update(id!, payload);
      else await api.contracts.create(payload);
      navigate('/contracts');
    } catch { alert('Failed to save contract'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500';
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Contract' : 'New Contract'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Contract Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Contract Number *</label>
              <input name="contract_number" value={form.contract_number} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Customer *</label>
              <select name="customer" value={form.customer} onChange={(e) => { handleChange(e); loadSites(e.target.value); }} required className={inputClass}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Contract Type</label>
              <select name="contract_type" value={form.contract_type} onChange={handleChange} className={inputClass}>
                {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Start Date *</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                {CONTRACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Total Value</label>
              <input name="value" type="number" step="0.01" value={form.value} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payment Terms</label>
              <input name="payment_terms" value={form.payment_terms} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Financial Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Mobilization Charges</label>
              <input name="mobilization_charges" type="number" step="0.01" value={form.mobilization_charges} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Demobilization Charges</label>
              <input name="demobilization_charges" type="number" step="0.01" value={form.demobilization_charges} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Security Deposit</label>
              <input name="security_deposit" type="number" step="0.01" value={form.security_deposit} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Insurance Amount</label>
              <input name="insurance_amount" type="number" step="0.01" value={form.insurance_amount} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Insurance Policy No.</label>
              <input name="insurance_policy_number" value={form.insurance_policy_number} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Diesel Cost Covered By</label>
              <select name="diesel_cost_covered_by" value={form.diesel_cost_covered_by} onChange={handleChange} className={inputClass}>
                <option value="customer">Customer</option>
                <option value="us">Us</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Auto Renew</label>
              <div className="flex items-center h-[42px]">
                <input name="auto_renew" type="checkbox" checked={form.auto_renew} onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                <span className="ml-2 text-sm text-gray-600">Enable auto-renewal</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Renewal Reminder (days before)</label>
              <input name="renewal_reminder_days" type="number" min="1" value={form.renewal_reminder_days} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Equipment Line Items</h2>
            <button type="button" onClick={addLineItem}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Equipment</button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No equipment added. Click "Add Equipment" to add line items.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium w-[180px]">Equipment</th>
                    <th className="pb-2 font-medium w-[140px]">Site</th>
                    <th className="pb-2 font-medium w-[100px]">Period</th>
                    <th className="pb-2 font-medium text-right w-[60px]">Qty</th>
                    <th className="pb-2 font-medium text-right w-[110px]">Unit Price</th>
                    <th className="pb-2 font-medium text-right w-[110px]">Total</th>
                    <th className="pb-2 font-medium w-[120px]">Start</th>
                    <th className="pb-2 font-medium w-[120px]">End</th>
                    <th className="pb-2 font-medium w-[30px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-1.5 pr-1">
                        <select value={item.equipment} onChange={(e) => updateLineItem(idx, 'equipment', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                          <option value="">Select equipment</option>
                          {equipmentList.map((e) => (
                            <option key={e.id} value={e.id}>{e.name} ({e.serial_number || e.id.slice(0,8)})</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-1">
                        <select value={item.site} onChange={(e) => updateLineItem(idx, 'site', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                          <option value="">Select site</option>
                          {(customerSites[form.customer] || []).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-1">
                        <select value={item.rental_period} onChange={(e) => updateLineItem(idx, 'rental_period', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                          {RENTAL_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-1">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-right outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 pr-1">
                        <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-right outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 pr-1 text-right text-gray-900 font-medium">
                        ₹{calcLineTotal(item).toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-1">
                        <input type="date" value={item.start_date} onChange={(e) => updateLineItem(idx, 'start_date', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 pr-1">
                        <input type="date" value={item.end_date} onChange={(e) => updateLineItem(idx, 'end_date', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                      </td>
                      <td className="py-1.5 text-center">
                        <button type="button" onClick={() => removeLineItem(idx)}
                          className="text-red-500 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={inputClass} placeholder="Additional terms, conditions, or notes..." />
        </section>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/contracts')}
            className="px-4 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Saving...' : isEdit ? 'Update Contract' : 'Save Contract'}
          </button>
        </div>
      </form>
    </div>
  );
}
