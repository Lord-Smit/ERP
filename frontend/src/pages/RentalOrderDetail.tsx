import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { RentalOrderDetail as RODetail } from '../api/quotations';
import api, { RENTAL_ORDER_STATUSES, RENTAL_PERIODS } from '../api/quotations';
import { useAuthStore } from '../store/authStore';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function RentalOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<RODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.rentalOrders.get(id).then(setOrder).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleComplete = async () => {
    if (!id) return;
    setActionLoading(true);
    try { await api.rentalOrders.complete(id); load(); }
    catch { alert('Failed to complete order'); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('Cancel this rental order?')) return;
    setActionLoading(true);
    try { await api.rentalOrders.cancel(id); load(); }
    catch { alert('Failed to cancel order'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (!order) return <div className="text-center py-8 text-gray-500">Order not found</div>;

  const canManage = user && ['super_admin', 'operations_manager', 'field_supervisor'].includes(user.role);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div>
          <Link to="/rental-orders" className="text-sm text-blue-600 hover:text-blue-700">&larr; Back to Orders</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{order.order_number}</h1>
          <p className="text-sm text-gray-500">{order.customer_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[order.status] || ''}`}>
            {RENTAL_ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}
          </span>
          {canManage && order.status === 'active' && (
            <>
              <button onClick={handleCancel} disabled={actionLoading}
                className="shrink-0 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleComplete} disabled={actionLoading}
                className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? '...' : 'Complete'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500 block">Customer</span><span className="font-medium">{order.customer_name}</span></div>
          <div><span className="text-gray-500 block">Site</span><span className="font-medium">{order.site_name || '—'}</span></div>
          <div><span className="text-gray-500 block">Start Date</span><span className="font-medium">{order.start_date}</span></div>
          <div><span className="text-gray-500 block">End Date</span><span className="font-medium">{order.end_date || '—'}</span></div>
          {order.quotation_number && (
            <div>
              <span className="text-gray-500 block">Quotation</span>
              <Link to={`/quotations/${order.quotation}`} className="font-medium text-blue-600 hover:text-blue-700">{order.quotation_number}</Link>
            </div>
          )}
        </div>

        {order.line_items.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Equipment</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium">Date Range</th>
                  <th className="pb-2 font-medium text-right">Unit Price</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.line_items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">{item.equipment_name || item.description || '—'}</td>
                    <td className="py-2 text-gray-600">{RENTAL_PERIODS.find(p => p.value === item.rental_period)?.label || item.rental_period}</td>
                    <td className="py-2 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-2 text-gray-600">{item.start_date && item.end_date ? `${item.start_date} — ${item.end_date}` : '—'}</td>
                    <td className="py-2 text-right text-gray-900">₹{Number(item.unit_price).toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-900 font-medium">₹{Number(item.line_total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <div className="text-sm font-bold text-gray-900 flex justify-between w-72">
            <span>Total Amount</span>
            <span>₹{Number(order.total_amount).toLocaleString()}</span>
          </div>
        </div>

        {order.notes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
