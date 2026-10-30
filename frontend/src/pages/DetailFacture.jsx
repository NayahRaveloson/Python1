import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { messageErreur, telechargerPdf } from "../api.js";
import ApercuFacture from "../components/ApercuFacture.jsx";
import BadgeStatut from "../components/BadgeStatut.jsx";
import FormulairePaiement from "../components/FormulairePaiement.jsx";
import HistoriquePaiements from "../components/HistoriquePaiements.jsx";
import MessageErreur from "../components/MessageErreur.jsx";

export default function DetailFacture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facture, setFacture] = useState(null);
  const [erreur, setErreur] = useState("");
  const [paiementOuvert, setPaiementOuvert] = useState(false);
  const [paiementEnregistre, setPaiementEnregistre] = useState(false);
  const [actionEnCours, setActionEnCours] = useState("");

  useEffect(() => {
    api.get(`/factures/${id}/`)
      .then((reponse) => setFacture(reponse.data))
      .catch((e) => setErreur(messageErreur(e)));
  }, [id]);

  async function lancerAction(action, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    if (actionEnCours) return;
    setErreur("");
    setActionEnCours(action);
    try {
      const reponse = await api.post(`/factures/${id}/${action}/`);
      setFacture(reponse.data);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setActionEnCours("");
    }
  }

  async function supprimer() {
    if (!window.confirm("Supprimer ce brouillon ?")) return;
    if (actionEnCours) return;
    setActionEnCours("supprimer");
    try {
      await api.delete(`/factures/${id}/`);
      navigate("/factures");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setActionEnCours("");
    }
  }

  async function telecharger() {
    if (actionEnCours) return;
    setActionEnCours("pdf");
    try {
      await telechargerPdf(facture);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setActionEnCours("");
    }
  }

  if (!facture) {
    return erreur ? <MessageErreur>{erreur}</MessageErreur> : <p>Chargement...</p>;
  }

  return (
    <div>
      <MessageErreur>{erreur}</MessageErreur>
      {paiementEnregistre && (
        <div className="message message-succes" role="status">
          Paiement enregistré.
        </div>
      )}

      <div className="detail-facture">
        <div>
          <ApercuFacture facture={facture} />
          <HistoriquePaiements facture={facture} />
        </div>

        <aside className="carte panneau-actions">
          <h2>Actions</h2>
          <p><BadgeStatut facture={facture} /></p>

          {facture.statut === "BROUILLON" && (
            <>
              <p className="texte-discret">Ce brouillon n'a pas encore de numéro. Une fois validé, il ne sera plus modifiable.</p>
              <Link to={`/factures/${id}/modifier`} className="bouton bouton-discret">Modifier</Link>
              <button
                className="bouton bouton-principal"
                disabled={Boolean(actionEnCours)}
                onClick={() => lancerAction("valider", "Valider définitivement ? La facture recevra son numéro et ne pourra plus être modifiée.")}
              >
                {actionEnCours === "valider" ? "Validation..." : "Valider définitivement"}
              </button>
              <button className="bouton bouton-discret" onClick={telecharger} disabled={Boolean(actionEnCours)}>Aperçu PDF</button>
              <button className="bouton bouton-danger" onClick={supprimer} disabled={Boolean(actionEnCours)}>
                {actionEnCours === "supprimer" ? "Suppression..." : "Supprimer le brouillon"}
              </button>
            </>
          )}

          {facture.statut === "ENVOYEE" && (
            <>
              <button className="bouton bouton-principal" onClick={telecharger} disabled={Boolean(actionEnCours)}>
                {actionEnCours === "pdf" ? "Préparation..." : "Télécharger le PDF"}
              </button>
              {!paiementOuvert && (
                <button
                  className="bouton bouton-accent"
                  disabled={Boolean(actionEnCours)}
                  onClick={() => {
                    if (
                      Number(facture.total_ttc) === 0
                      || Number(facture.reste_a_payer) <= 0
                    ) {
                      lancerAction("payer");
                    } else {
                      setPaiementOuvert(true);
                    }
                  }}
                >
                  {actionEnCours === "payer" ? "Mise à jour..." : "Enregistrer un paiement"}
                </button>
              )}
              {paiementOuvert && (
                <FormulairePaiement
                  facture={facture}
                  onPaye={(factureActualisee) => {
                    setFacture(factureActualisee);
                    setPaiementOuvert(false);
                    setPaiementEnregistre(true);
                    setErreur("");
                  }}
                  onAnnuler={() => setPaiementOuvert(false)}
                />
              )}
            </>
          )}

          {facture.statut === "PAYEE" && (
            <>
              <p className="texte-discret">Cette facture a été encaissée.</p>
              <button className="bouton bouton-principal" onClick={telecharger} disabled={Boolean(actionEnCours)}>
                {actionEnCours === "pdf" ? "Préparation..." : "Télécharger le PDF"}
              </button>
            </>
          )}

          <Link to="/factures" className="bouton bouton-discret">← Mes factures</Link>
        </aside>
      </div>
    </div>
  );
}
