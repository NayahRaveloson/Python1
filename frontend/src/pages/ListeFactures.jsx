import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { messageErreur } from "../api.js";
import BadgeStatut from "../components/BadgeStatut.jsx";
import { formaterDate, formaterMontant } from "../utils.js";

export default function ListeFactures() {
  const [factures, setFactures] = useState(null);
  const [statut, setStatut] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/factures/", { params: statut ? { statut } : {} })
      .then((reponse) => setFactures(reponse.data))
      .catch((e) => setErreur(messageErreur(e)));
  }, [statut]);

  return (
    <div>
      <div className="page-entete">
        <h1>Mes factures</h1>
        <Link to="/factures/nouvelle" className="bouton bouton-accent">+ Créer une facture</Link>
      </div>

      {erreur && <div className="message message-erreur">{erreur}</div>}

      <div className="carte">
        <div className="champ" style={{ maxWidth: 240 }}>
          <label htmlFor="filtre">Filtrer par statut</label>
          <select id="filtre" value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Tous</option>
            <option value="BROUILLON">Brouillons</option>
            <option value="ENVOYEE">Envoyées</option>
            <option value="PAYEE">Payées</option>
          </select>
        </div>

        {!factures && <p>Chargement...</p>}
        {factures && factures.length === 0 && <p className="texte-discret">Aucune facture.</p>}
        {factures && factures.length > 0 && (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Client</th>
                  <th>Échéance</th>
                  <th className="colonne-nombre">Total TTC</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {factures.map((facture) => (
                  <tr key={facture.id}>
                    <td><Link to={`/factures/${facture.id}`}>{facture.numero_facture || "Brouillon"}</Link></td>
                    <td>{facture.client_details.nom_client}</td>
                    <td>{formaterDate(facture.date_echeance)}</td>
                    <td className="colonne-nombre">{formaterMontant(facture.total_ttc, facture.devise)}</td>
                    <td><BadgeStatut facture={facture} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
