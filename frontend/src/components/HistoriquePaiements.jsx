import { formaterDate, formaterMontant, LIBELLES_MODE } from "../utils.js";

export default function HistoriquePaiements({ facture }) {
  const paiements = facture.paiements || [];
  if (paiements.length === 0) return null;

  return (
    <section className="historique-paiements">
      <h2>Historique des paiements</h2>
      <div className="tableau-defilant">
        <table className="tableau">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th>Référence</th>
              <th className="colonne-nombre">Montant</th>
            </tr>
          </thead>
          <tbody>
            {paiements.map((paiement) => (
              <tr key={paiement.id}>
                <td>{formaterDate(paiement.date_paiement)}</td>
                <td>{LIBELLES_MODE[paiement.mode] || paiement.mode}</td>
                <td>{paiement.reference || "—"}</td>
                <td className="colonne-nombre">
                  {formaterMontant(paiement.montant, facture.devise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Payé : {formaterMontant(facture.total_paye, facture.devise)}
        {" · "}
        Reste à payer : {formaterMontant(facture.reste_a_payer, facture.devise)}
      </p>
    </section>
  );
}
