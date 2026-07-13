from django.db import models
import django_filters
from .models import Equipment


class EquipmentFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    category = django_filters.UUIDFilter(field_name='category_id')
    warehouse = django_filters.UUIDFilter(field_name='warehouse_id')
    status = django_filters.ChoiceFilter(choices=Equipment.STATUS_CHOICES)
    status_in = django_filters.BaseInFilter(field_name='status', lookup_expr='in')

    class Meta:
        model = Equipment
        fields = ['status', 'category', 'warehouse']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(name__icontains=value) |
            models.Q(brand__icontains=value) |
            models.Q(serial_number__icontains=value)
        )
