import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Template from "../models/Template.js";
import ClientTemplate from "../models/ClientTemplate.js";
import config from "../config/config.js";

const toCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const getAdminDashboardStats = async (req, res) => {
  try {
    const [userCount, templateCount, orderCount] = await Promise.all([
      User.countDocuments(),
      Template.countDocuments(),
      ClientTemplate.countDocuments(),
    ]);

    const users = await User.find({})
      .select("name email mobileNumber role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const orders = await ClientTemplate.find()
      .populate({ path: "userId", select: "name email" })
      .populate({ path: "templateId", select: "title indprice usaprice previewImage" })
      .sort({ createdAt: -1 })
      .lean();

    const revenue = orders.reduce((sum, order) => {
      return sum + Number(order.templateId?.indprice || 0);
    }, 0);

    const paymentRecords = orders.map((order) => ({
      id: order._id,
      userName: order.userId?.name || "Unknown user",
      templateTitle: order.templateId?.title || "Unknown template",
      amount: Number(order.templateId?.indprice || 0),
      date: order.createdAt,
      status: "Paid",
    }));

    const recentOrders = paymentRecords.slice(0, 6);

    const templateUsageMap = new Map();

    orders.forEach((order) => {
      const template = order.templateId;
      if (!template || !template.title) return;

      const current = templateUsageMap.get(template.title) || {
        title: template.title,
        uses: 0,
        price: Number(template.indprice || 0),
        previewImage: template.previewImage || "",
      };

      current.uses += 1;
      templateUsageMap.set(template.title, current);
    });

    const popularTemplates = Array.from(templateUsageMap.values())
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 4)
      .map((item) => ({
        title: item.title,
        uses: item.uses,
        price: item.price,
        previewImage: item.previewImage,
      }));

    const monthSeriesStart = new Date();
    monthSeriesStart.setDate(1);
    monthSeriesStart.setMonth(monthSeriesStart.getMonth() - 11);
    monthSeriesStart.setHours(0, 0, 0, 0);

    const monthlySales = await ClientTemplate.aggregate([
      {
        $match: {
          createdAt: { $gte: monthSeriesStart },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthMap = new Map(monthlySales.map((item) => [item._id, item.count]));
    const fullMonthSeries = [];

    for (let i = 0; i < 12; i += 1) {
      const date = new Date(monthSeriesStart.getFullYear(), monthSeriesStart.getMonth() + i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      fullMonthSeries.push({
        _id: key,
        count: monthMap.get(key) || 0,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        totals: {
          templates: templateCount,
          users: userCount,
          orders: orderCount,
          revenue,
          revenueDisplay: toCurrency(revenue),
        },
        users: users.map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          mobileNumber: user.mobileNumber,
          role: user.role || "user",
          createdAt: user.createdAt,
        })),
        payments: paymentRecords,
        recentOrders,
        popularTemplates,
        monthlySales: fullMonthSeries,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
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
        email: admin.email,
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
