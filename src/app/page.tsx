import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-white px-6">
      <main className="max-w-lg w-full text-center space-y-8">
        {/* Logo / wordmark */}
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-gray-900">
            AULA
          </h1>
          <p className="text-lg text-gray-500 font-medium">
            The AI tutor that lives in a browser tab
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { emoji: "🌐", label: "No internet", sub: "after first load" },
            { emoji: "🔒", label: "No account", sub: "ever" },
            { emoji: "⚡", label: "No server", sub: "WebGPU on-device" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border bg-gray-50 p-3 space-y-1"
            >
              <div className="text-2xl">{item.emoji}</div>
              <div className="font-semibold text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 items-center">
          <Link
            href="/spike"
            className="inline-flex items-center gap-2 rounded-full bg-green-600 px-8 py-3 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            Try the technical spike →
          </Link>
          <p className="text-xs text-gray-400">
            Loads Gemma 4 E4B (≈3 GB) once, then works fully offline.
          </p>
        </div>

        {/* Hackathon badge */}
        <p className="text-xs text-gray-400 border-t pt-4">
          Built for the DEV.to Gemma 4 Challenge · May 2026
        </p>
      </main>
    </div>
  );
}
