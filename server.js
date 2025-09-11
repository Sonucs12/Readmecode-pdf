const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const compression = require("compression");
const visitorRoutes = require("./visitorRoutes");
const pdfRoutes = require("./pdfRoutes");

if (process.env.NODE_ENV !== "production") {
  console.log("🔥 Loading environment variables from .env.local");
  require("dotenv").config({ path: ".env.local" });
  console.log("🔥 Environment variables loaded");
  console.log(
    "Firebase Project ID:",
    process.env.FIREBASE_PROJECT_ID ? "🔥 Set" : "❌ Missing"
  );
}

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://readmecodegen.vercel.app",
  "https://www.readmecodegen.com",
  "http://localhost:9002",
  "http://127.0.0.1:9002",
];

app.use(bodyParser.json({ limit: "10mb" }));
// Only allow all origins for visitor/badge routes
app.use("/api", cors({ origin: "*" }), visitorRoutes);
app.use(compression());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Use PDF routes
app.use(pdfRoutes.router);

// Health check
app.get("/health", (req, res) => {
  const pdfHealth = pdfRoutes.getPDFHealthStatus();
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    ...pdfHealth,
  });
});

async function gracefulShutdown() {
  console.log("😴Shutting down gracefully...");
  await pdfRoutes.closeBrowser();
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Health check
app.get("/", (req, res) => res.send("ReadmeCodeGen API is running"));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Pre-warm browser
  pdfRoutes.initializeBrowser();
});

// Add error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
