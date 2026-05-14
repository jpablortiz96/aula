"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENGINE_DISPLAY } from "@/engines/EngineRegistry";
import type { EngineId } from "@/engines/types";

interface HeaderProps {
  resolvedEngineId?: EngineId | null;
  cloudForImage?: boolean;
}

export function Header({ resolvedEngineId, cloudForImage }: HeaderProps) {
  const pathname = usePathname();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-xs transition-colors hover:text-gray-900 ${
        pathname === href ? "text-gray-900 font-semibold" : "text-gray-400"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b bg-white shrink-0">
      <div className="flex items-center gap-2.5">
        <Link href="/" className="text-lg font-black tracking-tight text-gray-900">
          AULA
        </Link>
        {resolvedEngineId && (
          <span className="text-[11px] font-mono bg-gray-100 border px-1.5 py-0.5 rounded text-gray-500">
            {cloudForImage ? "Cloud Boost · imagen" : ENGINE_DISPLAY[resolvedEngineId]}
          </span>
        )}
      </div>
      <nav className="flex items-center gap-4">
        {navLink("/chat", "Chat")}
        {navLink("/teacher", "Profesor")}
        {navLink("/settings", "Config")}
      </nav>
    </header>
  );
}
