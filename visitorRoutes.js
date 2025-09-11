// visitorRoutes.js
const express = require("express");
const router = express.Router();
const {
  incrementVisitorCount,
  getUserData,
  setUserBadge,
} = require("./firebaseUtils");
const { renderBadge, getAvailableStyles } = require("./svgTemplates");

// Use a simple in-memory store for demonstration (replace with DB in production)
const visitorCounts = {}; // { userId: count }
// Temporary init store: holds frontend-provided init data until first validated increment
const initStore = {}; // { userId: { userId, style, timestamp, receivedAt } }
const INIT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Periodic cleanup of unverified init entries older than 24 hours
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  for (const [id, payload] of Object.entries(initStore)) {
    const receivedAt =
      payload && payload.receivedAt ? Date.parse(payload.receivedAt) : NaN;
    if (!Number.isFinite(receivedAt) || now - receivedAt > INIT_TTL_MS) {
      delete initStore[id];
      removed += 1;
    }
  }
  if (removed > 0) {
    console.log(`🧹 Cleaned ${removed} expired init entries`);
  }
}, 10 * 60 * 1000); // run every 10 minutes

// Receive init payload from frontend and keep it temporarily in memory
router.post("/init", (req, res) => {
  try {
    const { userId, style, timestamp, bg, textColor, bgGradient } =
      req.body || {};
    if (!userId || !style || !timestamp) {
      return res
        .status(400)
        .json({ error: "Missing userId, style, or timestamp" });
    }

    // Optional colors with defaults; you can keep nulls if you prefer
    const safeBg = bg ?? "#4c51bf";
    const safeTextColor = textColor ?? "#ffffff";
    const safeBgGradient = bgGradient ?? "#4c51bf";
    initStore[userId] = {
      userId,
      style,
      timestamp,
      receivedAt: new Date().toISOString(),
      bg: safeBg,
      textColor: safeTextColor,
      bgGradient: safeBgGradient,
    };

    console.log("🆕 /init payload:", {
      userId,
      style,
      timestamp,
      bg: safeBg,
      textColor: safeTextColor,
      bgGradient: safeBgGradient,
      receivedAt: initStore[userId].receivedAt,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Init store error:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
});

// Endpoint to increment the count
router.post("/increment", async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(`🔄 Increment request for ${userId}`);

    if (!userId) {
      console.log("❌ Missing userId in request");
      return res.status(400).json({ error: "Missing userId" });
    }

    // Try Firebase first, fallback to in-memory if it fails
    console.log("🔍 Checking Firestore...");
    let firebaseWorking = false;
    let firebaseCount = 0;
    let userExists = false;

    try {
      const userData = await getUserData(userId);
      // Keep logs terse; detailed fields logged inside getUserData
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

    // If Firebase is available
    if (firebaseWorking) {
      console.log("📈 Attempting to increment visitor count in Firebase...");
      try {
        const { upsertInitData } = require("./firebaseUtils");

        // Case A: user exists in Firestore → just increment
        if (userExists) {
          await incrementVisitorCount(userId);
          console.log(
            "✅ Firebase increment successful (existing verified user)"
          );
          firebaseCount += 1;
        } else {
          // Case B: user not in Firestore → require matching init payload in memory
          const initPayload = initStore[userId];
          if (!initPayload) {
            console.warn(
              "⚠️ No init payload found in memory for non-existent user; rejecting increment:",
              userId
            );
            return res
              .status(400)
              .json({ error: "User not initialized via /init" });
          }
          // Persist init data with verified flag, then increment
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

    // Keep the in-memory count for fast badge serving
    // If Firebase worked, sync memory to the new Firebase count (no extra +1)
    // If Firebase failed, increment memory as the source of truth
    if (firebaseWorking) {
      visitorCounts[userId] = firebaseCount;
    } else {
      // If Firebase failed here, keep init payload until a future successful persist
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
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
});

// Debug endpoint to check user data
router.get("/debug/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 Debug request for userId: ${userId}`);

    // Get data from both sources
    const firestoreData = await getUserData(userId);
    const memoryCount = visitorCounts[userId];

    res.json({
      userId,
      firestoreData,
      memoryCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: "Debug error", details: err.message });
  }
});

// List available styles for the frontend
router.get("/badge/styles", (req, res) => {
  try {
    res.json({ styles: getAvailableStyles() });
  } catch (err) {
    console.error("Styles list error:", err);
    res.status(500).json({ error: "Error listing styles" });
  }
});

// Optional: set user's preferred badge style
router.post("/badge/style", async (req, res) => {
  try {
    const { userId, style } = req.body;
    if (!userId || !style)
      return res.status(400).json({ error: "Missing userId or style" });
    await setUserBadge(userId, style);
    res.json({ success: true });
  } catch (err) {
    console.error("Set style error:", err);
    res.status(500).json({ error: "Error saving style" });
  }
});

// Endpoint to serve the badge as dynamic SVG with style and color
router.get("/badge/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { style, bg, textColor, bgGradient } = req.query;

    // Use in-memory count as fast source; optionally fall back to Firestore
    let count = visitorCounts[userId];
    if (typeof count !== "number") {
      // Attempt to read from Firestore if not present in memory
      const data = await getUserData(userId).catch(() => null);
      count = data?.visitorCount || 0;
      visitorCounts[userId] = count;
    }

    // Resolve style: query param > Firestore badge > pending initStore style > default
    let effectiveStyle = style;
    if (!effectiveStyle) {
      try {
        const data = await getUserData(userId);
        effectiveStyle = data?.badge || effectiveStyle;
      } catch (_) {
        // ignore
      }
      if (!effectiveStyle && initStore[userId]?.style) {
        effectiveStyle = initStore[userId].style;
      }
      if (!effectiveStyle) effectiveStyle = "style1";
    }

    // Resolve gradient: query param > initStore > fallback to bg
    const effectiveGradient = bgGradient || initStore[userId]?.bgGradient || bg;

    const svg = renderBadge({
      style: effectiveStyle,
      count,
      bg,
      bgGradient: effectiveGradient,
      textColor,
    });
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error("Badge error:", err);
    res.status(500).send("Error generating badge");
  }
});

module.exports = router;
