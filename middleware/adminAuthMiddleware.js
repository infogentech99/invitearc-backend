import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import config from "../config/config.js";

export const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin token not found",
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin || admin.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Admin not found or inactive",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin token",
    });
  }
};
