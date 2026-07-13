import { useState } from 'react';
import type { SiteEquipmentDeployment } from '../api/crm';
import crmApi from '../api/crm';

export default function DeploymentsTab({ equipmentId, deployments, onUpdate, canEdit }: {
  equipmentId: string; deployments: SiteEquipmentDeployment[]; onUpdate: () => void; canEdit: boolean;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleRemove = async (dep: SiteEquipmentDeployment) => {
    if (!confirm(`Mark ${dep.equipment_name} as removed from ${dep.site_name}?`)) return;
    setSubmitting(dep.id);
    try {
      await crmApi.deployments.update(dep.id, { status: 'removed', end_date: new Date().toISOString().slice(0, 10) });
      onUpdate();
    } catch { alert('Failed to update deployment'); }
    finally { setSubmitting(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-gray-900">Site Deployment History</h4>
      </div>
      {deployments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No deployments recorded for this equipment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Site</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Start Date</th>
                <th className="pb-2 font-medium">End Date</th>
                <th className="pb-2 font-medium">Status</th>
                {canEdit && <th className="pb-2 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {deployments.map((dep) => (
                <tr key={dep.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-900">{dep.site_name}</td>
                  <td className="py-2 text-gray-600">{dep.customer_name}</td>
                  <td className="py-2 text-gray-600">{dep.start_date}</td>
                  <td className="py-2 text-gray-600">{dep.end_date || '—'}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      dep.status === 'deployed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {dep.status === 'deployed' ? 'Deployed' : 'Removed'}
                    </span>
                  </td>
                  {canEdit && dep.status === 'deployed' && (
                    <td className="py-2">
                      <button onClick={() => handleRemove(dep)} disabled={submitting === dep.id}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold disabled:opacity-30 cursor-pointer">
                        {submitting === dep.id ? '...' : 'Mark Removed'}
                      </button>
                    </td>
                  )}
                  {canEdit && dep.status !== 'deployed' && <td className="py-2"></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
