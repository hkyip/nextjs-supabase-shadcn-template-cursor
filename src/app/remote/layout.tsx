import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forkcast Remote",
  description: "Phone-sized controller that drives the production demo screen.",
};

export default function RemoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {children}
    </div>
  );
}
