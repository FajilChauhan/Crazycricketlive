import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.route";
import tournamentRoutes from "./modules/tournaments/tournament.route";
import teamRoutes from "./modules/teams/team.route";
import teamMemberRoutes from "./modules/team-members/team-member.route";
import matchRoutes from "./modules/matches/match.route";
import matchPermissionRoutes from "./modules/match-permissions/match-permission.route";
import pointRoutes from "./modules/points/point.route";
import dashboardRoutes from "./modules/dashboard/dashboard.route";
import profileRoutes from "./modules/profile/profile.route";
import searchRoutes from "./modules/search/search.route";
import { errorHandler } from "./shared/middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/teams", teamMemberRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/matches", matchPermissionRoutes);
app.use("/api/tournaments", pointRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);

app.get("/", (req, res) => {
  res.send("Cricket Live API is running");
});

app.use(errorHandler);

export default app;