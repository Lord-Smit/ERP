import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import crmApi, { type ContractExpiryAlert } from '../api/crm';

interface PaymentReminder {
  id: string;
  customer: string;
  customer_name: string;
  invoice_number: string;
  amount: string;
  due_date: string;
  reminded_at: string | null;
  reminder_type: string;
  notes: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  email: 'Email', phone: 'Phone Call', sms: 'SMS', visit: 'Site Visit',
};

const SEVERITY_STYLES: Record<string, string> = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  critical: 'bg-orange-50 border-orange-200 text-orange-800',
  overdue: 'bg-red-50 border-red-200 text-red-800',
};

const SEVERITY_ICONS: Record<string, string> = {
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  critical: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  overdue: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

type Tab = 'payment' | 'contract_expiry';

export default function PaymentReminders() {
  const [tab, setTab] = useState<Tab>('payment');
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ContractExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page_size: 100 };
    if (filter === 'open') params.is_resolved = false;
    else if (filter === 'resolved') params.is_resolved = true;
    Promise.all([
      apiClient.get('/reminders/', { params }).then(({ data }) => data.results ?? data ?? []),
      crmApi.contracts.expiryAlerts().catch(() => []),
    ]).then(([r, alerts]) => {
      setReminders(r);
      setExpiryAlerts(alerts);
    }).finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reminders</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {[
          { key: 'payment' as Tab, label: `Payment Reminders (${reminders.length})` },
          { key: 'contract_expiry' as Tab, label: `Contract Expiry Alerts (${expiryAlerts.length})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Payment Reminders Tab */}
      {tab === 'payment' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['all', 'open', 'resolved'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Resolved'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Reminded At</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {reminders.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No payment reminders found</td></tr>
                ) : reminders.map((r) => (
                  <tr key={r.id} className={`border-b border-gray-100 text-sm ${r.is_resolved ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-gray-900">{r.customer_name}</td>
                    <td className="px-4 py-3">
                      {r.invoice_number ? (
                        <span className="font-mono text-gray-700">{r.invoice_number}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">₹{r.amount ? Number(r.amount).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{PAYMENT_TYPE_LABELS[r.reminder_type] || r.reminder_type}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.reminded_at ? new Date(r.reminded_at).toLocaleString() : 'Not sent'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.is_resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.is_resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract Expiry Alerts Tab */}
      {tab === 'contract_expiry' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {expiryAlerts.length === 0
                ? 'No contracts expiring soon'
                : `${expiryAlerts.length} contract${expiryAlerts.length > 1 ? 's' : ''} need attention`}
            </p>
            <Link to="/contracts" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All Contracts</Link>
          </div>

          <div className="space-y-3">
            {expiryAlerts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400 text-sm">All contracts are up to date</p>
              </div>
            ) : (
              expiryAlerts.map((alert) => (
                <Link key={alert.id} to={`/contracts/${alert.id}`}
                  className={`block bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow ${SEVERITY_STYLES[alert.severity] || 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${
                        alert.severity === 'overdue' ? 'bg-red-100' :
                        alert.severity === 'critical' ? 'bg-orange-100' : 'bg-amber-100'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          alert.severity === 'overdue' ? 'text-red-600' :
                          alert.severity === 'critical' ? 'text-orange-600' : 'text-amber-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d={SEVERITY_ICONS[alert.severity]} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{alert.contract_number}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{alert.customer_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-bold ${
                        alert.severity === 'overdue' ? 'text-red-600' :
                        alert.severity === 'critical' ? 'text-orange-600' : 'text-amber-600'
                      }`}>
                        {alert.days_remaining > 0 ? `${alert.days_remaining}d` : `${Math.abs(alert.days_remaining)}d overdue`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {alert.auto_renew ? 'Auto-renew' : 'Manual renew'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      alert.severity === 'overdue' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'critical' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      Expired {alert.severity === 'overdue' ? `(${Math.abs(alert.days_remaining)}d ago)` : `in ${alert.days_remaining} days`}
                    </span>
                    {alert.auto_renew && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Auto-Renew ON</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          {expiryAlerts.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">About contract expiry alerts</p>
              <p className="text-blue-600">Contracts are checked against their configured renewal_reminder_days. Auto-renew contracts will be flagged accordingly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}