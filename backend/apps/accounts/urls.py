from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.login_view, name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('me/', views.me_view, name='auth-me'),
    path('register/', views.register_view, name='auth-register'),
    path('users/', views.UserViewSet.as_view({'get': 'list', 'post': 'create'}), name='user-list'),
    path('users/<uuid:pk>/', views.UserViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='user-detail'),
    path('users/<uuid:pk>/registration_detail/', views.UserViewSet.as_view({'get': 'registration_detail'}), name='user-registration-detail'),
    path('users/<uuid:pk>/approve/', views.UserViewSet.as_view({'post': 'approve'}), name='user-approve'),
    path('users/<uuid:pk>/reject/', views.UserViewSet.as_view({'post': 'reject'}), name='user-reject'),
]
