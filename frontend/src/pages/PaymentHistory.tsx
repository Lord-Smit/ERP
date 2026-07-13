import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/invoices';
import type { PaymentRecord } from '../api/invoices';

const MODE_LABELS: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque',
  bank_transfer: 'Bank Transfer', online: 'Online Payment', other: 'Other',
};

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = (dFrom?: string, dTo?: string) => {
    setLoading(true);
    const params: Record<string, any> = { page_size: 100 };
    if (dFrom) params.date_from = dFrom;
    if (dTo) params.date_to = dTo;
    api.listPayments(params).then((data) => {
      setPayments(data.results ?? data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFilter = () => {
    load(dateFrom || undefined, dateTo || undefined);
  };

  const handleDownloadPdf = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    window.open(`/api/payments/download-pdf/?${params.toString()}`);
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <button onClick={handleDownloadPdf}
          className="shrink-0 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          Download PDF
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="From" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="To" />
        <button onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Filter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No payments recorded</td></tr>
              ) : payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 text-sm">
                  <td className="px-4 py-3 text-gray-900">{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/invoices/${p.invoice}`} className="text-blue-600 hover:text-blue-800 font-mono">
                      View Invoice
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-700">₹{Number(p.amount_paid).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">{MODE_LABELS[p.payment_mode] || p.payment_mode}</td>
                  <td className="px-4 py-3 text-gray-600">{p.reference_number || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.created_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}