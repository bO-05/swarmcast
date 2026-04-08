import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analysesRouter from "./analyses";
import fetchUrlRouter from "./fetch-url";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysesRouter);
router.use(fetchUrlRouter);

export default router;
