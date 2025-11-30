"""
URL configuration for core project.
"""
from django.contrib import admin
from django.http import HttpResponse, JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def healthz(_request):
    return HttpResponse("ok")


def api_ping(_request):
    return JsonResponse({"status": "ok"})


def root(_request):
    """Landing endpoint for the root path."""
    return JsonResponse(
        {
            "service": "coop-backend",
            "status": "ok",
            "docs": "/api/docs/",
            "ping": "/api/ping/",
            "health": "/healthz",
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", root),
    path("healthz", healthz),
    path("api/ping/", api_ping),
    path("api/auth/", include("apps.usuarios.urls")),  # Autenticación propia
    # Password reset y utilidades built-in de Django
    path("api/auth/", include("django.contrib.auth.urls")),
    path("api/", include("apps.socios.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
