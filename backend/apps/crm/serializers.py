from rest_framework import serializers
from .models import (
    Customer, CustomerSite, Contract, ContractLineItem,
    ContractAmendment, ContractSignature,
    SiteEquipmentDeployment,
    CustomerActivity, CustomerFeedback, PaymentReminder, CustomerQuery,
)


class CustomerSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerSite
        exclude = ['customer']


class CustomerSiteDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerSite
        fields = '__all__'
        read_only_fields = ['customer']


class ContractLineItemSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True, default='')
    site_name = serializers.CharField(source='site.name', read_only=True, default='')

    class Meta:
        model = ContractLineItem
        fields = '__all__'
        read_only_fields = ['contract', 'line_total']


class ContractLineItemWriteSerializer(serializers.Serializer):
    equipment = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    site = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(default=1)
    rental_period = serializers.ChoiceField(choices=['hourly', 'daily', 'weekly', 'monthly'], default='daily')
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    start_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True)


class ContractAmendmentSerializer(serializers.ModelSerializer):
    amended_by_name = serializers.CharField(source='amended_by.email', read_only=True)

    class Meta:
        model = ContractAmendment
        fields = '__all__'
        read_only_fields = ['contract', 'amendment_number', 'amended_by', 'amended_at']


class ContractSignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractSignature
        fields = '__all__'
        read_only_fields = ['contract', 'signed_at']


class ContractSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ['customer']


class ContractListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            'id', 'contract_number', 'contract_type', 'customer', 'customer_name',
            'start_date', 'end_date', 'value', 'status', 'items_count',
            'signed_by_client', 'auto_renew', 'created_at',
        ]

    def get_items_count(self, obj):
        return obj.line_items.count()


class ContractDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    line_items = ContractLineItemSerializer(many=True, read_only=True)
    amendments = ContractAmendmentSerializer(many=True, read_only=True)
    signatures = ContractSignatureSerializer(many=True, read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'


class ContractCreateSerializer(serializers.ModelSerializer):
    line_items = ContractLineItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'amendment_number']

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        customer_id = self.context['view'].kwargs.get('customer_pk')
        if customer_id:
            validated_data['customer_id'] = customer_id
        contract = Contract.objects.create(**validated_data)
        self._save_line_items(contract, line_items_data)
        contract.refresh_from_db()
        return contract

    def update(self, instance, validated_data):
        line_items_data = validated_data.pop('line_items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if line_items_data is not None:
            instance.line_items.all().delete()
            self._save_line_items(instance, line_items_data)
        instance.refresh_from_db()
        return instance

    def _save_line_items(self, contract, items_data):
        for item_data in items_data:
            equipment_id = item_data.pop('equipment', None)
            if equipment_id:
                item_data['equipment_id'] = equipment_id
            site_id = item_data.pop('site', None)
            if site_id:
                item_data['site_id'] = site_id
            quantity = float(item_data.get('quantity', 1))
            unit_price_val = float(item_data.get('unit_price', 0))
            item_data['line_total'] = quantity * unit_price_val
            ContractLineItem.objects.create(contract=contract, **item_data)


class SiteEquipmentDeploymentSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source='site.name', read_only=True)
    customer_name = serializers.CharField(source='site.customer.name', read_only=True)
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_serial = serializers.CharField(source='equipment.serial_number', read_only=True)

    class Meta:
        model = SiteEquipmentDeployment
        fields = '__all__'


class CustomerActivitySerializer(serializers.ModelSerializer):
    conducted_by_name = serializers.CharField(source='conducted_by.email', read_only=True)

    class Meta:
        model = CustomerActivity
        fields = '__all__'
        read_only_fields = ['customer', 'conducted_by']


class CustomerFeedbackSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(source='submitted_by.email', read_only=True)

    class Meta:
        model = CustomerFeedback
        fields = '__all__'
        read_only_fields = ['customer', 'submitted_by']


class PaymentReminderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = PaymentReminder
        fields = '__all__'
        read_only_fields = ['customer']


class CustomerQuerySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='')
    client_display = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.email', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default='')

    class Meta:
        model = CustomerQuery
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_client_display(self, obj):
        return obj.client_display()


class CustomerListSerializer(serializers.ModelSerializer):
    contracts_count = serializers.SerializerMethodField()
    sites_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_code', 'name', 'customer_type', 'email', 'phone',
            'city', 'state', 'credit_limit', 'outstanding_amount',
            'is_active', 'contracts_count', 'sites_count',
            'created_at', 'updated_at',
        ]

    def get_contracts_count(self, obj):
        return getattr(obj, '_contracts_count', None) or obj.contracts.count()

    def get_sites_count(self, obj):
        return getattr(obj, '_sites_count', None) or obj.sites.count()


class CustomerDetailSerializer(serializers.ModelSerializer):
    sites = CustomerSiteDetailSerializer(many=True, read_only=True)
    contracts = ContractSerializer(many=True, read_only=True)
    activities = CustomerActivitySerializer(many=True, read_only=True)
    feedback = CustomerFeedbackSerializer(many=True, read_only=True)
    payment_reminders = PaymentReminderSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'


class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['outstanding_amount', 'created_at', 'updated_at']
