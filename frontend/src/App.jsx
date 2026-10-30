import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Connexion from "./pages/Connexion.jsx";
import Inscription from "./pages/Inscription.jsx";
import TableauDeBord from "./pages/TableauDeBord.jsx";
import ListeFactures from "./pages/ListeFactures.jsx";
import ListeClients from "./pages/ListeClients.jsx";
import EditeurFacture from "./pages/EditeurFacture.jsx";
import DetailFacture from "./pages/DetailFacture.jsx";
import Parametres from "./pages/Parametres.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route element={<Layout />}>
        <Route path="/" element={<TableauDeBord />} />
        <Route path="/factures" element={<ListeFactures />} />
        <Route path="/factures/nouvelle" element={<EditeurFacture />} />
        <Route path="/factures/:id" element={<DetailFacture />} />
        <Route path="/factures/:id/modifier" element={<EditeurFacture />} />
        <Route path="/clients" element={<ListeClients />} />
        <Route path="/parametres" element={<Parametres />} />
      </Route>
    </Routes>
  );
}
