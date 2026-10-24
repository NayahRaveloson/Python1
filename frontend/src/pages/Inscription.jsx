import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { enregistrerTokens, messageErreur } from "../api.js";

export default function Inscription() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomSociete, setNomSociete] = useState("");
  const [erreur, setErreur] = useState("");

  async function creerLeCompte(evenement) {
    evenement.preventDefault();
    setErreur("");
    try {
      await api.post("/auth/register/", { email, password: motDePasse, nom_societe: nomSociete });

      const reponse = await api.post("/auth/token/", { username: email.toLowerCase(), password: motDePasse });
      enregistrerTokens(reponse.data);

      navigate("/factures/nouvelle", { state: { premiere: true } });
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  return (
    <div className="page-connexion">
      <form className="carte-connexion" onSubmit={creerLeCompte}>
        <h1>Créer un compte</h1>
        <p className="texte-discret">Trois champs, et votre première facture est prête en moins de 60 secondes.</p>

        {erreur && <div className="message message-erreur">{erreur}</div>}

        <div className="champ">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="champ">
          <label htmlFor="motDePasse">Mot de passe (8 caractères minimum)</label>
          <input id="motDePasse" type="password" minLength={8} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        </div>
        <div className="champ">
          <label htmlFor="nomSociete">Nom de l'entreprise</label>
          <input id="nomSociete" value={nomSociete} onChange={(e) => setNomSociete(e.target.value)} required />
        </div>

        <button type="submit" className="bouton bouton-principal bouton-large">Créer mon compte</button>
        <p className="texte-discret" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
