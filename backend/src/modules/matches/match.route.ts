import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { matchController } from "./match.controller";
import {
  addBallSchema,
  addPlayingXISchema,
  createMatchSchema,
  startInningsSchema,
  statusSchema,
  tossSchema,
  updateMatchSchema,
} from "./match.schema";

const router = Router();

const validateBody =
  (schema: any) =>
  (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };

router.post("/", authenticateToken, validateBody(createMatchSchema), asyncHandler(matchController.createMatch));
router.get("/tournament/:tournamentId", asyncHandler(matchController.getMatchesByTournament));
router.get("/:matchId", asyncHandler(matchController.getMatchById));
router.put("/:matchId", authenticateToken, validateBody(updateMatchSchema), asyncHandler(matchController.updateMatch));
router.delete("/:matchId", authenticateToken, asyncHandler(matchController.deleteMatch));
router.put("/:matchId/winner", authenticateToken, asyncHandler(matchController.declareWinner));
router.put("/:matchId/tie", authenticateToken, asyncHandler(matchController.declareTie));

router.put("/:matchId/toss", authenticateToken, validateBody(tossSchema), asyncHandler(matchController.updateToss));
router.put("/:matchId/status", authenticateToken, validateBody(statusSchema), asyncHandler(matchController.updateStatus));

router.post("/:matchId/playing-xi", authenticateToken, validateBody(addPlayingXISchema), asyncHandler(matchController.addPlayingXI));
router.get("/:matchId/playing-xi", asyncHandler(matchController.getPlayingXI));

router.post("/:matchId/innings", authenticateToken, validateBody(startInningsSchema), asyncHandler(matchController.startInnings));
router.put("/:matchId/innings/:inningsId/end", authenticateToken, asyncHandler(matchController.endInnings));
router.get("/:matchId/innings", asyncHandler(matchController.getInnings));

router.post("/:matchId/balls", authenticateToken, validateBody(addBallSchema), asyncHandler(matchController.addBall));
router.get("/:matchId/balls", asyncHandler(matchController.getBalls));

router.get("/:matchId/live", asyncHandler(matchController.getLiveScore));
router.get("/:matchId/scorecard", asyncHandler(matchController.getScorecard));
router.get("/:matchId/batting-scorecard", asyncHandler(matchController.getBattingScorecard));
router.get("/:matchId/bowling-scorecard", asyncHandler(matchController.getBowlingScorecard));
router.get("/:matchId/summary", asyncHandler(matchController.getSummary));

router.get("/:matchId/player-status", asyncHandler(matchController.getPlayerStatus));
router.get("/players/:userId/history", asyncHandler(matchController.getPlayerHistory));
router.get("/players/:userId/stats", asyncHandler(matchController.getPlayerStats));

router.get("/:matchId/scoring-state", asyncHandler(matchController.getScoringState));
router.put("/:matchId/scoring-state", authenticateToken, asyncHandler(matchController.saveScoringState));
router.delete("/:matchId/scoring-state", authenticateToken, asyncHandler(matchController.clearScoringState));
export default router;