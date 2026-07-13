import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { User } from '../api/auth';
import type {
  OperatorDetail, OperatorCertification, Attendance,
  OperatorAllowance, OperatorAnalytics,
} from '../api/logsheet';
import api from '../api/logsheet';
import apiClient from '../api/client';

const tabs = ['Profile', 'Certifications', 'Attendance', 'Allowances', 'Performance'];

export default function OperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [op, setOp] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const canManage = user && ['super_admin', 'operations_manager'].includes(user.role);
  const canMarkAttendance = user && ['super_admin', 'operations_manager', 'field_supervisor'].includes(user.role);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.operators.get(id).then(setOp).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!op) return <div className="p-6 text-red-500">Operator not found</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">&larr; Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900">{op.name}</h1>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${op.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {op.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === i
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && <ProfileTab op={op} canManage={!!canManage} user={user} onSaved={load} />}
      {activeTab === 1 && <CertificationsTab operatorId={op.id} canManage={!!canManage} />}
      {activeTab === 2 && <AttendanceTab operatorId={op.id} records={op.attendance_records || []} canMark={!!canMarkAttendance} />}
      {activeTab === 3 && <AllowancesTab operatorId={op.id} records={op.allowances || []} canManage={!!canManage} />}
      {activeTab === 4 && <PerformanceTab operatorId={op.id} operatorName={op.name} />}
    </div>
  );
}


function ProfileTab({ op, canManage, user, onSaved }: {
  op: OperatorDetail;
  canManage: boolean | null;
  user: User | null;
  onSaved: () => void;
}) {
  const isSelf = !!(user && op.user && user.id === op.user);
  const canEdit = isSelf || !!canManage;

  const [form, setForm] = useState({
    name: op.name,
    phone: op.phone,
    email: op.email,
    address_line1: op.address_line1 || '',
    city: op.city || '',
    state: op.state || '',
    pincode: op.pincode || '',
    license_type: op.license_type,
    license_number: op.license_number,
    license_expiry: op.license_expiry || '',
    license_file: null as File | null,
    certifications: op.certifications,
    experience_years: op.experience_years?.toString() || '',
    date_of_hire: op.date_of_hire || '',
    daily_rate: op.daily_rate?.toString() || '',
    overtime_rate: op.overtime_rate?.toString() || '',
    emergency_contact_name: op.emergency_contact_name || '',
    emergency_contact_phone: op.emergency_contact_phone || '',
    notes: op.notes,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.name === 'license_file' && target.files?.length) {
      setForm({ ...form, license_file: target.files[0] });
    } else {
      setForm({ ...form, [target.name]: target.value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const base = {
        ...form,
        license_file: undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
        overtime_rate: form.overtime_rate ? Number(form.overtime_rate) : null,
        license_expiry: form.license_expiry || null,
        date_of_hire: form.date_of_hire || null,
      };
      if (form.license_file instanceof File) {
        const fd = new FormData();
        for (const [key, value] of Object.entries(base)) {
          if (value !== undefined && value !== null && value !== '') {
            fd.append(key, String(value));
          }
        }
        fd.append('license_file', form.license_file);
        await apiClient.patch(`/operators/${op.id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (canManage) {
        await api.operators.update(op.id, base);
      } else if (isSelf) {
        await api.operators.selfUpdate(op.id, base);
      }
      onSaved();
    } catch { alert('Failed to save'); } finally { setSaving(false); }
  };

  // Avatar initials
  const initials = op.name.trim().split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  // License expiry badge
  const licenseExpiryBadge = () => {
    if (!op.license_expiry) return null;
    const days = Math.ceil((new Date(op.license_expiry).getTime() - Date.now()) / 86400000);
    if (days < 0) return <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Expired</span>;
    if (days < 30) return <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">{days}d left</span>;
    return <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Valid</span>;
  };

  return (
    <div className="space-y-5">

      {/* ── Profile Hero Card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white shadow-md select-none">
              {initials}
            </div>
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
              op.is_active ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{op.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{op.license_type || 'Operator'} · ID #{op.id.slice(0, 8).toUpperCase()}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {isSelf && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Your Profile
                </span>
              )}
              {canManage && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">Manager View</span>
              )}
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                op.is_active
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {op.is_active ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-6 text-center flex-shrink-0">
            <div>
              <p className="text-xl font-bold text-gray-900">{op.experience_years ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Years Exp.</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <p className="text-xl font-bold text-gray-900">{op.date_of_hire ? new Date(op.date_of_hire).getFullYear() : '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Hired</p>
            </div>
            {canManage && op.daily_rate !== null && (
              <>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <p className="text-xl font-bold text-gray-900">₹{Number(op.daily_rate).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Daily Rate</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-column form grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Personal Information ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <SectionHeading icon="👤" title="Personal Information" />
          <ProfileField label="Full Name" name="name" value={form.name} onChange={handleChange} disabled={!canEdit} />
          <ProfileField label="Phone Number" name="phone" value={form.phone} onChange={handleChange} disabled={!canEdit} />
          <ProfileField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} disabled={!canEdit} />
        </div>

        {/* ── Address ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <SectionHeading icon="📍" title="Address" />
          <ProfileField label="Address" name="address_line1" value={form.address_line1} onChange={handleChange} disabled={!canEdit} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProfileField label="City" name="city" value={form.city} onChange={handleChange} disabled={!canEdit} />
            <ProfileField label="State" name="state" value={form.state} onChange={handleChange} disabled={!canEdit} />
          </div>
          <ProfileField label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} disabled={!canEdit} />
        </div>

        {/* ── License & Professional ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeading icon="🪪" title="License & Qualifications" />
            {licenseExpiryBadge()}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProfileField label="License Type" name="license_type" value={form.license_type} onChange={handleChange} disabled={!canEdit} />
            <ProfileField label="License Number" name="license_number" value={form.license_number} onChange={handleChange} disabled={!canEdit} />
          </div>
          <ProfileField label="License Expiry Date" name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange} disabled={!canEdit} />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">License File</label>
            {op.license_file && (
              <div className="mb-2">
                {/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(op.license_file) ? (
                  <a href={op.license_file} target="_blank" rel="noopener noreferrer">
                    <img src={op.license_file} alt="License" className="h-16 rounded border border-gray-200" />
                  </a>
                ) : (
                  <a href={op.license_file} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline hover:text-blue-800">
                    Current License File
                  </a>
                )}
              </div>
            )}
            {canEdit && (
              <input name="license_file" type="file" accept="image/*,.pdf" onChange={handleChange}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50" />
            )}
          </div>
          <ProfileField label="Experience (Years)" name="experience_years" type="number" value={form.experience_years} onChange={handleChange} disabled={!canEdit} />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Certifications / Skills</label>
            <textarea
              name="certifications"
              value={form.certifications}
              onChange={handleChange}
              rows={3}
              disabled={!canEdit}
              placeholder="e.g. Heavy Equipment Operator, Forklift Certified..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 disabled:bg-gray-50 disabled:text-gray-500 resize-none transition"
            />
          </div>
        </div>

        {/* ── Emergency Contact ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <SectionHeading icon="🚨" title="Emergency Contact" />
          <ProfileField label="Contact Name" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} disabled={!canEdit} />
          <ProfileField label="Contact Phone" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} disabled={!canEdit} />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              disabled={!canEdit}
              placeholder="Any additional notes..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 disabled:bg-gray-50 disabled:text-gray-500 resize-none transition"
            />
          </div>
        </div>

      </div>

      {/* ── Employment Details (Manager only) ── */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <SectionHeading icon="💼" title="Employment Details" />
            <span className="ml-auto text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Manager Only</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ProfileField label="Date of Hire" name="date_of_hire" type="date" value={form.date_of_hire} onChange={handleChange} disabled={false} />
            <ProfileField label="Daily Rate (₹)" name="daily_rate" type="number" value={form.daily_rate} onChange={handleChange} disabled={false} />
            <ProfileField label="Overtime Rate (₹/hr)" name="overtime_rate" type="number" value={form.overtime_rate} onChange={handleChange} disabled={false} />
          </div>
        </div>
      )}

      {/* Save Button */}
      {canEdit && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">
            {isSelf && !canManage
              ? 'You can update your personal contact and address details.'
              : 'Editing as manager — all fields are unlocked.'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-base">{icon}</span>
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function ProfileField({ label, name, value, onChange, type = 'text', required, disabled }: {
  label: string; name: string; value: string; onChange: (e: any) => void;
  type?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 disabled:bg-gray-50 disabled:text-gray-500 transition"
      />
    </div>
  );
}

function CertificationsTab({ operatorId, canManage }: { operatorId: string; canManage: boolean }) {
  const [certs, setCerts] = useState<OperatorCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({
    cert_type: '', name: '', cert_number: '', issuing_authority: '',
    issue_date: '', expiry_date: '', notes: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.certifications.list(operatorId).then(setCerts).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [operatorId]);

  const resetForm = () => {
    setForm({ cert_type: '', name: '', cert_number: '', issuing_authority: '', issue_date: '', expiry_date: '', notes: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await api.certifications.update(operatorId, editingId, form);
      } else {
        await api.certifications.create(operatorId, form);
      }
      resetForm();
      load();
    } catch { alert('Failed to save certification'); }
  };

  const handleEdit = (c: OperatorCertification) => {
    setForm({
      cert_type: c.cert_type, name: c.name, cert_number: c.cert_number,
      issuing_authority: c.issuing_authority, issue_date: c.issue_date || '',
      expiry_date: c.expiry_date || '', notes: c.notes,
    });
    setEditingId(c.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certification?')) return;
    try { await api.certifications.delete(operatorId, id); load(); } catch { alert('Failed to delete'); }
  };

  const expiryBadge = (date: string | null) => {
    if (!date) return null;
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-xs bg-red-100 text-red-800 rounded-full px-2 py-0.5">Expired</span>;
    if (days < 30) return <span className="text-xs bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5">{days}d left</span>;
    return <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">{days}d left</span>;
  };

  return (
    <div>
      {canManage && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type *</label>
              <select name="cert_type" value={form.cert_type} onChange={(e) => setForm({ ...form, cert_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">Select...</option>
                {[
                  { value: 'license', label: 'License' },
                  { value: 'safety', label: 'Safety Training' },
                  { value: 'medical', label: 'Medical Clearance' },
                  { value: 'other', label: 'Other' },
                ].map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cert Number</label>
              <input name="cert_number" value={form.cert_number} onChange={(e) => setForm({ ...form, cert_number: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
              <input name="expiry_date" type="date" value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              {editingId ? 'Update' : 'Add Certification'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            )}
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? <div className="p-6 text-center text-gray-500">Loading...</div>
        : certs.length === 0 ? <div className="p-6 text-center text-gray-400">No certifications</div>
        : <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage && <th className="px-4 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{c.cert_type_display}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.cert_number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.expiry_date || '—'}</td>
                  <td className="px-4 py-3">{expiryBadge(c.expiry_date)}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <button onClick={() => handleEdit(c)} className="text-xs text-blue-600 hover:text-blue-700 mr-2">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}

function AttendanceTab({ operatorId, records, canMark }: {
  operatorId: string; records: Attendance[]; canMark: boolean;
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [localRecords, setLocalRecords] = useState<Attendance[]>(records);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [status, setStatus] = useState('present');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const isToday = selectedDate === todayStr;

  useEffect(() => { setLocalRecords(records); }, [records]);

  const markAttendance = async () => {
    try {
      const record = await api.attendance.create({
        operator: operatorId,
        date: selectedDate,
        status,
        check_in: checkIn || null,
        check_out: checkOut || null,
      });
      setLocalRecords([record, ...localRecords.filter((r) => r.date !== selectedDate)]);
    } catch { alert('Failed to mark attendance'); }
  };

  const statusColors: Record<string, string> = {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    half_day: 'bg-yellow-100 text-yellow-800',
    leave: 'bg-purple-100 text-purple-800',
    holiday: 'bg-blue-100 text-blue-800',
  };

  return (
    <div>
      {canMark && isToday && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              {[
                { value: 'present', label: 'Present' },
                { value: 'absent', label: 'Absent' },
                { value: 'half_day', label: 'Half Day' },
                { value: 'leave', label: 'On Leave' },
                { value: 'holiday', label: 'Holiday' },
              ].map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Check In</label>
            <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Check Out</label>
            <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <button onClick={markAttendance}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Mark Attendance
          </button>
        </div>
      )}
      {canMark && !isToday && (
        <p className="text-sm text-gray-400 italic mb-6">Attendance can only be marked for today.</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {localRecords.length === 0
          ? <div className="p-6 text-center text-gray-400">No attendance records</div>
          : <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Shift</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Check In</th>
                  <th className="px-4 py-3 font-medium">Check Out</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Overtime</th>
                </tr>
              </thead>
              <tbody>
                {localRecords.slice(0, 30).map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.shift}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status] || 'bg-gray-100 text-gray-800'}`}>
                        {r.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.check_in || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.check_out || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.total_hours ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.overtime_hours ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}

function AllowancesTab({ operatorId, records, canManage }: {
  operatorId: string; records: OperatorAllowance[]; canManage: boolean;
}) {
  const [localRecords, setLocalRecords] = useState<OperatorAllowance[]>(records);
  const [form, setForm] = useState<Record<string, string>>({ date: '', allowance_type: '', amount: '', notes: '' });

  useEffect(() => { setLocalRecords(records); }, [records]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.allowance_type || !form.amount) return;
    try {
      const rec = await api.allowances.create({
        operator: operatorId,
        date: form.date,
        allowance_type: form.allowance_type,
        amount: Number(form.amount),
        notes: form.notes,
      });
      setLocalRecords([rec, ...localRecords]);
      setForm({ date: '', allowance_type: '', amount: '', notes: '' });
    } catch { alert('Failed to add allowance'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this allowance?')) return;
    try { await api.allowances.delete(id); setLocalRecords(localRecords.filter((r) => r.id !== id)); }
    catch { alert('Failed to delete'); }
  };

  return (
    <div>
      {canManage && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type *</label>
              <select value={form.allowance_type} onChange={(e) => setForm({ ...form, allowance_type: e.target.value })} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">Select...</option>
                {[
                  { value: 'travel', label: 'Travel' },
                  { value: 'food', label: 'Food' },
                  { value: 'accommodation', label: 'Accommodation' },
                  { value: 'hazard', label: 'Hazard Pay' },
                  { value: 'overtime', label: 'Overtime Allowance' },
                  { value: 'other', label: 'Other' },
                ].map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (₹) *</label>
              <input type="number" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <button type="submit"
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Add Allowance
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {localRecords.length === 0
          ? <div className="p-6 text-center text-gray-400">No allowances</div>
          : <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  {canManage && <th className="px-4 py-3 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {localRecords.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.allowance_type_display}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{r.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.notes || '—'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}

function PerformanceTab({ operatorId, operatorName }: { operatorId: string; operatorName: string }) {
  const [analytics, setAnalytics] = useState<OperatorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    api.operators.getAnalytics(operatorId, params).then(setAnalytics).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [operatorId]);

  return (
    <div>
      <div className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <button onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Apply
        </button>
      </div>

      {loading ? <div className="p-6 text-gray-500">Loading...</div>
      : !analytics ? <div className="p-6 text-gray-400">No data</div>
      : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Utilization" value={`${analytics.utilization_percentage}%`}
            subtitle={`${analytics.productive_hours}h productive of ${analytics.total_hours}h total`}
            color={analytics.utilization_percentage >= 70 ? 'text-green-600' : analytics.utilization_percentage >= 50 ? 'text-yellow-600' : 'text-red-600'} />
          <StatCard title="Total Logsheets" value={String(analytics.total_logsheets)} subtitle="In selected period" />
          <StatCard title="Breakdown Incidents" value={String(analytics.breakdown_incidents)}
            subtitle={`${analytics.breakdown_hours}h downtime`} />
          <StatCard title="Overtime Hours" value={String(analytics.total_overtime_hours)} subtitle="Total overtime logged" />
          <StatCard title="Attendance (Present)" value={String(analytics.days_present)}
            subtitle={`${analytics.days_absent} absent, ${analytics.days_on_leave} on leave`} />
          <StatCard title="Hours Breakdown" value={`${analytics.productive_hours}h`}
            subtitle={`${analytics.idle_hours}h idle · ${analytics.breakdown_hours}h breakdown`} />
        </div>
      }
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: { title: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${color || 'text-gray-900'}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
