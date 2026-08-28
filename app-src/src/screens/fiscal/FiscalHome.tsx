"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Star, HardHat, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/stat-cards";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { EmptyState, LoadingState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import type { FiscalStat, Occurrence, Profile } from "@/lib/types";

interface FiscalHomeData {
  queue: Occurrence[];
  resolved_recent: Occurrence[];
  stats: FiscalStat;
}

export default function FiscalHome({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [data, setData] = useState<FiscalHomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await apiGet<FiscalHomeData>("/api/occurrences");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await load();
    };
    loadData();
  }, [load]);

  if (error) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Não foi possível carregar o painel"
        description={error}
        action={<Button onClick={load}>Tentar novamente</Button>}
      />
    );
  }
  if (!data) return <LoadingState label="Carregando seu painel…" rows={4} />;

  const slaTone =
    data.stats.sla_compliance_pct >= 80 ? "success" : data.stats.sla_compliance_pct >= 50 ? "warning" : "danger";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel do fiscal</h1>
        <p className="text-sm text-muted-foreground">
          {profile.nome} · {profile.especialidade ?? "Fiscalização"} · {profile.region ?? "Região não definida"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={ClipboardList} label="Na fila" value={data.queue.length} tone="primary" />
        <StatCard icon={CheckCircle2} label="Resolvidas" value={data.stats.total_resolved} tone="success" />
        <StatCard icon={Star} label="Nota média" value={data.stats.avg_rating.toFixed(1)} tone="warning" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Fila de vistoria</h2>
          <p className="text-sm text-muted-foreground">
            Ordenada por urgência e tempo de espera
          </p>
        </div>
        <Button asChild>
          <a href="/app/fiscal/vistoria">
            <HardHat className="h-4 w-4" /> Ir para vistoria
          </a>
        </Button>
      </div>

      {data.queue.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Fila vazia"
          description="Nenhuma ocorrência atribuída no momento. Novas ocorrências chegam automaticamente pela fila equilibrada."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.queue.map((o, i) => (
            <OccurrenceCard
              key={o.id}
              occurrence={o}
              rank={i + 1}
              photo={o.photo}
              onClick={() => router.push(`/app/fiscal/vistoria?o=${o.id}`)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Você não escolhe livremente — o sistema atribui para evitar cherry-picking.
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Resolvidas recentemente</h2>
        {data.resolved_recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma vistoria concluída ainda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.resolved_recent.map((o) => (
              <OccurrenceCard
                key={o.id}
                occurrence={o}
                photo={o.photo}
                onClick={() => router.push(`/app/ocorrencias/${o.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <Card className="border-success/30">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">Cumprimento de SLA</p>
            <p className="text-xs text-muted-foreground">
              Reputação interna — visível apenas para a gestão
            </p>
          </div>
          <span
            className={
              "rounded-full px-3 py-1 text-sm font-bold " +
              (slaTone === "success"
                ? "bg-success/10 text-success"
                : slaTone === "warning"
                  ? "bg-warning/10 text-warning"
                  : "bg-danger/10 text-danger")
            }
          >
            {data.stats.sla_compliance_pct}%
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
