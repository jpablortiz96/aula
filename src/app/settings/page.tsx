"use client";

import { useState } from "react";
import { useEngineStore, type EngineSelection } from "@/store/engineStore";
import { clearEngineCache } from "@/engines/EngineRegistry";
import { GpuDiagnostics } from "@/components/GpuDiagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18nStore, type Lang } from "@/store/i18nStore";
import { useChatSettingsStore } from "@/store/chatSettingsStore";
import { useAccessibilityStore, type TextSize, type TtsSpeed } from "@/store/accessibilityStore";
import { useT } from "@/hooks/useT";
import Link from "next/link";

type SaveState = "idle" | "saved";

export default function SettingsPage() {
  const t = useT();

  const { selectedEngineId, apiKey, preferCloud, setEngine, setApiKey, setPreferCloud } =
    useEngineStore();
  const { lang, setLang }      = useI18nStore();
  const { socraticMode, setSocraticMode } = useChatSettingsStore();
  const {
    easyReading, setEasyReading,
    textSize, setTextSize,
    highContrast, setHighContrast,
    reduceMotion, setReduceMotion,
    autoReadTTS, setAutoReadTTS,
    ttsSpeed, setTtsSpeed,
  } = useAccessibilityStore();

  const [localEngine,      setLocalEngine]      = useState<EngineSelection>(selectedEngineId);
  const [localKey,         setLocalKey]         = useState(apiKey);
  const [localPreferCloud, setLocalPreferCloud] = useState(preferCloud);
  const [saveState,        setSaveState]        = useState<SaveState>("idle");
  const [testState,        setTestState]        = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg,          setTestMsg]          = useState("");

  const needsKey = localEngine === "cloud-boost" || localEngine === "auto";

  const ENGINE_OPTIONS: { id: EngineSelection; label: string; description: string }[] = [
    { id: "auto",        label: "Auto (recomendado)", description: "AULA detecta el mejor engine según tu hardware." },
    { id: "mediapipe",   label: "Local — MediaPipe (Gemma 4 E2B)", description: "100% offline después del primer download. Requiere WebGPU." },
    { id: "cloud-boost", label: "Cloud — Gemma 4 26B via AI Studio", description: "Mayor calidad de respuestas. Requiere API key de Google." },
  ];

  function handleSave() {
    setEngine(localEngine);
    setApiKey(localKey);
    setPreferCloud(localPreferCloud);
    clearEngineCache();
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  async function handleTest() {
    if (!localKey.trim()) { setTestMsg(t("settings.engine.testFail.empty")); setTestState("fail"); return; }
    setTestState("testing");
    setTestMsg("");

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${localKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Responde solo: OK" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );
      if (res.status === 401) { setTestMsg(t("settings.engine.testFail.invalid")); setTestState("fail"); return; }
      if (res.status === 404) { setTestMsg(t("settings.engine.testOk.preview")); setTestState("ok"); return; }
      if (!res.ok) { setTestMsg(`HTTP ${res.status}`); setTestState("fail"); return; }
      setTestMsg(t("settings.engine.testOk"));
      setTestState("ok");
    } catch {
      setTestMsg(t("settings.engine.testFail.network"));
      setTestState("fail");
    }
  }

  const hasChanges = localEngine !== selectedEngineId || localKey !== apiKey || localPreferCloud !== preferCloud;

  const LANG_OPTIONS: { value: Lang; label: string; native: string }[] = [
    { value: "es", label: "Español", native: "Español" },
    { value: "en", label: "English", native: "English" },
  ];

  return (
    <div className="min-h-screen bg-aula-bg p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-aula-ink tracking-tight">{t("settings.title")}</h1>
          <div className="flex gap-3 text-xs text-aula-ink-soft">
            <Link href="/chat" className="hover:text-aula-ink hover:underline">{t("settings.back")}</Link>
            <Link href="/"    className="hover:text-aula-ink hover:underline">{t("settings.home")}</Link>
          </div>
        </div>

        {/* Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">{t("settings.language.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    lang === opt.value
                      ? "border-aula-blue bg-blue-50 text-aula-blue"
                      : "border-gray-200 text-aula-ink-soft hover:bg-gray-50"
                  }`}
                  aria-pressed={lang === opt.value}
                >
                  {opt.native}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Socrático mode */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-heading font-semibold text-aula-ink">{t("settings.socratic.title")}</p>
                <p className="text-xs text-aula-ink-soft mt-0.5">{t("settings.socratic.desc")}</p>
              </div>
              <button
                role="switch"
                aria-checked={socraticMode}
                onClick={() => setSocraticMode(!socraticMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-aula-blue ${
                  socraticMode ? "bg-aula-blue" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    socraticMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">{t("settings.accessibility.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label={t("settings.accessibility.easyReading")}
              desc={t("settings.accessibility.easyReading.desc")}
              checked={easyReading}
              onChange={setEasyReading}
            />
            <ToggleRow
              label={t("settings.accessibility.highContrast")}
              desc={t("settings.accessibility.highContrast.desc")}
              checked={highContrast}
              onChange={setHighContrast}
            />
            <ToggleRow
              label={t("settings.accessibility.reduceMotion")}
              desc={t("settings.accessibility.reduceMotion.desc")}
              checked={reduceMotion}
              onChange={setReduceMotion}
            />

            {/* Text size */}
            <div>
              <p className="text-sm font-medium text-aula-ink mb-2">{t("settings.accessibility.textSize")}</p>
              <div className="flex gap-2">
                {(["normal", "large", "xl"] as TextSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setTextSize(size)}
                    aria-pressed={textSize === size}
                    className={`flex-1 rounded-xl border py-1.5 text-sm font-medium transition-colors ${
                      textSize === size
                        ? "border-aula-blue bg-blue-50 text-aula-blue"
                        : "border-gray-200 text-aula-ink-soft hover:bg-gray-50"
                    }`}
                  >
                    {t(`settings.accessibility.textSize.${size}`)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TTS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">{t("settings.tts.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label={t("settings.tts.autoRead")}
              desc=""
              checked={autoReadTTS}
              onChange={setAutoReadTTS}
            />
            <div>
              <p className="text-sm font-medium text-aula-ink mb-2">{t("settings.tts.speed")}</p>
              <div className="flex gap-2">
                {(["slow", "normal", "fast"] as TtsSpeed[]).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setTtsSpeed(speed)}
                    aria-pressed={ttsSpeed === speed}
                    className={`flex-1 rounded-xl border py-1.5 text-sm font-medium transition-colors ${
                      ttsSpeed === speed
                        ? "border-aula-blue bg-blue-50 text-aula-blue"
                        : "border-gray-200 text-aula-ink-soft hover:bg-gray-50"
                    }`}
                  >
                    {t(`settings.tts.speed.${speed}`)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engine Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">{t("settings.engine.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {ENGINE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    localEngine === opt.id
                      ? "border-aula-blue bg-blue-50"
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

            {localEngine === "auto" && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localPreferCloud}
                  onChange={(e) => setLocalPreferCloud(e.target.checked)}
                  className="rounded"
                />
                <span>{t("settings.engine.preferCloud")}</span>
              </label>
            )}

            {needsKey && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-medium text-gray-700">{t("settings.engine.keyLabel")}</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                    placeholder="AIza…"
                    autoComplete="off"
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-aula-blue"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9 rounded-xl"
                    disabled={testState === "testing"}
                    onClick={() => { void handleTest(); }}
                  >
                    {testState === "testing" ? t("settings.engine.testing") : t("settings.engine.test")}
                  </Button>
                </div>
                {testMsg && (
                  <p className={`text-xs ${testState === "ok" ? "text-green-700" : "text-red-700"}`}>
                    {testMsg}
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-snug">
                  {t("settings.engine.keyHint")}{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-aula-blue hover:text-aula-blue-dark"
                  >
                    {t("settings.engine.keyLink")}
                  </a>
                </p>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={!hasChanges && saveState !== "saved"}
              className="w-full bg-aula-blue hover:bg-aula-blue-dark text-white rounded-xl"
              size="sm"
            >
              {saveState === "saved" ? t("common.saved") : t("common.save")}
            </Button>
          </CardContent>
        </Card>

        {/* System & performance — collapsible */}
        <details className="group bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors list-none">
            🔧 {t("settings.system.title")}
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100">
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-aula-ink-soft uppercase tracking-wide">{t("settings.hardware.title")}</h3>
              <GpuDiagnostics />
              <RamInfo />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-aula-ink">{label}</p>
        {desc && <p className="text-xs text-aula-ink-soft mt-0.5">{desc}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-aula-blue ${
          checked ? "bg-aula-blue" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function RamInfo() {
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
