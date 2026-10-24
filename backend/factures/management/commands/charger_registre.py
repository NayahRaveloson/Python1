"""Remplit le registre national fictif avec quelques entreprises pour tester l'auto-complétion.

Utilisation :  python manage.py charger_registre
Toutes les données ci-dessous sont inventées (NIF, STAT, RCS compris).
"""
from django.core.management.base import BaseCommand

from factures.models import RegistreNationalEntreprise

ENTREPRISES = [
    ("TELMA MADAGASCAR SA", "3000123456", "61201112000010001", "2000B00123", "Immeuble Telma, Antaninarenina, Antananarivo 101"),
    ("Tana Digital SARL", "4001234567", "62010112015000234", "2015B00456", "Lot II J 45 Ankorondrano, Antananarivo 101"),
    ("Vanille d'Antsiranana SA", "3002345678", "10101112008000345", "2008B00789", "Route Nationale 6, Antsiranana 201"),
    ("Société Rakoto & Fils", "1003456789", "46201112003000456", "2003B00234", "Rue Ravoninahitriniarivo, Mahamasina, Antananarivo 101"),
    ("Hôtel Rivage Mahajanga SARL", "4004567890", "55101112012000567", "2012B00345", "Boulevard Marcoz, Mahajanga 401"),
    ("Agri Vakinankaratra SA", "3005678901", "01101112010000678", "2010B00567", "Avenue de l'Indépendance, Antsirabe 110"),
    ("Imprimerie Fianarantsoa SARL", "4006789012", "18101112007000789", "2007B00678", "Rue Rainandriamampandry, Fianarantsoa 301"),
    ("Pêcherie Toamasina SA", "3007890123", "03101112005000890", "2005B00890", "Zone Portuaire, Toamasina 501"),
    ("Mada Transport Express SARL", "4008901234", "49301112016000901", "2016B00901", "Zone Forello, Tanjombato, Antananarivo 102"),
    ("Cabinet Randria Conseil", "1009012345", "69201112018000012", "2018B00012", "Lot 67 Ha Isoraka, Antananarivo 101"),
    ("Epices de l'Est SA", "3000123987", "10201112011000123", "2011B00123", "Rue du Commerce, Sainte-Marie 515"),
    ("Boulangerie Le Fournil Tuléar SARL", "4001239876", "50101112014000234", "2014B00234", "Avenue de France, Toliara 601"),
]


class Command(BaseCommand):
    help = "Charge des entreprises fictives dans le registre national"

    def handle(self, *args, **options):
        for nom, nif, stat, rcs, adresse in ENTREPRISES:
            RegistreNationalEntreprise.objects.update_or_create(
                nif=nif,
                defaults={"nom_officiel": nom, "stat": stat, "rcs": rcs, "adresse_siege": adresse},
            )
        self.stdout.write(self.style.SUCCESS(f"{len(ENTREPRISES)} entreprises chargées dans le registre."))
