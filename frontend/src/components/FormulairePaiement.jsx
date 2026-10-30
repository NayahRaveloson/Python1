import { useState } from "react";
import api, { messageErreur } from "../api.js";
import { dateLocaleAujourdhui, LIBELLES_MODE } from "../utils.js";
import MessageErreur from "./MessageErreur.jsx";

export default function FormulairePaiement({ facture, onPaye, onAnnuler }) {
  const [montant, setMontant] = useState(String(facture.reste_a_payer));
  const [mode, setMode] = useState("VIREMENT");
  const [reference, setReference] = useState("");
  const [datePaiement, setDatePaiement] = useState(dateLocaleAujourdhui());
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    if (enCours) return;

    setErreur("");
    setEnCours(true);
    try {
      const reponse = await api.post(`/factures/${facture.id}/payer/`, {
        montant,
        mode,
        reference,
        date_paiement: datePaiement,
      });
      onPaye(reponse.data);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form className="formulaire-paiement" onSubmit={envoyer}>
      <MessageErreur>{erreur}</MessageErreur>

      <div className="champ">
        <label htmlFor="montant-paiement">Montant</label>
        <input
          id="montant-paiement"
          type="number"
          min="0.01"
          max={facture.reste_a_payer}
          step="0.01"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          required
        />
      </div>

      <div className="champ">
        <label htmlFor="mode-paiement">Mode de paiement</label>
        <select
          id="mode-paiement"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          required
        >
          {Object.entries(LIBELLES_MODE).map(([code, libelle]) => (
            <option key={code} value={code}>{libelle}</option>
          ))}
        </select>
      </div>

      <div className="champ">
        <label htmlFor="reference-paiement">Référence (optionnelle)</label>
        <input
          id="reference-paiement"
          type="text"
          maxLength="100"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>

      <div className="champ">
        <label htmlFor="date-paiement">Date du paiement</label>
        <input
          id="date-paiement"
          type="date"
          min={facture.date_emission}
          max={dateLocaleAujourdhui()}
          value={datePaiement}
          onChange={(e) => setDatePaiement(e.target.value)}
          required
        />
      </div>

      <button className="bouton bouton-accent" type="submit" disabled={enCours}>
        {enCours ? "Enregistrement..." : "Enregistrer le paiement"}
      </button>
      <button
        className="bouton bouton-discret"
        type="button"
        onClick={onAnnuler}
        disabled={enCours}
      >
        Annuler
      </button>
    </form>
  );
}
