import { formaterMontant } from "../utils.js";


export default function TotauxFacture({ totaux, devise, exoneree, tauxChange }) {
  const totalEnAriary = Number(totaux.total_ttc) * Number(tauxChange || 1);

  return (
    <div className="totaux">
      <div className="totaux-ligne">
        <span>Total HT</span>
        <span>{formaterMontant(totaux.total_ht, devise)}</span>
      </div>
      <div className="totaux-ligne">
        <span>{exoneree ? "TVA (exonérée)" : "TVA 20 %"}</span>
        <span>{formaterMontant(totaux.total_tva, devise)}</span>
      </div>
      <div className="totaux-ligne totaux-ttc">
        <span>Total TTC</span>
        <span>{formaterMontant(totaux.total_ttc, devise)}</span>
      </div>
      {devise !== "MGA" && (
        <div className="totaux-ligne totaux-ariary">
          <span>Équivalent en Ariary</span>
          <span>{formaterMontant(totalEnAriary, "MGA")}</span>
        </div>
      )}
    </div>
  );
}
