import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { messageErreur, telechargerPdf } from "../api.js";
import ApercuFacture from "../components/ApercuFacture.jsx";
import BadgeStatut from "../components/BadgeStatut.jsx";

export default function DetailFacture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facture, setFacture] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get(`/factures/${id}/`)
      .then((reponse) => setFacture(reponse.data))
      .catch((e) => setErreur(messageErreur(e)));
  }, [id]);

  async function lancerAction(action, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    setErreur("");
    try {
      const reponse = await api.post(`/factures/${id}/${action}/`);
      setFacture(reponse.data);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  async function supprimer() {
    if (!window.confirm("Supprimer ce brouillon ?")) return;
    try {
      await api.delete(`/factures/${id}/`);
      navigate("/factures");
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  async function telecharger() {
    try {
      await telechargerPdf(facture);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  if (!facture) {
    return erreur ? <div className="message message-erreur">{erreur}</div> : <p>Chargement...</p>;
  }

  return (
    <div>
      {erreur && <div className="message message-erreur">{erreur}</div>}

      <div className="detail-facture">
        <ApercuFacture facture={facture} />

        <aside className="carte panneau-actions">
          <h2>Actions</h2>
          <p><BadgeStatut facture={facture} /></p>

          {facture.statut === "BROUILLON" && (
            <>
              <p className="texte-discret">Ce brouillon n'a pas encore de numéro. Une fois validé, il ne sera plus modifiable.</p>
              <Link to={`/factures/${id}/modifier`} className="bouton bouton-discret">Modifier</Link>
              <button
                className="bouton bouton-principal"
                onClick={() => lancerAction("valider", "Valider définitivement ? La facture recevra son numéro et ne pourra plus être modifiée.")}
              >
                Valider définitivement
              </button>
              <button className="bouton bouton-discret" onClick={telecharger}>Aperçu PDF</button>
              <button className="bouton bouton-danger" onClick={supprimer}>Supprimer le brouillon</button>
            </>
          )}

          {facture.statut === "ENVOYEE" && (
            <>
              <button className="bouton bouton-principal" onClick={telecharger}>Télécharger le PDF</button>
              <button
                className="bouton bouton-accent"
                onClick={() => lancerAction("payer", "Marquer cette facture comme payée ?")}
              >
                Marquer comme payée
              </button>
            </>
          )}

          {facture.statut === "PAYEE" && (
            <>
              <p className="texte-discret">Cette facture a été encaissée.</p>
              <button className="bouton bouton-principal" onClick={telecharger}>Télécharger le PDF</button>
            </>
          )}

          <Link to="/factures" className="bouton bouton-discret">← Mes factures</Link>
        </aside>
      </div>
    </div>
  );
}
