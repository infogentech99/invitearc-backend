import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import Otp from "../models/otp.js";
import sendEmail from "../config/sendEmail.js";

export const register = async (req, res) => {
  try {
    const { name, email, mobileNumber, password } = req.body;
    const normalizedMobileNumber = String(mobileNumber || "").trim();

    const existUser = await User.findOne({
      email,
      mobileNumber: normalizedMobileNumber,
    });

    if (existUser) {
      return res.status(400).json({
        success: false,
        message: "Mobile number or Email already exists",
      });
    }

    const hashedpassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      mobileNumber: normalizedMobileNumber,
      password: hashedpassword,
    });

    const accessToken = jwt.sign(
      {
        id: user._id,
      },
      config.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      config.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "User register successfully",
      user: {
        name: user.name,
        email: user.email,
      },
      accessToken,
    });

  } catch (error) {
  // console.error("Register Error:", error);

  if (error.name === "ValidationError") {
    const firstError = Object.values(error.errors)[0];

    return res.status(400).json({
      success: false,
      message: firstError.message,
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Email or Mobile number already exists",
    });
  }

  res.status(500).json({
    success: false,
    message: error.message,
  });
}
};

export const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  // console.log("Refresh Token:", refreshToken);
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token not found",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }

  const accessToken = jwt.sign(
    {
      id: decoded.id,
    },
    config.JWT_SECRET,
    {
      expiresIn: "15m",
    },
  );

  const newRefreshToken = jwt.sign(
    {
      id: decoded.id,
    },
    config.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: "Access token refreshed successfully",
    accessToken,
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Password not matched",
      });
    }

    const accessToken = jwt.sign(
      {
        id: user._id,
      },
      config.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      config.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

export const handleForgotPassword = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "user does not exist" });
    }

    const generatedotp = Math.floor(100000 + Math.random() * 900000);

    await Otp.deleteMany({ email });

    const newOtp = new Otp({
      email,
      otp: generatedotp,
    });
    await newOtp.save();
    const message = `Your verification code for password reset is ${generatedotp}`;
    await sendEmail(email, "Reset Password", message);
    res.status(200).json({
      message: "otp send to your email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyForgotPassword = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  try {
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter a valid six-digit OTP" });
    }

    const otpRecord = await Otp.findOne({ email, otp });
    if (
      !otpRecord ||
      Date.now() > otpRecord.createdAt.getTime() + 60 * 60 * 1000
    ) {
      return res.status(400).json({ message: "invalid or expired otp" });
    }

    res.status(200).json({
      message: "otp verification successful",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Internal Server error",
    });
  }
};

export const handleResetPassword = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  const { newPassword } = req.body;
  try {
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter a valid six-digit OTP" });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const otpRecord = await Otp.findOne({ email, otp });
    if (
      !otpRecord ||
      Date.now() > otpRecord.createdAt.getTime() + 60 * 60 * 1000
    ) {
      return res.status(400).json({ message: "invalid or expired otp" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "user does not exists" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await Otp.deleteMany({ email });
    res.status(200).json({
      message: "password reset successfully",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
