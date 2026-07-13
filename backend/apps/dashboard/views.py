from datetime import timedelta

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.quotations.models import Quotation, RentalOrder
from apps.crm.models import CustomerQuery, Contract
from apps.equipment.models import EquipmentAttachment


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()

        pending_quotations = Quotation.objects.filter(status='draft').count()
        pending_queries = CustomerQuery.objects.filter(
            status__in=['open', 'in_progress']
        ).count()
        active_rentals_count = RentalOrder.objects.filter(status='active').count()
        pending_contracts = Contract.objects.filter(status='draft').count()

        active_rentals = list(
            RentalOrder.objects.filter(status='active').select_related('customer')[:5]
            .values('id', 'order_number', 'customer__name', 'status')
        )
        for r in active_rentals:
            r['customer_name'] = r.pop('customer__name')

        recent_queries = list(
            CustomerQuery.objects.filter(
                status__in=['open', 'in_progress']
            ).select_related('customer')[:5]
            .values('id', 'subject', 'customer__name', 'priority', 'status', 'created_at')
        )
        for q in recent_queries:
            q['customer_name'] = q.pop('customer__name')
            q['created_at'] = q['created_at'].isoformat()

        recent_quotations = Quotation.objects.filter(
            status__in=['sent', 'accepted', 'rejected']
        ).select_related('customer')[:3]
        recent_rentals = RentalOrder.objects.filter(
            status='active'
        ).select_related('customer')[:3]
        recent_contracts = Contract.objects.filter(
            status='active'
        ).select_related('customer')[:3]

        activity = []
        for q in recent_quotations:
            activity.append({
                'type': 'quotation',
                'description': f'{q.quotation_number} {q.get_status_display()}',
                'customer_name': q.customer.name,
                'timestamp': q.updated_at.isoformat(),
            })
        for r in recent_rentals:
            activity.append({
                'type': 'rental_order',
                'description': f'{r.order_number} started',
                'customer_name': r.customer.name,
                'timestamp': r.created_at.isoformat(),
            })
        for c in recent_contracts:
            activity.append({
                'type': 'contract',
                'description': f'{c.contract_number} active',
                'customer_name': c.customer.name,
                'timestamp': c.created_at.isoformat(),
            })

        activity.sort(key=lambda x: x['timestamp'], reverse=True)

        today = timezone.now().date()
        cert_cutoff = today + timedelta(days=30)
        equip_cert_expiring = list(
            EquipmentAttachment.objects.filter(
                file_type='certificate', expiry_date__gte=today, expiry_date__lte=cert_cutoff
            ).select_related('equipment').order_by('expiry_date')[:10]
        )
        equip_cert_expired = list(
            EquipmentAttachment.objects.filter(
                file_type='certificate', expiry_date__lt=today
            ).select_related('equipment').order_by('expiry_date')[:10]
        )

        return Response({
            'pending_quotations': pending_quotations,
            'pending_queries': pending_queries,
            'active_rentals_count': active_rentals_count,
            'pending_contracts': pending_contracts,
            'active_rentals': active_rentals,
            'recent_queries': recent_queries,
            'recent_activity': activity[:10],
            'equipment_cert_alerts': {
                'expiring': [
                    {
                        'id': str(a.id),
                        'equipment_name': a.equipment.name,
                        'equipment_model': a.equipment.model,
                        'name': a.name,
                        'expiry_date': a.expiry_date.isoformat() if a.expiry_date else None,
                    }
                    for a in equip_cert_expiring
                ],
                'expired': [
                    {
                        'id': str(a.id),
                        'equipment_name': a.equipment.name,
                        'equipment_model': a.equipment.model,
                        'name': a.name,
                        'expiry_date': a.expiry_date.isoformat() if a.expiry_date else None,
                    }
                    for a in equip_cert_expired
                ],
            },
        })
