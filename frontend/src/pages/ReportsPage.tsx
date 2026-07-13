import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart,
} from 'recharts';
import api from '../api/invoices';
import type { InvoiceListItem, InvoiceStats } from '../api/invoices';

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  rented: 'On Rent',
  maintenance: 'Under Maintenance',
  retired: 'Retired',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'text-green-600',
  reserved: 'text-blue-600',
  rented: 'text-indigo-600',
  maintenance: 'text-amber-600',
  retired: 'text-gray-500',
};

export default function ReportsPage() {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [chartData, setChartData] = useState<{ label: string; revenue: number; pending: number }[]>([]);
  const [overdue, setOverdue] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats(),
      api.revenueChart(),
      api.list({ status: 'overdue', page_size: 10 }),
    ]).then(([statsData, chart, invData]) => {
      setStats(statsData);
      setChartData(chart);
      setOverdue(invData.results ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const totalOutstanding = (stats?.pending_amount ?? 0) + (stats?.overdue_amount ?? 0);
  const collectionRate = stats && stats.total_revenue > 0
    ? ((stats.total_revenue / (stats.total_revenue + totalOutstanding)) * 100).toFixed(1)
    : '—';

  const agingData = stats?.aging ? [
    { name: '0-30 Days', count: stats.aging['0_30'].count, amount: stats.aging['0_30'].total },
    { name: '31-60 Days', count: stats.aging['31_60'].count, amount: stats.aging['31_60'].total },
    { name: '61-90 Days', count: stats.aging['61_90'].count, amount: stats.aging['61_90'].total },
    { name: '90+ Days', count: stats.aging['90_plus'].count, amount: stats.aging['90_plus'].total },
  ] : [];

  const formatCurrency = (val: number) => `₹${val.toLocaleString()}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats?.total_revenue ?? 0), color: 'text-gray-900', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'This Month', value: formatCurrency(stats?.revenue_month ?? 0), color: 'text-green-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
          { label: 'Pending', value: `${stats?.pending_invoices ?? 0} invoices`, sub: formatCurrency(stats?.pending_amount ?? 0), color: 'text-amber-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
          { label: 'Overdue', value: `${stats?.overdue_invoices ?? 0} invoices`, sub: formatCurrency(stats?.overdue_amount ?? 0), color: 'text-red-600', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z', bg: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
        ].map((kpi) => (
          <div key={kpi.label} className={`${kpi.bg} rounded-xl border border-gray-200 p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                <p className={`mt-1 text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                {kpi.sub && <p className="text-xs text-gray-500 mt-0.5">{kpi.sub}</p>}
              </div>
              <div className={`${kpi.iconBg} p-2 rounded-lg`}>
                <svg className={`w-5 h-5 ${kpi.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend Line Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Revenue Trend</h2>
            {stats && <span className="text-xs text-green-600 font-medium">Collection Rate: {collectionRate}%</span>}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value: any) => [formatCurrency(value), undefined]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revenueGrad)" name="Revenue" />
                <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fill="url(#pendingGrad)" name="Pending" strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-600 inline-block rounded" /> Collected</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block rounded dashed" style={{ borderTop: '1.5px dashed #f59e0b', height: 0 }} /> Unpaid</span>
          </div>
        </div>

        {/* Aging Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Aging Breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [name === 'amount' ? formatCurrency(value) : value, undefined]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {agingData.map((_, i) => {
                    const colors = ['#f59e0b', '#f97316', '#ef4444', '#991b1b'];
                    return <rect key={i} fill={colors[i] || '#ef4444'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {agingData.map((d, i) => {
              const colors = ['bg-amber-500', 'bg-orange-500', 'bg-red-500', 'bg-red-800'];
              return (
                <div key={d.name} className="text-center">
                  <div className={`${colors[i]} h-1.5 rounded-full mb-1`} />
                  <p className="text-[10px] text-gray-500">{d.name}</p>
                  <p className="text-xs font-semibold text-gray-700">{d.count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operational & Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Operational Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Operations Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1 flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Rentals</span>
                <span className="text-lg font-bold text-blue-600">{stats?.active_rentals ?? 0}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-50 p-2 rounded-lg">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Equipment</span>
                  <span className="text-lg font-bold text-gray-900">{stats?.total_equipment ?? 0}</span>
                </div>
              </div>
              {stats?.equipment_by_status && stats.equipment_by_status.length > 0 && (
                <div className="ml-10 space-y-1">
                  {stats.equipment_by_status.map((e) => (
                    <div key={e.status} className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{STATUS_LABELS[e.status] || e.status}</span>
                      <span className={`font-semibold ${STATUS_COLORS[e.status] || 'text-gray-600'}`}>{e.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-amber-50 p-2 rounded-lg">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending Contracts</span>
                <span className="text-lg font-bold text-amber-600">{stats?.pending_contracts ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Financial Summary</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Total Revenue', value: formatCurrency(stats?.total_revenue ?? 0), color: 'text-gray-900' },
              { label: 'This Month', value: formatCurrency(stats?.revenue_month ?? 0), color: 'text-green-600' },
              { label: 'Pending Collection', value: formatCurrency(stats?.pending_amount ?? 0), color: 'text-amber-600' },
              { label: 'Overdue', value: formatCurrency(stats?.overdue_amount ?? 0), color: 'text-red-600' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-500">{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-8S00">Outstanding Total</span>
              <span className="font-bold text-red-600 text-base">{formatCurrency(totalOutstanding)}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Collection Efficiency</h2>
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${Number(collectionRate) * 0.94} 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{collectionRate}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">Collection Rate<br />(Paid / Total Billed)</p>
          </div>
        </div>
      </div>

      {/* Overdue Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Overdue Invoices</h2>
          <Link to="/invoices?status=overdue" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All</Link>
        </div>
        {overdue.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400 text-sm">No overdue invoices</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Invoice #</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Due Date</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-100 text-sm hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono text-gray-900">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-gray-900">{inv.customer_name}</td>
                    <td className="px-5 py-3 text-red-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right font-medium">₹{Number(inv.total_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}