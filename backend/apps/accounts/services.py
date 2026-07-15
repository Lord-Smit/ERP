"""
Accounts Service Layer
Shared business logic used by both REST API views and AI agent tools.
"""


def list_employees(role=None, limit=50):
    """Return the list of active employees/users, optionally filtered by role."""
    from .models import User
    qs = User.objects.filter(is_active=True)
    if role:
        qs = qs.filter(role=role)
    results = []
    for user in qs.order_by('email')[:limit]:
        results.append({
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'role': user.role,
            'role_display': user.get_role_display(),
            'registration_status': user.registration_status,
        })
    return {'count': len(results), 'employees': results}
