import { useEffect, useState } from "react";
import api from "../api.js";

export default function RechercheClient({ onChoisir }) {
  const [texte, setTexte] = useState("");
  const [mesClients, setMesClients] = useState([]);
  const [societes, setSocietes] = useState([]);

  useEffect(() => {
    if (texte.trim().length < 2) {
      setMesClients([]);
      setSocietes([]);
      return;
    }

    let annule = false;
    const minuteur = setTimeout(async () => {
      try {
        const [reponseClients, reponseSocietes] = await Promise.all([
          api.get("/clients/", { params: { q: texte } }),
          api.get("/recherche-societe/", { params: { q: texte } }),
        ]);
        if (!annule) {
          setMesClients(reponseClients.data);
          setSocietes(reponseSocietes.data);
        }
      } catch {}
    }, 300);

    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [texte]);

  function choisirMonClient(client) {
    onChoisir({
      id: client.id,
      type_client: client.type_client || (client.nif || client.stat || client.rcs ? "ENTREPRISE" : "PARTICULIER"),
      nom_client: client.nom_client,
      email: client.email,
      telephone: client.telephone || "",
      nif: client.nif || "",
      stat: client.stat || "",
      rcs: client.rcs || "",
      adresse: client.adresse,
    });
    fermer();
  }

  async function choisirSociete(societe) {
    let existant = null;
    try {
      const reponse = await api.get("/clients/", { params: { q: societe.nif } });
      existant = reponse.data.find((client) => client.nif === societe.nif);
    } catch {

    }
    if (existant) {
      choisirMonClient(existant);
      return;
    }
    onChoisir({
      id: null, 
      type_client: "ENTREPRISE",
      telephone: "",
      nom_client: societe.nom_officiel,
      email: "",
      nif: societe.nif,
      stat: societe.stat,
      rcs: societe.rcs,
      adresse: societe.adresse_siege,
    });
    fermer();
  }

  function fermer() {
    setTexte("");
    setMesClients([]);
    setSocietes([]);
  }

  const aDesResultats = mesClients.length > 0 || societes.length > 0;

  return (
    <div className="recherche">
      <input
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Rechercher un client ou une entreprise (ex : TELMA)"
        aria-label="Rechercher un client"
      />
      {aDesResultats && (
        <ul className="suggestions">
          {mesClients.length > 0 && <li className="suggestions-titre">Mes clients</li>}
          {mesClients.map((client) => (
            <li key={"client" + client.id}>
              <button type="button" className="suggestion" onClick={() => choisirMonClient(client)}>
                {client.nom_client}
                <small>{client.email}</small>
              </button>
            </li>
          ))}
          {societes.length > 0 && <li className="suggestions-titre">Registre national des entreprises</li>}
          {societes.map((societe) => (
            <li key={"societe" + societe.id}>
              <button type="button" className="suggestion" onClick={() => choisirSociete(societe)}>
                {societe.nom_officiel}
                <small>NIF {societe.nif} · {societe.adresse_siege}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
