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
router.get("/tournament/:tournamentId", authenticateToken, asyncHandler(matchController.getMatchesByTournament));
router.get("/:matchId", authenticateToken, asyncHandler(matchController.getMatchById));
router.put("/:matchId", authenticateToken, validateBody(updateMatchSchema), asyncHandler(matchController.updateMatch));
router.delete("/:matchId", authenticateToken, asyncHandler(matchController.deleteMatch));

router.put("/:matchId/toss", authenticateToken, validateBody(tossSchema), asyncHandler(matchController.updateToss));
router.put("/:matchId/status", authenticateToken, validateBody(statusSchema), asyncHandler(matchController.updateStatus));

router.post("/:matchId/playing-xi", authenticateToken, validateBody(addPlayingXISchema), asyncHandler(matchController.addPlayingXI));
router.get("/:matchId/playing-xi", authenticateToken, asyncHandler(matchController.getPlayingXI));

router.post("/:matchId/innings", authenticateToken, validateBody(startInningsSchema), asyncHandler(matchController.startInnings));
router.put("/:matchId/innings/:inningsId/end", authenticateToken, asyncHandler(matchController.endInnings));
router.get("/:matchId/innings", authenticateToken, asyncHandler(matchController.getInnings));

router.post("/:matchId/balls", authenticateToken, validateBody(addBallSchema), asyncHandler(matchController.addBall));
router.get("/:matchId/balls", authenticateToken, asyncHandler(matchController.getBalls));

router.get("/:matchId/live", authenticateToken, asyncHandler(matchController.getLiveScore));
router.get("/:matchId/scorecard", authenticateToken, asyncHandler(matchController.getScorecard));
router.get("/:matchId/batting-scorecard", authenticateToken, asyncHandler(matchController.getBattingScorecard));
router.get("/:matchId/bowling-scorecard", authenticateToken, asyncHandler(matchController.getBowlingScorecard));
router.get("/:matchId/summary", authenticateToken, asyncHandler(matchController.getSummary));

router.get("/:matchId/player-status", authenticateToken, asyncHandler(matchController.getPlayerStatus));
router.get("/players/:userId/history", authenticateToken, asyncHandler(matchController.getPlayerHistory));
router.get("/players/:userId/stats", authenticateToken, asyncHandler(matchController.getPlayerStats));

export default router;