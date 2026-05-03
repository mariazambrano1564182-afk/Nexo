import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import dbRouter from "./db";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(dbRouter);

export default router;
