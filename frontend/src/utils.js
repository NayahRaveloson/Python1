export function formaterMontant(valeur, devise = "MGA") {
  const nombre = Number(valeur) || 0;
  if (devise === "MGA") {
    return nombre.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " Ar";
  }
  return nombre.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + devise;
}

export function formaterDate(texte) {
  if (!texte) return "";
  const [annee, mois, jour] = texte.split("-");
  return `${jour}/${mois}/${annee}`;
}

export function dansTrenteJours() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function arrondir(nombre) {
  return Math.round(nombre * 100) / 100;
}

export function calculerTotaux(lignes, exoneree) {
  let totalHt = 0;
  let totalTva = 0;
  for (const ligne of lignes) {
    const montantHt = arrondir((Number(ligne.quantite) || 0) * (Number(ligne.prix_unitaire) || 0));
    totalHt += montantHt;
    if (!exoneree) {
      totalTva += arrondir((montantHt * (Number(ligne.taux_tva) || 0)) / 100);
    }
  }
  return { total_ht: totalHt, total_tva: totalTva, total_ttc: totalHt + totalTva };
}

export const LIBELLES_STATUT = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE: "Payée",
};
