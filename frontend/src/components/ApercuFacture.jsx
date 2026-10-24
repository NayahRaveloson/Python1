import TotauxFacture from "./TotauxFacture.jsx";
import { formaterDate, formaterMontant } from "../utils.js";

export default function ApercuFacture({ facture }) {
  const emetteur = facture.emetteur;
  const client = facture.client_details;
  const estBrouillon = facture.statut === "BROUILLON";

  return (
    <div className="feuille">
      <div className="feuille-entete">
        <div>
          {facture.logo_url && <img src={facture.logo_url} alt="Logo" className="logo-facture" />}
          <strong>{emetteur.nom_societe}</strong>
          <p style={{ whiteSpace: "pre-line", marginBottom: "0.15rem" }}>{emetteur.adresse}</p>
          {emetteur.nif && <p className="texte-discret">NIF : {emetteur.nif}</p>}
          {emetteur.stat && <p className="texte-discret">STAT : {emetteur.stat}</p>}
          {emetteur.rcs && <p className="texte-discret">RCS : {emetteur.rcs}</p>}
          {emetteur.telephone && <p className="texte-discret">Tél : {emetteur.telephone}</p>}
        </div>
        <div className="texte-droite">
          <h2 className="feuille-titre">FACTURE</h2>
          <p className="feuille-numero">N° {facture.numero_facture || "BROUILLON"}</p>
          {!estBrouillon && <p className="texte-discret">Émise le {formaterDate(facture.date_emission)}</p>}
          <p className="texte-discret">Échéance : {formaterDate(facture.date_echeance)}</p>
        </div>
      </div>

      <div className="bloc-partie bloc-client">
        <h3>Facturé à</h3>
        <p><strong>{client.nom_client}</strong></p>
        <p style={{ whiteSpace: "pre-line" }}>{client.adresse}</p>
        {client.nif && <p className="texte-discret">NIF : {client.nif}</p>}
        {client.stat && <p className="texte-discret">STAT : {client.stat}</p>}
        {client.rcs && <p className="texte-discret">RCS : {client.rcs}</p>}
        {client.email && <p className="texte-discret">{client.email}</p>}
      </div>

      <div className="tableau-defilant">
        <table className="tableau">
          <thead>
            <tr>
              <th>Description</th>
              <th className="colonne-nombre">Qté</th>
              <th className="colonne-nombre">Prix unitaire</th>
              <th className="colonne-nombre">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {facture.lignes.map((ligne) => (
              <tr key={ligne.id}>
                <td>{ligne.description}</td>
                <td className="colonne-nombre">{Number(ligne.quantite)}</td>
                <td className="colonne-nombre">{formaterMontant(ligne.prix_unitaire, facture.devise)}</td>
                <td className="colonne-nombre">{formaterMontant(ligne.montant_ht, facture.devise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TotauxFacture
        totaux={facture}
        devise={facture.devise}
        exoneree={facture.exoneree_tva}
        tauxChange={facture.taux_change_mga}
      />

      <div className="pied-facture">
        {facture.exoneree_tva && <p>Facture exonérée de TVA.</p>}
        {facture.devise !== "MGA" && <p>Taux de change appliqué : 1 {facture.devise} = {Number(facture.taux_change_mga)} Ar</p>}
        {emetteur.coordonnees_bancaires && (
          <p style={{ whiteSpace: "pre-line" }}><strong>Règlement :</strong> {emetteur.coordonnees_bancaires}</p>
        )}
      </div>
    </div>
  );
}
