from django.urls import path, include
from rest_framework_nested import routers
from . import views

router = routers.DefaultRouter()
router.register(r'quotations', views.QuotationViewSet)
router.register(r'rental-orders', views.RentalOrderViewSet)

quotations_router = routers.NestedSimpleRouter(router, r'quotations', lookup='quotation')
quotations_router.register(r'items', views.QuotationLineItemViewSet, basename='quotation-items')

rental_orders_router = routers.NestedSimpleRouter(router, r'rental-orders', lookup='rental_order')
rental_orders_router.register(r'items', views.RentalOrderLineItemViewSet, basename='rental-order-items')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(quotations_router.urls)),
    path('', include(rental_orders_router.urls)),
    path('quotations/<uuid:quotation_pk>/amendments/',
         views.QuotationAmendmentViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='quotation-amendments'),
    path('quotations/<uuid:quotation_pk>/amendments/<uuid:pk>/',
         views.QuotationAmendmentViewSet.as_view({'get': 'retrieve'}),
         name='quotation-amendment-detail'),
]
