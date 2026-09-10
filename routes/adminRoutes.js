import { Router } from "express";
import {
  loginAdmin,
  refreshAdminToken,
  getAdminMe,
  logoutAdmin,
  getAdminDashboardStats,
} from "../controllers/adminController.js";
import { protectAdmin } from "../middleware/adminAuthMiddleware.js";

const router = Router();
router.post("/login", loginAdmin);
router.post("/refresh-token", refreshAdminToken);
router.post("/logout", logoutAdmin);
router.get("/me", protectAdmin, getAdminMe);
router.get("/dashboard/stats", protectAdmin, getAdminDashboardStats);

export default router;
