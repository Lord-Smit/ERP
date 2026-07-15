"""
Logsheet Service Layer
Shared business logic used by both REST API views and AI agent tools.
"""
from datetime import date, timedelta


def search_operators(query=None, license_type=None, limit=20):
    """Search operators by name or license type."""
    from .models import Operator
    qs = Operator.objects.filter(is_active=True)
    if query:
        qs = qs.filter(name__icontains=query)
    if license_type:
        qs = qs.filter(license_type__icontains=license_type)
    results = []
    for op in qs[:limit]:
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


def list_expiring_operator_licenses(days=30):
    """List operator licenses expiring within N days and already expired ones."""
    from .models import Operator

    try:
        days = int(days)
    except (ValueError, TypeError):
        days = 30

    today = date.today()
    cutoff = today + timedelta(days=days)

    expiring = []
    for op in Operator.objects.filter(
        license_expiry__gte=today, license_expiry__lte=cutoff, is_active=True
    ):
        expiring.append({
            'operator': op.name,
            'license_type': op.license_type,
            'expiry_date': op.license_expiry.isoformat(),
            'days_left': (op.license_expiry - today).days,
        })

    expired = []
    for op in Operator.objects.filter(license_expiry__lt=today, is_active=True):
        expired.append({
            'operator': op.name,
            'license_type': op.license_type,
            'expiry_date': op.license_expiry.isoformat(),
            'days_overdue': (today - op.license_expiry).days,
        })

    return {
        'expiring_operator_licenses': expiring,
        'expired_operator_licenses': expired,
    }


def search_logsheets(equipment_name=None, operator_name=None, date_from=None, date_to=None, limit=30):
    """Search logsheets by equipment, operator, or date range."""
    from .models import Logsheet
    qs = Logsheet.objects.select_related('equipment').prefetch_related('operators__operator').order_by('-date')
    if equipment_name:
        qs = qs.filter(equipment__name__icontains=equipment_name)
    if operator_name:
        qs = qs.filter(operators__operator__name__icontains=operator_name)
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    results = []
    for ls in qs[:limit]:
        first_op = ls.operators.first()
        op_name = first_op.operator.name if (first_op and first_op.operator) else ''
        results.append({
            'id': str(ls.id),
            'date': ls.date.isoformat(),
            'equipment': ls.equipment.name,
            'operator': op_name,
            'shift': ls.shift,
            'site_name': ls.site_name,
            'total_hours': float(ls.total_hours) if ls.total_hours else None,
            'idle_hours': float(ls.idle_hours) if ls.idle_hours else None,
            'status': ls.status,
        })
    return {'count': len(results), 'logsheets': results}


def detect_logsheet_anomalies(days=30):
    """
    Run diagnostic heuristics on logsheets within a window to identify anomalies:
    - Sequence errors in odometer/hour meters
    - Repeated mechanical breakdowns on the same equipment
    - Unusually low productive hours (< 4 hrs) on a shift without breakdowns
    - Abnormal fuel usage rates
    """
    from django.db.models import Count, Avg, F
    from .models import Logsheet, LogsheetBreakdown

    try:
        days = int(days)
    except (ValueError, TypeError):
        days = 30

    today = date.today()
    start_date = today - timedelta(days=days)
    
    anomalies = []
    
    # --- HEURISTIC 1: Meter Sequence Discrepancies ---
    # Find logsheets where meter_start does not match the previous logsheet's meter_end
    active_logsheets = Logsheet.objects.filter(date__gte=start_date).order_by('equipment_id', 'date', 'shift')
    
    last_logsheet = None
    for ls in active_logsheets:
        if last_logsheet and last_logsheet.equipment_id == ls.equipment_id:
            # If meter start of current shift is less than previous shift's meter end
            if last_logsheet.meter_end and ls.meter_start and ls.meter_start < last_logsheet.meter_end:
                anomalies.append({
                    'type': 'meter_sequence_error',
                    'severity': 'high',
                    'equipment': ls.equipment.name,
                    'logsheet_id': str(ls.id),
                    'date': ls.date.isoformat(),
                    'details': f"Meter starts at {ls.meter_start} but previous ended at {last_logsheet.meter_end}."
                })
        last_logsheet = ls

    # --- HEURISTIC 2: Repeated Breakdowns ---
    # Count breakdowns per equipment in the period
    breakdowns = LogsheetBreakdown.objects.filter(logsheet__date__gte=start_date) \
        .values('logsheet__equipment__name') \
        .annotate(total=Count('id')) \
        .filter(total__gte=2)
        
    for bd in breakdowns:
        anomalies.append({
            'type': 'repeated_breakdowns',
            'severity': 'medium',
            'equipment': bd['logsheet__equipment__name'],
            'details': f"Experienced {bd['total']} breakdowns in the last {days} days."
        })

    # --- HEURISTIC 3: Unusually Low Hours ---
    # Find logsheets with under 4 hours of productivity that aren't explained by breakdowns
    low_hour_logsheets = Logsheet.objects.filter(
        date__gte=start_date,
        productive_hours__lt=4.0
    ).exclude(status='rejected').select_related('equipment')
    
    for ls in low_hour_logsheets:
        has_breakdowns = ls.breakdowns.exists()
        if not has_breakdowns:
            anomalies.append({
                'type': 'unexplained_low_hours',
                'severity': 'medium',
                'equipment': ls.equipment.name,
                'logsheet_id': str(ls.id),
                'date': ls.date.isoformat(),
                'details': f"Only {ls.productive_hours} productive hours recorded, but no breakdown event was logged."
            })

    # --- HEURISTIC 4: Abnormal Fuel Rates ---
    # Fetch historical average hourly fuel rate for category reference
    avg_fuel_rates = Logsheet.objects.filter(productive_hours__gt=0, fuel_liters__gt=0) \
        .values('equipment__category__name') \
        .annotate(avg_rate=Avg(F('fuel_liters') / F('productive_hours')))
        
    category_rates = {x['equipment__category__name']: float(x['avg_rate']) for x in avg_fuel_rates if x['equipment__category__name']}
    
    recent_fuel_sheets = Logsheet.objects.filter(
        date__gte=start_date, 
        productive_hours__gt=0, 
        fuel_liters__gt=0
    ).select_related('equipment__category')
    
    for ls in recent_fuel_sheets:
        cat_name = ls.equipment.category.name if ls.equipment.category else None
        if cat_name in category_rates:
            actual_rate = float(ls.fuel_liters / ls.productive_hours)
            expected_rate = category_rates[cat_name]
            # Flag if 80% higher than expected rate
            if actual_rate > expected_rate * 1.8:
                anomalies.append({
                    'type': 'high_fuel_consumption',
                    'severity': 'low',
                    'equipment': ls.equipment.name,
                    'logsheet_id': str(ls.id),
                    'date': ls.date.isoformat(),
                    'details': f"Fuel burn rate of {actual_rate:.2f} L/hr is 80%+ higher than average ({expected_rate:.2f} L/hr) for {cat_name}."
                })
                
    return {
        'days_checked': days,
        'anomaly_count': len(anomalies),
        'anomalies': anomalies
    }

