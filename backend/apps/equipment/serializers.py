from rest_framework import serializers
from .models import (
    EquipmentCategory, Warehouse, Equipment, EquipmentImage,
    EquipmentSpecification, EquipmentAttachment, MaintenanceRecord, EquipmentTransit,
)


class EquipmentCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentCategory
        fields = ('id', 'name', 'description', 'parent', 'children', 'created_at')

    def get_children(self, obj) -> list:
        children = obj.children.all()
        return EquipmentCategorySerializer(children, many=True).data if children else []


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'


class EquipmentImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentImage
        fields = ('id', 'image', 'is_primary', 'uploaded_at')


class EquipmentListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True, default='')
    operator_name = serializers.CharField(source='operator.name', read_only=True, default='')
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Equipment
        fields = (
            'id', 'name', 'brand', 'model', 'serial_number',
            'category', 'category_name', 'warehouse', 'warehouse_name',
            'operator', 'operator_name',
            'status', 'rental_price_hourly', 'rental_price_daily', 'rental_price_weekly', 'rental_price_monthly', 'deposit_amount',
            'primary_image', 'created_at',
        )
        read_only_fields = ('created_at',)

    def get_primary_image(self, obj) -> str | None:
        img = obj.images.filter(is_primary=True).first()
        if img:
            return img.image.url
        primary = obj.images.first()
        return primary.image.url if primary else None


class EquipmentDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True, default='')
    images = EquipmentImageSerializer(many=True, read_only=True)

    class Meta:
        model = Equipment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class EquipmentCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = Equipment
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        equipment = Equipment.objects.create(**validated_data)
        for i, img in enumerate(images_data):
            EquipmentImage.objects.create(
                equipment=equipment, image=img, is_primary=(i == 0)
            )
        return equipment

    def update(self, instance, validated_data):
        images_data = validated_data.pop('images', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if images_data:
            for i, img in enumerate(images_data):
                EquipmentImage.objects.create(
                    equipment=instance, image=img, is_primary=(i == 0 and not instance.images.exists())
                )
        return instance


class EquipmentSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentSpecification
        fields = '__all__'
        read_only_fields = ['equipment']


class EquipmentAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentAttachment
        fields = '__all__'
        read_only_fields = ['equipment']


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
        read_only_fields = ['equipment', 'created_by']


class EquipmentTransitSerializer(serializers.ModelSerializer):
    source_warehouse_name = serializers.CharField(source='source_warehouse.name', read_only=True, default='')
    source_site_name = serializers.CharField(source='source_site.name', read_only=True, default='')
    destination_site_name = serializers.CharField(source='destination_site.name', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default='')

    class Meta:
        model = EquipmentTransit
        fields = '__all__'
        read_only_fields = ['equipment', 'created_by']


class EquipmentDetailWithRelationsSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True, default='')
    operator_name = serializers.CharField(source='operator.name', read_only=True, default='')
    images = EquipmentImageSerializer(many=True, read_only=True)
    specifications = EquipmentSpecificationSerializer(many=True, read_only=True)
    attachments = EquipmentAttachmentSerializer(many=True, read_only=True)
    maintenance_records = MaintenanceRecordSerializer(many=True, read_only=True)
    transit_records = EquipmentTransitSerializer(many=True, read_only=True)

    class Meta:
        model = Equipment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
