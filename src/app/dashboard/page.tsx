import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl px-6 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Protected pages, data loaders, and app-specific features can start here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add server-side loaders, role checks, and feature modules by domain.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
