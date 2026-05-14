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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type StudySession } from "@/lib/db";
import { type UseSessionReturn } from "@/hooks/useSession";

// ─── Subject config ───────────────────────────────────────────────────────────

const SUBJECT_CONFIG: Record<
  StudySession["subject"],
  { icon: React.ReactNode; color: string; bg: string }
> = {
  math:     { icon: <Calculator   className="w-3.5 h-3.5" />, color: "text-aula-blue",   bg: "bg-blue-50"   },
  science:  { icon: <FlaskConical className="w-3.5 h-3.5" />, color: "text-aula-green",  bg: "bg-green-50"  },
  language: { icon: <BookOpen     className="w-3.5 h-3.5" />, color: "text-aula-red",    bg: "bg-red-50"    },
  history:  { icon: <Landmark     className="w-3.5 h-3.5" />, color: "text-aula-yellow", bg: "bg-yellow-50" },
  other:    { icon: <Layers       className="w-3.5 h-3.5" />, color: "text-aula-ink-soft",bg: "bg-gray-100" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// ─── Session item ─────────────────────────────────────────────────────────────

function SessionItem({
  session,
  isActive,
  onLoad,
  onDelete,
}: {
  session: StudySession;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cfg = SUBJECT_CONFIG[session.subject];

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onLoad(); }}
      className={`group relative flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-aula-blue rounded-none ${
        isActive
          ? "bg-blue-50 border-l-[3px] border-aula-blue"
          : "border-l-[3px] border-transparent hover:bg-gray-50"
      }`}
      onClick={onLoad}
      aria-current={isActive ? "true" : undefined}
    >
      {/* Subject icon */}
      <span
        className={`mt-0.5 shrink-0 w-6 h-6 flex items-center justify-center rounded-md ${cfg.bg} ${cfg.color}`}
        aria-hidden="true"
      >
        {cfg.icon}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-aula-ink truncate">{session.title}</p>
        <p className="text-[10px] text-aula-ink-soft">{relativeDate(session.updatedAt)}</p>
      </div>

      {confirmDelete ? (
        <button
          className="shrink-0 text-[10px] text-red-600 hover:text-red-800 font-bold"
          aria-label="Confirmar eliminación"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setConfirmDelete(false);
          }}
        >
          ¿Sí?
        </button>
      ) : (
        <button
          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity focus-visible:opacity-100"
          aria-label="Eliminar sesión"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

interface SidebarContentProps extends UseSessionReturn {
  onClose?: () => void;
}

function SidebarContent({
  sessions,
  activeSessionId,
  createNewSession,
  loadSession,
  removeSession,
  onClose,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <span className="text-xs font-bold text-aula-ink-soft uppercase tracking-widest">
          Sesiones
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-aula-ink-soft hover:text-aula-blue"
            onClick={createNewSession}
            title="Nueva sesión"
            aria-label="Nueva sesión"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-aula-ink-soft hover:text-aula-ink"
              onClick={onClose}
              title="Cerrar"
              aria-label="Cerrar panel de sesiones"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0" role="list" aria-label="Sesiones de estudio">
        {sessions.length === 0 ? (
          <p className="text-xs text-aula-ink-soft text-center mt-10 px-4 leading-relaxed">
            Sin sesiones aún.<br />¡Empieza una nueva!
          </p>
        ) : (
          sessions.map((session) => (
            <div role="listitem" key={session.id}>
              <SessionItem
                session={session}
                isActive={activeSessionId === session.id}
                onLoad={() => { void loadSession(session.id); }}
                onDelete={() => { void removeSession(session.id); }}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5 border-aula-blue/30 text-aula-blue hover:bg-blue-50"
          onClick={createNewSession}
        >
          <Plus className="w-3 h-3" />
          Nueva sesión
        </Button>
      </div>
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

interface Props extends UseSessionReturn {
  className?: string;
}

export function SessionSidebar({ className = "", ...sessionProps }: Props) {
  return (
    <aside
      className={`hidden md:flex flex-col w-56 border-r bg-white shrink-0 ${className}`}
      aria-label="Panel de sesiones"
    >
      <SidebarContent {...sessionProps} />
    </aside>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

interface DrawerProps extends UseSessionReturn {
  open: boolean;
  onClose: () => void;
}

export function SessionDrawer({ open, onClose, ...sessionProps }: DrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Panel de sesiones"
      >
        <SidebarContent {...sessionProps} onClose={onClose} />
      </aside>
    </>
  );
}
