const UNSAFE_TAGS = new Set([
  "script", "object", "embed", "iframe", "form", "input", "button",
  "link", "meta", "base", "applet",
]);

const UNSAFE_ATTRS = /^on[a-z]/i; // event handlers

const UNSAFE_PROTOCOLS = /^(?:javascript|vbscript|data):/i;

/**
 * Strip unsafe content from model-generated SVG.
 * - Removes <script>, <iframe>, etc.
 * - Removes event handler attributes (onclick, onload, …)
 * - Removes href/xlink:href with dangerous protocols
 * - Does NOT rely on a DOM parser — uses regex-based approach safe for SSR.
 */
export function sanitizeSvg(raw: string): string {
  // Only keep content from the first <svg> to the last </svg>
  const start = raw.indexOf("<svg");
  const end   = raw.lastIndexOf("</svg>");
  if (start === -1) return "";
  const svgText = end !== -1 ? raw.slice(start, end + 6) : raw.slice(start);

  return svgText
    // Remove unsafe block tags and everything inside them
    .replace(
      new RegExp(
        `<(?:${[...UNSAFE_TAGS].join("|")})[^>]*>(?:.*?)</(?:${[...UNSAFE_TAGS].join("|")})>`,
        "gis",
      ),
      "",
    )
    // Remove self-closing unsafe tags
    .replace(
      new RegExp(
        `<(?:${[...UNSAFE_TAGS].join("|")})[^>]*/?>`,
        "gi",
      ),
      "",
    )
    // Remove on* attributes
    .replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/g, "")
    // Remove dangerous hrefs (javascript:, data:, vbscript:)
    .replace(
      /\s+(?:href|xlink:href|action|src)\s*=\s*["'](?:javascript|vbscript|data):[^"']*/gi,
      "",
    );
}

/** Check if a string looks like a valid SVG snippet */
export function isValidSvg(text: string): boolean {
  const t = text.trim();
  return t.startsWith("<svg") && t.includes("</svg>");
}
