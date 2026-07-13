import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { QuotationDetail as QDetail } from '../api/quotations';
import api, { QUOTATION_STATUSES, RENTAL_PERIODS } from '../api/quotations';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../context/ToastContext';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-amber-100 text-amber-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-amber-100 text-amber-800',
};

const LOST_REASONS = [
  { value: 'price_too_high', label: 'Price Too High' },
  { value: 'found_competitor', label: 'Found Better Vendor' },
  { value: 'budget_constraints', label: 'Budget Constraints' },
  { value: 'delayed_delivery', label: 'Delayed Delivery' },
  { value: 'spec_not_met', label: 'Specifications Not Met' },
  { value: 'no_longer_needed', label: 'No Longer Needed' },
  { value: 'other', label: 'Other' },
];

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [q, setQ] = useState<QDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');
  const [wonReason, setWonReason] = useState('');
  const [successModal, setSuccessModal] = useState<{
    contractId: string;
    contractNumber: string;
    rentalOrderId: string;
    rentalOrderNumber: string;
    invoiceId: string;
    invoiceNumber: string;
  } | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.quotations.get(id).then(setQ).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleSend = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.quotations.send(id);
      toast.success('Quotation sent', 'Quotation has been successfully sent to the customer.');
      load();
    }
    catch { toast.error('Failed to send quotation', 'An error occurred while trying to send the quotation.'); }
    finally { setActionLoading(false); }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.quotations.submitForReview(id);
      toast.success('Submitted for review', 'The quotation has been submitted for manager approval.');
      load();
    }
    catch { toast.error('Submission failed', 'An error occurred while submitting the quotation.'); }
    finally { setActionLoading(false); }
  };

  const handleApproveAndSend = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.quotations.approveAndSend(id);
      toast.success('Quotation approved & sent', 'Quotation has been approved and sent to the customer.');
      load();
    }
    catch { toast.error('Approval failed', 'An error occurred while approving the quotation.'); }
    finally { setActionLoading(false); }
  };

  const handleReturnToDraft = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.quotations.returnToDraft(id);
      toast.success('Returned to draft', 'Quotation status has been reset to draft.');
      load();
    }
    catch { toast.error('Operation failed', 'An error occurred while resetting the quotation.'); }
    finally { setActionLoading(false); }
  };

  const handleAccept = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.quotations.accept(id, { won_reason: wonReason });
      setSuccessModal({
        contractId: res.contract_id,
        contractNumber: res.contract_number,
        rentalOrderId: res.rental_order_id,
        rentalOrderNumber: res.rental_order_number,
        invoiceId: res.invoice_id,
        invoiceNumber: res.invoice_number,
      });
      setShowAcceptForm(false);
      load();
    } catch { toast.error('Acceptance failed', 'Failed to accept quotation and generate documents.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!id || !lostReason) return;
    setActionLoading(true);
    try {
      await api.quotations.reject(id, { lost_reason: lostReason, lost_notes: lostNotes });
      toast.success('Quotation rejected', 'Quotation status updated to rejected.');
      setShowRejectForm(false);
      setLostReason('');
      setLostNotes('');
      load();
    }
    catch { toast.error('Rejection failed', 'An error occurred while rejecting the quotation.'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (!q) return <div className="text-center py-8 text-gray-500">Quotation not found</div>;

  const canEdit = user && ['super_admin', 'operations_manager', 'finance'].includes(user.role);
  const canSendApprove = user && ['super_admin', 'operations_manager', 'finance'].includes(user.role);
  const canAcceptReject = user && ['super_admin', 'operations_manager'].includes(user.role);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link to="/quotations" className="text-gray-400 hover:text-gray-600 mr-2">&larr;</Link>
        <button onClick={() => window.open(`/api/quotations/${id}/download-pdf/`)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          Download PDF
        </button>
        {q.status === 'draft' && canEdit && (
          <>
            <Link to={`/quotations/${q.id}/edit`}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</Link>
            <button onClick={handleSubmitForReview} disabled={actionLoading}
              className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50">
              Submit for Review
            </button>
          </>
        )}
        {(q.status === 'draft' || q.status === 'under_review') && canSendApprove && (
          <button onClick={handleSend} disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {actionLoading ? '...' : 'Send to Customer'}
          </button>
        )}
        {q.status === 'under_review' && canSendApprove && (
          <>
            <button onClick={handleReturnToDraft} disabled={actionLoading}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Return to Draft</button>
            <button onClick={handleApproveAndSend} disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">Approve & Send</button>
          </>
        )}
        {q.status === 'sent' && canAcceptReject && (
          <>
            <button onClick={() => setShowRejectForm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">Reject</button>
            <button onClick={() => setShowAcceptForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Accept & Create Order</button>
          </>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[q.status] || ''}`}>
            {QUOTATION_STATUSES.find(s => s.value === q.status)?.label || q.status}
          </span>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
            v{q.version_number}
          </span>
        </span>
      </div>

      {/* Quotation Paper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">LOGO</div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900 tracking-wide">ABC RENTALS</h1>
          </div>
        </div>

        <hr className="border-gray-300 my-4" />

        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-widest">QUOTATION</h2>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">v{q.version_number}</span>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium mt-1 ${statusColors[q.status] || ''}`}>
            {QUOTATION_STATUSES.find(s => s.value === q.status)?.label || q.status}
          </span>
        </div>

        <div className="flex justify-between mb-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold">{q.customer_name}</p>
            {q.customer_email && <p className="text-gray-600">{q.customer_email}</p>}
            {q.customer_phone && <p className="text-gray-600">{q.customer_phone}</p>}
            {q.customer_address && <p className="text-gray-600">{q.customer_address}</p>}
            {q.customer_gst && <p className="text-gray-600">GST: {q.customer_gst}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Quotation No</p>
            <p className="font-semibold">{q.quotation_number}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-2">Date</p>
            <p>{new Date(q.created_at).toLocaleDateString()}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-2">Valid Until</p>
            <p>{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : '—'}</p>
          </div>
        </div>

        <hr className="border-gray-300 my-4" />

        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Rental Charges</p>
        <hr className="border-gray-300 mb-3" />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 pr-2 font-medium">Equipment</th>
                <th className="py-2 px-2 font-medium text-right">Qty</th>
                <th className="py-2 px-2 font-medium">Period</th>
                <th className="py-2 px-2 font-medium">Date Range</th>
                <th className="py-2 px-2 font-medium text-right">Rate</th>
                <th className="py-2 pl-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.line_items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 pr-2 text-gray-900">{item.equipment_name || item.description || '—'}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2 px-2 text-gray-600">{RENTAL_PERIODS.find(p => p.value === item.rental_period)?.label || item.rental_period}</td>
                  <td className="py-2 px-2 text-gray-600">{item.start_date && item.end_date ? `${item.start_date} — ${item.end_date}` : '—'}</td>
                  <td className="py-2 px-2 text-right text-gray-600">₹{Number(item.unit_price).toLocaleString()}</td>
                  <td className="py-2 pl-2 text-right font-medium">₹{Number(item.line_total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <hr className="border-gray-300 my-3" />

        <div className="flex justify-end">
          <div className="w-56 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Subtotal</span>
              <span>₹{Number(q.subtotal).toLocaleString()}</span>
            </div>
            {Number(q.tax_amount) > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-500">GST ({Number(q.tax_percentage)}%)</span>
                <span>₹{Number(q.tax_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold border-t-2 border-b-2 border-gray-900 my-1">
              <span>GRAND TOTAL</span>
              <span>₹{Number(q.total_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <hr className="border-gray-300 my-4" />

        {q.terms_conditions && (
          <>
            <div className="text-sm mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Terms &amp; Conditions</p>
              <p className="text-gray-700 whitespace-pre-wrap">{q.terms_conditions}</p>
            </div>
            <hr className="border-gray-300 my-4" />
          </>
        )}

        {q.notes && (
          <>
            <div className="text-sm mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-gray-700">{q.notes}</p>
            </div>
            <hr className="border-gray-300 my-4" />
          </>
        )}

        {q.lost_reason && (
          <div className="text-sm mb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Lost Reason</p>
            <p className="text-red-600">{LOST_REASONS.find(r => r.value === q.lost_reason)?.label || q.lost_reason}</p>
            {q.lost_notes && <p className="text-gray-600 mt-1">{q.lost_notes}</p>}
          </div>
        )}

        {q.won_reason && (
          <div className="text-sm mb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Won Reason</p>
            <p className="text-green-600">{q.won_reason}</p>
          </div>
        )}

        <div className="text-center text-sm text-gray-500 mt-4">Thank You</div>
      </div>

      {/* Reject Form Modal */}
      {showRejectForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowRejectForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Reject Quotation</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lost Reason *</label>
                <select value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">Select reason</option>
                  {LOST_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea value={lostNotes} onChange={(e) => setLostNotes(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Additional details..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowRejectForm(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading || !lostReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? '...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Form Modal */}
      {showAcceptForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowAcceptForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Accept Quotation</h2>
            <p className="text-sm text-gray-500 mb-4">This will create a Contract, Rental Order, and Draft Invoice.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Won Reason (optional)</label>
                <input value={wonReason} onChange={(e) => setWonReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="e.g. Competitive pricing" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAcceptForm(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAccept} disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {actionLoading ? '...' : 'Accept & Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-150 overflow-hidden transform scale-100 transition-transform">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mb-4 animate-bounce">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">Quotation Accepted!</h3>
              <p className="text-sm text-gray-500 mb-6">The following documents have been generated:</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 text-left">
                <div className="flex justify-between items-center text-sm border-b border-gray-200/60 pb-2">
                  <span className="text-gray-500 font-medium">Contract:</span>
                  <Link to={`/contracts/${successModal.contractId}`} className="font-mono text-blue-600 hover:text-blue-750 font-semibold hover:underline">
                    {successModal.contractNumber}
                  </Link>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-200/60 pb-2">
                  <span className="text-gray-500 font-medium">Rental Order:</span>
                  <Link to={`/rental-orders/${successModal.rentalOrderId}`} className="font-mono text-blue-600 hover:text-blue-750 font-semibold hover:underline">
                    {successModal.rentalOrderNumber}
                  </Link>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Draft Invoice:</span>
                  <Link to={`/invoices/${successModal.invoiceId}`} className="font-mono text-blue-600 hover:text-blue-750 font-semibold hover:underline">
                    {successModal.invoiceNumber}
                  </Link>
                </div>
              </div>

              <button onClick={() => setSuccessModal(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                Okay, Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}