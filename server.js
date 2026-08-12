import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Template from "./models/Template.js";
import templateRoutes from "./routes/templateRoutes.js";
import clientTemplateRoutes from "./routes/clienttemplateRoutes.js";
import authRouter from "./routes/authRoutes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import hitchedDefaultData from "./templateData/hitchedDefaultData.js";
import saanjhDefaultData from "./templateData/saanjhDefaultData.js";
import milanDefaultData from "./templateData/milanDefaultData.js";
import biyeDefaultData from "./templateData/biyeDefaultData.js";
import auraDefaultData from "./templateData/auraDefaultData.js";
import laavanDefaultData from "./templateData/laavanDefaultData.js";
import starlightDefaultData from "./templateData/starlightDefaultData.js";
import mayraDefaultData from "./templateData/mayraDefaultData.js";
const app = express();
import uploadRoutes from "./routes/uploadRoutes.js";
import kalyanamDefaultData from "./templateData/kalyanamDefaultData.js";
import niqahDefaultData from "./templateData/niqahDefaultData.js";
import vowsDefaultData from "./templateData/vowsDefaultData.js";
import beyondDefaultData from "./templateData/beyondDefaultData.js";
import sohalaDefaultData from "./templateData/sohalaDefaultData.js";

dotenv.config();

const seedTemplates = async () => {
  try {
    const templates = [
      {
        title: "Hitched",
        slug: "hitched",
        indprice: 2999,
        usaprice: 39,
        category: "Hindu Weddings",
        previewImage: "/assets/preview-images/hitched.webp",
        componentKey: "hitched",
        defaultData: hitchedDefaultData,
      },
      {
        title: "Saanjh",
        slug: "saanjh",
        indprice: 1549,
        usaprice: 16,
        category: "Hindu Weddings",
        previewImage: "/assets/preview-images/saanjh.webp",
        componentKey: "saanjh",
        defaultData: saanjhDefaultData,
      },

       {
        title: "Milan",
        slug: "milan",
        indprice: 1249,
        usaprice: 14,
        category: "Hindu Weddings",
        previewImage: "/assets/preview-images/milan.webp",
        componentKey: "milan",
        defaultData: milanDefaultData,
      },

      {
        title: "Biye",
        slug: "biye",
        indprice: 2199,
        usaprice: 31,
        category: "Hindu Weddings",
        previewImage: "/assets/preview-images/biye.webp",
        componentKey: "biye",
        defaultData: biyeDefaultData,
      },
      {
        title: "Aura",
        slug: "aura",
        indprice: 2999,
        usaprice: 39,
        category: "Hindu Weddings",
        previewImage: "/assets/preview-images/aura.png",
        componentKey: "aura",
        defaultData: auraDefaultData,
      },
      {
        title: "Sohala",
        slug: "sohala",
        indprice: 3599,
        usaprice: 41,
        category: "Hindu Weddings",
        previewImage: "/assets/preview-images/sohala.webp",
        componentKey: "sohala",
        defaultData: sohalaDefaultData,
      },
      {
        title: "Laavan",
        slug: "laavan",
        indprice: 3999,
        usaprice: 69,
        category: "Sikh Weddings",
        previewImage: "/assets/preview-images/laavan.webp",
        componentKey: "laavan",
        defaultData: laavanDefaultData,
      },
      {
        title: "Starlight",
        slug: "starlight",
        indprice: 3999,
        usaprice: 69,
        category: "Sikh Weddings",
        previewImage: "/assets/preview-images/starlight.webp",
        componentKey: "starlight",
        defaultData: starlightDefaultData,
      },
      {
        title: "Mayra",
        slug: "mayra",
        indprice: 4999,
        usaprice: 59,
        category: "Hindu Weddings",
        previewImage: "/assets/preview-images/mayra.webp",
        componentKey: "mayra",
        defaultData: mayraDefaultData,
      },
      {
        title: "Kalyanam",
        slug: "kalyanam",
        indprice: 5999,
        usaprice: 49,
        category: "South-Indian Weddings",
        previewImage: "/assets/preview-images/kalyanam.webp",
        componentKey: "kalyanam",
        defaultData: kalyanamDefaultData,
      },
      {
        title: "Niqah",
        slug: "niqah",
        indprice: 3499,
        usaprice: 46,
        category: "Muslim Weddings",
        previewImage: "/assets/preview-images/niqah.webp",
        componentKey: "niqah",
        defaultData: niqahDefaultData,
      },
      {
        title: "Vows",
        slug: "vows",
        indprice: 3299,
        usaprice: 53,
        category: "Christian Weddings",
        previewImage: "/assets/preview-images/vows.webp",
        componentKey: "vows",
        defaultData: vowsDefaultData,
      },

      {
        title: "Beyond",
        slug: "beyond",
        indprice: 3339,
        usaprice: 59,
        category: "Christian Weddings",
        previewImage: "/assets/preview-images/beyond.webp",
        componentKey: "beyond",
        defaultData: beyondDefaultData,
      },
    ];

    for (const template of templates) {
      const existing = await Template.findOne({ slug: template.slug });

      if (!existing) {
        await Template.create(template);
        console.log(`✅ ${template.title} template seeded`);
      }
    }
  } catch (error) {
    console.error("Seed templates error:", error);
  }
};

const startServer = async () => {
  await connectDB();
  await seedTemplates();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/template", templateRoutes);
  app.use("/api/client-templates", clientTemplateRoutes);
  app.use("/api/auth", authRouter);
  app.use("/api/upload", uploadRoutes);

  app.get("/", (req, res) => {
    res.send("api running");
  });

  app.listen(process.env.PORT, () => {
    console.log(`Server running on port http://localhost:${process.env.PORT}`);
  });
};

startServer();
