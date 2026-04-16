import { DemoNav } from "@/components/demo-nav";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
        Demo with mock data — no real POS connection
      </footer>
    </div>
  );
}
