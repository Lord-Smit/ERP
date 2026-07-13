from rest_framework import serializers
from .models import (
    Operator, Logsheet, LogsheetOperator, LogsheetBreakdown,
    LogsheetFuel, LogsheetApproval, OperatorCertification,
    Attendance, OperatorAllowance, OperatorAvailability,
)


class OperatorSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, default=None)

    class Meta:
        model = Operator
        fields = '__all__'
        read_only_fields = ('created_at', 'user')


class OperatorCertificationSerializer(serializers.ModelSerializer):
    cert_type_display = serializers.CharField(source='get_cert_type_display', read_only=True)

    class Meta:
        model = OperatorCertification
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'operator')


class AttendanceSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_date(self, value):
        from django.utils import timezone
        if value != timezone.now().date():
            raise serializers.ValidationError('Attendance can only be marked for today.')
        return value


class AttendanceBulkSerializer(serializers.Serializer):
    records = AttendanceSerializer(many=True)

    def validate_records(self, value):
        from django.utils import timezone
        today = timezone.now().date()
        for record in value:
            date = record.get('date')
            if date and date != today:
                raise serializers.ValidationError('Attendance can only be marked for today.')
        return value

    def create(self, validated_data):
        records = validated_data.get('records', [])
        instances = []
        for data in records:
            instance, _ = Attendance.objects.update_or_create(
                operator=data['operator'],
                date=data['date'],
                shift=data.get('shift', 'general'),
                defaults={
                    'status': data.get('status', 'present'),
                    'check_in': data.get('check_in'),
                    'check_out': data.get('check_out'),
                    'total_hours': data.get('total_hours'),
                    'overtime_hours': data.get('overtime_hours'),
                    'notes': data.get('notes', ''),
                    'marked_by': data.get('marked_by'),
                },
            )
            instances.append(instance)
        return instances


class OperatorAllowanceSerializer(serializers.ModelSerializer):
    allowance_type_display = serializers.CharField(source='get_allowance_type_display', read_only=True)
    operator_name = serializers.CharField(source='operator.name', read_only=True)

    class Meta:
        model = OperatorAllowance
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'created_by')


class OperatorAvailabilitySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    operator_name = serializers.CharField(source='operator.name', read_only=True)

    class Meta:
        model = OperatorAvailability
        fields = '__all__'
        read_only_fields = ('id', 'updated_at')

    def validate_date(self, value):
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError('Cannot set availability for a past date.')
        return value


class OperatorDetailSerializer(serializers.ModelSerializer):
    certification_records = OperatorCertificationSerializer(many=True, read_only=True)
    attendance_records = AttendanceSerializer(many=True, read_only=True)
    allowances = OperatorAllowanceSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, default=None)

    class Meta:
        model = Operator
        fields = '__all__'
        read_only_fields = ('created_at', 'user')


class LogsheetOperatorSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.name', read_only=True)

    class Meta:
        model = LogsheetOperator
        fields = '__all__'
        read_only_fields = ('id', 'logsheet')


class LogsheetBreakdownSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source='get_reason_code_display', read_only=True)

    class Meta:
        model = LogsheetBreakdown
        fields = '__all__'
        read_only_fields = ('id', 'logsheet')


class LogsheetFuelSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogsheetFuel
        fields = '__all__'
        read_only_fields = ('id', 'logsheet')


class LogsheetApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approved_by.email', read_only=True)

    class Meta:
        model = LogsheetApproval
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class LogsheetListSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Logsheet
        fields = (
            'id', 'equipment', 'equipment_name', 'date', 'shift', 'shift_display',
            'total_hours', 'productive_hours', 'status', 'status_display',
            'site_name', 'created_by', 'created_by_name', 'created_at',
        )

    def get_created_by_name(self, obj):
        try:
            return obj.created_by.operator_profile.name
        except AttributeError:
            return "-"


class LogsheetDetailSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_serial = serializers.CharField(source='equipment.serial_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    operators = LogsheetOperatorSerializer(many=True, read_only=True)
    breakdowns = LogsheetBreakdownSerializer(many=True, read_only=True)
    fuel_entries = LogsheetFuelSerializer(many=True, read_only=True)
    approvals = LogsheetApprovalSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.email', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default='')

    class Meta:
        model = Logsheet
        fields = '__all__'


class LogsheetCreateSerializer(serializers.ModelSerializer):
    operators_data = LogsheetOperatorSerializer(many=True, required=False)
    breakdowns_data = LogsheetBreakdownSerializer(many=True, required=False)
    fuel_data = LogsheetFuelSerializer(many=True, required=False)

    class Meta:
        model = Logsheet
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'submitted_by', 'submitted_at', 'created_by')
        extra_kwargs = {
            'total_hours': {'error_messages': {'max_digits': 'Total Hours exceeds maximum of 9999.99', 'max_decimal_places': 'Total Hours accepts up to 2 decimal places'}},
            'idle_hours': {'error_messages': {'max_digits': 'Idle Hours exceeds maximum of 9999.99', 'max_decimal_places': 'Idle Hours accepts up to 2 decimal places'}},
            'breakdown_hours': {'error_messages': {'max_digits': 'Breakdown Hours exceeds maximum of 9999.99', 'max_decimal_places': 'Breakdown Hours accepts up to 2 decimal places'}},
            'productive_hours': {'error_messages': {'max_digits': 'Productive Hours exceeds maximum of 9999.99', 'max_decimal_places': 'Productive Hours accepts up to 2 decimal places'}},
            'meter_start': {'error_messages': {'max_digits': 'Meter Start exceeds maximum of 99,999,999.99', 'max_decimal_places': 'Meter Start accepts up to 2 decimal places'}},
            'meter_end': {'error_messages': {'max_digits': 'Meter End exceeds maximum of 99,999,999.99', 'max_decimal_places': 'Meter End accepts up to 2 decimal places'}},
            'fuel_liters': {'error_messages': {'max_digits': 'Fuel (Liters) exceeds maximum of 999,999.99', 'max_decimal_places': 'Fuel (Liters) accepts up to 2 decimal places'}},
            'fuel_cost': {'error_messages': {'max_digits': 'Fuel Cost exceeds maximum of 99,999,999.99', 'max_decimal_places': 'Fuel Cost accepts up to 2 decimal places'}},
        }

    def create(self, validated_data):
        operators_data = validated_data.pop('operators_data', [])
        breakdowns_data = validated_data.pop('breakdowns_data', [])
        fuel_data = validated_data.pop('fuel_data', [])
        logsheet = Logsheet.objects.create(**validated_data)
        for op in operators_data:
            LogsheetOperator.objects.create(logsheet=logsheet, **op)
        for bd in breakdowns_data:
            LogsheetBreakdown.objects.create(logsheet=logsheet, **bd)
        for fl in fuel_data:
            LogsheetFuel.objects.create(logsheet=logsheet, **fl)
        return logsheet

    def update(self, instance, validated_data):
        operators_data = validated_data.pop('operators_data', None)
        breakdowns_data = validated_data.pop('breakdowns_data', None)
        fuel_data = validated_data.pop('fuel_data', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if operators_data is not None:
            instance.operators.all().delete()
            for op in operators_data:
                LogsheetOperator.objects.create(logsheet=instance, **op)

        if breakdowns_data is not None:
            instance.breakdowns.all().delete()
            for bd in breakdowns_data:
                LogsheetBreakdown.objects.create(logsheet=instance, **bd)

        if fuel_data is not None:
            instance.fuel_entries.all().delete()
            for fl in fuel_data:
                LogsheetFuel.objects.create(logsheet=instance, **fl)

        return instance
