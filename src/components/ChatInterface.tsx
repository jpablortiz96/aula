"use client";

import { useRef, useState, useEffect, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { type ModelStatus, type ChatMessage } from "@/lib/constants";

interface ChatInterfaceProps {
  status: ModelStatus;
  streamedText: string;
  tokensPerSecond: number | null;
  lastTotalMs: number | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
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
      {streaming && (
        <span className="inline-block w-0.5 h-3.5 bg-gray-600 ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  );
}

function Tpsbadge({ tps, totalMs }: { tps: number | null; totalMs: number | null }) {
  if (tps === null) return null;

  const color =
    tps > 8 ? "text-green-600" : tps > 3 ? "text-yellow-600" : "text-red-600";
  const bg =
    tps > 8 ? "bg-green-50 border-green-200" : tps > 3 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
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
  tokensPerSecond,
  lastTotalMs,
  error,
  onGenerate,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastUserMsg, setLastUserMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGenerating = status === "generating";
  const isReady = status === "ready";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  const prevStreamRef = useRef("");
  useEffect(() => {
    if (
      !isGenerating &&
      streamedText &&
      streamedText !== prevStreamRef.current &&
      lastUserMsg !== null
    ) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: lastUserMsg },
        { role: "assistant", content: streamedText },
      ]);
      setLastUserMsg(null);
      prevStreamRef.current = streamedText;
    }
  }, [isGenerating, streamedText, lastUserMsg]);

  function handleSend() {
    if (!input.trim() || !isReady) return;
    const prompt = input.trim();
    setInput("");
    setLastUserMsg(prompt);
    prevStreamRef.current = "";
    onGenerate(prompt);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const showStream = isGenerating && streamedText;
  const showLastUser = isGenerating && lastUserMsg;

  return (
    <div className="flex flex-col gap-3">
      {/* Tok/s badge — upper right, always visible when we have data */}
      <div className="flex justify-end min-h-[26px]">
        <Tpsbadge tps={tokensPerSecond} totalMs={lastTotalMs} />
      </div>

      {/* Message history */}
      <div className="h-[360px] overflow-y-auto rounded-lg border bg-white p-3 space-y-3">
        {messages.length === 0 && !showLastUser && (
          <p className="text-center text-sm text-muted-foreground mt-16">
            Load the model above, then ask anything.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-green-600 text-white whitespace-pre-wrap">
                {msg.content}
              </div>
            ) : (
              <AssistantBubble content={msg.content} />
            )}
          </div>
        ))}

        {showLastUser && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-green-600 text-white whitespace-pre-wrap">
              {lastUserMsg}
            </div>
          </div>
        )}

        {showStream && (
          <div className="flex justify-start">
            <AssistantBubble content={streamedText} streaming />
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
        <Button
          onClick={handleSend}
          disabled={!isReady || isGenerating || !input.trim()}
          className="bg-green-600 hover:bg-green-700 text-white self-end"
        >
          {isGenerating ? "…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
