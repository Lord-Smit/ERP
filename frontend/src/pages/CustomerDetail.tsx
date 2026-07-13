import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Customer, CustomerSite, Contract, SiteEquipmentDeployment, CustomerActivity, CustomerFeedback, PaymentReminder } from '../api/crm';
import api, { CUSTOMER_TYPES, CONTRACT_TYPES, CONTRACT_STATUSES, ACTIVITY_TYPES, FEEDBACK_CATEGORIES, REMINDER_TYPES, DEPLOYMENT_STATUSES } from '../api/crm';
import type { EquipmentListItem } from '../api/equipment';
import eqApi from '../api/equipment';
import invoicesApi from '../api/invoices';
import type { InvoiceListItem } from '../api/invoices';
import { useToast } from '../context/ToastContext';

type Tab = 'overview' | 'sites' | 'contracts' | 'equipment' | 'activity' | 'feedback' | 'payments';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canManage = user && ['super_admin', 'operations_manager'].includes(user.role);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sites, setSites] = useState<CustomerSite[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [deployments, setDeployments] = useState<SiteEquipmentDeployment[]>([]);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  const loadAll = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.customers.get(id),
      api.customers.sites.list(id),
      api.customers.contracts.list(id),
      api.deployments.list({}),
      api.customers.activity.list(id),
      api.customers.feedback.list(id),
      api.customers.reminders.list(id),
      eqApi.equipment.list({ page_size: 200 }),
    ]).then(([cust, sitesRes, contractsRes, deplRes, actRes, fbRes, remRes, eqRes]) => {
      setCustomer(cust);
      setSites(sitesRes);
      setContracts(contractsRes);
      setDeployments(deplRes.results.filter((d: SiteEquipmentDeployment) => sitesRes.some((s) => s.id === d.site)));
      setActivities(actRes);
      setFeedback(fbRes);
      setReminders(remRes);
      setEquipmentList(eqRes.results);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Delete this customer? This cannot be undone.')) return;
    try {
      await api.customers.delete(id);
      toast.success('Customer Deleted', 'The customer profile has been successfully deleted.');
      navigate('/customers');
    } catch {
      toast.error('Failed to delete customer', 'An error occurred while deleting the customer profile.');
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (!customer) return <div className="text-center py-8 text-gray-500">Not found</div>;

  const typeLabel = CUSTOMER_TYPES.find(t => t.value === customer.customer_type)?.label || customer.customer_type;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'sites', label: `Sites (${sites.length})` },
    { key: 'contracts', label: `Contracts (${contracts.length})` },
    { key: 'equipment', label: `Equipment (${deployments.filter(d => d.status === 'deployed').length})` },
    { key: 'activity', label: `Activity (${activities.length})` },
    { key: 'feedback', label: `Feedback (${feedback.length})` },
    { key: 'payments', label: `Reminders (${reminders.filter(r => !r.is_resolved).length})` },
  ];

  const tabClass = (key: Tab) =>
    `px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
      tab === key
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500';
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{customer.customer_code} &middot; {typeLabel}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canManage && (
            <>
              <Link to={`/customers/${id}/edit`}
                className="shrink-0 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</Link>
              <button onClick={handleDelete}
                className="shrink-0 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Outstanding</div>
          <div className={`text-xl font-bold ${customer.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{Number(customer.outstanding_amount).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Credit Limit</div>
          <div className="text-xl font-bold text-gray-900">
            {customer.credit_limit ? `₹${Number(customer.credit_limit).toLocaleString()}` : '—'}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Sites</div>
          <div className="text-xl font-bold text-gray-900">{sites.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Active Contracts</div>
          <div className="text-xl font-bold text-gray-900">{contracts.filter(c => c.status === 'active').length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex px-4">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tabClass(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {/* === OVERVIEW === */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500 block">Email</span><span className="font-medium">{customer.email || '—'}</span></div>
                <div><span className="text-gray-500 block">Phone</span><span className="font-medium">{customer.phone || '—'}</span></div>
                <div><span className="text-gray-500 block">Alternate Phone</span><span className="font-medium">{customer.alternate_phone || '—'}</span></div>
                <div><span className="text-gray-500 block">City</span><span className="font-medium">{customer.city || '—'}</span></div>
                <div><span className="text-gray-500 block">State</span><span className="font-medium">{customer.state || '—'}</span></div>
                <div><span className="text-gray-500 block">Pincode</span><span className="font-medium">{customer.pincode || '—'}</span></div>
                <div><span className="text-gray-500 block">GST Number</span><span className="font-medium">{customer.gst_number || '—'}</span></div>
                <div><span className="text-gray-500 block">PAN Number</span><span className="font-medium">{customer.pan_number || '—'}</span></div>
                <div><span className="text-gray-500 block">Payment Terms</span><span className="font-medium">{customer.payment_terms || '—'}</span></div>
              </div>
              {customer.billing_address && (
                <div className="text-sm">
                  <span className="text-gray-500 block">Billing Address</span>
                  <span className="font-medium whitespace-pre-wrap">{customer.billing_address}</span>
                </div>
              )}
              {customer.notes && (
                <div className="text-sm">
                  <span className="text-gray-500 block">Notes</span>
                  <span className="font-medium whitespace-pre-wrap">{customer.notes}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-gray-500 block">Status</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${customer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}

          {/* === SITES === */}
          {tab === 'sites' && <SitesSection customerId={id!} sites={sites} onUpdate={loadAll} inputClass={inputClass} labelClass={labelClass} />}

          {/* === CONTRACTS === */}
          {tab === 'contracts' && <ContractsSection customerId={id!} contracts={contracts} onUpdate={loadAll} inputClass={inputClass} labelClass={labelClass} />}

          {/* === EQUIPMENT === */}
          {tab === 'equipment' && <EquipmentSection customerId={id!} sites={sites} deployments={deployments} equipmentList={equipmentList} onUpdate={loadAll} inputClass={inputClass} labelClass={labelClass} />}

          {/* === ACTIVITY === */}
          {tab === 'activity' && <ActivitySection customerId={id!} activities={activities} onUpdate={loadAll} inputClass={inputClass} labelClass={labelClass} />}

          {/* === FEEDBACK === */}
          {tab === 'feedback' && <FeedbackSection customerId={id!} feedback={feedback} onUpdate={loadAll} inputClass={inputClass} labelClass={labelClass} />}

          {/* === PAYMENTS === */}
          {tab === 'payments' && <PaymentsSection customerId={id!} reminders={reminders} onUpdate={loadAll} inputClass={inputClass} labelClass={labelClass} />}
        </div>
      </div>
    </div>
  );
}

/* ====== SITES TAB ====== */
function SitesSection({ customerId, sites, onUpdate, inputClass, labelClass }: {
  customerId: string; sites: CustomerSite[]; onUpdate: () => void; inputClass: string; labelClass: string;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ name: '', address: '', city: '', state: '', pincode: '', contact_person: '', contact_phone: '', contact_email: '' });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setForm({ name: '', address: '', city: '', state: '', pincode: '', contact_person: '', contact_phone: '', contact_email: '' });
    setEditId(null); setAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editId) {
        await api.customers.sites.update(customerId, editId, form);
        toast.success('Site Updated', `Customer site "${form.name}" has been updated successfully.`);
      } else {
        await api.customers.sites.create(customerId, form);
        toast.success('Site Created', `New customer site "${form.name}" has been created successfully.`);
      }
      resetForm(); onUpdate();
    } catch {
      toast.error('Failed to save site', 'An error occurred while saving the customer site details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (s: CustomerSite) => {
    setForm({ name: s.name, address: s.address, city: s.city, state: s.state, pincode: s.pincode, contact_person: s.contact_person, contact_phone: s.contact_phone, contact_email: s.contact_email });
    setEditId(s.id); setAdding(true);
  };

  const handleDelete = async (siteId: string) => {
    if (!confirm('Delete this site?')) return;
    try {
      await api.customers.sites.delete(customerId, siteId);
      toast.success('Site Deleted', 'Customer site has been successfully deleted.');
      onUpdate();
    } catch {
      toast.error('Failed to delete site', 'An error occurred while deleting the customer site.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Sites</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Site</button>}
      </div>
      {adding && (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg mb-3">
          <div>
            <label className={labelClass}>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contact Person</label>
            <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contact Phone</label>
            <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
          </div>
          <div className="col-span-2 flex gap-2 items-end">
            <button type="submit" disabled={submitting}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '...' : editId ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-lg text-xs text-gray-600">Cancel</button>
          </div>
        </form>
      )}
      {sites.length === 0 ? <p className="text-sm text-gray-400">No sites added yet</p>
      : <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Address</th><th className="pb-2 font-medium">Contact</th><th className="pb-2 font-medium"></th>
          </tr></thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="py-2 font-medium text-gray-900">{s.name}</td>
                <td className="py-2 text-gray-600">{s.city || s.address || '—'}</td>
                <td className="py-2 text-gray-600">{s.contact_person || s.contact_phone || '—'}</td>
                <td className="py-2">
                  <button onClick={() => handleEdit(s)} className="text-xs text-blue-600 hover:text-blue-700 mr-2">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}

/* ====== CONTRACTS TAB ====== */
function ContractsSection({ customerId, contracts, onUpdate, inputClass, labelClass }: {
  customerId: string; contracts: Contract[]; onUpdate: () => void; inputClass: string; labelClass: string;
}) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const initialState = {
    contract_number: '', contract_type: 'rental', start_date: '', end_date: '',
    value: '', status: 'active', payment_terms: '', notes: '',
    mobilization_charges: '', demobilization_charges: '',
    security_deposit: '', insurance_amount: '', insurance_policy_number: '',
    auto_renew: false, renewal_reminder_days: '30',
  };
  const [form, setForm] = useState<Record<string, any>>(initialState);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => { setForm({ ...initialState }); setEditId(null); setAdding(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contract_number.trim() || !form.start_date) return;
    setSubmitting(true);
    try {
      const payload: Record<string, any> = { ...form };
      payload.value = payload.value ? Number(payload.value) : null;
      payload.mobilization_charges = payload.mobilization_charges ? Number(payload.mobilization_charges) : null;
      payload.demobilization_charges = payload.demobilization_charges ? Number(payload.demobilization_charges) : null;
      payload.security_deposit = payload.security_deposit ? Number(payload.security_deposit) : null;
      payload.insurance_amount = payload.insurance_amount ? Number(payload.insurance_amount) : null;
      payload.renewal_reminder_days = Number(payload.renewal_reminder_days) || 30;
      payload.end_date = payload.end_date || null;
      if (editId) await api.customers.contracts.update(customerId, editId, payload);
      else await api.customers.contracts.create(customerId, payload);
      resetForm(); onUpdate();
    } catch { alert('Failed to save contract'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (c: Contract) => {
    setForm({
      contract_number: c.contract_number, contract_type: c.contract_type,
      start_date: c.start_date, end_date: c.end_date || '',
      value: c.value?.toString() || '', status: c.status,
      payment_terms: c.payment_terms, notes: c.notes,
      mobilization_charges: (c as any).mobilization_charges?.toString() || '',
      demobilization_charges: (c as any).demobilization_charges?.toString() || '',
      security_deposit: (c as any).security_deposit?.toString() || '',
      insurance_amount: (c as any).insurance_amount?.toString() || '',
      insurance_policy_number: (c as any).insurance_policy_number || '',
      auto_renew: (c as any).auto_renew || false,
      renewal_reminder_days: ((c as any).renewal_reminder_days || 30).toString(),
    });
    setEditId(c.id); setAdding(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Contracts</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Contract</button>}
      </div>
      {adding && (
        <form onSubmit={handleSubmit} className="p-3 bg-gray-50 rounded-lg mb-3 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className={labelClass}>Contract No *</label>
              <input name="contract_number" value={form.contract_number} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select name="contract_type" value={form.contract_type} onChange={handleChange} className={inputClass}>
                {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className={labelClass}>Value (₹)</label>
              <input name="value" type="number" step="0.01" value={form.value} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                {CONTRACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Payment Terms</label>
              <input name="payment_terms" value={form.payment_terms} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">Financial details</summary>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              <div>
                <label className={labelClass}>Mobilization</label>
                <input name="mobilization_charges" type="number" step="0.01" value={form.mobilization_charges} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Demobilization</label>
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
              <div>
                <label className={labelClass}>Policy No.</label>
                <input name="insurance_policy_number" value={form.insurance_policy_number} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Reminder (days)</label>
                <input name="renewal_reminder_days" type="number" min="1" value={form.renewal_reminder_days} onChange={handleChange} className={inputClass} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input name="auto_renew" type="checkbox" checked={form.auto_renew} onChange={handleChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                  <span className="text-xs text-gray-600">Auto-renew</span>
                </label>
              </div>
            </div>
          </details>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '...' : editId ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-lg text-xs text-gray-600">Cancel</button>
          </div>
        </form>
      )}
      {contracts.length === 0 ? <p className="text-sm text-gray-400">No contracts yet</p>
      : <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Contract #</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Dates</th><th className="pb-2 font-medium text-right">Value</th><th className="pb-2 font-medium">Deposit</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium"></th>
          </tr></thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-2 font-mono text-sm text-gray-900">{c.contract_number}</td>
                <td className="py-2 text-gray-600">{CONTRACT_TYPES.find(t => t.value === c.contract_type)?.label || c.contract_type}</td>
                <td className="py-2 text-gray-600">{c.start_date}{c.end_date ? ` → ${c.end_date}` : ''}</td>
                <td className="py-2 text-right text-gray-900">{c.value ? `₹${Number(c.value).toLocaleString()}` : '—'}</td>
                <td className="py-2 text-right text-gray-900">{(c as any).security_deposit ? `₹${Number((c as any).security_deposit).toLocaleString()}` : '—'}</td>
                <td className="py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === 'active' ? 'bg-green-100 text-green-800' :
                    c.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    c.status === 'terminated' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>{CONTRACT_STATUSES.find(s => s.value === c.status)?.label || c.status}
                  {(c as any).signed_by_client && <span className="ml-1">✓</span>}
                  </span>
                </td>
                <td className="py-2">
                  <button onClick={() => handleEdit(c)} className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}

/* ====== EQUIPMENT TAB ====== */
function EquipmentSection({ customerId, sites, deployments, equipmentList, onUpdate, inputClass, labelClass }: {
  customerId: string; sites: CustomerSite[]; deployments: SiteEquipmentDeployment[]; equipmentList: EquipmentListItem[]; onUpdate: () => void; inputClass: string; labelClass: string;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ site: '', equipment: '', start_date: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.site || !form.equipment || !form.start_date) return;
    setSubmitting(true);
    try {
      await api.deployments.create(form);
      setForm({ site: '', equipment: '', start_date: '', notes: '' });
      setAdding(false); onUpdate();
    } catch { alert('Failed to deploy equipment'); }
    finally { setSubmitting(false); }
  };

  const deployedSites = sites.filter(s => s.is_active);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Site Equipment</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Deploy Equipment</button>}
      </div>
      {adding && (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg mb-3">
          <div>
            <label className={labelClass}>Site *</label>
            <select value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} required className={inputClass}>
              <option value="">Select site</option>
              {deployedSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Equipment *</label>
            <select value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} required className={inputClass}>
              <option value="">Select equipment</option>
              {equipmentList.filter(e => e.status === 'available' || e.status === 'rented').map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.serial_number || e.id.slice(0, 8)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Start Date *</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className={inputClass} />
          </div>
          <div className="flex gap-2 items-end">
            <button type="submit" disabled={submitting}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '...' : 'Deploy'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 border rounded-lg text-xs text-gray-600">Cancel</button>
          </div>
        </form>
      )}
      {deployments.length === 0 ? <p className="text-sm text-gray-400">No equipment deployed yet</p>
      : <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Equipment</th><th className="pb-2 font-medium">Site</th><th className="pb-2 font-medium">Start</th><th className="pb-2 font-medium">End</th><th className="pb-2 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {deployments.map((d) => (
              <tr key={d.id} className="border-b border-gray-50">
                <td className="py-2 text-gray-900">{d.equipment_name}</td>
                <td className="py-2 text-gray-600">{d.site_name}</td>
                <td className="py-2 text-gray-600">{d.start_date}</td>
                <td className="py-2 text-gray-600">{d.end_date || '—'}</td>
                <td className="py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${d.status === 'deployed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {DEPLOYMENT_STATUSES.find(s => s.value === d.status)?.label || d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}

/* ====== ACTIVITY TAB ====== */
function ActivitySection({ customerId, activities, onUpdate, inputClass, labelClass }: {
  customerId: string; activities: CustomerActivity[]; onUpdate: () => void; inputClass: string; labelClass: string;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ activity_type: 'call', subject: '', description: '', conducted_at: new Date().toISOString().slice(0, 16), follow_up_date: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.conducted_at) return;
    setSubmitting(true);
    try {
      await api.customers.activity.create(customerId, { ...form, follow_up_date: form.follow_up_date || null });
      setForm({ activity_type: 'call', subject: '', description: '', conducted_at: new Date().toISOString().slice(0, 16), follow_up_date: '' });
      setAdding(false); onUpdate();
    } catch { alert('Failed to log activity'); }
    finally { setSubmitting(false); }
  };

  const activityIcons: Record<string, string> = { call: '📞', visit: '🏗️', email: '📧', meeting: '🤝', note: '📝' };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Activity Log</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Log Activity</button>}
      </div>
      {adding && (
        <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-gray-50 rounded-lg mb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className={labelClass}>Type</label>
              <select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} className={inputClass}>
                {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subject *</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date & Time *</label>
              <input type="datetime-local" value={form.conducted_at} onChange={(e) => setForm({ ...form, conducted_at: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Follow-up Date</label>
              <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '...' : 'Log Activity'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 border rounded-lg text-xs text-gray-600">Cancel</button>
          </div>
        </form>
      )}
      {activities.length === 0 ? <p className="text-sm text-gray-400">No activities logged yet</p>
      : <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg">{activityIcons[a.activity_type] || '📌'}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">{ACTIVITY_TYPES.find(t => t.value === a.activity_type)?.label || a.activity_type}</span>
                  <span className="text-xs text-gray-400">{new Date(a.conducted_at).toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{a.subject}</p>
                {a.description && <p className="text-xs text-gray-600 mt-1">{a.description}</p>}
                {a.follow_up_date && (
                  <span className="inline-flex items-center text-xs text-orange-600 mt-1">
                    Follow-up: {a.follow_up_date}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

/* ====== FEEDBACK TAB ====== */
function FeedbackSection({ customerId, feedback, onUpdate, inputClass, labelClass }: {
  customerId: string; feedback: CustomerFeedback[]; onUpdate: () => void; inputClass: string; labelClass: string;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ rating: '5', category: 'general', feedback_text: '', received_date: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.customers.feedback.create(customerId, { ...form, rating: Number(form.rating) });
      setForm({ rating: '5', category: 'general', feedback_text: '', received_date: new Date().toISOString().slice(0, 10) });
      setAdding(false); onUpdate();
    } catch { alert('Failed to save feedback'); }
    finally { setSubmitting(false); }
  };

  const stars = (r: number) => '★'.repeat(r) + '☆'.repeat(5 - r);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Feedback</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Feedback</button>}
      </div>
      {adding && (
        <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-gray-50 rounded-lg mb-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Rating *</label>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={inputClass}>
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{'★'.repeat(r) + '☆'.repeat(5 - r)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {FEEDBACK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date *</label>
              <input type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Feedback</label>
            <textarea value={form.feedback_text} onChange={(e) => setForm({ ...form, feedback_text: e.target.value })} rows={2} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '...' : 'Save Feedback'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 border rounded-lg text-xs text-gray-600">Cancel</button>
          </div>
        </form>
      )}
      {feedback.length === 0 ? <p className="text-sm text-gray-400">No feedback recorded yet</p>
      : <div className="space-y-2">
          {feedback.map((f) => (
            <div key={f.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-lg text-yellow-500">{stars(f.rating)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">{FEEDBACK_CATEGORIES.find(c => c.value === f.category)?.label || f.category}</span>
                  <span>{f.received_date}</span>
                  {f.is_resolved && <span className="text-green-600">Resolved</span>}
                </div>
                {f.feedback_text && <p className="text-sm text-gray-700 mt-1">{f.feedback_text}</p>}
                {f.resolution_notes && <p className="text-xs text-gray-500 mt-1">Resolution: {f.resolution_notes}</p>}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

/* ====== PAYMENTS TAB ====== */
function PaymentsSection({ customerId, reminders, onUpdate, inputClass, labelClass }: {
  customerId: string; reminders: PaymentReminder[]; onUpdate: () => void; inputClass: string; labelClass: string;
}) {
  const [adding, setAdding] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({ invoice_number: '', amount: '', due_date: '', reminder_type: 'email', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (adding) {
      invoicesApi.list({ customer: customerId, page_size: 100 }).then((data) => {
        setInvoices(data.results ?? []);
      }).catch(() => {});
    }
  }, [adding, customerId]);

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    if (!invoiceId) {
      setForm({ ...form, invoice_number: '', amount: '', due_date: '' });
      return;
    }
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      setForm({
        ...form,
        invoice_number: inv.invoice_number,
        amount: inv.total_amount,
        due_date: inv.due_date,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, amount: form.amount ? Number(form.amount) : null };
      await api.customers.reminders.create(customerId, payload);
      setForm({ invoice_number: '', amount: '', due_date: '', reminder_type: 'email', notes: '' });
      setSelectedInvoiceId(''); setAdding(false); onUpdate();
    } catch { alert('Failed to create reminder'); }
    finally { setSubmitting(false); }
  };

  const resolveReminder = async (reminderId: string) => {
    try { await api.customers.reminders.update(customerId, reminderId, { is_resolved: true }); onUpdate(); }
    catch { alert('Failed to resolve'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Payment Reminders</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Reminder</button>}
      </div>
      {adding && (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg mb-3">
          <div>
            <label className={labelClass}>Invoice</label>
            <select value={selectedInvoiceId} onChange={(e) => handleInvoiceSelect(e.target.value)} className={inputClass}>
              <option value="">Select Invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} (₹{Number(inv.total_amount).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Amount (₹)</label>
            <input type="number" step="0.01" value={form.amount} onChange={(e) => { setSelectedInvoiceId(''); setForm({ ...form, amount: e.target.value }); }} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => { setSelectedInvoiceId(''); setForm({ ...form, due_date: e.target.value }); }} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={form.reminder_type} onChange={(e) => setForm({ ...form, reminder_type: e.target.value })} className={inputClass}>
              {REMINDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" disabled={submitting}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '...' : 'Add Reminder'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 border rounded-lg text-xs text-gray-600">Cancel</button>
          </div>
        </form>
      )}
      {reminders.length === 0 ? <p className="text-sm text-gray-400">No payment reminders yet</p>
      : <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Invoice</th><th className="pb-2 font-medium text-right">Amount</th><th className="pb-2 font-medium">Due Date</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium"></th>
          </tr></thead>
          <tbody>
            {reminders.map((r) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-2 font-mono text-sm text-gray-900">{r.invoice_number || '—'}</td>
                <td className="py-2 text-right text-gray-900">{r.amount ? `₹${Number(r.amount).toLocaleString()}` : '—'}</td>
                <td className="py-2 text-gray-600">{r.due_date || '—'}</td>
                <td className="py-2 text-gray-600">{REMINDER_TYPES.find(t => t.value === r.reminder_type)?.label || r.reminder_type}</td>
                <td className="py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.is_resolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {r.is_resolved ? 'Resolved' : 'Pending'}
                  </span>
                </td>
                <td className="py-2">
                  {!r.is_resolved && (
                    <button onClick={() => resolveReminder(r.id)} className="text-xs text-green-600 hover:text-green-700">Resolve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}
