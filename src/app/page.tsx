import Link from "next/link";
import { BarChart3, ChefHat, Clock, LayoutDashboard, ShieldCheck, TrendingDown } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VALUE_PROPS = [
  {
    icon: TrendingDown,
    title: "Reduce Waste 30%+",
    description:
      "AI forecasts demand and coaches operators in real time so you never overproduce.",
  },
  {
    icon: Clock,
    title: "Always Fresh, Always Fast",
    description:
      "Hold-time tracking ensures customers get fresh food and staff know exactly when to cook more.",
  },
  {
    icon: ShieldCheck,
    title: "Food Safety Built In",
    description:
      "Automated hold-time enforcement prevents violations before they happen.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Forecast",
    description:
      "The system predicts demand using sales history, weather, events, and real-time POS velocity.",
  },
  {
    step: "2",
    title: "Cook",
    description:
      "Operators see exactly what to cook and when. Camera, voice, or tap to start.",
  },
  {
    step: "3",
    title: "Hold & Track",
    description:
      "Every batch gets a live hold timer. Color-coded urgency keeps food safe and fresh.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-6 text-emerald-600" />
          <span className="text-lg font-bold tracking-tight">Forkcast</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild>
            <Link href="/production">Try the Demo</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
          <ChefHat className="size-4 text-emerald-600" />
          Real-time production management
        </div>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Cook Smarter, Waste Less
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Forkcast manages the full food lifecycle — from forecasting what to
          cook, through active cooking, hot holding, and disposal — all on one
          screen.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/production">Open Production Screen</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">
              <BarChart3 className="mr-2 size-4" />
              View Dashboard
            </Link>
          </Button>
        </div>

        {/* Mini preview */}
        <div className="mt-8 w-full max-w-3xl rounded-xl border bg-card p-6 text-left shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Production Workflow
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "What to Cook", count: "16 pcs", sub: "Original Chicken", color: "border-red-500/30 bg-red-500/5" },
              { label: "In Progress", count: "2 batches", sub: "Cooking now", color: "border-blue-500/30 bg-blue-500/5" },
              { label: "Being Held", count: "19 units", sub: "4 batches", color: "border-green-500/30 bg-green-500/5" },
              { label: "Waste", count: "$1.05", sub: "3 portions", color: "border-red-500/30 bg-red-500/5" },
            ].map((col) => (
              <div
                key={col.label}
                className={`rounded-lg border-2 p-4 text-center ${col.color}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </p>
                <p className="mt-2 text-2xl font-bold">{col.count}</p>
                <p className="text-xs text-muted-foreground">{col.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t bg-muted/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            Why Operators Choose Forkcast
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {VALUE_PROPS.map((prop) => (
              <Card key={prop.title}>
                <CardHeader>
                  <prop.icon className="mb-2 size-8 text-emerald-600" />
                  <CardTitle>{prop.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {prop.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-t bg-muted/50 px-6 py-16">
        <blockquote className="mx-auto max-w-2xl text-center">
          <p className="text-lg italic text-muted-foreground">
            &ldquo;Forkcast is like having a production coach on the line —
            we prep the right amount, food stays fresh, and waste dropped by
            a third.&rdquo;
          </p>
          <footer className="mt-4 text-sm font-medium">
            — Demo Store Manager, Store&nbsp;#142
          </footer>
        </blockquote>
      </section>

      {/* Footer CTA */}
      <footer className="border-t px-6 py-10 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          This is a demo with mock data. No real POS connection required.
        </p>
        <Button asChild size="lg">
          <Link href="/production">Try the Demo</Link>
        </Button>
      </footer>
    </div>
  );
}
