import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import config from "../config/config.js";

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const expectedEmail = (process.env.ADMIN_EMAIL || "admin@invitearc.com").trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD || "Admin@123";

    if (
      email.trim().toLowerCase() !== expectedEmail ||
      password !== expectedPassword
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const admin = await Admin.findOne({
      name: process.env.ADMIN_NAME || "InviteArc Admin",
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin record not found in database",
      });
    }

    const accessToken = jwt.sign(
      { id: admin._id, role: "admin" },
      config.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
      { id: admin._id, role: "admin" },
      config.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("adminRefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        role: "admin",
      },
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const refreshAdminToken = async (req, res) => {
  const refreshToken = req.cookies.adminRefreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Admin refresh token not found",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin session",
      });
    }

    const accessToken = jwt.sign(
      { id: admin._id, role: "admin" },
      config.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const newRefreshToken = jwt.sign(
      { id: admin._id, role: "admin" },
      config.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("adminRefreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Admin access token refreshed",
      accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin refresh token",
    });
  }
};

export const getAdminMe = async (req, res) => {
  try {
    const admin = req.admin;
    return res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        role: "admin",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logoutAdmin = async (req, res) => {
  res.clearCookie("adminRefreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Admin logout successful",
  });
};
