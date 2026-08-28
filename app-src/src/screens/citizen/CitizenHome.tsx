"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Inbox, Plus, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { EmptyState, LoadingState } from "@/components/empty-state";
import MapHeatmap, { type MapPoint } from "@/components/MapHeatmap";
import { apiGet } from "@/lib/api";
import type { Occurrence, Profile } from "@/lib/types";
import { toast } from "sonner";

export default function CitizenHome({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ occurrences: Occurrence[] }>("/api/occurrences");
      setOccurrences(data.occurrences);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
      setOccurrences([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await load();
    };
    loadData();
  }, [load]);

  useEffect(() => {
    apiGet<{ points: MapPoint[] }>("/api/occurrences?map=1")
      .then((d) => setPoints(d.points))
      .catch(() => setPoints([]));
  }, []);

  const resolvedCount = (occurrences ?? []).filter((o) => o.status === "resolvida").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground">
            {profile.nome.split(" ")[0]}, acompanhe suas ocorrências e cuide da sua cidade.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/nova-ocorrencia">
            <Plus className="h-4 w-4" /> Nova ocorrência
          </Link>
        </Button>
      </div>

      {resolvedCount >= 5 && (
        <div className="flex items-center gap-4 rounded-xl border bg-gradient-to-r from-success/10 via-transparent to-primary/5 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold">Colaborador Ativo</p>
            <p className="text-sm text-muted-foreground">
              {resolvedCount} ocorrências suas viraram ação. Obrigado por cuidar da cidade. 🏙️
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="minhas">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="minhas">Minhas ocorrências</TabsTrigger>
          <TabsTrigger value="mapa">Mapa público</TabsTrigger>
        </TabsList>

        <TabsContent value="minhas">
          {error && (
            <div className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}{" "}
              <button className="font-semibold underline" onClick={load}>
                Tentar novamente
              </button>
            </div>
          )}
          {occurrences === null ? (
            <LoadingState label="Carregando suas ocorrências…" />
          ) : occurrences.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhuma ocorrência ainda"
              description="Você ainda não registrou nenhuma ocorrência. Ajude a prefeitura a cuidar da cidade."
              action={
                <Button asChild>
                  <Link href="/app/nova-ocorrencia">
                    <Plus className="h-4 w-4" /> Registrar agora
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {occurrences.map((o) => (
                <OccurrenceCard
                  key={o.id}
                  occurrence={o}
                  photo={o.photo}
                  onClick={() => router.push(`/app/ocorrencias/${o.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mapa">
          <div className="mb-3 flex items-start gap-2 rounded-lg border bg-accent/40 px-3 py-2.5 text-xs text-accent-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              O mapa público mostra ocorrências <strong>anonimizadas</strong> — sem nome do
              denunciante, em conformidade com a LGPD.
            </p>
          </div>
          {points.length === 0 ? (
            <EmptyState
              icon={WifiOff}
              title="Sem pontos para exibir"
              description="Não há ocorrências geolocalizadas no momento."
            />
          ) : (
            <MapHeatmap
              points={points}
              height={380}
              onSelect={(p) => router.push(`/app/ocorrencias/${p.id}`)}
            />
          )}
          <div className="mt-3 text-center">
            <Button variant="outline" size="sm" onClick={() => toast.info("Mapa atualizado.")}>
              Atualizar mapa
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
