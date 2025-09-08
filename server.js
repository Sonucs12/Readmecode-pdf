const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

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
// Debug 
app.get("/debug-pdf", async (req, res) => {
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent("<h1>Hello from Render on host 2 (Debug PDF)</h1>", {
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
app.post("/generate-pdf", async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: "No HTML provided" });
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
