"""
Equipment Service Layer
Shared business logic used by both REST API views and AI agent tools.
"""
from datetime import date, timedelta


def check_equipment_availability(status=None, limit=50):
    """Return equipment list filtered by optional status."""
    from .models import Equipment
    qs = Equipment.objects.select_related('category', 'warehouse')
    if status:
        qs = qs.filter(status=status)
    items = []
    for e in qs[:limit]:
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


def get_equipment_details(name=None, equipment_id=None):
    """Return full details for a single equipment by name or ID."""
    from .models import Equipment
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


def list_idle_equipment(days=7, limit=30):
    """List equipment that has been 'available' (idle) for analysis."""
    from .models import Equipment
    items = Equipment.objects.filter(status='available').select_related('category', 'warehouse')
    result = []
    for e in items[:limit]:
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


def list_expiring_equipment_certificates(days=30):
    """List equipment certificates expiring within N days and already expired ones."""
    from .models import EquipmentAttachment

    try:
        days = int(days)
    except (ValueError, TypeError):
        days = 30

    today = date.today()
    cutoff = today + timedelta(days=days)

    expiring = []
    for att in EquipmentAttachment.objects.filter(
        file_type='certificate', expiry_date__gte=today, expiry_date__lte=cutoff
    ).select_related('equipment')[:20]:
        expiring.append({
            'equipment': att.equipment.name,
            'cert_name': att.name,
            'expiry_date': att.expiry_date.isoformat(),
            'days_left': (att.expiry_date - today).days,
        })

    expired = []
    for att in EquipmentAttachment.objects.filter(
        file_type='certificate', expiry_date__lt=today
    ).select_related('equipment')[:20]:
        expired.append({
            'equipment': att.equipment.name,
            'cert_name': att.name,
            'expiry_date': att.expiry_date.isoformat(),
            'days_overdue': (today - att.expiry_date).days,
        })

    return {
        'expiring_equipment_certs': expiring,
        'expired_equipment_certs': expired,
    }
