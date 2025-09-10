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

// Endpoint to increment the count
router.post("/increment", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Increment in Firestore
    await incrementVisitorCount(userId);

    // Optionally, keep the in-memory count for fast badge serving (optional)
    if (!visitorCounts[userId]) visitorCounts[userId] = 0;
    visitorCounts[userId] += 1;

    return res.json({ success: true, count: visitorCounts[userId] });
  } catch (err) {
    console.error("Increment error:", err);
    return res.status(500).json({ error: "Server error" });
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
