import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CustomerQuery } from '../api/queries';
import queriesApi, { QUERY_STATUSES, QUERY_PRIORITIES, QUERY_LOST_REASONS, priorityColors, statusColors } from '../api/queries';
import crmApi from '../api/crm';

export default function CustomerQueries() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState<CustomerQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showLostForm, setShowLostForm] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    customer: '', client_name: '', client_phone: '', client_email: '',
    subject: '', description: '', equipment_type: '', site_location: '',
    duration: '' as string, duration_unit: 'days', quantity: '1',
    priority: 'medium', assigned_to: '',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page_size: 100 };
    if (filter !== 'all') params.status = filter;
    queriesApi.list(params).then((data) => {
      setQueries(data.results ?? data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    if (showForm) {
      crmApi.customers.list({ page_size: 100 }).then((data) => {
        setCustomers(data.results ?? data ?? []);
      });
    }
  }, [showForm]);

  const handleCreate = async () => {
    if (!form.subject) return;
    if (!form.customer && !form.client_name) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...form };
      if (payload.duration) payload.duration = Number(payload.duration);
      else payload.duration = null;
      payload.quantity = Number(payload.quantity);
      if (!payload.customer) delete payload.customer;
      await queriesApi.create(payload);
      setShowForm(false);
      setForm({ customer: '', client_name: '', client_phone: '', client_email: '',
        subject: '', description: '', equipment_type: '', site_location: '',
        duration: '', duration_unit: 'days', quantity: '1',
        priority: 'medium', assigned_to: '' });
      load();
    } catch { alert('Failed to create query'); }
    finally { setSaving(false); }
  };

  const handleConvert = async (id: string) => {
    try {
      const res = await queriesApi.convertToQuotation(id);
      navigate(`/quotations/${res.quotation_id}/edit`);
    } catch { alert('Failed to convert'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await queriesApi.update(id, { status }); load(); }
    catch { alert('Failed to update status'); }
  };

  const handleMarkLost = async (id: string) => {
    if (!lostReason) return;
    try {
      await queriesApi.markLost(id, { lost_reason: lostReason, lost_notes: lostNotes });
      setShowLostForm(null);
      setLostReason('');
      setLostNotes('');
      load();
    } catch { alert('Failed to mark as lost'); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Queries</h1>
        <button onClick={() => setShowForm(true)}
          className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ New Query</button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'open', 'in_progress', 'converted', 'lost', 'closed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : QUERY_STATUSES.find((s) => s.value === f)?.label || f}
          </button>
        ))}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New Customer Query</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Customer (optional)</label>
                  <select value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                    <option value="">Select existing customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Or Client Name *</label>
                  <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Walk-in client name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Phone</label>
                  <input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Phone" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Email</label>
                  <input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Email" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject *</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Brief subject" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Query details" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Equipment Type</label>
                  <input value={form.equipment_type} onChange={(e) => setForm({ ...form, equipment_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="e.g. JCB, Excavator" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Site Location</label>
                  <input value={form.site_location} onChange={(e) => setForm({ ...form, site_location: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Site address" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                  <input type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duration Unit</label>
                  <select value={form.duration_unit} onChange={(e) => setForm({ ...form, duration_unit: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                  <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  {QUERY_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.subject || (!form.customer && !form.client_name)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Query'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Lost Modal */}
      {showLostForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowLostForm(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Mark Query as Lost</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lost Reason *</label>
                <select value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">Select reason</option>
                  {QUERY_LOST_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea value={lostNotes} onChange={(e) => setLostNotes(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Additional details..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowLostForm(null)}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleMarkLost(showLostForm)} disabled={!lostReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                Mark Lost
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Equipment</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queries.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">No queries found</td></tr>
              ) : queries.map((q) => (
                <tr key={q.id} className="border-b border-gray-100 text-sm">
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{q.client_display || q.customer_name}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-[180px] truncate">{q.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{q.equipment_type || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{q.site_location || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {q.duration ? `${q.duration} ${q.duration_unit}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[q.priority] || ''}`}>
                      {QUERY_PRIORITIES.find((p) => p.value === q.priority)?.label || q.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status] || ''}`}>
                      {QUERY_STATUSES.find((s) => s.value === q.status)?.label || q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(q.status === 'open' || q.status === 'in_progress') && (
                        <button onClick={() => handleConvert(q.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium">Convert</button>
                      )}
                      {(q.status === 'open' || q.status === 'in_progress') && (
                        <button onClick={() => { setShowLostForm(q.id); setLostReason(''); setLostNotes(''); }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium">Lost</button>
                      )}
                      {q.status === 'open' && (
                        <button onClick={() => handleStatusChange(q.id, 'in_progress')}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium">Start</button>
                      )}
                      {q.status === 'in_progress' && (
                        <button onClick={() => handleStatusChange(q.id, 'closed')}
                          className="text-xs text-green-600 hover:text-green-700 font-medium">Close</button>
                      )}
                      {q.status === 'converted' && q.quotation && (
                        <Link to={`/quotations/${q.quotation}`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium">View Qtn</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}