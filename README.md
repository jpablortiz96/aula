# AULA — The AI tutor that lives in a browser tab

> No server. No account. No internet (after first load).  
> Built for the 40% of LATAM students without reliable connectivity.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Gemma 4](https://img.shields.io/badge/Gemma_4-E2B-4285F4?logo=google)
![WebGPU](https://img.shields.io/badge/WebGPU-enabled-orange)
![PWA](https://img.shields.io/badge/PWA-offline--first-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## What it does

AULA runs Gemma 4 E2B entirely in your browser using WebGPU — no API keys, no
servers, no data leaving your device. Students download the model once (~1.5 GB),
then get a personal AI tutor that works in classrooms, homes, and buses with
zero connectivity.

---

## Why this exists

> **40% of households in Colombia lack stable internet access** (DANE, 2023).
> Every cloud-based AI tutor fails them at the most critical moment: exam prep
> night, when the connection drops.

---

## How it works

```
┌─────────────────────────────────────────────────┐
│                   Browser Tab                   │
│                                                 │
│  Main Thread          Web Worker                │
│  ──────────           ──────────────────────    │
│  React UI    ←─────── postMessage (tokens)      │
│      │                    │                     │
│      └──── postMessage ──→ @huggingface/        │
│            (generate)      transformers.js      │
│                                │                │
│                          ONNX Runtime Web       │
│                                │                │
│                          WebGPU (GPU shader)    │
│                                │                │
│                     Gemma 4 E2B-IT (q4f16)      │
│                     cached in OPFS              │
└─────────────────────────────────────────────────┘
         ↑ zero network requests after first load
```

---

## Why Gemma 4 E2B specifically

> "If it can run on $80 hardware, it can run in a rural Colombian school."

| Model | Size | WebGPU viable | Notes |
|---|---|---|---|
| **Gemma 4 E2B** | **~1.5 GB** | **✅ Yes** | **Sweet spot: fits any modern GPU, runs on Raspberry Pi 5** |
| Gemma 4 E4B | ~3 GB | ✅ Yes | Spills to shared memory on 6 GB VRAM → 1–2 tok/s |
| Gemma 4 27B MoE | ~15 GB | ❌ No | Too large for consumer GPUs |
| Gemma 4 31B | ~18 GB | ❌ No | Requires server-side inference |

### Real-world performance (E2B, q4f16, WebGPU)

| Hardware | Tokens/sec |
|---|---|
| Raspberry Pi 5 (8 GB) | 7.2 |
| MacBook M3 | 20–25 |
| Windows + RTX 3050+ | 25–40 |
| Mid-range Pixel phone | 5–8 |

E2B is the largest model that **reliably runs on edge hardware** — from a $80
Raspberry Pi 5 to mainstream laptops — while delivering coherent multi-turn
explanations. The minimum bar for a credible tutor that works everywhere.

---

## Tech stack

- **Next.js 16** — App Router, TypeScript strict mode
- **@huggingface/transformers v4** — ONNX Runtime Web with WebGPU backend
- **Gemma 4 E2B-IT ONNX** (`q4f16` quantization, ~1.5 GB)
- **Web Worker** — inference never blocks the UI thread
- **Tailwind CSS v4** + **shadcn/ui** — component library
- **idb** — IndexedDB wrapper for local persistence
- **Vercel** — static hosting (zero serverless functions)

---

## Run locally

**Prerequisites:** Node.js 18+, pnpm, a browser with WebGPU support
(Chrome 113+ / Edge 113+ recommended).

```bash
git clone https://github.com/your-username/aula
cd aula
pnpm install
pnpm dev
```

Open `http://localhost:3000`, navigate to `/spike`, click **Load Gemma 4 E2B**.
The first load downloads ~1.5 GB and caches it in the browser. Subsequent loads
are instant.

**Verify it's truly local:** Open DevTools → Network tab, filter by XHR/Fetch.
After the initial model download, there should be zero requests during chat.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Landing
│   └── spike/page.tsx        # Technical validation spike
├── components/
│   ├── ModelLoader.tsx       # Download progress UI
│   ├── ChatInterface.tsx     # Streaming chat UI with markdown + LaTeX
│   ├── GpuDiagnostics.tsx    # WebGPU adapter info panel
│   └── BenchmarkPanel.tsx    # Inference benchmark with run history
├── hooks/
│   └── useGemmaWorker.ts     # Worker communication hook
├── lib/
│   └── constants.ts          # Typed message protocol + model config
└── workers/
    └── gemma.worker.ts       # Off-thread inference
```

---

## Submission context

> Built for the **DEV.to Gemma 4 Challenge** (May 2026).  
> This repository is the Day 1–2 validation spike. Feature development
> (subject tracking, spaced repetition, PWA offline shell) follows in Phases 2–4.

---

## License

MIT © 2026
