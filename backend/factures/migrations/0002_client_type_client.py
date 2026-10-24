from django.db import migrations, models


def classer_anciens_clients(apps, schema_editor):
    Client = apps.get_model("factures", "Client")
    Client.objects.exclude(nif="", stat="", rcs="").update(type_client="ENTREPRISE")


class Migration(migrations.Migration):
    dependencies = [("factures", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="client",
            name="type_client",
            field=models.CharField(
                choices=[("PARTICULIER", "Particulier"), ("ENTREPRISE", "Entreprise / Professionnel")],
                default="PARTICULIER",
                max_length=20,
            ),
        ),
        migrations.RunPython(classer_anciens_clients, migrations.RunPython.noop),
    ]
