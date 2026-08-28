"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Mail, ShieldCheck, UserRound, Phone, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import type { Profile, UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter no mínimo 6 caracteres."),
});

const registerSchema = z.object({
  role: z.enum(["cidadao", "fiscal", "gestor", "auditor"], {
    message: "Selecione um perfil.",
  }),
  nome: z.string().min(3, "Informe seu nome completo."),
  telefone: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter no mínimo 6 caracteres."),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

const ROLE_INFO: { role: UserRole; desc: string }[] = [
  { role: "cidadao", desc: "Reporta ocorrências urbanas e acompanha o andamento" },
  { role: "fiscal", desc: "Recebe e vistoria ocorrências atribuídas em campo" },
  { role: "gestor", desc: "Acompanha KPIs, redistribui casos e define SLAs" },
  { role: "auditor", desc: "Acesso somente-leitura à trilha de auditoria" },
];

const DEMO_ACCOUNTS: { label: string; email: string; icon: typeof UserRound }[] = [
  { label: "Cidadão", email: "cidadao@demo.sifau", icon: UserRound },
  { label: "Fiscal", email: "fiscal@demo.sifau", icon: ShieldCheck },
  { label: "Gestor", email: "gestor@demo.sifau", icon: Sparkles },
  { label: "Auditor", email: "auditor@demo.sifau", icon: Lock },
];

export function roleHome(role: UserRole): string {
  switch (role) {
    case "cidadao":
      return "/app/minhas-ocorrencias";
    case "fiscal":
      return "/app/fiscal";
    case "gestor":
      return "/app/gestor";
    case "auditor":
      return "/app/auditor";
  }
}

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  const login = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const register = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  /**
   * Após login/cadastro bem-sucedido:
   * 1. Confirma que o cookie de sessão realmente foi gravado e aceito pelo
   *    navegador (GET /api/auth) — se não, mostra erro claro em vez de
   *    deixar o usuário preso na tela.
   * 2. Navega com carregamento completo da página (window.location.assign):
   *    o navegador faz uma requisição de documento nova, enviando o cookie,
   *    e o servidor renderiza a tela do perfil sem depender do estado do
   *    router client-side ou de cache do service worker.
   */
  const finish = async (profile: Profile) => {
    const check = await apiGet<{ profile: Profile | null }>("/api/auth");
    if (!check.profile) {
      throw new Error(
        "A sessão não pôde ser confirmada neste navegador. Habilite os cookies (e tente por HTTPS) e entre novamente."
      );
    }
    toast.success(`Bem-vindo(a), ${profile.nome.split(" ")[0]}!`);
    window.location.assign(roleHome(profile.role));
  };

  const onLogin = async (values: LoginValues) => {
    setError(null);
    try {
      const res = await apiPost<{ profile: Profile }>("/api/auth", {
        action: "login",
        ...values,
      });
      await finish(res.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar.");
    }
  };

  const onRegister = async (values: RegisterValues) => {
    setError(null);
    try {
      const res = await apiPost<{ profile: Profile }>("/api/auth", {
        action: "register",
        ...values,
        telefone: values.telefone || null,
        bairro: values.bairro || null,
      });
      toast.success("Conta criada com sucesso!");
      await finish(res.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar a conta.");
    }
  };

  const demoLogin = async (email: string) => {
    setError(null);
    try {
      const res = await apiPost<{ profile: Profile }>("/api/auth", {
        action: "login",
        email,
        password: "123456",
      });
      await finish(res.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar na conta demo.");
    }
  };

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(60rem 30rem at 50% -10%, hsl(var(--primary) / 0.08), transparent), linear-gradient(rgba(23,80,171,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(23,80,171,0.045) 1px, transparent 1px)",
        backgroundSize: "auto, 32px 32px, 32px 32px",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">SIFAU</h1>
          <p className="text-sm text-muted-foreground">Fiscalização e Atendimento Urbano</p>
        </div>

        <Card className="p-6 shadow-xl">
          {/* Toggle segmentado */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  "min-h-10 rounded-md text-sm font-medium transition-all",
                  mode === m ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger"
            >
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={login.handleSubmit(onLogin)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.gov.br"
                    className="pl-9"
                    {...login.register("email")}
                  />
                </div>
                {login.formState.errors.email && (
                  <p className="text-xs text-danger">{login.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••"
                    className="pl-9"
                    {...login.register("password")}
                  />
                </div>
                {login.formState.errors.password && (
                  <p className="text-xs text-danger">{login.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={login.formState.isSubmitting}>
                {login.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          ) : (
            <form onSubmit={register.handleSubmit(onRegister)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label>Seu perfil</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_INFO.map((r) => {
                    const selected = register.watch("role") === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => register.setValue("role", r.role, { shouldValidate: true })}
                        className={cn(
                          "min-h-[76px] rounded-lg border p-3 text-left transition-all",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40"
                        )}
                        aria-pressed={selected}
                      >
                        <p className="text-sm font-semibold">{ROLE_LABELS[r.role]}</p>
                        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                          {r.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {register.formState.errors.role && (
                  <p className="text-xs text-danger">{register.formState.errors.role.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-nome">Nome completo</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-nome"
                    placeholder="Maria da Silva"
                    className="pl-9"
                    autoComplete="name"
                    {...register.register("nome")}
                  />
                </div>
                {register.formState.errors.nome && (
                  <p className="text-xs text-danger">{register.formState.errors.nome.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-tel">Telefone</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-tel"
                      type="tel"
                      inputMode="tel"
                      placeholder="(11) 99999-0000"
                      className="pl-9"
                      autoComplete="tel"
                      {...register.register("telefone")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-bairro">Bairro</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-bairro"
                      placeholder="Centro"
                      className="pl-9"
                      {...register.register("bairro")}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.gov.br"
                    className="pl-9"
                    {...register.register("email")}
                  />
                </div>
                {register.formState.errors.email && (
                  <p className="text-xs text-danger">{register.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="pl-9"
                    {...register.register("password")}
                  />
                </div>
                {register.formState.errors.password && (
                  <p className="text-xs text-danger">{register.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={register.formState.isSubmitting}>
                {register.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar conta
              </Button>
            </form>
          )}

          {mode === "login" && (
            <div className="mt-5">
              <p className="mb-2 text-center text-xs text-muted-foreground">
                Contas demo (senha <span className="font-mono">123456</span>):
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <Button
                    key={a.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs"
                    onClick={() => demoLogin(a.email)}
                  >
                    <a.icon className="h-3.5 w-3.5" /> {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Plataforma municipal de fiscalização urbana · LGPD compliant
        </p>
      </div>
    </div>
  );
}
