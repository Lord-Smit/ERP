from django.db import models
import django_filters
from .models import Logsheet


class LogsheetFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    equipment = django_filters.UUIDFilter(field_name='equipment_id')
    month = django_filters.CharFilter(method='filter_month')
    week = django_filters.CharFilter(method='filter_week')

    class Meta:
        model = Logsheet
        fields = ['status', 'shift', 'equipment', 'date']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(equipment__name__icontains=value) |
            models.Q(site_name__icontains=value) |
            models.Q(notes__icontains=value)
        )

    def filter_month(self, queryset, name, value):
        try:
            year, month = value.split('-')
            return queryset.filter(date__year=year, date__month=month)
        except (ValueError, AttributeError):
            return queryset

    def filter_week(self, queryset, name, value):
        try:
            year, week = value.split('-W')
            return queryset.filter(date__year=year, date__week=week)
        except (ValueError, AttributeError):
            return queryset
