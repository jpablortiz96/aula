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
    id:          "eye-reader",
    title:       "Ojo lector",
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
  {
    id:          "whiteboard",
    title:       "Pizarrón mágico",
    description: "Resolviste algo escrito a mano",
    icon:        "✏️",
    xpReward:    25,
  },
  {
    id:          "thinker",
    title:       "Pensador",
    description: "Usaste el modo socrático",
    icon:        "🦉",
    xpReward:    35,
  },
  {
    id:          "curious-mind",
    title:       "Mente curiosa",
    description: "Usaste 'No entendí' 5 veces",
    icon:        "🧠",
    xpReward:    30,
  },
  {
    id:          "equation-builder",
    title:       "Arquitecto de ecuaciones",
    description: "Usaste el teclado matemático de la pizarra",
    icon:        "⚗️",
    xpReward:    30,
  },
  {
    id:          "marathon",
    title:       "Maratón",
    description: "Completaste 10 ejercicios de práctica",
    icon:        "🏃",
    xpReward:    40,
  },
  {
    id:          "artist",
    title:       "Artista",
    description: "Generaste una ilustración con IA",
    icon:        "🎨",
    xpReward:    35,
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<string, Achievement>;
