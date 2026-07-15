"""
Quotations Service Layer
Shared business logic used by both REST API views and AI agent tools.
"""


def get_quotation(quotation_number=None, customer_name=None):
    """Get quotation details by number or customer name."""
    from .models import Quotation
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


def list_quotations(status=None, customer_name=None, limit=20):
    """List quotations, optionally filtered by status or customer."""
    from .models import Quotation
    qs = Quotation.objects.select_related('customer').order_by('-created_at')
    if status:
        qs = qs.filter(status=status)
    if customer_name:
        qs = qs.filter(customer__name__icontains=customer_name)
    results = []
    for q in qs[:limit]:
        results.append({
            'quotation_number': q.quotation_number,
            'customer': q.customer.name,
            'status': q.status,
            'total_amount': float(q.total_amount),
            'valid_until': q.valid_until.isoformat() if q.valid_until else None,
            'created_at': q.created_at.date().isoformat(),
        })
    return {'count': len(results), 'quotations': results}


def get_rental_history(customer_name=None, equipment_name=None, limit=20):
    """List rental orders filtered by customer or equipment."""
    from .models import RentalOrder
    qs = RentalOrder.objects.select_related('customer', 'site').order_by('-created_at')
    if customer_name:
        qs = qs.filter(customer__name__icontains=customer_name)
    if equipment_name:
        qs = qs.filter(line_items__equipment__name__icontains=equipment_name).distinct()
    results = []
    for ro in qs[:limit]:
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
