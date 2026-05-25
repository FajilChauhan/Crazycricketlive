import { Router } from "express";
import { tournamentController } from "./tournament.controller";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { createTournamentSchema, updateTournamentSchema } from "./tournament.schema";

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

router.post(
  "/",
  authenticateToken,
  validateBody(createTournamentSchema),
  asyncHandler(tournamentController.createTournament)
);

router.get("/", authenticateToken, asyncHandler(tournamentController.getAllTournaments));

router.get("/me", authenticateToken, asyncHandler(tournamentController.getMyTournaments));

router.get("/:tournamentId", authenticateToken, asyncHandler(tournamentController.getTournamentById));

router.put(
  "/:tournamentId",
  authenticateToken,
  validateBody(updateTournamentSchema),
  asyncHandler(tournamentController.updateTournament)
);

router.delete(
  "/:tournamentId",
  authenticateToken,
  asyncHandler(tournamentController.deleteTournament)
);

export default router;