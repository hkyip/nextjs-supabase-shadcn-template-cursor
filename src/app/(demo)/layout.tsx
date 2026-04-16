import { DemoNav } from "@/components/demo-nav";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
        Forkcast V0 Demo — mock data, no live connection
      </footer>
    </div>
  );
}
