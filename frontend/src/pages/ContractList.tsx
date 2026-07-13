import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ContractListItem, CustomerSite } from '../api/crm';
import type { EquipmentListItem } from '../api/equipment';
import api, { CONTRACT_STATUSES, CONTRACT_TYPES } from '../api/crm';
import equipmentApi from '../api/equipment';
import { useAuthStore } from '../store/authStore';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  terminated: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
};

export default function ContractList() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [sites, setSites] = useState<CustomerSite[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentListItem[]>([]);

  const canManage = user && ['super_admin', 'operations_manager'].includes(user.role);

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page_size: 200 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.contract_type = typeFilter;
    if (siteFilter) params.site = siteFilter;
    if (equipmentFilter) params.equipment = equipmentFilter;
    api.contracts.list(params).then((r) => setData(r.results)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter, siteFilter, equipmentFilter]);

  useEffect(() => {
    api.sites.list().then(setSites).catch(() => {});
    equipmentApi.equipment.list({ page_size: 200 }).then((r) => setEquipmentList(r.results)).catch(() => {});
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contract?')) return;
    try { await api.contracts.delete(id); load(); }
    catch { alert('Failed to delete contract'); }
  };

  const filtered = data.filter((c) =>
    !search || c.contract_number.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        {canManage && (
          <Link to="/contracts/new"
            className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ New Contract</Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Statuses</option>
            {CONTRACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Types</option>
            {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">All Equipment</option>
            {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Contract #</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium text-right">Items</th>
              <th className="px-4 py-3 font-medium text-right">Value</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No contracts found</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.contract_number}</td>
                <td className="px-4 py-3 text-gray-600">{c.customer_name}</td>
                <td className="px-4 py-3 text-gray-600">{CONTRACT_TYPES.find(t => t.value === c.contract_type)?.label || c.contract_type}</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.start_date} {c.end_date ? `→ ${c.end_date}` : ''}
                  {c.auto_renew && <span className="ml-1 text-xs text-blue-500">(auto-renew)</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{c.items_count}</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                  {c.value ? `₹${Number(c.value).toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status] || ''}`}>
                    {CONTRACT_STATUSES.find(s => s.value === c.status)?.label || c.status}
                    {c.signed_by_client && ' ✓'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                      className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
