import Link from "next/link";

const VALUE_PROPS = [
  { label: "Sin internet",   sub: "después del primer uso",  emoji: "🌐" },
  { label: "Sin cuenta",     sub: "nunca",                   emoji: "🔒" },
  { label: "Sin servidor",   sub: "WebGPU en tu dispositivo", emoji: "⚡" },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-white px-6">
      <main className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-gray-900">AULA</h1>
          <p className="text-lg text-gray-500 font-medium">
            Tu tutor de IA que vive en el navegador
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          {VALUE_PROPS.map((item) => (
            <div key={item.label} className="rounded-xl border bg-gray-50 p-3 space-y-1">
              <div className="text-2xl">{item.emoji}</div>
              <div className="font-semibold text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="text-left space-y-2 rounded-xl border bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Funcionalidades
          </p>
          {[
            "Resuelve tareas desde foto (multimodal)",
            "Voz bidireccional — dicta y escucha respuestas",
            "Sesiones de estudio guardadas localmente",
            "Modo Profesor — generador de quizzes",
          ].map((feat) => (
            <div key={feat} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 items-center">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-green-600 px-8 py-3 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            Comenzar a estudiar →
          </Link>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/teacher" className="hover:text-gray-600 hover:underline">
              Modo Profesor
            </Link>
            <span>·</span>
            <Link href="/settings" className="hover:text-gray-600 hover:underline">
              Configuración
            </Link>
            <span>·</span>
            <Link href="/spike" className="hover:text-gray-600 hover:underline">
              Demo técnico
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-400 border-t pt-4">
          Built for the DEV.to Gemma 4 Challenge · Mayo 2026
        </p>
      </main>
    </div>
  );
}
