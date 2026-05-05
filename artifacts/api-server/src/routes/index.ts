import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import dbRouter from "./db";
import migrateRouter from "./migrate";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(configRouter);
router.use(dbRouter);
router.use(migrateRouter);

export default router;
