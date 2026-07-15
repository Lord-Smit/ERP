from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from dateutil.relativedelta import relativedelta

from .models import Quotation, QuotationAmendment, QuotationLineItem, RentalOrder, RentalOrderLineItem
from apps.crm.models import Contract, ContractLineItem
from apps.invoices.models import Invoice, InvoiceLineItem
from .serializers import (
    QuotationListSerializer, QuotationDetailSerializer, QuotationCreateSerializer,
    QuotationLineItemSerializer, QuotationAmendmentSerializer,
    RentalOrderListSerializer, RentalOrderDetailSerializer,
    RentalOrderLineItemSerializer,
)
from .filters import QuotationFilter, RentalOrderFilter
from common.permissions import HasRole
from common.pdf import render_pdf


class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.select_related('customer', 'created_by').prefetch_related('line_items__equipment')
    permission_classes = [IsAuthenticated]
    filterset_class = QuotationFilter
    search_fields = ['quotation_number', 'customer__name']

    def get_serializer_class(self):
        if self.action == 'list':
            return QuotationListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return QuotationCreateSerializer
        return QuotationDetailSerializer

    def get_permissions(self):
        if self.action == 'download_pdf':
            from rest_framework.permissions import AllowAny
            return [AllowAny()]
        if self.action == 'destroy':
            return [IsAuthenticated(), HasRole(['super_admin'])]
        if self.action in ('create', 'update', 'partial_update'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'finance'])]
        if self.action in ('send_quotation', 'submit_for_review', 'approve_and_send', 'return_to_draft'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'finance'])]
        if self.action in ('accept_quotation', 'reject_quotation'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def send_quotation(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status not in ('draft', 'under_review'):
            return Response({'error': 'Only draft or under review quotations can be sent'}, status=400)
        quotation.status = 'sent'
        quotation.sent_by = request.user
        quotation.sent_at = timezone.now()
        quotation.save()
        return Response({'status': 'sent'})

    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status != 'draft':
            return Response({'error': 'Only draft quotations can be submitted for review'}, status=400)
        quotation.status = 'under_review'
        quotation.save()
        return Response({'status': 'under_review'})

    @action(detail=True, methods=['post'])
    def approve_and_send(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status != 'under_review':
            return Response({'error': 'Only under review quotations can be approved and sent'}, status=400)
        quotation.status = 'sent'
        quotation.sent_by = request.user
        quotation.sent_at = timezone.now()
        quotation.save()
        return Response({'status': 'sent'})

    @action(detail=True, methods=['post'])
    def return_to_draft(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status != 'under_review':
            return Response({'error': 'Only under review quotations can be returned to draft'}, status=400)
        quotation.status = 'draft'
        quotation.save()
        return Response({'status': 'draft'})

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        quotation = self.get_object()
        serializer = QuotationDetailSerializer(quotation, context={'request': request})
        return render_pdf(
            'pdf/quotation.html',
            {'quotation': serializer.data},
            filename=f'quotation_{quotation.quotation_number}.pdf'
        )

    @action(detail=True, methods=['post'])
    def amend(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status != 'draft':
            return Response({'error': 'Only draft quotations can be amended'}, status=400)
        version = quotation.version_number + 1
        serializer = QuotationDetailSerializer(quotation)
        amended_data = request.data.get('amended_data', serializer.data)
        notes = request.data.get('notes', '')
        QuotationAmendment.objects.create(
            quotation=quotation,
            amendment_number=version,
            amended_data=amended_data,
            amended_by=request.user,
            notes=notes,
        )
        quotation.version_number = version
        for attr in ('notes', 'terms_conditions', 'valid_until'):
            if attr in request.data:
                setattr(quotation, attr, request.data[attr])
        quotation.save()
        return Response({'status': 'amended', 'version_number': version})

    @action(detail=True, methods=['post'])
    def accept_quotation(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status not in ('sent', 'draft'):
            return Response({'error': 'Only sent or draft quotations can be accepted'}, status=400)

        with transaction.atomic():
            quotation.status = 'accepted'
            quotation.won_reason = request.data.get('won_reason', '')
            quotation.save()

            today = timezone.now().date()

            # 1. Create Contract
            contract = Contract.objects.create(
                contract_number=f"CTR-{quotation.quotation_number}",
                customer=quotation.customer,
                quotation=quotation,
                contract_type='rental',
                start_date=today,
                value=quotation.total_amount,
                status='active',
                created_by=request.user,
            )

            for line in quotation.line_items.all():
                ContractLineItem.objects.create(
                    contract=contract,
                    equipment=line.equipment,
                    description=line.description,
                    quantity=line.quantity,
                    rental_period=line.rental_period,
                    unit_price=line.unit_price,
                    line_total=line.line_total,
                    start_date=today,
                )

            # 2. Create RentalOrder (linked to contract)
            order = RentalOrder.objects.create(
                order_number=f"RENT-{quotation.quotation_number}",
                quotation=quotation,
                contract=contract,
                customer=quotation.customer,
                start_date=today,
                status='active',
                total_amount=quotation.total_amount,
                created_by=request.user,
            )

            for line in quotation.line_items.all():
                RentalOrderLineItem.objects.create(
                    rental_order=order,
                    equipment=line.equipment,
                    description=line.description,
                    quantity=line.quantity,
                    rental_period=line.rental_period,
                    start_date=line.start_date,
                    end_date=line.end_date,
                    unit_price=line.unit_price,
                    line_total=line.line_total,
                )

            # 3. Create Invoice (draft)
            # Use relativedelta to safely add 1 month (handles Jan 31 → Feb 28, etc.)
            due_date = today + relativedelta(months=1)
            invoice = Invoice.objects.create(
                customer=quotation.customer,
                quotation=quotation,
                rental_order=order,
                contract=contract,
                issue_date=today,
                due_date=due_date,
                status='draft',
                subtotal=quotation.subtotal,
                tax_amount=quotation.tax_amount,
                total_amount=quotation.total_amount,
                created_by=request.user,
            )

            for line in quotation.line_items.all():
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    description=line.description or (line.equipment.name if line.equipment else ''),
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    line_total=line.line_total,
                )

        # Trigger background email task to Super Admins
        try:
            import threading
            from django.contrib.auth import get_user_model
            from apps.crm.serializers import ContractDetailSerializer
            from apps.invoices.serializers import InvoiceDetailSerializer, PaymentSerializer
            from .utils import send_accepted_documents_email

            User = get_user_model()
            super_admins = list(User.objects.filter(role='super_admin', is_active=True).values_list('email', flat=True))

            if super_admins:
                quotation_data = QuotationDetailSerializer(quotation, context={'request': request}).data
                contract_data = ContractDetailSerializer(contract, context={'request': request}).data
                
                invoice_serializer = InvoiceDetailSerializer(invoice, context={'request': request})
                invoice_data = invoice_serializer.data
                invoice_data['payments_list'] = PaymentSerializer(
                    invoice.payments.all().order_by('-payment_date'), many=True
                ).data

                threading.Thread(
                    target=send_accepted_documents_email,
                    args=(super_admins, quotation_data, contract_data, invoice_data)
                ).start()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to spawn background acceptance email thread: {str(e)}", exc_info=True)

        return Response({
            'status': 'accepted',
            'contract_id': str(contract.id),
            'contract_number': contract.contract_number,
            'rental_order_id': str(order.id),
            'rental_order_number': order.order_number,
            'invoice_id': str(invoice.id),
            'invoice_number': invoice.invoice_number,
        })

    @action(detail=True, methods=['post'])
    def reject_quotation(self, request, pk=None):
        quotation = self.get_object()
        if quotation.status not in ('sent', 'draft'):
            return Response({'error': 'Only sent or draft quotations can be rejected'}, status=400)
        reason = request.data.get('lost_reason', '')
        notes = request.data.get('lost_notes', '')
        if reason and reason not in dict(Quotation.LOST_REASON_CHOICES):
            return Response({'error': 'Invalid lost_reason'}, status=400)
        quotation.status = 'rejected'
        quotation.lost_reason = reason
        quotation.lost_notes = notes
        quotation.save()
        return Response({'status': 'rejected', 'lost_reason': reason})


class QuotationLineItemViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationLineItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return QuotationLineItem.objects.filter(quotation_id=self.kwargs['quotation_pk'])

    def perform_create(self, serializer):
        serializer.save(quotation_id=self.kwargs['quotation_pk'])


class RentalOrderViewSet(viewsets.ModelViewSet):
    queryset = RentalOrder.objects.select_related(
        'customer', 'site', 'quotation'
    ).prefetch_related('line_items__equipment')
    permission_classes = [IsAuthenticated]
    filterset_class = RentalOrderFilter
    search_fields = ['order_number', 'customer__name']

    def get_serializer_class(self):
        if self.action == 'list':
            return RentalOrderListSerializer
        return RentalOrderDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'complete_order', 'cancel_order'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor'])]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def complete_order(self, request, pk=None):
        order = self.get_object()
        if order.status != 'active':
            return Response({'error': 'Only active orders can be completed'}, status=400)
        order.status = 'completed'
        order.save()
        return Response({'status': 'completed'})

    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        order = self.get_object()
        if order.status != 'active':
            return Response({'error': 'Only active orders can be cancelled'}, status=400)
        order.status = 'cancelled'
        order.save()
        return Response({'status': 'cancelled'})


class RentalOrderLineItemViewSet(viewsets.ModelViewSet):
    serializer_class = RentalOrderLineItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return RentalOrderLineItem.objects.filter(rental_order_id=self.kwargs['rental_order_pk'])

    def perform_create(self, serializer):
        serializer.save(rental_order_id=self.kwargs['rental_order_pk'])


class QuotationAmendmentViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationAmendmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return QuotationAmendment.objects.filter(
            quotation_id=self.kwargs['quotation_pk']
        ).select_related('amended_by')

    def perform_create(self, serializer):
        serializer.save(amended_by=self.request.user)
