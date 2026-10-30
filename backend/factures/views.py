from datetime import date
from decimal import Decimal
import re

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Client, Facture, RegistreNationalEntreprise
from .pdf import generer_pdf
from .serializers import (
    ClientSerializer,
    FactureSerializer,
    InscriptionSerializer,
    PaiementSerializer,
    ProfilSerializer,
    RegistreSerializer,
)


class PossedeUnProfil(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return hasattr(request.user, "profil")


class InscriptionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = InscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Compte créé."}, status=201)


class ProfilView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfilSerializer
    permission_classes = [PossedeUnProfil]

    def get_object(self):
        return self.request.user.profil


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [PossedeUnProfil]

    def get_queryset(self):
        clients = Client.objects.filter(entreprise__user=self.request.user).annotate(
            nombre_factures=Count("factures")
        )
        recherche = self.request.query_params.get("q", "").strip()
        if recherche:
            clients = clients.filter(
                Q(nom_client__icontains=recherche)
                | Q(email__icontains=recherche)
                | Q(nif__icontains=recherche)
                | Q(telephone__icontains=recherche)
            )
        return clients.order_by("nom_client")

    def perform_create(self, serializer):
        serializer.save(entreprise=self.request.user.profil)

    def destroy(self, request, *args, **kwargs):
        client = self.get_object()
        if client.factures.exists():
            return Response(
                {"detail": "Ce client a des factures,ne peut pas être supprimer"}, status=400
            )
        client.delete()
        return Response(status=204)


class RechercheSocieteView(generics.ListAPIView):

    serializer_class = RegistreSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        recherche = self.request.query_params.get("q", "").strip()
        if len(recherche) < 2:
            return RegistreNationalEntreprise.objects.none()
        societes = RegistreNationalEntreprise.objects.filter(
            Q(nom_officiel__icontains=recherche) | Q(nif__icontains=recherche) | Q(stat__icontains=recherche)
        )
        return societes.order_by("nom_officiel")[:10]


class FactureViewSet(viewsets.ModelViewSet):
    serializer_class = FactureSerializer
    permission_classes = [PossedeUnProfil]

    def get_queryset(self):
        factures = (
            Facture.objects.filter(entreprise__user=self.request.user)
            .select_related("client", "entreprise")
            .prefetch_related("lignes", "paiements")
            .order_by("-id")
        )
        statut = self.request.query_params.get("statut")
        if statut:
            factures = factures.filter(statut=statut)
        return factures

    def update(self, request, *args, **kwargs):
        if self.get_object().statut != "BROUILLON":
            raise PermissionDenied("Cette facture est validée : ne peut plus être modifiée.")
        return super().update(request, *args, **kwargs)

    def perform_destroy(self, facture):
        if facture.statut != "BROUILLON":
            raise PermissionDenied("Cette facture est validée :ne peut plus être supprimée")
        facture.delete()

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        facture = self.get_object()
        if facture.statut != "BROUILLON":
            return Response({"detail": "Cette facture est déjà validée"}, status=400)
        if not facture.lignes.all():
            return Response({"detail": "Ajoutez au moins une ligne avant de valider"}, status=400)
        facture.valider()
        return Response(self.get_serializer(facture).data)

    @action(detail=True, methods=["post"])
    def payer(self, request, pk=None):
        with transaction.atomic():
            factures = Facture.objects.filter(entreprise__user=request.user)
            facture = get_object_or_404(
                factures.select_for_update(), pk=self.kwargs["pk"]
            )
            if facture.statut != "ENVOYEE":
                return Response(
                    {"detail": "Seule une facture envoyée peut recevoir un paiement."},
                    status=400,
                )

            if facture.total_ttc == 0 or facture.reste_a_payer <= 0:
                facture.statut = "PAYEE"
                facture.save(update_fields=["statut"])
                return Response(self.get_serializer(facture).data)

            serializer = PaiementSerializer(
                data=request.data, context={"facture": facture}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(facture=facture)

            if facture.reste_a_payer <= 0:
                facture.statut = "PAYEE"
                facture.save(update_fields=["statut"])

            return Response(self.get_serializer(facture).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        facture = self.get_object()
        nom_fichier = facture.numero_facture or f"brouillon-{facture.id}"
        reponse = HttpResponse(generer_pdf(facture), content_type="application/pdf")
        reponse["Content-Disposition"] = f'inline; filename="{nom_fichier}.pdf"'
        return reponse


def six_derniers_mois(aujourdhui):
    mois_liste =[]
    annee, mois = aujourdhui.year, aujourdhui.month
    for _ in range(6):
        mois_liste.append((annee, mois))
        mois -= 1
        if mois == 0:
            mois, annee = 12, annee - 1
    mois_liste.reverse()
    return mois_liste


class TableauDeBordView(APIView):
    permission_classes = [PossedeUnProfil]

    def get(self, request):
        aujourdhui = timezone.localdate()
        factures = Facture.objects.filter(entreprise__user=request.user)
        mois_liste = six_derniers_mois(aujourdhui)
        debut = date(mois_liste[0][0], mois_liste[0][1], 1)
        ventes = (
            factures.filter(statut__in=["ENVOYEE", "PAYEE"], date_emission__gte=debut)
            .annotate(mois=TruncMonth("date_emission"))
            .values("mois")
            .annotate(total=Sum("total_mga"))
        )
        total_par_mois = {(v["mois"].year, v["mois"].month): v["total"] for v in ventes}
        ventes_mensuelles = [
            {"mois": f"{mois:02d}/{annee}", "total": total_par_mois.get((annee, mois), Decimal("0.00"))}
            for annee, mois in mois_liste
        ]

        dernieres_factures = (
            factures.select_related("client", "entreprise")
            .prefetch_related("lignes", "paiements")
            .order_by("-id")[:5]
        )

        encaisse_montant = Decimal("0.00")
        encaisse_nombre = 0
        attente_montant = Decimal("0.00")
        attente_nombre = 0
        retard_montant = Decimal("0.00")
        retard_nombre = 0

        for facture in factures.prefetch_related("paiements"):
            if facture.statut == "PAYEE":
                encaisse_montant += facture.total_mga
                encaisse_nombre += 1
            elif facture.statut == "ENVOYEE":
                paiements_mga = Decimal("0.00")
                for paiement in facture.paiements.all():
                    paiements_mga += paiement.montant * facture.taux_change_mga

                encaisse_montant += paiements_mga
                reste_mga = facture.total_mga - paiements_mga
                if facture.date_echeance < aujourdhui:
                    retard_montant += reste_mga
                    retard_nombre += 1
                else:
                    attente_montant += reste_mga
                    attente_nombre += 1

        return Response({
            "nombre_factures": factures.count(),
            "encaisse": {"montant": encaisse_montant, "nombre": encaisse_nombre},
            "en_attente": {"montant": attente_montant, "nombre": attente_nombre},
            "en_retard": {"montant": retard_montant, "nombre": retard_nombre},
            "ventes_mensuelles": ventes_mensuelles,
            "dernieres_factures": FactureSerializer(
                dernieres_factures, many=True, context={"request": request}
            ).data, 
        })
