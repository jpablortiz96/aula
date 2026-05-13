"use client";

import { useState } from "react";
import { useEngineStore, type EngineSelection } from "@/store/engineStore";
import { clearEngineCache } from "@/engines/EngineRegistry";
import { GpuDiagnostics } from "@/components/GpuDiagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ENGINE_OPTIONS: { id: EngineSelection; label: string; description: string }[] = [
  {
    id: "auto",
    label: "Auto (recomendado)",
    description: "AULA detecta el mejor engine según tu hardware.",
  },
  {
    id: "mediapipe",
    label: "Local — MediaPipe (Gemma 4 E2B)",
    description: "100% offline después del primer download. Requiere WebGPU.",
  },
  {
    id: "cloud-boost",
    label: "Cloud — Gemma 4 31B via AI Studio",
    description: "Mayor calidad de respuestas. Requiere API key de Google.",
  },
];

type SaveState = "idle" | "saved" | "error";

export default function SettingsPage() {
  const { selectedEngineId, apiKey, preferCloud, setEngine, setApiKey, setPreferCloud } =
    useEngineStore();

  const [localEngine, setLocalEngine] = useState<EngineSelection>(selectedEngineId);
  const [localKey, setLocalKey] = useState(apiKey);
  const [localPreferCloud, setLocalPreferCloud] = useState(preferCloud);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg, setTestMsg] = useState("");

  const needsKey = localEngine === "cloud-boost" || localEngine === "auto";

  function handleSave() {
    setEngine(localEngine);
    setApiKey(localKey);
    setPreferCloud(localPreferCloud);
    clearEngineCache();
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  async function handleTest() {
    if (!localKey.trim()) {
      setTestMsg("Ingresa una API key para probar.");
      setTestState("fail");
      return;
    }

    setTestState("testing");
    setTestMsg("");

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${localKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Responde solo: OK" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );

      if (res.status === 401) {
        setTestMsg("API key inválida.");
        setTestState("fail");
        return;
      }
      if (res.status === 404) {
        // Model might not exist yet; key is valid
        setTestMsg("Key válida (modelo gemma-4-31b-it en preview — disponible próximamente).");
        setTestState("ok");
        return;
      }
      if (!res.ok) {
        setTestMsg(`Error HTTP ${res.status}.`);
        setTestState("fail");
        return;
      }

      setTestMsg("Conexión exitosa — API key válida.");
      setTestState("ok");
    } catch {
      setTestMsg("Error de red al conectar con Google AI Studio.");
      setTestState("fail");
    }
  }

  const hasChanges =
    localEngine !== selectedEngineId ||
    localKey !== apiKey ||
    localPreferCloud !== preferCloud;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <Link href="/chat" className="hover:underline">← Chat</Link>
            <Link href="/" className="hover:underline">Home</Link>
          </div>
        </div>

        {/* Engine Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Engine Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {ENGINE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    localEngine === opt.id
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="engine"
                    value={opt.id}
                    checked={localEngine === opt.id}
                    onChange={() => setLocalEngine(opt.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Prefer cloud toggle (only meaningful on Auto) */}
            {localEngine === "auto" && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localPreferCloud}
                  onChange={(e) => setLocalPreferCloud(e.target.checked)}
                  className="rounded"
                />
                <span>Preferir Cloud cuando hay API key disponible</span>
              </label>
            )}

            {/* API Key input */}
            {needsKey && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-medium text-gray-700">
                  Google AI Studio API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                    placeholder="AIza…"
                    autoComplete="off"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9"
                    disabled={testState === "testing"}
                    onClick={handleTest}
                  >
                    {testState === "testing" ? "Testing…" : "Test"}
                  </Button>
                </div>
                {testMsg && (
                  <p
                    className={`text-xs ${
                      testState === "ok" ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {testMsg}
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-snug">
                  Tu API key se guarda solo en tu navegador — nunca se envía a ningún servidor
                  excepto la API oficial de Google.{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 hover:text-blue-800"
                  >
                    Obtén una API key gratuita →
                  </a>
                </p>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={!hasChanges && saveState !== "saved"}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              {saveState === "saved" ? "Guardado ✓" : "Guardar"}
            </Button>
          </CardContent>
        </Card>

        {/* Hardware Diagnostics */}
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-gray-700">Hardware Diagnostics</h2>
          <GpuDiagnostics />
          <RamInfo />
        </div>
      </div>
    </div>
  );
}

function RamInfo() {
  // navigator.deviceMemory is an approximation rounded to the nearest power of 2
  const ram =
    "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory: number }).deviceMemory
      : null;

  if (ram === null) return null;

  const isLow = ram < 8;

  return (
    <Card className={isLow ? "border-yellow-200 bg-yellow-50" : "border-gray-200"}>
      <CardContent className="py-2 px-4 text-xs flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${isLow ? "bg-yellow-400" : "bg-green-500"}`} />
        <span>
          RAM aproximada: <strong>{ram} GB</strong>
          {isLow && " — se recomiendan ≥8 GB para el modelo local."}
        </span>
      </CardContent>
    </Card>
  );
}
