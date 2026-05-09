"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Camera,
  ChefHat,
  Drumstick,
  Flame,
  LayoutDashboard,
  Leaf,
  LineChart,
  Settings,
  Utensils,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/production", label: "Production", icon: ChefHat },
  { href: "/fry-kitchen", label: "Fry kitchen", icon: LineChart },
  { href: "/chicken-spit", label: "Chicken spit", icon: Drumstick },
  { href: "/tahini", label: "Tahini's", icon: Utensils },
  { href: "/st-louis-wings", label: "St. Louis Wings", icon: Flame },
  { href: "/salade-prep", label: "Salade prep", icon: Leaf },
  { href: "/camera", label: "Camera", icon: Camera },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/config", label: "Config", icon: Settings },
] as const;

export function DemoNav() {
  const pathname = usePathname();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <LayoutDashboard className="size-5 text-emerald-600" />
          <span className="text-base font-bold tracking-tight">Forkcast</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hover:bg-accent hover:text-accent-foreground flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted-foreground hidden text-xs sm:inline-flex">
          Store #142 — Downtown
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
