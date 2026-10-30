import { formaterMontant } from "../utils.js";

const LIGNE_VIDE = { description: "", quantite: "1", prix_unitaire: "", taux_tva: "20" };

export default function LignesFacture({
  lignes,
  setLignes,
  devise,
  erreurs = {},
  onEffacerErreur,
  onEffacerErreurs,
}) {
  function modifierLigne(index, champ, valeur) {
    const nouvellesLignes = lignes.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne));
    setLignes(nouvellesLignes);
    onEffacerErreur?.(index, champ);
  }

  function ajouterLigne() {
    setLignes([...lignes, { ...LIGNE_VIDE }]);
    onEffacerErreurs?.();
  }

  function supprimerLigne(index) {
    setLignes(lignes.filter((ligne, i) => i !== index));
    onEffacerErreurs?.();
  }

  return (
    <div>
      <div className="tableau-defilant">
        <table className="tableau tableau-lignes">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantité</th>
              <th>Prix unitaire</th>
              <th className="colonne-nombre">Total HT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, index) => (
              <tr key={index}>
                <td className="colonne-description">
                  <input
                    value={ligne.description}
                    onChange={(e) => modifierLigne(index, "description", e.target.value)}
                    placeholder="Ex : Création de site web"
                    aria-label="Description"
                  />
                </td>
                <td className="colonne-petite">
                  <input
                    type="number" min="0.01" step="any" required
                    value={ligne.quantite}
                    onKeyDown={(e) => {
                      if (e.key === "-") e.preventDefault();
                    }}
                    onPaste={(e) => {
                      if (e.clipboardData.getData("text").includes("-")) e.preventDefault();
                    }}
                    onChange={(e) => modifierLigne(index, "quantite", e.target.value)}
                    aria-label="Quantité"
                    aria-invalid={Boolean(erreurs[`${index}_quantite`])}
                    aria-describedby={erreurs[`${index}_quantite`] ? `erreur-ligne-${index}-quantite` : undefined}
                  />
                  {erreurs[`${index}_quantite`] && (
                    <span className="erreur-champ" id={`erreur-ligne-${index}-quantite`}>
                      {erreurs[`${index}_quantite`]}
                    </span>
                  )}
                </td>
                <td className="colonne-prix">
                  <input
                    type="number" min="0.01" step="any" required
                    value={ligne.prix_unitaire}
                    onKeyDown={(e) => {
                      if (e.key === "-") e.preventDefault();
                    }}
                    onPaste={(e) => {
                      if (e.clipboardData.getData("text").includes("-")) e.preventDefault();
                    }}
                    onChange={(e) => modifierLigne(index, "prix_unitaire", e.target.value)}
                    aria-label="Prix unitaire"
                    aria-invalid={Boolean(erreurs[`${index}_prix_unitaire`])}
                    aria-describedby={erreurs[`${index}_prix_unitaire`] ? `erreur-ligne-${index}-prix` : undefined}
                  />
                  {erreurs[`${index}_prix_unitaire`] && (
                    <span className="erreur-champ" id={`erreur-ligne-${index}-prix`}>
                      {erreurs[`${index}_prix_unitaire`]}
                    </span>
                  )}
                </td>
                <td className="colonne-nombre">
                  {formaterMontant((Number(ligne.quantite) || 0) * (Number(ligne.prix_unitaire) || 0), devise)}
                </td>
                <td>
                  {lignes.length > 1 && (
                    <button type="button" className="bouton bouton-danger bouton-petit" onClick={() => supprimerLigne(index)} aria-label="Supprimer la ligne">
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="bouton bouton-discret bouton-petit" onClick={ajouterLigne}>
        + Ajouter une ligne
      </button>
    </div>
  );
}
