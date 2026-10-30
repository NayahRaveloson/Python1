import re
from decimal import Decimal
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from .models import Client, Facture, LigneFacture, Paiement, ProfilEntreprise, RegistreNationalEntreprise


def valider_telephone(valeur):
    if valeur and not re.fullmatch(r"\d{10}", valeur):
        raise serializers.ValidationError("Le téléphone doit contenir exactement 10 chiffres")
    return valeur

def valider_document(valeur, longueur, libelle, message=None):
    if valeur and not re.fullmatch(r"\d{%d}" % longueur, valeur):
        raise serializers.ValidationError(
            message or f"{libelle} doit contenir {longueur} chiffres"
        )
    return valeur or ""

def valider_rcs(valeur):
    valeur = (valeur or "").strip()
    if valeur and not 10 <= len(valeur) <= 40:
        raise serializers.ValidationError("Le RCS doit contenir entre 10 et 40 caractères")
    return valeur

class InscriptionSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    nom_societe = serializers.CharField(max_length=255)

    def validate_email(self, email):
        email = email.lower()
        if User.objects.filter(username=email).exists():
            raise serializers.ValidationError("Un compte existe déjà avec ce email!")
        return email

    @transaction.atomic
    def create(self, donnees):
        mot_de_passe = donnees["password"]
        user = User.objects.create_user(
            username=donnees["email"],
            email=donnees["email"],
            password=mot_de_passe,
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
            "email", 
            "nom_societe", 
            "nif", 
            "stat",
            "rcs", 
            "adresse", 
            "telephone",
            "coordonnees_bancaires", 
            "prefixe_numerotation", 
            "logo", 
            "logo_url",
        ]

    def get_logo_url(self, profil):
        if profil.logo:
            return profil.logo.url
        return ""

    def validate_nif(self, valeur):
        return valider_document(
            valeur, 10, "Le NIF", "Le NIF doit contenir exactement 10chiffres"
        )

    def validate_stat(self, valeur):
        return valider_document(
            valeur, 17, "Le STAT", "Le STAT doit contenir exactement 17 chiffres"
        )

    def validate_telephone(self, valeur):
        return valider_telephone(valeur)

    def validate_rcs(self, valeur):
        return valider_rcs(valeur)

    def validate_prefixe_numerotation(self, prefixe):
        prefixe = prefixe.strip().upper()
        if not re.fullmatch(r"[A-Z0-9-]{1,10}", prefixe):
            raise serializers.ValidationError("Utilisez 1 à 10 lettres, des chiffres ou des tiréts")
        profil = self.instance
        if profil and prefixe != profil.prefixe_numerotation:
            if profil.factures.exclude(statut="BROUILLON").exists():
                raise serializers.ValidationError(
                    "Le préfixe ne peut plus être modifié : vous avez déjà des factures validées"
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
        fields = [
            "id", "type_client", "nom_client", "email", "nif", "stat", "rcs",
            "adresse", "telephone", "nombre_factures",
        ]

    def validate_telephone(self, valeur):
        return valider_telephone(valeur)

    def validate_nom_client(self, valeur):
        return " ".join(valeur.split())

    def validate_email(self, valeur):
        return valeur.strip().lower()

    def validate_nif(self, valeur):
        return valider_document(
            valeur,
            10,
            "NIF",
            "Le NIF doit contenir exactement 10chiffres, sans lettre ni espace",
        )

    def validate_stat(self, valeur):
        return valider_document(
            valeur,
            17,
            "STAT",
            "Le numéro STAT doit contenir exactement 17chiffres, sans lettre ni espace",
        )

    def validate_rcs(self, valeur):
        return valider_rcs(valeur)

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
            nif = donnees.get("nif", getattr(self.instance, "nif", ""))
            stat = donnees.get("stat", getattr(self.instance, "stat", ""))
            rcs = donnees.get("rcs", getattr(self.instance, "rcs", ""))
 
            valider_document(nif, 10, "NIF")
            valider_document(stat, 17, "STAT")
            if not rcs or not (10 <= len(rcs.strip()) <= 40):
                raise serializers.ValidationError(
                    {"rcs": "RCS obligatoire (10 à 40 caractères)"}
                )
        else:
            donnees["nif"] = ""
            donnees["stat"] = ""
            donnees["rcs"] = ""
        return donnees

    def verifier_doublon(self, entreprise, donnees, instance=None):
        autres = Client.objects.filter(entreprise=entreprise)
        if instance:
            autres = autres.exclude(pk=instance.pk)
 
        nif = donnees.get("nif", getattr(instance, "nif", ""))
        stat = donnees.get("stat", getattr(instance, "stat", ""))
 
        if nif and autres.filter(nif=nif).exists():
            raise serializers.ValidationError({"nif": "Vous avez déjà un client avec ce NIF"})
        if stat and autres.filter(stat=stat).exists():
            raise serializers.ValidationError({"stat": "Vous avez déjà un client avec ce STAT"})
 
        nom = donnees.get("nom_client", getattr(instance, "nom_client", "")).lower()
        email = donnees.get("email", getattr(instance, "email", "")).lower()
        telephone = donnees.get("telephone", getattr(instance, "telephone", ""))
 
        filtre = Q(nom_client__iexact=nom) | Q(email__iexact=email)
        if telephone:
            filtre |= Q(telephone=telephone)
 
        for autre in autres.filter(filtre):
            communs = 0
            if autre.nom_client.lower() == nom:
                communs += 1
            if autre.email.lower() == email:
                communs += 1
            if telephone and autre.telephone == telephone:
                communs += 1
 
            if communs >= 2:
                raise serializers.ValidationError(
                    {"email": f"Ce client existe déjà : « {autre.nom_client} »"}
                )
    @transaction.atomic
    def create(self, donnees):
        entreprise = donnees["entreprise"]
        ProfilEntreprise.objects.select_for_update().get(pk=entreprise.pk)
        self.verifier_doublon(entreprise, donnees)
        return super().create(donnees)

    @transaction.atomic
    def update(self, client, donnees):
        ProfilEntreprise.objects.select_for_update().get(pk=client.entreprise_id)
        champs = ["nom_client", "email", "telephone", "nif", "stat"]
        a_change = False
        for champ in champs:
            if champ in donnees and donnees[champ] != getattr(client, champ):
                a_change = True
        if a_change:
            self.verifier_doublon(client.entreprise, donnees, client)
        return super().update(client, donnees)
 
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

    def validate_prix_unitaire(self, prix):
        if prix <= 0:
            raise serializers.ValidationError(
                "Le prix unitaire doit être supérieur à zéro."
            )
        return prix

    def validate_taux_tva(self, taux):
        if taux < 0:
            raise serializers.ValidationError("Le taux de TVA ne peut pas être négatif.")
        return taux


class PaiementSerializer(serializers.ModelSerializer):
    montant = serializers.DecimalField(
        max_digits=18, decimal_places=2, min_value=Decimal("0.01"), required=False
    )
    date_paiement = serializers.DateField(required=False)

    class Meta:
        model = Paiement
        fields = ["id", "montant", "mode", "reference", "date_paiement"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "mode": {"required": True},
            "reference": {"required": False, "allow_blank": True},
        }

    def validate(self, donnees):
        facture = self.context["facture"]
        montant = donnees.get("montant", facture.reste_a_payer)
        if montant <= 0:
            raise serializers.ValidationError(
                {"montant": "Le montant doit être supérieur à zéro."}
            )
        if montant > facture.reste_a_payer:
            raise serializers.ValidationError(
                {"montant": "Le montant dépasse le reste à payer"}
            )

        aujourdhui = timezone.localdate()
        date_paiement = donnees.get("date_paiement", aujourdhui)
        if date_paiement > aujourdhui:
            raise serializers.ValidationError(
                {"date_paiement": "La date du paiement ne peut pas être dans le futur"}
            )
        if date_paiement < facture.date_emission:
            raise serializers.ValidationError(
                {"date_paiement": "La date du paiement ne peut pas être avant l'émission de la facture"}
            )

        donnees["montant"] = montant
        donnees["date_paiement"] = date_paiement
        donnees["reference"] = donnees.get("reference", "").strip()
        return donnees


class FactureSerializer(serializers.ModelSerializer):
    lignes = LigneFactureSerializer(many=True)
    paiements = PaiementSerializer(many=True, read_only=True)
    emetteur = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    total_ht = serializers.ReadOnlyField()
    total_tva = serializers.ReadOnlyField()
    total_ttc = serializers.ReadOnlyField()
    total_paye = serializers.ReadOnlyField()
    reste_a_payer = serializers.ReadOnlyField()

    class Meta:
        model = Facture
        fields = [
            "id", 
            "client", 
            "client_details", 
            "emetteur", 
            "logo_url", 
            "numero_facture",
            "date_emission", 
            "date_echeance", 
            "statut", 
            "devise", 
            "taux_change_mga",
            "exoneree_tva", 
            "lignes", 
            "paiements",
            "total_ht", 
            "total_tva", 
            "total_ttc", 
            "total_paye",
            "reste_a_payer",
            "total_mga",
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
            raise serializers.ValidationError('Client invalide')
        return client

    def validate_lignes(self, lignes):
        if not lignes:
            raise serializers.ValidationError("Ajoutez au moins une ligne à la facture")
        return lignes

    def validate(self, donnees):
        taux = donnees.get("taux_change_mga", getattr(self.instance, "taux_change_mga", Decimal("1")))
        if taux is None or taux <= 0:
            raise serializers.ValidationError(
                {"taux_change_mga": "Le taux de change doit être supérieur à zéro."}
            )

        echeance = donnees.get("date_echeance", getattr(self.instance, "date_echeance", None))
        if self.instance:
            emission = self.instance.date_emission
        else:
            emission = timezone.localdate()
        if echeance and echeance < emission:
            raise serializers.ValidationError(
                {"date_echeance": "La date d'échéance ne peut pas être antérieure à la date de création de la facture"}
            )

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
        lignes =donnees.pop("lignes", None)
        for champ, valeur in donnees.items():
            setattr(facture, champ, valeur)
        facture.save()
        if lignes is not None:
            facture.lignes.all().delete() 
            for ligne in lignes:
                LigneFacture.objects.create(facture=facture, **ligne)
        return facture
