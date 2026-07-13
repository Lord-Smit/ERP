from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.equipment.urls')),
    path('api/', include('apps.logsheet.urls')),
    path('api/', include('apps.crm.urls')),
    path('api/', include('apps.quotations.urls')),
    path('api/', include('apps.invoices.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
