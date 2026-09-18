import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  buyTemplate,
  createRazorpayOrder,
  createCustomPaymentOrder,
  verifyCustomPayment,
  verifyRazorpayPayment,
  getMyTemplates,
  getClientTemplateById,
  updateTemplateText,
  publishTemplate,
  shareTemplate,
  updateShareSlug,
  updateClientTemplate,
} from "../controllers/clienttemplateController.js";

const router = express.Router();

// ---- /api/client-templates/buy-template  ------
router.post("/buy-template", protect, buyTemplate);

// ---- /api/client-templates/create-order ------
router.post("/create-order", protect, createRazorpayOrder);

// Public custom payment checkout.
router.post("/custom-payment/create-order", createCustomPaymentOrder);
router.post("/custom-payment/verify", verifyCustomPayment);

// ---- /api/client-templates/verify-payment ------
router.post("/verify-payment", protect, verifyRazorpayPayment);

//--- /api/client-templates/my-templates -----
router.get("/my-templates", protect, getMyTemplates);

//--- /api/client-templates/share/:slug --------
router.get("/share/:slug", shareTemplate);

//--- /api/client-templates/:id/update-text --------
router.put("/:id/update-text", protect, updateTemplateText);

//--- /api/client-templates/:id  -------
router.get("/:id", protect, getClientTemplateById);

//--- /api/client-templates/:id/publish --------
router.put("/:id/publish", protect, publishTemplate);

//--- /api/client-templates/:id/update-share --------
router.put("/:id/update-share", protect, updateShareSlug);

router.put("/:id", protect, updateClientTemplate);

export default router;
