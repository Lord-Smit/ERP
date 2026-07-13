from django.contrib import admin
from .models import (
    EquipmentCategory, Warehouse, Equipment, EquipmentImage,
    EquipmentSpecification, EquipmentAttachment, MaintenanceRecord,
)


@admin.register(EquipmentCategory)
class EquipmentCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'created_at')
    search_fields = ('name',)


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'city')


class EquipmentImageInline(admin.TabularInline):
    model = EquipmentImage
    extra = 1


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand', 'category', 'serial_number', 'status', 'warehouse')
    list_filter = ('status', 'category', 'warehouse')
    search_fields = ('name', 'brand', 'serial_number')
    inlines = [EquipmentImageInline]


@admin.register(EquipmentSpecification)
class EquipmentSpecificationAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'equipment')
    search_fields = ('key', 'value', 'equipment__name')


@admin.register(EquipmentAttachment)
class EquipmentAttachmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'file_type', 'equipment', 'uploaded_at')
    list_filter = ('file_type',)
    search_fields = ('name', 'equipment__name')


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'date', 'maintenance_type', 'cost', 'next_due_date')
    list_filter = ('maintenance_type',)
    search_fields = ('equipment__name', 'description')
