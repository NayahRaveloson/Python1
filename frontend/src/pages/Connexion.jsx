import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { enregistrerTokens, messageErreur } from "../api.js";

export default function Connexion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");

  async function seConnecter(evenement) {
    evenement.preventDefault();
    setErreur("");
    try {
      const reponse = await api.post("/auth/token/", { username: email.toLowerCase(), password: motDePasse });
      enregistrerTokens(reponse.data);

      const tableauDeBord = await api.get("/dashboard/");
      if (tableauDeBord.data.nombre_factures === 0) {
        navigate("/factures/nouvelle", { state: { premiere: true } });
      } else {
        navigate("/");
      }
    } catch (e) {
      if (e.response?.status === 401) {
        setErreur("Email ou mot de passe incorrect.");
      } else {
        setErreur(messageErreur(e));
      }
    }
  }

  return (
    <div className="page-connexion">
      <form className="carte-connexion" onSubmit={seConnecter}>
        <h1>Connexion</h1>
        <p className="texte-discret">Gérez vos factures en Ariary, simplement.</p>

        {erreur && <div className="message message-erreur">{erreur}</div>}

        <div className="champ">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="champ">
          <label htmlFor="motDePasse">Mot de passe</label>
          <input id="motDePasse" type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        </div>

        <button type="submit" className="bouton bouton-principal bouton-large">Se connecter</button>
        <p className="texte-discret" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>
      </form>
    </div>
  );
}
