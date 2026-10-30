import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api, { messageErreur } from "../api.js";
import LignesFacture from "../components/LignesFacture.jsx";
import MessageErreur from "../components/MessageErreur.jsx";
import RechercheClient from "../components/RechercheClient.jsx";
import TotauxFacture from "../components/TotauxFacture.jsx";
import {
  calculerTotaux,
  dateLocaleAujourdhui,
  dansTrenteJours,
} from "../utils.js";

const CLIENT_VIDE = { id: null, type_client: "PARTICULIER", nom_client: "", email: "", telephone: "", nif: "", stat: "", rcs: "", adresse: "" };

function chiffresSeulement(valeur, longueur) {
  return valeur.replace(/\D/g, "").slice(0, longueur);
}

function tauxNumerique(valeur) {
  const propre = valeur.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  const negatif = propre.startsWith("-");
  const morceaux = propre.split(".");
  const nombre = morceaux.length > 2 ? morceaux[0] + "." + morceaux.slice(1).join("") : morceaux.join(".");
  return `${negatif ? "-" : ""}${nombre.replace(/-/g, "")}`;
}
const EMETTEUR_VIDE = { nom_societe: "", nif: "", stat: "", rcs: "", adresse: "", telephone: "" };

export default function EditeurFacture() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();

  const [emetteur, setEmetteur] = useState(EMETTEUR_VIDE);
  const [client, setClient] = useState(CLIENT_VIDE);
  const [dateEcheance, setDateEcheance] = useState(dansTrenteJours());
  const [dateCreation, setDateCreation] = useState(dateLocaleAujourdhui());
  const [devise, setDevise] = useState("MGA");
  const [tauxChange, setTauxChange] = useState("1");
  const [exoneree, setExoneree] = useState(false);
  const [lignes, setLignes] = useState([{ description: "", quantite: "1", prix_unitaire: "", taux_tva: "20" }]);
  const [erreursLignes, setErreursLignes] = useState({});
  const [erreurTaux, setErreurTaux] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    async function charger() {
      try {
        const reponseProfil = await api.get("/profil/");
        const profil = reponseProfil.data;
        setEmetteur({
          nom_societe: profil.nom_societe, nif: profil.nif, stat: profil.stat,
          rcs: profil.rcs, adresse: profil.adresse, telephone: profil.telephone,
        });

        if (id) {
          const facture = (await api.get(`/factures/${id}/`)).data;
          if (facture.statut !== "BROUILLON") {
            navigate(`/factures/${id}`);
            return;
          }
          setClient({ ...CLIENT_VIDE, id: facture.client, ...facture.client_details });
          setDateCreation(facture.date_emission || dateLocaleAujourdhui());
          setDateEcheance(facture.date_echeance);
          setDevise(facture.devise);
          setTauxChange(String(Number(facture.taux_change_mga)));
          setExoneree(facture.exoneree_tva);
          setLignes(
            facture.lignes.map((ligne) => ({
              description: ligne.description,
              quantite: String(Number(ligne.quantite)),
              prix_unitaire: String(Number(ligne.prix_unitaire)),
              taux_tva: String(Number(ligne.taux_tva)),
            }))
          );
        }
      } catch (e) {
        setErreur(messageErreur(e));
      }
    }
    charger();
  }, [id, navigate]);

  function modifierEmetteur(champ, valeur) {
    setEmetteur({ ...emetteur, [champ]: valeur });
  }

  function modifierClient(champ, valeur) {
    setClient({ ...client, [champ]: valeur });
  }

  function effacerErreurLigne(index, champ) {
    const cle = `${index}_${champ}`;
    setErreursLignes((precedentes) => ({ ...precedentes, [cle]: "" }));
    setErreur("");
  }

  async function enregistrerClient() {
    const champsClient = {
      type_client: client.type_client,
      nom_client: client.nom_client,
      email: client.email,
      telephone: client.telephone || "",
      nif: client.nif || "",
      stat: client.stat || "",
      rcs: client.rcs || "",
      adresse: client.adresse,
    };
    if (client.id) {
      await api.patch(`/clients/${client.id}/`, champsClient);
      return client.id;
    }
    const reponse = await api.post("/clients/", champsClient);
    setClient({ ...client, id: reponse.data.id });
    return reponse.data.id;
  }

  async function enregistrer(evenement) {
    evenement.preventDefault();
    if (enCours) return;
    setErreur("");
    setErreursLignes({});
    setErreurTaux("");

    const lignesRemplies = lignes
      .map((ligne, index) => ({ ...ligne, index }))
      .filter((ligne) => ligne.description.trim() !== "");
    if (dateEcheance < dateCreation) {
      setErreur("La date d'échéance ne peut pas être antérieure à la date de création de la facture.");
      return;
    }
    if (devise !== "MGA" && (
      !tauxChange.trim()
      || !Number.isFinite(Number(tauxChange))
      || Number(tauxChange) < 0.0001
    )) {
      const message = "Le taux de change doit être au moins égal à 0,0001.";
      setErreurTaux(message);
      setErreur(message);
      return;
    }
    if (client.type_client === "ENTREPRISE") {
      if (!/^\d{10}$/.test(client.nif || "")) {
        setErreur("Le NIF doit contenir exactement 10 chiffres, sans lettres ni espaces.");
        return;
      }
      if (!/^\d{17}$/.test(client.stat || "")) {
        setErreur("Le STAT doit contenir exactement 17 chiffres, sans lettres ni espaces.");
        return;
      }
      if (!client.rcs || client.rcs.trim().length < 10 || client.rcs.trim().length > 40) {
        setErreur("Le RCS doit contenir entre 10 et 40 caractères.");
        return;
      }
    }
    if (client.telephone && !/^\d{10}$/.test(client.telephone)) {
      setErreur("Le téléphone du client doit contenir exactement 10 chiffres.");
      return;
    }
    if (lignesRemplies.length === 0) {
      setErreur("Ajoutez au moins une ligne avec une description.");
      return;
    }

    const erreurs = {};
    for (const ligne of lignesRemplies) {
      const quantite = Number(ligne.quantite);
      const prix = Number(ligne.prix_unitaire);

      if (
        !ligne.quantite.trim()
        || !Number.isFinite(quantite)
        || quantite < 0.01
      ) {
        erreurs[`${ligne.index}_quantite`] = "La quantité doit être au moins égale à 0,01.";
      }
      if (
        !ligne.prix_unitaire.trim()
        || !Number.isFinite(prix)
        || prix <= 0
      ) {
        erreurs[`${ligne.index}_prix_unitaire`] = "Le prix unitaire doit être supérieur à zéro.";
      }
    }
    if (Object.keys(erreurs).length) {
      setErreursLignes(erreurs);
      setErreur("Corrigez les valeurs signalées dans les lignes de facture.");
      return;
    }

    setEnCours(true);
    try {
      await api.patch("/profil/", emetteur);
      const clientId = await enregistrerClient();
      const donnees = {
        client: clientId,
        date_echeance: dateEcheance,
        devise,
        taux_change_mga: devise === "MGA" ? "1" : tauxChange,
        exoneree_tva: exoneree,
        lignes: lignesRemplies.map((ligne) => ({
          description: ligne.description,
          quantite: ligne.quantite,
          prix_unitaire: ligne.prix_unitaire,
          taux_tva: ligne.taux_tva,
        })),
      };
      const reponse = id ? await api.put(`/factures/${id}/`, donnees) : await api.post("/factures/", donnees);
      navigate(`/factures/${reponse.data.id}`);
    } catch (e) {
      setErreur(messageErreur(e));
      const erreursAPI = e.response?.data?.lignes;
      if (Array.isArray(erreursAPI)) {
        const erreursServeur = {};
        erreursAPI.forEach((ligne, index) => {
          const indexLigne = lignesRemplies[index]?.index;
          if (indexLigne === undefined) return;
          for (const champ of ["quantite", "prix_unitaire"]) {
            const message = ligne?.[champ]?.[0];
            if (message) erreursServeur[`${indexLigne}_${champ}`] = message;
          }
        });
        setErreursLignes(erreursServeur);
      }
      setEnCours(false);
    }
  }

  const totaux = calculerTotaux(lignes, exoneree);

  return (
    <form onSubmit={enregistrer} noValidate>
      <div className="page-entete">
        <h1>{id ? "Modifier le brouillon" : "Nouvelle facture"}</h1>
      </div>

      {location.state?.premiere && (
        <div className="message message-info">
          <strong>Bienvenue !</strong> Créez votre première facture en moins de 60 secondes.
        </div>
      )}
      <MessageErreur>{erreur}</MessageErreur>

      <div className="feuille">
        <div className="feuille-entete">
          <h2 className="feuille-titre">FACTURE</h2>
          <span className="feuille-numero">Le numéro sera attribué à la validation</span>
        </div>

        <div className="bloc-partie">
          <h3>Vos informations (émetteur)</h3>
          <div className="grille-deux-colonnes">
            <div className="champ">
              <label htmlFor="e-nom">Nom de l'entreprise</label>
              <input id="e-nom" value={emetteur.nom_societe} onChange={(e) => modifierEmetteur("nom_societe", e.target.value)} required />
            </div>
            <div className="champ">
              <label htmlFor="e-tel">Téléphone</label>
              <input id="e-tel" type="text" inputMode="numeric" maxLength={10} pattern="\d{10}" title="Le téléphone doit contenir exactement 10 chiffres." value={emetteur.telephone} onChange={(e) => modifierEmetteur("telephone", chiffresSeulement(e.target.value, 10))} />
            </div>
            <div className="champ">
              <label htmlFor="e-nif">NIF</label>
              <input id="e-nif" type="text" inputMode="numeric" maxLength={10} pattern="\d{10}" title="Le NIF doit contenir exactement 10 chiffres." value={emetteur.nif} onChange={(e) => modifierEmetteur("nif", chiffresSeulement(e.target.value, 10))} />
            </div>
            <div className="champ">
              <label htmlFor="e-stat">STAT</label>
              <input id="e-stat" type="text" inputMode="numeric" maxLength={17} pattern="\d{17}" title="Le STAT doit contenir exactement 17 chiffres." value={emetteur.stat} onChange={(e) => modifierEmetteur("stat", chiffresSeulement(e.target.value, 17))} />
            </div>
            <div className="champ">
              <label htmlFor="e-rcs">RCS</label>
              <input id="e-rcs" minLength={10} maxLength={40} value={emetteur.rcs} onChange={(e) => modifierEmetteur("rcs", e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="e-adresse">Adresse</label>
              <input id="e-adresse" value={emetteur.adresse} onChange={(e) => modifierEmetteur("adresse", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bloc-partie">
          <div className="titre-et-lien">
            <h3>Client</h3>
            {client.nom_client && (
              <button type="button" className="bouton bouton-discret bouton-petit" onClick={() => setClient(CLIENT_VIDE)}>
                Nouveau client
              </button>
            )}
          </div>
          <RechercheClient onChoisir={(choisi) => setClient({
            ...CLIENT_VIDE,
            ...choisi,
            type_client: choisi.type_client || (choisi.nif || choisi.stat || choisi.rcs ? "ENTREPRISE" : "PARTICULIER"),
          })} />
          <div className="champ">
            <label>Type de client *</label>
            <div className="choix-type-client">
              <label><input type="radio" name="type_client_facture" checked={client.type_client === "PARTICULIER"} onChange={() => setClient({ ...client, type_client: "PARTICULIER", nif: "", stat: "", rcs: "" })} /> Particulier (B2C)</label>
              <label><input type="radio" name="type_client_facture" checked={client.type_client === "ENTREPRISE"} onChange={() => setClient({ ...client, type_client: "ENTREPRISE" })} /> Entreprise / Professionnel (B2B)</label>
            </div>
          </div>
          <div className="grille-deux-colonnes">
            <div className="champ">
              <label htmlFor="c-nom">Nom du client</label>
              <input id="c-nom" value={client.nom_client} onChange={(e) => modifierClient("nom_client", e.target.value)} required />
            </div>
            <div className="champ">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" type="email" value={client.email} onChange={(e) => modifierClient("email", e.target.value)} required />
            </div>
            <div className="champ">
              <label htmlFor="c-tel">Téléphone (optionnel)</label>
              <input id="c-tel" type="text" inputMode="numeric" maxLength={10} pattern="\d{10}" title="Le téléphone doit contenir exactement 10 chiffres." value={client.telephone || ""} onChange={(e) => modifierClient("telephone", chiffresSeulement(e.target.value, 10))} />
            </div>
            {client.type_client === "ENTREPRISE" && <>
              <div className="champ">
                <label htmlFor="c-nif">NIF *</label>
                <input id="c-nif" type="text" inputMode="numeric" maxLength={10} pattern="\d{10}" title="Le NIF doit contenir exactement 10 chiffres." value={client.nif || ""} onChange={(e) => modifierClient("nif", chiffresSeulement(e.target.value, 10))} required />
              </div>
              <div className="champ">
                <label htmlFor="c-stat">STAT *</label>
                <input id="c-stat" type="text" inputMode="numeric" maxLength={17} pattern="\d{17}" title="Le STAT doit contenir exactement 17 chiffres." value={client.stat || ""} onChange={(e) => modifierClient("stat", chiffresSeulement(e.target.value, 17))} required />
              </div>
              <div className="champ">
                <label htmlFor="c-rcs">RCS *</label>
                <input id="c-rcs" minLength={10} maxLength={40} placeholder="Antananarivo 2024 B 00512" value={client.rcs || ""} onChange={(e) => modifierClient("rcs", e.target.value)} required />
                <span className="aide">Entre 10 et 40 caractères.</span>
              </div>
            </>}
            <div className="champ">
              <label htmlFor="c-adresse">Adresse</label>
              <input id="c-adresse" value={client.adresse} onChange={(e) => modifierClient("adresse", e.target.value)} required />
            </div>
          </div>
        </div>

        <div className="options-facture">
          <div className="champ">
            <label htmlFor="echeance">Date d'échéance</label>
            <input id="echeance" type="date" min={dateCreation} value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} required />
          </div>
          <div className="champ">
            <label htmlFor="devise">Devise</label>
            <select id="devise" value={devise} onChange={(e) => setDevise(e.target.value)}>
              <option value="MGA">Ariary (Ar)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </div>
          {devise !== "MGA" && (
            <div className="champ">
              <label htmlFor="taux">Taux de change : 1 {devise} = ... Ar</label>
              <input id="taux" type="text" inputMode="decimal" value={tauxChange} onChange={(e) => {
                setTauxChange(tauxNumerique(e.target.value));
                setErreurTaux("");
              }} required aria-invalid={Boolean(erreurTaux)} aria-describedby={erreurTaux ? "erreur-taux" : undefined} />
              {erreurTaux && <span className="erreur-champ" id="erreur-taux">{erreurTaux}</span>}
            </div>
          )}
        </div>

        <label className="champ-case">
          <input type="checkbox" checked={exoneree} onChange={(e) => setExoneree(e.target.checked)} />
          Facture exonérée de TVA (sinon TVA de 20 %)
        </label>

        <LignesFacture
          lignes={lignes}
          setLignes={setLignes}
          devise={devise}
          erreurs={erreursLignes}
          onEffacerErreur={effacerErreurLigne}
          onEffacerErreurs={() => {
            setErreursLignes({});
            setErreur("");
          }}
        />
        <TotauxFacture totaux={totaux} devise={devise} exoneree={exoneree} tauxChange={tauxChange} />
        <p className="aide texte-droite">Totaux indicatifs : le calcul officiel est fait par le serveur à l'enregistrement.</p>

        <div className="actions-editeur">
          <Link to={id ? `/factures/${id}` : "/"} className="bouton bouton-discret">Annuler</Link>
          <button type="submit" className="bouton bouton-principal" disabled={enCours}>
            {enCours ? "Enregistrement..." : "Enregistrer le brouillon"}
          </button>
        </div>
      </div>
    </form>
  );
}
