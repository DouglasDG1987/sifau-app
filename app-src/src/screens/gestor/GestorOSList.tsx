"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrigemOSBadge, StatusOSBadge } from "@/components/badges";
import { EmptyState, LoadingState } from "@/components/empty-state";
import { apiGet } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { OrdemServico, Profile } from "@/lib/types";

export default function GestorOSList({ profile }: { profile: Profile }) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">
            Documentos formais emitidos pela gestão, com vistorias e autos vinculados.
          </p>
        </div>
        <Button onClick={() => router.push("/app/gestor/os/nova")}>
          <FilePlus2 className="h-4 w-4" /> Nova OS
        </Button>
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
          title="Nenhuma OS emitida"
          description="Emita a primeira ordem de serviço para formalizar fiscalizações."
          action={
            <Button onClick={() => router.push("/app/gestor/os/nova")}>
              <FilePlus2 className="h-4 w-4" /> Nova OS
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {ordens.map((os) => (
            <Card
              key={os.id}
              onClick={() => router.push(`/app/gestor/os/${os.id}`)}
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
                <p className="mt-1 line-clamp-1 text-sm font-medium">{os.requerente}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{os.servico_descricao}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {os.endereco}
                  </span>
                  <span>Fiscal: {os.fiscal_nome ?? "não designado"}</span>
                  <span>Prazo: {fmtDate(os.prazo_resposta)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
