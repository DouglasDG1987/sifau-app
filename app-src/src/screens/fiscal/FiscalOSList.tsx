"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrigemOSBadge, StatusOSBadge } from "@/components/badges";
import { EmptyState, LoadingState } from "@/components/empty-state";
import { apiGet } from "@/lib/api";
import { fmtDate, remainingMs, fmtDuration } from "@/lib/utils";
import type { OrdemServico, Profile } from "@/lib/types";

export default function FiscalOSList({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [ordens, setOrdens] = useState<OrdemServico[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await apiGet<{ ordens: OrdemServico[] }>("/api/os");
      setOrdens(d.ordens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
      setOrdens([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await load();
    };
    loadData();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h1>
        <p className="text-sm text-muted-foreground">
          OS atribuídas a você — vistorias formais com geofencing e autos de infração.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error} <button className="font-semibold underline" onClick={load}>Tentar novamente</button>
        </div>
      )}

      {ordens === null ? (
        <LoadingState label="Carregando OS…" rows={3} />
      ) : ordens.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma OS atribuída"
          description="Quando a gestão emitir uma ordem de serviço para você, ela aparecerá aqui."
        />
      ) : (
        <div className="space-y-3">
          {ordens.map((os) => {
            const rem = remainingMs(os.prazo_resposta);
            return (
              <Card
                key={os.id}
                onClick={() => router.push(`/app/fiscal/os/${os.id}`)}
                className="cursor-pointer transition-all hover:border-primary/40 active:scale-[0.99]"
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold">{os.numero_os}</p>
                    <div className="flex gap-1.5">
                      <OrigemOSBadge origem={os.origem_os} />
                      <StatusOSBadge status={os.status} />
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {os.servico_descricao}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {os.endereco}
                    </span>
                    <span className={rem < 0 ? "font-semibold text-danger" : rem < 24 * 3600 * 1000 ? "font-semibold text-warning" : ""}>
                      {rem < 0 ? `Prazo estourado há ${fmtDuration(Math.abs(rem))}` : `Prazo: ${fmtDate(os.prazo_resposta)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {ordens && ordens.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          A vistoria de OS só pode ser iniciada dentro do raio de {""}
          <strong>200m</strong> do endereço (geofencing).
        </p>
      )}
    </div>
  );
}
