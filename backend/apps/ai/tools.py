"""
RENTAL AI — Phase 1 Read-Only Tool Functions
Each function queries real ERP ORM data and returns structured dicts.
"""
import json
from datetime import date, timedelta
from django.utils import timezone


# ── Equipment ──────────────────────────────────────────────────────────────

def check_equipment_availability(status: str = None) -> dict:
    """Return equipment list filtered by optional status."""
    from apps.equipment.models import Equipment
    qs = Equipment.objects.select_related('category', 'warehouse')
    if status:
        qs = qs.filter(status=status)
    items = []
    for e in qs[:50]:
        items.append({
            'id': str(e.id),
            'name': e.name,
            'brand': e.brand,
            'model': e.model,
            'serial_number': e.serial_number,
            'status': e.status,
            'category': e.category.name if e.category else '',
            'warehouse': e.warehouse.name if e.warehouse else '',
            'rental_price_daily': float(e.rental_price_daily) if e.rental_price_daily else None,
        })
    return {'count': len(items), 'equipment': items}


def get_equipment_details(name: str = None, equipment_id: str = None) -> dict:
    """Return full details for a single equipment by name or ID."""
    from apps.equipment.models import Equipment
    try:
        if equipment_id:
            eq = Equipment.objects.select_related('category', 'warehouse', 'operator').get(id=equipment_id)
        else:
            eq = Equipment.objects.select_related('category', 'warehouse', 'operator').filter(
                name__icontains=name
            ).first()
        if not eq:
            return {'error': f'No equipment found matching "{name}"'}
        return {
            'id': str(eq.id),
            'name': eq.name,
            'brand': eq.brand,
            'model': eq.model,
            'serial_number': eq.serial_number,
            'status': eq.status,
            'category': eq.category.name if eq.category else '',
            'warehouse': eq.warehouse.name if eq.warehouse else '',
            'operator': eq.operator.name if eq.operator else 'Unassigned',
            'rental_price_hourly': float(eq.rental_price_hourly) if eq.rental_price_hourly else None,
            'rental_price_daily': float(eq.rental_price_daily) if eq.rental_price_daily else None,
            'rental_price_weekly': float(eq.rental_price_weekly) if eq.rental_price_weekly else None,
            'rental_price_monthly': float(eq.rental_price_monthly) if eq.rental_price_monthly else None,
            'deposit_amount': float(eq.deposit_amount) if eq.deposit_amount else None,
            'year_of_manufacture': eq.year_of_manufacture,
            'location_details': eq.location_details,
            'notes': eq.notes,
        }
    except Exception as e:
        return {'error': str(e)}


def list_idle_equipment(days: int = 7) -> dict:
    """List equipment that has been 'available' (idle) for analysis."""
    from apps.equipment.models import Equipment
    items = Equipment.objects.filter(status='available').select_related('category', 'warehouse')
    result = []
    for e in items[:30]:
        result.append({
            'id': str(e.id),
            'name': e.name,
            'brand': e.brand,
            'model': e.model,
            'status': e.status,
            'category': e.category.name if e.category else '',
            'warehouse': e.warehouse.name if e.warehouse else '',
            'rental_price_daily': float(e.rental_price_daily) if e.rental_price_daily else None,
        })
    return {'idle_count': len(result), 'equipment': result}


# ── Customers ──────────────────────────────────────────────────────────────

def search_customer(query: str) -> dict:
    """Search customers by name, email, or phone."""
    from apps.crm.models import Customer
    qs = Customer.objects.filter(
        name__icontains=query
    ) | Customer.objects.filter(
        email__icontains=query
    ) | Customer.objects.filter(
        phone__icontains=query
    )
    results = []
    for c in qs[:20]:
        results.append({
            'id': str(c.id),
            'customer_code': c.customer_code,
            'name': c.name,
            'customer_type': c.customer_type,
            'email': c.email,
            'phone': c.phone,
            'city': c.city,
            'state': c.state,
            'outstanding_amount': float(c.outstanding_amount),
            'credit_limit': float(c.credit_limit) if c.credit_limit else None,
            'is_active': c.is_active,
        })
    return {'count': len(results), 'customers': results}


# ── Operators ──────────────────────────────────────────────────────────────

def search_operator(query: str = None, license_type: str = None) -> dict:
    """Search operators by name or license type."""
    from apps.logsheet.models import Operator
    qs = Operator.objects.filter(is_active=True)
    if query:
        qs = qs.filter(name__icontains=query)
    if license_type:
        qs = qs.filter(license_type__icontains=license_type)
    results = []
    for op in qs[:20]:
        results.append({
            'id': str(op.id),
            'name': op.name,
            'phone': op.phone,
            'email': op.email,
            'license_type': op.license_type,
            'license_number': op.license_number,
            'license_expiry': op.license_expiry.isoformat() if op.license_expiry else None,
            'experience_years': op.experience_years,
            'daily_rate': float(op.daily_rate) if op.daily_rate else None,
            'is_active': op.is_active,
        })
    return {'count': len(results), 'operators': results}


def list_expiring_certs(days: int = 30) -> dict:
    """List operator licenses and equipment certs expiring within N days."""
    from apps.logsheet.models import Operator
    from apps.equipment.models import EquipmentAttachment
    
    try:
        days = int(days)
    except (ValueError, TypeError):
        days = 30

    today = date.today()
    cutoff = today + timedelta(days=days)

    # Operator licenses
    expiring_licenses = []
    for op in Operator.objects.filter(
        license_expiry__gte=today, license_expiry__lte=cutoff, is_active=True
    ):
        expiring_licenses.append({
            'operator': op.name,
            'license_type': op.license_type,
            'expiry_date': op.license_expiry.isoformat(),
            'days_left': (op.license_expiry - today).days,
        })

    expired_licenses = []
    for op in Operator.objects.filter(license_expiry__lt=today, is_active=True):
        expired_licenses.append({
            'operator': op.name,
            'license_type': op.license_type,
            'expiry_date': op.license_expiry.isoformat(),
            'days_overdue': (today - op.license_expiry).days,
        })

    # Equipment certificates - expiring
    expiring_equip_certs = []
    for att in EquipmentAttachment.objects.filter(
        file_type='certificate', expiry_date__gte=today, expiry_date__lte=cutoff
    ).select_related('equipment')[:20]:
        expiring_equip_certs.append({
            'equipment': att.equipment.name,
            'cert_name': att.name,
            'expiry_date': att.expiry_date.isoformat(),
            'days_left': (att.expiry_date - today).days,
        })

    # Equipment certificates - expired
    expired_equip_certs = []
    for att in EquipmentAttachment.objects.filter(
        file_type='certificate', expiry_date__lt=today
    ).select_related('equipment')[:20]:
        expired_equip_certs.append({
            'equipment': att.equipment.name,
            'cert_name': att.name,
            'expiry_date': att.expiry_date.isoformat(),
            'days_overdue': (today - att.expiry_date).days,
        })

    return {
        'check_window_days': days,
        'expiring_operator_licenses': expiring_licenses,
        'expired_operator_licenses': expired_licenses,
        'expiring_equipment_certs': expiring_equip_certs,
        'expired_equipment_certs': expired_equip_certs,
    }


# ── Quotations ──────────────────────────────────────────────────────────────

def get_quotation(quotation_number: str = None, customer_name: str = None) -> dict:
    """Get quotation details by number or customer name."""
    from apps.quotations.models import Quotation
    try:
        if quotation_number:
            q = Quotation.objects.select_related('customer', 'created_by').get(
                quotation_number=quotation_number
            )
        else:
            q = Quotation.objects.select_related('customer', 'created_by').filter(
                customer__name__icontains=customer_name
            ).order_by('-created_at').first()
        if not q:
            return {'error': 'Quotation not found'}
        line_items = []
        for li in q.line_items.select_related('equipment').all():
            line_items.append({
                'equipment': li.equipment.name if li.equipment else li.description,
                'quantity': li.quantity,
                'rental_period': li.rental_period,
                'unit_price': float(li.unit_price),
                'line_total': float(li.line_total),
            })
        return {
            'quotation_number': q.quotation_number,
            'customer': q.customer.name,
            'status': q.status,
            'subtotal': float(q.subtotal),
            'tax_amount': float(q.tax_amount),
            'total_amount': float(q.total_amount),
            'valid_until': q.valid_until.isoformat() if q.valid_until else None,
            'created_by': q.created_by.email if q.created_by else '',
            'created_at': q.created_at.isoformat(),
            'line_items': line_items,
        }
    except Exception as e:
        return {'error': str(e)}


def list_quotations(status: str = None, customer_name: str = None) -> dict:
    """List quotations, optionally filtered by status or customer."""
    from apps.quotations.models import Quotation
    qs = Quotation.objects.select_related('customer').order_by('-created_at')
    if status:
        qs = qs.filter(status=status)
    if customer_name:
        qs = qs.filter(customer__name__icontains=customer_name)
    results = []
    for q in qs[:20]:
        results.append({
            'quotation_number': q.quotation_number,
            'customer': q.customer.name,
            'status': q.status,
            'total_amount': float(q.total_amount),
            'valid_until': q.valid_until.isoformat() if q.valid_until else None,
            'created_at': q.created_at.date().isoformat(),
        })
    return {'count': len(results), 'quotations': results}


# ── Contracts ──────────────────────────────────────────────────────────────

def get_contract(contract_number: str = None, customer_name: str = None) -> dict:
    """Get contract details by number or customer name."""
    from apps.crm.models import Contract
    try:
        if contract_number:
            c = Contract.objects.select_related('customer').get(contract_number=contract_number)
        else:
            c = Contract.objects.select_related('customer').filter(
                customer__name__icontains=customer_name
            ).order_by('-created_at').first()
        if not c:
            return {'error': 'Contract not found'}
        return {
            'contract_number': c.contract_number,
            'customer': c.customer.name,
            'contract_type': c.contract_type,
            'status': c.status,
            'start_date': c.start_date.isoformat(),
            'end_date': c.end_date.isoformat() if c.end_date else None,
            'value': float(c.value) if c.value else None,
            'payment_terms': c.payment_terms,
            'auto_renew': c.auto_renew,
            'signed_by_client': c.signed_by_client,
            'notes': c.notes,
        }
    except Exception as e:
        return {'error': str(e)}


# ── Invoices ──────────────────────────────────────────────────────────────

def get_invoice(invoice_number: str = None, customer_name: str = None) -> dict:
    """Get invoice details by number or customer name."""
    from apps.invoices.models import Invoice
    try:
        if invoice_number:
            inv = Invoice.objects.select_related('customer').get(invoice_number=invoice_number)
        else:
            inv = Invoice.objects.select_related('customer').filter(
                customer__name__icontains=customer_name
            ).order_by('-issue_date').first()
        if not inv:
            return {'error': 'Invoice not found'}
        line_items = [
            {
                'description': li.description,
                'quantity': float(li.quantity),
                'unit_price': float(li.unit_price),
                'line_total': float(li.line_total),
            }
            for li in inv.line_items.all()
        ]
        return {
            'invoice_number': inv.invoice_number,
            'customer': inv.customer.name,
            'status': inv.status,
            'issue_date': inv.issue_date.isoformat(),
            'due_date': inv.due_date.isoformat(),
            'subtotal': float(inv.subtotal),
            'tax_amount': float(inv.tax_amount),
            'total_amount': float(inv.total_amount),
            'paid_amount': float(inv.paid_amount),
            'balance_due': float(inv.total_amount - inv.paid_amount),
            'notes': inv.notes,
            'line_items': line_items,
        }
    except Exception as e:
        return {'error': str(e)}


def list_overdue_invoices() -> dict:
    """Return all invoices that are overdue (status=overdue or past due date and unpaid)."""
    from apps.invoices.models import Invoice
    today = date.today()
    qs = Invoice.objects.select_related('customer').filter(
        status__in=['overdue', 'sent'],
        due_date__lt=today,
    ).exclude(status='paid').order_by('due_date')
    results = []
    for inv in qs[:30]:
        balance = float(inv.total_amount - inv.paid_amount)
        results.append({
            'invoice_number': inv.invoice_number,
            'customer': inv.customer.name,
            'status': inv.status,
            'due_date': inv.due_date.isoformat(),
            'days_overdue': (today - inv.due_date).days,
            'total_amount': float(inv.total_amount),
            'paid_amount': float(inv.paid_amount),
            'balance_due': balance,
        })
    total_outstanding = sum(r['balance_due'] for r in results)
    return {
        'count': len(results),
        'total_outstanding': total_outstanding,
        'overdue_invoices': results,
    }


def get_invoice_summary() -> dict:
    """Return invoice stats: total counts by status and amounts."""
    from apps.invoices.models import Invoice
    from django.db.models import Sum, Count
    stats = Invoice.objects.values('status').annotate(
        count=Count('id'),
        total=Sum('total_amount'),
        paid=Sum('paid_amount'),
    )
    return {'invoice_summary': list(stats)}


# ── Rental Orders ──────────────────────────────────────────────────────────

def get_rental_history(customer_name: str = None, equipment_name: str = None) -> dict:
    """List rental orders filtered by customer or equipment."""
    from apps.quotations.models import RentalOrder
    qs = RentalOrder.objects.select_related('customer', 'site').order_by('-created_at')
    if customer_name:
        qs = qs.filter(customer__name__icontains=customer_name)
    if equipment_name:
        qs = qs.filter(line_items__equipment__name__icontains=equipment_name).distinct()
    results = []
    for ro in qs[:20]:
        results.append({
            'order_number': ro.order_number,
            'customer': ro.customer.name,
            'site': ro.site.name if ro.site else '',
            'status': ro.status,
            'start_date': ro.start_date.isoformat(),
            'end_date': ro.end_date.isoformat() if ro.end_date else None,
            'total_amount': float(ro.total_amount),
            'created_at': ro.created_at.date().isoformat(),
        })
    return {'count': len(results), 'rental_orders': results}


# ── Logsheets ──────────────────────────────────────────────────────────────

def search_logsheets(
    equipment_name: str = None,
    operator_name: str = None,
    date_from: str = None,
    date_to: str = None,
) -> dict:
    """Search logsheets by equipment, operator, or date range."""
    from apps.logsheet.models import Logsheet
    qs = Logsheet.objects.select_related('equipment', 'operator').order_by('-date')
    if equipment_name:
        qs = qs.filter(equipment__name__icontains=equipment_name)
    if operator_name:
        qs = qs.filter(operator__name__icontains=operator_name)
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    results = []
    for ls in qs[:30]:
        results.append({
            'id': str(ls.id),
            'date': ls.date.isoformat(),
            'equipment': ls.equipment.name,
            'operator': ls.operator.name if ls.operator else '',
            'shift': ls.shift,
            'site_name': ls.site_name,
            'total_hours': float(ls.total_hours) if ls.total_hours else None,
            'idle_hours': float(ls.idle_hours) if ls.idle_hours else None,
            'status': ls.status,
        })
    return {'count': len(results), 'logsheets': results}


# ── Dashboard ──────────────────────────────────────────────────────────────

def get_dashboard_summary() -> dict:
    """Return key ERP dashboard metrics."""
    from apps.quotations.models import Quotation, RentalOrder
    from apps.crm.models import CustomerQuery, Contract
    from apps.equipment.models import Equipment
    from apps.invoices.models import Invoice
    from django.db.models import Sum

    today = date.today()

    equip_by_status = {}
    for e in Equipment.objects.values('status'):
        equip_by_status[e['status']] = equip_by_status.get(e['status'], 0) + 1

    overdue_count = Invoice.objects.filter(
        due_date__lt=today, status__in=['sent', 'overdue']
    ).exclude(status='paid').count()

    overdue_total = Invoice.objects.filter(
        due_date__lt=today, status__in=['sent', 'overdue']
    ).exclude(status='paid').aggregate(t=Sum('total_amount'))['t'] or 0

    return {
        'equipment_by_status': equip_by_status,
        'total_equipment': Equipment.objects.count(),
        'active_rentals': RentalOrder.objects.filter(status='active').count(),
        'pending_quotations': Quotation.objects.filter(status__in=['draft', 'under_review']).count(),
        'open_queries': CustomerQuery.objects.filter(status__in=['open', 'in_progress']).count(),
        'active_contracts': Contract.objects.filter(status='active').count(),
        'overdue_invoices_count': overdue_count,
        'overdue_invoices_total': float(overdue_total),
        'today': today.isoformat(),
    }


def get_revenue_report() -> dict:
    """Get a detailed revenue and aging stats report (same as Reports Page)."""
    from apps.invoices.models import Invoice
    from apps.equipment.models import Equipment
    from apps.crm.models import Contract
    from apps.quotations.models import RentalOrder
    from django.db.models import Sum, Count
    from datetime import date, timedelta

    total_revenue = Invoice.objects.filter(
        status='paid'
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    pending = Invoice.objects.filter(
        status__in=('draft', 'sent', 'overdue')
    ).aggregate(
        count=Count('id'),
        total=Sum('total_amount'),
    )

    overdue = Invoice.objects.filter(
        status='overdue'
    ).aggregate(
        count=Count('id'),
        total=Sum('total_amount'),
    )

    active_rentals = RentalOrder.objects.filter(status='active').count()
    total_equipment = Equipment.objects.count()
    equipment_by_status = list(Equipment.objects.values('status').annotate(count=Count('id')))
    pending_contracts = Contract.objects.filter(status='draft').count()

    revenue_month = Invoice.objects.filter(
        status='paid',
        created_at__month=timezone.now().month,
        created_at__year=timezone.now().year,
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    today = date.today()

    aging_30 = Invoice.objects.filter(
        status__in=('sent', 'overdue'),
        due_date__lte=today,
        due_date__gt=today - timedelta(days=30),
    ).aggregate(count=Count('id'), total=Sum('total_amount'))

    aging_60 = Invoice.objects.filter(
        status__in=('sent', 'overdue'),
        due_date__lte=today - timedelta(days=30),
        due_date__gt=today - timedelta(days=60),
    ).aggregate(count=Count('id'), total=Sum('total_amount'))

    aging_90 = Invoice.objects.filter(
        status__in=('sent', 'overdue'),
        due_date__lte=today - timedelta(days=60),
        due_date__gt=today - timedelta(days=90),
    ).aggregate(count=Count('id'), total=Sum('total_amount'))

    aging_90_plus = Invoice.objects.filter(
        status__in=('sent', 'overdue'),
        due_date__lte=today - timedelta(days=90),
    ).aggregate(count=Count('id'), total=Sum('total_amount'))

    total_outstanding = (pending['total'] or 0)
    collection_rate = 0.0
    if total_revenue > 0 or total_outstanding > 0:
        collection_rate = (float(total_revenue) / (float(total_revenue) + float(total_outstanding))) * 100

    return {
        'total_revenue': float(total_revenue),
        'revenue_this_month': float(revenue_month),
        'collection_rate_percentage': round(collection_rate, 2),
        'active_rentals': active_rentals,
        'total_equipment': total_equipment,
        'equipment_by_status': equipment_by_status,
        'pending_contracts': pending_contracts,
        'pending_invoices_count': pending['count'] or 0,
        'pending_invoices_amount': float(pending['total'] or 0),
        'overdue_invoices_count': overdue['count'] or 0,
        'overdue_invoices_amount': float(overdue['total'] or 0),
        'aging_summary': {
            '0_30_days': {'count': aging_30['count'] or 0, 'total': float(aging_30['total'] or 0)},
            '31_60_days': {'count': aging_60['count'] or 0, 'total': float(aging_60['total'] or 0)},
            '61_90_days': {'count': aging_90['count'] or 0, 'total': float(aging_90['total'] or 0)},
            '90_plus_days': {'count': aging_90_plus['count'] or 0, 'total': float(aging_90_plus['total'] or 0)},
        }
    }


def get_revenue_trend() -> dict:
    """Get the monthly revenue trend (revenue vs pending invoices for the last 12 months)."""
    from apps.invoices.models import Invoice
    from django.db.models import Sum
    from datetime import date

    today = date.today()
    months = []
    for i in range(11, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    data = []
    for y, m in months:
        revenue = Invoice.objects.filter(
            status='paid',
            issue_date__year=y,
            issue_date__month=m,
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        pending = Invoice.objects.filter(
            status__in=('sent', 'overdue'),
            issue_date__year=y,
            issue_date__month=m,
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        data.append({
            'month': f'{y}-{m:02d}',
            'label': date(y, m, 1).strftime('%b %Y'),
            'revenue': float(revenue),
            'pending': float(pending),
        })
    return {'trend': data}


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
]
