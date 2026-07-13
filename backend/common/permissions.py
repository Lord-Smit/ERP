from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    def __init__(self, allowed_roles):
        self.allowed_roles = allowed_roles

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.allowed_roles


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'super_admin'


class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'super_admin', 'operations_manager'
        )


class RolePermissionMixin:
    """
    Mixin for viewsets that checks role-based access.
    Usage:
        class SomeViewSet(ModelViewSet, RolePermissionMixin):
            role_permissions = {
                'list': ['super_admin', 'operations_manager'],
                'create': ['super_admin'],
                ...
            }
    """
    role_permissions = {}

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action in self.role_permissions:
            if request.user.role not in self.role_permissions[self.action]:
                self.permission_denied(
                    request,
                    message=f"Role '{request.user.role}' is not allowed to {self.action}."
                )
