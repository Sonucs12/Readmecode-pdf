// visitorRoutes.js
const express = require("express");
const router = express.Router();
const {
  incrementVisitorCount,
  getUserData,
  setUserBadge,
} = require("./firebaseUtils");
const {
  renderBadge,
  getAvailableStyles,
  getAvailableGradients,
} = require("./svgTemplates");
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Cache for backlink verification results to avoid repeated fetches
const backlinkCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// In-memory stores
const visitorCounts = {}; // { userId: count }
const initStore = {}; // { userId: { userId, style, timestamp, receivedAt, bg?, textColor? } }
const INIT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Periodic cleanup of expired init entries
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  for (const [id, payload] of Object.entries(initStore)) {
    const receivedAt = payload?.receivedAt
      ? Date.parse(payload.receivedAt)
      : NaN;
    if (!Number.isFinite(receivedAt) || now - receivedAt > INIT_TTL_MS) {
      delete initStore[id];
      removed += 1;
    }
  }
  if (removed > 0) {
    console.log(`🧹 Cleaned ${removed} expired init entries`);
  }
}, 10 * 60 * 1000);

// Initialize user with style and color preferences
router.post("/init", (req, res) => {
  try {
    const { userId, style, timestamp, bg, textColor } = req.body || {};

    if (!userId || !style || !timestamp) {
      return res.status(400).json({
        error: "Missing required fields: userId, style, or timestamp",
      });
    }

    // Store the init payload with all provided parameters
    const initPayload = {
      userId,
      style,
      timestamp,
      receivedAt: new Date().toISOString(),
    };

    // Add optional color parameters if provided
    if (bg !== undefined) initPayload.bg = bg;
    if (textColor !== undefined) initPayload.textColor = textColor;

    initStore[userId] = initPayload;

    console.log("🆕 /init payload:", initPayload);

    return res.json({ success: true, stored: initPayload });
  } catch (err) {
    console.error("❌ Init store error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
});
async function verifyBacklink(url) {
  try {
    // Check cache first
    const cacheKey = url;
    const cached = backlinkCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(
        `🔍 Using cached backlink result for ${url}: ${cached.result}`
      );
      return cached.result;
    }

    console.log(`🔍 Verifying backlink on ${url}...`);

    // Fetch the page content
    const response = await fetch(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "ReadMeCodeGen-Bot/1.0",
      },
    });

    if (!response.ok) {
      console.log(`❌ Failed to fetch page: ${response.status}`);
      return false;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for links to your service
    const requiredDomains = [
      "https://www.readmecodegen.com",
      "https://readmecodegen.com",
      "http://www.readmecodegen.com",
      "http://readmecodegen.com",
    ];

    let validBacklinkFound = false;

    $("a").each((i, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();
      const rel = $(element).attr("rel");

      if (href && requiredDomains.some((domain) => href.startsWith(domain))) {
        // Check if link is valid (not nofollow, has text, etc.)
        if (rel !== "nofollow" && text.length > 0) {
          console.log(`✅ Valid backlink found: "${text}" -> ${href}`);
          validBacklinkFound = true;
          return false; // Break the loop
        }
      }
    });

    // Cache the result
    backlinkCache.set(cacheKey, {
      result: validBacklinkFound,
      timestamp: Date.now(),
    });

    console.log(
      `🔍 Backlink verification result for ${url}: ${validBacklinkFound}`
    );
    return validBacklinkFound;
  } catch (error) {
    console.error("❌ Backlink verification error:", error);
    return false; // Fail closed - deny if we can't verify
  }
}
// Increment visitor count
router.post("/increment", async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(`🔄 Increment request for ${userId}`);

    if (!userId) {
      console.log("❌ Missing userId in request");
      return res.status(400).json({ error: "Missing userId" });
    }

    // Get the referrer URL (where the request came from)
    const referrerUrl = req.get('Referer') || req.get('Referrer');
    
    if (!referrerUrl) {
      console.log("❌ No referrer URL found");
      return res.status(403).json({ error: 'Invalid request source' });
    }

    console.log(`🔍 Request from: ${referrerUrl}`);

    // Check if domain is whitelisted (for testing/trusted domains)
    const allowedDomains = ['localhost', '127.0.0.1', 'readmecodegen.com']; // Add your testing domains
    const referrerDomain = new URL(referrerUrl).hostname;
    
    let skipBacklinkCheck = false;
    if (allowedDomains.some(domain => referrerDomain.includes(domain))) {
      console.log(`✅ Whitelisted domain detected: ${referrerDomain}`);
      skipBacklinkCheck = true;
    }

    // For non-whitelisted domains, verify backlink exists
    if (!skipBacklinkCheck) {
      console.log(`🔍 Checking backlink for non-whitelisted domain: ${referrerDomain}`);
      const hasValidBacklink = await verifyBacklink(referrerUrl);
      
      if (!hasValidBacklink) {
        console.log(`❌ No valid backlink found on ${referrerUrl}`);
        return res.status(403).json({ 
          error: 'Valid backlink to ReadMeCodeGen.com required to use this service',
          referrer: referrerUrl 
        });
      }
      
      console.log(`✅ Valid backlink confirmed on ${referrerUrl}`);
    }

    // Firebase integration logic (PRESERVED EXACTLY)
    console.log("🔍 Checking Firestore...");
    let firebaseWorking = false;
    let firebaseCount = 0;
    let userExists = false;

    try {
      const userData = await getUserData(userId);
      firebaseWorking = true;
      userExists = !!userData;
      firebaseCount = userData?.visitorCount || 0;
    } catch (firebaseError) {
      console.error(
        "❌ Firebase connection failed, using in-memory fallback:",
        firebaseError.message
      );
      firebaseWorking = false;
    }

    if (firebaseWorking) {
      console.log("📈 Attempting to increment visitor count in Firebase...");
      try {
        const { upsertInitData } = require("./firebaseUtils");

        if (userExists) {
          await incrementVisitorCount(userId);
          console.log(
            "✅ Firebase increment successful (existing verified user)"
          );
          firebaseCount += 1;
        } else {
          const initPayload = initStore[userId];
          if (!initPayload) {
            console.warn(
              "⚠️ No init payload found in memory for non-existent user; rejecting increment:",
              userId
            );
            return res.status(400).json({
              error: "User not initialized via /init",
            });
          }

          // Persist init data with verified flag
          await upsertInitData(userId, initPayload, { verified: true });
          delete initStore[userId];

          await incrementVisitorCount(userId);
          console.log("✅ Firebase increment successful (new verified user)");
          firebaseCount += 1;
        }
      } catch (incrementError) {
        console.error(
          "❌ Firebase increment failed, falling back to in-memory:",
          incrementError.message
        );
        firebaseWorking = false;
      }
    }

    // Update in-memory count (PRESERVED EXACTLY)
    if (firebaseWorking) {
      visitorCounts[userId] = firebaseCount;
    } else {
      visitorCounts[userId] = (visitorCounts[userId] || 0) + 1;
    }

    console.log(
      `✅ Increment successful. New count for ${userId}: ${
        visitorCounts[userId]
      } (${firebaseWorking ? "Firebase" : "In-Memory"})`
    );

    return res.json({
      success: true,
      count: visitorCounts[userId],
      storage: firebaseWorking ? "firebase" : "memory",
    });
  } catch (err) {
    console.error("❌ Increment error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
});

// Optional: Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of backlinkCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      backlinkCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Clean up every 10 minutes

// Debug endpoint
router.get("/debug/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 Debug request for userId: ${userId}`);

    const firestoreData = await getUserData(userId);
    const memoryCount = visitorCounts[userId];
    const initData = initStore[userId];

    res.json({
      userId,
      firestoreData,
      memoryCount,
      initData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({
      error: "Debug error",
      details: err.message,
    });
  }
});

// Get available badge styles
router.get("/badge/styles", (req, res) => {
  try {
    res.json({ styles: getAvailableStyles() });
  } catch (err) {
    console.error("Styles list error:", err);
    res.status(500).json({ error: "Error listing styles" });
  }
});

// Get available gradients
router.get("/badge/gradients", (req, res) => {
  try {
    res.json({ gradients: getAvailableGradients() });
  } catch (err) {
    console.error("Gradients list error:", err);
    res.status(500).json({ error: "Error listing gradients" });
  }
});

// Set user's preferred badge style
router.post("/badge/style", async (req, res) => {
  try {
    const { userId, style } = req.body;
    if (!userId || !style) {
      return res.status(400).json({
        error: "Missing userId or style",
      });
    }

    await setUserBadge(userId, style);
    res.json({ success: true });
  } catch (err) {
    console.error("Set style error:", err);
    res.status(500).json({
      error: "Error saving style",
      details: err.message,
    });
  }
});

// Serve dynamic SVG badge
router.get("/badge/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { style, bg, textColor } = req.query;

    // Get visitor count (memory first, then Firestore fallback)
    let count = visitorCounts[userId];
    if (typeof count !== "number") {
      try {
        const data = await getUserData(userId);
        count = data?.visitorCount || 0;
        visitorCounts[userId] = count;
      } catch (error) {
        count = 0;
        console.warn(
          `Failed to fetch count for ${userId}, using 0:`,
          error.message
        );
      }
    }

    // Resolve style priority: query param > Firestore > initStore > default
    let effectiveStyle = style;
    if (!effectiveStyle) {
      try {
        const data = await getUserData(userId);
        effectiveStyle = data?.badge;
      } catch (error) {
        // Ignore Firestore errors for style resolution
      }

      if (!effectiveStyle && initStore[userId]?.style) {
        effectiveStyle = initStore[userId].style;
      }

      effectiveStyle = effectiveStyle || "style1";
    }

    // Resolve background color priority: query param > initStore > null (use template default)
    const effectiveBg = bg || initStore[userId]?.bg;

    // Resolve text color priority: query param > initStore > null (use template default)
    const effectiveTextColor = textColor || initStore[userId]?.textColor;

    console.log(
      `🎨 Badge request for ${userId}: style=${effectiveStyle}, bg=${effectiveBg}, textColor=${effectiveTextColor}, count=${count}`
    );

    const svg = renderBadge({
      style: effectiveStyle,
      count,
      bg: effectiveBg,
      textColor: effectiveTextColor,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(svg);
  } catch (err) {
    console.error("Badge generation error:", err);
    res.status(500).send("Error generating badge");
  }
});

module.exports = router;
