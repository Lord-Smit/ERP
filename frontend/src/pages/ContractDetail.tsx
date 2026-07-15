import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { ContractDetail as CDetail } from '../api/crm';
import api, { CONTRACT_TYPES, CONTRACT_STATUSES, RENTAL_PERIODS } from '../api/crm';
import { useAuthStore } from '../store/authStore';
import SignaturePad from 'react-signature-canvas';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  terminated: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
};

type Tab = 'overview' | 'line_items' | 'amendments' | 'signatures';

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [c, setC] = useState<CDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryEmail, setSignatoryEmail] = useState('');
  const sigPadRef = useRef<SignaturePad>(null);

  const canManage = user && ['super_admin', 'operations_manager'].includes(user.role);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.contracts.get(id).then(setC).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAmend = async () => {
    if (!id) return;
    const notes = prompt('Amendment notes:');
    if (notes === null) return;
    setActionLoading(true);
    try {
      await api.contracts.amend(id, { amended_data: {}, notes });
      load();
    } catch { alert('Failed to create amendment'); }
    finally { setActionLoading(false); }
  };

  const handleSign = async () => {
    if (!id || !sigPadRef.current) return;
    if (sigPadRef.current.isEmpty()) {
      alert('Please draw your signature before signing.');
      return;
    }
    const sigData = sigPadRef.current.toDataURL();
    setActionLoading(true);
    try {
      await api.contracts.sign(id, { signatory_name: signatoryName, signatory_email: signatoryEmail, signature_data: sigData });
      setShowSignModal(false);
      load();
    } catch { alert('Failed to sign contract'); }
    finally { setActionLoading(false); }
  };

  const openSignModal = () => {
    setSignatoryName(user ? `${user.first_name} ${user.last_name}`.trim() : '');
    setSignatoryEmail(user?.email || '');
    setShowSignModal(true);
  };

  const clearSignature = () => {
    sigPadRef.current?.clear();
  };

  const handleRenew = async () => {
    if (!id || !c) return;
    const newEnd = prompt('New end date (YYYY-MM-DD):', c.end_date || '');
    if (!newEnd) return;
    setActionLoading(true);
    try {
      await api.contracts.renew(id, { end_date: newEnd });
      load();
    } catch { alert('Failed to renew contract'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (!c) return <div className="text-center py-8 text-gray-500">Contract not found</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'line_items', label: `Equipment (${c.line_items.length})` },
    { key: 'amendments', label: `Amendments (${c.amendments.length})` },
    { key: 'signatures', label: `Signatures (${c.signatures.length})` },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div>
          <Link to="/contracts" className="text-sm text-blue-600 hover:text-blue-700">&larr; Back to Contracts</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{c.contract_number}</h1>
          <p className="text-sm text-gray-500">{c.customer_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => window.open(`/api/contracts/${id}/download-pdf/`)}
            className="shrink-0 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            Download PDF
          </button>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[c.status] || ''}`}>
            {CONTRACT_STATUSES.find(s => s.value === c.status)?.label || c.status}
            {c.signed_by_client && ' ✓'}
          </span>
          {canManage && c.status === 'draft' && (
            <Link to={`/contracts/${c.id}/edit`}
              className="shrink-0 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</Link>
          )}
          {canManage && c.status === 'active' && !c.signed_by_client && (
            <button onClick={openSignModal} disabled={actionLoading}
              className="shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">Sign</button>
          )}
          {canManage && c.status === 'active' && (
            <>
              <button onClick={handleAmend} disabled={actionLoading}
                className="shrink-0 px-4 py-2 border border-amber-300 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 disabled:opacity-50">Amend</button>
              <button onClick={handleRenew} disabled={actionLoading}
                className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Renew</button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500 block">Type</span><span className="font-medium">{CONTRACT_TYPES.find(t => t.value === c.contract_type)?.label || c.contract_type}</span></div>
            <div><span className="text-gray-500 block">Period</span><span className="font-medium">{c.start_date} → {c.end_date || 'Open'}</span></div>
            <div><span className="text-gray-500 block">Payment Terms</span><span className="font-medium">{c.payment_terms || '—'}</span></div>
            <div><span className="text-gray-500 block">Auto Renew</span><span className="font-medium">{c.auto_renew ? `Yes (reminder ${c.renewal_reminder_days}d before)` : 'No'}</span></div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500 block">Total Value</span><span className="font-medium">{c.value ? `₹${Number(c.value).toLocaleString()}` : '—'}</span></div>
              <div><span className="text-gray-500 block">Mobilization</span><span className="font-medium">{c.mobilization_charges ? `₹${Number(c.mobilization_charges).toLocaleString()}` : '—'}</span></div>
              <div><span className="text-gray-500 block">Demobilization</span><span className="font-medium">{c.demobilization_charges ? `₹${Number(c.demobilization_charges).toLocaleString()}` : '—'}</span></div>
              <div><span className="text-gray-500 block">Security Deposit</span><span className="font-medium">{c.security_deposit ? `₹${Number(c.security_deposit).toLocaleString()}` : '—'}</span></div>
              <div><span className="text-gray-500 block">Insurance</span><span className="font-medium">{c.insurance_amount ? `₹${Number(c.insurance_amount).toLocaleString()}` : '—'}</span></div>
              <div><span className="text-gray-500 block">Policy No.</span><span className="font-medium">{c.insurance_policy_number || '—'}</span></div>
              <div><span className="text-gray-500 block">Diesel Cost</span><span className="font-medium">{c.diesel_cost_covered_by === 'us' ? 'Covered by Us' : 'Covered by Customer'}</span></div>
              <div><span className="text-gray-500 block">Amendments</span><span className="font-medium">{c.amendment_number}</span></div>
              <div><span className="text-gray-500 block">Signed</span><span className="font-medium">{c.signed_by_client ? (c.signed_at ? new Date(c.signed_at).toLocaleDateString() : 'Yes') : 'No'}</span></div>
            </div>
          </div>

          {c.notes && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'line_items' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {c.line_items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No equipment on this contract.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Equipment</th>
                  <th className="pb-2 font-medium">Site</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Unit Price</th>
                  <th className="pb-2 font-medium text-right">Line Total</th>
                  <th className="pb-2 font-medium">Start</th>
                  <th className="pb-2 font-medium">End</th>
                </tr>
              </thead>
              <tbody>
                {c.line_items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">{item.equipment_name || item.description || '—'}</td>
                    <td className="py-2 text-gray-600">{item.site_name || '—'}</td>
                    <td className="py-2 text-gray-600">{RENTAL_PERIODS.find(p => p.value === item.rental_period)?.label || item.rental_period}</td>
                    <td className="py-2 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-900">₹{Number(item.unit_price).toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-900 font-medium">₹{Number(item.line_total).toLocaleString()}</td>
                    <td className="py-2 text-gray-600">{item.start_date}</td>
                    <td className="py-2 text-gray-600">{item.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'amendments' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {c.amendments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No amendments recorded.</p>
          ) : (
            <div className="space-y-3">
              {c.amendments.map((a) => (
                <div key={a.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">Amendment #{a.amendment_number}</span>
                    <span>{new Date(a.amended_at).toLocaleString()} by {a.amended_by_name}</span>
                  </div>
                  {a.notes && <p className="text-gray-600">{a.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'signatures' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {c.signatures.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No signatures recorded.</p>
          ) : (
            <div className="space-y-3">
              {c.signatures.map((s) => (
                <div key={s.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">{s.signatory_name}</span>
                    <span>{new Date(s.signed_at).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-600">{s.signatory_email}</p>
                  {s.signature_data?.startsWith('data:image/') && (
                    <div className="mt-2 border border-gray-200 rounded inline-block p-1">
                      <img src={s.signature_data} alt="Signature" className="h-12" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSignModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Sign Contract</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Signatory Name</label>
                <input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Signatory Email</label>
                <input value={signatoryEmail} onChange={(e) => setSignatoryEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Draw Your Signature</label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <SignaturePad ref={sigPadRef}
                    penColor="black"
                    canvasProps={{ className: 'w-full h-32', style: { width: '100%', height: 128 } }} />
                </div>
                <button onClick={clearSignature} className="mt-1 text-xs text-gray-500 hover:text-gray-700">Clear</button>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowSignModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleSign} disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {actionLoading ? 'Signing...' : 'Confirm Sign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
