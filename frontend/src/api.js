import axios from "axios";

//const api = axios.create({ baseURL: "/api" });
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export function estConnecte() {
  return Boolean(localStorage.getItem("access"));
}

export function enregistrerTokens(tokens) {
  localStorage.setItem("access", tokens.access);
  localStorage.setItem("refresh", tokens.refresh);
}

export function deconnecter() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.href = "/connexion";
}

api.interceptors.request.use((requete) => {
  const token = localStorage.getItem("access");
  if (token) {
    requete.headers.Authorization = `Bearer ${token}`;
  }
  return requete;
});

api.interceptors.response.use(
  (reponse) => reponse,
  async (erreur) => {
    const requete = erreur.config;
    const refresh = localStorage.getItem("refresh");
    const tokenExpire = erreur.response?.status === 401 && refresh;

    if (tokenExpire && !requete.dejaRelancee && !requete.url.startsWith("/auth/")) {
      requete.dejaRelancee = true;
      try {
        //const reponse = await axios.post("/https://python1-jsnr.onrender.com", { refresh });
        const reponse = await api.post("/auth/token/refresh/", { refresh });
        localStorage.setItem("access", reponse.data.access);
        requete.headers.Authorization = `Bearer ${reponse.data.access}`;
        return api(requete);
      } catch {
        deconnecter();
      }
    }
    return Promise.reject(erreur);
  }
);

export function messageErreur(erreur) {
  const donnees = erreur.response?.data;
  if (!donnees) {
    return "Impossible de contacter le serveur. Vérifiez que Django est lancé.";
  }
  if (typeof donnees === "string") {
    return "Erreur du serveur. Réessayez.";
  }
  if (donnees.detail) {
    return donnees.detail;
  }

  const messages = [];
  for (const [champ, erreurs] of Object.entries(donnees)) {
    const texte = Array.isArray(erreurs) ? erreurs.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join(" ") : JSON.stringify(erreurs);
    messages.push(`${champ} : ${texte}`);
  }
  return messages.join(" | ");
}

export async function telechargerPdf(facture) {
  const reponse = await api.get(`/factures/${facture.id}/pdf/`, { responseType: "blob" });
  const adresse = URL.createObjectURL(reponse.data);
  const lien = document.createElement("a");
  lien.href = adresse;
  lien.download = `${facture.numero_facture || "brouillon-" + facture.id}.pdf`;
  lien.click();
  URL.revokeObjectURL(adresse);
}

export default api;
