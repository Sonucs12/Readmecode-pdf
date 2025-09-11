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

// Receive init payload from frontend and keep it temporarily in memory
router.post("/init", (req, res) => {
  try {
    const { userId, style, timestamp } = req.body || {};
    if (!userId || !style || !timestamp) {
      return res
        .status(400)
        .json({ error: "Missing userId, style, or timestamp" });
    }
    initStore[userId] = {
      userId,
      style,
      timestamp,
      receivedAt: new Date().toISOString(),
    };
    console.log(
      "✅ Init payload stored in memory for",
      userId,
      initStore[userId]
    );
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
    console.log(`🔄 Increment request received for userId: ${userId}`);

    if (!userId) {
      console.log("❌ Missing userId in request");
      return res.status(400).json({ error: "Missing userId" });
    }

    // Validate that we have a matching init payload from memory for this user
    const initPayload = initStore[userId];
    if (!initPayload) {
      console.warn(
        "⚠️ No init payload found in memory for userId; rejecting increment:",
        userId
      );
      return res.status(400).json({ error: "User not initialized via /init" });
    }

    // Try Firebase first, fallback to in-memory if it fails
    console.log("🔍 Testing Firebase connection...");
    let firebaseWorking = false;
    let firebaseCount = 0;

    try {
      const userData = await getUserData(userId);
      console.log("✅ Firebase connection working, current data:", userData);
      firebaseWorking = true;
      firebaseCount = userData?.visitorCount || 0;
    } catch (firebaseError) {
      console.error(
        "❌ Firebase connection failed, using in-memory fallback:",
        firebaseError.message
      );
      firebaseWorking = false;
    }

    // If Firebase is available, first persist the init payload, then increment count
    if (firebaseWorking) {
      console.log("📈 Attempting to increment visitor count in Firebase...");
      try {
        // Persist init data to Firestore before count increment
        const { upsertInitData } = require("./firebaseUtils");
        await upsertInitData(userId, initPayload);
        // Once persisted, we no longer need the in-memory copy
        delete initStore[userId];

        await incrementVisitorCount(userId);
        console.log("✅ Firebase increment successful");
        firebaseCount += 1;
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
    const { style, bg, textColor } = req.query;

    // Use in-memory count as fast source; optionally fall back to Firestore
    let count = visitorCounts[userId];
    if (typeof count !== "number") {
      // Attempt to read from Firestore if not present in memory
      const data = await getUserData(userId).catch(() => null);
      count = data?.visitorCount || 0;
      visitorCounts[userId] = count;
    }

    const svg = renderBadge({ style, count, bg, textColor });
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error("Badge error:", err);
    res.status(500).send("Error generating badge");
  }
});

module.exports = router;
