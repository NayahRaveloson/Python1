import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import api, { messageErreur } from "../api.js";
import BadgeStatut from "../components/BadgeStatut.jsx";
import MessageErreur from "../components/MessageErreur.jsx";
import { formaterDate, formaterMontant } from "../utils.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);


function couleur(nom) {
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
}

export default function TableauDeBord() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const [clients, setClients] = useState([]);

  useEffect(() => {
    api.get("/dashboard/")
      .then((reponse) => setDonnees(reponse.data))
      .catch((e) => setErreur(messageErreur(e)));

    api.get("/clients/")
      .then((reponse) => {
        const liste = Array.isArray(reponse.data) ? reponse.data : reponse.data.results || [];
        setClients(liste.slice(0, 5));
      })
      .catch((e) => setErreur(messageErreur(e)));
  }, []);

  if (erreur) return <MessageErreur>{erreur}</MessageErreur>;
  if (!donnees) return <p>Chargement...</p>;

  const graphique = {
    labels: donnees.ventes_mensuelles.map((mois) => mois.mois),
    datasets: [
      {
        label: "Ventes (Ar)",
        data: donnees.ventes_mensuelles.map((mois) => Number(mois.total)),
        backgroundColor: couleur("--couleur-accent"),
        borderRadius: 7,
      },
    ],
  };
  const optionsGraphique = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, grid: { color: "rgba(107, 98, 87, 0.12)" }, ticks: { callback: (valeur) => formaterMontant(valeur) } }, x: { grid: { display: false } } },
    plugins: { tooltip: { callbacks: { label: (element) => formaterMontant(element.raw) } } },
  };

  return (
    <div>
      <div className="page-entete dashboard-entete">
        <div>
          <h1>Tableau de bord</h1>
          <p>Une vue claire sur votre activité et vos paiements.</p>
        </div>
        <Link to="/factures/nouvelle" className="bouton bouton-accent"> Créer une facture</Link>
      </div>

      <div className="grille-trois-colonnes grille-kpi">
        <div className="carte-kpi">
          <div className="kpi-titre">Chiffre d'affaires encaissé</div>
          <div className="kpi-valeur">{formaterMontant(donnees.encaisse.montant)}</div>
          <div className="texte-discret">{donnees.encaisse.nombre} facture(s) payée(s)</div>
        </div>
        <div className="carte-kpi">
          <div className="kpi-titre">En attente de paiement</div>
          <div className="kpi-valeur">{formaterMontant(donnees.en_attente.montant)}</div>
          <div className="texte-discret">{donnees.en_attente.nombre} facture(s) envoyée(s)</div>
        </div>
        <div className="carte-kpi kpi-retard">
          <div className="kpi-titre">En retard</div>
          <div className="kpi-valeur">{formaterMontant(donnees.en_retard.montant)}</div>
          <div className="texte-discret">{donnees.en_retard.nombre} facture(s) échue(s)</div>
        </div>
      </div>

      <div className="dashboard-grille">
        <section className="dashboard-bloc">
          <h2>Évolution des ventes : 6 derniers mois</h2>
          <div className="graphique">
            <Bar data={graphique} options={optionsGraphique} />
          </div>
        </section>

        <section className="dashboard-bloc">
          <div className="titre-et-lien">
            <h2>Derniers clients</h2>
            <Link to="/clients" className="dashboard-lien">Voir tous</Link>
          </div>
          {clients.length === 0 && <p className="texte-discret">Aucun client enregistré </p>}
          {clients.map((client) => (
            <div className="dashboard-client" key={client.id}>
              <div><strong>{client.nom_client}</strong><small>{client.email || client.telephone || "Client"}</small></div>
              <span className="texte-discret">{client.nombre_factures ?? 0} facture(s)</span>
            </div>
          ))}
        </section>

        <section className="dashboard-bloc">
          <div className="titre-et-lien">
            <h2>Dernières factures</h2>
            <Link to="/factures" className="dashboard-lien">Voir toutes</Link>
          </div>
          {donnees.dernieres_factures.length === 0 && <p className="texte-discret">Aucune factures pour le moment. </p>}
          {donnees.dernieres_factures.map((facture) => (
            <div key={facture.id} className="activite-ligne">
              <div>
                <Link to={`/factures/${facture.id}`}>{facture.numero_facture || "Brouillon"}</Link>
                <div className="texte-discret">{facture.client_details.nom_client} · échéance {formaterDate(facture.date_echeance)}</div>
              </div>
              <div>
                <strong>{formaterMontant(facture.total_ttc, facture.devise)}</strong>{" "}
                <BadgeStatut facture={facture} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
