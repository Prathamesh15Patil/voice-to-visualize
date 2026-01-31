import { Router } from "express";
import { analysis } from "../controllers/analysis.controller.js";
import upload from "../middleware/upload.js";

const router = Router();

router.route("/analyze").post(
    upload.single("file"),
    analysis
    );
export default router;

//upload.single() --> For now we'll just take single file , in advanced version we can take multiple to compare between them
