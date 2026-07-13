import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { SHIFT_CHOICES, BREAKDOWN_REASONS } from '../api/logsheet';
import type { EquipmentListItem } from '../api/equipment';
import type { Operator } from '../api/logsheet';
import eqApi from '../api/equipment';
import crmApi, { type CustomerSite } from '../api/crm';
import { useToast } from '../context/ToastContext';

const FIELD_LIMITS: Record<string, { max: number; label: string }> = {
  total_hours: { max: 9999.99, label: 'Total Hours' },
  idle_hours: { max: 9999.99, label: 'Idle Hours' },
  breakdown_hours: { max: 9999.99, label: 'Breakdown Hours' },
  productive_hours: { max: 9999.99, label: 'Productive Hours' },
  meter_start: { max: 99999999.99, label: 'Meter Start' },
  meter_end: { max: 99999999.99, label: 'Meter End' },
  fuel_liters: { max: 999999.99, label: 'Fuel (Liters)' },
  fuel_cost: { max: 99999999.99, label: 'Fuel Cost' },
};

export default function LogsheetForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [equipmentList, setEquipmentList] = useState<EquipmentListItem[]>([]);
  const [sites, setSites] = useState<CustomerSite[]>([]);
  const [operatorsList, setOperatorsList] = useState<Operator[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);

  const [form, setForm] = useState<Record<string, any>>({
    equipment: '', date: new Date().toISOString().slice(0, 10),
    shift: 'general', site_name: '',
    shift_start: '', break_start: '', break_end: '', shift_end: '',
    total_hours: '', idle_hours: '', breakdown_hours: '', productive_hours: '',
    meter_start: '', meter_end: '',
    fuel_liters: '', fuel_cost: '',
    notes: '',
  });

  const [breakdowns, setBreakdowns] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    Promise.all([
      eqApi.equipment.list({ page: 1, page_size: 100 }),
      crmApi.sites.list().catch(() => []),
      api.operators.list().catch(() => []),
    ]).then(([eqRes, sitesRes, opRes]) => {
      setEquipmentList(eqRes.results);
      setSites(sitesRes as CustomerSite[]);
      setOperatorsList((opRes as Operator[]).filter((o) => o.is_active));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.logsheets.get(id).then((ls) => {
        setForm({
          equipment: ls.equipment, date: ls.date, shift: ls.shift,
          site_name: ls.site_name,
          shift_start: ls.shift_start || '', break_start: ls.break_start || '',
          break_end: ls.break_end || '', shift_end: ls.shift_end || '',
          total_hours: ls.total_hours?.toString() || '',
          idle_hours: ls.idle_hours?.toString() || '',
          breakdown_hours: ls.breakdown_hours?.toString() || '',
          productive_hours: ls.productive_hours?.toString() || '',
          meter_start: ls.meter_start?.toString() || '',
          meter_end: ls.meter_end?.toString() || '',
          fuel_liters: ls.fuel_liters?.toString() || '',
          fuel_cost: ls.fuel_cost?.toString() || '',
          notes: ls.notes || '',
        });
        setSelectedOperators(ls.operators.map((o: any) => o.operator));
        setBreakdowns(ls.breakdowns.map((b: any) => ({
          reason_code: b.reason_code, description: b.description,
          start_time: b.start_time || '', end_time: b.end_time || '',
          duration_minutes: b.duration_minutes?.toString() || '',
        })));
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const addBreakdown = () => {
    setBreakdowns([...breakdowns, { reason_code: 'other', description: '', start_time: '', end_time: '', duration_minutes: '' }]);
  };

  const updateBreakdown = (idx: number, field: string, value: string) => {
    const bd = [...breakdowns];
    bd[idx] = { ...bd[idx], [field]: value };
    setBreakdowns(bd);
  };

  const removeBreakdown = (idx: number) => {
    setBreakdowns(breakdowns.filter((_, i) => i !== idx));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const limit = FIELD_LIMITS[name];
    if (limit && value) {
      const num = parseFloat(value);
      if (!isNaN(num) && num > limit.max) {
        setFieldErrors((prev) => ({ ...prev, [name]: `Maximum value is ${limit.max.toLocaleString()}` }));
        return;
      }
    }
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => {
      const limit = FIELD_LIMITS[k];
      if (limit && v) {
        const num = parseFloat(v);
        if (!isNaN(num) && num > limit.max) {
          errors[k] = `Maximum value is ${limit.max.toLocaleString()}`;
        }
      }
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      setErrorMsg('Please fix the highlighted fields.');
      return;
    }

    try {
      const alwaysString = ['site_name', 'notes'];
      const payload: Record<string, any> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v === '') {
          payload[k] = alwaysString.includes(k) ? '' : null;
        } else {
          payload[k] = v;
        }
      });
      payload.operators_data = selectedOperators.map((opId) => ({ operator: opId }));
      payload.breakdowns_data = breakdowns.map((b) => ({
        reason_code: b.reason_code,
        description: b.description,
        start_time: b.start_time || null,
        end_time: b.end_time || null,
        duration_minutes: b.duration_minutes ? Number(b.duration_minutes) : null,
      }));
      if (isEdit) {
        await api.logsheets.update(id!, payload);
        toast.success('Logsheet Updated', 'Logsheet details have been updated successfully.');
      } else {
        await api.logsheets.create(payload);
        toast.success('Logsheet Created', 'New logsheet has been successfully submitted.');
      }
      navigate('/logsheets');
    } catch (err: any) {
      const data = err?.response?.data || {};
      const fieldErrs: Record<string, string> = {};
      Object.keys(FIELD_LIMITS).forEach((key) => {
        const msgs = data[key];
        if (msgs && Array.isArray(msgs)) {
          fieldErrs[key] = msgs[0];
        }
      });
      if (Object.keys(fieldErrs).length > 0) {
        setFieldErrors(fieldErrs);
      }
      const detail = data?.equipment?.[0]
        || data?.detail
        || data?.non_field_errors?.[0]
        || 'Failed to save logsheet';
      const msg = typeof detail === 'string' ? detail : JSON.stringify(data);
      setErrorMsg(msg);
      toast.error('Failed to save logsheet', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-2 md:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Logsheet' : 'New Logsheet'}
      </h1>

      {errorMsg && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Equipment *</label>
              <select name="equipment" value={form.equipment} onChange={handleChange} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">Select equipment</option>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.name} ({eq.serial_number || eq.id.slice(0, 8)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
              <select name="shift" value={form.shift} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                {SHIFT_CHOICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Site Name</label>
              <select name="site_name" value={form.site_name} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">Select site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.name}>{s.name} ({s.city})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Shift Timing */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Shift Timing</h2>
            
            {/* Quick Presets Row */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    shift_start: '08:00',
                    break_start: '12:00',
                    break_end: '13:00',
                    shift_end: '17:00',
                  }));
                }}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-all"
              >
                🌅 Morning (08-17)
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    shift_start: '14:00',
                    break_start: '18:00',
                    break_end: '19:00',
                    shift_end: '22:00',
                  }));
                }}
                className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-[10px] font-bold transition-all"
              >
                🌇 Evening (14-22)
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    shift_start: '22:00',
                    break_start: '02:00',
                    break_end: '03:00',
                    shift_end: '06:00',
                  }));
                }}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-bold transition-all"
              >
                🌃 Night (22-06)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Time Adjuster Helper Fields */}
            {[
              { label: 'Shift Start', field: 'shift_start', defaultVal: '08:00' },
              { label: 'Break Start', field: 'break_start', defaultVal: '12:00' },
              { label: 'Break End', field: 'break_end', defaultVal: '13:00' },
              { label: 'Shift End', field: 'shift_end', defaultVal: '17:00' }
            ].map(({ label, field, defaultVal }) => {
              const adjustTime = (offset: number) => {
                const currentVal = form[field] || defaultVal;
                const [hStr, mStr] = currentVal.split(':');
                let hours = parseInt(hStr, 10);
                let minutes = parseInt(mStr, 10);
                
                let totalMinutes = hours * 60 + minutes + offset;
                if (totalMinutes < 0) totalMinutes += 24 * 60;
                totalMinutes %= 24 * 60;
                
                const newHours = Math.floor(totalMinutes / 60);
                const newMinutes = totalMinutes % 60;
                const formatted = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
                setForm(prev => ({ ...prev, [field]: formatted }));
              };

              return (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                  <div className="flex items-stretch rounded-lg border border-gray-300 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
                    <button
                      type="button"
                      onClick={() => adjustTime(-30)}
                      className="px-2 bg-gray-50 hover:bg-gray-150 border-r text-[10px] text-gray-500 font-bold hover:text-gray-700 transition-colors"
                      title="Subtract 30 minutes"
                    >
                      -30m
                    </button>
                    <input
                      name={field}
                      type="time"
                      value={form[field]}
                      onChange={handleChange}
                      className="w-full px-2 py-2 text-sm outline-none text-center bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => adjustTime(30)}
                      className="px-2 bg-gray-50 hover:bg-gray-150 border-l text-[10px] text-gray-500 font-bold hover:text-gray-700 transition-colors"
                      title="Add 30 minutes"
                    >
                      +30m
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Hours</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['total_hours', 'idle_hours', 'breakdown_hours', 'productive_hours'].map((field) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">
                  {FIELD_LIMITS[field].label}
                </label>
                <input
                  name={field}
                  type="number"
                  step="0.5"
                  max={FIELD_LIMITS[field].max}
                  value={form[field]}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${
                    fieldErrors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors[field] && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors[field]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Meter & Fuel */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Meter & Fuel</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['meter_start', 'meter_end', 'fuel_liters', 'fuel_cost'].map((field) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">
                  {FIELD_LIMITS[field].label}
                </label>
                <input
                  name={field}
                  type="number"
                  step="0.1"
                  max={FIELD_LIMITS[field].max}
                  value={form[field]}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${
                    fieldErrors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors[field] && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors[field]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Breakdowns */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Breakdowns / Idle Time</h2>
            <button type="button" onClick={addBreakdown}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Entry</button>
          </div>
          {breakdowns.map((bd, idx) => (
            <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-start p-2 bg-gray-50 rounded-lg">
              <select value={bd.reason_code} onChange={(e) => updateBreakdown(idx, 'reason_code', e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-xs outline-none focus:border-blue-500">
                {BREAKDOWN_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <input type="time" value={bd.start_time} onChange={(e) => updateBreakdown(idx, 'start_time', e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-xs outline-none focus:border-blue-500" />
              <input type="time" value={bd.end_time} onChange={(e) => updateBreakdown(idx, 'end_time', e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-xs outline-none focus:border-blue-500" />
              <input type="number" value={bd.duration_minutes} onChange={(e) => updateBreakdown(idx, 'duration_minutes', e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-xs outline-none focus:border-blue-500" placeholder="Min" />
              <button type="button" onClick={() => removeBreakdown(idx)}
                className="text-red-500 text-xs px-1 pt-2">✕</button>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/logsheets')}
            className="px-4 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Saving...' : isEdit ? 'Update Logsheet' : 'Save Logsheet'}
          </button>
        </div>
      </form>
    </div>
  );
}
