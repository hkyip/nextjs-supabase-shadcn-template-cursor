import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Production template</p>
          <h1 className="text-4xl font-semibold tracking-tight">Next.js + Vercel + Supabase + shadcn/ui</h1>
        </div>
        <ThemeToggle />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What is ready</CardTitle>
          <CardDescription>
            App Router, SSR-safe Supabase clients, auth proxy entrypoint, env validation, CI, and Cursor rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/new">Create GitHub repo</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
