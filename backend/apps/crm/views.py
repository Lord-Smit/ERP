from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import (
    Customer, CustomerSite, Contract, ContractLineItem,
    ContractAmendment, ContractSignature,
    SiteEquipmentDeployment,
    CustomerActivity, CustomerFeedback, PaymentReminder, CustomerQuery,
)
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer, CustomerCreateSerializer,
    CustomerSiteSerializer, CustomerSiteDetailSerializer,
    ContractSerializer, ContractListSerializer, ContractDetailSerializer,
    ContractCreateSerializer, ContractLineItemSerializer,
    ContractAmendmentSerializer, ContractSignatureSerializer,
    SiteEquipmentDeploymentSerializer,
    CustomerActivitySerializer, CustomerFeedbackSerializer, PaymentReminderSerializer,
    CustomerQuerySerializer,
)
from .filters import CustomerFilter, ContractFilter, ActivityFilter
from common.permissions import HasRole
from common.pdf import render_pdf


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.prefetch_related(
        'sites', 'contracts', 'activities', 'feedback', 'payment_reminders'
    )
    permission_classes = [IsAuthenticated]
    filterset_class = CustomerFilter
    search_fields = ['name', 'customer_code', 'email', 'phone']
    ordering_fields = ['name', 'created_at', 'outstanding_amount']

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CustomerCreateSerializer
        return CustomerDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class CustomerSiteViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSiteDetailSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return CustomerSite.objects.filter(customer_id=self.kwargs['customer_pk'])

    def perform_create(self, serializer):
        customer = Customer.objects.get(pk=self.kwargs['customer_pk'])
        serializer.save(customer=customer)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class ContractViewSet(viewsets.ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ContractFilter
    pagination_class = None

    def get_queryset(self):
        return Contract.objects.filter(customer_id=self.kwargs['customer_pk'])

    def perform_create(self, serializer):
        customer = Customer.objects.get(pk=self.kwargs['customer_pk'])
        serializer.save(customer=customer)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class TopLevelContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.select_related('customer').prefetch_related(
        'line_items__equipment', 'line_items__site',
        'amendments', 'signatures'
    )
    permission_classes = [IsAuthenticated]
    filterset_class = ContractFilter
    search_fields = ['contract_number', 'customer__name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ContractListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ContractCreateSerializer
        return ContractDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'finance'])]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        contract = self.get_object()
        if contract.signed_by_client:
            return Response({'error': 'Contract already signed'}, status=400)
        signatory_name = request.data.get('signatory_name')
        signatory_email = request.data.get('signatory_email')
        signature_data = request.data.get('signature_data')
        if not signatory_name or not signature_data:
            return Response({'error': 'signatory_name and signature_data are required'}, status=400)
        ContractSignature.objects.create(
            contract=contract,
            signatory_name=signatory_name,
            signatory_email=signatory_email or '',
            signature_data=signature_data,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        contract.signed_by_client = True
        contract.signed_at = timezone.now()
        contract.save()
        return Response({'status': 'signed'})

    @action(detail=True, methods=['post'])
    def amend(self, request, pk=None):
        contract = self.get_object()
        amendment_number = contract.amendment_number + 1
        amended_data = request.data.get('amended_data', {})
        notes = request.data.get('notes', '')
        ContractAmendment.objects.create(
            contract=contract,
            amendment_number=amendment_number,
            amended_data=amended_data,
            amended_by=request.user,
            notes=notes,
        )
        contract.amendment_number = amendment_number
        contract.save()
        return Response({'status': 'amended', 'amendment_number': amendment_number})

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        contract = self.get_object()
        new_end_date = request.data.get('end_date')
        if not new_end_date:
            return Response({'error': 'end_date is required'}, status=400)
        contract.end_date = new_end_date
        contract.status = 'active'
        contract.save()
        return Response({'status': 'renewed', 'end_date': new_end_date})

    @action(detail=False, methods=['get'])
    def expiry_alerts(self, request):
        from datetime import date, timedelta
        today = date.today()
        alerts = []
        contracts = Contract.objects.filter(
            status='active',
            end_date__isnull=False,
        ).select_related('customer')
        for c in contracts:
            days_remaining = (c.end_date - today).days
            if days_remaining < 0:
                if c.auto_renew:
                    alerts.append({
                        'id': str(c.id),
                        'type': 'contract_expiry',
                        'contract_number': c.contract_number,
                        'customer_name': c.customer.name,
                        'customer_id': str(c.customer.id),
                        'event_date': str(c.end_date),
                        'days_remaining': days_remaining,
                        'severity': 'overdue',
                        'message': f'Contract {c.contract_number} expired {abs(days_remaining)} days ago',
                        'auto_renew': c.auto_renew,
                        'renewal_reminder_days': c.renewal_reminder_days,
                    })
            elif days_remaining <= c.renewal_reminder_days:
                severity = 'critical' if days_remaining <= 7 else 'warning'
                alerts.append({
                    'id': str(c.id),
                    'type': 'contract_expiry',
                    'contract_number': c.contract_number,
                    'customer_name': c.customer.name,
                    'customer_id': str(c.customer.id),
                    'event_date': str(c.end_date),
                    'days_remaining': days_remaining,
                    'severity': severity,
                    'message': f'Contract {c.contract_number} expires in {days_remaining} days',
                    'auto_renew': c.auto_renew,
                    'renewal_reminder_days': c.renewal_reminder_days,
                })
        alerts.sort(key=lambda a: a['days_remaining'])
        return Response(alerts)

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        contract = self.get_object()
        serializer = ContractDetailSerializer(contract, context={'request': request})
        return render_pdf(
            'pdf/contract.html',
            {'contract': serializer.data},
            filename=f'contract_{contract.contract_number}.pdf'
        )


class ContractLineItemViewSet(viewsets.ModelViewSet):
    serializer_class = ContractLineItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ContractLineItem.objects.filter(contract_id=self.kwargs['contract_pk'])

    def perform_create(self, serializer):
        serializer.save(contract_id=self.kwargs['contract_pk'])


class ContractAmendmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContractAmendmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ContractAmendment.objects.filter(contract_id=self.kwargs['contract_pk'])

    def perform_create(self, serializer):
        serializer.save(contract_id=self.kwargs['contract_pk'], amended_by=self.request.user)


class ContractSignatureViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContractSignatureSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ContractSignature.objects.filter(contract_id=self.kwargs['contract_pk'])


class SiteEquipmentDeploymentViewSet(viewsets.ModelViewSet):
    queryset = SiteEquipmentDeployment.objects.select_related(
        'site__customer', 'equipment'
    )
    serializer_class = SiteEquipmentDeploymentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['site', 'equipment', 'status']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class CustomerActivityViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerActivitySerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ActivityFilter
    pagination_class = None

    def get_queryset(self):
        return CustomerActivity.objects.filter(customer_id=self.kwargs['customer_pk'])

    def perform_create(self, serializer):
        customer = Customer.objects.get(pk=self.kwargs['customer_pk'])
        serializer.save(customer=customer, conducted_by=self.request.user)


class CustomerFeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerFeedbackSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return CustomerFeedback.objects.filter(customer_id=self.kwargs['customer_pk'])

    def perform_create(self, serializer):
        customer = Customer.objects.get(pk=self.kwargs['customer_pk'])
        serializer.save(customer=customer, submitted_by=self.request.user)


class PaymentReminderViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentReminderSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return PaymentReminder.objects.filter(customer_id=self.kwargs['customer_pk'])

    def perform_create(self, serializer):
        customer = Customer.objects.get(pk=self.kwargs['customer_pk'])
        serializer.save(customer=customer)

    def perform_update(self, serializer):
        is_resolved = serializer.validated_data.get('is_resolved')
        kwargs = {}
        if is_resolved is True:
            kwargs['resolved_at'] = timezone.now()
        elif is_resolved is False:
            kwargs['resolved_at'] = None
        serializer.save(**kwargs)


class AllPaymentRemindersViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentReminderSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['customer', 'is_resolved', 'reminder_type']

    def get_queryset(self):
        return PaymentReminder.objects.select_related('customer').all()


class CustomerQueryViewSet(viewsets.ModelViewSet):
    queryset = CustomerQuery.objects.select_related('customer', 'assigned_to', 'created_by')
    serializer_class = CustomerQuerySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'priority', 'customer', 'assigned_to']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'finance'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def convert_to_quotation(self, request, pk=None):
        query = self.get_object()
        if query.status == 'converted':
            return Response({'error': 'Query already converted'}, status=400)
        if query.status == 'closed' or query.status == 'lost':
            return Response({'error': f'{query.status.title()} queries cannot be converted'}, status=400)
        if not query.customer:
            return Response({'error': 'Cannot convert: no customer linked. Please assign a customer first.'}, status=400)

        from apps.quotations.models import Quotation
        from apps.quotations.serializers import QuotationCreateSerializer

        from django.utils import timezone
        now = timezone.now()
        prefix = f'QTN-{now.strftime("%Y%m")}-'
        last = Quotation.objects.filter(
            quotation_number__startswith=prefix
        ).order_by('quotation_number').last()
        next_num = (int(last.quotation_number.split('-')[-1]) + 1) if last else 1
        data = {
            'quotation_number': f'{prefix}{next_num:04d}',
            'customer': str(query.customer_id),
            'contact_person': query.customer.name,
            'contact_email': query.customer.email or '',
            'contact_phone': query.customer.phone or '',
            'notes': f'Created from query: {query.subject}',
        }
        serializer = QuotationCreateSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        quotation = serializer.save()

        query.status = 'converted'
        query.quotation = quotation
        query.save()

        return Response({
            'status': 'converted',
            'quotation_id': str(quotation.id),
            'quotation_number': quotation.quotation_number,
        })

    @action(detail=True, methods=['post'])
    def mark_lost(self, request, pk=None):
        query = self.get_object()
        if query.status in ('converted', 'closed', 'lost'):
            return Response({'error': f'Query is already {query.status}'}, status=400)
        reason = request.data.get('lost_reason', '')
        notes = request.data.get('lost_notes', '')
        if reason not in dict(CustomerQuery.LOST_REASON_CHOICES):
            return Response({'error': 'Invalid lost_reason'}, status=400)
        query.status = 'lost'
        query.lost_reason = reason
        query.lost_notes = notes
        query.save()
        return Response({'status': 'lost', 'lost_reason': reason})


class AllSitesViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CustomerSite.objects.select_related('customer').all()
    serializer_class = CustomerSiteDetailSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
