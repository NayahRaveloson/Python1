import { useEffect, useState } from "react";
import api, { messageErreur } from "../api.js";

function chiffresSeulement(valeur, longueur) {
  return valeur.replace(/\D/g, "").slice(0, longueur);
}

export default function Parametres() {
  const [profil, setProfil] = useState(null);
  const [nouveauLogo, setNouveauLogo] = useState(null);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/profil/")
      .then((reponse) => setProfil(reponse.data))
      .catch((e) => setErreur(messageErreur(e)));
  }, []);

  function modifierChamp(nom, valeur) {
    setProfil({ ...profil, [nom]: valeur });
  }

  async function enregistrer(evenement) {
    evenement.preventDefault();
    setMessage("");
    setErreur("");

    const formulaire = new FormData();
    for (const champ of ["nom_societe", "nif", "stat", "rcs", "adresse", "telephone", "coordonnees_bancaires", "prefixe_numerotation"]) {
      formulaire.append(champ, profil[champ]);
    }
    if (nouveauLogo) {
      formulaire.append("logo", nouveauLogo);
    }

    try {
      const reponse = await api.patch("/profil/", formulaire);
      setProfil(reponse.data);
      setNouveauLogo(null);
      setMessage("Paramètres enregistrés.");
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  if (!profil) {
    return erreur ? <div className="message message-erreur">{erreur}</div> : <p>Chargement...</p>;
  }

  return (
    <div>
      <div className="page-entete">
        <h1>Paramètres</h1>
      </div>

      {message && <div className="message message-succes">{message}</div>}
      {erreur && <div className="message message-erreur">{erreur}</div>}

      <form onSubmit={enregistrer}>
        <div className="carte">
          <h2>Mon entreprise</h2>
          <div className="champ">
            <label htmlFor="nom_societe">Nom de l'entreprise</label>
            <input id="nom_societe" value={profil.nom_societe} onChange={(e) => modifierChamp("nom_societe", e.target.value)} required />
          </div>
          <div className="grille-deux-colonnes">
            <div className="champ">
              <label htmlFor="nif">NIF</label>
              <input id="nif" type="text" inputMode="numeric" maxLength={10} pattern="\d{10}" title="Le NIF doit contenir exactement 10 chiffres." value={profil.nif} onChange={(e) => modifierChamp("nif", chiffresSeulement(e.target.value, 10))} />
            </div>
            <div className="champ">
              <label htmlFor="stat">STAT</label>
              <input id="stat" type="text" inputMode="numeric" maxLength={17} pattern="\d{17}" title="Le STAT doit contenir exactement 17 chiffres." value={profil.stat} onChange={(e) => modifierChamp("stat", chiffresSeulement(e.target.value, 17))} />
            </div>
            <div className="champ">
              <label htmlFor="rcs">RCS</label>
              <input id="rcs" minLength={10} maxLength={40} value={profil.rcs} onChange={(e) => modifierChamp("rcs", e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="telephone">Téléphone</label>
              <input id="telephone" type="text" inputMode="numeric" maxLength={10} pattern="\d{10}" title="Le téléphone doit contenir exactement 10 chiffres." value={profil.telephone} onChange={(e) => modifierChamp("telephone", chiffresSeulement(e.target.value, 10))} />
            </div>
          </div>
          <div className="champ">
            <label htmlFor="adresse">Adresse</label>
            <textarea id="adresse" value={profil.adresse} onChange={(e) => modifierChamp("adresse", e.target.value)} />
          </div>
        </div>

        <div className="carte">
          <h2>Logo</h2>
          {profil.logo_url && <img src={profil.logo_url} alt="Logo actuel" className="logo-facture" />}
          <div className="champ">
            <label htmlFor="logo">{profil.logo_url ? "Remplacer le logo" : "Ajouter un logo"}</label>
            <input id="logo" type="file" accept="image/*" onChange={(e) => setNouveauLogo(e.target.files[0])} />
          </div>
        </div>

        <div className="carte">
          <h2>Paiement et numérotation</h2>
          <div className="champ">
            <label htmlFor="coordonnees_bancaires">Coordonnées bancaires ou Mobile Money (affichées en bas des factures)</label>
            <textarea
              id="coordonnees_bancaires"
              value={profil.coordonnees_bancaires}
              onChange={(e) => modifierChamp("coordonnees_bancaires", e.target.value)}
              placeholder={"Ex : BNI Madagascar - RIB 00005 00001 12345678901 23\nMvola : 034 00 000 00"}
            />
          </div>
          <div className="champ" style={{ maxWidth: 240 }}>
            <label htmlFor="prefixe">Préfixe de numérotation</label>
            <input id="prefixe" value={profil.prefixe_numerotation} maxLength={10} onChange={(e) => modifierChamp("prefixe_numerotation", e.target.value)} required />
            <span className="aide">Vos factures seront numérotées {profil.prefixe_numerotation || "FAC"}-{new Date().getFullYear()}-0001. Le préfixe ne peut plus changer après la première facture validée.</span>
          </div>
        </div>

        <button type="submit" className="bouton bouton-principal">Enregistrer les paramètres</button>
      </form>
    </div>
  );
}
