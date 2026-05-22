import { cloudGenerate } from "@/lib/cloudNoStream";

const SYSTEM_ES = `Eres un generador de mapas mentales en formato Mermaid. Respondes ÚNICAMENTE con la sintaxis Mermaid de un mindmap, sin texto extra, sin markdown, sin bloques de código.

Formato exacto (usa solo sangría de 2 espacios, sin tabs):
mindmap
  root((Tema central))
    Rama1
      Subrama1a
      Subrama1b
    Rama2
      Subrama2a
    Rama3

Reglas:
- Máximo 3 niveles de profundidad
- Máximo 5 ramas principales
- Máximo 3 subramas por rama
- Texto corto (máximo 5 palabras por nodo)
- NO uses caracteres especiales en los nodos excepto letras, números y espacios`;

const SYSTEM_EN = `You are a Mermaid mind map generator. Reply ONLY with the Mermaid mindmap syntax, no extra text, no markdown, no code blocks.

Exact format (use only 2-space indentation, no tabs):
mindmap
  root((Central topic))
    Branch1
      Subbranch1a
      Subbranch1b
    Branch2
      Subbranch2a
    Branch3

Rules:
- Maximum 3 levels deep
- Maximum 5 main branches
- Maximum 3 subbranches per branch
- Short text (max 5 words per node)
- NO special characters in nodes except letters, numbers and spaces`;

export async function generateMindMap(
  text: string,
  lang: "es" | "en",
): Promise<string> {
  const apiKey = localStorage.getItem("aula:google-ai-api-key") ?? "";
  if (!apiKey) throw new Error("NO_KEY");

  const prompt =
    lang === "es"
      ? `Crea un mapa mental sobre este contenido:\n\n${text.slice(0, 1500)}`
      : `Create a mind map about this content:\n\n${text.slice(0, 1500)}`;

  const raw = await cloudGenerate({
    apiKey,
    systemInstruction: lang === "es" ? SYSTEM_ES : SYSTEM_EN,
    prompt,
    temperature: 0.3,
    maxOutputTokens: 512,
  });

  // Extract just the mermaid block if wrapped in backticks
  const match = raw.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
  const cleaned = (match ? match[1]! : raw).trim();

  if (!cleaned.startsWith("mindmap")) {
    throw new Error("INVALID_MERMAID");
  }

  return cleaned;
}
