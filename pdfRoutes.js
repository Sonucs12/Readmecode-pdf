const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

// ==================== Cache Manager Class ====================
class CacheManager {
  constructor(cacheDir, maxMemoryCacheSize = 50, memoryCacheTTL = 10 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = maxMemoryCacheSize;
    this.memoryCacheTTL = memoryCacheTTL;
    this.initializeCacheDirectory();
    this.scheduleCleanup();
  }

  initializeCacheDirectory() {
    if (!fsSync.existsSync(this.cacheDir)) {
      fsSync.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  getCacheKey(content) {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  getCacheFilePath(hash) {
    return path.join(this.cacheDir, `${hash}.pdf`);
  }

  addToMemoryCache(key, buffer) {
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, { buffer, timestamp: Date.now() });
  }

  getFromMemoryCache(key) {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.memoryCacheTTL) {
      this.memoryCache.delete(key);
      return null;
    }
    return cached.buffer;
  }

  async getFromDiskCache(cacheFilePath) {
    try {
      if (fsSync.existsSync(cacheFilePath)) {
        return await fs.readFile(cacheFilePath);
      }
    } catch (err) {
      console.error("Failed to read cached PDF:", err);
    }
    return null;
  }

  async saveToDiskCache(cacheFilePath, buffer) {
    try {
      await fs.writeFile(cacheFilePath, buffer);
    } catch (err) {
      console.error("Failed to save PDF to disk cache:", err);
    }
  }

  async cleanupOldCache() {
    if (!fsSync.existsSync(this.cacheDir)) return;
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      await Promise.all(files.map(async (file) => {
        const filePath = path.join(this.cacheDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > 1000 * 60 * 60 * 24) {
            await fs.unlink(filePath);
          }
        } catch (err) {
          // Ignore individual file errors
        }
      }));
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  scheduleCleanup() {
    setInterval(() => {
      this.cleanupOldCache().catch(() => {});
    }, 60 * 60 * 1000);
  }

  getMemoryCacheSize() {
    return this.memoryCache.size;
  }
}

// ==================== Browser Manager Class ====================
class BrowserManager {
  constructor(idleTimeout = 5 * 60 * 1000) {
    this.browserInstance = null;
    this.browserWSEndpoint = null;
    this.browserLastUsed = Date.now();
    this.idleTimeout = idleTimeout;
    this.startIdleCheckInterval();
  }

  async getBrowser() {
    if (this.browserInstance && this.browserInstance.isConnected()) {
      this.browserLastUsed = Date.now();
      return this.browserInstance;
    }

    this.browserInstance = await puppeteer.launch({
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

    this.browserWSEndpoint = this.browserInstance.wsEndpoint();
    this.browserLastUsed = Date.now();

    this.browserInstance.on("disconnected", () => {
      this.browserInstance = null;
      this.browserWSEndpoint = null;
    });

    return this.browserInstance;
  }

  startIdleCheckInterval() {
    setInterval(async () => {
      if (this.browserInstance && Date.now() - this.browserLastUsed > this.idleTimeout) {
        try {
          await this.browserInstance.close();
          this.browserInstance = null;
          this.browserWSEndpoint = null;
        } catch (err) {
          // Ignore close errors
        }
      }
    }, 60 * 1000);
  }

  async closeBrowser() {
    if (this.browserInstance) {
      try {
        await this.browserInstance.close();
      } catch (err) {
        // Ignore close errors
      }
    }
  }

  isConnected() {
    return this.browserInstance?.isConnected() || false;
  }

  async initializeBrowser() {
    try {
      await this.getBrowser();
    } catch (err) {
      console.error("Failed to pre-warm browser:", err);
    }
  }
}

// ==================== PDF Generator Class ====================
class PDFGenerator {
  constructor(browserManager, defaultBrandName = "ReadmeCodeGen") {
    this.browserManager = browserManager;
    this.defaultBrandName = defaultBrandName;
  }

  async generatePDF(html, brandName = null) {
    const browser = await this.browserManager.getBrowser();
    let page = null;

    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setJavaScriptEnabled(true);

      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 20000,
      });
      await page.waitForFunction(() => window.hljs !== undefined);
      await page.evaluateHandle("document.fonts.ready");

      const footerBrandName = brandName || this.defaultBrandName;

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "40px", bottom: "40px", left: "20px", right: "20px" },
        preferCSSPageSize: false,
        displayHeaderFooter: true,
    headerTemplate: `
  <style>
    .page-border {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 2px solid #000;
    }
  </style>
  <div class="page-border"></div>
`,

        footerTemplate: `
          <div style="font-size: 10px; width: 100%; color: #666; padding-left: 40px; padding-right: 40px; display: flex; justify-content: space-between; align-items: center;">
            <span>${footerBrandName}</span>
            <div>Page <span class="pageNumber"></span></div>
          </div>
        `,
      });

      return pdfBuffer;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (err) {
          // Ignore close errors
        }
      }
    }
  }
}

// ==================== PDF Service Class ====================
class PDFService {
  constructor() {
    const CACHE_DIR = path.join(__dirname, "pdf_cache");
    this.cacheManager = new CacheManager(CACHE_DIR);
    this.browserManager = new BrowserManager();
    this.pdfGenerator = new PDFGenerator(this.browserManager);
  }

  async generateAndCachePDF(html, brandName = null) {
    const cacheContent = brandName ? `${html}||${brandName}` : html;
    const cacheKey = this.cacheManager.getCacheKey(cacheContent);
    const cacheFilePath = this.cacheManager.getCacheFilePath(cacheKey);

    // Check memory cache
    const memoryCached = this.cacheManager.getFromMemoryCache(cacheKey);
    if (memoryCached) {
      console.log("✓ Serving from memory cache");
      return { buffer: memoryCached, cacheType: "memory" };
    }

    // Check disk cache
    const diskCached = await this.cacheManager.getFromDiskCache(cacheFilePath);
    if (diskCached) {
      console.log("✓ Serving from disk cache");
      this.cacheManager.addToMemoryCache(cacheKey, diskCached);
      return { buffer: diskCached, cacheType: "disk" };
    }

    // Generate new PDF
    console.log("→ Generating new PDF");
    const pdfBuffer = await this.pdfGenerator.generatePDF(html, brandName);
    
    // Save to caches asynchronously
    Promise.all([
      this.cacheManager.saveToDiskCache(cacheFilePath, pdfBuffer),
      Promise.resolve(this.cacheManager.addToMemoryCache(cacheKey, pdfBuffer)),
    ]).then(() => {
      console.log("✓ PDF cached");
    }).catch(() => {});

    return { buffer: pdfBuffer, cacheType: "miss" };
  }

  async initializeBrowser() {
    await this.browserManager.initializeBrowser();
  }

  async closeBrowser() {
    await this.browserManager.closeBrowser();
  }

  getHealthStatus() {
    return {
      browserConnected: this.browserManager.isConnected(),
      memoryCacheSize: this.cacheManager.getMemoryCacheSize(),
    };
  }
}

// ==================== Initialize Service ====================
const pdfService = new PDFService();

// ==================== Routes ====================

router.get("/debug-pdf", async (req, res) => {
  try {
    const html = "<h1>Hello from Render (Debug PDF)</h1>";
    const result = await pdfService.generateAndCachePDF(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", result.buffer.length);
    res.send(result.buffer);
  } catch (err) {
    console.error("Debug PDF error:", err);
    res.status(500).json({ error: err.message || "Error generating debug PDF" });
  }
});

router.post("/generate-pdf", async (req, res) => {
  const { html, brandName } = req.body;
  
  if (!html) {
    return res.status(400).json({ error: "No HTML provided" });
  }

  try {
    const result = await pdfService.generateAndCachePDF(html, brandName);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", result.buffer.length);
    res.setHeader("X-Cache", result.cacheType);
    res.send(result.buffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: err.message || "Error generating PDF" });
  }
});

// ==================== Exports ====================
module.exports = {
  router,
  initializeBrowser: () => pdfService.initializeBrowser(),
  closeBrowser: () => pdfService.closeBrowser(),
  getPDFHealthStatus: () => pdfService.getHealthStatus(),
};
