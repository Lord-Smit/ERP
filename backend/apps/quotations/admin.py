from django.contrib import admin
from .models import Quotation, QuotationLineItem, RentalOrder, RentalOrderLineItem


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['quotation_number', 'customer', 'status', 'total_amount', 'valid_until', 'created_at']
    list_filter = ['status']
    search_fields = ['quotation_number', 'customer__name']


@admin.register(QuotationLineItem)
class QuotationLineItemAdmin(admin.ModelAdmin):
    list_display = ['quotation', 'equipment', 'quantity', 'rental_period', 'start_date', 'end_date', 'unit_price', 'line_total']


@admin.register(RentalOrder)
class RentalOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer', 'status', 'start_date', 'end_date', 'total_amount']
    list_filter = ['status']
    search_fields = ['order_number', 'customer__name']


@admin.register(RentalOrderLineItem)
class RentalOrderLineItemAdmin(admin.ModelAdmin):
    list_display = ['rental_order', 'equipment', 'quantity', 'rental_period', 'start_date', 'end_date', 'line_total']
