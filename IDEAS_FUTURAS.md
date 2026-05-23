# AULA Roadmap

This document tracks ideas identified during development of AULA v1
that did not fit the hackathon timeline. They reflect the natural
evolution of the platform.

## v1.1 — Polish + Distribution

- **PWA installation prompt** with offline manifest and pre-cached
  Gemma 4 E2B model in the Cache API. First-load reduced from ~45 sec
  to instant after install.
- **USB-deployable bundle** — a packaged version teachers can copy
  to multiple laptops in a school without re-downloading the 1.5 GB
  model on each device. Critical for rural school deployments.
- **PDF export of chat sessions** — students convert their entire
  study history into a printable notebook.
- **Custom subject packs** — pre-configured topic templates
  (Algebra I, Biology basic, History of Colombia) that pre-seed
  AULA's prompt context for better domain-specific behavior.

## v1.2 — Pedagogical depth

- **Weekly study plan** — AULA reads the IndexedDB session history
  and generates a calendar of suggested review topics based on what
  the student practiced and where they struggled.
- **Concept dependency graph** — AULA proactively suggests
  prerequisite topics. If a student is failing fractions, AULA
  reviews division first.
- **Spaced repetition for vocabulary** — for language learning,
  AULA implements an SM-2 style algorithm using local storage.
- **Exam simulator** — timed practice tests with realistic exam
  conditions for state-level testing.

## v2.0 — Visual learning

- **Live Mermaid diagram editing** — students modify generated
  mind maps interactively, not just view them.
- **Animated explanations** — AULA generates SVG animations for
  concepts like wave propagation, cell division, planetary motion.
  All client-side, no video files.
- **Hand-drawn-style illustrations** — alternative to clean SVG
  for younger students who relate better to sketched figures.
- **Audio narration of mind maps** — automatic walkthrough of a
  generated diagram, node by node, in the student's language.

## v2.0 — Multimodal expansion

- **Gemma 3n audio mode** — students record themselves explaining
  a concept, Gemma 3n (the only Gemma variant currently supporting
  in-browser audio input) evaluates fluency and accuracy. Useful
  for language learning and oral exam preparation.
- **Real-time camera math** — point camera at a notebook, Gemma 4
  follows along as the student writes, offering corrections
  proactively.
- **Sign language support** — for deaf students, AULA renders all
  responses as sign language video clips (precomputed or rendered
  via avatar libraries).

## v3.0 — Platform and community

- **Multi-device sync** — opt-in, end-to-end encrypted. The cloud
  is a backup, never a dependency.
- **Peer-to-peer session sharing** — students export a session as
  a QR code or file, another student imports it. Knowledge spreads
  without servers.
- **Teacher dashboard** — analytics on which topics their students
  struggle with most, fully on-device (no per-student tracking
  leaves the teacher's machine).
- **Curriculum standards integration** — pre-packed AULA bundles
  for Colombia (MEN), Mexico (SEP), Argentina (federal), Peru
  (MINEDU), aligned to local educational frameworks.

## v3.0 — Beyond Latin America

- **Localization expansion** — Portuguese for Brazil, French for
  francophone Africa, Quechua and Guaraní for indigenous
  communities, Mandarin for rural China.
- **Curriculum partnerships** — work with UNESCO and ministries
  of education to embed AULA in national digital education
  programs.

---

> Each item in this roadmap exists because a real student or
> teacher would benefit from it. AULA is open source — pull
> requests welcome.
