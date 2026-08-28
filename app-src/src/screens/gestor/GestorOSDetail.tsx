"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrigemOSBadge, StatusOSBadge, CienciaBadge } from "@/components/badges";
import { ScreenLoader, EmptyState } from "@/components/empty-state";
import { fmtCurrency, fmtDateTime, fmtCoords } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api";
import type { AutoInfracao, OrdemServico, OrgaoApoio, Profile, TipoInfracao, Vistoria } from "@/lib/types";
import { ORGAO_APOIO_LABELS } from "@/lib/types";

interface OSDetail {
  os: OrdemServico;
  vistorias: Vistoria[];
  autos: (AutoInfracao & { tipo_infracao?: TipoInfracao | null })[];
}

export default function GestorOSDetail({ profile, id }: { profile: Profile; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<OSDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [busy, setBusy] = useState(false);

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

  if (error) {
    return (
      <EmptyState
        icon={Ban}
        title="Não foi possível carregar a OS"
        description={error}
        action={<Button onClick={load}>Tentar novamente</Button>}
      />
    );
  }
  if (!data) return <ScreenLoader label="Carregando OS…" />;

  const { os, vistorias, autos } = data;

  const cancelar = async () => {
    setBusy(true);
    try {
      await apiPatch(`/api/os/${id}`, { action: "cancelar", motivo: cancelMotivo });
      toast.success("OS cancelada.");
      setCancelOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao cancelar.");
    } finally {
      setBusy(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <OrigemOSBadge origem={os.origem_os} />
          <StatusOSBadge status={os.status} />
          {os.status !== "cancelada" && os.status !== "concluida" && (
            <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados administrativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Requerente:</strong> {os.requerente}</p>
          <p><strong>Gestor responsável:</strong> {os.gerente_nome ?? "—"} (você)</p>
          <p><strong>Fiscal designado:</strong> {os.fiscal_nome ?? "não designado"}</p>
          <p><strong>Prazo:</strong> {fmtDateTime(os.prazo_resposta)}</p>
          {os.apoio_operacional && (
            <p>
              <strong>Apoio operacional:</strong>{" "}
              {os.orgao_apoio === "outro" ? os.orgao_apoio_outro : ORGAO_APOIO_LABELS[os.orgao_apoio as OrgaoApoio] ?? "—"}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4" /> {os.endereco}{" "}
            {os.latitude != null && `(${fmtCoords(os.latitude, os.longitude)})`}
          </p>
          <p className="whitespace-pre-wrap text-muted-foreground">{os.servico_descricao}</p>
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
        </CardContent>
      </Card>

      {vistorias.map((v) => (
        <Card key={v.id} className={v.status === "finalizada" ? "border-success/30" : "border-warning/40"}>
          <CardHeader>
            <CardTitle className="text-base">
              Vistoria {v.status === "finalizada" ? "concluída" : "em andamento"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Início:</strong> {fmtDateTime(v.iniciada_em)} ·{" "}
              <strong>Fim:</strong> {fmtDateTime(v.finalizada_em)}
            </p>
            <p className="text-xs text-muted-foreground">
              GPS inicial: {fmtCoords(v.geo_inicio_lat, v.geo_inicio_lng)} (precisão{" "}
              {Math.round(v.geo_inicio_precisao_m ?? 0)}m)
            </p>
            {v.relatorio && <p className="whitespace-pre-wrap text-muted-foreground">{v.relatorio}</p>}
            {v.fotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {v.fotos.map((f) => (
                  <div key={f} className="h-16 w-16 overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f} alt="Foto da vistoria" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {autos.map((a) => (
        <Card key={a.id} className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-base">Auto de Infração — {a.tipo_infracao?.artigo_legal}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{a.tipo_infracao?.descricao}</p>
            <p><strong>Multa:</strong> {fmtCurrency(a.valor_multa)}</p>
            <p><strong>Autuado:</strong> {a.autuado_nome} ({a.autuado_documento})</p>
            <p className="flex items-center gap-2">
              <strong>Ciência:</strong> <CienciaBadge status={a.ciencia_status} />
            </p>
            {a.testemunha_nome && <p><strong>Testemunha:</strong> {a.testemunha_nome}</p>}
            {a.motivo && <p className="text-xs text-muted-foreground">Motivo: {a.motivo}</p>}
          </CardContent>
        </Card>
      ))}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar OS {os.numero_os}</DialogTitle>
            <DialogDescription>O cancelamento é registrado na trilha de auditoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-cancel">Motivo do cancelamento</Label>
            <Input id="motivo-cancel" value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} placeholder="Ex.: OS emitida em duplicidade…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={cancelar} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Cancelar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
