import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { EquipmentListItem } from '../api/equipment';
import api, { STATUS_CHOICES, getStatusLabel } from '../api/equipment';
import { useAuthStore } from '../store/authStore';

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-blue-100 text-blue-800',
  rented: 'bg-purple-100 text-purple-800',
  maintenance: 'bg-amber-100 text-amber-800',
  in_transit: 'bg-purple-100 text-purple-800',
  retired: 'bg-gray-100 text-gray-800',
};

export default function EquipmentList() {
  const user = useAuthStore((s) => s.user);
  const canAdd = user && ['super_admin', 'operations_manager', 'field_supervisor', 'operator'].includes(user.role);
  const [data, setData] = useState<EquipmentListItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page };
    if (search) params.search = search;
    if (status) params.status = status;
    api.equipment.list(params).then((res) => {
      setData(res.results);
      setCount(res.count);
    }).finally(() => setLoading(false));
  }, [search, status, page]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
        {canAdd && (
          <Link
            to="/equipment/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
          >
            + Add Equipment
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, brand, or serial..."
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <select
            value={status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Status</option>
            {STATUS_CHOICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No equipment found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Equipment</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Serial</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Daily Rate</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/equipment/${item.id}`} className="flex items-center gap-3">
                        {item.primary_image ? (
                          <img src={item.primary_image} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No img</div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.brand} {item.model}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.category_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.serial_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || 'bg-gray-100'}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.rental_price_daily ? `₹${item.rental_price_daily.toLocaleString()}/day` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.warehouse_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.operator_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/equipment/${item.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {count > 20 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm">
            <span className="text-gray-500">{count} total</span>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('page', String(page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => updateFilter('page', String(page + 1))}
                disabled={data.length < 20}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
