import Link from "next/link";
import { AulaLogo } from "@/components/AulaLogo";

const FEATURES = [
  { icon: "📸", title: "Aprende desde fotos", desc: "Sube una imagen de tu tarea y AULA te explica paso a paso." },
  { icon: "🎤", title: "Voz bidireccional",   desc: "Dicta tu pregunta y escucha la respuesta — sin escribir." },
  { icon: "📚", title: "Sesiones guardadas",  desc: "Todas tus conversaciones quedan en tu dispositivo, sin servidor." },
  { icon: "👩‍🏫", title: "Modo Profesor",       desc: "Genera quizzes listos para imprimir en segundos." },
];

const PILLARS = [
  { emoji: "🌐", label: "Sin internet",  sub: "después del primer uso" },
  { emoji: "🔒", label: "Sin cuenta",    sub: "nunca te pedimos datos" },
  { emoji: "⚡", label: "Sin servidor",  sub: "corre en tu navegador"  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      {/* ── Nav strip ────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b">
        <AulaLogo size="md" />
        <nav className="flex items-center gap-4 text-sm font-medium text-aula-ink-soft">
          <Link href="/teacher" className="hover:text-aula-ink transition-colors">Profesor</Link>
          <Link href="/logros"  className="hover:text-aula-ink transition-colors">Logros</Link>
          <Link href="/settings" className="hover:text-aula-ink transition-colors">Config</Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="w-full max-w-2xl px-6 pt-16 pb-10 text-center space-y-6">
          <div className="space-y-3">
            <AulaLogo size="lg" />
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-aula-ink leading-snug">
              Tu tutor de IA<br className="hidden sm:block" /> que vive en tu navegador
            </h2>
            <p className="text-aula-ink-soft text-base max-w-md mx-auto">
              Potenciado por Gemma 4, completamente offline después del primer uso.
              Sin cuenta, sin servidor, sin datos enviados a ningún lado.
            </p>
          </div>

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-aula-blue px-8 py-3.5 text-white font-semibold text-base hover:bg-aula-blue-dark transition-colors shadow-md shadow-blue-200 focus-visible:outline-2 focus-visible:outline-aula-blue"
          >
            Comenzar a estudiar →
          </Link>

          {/* Pillars */}
          <div className="flex items-center justify-center gap-6 flex-wrap pt-2">
            {PILLARS.map((p) => (
              <div key={p.label} className="flex items-center gap-1.5 text-sm text-aula-ink-soft">
                <span>{p.emoji}</span>
                <span className="font-semibold text-aula-ink">{p.label}</span>
                <span className="hidden sm:inline">— {p.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature cards ──────────────────────────────────────── */}
        <section
          className="w-full max-w-2xl px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 gap-4"
          aria-label="Funcionalidades"
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-3xl">{f.icon}</span>
              <p className="font-heading font-bold text-aula-ink">{f.title}</p>
              <p className="text-sm text-aula-ink-soft leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="text-center text-xs text-aula-ink-soft py-4 border-t bg-white">
        Built for the DEV.to Gemma 4 Challenge · Mayo 2026
      </footer>
    </div>
  );
}
