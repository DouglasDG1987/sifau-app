"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  FileWarning,
  Loader2,
  Lock,
  MapPin,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrigemOSBadge, StatusOSBadge, CienciaBadge } from "@/components/badges";
import { ScreenLoader, EmptyState } from "@/components/empty-state";
import { cn, fmtCurrency, fmtDateTime, fmtCoords, fmtDuration } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useNow, useOnline } from "@/lib/hooks";
import { getCurrentPosition, GeoError } from "@/services/geolocation";
import { capturePhoto } from "@/services/media";
import { generateOSVistoriaPdf } from "@/services/pdf";
import type {
  AutoInfracao,
  CienciaStatus,
  OrdemServico,
  OrgaoApoio,
  Profile,
  TipoInfracao,
  Vistoria,
} from "@/lib/types";
import { CIENCIA_LABELS, GEOFENCE_RADIUS_M, ORGAO_APOIO_LABELS, STATUS_OS_LABELS } from "@/lib/types";

interface OSDetail {
  os: OrdemServico;
  vistorias: Vistoria[];
  autos: (AutoInfracao & { tipo_infracao?: TipoInfracao | null })[];
}

export default function FiscalOSDetail({ profile, id }: { profile: Profile; id: string }) {
  const router = useRouter();
  const online = useOnline();
  const now = useNow(1000);
  const [data, setData] = useState<OSDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TipoInfracao[]>([]);
  const [prefeitura, setPrefeitura] = useState("Prefeitura Municipal");

  // Início de vistoria
  const [starting, setStarting] = useState(false);
  // Finalização
  const [relatorio, setRelatorio] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  // Auto de infração
  const [autoOpen, setAutoOpen] = useState(false);
  const [tipoId, setTipoId] = useState("");
  const [valorMulta, setValorMulta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [autuadoNome, setAutuadoNome] = useState("");
  const [autuadoDoc, setAutuadoDoc] = useState("");
  const [testemunha, setTestemunha] = useState("");
  const [ciencia, setCiencia] = useState<CienciaStatus>("assinou");
  const [submitting, setSubmitting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await apiGet<OSDetail>(`/api/os/${id}`);
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
    apiGet<{
      config: { nome_prefeitura: string } | null;
      tipos: TipoInfracao[];
    }>("/api/prefeitura")
      .then((d) => {
        setPrefeitura(d.config?.nome_prefeitura ?? "Prefeitura Municipal");
        setTipos(d.tipos);
        if (d.tipos[0]) setTipoId(d.tipos[0].id);
      })
      .catch(() => setTipos([]));
  }, []);

  if (error) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Não foi possível carregar a OS"
        description={error}
        action={<Button onClick={load}>Tentar novamente</Button>}
      />
    );
  }
  if (!data) return <ScreenLoader label="Carregando OS…" />;

  const { os, vistorias, autos } = data;
  const vistoriaAtiva = vistorias.find((v) => v.status === "em_andamento");
  const vistoriaFinal = vistorias.find((v) => v.status === "finalizada");

  const canStart = os.status === "aberta" && !vistoriaAtiva;
  const canFinish = Boolean(vistoriaAtiva);

  const addPhoto = async () => {
    try {
      setCapturing(true);
      const p = await capturePhoto();
      setFotos((prev) => [...prev.slice(0, 5), p.dataUrl]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao capturar foto.");
    } finally {
      setCapturing(false);
    }
  };

  const startVistoria = async () => {
    setStarting(true);
    try {
      const pos = await getCurrentPosition();
      const res = await apiPatch<{ ok: boolean; vistoria_id?: string }>(`/api/os/${id}`, {
        action: "iniciar_vistoria",
        lat: pos.lat,
        lng: pos.lng,
        precisao_m: pos.accuracyM,
      });
      if (res.ok) {
        toast.success("Vistoria iniciada! Cronômetro rodando.");
        load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar vistoria.", {
        duration: 6000,
      });
    } finally {
      setStarting(false);
    }
  };

  const uploadFotos = async (list: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const d of list) {
      const up = await apiPost<{ url: string }>("/api/media", { dataUrl: d, kind: "foto" });
      urls.push(up.url);
    }
    return urls;
  };

  const finishVistoria = async () => {
    if (!vistoriaAtiva) return;
    if (!relatorio.trim()) {
      toast.error("Escreva o relatório da vistoria.");
      return;
    }
    if (fotos.length === 0) {
      toast.error("Adicione ao menos 1 foto da vistoria.");
      return;
    }
    if (autoOpen) {
      if (!tipoId) {
        toast.error("Selecione o tipo de infração.");
        return;
      }
      if (!valorMulta || !motivo.trim() || !autuadoNome.trim() || !autuadoDoc.trim()) {
        toast.error("Preencha valor, motivo e dados do autuado.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const mediaUrls = await uploadFotos(fotos);
      await apiPatch(`/api/os/${id}`, {
        action: "finalizar_vistoria",
        vistoria_id: vistoriaAtiva.id,
        relatorio,
        mediaUrls,
        auto: autoOpen
          ? {
              tipo_infracao_id: tipoId,
              valor_multa: Number(valorMulta),
              motivo,
              autuado_nome: autuadoNome,
              autuado_documento: autuadoDoc,
              ciencia_status: ciencia,
              testemunha_nome: testemunha || null,
            }
          : null,
      });
      toast.success("Vistoria finalizada e OS concluída.");
      setAutoOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao finalizar.");
    } finally {
      setSubmitting(false);
    }
  };

  const generatePdf = async () => {
    if (!vistoriaFinal) return;
    setPdfBusy(true);
    try {
      generateOSVistoriaPdf({
        prefeitura,
        os,
        vistoria: vistoriaFinal,
        auto: autos[0] ?? null,
        fiscalNome: os.fiscal_nome ?? profile.nome,
        gerenteNome: os.gerente_nome ?? "Gestão municipal",
      });
      toast.success("PDF do relatório gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  const elapsedMs = vistoriaAtiva ? now - new Date(vistoriaAtiva.iniciada_em).getTime() : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{os.numero_os}</h1>
          <p className="text-sm text-muted-foreground">Emitida em {fmtDateTime(os.data_emissao)}</p>
        </div>
        <div className="flex gap-1.5">
          <OrigemOSBadge origem={os.origem_os} />
          <StatusOSBadge status={os.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados administrativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Requerente:</strong> {os.requerente}</p>
          <p><strong>Gestor responsável:</strong> {os.gerente_nome ?? "—"}</p>
          <p><strong>Fiscal:</strong> {os.fiscal_nome ?? "—"}</p>
          <p><strong>Prazo de resposta:</strong> {fmtDateTime(os.prazo_resposta)}</p>
          {os.apoio_operacional && (
            <p>
              <strong>Apoio operacional:</strong>{" "}
              {os.orgao_apoio === "outro" ? os.orgao_apoio_outro : ORGAO_APOIO_LABELS[os.orgao_apoio as OrgaoApoio] ?? "—"}
            </p>
          )}
          {os.legislacao_aplicavel.length > 0 && (
            <div>
              <p className="mb-1"><strong>Legislação aplicável:</strong></p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {os.legislacao_aplicavel.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4" /> {os.endereco} {os.latitude != null && `(${fmtCoords(os.latitude, os.longitude)})`}
          </p>
          <p className="whitespace-pre-wrap text-muted-foreground">{os.servico_descricao}</p>
        </CardContent>
      </Card>

      {canStart && (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm">
              <strong>Vistoria com geofencing:</strong> você precisa estar a até{" "}
              {GEOFENCE_RADIUS_M}m do endereço da OS para iniciar.
            </p>
            <Button onClick={startVistoria} disabled={starting || !online}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
              {starting ? "Verificando GPS…" : "Iniciar vistoria (GPS)"}
            </Button>
          </CardContent>
        </Card>
      )}

      {vistoriaAtiva && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-warning" /> Vistoria em andamento
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                {fmtDuration(elapsedMs)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Início: {fmtDateTime(vistoriaAtiva.iniciada_em)} · GPS{" "}
              {fmtCoords(vistoriaAtiva.geo_inicio_lat, vistoriaAtiva.geo_inicio_lng)} (precisão{" "}
              {Math.round(vistoriaAtiva.geo_inicio_precisao_m ?? 0)}m)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="relatorio">Relatório da vistoria</Label>
              <Textarea
                id="relatorio"
                rows={5}
                placeholder="Descreva a situação encontrada, medidas adotadas, prazos…"
                value={relatorio}
                onChange={(e) => setRelatorio(e.target.value)}
              />
            </div>
            <div>
              <Label>Fotos da vistoria</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remover foto"
                      onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {fotos.length < 6 && (
                  <button
                    type="button"
                    onClick={addPhoto}
                    disabled={capturing}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                  >
                    {capturing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    Foto
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-secondary/40 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Auto de Infração</strong> — registro de ciência do autuado para validade jurídica
                </span>
              </div>
              <Button size="sm" variant={autoOpen ? "default" : "outline"} onClick={() => setAutoOpen((v) => !v)}>
                {autoOpen ? "Remover auto" : "Lançar auto"}
              </Button>
            </div>

            {autoOpen && (
              <div className="animate-fade-in space-y-3 rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="tipo">Tipo de infração</Label>
                    <Select value={tipoId} onValueChange={(v) => {
                      setTipoId(v);
                      const t = tipos.find((x) => x.id === v);
                      if (t) setValorMulta(String(t.valor_base));
                    }}>
                      <SelectTrigger id="tipo">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.artigo_legal} — {t.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="valor">Valor da multa (R$)</Label>
                    <Input
                      id="valor"
                      inputMode="decimal"
                      value={valorMulta}
                      onChange={(e) => setValorMulta(e.target.value)}
                      placeholder="2500,00"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="motivo">Motivo</Label>
                  <Textarea
                    id="motivo"
                    rows={2}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Descrição da infração constatada…"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="autuado">Autuado (nome/razão social)</Label>
                    <Input id="autuado" value={autuadoNome} onChange={(e) => setAutuadoNome(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="doc">Documento (CPF/CNPJ)</Label>
                    <Input id="doc" value={autuadoDoc} onChange={(e) => setAutuadoDoc(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="testemunha">Testemunha (opcional)</Label>
                    <Input id="testemunha" value={testemunha} onChange={(e) => setTestemunha(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ciencia">Ciência do autuado</Label>
                    <Select value={ciencia} onValueChange={(v) => setCiencia(v as CienciaStatus)}>
                      <SelectTrigger id="ciencia">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CIENCIA_LABELS) as CienciaStatus[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CIENCIA_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={finishVistoria} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Finalizar vistoria
            </Button>
          </CardContent>
        </Card>
      )}

      {vistoriaFinal && (
        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-base">Vistoria concluída</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Início:</strong> {fmtDateTime(vistoriaFinal.iniciada_em)} ·{" "}
              <strong>Fim:</strong> {fmtDateTime(vistoriaFinal.finalizada_em)}
            </p>
            <p className="whitespace-pre-wrap text-muted-foreground">{vistoriaFinal.relatorio}</p>
            {vistoriaFinal.fotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {vistoriaFinal.fotos.map((f) => (
                  <div key={f} className="h-16 w-16 overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f} alt="Foto da vistoria" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {autos.map((a) => (
              <div key={a.id} className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm">
                <p className="font-semibold">Auto de Infração — {a.tipo_infracao?.artigo_legal}</p>
                <p className="text-muted-foreground">{a.tipo_infracao?.descricao}</p>
                <p>
                  <strong>Multa:</strong> {fmtCurrency(a.valor_multa)}
                </p>
                <p>
                  <strong>Autuado:</strong> {a.autuado_nome} ({a.autuado_documento})
                </p>
                <p className="flex items-center gap-2">
                  <strong>Ciência:</strong> <CienciaBadge status={a.ciencia_status} />
                </p>
                {a.testemunha_nome && <p><strong>Testemunha:</strong> {a.testemunha_nome}</p>}
                {a.motivo && <p className="text-xs text-muted-foreground">Motivo: {a.motivo}</p>}
              </div>
            ))}
            <Button variant="secondary" onClick={generatePdf} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Gerar PDF do relatório
            </Button>
            {os.status === "cancelada" && <p className="text-xs text-muted-foreground">Status: {STATUS_OS_LABELS[os.status]}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
