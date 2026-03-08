import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "./auth/AuthContext.js";
import Auth from "./pages/Auth.js";
import WatchParties from "./pages/WatchParties.js";
import CreateWatchParty from "./pages/CreateWatchParty.js";
import JoinWatchParty from "./pages/JoinWatchParty.js";
import WatchPartyDetail from "./pages/WatchPartyDetail.js";
import Categories from "./pages/Categories.js";
import Leaderboard from "./pages/Leaderboard.js";
import BonusEvents from "./pages/BonusEvents.js";
import CeremonyMode from "./pages/CeremonyMode.js";
import EmceeSettings from "./pages/EmceeSettings.js";
import ManageBonus from "./pages/ManageBonus.js";
import Profile from "./pages/Profile.js";
import PartyLayout from "./components/PartyLayout.js";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />

      {/* Watch party management */}
      <Route path="/" element={<ProtectedRoute><WatchParties /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><CreateWatchParty /></ProtectedRoute>} />
      <Route path="/join" element={<ProtectedRoute><JoinWatchParty /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Party pages with bottom nav */}
      <Route path="/party/:partyId" element={<ProtectedRoute><PartyLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="categories" replace />} />
        <Route path="categories" element={<Categories />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="bonus" element={<BonusEvents />} />
        <Route path="settings" element={<WatchPartyDetail />} />
        <Route path="ceremony" element={<CeremonyMode />} />
        <Route path="ceremony/emcees" element={<EmceeSettings />} />
        <Route path="bonus/manage" element={<ManageBonus />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
