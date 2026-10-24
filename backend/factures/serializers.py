import re
from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Client, Facture, LigneFacture, ProfilEntreprise, RegistreNationalEntreprise


class InscriptionSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    nom_societe = serializers.CharField(max_length=255)

    def validate_email(self, email):
        email = email.lower()
        if User.objects.filter(username=email).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return email

    @transaction.atomic
    def create(self, donnees):
        user = User.objects.create_user(
            username=donnees["email"], email=donnees["email"], password=donnees["password"]
        )
        ProfilEntreprise.objects.create(user=user, nom_societe=donnees["nom_societe"])
        return user


class ProfilSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(write_only=True, required=False)
    logo_url = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ProfilEntreprise
        fields = [
            "email", "nom_societe", "nif", "stat", "rcs", "adresse", "telephone",
            "coordonnees_bancaires", "prefixe_numerotation", "logo", "logo_url",
        ]

    def get_logo_url(self, profil):
        return profil.logo.url if profil.logo else ""

    def validate_nif(self, valeur):
        if valeur and not re.fullmatch(r"\d{10}", valeur):
            raise serializers.ValidationError("Le NIF doit contenir exactement 10 chiffres.")
        return valeur

    def validate_stat(self, valeur):
        if valeur and not re.fullmatch(r"\d{17}", valeur):
            raise serializers.ValidationError("Le STAT doit contenir exactement 17 chiffres.")
        return valeur

    def validate_telephone(self, valeur):
        if valeur and not re.fullmatch(r"\d{10}", valeur):
            raise serializers.ValidationError("Le téléphone doit contenir exactement 10 chiffres.")
        return valeur

    def validate_rcs(self, valeur):
        valeur = valeur.strip()
        if valeur and not 10 <= len(valeur) <= 40:
            raise serializers.ValidationError("Le RCS doit contenir entre 10 et 40 caractères.")
        return valeur

    def validate_prefixe_numerotation(self, prefixe):
        prefixe = prefixe.strip().upper()
        if not re.fullmatch(r"[A-Z0-9-]{1,10}", prefixe):
            raise serializers.ValidationError("Utilisez 1 à 10 lettres, chiffres ou tirets.")
        profil = self.instance
        if profil and prefixe != profil.prefixe_numerotation:
            if profil.factures.exclude(statut="BROUILLON").exists():
                raise serializers.ValidationError(
                    "Le préfixe ne peut plus être modifié : vous avez déjà des factures validées."
                )
        return prefixe


class RegistreSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistreNationalEntreprise
        fields = ["id", "nom_officiel", "nif", "stat", "rcs", "adresse_siege"]


class ClientSerializer(serializers.ModelSerializer):
    nombre_factures = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ["id", "type_client", "nom_client", "email", "nif", "stat", "rcs", "adresse", "telephone", "nombre_factures"]

    def validate_telephone(self, valeur):
        if valeur and not re.fullmatch(r"\d{10}", valeur):
            raise serializers.ValidationError("Le téléphone doit contenir exactement 10 chiffres.")
        return valeur

    def validate_nif(self, valeur):
        if valeur and not re.fullmatch(r"\d{10}", valeur):
            raise serializers.ValidationError("Le NIF doit contenir exactement 10 chiffres, sans lettres ni espaces.")
        return valeur

    def validate_stat(self, valeur):
        if valeur and not re.fullmatch(r"\d{17}", valeur):
            raise serializers.ValidationError("Le numéro STAT doit contenir exactement 17 chiffres, sans lettres ni espaces.")
        return valeur

    def validate_rcs(self, valeur):
        valeur = valeur.strip()
        if valeur and not 10 <= len(valeur) <= 40:
            raise serializers.ValidationError("Le RCS doit contenir entre 10 et 40 caractères.")
        return valeur

    def validate(self, donnees):
        donnees = super().validate(donnees)
        if "type_client" in donnees:
            type_client = donnees["type_client"]
        elif self.instance:
            type_client = self.instance.type_client
        elif donnees.get("nif") or donnees.get("stat") or donnees.get("rcs"):
            type_client = "ENTREPRISE"
            donnees["type_client"] = type_client
        else:
            type_client = "PARTICULIER"
            donnees["type_client"] = type_client
        if type_client == "ENTREPRISE":
            for champ, longueur, nom in [
                ("nif", 10, "NIF"), ("stat", 17, "STAT"),
            ]:
                valeur = donnees.get(champ, getattr(self.instance, champ, ""))
                if not valeur or not re.fullmatch(rf"\d{{{longueur}}}", valeur):
                    raise serializers.ValidationError({champ: f"{nom} doit contenir exactement {longueur} chiffres, sans lettres ni espaces."})
            rcs = donnees.get("rcs", getattr(self.instance, "rcs", ""))
            if not rcs or not 10 <= len(rcs.strip()) <= 40:
                raise serializers.ValidationError({"rcs": "Le RCS est obligatoire et doit contenir entre 10 et 40 caractères."})
        else:
            donnees["nif"] = ""
            donnees["stat"] = ""
            donnees["rcs"] = ""
        return donnees

    def get_nombre_factures(self, client):
        if hasattr(client, "nombre_factures"):
            return client.nombre_factures
        return client.factures.count()


class LigneFactureSerializer(serializers.ModelSerializer):
    montant_ht = serializers.ReadOnlyField()
    montant_tva = serializers.ReadOnlyField()

    class Meta:
        model = LigneFacture
        fields = ["id", "description", "quantite", "prix_unitaire", "taux_tva", "montant_ht", "montant_tva"]


class FactureSerializer(serializers.ModelSerializer):
    lignes = LigneFactureSerializer(many=True)
    emetteur = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    total_ht = serializers.ReadOnlyField()
    total_tva = serializers.ReadOnlyField()
    total_ttc = serializers.ReadOnlyField()

    class Meta:
        model = Facture
        fields = [
            "id", "client", "client_details", "emetteur", "logo_url", "numero_facture",
            "date_emission", "date_echeance", "statut", "devise", "taux_change_mga",
            "exoneree_tva", "lignes", "total_ht", "total_tva", "total_ttc", "total_mga",
        ]
        read_only_fields = ["numero_facture", "date_emission", "statut", "total_mga"]

    def get_emetteur(self, facture):
        return facture.donnees_emetteur()

    def get_client_details(self, facture):
        return facture.donnees_client()

    def get_logo_url(self, facture):
        logo = facture.entreprise.logo
        return logo.url if logo else ""

    def validate_client(self, client):
        if client.entreprise_id != self.context["request"].user.profil.id:
            raise serializers.ValidationError("Client invalide.")
        return client

    def validate_lignes(self, lignes):
        if not lignes:
            raise serializers.ValidationError("Ajoutez au moins une ligne à la facture.")
        return lignes

    def validate(self, donnees):
        taux = donnees.get("taux_change_mga", getattr(self.instance, "taux_change_mga", Decimal("1")))
        if taux is None or taux <= 0:
            raise serializers.ValidationError({"taux_change_mga": "Le taux de change doit être supérieur à zéro."})

        date_echeance = donnees.get("date_echeance", getattr(self.instance, "date_echeance", None))
        date_reference = self.instance.date_emission if self.instance else timezone.localdate()
        if date_echeance and date_echeance < date_reference:
            raise serializers.ValidationError({"date_echeance": "La date d'échéance ne peut pas être antérieure à la date de création de la facture."})

        devise = donnees.get("devise", getattr(self.instance, "devise", "MGA"))
        if devise == "MGA":
            donnees["taux_change_mga"] = Decimal("1")
        return donnees

    @transaction.atomic
    def create(self, donnees):
        lignes = donnees.pop("lignes")
        entreprise = self.context["request"].user.profil
        facture = Facture.objects.create(entreprise=entreprise, **donnees)
        for ligne in lignes:
            LigneFacture.objects.create(facture=facture, **ligne)
        return facture

    @transaction.atomic
    def update(self, facture, donnees):
        lignes = donnees.pop("lignes", None)
        for champ, valeur in donnees.items():
            setattr(facture, champ, valeur)
        facture.save()
        if lignes is not None:
            facture.lignes.all().delete()
            for ligne in lignes:
                LigneFacture.objects.create(facture=facture, **ligne)
        return facture
