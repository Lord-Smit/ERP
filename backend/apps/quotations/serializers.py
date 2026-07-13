from rest_framework import serializers
from apps.equipment.models import Equipment
from .models import Quotation, QuotationAmendment, QuotationLineItem, RentalOrder, RentalOrderLineItem


class QuotationLineItemSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True, default='')

    class Meta:
        model = QuotationLineItem
        fields = '__all__'
        read_only_fields = ['quotation', 'line_total']


class QuotationListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'customer', 'customer_name',
            'status', 'subtotal', 'tax_amount', 'total_amount',
            'valid_until', 'items_count', 'created_at',
        ]

    def get_items_count(self, obj):
        return obj.line_items.count()


class QuotationDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True, default='')
    customer_phone = serializers.CharField(source='customer.phone', read_only=True, default='')
    customer_address = serializers.CharField(source='customer.billing_address', read_only=True, default='')
    customer_gst = serializers.CharField(source='customer.gst_number', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    sent_by_email = serializers.CharField(source='sent_by.email', read_only=True, default='')
    line_items = QuotationLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        fields = '__all__'


class QuotationLineItemWriteSerializer(serializers.Serializer):
    equipment = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(default=1)
    rental_period = serializers.ChoiceField(choices=['hourly', 'daily', 'weekly', 'monthly'], default='daily')
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


class QuotationCreateSerializer(serializers.ModelSerializer):
    line_items = QuotationLineItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['id', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at', 'created_by']

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        validated_data['created_by'] = self.context['request'].user
        quotation = Quotation.objects.create(**validated_data)
        self._save_line_items(quotation, line_items_data)
        self._recalculate_totals(quotation)
        quotation.refresh_from_db()
        return quotation

    def update(self, instance, validated_data):
        line_items_data = validated_data.pop('line_items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if line_items_data is not None:
            instance.line_items.all().delete()
            self._save_line_items(instance, line_items_data)
            self._recalculate_totals(instance)
        instance.refresh_from_db()
        return instance

    def _compute_duration(self, start_date, end_date, rental_period):
        if not start_date or not end_date:
            return 1
        days = (end_date - start_date).days
        if days < 1:
            days = 1
        if rental_period == 'daily':
            return days
        elif rental_period == 'weekly':
            return max(1, days / 7)
        elif rental_period == 'monthly':
            return max(1, days / 30)
        elif rental_period == 'hourly':
            return days * 8
        return days

    def _save_line_items(self, quotation, items_data):
        for item_data in items_data:
            equipment_id = item_data.pop('equipment', None)
            if equipment_id:
                item_data['equipment_id'] = equipment_id
            unit_price = item_data.get('unit_price')
            if not unit_price and equipment_id:
                try:
                    equip = Equipment.objects.get(id=equipment_id)
                    period = item_data.get('rental_period', 'daily')
                    price_field = f'rental_price_{period}'
                    equip_price = getattr(equip, price_field, None)
                    if equip_price:
                        item_data['unit_price'] = equip_price
                except Equipment.DoesNotExist:
                    pass
            quantity = float(item_data.get('quantity', 1))
            unit_price_val = float(item_data.get('unit_price', 0))
            duration = self._compute_duration(
                item_data.get('start_date'), item_data.get('end_date'),
                item_data.get('rental_period', 'daily'),
            )
            item_data['line_total'] = quantity * duration * unit_price_val
            QuotationLineItem.objects.create(quotation=quotation, **item_data)

    def _recalculate_totals(self, quotation):
        items = quotation.line_items.all()
        subtotal = sum(float(item.line_total or 0) for item in items)
        tax_pct = float(quotation.tax_percentage or 0)
        tax_amount = subtotal * tax_pct / 100
        total = subtotal + tax_amount
        Quotation.objects.filter(id=quotation.id).update(
            subtotal=subtotal, tax_amount=tax_amount, total_amount=total,
        )


class RentalOrderLineItemSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True, default='')

    class Meta:
        model = RentalOrderLineItem
        fields = '__all__'
        read_only_fields = ['rental_order']


class RentalOrderListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True, default='')

    class Meta:
        model = RentalOrder
        fields = [
            'id', 'order_number', 'customer', 'customer_name',
            'site', 'site_name', 'start_date', 'end_date',
            'status', 'total_amount', 'created_at',
        ]


class RentalOrderDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True, default='')
    quotation_number = serializers.CharField(source='quotation.quotation_number', read_only=True, default='')
    line_items = RentalOrderLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = RentalOrder
        fields = '__all__'


class QuotationAmendmentSerializer(serializers.ModelSerializer):
    amended_by_name = serializers.CharField(source='amended_by.email', read_only=True, default='')

    class Meta:
        model = QuotationAmendment
        fields = '__all__'
        read_only_fields = ['amendment_number', 'amended_by', 'amended_at']
