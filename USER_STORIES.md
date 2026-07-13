ERP User Stories (by Role)

================================================================================
SUPER ADMIN
================================================================================

Full system ownership: configuration, user management, and oversight across all modules.

1.  As a super admin, I want to manage all system users (create, edit, delete, assign roles) so that the right people have appropriate access.
2.  As a super admin, I want to manage equipment categories (hierarchical) and warehouses so that the master data structure is maintained.
3.  As a super admin, I want to view all data across every module - equipment, customers, contracts, quotations, invoices, operators, logsheets - so that I can audit the entire system.
4.  As a super admin, I want to approve/reject operator registrations with reasons so that only authorized personnel enter the system.
5.  As a super admin, I want to view financial reports (revenue trends, aging buckets, overdue invoices) so that I can monitor company-wide financial health.
6.  As a super admin, I want to see a dashboard with all pending actions and recent activity across the organization so that I stay informed.


================================================================================
OPERATIONS MANAGER
================================================================================

Day-to-day operational control: approvals, scheduling, personnel management, and operational oversight.

1.  As an operations manager, I want to view pending operator registrations with full profile details so that I can approve or reject them with a reason.
2.  As an operations manager, I want to manage all system users (create, edit, delete, assign roles) alongside super admins.
3.  As an operations manager, I want to review draft quotations and approve them before they are sent to customers so that pricing is controlled.
4.  As an operations manager, I want to approve/reject/flag submitted logsheets so that operator hours are verified before billing.
5.  As an operations manager, I want to create operator records with license type, daily rate, overtime rate, and emergency contact so that personnel are managed.
6.  As an operations manager, I want to track operator certifications with expiry dates so that only qualified operators are deployed.
7.  As an operations manager, I want to set operator availability status so that scheduling decisions are informed.
8.  As an operations manager, I want to mark daily attendance (present/absent/half-day/leave) for operators in a grid so that payroll is supported.
9.  As an operations manager, I want to view operator analytics (utilization, hours breakdown, performance) so that workforce efficiency is evaluated.
10. As an operations manager, I want to manage equipment inventory - add/edit equipment, upload images/specs/attachments, record maintenance, and change status - so that the fleet is accurately tracked.
11. As an operations manager, I want to view all active rental orders with equipment and customer site details so that I can track ongoing rentals.
12. As an operations manager, I want to mark rental orders as completed or cancelled so that equipment is freed for redeployment.
13. As an operations manager, I want to deploy equipment to customer sites and track deployment status so that asset locations are always known.
14. As an operations manager, I want to see certificate/contract expiry alerts on the dashboard so that renewals happen on time.
15. As an operations manager, I want to manage customer inquiries/leads, convert them to quotations, or mark them as lost with a reason so that the sales pipeline is accurate.
16. As an operations manager, I want to see a dashboard with pending quotations, queries, active rentals, and recent activity so that I know what needs attention.


================================================================================
FINANCE
================================================================================

Monetary control: invoicing, payments, collections, and financial reporting.

1.  As a finance user, I want to create invoices linked to contracts or quotations with auto-generated invoice numbers so that billing is systematic.
2.  As a finance user, I want to add line items and tax to invoices so that customers are billed correctly.
3.  As a finance user, I want to mark an invoice as sent so that the billing status progresses through its lifecycle.
4.  As a finance user, I want to record payments against invoices (cash/cheque/bank transfer/online) with reference numbers and dates so that receivables are tracked.
5.  As a finance user, I want the invoice status to auto-update to "paid" when the full amount is received so that the system reflects reality.
6.  As a finance user, I want to cancel an invoice if needed so that incorrect bills are voided.
7.  As a finance user, I want to auto-generate an invoice from logsheet hours for a specific contract and date range so that operator time is billed efficiently.
8.  As a finance user, I want to view all payments with date range filtering so that I can reconcile accounts.
9.  As a finance user, I want to create payment reminders against invoices with follow-up type (email/phone/sms/visit) and due dates so that collections are proactive.
10. As a finance user, I want to resolve payment reminders when payments are received so that the follow-up list stays current.
11. As a finance user, I want to view invoice stats (revenue, pending, overdue), aging buckets, and revenue trends on charts so that I can monitor financial health at a glance.
12. As a finance user, I want to see overdue invoices with aging and a combined view of payment reminders plus contract expiry alerts so that collections and renewals are prioritized.
13. As a finance user, I want to download invoices and payment history as PDFs so that I can share them with customers offline.
14. As a finance user, I want to manage customer inquiries/leads alongside operations so that I can track potential revenue from the pipeline.


================================================================================
FIELD SUPERVISOR
================================================================================

On-ground execution: equipment handling, daily logs, attendance, and site operations.

1.  As a field supervisor, I want to add new equipment with brand, model, serial number, category, warehouse, and rental pricing so that inventory records are complete.
2.  As a field supervisor, I want to upload multiple equipment images (mark one as primary), add key-value specifications, and attach documents (manuals, certificates) with expiry dates so that equipment records are rich and compliant.
3.  As a field supervisor, I want to record maintenance history (preventive/repair/inspection) with cost and next-due date so that upkeep is tracked.
4.  As a field supervisor, I want to change equipment status (available/reserved/rented/maintenance/retired) as the asset moves through its lifecycle.
5.  As a field supervisor, I want to filter equipment by status, category, or warehouse and search by name/serial so that I can quickly find what I need.
6.  As a field supervisor, I want to view certificate expiry alerts for equipment so that I can schedule renewals before they lapse.
7.  As a field supervisor, I want to create daily logsheets for equipment with shift type, timing, hours breakdown (productive/idle/breakdown), and meter readings so that usage is accurately tracked.
8.  As a field supervisor, I want to record fuel consumption (liters, rate, vendor, receipt number) on logsheets so that fuel costs are captured per shift.
9.  As a field supervisor, I want to log breakdowns with reason codes (mechanical/electrical/hydraulic/etc.), start/end times, and duration so that equipment issues are documented.
10. As a field supervisor, I want to assign operators to logsheets with check-in/check-out times and overtime tracking so that personnel hours are captured per shift.
11. As a field supervisor, I want to submit logsheets for approval so that operations management can verify the data.
12. As a field supervisor, I want to mark daily attendance (present/absent/half-day/leave/holiday) for operators using a date-navigable grid so that attendance records are up to date.
13. As a field supervisor, I want to view and manage operator availability on a calendar so that I can schedule shifts effectively.
14. As a field supervisor, I want to create and edit customer records, add multiple sites per customer with addresses and contacts so that delivery locations are correct.
15. As a field supervisor, I want to log customer activities (calls, visits, emails, meetings) with follow-up dates so that field interactions are tracked.
16. As a field supervisor, I want to deploy equipment to customer sites and mark it as removed when retrieved so that deployment records are current.
17. As a field supervisor, I want to view contracts and their line items for the customers and sites I work with so that I know what equipment is committed where.


================================================================================
OPERATOR
================================================================================

Field workforce: personal profile, time confirmation, and daily participation.

1.  As an operator, I want to register myself with my personal details, license info, emergency contact, and address so that I can join the system.
2.  As an operator, I want to see the reason if my registration is rejected so that I understand what to correct.
3.  As an operator, I want to log in with my email and password so that I can access my profile and logsheets.
4.  As an operator, I want to update my own profile (name, phone, address, emergency contact) so that my information stays current without changing sensitive employment fields.
5.  As an operator, I want to check in and out on logsheets assigned to me so that my working hours are officially recorded.
6.  As an operator, I want to review and approve logsheets that I worked on so that I confirm the hours and breakdowns are accurate before they go to management.


================================================================================
SUMMARY
================================================================================

Total: 59 user stories across 5 roles - super_admin, operations_manager, finance, field_supervisor, and operator.
