import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../context/ToastContext';
import type { CalendarData } from '../api/logsheet';
import api, { SHIFT_CHOICES } from '../api/logsheet';

const STATUS_CHOICES = [
  { value: 'available', label: 'Available', color: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'deployed', label: 'Deployed', color: 'bg-blue-500', text: 'text-blue-700', bgLight: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'on_leave', label: 'On Leave', color: 'bg-purple-500', text: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-200' },
  { value: 'unavailable', label: 'Unavailable', color: 'bg-rose-500', text: 'text-rose-700', bgLight: 'bg-rose-50', border: 'border-rose-200' },
];

type ViewMode = 'calendar' | 'table';

interface EditModalState {
  operatorId: string;
  operatorName: string;
  day: number;
  dateStr: string;
  existingId?: string;
  status: string;
  shift: string;
  notes: string;
}

const isPastDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export default function AvailabilityPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const canManage = user && ['super_admin', 'operations_manager', 'field_supervisor'].includes(user.role);

  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCell, setActiveCell] = useState<{ opId: string; day: number } | null>(null);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, month + 1, 0);
    const end = endDate.toISOString().split('T')[0];
    api.availability.calendar({ date_from: start, date_to: end }).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getStatusForOperator = (operatorId: string, day: number) => {
    if (!data) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAvail = data.availabilities[dateStr];
    if (!dayAvail) return null;
    const entry = dayAvail.find((a: any) => a.operator_id === operatorId);
    return entry || null;
  };

  const handleCellClick = async (operatorId: string, operatorName: string, day: number) => {
    if (!canManage) return;
    if (isPastDate(year, month, day)) {
      toast.info('Cannot modify availability for past dates.');
      return;
    }
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setModalLoading(true);
    try {
      const existing = (await api.availability.list({ operator: operatorId, date: dateStr }))[0];
      setEditModal({
        operatorId,
        operatorName,
        day,
        dateStr,
        existingId: existing?.id,
        status: existing?.status || 'available',
        shift: existing?.shift || 'general',
        notes: existing?.notes || '',
      });
    } catch {
      alert('Failed to load availability info');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!editModal) return;
    setLoading(true);
    try {
      if (editModal.existingId) {
        await api.availability.update(editModal.existingId, {
          status: editModal.status,
          shift: editModal.shift,
          notes: editModal.notes,
        });
      } else {
        await api.availability.create({
          operator: editModal.operatorId,
          date: editModal.dateStr,
          status: editModal.status,
          shift: editModal.shift,
          notes: editModal.notes,
          source: 'manual',
        });
      }
      setEditModal(null);
      load();
    } catch {
      alert('Failed to save availability');
      setLoading(false);
    }
  };

  const handleDeleteAvailability = async () => {
    if (!editModal || !editModal.existingId) return;
    setLoading(true);
    try {
      await api.availability.delete(editModal.existingId);
      setEditModal(null);
      load();
    } catch {
      alert('Failed to delete availability');
      setLoading(false);
    }
  };

  const filteredOperators = data?.operators.filter((op) =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Summary counts for current month/view
  const getStats = () => {
    if (!data) return { available: 0, deployed: 0, leave: 0, total: 0 };
    let available = 0, deployed = 0, leave = 0;
    Object.values(data.availabilities).forEach((dayList: any) => {
      dayList.forEach((entry: any) => {
        if (entry.status === 'available') available++;
        else if (entry.status === 'deployed') deployed++;
        else if (entry.status === 'on_leave') leave++;
      });
    });
    return {
      available,
      deployed,
      leave,
      total: data.operators.length,
    };
  };

  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Title & View Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Operator Scheduler</h1>
          <p className="text-sm text-gray-500 mt-1">Plan shifts, leaves and real-time deployments</p>
        </div>
        
        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm p-1">
            <button 
              onClick={() => { if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); } }}
              className="p-1.5 hover:bg-gray-50 rounded text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="px-4 text-sm font-semibold text-gray-800 min-w-[120px] text-center">
              {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => { if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); } }}
              className="p-1.5 hover:bg-gray-50 rounded text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Grid Calendar
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Audit Log
            </button>
          </div>
        </div>
      </div>

      {/* Modern Summary Metric Deck */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Total Available</span>
            <span className="text-xl font-extrabold text-gray-800">{stats.available} man-days</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Total Deployed</span>
            <span className="text-xl font-extrabold text-gray-800">{stats.deployed} shifts</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Leaves Marked</span>
            <span className="text-xl font-extrabold text-gray-800">{stats.leave} records</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-50 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Active Operators</span>
            <span className="text-xl font-extrabold text-gray-800">{stats.total} total</span>
          </div>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input 
            type="text" 
            placeholder="Filter operators by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-4 text-xs font-semibold text-gray-600">
            {STATUS_CHOICES.map(sc => (
              <span key={sc.value} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${sc.color}`}></span>
                {sc.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-48 px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    Operator
                  </th>
                  {days.map((d) => {
                    const cellDate = new Date(year, month, d);
                    const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                    const isToday = cellDate.toDateString() === today.toDateString();
                    return (
                      <th 
                        key={d} 
                        className={`px-1 py-3 text-center text-xs font-bold uppercase w-10 border-r border-gray-150 ${
                          isToday ? 'bg-blue-50 text-blue-600 font-extrabold' : isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-400'
                        }`}
                      >
                        <div>{d}</div>
                        <div className="text-[9px] font-normal mt-0.5">
                          {cellDate.toLocaleString('default', { weekday: 'short' }).charAt(0)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredOperators.map((op) => (
                  <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-xs text-gray-700 font-bold uppercase">
                        {op.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="truncate w-32" title={op.name}>{op.name}</div>
                    </td>
                    {days.map((d) => {
                      const entry = getStatusForOperator(op.id, d);
                      const isHovered = activeCell?.opId === op.id || activeCell?.day === d;
                      const cellDate = new Date(year, month, d);
                      const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                      const isToday = cellDate.toDateString() === today.toDateString();
                      const past = isPastDate(year, month, d);

                      let statusStyle = 'bg-transparent text-gray-300';
                      if (past) {
                        statusStyle = 'bg-gray-100/50 text-gray-600';
                      } else if (entry) {
                        const sChoice = STATUS_CHOICES.find(sc => sc.value === entry.status);
                        if (sChoice) {
                          statusStyle = `${sChoice.color} text-white shadow-sm ring-1 ring-white/10`;
                        }
                      } else if (isWeekend) {
                        statusStyle = 'bg-gray-50/30 text-transparent';
                      }

                      return (
                        <td 
                          key={d} 
                          onMouseEnter={() => setActiveCell({ opId: op.id, day: d })}
                          onMouseLeave={() => setActiveCell(null)}
                          onClick={() => handleCellClick(op.id, op.name, d)}
                          className={`p-1 text-center border-r border-gray-150 transition-all relative group ${
                            isToday ? 'bg-blue-50/30' : isHovered && !past ? 'bg-gray-50' : ''
                          } ${past ? '' : 'cursor-pointer'}`}
                        >
                          <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold uppercase transition-transform duration-100 ${statusStyle} ${canManage && !past ? 'group-hover:scale-110 active:scale-95' : ''}`}>
                            {entry ? entry.status.charAt(0).toUpperCase() : '—'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredOperators.length === 0 && (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="py-12 text-center text-gray-400 font-medium">
                      No matching operators found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Styled Table / Audit view */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Operator</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Shift</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {data && Object.entries(data.availabilities).flatMap(([dateStr, entries]) =>
                (entries as any[]).map((entry: any, i: number) => {
                  const sChoice = STATUS_CHOICES.find(sc => sc.value === entry.status);
                  const shiftChoice = SHIFT_CHOICES.find(sc => sc.value === entry.shift);
                  return (
                    <tr key={`${dateStr}-${entry.operator_id}-${i}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-bold uppercase">
                          {entry.operator_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                        </div>
                        {entry.operator_name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{dateStr}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-700">
                          {shiftChoice?.label || entry.shift}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${sChoice?.bgLight} ${sChoice?.text} ${sChoice?.border}`}>
                          {entry.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium uppercase tracking-wider">{entry.source}</td>
                      <td className="px-6 py-4 italic text-gray-400 max-w-xs truncate" title={entry.notes || '—'}>
                        {entry.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
              {data && Object.keys(data.availabilities).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    No availability entries logged for this month
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Popover Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden transform scale-100 transition-transform">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Set Schedule</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{editModal.operatorName} &middot; {editModal.dateStr}</p>
              </div>
              <button 
                onClick={() => setEditModal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Status selectors */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Availability Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_CHOICES.map(sc => (
                    <button
                      key={sc.value}
                      type="button"
                      onClick={() => setEditModal({ ...editModal, status: sc.value })}
                      className={`flex items-center gap-2 p-2.5 border rounded-lg text-xs font-semibold transition-all ${
                        editModal.status === sc.value 
                          ? `${sc.bgLight} ${sc.text} ${sc.border} ring-2 ring-offset-1 ring-blue-500` 
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${sc.color}`}></span>
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift selector */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shift</label>
                <select
                  value={editModal.shift}
                  onChange={(e) => setEditModal({ ...editModal, shift: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  {SHIFT_CHOICES.map(sc => (
                    <option key={sc.value} value={sc.value}>{sc.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Internal Note / Remarks</label>
                <textarea
                  value={editModal.notes}
                  onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                  rows={3}
                  placeholder="e.g. Approved leave request #102..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-150 flex gap-2 justify-end">
              {editModal.existingId && (
                <button
                  type="button"
                  onClick={handleDeleteAvailability}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold mr-auto"
                >
                  Clear Status
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAvailability}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Apply Schedule
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
