"use client";

import {
  useRef,
  useState,
  useEffect,
  useDeferredValue,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Mic, MicOff, Headphones, Volume2, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ImageInput } from "@/components/ImageInput";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { type ModelStatus } from "@/lib/constants";
import { useChatStore } from "@/store/chatStore";
import { useProgressStore } from "@/store/progressStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatInterfaceProps {
  status: ModelStatus;
  streamedText: string;
  pendingUserMsg: string | null;
  tokensPerSecond: number | null;
  lastTotalMs: number | null;
  error: string | null;
  onGenerate: (prompt: string, images?: string[]) => void;
  onStop: () => void;
}

// ─── Markdown components ──────────────────────────────────────────────────────

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => <h1 className="text-base font-heading font-bold mt-3 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-heading font-bold mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-heading font-semibold mt-2 mb-1">{children}</h3>,
  ul: ({ children }) => <ul className="pl-5 list-disc marker:text-aula-blue space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="pl-5 list-decimal marker:text-aula-blue space-y-0.5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    return isBlock ? (
      <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto my-1">
        {children}
      </code>
    ) : (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
    );
  },
  pre: ({ children }) => <pre className="my-1 overflow-x-auto">{children}</pre>,
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
};

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "¿Qué es la fotosíntesis?",
  "Explícame las Leyes de Newton",
  "¿Cómo se resuelve una ecuación cuadrática?",
  "¿Cuándo fue la Independencia de México?",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssistantBubble({
  content,
  streaming,
  onSpeak,
}: {
  content: string;
  streaming?: boolean;
  onSpeak?: () => void;
}) {
  return (
    <div className="max-w-[85%]">
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-white border border-gray-200 text-aula-ink shadow-sm">
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={MD_COMPONENTS}
        >
          {content}
        </ReactMarkdown>
        {streaming && <span className="aula-cursor" aria-hidden="true" />}
      </div>
      {!streaming && onSpeak && (
        <button
          onClick={onSpeak}
          className="mt-1 ml-3 flex items-center gap-1 text-[11px] text-aula-ink-soft hover:text-aula-blue transition-colors"
          aria-label="Escuchar respuesta"
        >
          <Volume2 className="w-3 h-3" aria-hidden="true" />
          <span>Escuchar</span>
        </button>
      )}
    </div>
  );
}

function UserBubble({ content, images }: { content: string; images?: string[] }) {
  return (
    <div className="max-w-[80%] space-y-1">
      {images && images.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-end">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-aula-blue/30" />
          ))}
        </div>
      )}
      <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed bg-aula-blue text-white whitespace-pre-wrap shadow-sm">
        {content}
      </div>
    </div>
  );
}

function TpsBadge({ tps, totalMs }: { tps: number | null; totalMs: number | null }) {
  if (tps === null) return null;
  const color = tps > 8 ? "text-aula-green" : tps > 3 ? "text-yellow-600" : "text-aula-red";
  const bg    = tps > 8 ? "bg-green-50 border-green-200" : tps > 3 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const totalSec = totalMs !== null ? (totalMs / 1000).toFixed(1) : null;
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-mono ${bg}`}>
      <span className={`font-semibold ${color}`}>{tps.toFixed(1)} tok/s</span>
      {totalSec && <span className="text-aula-ink-soft">· {totalSec}s</span>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatInterface({
  status,
  streamedText,
  pendingUserMsg,
  tokensPerSecond,
  lastTotalMs,
  error,
  onGenerate,
  onStop,
}: ChatInterfaceProps) {
  const [input, setInput]     = useState("");
  const [images, setImages]   = useState<string[]>([]);
  const [handsFree, setHandsFree] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGenerating   = status === "generating";
  const isReady        = status === "ready";

  const { messages } = useChatStore();
  const deferredStreamText = useDeferredValue(streamedText);

  // Progress store
  const addQuestion      = useProgressStore((s) => s.addQuestion);
  const recordCameraUsed = useProgressStore((s) => s.recordCameraUsed);
  const recordVoiceUsed  = useProgressStore((s) => s.recordVoiceUsed);

  // Voice — TTS
  const { speak, supported: ttsSupported } = useSpeechSynthesis();

  // Voice — STT
  const { isListening, interimTranscript, supported: sttSupported, start: startListening, stop: stopListening } =
    useSpeechRecognition((final) => {
      setInput((prev) => (prev ? `${prev} ${final}` : final));
    });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  // Hands-free: auto-speak new assistant messages
  const prevMsgCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevMsgCountRef.current === null) {
      prevMsgCountRef.current = messages.length;
      return;
    }
    if (handsFree && messages.length > prevMsgCountRef.current) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") speak(last.content);
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, handsFree, speak]);

  function handleSend(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || !isReady) return;
    const imgs = images.length > 0 ? [...images] : undefined;
    setInput("");
    setImages([]);
    addQuestion();
    if (imgs && imgs.length > 0) recordCameraUsed();
    onGenerate(text, imgs);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleMicClick() {
    if (isListening) {
      stopListening();
    } else {
      recordVoiceUsed();
      startListening();
    }
  }

  const showStream   = isGenerating && streamedText;
  const showPending  = isGenerating && pendingUserMsg;
  const showThinking = isGenerating && !streamedText;
  const isEmpty      = messages.length === 0 && !showPending;

  return (
    <div className="flex flex-col gap-3">
      {/* Tok/s badge */}
      <div className="flex justify-end min-h-[26px]">
        <TpsBadge tps={tokensPerSecond} totalMs={lastTotalMs} />
      </div>

      {/* Message history */}
      <div className="h-[380px] overflow-y-auto rounded-xl border bg-aula-bg p-3 space-y-3" role="log" aria-live="polite" aria-label="Historial de conversación">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <p className="text-sm text-aula-ink-soft">
              {isReady ? "¿Qué quieres aprender hoy?" : "Carga el modelo y pregunta lo que quieras."}
            </p>
            {isReady && (
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-aula-ink hover:border-aula-blue hover:text-aula-blue transition-colors focus-visible:outline-2 focus-visible:outline-aula-blue"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "system-notice") {
            return (
              <div key={msg.id} className="flex items-center gap-2 my-1" role="status">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-aula-ink-soft whitespace-nowrap px-1">{msg.content}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              className={`flex bubble-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <UserBubble content={msg.content} />
              ) : (
                <AssistantBubble
                  content={msg.content}
                  onSpeak={ttsSupported ? () => speak(msg.content) : undefined}
                />
              )}
            </div>
          );
        })}

        {showPending && (
          <div className="flex justify-end bubble-in">
            <UserBubble content={pendingUserMsg!} />
          </div>
        )}

        {showThinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-gray-200 text-aula-ink-soft flex items-center gap-1.5 shadow-sm">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {showStream && (
          <div className="flex justify-start bubble-in">
            <AssistantBubble content={deferredStreamText} streaming />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-2 px-3 text-xs text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Input area */}
      <div className="flex flex-col gap-2">
        {/* Image attachments */}
        <ImageInput images={images} onChange={setImages} disabled={!isReady || isGenerating} />

        {/* STT interim preview */}
        {interimTranscript && (
          <p className="text-xs text-aula-blue italic px-1">{interimTranscript}…</p>
        )}

        {/* Textarea + Send/Stop */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isReady
                ? "Pregunta a AULA… (Enter envía, Shift+Enter nueva línea)"
                : "Carga el modelo primero…"
            }
            disabled={!isReady || isGenerating}
            className="resize-none min-h-[60px] max-h-[120px] flex-1 rounded-xl border-gray-200 focus:border-aula-blue focus:ring-aula-blue/20"
            rows={2}
            aria-label="Mensaje para AULA"
          />
          {isGenerating ? (
            <Button
              onClick={onStop}
              className="bg-aula-red hover:bg-red-700 text-white self-end rounded-xl gap-1"
              aria-label="Detener generación"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={() => handleSend()}
              disabled={!isReady || !input.trim()}
              className="bg-aula-blue hover:bg-aula-blue-dark text-white self-end rounded-xl gap-1"
              aria-label="Enviar mensaje"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </Button>
          )}
        </div>

        {/* Voice controls */}
        {(sttSupported || ttsSupported) && (
          <div className="flex gap-1.5 flex-wrap">
            {sttSupported && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMicClick}
                disabled={isGenerating}
                className={`gap-1.5 text-xs rounded-full ${isListening ? "border-aula-red text-aula-red bg-red-50" : "border-gray-200 text-aula-ink-soft hover:border-aula-blue hover:text-aula-blue"}`}
                aria-label={isListening ? "Detener dictado" : "Iniciar dictado por voz"}
                aria-pressed={isListening}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isListening ? "Detener" : "Dictado"}
              </Button>
            )}
            {ttsSupported && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHandsFree((v) => !v)}
                className={`gap-1.5 text-xs rounded-full ${handsFree ? "border-aula-blue text-aula-blue bg-blue-50" : "border-gray-200 text-aula-ink-soft hover:border-aula-blue hover:text-aula-blue"}`}
                aria-label="Modo manos libres"
                aria-pressed={handsFree}
              >
                <Headphones className="w-3.5 h-3.5" />
                Manos libres
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
