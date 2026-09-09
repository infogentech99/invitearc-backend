import { Router } from "express";
import {
  loginAdmin,
  refreshAdminToken,
  getAdminMe,
  logoutAdmin,
} from "../controllers/adminController.js";
import { protectAdmin } from "../middleware/adminAuthMiddleware.js";

const router = Router();

router.post("/login", loginAdmin);
router.post("/refresh-token", refreshAdminToken);
router.post("/logout", logoutAdmin);
router.get("/me", protectAdmin, getAdminMe);

export default router;
