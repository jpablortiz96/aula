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
import { Mic, MicOff, Headphones, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ImageInput } from "@/components/ImageInput";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { type ModelStatus } from "@/lib/constants";
import { useChatStore } from "@/store/chatStore";

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

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
  ul: ({ children }) => <ul className="pl-5 list-disc marker:text-green-600 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="pl-5 list-decimal marker:text-green-600 space-y-0.5">{children}</ol>,
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
      <div className="rounded-xl px-3 py-2 text-sm leading-relaxed bg-gray-100 text-gray-800">
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
          className="mt-0.5 ml-2 flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Volume2 className="w-3 h-3" />
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
            <img key={i} src={src} alt="" className="w-16 h-16 rounded object-cover border border-green-300" />
          ))}
        </div>
      )}
      <div className="rounded-xl px-3 py-2 text-sm leading-relaxed bg-green-600 text-white whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

function TpsBadge({ tps, totalMs }: { tps: number | null; totalMs: number | null }) {
  if (tps === null) return null;
  const color = tps > 8 ? "text-green-600" : tps > 3 ? "text-yellow-600" : "text-red-600";
  const bg    = tps > 8 ? "bg-green-50 border-green-200" : tps > 3 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const totalSec = totalMs !== null ? (totalMs / 1000).toFixed(1) : null;
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-mono ${bg}`}>
      <span className={`font-semibold ${color}`}>{tps.toFixed(1)} tok/s</span>
      {totalSec && <span className="text-gray-500">· {totalSec}s</span>}
    </div>
  );
}

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
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [handsFree, setHandsFree] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGenerating = status === "generating";
  const isReady = status === "ready";

  const { messages } = useChatStore();
  const deferredStreamText = useDeferredValue(streamedText);

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

  function handleSend() {
    if (!input.trim() || !isReady) return;
    const prompt = input.trim();
    const imgs = images.length > 0 ? [...images] : undefined;
    setInput("");
    setImages([]);
    onGenerate(prompt, imgs);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const showStream   = isGenerating && streamedText;
  const showPending  = isGenerating && pendingUserMsg;
  const showThinking = isGenerating && !streamedText;

  return (
    <div className="flex flex-col gap-3">
      {/* Tok/s badge */}
      <div className="flex justify-end min-h-[26px]">
        <TpsBadge tps={tokensPerSecond} totalMs={lastTotalMs} />
      </div>

      {/* Message history */}
      <div className="h-[360px] overflow-y-auto rounded-lg border bg-white p-3 space-y-3">
        {messages.length === 0 && !showPending && (
          <p className="text-center text-sm text-muted-foreground mt-16">
            Carga el modelo y pregunta lo que quieras.
          </p>
        )}

        {messages.map((msg) => {
          if (msg.role === "system-notice") {
            return (
              <div key={msg.id} className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 whitespace-nowrap px-1">{msg.content}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
          <div className="flex justify-end">
            <UserBubble content={pendingUserMsg!} />
          </div>
        )}

        {showThinking && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 bg-gray-100 text-gray-400 flex items-center gap-1.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {showStream && (
          <div className="flex justify-start">
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
          <p className="text-xs text-blue-500 italic px-1">{interimTranscript}…</p>
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
            className="resize-none min-h-[60px] max-h-[120px] flex-1"
            rows={2}
          />
          {isGenerating ? (
            <Button onClick={onStop} className="bg-red-500 hover:bg-red-600 text-white self-end">
              Stop
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!isReady || !input.trim()}
              className="bg-green-600 hover:bg-green-700 text-white self-end"
            >
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
                onClick={isListening ? stopListening : startListening}
                disabled={isGenerating}
                className={`gap-1.5 text-xs ${isListening ? "border-red-300 text-red-600 bg-red-50" : ""}`}
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
                className={`gap-1.5 text-xs ${handsFree ? "border-blue-300 text-blue-700 bg-blue-50" : ""}`}
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
