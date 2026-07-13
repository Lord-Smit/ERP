from rest_framework import status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
from django.contrib.auth import authenticate

from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, OperatorRegistrationSerializer,
    RegistrationDetailSerializer,
)
from .models import User
from common.permissions import HasRole


@extend_schema(
    request=LoginSerializer,
    responses={200: dict, 401: dict},
    summary='Login with email and password'
)
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        email=serializer.validated_data['email'],
        password=serializer.validated_data['password']
    )
    if not user:
        return Response(
            {'detail': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    if not user.is_active:
        if user.registration_status == 'pending':
            return Response(
                {'detail': 'Your account is pending approval from the Operations Manager.', 'registration_status': 'pending'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if user.registration_status == 'rejected':
            reason = user.rejection_reason or 'No reason provided.'
            return Response(
                {'detail': f'Your registration was rejected. Reason: {reason}', 'registration_status': 'rejected'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(
            {'detail': 'User account is disabled.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@extend_schema(
    responses={200: UserSerializer},
    summary='Get current user profile'
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@extend_schema(
    request=OperatorRegistrationSerializer,
    responses={201: dict, 400: dict},
    summary='Register a new operator'
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = OperatorRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(
        {'detail': 'Registration submitted for approval. You will be able to log in once approved by the Operations Manager.'},
        status=status.HTTP_201_CREATED
    )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
    filterset_fields = ['registration_status']

    EMPLOYEE_ALLOWED_ROLES = ['finance', 'field_supervisor', 'operator']

    def get_permissions(self):
        return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(registration_status=status_filter)
        role_filter = self.request.query_params.get('role')
        if role_filter:
            qs = qs.filter(role=role_filter)
        return qs

    def perform_create(self, serializer):
        role = serializer.validated_data.get('role')
        if self.request.user.role == 'operations_manager' and role not in self.EMPLOYEE_ALLOWED_ROLES:
            allowed = ', '.join(self.EMPLOYEE_ALLOWED_ROLES)
            raise ValidationError({'role': f'You can only create accounts with {allowed} roles.'})
        serializer.save()

    def perform_update(self, serializer):
        role = serializer.validated_data.get('role')
        if self.request.user.role == 'operations_manager' and role is not None and role not in self.EMPLOYEE_ALLOWED_ROLES:
            allowed = ', '.join(self.EMPLOYEE_ALLOWED_ROLES)
            raise ValidationError({'role': f'You can only assign {allowed} roles.'})
        serializer.save()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = self.get_object()
        if user.registration_status != 'pending':
            return Response(
                {'detail': 'Only pending registrations can be approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.registration_status = 'approved'
        user.is_active = True
        user.save(update_fields=['registration_status', 'is_active'])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['get'])
    def registration_detail(self, request, pk=None):
        user = self.get_object()
        serializer = RegistrationDetailSerializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = self.get_object()
        if user.registration_status != 'pending':
            return Response(
                {'detail': 'Only pending registrations can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        reason = request.data.get('rejection_reason', '')
        user.registration_status = 'rejected'
        user.rejection_reason = reason
        user.is_active = False
        user.save(update_fields=['registration_status', 'rejection_reason', 'is_active'])
        return Response(UserSerializer(user).data)
