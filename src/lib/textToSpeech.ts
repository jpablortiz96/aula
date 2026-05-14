/** Strip markdown and LaTeX so text sounds natural when spoken aloud. */
export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, "")           // display math blocks
    .replace(/\$[^$\n]*?\$/g, "")               // inline math
    .replace(/^#{1,6}\s+/gm, "")               // headings
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1") // bold / italic
    .replace(/```[\s\S]*?```/g, "")            // fenced code blocks
    .replace(/`[^`\n]+`/g, "")                 // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // links — keep label
    .replace(/^[-*+]\s+/gm, "")               // unordered list markers
    .replace(/^\d+\.\s+/gm, "")               // ordered list markers
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
