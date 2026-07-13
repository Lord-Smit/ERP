from django.contrib import admin
from .models import (
    Operator, Logsheet, LogsheetOperator, LogsheetBreakdown,
    LogsheetFuel, LogsheetApproval, OperatorCertification,
    Attendance, OperatorAllowance, OperatorAvailability,
)


@admin.register(Operator)
class OperatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'license_type', 'is_active')
    list_filter = ('is_active', 'license_type')
    search_fields = ('name', 'phone', 'license_number')


class LogsheetOperatorInline(admin.TabularInline):
    model = LogsheetOperator
    extra = 1


class LogsheetBreakdownInline(admin.TabularInline):
    model = LogsheetBreakdown
    extra = 0


class LogsheetFuelInline(admin.TabularInline):
    model = LogsheetFuel
    extra = 0


@admin.register(Logsheet)
class LogsheetAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'date', 'shift', 'status', 'total_hours', 'productive_hours')
    list_filter = ('status', 'shift', 'date')
    search_fields = ('equipment__name', 'site_name', 'notes')
    inlines = [LogsheetOperatorInline, LogsheetBreakdownInline, LogsheetFuelInline]


@admin.register(OperatorCertification)
class OperatorCertificationAdmin(admin.ModelAdmin):
    list_display = ('name', 'operator', 'cert_type', 'expiry_date')
    list_filter = ('cert_type',)
    search_fields = ('name', 'operator__name', 'cert_number')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('operator', 'date', 'shift', 'status', 'total_hours')
    list_filter = ('status', 'shift', 'date')
    search_fields = ('operator__name',)


@admin.register(OperatorAllowance)
class OperatorAllowanceAdmin(admin.ModelAdmin):
    list_display = ('operator', 'date', 'allowance_type', 'amount')
    list_filter = ('allowance_type',)
    search_fields = ('operator__name',)


@admin.register(OperatorAvailability)
class OperatorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('operator', 'date', 'shift', 'status', 'source')
    list_filter = ('status', 'source', 'date')
    search_fields = ('operator__name',)
