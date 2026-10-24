import { LIBELLES_STATUT } from "../utils.js";

export default function BadgeStatut({ facture }) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const enRetard = facture.statut === "ENVOYEE" && facture.date_echeance < aujourdhui;

  if (enRetard) {
    return <span className="badge badge-retard">En retard</span>;
  }
  return <span className={`badge badge-${facture.statut.toLowerCase()}`}>{LIBELLES_STATUT[facture.statut]}</span>;
}
