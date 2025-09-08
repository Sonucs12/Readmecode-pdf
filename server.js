const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");
const compression = require("compression");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Browser pool management
let browserWSEndpoint = null;
let browserInstance = null;
let browserLastUsed = Date.now();
const BROWSER_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_PAGES = 10; // Concurrent pages limit

// In-memory cache for frequently accessed PDFs
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 50; // Maximum items in memory
const MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Allowed origins for CORS
const allowedOrigins = [
  "https://readmecodegen.vercel.app",
  "http://localhost:9002",
  "http://127.0.0.1:9002",
];

// Middleware
app.use(compression()); // Enable gzip compression
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
if (!fsSync.existsSync(CACHE_DIR)) {
  try {
    fsSync.mkdirSync(CACHE_DIR, { recursive: true });
    console.log("✅ pdf_cache folder created successfully");
  } catch (err) {
    console.error("❌ Failed to create pdf_cache folder:", err);
  }
}

// Utility functions
function getCacheKey(html) {
  return crypto.createHash("md5").update(html).digest("hex");
}

function getCacheFilePath(hash) {
  return path.join(CACHE_DIR, `${hash}.pdf`);
}

// Memory cache management
function addToMemoryCache(key, buffer) {
  // Clean old entries if cache is full
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }

  memoryCache.set(key, {
    buffer,
    timestamp: Date.now(),
  });
}

function getFromMemoryCache(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.timestamp > MEMORY_CACHE_TTL) {
    memoryCache.delete(key);
    return null;
  }

  return cached.buffer;
}

// Cleanup old cached PDFs (runs asynchronously)
async function cleanupOldCache() {
  if (!fsSync.existsSync(CACHE_DIR)) return;

  try {
    const files = await fs.readdir(CACHE_DIR);
    const now = Date.now();
    const cleanupPromises = files.map(async (file) => {
      const filePath = path.join(CACHE_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > 1000 * 60 * 60 * 24) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old cache: ${file}`);
        }
      } catch (err) {
        console.error("Error cleaning cache file:", file, err);
      }
    });

    await Promise.all(cleanupPromises);
  } catch (err) {
    console.error("Error during cache cleanup:", err);
  }
}

// Schedule periodic cleanup
setInterval(() => {
  cleanupOldCache().catch(console.error);
}, 60 * 60 * 1000); // Run every hour

// Browser management
async function getBrowser() {
  try {
    // Check if browser is still connected
    if (browserInstance && browserInstance.isConnected()) {
      browserLastUsed = Date.now();
      return browserInstance;
    }

    // Launch new browser instance
    console.log("🚀 Launching new browser instance...");
    browserInstance = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--no-first-run",
        "--no-zygote",
        "--single-process", // Helps in containerized environments
      ],
    });

    browserWSEndpoint = browserInstance.wsEndpoint();
    browserLastUsed = Date.now();

    // Set up browser disconnect handler
    browserInstance.on("disconnected", () => {
      console.log("⚠️ Browser disconnected");
      browserInstance = null;
      browserWSEndpoint = null;
    });

    return browserInstance;
  } catch (err) {
    console.error("Failed to get browser:", err);
    throw err;
  }
}

// Close idle browser to save resources
setInterval(async () => {
  if (browserInstance && Date.now() - browserLastUsed > BROWSER_IDLE_TIMEOUT) {
    console.log("🔄 Closing idle browser...");
    try {
      await browserInstance.close();
      browserInstance = null;
      browserWSEndpoint = null;
    } catch (err) {
      console.error("Error closing idle browser:", err);
    }
  }
}, 60 * 1000); // Check every minute

// Generate PDF
async function generatePDF(html) {
  const browser = await getBrowser();
  let page = null;

  try {
    page = await browser.newPage();

    // Optimize page settings
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setJavaScriptEnabled(false); // Disable JS if not needed

    // Set content with minimal wait
    await page.setContent(html, {
      waitUntil: "domcontentloaded", // Faster than networkidle0
      timeout: 10000,
    });

    // Generate PDF with optimized settings
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
      preferCSSPageSize: false,
    });

    return pdfBuffer;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (err) {
        console.error("Error closing page:", err);
      }
    }
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    browserConnected: browserInstance?.isConnected() || false,
    memoryCacheSize: memoryCache.size,
  });
});

// Debug route
app.get("/debug-pdf", async (req, res) => {
  try {
    const html = "<h1>Hello from Render.this is text paragraph (Debug PDF)</h1>";
    const pdfBuffer = await generatePDF(html);

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

// Generate PDF with multi-level caching
app.post("/generate-pdf", async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "No HTML provided" });

  const cacheKey = getCacheKey(html);
  const cacheFilePath = getCacheFilePath(cacheKey);

  // Check memory cache first (fastest)
  const memoryCached = getFromMemoryCache(cacheKey);
  if (memoryCached) {
    console.log("⚡ Serving PDF from memory cache");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", memoryCached.length);
    res.setHeader("X-Cache", "memory");
    return res.send(memoryCached);
  }

  // Check disk cache (second fastest)
  try {
    if (fsSync.existsSync(cacheFilePath)) {
      console.log("📁 Serving PDF from disk cache");
      const pdfBuffer = await fs.readFile(cacheFilePath);

      // Add to memory cache for next request
      addToMemoryCache(cacheKey, pdfBuffer);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader("X-Cache", "disk");
      return res.send(pdfBuffer);
    }
  } catch (err) {
    console.error("❌ Failed to read cached PDF:", err);
  }

  // Generate new PDF
  try {
    console.log("🔨 Generating new PDF...");
    const pdfBuffer = await generatePDF(html);

    // Save to both caches asynchronously (don't wait)
    Promise.all([
      // Save to disk cache
      fs
        .writeFile(cacheFilePath, pdfBuffer)
        .then(() => {
          console.log(`💾 Saved PDF to disk cache`);
        })
        .catch((err) => {
          console.error("❌ Failed to save PDF to disk cache:", err);
        }),

      // Add to memory cache
      Promise.resolve(addToMemoryCache(cacheKey, pdfBuffer)),
    ]).catch(console.error);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("X-Cache", "miss");
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: err.message || "Error generating PDF" });
  }
});

// Graceful shutdown
async function gracefulShutdown() {
  console.log("📍 Shutting down gracefully...");

  if (browserInstance) {
    try {
      await browserInstance.close();
      console.log("✅ Browser closed");
    } catch (err) {
      console.error("Error closing browser:", err);
    }
  }

  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Pre-warm browser on startup
  getBrowser()
    .then(() => {
      console.log("✅ Browser pre-warmed and ready");
    })
    .catch((err) => {
      console.error("⚠️ Failed to pre-warm browser:", err);
    });
});
