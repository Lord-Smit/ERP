from django.urls import path, include
from rest_framework_nested import routers

from .views import (
    CustomerViewSet, CustomerSiteViewSet, ContractViewSet,
    TopLevelContractViewSet,
    ContractLineItemViewSet, ContractAmendmentViewSet, ContractSignatureViewSet,
    SiteEquipmentDeploymentViewSet, CustomerActivityViewSet,
    CustomerFeedbackViewSet, PaymentReminderViewSet, AllPaymentRemindersViewSet,
    CustomerQueryViewSet, AllSitesViewSet,
)

router = routers.DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'deployments', SiteEquipmentDeploymentViewSet)
router.register(r'contracts', TopLevelContractViewSet, basename='contracts')
router.register(r'sites', AllSitesViewSet, basename='all-sites')

customers_router = routers.NestedSimpleRouter(router, r'customers', lookup='customer')
customers_router.register(r'sites', CustomerSiteViewSet, basename='customer-sites')
customers_router.register(r'contracts', ContractViewSet, basename='customer-contracts')
customers_router.register(r'activity', CustomerActivityViewSet, basename='customer-activity')
customers_router.register(r'feedback', CustomerFeedbackViewSet, basename='customer-feedback')
customers_router.register(r'reminders', PaymentReminderViewSet, basename='customer-reminders')

contracts_router = routers.NestedSimpleRouter(router, r'contracts', lookup='contract')
contracts_router.register(r'line_items', ContractLineItemViewSet, basename='contract-line-items')
contracts_router.register(r'amendments', ContractAmendmentViewSet, basename='contract-amendments')
contracts_router.register(r'signatures', ContractSignatureViewSet, basename='contract-signatures')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(customers_router.urls)),
    path('', include(contracts_router.urls)),
    path('reminders/', AllPaymentRemindersViewSet.as_view({'get': 'list', 'retrieve': 'retrieve'}), name='all-reminders'),
    path('queries/', CustomerQueryViewSet.as_view({'get': 'list', 'post': 'create'}), name='query-list'),
    path('queries/<uuid:pk>/', CustomerQueryViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='query-detail'),
    path('queries/<uuid:pk>/convert_to_quotation/', CustomerQueryViewSet.as_view({'post': 'convert_to_quotation'}), name='query-convert'),
    path('queries/<uuid:pk>/mark_lost/', CustomerQueryViewSet.as_view({'post': 'mark_lost'}), name='query-mark-lost'),
]
