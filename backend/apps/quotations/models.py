import uuid
from django.db import models
from django.conf import settings


class Quotation(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('under_review', 'Under Review'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
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
    quotation_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(
        'crm.Customer', on_delete=models.CASCADE, related_name='quotations'
    )
    contact_person = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    valid_until = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    version_number = models.PositiveIntegerField(default=1)
    lost_reason = models.CharField(max_length=50, choices=LOST_REASON_CHOICES, blank=True)
    lost_notes = models.TextField(blank=True)
    won_reason = models.CharField(max_length=200, blank=True)

    terms_conditions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='quotations_created'
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quotations_sent'
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'quotations'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quotation_number} - {self.customer.name}"


class QuotationAmendment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation = models.ForeignKey(
        Quotation, on_delete=models.CASCADE, related_name='amendments'
    )
    amendment_number = models.PositiveIntegerField()
    amended_data = models.JSONField()
    amended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='quotation_amendments'
    )
    amended_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'quotation_amendments'
        ordering = ['-amendment_number']
        unique_together = ['quotation', 'amendment_number']

    def __str__(self):
        return f"Amendment #{self.amendment_number} - {self.quotation.quotation_number}"


class QuotationLineItem(models.Model):
    RENTAL_PERIODS = [
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation = models.ForeignKey(
        Quotation, on_delete=models.CASCADE, related_name='line_items'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.SET_NULL, null=True, blank=True
    )
    description = models.CharField(max_length=500, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    rental_period = models.CharField(max_length=20, choices=RENTAL_PERIODS, default='daily')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'quotation_line_items'
        ordering = ['id']

    def __str__(self):
        equip_name = self.equipment.name if self.equipment else self.description
        return f"{equip_name} x{self.quantity}"


class RentalOrder(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=100, unique=True)
    quotation = models.ForeignKey(
        Quotation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rental_orders'
    )
    contract = models.ForeignKey(
        'crm.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rental_orders'
    )
    customer = models.ForeignKey(
        'crm.Customer', on_delete=models.CASCADE, related_name='rental_orders'
    )
    site = models.ForeignKey(
        'crm.CustomerSite', on_delete=models.SET_NULL, null=True, blank=True
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='rental_orders_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rental_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} - {self.customer.name}"


class RentalOrderLineItem(models.Model):
    RENTAL_PERIODS = [
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rental_order = models.ForeignKey(
        RentalOrder, on_delete=models.CASCADE, related_name='line_items'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.SET_NULL, null=True, blank=True
    )
    description = models.CharField(max_length=500, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    rental_period = models.CharField(max_length=20, choices=RENTAL_PERIODS, default='daily')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'rental_order_line_items'
        ordering = ['id']

    def __str__(self):
        equip_name = self.equipment.name if self.equipment else self.description
        return f"{equip_name} x{self.quantity}"
