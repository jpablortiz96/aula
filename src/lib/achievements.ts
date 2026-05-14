export interface Achievement {
  id:          string;
  title:       string;
  description: string;
  icon:        string;
  xpReward:    number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id:          "first-question",
    title:       "Primera pregunta",
    description: "Hiciste tu primera pregunta a AULA",
    icon:        "🌟",
    xpReward:    10,
  },
  {
    id:          "curious",
    title:       "Curioso",
    description: "Hiciste 10 preguntas",
    icon:        "🔍",
    xpReward:    25,
  },
  {
    id:          "dedicated",
    title:       "Estudiante dedicado",
    description: "Racha de 3 días seguidos",
    icon:        "🔥",
    xpReward:    50,
  },
  {
    id:          "multimodal",
    title:       "Multimodal",
    description: "Enviaste una foto para analizar",
    icon:        "📸",
    xpReward:    20,
  },
  {
    id:          "hands-free",
    title:       "Manos libres",
    description: "Usaste el modo de voz",
    icon:        "🎤",
    xpReward:    20,
  },
  {
    id:          "teacher",
    title:       "Profe por un día",
    description: "Generaste tu primer quiz",
    icon:        "👩‍🏫",
    xpReward:    30,
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<string, Achievement>;
