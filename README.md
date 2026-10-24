# Facturation Madagascar

Plateforme web de gestion de factures pour les indépendants et petites entreprises de Madagascar :
Ariary (MGA), TVA à 20 %, mentions légales NIF / STAT / RCS, numérotation chronologique, PDF, tableau de bord.

- **Frontend** : React (Vite), SCSS, Axios, Chart.js
- **Backend** : Python, Django, Django REST Framework, JWT (simplejwt), ReportLab pour le PDF
- **Base de données** : MySQL

---

> Vous voulez **recréer le projet vous-même**, fichier par fichier ? Suivez [GUIDE-RECREATION.md](GUIDE-RECREATION.md).

## 1. Ce qu'il faut installer avant

| Outil | Version conseillée |
|---|---|
| Python | 3.10 ou plus récent |
| Node.js (avec npm) | 18 ou plus récent |
| MySQL | 8 (ou MariaDB 10.5+) |

## 2. Créer la base de données MySQL

Dans MySQL (ligne de commande ou phpMyAdmin / MySQL Workbench) :

```sql
CREATE DATABASE facturation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. Lancer le backend (Django)

Ouvrez un terminal dans le dossier `backend` :

```bash
cd backend

# 1. Créer l'environnement virtuel Python
python -m venv venv

# 2. L'activer
#   Windows :
venv\Scripts\activate
#   Mac / Linux :
source venv/bin/activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Créer votre fichier de configuration
#   Windows :  copy .env.example .env
#   Mac / Linux :  cp .env.example .env
# Puis ouvrez ".env" et mettez votre mot de passe MySQL (DB_PASSWORD)

# 5. Créer les tables
python manage.py migrate

# 6. Remplir le registre national fictif (pour tester l'auto-complétion, ex : taper "TELMA")
python manage.py charger_registre

# 7. Démarrer le serveur
python manage.py runserver
```

Le backend tourne sur http://localhost:8000.

*(Facultatif)* Pour accéder à l'administration Django (http://localhost:8000/admin/) :
`python manage.py createsuperuser`. Ce compte sert uniquement à l'administration : pour utiliser l'application,
créez un compte depuis le site (page « Créer un compte »).

## 4. Lancer le frontend (React)

Ouvrez un **deuxième** terminal (le premier doit rester ouvert) :

```bash
cd frontend
npm install
npm run dev
```

Ouvrez ensuite http://localhost:5173 dans votre navigateur.
Créez un compte : vous arrivez directement sur le formulaire de première facture.

## 5. Lancer les tests du backend

```bash
cd backend
python manage.py test
```

Les tests utilisent une petite base temporaire en mémoire : MySQL n'est pas nécessaire pour eux.

---

## Comment fonctionne l'application

1. **Inscription / connexion** : email, mot de passe, nom de l'entreprise. Django renvoie des tokens JWT
   que React garde dans le navigateur et envoie à chaque requête.
2. **Première connexion** : redirection directe vers le formulaire de facture.
3. **Éditeur de facture** : on choisit un client (recherche dans *vos clients* puis dans le *registre national*),
   on ajoute des lignes, les totaux se calculent en direct. À l'enregistrement, Django recalcule tout lui-même.
   Les infos de l'émetteur et du client saisies dans la facture sont aussi enregistrées dans le profil / la liste des clients.
4. **Brouillon** : modifiable, sans numéro.
5. **Valider définitivement** : la facture reçoit son numéro (ex : `FAC-2026-0001`, sans trou, par entreprise et par année)
   et devient **non modifiable et non supprimable**, aussi côté serveur. Les infos de l'émetteur et du client sont figées dans la facture.
6. **Marquer comme payée** : disponible pour une facture envoyée.
7. **PDF** : `GET /api/factures/<id>/pdf/` (un brouillon donne un PDF avec le filigrane « BROUILLON »).
8. **Devises** : Ariary, Euro ou Dollar. Le taux de change est saisi à la création ; le total en Ariary est calculé et figé à la validation.
9. **Tableau de bord** : chiffre d'affaires encaissé, factures en attente, factures en retard (envoyées dont l'échéance est dépassée)
   et graphique des ventes des 6 derniers mois, tout en Ariary.
10. **Clients** (menu « Clients ») : liste, recherche (nom, email, NIF, téléphone), ajout, modification et suppression.
    Un client qui a des factures ne peut pas être supprimé : ses factures doivent rester consultables.

## Organisation des dossiers

```
facturation-madagascar/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example            <- à copier en ".env"
│   ├── config/
│   │   ├── settings.py         <- configuration (base MySQL, JWT...)
│   │   └── urls.py
│   └── factures/
│       ├── models.py           <- les tables (Facture, Client, ...) et les calculs de totaux
│       ├── serializers.py      <- conversion JSON + validation des données
│       ├── views.py            <- l'API (clients, factures, tableau de bord...)
│       ├── urls.py             <- les adresses de l'API
│       ├── pdf.py              <- génération du PDF
│       ├── tests.py            <- les tests (32)
│       └── management/commands/charger_registre.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx   <- démarrage et liste des pages
        ├── api.js              <- appels vers Django (Axios + JWT)
        ├── utils.js            <- formatage des montants, calcul des totaux
        ├── pages/              <- une page = un fichier
        ├── components/         <- morceaux de page réutilisables
        └── scss/               <- fichiers SCSS
            ├── style.scss      <- point d'entrée (importé par main.jsx)
            ├── core/           <- bases : variables, polices, mixins, reset, textes, boutons, formulaires
            ├── sections/       <- blocs communs : en-tête, mise en page, cartes/messages/badges, tableaux
            └── page/           <- styles propres à une page : connexion, facture, tableau de bord
```

## Changer l'apparence (SCSS)

Toutes les couleurs, espacements, bordures et polices sont dans `frontend/src/scss/core/_variable.scss`.
Il suffit d'y modifier une valeur pour changer tout le site. La palette actuelle est « Charbon & champagne » :

| Rôle | Couleur |
|---|---|
| Principale | `#292725` |
| Secondaire | `#6B6257` |
| Accent | `#B79B72` |
| Fond | `#F4F0E8` |
| Cartes | `#FFFFFF` |

Les couleurs du PDF sont en haut de `backend/factures/pdf.py` (mêmes valeurs).

## Sécurité

- Chaque vue Django filtre les données avec `self.request.user` : un utilisateur ne peut jamais lire ni modifier les clients ou factures d'un autre.
- Tous les montants sont en `DecimalField` (jamais de `float` en base).
- La liste des factures utilise `select_related` et `prefetch_related` (pas de requêtes SQL en N+1).
- Ne publiez jamais votre fichier `.env`. En production, mettez `DEBUG=False` et une vraie `SECRET_KEY`.

## Problèmes fréquents

- **`Can't connect to MySQL server`** : MySQL n'est pas démarré, ou `DB_PASSWORD` / `DB_USER` est faux dans `.env`.
- **`Unknown database 'facturation'`** : la base n'a pas été créée (étape 2).
- **« Impossible de contacter le serveur » dans le navigateur** : le backend (`python manage.py runserver`) n'est pas lancé.
- **Le préfixe de numérotation ne se change plus** : normal, il est verrouillé dès qu'une facture est validée.

## 5. Validations des clients et des factures

- Le formulaire demande d'abord le type de client : Particulier ou Entreprise.
- Les champs NIF, STAT et RCS apparaissent seulement pour une entreprise.
- NIF : 10 chiffres exactement ; STAT : 17 chiffres exactement ; RCS : 10 à 40 caractères.
- Téléphone : facultatif, mais exactement 10 chiffres s'il est renseigné.
- Les champs numériques refusent les lettres et limitent la saisie à la longueur attendue.
- Le taux de change doit être supérieur à zéro.
- La date d'échéance ne peut pas précéder la date de création de la facture.

Si vous utilisez déjà une base de données, arrêtez le serveur Django puis lancez `python manage.py migrate` depuis `backend`. La migration `0002_client_type_client` ajoute le type de client et classe comme entreprises les anciens clients qui avaient déjà des informations fiscales. Ne supprimez pas les anciennes migrations.
