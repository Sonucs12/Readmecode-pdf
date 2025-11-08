const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

// PDF generation configuration
let browserWSEndpoint = null;
let browserInstance = null;
let browserLastUsed = Date.now();
const BROWSER_IDLE_TIMEOUT = 5 * 60 * 1000;
const MAX_PAGES = 10;
const PDF_GENERATION_TIMEOUT = 20000;
const MAX_RETRIES = 1;

// In-memory cache
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 50;
const MEMORY_CACHE_TTL = 10 * 60 * 1000;

const CACHE_DIR = path.join(__dirname, "pdf_cache");
if (!fsSync.existsSync(CACHE_DIR)) {
  try {
    fsSync.mkdirSync(CACHE_DIR, { recursive: true });
    console.log("🔥 pdf_cache folder created successfully");
  } catch (err) {
    console.error("❌ Failed to create pdf_cache folder:", err);
  }
}

function getCacheKey(html) {
  return crypto.createHash("md5").update(html).digest("hex");
}

function getCacheFilePath(hash) {
  return path.join(CACHE_DIR, `${hash}.pdf`);
}

function addToMemoryCache(key, buffer) {
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

  if (Date.now() - cached.timestamp > MEMORY_CACHE_TTL) {
    memoryCache.delete(key);
    return null;
  }

  return cached.buffer;
}

// Cleanup old cached PDFs (runs every 24 hours)
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

setInterval(() => {
  cleanupOldCache().catch(console.error);
}, 60 * 60 * 1000);

// Browser management
async function getBrowser() {
  try {
    if (browserInstance && browserInstance.isConnected()) {
      browserLastUsed = Date.now();
      return browserInstance;
    }

    console.log("🔥 Launching new browser instance...");
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
        "--single-process",
      ],
    });

    browserWSEndpoint = browserInstance.wsEndpoint();
    browserLastUsed = Date.now();

    browserInstance.on("disconnected", () => {
      console.log("❌ Browser disconnected");
      browserInstance = null;
      browserWSEndpoint = null;
    });

    return browserInstance;
  } catch (err) {
    console.error("Failed to get browser:", err);
    throw err;
  }
}

// Close idle browser
setInterval(async () => {
  if (browserInstance && Date.now() - browserLastUsed > BROWSER_IDLE_TIMEOUT) {
    console.log("⏰ Closing idle browser...");
    try {
      await browserInstance.close();
      browserInstance = null;
      browserWSEndpoint = null;
    } catch (err) {
      console.error("Error closing idle browser:", err);
    }
  }
}, 60 * 1000);

// Generate PDF with timeout handling
async function generatePDF(html, retryCount = 0) {
  const browser = await getBrowser();
  let page = null;

  try {
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setJavaScriptEnabled(true);

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: PDF_GENERATION_TIMEOUT,
    });
    await page.waitForFunction(() => window.hljs !== undefined, {
      timeout: PDF_GENERATION_TIMEOUT,
    });
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "40px", left: "20px", right: "20px" },
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
          <div style="font-size: 10px; width: 100%; color: #666; padding-left: 40px; padding-right: 40px; display: flex; justify-content: space-between; align-items: center;">
            <span>ReadmeCodeGen</span>
            <div>Page <span class="pageNumber"></span></div>
          </div>
        `,
    });

    return pdfBuffer;
  } catch (err) {
    // Retry logic for timeout errors
    if (
      (err.name === "TimeoutError" || err.message.includes("timeout")) &&
      retryCount < MAX_RETRIES
    ) {
      console.log(`⚠️ Timeout occurred, retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      // Close the failed page and browser instance
      if (page) {
        try {
          await page.close();
        } catch (closeErr) {
          console.error("Error closing page:", closeErr);
        }
      }
      
      // Force browser restart on retry
      if (browserInstance) {
        try {
          await browserInstance.close();
          browserInstance = null;
          browserWSEndpoint = null;
        } catch (closeErr) {
          console.error("Error closing browser:", closeErr);
        }
      }

      // Retry with incremented count
      return generatePDF(html, retryCount + 1);
    }

    throw err;
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

// Debug route
router.get("/debug-pdf", async (req, res) => {
  try {
    const html =
      "<h1>Hello from Render.this is text paragraph (Debug PDF)</h1>";
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
router.post("/generate-pdf", async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "No HTML provided" });

  const cacheKey = getCacheKey(html);
  const cacheFilePath = getCacheFilePath(cacheKey);

  // Check memory cache
  const memoryCached = getFromMemoryCache(cacheKey);
  if (memoryCached) {
    console.log("💾 Serving PDF from memory cache");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", memoryCached.length);
    res.setHeader("X-Cache", "memory");
    return res.send(memoryCached);
  }

  // Check disk cache
  try {
    if (fsSync.existsSync(cacheFilePath)) {
      console.log("💾 Serving PDF from disk cache");
      const pdfBuffer = await fs.readFile(cacheFilePath);

      addToMemoryCache(cacheKey, pdfBuffer);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader("X-Cache", "disk");
      return res.send(pdfBuffer);
    }
  } catch (err) {
    console.error("❌ Failed to read cached PDF:", err);
  }

  // Generate new PDF with automatic retry
  try {
    console.log("🔥 Generating new PDF...");
    const pdfBuffer = await generatePDF(html);

    // Save to cache asynchronously
    Promise.all([
      fs
        .writeFile(cacheFilePath, pdfBuffer)
        .then(() => {
          console.log(`✅ Saved PDF to disk cache`);
        })
        .catch((err) => {
          console.error("❌ Failed to save PDF to disk cache:", err);
        }),

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

async function initializeBrowser() {
  try {
    await getBrowser();
    console.log("🔥 Browser pre-warmed and ready");
  } catch (err) {
    console.error("❌ Failed to pre-warm browser:", err);
  }
}

async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
      console.log("🔥 Browser closed");
    } catch (err) {
      console.error("Error closing browser:", err);
    }
  }
}

function getPDFHealthStatus() {
  return {
    browserConnected: browserInstance?.isConnected() || false,
    memoryCacheSize: memoryCache.size,
  };
}

module.exports = {
  router,
  initializeBrowser,
  closeBrowser,
  getPDFHealthStatus,
};
