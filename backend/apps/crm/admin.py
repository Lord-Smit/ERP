from django.contrib import admin
from .models import (
    Customer, CustomerSite, Contract, SiteEquipmentDeployment,
    CustomerActivity, CustomerFeedback, PaymentReminder,
)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['customer_code', 'name', 'customer_type', 'city', 'is_active']
    list_filter = ['customer_type', 'is_active', 'city']
    search_fields = ['name', 'customer_code', 'email', 'phone']


@admin.register(CustomerSite)
class CustomerSiteAdmin(admin.ModelAdmin):
    list_display = ['name', 'customer', 'city', 'is_active']
    list_filter = ['is_active', 'city']
    search_fields = ['name', 'customer__name']


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['contract_number', 'customer', 'contract_type', 'start_date', 'end_date', 'status']
    list_filter = ['contract_type', 'status']
    search_fields = ['contract_number', 'customer__name']


@admin.register(SiteEquipmentDeployment)
class SiteEquipmentDeploymentAdmin(admin.ModelAdmin):
    list_display = ['equipment', 'site', 'start_date', 'end_date', 'status']
    list_filter = ['status']
    search_fields = ['equipment__name', 'site__name']


@admin.register(CustomerActivity)
class CustomerActivityAdmin(admin.ModelAdmin):
    list_display = ['subject', 'customer', 'activity_type', 'conducted_at']
    list_filter = ['activity_type']
    search_fields = ['subject', 'customer__name']


@admin.register(CustomerFeedback)
class CustomerFeedbackAdmin(admin.ModelAdmin):
    list_display = ['customer', 'rating', 'category', 'received_date', 'is_resolved']
    list_filter = ['rating', 'category', 'is_resolved']
    search_fields = ['customer__name']


@admin.register(PaymentReminder)
class PaymentReminderAdmin(admin.ModelAdmin):
    list_display = ['customer', 'invoice_number', 'amount', 'due_date', 'is_resolved']
    list_filter = ['reminder_type', 'is_resolved']
    search_fields = ['customer__name', 'invoice_number']
