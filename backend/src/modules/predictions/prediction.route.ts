import { Router } from "express";
import { predictionController } from "./prediction.controller";

const router = Router();

router.get("/match/:matchId", predictionController.predictMatch);

export default router;
