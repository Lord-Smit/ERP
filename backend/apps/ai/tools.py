"""
RENTAL AI — Tool Functions (Service Layer)
Each function delegates to the shared service layer and returns structured dicts.
"""


# ── Equipment ──────────────────────────────────────────────────────────────

def check_equipment_availability(status: str = None, **kwargs) -> dict:
    """Return equipment list filtered by optional status."""
    from apps.equipment.services import check_equipment_availability as svc
    return svc(status=status)


def get_equipment_details(name: str = None, equipment_id: str = None, **kwargs) -> dict:
    """Return full details for a single equipment by name or ID."""
    from apps.equipment.services import get_equipment_details as svc
    return svc(name=name, equipment_id=equipment_id)


def list_idle_equipment(days: int = 7, **kwargs) -> dict:
    """List equipment that is currently idle (status=available)."""
    from apps.equipment.services import list_idle_equipment as svc
    return svc(days=days)


# ── Customers ──────────────────────────────────────────────────────────────

def search_customer(query: str, **kwargs) -> dict:
    """Search customers by name, email, or phone."""
    from apps.crm.services import search_customers as svc
    return svc(query=query)


# ── Operators ──────────────────────────────────────────────────────────────

def search_operator(query: str = None, license_type: str = None, **kwargs) -> dict:
    """Search operators by name or license type."""
    from apps.logsheet.services import search_operators as svc
    return svc(query=query, license_type=license_type)


def list_employees(role: str = None, **kwargs) -> dict:
    """Return the list of active employees/users in the system."""
    from apps.accounts.services import list_employees as svc
    return svc(role=role)


def list_expiring_certs(days: int = 30, **kwargs) -> dict:
    """List operator licenses and equipment certs expiring within N days."""
    from apps.logsheet.services import list_expiring_operator_licenses
    from apps.equipment.services import list_expiring_equipment_certificates

    operator_data = list_expiring_operator_licenses(days=days)
    equip_data = list_expiring_equipment_certificates(days=days)

    return {
        'check_window_days': days,
        'expiring_operator_licenses': operator_data['expiring_operator_licenses'],
        'expired_operator_licenses': operator_data['expired_operator_licenses'],
        'expiring_equipment_certs': equip_data['expiring_equipment_certs'],
        'expired_equipment_certs': equip_data['expired_equipment_certs'],
    }


# ── Quotations ──────────────────────────────────────────────────────────────

def get_quotation(quotation_number: str = None, customer_name: str = None, **kwargs) -> dict:
    """Get quotation details by number or customer name."""
    from apps.quotations.services import get_quotation as svc
    return svc(quotation_number=quotation_number, customer_name=customer_name)


def list_quotations(status: str = None, customer_name: str = None, **kwargs) -> dict:
    """List quotations filtered by status and/or customer name."""
    from apps.quotations.services import list_quotations as svc
    return svc(status=status, customer_name=customer_name)


# ── Contracts ──────────────────────────────────────────────────────────────

def get_contract(contract_number: str = None, customer_name: str = None, **kwargs) -> dict:
    """Get contract details by number or customer name."""
    from apps.crm.services import get_contract as svc
    return svc(contract_number=contract_number, customer_name=customer_name)


# ── Invoices ──────────────────────────────────────────────────────────────

def get_invoice(invoice_number: str = None, customer_name: str = None, **kwargs) -> dict:
    """Get invoice details by number or customer name."""
    from apps.invoices.services import get_invoice as svc
    return svc(invoice_number=invoice_number, customer_name=customer_name)


def list_overdue_invoices(**kwargs) -> dict:
    """Return all invoices that are overdue."""
    from apps.invoices.services import list_overdue_invoices as svc
    return svc()


def get_invoice_summary(**kwargs) -> dict:
    """Return invoice stats by status."""
    from apps.invoices.services import get_invoice_summary as svc
    return svc()


# ── Rental Orders ──────────────────────────────────────────────────────────

def get_rental_history(customer_name: str = None, equipment_name: str = None, **kwargs) -> dict:
    """List rental orders filtered by customer or equipment."""
    from apps.quotations.services import get_rental_history as svc
    return svc(customer_name=customer_name, equipment_name=equipment_name)


# ── Logsheets ──────────────────────────────────────────────────────────────

def search_logsheets(
    equipment_name: str = None,
    operator_name: str = None,
    date_from: str = None,
    date_to: str = None,
    **kwargs,
) -> dict:
    """Search logsheets by equipment, operator, or date range."""
    from apps.logsheet.services import search_logsheets as svc
    return svc(
        equipment_name=equipment_name,
        operator_name=operator_name,
        date_from=date_from,
        date_to=date_to,
    )


# ── Dashboard ──────────────────────────────────────────────────────────────

def get_dashboard_summary(**kwargs) -> dict:
    """Return key ERP dashboard metrics."""
    from apps.dashboard.services import get_dashboard_summary as svc
    return svc()


def get_revenue_report(**kwargs) -> dict:
    """Get detailed revenue and aging stats report."""
    from apps.invoices.services import get_revenue_report as svc
    return svc()


def get_revenue_trend(**kwargs) -> dict:
    """Get monthly revenue trend for the last 12 months."""
    from apps.invoices.services import get_revenue_trend as svc
    return svc()


def detect_logsheet_anomalies(days: int = 30, **kwargs) -> dict:
    """Run diagnostics to find logsheet sequencing errors, low hours, or repeat breakdowns."""
    from apps.logsheet.services import detect_logsheet_anomalies as svc
    return svc(days=days)


# ── Tool registry (for agent.py) ──────────────────────────────────────────

TOOL_FUNCTIONS = {
    'check_equipment_availability': check_equipment_availability,
    'get_equipment_details': get_equipment_details,
    'list_idle_equipment': list_idle_equipment,
    'search_customer': search_customer,
    'search_operator': search_operator,
    'list_expiring_certs': list_expiring_certs,
    'get_quotation': get_quotation,
    'list_quotations': list_quotations,
    'get_contract': get_contract,
    'get_invoice': get_invoice,
    'list_overdue_invoices': list_overdue_invoices,
    'get_invoice_summary': get_invoice_summary,
    'get_rental_history': get_rental_history,
    'search_logsheets': search_logsheets,
    'get_dashboard_summary': get_dashboard_summary,
    'get_revenue_report': get_revenue_report,
    'get_revenue_trend': get_revenue_trend,
    'list_employees': list_employees,
    'detect_logsheet_anomalies': detect_logsheet_anomalies,
}

TOOL_SCHEMAS = [
    {
        'type': 'function',
        'function': {
            'name': 'check_equipment_availability',
            'description': 'Check equipment availability. Returns a list of all equipment, optionally filtered by status (available, reserved, rented, maintenance, in_transit, retired).',
            'parameters': {
                'type': 'object',
                'properties': {
                    'status': {
                        'type': 'string',
                        'description': 'Filter by equipment status. One of: available, reserved, rented, maintenance, in_transit, retired. Leave empty to get all.',
                        'enum': ['available', 'reserved', 'rented', 'maintenance', 'in_transit', 'retired'],
                    }
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_equipment_details',
            'description': 'Get full details for a specific piece of equipment by its name or ID.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string', 'description': 'Partial or full equipment name to search for.'},
                    'equipment_id': {'type': 'string', 'description': 'Exact equipment UUID if known.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'list_idle_equipment',
            'description': 'List equipment that is currently idle (status=available). Useful for utilisation analysis.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'days': {'type': 'integer', 'description': 'Reference window in days (informational, default 7).'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'search_customer',
            'description': 'Search for customers by name, email, or phone number.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {'type': 'string', 'description': 'Name, email, or phone to search for.'},
                },
                'required': ['query'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'search_operator',
            'description': 'Search for operators/drivers by name or license type.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {'type': 'string', 'description': 'Operator name to search.'},
                    'license_type': {'type': 'string', 'description': 'Filter by license type (e.g. HMV, LMV, Crane).'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'list_expiring_certs',
            'description': 'List operator licenses and equipment certificates expiring within N days. Also shows already-expired ones.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'days': {'type': 'integer', 'description': 'Number of days to look ahead. Default is 30.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_quotation',
            'description': 'Get details of a specific quotation by quotation number or customer name.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'quotation_number': {'type': 'string', 'description': 'Exact quotation number.'},
                    'customer_name': {'type': 'string', 'description': 'Customer name to find the latest quotation for.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'list_quotations',
            'description': 'List quotations filtered by status and/or customer name.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'status': {
                        'type': 'string',
                        'description': 'Filter by status: draft, under_review, sent, accepted, rejected, expired.',
                    },
                    'customer_name': {'type': 'string', 'description': 'Filter by customer name.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_contract',
            'description': 'Get details of a contract by contract number or customer name.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'contract_number': {'type': 'string', 'description': 'Exact contract number.'},
                    'customer_name': {'type': 'string', 'description': 'Customer name to find their latest contract.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_invoice',
            'description': 'Get invoice details by invoice number or customer name.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'invoice_number': {'type': 'string', 'description': 'Exact invoice number.'},
                    'customer_name': {'type': 'string', 'description': 'Customer name to find their latest invoice.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'list_overdue_invoices',
            'description': 'List all invoices that are overdue — past their due date and not fully paid. Returns total outstanding amount.',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_invoice_summary',
            'description': 'Get a summary count and totals of invoices broken down by status (draft, sent, paid, overdue, cancelled).',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_rental_history',
            'description': 'List rental orders for a specific customer or equipment.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'customer_name': {'type': 'string', 'description': 'Customer name to filter by.'},
                    'equipment_name': {'type': 'string', 'description': 'Equipment name to filter by.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'search_logsheets',
            'description': 'Search logsheets by equipment name, operator name, or date range.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'equipment_name': {'type': 'string', 'description': 'Equipment name to filter logsheets.'},
                    'operator_name': {'type': 'string', 'description': 'Operator name to filter logsheets.'},
                    'date_from': {'type': 'string', 'description': 'Start date (YYYY-MM-DD).'},
                    'date_to': {'type': 'string', 'description': 'End date (YYYY-MM-DD).'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_dashboard_summary',
            'description': 'Get a high-level summary of all ERP KPIs: equipment by status, active rentals, pending quotations, open queries, active contracts, overdue invoices.',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_revenue_report',
            'description': 'Get detailed revenue, collections, pending invoices, overdue invoices, and aging reports statistics (same stats as the ERP Reports Page).',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_revenue_trend',
            'description': 'Get monthly revenue vs pending invoices trend data for the last 12 months (useful for compiling charts or revenue summaries).',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'list_employees',
            'description': 'List all active employees/users in the ERP system, optionally filtered by role (super_admin, operations_manager, finance, field_supervisor, operator).',
            'parameters': {
                'type': 'object',
                'properties': {
                    'role': {
                        'type': 'string',
                        'description': 'Filter employees by role: super_admin, operations_manager, finance, field_supervisor, operator.',
                        'enum': ['super_admin', 'operations_manager', 'finance', 'field_supervisor', 'operator'],
                    }
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'detect_logsheet_anomalies',
            'description': 'Detect anomalies in recent logsheet data such as sequence mismatches, unexplained low productive hours, repeat breakdowns, and fuel rate deviations.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'days': {'type': 'integer', 'description': 'Timeframe window in days to analyze. Defaults to 30.'}
                }
            }
        }
    }
]
