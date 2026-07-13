import uuid
from django.db import models
from django.conf import settings
from apps.crm.models import ContractLineItem


class Operator(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='operator_profile'
    )
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    license_type = models.CharField(max_length=100, blank=True)
    license_number = models.CharField(max_length=100, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    certifications = models.TextField(blank=True)
    experience_years = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    date_of_hire = models.DateField(null=True, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    license_file = models.FileField(upload_to='licenses/', blank=True)
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    address_line1 = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    pincode = models.CharField(max_length=20, blank=True, default='')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'operators'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.license_type or 'No License'})"


class Logsheet(models.Model):
    SHIFT_CHOICES = [
        ('morning', 'Morning (6AM-2PM)'),
        ('evening', 'Evening (2PM-10PM)'),
        ('night', 'Night (10PM-6AM)'),
        ('general', 'General (Full Day)'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('operator_approved', 'Operator Approved'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('flagged', 'Flagged for Review'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.CASCADE, related_name='logsheets'
    )
    contract_line = models.ForeignKey(
        ContractLineItem, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='logsheets'
    )
    date = models.DateField()
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, default='general')
    site_name = models.CharField(max_length=200, blank=True)

    # Shift timing
    shift_start = models.TimeField(null=True, blank=True)
    break_start = models.TimeField(null=True, blank=True)
    break_end = models.TimeField(null=True, blank=True)
    shift_end = models.TimeField(null=True, blank=True)

    # Hours
    total_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    idle_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    breakdown_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    productive_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    # Meter readings
    meter_start = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    meter_end = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Fuel
    fuel_liters = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    fuel_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='logsheet_submissions'
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='logsheet_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'logsheets'
        ordering = ['-date', '-created_at']
        unique_together = ['equipment', 'date', 'shift']

    def __str__(self):
        return f"{self.equipment.name} - {self.date} ({self.get_shift_display()})"


class LogsheetOperator(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logsheet = models.ForeignKey(
        Logsheet, on_delete=models.CASCADE, related_name='operators'
    )
    operator = models.ForeignKey(
        Operator, on_delete=models.CASCADE, related_name='logsheet_entries'
    )
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    is_present = models.BooleanField(default=True)
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'logsheet_operators'

    def __str__(self):
        return f"{self.operator.name} - {self.logsheet.date}"


class LogsheetBreakdown(models.Model):
    REASON_CHOICES = [
        ('mechanical', 'Mechanical'),
        ('electrical', 'Electrical'),
        ('hydraulic', 'Hydraulic'),
        ('tire', 'Tire / Track'),
        ('engine', 'Engine'),
        ('no_work', 'No Work / Idle'),
        ('weather', 'Weather'),
        ('operator', 'Operator Unavailable'),
        ('material', 'Material Not Available'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logsheet = models.ForeignKey(
        Logsheet, on_delete=models.CASCADE, related_name='breakdowns'
    )
    reason_code = models.CharField(max_length=50, choices=REASON_CHOICES, default='other')
    description = models.TextField(blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'logsheet_breakdowns'
        ordering = ['start_time']

    def __str__(self):
        return f"{self.get_reason_code_display()} - {self.logsheet}"


class LogsheetFuel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logsheet = models.ForeignKey(
        Logsheet, on_delete=models.CASCADE, related_name='fuel_entries'
    )
    liters = models.DecimalField(max_digits=8, decimal_places=2)
    rate_per_liter = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    vendor = models.CharField(max_length=200, blank=True)
    receipt_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'logsheet_fuel'
        ordering = ['-id']

    def __str__(self):
        return f"{self.liters}L - {self.logsheet}"


class LogsheetApproval(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logsheet = models.ForeignKey(
        Logsheet, on_delete=models.CASCADE, related_name='approvals'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    status = models.CharField(max_length=20, choices=[
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('flagged', 'Flagged for Review'),
    ])
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'logsheet_approvals'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.status} by {self.approved_by} - {self.logsheet}"


class OperatorCertification(models.Model):
    CERT_TYPES = [
        ('license', 'License'),
        ('safety', 'Safety Training'),
        ('medical', 'Medical Clearance'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operator = models.ForeignKey(
        Operator, on_delete=models.CASCADE, related_name='certification_records'
    )
    cert_type = models.CharField(max_length=20, choices=CERT_TYPES)
    name = models.CharField(max_length=200)
    cert_number = models.CharField(max_length=100, blank=True)
    issuing_authority = models.CharField(max_length=200, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    attachment = models.FileField(upload_to='operator_certs/', blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'operator_certifications'
        ordering = ['expiry_date']

    def __str__(self):
        return f"{self.name} - {self.operator.name}"


class Attendance(models.Model):
    ATTENDANCE_STATUS = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('leave', 'On Leave'),
        ('holiday', 'Holiday'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operator = models.ForeignKey(
        Operator, on_delete=models.CASCADE, related_name='attendance_records'
    )
    date = models.DateField()
    shift = models.CharField(max_length=20, choices=Logsheet.SHIFT_CHOICES, default='general')
    status = models.CharField(max_length=20, choices=ATTENDANCE_STATUS, default='present')
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    total_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance'
        unique_together = ['operator', 'date', 'shift']
        ordering = ['-date', 'operator__name']

    def __str__(self):
        return f"{self.operator.name} - {self.date} ({self.get_status_display()})"


class OperatorAllowance(models.Model):
    ALLOWANCE_TYPES = [
        ('travel', 'Travel'),
        ('food', 'Food'),
        ('accommodation', 'Accommodation'),
        ('hazard', 'Hazard Pay'),
        ('overtime', 'Overtime Allowance'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operator = models.ForeignKey(
        Operator, on_delete=models.CASCADE, related_name='allowances'
    )
    date = models.DateField()
    allowance_type = models.CharField(max_length=20, choices=ALLOWANCE_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'operator_allowances'
        ordering = ['-date', 'operator__name']

    def __str__(self):
        return f"{self.operator.name} - {self.get_allowance_type_display()} ({self.amount})"


class OperatorAvailability(models.Model):
    AVAILABILITY_STATUS = [
        ('available', 'Available'),
        ('deployed', 'Deployed'),
        ('on_leave', 'On Leave'),
        ('unavailable', 'Unavailable'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operator = models.ForeignKey(
        Operator, on_delete=models.CASCADE, related_name='availability'
    )
    date = models.DateField()
    shift = models.CharField(max_length=20, choices=Logsheet.SHIFT_CHOICES, default='general')
    status = models.CharField(max_length=20, choices=AVAILABILITY_STATUS, default='available')
    source = models.CharField(max_length=20, default='manual')
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'operator_availability'
        unique_together = ['operator', 'date', 'shift']
        ordering = ['date', 'operator__name']

    def __str__(self):
        return f"{self.operator.name} - {self.date} ({self.get_status_display()})"
