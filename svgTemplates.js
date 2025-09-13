// svgTemplates.js - Optimized with vertical text centering, dynamic width, and reusability

// Common text attributes for vertical centering
const TEXT_CENTER_ATTRS = `text-anchor="middle" dominant-baseline="central"`;

// Reusable helper to generate the left/right pill paths
function makeAllCurvPaths(leftWidth, rightWidth, height, radius) {
  const totalWidth = leftWidth + rightWidth;
  return `
    M${radius} 0
    h${totalWidth - 2 * radius}
    a${radius},${radius} 0 0 1 ${radius},${radius}
    v${height - 2 * radius}
    a${radius},${radius} 0 0 1 -${radius},${radius}
    h-${totalWidth - 2 * radius}
    a${radius},${radius} 0 0 1 -${radius},-${radius}
    v-${height - 2 * radius}
    a${radius},${radius} 0 0 1 ${radius},-${radius}
    z
  `;
}

function makeBadgePaths(leftWidth, rightWidth, height, radius) {
  const leftPath = `
    M${radius},0
    h${leftWidth - radius}
    v${height}
    h-${leftWidth - radius}
    a${radius},${radius} 0 0,1 -${radius},-${radius}
    v-${height - 2 * radius}
    a${radius},${radius} 0 0,1 ${radius},-${radius}
    z
  `;

  const rightPath = `
    M${leftWidth},0
    h${rightWidth - radius}
    a${radius},${radius} 0 0,1 ${radius},${radius}
    v${height - 2 * radius}
    a${radius},${radius} 0 0,1 -${radius},${radius}
    h-${rightWidth - radius}
    z
  `;

  return { leftPath, rightPath };
}

// Predefined gradients
const GRADIENT_DEFINITIONS = {
  "gradient-blue": { start: "#3b82f6", end: "#1d4ed8" },
  "gradient-green": { start: "#10b981", end: "#059669" },
  "gradient-purple": { start: "#8b5cf6", end: "#7c3aed" },
  "gradient-orange": { start: "#f97316", end: "#ea580c" },
  "gradient-pink": { start: "#ec4899", end: "#db2777" },
  "gradient-teal": { start: "#14b8a6", end: "#0d9488" },
  "gradient-black": { start: "#374151", end: "#111827" },
  "gradient-gray": { start: "#6b7280", end: "#4b5563" },
  "gradient-dark": { start: "#1f2937", end: "#111827" },
};

// Utility functions
function sanitizeColor(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return trimmed;
  if (/^(rgb|hsl)a?\([^)]*\)$/.test(trimmed)) return trimmed;
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed;
  return null;
}

function clampWidth(text, baseWidth) {
  const approxCharWidth = 8;
  const padding = 24;
  const width = Math.max(baseWidth, text.length * approxCharWidth + padding);
  return Math.min(width, 320);
}

// Dynamic width calculation for shield badges
function calculateShieldWidth(text, minWidth = 50) {
  const approxCharWidth = 7;
  const padding = 16;
  return Math.max(minWidth, text.length * approxCharWidth + padding);
}

function processBgColor(bg, templateDefault) {
  if (bg && GRADIENT_DEFINITIONS[bg]) {
    return {
      isGradient: true,
      gradientDef: GRADIENT_DEFINITIONS[bg],
      solidColor: null,
    };
  }
  const sanitized = sanitizeColor(bg);
  return {
    isGradient: false,
    gradientDef: null,
    solidColor: sanitized || templateDefault,
  };
}

function generateGradientDef(id, gradientDef) {
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${gradientDef.start}"/>
        <stop offset="100%" stop-color="${gradientDef.end}"/>
      </linearGradient>
    </defs>`;
}

// Optimized text element helper
function createText(x, y, fill, fontSize, fontFamily, text) {
  return `<text x="${x}" y="${y}" ${TEXT_CENTER_ATTRS} fill="${fill}" font-size="${fontSize}" font-family="${fontFamily}">${text}</text>`;
}

// Shield badges with dual text helper
function createShieldTexts(
  leftWidth,
  rightWidth,
  height,
  leftText,
  rightText,
  textColor,
  fontSize,
  fontFamily
) {
  const leftX = leftWidth / 2;
  const rightX = leftWidth + rightWidth / 2;
  const y = height / 2;

  return `
  ${createText(leftX, y, "#ffffff", fontSize, fontFamily, leftText)}
  ${createText(rightX, y, textColor, fontSize, fontFamily, rightText)}`;
}

// Generic shield template to maintain reusability
function createShield(config) {
  const {
    label,
    count,
    bg,
    textColor,
    templateDefaultBg,
    height,
    radius,
    fontSize,
    fontFamily,
    fillColor,
    gradientId,
    useClampWidth,
  } = config;

  // Use dynamic width calculation for all shields
  const leftWidth = useClampWidth
    ? clampWidth(label, config.leftBaseWidth || 70)
    : calculateShieldWidth(label, config.leftMinWidth || 50);
  const rightWidth = useClampWidth
    ? clampWidth(String(count), config.rightBaseWidth || 60)
    : calculateShieldWidth(String(count), config.rightMinWidth || 40);

  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);
  const totalWidth = leftWidth + rightWidth;
  const { leftPath, rightPath } = makeBadgePaths(
    leftWidth,
    rightWidth,
    height,
    radius
  );

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${count}">
  ${
    bgInfo.isGradient ? generateGradientDef(gradientId, bgInfo.gradientDef) : ""
  }
  <path d="${leftPath}" fill="${fillColor}"/>
  <path d="${rightPath}" fill="${
    bgInfo.isGradient ? `url(#${gradientId})` : bgInfo.solidColor
  }"/>
  ${createShieldTexts(
    leftWidth,
    rightWidth,
    height,
    label,
    count,
    safeText,
    fontSize,
    fontFamily
  )}
</svg>`;
}

// Simple badge templates
function style1({ count, bg, textColor }) {
  const templateDefaultBg = "#4c51bf";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);
  const label = `Total Visitors: ${count}`;
  const width = clampWidth(label, 150);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="30" role="img" aria-label="${label}">
  ${
    bgInfo.isGradient ? generateGradientDef("g_style1", bgInfo.gradientDef) : ""
  }
  <rect width="${width}" height="30" fill="${
    bgInfo.isGradient ? "url(#g_style1)" : bgInfo.solidColor
  }" rx="4" />
  ${createText(
    width / 2,
    15,
    safeText,
    "14",
    "Arial, Helvetica, sans-serif",
    label
  )}
  <title>${label}</title>
  <desc>Badge showing the total views</desc>
</svg>`;
}

function style2({ count, bg, textColor }) {
  const templateDefaultBg = "#0ea5e9";
  const safeText = sanitizeColor(textColor) || "#0b1220";
  const bgInfo = processBgColor(bg, templateDefaultBg);
  const label = `Portfolio Views 👁️ ${count}`;
  const width = clampWidth(label, 120);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="30">
  ${
    bgInfo.isGradient ? generateGradientDef("g_style2", bgInfo.gradientDef) : ""
  }
  <rect width="${width}" height="30" fill="${
    bgInfo.isGradient ? "url(#g_style2)" : bgInfo.solidColor
  }" rx="14" />
  ${createText(
    width / 2,
    15,
    safeText,
    "13",
    "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    label
  )}
</svg>`;
}

function style3({ count, bg, textColor }) {
  const templateDefaultBg = "#10b981";
  const safeText = sanitizeColor(textColor) || "#00312a";
  const bgInfo = processBgColor(bg, templateDefaultBg);
  const label = `${count} users visited`;
  const width = clampWidth(label, 140);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="32">
  <rect width="${width}" height="34" fill="#0b0f14" rx="6" />
  ${
    bgInfo.isGradient ? generateGradientDef("g_style3", bgInfo.gradientDef) : ""
  }
  <rect x="2" y="2" width="${width - 4}" height="30" fill="${
    bgInfo.isGradient ? "url(#g_style3)" : bgInfo.solidColor
  }" rx="5" />
  ${createText(
    width / 2,
    17,
    safeText,
    "14",
    "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    label
  )}
</svg>`;
}

function style4({ count, bg, textColor }) {
  const templateDefaultBg = "#f59e0b";
  const safeText = sanitizeColor(textColor) || "#1f1300";
  const bgInfo = processBgColor(bg, templateDefaultBg);
  const label = `Visitors ${count}`;
  const width = clampWidth(label, 160);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="rgba(0,0,0,0.35)"/>
    </filter>
    ${
      bgInfo.isGradient
        ? `
    <linearGradient id="g_style4" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgInfo.gradientDef.start}"/>
      <stop offset="100%" stop-color="${bgInfo.gradientDef.end}"/>
    </linearGradient>`
        : ""
    }
  </defs>
  <rect width="${width}" height="34" fill="${
    bgInfo.isGradient ? "url(#g_style4)" : bgInfo.solidColor
  }" rx="8" filter="url(#shadow)" />
  ${createText(
    width / 2,
    17,
    safeText,
    "14",
    "Verdana, Geneva, Tahoma, sans-serif",
    label
  )}
</svg>`;
}

function style5({ count, bg, textColor }) {
  const templateDefaultBg = "#ef4444";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);
  const label = `Website visitors ${count}`;
  const width = clampWidth(label, 170);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="30">
  <defs>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.00)"/>
    </linearGradient>
    ${
      bgInfo.isGradient
        ? `
    <linearGradient id="g_style5" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgInfo.gradientDef.start}"/>
      <stop offset="100%" stop-color="${bgInfo.gradientDef.end}"/>
    </linearGradient>`
        : ""
    }
  </defs>
  <rect width="${width}" height="30" fill="#0a0a0a" />
  <g>
    <rect x="1" y="1" width="${width - 2}" height="28" fill="${
    bgInfo.isGradient ? "url(#g_style5)" : bgInfo.solidColor
  }" rx="3" />
    <rect x="1" y="1" width="${
      width - 2
    }" height="28" fill="url(#gloss)" rx="3"/>
  </g>
  ${createText(
    width / 2,
    15,
    safeText,
    "13",
    "Arial, Helvetica, sans-serif",
    label
  )}
</svg>`;
}

// Shield badges using the reusable createShield function
function shield1({ count, bg, textColor }) {
  const label = "Visitors";
  const leftWidth = clampWidth(label, 80);
  const rightWidth = clampWidth(String(count), 60);
  const height = 28;
  const radius = 14;

  const templateDefaultBg = "#3b82f6";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);
  const totalWidth = leftWidth + rightWidth;
  const path = makeAllCurvPaths(leftWidth, rightWidth, height, radius);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${count}">
  ${
    bgInfo.isGradient
      ? generateGradientDef("g_shield1", bgInfo.gradientDef)
      : ""
  }
  <path d="${path}" fill="#2d2d2d"/>
  <rect x="${leftWidth}" y="0" width="${rightWidth}" height="${height}" rx="${radius}" fill="${
    bgInfo.isGradient ? "url(#g_shield1)" : bgInfo.solidColor
  }"/>
  ${createShieldTexts(
    leftWidth,
    rightWidth,
    height,
    label,
    count,
    safeText,
    "13",
    "Arial, sans-serif"
  )}
</svg>`;
}

function shield2({ count, bg, textColor }) {
  return createShield({
    label: "Page Views",
    count,
    bg,
    textColor,
    templateDefaultBg: "#10b981",
    height: 30,
    radius: 4,
    fontSize: "13",
    fontFamily: "Segoe UI, sans-serif",
    fillColor: "#1f2937",
    gradientId: "g_shield2",
    useClampWidth: true,
    leftBaseWidth: 100,
  });
}

function shield3({ count, bg, textColor }) {
  return createShield({
    label: "Website Visitors",
    count,
    bg,
    textColor,
    templateDefaultBg: "#8b5cf6",
    height: 28,
    radius: 4,
    fontSize: "12",
    fontFamily: "Verdana, sans-serif",
    fillColor: "#2c2c2c",
    gradientId: "g_shield3",
    useClampWidth: false,
    leftMinWidth: 70,
    rightMinWidth: 40,
  });
}

function shield4({ count, bg, textColor }) {
  return createShield({
    label: "Total Page Views",
    count,
    bg,
    textColor,
    templateDefaultBg: "#f97316",
    height: 26,
    radius: 3,
    fontSize: "12",
    fontFamily: "Tahoma, sans-serif",
    fillColor: "#1c1c1c",
    gradientId: "g_shield4",
    useClampWidth: false, // Use dynamic width calculation
    leftMinWidth: 60,
    rightMinWidth: 35,
  });
}

function shield5({ count, bg, textColor }) {
  return createShield({
    label: "Portfolio Views",
    count,
    bg,
    textColor,
    templateDefaultBg: "#ec4899",
    height: 28,
    radius: 4,
    fontSize: "13",
    fontFamily: "Arial, sans-serif",
    fillColor: "#2a2a2a",
    gradientId: "g_shield5",
    useClampWidth: false, // Use dynamic width calculation
    leftMinWidth: 60,
    rightMinWidth: 35,
  });
}

// Template registry
const templates = {
  style1,
  style2,
  style3,
  style4,
  style5,
  shield1,
  shield2,
  shield3,
  shield4,
  shield5,
};

// Export functions
function getAvailableStyles() {
  return Object.keys(templates).map((key) => ({ key }));
}

function getAvailableGradients() {
  return Object.keys(GRADIENT_DEFINITIONS).map((key) => ({
    value: key,
    label:
      key.replace("gradient-", "").replace(/^\w/, (c) => c.toUpperCase()) +
      " Gradient",
    gradient: `linear-gradient(135deg, ${GRADIENT_DEFINITIONS[key].start} 0%, ${GRADIENT_DEFINITIONS[key].end} 100%)`,
  }));
}

function renderBadge({ style = "style1", count = 0, bg, textColor }) {
  const tmpl = templates[style] || templates.style1;
  return tmpl({ count, bg, textColor });
}

module.exports = {
  renderBadge,
  getAvailableStyles,
  getAvailableGradients,
  GRADIENT_DEFINITIONS,
};
