import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { LogsheetDetail } from '../api/logsheet';
import api from '../api/logsheet';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  operator_approved: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  flagged: 'bg-amber-100 text-amber-800',
};

const approvalStepLabel: Record<string, string> = {
  submitted: 'Awaiting Operator Approval',
  operator_approved: 'Awaiting Manager Approval',
  approved: 'Fully Approved',
  rejected: 'Rejected',
  flagged: 'Flagged for Review',
};

export default function LogsheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [ls, setLs] = useState<LogsheetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.logsheets.get(id).then(setLs).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAction = async (action: string, comments?: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      if (action === 'submit') await api.logsheets.submit(id);
      else if (action === 'approve') await api.logsheets.approve(id);
      else if (action === 'reject') await api.logsheets.reject(id, comments || '');
      load();
    } catch { alert(`Failed to ${action} logsheet`); } finally { setActionLoading(false); }
  };

  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (!ls) return <div className="text-center py-8 text-gray-500">Not found</div>;

  const role = user?.role;
  const canSubmit = role && ['super_admin', 'operations_manager', 'field_supervisor'].includes(role);
  const canOperatorApprove = role && ['super_admin', 'operations_manager', 'operator'].includes(role) && ls.status === 'submitted';
  const canManagerApprove = role && ['super_admin', 'operations_manager'].includes(role) && ls.status === 'operator_approved';
  const canReject = role && ['super_admin', 'operations_manager', 'operator'].includes(role) && (ls.status === 'submitted' || ls.status === 'operator_approved');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/logsheets" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-2xl font-bold text-gray-900">Logsheet Detail</h1>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[ls.status] || ''}`}>
          {ls.status_display}
        </span>
        <button onClick={() => window.open(`/api/logsheets/${id}/download-pdf/`)}
          className="shrink-0 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          Download PDF
        </button>
      </div>

      {/* Basic Info Card */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Basic Info</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-gray-500">Equipment</dt><dd className="font-medium text-gray-900">{ls.equipment_name}</dd></div>
          <div><dt className="text-gray-500">Date</dt><dd className="font-medium text-gray-900">{ls.date}</dd></div>
          <div><dt className="text-gray-500">Shift</dt><dd className="font-medium text-gray-900">{ls.shift_display}</dd></div>
          <div><dt className="text-gray-500">Site</dt><dd className="font-medium text-gray-900">{ls.site_name || '—'}</dd></div>
          <div><dt className="text-gray-500">Created By</dt><dd className="font-medium text-gray-900">{ls.created_by_name || '—'}</dd></div>
          <div><dt className="text-gray-500">Submitted At</dt><dd className="font-medium text-gray-900">{ls.submitted_at || 'Not yet'}</dd></div>
        </dl>
      </section>

      {/* Timing */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Timing</h2>
        <dl className="grid grid-cols-4 gap-2 text-sm">
          <div><dt className="text-gray-500">Shift Start</dt><dd className="font-medium text-gray-900">{ls.shift_start || '—'}</dd></div>
          <div><dt className="text-gray-500">Break Start</dt><dd className="font-medium text-gray-900">{ls.break_start || '—'}</dd></div>
          <div><dt className="text-gray-500">Break End</dt><dd className="font-medium text-gray-900">{ls.break_end || '—'}</dd></div>
          <div><dt className="text-gray-500">Shift End</dt><dd className="font-medium text-gray-900">{ls.shift_end || '—'}</dd></div>
        </dl>
      </section>

      {/* Hours */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Hours</h2>
        <dl className="grid grid-cols-4 gap-2 text-sm">
          <div><dt className="text-gray-500">Total</dt><dd className="font-medium text-gray-900">{ls.total_hours ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Idle</dt><dd className="font-medium text-gray-900">{ls.idle_hours ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Breakdown</dt><dd className="font-medium text-gray-900">{ls.breakdown_hours ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Productive</dt><dd className="font-medium text-gray-900">{ls.productive_hours ?? '—'}</dd></div>
        </dl>
      </section>

      {/* Meter & Fuel */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Meter & Fuel</h2>
        <dl className="grid grid-cols-4 gap-2 text-sm">
          <div><dt className="text-gray-500">Meter Start</dt><dd className="font-medium text-gray-900">{ls.meter_start ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Meter End</dt><dd className="font-medium text-gray-900">{ls.meter_end ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Fuel (L)</dt><dd className="font-medium text-gray-900">{ls.fuel_liters ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Fuel Cost</dt><dd className="font-medium text-gray-900">{ls.fuel_cost != null ? `₹${ls.fuel_cost}` : '—'}</dd></div>
        </dl>
      </section>

      {/* Operators */}
      {ls.operators && ls.operators.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Operators</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Check-in</th>
                <th className="pb-2 font-medium">Check-out</th>
              </tr>
            </thead>
            <tbody>
              {ls.operators.map((op: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-900">{op.operator_name}</td>
                  <td className="py-2 text-gray-600">{op.check_in || '—'}</td>
                  <td className="py-2 text-gray-600">{op.check_out || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Breakdowns */}
      {ls.breakdowns && ls.breakdowns.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Breakdowns</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Reason</th>
                <th className="pb-2 font-medium">Start</th>
                <th className="pb-2 font-medium">End</th>
                <th className="pb-2 font-medium text-right">Min</th>
              </tr>
            </thead>
            <tbody>
              {ls.breakdowns.map((bd: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-2 text-gray-900">{bd.reason_display || bd.reason_code}</td>
                  <td className="py-2 text-gray-600">{bd.start_time || '—'}</td>
                  <td className="py-2 text-gray-600">{bd.end_time || '—'}</td>
                  <td className="py-2 text-right text-gray-600">{bd.duration_minutes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Notes */}
      {ls.notes && (
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{ls.notes}</p>
        </section>
      )}

      {/* Approval Timeline */}
      {ls.status !== 'draft' && (
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Approval Flow</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ls.submitted_at ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>
                {ls.submitted_at ? 'Submitted' : 'Not Submitted'}
              </span>
              {ls.submitted_by_name && <span className="text-gray-600">by {ls.submitted_by_name}</span>}
              {ls.submitted_at && <span className="text-gray-400 text-xs">{new Date(ls.submitted_at).toLocaleString()}</span>}
            </div>
            {ls.approvals && ls.approvals.map((a: any, idx: number) => {
              const isApproved = a.status === 'approved';
              const label = idx === 0 && a.status === 'approved' ? 'Operator Approved' :
                idx === 1 && a.status === 'approved' ? 'Manager Approved' : a.status.charAt(0).toUpperCase() + a.status.slice(1);
              return (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {label}
                  </span>
                  <span className="text-gray-600">by {a.approver_name}</span>
                  {a.comments && <span className="text-gray-400">— {a.comments}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end flex-wrap">
        {ls.status === 'draft' && (
          <>
            <Link to={`/logsheets/${id}/edit`}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Edit
            </Link>
            {canSubmit && (
              <button onClick={() => handleAction('submit')} disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? '...' : 'Submit'}
              </button>
            )}
          </>
        )}
        {canOperatorApprove && (
          <>
            <button onClick={() => { setShowReject(!showReject); }} disabled={actionLoading}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
              Reject
            </button>
            <button onClick={() => handleAction('approve')} disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {actionLoading ? '...' : 'Approve (Operator)'}
            </button>
          </>
        )}
        {canManagerApprove && (
          <>
            <button onClick={() => { setShowReject(!showReject); }} disabled={actionLoading}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
              Reject
            </button>
            <button onClick={() => handleAction('approve')} disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {actionLoading ? '...' : 'Approve (Manager)'}
            </button>
          </>
        )}
        {ls.status === 'operator_approved' && !canManagerApprove && (
          <div className="text-sm text-gray-500 italic py-2">Waiting for operations manager approval</div>
        )}
      </div>

      {showReject && (
        <div className="mt-3 bg-red-50 p-3 rounded-lg flex gap-2">
          <input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500" />
          <button onClick={() => {
            handleAction('reject', rejectionReason);
            setShowReject(false);
          }} disabled={actionLoading || !rejectionReason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
