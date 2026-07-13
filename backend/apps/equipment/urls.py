from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views

router = DefaultRouter()
router.register('equipment', views.EquipmentViewSet, basename='equipment')
router.register('categories', views.EquipmentCategoryViewSet, basename='categories')
router.register('warehouses', views.WarehouseViewSet, basename='warehouses')

equipment_router = routers.NestedSimpleRouter(router, r'equipment', lookup='equipment')
equipment_router.register(r'specs', views.EquipmentSpecificationViewSet, basename='equipment-specs')
equipment_router.register(r'attachments', views.EquipmentAttachmentViewSet, basename='equipment-attachments')
equipment_router.register(r'maintenance', views.MaintenanceRecordViewSet, basename='equipment-maintenance')
equipment_router.register(r'transit', views.EquipmentTransitViewSet, basename='equipment-transit')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(equipment_router.urls)),
]
