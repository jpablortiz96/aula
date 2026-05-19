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
import { Mic, MicOff, Headphones, Volume2, Send, Square, Pencil, Check, Loader2, X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ImageInput } from "@/components/ImageInput";
import { DigitalWhiteboard } from "@/components/pizarra/DigitalWhiteboard";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";
import { useChatSettingsStore } from "@/store/chatSettingsStore";
import { type ModelStatus } from "@/lib/constants";
import { useChatStore, type MessageMeta } from "@/store/chatStore";
import { useProgressStore } from "@/store/progressStore";
import { useAccessibilityStore } from "@/store/accessibilityStore";
import { extractTextFromImage } from "@/lib/ocr/localOcr";
import { generateIllustration } from "@/lib/illustrate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatInterfaceProps {
  status:         ModelStatus;
  streamedText:   string;
  pendingUserMsg: string | null;
  tokensPerSecond:number | null;
  lastTotalMs:    number | null;
  error:          string | null;
  onGenerate:     (prompt: string, images?: string[], meta?: MessageMeta) => void;
  onStop:         () => void;
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssistantBubble({
  content,
  streaming,
  onSpeak,
  onSimplify,
  onIllustrate,
  simplifyLevel,
  meta,
}: {
  content: string;
  streaming?: boolean;
  onSpeak?: () => void;
  onSimplify?: (level: number) => void;
  onIllustrate?: () => Promise<string>;
  simplifyLevel: number;
  meta?: MessageMeta;
}) {
  const t = useT();
  const maxLevel = 3;
  const canSimplify = !streaming && onSimplify && simplifyLevel < maxLevel;

  const [illustration,    setIllustration]    = useState<string | null>(null);
  const [illustrating,    setIllustrating]    = useState(false);
  const [illustrateError, setIllustrateError] = useState<string | null>(null);

  async function handleIllustrate() {
    if (!onIllustrate || illustrating) return;
    setIllustrating(true);
    setIllustrateError(null);
    try {
      const svg = await onIllustrate();
      setIllustration(svg);
    } catch (err) {
      setIllustrateError(err instanceof Error ? err.message : String(err));
    } finally {
      setIllustrating(false);
    }
  }

  return (
    <div className="max-w-[85%]">
      {meta?.simplified && (
        <span className="inline-block text-[10px] font-semibold text-aula-blue bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 mb-1">
          ↓ {t("chatInterface.simplifiedBadge")}
        </span>
      )}
      {meta?.fromWhiteboard && (
        <span className="inline-block text-[10px] font-semibold text-aula-green bg-green-50 border border-green-100 rounded-full px-2 py-0.5 mb-1">
          ✏️ {t("chatInterface.whiteboardBadge")}
        </span>
      )}
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

      {/* Illustration */}
      {illustration && (
        <div className="mt-2 rounded-xl border border-aula-border bg-white p-2 overflow-x-auto">
          <p className="text-[10px] text-aula-ink-soft mb-1">{t("illustrator.badge")}</p>
          <div
            className="w-full"
            dangerouslySetInnerHTML={{ __html: illustration }}
            aria-label={t("illustrator.badge")}
          />
        </div>
      )}
      {illustrateError && (
        <p className="text-[10px] text-aula-red mt-1 ml-1">{t("illustrator.error")}</p>
      )}

      {!streaming && (
        <div className="flex items-center gap-2 mt-1 ml-2 flex-wrap">
          {onSpeak && (
            <button
              onClick={onSpeak}
              className="flex items-center gap-1 text-[11px] text-aula-ink-soft hover:text-aula-blue transition-colors"
              aria-label={t("chatInterface.escuchar")}
            >
              <Volume2 className="w-3 h-3" aria-hidden="true" />
              <span>{t("chatInterface.escuchar")}</span>
            </button>
          )}
          {canSimplify && (
            <button
              onClick={() => onSimplify(simplifyLevel + 1)}
              className="flex items-center gap-1 text-[11px] text-aula-ink-soft hover:text-aula-red transition-colors"
              aria-label={t("chatInterface.noEntendi.level", { level: simplifyLevel + 1 })}
            >
              🤔
              <span>
                {simplifyLevel === 0
                  ? t("chatInterface.noEntendi")
                  : t("chatInterface.noEntendi.level", { level: simplifyLevel + 1 })}
              </span>
            </button>
          )}
          {onIllustrate && !illustration && (
            <button
              onClick={() => { void handleIllustrate(); }}
              disabled={illustrating}
              className="flex items-center gap-1 text-[11px] text-aula-ink-soft hover:text-aula-blue transition-colors disabled:opacity-50"
              aria-label={t("illustrator.button")}
            >
              {illustrating
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Palette className="w-3 h-3" />}
              <span>{illustrating ? t("illustrator.generating") : t("illustrator.button")}</span>
            </button>
          )}
        </div>
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

// ─── OCR confirm UI ───────────────────────────────────────────────────────────

interface OcrConfirmProps {
  text:        string;
  onConfirm:   (text: string) => void;
  onCloudBoost:() => void;
  onCancel:    () => void;
  progress:    number;
  isProcessing:boolean;
}

function OcrConfirmUI({ text, onConfirm, onCloudBoost, onCancel, progress, isProcessing }: OcrConfirmProps) {
  const t = useT();
  const [edited, setEdited] = useState(text);

  // Sync when text changes (new OCR result)
  useEffect(() => setEdited(text), [text]);

  if (isProcessing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-aula-ink-soft">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("chatInterface.ocr.processing")} {progress > 0 ? `${progress}%` : ""}
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
        <p className="text-sm text-aula-red">{t("chatInterface.ocr.empty")}</p>
        <p className="text-xs text-aula-ink-soft">{t("chatInterface.ocr.emptyHint")}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCloudBoost} className="rounded-xl text-aula-blue border-aula-blue/30">
            {t("chatInterface.ocr.cloudBoost")}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} className="rounded-xl">
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-aula-blue/20 bg-blue-50/50 p-4 space-y-2">
      <p className="text-xs font-semibold text-aula-ink-soft">
        {t("chatInterface.ocr.confirm")}
      </p>
      <textarea
        value={edited}
        onChange={(e) => setEdited(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-aula-blue"
        rows={2}
        aria-label={t("chatInterface.ocr.confirm")}
      />
      <p className="text-xs text-aula-ink-soft">{t("chatInterface.ocr.question")}</p>
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => onConfirm(edited)}
          disabled={!edited.trim()}
          className="bg-aula-blue hover:bg-aula-blue-dark text-white rounded-xl gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          {t("chatInterface.ocr.yes")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCloudBoost}
          className="rounded-xl text-aula-ink-soft border-gray-200"
        >
          {t("chatInterface.ocr.cloudBoost")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
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
  const t          = useT();
  const lang       = useI18nStore((s) => s.lang);
  const socratic   = useChatSettingsStore((s) => s.socraticMode);
  const incSimplify= useChatSettingsStore((s) => s.incrementSimplify);
  const simpCount  = useChatSettingsStore((s) => s.simplifyCount);

  const [input,      setInput]     = useState("");
  const [images,     setImages]    = useState<string[]>([]);
  const [handsFree,  setHandsFree] = useState(false);
  const [wbOpen,     setWbOpen]    = useState(false);

  // Per-bubble simplify level map: messageId → level (0=original)
  const [simplifyLevels, setSimplifyLevels] = useState<Record<string, number>>({});

  // OCR state
  const [ocrState,    setOcrState]    = useState<"idle" | "processing" | "confirming">("idle");
  const [ocrText,     setOcrText]     = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const pendingImagesRef = useRef<string[]>([]);
  const pendingPromptRef = useRef<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGenerating   = status === "generating";
  const isReady        = status === "ready";

  const { messages } = useChatStore();
  const deferredStreamText = useDeferredValue(streamedText);

  // Progress store
  const addQuestion         = useProgressStore((s) => s.addQuestion);
  const recordCameraUsed    = useProgressStore((s) => s.recordCameraUsed);
  const recordVoiceUsed     = useProgressStore((s) => s.recordVoiceUsed);
  const recordWbUsed        = useProgressStore((s) => s.recordWhiteboardUsed);
  const checkSimplify       = useProgressStore((s) => s.checkSimplifyCount);
  const recordIllustrator   = useProgressStore((s) => s.recordIllustratorUsed);

  // Accessibility
  const { autoReadTTS, ttsSpeed } = useAccessibilityStore();

  // Voice
  const { speak, supported: ttsSupported } = useSpeechSynthesis(lang, ttsSpeed);
  const { isListening, interimTranscript, supported: sttSupported, start: startListening, stop: stopListening } =
    useSpeechRecognition((final) => setInput((prev) => prev ? `${prev} ${final}` : final), lang);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  // Auto-speak new assistant messages when hands-free or autoReadTTS is on
  const prevMsgCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevMsgCountRef.current === null) { prevMsgCountRef.current = messages.length; return; }
    if ((handsFree || autoReadTTS) && messages.length > prevMsgCountRef.current) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") speak(last.content);
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, handsFree, autoReadTTS, speak]);

  // ── Send logic ───────────────────────────────────────────────────────────────

  async function handleSend(promptOverride?: string) {
    const text = (promptOverride ?? input).trim();
    if (!text || !isReady) return;

    if (images.length > 0) {
      // Run OCR locally first
      pendingPromptRef.current = text;
      pendingImagesRef.current = [...images];
      setInput("");
      setImages([]);
      setOcrProgress(0);
      setOcrText("");
      setOcrState("processing");

      const tesseractLang = lang === "en" ? "eng" : "spa";
      const extracted = await extractTextFromImage(
        pendingImagesRef.current[0]!,
        tesseractLang,
        (pct) => setOcrProgress(pct),
      ).catch(() => "");

      setOcrText(extracted);
      setOcrState("confirming");
      return;
    }

    setInput("");
    setImages([]);
    addQuestion();
    onGenerate(text);
  }

  function handleOcrConfirm(confirmedText: string) {
    const userQ     = pendingPromptRef.current;
    const combined  = userQ
      ? `${lang === "en" ? "Image text:" : "Texto de la imagen:"} ${confirmedText}\n\n${lang === "en" ? "My question:" : "Mi pregunta:"} ${userQ}`
      : confirmedText;

    setOcrState("idle");
    addQuestion();
    recordCameraUsed();
    onGenerate(combined);
  }

  function handleOcrCloudBoost() {
    const imgs = pendingImagesRef.current;
    const text = pendingPromptRef.current;
    setOcrState("idle");
    addQuestion();
    recordCameraUsed();
    onGenerate(text || (lang === "en" ? "Please explain what you see in this image." : "Por favor explica lo que ves en esta imagen."), imgs);
  }

  function handleOcrCancel() {
    setOcrState("idle");
    pendingImagesRef.current = [];
    pendingPromptRef.current = "";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
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

  // ── Simplify logic ────────────────────────────────────────────────────────────

  function handleSimplify(msgId: string, content: string, level: number) {
    const newCount = simpCount + 1;
    incSimplify();
    checkSimplify(newCount);
    setSimplifyLevels((prev) => ({ ...prev, [msgId]: level }));

    const prompts: Record<number, string> = {
      2: lang === "en"
        ? `Explain this more simply, with easier words and an everyday analogy, for someone who got lost: ${content}`
        : `Explica esto más simple, con palabras más fáciles y una analogía cotidiana, para alguien que se perdió: ${content}`,
      3: lang === "en"
        ? `Explain this as simply as possible, like to a child, with a very concrete real-life example.`
        : `Explícalo lo más simple posible, como a un niño, con un ejemplo muy concreto de la vida diaria.`,
    };

    const prompt = prompts[level] ?? prompts[2]!;
    addQuestion();
    onGenerate(prompt, undefined, { simplified: true, simplifyLevel: level });
  }

  // ── Whiteboard handlers ───────────────────────────────────────────────────────

  function handleWbSolve(text: string) {
    setWbOpen(false);
    recordWbUsed();
    addQuestion();
    const prompt = lang === "en"
      ? `The student wrote this problem by hand: ${text}\n\nSolve it step by step in a didactic way.`
      : `El estudiante escribió este problema a mano: ${text}\n\nResuélvelo paso a paso de forma didáctica.`;
    onGenerate(prompt, undefined, { fromWhiteboard: true });
  }

  function handleWbCloudBoost(dataUrl: string) {
    setWbOpen(false);
    addQuestion();
    recordCameraUsed();
    const prompt = lang === "en"
      ? "The student wrote this problem on a whiteboard. Please read and solve it step by step."
      : "El estudiante escribió este problema en la pizarra. Por favor léelo y resuélvelo paso a paso.";
    onGenerate(prompt, [dataUrl]);
  }

  const showStream   = isGenerating && streamedText;
  const showPending  = isGenerating && pendingUserMsg;
  const showThinking = isGenerating && !streamedText;
  const isEmpty      = messages.length === 0 && !showPending;

  const SUGGESTIONS = [
    t("chatInterface.suggestions.0"),
    t("chatInterface.suggestions.1"),
    t("chatInterface.suggestions.2"),
    t("chatInterface.suggestions.3"),
  ];

  return (
    <>
      {/* Whiteboard overlay modal */}
      {wbOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl h-[70vh] flex flex-col">
            <DigitalWhiteboard
              onSolve={handleWbSolve}
              onCancel={() => setWbOpen(false)}
              onCloudBoost={handleWbCloudBoost}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Tok/s badge */}
        <div className="flex items-center justify-between min-h-[26px]">
          {socratic && (
            <span className="text-xs font-semibold text-aula-blue bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
              {t("chatInterface.socraticoMode")}
            </span>
          )}
          <div className="ml-auto">
            <TpsBadge tps={tokensPerSecond} totalMs={lastTotalMs} />
          </div>
        </div>

        {/* Message history */}
        <div
          className="h-[380px] overflow-y-auto rounded-xl border bg-aula-bg p-3 space-y-3"
          role="log"
          aria-live="polite"
          aria-label={t("sidebar.sessions")}
        >
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <p className="text-sm text-aula-ink-soft">
                {isReady ? t("chatInterface.empty.ready") : t("chatInterface.empty.notReady")}
              </p>
              {isReady && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { void handleSend(s); }}
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
                    meta={msg.meta}
                    simplifyLevel={simplifyLevels[msg.id] ?? 0}
                    onSpeak={ttsSupported ? () => speak(msg.content) : undefined}
                    onSimplify={isReady ? (lvl) => handleSimplify(msg.id, msg.content, lvl) : undefined}
                    onIllustrate={isReady ? async () => {
                      recordIllustrator();
                      return generateIllustration(msg.content, lang);
                    } : undefined}
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
              <AssistantBubble
                content={deferredStreamText}
                streaming
                simplifyLevel={0}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-2 px-3 text-xs text-red-700">{error}</CardContent>
          </Card>
        )}

        {/* OCR confirm UI */}
        {ocrState !== "idle" && (
          <OcrConfirmUI
            text={ocrText}
            isProcessing={ocrState === "processing"}
            progress={ocrProgress}
            onConfirm={handleOcrConfirm}
            onCloudBoost={handleOcrCloudBoost}
            onCancel={handleOcrCancel}
          />
        )}

        {/* Input area (hidden while OCR confirm is shown) */}
        {ocrState === "idle" && (
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
                placeholder={isReady ? t("chatInterface.placeholder.ready") : t("chatInterface.placeholder.notReady")}
                disabled={!isReady || isGenerating}
                className="resize-none min-h-[60px] max-h-[120px] flex-1 rounded-xl border-gray-200 focus:border-aula-blue focus:ring-aula-blue/20"
                rows={2}
                aria-label={t("chatInterface.placeholder.ready")}
              />
              {isGenerating ? (
                <Button
                  onClick={onStop}
                  className="bg-aula-red hover:bg-red-700 text-white self-end rounded-xl gap-1"
                  aria-label={t("chatInterface.stop")}
                >
                  <Square className="w-3.5 h-3.5" />
                  {t("chatInterface.stop")}
                </Button>
              ) : (
                <Button
                  onClick={() => { void handleSend(); }}
                  disabled={!isReady || (!input.trim() && images.length === 0)}
                  className="bg-aula-blue hover:bg-aula-blue-dark text-white self-end rounded-xl gap-1"
                  aria-label={t("chatInterface.send")}
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("chatInterface.send")}
                </Button>
              )}
            </div>

            {/* Voice + pizarra controls */}
            <div className="flex gap-1.5 flex-wrap">
              {sttSupported && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMicClick}
                  disabled={isGenerating}
                  className={`gap-1.5 text-xs rounded-full ${isListening ? "border-aula-red text-aula-red bg-red-50" : "border-gray-200 text-aula-ink-soft hover:border-aula-blue hover:text-aula-blue"}`}
                  aria-label={isListening ? t("chatInterface.stopDictado") : t("chatInterface.dictado")}
                  aria-pressed={isListening}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isListening ? t("chatInterface.stopDictado") : t("chatInterface.dictado")}
                </Button>
              )}
              {ttsSupported && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHandsFree((v) => !v)}
                  className={`gap-1.5 text-xs rounded-full ${handsFree ? "border-aula-blue text-aula-blue bg-blue-50" : "border-gray-200 text-aula-ink-soft hover:border-aula-blue hover:text-aula-blue"}`}
                  aria-label={t("chatInterface.manosLibres")}
                  aria-pressed={handsFree}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  {t("chatInterface.manosLibres")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWbOpen(true)}
                disabled={!isReady || isGenerating}
                className="gap-1.5 text-xs rounded-full border-gray-200 text-aula-ink-soft hover:border-aula-blue hover:text-aula-blue"
                aria-label={t("chatInterface.pizarra")}
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("chatInterface.pizarra")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
