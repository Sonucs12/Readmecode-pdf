// svgTemplates.js
// Reusable helper to generate the left/right pill paths
function makeBadgePaths(leftWidth, rightWidth, height, radius) {
  // Left part (dark background)
  const leftPath = `
    M${radius} 0
    h${leftWidth - radius}
    v${height}
    h-${leftWidth - radius}
    a${radius},${radius} 0 0 1 -${radius}-${radius}
    v-${height - radius}
    a${radius},${radius} 0 0 1 ${radius}-${radius}
    z
  `;

  // Right part (colored background)
  const rightPath = `
    M${leftWidth} 0
    h${rightWidth - radius}
    a${radius},${radius} 0 0 1 ${radius},${radius}
    v${height - 2 * radius}
    a${radius},${radius} 0 0 1 -${radius},${radius}
    h-${rightWidth - radius}
    z
  `;

  return { leftPath, rightPath };
}
// Predefined gradient
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

function processBgColor(bg, templateDefault) {
  // Check if bg is a gradient name
  if (bg && GRADIENT_DEFINITIONS[bg]) {
    return {
      isGradient: true,
      gradientDef: GRADIENT_DEFINITIONS[bg],
      solidColor: null,
    };
  }

  // Otherwise treat as solid color
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
  <text x="${
    width / 2
  }" y="20" text-anchor="middle" fill="${safeText}" font-size="14" font-family="Arial, Helvetica, sans-serif">${label}</text>
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
  <text x="${
    width / 2
  }" y="18" text-anchor="middle" fill="${safeText}" font-size="13" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">${label}</text>
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
  <text x="${
    width / 2
  }" y="20" text-anchor="middle" fill="${safeText}" font-size="14" font-weight="600" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">${label}</text>
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
  <text x="${
    width / 2
  }" y="22" text-anchor="middle" fill="${safeText}" font-size="14" font-family="Verdana, Geneva, Tahoma, sans-serif">${label}</text>
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
  <text x="${
    width / 2
  }" y="20" text-anchor="middle" fill="${safeText}" font-size="13" font-family="Arial, Helvetica, sans-serif">${label}</text>
</svg>`;
}
function shield1({ count, bg, textColor }) {
  const label = "Visitors";
  const leftWidth = clampWidth(label, 80);
  const rightWidth = clampWidth(String(count), 60);
  const height = 28;

  const templateDefaultBg = "#3b82f6";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${
    leftWidth + rightWidth
  }" height="${height}">
  ${
    bgInfo.isGradient
      ? generateGradientDef("g_shield1", bgInfo.gradientDef)
      : ""
  }
  
  <!-- Left label with rounded left corners only -->
  <path d="M0 0 
           h${leftWidth} 
           v${height} 
           h-${leftWidth - 4} 
           a4 4 0 0 1 -4 -4 
           v-${height - 8} 
           a4 4 0 0 1 4 -4 
           z"
        fill="#2d2d2d" />
  
  <!-- Right badge with rounded right corners only -->
  <path d="M${leftWidth} 0 
           h${rightWidth - 4} 
           a4 4 0 0 1 4 4 
           v${height - 8} 
           a4 4 0 0 1 -4 4 
           h-${rightWidth - 4} 
           z"
        fill="${bgInfo.isGradient ? "url(#g_shield1)" : bgInfo.solidColor}" />
  
  <text x="${
    leftWidth / 2
  }" y="18" text-anchor="middle" fill="#ffffff" font-size="13" font-family="Arial, sans-serif">${label}</text>
  
  <text x="${
    leftWidth + rightWidth / 2
  }" y="18" text-anchor="middle" fill="${safeText}" font-size="13" font-family="Arial, sans-serif">${count}</text>
</svg>`;
}
function shield2({ count, bg, textColor }) {
  const label = "Page Views";
  const leftWidth = clampWidth(label, 100);
  const rightWidth = clampWidth(String(count), 60);
  const height = 30;
  const radius = 4;

  const templateDefaultBg = "#10b981";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);

  // Path for left segment (rounded left corners only)
  const leftPath = `
    M0 0
    H${leftWidth}
    V${height}
    H${radius}
    A${radius} ${radius} 0 0 1 0 ${height - radius}
    V${radius}
    A${radius} ${radius} 0 0 1 ${radius} 0
    Z
  `;

  // Path for right segment (rounded right corners only)
  const rightPath = `
    M${leftWidth} 0
    H${leftWidth + rightWidth - radius}
    A${radius} ${radius} 0 0 1 ${leftWidth + rightWidth} ${radius}
    V${height - radius}
    A${radius} ${radius} 0 0 1 ${leftWidth + rightWidth - radius} ${height}
    H${leftWidth}
    Z
  `;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${
    leftWidth + rightWidth
  }" height="${height}">
  ${
    bgInfo.isGradient
      ? generateGradientDef("g_shield2", bgInfo.gradientDef)
      : ""
  }
  <path d="${leftPath}" fill="#1f2937" />
  <path d="${rightPath}" fill="${
    bgInfo.isGradient ? "url(#g_shield2)" : bgInfo.solidColor
  }" />
  <text x="${leftWidth / 2}" y="${Math.round(height / 2 + 5)}"
        text-anchor="middle" fill="${safeText}" font-size="13"
        font-family="Segoe UI, sans-serif">${label}</text>
  <text x="${leftWidth + rightWidth / 2}" y="${Math.round(height / 2 + 5)}"
        text-anchor="middle" fill="${safeText}" font-size="13"
        font-family="Segoe UI, sans-serif">${count}</text>
</svg>`;
}



function shield3({ count, bg, textColor }) {
  const label = "Users";
  const leftWidth = clampWidth(label, 70);
  const rightWidth = clampWidth(String(count), 60);
  const height = 28;
  const radius = 4;

  const templateDefaultBg = "#8b5cf6";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);

  const totalWidth = leftWidth + rightWidth;
  const { leftPath, rightPath } = makeBadgePaths(leftWidth, rightWidth, height, radius);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${count}">
  ${bgInfo.isGradient ? generateGradientDef("g_shield3", bgInfo.gradientDef) : ""}

  <path d="${leftPath}" fill="#2c2c2c"/>
  <path d="${rightPath}" fill="${bgInfo.isGradient ? "url(#g_shield3)" : bgInfo.solidColor}"/>

  <text x="${leftWidth / 2}" y="${height / 2}" text-anchor="middle"
        fill="${safeText}" font-size="12" font-family="Verdana, sans-serif"
        dominant-baseline="middle">${label}</text>
  <text x="${leftWidth + rightWidth / 2}" y="${height / 2}" text-anchor="middle"
        fill="${safeText}" font-size="12" font-family="Verdana, sans-serif"
        dominant-baseline="middle">${count}</text>
</svg>`;
}
function shield4({ count, bg, textColor }) {
  const label = "Hits";
  const leftWidth = clampWidth(label, 60);
  const rightWidth = clampWidth(String(count), 60);
  const height = 26;
  const radius = 3; // smaller radius than shield2/3

  const templateDefaultBg = "#f97316"; // orange default
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const bgInfo = processBgColor(bg, templateDefaultBg);

  const totalWidth = leftWidth + rightWidth;

  // reuse same helper from shield2/shield3
  const { leftPath, rightPath } = makeBadgePaths(
    leftWidth,
    rightWidth,
    height,
    radius
  );

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${count}">
  ${
    bgInfo.isGradient
      ? generateGradientDef("g_shield4", bgInfo.gradientDef)
      : ""
  }

  <path d="${leftPath}" fill="#1c1c1c"/>
  <path d="${rightPath}" fill="${
    bgInfo.isGradient ? "url(#g_shield4)" : bgInfo.solidColor
  }"/>

  <text x="${leftWidth / 2}" y="${height / 2}" text-anchor="middle"
        fill="${safeText}" font-size="12" font-family="Tahoma, sans-serif"
        dominant-baseline="middle">${label}</text>
  <text x="${leftWidth + rightWidth / 2}" y="${height / 2}" text-anchor="middle"
        fill="${safeText}" font-size="12" font-family="Tahoma, sans-serif"
        dominant-baseline="middle">${count}</text>
</svg>`;
}

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
};

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
