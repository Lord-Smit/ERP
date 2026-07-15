"""
Dashboard Service Layer
Shared business logic used by both REST API views and AI agent tools.
"""
from datetime import date, timedelta

from django.db.models import Sum, Count


def get_dashboard_summary():
    """Return key ERP dashboard metrics (used by AI agent's get_dashboard_summary tool)."""
    from apps.quotations.models import Quotation, RentalOrder
    from apps.crm.models import CustomerQuery, Contract
    from apps.equipment.models import Equipment
    from apps.invoices.models import Invoice

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


def get_full_dashboard_data():
    """Return all the dashboard data needed for the REST Dashboard API View."""
    from datetime import timedelta
    from django.utils import timezone
    from apps.quotations.models import Quotation, RentalOrder
    from apps.crm.models import CustomerQuery, Contract
    from apps.equipment.models import EquipmentAttachment

    pending_quotations = Quotation.objects.filter(status='draft').count()
    pending_queries = CustomerQuery.objects.filter(
        status__in=['open', 'in_progress']
    ).count()
    active_rentals_count = RentalOrder.objects.filter(status='active').count()
    pending_contracts = Contract.objects.filter(status='draft').count()

    active_rentals = list(
        RentalOrder.objects.filter(status='active').select_related('customer')[:5]
        .values('id', 'order_number', 'customer__name', 'status')
    )
    for r in active_rentals:
        r['customer_name'] = r.pop('customer__name')

    recent_queries = list(
        CustomerQuery.objects.filter(
            status__in=['open', 'in_progress']
        ).select_related('customer')[:5]
        .values('id', 'subject', 'customer__name', 'priority', 'status', 'created_at')
    )
    for q in recent_queries:
        q['customer_name'] = q.pop('customer__name')
        q['created_at'] = q['created_at'].isoformat()

    recent_quotations = Quotation.objects.filter(
        status__in=['sent', 'accepted', 'rejected']
    ).select_related('customer')[:3]
    recent_rentals = RentalOrder.objects.filter(
        status='active'
    ).select_related('customer')[:3]
    recent_contracts = Contract.objects.filter(
        status='active'
    ).select_related('customer')[:3]

    activity = []
    for q in recent_quotations:
        activity.append({
            'type': 'quotation',
            'description': f'{q.quotation_number} {q.get_status_display()}',
            'customer_name': q.customer.name,
            'timestamp': q.updated_at.isoformat(),
        })
    for r in recent_rentals:
        activity.append({
            'type': 'rental_order',
            'description': f'{r.order_number} started',
            'customer_name': r.customer.name,
            'timestamp': r.created_at.isoformat(),
        })
    for c in recent_contracts:
        activity.append({
            'type': 'contract',
            'description': f'{c.contract_number} active',
            'customer_name': c.customer.name,
            'timestamp': c.created_at.isoformat(),
        })

    activity.sort(key=lambda x: x['timestamp'], reverse=True)

    today = timezone.now().date()
    cert_cutoff = today + timedelta(days=30)
    equip_cert_expiring = list(
        EquipmentAttachment.objects.filter(
            file_type='certificate', expiry_date__gte=today, expiry_date__lte=cert_cutoff
        ).select_related('equipment').order_by('expiry_date')[:10]
    )
    equip_cert_expired = list(
        EquipmentAttachment.objects.filter(
            file_type='certificate', expiry_date__lt=today
        ).select_related('equipment').order_by('expiry_date')[:10]
    )

    return {
        'pending_quotations': pending_quotations,
        'pending_queries': pending_queries,
        'active_rentals_count': active_rentals_count,
        'pending_contracts': pending_contracts,
        'active_rentals': active_rentals,
        'recent_queries': recent_queries,
        'recent_activity': activity[:10],
        'equipment_cert_alerts': {
            'expiring': [
                {
                    'id': str(a.id),
                    'equipment_name': a.equipment.name,
                    'equipment_model': a.equipment.model,
                    'name': a.name,
                    'expiry_date': a.expiry_date.isoformat() if a.expiry_date else None,
                }
                for a in equip_cert_expiring
            ],
            'expired': [
                {
                    'id': str(a.id),
                    'equipment_name': a.equipment.name,
                    'equipment_model': a.equipment.model,
                    'name': a.name,
                    'expiry_date': a.expiry_date.isoformat() if a.expiry_date else None,
                }
                for a in equip_cert_expired
            ],
        },
    }

