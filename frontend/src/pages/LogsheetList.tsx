import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LogsheetListItem } from '../api/logsheet';
import type { EquipmentListItem } from '../api/equipment';
import api, { STATUS_CHOICES } from '../api/logsheet';
import eqApi from '../api/equipment';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  operator_approved: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  flagged: 'bg-amber-100 text-amber-800',
};

export default function LogsheetList() {
  const [data, setData] = useState<LogsheetListItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', equipment: '', status: '' });
  const [page, setPage] = useState(1);
  const [equipmentList, setEquipmentList] = useState<EquipmentListItem[]>([]);

  useEffect(() => {
    eqApi.equipment.list({ page_size: 200 }).then((res) => setEquipmentList(res.results));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.logsheets.list(params).then((res) => {
      setData(res.results);
      setCount(res.count);
    }).finally(() => setLoading(false));
  }, [filters, page]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logsheets</h1>
        <Link to="/logsheets/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
          + New Logsheet
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3">
          <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="From" />
          <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="To" />
          <select value={filters.equipment} onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Equipment</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Status</option>
            {STATUS_CHOICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div>
        : data.length === 0 ? <div className="p-8 text-center text-gray-500">No logsheets found</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Equipment</th>
                  <th className="px-4 py-3 font-medium">Shift</th>
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium text-right">Hours</th>
                  <th className="px-4 py-3 font-medium text-right">Prod. Hours</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.equipment_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.shift_display}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.site_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.total_hours ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.productive_hours ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || ''}`}>
                        {item.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.created_by_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/logsheets/${item.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</Link>
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
