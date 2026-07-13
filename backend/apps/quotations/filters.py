import django_filters
from .models import Quotation, RentalOrder


class QuotationFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    status = django_filters.ChoiceFilter(choices=Quotation.STATUS_CHOICES)
    customer = django_filters.UUIDFilter()

    class Meta:
        model = Quotation
        fields = ['date_from', 'date_to', 'status', 'customer']


class RentalOrderFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='start_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='start_date', lookup_expr='lte')
    status = django_filters.ChoiceFilter(choices=RentalOrder.STATUS_CHOICES)
    customer = django_filters.UUIDFilter()

    class Meta:
        model = RentalOrder
        fields = ['date_from', 'date_to', 'status', 'customer']
