import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import RoleBadge from './RoleBadge';
import logsheetApi from '../api/logsheet';

const icons: Record<string, string> = {
  Dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  Equipment: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  Categories: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  Warehouses: 'M3 21V9m3 12V9m6 12V9m3 12V9M3 3l9-2 9 2M3 3v2m0-2h18m0 0v2',
  Customers: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  Logsheets: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  Operators: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'Operator Approvals': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  Employees: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  Attendance: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  Availability: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  Quotations: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'Rental Orders': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'Customer Queries': 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  Contracts: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  Invoices: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  'Payment History': 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  'Reminders': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  Reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};

const navItems = [
  { label: 'Dashboard', path: '/dashboard', roles: ['super_admin', 'operations_manager', 'finance', 'field_supervisor', 'operator'] },
  { label: 'Equipment', path: '/equipment', roles: ['super_admin', 'operations_manager', 'field_supervisor', 'operator', 'finance'] },
  { label: 'Categories', path: '/categories', roles: ['super_admin', 'operations_manager'] },
  { label: 'Warehouses', path: '/warehouses', roles: ['super_admin', 'operations_manager'] },
  { label: 'Customers', path: '/customers', roles: ['super_admin', 'operations_manager', 'finance', 'field_supervisor'] },
  { label: 'Logsheets', path: '/logsheets', roles: ['super_admin', 'operations_manager', 'field_supervisor', 'operator'] },
  { label: 'Operators', path: '/operators', roles: ['super_admin', 'operations_manager', 'field_supervisor', 'finance'] },
  { label: 'Operator Approvals', path: '/operator-approvals', roles: ['super_admin', 'operations_manager'] },
  { label: 'Employees', path: '/employees', roles: ['super_admin', 'operations_manager'] },
  { label: 'Attendance', path: '/attendance', roles: ['super_admin', 'operations_manager', 'field_supervisor'] },
  { label: 'Availability', path: '/availability', roles: ['super_admin', 'operations_manager', 'field_supervisor'] },
  { label: 'Quotations', path: '/quotations', roles: ['super_admin', 'operations_manager', 'finance', 'field_supervisor'] },
  { label: 'Rental Orders', path: '/rental-orders', roles: ['super_admin', 'operations_manager', 'field_supervisor', 'finance'] },
  { label: 'Customer Queries', path: '/customer-queries', roles: ['super_admin', 'operations_manager', 'finance'] },
  { label: 'Contracts', path: '/contracts', roles: ['super_admin', 'operations_manager', 'field_supervisor', 'finance'] },
  { label: 'Invoices', path: '/invoices', roles: ['super_admin', 'operations_manager', 'finance'] },
  { label: 'Payment History', path: '/payment-history', roles: ['super_admin', 'operations_manager', 'finance'] },
  { label: 'Reminders', path: '/payment-reminders', roles: ['super_admin', 'operations_manager', 'finance'] },
  { label: 'Reports', path: '/reports', roles: ['super_admin', 'operations_manager', 'finance', 'field_supervisor'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const filteredItems = navItems.filter((item) => user && item.roles.includes(user.role));

  const handleGoToProfile = async () => {
    if (!user) return;
    try {
      const operators = await logsheetApi.operators.list();
      const mine = operators.find((op) => op.user === user.id);
      if (mine) {
        navigate(`/operators/${mine.id}`);
        onClose();
      } else {
        alert('No operator profile linked to your account. Please contact your manager.');
      }
    } catch {
      alert('Could not load your profile. Please try again.');
    }
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Mobile overlay sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200 shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">ERP Rental</h1>
            {user && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <span className="truncate">{user.email}</span>
                <RoleBadge role={user.role} />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={icons[item.label]} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 shrink-0 space-y-1">
          {user?.role === 'operator' && (
            <button
              onClick={handleGoToProfile}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </button>
          )}
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
