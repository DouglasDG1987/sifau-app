"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FilePlus2,
  FileText,
  ListChecks,
  Loader2,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/stat-cards";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, UrgencyBadge } from "@/components/badges";
import { SLATimer } from "@/components/SLATimer";
import MapHeatmap, { type MapPoint } from "@/components/MapHeatmap";
import { ScreenLoader, EmptyState } from "@/components/empty-state";
import { apiGet, apiPatch, apiPut } from "@/lib/api";
import { downloadCSV } from "@/services/csv";
import { fmtCurrency, fmtDate, cn } from "@/lib/utils";
import type { FiscalStat, Occurrence, OrdemServico, Profile, SlaRule } from "@/lib/types";
import { CATEGORIES, STATUS_HEX, STATUS_LABELS, STATUS_OS_HEX, STATUS_OS_LABELS, type OccurrenceStatus, type StatusOS } from "@/lib/types";

interface Overview {
  total: number;
  resolved: number;
  overdue: number;
  sla_ok: number;
  sla_total: number;
  sla_pct: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
}

interface OSWithAutos {
  ordens: OrdemServico[];
  autos: {
    id: string;
    numero_os: string;
    artigo_legal: string;
    infracao_descricao: string;
    valor_multa: number;
    autuado_nome: string | null;
    ciencia_status: string;
    criado_em: string;
  }[];
}

export default function GestorDashboard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [ranking, setRanking] = useState<FiscalStat[]>([]);
  const [rules, setRules] = useState<SlaRule[]>([]);
  const [rulesDraft, setRulesDraft] = useState<Record<string, string>>({});
  const [osData, setOsData] = useState<OSWithAutos>({ ordens: [], autos: [] });
  const [fiscais, setFiscais] = useState<{ id: string; nome: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingSla, setSavingSla] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ov, occ, pts, rank, rulesRes, osRes, fiscaisRes] = await Promise.all([
        apiGet<{ overview: Overview }>("/api/occurrences?view=overview"),
        apiGet<{ occurrences: Occurrence[] }>("/api/occurrences"),
        apiGet<{ points: MapPoint[] }>("/api/occurrences?map=1"),
        apiGet<{ ranking: FiscalStat[] }>("/api/occurrences?view=ranking"),
        apiGet<{ rules: SlaRule[] }>("/api/sla"),
        apiGet<OSWithAutos>("/api/os?autos=1"),
        apiGet<{ fiscais: { id: string; nome: string }[] }>("/api/os?fiscais=1"),
      ]);
      setOverview(ov.overview);
      setOccurrences(occ.occurrences);
      setPoints(pts.points);
      setRanking(rank.ranking);
      setRules(rulesRes.rules);
      setRulesDraft(Object.fromEntries(rulesRes.rules.map((r) => [r.category, String(r.max_hours)])));
      setOsData(osRes);
      setFiscais(fiscaisRes.fiscais);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o dashboard.");
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
        icon={AlertTriangle}
        title="Não foi possível carregar o dashboard"
        description={error}
        action={<Button onClick={load}>Tentar novamente</Button>}
      />
    );
  }
  if (!overview) return <ScreenLoader label="Carregando dashboard municipal…" />;

  const escaladas = occurrences.filter((o) => o.status === "escalonada");
  const byCategoryData = CATEGORIES.map((c) => ({
    name: c.length > 18 ? c.slice(0, 17) + "…" : c,
    full: c,
    value: overview.by_category[c] ?? 0,
  })).filter((d) => d.value > 0);
  const byStatusData = (Object.keys(overview.by_status) as OccurrenceStatus[]).map((s) => ({
    name: STATUS_LABELS[s],
    value: overview.by_status[s],
    color: STATUS_HEX[s],
  }));
  const osByStatus = (Object.keys(STATUS_OS_LABELS) as StatusOS[]).map((s) => ({
    name: STATUS_OS_LABELS[s],
    value: osData.ordens.filter((o) => o.status === s).length,
    color: STATUS_OS_HEX[s],
  }));
  const multasTotal = osData.autos.reduce((acc, a) => acc + a.valor_multa, 0);
  const multaMedia = osData.autos.length ? multasTotal / osData.autos.length : 0;

  const slaTone = (pct: number) =>
    pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger";
  const slaBg = (pct: number) =>
    pct >= 80 ? "bg-success/10 text-success" : pct >= 50 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger";

  const exportCsv = () => {
    downloadCSV(
      `sifau-ocorrencias-${new Date().toISOString().slice(0, 10)}.csv`,
      ["ID", "Categoria", "Status", "Urgência", "Bairro", "Criada em", "SLA até", "Fiscal"],
      occurrences.map((o) => [
        o.id,
        o.category,
        STATUS_LABELS[o.status],
        o.urgency_score,
        o.bairro ?? "",
        fmtDate(o.created_at),
        fmtDate(o.sla_deadline),
        o.assigned_fiscal_name ?? "",
      ])
    );
    toast.success("CSV exportado.");
  };

  const reassign = async (occId: string, fiscalId: string) => {
    try {
      await apiPatch(`/api/occurrences/${occId}`, { action: "reassign", fiscal_id: fiscalId });
      toast.success("Caso redistribuído.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao redistribuir.");
    }
  };

  const saveRule = async (category: string) => {
    setSavingSla(category);
    try {
      const hours = Number(rulesDraft[category]);
      if (!Number.isFinite(hours) || hours < 1) {
        toast.error("Informe um valor válido em horas.");
        return;
      }
      await apiPut<{ rules: SlaRule[] }>("/api/sla", {
        rules: [{ category, max_hours: hours }],
      });
      toast.success(`SLA de "${category}" atualizado.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSavingSla(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard municipal</h1>
          <p className="text-sm text-muted-foreground">
            {overview.total} ocorrências registradas · {profile.nome}
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <KpiCard label="Total de ocorrências" value={overview.total} tone="primary" />
        <KpiCard label="Resolvidas" value={overview.resolved} tone="success" />
        <KpiCard label="SLA estourado" value={overview.overdue} tone="danger" sub="casos abertos além do prazo" />
        <KpiCard label="SLA cumprido" value={`${overview.sla_pct}%`} tone="warning" sub={`${overview.sla_ok}/${overview.sla_total} resolvidas no prazo`} />
      </div>

      <Tabs defaultValue="panorama">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="panorama">Panorama</TabsTrigger>
          <TabsTrigger value="fiscais">Fiscais</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="escaladas">Escalonadas</TabsTrigger>
          <TabsTrigger value="os">OS e Multas</TabsTrigger>
        </TabsList>

        <TabsContent value="panorama">
          <div className="space-y-4">
            <MapHeatmap points={points} height={340} onSelect={(p) => router.push(`/app/ocorrencias/${p.id}`)} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Por categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {byCategoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados.</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byCategoryData} layout="vertical" margin={{ left: 8, right: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} fontSize={12} />
                          <YAxis type="category" dataKey="name" width={130} fontSize={11} />
                          <Tooltip formatter={(v) => [v, "Ocorrências"]} labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ""} />
                          <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Por status</CardTitle>
                </CardHeader>
                <CardContent>
                  {byStatusData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados.</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={byStatusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                            {byStatusData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fiscais">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fiscal</TableHead>
                      <TableHead>Resolvidas</TableHead>
                      <TableHead>Na fila</TableHead>
                      <TableHead>% SLA</TableHead>
                      <TableHead>Nota média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((f) => (
                      <TableRow key={f.fiscal_id}>
                        <TableCell className="font-medium">{f.fiscal_name}</TableCell>
                        <TableCell>{f.total_resolved}</TableCell>
                        <TableCell>{f.active_assigned}</TableCell>
                        <TableCell>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", slaBg(f.sla_compliance_pct))}>
                            {f.sla_compliance_pct}%
                          </span>
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-warning" /> {f.avg_rating.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                Uso interno da gestão — não é público. A nota média é registrada pela gestão
                (fiscal_stats) e o % SLA é calculado sobre o tempo real de resolução (trilha de auditoria).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regras de SLA por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {CATEGORIES.map((c) => {
                  const rule = rules.find((r) => r.category === c);
                  return (
                    <div key={c} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                      <span className="min-w-0 flex-1 text-sm font-medium">{c}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={720}
                          className="h-9 w-24 text-right"
                          value={rulesDraft[c] ?? String(rule?.max_hours ?? 72)}
                          onChange={(e) => setRulesDraft((d) => ({ ...d, [c]: e.target.value }))}
                          aria-label={`Horas de SLA para ${c}`}
                        />
                        <span className="text-xs text-muted-foreground">horas</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingSla === c}
                          onClick={() => saveRule(c)}
                        >
                          {savingSla === c && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escaladas">
          {escaladas.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Nenhum caso escalonado"
              description="Casos travados aparecem aqui para redistribuição."
            />
          ) : (
            <div className="space-y-3">
              {escaladas.map((o) => (
                <Card key={o.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={o.status} />
                      <UrgencyBadge urgency={o.urgency_score} />
                      <span className="text-xs text-muted-foreground">{o.bairro ?? "—"}</span>
                    </div>
                    <p className="text-sm font-semibold">{o.category}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{o.description}</p>
                    <SLATimer deadline={o.sla_deadline} created={o.created_at} compact />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Select onValueChange={(v) => reassign(o.id, v)}>
                        <SelectTrigger className="h-9 w-52 text-xs">
                          <SelectValue placeholder="Redistribuir para…" />
                        </SelectTrigger>
                        <SelectContent>
                          {fiscais.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/app/ocorrencias/${o.id}`)}>
                        Ver detalhe
                      </Button>
                      <Button size="sm" onClick={() => router.push(`/app/gestor/os/nova?denuncia_id=${o.id}`)}>
                        <FilePlus2 className="h-4 w-4" /> Criar OS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="os">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <KpiCard label="Total de OS" value={osData.ordens.length} tone="primary" />
              <KpiCard
                label="Em vistoria"
                value={osData.ordens.filter((o) => o.status === "em_vistoria").length}
                tone="warning"
              />
              <KpiCard
                label="Concluídas"
                value={osData.ordens.filter((o) => o.status === "concluida").length}
                tone="success"
              />
              <KpiCard label="Multas (R$)" value={fmtCurrency(multasTotal)} tone="danger" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">OS por status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={osByStatus}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                          {osByStatus.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo de multas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-muted-foreground">Autos lavrados</span>
                    <span className="font-bold">{osData.autos.length}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="font-bold">{fmtCurrency(multasTotal)}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-muted-foreground">Valor médio</span>
                    <span className="font-bold">{fmtCurrency(multaMedia)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                    Os autos são lançados pelo fiscal na vistoria da OS, com ciência do autuado.
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OS recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Fiscal</TableHead>
                        <TableHead>Endereço</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {osData.ordens.slice(0, 8).map((os) => (
                        <TableRow
                          key={os.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/app/gestor/os/${os.id}`)}
                        >
                          <TableCell className="font-medium">{os.numero_os}</TableCell>
                          <TableCell className="capitalize">{os.origem_os}</TableCell>
                          <TableCell>{os.fiscal_nome ?? "—"}</TableCell>
                          <TableCell className="max-w-48 truncate">{os.endereco}</TableCell>
                          <TableCell>
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", os.status === "concluida" ? "bg-success/10 text-success" : os.status === "em_vistoria" ? "bg-warning/10 text-warning" : os.status === "cancelada" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                              {STATUS_OS_LABELS[os.status]}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        Dashboard operacional — dados internos da prefeitura.
      </div>
    </div>
  );
}
