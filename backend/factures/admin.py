from django.contrib import admin

from .models import Client, Facture, LigneFacture, Paiement, ProfilEntreprise, RegistreNationalEntreprise

admin.site.register(RegistreNationalEntreprise)
admin.site.register(ProfilEntreprise)
admin.site.register(Client)
admin.site.register(Facture)
admin.site.register(LigneFacture)
admin.site.register(Paiement)
