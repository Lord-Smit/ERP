"""
CRM Service Layer
Shared business logic used by both REST API views and AI agent tools.
"""


def search_customers(query, limit=20):
    """Search customers by name, email, or phone."""
    from .models import Customer
    qs = Customer.objects.filter(
        name__icontains=query
    ) | Customer.objects.filter(
        email__icontains=query
    ) | Customer.objects.filter(
        phone__icontains=query
    )
    results = []
    for c in qs[:limit]:
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


def get_contract(contract_number=None, customer_name=None):
    """Get contract details by number or customer name."""
    from .models import Contract
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
