from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import Invoice, Payment, InvoiceLineItem
from .serializers import (
    InvoiceListSerializer, InvoiceDetailSerializer, InvoiceCreateSerializer,
    PaymentSerializer, GenerateFromLogsheetSerializer,
)
from common.permissions import HasRole
from common.pdf import render_pdf
from apps.crm.models import Contract, ContractLineItem
from apps.logsheet.models import Logsheet


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('customer', 'created_by').prefetch_related('line_items')
    permission_classes = [IsAuthenticated]
    search_fields = ['invoice_number', 'customer__name']
    filterset_fields = ['customer', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return InvoiceCreateSerializer
        return InvoiceDetailSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), HasRole(['super_admin'])]
        if self.action in ('create', 'update', 'partial_update', 'generate_from_logsheets'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'finance'])]
        if self.action in ('mark_sent', 'mark_paid', 'cancel'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'finance'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != 'draft':
            return Response({'error': 'Only draft invoices can be marked as sent'}, status=400)
        invoice.status = 'sent'
        invoice.save()
        return Response({'status': 'sent'})

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status in ('paid', 'cancelled'):
            return Response({'error': f'Invoice is already {invoice.status}'}, status=400)
        amount = request.data.get('amount')
        if amount:
            invoice.paid_amount = float(invoice.paid_amount) + float(amount)
        else:
            invoice.paid_amount = invoice.total_amount
        if float(invoice.paid_amount) >= float(invoice.total_amount):
            invoice.status = 'paid'
        invoice.save()

        from datetime import date
        payment = Payment.objects.create(
            invoice=invoice,
            amount_paid=amount or invoice.total_amount,
            payment_date=request.data.get('payment_date', date.today()),
            payment_mode=request.data.get('payment_mode', 'bank_transfer'),
            reference_number=request.data.get('reference_number', ''),
            notes=request.data.get('notes', ''),
            created_by=request.user,
        )
        serializer = PaymentSerializer(payment)
        return Response({'status': 'paid', 'paid_amount': str(invoice.paid_amount), 'payment': serializer.data})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == 'paid':
            return Response({'error': 'Paid invoices cannot be cancelled'}, status=400)
        invoice.status = 'cancelled'
        invoice.save()
        return Response({'status': 'cancelled'})

    @action(detail=True, methods=['get'])
    def payments(self, request, pk=None):
        invoice = self.get_object()
        payments = invoice.payments.all().order_by('-payment_date')
        return Response(PaymentSerializer(payments, many=True).data)

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        invoice = self.get_object()
        serializer = InvoiceDetailSerializer(invoice, context={'request': request})
        data = serializer.data
        data['payments_list'] = PaymentSerializer(
            invoice.payments.all().order_by('-payment_date'), many=True
        ).data
        return render_pdf(
            'pdf/invoice.html',
            {'invoice': data},
            filename=f'invoice_{invoice.invoice_number}.pdf'
        )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_revenue = Invoice.objects.filter(
            status='paid'
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        pending = Invoice.objects.filter(
            status__in=('draft', 'sent', 'overdue')
        ).aggregate(
            count=Count('id'),
            total=Sum('total_amount'),
        )

        overdue = Invoice.objects.filter(
            status='overdue'
        ).aggregate(
            count=Count('id'),
            total=Sum('total_amount'),
        )

        from apps.equipment.models import Equipment
        from apps.crm.models import Contract
        from apps.quotations.models import RentalOrder
        from datetime import date, timedelta

        active_rentals = RentalOrder.objects.filter(status='active').count()
        total_equipment = Equipment.objects.count()
        equipment_by_status = Equipment.objects.values('status').annotate(count=Count('id'))
        pending_contracts = Contract.objects.filter(status='draft').count()
        revenue_month = Invoice.objects.filter(
            status='paid',
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year,
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        today = date.today()
        aging_30 = Invoice.objects.filter(
            status__in=('sent', 'overdue'),
            due_date__lte=today,
            due_date__gt=today - timedelta(days=30),
        ).aggregate(count=Count('id'), total=Sum('total_amount'))
        aging_60 = Invoice.objects.filter(
            status__in=('sent', 'overdue'),
            due_date__lte=today - timedelta(days=30),
            due_date__gt=today - timedelta(days=60),
        ).aggregate(count=Count('id'), total=Sum('total_amount'))
        aging_90 = Invoice.objects.filter(
            status__in=('sent', 'overdue'),
            due_date__lte=today - timedelta(days=60),
            due_date__gt=today - timedelta(days=90),
        ).aggregate(count=Count('id'), total=Sum('total_amount'))
        aging_90_plus = Invoice.objects.filter(
            status__in=('sent', 'overdue'),
            due_date__lte=today - timedelta(days=90),
        ).aggregate(count=Count('id'), total=Sum('total_amount'))

        return Response({
            'active_rentals': active_rentals,
            'total_equipment': total_equipment,
            'equipment_by_status': list(equipment_by_status),
            'pending_contracts': pending_contracts,
            'total_revenue': total_revenue,
            'pending_invoices': pending['count'] or 0,
            'pending_amount': pending['total'] or 0,
            'overdue_invoices': overdue['count'] or 0,
            'overdue_amount': overdue['total'] or 0,
            'revenue_month': revenue_month,
            'aging': {
                '0_30': {'count': aging_30['count'] or 0, 'total': aging_30['total'] or 0},
                '31_60': {'count': aging_60['count'] or 0, 'total': aging_60['total'] or 0},
                '61_90': {'count': aging_90['count'] or 0, 'total': aging_90['total'] or 0},
                '90_plus': {'count': aging_90_plus['count'] or 0, 'total': aging_90_plus['total'] or 0},
            },
        })

    @action(detail=False, methods=['get'])
    def revenue_chart(self, request):
        from datetime import date, timedelta
        today = date.today()
        months = []
        for i in range(11, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            months.append((y, m))
        data = []
        for y, m in months:
            revenue = Invoice.objects.filter(
                status='paid',
                issue_date__year=y,
                issue_date__month=m,
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            pending = Invoice.objects.filter(
                status__in=('sent', 'overdue'),
                issue_date__year=y,
                issue_date__month=m,
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            data.append({
                'month': f'{y}-{m:02d}',
                'label': date(y, m, 1).strftime('%b %Y'),
                'revenue': float(revenue),
                'pending': float(pending),
            })
        return Response(data)

    @action(detail=False, methods=['post'])
    def generate_from_logsheets(self, request):
        serializer = GenerateFromLogsheetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        contract_id = serializer.validated_data['contract_id']
        date_from = serializer.validated_data['date_from']
        date_to = serializer.validated_data['date_to']
        preview = request.query_params.get('preview', 'false').lower() == 'true'
        
        contract = get_object_or_404(Contract, id=contract_id)
        
        lines = contract.line_items.all()
        if not lines.exists():
            return Response({'error': 'This contract has no line items'}, status=400)
            
        preview_rows = []
        invoice_lines_data = []
        subtotal = 0.0
        
        for line in lines:
            if not line.equipment:
                continue
            logsheets = Logsheet.objects.filter(
                equipment=line.equipment,
                status='approved',
                date__range=(date_from, date_to)
            ).order_by('date')
            
            if not logsheets.exists():
                continue
                
            unit_price = float(line.unit_price)
            period = line.rental_period
            
            for ls in logsheets:
                if period == 'hourly':
                    hours = float(ls.productive_hours or 0.0)
                    line_total = hours * unit_price
                    desc = f"Hourly rental: {line.equipment.name} on {ls.date} ({hours} productive hrs @ ₹{unit_price}/hr)"
                elif period == 'weekly':
                    line_total = unit_price / 7.0
                    desc = f"Weekly rental (pro-rata): {line.equipment.name} on {ls.date} (1 day of weekly rate ₹{unit_price})"
                elif period == 'monthly':
                    line_total = unit_price / 30.0
                    desc = f"Monthly rental (pro-rata): {line.equipment.name} on {ls.date} (1 day of monthly rate ₹{unit_price})"
                else:
                    line_total = unit_price
                    desc = f"Daily rental: {line.equipment.name} on {ls.date} (1 day @ ₹{unit_price}/day)"
                
                line_total = round(line_total, 2)
                subtotal += line_total
                
                preview_rows.append({
                    'logsheet_id': str(ls.id),
                    'date': str(ls.date),
                    'equipment_name': line.equipment.name,
                    'rental_period': period,
                    'productive_hours': ls.productive_hours,
                    'unit_price': unit_price,
                    'line_total': line_total,
                    'description': desc,
                })
                
                invoice_lines_data.append({
                    'description': desc,
                    'quantity': 1.0,
                    'unit_price': line_total,
                    'line_total': line_total
                })
        
        tax_pct = float(contract.quotation.tax_percentage) if contract.quotation else 18.0
        tax_amount = round(subtotal * tax_pct / 100.0, 2)
        total_amount = round(subtotal + tax_amount, 2)
        
        if preview:
            return Response({
                'contract_id': str(contract.id),
                'contract_number': contract.contract_number,
                'customer_name': contract.customer.name,
                'date_from': date_from,
                'date_to': date_to,
                'subtotal': subtotal,
                'tax_percentage': tax_pct,
                'tax_amount': tax_amount,
                'total_amount': total_amount,
                'rows': preview_rows,
            })
            
        if not preview_rows:
            return Response({'error': 'No approved logsheets found in the specified date range for this contract'}, status=400)
            
        from datetime import timedelta
        with transaction.atomic():
            invoice = Invoice.objects.create(
                customer=contract.customer,
                contract=contract,
                quotation=contract.quotation,
                issue_date=timezone.now().date(),
                due_date=timezone.now().date() + timedelta(days=30),
                status='draft',
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                created_by=request.user
            )
            for line_item in invoice_lines_data:
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    description=line_item['description'],
                    quantity=line_item['quantity'],
                    unit_price=line_item['unit_price'],
                    line_total=line_item['line_total']
                )
        
        return Response({
            'status': 'created',
            'invoice_id': str(invoice.id),
            'invoice_number': invoice.invoice_number,
            'total_amount': total_amount,
        }, status=201)



class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice', 'created_by')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['invoice', 'payment_mode', 'payment_date']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'finance'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request):
        qs = Payment.objects.select_related(
            'invoice__customer', 'created_by'
        ).all().order_by('-payment_date')

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        customer = request.query_params.get('customer')
        payment_mode = request.query_params.get('payment_mode')

        filters = {}
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
            filters['date_from'] = date_from
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)
            filters['date_to'] = date_to
        if payment_mode:
            qs = qs.filter(payment_mode=payment_mode)
            filters['payment_mode'] = payment_mode
        if customer:
            qs = qs.filter(invoice__customer_id=customer)
            filters['customer'] = customer

        payments = qs[:500]
        total = sum(float(p.amount_paid) for p in payments)

        from datetime import date
        data = []
        for p in payments:
            inv = p.invoice
            data.append({
                'payment_date': str(p.payment_date),
                'invoice_number': inv.invoice_number,
                'customer_name': inv.customer.name if inv.customer else '—',
                'amount_paid': float(p.amount_paid),
                'payment_mode': p.payment_mode,
                'payment_mode_display': p.get_payment_mode_display(),
                'reference_number': p.reference_number,
                'notes': p.notes,
                'created_by_name': p.created_by.email if p.created_by else '—',
            })

        return render_pdf(
            'pdf/payment_history.html',
            {
                'payments': data,
                'filters': filters,
                'summary': {'count': len(data), 'total': total},
                'generated_at': date.today().isoformat(),
            },
            filename='payment_history.pdf'
        )
