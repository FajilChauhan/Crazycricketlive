// routes/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

import DashboardPage from "../pages/DashboardPage";
import CreateTournamentPage from "../pages/CreateTournamentPage";
import ProfilePage from "../pages/ProfilePage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import TournamentDetailPage from "../pages/TournamentDetailPage";
import TournamentsPage from "../pages/TournamentsPage";
import TeamDetailPage from "../pages/TeamDetailPage";
import MatchDetailPage from "../pages/MatchDetailPage";
import CreateMatchPage from "../pages/CreateMatchPage";
import LiveScoringPage from "../pages/LiveScoringPage";
import PlayerProfilePage from "../pages/PlayerProfilePage";
import SearchPage from "../pages/SearchPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
<Route path="/tournaments/:id" element={<TournamentDetailPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/create" element={
          <ProtectedRoute><CreateTournamentPage /></ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        <Route path="/teams/:teamId" element={<TeamDetailPage />} />
        <Route path="/matches/:matchId" element={<MatchDetailPage />} />
        <Route
          path="/tournaments/:id/create-match"
          element={<ProtectedRoute><CreateMatchPage /></ProtectedRoute>}
        />
        <Route
  path="/matches/:matchId/scoring"
  element={<ProtectedRoute><LiveScoringPage /></ProtectedRoute>}
/>
        <Route path="/players/:userId" element={<PlayerProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;