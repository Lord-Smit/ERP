import django_filters
from .models import Invoice


class InvoiceFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='issue_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='issue_date', lookup_expr='lte')
    due_date_from = django_filters.DateFilter(field_name='due_date', lookup_expr='gte')
    due_date_to = django_filters.DateFilter(field_name='due_date', lookup_expr='lte')
    status = django_filters.ChoiceFilter(choices=Invoice.STATUS_CHOICES)
    customer = django_filters.UUIDFilter()

    class Meta:
        model = Invoice
        fields = ['date_from', 'date_to', 'due_date_from', 'due_date_to', 'status', 'customer']
