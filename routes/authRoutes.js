import express from "express";
import { Router } from "express";
import {
  register,
  getMe,
  logout,
  refreshToken,
  login,
  handleForgotPassword,
  verifyForgotPassword,
  handleResetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();


// post /api/auth/register
router.post("/register", register);

// post /api/auth/refreshtoken
router.post("/refreshToken", refreshToken);

// post /api/auth/logout
router.post("/logout", logout);

//GET /api/auth/get-me
router.get("/get-me", protect, getMe);

// post /api/auth/login
router.post("/login", login);

router.post("/forgot-password", handleForgotPassword);
router.post("/verify-otp", verifyForgotPassword);
router.post("/reset-password", handleResetPassword);

export default router;
