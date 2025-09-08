const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed origins for CORS
const allowedOrigins = [
  "https://readmecodegen.vercel.app",
  "http://localhost:9002",
  "http://127.0.0.1:9002",
];

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

app.use(bodyParser.json({ limit: "10mb" }));

// Ensure cache folder exists
const CACHE_DIR = path.join(__dirname, "pdf_cache");
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR);
    console.log("✅ pdf_cache folder created successfully");
  } catch (err) {
    console.error("❌ Failed to create pdf_cache folder:", err);
  }
}

// Utility functions
function getCacheFilePath(html) {
  const hash = crypto.createHash("md5").update(html).digest("hex");
  return path.join(CACHE_DIR, `${hash}.pdf`);
}

// Cleanup old cached PDFs (older than 1 day)
function cleanupOldCache() {
  if (!fs.existsSync(CACHE_DIR)) return;
  const files = fs.readdirSync(CACHE_DIR);
  const now = Date.now();
  files.forEach((file) => {
    const filePath = path.join(CACHE_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 1000 * 60 * 60 * 24) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old cache: ${file}`);
      }
    } catch (err) {
      console.error("Error cleaning cache file:", file, err);
    }
  });
}

// Launch Puppeteer browser
async function launchBrowser() {
  return puppeteer.launch({
    executablePath: puppeteer.executablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-gpu",
    ],
  });
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Debug route
app.get("/debug-pdf", async (req, res) => {
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent("<h1>Hello from Render (Debug PDF)</h1>", {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Debug PDF generation error:", err);
    res
      .status(500)
      .json({ error: err.message || "Error generating debug PDF" });
  }
});

// Generate PDF with caching
app.post("/generate-pdf", async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "No HTML provided" });

  cleanupOldCache(); // Clean old cached PDFs

  const cacheFilePath = getCacheFilePath(html);
  if (fs.existsSync(cacheFilePath)) {
    console.log("📁 Serving PDF from cache");
    try {
      const pdfBuffer = fs.readFileSync(cacheFilePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error("❌ Failed to read cached PDF:", err);
    }
  }

  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();

    // Save PDF to cache
    try {
      fs.writeFileSync(cacheFilePath, pdfBuffer);
      console.log(`💾 Saved PDF to cache: ${cacheFilePath}`);
    } catch (err) {
      console.error("❌ Failed to save PDF to cache:", err);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: err.message || "Error generating PDF" });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
