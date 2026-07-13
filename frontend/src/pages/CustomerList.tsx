import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { CustomerListItem } from '../api/crm';
import api, { CUSTOMER_TYPES } from '../api/crm';

export default function CustomerList() {
  const user = useAuthStore((s) => s.user);
  const canManage = user && ['super_admin', 'operations_manager'].includes(user.role);
  const [data, setData] = useState<CustomerListItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page };
    if (search) params.search = search;
    if (typeFilter) params.customer_type = typeFilter;
    api.customers.list(params).then((res) => {
      setData(res.results);
      setCount(res.count);
    }).finally(() => setLoading(false));
  }, [search, typeFilter, page]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        {canManage && (
          <Link to="/customers/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
            + New Customer
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, code, email, phone..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Types</option>
            {CUSTOMER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div>
        : data.length === 0 ? <div className="p-8 text-center text-gray-500">No customers found</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium text-right">Outstanding</th>
                  <th className="px-4 py-3 font-medium text-right">Sites</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{c.customer_code}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{CUSTOMER_TYPES.find(t => t.value === c.customer_type)?.label || c.customer_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.email && <div className="text-xs">{c.email}</div>}
                      {c.phone && <div className="text-xs">{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.city || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${c.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{Number(c.outstanding_amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{c.sites_count}</td>
                    <td className="px-4 py-3">
                      <Link to={`/customers/${c.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</Link>
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
