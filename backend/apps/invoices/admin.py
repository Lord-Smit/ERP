from django.contrib import admin
from .models import Invoice, InvoiceLineItem


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'status', 'issue_date', 'due_date', 'total_amount', 'paid_amount']
    list_filter = ['status']
    search_fields = ['invoice_number', 'customer__name']


@admin.register(InvoiceLineItem)
class InvoiceLineItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'description', 'quantity', 'unit_price', 'line_total']
