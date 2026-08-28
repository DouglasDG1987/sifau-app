"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  Home,
  PlusCircle,
  HardHat,
  FileText,
  LayoutDashboard,
  Menu,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Profile, UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  main?: boolean;
}

const NAV: Record<UserRole, NavItem[]> = {
  cidadao: [
    { href: "/app/minhas-ocorrencias", label: "Início", icon: Home, main: true },
    { href: "/app/nova-ocorrencia", label: "Nova ocorrência", icon: PlusCircle, main: true },
  ],
  fiscal: [
    { href: "/app/fiscal", label: "Início", icon: Home, main: true },
    { href: "/app/fiscal/os", label: "Ordens de Serviço", icon: FileText, main: true },
    { href: "/app/fiscal/vistoria", label: "Vistoria em campo", icon: HardHat, main: true },
  ],
  gestor: [
    { href: "/app/gestor", label: "Dashboard", icon: LayoutDashboard, main: true },
    { href: "/app/gestor/os", label: "Ordens de Serviço", icon: FileText, main: true },
    { href: "/app/gestor/os/nova", label: "Nova OS", icon: PlusCircle },
  ],
  auditor: [{ href: "/app/auditor", label: "Auditoria", icon: ShieldCheck, main: true }],
};

function Logo({
  small = false,
  href,
}: {
  small?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        small ? "min-h-11" : "min-h-12"
      )}
      aria-label="Ir para a página inicial do SIFAU"
    >
      <div className={cn("relative shrink-0 overflow-hidden rounded-full", small ? "h-8 w-8" : "h-10 w-10")}>
        <Image
          src="/logo-icon.png"
          alt="Logo SIFAU"
          fill
          className="object-contain dark:hidden"
          sizes={small ? "32px" : "40px"}
        />
        <Image
          src="/logo-icon-dark.png"
          alt="Logo SIFAU"
          fill
          className="hidden object-contain dark:block"
          sizes={small ? "32px" : "40px"}
        />
      </div>

      {!small && (
        <span className="text-[18px] font-black leading-none tracking-tight text-primary">SIFAU</span>
      )}
    </Link>
  );
}

export function AppShell({ user, children }: { user: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[user.role];
  const homeHref = items.find((item) => item.main)?.href ?? "/app";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    try {
      await apiPost("/api/auth", { action: "logout" });
      toast.success("Sessão encerrada com segurança.");
    } catch {
      /* sessão local mesmo sem servidor */
    }
    router.replace("/auth");
  };

  const mainItems = items.filter((i) => i.main);
  const secondaryItems = items.filter((i) => !i.main);

  return (
    <div className="min-h-dvh bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card md:flex">
        <div className="border-b px-4 py-3">
          <Logo href={homeHref} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação principal">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar>
              <AvatarFallback>{initials(user.nome)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.nome}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-card/85 px-4 shadow-sm shadow-black/5 backdrop-blur-md md:hidden pt-safe">
        <Logo small href={homeHref} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 pt-safe">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/40 p-3">
                <Avatar>
                  <AvatarFallback>{initials(user.nome)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role]} · {user.email}
                  </p>
                </div>
              </div>
              <nav className="space-y-1" aria-label="Navegação">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Separator />
              <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Sair da conta
              </Button>
              <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted-foreground">
                SIFAU · Plataforma municipal de fiscalização urbana · LGPD compliant
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-[4.5rem] md:pb-12 md:pt-8">
          {children}
        </div>
      </main>

      {/* Bottom tab bar mobile */}
      {mainItems.length > 0 && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-md md:hidden pb-safe"
          aria-label="Navegação rápida"
        >
          <div className="grid grid-flow-col auto-cols-fr">
            {mainItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isActive(item.href) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            ))}
            {secondaryItems.length > 0 && (
              <Link
                href={secondaryItems[0].href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  isActive(secondaryItems[0].href) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <PlusCircle className="h-5 w-5" />
                <span>{secondaryItems[0].label}</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

export { UserRound };
