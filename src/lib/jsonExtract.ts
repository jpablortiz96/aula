/**
 * Robustly extract and parse a JSON object from a string that may contain
 * surrounding text, markdown fences, or smart-quote characters.
 */
export function extractJson(raw: string): unknown {
  // Step 1: strip markdown fences
  let text = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  // Step 2: isolate the outermost JSON object or array
  const firstBrace  = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start =
    firstBrace === -1 ? firstBracket
    : firstBracket === -1 ? firstBrace
    : Math.min(firstBrace, firstBracket);

  if (start !== -1) {
    const isObj   = text[start] === "{";
    const open    = isObj ? "{" : "[";
    const close   = isObj ? "}" : "]";
    const lastEnd = text.lastIndexOf(close);
    if (lastEnd > start) {
      text = text.slice(start, lastEnd + 1);
    }
  }

  // Step 3: try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Step 4: repair common model mistakes
    let repaired = text
      // Smart / curly quotes → straight
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      // Trailing commas before } or ]
      .replace(/,\s*([\]}])/g, "$1");

    try {
      return JSON.parse(repaired);
    } catch (e) {
      throw new Error(
        `No se pudo parsear la respuesta del modelo como JSON.\n` +
        `Detalle: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
