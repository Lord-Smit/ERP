import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RentalOrderListItem } from '../api/quotations';
import api, { RENTAL_ORDER_STATUSES } from '../api/quotations';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function RentalOrderList() {
  const [data, setData] = useState<RentalOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (statusFilter) params.status = statusFilter;
    api.rentalOrders.list(params).then((res) => {
      setData(res.results);
    }).finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rental Orders</h1>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Status</option>
            {RENTAL_ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div>
        : data.length === 0 ? <div className="p-8 text-center text-gray-500">No rental orders</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">End</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{o.order_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.site_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.start_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.end_date || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{Number(o.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[o.status] || ''}`}>
                        {RENTAL_ORDER_STATUSES.find(s => s.value === o.status)?.label || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-orders/${o.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</Link>
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
