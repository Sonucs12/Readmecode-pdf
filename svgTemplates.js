// svgTemplates.js

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

function style1({ count, bg, bgGradient, textColor }) {
  const templateDefaultBg = "#4c51bf";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const userBg = sanitizeColor(bg);
  const userGrad = sanitizeColor(bgGradient);

  // Fixed logic: use gradient if bgGradient is provided
  const useGradient = !!userGrad;
  const fillSolid = userBg || templateDefaultBg;

  const label = `Views: ${count}`;
  const width = clampWidth(label, 150);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="30" role="img" aria-label="${label}">
  ${
    useGradient
      ? `
  <defs>
    <linearGradient id="g_style1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${userGrad}"/>
      <stop offset="100%" stop-color="${userGrad}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="30" fill="url(#g_style1)" rx="4" />
  `
      : `
  <rect width="${width}" height="30" fill="${fillSolid}" rx="4" />
  `
  }
  <text x="12" y="20" fill="${safeText}" font-size="14" font-family="Arial, Helvetica, sans-serif">${label}</text>
  <title>${label}</title>
  <desc>Badge showing the total views</desc>
</svg>`;
}

function style2({ count, bg, bgGradient, textColor }) {
  const templateDefaultBg = "#0ea5e9";
  const safeText = sanitizeColor(textColor) || "#0b1220";
  const userBg = sanitizeColor(bg);
  const userGrad = sanitizeColor(bgGradient);

  // Fixed logic: use gradient if bgGradient is provided
  const useGradient = !!userGrad;
  const fillSolid = userBg || templateDefaultBg;

  const label = `👁️ ${count}`;
  const width = clampWidth(label, 120);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28">
  ${
    useGradient
      ? `
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${userGrad}"/>
      <stop offset="100%" stop-color="${userGrad}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="28" fill="url(#g1)" rx="14" />
  `
      : `
  <rect width="${width}" height="28" fill="${fillSolid}" rx="14" />
  `
  }
  <text x="14" y="18" fill="${safeText}" font-size="13" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">${label}</text>
</svg>`;
}

function style3({ count, bg, bgGradient, textColor }) {
  const templateDefaultBg = "#10b981";
  const safeText = sanitizeColor(textColor) || "#00312a";
  const userBg = sanitizeColor(bg);
  const userGrad = sanitizeColor(bgGradient);

  // Fixed logic: use gradient if bgGradient is provided
  const useGradient = !!userGrad;
  const fillSolid = userBg || templateDefaultBg;

  const label = `${count} visits`;
  const width = clampWidth(label, 140);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="32">
  <rect width="${width}" height="32" fill="#0b0f14" rx="6" />
  ${
    useGradient
      ? `
  <defs>
    <linearGradient id="g_style3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${userGrad}"/>
      <stop offset="100%" stop-color="${userGrad}"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="${
    width - 4
  }" height="28" fill="url(#g_style3)" rx="5" />
  `
      : `
  <rect x="2" y="2" width="${
    width - 4
  }" height="28" fill="${fillSolid}" rx="5" />
  `
  }
  <text x="16" y="20" fill="${safeText}" font-size="14" font-weight="600" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">${label}</text>
</svg>`;
}

function style4({ count, bg, bgGradient, textColor }) {
  const templateDefaultBg = "#f59e0b";
  const safeText = sanitizeColor(textColor) || "#1f1300";
  const userBg = sanitizeColor(bg);
  const userGrad = sanitizeColor(bgGradient);

  // Fixed logic: use gradient if bgGradient is provided
  const useGradient = !!userGrad;
  const fillSolid = userBg || templateDefaultBg;

  const label = `Visitors ${count}`;
  const width = clampWidth(label, 160);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="rgba(0,0,0,0.35)"/>
    </filter>
    ${
      useGradient
        ? `
    <linearGradient id="g_style4" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${userGrad}"/>
      <stop offset="100%" stop-color="${userGrad}"/>
    </linearGradient>
    `
        : ``
    }
  </defs>
  ${
    useGradient
      ? `
  <rect width="${width}" height="34" fill="url(#g_style4)" rx="8" filter="url(#shadow)" />
  `
      : `
  <rect width="${width}" height="34" fill="${fillSolid}" rx="8" filter="url(#shadow)" />
  `
  }
  <text x="16" y="22" fill="${safeText}" font-size="14" font-family="Verdana, Geneva, Tahoma, sans-serif">${label}</text>
</svg>`;
}

function style5({ count, bg, bgGradient, textColor }) {
  const templateDefaultBg = "#ef4444";
  const safeText = sanitizeColor(textColor) || "#ffffff";
  const userBg = sanitizeColor(bg);
  const userGrad = sanitizeColor(bgGradient);

  // Fixed logic: use gradient if bgGradient is provided
  const useGradient = !!userGrad;
  const fillSolid = userBg || templateDefaultBg;

  const label = `Readme views ${count}`;
  const width = clampWidth(label, 170);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="30">
  <rect width="${width}" height="30" fill="#0a0a0a" />
  <g>
    ${
      useGradient
        ? `
    <defs>
      <linearGradient id="g_style5" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${userGrad}"/>
        <stop offset="100%" stop-color="${userGrad}"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="${
      width - 2
    }" height="28" fill="url(#g_style5)" rx="3" />
    `
        : `
    <rect x="1" y="1" width="${
      width - 2
    }" height="28" fill="${fillSolid}" rx="3" />
    `
    }
    <rect x="1" y="1" width="${
      width - 2
    }" height="28" fill="url(#gloss)" rx="3"/>
  </g>
  <defs>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.00)"/>
    </linearGradient>
  </defs>
  <text x="12" y="20" fill="${safeText}" font-size="13" font-family="Arial, Helvetica, sans-serif">${label}</text>
</svg>`;
}

const templates = {
  style1,
  style2,
  style3,
  style4,
  style5,
};

function getAvailableStyles() {
  return Object.keys(templates).map((key) => ({ key }));
}

function renderBadge({
  style = "style1",
  count = 0,
  bg,
  bgGradient,
  textColor,
}) {
  const tmpl = templates[style] || templates.style1;
  return tmpl({ count, bg, bgGradient, textColor });
}

module.exports = {
  renderBadge,
  getAvailableStyles,
};
