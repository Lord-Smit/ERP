import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/invoices';
import type { InvoiceListItem } from '../api/invoices';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function InvoiceList() {
  const user = useAuthStore((s) => s.user);
  const canManage = user && ['super_admin', 'operations_manager', 'finance'].includes(user.role);

  const [data, setData] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (statusFilter) params.status = statusFilter;
    api.list(params).then((res) => {
      setData(res.results ?? res);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        {canManage && (
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link to="/invoices/from-logsheets"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 text-center">
              Generate from Logsheets
            </Link>
            <Link to="/invoices/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 text-center">
              + New Invoice
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div>
        : data.length === 0 ? <div className="p-8 text-center text-gray-500">No invoices found</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Issue Date</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Balance Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{inv.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">₹{Number(inv.total_amount).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${inv.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{inv.balance_due.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}
