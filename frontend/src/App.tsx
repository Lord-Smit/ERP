import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import { ToastProvider } from './context/ToastContext';
import EmployeesPage from './pages/EmployeesPage';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceFromLogsheets from './pages/InvoiceFromLogsheets';
import PaymentHistory from './pages/PaymentHistory';
import PaymentReminders from './pages/PaymentReminders';
import ReportsPage from './pages/ReportsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import OperatorApprovals from './pages/OperatorApprovals';
import Dashboard from './pages/Dashboard';
import EquipmentList from './pages/EquipmentList';
import EquipmentForm from './pages/EquipmentForm';
import EquipmentDetail from './pages/EquipmentDetail';
import Categories from './pages/Categories';
import Warehouses from './pages/Warehouses';
import LogsheetList from './pages/LogsheetList';
import LogsheetForm from './pages/LogsheetForm';
import LogsheetDetail from './pages/LogsheetDetail';
import Operators from './pages/Operators';
import OperatorDetail from './pages/OperatorDetail';
import AttendancePage from './pages/AttendancePage';
import AvailabilityPage from './pages/AvailabilityPage';
import CustomerList from './pages/CustomerList';
import CustomerForm from './pages/CustomerForm';
import CustomerDetail from './pages/CustomerDetail';
import QuotationList from './pages/QuotationList';
import QuotationForm from './pages/QuotationForm';
import QuotationDetail from './pages/QuotationDetail';
import CustomerQueries from './pages/CustomerQueries';
import RentalOrderList from './pages/RentalOrderList';
import RentalOrderDetail from './pages/RentalOrderDetail';
import ContractList from './pages/ContractList';
import ContractForm from './pages/ContractForm';
import ContractDetail from './pages/ContractDetail';
import RentalAI from './components/RentalAI';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!isLoading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={!isLoading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/equipment" element={<EquipmentList />} />
              <Route path="/equipment/new" element={<EquipmentForm />} />
              <Route path="/equipment/:id" element={<EquipmentDetail />} />
              <Route path="/equipment/:id/edit" element={<EquipmentForm />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/logsheets" element={<LogsheetList />} />
              <Route path="/logsheets/new" element={<LogsheetForm />} />
              <Route path="/logsheets/:id" element={<LogsheetDetail />} />
              <Route path="/logsheets/:id/edit" element={<LogsheetForm />} />
              <Route path="/operators" element={<Operators />} />
              <Route path="/operators/:id" element={<OperatorDetail />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/availability" element={<AvailabilityPage />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/new" element={<CustomerForm />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/customers/:id/edit" element={<CustomerForm />} />
              <Route path="/quotations" element={<QuotationList />} />
              <Route path="/quotations/new" element={<QuotationForm />} />
              <Route path="/quotations/:id" element={<QuotationDetail />} />
              <Route path="/quotations/:id/edit" element={<QuotationForm />} />
              <Route path="/customer-queries" element={<CustomerQueries />} />
              <Route path="/rental-orders" element={<RentalOrderList />} />
              <Route path="/rental-orders/:id" element={<RentalOrderDetail />} />
              <Route path="/contracts" element={<ContractList />} />
              <Route path="/contracts/new" element={<ContractForm />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/contracts/:id/edit" element={<ContractForm />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/from-logsheets" element={<InvoiceFromLogsheets />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="/payment-history" element={<PaymentHistory />} />
              <Route path="/payment-reminders" element={<PaymentReminders />} />
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'operations_manager']} />}>
                <Route path="/operator-approvals" element={<OperatorApprovals />} />
              </Route>
              <Route path="/reports" element={<ReportsPage />} />
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'operations_manager']} />}>
                <Route path="/employees" element={<EmployeesPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
        {isAuthenticated && <RentalAI />}
      </BrowserRouter>
    </ToastProvider>
  );
}
