"use client";

import { useChatEngine } from "@/hooks/useChatEngine";
import { useSession } from "@/hooks/useSession";
import { Header } from "@/components/Header";
import { SessionSidebar } from "@/components/SessionSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { GpuDiagnostics } from "@/components/GpuDiagnostics";
import { BenchmarkPanel } from "@/components/BenchmarkPanel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ChatPage() {
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

  const session = useSession();

  const isLocal    = capabilities?.runsLocally ?? true;
  const isLoading  = status === "loading";
  const isReady    = status === "ready" || status === "generating";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header resolvedEngineId={resolvedEngineId} cloudForImage={usingCloudForImage} />

      <div className="flex flex-1 overflow-hidden">
        <SessionSidebar {...session} className="h-full overflow-hidden" />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Privacy banner */}
            {isReady && (
              isLocal ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-green-800">
                    100% local — funciona sin internet después de la primera carga.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-800">
                    Usando la nube —{" "}
                    <Link href="/settings" className="underline">cambia a local en Config</Link>{" "}
                    para mayor privacidad.
                  </span>
                </div>
              )
            )}

            {/* Load card */}
            {!isReady && (
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Cargar modelo</span>
                    {status === "error" && (
                      <span className="text-xs text-red-600 font-normal">
                        Error — revisa{" "}
                        <Link href="/settings" className="underline">Config</Link>
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Inicializando…</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  <Button
                    onClick={load}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    {isLoading ? "Cargando…" : "Iniciar AULA"}
                  </Button>
                  {!resolvedEngineId && !isLoading && (
                    <p className="text-xs text-muted-foreground">
                      Selecciona el mejor motor para tu hardware.{" "}
                      <Link href="/settings" className="underline">Cambiar en Config</Link>.
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
            <Card>
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

            <p className="text-xs text-center text-muted-foreground">
              Primera carga ≈1.5 GB (local) o zero (nube). Después funciona sin conexión.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
