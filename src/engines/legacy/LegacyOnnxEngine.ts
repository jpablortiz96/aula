// @deprecated Use MediaPipeEngine or CloudBoostEngine instead.
// Retained as last-resort fallback for browsers where other engines fail.

import type {
  WorkerOutMessage,
  WorkerInMessage,
  ChatMessage as LegacyChatMessage,
} from "@/lib/constants";
import type { ChatEngine, ChatMessage, EngineCapabilities, EngineId, GenerateOptions } from "../types";

export class LegacyOnnxEngine implements ChatEngine {
  readonly id: EngineId = "legacy-onnx";
  readonly displayName = "ONNX Web (Legacy — Gemma 4 E2B)";
  readonly capabilities: EngineCapabilities = {
    supportsMultimodal: false,
    supportsStreaming: true,
    requiresApiKey: false,
    runsLocally: true,
  };

  private worker: Worker | null = null;
  private _ready = false;

  async isReady(): Promise<boolean> {
    return this._ready;
  }

  async load(onProgress?: (p: number) => void): Promise<void> {
    if (this._ready) return;

    return new Promise<void>((resolve, reject) => {
      this.worker = new Worker(
        new URL("./transformersjs/worker.ts", import.meta.url),
        { type: "module" }
      );

      const handler = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data;
        if (msg.type === "progress") {
          onProgress?.(msg.progress);
        } else if (msg.type === "status" && msg.status === "ready") {
          this.worker?.removeEventListener("message", handler);
          this._ready = true;
          resolve();
        } else if (msg.type === "error") {
          this.worker?.removeEventListener("message", handler);
          reject(new Error(msg.error));
        }
      };

      this.worker.addEventListener("message", handler);

      const loadMsg: WorkerInMessage = { type: "load" };
      this.worker.postMessage(loadMsg);
    });
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
    if (!this.worker || !this._ready) {
      throw new Error("Engine not loaded — call load() first.");
    }

    // Convert to legacy message format (no system role, no images)
    const history: LegacyChatMessage[] = messages
      .filter((m) => m.role !== "system")
      .slice(0, -1)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const lastMsg = messages.at(-1);
    if (!lastMsg) throw new Error("No messages to generate from.");

    return new Promise<string>((resolve, reject) => {
      const worker = this.worker!;
      let accumulated = "";

      const handler = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data;
        if (msg.type === "token") {
          accumulated += msg.token;
          opts.onToken?.(msg.token);
        } else if (msg.type === "done") {
          worker.removeEventListener("message", handler);
          resolve(accumulated);
        } else if (msg.type === "error") {
          worker.removeEventListener("message", handler);
          reject(new Error(msg.error));
        }
      };

      worker.addEventListener("message", handler);

      const generateMsg: WorkerInMessage = {
        type: "generate",
        prompt: lastMsg.content,
        conversationHistory: history,
      };
      worker.postMessage(generateMsg);
    });
  }

  async unload(): Promise<void> {
    this.worker?.terminate();
    this.worker = null;
    this._ready = false;
  }
}
