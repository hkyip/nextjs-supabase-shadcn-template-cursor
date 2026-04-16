"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Camera, ChefHat, LayoutDashboard } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/production", label: "Production", icon: ChefHat },
  { href: "/camera", label: "Camera", icon: Camera },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
] as const;

export function DemoNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <LayoutDashboard className="size-5 text-emerald-600" />
          <span className="text-base font-bold tracking-tight">Forkcast</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:inline-flex">
          Store #142 — Downtown
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
