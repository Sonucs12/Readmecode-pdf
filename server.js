const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const compression = require("compression");
const visitorRoutes = require("./visitorRoutes");
const pdfRoutes = require("./pdfRoutes");

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Configuration
const allowedOrigins = [
  "https://readmecodegen.vercel.app",
  "https://www.readmecodegen.com",
  "https://pdfwrite.vercel.app",
  "http://localhost:9002",
  "https://notesnav.vercel.app"
  
];

// Middleware
app.use(bodyParser.json({ limit: "10mb" }));
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

// Routes
app.use("/api", visitorRoutes);
app.use("/", visitorRoutes);
app.use(pdfRoutes.router);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    status: "OK",
    message: "ReadmeCodeGen API is running",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const pdfHealth = pdfRoutes.getPDFHealthStatus();
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    ...pdfHealth,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  
  // Pre-warm browser after server starts
  setTimeout(() => {
    pdfRoutes.initializeBrowser();
  }, 2000);
});

// Handle server errors
server.on('error', (error) => {
  console.error("Server error:", error);
  process.exit(1);
});

// Graceful shutdown
async function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  server.close();
  await pdfRoutes.closeBrowser();
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Global error handlers
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});
