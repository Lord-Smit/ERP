import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(
        'crm.Customer', on_delete=models.CASCADE, related_name='invoices'
    )
    quotation = models.ForeignKey(
        'quotations.Quotation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoices'
    )
    rental_order = models.ForeignKey(
        'quotations.RentalOrder', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoices'
    )
    contract = models.ForeignKey(
        'crm.Contract', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoices'
    )
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='invoices_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-issue_date']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year_month = timezone.now().strftime('%Y%m')
            prefix = f'INV-{year_month}-'
            last = Invoice.objects.filter(
                invoice_number__startswith=prefix
            ).order_by('invoice_number').last()
            if last:
                num = int(last.invoice_number.split('-')[-1]) + 1
            else:
                num = 1
            self.invoice_number = f'{prefix}{num:04d}'
        super().save(*args, **kwargs)


class InvoiceLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='line_items'
    )
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'invoice_line_items'
        ordering = ['id']

    def __str__(self):
        return f"{self.description} x{self.quantity}"


class Payment(models.Model):
    PAYMENT_MODES = [
        ('cash', 'Cash'),
        ('cheque', 'Cheque'),
        ('bank_transfer', 'Bank Transfer'),
        ('online', 'Online Payment'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='payments'
    )
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODES, default='bank_transfer')
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']

    def __str__(self):
        return f"Payment {self.reference_number or self.id} - ₹{self.amount_paid}"
