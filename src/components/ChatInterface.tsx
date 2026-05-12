"use client";

import { useRef, useState, useEffect, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { type ModelStatus, type ChatMessage } from "@/lib/constants";

interface ChatInterfaceProps {
  status: ModelStatus;
  streamedText: string;
  tokensPerSecond: number | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
}

export function ChatInterface({
  status,
  streamedText,
  tokensPerSecond,
  error,
  onGenerate,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastUserMsg, setLastUserMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGenerating = status === "generating";
  const isReady = status === "ready";

  // Auto-scroll to bottom on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  // When generation finishes, commit the streamed response to messages
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
      {/* Message history */}
      <div className="h-[380px] overflow-y-auto rounded-lg border bg-white p-3 space-y-3">
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
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Live: user message being processed */}
        {showLastUser && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-green-600 text-white whitespace-pre-wrap">
              {lastUserMsg}
            </div>
          </div>
        )}

        {/* Live: streaming assistant response */}
        {showStream && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-gray-100 text-gray-800 whitespace-pre-wrap">
              {streamedText}
              <span className="inline-block w-0.5 h-3.5 bg-gray-600 ml-0.5 animate-pulse align-middle" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Tokens/second badge */}
      {tokensPerSecond !== null && (
        <div className="text-xs text-muted-foreground text-right">
          {tokensPerSecond.toFixed(1)} tokens/sec
        </div>
      )}

      {/* Error message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-2 px-3 text-xs text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Input area */}
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
