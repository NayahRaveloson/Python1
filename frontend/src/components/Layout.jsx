import { useState } from "react";
import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { deconnecter, estConnecte } from "../api.js";

export default function Layout() {
  const [menuOuvert, setMenuOuvert] = useState(false);

  if (!estConnecte()) {
    return <Navigate to="/connexion" />;
  }

  return (
    <>
      <header className="barre-haut">
        <div className="barre-haut-contenu">
          <Link to="/" className="logo-site" onClick={() => setMenuOuvert(false)} aria-label="Facturia, accueil">
            <span className="logo-f">F</span>acturia
          </Link>

          <button
            type="button"
            className="menu-burger"
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOuvert}
            onClick={() => setMenuOuvert(!menuOuvert)}
          >
            <span></span><span></span><span></span>
          </button>

          <nav className={`menu ${menuOuvert ? "menu-ouvert" : ""}`}>
            <NavLink to="/" end className="menu-lien" onClick={() => setMenuOuvert(false)}>Tableau de bord</NavLink>
            <NavLink to="/factures" end className="menu-lien" onClick={() => setMenuOuvert(false)}>Mes factures</NavLink>
            <NavLink to="/clients" className="menu-lien" onClick={() => setMenuOuvert(false)}>Clients</NavLink>
            <NavLink to="/parametres" className="menu-lien" onClick={() => setMenuOuvert(false)}>Paramètres</NavLink>
            <button onClick={deconnecter} className="bouton bouton-deconnexion">Déconnexion</button>
          </nav>

          <div className="actions-header">
            <Link to="/factures/nouvelle" className="bouton bouton-accent bouton-petit">+ Créer une facture</Link>
            <button onClick={deconnecter} className="bouton bouton-deconnexion bouton-petit">Déconnexion</button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
