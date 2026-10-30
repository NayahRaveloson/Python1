from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

COULEUR_PRINCIPALE = colors.HexColor("#292725")
COULEUR_SECONDAIRE = colors.HexColor("#6B6257")
COULEUR_ACCENT = colors.HexColor("#B79B72")
COULEUR_FOND = colors.HexColor("#F4F0E8")

STYLE_NORMAL = ParagraphStyle("normal", fontName="Helvetica", fontSize=9, leading=12, textColor=COULEUR_PRINCIPALE)
STYLE_PETIT = ParagraphStyle("petit", parent=STYLE_NORMAL, fontSize=8, textColor=COULEUR_SECONDAIRE)
STYLE_TITRE = ParagraphStyle("titre", parent=STYLE_NORMAL, fontName="Helvetica-Bold", fontSize=20, leading=24)
STYLE_DROITE = ParagraphStyle("droite", parent=STYLE_NORMAL, alignment=2) 


def formater_montant(valeur, devise):
    if devise == "MGA":
        return f"{valeur:,.0f}".replace(",", " ") + " Ar"
    return f"{valeur:,.2f}".replace(",", " ").replace(".", ",") + f" {devise}"


def texte(valeur):
    return escape(str(valeur or "")).replace("\n", "<br/>")


def bloc_partie(titre, nom, donnees):
    lignes = [f"<b>{texte(titre)}</b>", f"<b>{texte(nom)}</b>", texte(donnees.get("adresse"))]
    for etiquette, cle in [("NIF", "nif"), ("STAT", "stat"), ("RCS", "rcs")]:
        if donnees.get(cle):
            lignes.append(f"{etiquette} : {texte(donnees[cle])}")

    if donnees.get("telephone"):
        lignes.append(f"Tél : {texte(donnees['telephone'])}")

    if donnees.get("email"):
        lignes.append(texte(donnees["email"]))
    return Paragraph("<br/>".join(lignes), STYLE_NORMAL)


def logo(facture):
    logo = facture.entreprise.logo
    if not logo:
        return None
    
    try:
        largeur_image, hauteur_image = ImageReader(logo.path).getSize()
    except Exception:
        return None
    hauteur = 18 * mm
    largeur = min(hauteur * largeur_image / hauteur_image, 45 * mm)
    return Image(logo.path, width=largeur, height=largeur * hauteur_image / largeur_image)


def entete(facture):
    emetteur = facture.donnees_emetteur()
    partie_gauche = []
    image_logo = logo(facture)
    if image_logo:
        partie_gauche += [image_logo, Spacer(1, 3 * mm)]
    partie_gauche.append(bloc_partie("Émetteur", emetteur["nom_societe"], emetteur))
    
    dates = []
    if facture.numero_facture:
        dates.append(f"<b>Date d'émission :</b> {facture.date_emission:%d/%m/%Y}")
    dates.append(f"<b>Échéance :</b> {facture.date_echeance:%d/%m/%Y}")
    numero = facture.numero_facture or "BROUILLON"
    partie_droite = [
        Paragraph("FACTURE", ParagraphStyle("t", parent=STYLE_TITRE, alignment=2)),
        Paragraph(f"N° {texte(numero)}", ParagraphStyle("n", parent=STYLE_DROITE, fontSize=11, leading=14)),
        Spacer(1, 3 * mm),
        Paragraph("<br/>".join(dates), STYLE_DROITE),
    ]

    tableau = Table([[partie_gauche, partie_droite]], colWidths=[95 * mm, 79 * mm])
    tableau.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    return [tableau, Spacer(1, 8 * mm)]


def bloc_client(facture):
    client = facture.donnees_client()
    tableau = Table([[bloc_partie("Facturé à", client["nom_client"], client)]], colWidths=[174 * mm])
    tableau.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COULEUR_FOND),
        ("LINEBEFORE", (0, 0), (0, -1), 2, COULEUR_ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return [tableau, Spacer(1, 8 * mm)]


def lignes_tableau(facture):
    devise = facture.devise
    donnees = [["Description", "Qté", "Prix unitaire", "TVA", "Total HT"]]
    for ligne in facture.lignes.all():
        tva = "Exonérée" if facture.exoneree_tva else f"{ligne.taux_tva:.0f} %"
        donnees.append([
            Paragraph(texte(ligne.description), STYLE_NORMAL),
            format(ligne.quantite.normalize(), "f"),
            formater_montant(ligne.prix_unitaire, devise),
            tva,
            formater_montant(ligne.montant_ht, devise),
        ])

    tableau = Table(donnees, colWidths=[72 * mm, 16 * mm, 34 * mm, 20 * mm, 32 * mm], repeatRows=1)
    tableau.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COULEUR_PRINCIPALE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, COULEUR_FOND),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [tableau, Spacer(1, 6 * mm)]


def tableau_totaux(facture):
    devise = facture.devise
    libelle_tva = "TVA (exonérée)" if facture.exoneree_tva else "TVA 20 %"
    donnees = [
        ["Total HT", formater_montant(facture.total_ht, devise)],
        [libelle_tva, formater_montant(facture.total_tva, devise)],
        ["Total TTC", formater_montant(facture.total_ttc, devise)],
    ]
    if facture.total_paye > 0:
        donnees.append(["Déjà payé", formater_montant(facture.total_paye, devise)])
        donnees.append(["Reste à payer", formater_montant(facture.reste_a_payer, devise)])
    if devise != "MGA":
        total_mga = formater_montant(facture.total_ttc * facture.taux_change_mga, "MGA")
        taux = format(facture.taux_change_mga.normalize(), "f")
        donnees.append([f"Équivalent (1 {devise} = {taux} Ar)", total_mga])

    tableau = Table(donnees, colWidths=[55 * mm, 42 * mm], hAlign="RIGHT")
    tableau.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 0), (-1, -1), COULEUR_PRINCIPALE),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("BACKGROUND", (0, 2), (-1, 2), COULEUR_ACCENT),
        ("LINEBELOW", (0, 0), (-1, 1), 0.5, COULEUR_FOND),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return [tableau, Spacer(1, 10 * mm)]


def pied(facture):
    elements = []
    if facture.exoneree_tva:
        elements.append(Paragraph("Facture exonérée de TVA.", STYLE_PETIT))
    coordonnees = facture.donnees_emetteur().get("coordonnees_bancaires")
    if coordonnees:
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph(f"<b>Règlement :</b><br/>{texte(coordonnees)}", STYLE_NORMAL))
    return elements


def filigrane(canvas, document):
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 90)
    canvas.setFillColor(colors.Color(0.42, 0.38, 0.34, alpha=0.12))
    canvas.translate(A4[0] / 2, A4[1] / 2)
    canvas.rotate(45)
    canvas.drawCentredString(0, 0, "BROUILLON")
    canvas.restoreState()


def generer_pdf(facture):
    memoire = BytesIO()
    document = SimpleDocTemplate(
        memoire,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Facture {facture.numero_facture or 'brouillon'}",
    )
    elements = (
        entete(facture)
        + bloc_client(facture)
        + lignes_tableau(facture)
        + tableau_totaux(facture)
        + pied(facture)
    )
    if facture.statut == "BROUILLON":
        document.build(elements, onFirstPage=filigrane, onLaterPages=filigrane)
    else:
        document.build(elements)
    return memoire.getvalue()
