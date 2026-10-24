import { useEffect, useState } from "react";
import api, { messageErreur } from "../api.js";

const CLIENT_VIDE = { id: null, type_client: "PARTICULIER", nom_client: "", email: "", telephone: "", nif: "", stat: "", rcs: "", adresse: "" };

function chiffresSeulement(valeur, longueur) {
  return valeur.replace(/\D/g, "").slice(0, longueur);
}

export default function ListeClients() {
  const [clients, setClients] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [formulaire, setFormulaire] = useState(null); 
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  async function chargerClients(texte) {
    try {
      const reponse = await api.get("/clients/", { params: texte ? { q: texte } : {} });
      setClients(reponse.data);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  useEffect(() => {
    const minuteur = setTimeout(() => chargerClients(recherche), 300);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  function modifierChamp(nom, valeur) {
    setFormulaire({ ...formulaire, [nom]: valeur });
  }

  function ouvrirAjout() {
    setMessage("");
    setErreur("");
    setFormulaire(CLIENT_VIDE);
  }

  function ouvrirModification(client) {
    setMessage("");
    setErreur("");
    setFormulaire({
      id: client.id,
      type_client: client.type_client || (client.nif || client.stat || client.rcs ? "ENTREPRISE" : "PARTICULIER"),
      nom_client: client.nom_client, email: client.email, telephone: client.telephone || "",
      nif: client.nif || "", stat: client.stat || "", rcs: client.rcs || "", adresse: client.adresse,
    });
  }

  async function enregistrer(evenement) {
    evenement.preventDefault();
    setErreur("");
    const { id, ...champs } = formulaire;
    try {
      if (id) {
        await api.patch(`/clients/${id}/`, champs);
        setMessage("Client modifié.");
      } else {
        await api.post("/clients/", champs);
        setMessage("Client ajouté.");
      }
      setFormulaire(null);
      await chargerClients(recherche);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  async function supprimer(client) {
    if (!window.confirm(`Supprimer le client « ${client.nom_client} » ?`)) return;
    setMessage("");
    setErreur("");
    try {
      await api.delete(`/clients/${client.id}/`);
      setMessage("Client supprimé.");
      await chargerClients(recherche);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  return (
    <div>
      <div className="page-entete">
        <h1>Mes clients</h1>
        {!formulaire && (
          <button className="bouton bouton-accent" onClick={ouvrirAjout}>+ Ajouter un client</button>
        )}
      </div>

      {message && <div className="message message-succes">{message}</div>}
      {erreur && <div className="message message-erreur">{erreur}</div>}

      {formulaire && (
        <form className="carte" onSubmit={enregistrer}>
          <h2>{formulaire.id ? "Modifier le client" : "Nouveau client"}</h2>
          <div className="champ">
            <label>Type de client *</label>
            <div className="choix-type-client">
              <label><input type="radio" name="type_client" value="PARTICULIER" checked={formulaire.type_client === "PARTICULIER"} onChange={() => setFormulaire({ ...formulaire, type_client: "PARTICULIER", nif: "", stat: "", rcs: "" })} /> Particulier (B2C)</label>
              <label><input type="radio" name="type_client" value="ENTREPRISE" checked={formulaire.type_client === "ENTREPRISE"} onChange={() => setFormulaire({ ...formulaire, type_client: "ENTREPRISE" })} /> Entreprise / Professionnel (B2B)</label>
            </div>
          </div>
          <div className="grille-deux-colonnes">
            <div className="champ">
              <label htmlFor="nom_client">Nom du client</label>
              <input id="nom_client" value={formulaire.nom_client} onChange={(e) => modifierChamp("nom_client", e.target.value)} required />
            </div>
            <div className="champ">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={formulaire.email} onChange={(e) => modifierChamp("email", e.target.value)} required />
            </div>
            <div className="champ">
              <label htmlFor="telephone">Téléphone</label>
              <input id="telephone" type="text" inputMode="numeric" pattern="\d{10}" maxLength={10} title="Le téléphone doit contenir exactement 10 chiffres." value={formulaire.telephone} onChange={(e) => modifierChamp("telephone", chiffresSeulement(e.target.value, 10))} />
            </div>
            {formulaire.type_client === "ENTREPRISE" && <>
              <div className="champ">
                <label htmlFor="nif">NIF *</label>
                <input id="nif" type="text" inputMode="numeric" pattern="\d{10}" maxLength={10} title="Le NIF doit contenir exactement 10 chiffres, sans lettres ni espaces." value={formulaire.nif} onChange={(e) => modifierChamp("nif", chiffresSeulement(e.target.value, 10))} required />
              </div>
              <div className="champ">
                <label htmlFor="stat">STAT *</label>
                <input id="stat" type="text" inputMode="numeric" pattern="\d{17}" maxLength={17} title="Le STAT doit contenir exactement 17 chiffres, sans lettres ni espaces." value={formulaire.stat} onChange={(e) => modifierChamp("stat", chiffresSeulement(e.target.value, 17))} required />
              </div>
              <div className="champ">
                <label htmlFor="rcs">RCS *</label>
                <input id="rcs" minLength={10} maxLength={40} placeholder="Antananarivo 2024 B 00512" value={formulaire.rcs} onChange={(e) => modifierChamp("rcs", e.target.value)} required />
                <span className="aide">Entre 10 et 40 caractères.</span>
              </div>
            </>}
          </div>
          <div className="champ">
            <label htmlFor="adresse">Adresse</label>
            <textarea id="adresse" value={formulaire.adresse} onChange={(e) => modifierChamp("adresse", e.target.value)} required />
          </div>
          <div className="actions-ligne">
            <button type="button" className="bouton bouton-discret" onClick={() => setFormulaire(null)}>Annuler</button>
            <button type="submit" className="bouton bouton-principal">Enregistrer</button>
          </div>
        </form>
      )}

      <div className="carte">
        <div className="champ barre-recherche">
          <label htmlFor="recherche">Rechercher</label>
          <input
            id="recherche"
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, email, NIF ou téléphone"
          />
        </div>

        {!clients && <p>Chargement...</p>}
        {clients && clients.length === 0 && (
          <p className="texte-discret">
            {recherche ? `Aucun client ne correspond à « ${recherche} ».` : "Aucun client pour le moment."}
          </p>
        )}
        {clients && clients.length > 0 && (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th className="cacher-mobile">Email</th>
                  <th className="cacher-mobile">Téléphone</th>
                  <th className="cacher-mobile">NIF</th>
                  <th className="colonne-nombre cacher-mobile">Factures</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td><strong>{client.nom_client}</strong></td>
                    <td className="cacher-mobile">{client.email}</td>
                    <td className="cacher-mobile">{client.telephone}</td>
                    <td className="cacher-mobile">{client.nif}</td>
                    <td className="colonne-nombre cacher-mobile">{client.nombre_factures}</td>
                    <td>
                      <div className="actions-ligne">
                        <button className="bouton bouton-discret bouton-petit" onClick={() => ouvrirModification(client)}>
                          Modifier
                        </button>
                        <button
                          className="bouton bouton-danger bouton-petit"
                          onClick={() => supprimer(client)}
                          disabled={client.nombre_factures > 0}
                          title={client.nombre_factures > 0 ? "Ce client a des factures : suppression impossible" : ""}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
