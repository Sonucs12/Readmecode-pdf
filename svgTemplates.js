// svgTemplates.js

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
function style6({ count, bg, textColor }) {
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
      ? generateGradientDef("g_style6", bgInfo.gradientDef)
      : ""
  }
  <rect width="${leftWidth}" height="${height}" fill="#2d2d2d" rx="4" />
  <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${
    bgInfo.isGradient ? "url(#g_style6)" : bgInfo.solidColor
  }" rx="4" />
  <text x="${
    leftWidth / 2
  }" y="18" text-anchor="middle" fill="${safeText}" font-size="13" font-family="Arial, sans-serif">${label}</text>
  <text x="${
    leftWidth + rightWidth / 2
  }" y="18" text-anchor="middle" fill="${safeText}" font-size="13" font-family="Arial, sans-serif">${count}</text>
</svg>`;
}

const templates = {
  style1,
  style2,
  style3,
  style4,
  style5,
  style6,
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
