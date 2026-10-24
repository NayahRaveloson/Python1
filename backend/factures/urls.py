from django.urls import include, path
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ClientViewSet,
    FactureViewSet,
    InscriptionView,
    ProfilView,
    RechercheSocieteView,
    TableauDeBordView,
)

router = SimpleRouter()
router.register("clients", ClientViewSet, basename="client")
router.register("factures", FactureViewSet, basename="facture")

urlpatterns = [
    path("auth/register/", InscriptionView.as_view()),
    path("auth/token/", TokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("profil/", ProfilView.as_view()),
    path("recherche-societe/", RechercheSocieteView.as_view()),
    path("dashboard/", TableauDeBordView.as_view()),
    path("", include(router.urls)),
]
