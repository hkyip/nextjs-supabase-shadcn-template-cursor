import Link from "next/link";
import { Clock, Flame, TrendingDown, Zap } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VALUE_PROPS = [
  {
    icon: TrendingDown,
    title: "Cut Waste by 30%",
    description: "AI learns your patterns and stops you from over-frying. Less food in the bin, more profit on the line.",
  },
  {
    icon: Zap,
    title: "40 Seconds Faster",
    description:
      "Food is ready when orders hit. Customers get hot, fresh product without the wait.",
  },
  {
    icon: Clock,
    title: "5-Minute Lookahead",
    description:
      "Forecasts demand one cook-cycle ahead so your fryer output matches incoming orders perfectly.",
  },
] as const;

const STEPS = [
  { step: "1", title: "Connect POS", description: "Plug into your existing point-of-sale system. Setup takes minutes." },
  { step: "2", title: "AI Analyzes", description: "The model watches order patterns, time of day, weather, and events." },
  { step: "3", title: "Drop on Cue", description: "Your station screen tells you exactly what to fry and when." },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Flame className="size-6 text-orange-500" />
          <span className="text-lg font-bold tracking-tight">FryQ</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild>
            <Link href="/station">Try the Demo</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
          <Flame className="size-4 text-orange-500" />
          AI-powered demand forecasting
        </div>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Never Fry Blind Again
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Know exactly what to drop in the fryer — and when. FryQ forecasts demand one cook-cycle ahead so food is fresh, fast, and never wasted.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/station">Open Fry Station</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/shift">View Shift Overview</Link>
          </Button>
        </div>

        {/* Mock station preview */}
        <div className="mt-8 w-full max-w-2xl rounded-xl border bg-card p-6 text-left shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Drop Now
            </p>
            <p className="text-xs text-muted-foreground">Demand in 5 min</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { name: "Chicken Tenders", qty: 10, unit: "pcs" },
              { name: "Fries (Large)", qty: 6, unit: "bags" },
              { name: "Onion Rings", qty: 8, unit: "pcs" },
            ].map((item) => (
              <div
                key={item.name}
                className="rounded-lg border-2 border-orange-500/30 bg-orange-500/5 p-4 text-center"
              >
                <p className="text-3xl font-bold">{item.qty}</p>
                <p className="text-xs text-muted-foreground">
                  {item.unit}
                </p>
                <p className="mt-1 text-sm font-medium">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t bg-muted/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            Why Operators Love FryQ
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {VALUE_PROPS.map((prop) => (
              <Card key={prop.title}>
                <CardHeader>
                  <prop.icon className="mb-2 size-8 text-orange-500" />
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
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-t bg-muted/50 px-6 py-16">
        <blockquote className="mx-auto max-w-2xl text-center">
          <p className="text-lg italic text-muted-foreground">
            &ldquo;FryQ is like a crystal ball for our fryer station — we prep just the right amount and cut waste by a third.&rdquo;
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
          <Link href="/station">Try the Demo</Link>
        </Button>
      </footer>
    </div>
  );
}
