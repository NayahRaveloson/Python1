from decimal import ROUND_HALF_UP, Decimal

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone


def arrondir(montant):
    return montant.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class RegistreNationalEntreprise(models.Model):
    nom_officiel = models.CharField(max_length=255)
    nif = models.CharField(max_length=50, unique=True)
    stat = models.CharField(max_length=50)
    rcs = models.CharField(max_length=50)
    adresse_siege = models.TextField()

    def __str__(self):
        return self.nom_officiel


class ProfilEntreprise(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name= "profil")
    nom_societe = models.CharField(max_length=255)
    nif = models.CharField(max_length= 50, blank= True)
    stat = models.CharField(max_length=50, blank= True)
    rcs = models.CharField(max_length=50, blank= True)
    adresse = models.TextField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    logo = models.ImageField(upload_to= "logos/", blank=True, null=True)
    coordonnees_bancaires = models.TextField(blank=True)
    prefixe_numerotation = models.CharField(max_length=10, default= "FAC")

    def __str__(self):
        return self.nom_societe


class Client(models.Model):
    TYPE_CLIENT_CHOICES =[
        ("PARTICULIER", "Particulier"),
        ("ENTREPRISE", "Entreprise / Professionnel"),
    ]

    entreprise = models.ForeignKey(
         ProfilEntreprise, on_delete=models.CASCADE, related_name=  "clients"
    )
    type_client = models.CharField(max_length=20, choices=TYPE_CLIENT_CHOICES, default= "PARTICULIER")
    nom_client = models.CharField(max_length=255)
    email = models.EmailField()
    nif = models.CharField(max_length=50, blank=True)
    stat = models.CharField(max_length=50, blank=True)
    rcs = models.CharField(max_length=50, blank=True)
    adresse = models.TextField()
    telephone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.nom_client


class CompteurFacture(models.Model):
    entreprise = models.ForeignKey(
        ProfilEntreprise, on_delete=models.CASCADE, related_name="compteurs"
    )
    annee = models.PositiveIntegerField()
    dernier_numero = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together =("entreprise", "annee")


def donnees_emetteur(profil):
    return {
        "nom_societe": profil.nom_societe,
        "nif": profil.nif,
        "stat": profil.stat,
        "rcs": profil.rcs,
        "adresse": profil.adresse,
        "telephone": profil.telephone,
        "coordonnees_bancaires": profil.coordonnees_bancaires,
    }


def donnees_client(client):
    return {
        "type_client": client.type_client,
        "nom_client": client.nom_client,
        "email": client.email,
        "telephone": client.telephone,
        "nif": client.nif,
        "stat": client.stat,
        "rcs": client.rcs,
        "adresse": client.adresse,
    }


class Facture(models.Model):
    STATUT_CHOICES = [
        ("BROUILLON", "Brouillon"),
        ("ENVOYEE", "Envoyée"),
        ("PAYEE", "Payée"),
    ]
    DEVISE_CHOICES = [("MGA", "Ariary"), ("EUR", "Euro"), ("USD", "Dollar")]

    entreprise = models.ForeignKey(
        ProfilEntreprise, on_delete=models.CASCADE, related_name= "factures"
    )
    client = models.ForeignKey(
        Client, on_delete=models.PROTECT, related_name= "factures"
    )
    numero_facture = models.CharField(max_length=50, blank=True, null=True)
    date_emission = models.DateField(default=timezone.localdate)
    date_echeance = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='BROUILLON')
    devise = models.CharField(max_length=3, choices=DEVISE_CHOICES, default= 'MGA')
    taux_change_mga = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("1.0000"),
        validators=[MinValueValidator(Decimal("0.0001"))],
    )
    exoneree_tva = models.BooleanField(default=False)
    total_mga = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    emetteur_fige = models.JSONField(null=True, blank=True)
    client_fige = models.JSONField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["entreprise", "numero_facture"], name="numero_unique_par_entreprise"),
        ]

    def __str__(self):
        return self.numero_facture or f"Brouillon {self.id}"

    @property
    def total_ht(self):
        total = Decimal("0.00")
        for ligne in self.lignes.all():
            total += ligne.montant_ht
        return total
    
    @property
    def total_tva(self):
        if self.exoneree_tva:
            return Decimal("0.00")
        total = Decimal("0.00")
        for ligne in self.lignes.all():
            total += ligne.montant_tva
        return total
    
    @property
    def total_ttc(self):
        return self.total_ht + self.total_tva

    @property
    def total_paye(self):
        total = Decimal("0.00")
        for paiement in self.paiements.all():
            total += paiement.montant
        return total

    @property
    def reste_a_payer(self):
        if self.statut == "PAYEE":
            return Decimal("0.00")
        return self.total_ttc - self.total_paye

    def donnees_emetteur(self):
        if self.emetteur_fige:
            return self.emetteur_fige
        return donnees_emetteur(self.entreprise)
    
    def donnees_client(self):
        if self.client_fige:
            return self.client_fige
        return donnees_client(self.client)
    
    @transaction.atomic
    def valider(self):
        aujourdhui = timezone.localdate()
        compteur, _ = CompteurFacture.objects.select_for_update().get_or_create(
            entreprise=self.entreprise, annee=aujourdhui.year
        )
        compteur.dernier_numero += 1
        compteur.save()

        prefixe = self.entreprise.prefixe_numerotation
        self.numero_facture = f"{prefixe}-{aujourdhui.year}-{compteur.dernier_numero:04d}"
        self.date_emission = aujourdhui
        self.statut = "ENVOYEE"
        self.total_mga = arrondir(self.total_ttc * self.taux_change_mga)
        self.emetteur_fige = donnees_emetteur(self.entreprise)
        self.client_fige = donnees_client(self.client)
        self.save()


class LigneFacture(models.Model):
    facture = models.ForeignKey(
        Facture, on_delete=models.CASCADE, related_name= "lignes"
    )
    description = models.CharField(max_length=255)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1"), validators=[MinValueValidator(Decimal("0.01"))])
    prix_unitaire = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    taux_tva = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("20.00"))

    @property
    def montant_ht(self):
        return arrondir(self.quantite * self.prix_unitaire)

    @property
    def montant_tva(self):
        return arrondir(self.montant_ht * self.taux_tva / 100)


class Paiement(models.Model):
    MODE_CHOICES = [
        ("VIREMENT", "Virement bancaire"),
        ("MVOLA", "Mvola"),
        ("ORANGE_MONEY", "Orange Money"),
        ("AIRTEL_MONEY", "Airtel Money"),
        ("ESPECES", "Espèces"),
    ]

    facture = models.ForeignKey(
        Facture, on_delete=models.CASCADE, related_name="paiements"
    )
    montant = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    mode = models.CharField(max_length=20, choices=MODE_CHOICES)
    reference = models.CharField(max_length=100, blank=True)
    date_paiement = models.DateField(default=timezone.localdate)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date_paiement", "id"]
