import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuotationListItem } from '../api/quotations';
import api, { QUOTATION_STATUSES } from '../api/quotations';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-amber-100 text-amber-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-amber-100 text-amber-800',
};

export default function QuotationList() {
  const [data, setData] = useState<QuotationListItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.quotations.list(params).then((res) => {
      setData(res.results);
      setCount(res.count);
    }).finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <Link to="/quotations/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
          + New Quotation
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search quotation number or customer..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Status</option>
            {QUOTATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div>
        : data.length === 0 ? <div className="p-8 text-center text-gray-500">No quotations found</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-right">Items</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Valid Until</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((q) => (
                  <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{q.quotation_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{q.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{q.items_count}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{Number(q.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{q.valid_until || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[q.status] || ''}`}>
                        {QUOTATION_STATUSES.find(s => s.value === q.status)?.label || q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/quotations/${q.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }

        {count > 20 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm">
            <span className="text-gray-500">{count} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={data.length < 20}
                className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
