import { dateLocaleAujourdhui, LIBELLES_STATUT } from "../utils.js";

export default function BadgeStatut({ facture }) {
  const aujourdhui = dateLocaleAujourdhui();
  const enRetard = facture.statut === "ENVOYEE" && facture.date_echeance < aujourdhui;

  if (enRetard) {
    return <span className="badge badge-retard">En retard</span>;
  }
  if (facture.statut === "ENVOYEE" && Number(facture.total_paye) > 0) {
    return <span className="badge badge-partiel">Partiellement payée</span>;
  }
  return <span className={`badge badge-${facture.statut.toLowerCase()}`}>{LIBELLES_STATUT[facture.statut]}</span>;
}
