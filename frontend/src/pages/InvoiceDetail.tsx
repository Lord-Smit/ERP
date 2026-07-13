import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/invoices';
import type { Invoice } from '../api/invoices';

const PAYMENT_MODES = ['bank_transfer', 'cash', 'cheque', 'online', 'other'];

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const canManage = user && ['super_admin', 'operations_manager', 'finance'].includes(user.role);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.get(id).then(setInvoice).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleMarkSent = async () => {
    if (!id) return;
    try {
      await api.markSent(id);
      load();
    } catch { alert('Failed to mark as sent'); }
  };

  const handleMarkPaid = async () => {
    if (!id) return;
    try {
      await api.markPaid(id, {
        amount: payAmount ? Number(payAmount) : undefined,
        payment_date: payDate,
        payment_mode: payMode,
        reference_number: payRef,
      });
      setPayAmount('');
      setPayRef('');
      load();
    } catch { alert('Failed to mark as paid'); }
  };

  const handleCancel = async () => {
    if (!id || !confirm('Cancel this invoice?')) return;
    try {
      await api.cancel(id);
      load();
    } catch { alert('Failed to cancel invoice'); }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (!invoice) return <div className="text-center py-8 text-gray-500">Invoice not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link to="/invoices" className="text-gray-400 hover:text-gray-600 mr-2">&larr;</Link>
        <button onClick={() => window.open(`/api/invoices/${id}/download-pdf/`)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          Download PDF
        </button>
        {canManage && invoice.status === 'draft' && (
          <button onClick={handleMarkSent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Mark Sent
          </button>
        )}
        {canManage && invoice.status === 'draft' && (
          <button onClick={handleCancel}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
            Cancel
          </button>
        )}
        <span className="ml-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColor(invoice.status)}">
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </div>

      {/* Invoice Paper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-6 shadow-sm">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">
            LOGO
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900 tracking-wide">ABC RENTALS</h1>
          </div>
        </div>

        <hr className="border-gray-300 my-4" />

        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 tracking-widest">INVOICE</h2>
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium mt-1 ${statusColor(invoice.status)}`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>

        {/* Bill To / Invoice Meta */}
        <div className="flex justify-between mb-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold">{invoice.customer_name}</p>
            {invoice.customer_email && <p className="text-gray-600">{invoice.customer_email}</p>}
            {invoice.customer_phone && <p className="text-gray-600">{invoice.customer_phone}</p>}
            {invoice.customer_address && <p className="text-gray-600">{invoice.customer_address}</p>}
            {invoice.customer_gst && <p className="text-gray-600">GST: {invoice.customer_gst}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Invoice No</p>
            <p className="font-semibold">{invoice.invoice_number}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-2">Date</p>
            <p>{new Date(invoice.issue_date).toLocaleDateString()}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-2">Due Date</p>
            <p>{new Date(invoice.due_date).toLocaleDateString()}</p>
          </div>
        </div>

        <hr className="border-gray-300 my-4" />

        {/* Contract Info */}
        {invoice.contract && (
          <>
            <div className="mb-3 text-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contract Information</p>
              <p>Contract: {invoice.contract_details?.contract_number || invoice.contract}</p>
              <p>Type: {invoice.contract_details?.contract_type ? invoice.contract_details.contract_type.charAt(0).toUpperCase() + invoice.contract_details.contract_type.slice(1) : ''}</p>
              {invoice.contract_details && (
                <p>Period: {invoice.contract_details.start_date} – {invoice.contract_details.end_date || 'Open'}</p>
              )}
            </div>
            <hr className="border-gray-300 my-4" />
          </>
        )}

        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Rental Charges</p>
        <hr className="border-gray-300 mb-3" />

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 pr-2 font-medium">Equipment</th>
                <th className="py-2 px-2 font-medium text-right">Qty</th>
                <th className="py-2 px-2 font-medium text-right">Rate</th>
                <th className="py-2 px-2 font-medium text-right">Days</th>
                <th className="py-2 pl-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 pr-2 text-gray-900">{item.description}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2 px-2 text-right text-gray-600">₹{Number(item.unit_price).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2 pl-2 text-right font-medium">₹{Number(item.line_total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <hr className="border-gray-300 my-3" />

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-56 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Subtotal</span>
              <span>₹{Number(invoice.subtotal).toLocaleString()}</span>
            </div>
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-500">GST</span>
                <span>₹{Number(invoice.tax_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold border-t-2 border-b-2 border-gray-900 my-1">
              <span>GRAND TOTAL</span>
              <span>₹{Number(invoice.total_amount).toLocaleString()}</span>
            </div>
            {Number(invoice.paid_amount) > 0 && (
              <div className="flex justify-between py-1 text-green-600">
                <span>Paid</span>
                <span>₹{Number(invoice.paid_amount).toLocaleString()}</span>
              </div>
            )}
            {Number(invoice.balance_due) > 0 && (
              <div className="flex justify-between py-1 font-semibold text-red-600">
                <span>Balance Due</span>
                <span>₹{Number(invoice.balance_due).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <hr className="border-gray-300 my-4" />

        {/* Notes */}
        {invoice.notes && (
          <>
            <div className="text-sm mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
            <hr className="border-gray-300 my-4" />
          </>
        )}

        <div className="text-center text-sm text-gray-500 mt-4">
          Thank You
        </div>
      </div>

      {/* Payment Actions */}
      {canManage && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Record Payment</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payment Date</label>
              <input type="date" value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payment Mode</label>
              <select value={payMode} onChange={(e) => setPayMode(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 w-full">
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reference No.</label>
              <input type="text" value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Cheque/Transaction ID"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (blank = full payment)</label>
              <input type="number" step="0.01" min="0" value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Full payment"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
            </div>
          </div>
          <button onClick={handleMarkPaid}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            Mark Paid
          </button>
        </div>
      )}
    </div>
  );
}
