// visitorRoutes.js
import express from "express";
const router = express.Router();

// Use a simple in-memory store for demonstration (replace with DB in production)
const visitorCounts = {}; // { userId: count }

// Endpoint to increment the count
router.post("/increment", (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    if (!visitorCounts[userId]) visitorCounts[userId] = 0;
    visitorCounts[userId] += 1;

    return res.json({ success: true, count: visitorCounts[userId] });
  } catch (err) {
    console.error("Increment error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to serve the badge as dynamic SVG
router.get("/badge/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const count = visitorCounts[userId] || 0;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="150" height="30">
        <rect width="150" height="30" fill="#555"/>
        <text x="10" y="20" fill="#fff" font-size="14" font-family="Arial">
          👀 Views: ${count}
        </text>
      </svg>
    `;
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error("Badge error:", err);
    res.status(500).send("Error generating badge");
  }
});

export default router;
