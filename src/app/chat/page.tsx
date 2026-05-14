"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useChatEngine } from "@/hooks/useChatEngine";
import { useSession } from "@/hooks/useSession";
import { Header } from "@/components/Header";
import { SessionSidebar, SessionDrawer } from "@/components/SessionSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { AchievementToast } from "@/components/AchievementToast";
import { GpuDiagnostics } from "@/components/GpuDiagnostics";
import { BenchmarkPanel } from "@/components/BenchmarkPanel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProgressStore } from "@/store/progressStore";
import { useChatSettingsStore } from "@/store/chatSettingsStore";
import { useT } from "@/hooks/useT";
import Link from "next/link";

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const t = useT();
  const {
    resolvedEngineId,
    status,
    capabilities,
    progress,
    streamedText,
    tokensPerSecond,
    lastTtftMs,
    lastTotalMs,
    error,
    usingCloudForImage,
    load,
    generate,
    abort,
    pendingUserMsg,
  } = useChatEngine();

  const session         = useSession();
  const startSession    = useProgressStore((s) => s.startSession);
  const recordWb        = useProgressStore((s) => s.recordWhiteboardUsed);
  const socratic        = useChatSettingsStore((s) => s.socraticMode);
  const setSocratic     = useChatSettingsStore((s) => s.setSocraticMode);
  const searchParams    = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLocal   = capabilities?.runsLocally ?? true;
  const isLoading = status === "loading";
  const isReady   = status === "ready" || status === "generating";

  // Record session start once engine is ready
  useEffect(() => {
    if (status === "ready") startSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Handle whiteboard query param: ?wb=encodedText or ?wb-cloud=1
  useEffect(() => {
    const wb       = searchParams.get("wb");
    const wbCloud  = searchParams.get("wb-cloud");

    if (wb && status === "ready") {
      const text   = decodeURIComponent(wb);
      const prompt = `El estudiante escribió este problema a mano: ${text}\n\nResuélvelo paso a paso de forma didáctica.`;
      recordWb();
      generate(prompt, undefined, { fromWhiteboard: true });
      // Remove params from URL without navigation
      window.history.replaceState({}, "", "/chat");
    }

    if (wbCloud && status === "ready") {
      const dataUrl = sessionStorage.getItem("aula:wb-image");
      sessionStorage.removeItem("aula:wb-image");
      if (dataUrl) {
        recordWb();
        generate("El estudiante escribió este problema en la pizarra. Por favor léelo y resuélvelo paso a paso.", [dataUrl]);
        window.history.replaceState({}, "", "/chat");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, searchParams]);

  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <Header
        resolvedEngineId={resolvedEngineId}
        cloudForImage={usingCloudForImage}
        onMenuClick={() => setDrawerOpen(true)}
      />

      <SessionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} {...session} />

      <div className="flex flex-1 overflow-hidden">
        <SessionSidebar {...session} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Privacy banner */}
            {isReady && (
              isLocal ? (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-green-800">{t("chat.local100")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2">
                  <span className="flex h-2 w-2 rounded-full bg-aula-blue animate-pulse" />
                  <span className="text-xs font-semibold text-blue-800">
                    {t("chat.cloudBanner")}{" "}
                    <Link href="/settings" className="underline">{t("chat.cloudLink")}</Link>
                  </span>
                </div>
              )
            )}

            {/* Socrático toggle */}
            {isReady && (
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-aula-ink">{t("chat.socraticoToggle")}</p>
                  <p className="text-xs text-aula-ink-soft">{t("settings.socratic.desc")}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={socratic}
                  onClick={() => setSocratic(!socratic)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-aula-blue ${
                    socratic ? "bg-aula-blue" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      socratic ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Load card */}
            {!isReady && (
              <Card className="border-blue-100 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base font-heading">
                    <span>{t("chat.loadModel")}</span>
                    {status === "error" && (
                      <span className="text-xs text-red-600 font-normal">
                        {t("chat.errorRevisa")}{" "}
                        <Link href="/settings" className="underline">{t("nav.settings")}</Link>
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("chat.loading")}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  <Button
                    onClick={load}
                    disabled={isLoading}
                    className="w-full bg-aula-blue hover:bg-aula-blue-dark text-white"
                    size="sm"
                  >
                    {isLoading ? t("chat.loading") : t("chat.startAula")}
                  </Button>
                  {!resolvedEngineId && !isLoading && (
                    <p className="text-xs text-muted-foreground">
                      {t("chat.selectEngine")}{" "}
                      <Link href="/settings" className="underline">{t("chat.changeInConfig")}</Link>.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* GPU diagnostics */}
            <GpuDiagnostics />

            {/* Benchmark (local engines only) */}
            {isLocal && (
              <BenchmarkPanel
                modelStatus={status}
                tokensPerSecond={tokensPerSecond}
                lastTtftMs={lastTtftMs}
                lastTotalMs={lastTotalMs}
                onRun={(p) => generate(p)}
              />
            )}

            {/* Chat */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="pt-4">
                <ChatInterface
                  status={status}
                  streamedText={streamedText}
                  tokensPerSecond={tokensPerSecond}
                  lastTotalMs={lastTotalMs}
                  pendingUserMsg={pendingUserMsg}
                  error={error}
                  onGenerate={generate}
                  onStop={abort}
                />
              </CardContent>
            </Card>

            <p className="text-xs text-center text-aula-ink-soft">{t("chat.memoryNote")}</p>
          </div>
        </main>
      </div>

      <AchievementToast />
    </div>
  );
}
