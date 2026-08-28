import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/auth");
  return (
    <AppShell user={profile}>
      {/* Nunca deixa o usuário ver tela branca após autenticar */}
      <ErrorBoundary title="Não foi possível carregar esta área">{children}</ErrorBoundary>
    </AppShell>
  );
}
