"use client";

import { useRef, useState, useEffect, useDeferredValue, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { type ModelStatus } from "@/lib/constants";
import { useChatStore } from "@/store/chatStore";

interface ChatInterfaceProps {
  status: ModelStatus;
  streamedText: string;
  pendingUserMsg: string | null;
  tokensPerSecond: number | null;
  lastTotalMs: number | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
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

function AssistantBubble({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-gray-100 text-gray-800">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={MD_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
      {streaming && <span className="aula-cursor" aria-hidden="true" />}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-green-600 text-white whitespace-pre-wrap">
      {content}
    </div>
  );
}

function TpsBadge({ tps, totalMs }: { tps: number | null; totalMs: number | null }) {
  if (tps === null) return null;

  const color = tps > 8 ? "text-green-600" : tps > 3 ? "text-yellow-600" : "text-red-600";
  const bg = tps > 8 ? "bg-green-50 border-green-200" : tps > 3 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const totalSec = totalMs !== null ? (totalMs / 1000).toFixed(1) : null;

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-mono ${bg}`}>
      <span className={`font-semibold ${color}`}>{tps.toFixed(1)} tok/s</span>
      {totalSec && <span className="text-gray-500">· Last: {totalSec}s total</span>}
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGenerating = status === "generating";
  const isReady = status === "ready";

  // Persistent chat history from store (survives engine switches)
  const { messages } = useChatStore();

  // De-prioritize expensive markdown re-render during streaming
  const deferredStreamText = useDeferredValue(streamedText);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  function handleSend() {
    if (!input.trim() || !isReady) return;
    const prompt = input.trim();
    setInput("");
    onGenerate(prompt);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const showStream = isGenerating && streamedText;
  const showPending = isGenerating && pendingUserMsg;
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
            Load the model above, then ask anything.
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
                <AssistantBubble content={msg.content} />
              )}
            </div>
          );
        })}

        {/* Pending user message (not yet committed to history) */}
        {showPending && (
          <div className="flex justify-end">
            <UserBubble content={pendingUserMsg!} />
          </div>
        )}

        {/* Thinking indicator — visible before first token arrives */}
        {showThinking && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 bg-gray-100 text-gray-400 flex items-center gap-1.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {/* Live streaming assistant bubble */}
        {showStream && (
          <div className="flex justify-start">
            <AssistantBubble content={deferredStreamText} streaming />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-2 px-3 text-xs text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isReady
              ? "Ask AULA anything… (Enter to send, Shift+Enter for newline)"
              : "Load the model first…"
          }
          disabled={!isReady || isGenerating}
          className="resize-none min-h-[60px] max-h-[120px]"
          rows={2}
        />
        {isGenerating ? (
          <Button
            onClick={onStop}
            className="bg-red-500 hover:bg-red-600 text-white self-end"
          >
            Stop
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!isReady || !input.trim()}
            className="bg-green-600 hover:bg-green-700 text-white self-end"
          >
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
