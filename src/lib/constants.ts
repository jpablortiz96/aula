export const MODEL_ID = "onnx-community/gemma-4-E4B-it-ONNX";
export const MODEL_DTYPE = "q4f16" as const;
export const MODEL_DEVICE = "webgpu" as const;

export const WORKER_MESSAGES = {
  LOAD: "load",
  GENERATE: "generate",
  STATUS: "status",
  PROGRESS: "progress",
  TOKEN: "token",
  DONE: "done",
  ERROR: "error",
} as const;

export type WorkerMessageType =
  (typeof WORKER_MESSAGES)[keyof typeof WORKER_MESSAGES];

// Outbound messages (main → worker)
export type WorkerInMessage =
  | { type: "load" }
  | { type: "generate"; prompt: string; conversationHistory: ChatMessage[] };

// Inbound messages (worker → main)
export type WorkerOutMessage =
  | { type: "progress"; progress: number; file: string; loaded: number; total: number }
  | { type: "status"; status: ModelStatus; message?: string }
  | { type: "token"; token: string }
  | { type: "done"; tokensPerSecond: number }
  | { type: "error"; error: string };

export type ModelStatus = "idle" | "loading" | "ready" | "generating" | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
