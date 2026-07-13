import uuid
from django.db import models
from django.conf import settings


class Customer(models.Model):
    CUSTOMER_TYPES = [
        ('company', 'Company'),
        ('individual', 'Individual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=300)
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPES, default='company')

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    alternate_phone = models.CharField(max_length=20, blank=True)

    billing_address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    gst_number = models.CharField(max_length=50, blank=True)
    pan_number = models.CharField(max_length=50, blank=True)

    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_terms = models.CharField(max_length=200, blank=True)

    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['name']

    def __str__(self):
        return f"{self.customer_code} - {self.name}"


class CustomerSite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name='sites'
    )
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    contact_person = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customer_sites'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.customer.name})"


class Contract(models.Model):
    CONTRACT_TYPES = [
        ('rental', 'Rental'),
        ('service', 'Service'),
        ('lease', 'Lease'),
        ('maintenance', 'Maintenance'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('terminated', 'Terminated'),
        ('draft', 'Draft'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name='contracts'
    )
    quotation = models.ForeignKey(
        'quotations.Quotation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contracts'
    )
    contract_number = models.CharField(max_length=100, unique=True)
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPES, default='rental')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    payment_terms = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)

    mobilization_charges = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    demobilization_charges = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    security_deposit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    insurance_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    auto_renew = models.BooleanField(default=False)
    renewal_reminder_days = models.PositiveIntegerField(default=30)
    signed_by_client = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    amendment_number = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='contracts_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contracts'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.contract_number} - {self.customer.name}"


class ContractLineItem(models.Model):
    RENTAL_PERIODS = [
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(
        Contract, on_delete=models.CASCADE, related_name='line_items'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_line_items'
    )
    site = models.ForeignKey(
        CustomerSite, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contract_line_items'
    )
    description = models.CharField(max_length=500, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    rental_period = models.CharField(max_length=20, choices=RENTAL_PERIODS, default='daily')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'contract_line_items'
        ordering = ['id']

    def __str__(self):
        equip_name = self.equipment.name if self.equipment else self.description
        return f"{equip_name} x{self.quantity}"


class ContractAmendment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(
        Contract, on_delete=models.CASCADE, related_name='amendments'
    )
    amendment_number = models.PositiveIntegerField()
    amended_data = models.JSONField()
    amended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='contract_amendments'
    )
    amended_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'contract_amendments'
        ordering = ['-amendment_number']
        unique_together = ['contract', 'amendment_number']

    def __str__(self):
        return f"Amendment #{self.amendment_number} - {self.contract.contract_number}"


class ContractSignature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(
        Contract, on_delete=models.CASCADE, related_name='signatures'
    )
    signatory_name = models.CharField(max_length=300)
    signatory_email = models.EmailField()
    signature_data = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    signed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contract_signatures'
        ordering = ['-signed_at']

    def __str__(self):
        return f"Signature by {self.signatory_name} for {self.contract.contract_number}"


class SiteEquipmentDeployment(models.Model):
    STATUS_CHOICES = [
        ('deployed', 'Deployed'),
        ('removed', 'Removed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site = models.ForeignKey(
        CustomerSite, on_delete=models.CASCADE, related_name='deployments'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.CASCADE, related_name='deployments'
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='deployed')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'site_equipment_deployments'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.equipment.name} @ {self.site.name}"


class CustomerActivity(models.Model):
    ACTIVITY_TYPES = [
        ('call', 'Phone Call'),
        ('visit', 'Site Visit'),
        ('email', 'Email'),
        ('meeting', 'Meeting'),
        ('note', 'Internal Note'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name='activities'
    )
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES, default='call')
    subject = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    conducted_at = models.DateTimeField()
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_status = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customer_activities'
        ordering = ['-conducted_at']

    def __str__(self):
        return f"{self.get_activity_type_display()}: {self.subject}"


class CustomerFeedback(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]
    CATEGORY_CHOICES = [
        ('service', 'Service'),
        ('equipment', 'Equipment'),
        ('support', 'Support'),
        ('general', 'General'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name='feedback'
    )
    rating = models.IntegerField(choices=RATING_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    feedback_text = models.TextField(blank=True)
    received_date = models.DateField()
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customer_feedback'
        ordering = ['-received_date']

    def __str__(self):
        return f"{self.customer.name} - {self.rating}/5"


class PaymentReminder(models.Model):
    REMINDER_TYPES = [
        ('email', 'Email'),
        ('phone', 'Phone Call'),
        ('sms', 'SMS'),
        ('visit', 'Site Visit'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name='payment_reminders'
    )
    invoice_number = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    reminded_at = models.DateTimeField(null=True, blank=True)
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPES, default='email')
    notes = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_reminders'
        ordering = ['-due_date']

    def __str__(self):
        return f"Reminder: {self.customer.name} - {self.invoice_number or 'N/A'}"


class CustomerQuery(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('converted', 'Converted to Quotation'),
        ('lost', 'Lost'),
        ('closed', 'Closed'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    LOST_REASON_CHOICES = [
        ('price_too_high', 'Price Too High'),
        ('found_competitor', 'Found Better Vendor'),
        ('budget_constraints', 'Budget Constraints'),
        ('delayed_delivery', 'Delayed Delivery'),
        ('spec_not_met', 'Specifications Not Met'),
        ('no_longer_needed', 'No Longer Needed'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, null=True, blank=True,
        related_name='queries'
    )
    client_name = models.CharField(max_length=300, blank=True)
    client_phone = models.CharField(max_length=20, blank=True)
    client_email = models.EmailField(blank=True)
    subject = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    equipment_type = models.CharField(max_length=200, blank=True)
    site_location = models.CharField(max_length=300, blank=True)
    duration = models.PositiveIntegerField(null=True, blank=True)
    duration_unit = models.CharField(max_length=20, choices=[
        ('hours', 'Hours'), ('days', 'Days'), ('weeks', 'Weeks'), ('months', 'Months'),
    ], default='days')
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    lost_reason = models.CharField(max_length=50, choices=LOST_REASON_CHOICES, blank=True)
    lost_notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_queries'
    )
    quotation = models.ForeignKey(
        'quotations.Quotation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='customer_queries'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='created_queries'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_queries'
        ordering = ['-created_at']

    def client_display(self):
        return self.client_name or (self.customer.name if self.customer else '')

    def __str__(self):
        return f"{self.subject} - {self.client_display()}"
