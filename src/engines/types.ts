export type EngineId = "mediapipe" | "cloud-boost" | "legacy-onnx";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  /** Base64 data URLs for multimodal input */
  images?: string[];
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  onToken?: (token: string) => void;
}

export interface EngineCapabilities {
  supportsMultimodal: boolean;
  supportsStreaming: boolean;
  requiresApiKey: boolean;
  runsLocally: boolean;
}

export interface ChatEngine {
  readonly id: EngineId;
  readonly displayName: string;
  readonly capabilities: EngineCapabilities;
  isReady(): Promise<boolean>;
  load(onProgress?: (p: number) => void): Promise<void>;
  generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string>;
  unload?(): Promise<void>;
}
