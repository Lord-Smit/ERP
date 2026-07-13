import { useEffect, useState } from 'react';
import {
  getUsers, approveRegistration, rejectRegistration,
  getRegistrationDetail, type User, type RegistrationDetail,
} from '../api/auth';

export default function OperatorApprovals() {
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailModal, setDetailModal] = useState<RegistrationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getUsers()
      .then((users) => setPending(users.filter((u) => u.registration_status === 'pending')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveRegistration(id);
      setPending((prev) => prev.filter((u) => u.id !== id));
    } catch {
      alert('Failed to approve registration.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await rejectRegistration(rejectModal.id, rejectReason);
      setPending((prev) => prev.filter((u) => u.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    } catch {
      alert('Failed to reject registration.');
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await getRegistrationDetail(id);
      setDetailModal(detail);
    } catch {
      alert('Failed to load registration details.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Operator Approvals</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No pending registrations.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(u.date_joined).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => openDetail(u.id)}
                      disabled={actionLoading === u.id}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleApprove(u.id)}
                      disabled={actionLoading === u.id}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === u.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setRejectModal({ id: u.id, name: u.email })}
                      disabled={actionLoading === u.id}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-3/5 min-w-[700px] mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Registration Details</h3>
              <button
                onClick={() => setDetailModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-gray-500">Loading details...</div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {(detailModal.first_name?.[0] || detailModal.email[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        {detailModal.operator_profile?.name || detailModal.email}
                      </p>
                      <p className="text-xs text-gray-500">{detailModal.email}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    Pending
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <InfoCard label="First Name" value={detailModal.first_name || '—'} />
                  <InfoCard label="Last Name" value={detailModal.last_name || '—'} />
                  <InfoCard label="Phone" value={detailModal.phone || '—'} />
                  <InfoCard label="Registered" value={new Date(detailModal.date_joined).toLocaleDateString()} />
                  <InfoCard label="License Type" value={detailModal.operator_profile?.license_type || '—'} />
                  <InfoCard label="License Number" value={detailModal.operator_profile?.license_number || '—'} />
                  <InfoCard label="License Expiry" value={detailModal.operator_profile?.license_expiry || '—'} />
                  <InfoCard label="Emergency Contact" value={detailModal.operator_profile?.emergency_contact_name || '—'} />
                  <InfoCard label="Emergency Phone" value={detailModal.operator_profile?.emergency_contact_phone || '—'} />
                  <InfoCard label="Address" value={detailModal.operator_profile?.address_line1 || '—'} className="col-span-2" />
                  <InfoCard label="City" value={detailModal.operator_profile?.city || '—'} />
                  <InfoCard label="State" value={detailModal.operator_profile?.state || '—'} />
                  <InfoCard label="Pincode" value={detailModal.operator_profile?.pincode || '—'} />
                  <LicensePreview url={detailModal.operator_profile?.license_file || null} className="col-span-2" />
                </div>

                {!detailModal.operator_profile && (
                  <p className="text-sm text-gray-400 italic">No operator profile attached.</p>
                )}

                <div className="flex gap-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={async () => {
                      await handleApprove(detailModal.id);
                      setDetailModal(null);
                    }}
                    disabled={actionLoading === detailModal.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === detailModal.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => {
                      setRejectModal({ id: detailModal.id, name: detailModal.email });
                      setDetailModal(null);
                    }}
                    disabled={actionLoading === detailModal.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setDetailModal(null)}
                    className="flex-none px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Registration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Reject registration for <strong>{rejectModal.name}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal.id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-gray-50 rounded-lg px-3 py-2.5 ${className}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  );
}

function LicensePreview({ url, className = '' }: { url: string | null; className?: string }) {
  return (
    <div className={`bg-gray-50 rounded-lg px-3 py-2.5 ${className}`}>
      <p className="text-xs text-gray-400">License File</p>
      {!url ? (
        <p className="text-sm text-gray-400">—</p>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-sm text-blue-600 underline hover:text-blue-800">
          View License
        </a>
      )}
    </div>
  );
}