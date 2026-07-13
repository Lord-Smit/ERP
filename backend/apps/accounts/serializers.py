from rest_framework import serializers
from .models import User
from apps.logsheet.models import Operator


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    registration_status_display = serializers.CharField(
        source='get_registration_status_display', read_only=True
    )

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone',
                  'role', 'role_display', 'is_active', 'registration_status',
                  'registration_status_display', 'rejection_reason', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('email', 'password', 'first_name', 'last_name', 'phone', 'role', 'is_active')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ('email', 'password', 'first_name', 'last_name', 'phone', 'role', 'is_active')
        read_only_fields = ('email',)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class OperatorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operator
        fields = ('name', 'phone', 'email', 'license_type', 'license_number',
                  'license_expiry', 'license_file',
                  'emergency_contact_name', 'emergency_contact_phone',
                  'address_line1', 'city', 'state', 'pincode')


class RegistrationDetailSerializer(serializers.ModelSerializer):
    operator_profile = OperatorProfileSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    registration_status_display = serializers.CharField(
        source='get_registration_status_display', read_only=True
    )

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone',
                  'role', 'role_display', 'is_active', 'registration_status',
                  'registration_status_display', 'rejection_reason', 'date_joined',
                  'operator_profile')


class OperatorRegistrationSerializer(serializers.Serializer):
    # User fields
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    phone = serializers.CharField(required=False, allow_blank=True, default='')

    # Operator fields
    name = serializers.CharField()
    license_type = serializers.CharField(required=False, allow_blank=True, default='')
    license_number = serializers.CharField(required=False, allow_blank=True, default='')
    license_expiry = serializers.DateField(required=False, allow_null=True)
    license_file = serializers.FileField(required=False, allow_null=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, default='')
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True, default='')
    address_line1 = serializers.CharField(required=False, allow_blank=True, default='')
    city = serializers.CharField(required=False, allow_blank=True, default='')
    state = serializers.CharField(required=False, allow_blank=True, default='')
    pincode = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        operator_fields = [
            'name', 'license_type', 'license_number', 'license_expiry',
            'license_file',
            'emergency_contact_name', 'emergency_contact_phone',
            'address_line1', 'city', 'state', 'pincode',
        ]
        operator_data = {f: validated_data.pop(f) for f in operator_fields if f in validated_data}

        password = validated_data.pop('password')
        validated_data['role'] = 'operator'
        validated_data['registration_status'] = 'pending'
        validated_data['is_active'] = False

        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        operator_data['email'] = validated_data.get('email', '')
        operator_data['user'] = user
        Operator.objects.create(**operator_data)

        return user
