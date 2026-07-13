import django_filters
from django.db import models
from .models import Customer, Contract, CustomerActivity


class CustomerFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    customer_type = django_filters.ChoiceFilter(choices=Customer.CUSTOMER_TYPES)
    is_active = django_filters.BooleanFilter()
    city = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Customer
        fields = ['search', 'customer_type', 'is_active', 'city']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(name__icontains=value) |
            models.Q(customer_code__icontains=value) |
            models.Q(email__icontains=value) |
            models.Q(phone__icontains=value)
        )


class ContractFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='start_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='start_date', lookup_expr='lte')
    status = django_filters.ChoiceFilter(choices=Contract.STATUS_CHOICES)
    site = django_filters.UUIDFilter(field_name='line_items__site')
    equipment = django_filters.UUIDFilter(field_name='line_items__equipment')

    class Meta:
        model = Contract
        fields = ['date_from', 'date_to', 'status', 'contract_type', 'site', 'equipment']


class ActivityFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='conducted_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='conducted_at', lookup_expr='lte')
    activity_type = django_filters.ChoiceFilter(choices=CustomerActivity.ACTIVITY_TYPES)

    class Meta:
        model = CustomerActivity
        fields = ['date_from', 'date_to', 'activity_type']
