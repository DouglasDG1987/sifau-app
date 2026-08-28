"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Lock,
  Search,
  ShieldCheck,
  FileText,
  Users,
  Loader2,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/badges";
import { ScreenLoader, EmptyState } from "@/components/empty-state";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { cn, fmtDateTime } from "@/lib/utils";
import type { OccurrenceStatus, Profile, UserRole } from "@/lib/types";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/types";

interface AuditLog {
  id: string;
  occurrence_id: string;
  occurrence_category: string;
  from_status: string | null;
  to_status: string;
  changed_by_name: string | null;
  changed_at: string;
  ip_address: string | null;
  geo: string | null;
  note: string | null;
}

interface UserRow {
  id: string;
  email: string;
  role: UserRole;
  nome: string;
  bairro: string | null;
  ativo: boolean;
  created_at: string;
}

interface ExportRow {
  id: string;
  sha256: string;
  description: string;
  row_count: number;
  created_at: string;
  exported_by: string;
}

interface OSRow {
  id: string;
  numero_os: string;
  status: string;
  origem_os: string;
  autos: {
    id: string;
    numero_os: string;
    artigo_legal: string;
    valor_multa: number;
    autuado_nome: string | null;
    ciencia_status: string;
  }[];
}

export default function AuditorPanel({ profile }: { profile: Profile }) {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [osData, setOsData] = useState<{ ordens: OSRow[]; autos: OSRow["autos"] }>({ ordens: [], autos: [] });
  const [exports, setExports] = useState<ExportRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [logsRes, usersRes, osRes, exportsRes] = await Promise.all([
        apiGet<{ logs: AuditLog[] }>("/api/occurrences?logs=1"),
        apiGet<{ users: UserRow[] }>("/api/admin?users=1"),
        apiGet<{ ordens: OSRow[]; autos: OSRow["autos"] }>("/api/os?autos=1"),
        apiGet<{ exports: ExportRow[] }>("/api/admin?exports=1"),
      ]);
      setLogs(logsRes.logs);
      setUsers(usersRes.users);
      setOsData(osRes);
      setExports(exportsRes.exports);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar a auditoria.");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await load();
    };
    loadData();
  }, [load]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (statusFilter !== "all" && l.to_status !== statusFilter) return false;
      if (!q) return true;
      return (
        (l.changed_by_name ?? "").toLowerCase().includes(q) ||
        (l.note ?? "").toLowerCase().includes(q) ||
        l.occurrence_category.toLowerCase().includes(q) ||
        l.occurrence_id.includes(q)
      );
    });
  }, [logs, search, statusFilter]);

  const setUserRole = async (userId: string, role: UserRole) => {
    try {
      await apiPatch("/api/admin", { profile_id: userId, role });
      toast.success("Papel atualizado.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
    }
  };

  const setUserActive = async (userId: string, ativo: boolean) => {
    try {
      await apiPatch("/api/admin", { profile_id: userId, ativo });
      toast.success(ativo ? "Conta ativada." : "Conta desativada.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
    }
  };

  const exportLogs = async () => {
    setExporting(true);
    try {
      const rows = filteredLogs.map((l) => ({
        ocorrencia: l.occurrence_id,
        categoria: l.occurrence_category,
        de: l.from_status ? STATUS_LABELS[l.from_status as OccurrenceStatus] : null,
        para: STATUS_LABELS[l.to_status as OccurrenceStatus],
        por: l.changed_by_name,
        quando: l.changed_at,
        ip: l.ip_address,
        geo: l.geo,
        nota: l.note,
      }));
      const desc = `Exportação da trilha de auditoria (${new Date().toLocaleString("pt-BR")})`;
      const res = await apiPost<{ sha256: string; row_count: number }>("/api/admin", {
        action: "export",
        rows,
        description: desc,
      });
      toast.success(`Exportação registrada · SHA-256: ${res.sha256.slice(0, 16)}…`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Não foi possível carregar a auditoria"
        description={error}
        action={<Button onClick={load}>Tentar novamente</Button>}
      />
    );
  }
  if (!logs || !users) return <ScreenLoader label="Carregando trilha de auditoria…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel do auditor</h1>
          <p className="text-sm text-muted-foreground">
            Acesso somente-leitura à trilha imutável — exceto gestão de usuários.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-3 py-1 text-xs font-medium text-success">
          <Lock className="h-3.5 w-3.5" /> Trilha imutável · SHA-256
        </div>
      </div>

      <Tabs defaultValue="trilha">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="trilha">
            <ScrollText className="h-4 w-4" /> Trilha
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="os">
            <FileText className="h-4 w-4" /> OS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trilha">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Trilha de mudanças de status</CardTitle>
                <Button size="sm" variant="outline" onClick={exportLogs} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exportar (SHA-256)
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-52 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por servidor, nota, categoria…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar na trilha"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {(Object.keys(STATUS_LABELS) as OccurrenceStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLogs.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado para os filtros aplicados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando</TableHead>
                        <TableHead>Ocorrência</TableHead>
                        <TableHead>Transição</TableHead>
                        <TableHead>Por</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Geo</TableHead>
                        <TableHead>Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.slice(0, 200).map((l) => (
                        <TableRow key={l.id} className="text-xs">
                          <TableCell className="whitespace-nowrap">{fmtDateTime(l.changed_at)}</TableCell>
                          <TableCell className="max-w-40">
                            <p className="truncate font-medium">{l.occurrence_category}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{l.occurrence_id.slice(0, 8)}</p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {l.from_status ? STATUS_LABELS[l.from_status as OccurrenceStatus] : "—"} →{" "}
                            <StatusBadge status={l.to_status as OccurrenceStatus} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{l.changed_by_name ?? "Sistema"}</TableCell>
                          <TableCell className="font-mono">{l.ip_address ?? "—"}</TableCell>
                          <TableCell className="font-mono">{l.geo ?? "—"}</TableCell>
                          <TableCell className="max-w-56">
                            <p className="line-clamp-2 text-muted-foreground">{l.note ?? "—"}</p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                {filteredLogs.length} registro(s) · exportações registradas para cadeia de custódia.
              </div>
            </CardContent>
          </Card>

          {exports.length > 0 && (
            <Card className="mt-3">
              <CardHeader>
                <CardTitle className="text-base">Exportações registradas (cadeia de custódia)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Linhas</TableHead>
                        <TableHead>SHA-256</TableHead>
                        <TableHead>Exportado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exports.map((e) => (
                        <TableRow key={e.id} className="text-xs">
                          <TableCell className="whitespace-nowrap">{fmtDateTime(e.created_at)}</TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell>{e.row_count}</TableCell>
                          <TableCell className="font-mono text-[10px]">{e.sha256.slice(0, 24)}…</TableCell>
                          <TableCell>{e.exported_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestão de usuários</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Bairro</TableHead>
                      <TableHead>Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className={cn(!u.ativo && "opacity-50")}>
                        <TableCell>
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-[10px] text-muted-foreground">desde {fmtDateTime(u.created_at)}</p>
                        </TableCell>
                        <TableCell className="text-xs">{u.email}</TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v) => setUserRole(u.id, v as UserRole)}>
                            <SelectTrigger className="h-9 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs">{u.bairro ?? "—"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={u.ativo}
                            onCheckedChange={(v) => setUserActive(u.id, v)}
                            disabled={u.id === profile.id}
                            aria-label={`Ativar/desativar ${u.nome}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                Única ação de escrita permitida ao auditor — função administrativa, não de fiscalização.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="os">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ordens de Serviço (conformidade)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Autos vinculados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {osData.ordens.map((os) => (
                        <TableRow key={os.id}>
                          <TableCell className="font-medium">{os.numero_os}</TableCell>
                          <TableCell className="text-xs capitalize">{os.origem_os}</TableCell>
                          <TableCell className="text-xs capitalize">{os.status}</TableCell>
                          <TableCell className="text-xs">
                            {osData.autos.filter((a) => a.numero_os === os.numero_os).length}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Autos de infração</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {osData.autos.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">Nenhum auto lavrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OS</TableHead>
                          <TableHead>Artigo</TableHead>
                          <TableHead>Autuado</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Ciência</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {osData.autos.map((a) => (
                          <TableRow key={a.id} className="text-xs">
                            <TableCell className="font-medium">{a.numero_os}</TableCell>
                            <TableCell>{a.artigo_legal}</TableCell>
                            <TableCell>{a.autuado_nome ?? "—"}</TableCell>
                            <TableCell>
                              {a.valor_multa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </TableCell>
                            <TableCell className="capitalize">{a.ciencia_status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
