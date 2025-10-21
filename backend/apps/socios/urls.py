from django.urls import path
from .views import MeView, ProfileUpsertView

urlpatterns = [
    path('auth/me', MeView.as_view(), name='auth-me'),
    path('socios/profile', ProfileUpsertView.as_view(), name='socios-profile'),
]

