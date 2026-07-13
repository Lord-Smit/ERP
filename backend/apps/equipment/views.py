from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import (
    EquipmentCategory, Warehouse, Equipment, EquipmentImage,
    EquipmentSpecification, EquipmentAttachment, MaintenanceRecord, EquipmentTransit,
)
from .serializers import (
    EquipmentCategorySerializer, WarehouseSerializer,
    EquipmentListSerializer, EquipmentDetailSerializer,
    EquipmentCreateSerializer, EquipmentImageSerializer,
    EquipmentSpecificationSerializer, EquipmentAttachmentSerializer,
    MaintenanceRecordSerializer, EquipmentDetailWithRelationsSerializer,
    EquipmentTransitSerializer,
)
from .filters import EquipmentFilter
from common.permissions import HasRole


class EquipmentCategoryViewSet(viewsets.ModelViewSet):
    queryset = EquipmentCategory.objects.filter(parent=None).prefetch_related('children')
    serializer_class = EquipmentCategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager'])]
        return [IsAuthenticated()]


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.select_related(
        'category', 'warehouse'
    ).prefetch_related(
        'images', 'specifications', 'attachments', 'maintenance_records'
    )
    permission_classes = [IsAuthenticated]
    filterset_class = EquipmentFilter
    search_fields = ['name', 'brand', 'serial_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return EquipmentListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return EquipmentCreateSerializer
        if self.action == 'retrieve':
            return EquipmentDetailWithRelationsSerializer
        return EquipmentDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy',
                           'mark_available', 'mark_rented', 'mark_maintenance', 'mark_retired', 'mark_reserved', 'mark_in_transit',
                           'set_primary_image', 'delete_image'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor', 'operator'])]
        if self.action == 'images':
            if self.request.method == 'POST':
                return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor', 'operator'])]
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get', 'post'], url_path='images')
    def images(self, request, pk=None):
        equipment = self.get_object()
        if request.method == 'GET':
            serializer = EquipmentImageSerializer(equipment.images.all(), many=True)
            return Response(serializer.data)
        serializer = EquipmentImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(equipment=equipment, is_primary=not equipment.images.exists())
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='set-primary-image')
    def set_primary_image(self, request, pk=None):
        equipment = self.get_object()
        image_id = request.data.get('image_id')
        if not image_id:
            return Response({'error': 'image_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            img = equipment.images.get(id=image_id)
            equipment.images.update(is_primary=False)
            img.is_primary = True
            img.save()
            return Response({'status': 'primary image updated'})
        except EquipmentImage.DoesNotExist:
            return Response({'error': 'image not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='delete-image')
    def delete_image(self, request, pk=None):
        equipment = self.get_object()
        image_id = request.data.get('image_id')
        if not image_id:
            return Response({'error': 'image_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            img = equipment.images.get(id=image_id)
            is_primary = img.is_primary
            img.delete()
            if is_primary:
                next_img = equipment.images.first()
                if next_img:
                    next_img.is_primary = True
                    next_img.save()
            return Response({'status': 'image deleted'})
        except EquipmentImage.DoesNotExist:
            return Response({'error': 'image not found'}, status=status.HTTP_404_NOT_FOUND)

    # Status transitions
    @action(detail=True, methods=['post'])
    def mark_reserved(self, request, pk=None):
        equip = self.get_object()
        equip.status = 'reserved'
        equip.save()
        return Response({'status': 'reserved'})

    @action(detail=True, methods=['post'])
    def mark_available(self, request, pk=None):
        equip = self.get_object()
        equip.status = 'available'
        equip.save()
        return Response({'status': 'available'})

    @action(detail=True, methods=['post'])
    def mark_rented(self, request, pk=None):
        equip = self.get_object()
        equip.status = 'rented'
        equip.save()
        return Response({'status': 'rented'})

    @action(detail=True, methods=['post'])
    def mark_maintenance(self, request, pk=None):
        equip = self.get_object()
        equip.status = 'maintenance'
        equip.save()
        return Response({'status': 'maintenance'})

    @action(detail=True, methods=['post'])
    def mark_retired(self, request, pk=None):
        equip = self.get_object()
        equip.status = 'retired'
        equip.save()
        return Response({'status': 'retired'})

    @action(detail=True, methods=['post'])
    def mark_in_transit(self, request, pk=None):
        equip = self.get_object()
        equip.status = 'in_transit'
        equip.save()
        return Response({'status': 'in_transit'})

    @action(detail=False, methods=['get'], url_path='cert-expiry-alerts')
    def cert_expiry_alerts(self, request):
        days = int(request.query_params.get('days', 30))
        today = timezone.now().date()
        cutoff = today + timedelta(days=days)

        expiring = EquipmentAttachment.objects.filter(
            file_type='certificate', expiry_date__gte=today, expiry_date__lte=cutoff
        ).select_related('equipment').order_by('expiry_date')

        expired = EquipmentAttachment.objects.filter(
            file_type='certificate', expiry_date__lt=today
        ).select_related('equipment').order_by('expiry_date')

        return Response({
            'expiring': [
                {
                    'id': a.id,
                    'equipment_name': a.equipment.name,
                    'equipment_model': a.equipment.model,
                    'name': a.name,
                    'expiry_date': a.expiry_date,
                }
                for a in expiring
            ],
            'expired': [
                {
                    'id': a.id,
                    'equipment_name': a.equipment.name,
                    'equipment_model': a.equipment.model,
                    'name': a.name,
                    'expiry_date': a.expiry_date,
                }
                for a in expired
            ],
        })


class EquipmentSpecificationViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentSpecificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return EquipmentSpecification.objects.filter(equipment_id=self.kwargs['equipment_pk'])

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor', 'operator'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(equipment_id=self.kwargs['equipment_pk'])


class EquipmentAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentAttachmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return EquipmentAttachment.objects.filter(equipment_id=self.kwargs['equipment_pk'])

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor', 'operator'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(equipment_id=self.kwargs['equipment_pk'])


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return MaintenanceRecord.objects.filter(equipment_id=self.kwargs['equipment_pk'])

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor', 'operator'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(
            equipment_id=self.kwargs['equipment_pk'],
            created_by=self.request.user,
        )


class EquipmentTransitViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentTransitSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return EquipmentTransit.objects.filter(equipment_id=self.kwargs['equipment_pk'])

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), HasRole(['super_admin', 'operations_manager', 'field_supervisor', 'operator'])]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(
            equipment_id=self.kwargs['equipment_pk'],
            created_by=self.request.user,
        )
