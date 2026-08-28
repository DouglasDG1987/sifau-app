"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  HardHat,
  Lock,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  UserCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, UrgencyBadge, StatusOSBadge } from "@/components/badges";
import { SLATimer } from "@/components/SLATimer";
import MapHeatmap, { type MapPoint } from "@/components/MapHeatmap";
import { ScreenLoader, EmptyState } from "@/components/empty-state";
import { apiGet, apiPatch } from "@/lib/api";
import { fmtDateTime, cn } from "@/lib/utils";
import type {
  Comment,
  Occurrence,
  OccurrenceMedia,
  OccurrenceStatus,
  Profile,
  StatusLog,
} from "@/lib/types";
import { STATUS_LABELS, ACTION_LABELS } from "@/lib/types";

interface DetailData {
  occurrence: Occurrence;
  citizen_nome: string | null;
  media: OccurrenceMedia[];
  logs: StatusLog[];
  comments: Comment[];
  inspection: {
    id: string;
    arrival_at: string;
    arrival_lat: number | null;
    arrival_lng: number | null;
    report_json: { laudo?: string };
    action_taken: keyof typeof ACTION_LABELS;
    fine_amount: number | null;
    fine_process_number: string | null;
  } | null;
}

const STATUS_ICON: Record<OccurrenceStatus, typeof CircleDot> = {
  aberta: CircleDot,
  triada: Sparkles,
  atribuida: UserCheck,
  em_vistoria: HardHat,
  resolvida: CheckCircle2,
  arquivada: Archive,
  escalonada: AlertTriangle,
};

export default function OccurrenceDetail({ profile, id }: { profile: Profile; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"public" | "internal">("public");
  const [sending, setSending] = useState(false);
  const [fiscais, setFiscais] = useState<{ id: string; nome: string }[]>([]);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [escalateNote, setEscalateNote] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await apiGet<DetailData>(`/api/occurrences/${id}`);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    }
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      await load();
    };
    loadData();
  }, [load]);

  useEffect(() => {
    if (profile.role === "gestor") {
      apiGet<{ fiscais: { id: string; nome: string }[] }>("/api/os?fiscais=1")
        .then((d) => setFiscais(d.fiscais))
        .catch(() => setFiscais([]));
    }
  }, [profile.role]);

  const isCitizen = profile.role === "cidadao";
  const isGestor = profile.role === "gestor";
  const isFiscal = profile.role === "fiscal";

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar"
        description={error}
        action={<Button onClick={load}>Tentar novamente</Button>}
      />
    );
  }
  if (!data) return <ScreenLoader label="Carregando ocorrência…" />;

  const o = data.occurrence;

  const sendComment = async () => {
    if (commentText.trim().length < 2) return;
    setSending(true);
    try {
      await apiPatch(`/api/occurrences/${id}`, {
        action: "comment",
        text: commentText,
        visibility: commentVisibility,
      });
      setCommentText("");
      toast.success("Comentário publicado.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao comentar.");
    } finally {
      setSending(false);
    }
  };

  const reassign = async (fiscalId: string) => {
    if (!fiscalId) return;
    setBusy(true);
    try {
      await apiPatch(`/api/occurrences/${id}`, { action: "reassign", fiscal_id: fiscalId });
      toast.success("Ocorrência redistribuída.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao redistribuir.");
    } finally {
      setBusy(false);
    }
  };

  const escalate = async () => {
    setBusy(true);
    try {
      await apiPatch(`/api/occurrences/${id}`, { action: "escalate", note: escalateNote || undefined });
      toast.success("Caso escalonado.");
      setEscalateOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao escalonar.");
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    setBusy(true);
    try {
      await apiPatch(`/api/occurrences/${id}`, { action: "archive", reason: archiveReason || undefined });
      toast.success("Ocorrência arquivada.");
      setArchiveOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao arquivar.");
    } finally {
      setBusy(false);
    }
  };

  const mapPoint: MapPoint = {
    id: o.id,
    lat: o.lat,
    lng: o.lng,
    category: o.category,
    urgency: o.urgency_score,
    status: o.status,
    bairro: o.bairro,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={o.status} />
        <UrgencyBadge urgency={o.urgency_score} />
        <span className="text-xs text-muted-foreground">
          Registrada em {fmtDateTime(o.created_at)} · {o.bairro ?? "bairro não informado"}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{o.category}</h1>
        {o.subcategory && <p className="text-sm font-medium text-primary">{o.subcategory}</p>}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {o.description}
        </p>
      </div>

      <SLATimer deadline={o.sla_deadline} created={o.created_at} />

      {data.media.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fotos e vídeos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {data.media.map((m) => (
                <div key={m.id} className="aspect-square overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="Mídia da ocorrência" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.inspection && !isCitizen && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-success" /> Vistoria realizada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Ação:</strong> {ACTION_LABELS[data.inspection.action_taken]}
            </p>
            <p>
              <strong>Chegada:</strong> {fmtDateTime(data.inspection.arrival_at)}
            </p>
            {data.inspection.fine_amount != null && (
              <p>
                <strong>Multa:</strong>{" "}
                {data.inspection.fine_amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                · Processo {data.inspection.fine_process_number}
              </p>
            )}
            <p className="whitespace-pre-wrap text-muted-foreground">
              {data.inspection.report_json.laudo}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de status</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-4 border-l pl-5">
            {data.logs.map((log) => {
              const Icon = STATUS_ICON[log.to_status as OccurrenceStatus] ?? CircleDot;
              return (
                <li key={log.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border bg-card",
                      log.to_status === "resolvida" && "text-success",
                      log.to_status === "escalonada" && "text-danger"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-medium">
                      {log.from_status ? STATUS_LABELS[log.from_status as OccurrenceStatus] : "—"}{" "}
                      → {STATUS_LABELS[log.to_status as OccurrenceStatus]}
                    </p>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(log.changed_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.changed_by_name ?? "Sistema"}
                    {profile.role === "auditor" && log.ip_address && (
                      <span className="ml-1">· IP {log.ip_address}</span>
                    )}
                  </p>
                  {log.note && <p className="mt-0.5 text-xs italic text-muted-foreground">{log.note}</p>}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" /> Localização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MapHeatmap points={[mapPoint]} height={220} zoom={15} />
          <p className="mt-2 text-xs text-muted-foreground">
            {o.lat.toFixed(5)}, {o.lng.toFixed(5)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" /> Comentários
            {isCitizen && (
              <span className="text-xs font-normal text-muted-foreground">
                — você vê apenas mensagens públicas (LGPD)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
          )}
          {data.comments.map((c) => (
            <div key={c.id} className="rounded-lg border bg-secondary/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {c.author_name ?? "Servidor municipal"}
                  {c.visibility === "internal" && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" /> interno
                    </span>
                  )}
                </p>
                <span className="text-xs text-muted-foreground">{fmtDateTime(c.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.text}</p>
            </div>
          ))}

          {(isCitizen || isFiscal || isGestor) && (
            <div className="space-y-2 pt-1">
              <Textarea
                rows={2}
                placeholder="Escreva um comentário…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                {!isCitizen && (
                  <Select
                    value={commentVisibility}
                    onValueChange={(v) => setCommentVisibility(v as "public" | "internal")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="internal">Interno (equipe)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" onClick={sendComment} disabled={sending || commentText.trim().length < 2}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isFiscal && o.status !== "resolvida" && o.status !== "arquivada" && (
        <Button
          className="w-full"
          onClick={() => router.push(`/app/fiscal/vistoria?o=${o.id}`)}
        >
          <HardHat className="h-4 w-4" /> Ir para vistoria em campo
        </Button>
      )}

      {isGestor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações da gestão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["atribuida", "em_vistoria", "escalonada"].includes(o.status) && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-44 flex-1 space-y-1">
                  <Label>Redistribuir para</Label>
                  <Select onValueChange={reassign}>
                    <SelectTrigger disabled={busy}>
                      <SelectValue placeholder={o.assigned_fiscal_name ?? "Selecionar fiscal…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {fiscais.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {o.status !== "escalonada" && !["resolvida", "arquivada"].includes(o.status) && (
                <Button variant="destructive" size="sm" onClick={() => setEscalateOpen(true)}>
                  <AlertTriangle className="h-4 w-4" /> Escalonar caso
                </Button>
              )}
              {!["resolvida", "arquivada"].includes(o.status) && (
                <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                  <Archive className="h-4 w-4" /> Arquivar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalonar ocorrência</DialogTitle>
            <DialogDescription>
              O caso sairá da fila do fiscal atual e aparecerá para a gestão redistribuir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="esc-note">Motivo do escalonamento</Label>
            <Textarea
              id="esc-note"
              rows={3}
              placeholder="Ex.: fiscal sem retorno há 72h; caso requer urgência…"
              value={escalateNote}
              onChange={(e) => setEscalateNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={escalate} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Escalonar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar ocorrência</DialogTitle>
            <DialogDescription>A ocorrência ficará inativa e sairá dos painéis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="arc-reason">Motivo do arquivamento</Label>
            <Input
              id="arc-reason"
              placeholder="Ex.: duplicata; informação insuficiente…"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={archive} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {o.status === "escalonada" && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Caso escalonado — aguardando redistribuição pela gestão.
        </div>
      )}
      {o.status === "arquivada" && o.archive_reason && (
        <p className="text-xs text-muted-foreground">Arquivada: {o.archive_reason}</p>
      )}
      {o.duplicate_of && (
        <p className="text-xs text-muted-foreground">
          Marcada como relacionada a outra ocorrência (duplicidade detectada por IA).
        </p>
      )}
      {isGestor && <StatusOSBadge status="aberta" className="hidden" />}
    </div>
  );
}
