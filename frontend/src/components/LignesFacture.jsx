import { formaterMontant } from "../utils.js";

const LIGNE_VIDE = { description: "", quantite: "1", prix_unitaire: "", taux_tva: "20" };

export default function LignesFacture({ lignes, setLignes, devise }) {
  function modifierLigne(index, champ, valeur) {
    const nouvellesLignes = lignes.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne));
    setLignes(nouvellesLignes);
  }

  function ajouterLigne() {
    setLignes([...lignes, { ...LIGNE_VIDE }]);
  }

  function supprimerLigne(index) {
    setLignes(lignes.filter((ligne, i) => i !== index));
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
                    type="number" min="0" step="any"
                    value={ligne.quantite}
                    onChange={(e) => modifierLigne(index, "quantite", e.target.value)}
                    aria-label="Quantité"
                  />
                </td>
                <td className="colonne-prix">
                  <input
                    type="number" min="0" step="any"
                    value={ligne.prix_unitaire}
                    onChange={(e) => modifierLigne(index, "prix_unitaire", e.target.value)}
                    aria-label="Prix unitaire"
                  />
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
