# AULA — The AI tutor that lives in a browser tab

> No server. No account. No internet (after first load).  
> Built for the 40% of LATAM students without reliable connectivity.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Gemma 4](https://img.shields.io/badge/Gemma_4-E2B%20%2F%2031B-4285F4?logo=google)
![WebGPU](https://img.shields.io/badge/WebGPU-enabled-orange)
![PWA](https://img.shields.io/badge/PWA-offline--first-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## What it does

AULA gives every LATAM student a personal AI tutor that works **without internet** after
the first download. It auto-selects the best inference engine for your hardware:

- **Local:** Gemma 4 E2B running in-browser via MediaPipe + WebGPU — zero data leaves your device.
- **Cloud Boost:** Gemma 4 31B via Google AI Studio — for hardware without GPU, using your own free API key.

---

## Why this exists

> **40% of households in Colombia lack stable internet access** (DANE, 2023).
> Every cloud-based AI tutor fails them at the most critical moment: exam prep
> night, when the connection drops.

---

## Architecture: Dual Engine

```
┌────────────────────────────────────────────┐
│  Engine A: MediaPipe + Gemma 4 E2B (local) │
│  → 100% offline after first download       │
│  → Multimodal (vision + audio)             │
│  → Optimized by Google for edge devices    │
└────────────────────────────────────────────┘
         OR (auto-selected by AULA)
┌────────────────────────────────────────────┐
│  Engine B: Google AI Studio + Gemma 4 31B  │
│  → Cloud-boosted reasoning                 │
│  → Opt-in with user's free API key         │
│  → Falls back gracefully if no GPU         │
└────────────────────────────────────────────┘
The user never picks. AULA detects hardware and chooses.
```

### Why two engines?

Real talk: `transformers.js` on NVIDIA Optimus laptops gave 2 tok/s — unusable.
**MediaPipe is Google's purpose-built runtime for Gemma.** Real shipping > ideology.
The ONNX Web engine is kept as a last-resort fallback (`/spike`) while MediaPipe
stabilizes.

---

## How it works

```
┌─────────────────────────────────────────────────┐
│                   Browser Tab                   │
│                                                 │
│  Main Thread          MediaPipe / CloudBoost    │
│  ──────────           ──────────────────────    │
│  React UI    ←─────── onToken callback          │
│      │                    │                     │
│      └──── generate() ───→ Engine A or B        │
│                                │                │
│                     Engine A: WASM + WebGPU     │
│                     Engine B: fetch + SSE       │
│                                │                │
│                     Gemma 4 E2B (local)         │
│                     or Gemma 4 31B (cloud)      │
└─────────────────────────────────────────────────┘
         ↑ zero network requests after first load (local)
```

---

## Why Gemma 4 E2B for local

> "If it can run on $80 hardware, it can run in a rural Colombian school."

| Hardware | Tokens/sec |
|---|---|
| Raspberry Pi 5 (8 GB) | 7.2 |
| MacBook M3 | 20–25 |
| Windows + RTX 3050+ | 25–40 |
| Mid-range Pixel phone | 5–8 |

E2B fits in the 2–4 GB VRAM of mainstream laptops — including Chromebooks with GPU.
E4B spills to shared memory on 6 GB GPUs → 1–2 tok/s. Not good enough.

---

## Tech stack

- **Next.js 16** — App Router, TypeScript strict mode
- **MediaPipe Tasks GenAI** — Google's official Gemma runtime for the web
- **Google AI Studio API** — Cloud Boost fallback (user's own key, free tier)
- **ONNX Web + transformers.js** — Legacy fallback (kept at `/spike`)
- **Web Worker** — legacy inference never blocks the UI thread
- **zustand** — engine selection state
- **Tailwind CSS v4** + **shadcn/ui** — component library
- **Vercel** — static hosting (zero serverless functions)

---

## Run locally

**Prerequisites:** Node.js 18+, pnpm, Chrome 121+ or Edge (for WebGPU + `adapter.info`)

```bash
git clone https://github.com/jpablortiz96/aula
cd aula
pnpm install
pnpm dev
```

- `/chat` — main interface (auto-selects engine)
- `/settings` — choose engine, paste API key
- `/spike` — legacy ONNX Web validation spike

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Landing
│   ├── chat/page.tsx             # Main chat (dual engine)
│   ├── settings/page.tsx         # Engine settings + API key
│   └── spike/page.tsx            # Legacy ONNX spike (kept for comparison)
├── engines/
│   ├── types.ts                  # ChatEngine interface
│   ├── EngineRegistry.ts         # Auto-detection + display names
│   ├── mediapipe/                # Engine A: MediaPipe LLM Inference
│   ├── cloud-boost/              # Engine B: Google AI Studio streaming
│   └── legacy/                   # Engine C: ONNX Web (transformers.js)
├── components/
│   ├── ChatInterface.tsx         # Streaming chat with markdown + LaTeX
│   ├── GpuDiagnostics.tsx        # WebGPU adapter info
│   └── BenchmarkPanel.tsx        # Inference benchmark with run history
├── hooks/
│   ├── useChatEngine.ts          # Unified hook (all engines)
│   └── useGemmaWorker.ts         # @deprecated — legacy only
├── store/
│   └── engineStore.ts            # zustand: engine selection + API key
└── lib/
    └── constants.ts              # Model config + worker message types
```

---

## Submission context

> Built for the **DEV.to Gemma 4 Challenge** (May 2026).

---

## License

MIT © 2026
