import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import type { Attendance, Operator, AttendanceSummary } from '../api/logsheet';
import api from '../api/logsheet';

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  half_day: 'bg-yellow-100 text-yellow-800',
  leave: 'bg-purple-100 text-purple-800',
  holiday: 'bg-blue-100 text-blue-800',
};

const statuses = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'leave', label: 'On Leave' },
  { value: 'holiday', label: 'Holiday' },
];

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const canMark = user && ['super_admin', 'operations_manager', 'field_supervisor'].includes(user.role);

  const todayStr = new Date().toISOString().split('T')[0];
  const [operators, setOperators] = useState<Operator[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [bulkStatus, setBulkStatus] = useState('present');
  const isToday = selectedDate === todayStr;

  const load = () => {
    setLoading(true);
    Promise.all([
      api.operators.list(),
      api.attendance.list({ date: selectedDate }),
      api.attendance.summary(selectedDate),
    ]).then(([ops, att, sum]) => {
      setOperators(ops.filter((o) => o.is_active));
      setRecords(att);
      setSummary(sum);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedDate]);

  const getRecord = (operatorId: string) => records.find((r) => r.operator === operatorId);

  const markAll = async () => {
    if (!confirm(`Mark all operators as '${bulkStatus}' for ${selectedDate}?`)) return;
    try {
      const payload = operators.map((op) => ({
        operator: op.id,
        date: selectedDate,
        status: bulkStatus,
      }));
      await api.attendance.bulk(payload);
      load();
    } catch { alert('Bulk operation failed'); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
      </div>

      {summary && (
        <div className="flex gap-4 mb-6 text-sm flex-wrap">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">Present: {summary.present}</span>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full">Absent: {summary.absent}</span>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">On Leave: {summary.on_leave}</span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">Half Day: {summary.half_day}</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">Holiday: {summary.holiday}</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">Unmarked: {summary.unmarked}</span>
        </div>
      )}

      {canMark && isToday && (
        <div className="flex items-center gap-3 mb-6 bg-white rounded-xl border border-gray-200 p-4">
          <span className="text-sm text-gray-600">Bulk mark:</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={markAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Apply to All
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? <div className="p-6 text-center text-gray-500">Loading...</div>
        : operators.length === 0 ? <div className="p-6 text-center text-gray-400">No active operators</div>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Check In</th>
                  <th className="px-4 py-3 font-medium">Check Out</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Overtime</th>
                  {canMark && <th className="px-4 py-3 font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => {
                  const rec = getRecord(op.id);
                  return (
                    <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{op.name}</td>
                      <td className="px-4 py-3">
                        {rec
                          ? <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[rec.status] || 'bg-gray-100 text-gray-800'}`}>
                              {rec.status_display}
                            </span>
                          : <span className="text-xs text-gray-400">Not marked</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rec?.check_in || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rec?.check_out || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rec?.total_hours ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rec?.overtime_hours ?? '—'}</td>
                      {canMark && (
                        <td className="px-4 py-3">
                          <QuickMark operatorId={op.id} date={selectedDate} currentStatus={rec?.status || ''} onDone={load} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}

function QuickMark({ operatorId, date, currentStatus, onDone }: {
  operatorId: string; date: string; currentStatus: string; onDone: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = date === todayStr;

  const handleMark = async (newStatus: string) => {
    setSaving(true);
    try {
      if (currentStatus) {
        const existing = (await api.attendance.list({ operator: operatorId, date }))[0];
        if (existing) await api.attendance.update(existing.id, { ...existing, status: newStatus, operator: operatorId, date });
      } else {
        await api.attendance.create({ operator: operatorId, date, status: newStatus });
      }
      setStatus(newStatus);
      onDone();
    } catch { alert('Failed to mark'); } finally { setSaving(false); }
  };

  if (!isToday) {
    return <span className="text-xs text-gray-400 italic">Read only</span>;
  }

  return (
    <div className="flex gap-1">
      {statuses.filter((s) => s.value !== currentStatus).slice(0, 3).map((s) => (
        <button key={s.value} onClick={() => handleMark(s.value)} disabled={saving}
          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50">
          {s.label}
        </button>
      ))}
    </div>
  );
}
