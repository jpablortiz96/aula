<div align="center">

# AULA

### The AI tutor that lives in a browser tab.
### Built for the students the internet leaves behind.

[![Gemma 4](https://img.shields.io/badge/Powered_by-Gemma_4-4285F4)](https://ai.google.dev/gemma)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![WebGPU](https://img.shields.io/badge/WebGPU-Local_AI-EA4335)](https://www.w3.org/TR/webgpu/)
[![MIT License](https://img.shields.io/badge/License-MIT-FBBC04)](LICENSE)

[Live demo](#) · [Video walkthrough](#) · [Architecture](#architecture)

<!-- TODO: update Live demo and Video walkthrough links before submission -->

</div>

---

## The problem

40% of Latin American students live in areas with unreliable or no internet connectivity. They cannot use ChatGPT, Gemini, or any cloud-based AI tutor. The tools that could transform their education simply do not work where they live.

## What AULA does

AULA is a complete AI tutor that runs entirely in your browser — no server, no account, no internet required after the first load. A student in a rural school in Colombia can open AULA once (over a school WiFi, a teacher's phone hotspot, or even a USB sync), and then use it permanently offline.

It is powered by **Gemma 4**, Google's open model family, running on-device via WebGPU and MediaPipe.

---

## What works 100% offline (after first load)

Built on **Gemma 4 E2B** running locally in the browser:

- **AI chat tutor** — math, science, language, history. LaTeX rendering, streaming responses at ~15 tokens/sec on a mid-range laptop GPU.
- **Scientific calculator** — students build operations with a visual keypad. Gemma 4 solves and explains step by step.
- **Voice tutoring** — bidirectional. Ask by speaking, listen to the answer. Uses the browser's native Web Speech API.
- **Hands-free mode** — for students with tasks that occupy their hands (sketching, manual work).
- **Socratic mode** — AULA does not give answers, only asks guiding questions. For deep learning.
- **"Explain it simpler"** — three escalating levels of simplification on demand.
- **Conceptual error detection** — when a student answers wrong, Gemma 4 identifies the specific concept they misunderstood.
- **Persistent study sessions** — IndexedDB, no cloud, full history of what the student has worked on.
- **Easy reading mode** — for dyslexia and reading difficulties. Short sentences, simple vocabulary, spaced typography.
- **Accessibility** — high contrast, large text, reduced motion, auto text-to-speech. All persisted.
- **Spanish ↔ English** — fully internationalized UI and model responses.
- **Gamification** — XP, levels, streak, achievements. All local.

---

## What requires Cloud Boost (opt-in, free Google AI Studio key)

For features that demand strict structured output (which is at the edge of what a 2B-parameter model can do reliably), AULA routes to **Gemma 4 26B-A4B** via the official Gemini API:

- **Handwritten whiteboard** — write equations with finger or mouse, Gemma 4 reads and solves.
- **Photo OCR** — point your camera at a printed exercise.
- **Infinite practice** — adaptive exercises that never repeat, with difficulty calibrated to the student's track record.
- **Interactive student quizzes** — self-assessment with scoring and per-error review.
- **Teacher mode** — generate printable quizzes, export to PDF (student version without answers, teacher version with explanations).
- **SVG illustrations** — Gemma 4 draws educational diagrams, viewable in a zoomable lightbox with PNG/SVG download.
- **Mermaid mind maps** — Gemma 4 generates concept maps, rendered interactively with zoom and PNG/SVG download.

> Cloud Boost is **always opt-in**. AULA never sends data to any server without an explicit API key configured by the user. The core educational experience never requires it.

---

## Why Gemma 4

AULA evaluated every variant of Gemma 4 and made deliberate choices for each tier:

| Model | Size | Where it runs | What it powers |
|---|---|---|---|
| **Gemma 4 E2B (it)** | ~1.5 GB (q4f16) | Browser, WebGPU | All local features |
| **Gemma 4 26B-A4B (it)** | Cloud | Gemini API | Structured outputs |

We chose **E2B for local** because it is the only Gemma 4 variant that fits in consumer hardware (works on a Raspberry Pi 5, runs on a mid-range NVIDIA laptop GPU at ~15 tokens/sec) without sacrificing the multimodal capability path. We chose **26B-A4B for cloud** because its mixture-of-experts architecture gives near-31B quality at much lower latency — ideal for short structured outputs like JSON quizzes and SVG illustrations.

---

## Architecture

```
                   ┌──────────────────────────────┐
                   │      AULA in the browser      │
                   └────────────┬─────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
    ┌──────────────────┐                  ┌──────────────────┐
    │  LOCAL ENGINE    │                  │  CLOUD BOOST     │
    │  (default)       │                  │  (opt-in)        │
    │                  │                  │                  │
    │  Gemma 4 E2B     │                  │  Gemma 4 26B-A4B │
    │  via MediaPipe   │                  │  via Gemini API  │
    │  + WebGPU        │                  │                  │
    └────────┬─────────┘                  └────────┬─────────┘
             │                                     │
             ▼                                     ▼
    Chat · Voice · Calculator             Whiteboard · Practice
    Socratic mode · Sessions              Quiz · Teacher · SVG
    Accessibility · Streak                Mind maps · Photo OCR
```

The routing decision is transparent. The user is always told which engine answered (badge "Local" or "Cloud Boost"). They can set a preference in Settings.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript strict |
| AI runtime (local) | `@mediapipe/tasks-genai` with WebGPU delegate |
| AI runtime (cloud) | Gemini API — direct REST, no SDK lock-in |
| UI | Tailwind CSS v4, lucide-react, KaTeX, Mermaid |
| State | Zustand with localStorage persistence |
| Storage | IndexedDB via `idb` for sessions |
| PDF export | jsPDF (client-side, no server) |
| i18n | Custom lightweight context hook, ES + EN |
| OCR | tesseract.js (printed text, local) |
| Voice | Web Speech API (STT + TTS, local) |

---

## Getting started

```bash
git clone https://github.com/jpablortiz96/aula
cd aula
pnpm install
pnpm dev -p 3100
```

Open [http://localhost:3100](http://localhost:3100). On first visit, click **Start AULA** to download Gemma 4 E2B (~1.5 GB, one-time). After that, the app works offline.

To enable Cloud Boost features, get a free API key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and paste it in **Settings**.

---

## Browser support

| Browser | Local AI | Cloud Boost |
|---|---|---|
| Chrome / Edge 113+ with WebGPU | ✅ Full speed | ✅ |
| Firefox / Safari | ⚠️ Slower (CPU fallback) | ✅ |
| Any modern browser | ✅ via Cloud Boost | ✅ |

---

## Mission

Education should not depend on bandwidth. AULA exists because a 14-year-old in rural Boyacá deserves the same quality of tutoring as a student in Bogotá or Boston. With Gemma 4 running locally, this is finally possible.

---

## Roadmap

See [IDEAS_FUTURAS.md](IDEAS_FUTURAS.md).

---

## Acknowledgments

Built for the [DEV.to Gemma 4 Challenge 2026](https://dev.to).

Gemma is a trademark of Google LLC. AULA is an independent project not affiliated with or endorsed by Google.

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
Made with care for students everywhere.<br/>
🇨🇴 From Colombia, for the world.
</div>
