const roleConfig: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-800 ring-purple-600/20' },
  operations_manager: { label: 'Ops Manager', color: 'bg-blue-100 text-blue-800 ring-blue-600/20' },
  finance: { label: 'Finance', color: 'bg-green-100 text-green-800 ring-green-600/20' },
  field_supervisor: { label: 'Field Supervisor', color: 'bg-amber-100 text-amber-800 ring-amber-600/20' },
  operator: { label: 'Operator', color: 'bg-slate-100 text-slate-800 ring-slate-600/20' },
};

export default function RoleBadge({ role }: { role: string }) {
  const config = roleConfig[role] ?? { label: role, color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.color}`}>
      {config.label}
    </span>
  );
}
