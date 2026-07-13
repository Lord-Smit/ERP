import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { EquipmentDetail as EqDetail, EquipmentSpecification, EquipmentAttachment, MaintenanceRecord, EquipmentTransit, Warehouse } from '../api/equipment';
import api, { getStatusLabel } from '../api/equipment';
import { useAuthStore } from '../store/authStore';
import logsheetApi from '../api/logsheet';
import type { Operator } from '../api/logsheet';
import type { SiteEquipmentDeployment, CustomerSite } from '../api/crm';
import crmApi from '../api/crm';
import DeploymentsTab from './DeploymentsTab';

type Tab = 'details' | 'specs' | 'attachments' | 'maintenance' | 'deployments' | 'transit';

const statusBadgeStyles = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case 'reserved':
      return 'bg-sky-50 text-sky-700 ring-sky-600/20';
    case 'rented':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
    case 'maintenance':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    case 'in_transit':
      return 'bg-purple-50 text-purple-700 ring-purple-600/20';
    case 'retired':
      return 'bg-slate-50 text-slate-700 ring-slate-600/20';
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-600/20';
  }
};

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [eq, setEq] = useState<EqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<SiteEquipmentDeployment[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.equipment.get(id).then((data) => {
      setEq(data);
      crmApi.deployments.list({ equipment: id, page_size: 100 }).then((r) => setDeployments(r.results)).catch(() => {});
      const primary = data.images.find(img => img.is_primary) || data.images[0];
      if (primary) {
        setActiveImageId(prev => {
          if (prev && data.images.some(img => img.id === prev)) {
            return prev;
          }
          return primary.id;
        });
      } else {
        setActiveImageId(null);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    try {
      if (status === 'reserved') await api.equipment.markReserved(id);
      else if (status === 'available') await api.equipment.markAvailable(id);
      else if (status === 'rented') await api.equipment.markRented(id);
      else if (status === 'maintenance') await api.equipment.markMaintenance(id);
      else if (status === 'in_transit') await api.equipment.markInTransit(id);
      else if (status === 'retired') await api.equipment.markRetired(id);
      load();
    } catch { alert('Failed to update status'); }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) return;
    try { await api.equipment.delete(id!); navigate('/equipment'); }
    catch { alert('Failed to delete equipment'); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500 font-medium">Loading asset details...</div>;
  if (!eq) return <div className="text-center py-12 text-gray-500 font-medium">Equipment not found</div>;

  const canEdit = user && ['super_admin', 'operations_manager', 'field_supervisor', 'operator'].includes(user.role);
  const canDelete = user && ['super_admin', 'operations_manager', 'field_supervisor'].includes(user.role);
  const canAssignOperator = user && ['super_admin', 'operations_manager', 'field_supervisor'].includes(user.role);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Overview' },
    { key: 'specs', label: `Specs (${eq.specifications?.length || 0})` },
    { key: 'attachments', label: `Documents (${eq.attachments?.length || 0})` },
    { key: 'maintenance', label: `Maintenance (${eq.maintenance_records?.length || 0})` },
    { key: 'deployments', label: `Deployments (${deployments.length})` },
    { key: 'transit', label: `Transit (${eq.transit_records?.length || 0})` },
  ];

  const inputClass = 'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';
  const labelClass = 'block text-xs font-semibold text-gray-500 mb-1';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs / Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-gray-200">
        <div>
          <Link to="/equipment" className="text-sm font-semibold text-indigo-650 hover:text-indigo-700 flex items-center gap-1.5 transition-colors mb-2">
            <span>&larr;</span> Back to Fleet Inventory
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{eq.name}</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <span className="font-semibold text-gray-700">{eq.brand}</span>
            <span className="text-gray-300">|</span>
            <span>Model: {eq.model}</span>
          </p>
        </div>
        
        {/* Top right action buttons */}
        <div className="flex gap-3 mt-4 md:mt-0">
          {canEdit && (
            <Link to={`/equipment/${eq.id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:text-indigo-600 shadow-sm transition-all duration-150 cursor-pointer">
              Edit Details
            </Link>
          )}
          {canDelete && (
            <button onClick={handleDelete}
              className="inline-flex items-center justify-center px-4 py-2 border border-red-200 text-red-650 bg-red-50 hover:bg-red-105 rounded-xl text-sm font-semibold shadow-sm transition-all duration-150 cursor-pointer">
              Delete Equipment
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details on left, Control panel on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main content - 2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Core Info & Images grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gallery Card */}
            <div className="bg-white rounded-2xl border border-gray-250 shadow-sm overflow-hidden flex flex-col p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Equipment Media</h3>
                {canEdit && (
                  <label className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                    + Upload
                    <input type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !id) return;
                        try {
                          await api.equipment.uploadImage(id, file);
                          load();
                        } catch { alert('Failed to upload image'); }
                        e.target.value = '';
                      }} />
                  </label>
                )}
              </div>
              {eq.images.length === 0 ? (
                <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 p-6">
                  <span className="text-3xl mb-2">📸</span>
                  <p className="text-sm font-medium">No images uploaded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active preview image display */}
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                    <img 
                      src={eq.images.find(img => img.id === activeImageId)?.image || eq.images[0].image} 
                      alt={eq.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  {/* Thumbnails grid with set-primary and delete actions */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {eq.images.map((img) => (
                      <div 
                        key={img.id} 
                        onClick={() => setActiveImageId(img.id)}
                        className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          img.id === activeImageId 
                            ? 'border-indigo-600 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={img.image} alt="" className="w-full h-full object-cover" />
                        
                        {/* Hover actions */}
                        {canEdit && (
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            {!img.is_primary && (
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await api.equipment.setPrimaryImage(eq.id, img.id);
                                    load();
                                  } catch { alert('Failed to set primary image'); }
                                }}
                                title="Make Primary"
                                className="p-1 bg-white hover:bg-gray-100 rounded text-xs font-bold text-gray-700 shadow cursor-pointer transition-all"
                              >
                                ⭐
                              </button>
                            )}
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm('Are you sure you want to delete this image?')) return;
                                try {
                                  await api.equipment.deleteImage(eq.id, img.id);
                                  load();
                                } catch { alert('Failed to delete image'); }
                              }}
                              title="Delete Image"
                              className="p-1 bg-red-600 hover:bg-red-750 rounded text-xs text-white shadow cursor-pointer transition-all"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                        
                        {img.is_primary && (
                          <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shadow">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details Specification Box */}
            <div className="bg-white rounded-2xl border border-gray-250 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Identity & Location</h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-500 font-medium">Serial Number</span>
                    <span className="font-semibold text-gray-905">{eq.serial_number || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-500 font-medium">Category</span>
                    <span className="font-semibold text-indigo-650 bg-indigo-50/50 px-2.5 py-0.5 rounded-full text-xs">{eq.category_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-500 font-medium">Warehouse</span>
                    <span className="font-semibold text-gray-905">{eq.warehouse_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-500 font-medium">Location Detail</span>
                    <span className="font-semibold text-gray-905 truncate max-w-[200px]" title={eq.location_details}>{eq.location_details || '—'}</span>
                  </div>
                </div>
              </div>
              
              {eq.notes && (
                <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Internal Notes</span>
                  <p className="text-xs text-slate-650 italic line-clamp-3">{eq.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Block */}
          <div className="bg-white rounded-2xl border border-gray-250 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5">Rental Rate Structure</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <PremiumPriceCard label="Hourly Rate" value={eq.rental_price_hourly} />
              <PremiumPriceCard label="Daily Rate" value={eq.rental_price_daily} />
              <PremiumPriceCard label="Weekly Rate" value={eq.rental_price_weekly} />
              <PremiumPriceCard label="Monthly Rate" value={eq.rental_price_monthly} />
              <PremiumPriceCard label="Security Deposit" value={eq.deposit_amount} sub="Refundable" highlight />
              <PremiumPriceCard label="Asset Valuation" value={eq.purchase_price} sub="Book Value" />
            </div>
          </div>

          {/* Tab section */}
          <div className="bg-white rounded-2xl border border-gray-250 shadow-sm overflow-hidden">
            {/* Tab headers */}
            <div className="flex border-b border-gray-250 bg-gray-50/50">
              {tabs.map((t) => (
                <button 
                  key={t.key} 
                  onClick={() => setTab(t.key)} 
                  className={`flex-1 py-4 px-6 text-sm font-semibold border-b-2 transition-all text-center cursor-pointer ${
                    tab === t.key 
                      ? 'border-indigo-600 text-indigo-650 bg-white' 
                      : 'border-transparent text-gray-500 hover:text-gray-750 hover:bg-gray-50/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            <div className="p-6">
              {tab === 'details' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-905 mb-2">Fleet Specifications Overview</h4>
                  <p className="text-sm text-gray-650 leading-relaxed">
                    Below you can find full details about this asset's properties, attachments, and maintenance logs. Select the respective tabs above to edit or add logs.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <span className="text-xs text-gray-500 block mb-1">Date Commissioned</span>
                      <span className="text-sm font-semibold text-gray-805">{new Date(eq.created_at).toLocaleDateString(undefined, {dateStyle: 'long'})}</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <span className="text-xs text-gray-500 block mb-1">Last Update Log</span>
                      <span className="text-sm font-semibold text-gray-808">{new Date(eq.updated_at).toLocaleDateString(undefined, {dateStyle: 'long'})}</span>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'specs' && <SpecsTab equipmentId={id!} specs={eq.specifications || []} onUpdate={load} inputClass={inputClass} labelClass={labelClass} canEdit={!!canEdit} />}
              {tab === 'attachments' && <AttachmentsTab equipmentId={id!} attachments={eq.attachments || []} onUpdate={load} inputClass={inputClass} labelClass={labelClass} canEdit={!!canEdit} />}
              {tab === 'maintenance' && <MaintenanceTab equipmentId={id!} records={eq.maintenance_records || []} onUpdate={load} inputClass={inputClass} labelClass={labelClass} canEdit={!!canEdit} />}
              {tab === 'deployments' && <DeploymentsTab equipmentId={id!} deployments={deployments} onUpdate={load} canEdit={!!canEdit} />}
              {tab === 'transit' && <TransitTab equipmentId={id!} records={eq.transit_records || []} onUpdate={load} inputClass={inputClass} labelClass={labelClass} canEdit={!!canEdit} />}
            </div>
          </div>
        </div>

        {/* Right Column (Control Center - 1/3) */}
        <div className="space-y-6">
          
          {/* Status Dashboard card */}
          <div className="bg-white rounded-2xl border border-gray-250 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Availability status</h3>
            
            <div className="flex items-center gap-3.5 mb-6">
              <span className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${statusBadgeStyles(eq.status)}`}>
                {getStatusLabel(eq.status)}
              </span>
            </div>

            {canEdit && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 block mb-2">Change Status</span>
                <div className="grid grid-cols-2 gap-2">
                  {eq.status !== 'reserved' && (
                    <button onClick={() => handleStatusChange('reserved')} className="w-full text-xs font-bold py-2.5 px-3 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer">
                      Reserved
                    </button>
                  )}
                  {eq.status !== 'available' && (
                    <button onClick={() => handleStatusChange('available')} className="w-full text-xs font-bold py-2.5 px-3 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer">
                      Available
                    </button>
                  )}
                  {eq.status !== 'rented' && eq.status !== 'retired' && (
                    <button onClick={() => handleStatusChange('rented')} className="w-full text-xs font-bold py-2.5 px-3 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer">
                      Rented
                    </button>
                  )}
                  {eq.status !== 'maintenance' && eq.status !== 'retired' && (
                    <button onClick={() => handleStatusChange('maintenance')} className="w-full text-xs font-bold py-2.5 px-3 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all cursor-pointer">
                      Maintenance
                    </button>
                  )}
                  {eq.status !== 'in_transit' && eq.status !== 'retired' && (
                    <button onClick={() => handleStatusChange('in_transit')} className="w-full text-xs font-bold py-2.5 px-3 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all cursor-pointer">
                      In Transit
                    </button>
                  )}
                  {eq.status !== 'retired' && (
                    <button onClick={() => handleStatusChange('retired')} className="w-full text-xs font-bold py-2.5 px-3 border border-gray-200 text-gray-705 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
                      Retire
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assigned Operator Card */}
          <OperatorSelectionBox 
            operatorId={eq.operator} 
            operatorName={eq.operator_name}
            equipmentId={eq.id}
            onUpdate={load}
            canAssign={canAssignOperator}
          />
        </div>
      </div>
    </div>
  );
}

/* ====== OPERATOR SELECTION COMPONENT ====== */
function OperatorSelectionBox({ 
  operatorId, 
  operatorName, 
  equipmentId, 
  onUpdate, 
  canAssign 
}: { 
  operatorId: string | null; 
  operatorName: string | null; 
  equipmentId: string; 
  onUpdate: () => void;
  canAssign: boolean | null;
}) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      logsheetApi.operators.list()
        .then((data) => {
          // Filter to active operators
          setOperators(data.filter((op) => op.is_active));
        })
        .catch((err) => console.error('Failed to load operators', err))
        .finally(() => setLoading(false));
    }
  }, [isEditing]);

  const handleAssign = async () => {
    try {
      setLoading(true);
      await api.equipment.update(equipmentId, { operator: selectedId || null });
      setIsEditing(false);
      onUpdate();
    } catch {
      alert('Failed to update operator assignment');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-250 shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Assigned Driver</h3>
        {canAssign && !isEditing && (
          <button 
            onClick={() => {
              setSelectedId(operatorId || '');
              setIsEditing(true);
            }} 
            className="text-xs text-indigo-650 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            ✏️ {operatorId ? 'Change' : 'Assign'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Select Active Driver</label>
            <select 
              value={selectedId} 
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">-- No Driver Assigned --</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name} ({op.license_type || 'No License'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleAssign}
              disabled={loading}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              disabled={loading}
              className="py-2 px-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {operatorId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-gray-250 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0">
                  {getInitials(operatorName || 'OP')}
                </div>
                <div className="min-w-0">
                  <Link to={`/operators/${operatorId}`} className="text-sm font-bold text-gray-905 hover:text-indigo-650 block truncate">
                    {operatorName}
                  </Link>
                  <span className="text-xs text-gray-500 block truncate">Equipment Specialist</span>
                </div>
              </div>

              {/* Quick details about current operator */}
              <div className="p-3.5 bg-gray-50 rounded-xl space-y-2.5 text-xs border border-gray-150">
                <div className="flex justify-between">
                  <span className="text-gray-500">Assignment Status</span>
                  <span className="font-semibold text-emerald-700">Assigned</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Profile Link</span>
                  <Link to={`/operators/${operatorId}`} className="font-semibold text-indigo-600 hover:underline">
                    View Details &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
              <span className="text-3xl mb-1.5">👤</span>
              <p className="text-xs font-semibold text-slate-500 mb-0.5">No operator assigned</p>
              <p className="text-[11px] text-slate-400 text-center max-w-[180px]">Assign an active driver to track logs and usage stats.</p>
              {canAssign && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="mt-3 text-xs font-bold px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
                >
                  Select Operator
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ====== PREMIUM PRICE CARD HELPER ====== */
function PremiumPriceCard({ label, value, highlight, sub }: { label: string; value: number | null; highlight?: boolean; sub?: string }) {
  const formatted = value ? `₹${value.toLocaleString('en-IN')}` : '—';

  return (
    <div className={`rounded-xl p-4 border transition-all duration-150 ${highlight ? 'bg-indigo-50/30 border-indigo-200 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">{label}</span>
      <span className={`text-lg font-bold mt-1 block ${highlight ? 'text-indigo-650' : 'text-gray-905'}`}>{formatted}</span>
      {sub && <span className="text-[10px] text-gray-400 block mt-0.5">{sub}</span>}
    </div>
  );
}

/* ====== SPECS TAB ====== */
function SpecsTab({ equipmentId, specs, onUpdate, inputClass, labelClass, canEdit }: {
  equipmentId: string; specs: EquipmentSpecification[]; onUpdate: () => void; inputClass: string; labelClass: string; canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ key: '', value: '', unit: '' });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setForm({ key: '', value: '', unit: '' }); setEditId(null); setAdding(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.key.trim() || !form.value.trim()) return;
    setSubmitting(true);
    try {
      if (editId) await api.equipment.specs.update(equipmentId, editId, form);
      else await api.equipment.specs.create(equipmentId, form);
      reset(); onUpdate();
    } catch { alert('Failed to save specification'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (s: EquipmentSpecification) => {
    setForm({ key: s.key, value: s.value, unit: s.unit });
    setEditId(s.id); setAdding(true);
  };

  const handleDelete = async (specId: string) => {
    if (!confirm('Delete this specification?')) return;
    try { await api.equipment.specs.delete(equipmentId, specId); onUpdate(); }
    catch { alert('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Specifications</h3>
        {canEdit && !adding && <button onClick={() => setAdding(true)} className="text-xs text-indigo-650 hover:text-indigo-800 font-semibold cursor-pointer">+ Add Spec</button>}
      </div>
      {adding && (
        <form onSubmit={handleSubmit} className="flex gap-3 items-end mb-4 p-4 bg-gray-50 border border-gray-150 rounded-xl flex-wrap md:flex-nowrap">
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Key *</label>
            <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required className={inputClass} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Value *</label>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required className={inputClass} />
          </div>
          <div className="w-24 shrink-0">
            <label className={labelClass}>Unit</label>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm">
              {submitting ? '...' : editId ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={reset} className="px-4 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
          </div>
        </form>
      )}
      {specs.length === 0 ? <p className="text-sm text-gray-400 italic py-4">No specifications logged.</p>
      : <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                {canEdit && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {specs.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/55">
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.key}</td>
                  <td className="px-4 py-3 text-gray-650">{s.value}</td>
                  <td className="px-4 py-3 text-gray-500">{s.unit || '—'}</td>
                  {canEdit && <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(s)} className="text-xs text-indigo-650 hover:text-indigo-850 font-semibold mr-3 cursor-pointer">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-650 hover:text-red-850 font-semibold cursor-pointer">Delete</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ====== ATTACHMENTS TAB ====== */
function AttachmentsTab({ equipmentId, attachments, onUpdate, inputClass, labelClass, canEdit }: {
  equipmentId: string; attachments: EquipmentAttachment[]; onUpdate: () => void; inputClass: string; labelClass: string; canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; file_type: string; issue_date: string; expiry_date: string; file: File | null }>({ name: '', file_type: 'other', issue_date: '', expiry_date: '', file: null });
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!editingId;

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', file_type: 'other', issue_date: '', expiry_date: '', file: null });
    setAdding(true);
  };

  const openEdit = (a: EquipmentAttachment) => {
    setAdding(true);
    setEditingId(a.id);
    setForm({
      name: a.name,
      file_type: a.file_type,
      issue_date: a.issue_date || '',
      expiry_date: a.expiry_date || '',
      file: null,
    });
  };

  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
    setForm({ name: '', file_type: 'other', issue_date: '', expiry_date: '', file: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!isEditing && !form.file) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('file_type', form.file_type);
      if (form.issue_date) fd.append('issue_date', form.issue_date);
      if (form.expiry_date) fd.append('expiry_date', form.expiry_date);
      if (form.file) fd.append('file', form.file);

      if (isEditing) {
        await api.equipment.attachments.update(equipmentId, editingId, fd);
      } else {
        await api.equipment.attachments.create(equipmentId, fd);
      }
      closeForm();
      onUpdate();
    } catch {
      alert(isEditing ? 'Failed to update attachment' : 'Failed to upload attachment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (attId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    setDeleting(attId);
    try {
      await api.equipment.attachments.delete(equipmentId, attId);
      onUpdate();
    } catch {
      alert('Failed to delete attachment');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Documents</h3>
        {canEdit && !adding && <button onClick={openAdd} className="text-xs text-indigo-650 hover:text-indigo-800 font-semibold cursor-pointer">+ Upload File</button>}
      </div>
      {(adding || isEditing) && (
        <form onSubmit={handleSubmit} className="flex gap-3 items-end mb-4 p-4 bg-gray-50 border border-gray-150 rounded-xl flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className={labelClass}>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
          </div>
          <div className="w-48 shrink-0">
            <label className={labelClass}>Type</label>
            <select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })} className={inputClass}>
              <option value="manual">Manual</option>
              <option value="certificate">Certificate</option>
              <option value="inspection">Inspection Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          {form.file_type === 'certificate' && (
            <>
              <div className="w-36 shrink-0">
                <label className={labelClass}>Issue Date</label>
                <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inputClass} />
              </div>
              <div className="w-36 shrink-0">
                <label className={labelClass}>Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} />
              </div>
            </>
          )}
          <div className="flex-1 min-w-[150px]">
            <label className={labelClass}>File {!isEditing ? '*' : ''}</label>
            <input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} required={!isEditing} className="text-sm border border-gray-300 rounded-xl p-2 w-full bg-white focus:border-indigo-500" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || (!isEditing && !form.file)}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm">
              {submitting ? '...' : isEditing ? 'Update' : 'Upload'}
            </button>
            <button type="button" onClick={closeForm} className="px-4 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
          </div>
        </form>
      )}
      {attachments.length === 0 ? <p className="text-sm text-gray-400 italic py-4">No attachments uploaded.</p>
      : <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium text-right">Link</th>
                {canEdit && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attachments.map((a) => {
                const today = new Date();
                const expiry = a.expiry_date ? new Date(a.expiry_date) : null;
                const isExpired = expiry && expiry < today;
                const isExpiring = expiry && !isExpired && expiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                return (
                <tr key={a.id} className="hover:bg-gray-50/55">
                  <td className="px-4 py-3 font-semibold text-gray-905">{a.name}</td>
                  <td className="px-4 py-3 text-gray-650">
                    <span className="text-xs bg-slate-100 text-slate-700 font-semibold rounded px-2.5 py-1 uppercase">{a.file_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    {expiry ? (
                      <span className={`text-xs font-semibold rounded px-2 py-1 ${isExpired ? 'bg-red-100 text-red-700' : isExpiring ? 'bg-yellow-100 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                        {isExpired ? 'Expired' : isExpiring ? 'Expiring' : expiry.toLocaleDateString(undefined, {dateStyle: 'medium'})}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.uploaded_at).toLocaleDateString(undefined, {dateStyle: 'medium'})}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={a.file} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-650 hover:text-indigo-850 font-bold">Download &darr;</a>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(a)} disabled={!!editingId}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50 disabled:opacity-30 cursor-pointer">Edit</button>
                        <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded hover:bg-red-50 disabled:opacity-30 cursor-pointer">
                          {deleting === a.id ? '...' : 'Delete'}
                        </button>
                      </div>
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
  );
}

/* ====== MAINTENANCE TAB ====== */
function MaintenanceTab({ equipmentId, records, onUpdate, inputClass, labelClass, canEdit }: {
  equipmentId: string; records: MaintenanceRecord[]; onUpdate: () => void; inputClass: string; labelClass: string; canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    date: new Date().toISOString().slice(0, 10), maintenance_type: 'preventive', description: '',
    cost: '', performed_by: '', next_due_date: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!editingId;

  const resetForm = () => {
    setForm({ date: new Date().toISOString().slice(0, 10), maintenance_type: 'preventive', description: '', cost: '', performed_by: '', next_due_date: '', notes: '' });
    setEditingId(null);
    setAdding(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ date: new Date().toISOString().slice(0, 10), maintenance_type: 'preventive', description: '', cost: '', performed_by: '', next_due_date: '', notes: '' });
    setAdding(true);
  };

  const openEdit = (r: MaintenanceRecord) => {
    setAdding(true);
    setEditingId(r.id);
    setForm({
      date: r.date.slice(0, 10),
      maintenance_type: r.maintenance_type,
      description: r.description,
      cost: r.cost?.toString() || '',
      performed_by: r.performed_by,
      next_due_date: r.next_due_date || '',
      notes: r.notes || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.description) return;
    setSubmitting(true);
    try {
      const payload = { ...form, cost: form.cost ? Number(form.cost) : null, next_due_date: form.next_due_date || null };
      if (isEditing) {
        await api.equipment.maintenance.update(equipmentId, editingId, payload);
      } else {
        await api.equipment.maintenance.create(equipmentId, payload);
      }
      resetForm();
      onUpdate();
    } catch { alert(isEditing ? 'Failed to update maintenance record' : 'Failed to save maintenance record'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Delete this maintenance record?')) return;
    setDeleting(recordId);
    try {
      await api.equipment.maintenance.delete(equipmentId, recordId);
      onUpdate();
    } catch { alert('Failed to delete maintenance record'); }
    finally { setDeleting(null); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Maintenance History</h3>
        {canEdit && !adding && <button onClick={openAdd} className="text-xs text-indigo-650 hover:text-indigo-800 font-semibold cursor-pointer">+ Log Event</button>}
      </div>
      {(adding || isEditing) && (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border border-gray-150 rounded-xl mb-4">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} className={inputClass}>
              <option value="preventive">Preventive</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Cost (₹)</label>
            <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Performed By</label>
            <input value={form.performed_by} onChange={(e) => setForm({ ...form, performed_by: e.target.value })} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Next Due Date</label>
            <input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} className={inputClass} />
          </div>
          <div className="flex gap-2 items-end justify-end">
            <button type="submit" disabled={submitting}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm">
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
          </div>
        </form>
      )}
      {records.length === 0 ? <p className="text-sm text-gray-400 italic py-4">No maintenance logs found.</p>
      : <div className="space-y-4">
          {records.map((r) => (
            <div key={r.id} className="p-4 bg-gray-50 hover:bg-gray-100/50 transition-colors border border-gray-150 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center font-semibold rounded-full px-2.5 py-0.5 text-xs ${
                    r.maintenance_type === 'preventive' ? 'bg-blue-55 text-blue-700' :
                    r.maintenance_type === 'repair' ? 'bg-red-55 text-red-705' : 'bg-slate-100 text-slate-700'
                  }`}>{r.maintenance_type}</span>
                  <span className="font-semibold text-gray-700">{new Date(r.date).toLocaleDateString(undefined, {dateStyle: 'medium'})}</span>
                </div>
                <div className="flex items-center gap-3">
                  {r.cost && <span className="font-bold text-gray-800">₹{Number(r.cost).toLocaleString()}</span>}
                  {r.performed_by && <span>Contractor: <strong className="text-gray-700">{r.performed_by}</strong></span>}
                </div>
              </div>
              <p className="text-sm text-gray-750 font-medium leading-relaxed">{r.description}</p>
              <div className="flex items-center justify-between mt-2.5">
                <div>
                  {r.next_due_date && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50/50 border border-amber-100 px-2.5 py-1 w-max rounded-lg">
                      <span>📅</span> Next Maintenance Due: <strong>{new Date(r.next_due_date).toLocaleDateString(undefined, {dateStyle: 'medium'})}</strong>
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} disabled={!!editingId}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50 disabled:opacity-30 cursor-pointer">Edit</button>
                    <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded hover:bg-red-50 disabled:opacity-30 cursor-pointer">
                      {deleting === r.id ? '...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

/* ====== TRANSIT TAB ====== */
function TransitTab({ equipmentId, records, onUpdate, inputClass, labelClass, canEdit }: {
  equipmentId: string; records: EquipmentTransit[]; onUpdate: () => void; inputClass: string; labelClass: string; canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sites, setSites] = useState<CustomerSite[]>([]);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    route_type: 'warehouse_to_site' as 'warehouse_to_site' | 'site_to_site',
    source_warehouse: '',
    source_site: '',
    destination_site: '',
    status: 'in_transit' as 'in_transit' | 'completed' | 'cancelled',
    cost: '',
    notes: '',
  });

  const isEditing = !!editingId;

  useEffect(() => {
    if (adding || isEditing) {
      api.warehouses.list().then(setWarehouses).catch(() => {});
      crmApi.sites.list().then(setSites).catch(() => {});
    }
  }, [adding, isEditing]);

  const reset = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      route_type: 'warehouse_to_site',
      source_warehouse: '',
      source_site: '',
      destination_site: '',
      status: 'in_transit',
      cost: '',
      notes: '',
    });
    setEditingId(null);
    setAdding(false);
  };

  const handleEdit = (r: EquipmentTransit) => {
    setEditingId(r.id);
    setForm({
      date: r.date,
      route_type: r.route_type,
      source_warehouse: r.source_warehouse || '',
      source_site: r.source_site || '',
      destination_site: r.destination_site || '',
      status: r.status,
      cost: r.cost.toString(),
      notes: r.notes || '',
    });
    setAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination_site) {
      alert('Destination Site is required');
      return;
    }
    if (form.route_type === 'warehouse_to_site' && !form.source_warehouse) {
      alert('Source Warehouse is required');
      return;
    }
    if (form.route_type === 'site_to_site' && !form.source_site) {
      alert('Source Site is required');
      return;
    }

    setSubmitting(true);
    const payload: Record<string, any> = {
      date: form.date,
      route_type: form.route_type,
      destination_site: form.destination_site,
      status: form.status,
      cost: Number(form.cost) || 0.0,
      notes: form.notes,
      source_warehouse: form.route_type === 'warehouse_to_site' ? form.source_warehouse : null,
      source_site: form.route_type === 'site_to_site' ? form.source_site : null,
    };

    try {
      if (isEditing) {
        await api.equipment.transit.update(equipmentId, editingId, payload);
      } else {
        await api.equipment.transit.create(equipmentId, payload);
      }
      reset();
      onUpdate();
    } catch {
      alert('Failed to save transit record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (transitId: string) => {
    if (!confirm('Are you sure you want to delete this transit log?')) return;
    setDeleting(transitId);
    try {
      await api.equipment.transit.delete(equipmentId, transitId);
      onUpdate();
    } catch {
      alert('Failed to delete transit record');
    } finally {
      setDeleting(null);
    }
  };

  const getRouteText = (r: EquipmentTransit) => {
    if (r.route_type === 'warehouse_to_site') {
      return `${r.source_warehouse_name || 'Warehouse'} ➔ ${r.destination_site_name || 'Site'}`;
    }
    return `${r.source_site_name || 'Site'} ➔ ${r.destination_site_name || 'Site'}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'cancelled':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      default:
        return 'bg-purple-50 text-purple-700 ring-purple-600/20';
    }
  };

  const getStatusLabelText = (status: string) => {
    if (status === 'in_transit') return 'In Transit';
    if (status === 'completed') return 'Completed';
    return 'Cancelled';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Transit Log</h3>
        {canEdit && !adding && (
          <button onClick={() => setAdding(true)} className="text-xs text-indigo-650 hover:text-indigo-800 font-semibold cursor-pointer">
            + Log Transit
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-150 rounded-xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input type="date" name="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Route Type *</label>
              <select value={form.route_type} onChange={(e) => setForm({ ...form, route_type: e.target.value as any, source_warehouse: '', source_site: '' })} className={inputClass}>
                <option value="warehouse_to_site">Warehouse to Site</option>
                <option value="site_to_site">Site to Site</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Cost (₹) *</label>
              <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required className={inputClass} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {form.route_type === 'warehouse_to_site' ? (
              <div>
                <label className={labelClass}>Source Warehouse *</label>
                <select value={form.source_warehouse} onChange={(e) => setForm({ ...form, source_warehouse: e.target.value })} required className={inputClass}>
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}> — {w.city}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Source Customer Site *</label>
                <select value={form.source_site} onChange={(e) => setForm({ ...form, source_site: e.target.value })} required className={inputClass}>
                  <option value="">-- Select Source Site --</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.customer})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Destination Customer Site *</label>
              <select value={form.destination_site} onChange={(e) => setForm({ ...form, destination_site: e.target.value })} required className={inputClass}>
                <option value="">-- Select Destination Site --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.customer})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Transit Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className={inputClass}>
                <option value="in_transit">In Transit</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} placeholder="Vehicle details, transport agent, etc." />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="submit" disabled={submitting} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer shadow-sm">
              {submitting ? 'Saving...' : isEditing ? 'Update Log' : 'Save Log'}
            </button>
            <button type="button" onClick={reset} className="px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-705 hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">No transit records logged.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Notes</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-905">
                    {new Date(r.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3 text-gray-750 font-medium">
                    {getRouteText(r)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusBadge(r.status)}`}>
                      {getStatusLabelText(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-bold">
                    ₹{r.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate" title={r.notes}>
                    {r.notes || '—'}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right flex justify-end gap-3 mt-1.5">
                      <button onClick={() => handleEdit(r)} disabled={adding} className="text-xs text-indigo-650 hover:text-indigo-850 font-semibold cursor-pointer">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="text-xs text-red-650 hover:text-red-850 font-semibold cursor-pointer">
                        {deleting === r.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
