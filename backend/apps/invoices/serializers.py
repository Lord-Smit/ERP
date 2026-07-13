from rest_framework import serializers
from .models import Invoice, InvoiceLineItem, Payment


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = '__all__'
        read_only_fields = ['invoice', 'line_total']


class InvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name',
            'issue_date', 'due_date', 'status',
            'subtotal', 'total_amount', 'paid_amount', 'balance_due',
            'created_at',
        ]

    def get_balance_due(self, obj):
        return float(obj.total_amount) - float(obj.paid_amount)


class InvoiceDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_address = serializers.CharField(source='customer.billing_address', read_only=True)
    customer_gst = serializers.CharField(source='customer.gst_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    payments_list = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    contract_details = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'

    def get_contract_details(self, obj):
        if not obj.contract:
            return None
        return {
            'contract_number': obj.contract.contract_number,
            'contract_type': obj.contract.contract_type,
            'start_date': str(obj.contract.start_date),
            'end_date': str(obj.contract.end_date) if obj.contract.end_date else None,
        }

    def get_balance_due(self, obj):
        return float(obj.total_amount) - float(obj.paid_amount)

    def get_payments_list(self, obj):
        payments = obj.payments.all().order_by('-payment_date')
        return PaymentSerializer(payments, many=True).data


class InvoiceLineItemWriteSerializer(serializers.Serializer):
    description = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)


class InvoiceCreateSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount',
            'total_amount', 'paid_amount', 'created_at', 'updated_at', 'created_by',
        ]

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        validated_data['created_by'] = self.context['request'].user
        invoice = Invoice.objects.create(**validated_data)
        self._save_line_items(invoice, line_items_data)
        self._recalculate_totals(invoice)
        invoice.refresh_from_db()
        return invoice

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

    def _save_line_items(self, invoice, items_data):
        for item_data in items_data:
            quantity = float(item_data.get('quantity', 1))
            unit_price = float(item_data.get('unit_price', 0))
            item_data['line_total'] = quantity * unit_price
            InvoiceLineItem.objects.create(invoice=invoice, **item_data)

    def _recalculate_totals(self, invoice):
        items = invoice.line_items.all()
        subtotal = sum(float(item.line_total or 0) for item in items)
        total = subtotal + float(invoice.tax_amount or 0)
        Invoice.objects.filter(id=invoice.id).update(
            subtotal=subtotal, total_amount=total,
        )


class PaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


class GenerateFromLogsheetSerializer(serializers.Serializer):
    contract_id = serializers.UUIDField()
    date_from = serializers.DateField()
    date_to = serializers.DateField()

    def validate(self, attrs):
        if attrs['date_to'] < attrs['date_from']:
            raise serializers.ValidationError("date_to cannot be before date_from")
        return attrs
