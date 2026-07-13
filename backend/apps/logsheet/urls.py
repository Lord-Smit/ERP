from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('operators', views.OperatorViewSet, basename='operators')
router.register('logsheets', views.LogsheetViewSet, basename='logsheets')
router.register('attendance', views.AttendanceViewSet, basename='attendance')
router.register('allowances', views.OperatorAllowanceViewSet, basename='allowances')
router.register('availability', views.OperatorAvailabilityViewSet, basename='availability')

urlpatterns = [
    path('operators/<uuid:operator_pk>/certifications/',
         views.OperatorCertificationViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='operator-certifications-list'),
    path('operators/<uuid:operator_pk>/certifications/<uuid:pk>/',
         views.OperatorCertificationViewSet.as_view({
             'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'
         }),
         name='operator-certifications-detail'),
]

urlpatterns += router.urls
