"""
Invoices Service Layer
Shared business logic used by both REST API views and AI agent tools.
"""
from datetime import date, timedelta
from django.utils import timezone


def get_invoice(invoice_number=None, customer_name=None):
    """Get invoice details by number or customer name."""
    from .models import Invoice
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


def list_overdue_invoices(limit=30):
    """Return all invoices that are overdue."""
    from .models import Invoice
    today = date.today()
    qs = Invoice.objects.select_related('customer').filter(
        status__in=['overdue', 'sent'],
        due_date__lt=today,
    ).exclude(status='paid').order_by('due_date')
    results = []
    for inv in qs[:limit]:
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


def get_invoice_summary():
    """Return invoice stats: total counts by status and amounts."""
    from .models import Invoice
    from django.db.models import Sum, Count
    stats = Invoice.objects.values('status').annotate(
        count=Count('id'),
        total=Sum('total_amount'),
        paid=Sum('paid_amount'),
    )
    return {'invoice_summary': list(stats)}


def get_revenue_report():
    """Get a detailed revenue and aging stats report."""
    from .models import Invoice
    from apps.equipment.models import Equipment
    from apps.crm.models import Contract
    from apps.quotations.models import RentalOrder
    from django.db.models import Sum, Count

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


def get_revenue_trend():
    """Get the monthly revenue trend for the last 12 months."""
    from .models import Invoice
    from django.db.models import Sum

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
