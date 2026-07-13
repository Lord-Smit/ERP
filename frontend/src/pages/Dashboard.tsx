import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import RoleBadge from '../components/RoleBadge';
import invoicesApi from '../api/invoices';
import dashboardApi from '../api/dashboard';
import logsheetApi from '../api/logsheet';
import type { InvoiceStats } from '../api/invoices';
import type { DashboardData } from '../api/dashboard';
import type { ExpiryAlerts, AttendanceSummary } from '../api/logsheet';
import type { EquipmentCertAlerts } from '../api/equipment';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const roleGreetings: Record<string, string> = {
  super_admin: 'Full system access — manage users, settings, and all modules.',
  operations_manager: 'Oversee operations, contracts, equipment, and field teams.',
  finance: 'Manage invoices, payments, deposits, and financial reports.',
  field_supervisor: 'Handle dispatch, returns, customer interaction, and field operations.',
  operator: 'Manage equipment inventory, maintenance, and warehouse operations.',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  rented: 'On Rent',
  maintenance: 'Maintenance',
  in_transit: 'In Transit',
  retired: 'Retired',
};

const STATUS_COLORS: Record<string, string> = {
  available: '#64748b',   // slate-500
  rented: '#4f46e5',      // indigo-600
  reserved: '#818cf8',    // indigo-400
  maintenance: '#cbd5e1',  // slate-300
  in_transit: '#a855f7',   // purple-500
  retired: '#94a3b8',     // slate-400
};

// SVG icons for Quick Action Cards
const quickActionIcons: Record<string, React.ReactNode> = {
  blue: (
    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  amber: (
    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  ),
  green: (
    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125v-3.02M14.25 18.75v-9m-9 9v-5.25m13.5 5.25v-3.75m-13.5-3h13.5M10.5 4.875h3m-3 1.5h3m-3 1.5h3M9 3.75h6a1.5 1.5 0 0 1 1.5 1.5v3.75a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 9 3.75Z" />
    </svg>
  ),
  purple: (
    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
};

// SVG icons for Core Metrics Grid
const metricIcons = {
  available: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
  overdue: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  pending: (
    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  revenue: (
    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  ),
};

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<ExpiryAlerts | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);

  const showOpsWidgets = user && ['super_admin', 'operations_manager', 'field_supervisor'].includes(user.role);

  useEffect(() => {
    invoicesApi.stats().then(setStats).catch(() => {});
    dashboardApi.get().then(setDashboard).catch(() => {});
    if (showOpsWidgets) {
      logsheetApi.operators.getExpiryAlerts(30).then(setAlerts).catch(() => {});
      logsheetApi.attendance.summary().then(setAttendanceSummary).catch(() => {});
    }
  }, [showOpsWidgets]);

  if (!user) return null;

  const d = dashboard;

  const chartData = stats?.equipment_by_status?.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#cbd5e1',
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Welcome, {user.first_name || user.email}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 max-w-xl font-normal leading-relaxed">
            {roleGreetings[user.role] ?? 'Manage and view operations relative to your role.'}
          </p>
        </div>
        <div className="self-start sm:self-center">
          <RoleBadge role={user.role} />
        </div>
      </div>

      {/* Quick Action Bento Grid */}
      {user.role !== 'operator' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Pending Quotations"
            count={d?.pending_quotations ?? 0}
            to="/quotations"
            color="blue"
          />
          <QuickActionCard
            title="Customer Queries"
            count={d?.pending_queries ?? 0}
            to="/customer-queries"
            color="amber"
          />
          <QuickActionCard
            title="Active Rentals"
            count={d?.active_rentals_count ?? stats?.active_rentals ?? 0}
            to="/rental-orders"
            color="green"
          />
          <QuickActionCard
            title="Pending Contracts"
            count={d?.pending_contracts ?? stats?.pending_contracts ?? 0}
            to="/contracts"
            color="purple"
          />
        </div>
      )}

      {/* Core Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="Available Equipment"
          value={stats ? String(stats.equipment_by_status?.find((e) => e.status === 'available')?.count ?? 0) : '—'}
          icon={metricIcons.available}
        />
        <DashboardCard
          title="Overdue Invoices"
          value={stats ? String(stats.overdue_invoices) : '—'}
          icon={metricIcons.overdue}
        />
        <DashboardCard
          title="Pending Invoices"
          value={stats ? String(stats.pending_invoices) : '—'}
          icon={metricIcons.pending}
        />
        <DashboardCard
          title="Overdue Amount"
          value={stats ? `₹${Number(stats.overdue_amount).toLocaleString()}` : '—'}
          icon={metricIcons.overdue}
        />
        <DashboardCard
          title="Pending Amount"
          value={stats ? `₹${Number(stats.pending_amount).toLocaleString()}` : '—'}
          icon={metricIcons.pending}
        />
        <DashboardCard
          title="Revenue (This Month)"
          value={stats ? `₹${Number(stats.revenue_month).toLocaleString()}` : '—'}
          icon={metricIcons.revenue}
        />
      </div>

      {/* Operations Widgets */}
      {showOpsWidgets && (
        <>
          {/* Today's Attendance & Equipment Status Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Today's Attendance summary */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Today's Attendance</h3>
                  <Link to="/attendance" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">View All</Link>
                </div>
                {!attendanceSummary ? (
                  <p className="text-sm text-zinc-400 py-2">Loading...</p>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4 text-zinc-600">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Present <strong className="text-zinc-800 font-semibold">{attendanceSummary.present}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span>Absent <strong className="text-zinc-800 font-semibold">{attendanceSummary.absent}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span>On Leave <strong className="text-zinc-800 font-semibold">{attendanceSummary.on_leave}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Half Day <strong className="text-zinc-800 font-semibold">{attendanceSummary.half_day}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                        <span>Unmarked <strong className="text-zinc-800 font-semibold">{attendanceSummary.unmarked}</strong></span>
                      </div>
                    </div>

                    {(() => {
                      const total = (attendanceSummary.present || 0) + 
                                    (attendanceSummary.absent || 0) + 
                                    (attendanceSummary.on_leave || 0) + 
                                    (attendanceSummary.half_day || 0) + 
                                    (attendanceSummary.unmarked || 0);
                      if (total === 0) return null;
                      const pct = (val: number) => ((val / total) * 100).toFixed(1) + '%';
                      return (
                        <div className="w-full h-2 rounded-full bg-zinc-100 flex overflow-hidden">
                          {attendanceSummary.present > 0 && (
                            <div style={{ width: pct(attendanceSummary.present) }} className="h-full bg-emerald-500" title={`Present: ${attendanceSummary.present}`} />
                          )}
                          {attendanceSummary.absent > 0 && (
                            <div style={{ width: pct(attendanceSummary.absent) }} className="h-full bg-red-500" title={`Absent: ${attendanceSummary.absent}`} />
                          )}
                          {attendanceSummary.on_leave > 0 && (
                            <div style={{ width: pct(attendanceSummary.on_leave) }} className="h-full bg-indigo-500" title={`On Leave: ${attendanceSummary.on_leave}`} />
                          )}
                          {attendanceSummary.half_day > 0 && (
                            <div style={{ width: pct(attendanceSummary.half_day) }} className="h-full bg-amber-500" title={`Half Day: ${attendanceSummary.half_day}`} />
                          )}
                          {attendanceSummary.unmarked > 0 && (
                            <div style={{ width: pct(attendanceSummary.unmarked) }} className="h-full bg-zinc-300" title={`Unmarked: ${attendanceSummary.unmarked}`} />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Equipment Status Donut Chart */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Equipment Status</h3>
                  <span className="text-xs font-semibold text-zinc-800">
                    Total: {stats?.total_equipment ?? 0}
                  </span>
                </div>
                
                {!stats ? (
                  <p className="text-sm text-zinc-400 py-4">Loading...</p>
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-4">No data available</p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Recharts Pie Donut */}
                    <div className="w-28 h-28 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={42}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                            formatter={(value: any) => [value, 'Qty']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Minimal Legend */}
                    <div className="flex-1 space-y-1.5 w-full">
                      {chartData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-zinc-500 font-medium">{item.name}</span>
                          </div>
                          <span className="font-semibold text-zinc-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Rentals list */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Rentals</h3>
                <Link to="/rental-orders" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">View All</Link>
              </div>
              {!d ? (
                <ListSkeleton />
              ) : d.active_rentals.length === 0 ? (
                <EmptyState message="No active rentals" iconType="rentals" />
              ) : (
                <div className="space-y-1 divide-y divide-zinc-50">
                  {d.active_rentals.map((r, index) => (
                    <Link key={r.id} to={`/rental-orders/${r.id}`}
                      className={`flex items-center justify-between py-2.5 rounded-lg hover:bg-zinc-50/50 px-2 -mx-2 transition-colors ${index > 0 ? 'border-t border-zinc-100/50' : ''}`}>
                      <span className="font-semibold text-sm text-zinc-800 tracking-tight">{r.order_number}</span>
                      <span className="text-xs text-zinc-500 font-medium">{r.customer_name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Queries list */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Recent Customer Queries</h3>
                <Link to="/customer-queries" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">View All</Link>
              </div>
              {!d ? (
                <ListSkeleton />
              ) : d.recent_queries.length === 0 ? (
                <EmptyState message="No open queries" iconType="queries" />
              ) : (
                <div className="space-y-1 divide-y divide-zinc-50">
                  {d.recent_queries.map((q, index) => (
                    <Link key={q.id} to={`/customer-queries`}
                      className={`flex items-center justify-between py-2.5 rounded-lg hover:bg-zinc-50/50 px-2 -mx-2 transition-colors ${index > 0 ? 'border-t border-zinc-100/50' : ''}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          q.priority === 'urgent' ? 'bg-red-500' :
                          q.priority === 'high' ? 'bg-amber-500' :
                          q.priority === 'medium' ? 'bg-blue-500' : 'bg-zinc-300'
                        }`} />
                        <span className="truncate text-sm text-zinc-800 font-medium">{q.subject}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">
                        {q.status.replace('_', ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Activity timeline */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-6 flex flex-col">
              <div className="mb-6 pb-3 border-b border-zinc-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Recent Activity</h3>
              </div>
              {!d ? (
                <ActivitySkeleton />
              ) : d.recent_activity.length === 0 ? (
                <EmptyState message="No recent activity" iconType="activity" />
              ) : (
                <div className="relative border-l border-zinc-100 pl-4 ml-1.5 space-y-5 py-1">
                  {d.recent_activity.map((a, i) => (
                    <div key={i} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-zinc-50 ${
                        a.type === 'quotation' ? 'bg-blue-500' :
                        a.type === 'rental_order' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`} />
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-800 font-medium">{a.description}</p>
                          <p className="text-xs text-zinc-450 mt-0.5">{a.customer_name}</p>
                        </div>
                        <span className="text-xs text-zinc-400 font-medium shrink-0">
                          {new Date(a.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cert Alerts block */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Certification Expiry Alerts</h3>
                <Link to="/equipment" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">View All</Link>
              </div>
              <div className="flex-1">
                {!d || !alerts ? (
                  <CertSkeleton />
                ) : (
                  renderCertAlerts(alerts, d?.equipment_cert_alerts)
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function renderCertAlerts(operatorAlerts: ExpiryAlerts | null, equipmentAlerts?: EquipmentCertAlerts | null) {
  const hasOperatorAlerts = operatorAlerts && (operatorAlerts.expiring.length + operatorAlerts.expired.length) > 0;
  const hasEquipmentAlerts = equipmentAlerts && (equipmentAlerts.expiring.length + equipmentAlerts.expired.length) > 0;

  if (!hasOperatorAlerts && !hasEquipmentAlerts) {
    return <p className="text-sm text-zinc-400 py-4">No certs expiring within 30 days</p>;
  }

  return (
    <div className="space-y-4">
      {operatorAlerts && renderAlertGroup(operatorAlerts.expired, operatorAlerts.expiring, 'operator_name')}
      {hasOperatorAlerts && hasEquipmentAlerts && <hr className="border-zinc-100 my-2" />}
      {equipmentAlerts && renderAlertGroup(equipmentAlerts.expired, equipmentAlerts.expiring, 'equipment_name')}
    </div>
  );
}

function renderAlertGroup(expired: any[], expiring: any[], nameField: string) {
  const isEquipment = nameField === 'equipment_name';
  return (
    <div className="space-y-3">
      {expired.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-red-650 font-semibold text-xs uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {expired.length} expired
          </div>
          <div className="mt-1.5 space-y-1 pl-3 border-l border-red-100">
            {expired.slice(0, 3).map((c: any) => (
              <div key={c.id} className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-700">{c[nameField]}</span>
                {isEquipment && c.equipment_model ? ` (${c.equipment_model})` : ''} — <span className="italic">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {expiring.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {expiring.length} expiring soon
          </div>
          <div className="mt-1.5 space-y-1 pl-3 border-l border-amber-100">
            {expiring.slice(0, 3).map((c: any) => (
              <div key={c.id} className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-700">{c[nameField]}</span>
                {isEquipment && c.equipment_model ? ` (${c.equipment_model})` : ''} — <span className="italic">{c.name}</span>
                {c.expiry_date ? ` (until ${c.expiry_date})` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardCard({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between min-h-[120px]">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{title}</p>
        {icon && <div className="text-zinc-450 shrink-0">{icon}</div>}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}

function QuickActionCard({ title, count, to, color }: { title: string; count: number; to: string; color: string }) {
  return (
    <Link to={to}
      className="group flex items-center justify-between px-5 py-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-350 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 group-hover:bg-white group-hover:border-zinc-200 transition-all shrink-0">
          {quickActionIcons[color] || quickActionIcons.blue}
        </div>
        <span className="text-sm font-medium text-zinc-650 group-hover:text-zinc-900 transition-colors">{title}</span>
      </div>
      <span className="text-lg font-semibold text-zinc-900">{count}</span>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4 py-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="flex items-center gap-2 w-2/3">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-250" />
            <div className="h-4 bg-zinc-100 rounded w-1/2" />
          </div>
          <div className="h-3 bg-zinc-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="relative border-l border-zinc-100 pl-4 ml-1.5 space-y-6 py-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative">
          <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-zinc-200 ring-4 ring-zinc-50" />
          <div className="flex justify-between items-start gap-4">
            <div className="w-2/3 space-y-1.5">
              <div className="h-4 bg-zinc-100 rounded w-4/5" />
              <div className="h-3 bg-zinc-100 rounded w-1/2" />
            </div>
            <div className="h-3 bg-zinc-100 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CertSkeleton() {
  return (
    <div className="space-y-4 py-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-zinc-150 rounded w-1/4" />
          <div className="pl-3 border-l border-zinc-100 space-y-1.5">
            <div className="h-3.5 bg-zinc-100 rounded w-3/4" />
            <div className="h-3.5 bg-zinc-100 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  iconType: 'rentals' | 'queries' | 'activity' | 'alerts';
}

function EmptyState({ message, iconType }: EmptyStateProps) {
  const icons = {
    rentals: (
      <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M2.25 21h19.5M2.25 21H6.75V8.25M4 11h.008v.008H4V11Zm0 4h.008v.008H4V15Zm2.25-8h.008v.008H6.25V7Zm0 4h.008v.008H6.25V11Zm0 4h.008v.008H6.25V15ZM9 4h.008v.008H9V4Zm0 4h.008v.008H9V8Zm0 4h.008v.008H9V12Zm2.25-8h.008v.008H11.25V4Zm0 4h.008v.008H11.25V8Zm0 4h.008v.008H11.25V12Zm2.25-8h.008v.008H13.5V4Zm0 4h.008v.008H13.5V8Zm0 4h.008v.008H13.5V12Zm2.25-8h.008v.008H15.75V4Zm0 4h.008v.008H15.75V8Zm0 4h.008v.008H15.75V12Zm2.25 4h.008v.008H18v-.008Zm0 4h.008v.008H18V20Zm2.25-8h.008v.008H20.25V12Zm0 4h.008v.008H20.25V16Z" />
      </svg>
    ),
    queries: (
      <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    activity: (
      <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    alerts: (
      <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="p-3 bg-zinc-50 rounded-full border border-zinc-100 mb-3">
        {icons[iconType]}
      </div>
      <p className="text-sm font-medium text-zinc-400">{message}</p>
    </div>
  );
}
