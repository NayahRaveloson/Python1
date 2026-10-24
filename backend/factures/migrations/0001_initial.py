import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Client",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nom_client", models.CharField(max_length=255)),
                ("email", models.EmailField(max_length=254)),
                ("nif", models.CharField(blank=True, max_length=50)),
                ("stat", models.CharField(blank=True, max_length=50)),
                ("rcs", models.CharField(blank=True, max_length=50)),
                ("adresse", models.TextField()),
                ("telephone", models.CharField(blank=True, max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name="RegistreNationalEntreprise",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nom_officiel", models.CharField(max_length=255)),
                ("nif", models.CharField(max_length=50, unique=True)),
                ("stat", models.CharField(max_length=50)),
                ("rcs", models.CharField(max_length=50)),
                ("adresse_siege", models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name="Facture",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "numero_facture",
                    models.CharField(blank=True, max_length=50, null=True),
                ),
                (
                    "date_emission",
                    models.DateField(default=django.utils.timezone.localdate),
                ),
                ("date_echeance", models.DateField()),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("BROUILLON", "Brouillon"),
                            ("ENVOYEE", "Envoyée"),
                            ("PAYEE", "Payée"),
                        ],
                        default="BROUILLON",
                        max_length=20,
                    ),
                ),
                (
                    "devise",
                    models.CharField(
                        choices=[("MGA", "Ariary"), ("EUR", "Euro"), ("USD", "Dollar")],
                        default="MGA",
                        max_length=3,
                    ),
                ),
                (
                    "taux_change_mga",
                    models.DecimalField(
                        decimal_places=4,
                        default=Decimal("1.0000"),
                        max_digits=10,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0.0001"))
                        ],
                    ),
                ),
                ("exoneree_tva", models.BooleanField(default=False)),
                (
                    "total_mga",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0.00"), max_digits=18
                    ),
                ),
                ("emetteur_fige", models.JSONField(blank=True, null=True)),
                ("client_fige", models.JSONField(blank=True, null=True)),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="factures",
                        to="factures.client",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="LigneFacture",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("description", models.CharField(max_length=255)),
                (
                    "quantite",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("1"),
                        max_digits=10,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0.01"))
                        ],
                    ),
                ),
                (
                    "prix_unitaire",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=15,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0"))
                        ],
                    ),
                ),
                (
                    "taux_tva",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("20.00"), max_digits=5
                    ),
                ),
                (
                    "facture",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lignes",
                        to="factures.facture",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ProfilEntreprise",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nom_societe", models.CharField(max_length=255)),
                ("nif", models.CharField(blank=True, max_length=50)),
                ("stat", models.CharField(blank=True, max_length=50)),
                ("rcs", models.CharField(blank=True, max_length=50)),
                ("adresse", models.TextField(blank=True)),
                ("telephone", models.CharField(blank=True, max_length=20)),
                ("logo", models.ImageField(blank=True, null=True, upload_to="logos/")),
                ("coordonnees_bancaires", models.TextField(blank=True)),
                (
                    "prefixe_numerotation",
                    models.CharField(default="FAC", max_length=10),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profil",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="facture",
            name="entreprise",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="factures",
                to="factures.profilentreprise",
            ),
        ),
        migrations.CreateModel(
            name="CompteurFacture",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("annee", models.PositiveIntegerField()),
                ("dernier_numero", models.PositiveIntegerField(default=0)),
                (
                    "entreprise",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="compteurs",
                        to="factures.profilentreprise",
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="client",
            name="entreprise",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="clients",
                to="factures.profilentreprise",
            ),
        ),
        migrations.AddConstraint(
            model_name="facture",
            constraint=models.UniqueConstraint(
                fields=("entreprise", "numero_facture"),
                name="numero_unique_par_entreprise",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="compteurfacture",
            unique_together={("entreprise", "annee")},
        ),
    ]
