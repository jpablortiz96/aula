"use client";

import { useState } from "react";
import {
  Calculator,
  FlaskConical,
  BookOpen,
  Landmark,
  Layers,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type StudySession } from "@/lib/db";
import { type UseSessionReturn } from "@/hooks/useSession";

const SUBJECT_ICON: Record<StudySession["subject"], React.ReactNode> = {
  math:     <Calculator  className="w-3.5 h-3.5" />,
  science:  <FlaskConical className="w-3.5 h-3.5" />,
  language: <BookOpen    className="w-3.5 h-3.5" />,
  history:  <Landmark    className="w-3.5 h-3.5" />,
  other:    <Layers      className="w-3.5 h-3.5" />,
};

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

interface Props extends UseSessionReturn {
  className?: string;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  createNewSession,
  loadSession,
  removeSession,
  className = "",
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (collapsed) {
    return (
      <aside className={`flex flex-col items-center py-3 w-10 border-r bg-white shrink-0 ${className}`}>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => setCollapsed(false)}
          title="Abrir sesiones"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className={`flex flex-col w-56 border-r bg-white shrink-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Sesiones
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={createNewSession}
            title="Nueva sesión"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => setCollapsed(true)}
            title="Colapsar"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {sessions.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8 px-3">
            Sin sesiones. Empieza una nueva.
          </p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
              activeSessionId === session.id
                ? "bg-green-50 border-l-2 border-green-500"
                : "border-l-2 border-transparent"
            }`}
            onClick={() => { void loadSession(session.id); }}
          >
            <span className="mt-0.5 text-gray-400 shrink-0">
              {SUBJECT_ICON[session.subject]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{session.title}</p>
              <p className="text-[10px] text-gray-400">{relativeDate(session.updatedAt)}</p>
            </div>
            {confirmDelete === session.id ? (
              <button
                className="shrink-0 text-[10px] text-red-600 hover:text-red-800 font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  void removeSession(session.id);
                  setConfirmDelete(null);
                }}
              >
                ¿Sí?
              </button>
            ) : (
              <button
                className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(session.id);
                  setTimeout(() => setConfirmDelete(null), 3000);
                }}
                title="Eliminar sesión"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={createNewSession}
        >
          <Plus className="w-3 h-3" />
          Nueva sesión
        </Button>
      </div>
    </aside>
  );
}
