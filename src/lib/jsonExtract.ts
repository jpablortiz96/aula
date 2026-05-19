/**
 * Robustly extract and parse the FIRST complete JSON object or array from a
 * string that may contain surrounding text, extra JSON blocks, markdown fences,
 * or smart-quote characters.
 *
 * Uses balanced-bracket counting so that content AFTER the closing `}` or `]`
 * — including additional JSON objects returned by talkative models — is ignored
 * rather than included in the parse (which would cause "Unexpected non-whitespace
 * character after JSON" errors).
 */
export function extractJson(raw: string): unknown {
  // Step 1: strip markdown code fences
  let text = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  // Step 2: locate the first `{` or `[`
  const firstBrace   = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start =
    firstBrace === -1   ? firstBracket
    : firstBracket === -1 ? firstBrace
    : Math.min(firstBrace, firstBracket);

  if (start !== -1) {
    const isObj = text[start] === "{";
    const open  = isObj ? "{" : "[";
    const close = isObj ? "}" : "]";

    // Step 3: walk character-by-character with balanced bracket counting.
    // Properly skips characters inside JSON strings so that { / } inside a
    // string value don't affect the nesting depth.
    let depth    = 0;
    let inStr    = false;
    let escape   = false;
    let end      = -1;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escape)        { escape = false; continue; }
      if (ch === "\\")   { escape = true;  continue; }
      if (ch === '"')    { inStr  = !inStr; continue; }
      if (inStr)         { continue; }

      if (ch === open)   { depth++; }
      if (ch === close)  { depth--; if (depth === 0) { end = i; break; } }
    }

    if (end > start) {
      text = text.slice(start, end + 1);
    }
  }

  // Step 4: try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Step 5: repair common model mistakes and retry
    const repaired = text
      .replace(/[""]/g, '"')   // curly quotes → straight
      .replace(/['']/g, "'")
      .replace(/,\s*([\]}])/g, "$1"); // trailing commas

    try {
      return JSON.parse(repaired);
    } catch (e) {
      throw new Error(
        `No se pudo parsear la respuesta del modelo como JSON.\n` +
        `Detalle: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
