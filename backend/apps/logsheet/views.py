from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Avg, Q
from drf_spectacular.utils import extend_schema

from common.pdf import render_pdf

from .models import (
    Operator, Logsheet, LogsheetApproval, OperatorCertification,
    Attendance, OperatorAllowance, OperatorAvailability,
)
from .serializers import (
    OperatorSerializer, OperatorDetailSerializer,
    OperatorCertificationSerializer, AttendanceSerializer,
    AttendanceBulkSerializer, OperatorAllowanceSerializer,
    OperatorAvailabilitySerializer,
    LogsheetListSerializer, LogsheetDetailSerializer,
    LogsheetCreateSerializer, LogsheetApprovalSerializer,
)
from .filters import LogsheetFilter
from common.permissions import HasRole


class OperatorViewSet(viewsets.ModelViewSet):
    queryset = Operator.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'list':
            return OperatorSerializer
        if self.action in ('retrieve', 'analytics'):
            return OperatorDetailSerializer
        return OperatorSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]

    @action(detail=True, methods=['patch'], url_path='self-update')
    def self_update(self, request, pk=None):
        """Allow an operator to update their own personal profile fields."""
        operator = self.get_object()
        # Ensure the requesting user owns this operator profile
        if not hasattr(request.user, 'operator_profile') or request.user.operator_profile.pk != operator.pk:
            return Response({'detail': 'You can only update your own profile.'}, status=status.HTTP_403_FORBIDDEN)

        # Only allow safe personal fields — protect sensitive employment data
        allowed_fields = {
            'name', 'phone', 'email',
            'address_line1', 'city', 'state', 'pincode',
            'emergency_contact_name', 'emergency_contact_phone',
            'certifications', 'notes',
        }
        filtered_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = OperatorSerializer(operator, data=filtered_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        operator = self.get_object()
        from_date = request.query_params.get('date_from', '2020-01-01')
        to_date = request.query_params.get('date_to', timezone.now().date().isoformat())

        logsheet_ops = operator.logsheet_entries.filter(
            logsheet__date__gte=from_date, logsheet__date__lte=to_date
        )

        total_logsheets = logsheet_ops.count()
        total_hours = logsheet_ops.aggregate(s=Sum('logsheet__total_hours'))['s'] or 0
        productive_hours = logsheet_ops.aggregate(s=Sum('logsheet__productive_hours'))['s'] or 0
        idle_hours = logsheet_ops.aggregate(s=Sum('logsheet__idle_hours'))['s'] or 0
        breakdown_hours = logsheet_ops.aggregate(s=Sum('logsheet__breakdown_hours'))['s'] or 0

        total_overtime = logsheet_ops.aggregate(s=Sum('overtime_hours'))['s'] or 0

        breakdown_incidents = 0
        for lo in logsheet_ops:
            breakdown_incidents += lo.logsheet.breakdowns.count()

        utilization = round((productive_hours / total_hours * 100), 1) if total_hours else 0

        attendance_records = operator.attendance_records.filter(
            date__gte=from_date, date__lte=to_date
        )
        days_present = attendance_records.filter(status='present').count()
        days_absent = attendance_records.filter(status='absent').count()
        days_leave = attendance_records.filter(status='leave').count()

        return Response({
            'operator_name': operator.name,
            'total_logsheets': total_logsheets,
            'total_hours': total_hours,
            'productive_hours': productive_hours,
            'idle_hours': idle_hours,
            'breakdown_hours': breakdown_hours,
            'total_overtime_hours': total_overtime,
            'utilization_percentage': utilization,
            'breakdown_incidents': breakdown_incidents,
            'days_present': days_present,
            'days_absent': days_absent,
            'days_on_leave': days_leave,
        })

    @action(detail=False, methods=['get'], url_path='expiry-alerts')
    def expiry_alerts(self, request):
        days = int(request.query_params.get('days', 30))
        today = timezone.now().date()
        cutoff = today + timedelta(days=days)

        expiring_certs = OperatorCertification.objects.filter(
            expiry_date__gte=today, expiry_date__lte=cutoff
        ).select_related('operator').order_by('expiry_date')

        expired_certs = OperatorCertification.objects.filter(
            expiry_date__lt=today
        ).select_related('operator').order_by('expiry_date')

        data = {
            'expiring': OperatorCertificationSerializer(expiring_certs, many=True).data,
            'expired': OperatorCertificationSerializer(expired_certs, many=True).data,
        }
        return Response(data)


class OperatorCertificationViewSet(viewsets.ModelViewSet):
    serializer_class = OperatorCertificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return OperatorCertification.objects.filter(operator_id=self.kwargs['operator_pk'])

    def perform_create(self, serializer):
        serializer.save(operator_id=self.kwargs['operator_pk'])

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filterset_fields = ['operator', 'date', 'shift', 'status']

    def get_queryset(self):
        qs = Attendance.objects.select_related('operator', 'marked_by').all()
        operator_id = self.request.query_params.get('operator')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if operator_id:
            qs = qs.filter(operator_id=operator_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs.order_by('-date', 'operator__name')

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor'])]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_create(self, request):
        serializer = AttendanceBulkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        instances = serializer.save()
        return Response(AttendanceSerializer(instances, many=True).data, status=201)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        date = request.query_params.get('date', timezone.now().date().isoformat())
        records = Attendance.objects.filter(date=date)
        total_operators = Operator.objects.filter(is_active=True).count()
        present = records.filter(status='present').count()
        absent = records.filter(status='absent').count()
        on_leave = records.filter(status='leave').count()
        half_day = records.filter(status='half_day').count()
        holiday = records.filter(status='holiday').count()
        unmarked = total_operators - records.count()

        return Response({
            'date': date,
            'total_operators': total_operators,
            'present': present,
            'absent': absent,
            'on_leave': on_leave,
            'half_day': half_day,
            'holiday': holiday,
            'unmarked': unmarked,
        })


class OperatorAllowanceViewSet(viewsets.ModelViewSet):
    serializer_class = OperatorAllowanceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filterset_fields = ['operator', 'date', 'allowance_type']

    def get_queryset(self):
        qs = OperatorAllowance.objects.select_related('operator', 'created_by').all()
        operator_id = self.request.query_params.get('operator')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if operator_id:
            qs = qs.filter(operator_id=operator_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs.order_by('-date', 'operator__name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class OperatorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = OperatorAvailabilitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filterset_fields = ['operator', 'date', 'shift', 'status', 'source']

    def get_queryset(self):
        qs = OperatorAvailability.objects.select_related('operator').all()
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs.order_by('date', 'operator__name')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor'])]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        today = timezone.now().date()

        if not date_from:
            date_from = today.isoformat()
        if not date_to:
            date_to = (today + timedelta(days=30)).isoformat()

        availabilities = OperatorAvailability.objects.filter(
            date__gte=date_from, date__lte=date_to
        ).select_related('operator').order_by('date', 'operator__name')

        from collections import defaultdict
        by_date = defaultdict(list)
        for a in availabilities:
            by_date[a.date.isoformat()].append({
                'operator_id': str(a.operator_id),
                'operator_name': a.operator.name,
                'shift': a.shift,
                'status': a.status,
                'status_display': a.get_status_display(),
                'source': a.source,
            })

        operators = Operator.objects.filter(is_active=True).values('id', 'name')

        return Response({
            'date_from': date_from,
            'date_to': date_to,
            'operators': list(operators),
            'availabilities': dict(by_date),
        })


class LogsheetViewSet(viewsets.ModelViewSet):
    queryset = Logsheet.objects.select_related(
        'equipment', 'submitted_by', 'created_by'
    ).prefetch_related('operators__operator', 'breakdowns', 'fuel_entries', 'approvals')
    permission_classes = [IsAuthenticated]
    filterset_class = LogsheetFilter
    search_fields = ['equipment__name', 'site_name', 'notes']

    def get_serializer_class(self):
        if self.action == 'list':
            return LogsheetListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return LogsheetCreateSerializer
        return LogsheetDetailSerializer

    def perform_create(self, serializer):
        logsheet = serializer.save(created_by=self.request.user)
        if hasattr(self.request.user, 'operator_profile'):
            from .models import LogsheetOperator
            LogsheetOperator.objects.get_or_create(
                logsheet=logsheet,
                operator=self.request.user.operator_profile,
            )

    def get_permissions(self):
        if self.action == 'download_pdf':
            from rest_framework.permissions import AllowAny
            return [AllowAny()]
        if self.action in ('approve',):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor'])]
        if self.action in ('submit',):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor', 'operator'])]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        logsheet = self.get_object()
        if logsheet.status != 'draft':
            return Response({'error': 'Only draft logsheets can be submitted'}, status=400)
        logsheet.status = 'submitted'
        logsheet.submitted_by = request.user
        logsheet.submitted_at = timezone.now()
        logsheet.save()
        return Response({'status': 'submitted'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        logsheet = self.get_object()
        status_val = request.data.get('status', 'approved')

        if status_val not in ('approved', 'rejected', 'flagged'):
            return Response({'error': 'Invalid status'}, status=400)

        if status_val in ('rejected', 'flagged'):
            if logsheet.status not in ('submitted', 'operator_approved'):
                return Response({'error': 'Cannot reject at this stage'}, status=400)
            LogsheetApproval.objects.create(
                logsheet=logsheet, approved_by=request.user,
                status=status_val, comments=request.data.get('comments', '')
            )
            logsheet.status = status_val
            logsheet.save()
            return Response({'status': status_val})

        role = request.user.role
        if logsheet.status != 'submitted':
            return Response({'error': 'Only submitted logsheets can be approved'}, status=400)
        if role not in ('field_supervisor', 'operations_manager', 'super_admin'):
            return Response({'error': 'You are not authorized to approve'}, status=400)
        logsheet.status = 'approved'

        LogsheetApproval.objects.create(
            logsheet=logsheet, approved_by=request.user,
            status='approved', comments=request.data.get('comments', '')
        )
        logsheet.save()
        return Response({'status': logsheet.status})

    @action(detail=False, methods=['get'], url_path='consolidated')
    def consolidated(self, request):
        from django.db.models import Sum, Count
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        equipment_id = request.query_params.get('equipment')
        group_by = request.query_params.get('group_by', 'weekly')

        qs = Logsheet.objects.all()
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if equipment_id:
            qs = qs.filter(equipment_id=equipment_id)

        agg = qs.values('equipment__name', 'equipment').annotate(
            total_logsheets=Count('id'),
            total_hours=Sum('total_hours'),
            productive_hours=Sum('productive_hours'),
            idle_hours=Sum('idle_hours'),
            breakdown_hours=Sum('breakdown_hours'),
            total_fuel=Sum('fuel_liters'),
            fuel_cost=Sum('fuel_cost'),
        )
        return Response(list(agg))

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        logsheet = self.get_object()
        serializer = LogsheetDetailSerializer(logsheet, context={'request': request})
        return render_pdf(
            'pdf/logsheet.html',
            {'logsheet': serializer.data},
            filename=f'logsheet_{logsheet.date}_{logsheet.equipment.name}.pdf'
        )
