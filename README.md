# AULA — The AI tutor that lives in a browser tab

> No server. No account. No internet (after first load).  
> Built for the 40% of LATAM students without reliable connectivity.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Gemma 4](https://img.shields.io/badge/Gemma_4-E4B-4285F4?logo=google)
![WebGPU](https://img.shields.io/badge/WebGPU-enabled-orange)
![PWA](https://img.shields.io/badge/PWA-offline--first-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## What it does

AULA runs Gemma 4 E4B entirely in your browser using WebGPU — no API keys, no
servers, no data leaving your device. Students download the model once (~3 GB),
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
│                     Gemma 4 E4B-IT (q4f16)      │
│                     cached in IndexedDB         │
└─────────────────────────────────────────────────┘
         ↑ zero network requests after first load
```

---

## Why Gemma 4 E4B specifically

| Model | Size | WebGPU viable | Quality | Notes |
|---|---|---|---|---|
| Gemma 4 E2B | ~1.5 GB | ✅ Yes | ⚠️ Limited | Too weak for complex explanations |
| **Gemma 4 E4B** | **~3 GB** | **✅ Yes** | **✅ Good** | **Sweet spot: fits 6 GB VRAM, strong reasoning** |
| Gemma 4 27B MoE | ~15 GB | ❌ No | ✅ Excellent | Too large for most consumer GPUs |
| Gemma 4 31B | ~18 GB | ❌ No | ✅ Excellent | Requires server-side inference |

E4B is the largest model that reliably fits in the 6 GB VRAM of mainstream
discrete GPUs (GTX 1060, RX 580) while still delivering coherent multi-turn
explanations — the minimum bar for a credible tutor.

---

## Tech stack

- **Next.js 16** — App Router, TypeScript strict mode
- **@huggingface/transformers v4** — ONNX Runtime Web with WebGPU backend
- **Gemma 4 E4B-IT ONNX** (`q4f16` quantization, ~3 GB)
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

Open `http://localhost:3000`, navigate to `/spike`, click **Load Gemma 4 E4B**.
The first load downloads ~3 GB and caches it in the browser. Subsequent loads
are instant.

**Verify it's truly local:** Open DevTools → Network tab, filter by XHR/Fetch.
After the initial model download, there should be zero requests during chat.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx           # Landing
│   └── spike/page.tsx     # Technical validation spike
├── components/
│   ├── ModelLoader.tsx    # Download progress UI
│   └── ChatInterface.tsx  # Streaming chat UI
├── hooks/
│   └── useGemmaWorker.ts  # Worker communication hook
├── lib/
│   └── constants.ts       # Typed message protocol
└── workers/
    └── gemma.worker.ts    # Off-thread inference
```

---

## Submission context

> Built for the **DEV.to Gemma 4 Challenge** (May 2026).  
> This repository is the Day 1–2 validation spike. Feature development
> (subject tracking, spaced repetition, PWA offline shell) follows in Phases 2–4.

---

## License

MIT © 2026
