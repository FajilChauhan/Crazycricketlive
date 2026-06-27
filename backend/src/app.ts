import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.route";
import tournamentRoutes from "./modules/tournaments/tournament.route";
import teamRoutes from "./modules/teams/team.route";
import teamMemberRoutes from "./modules/team-members/team-member.route";
import matchRoutes from "./modules/matches/match.route";
import dashboardRoutes from "./modules/dashboard/dashboard.route";
import profileRoutes from "./modules/profile/profile.route";
import searchRoutes from "./modules/search/search.route";
import userRoutes from "./modules/users/user.route";
import { errorHandler } from "./shared/middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static images from external directory
import path from "path";
const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'uploads')
  : "C:\\Users\\fajil\\OneDrive\\Dokumen\\CrazyCricketLiveImages";
app.use("/api/uploads", express.static(UPLOAD_DIR));

app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/teams", teamMemberRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Cricket Live API is running");
});

app.use(errorHandler);

export default app;