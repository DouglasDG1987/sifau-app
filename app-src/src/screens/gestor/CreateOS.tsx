"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FilePlus2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { apiGet, apiPost } from "@/lib/api";
import { getCurrentPosition, GeoError } from "@/services/geolocation";
import { cn } from "@/lib/utils";
import type { OrdemServico, OrgaoApoio, OrigemOS, Profile } from "@/lib/types";
import { ORGAO_APOIO_LABELS, ORIGEM_OS_LABELS } from "@/lib/types";

const schema = z.object({
  origem_os: z.string().min(1, "Selecione a origem."),
  requerente: z.string().min(3, "Informe o requerente."),
  fiscal_id: z.string().optional(),
  servico_descricao: z.string().min(20, "Descreva o serviço (mínimo 20 caracteres)."),
  endereco: z.string().min(5, "Informe o endereço."),
  prazo_dias: z
    .number({ message: "Informe o prazo em dias." })
    .min(1)
    .max(365),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateOS({ profile, denunciaId }: { profile: Profile; denunciaId?: string | null }) {
  const router = useRouter();
  const [fiscais, setFiscais] = useState<{ id: string; nome: string }[]>([]);
  const [legislacao, setLegislacao] = useState<string[]>([]);
  const [selectedLeis, setSelectedLeis] = useState<string[]>([]);
  const [apoio, setApoio] = useState(false);
  const [orgaoApoio, setOrgaoApoio] = useState<OrgaoApoio | "">("");
  const [outroApoio, setOutroApoio] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      origem_os: denunciaId ? "denuncia" : "",
      requerente: denunciaId ? `Denúncia anônima (ocorrência ${denunciaId.slice(0, 8)})` : "",
      prazo_dias: 7,
      latitude: NaN,
      longitude: NaN,
    },
  });

  useEffect(() => {
    apiGet<{ fiscais: { id: string; nome: string }[] }>("/api/os?fiscais=1")
      .then((d) => setFiscais(d.fiscais))
      .catch(() => setFiscais([]));
    apiGet<{ config: { legislacao_aplicavel: string[] } | null }>("/api/prefeitura")
      .then((d) => setLegislacao(d.config?.legislacao_aplicavel ?? []))
      .catch(() => setLegislacao([]));
  }, []);

  const toggleLei = (lei: string) => {
    setSelectedLeis((prev) => (prev.includes(lei) ? prev.filter((l) => l !== lei) : [...prev, lei]));
  };

  const captureLocation = async () => {
    try {
      setLocating(true);
      const pos = await getCurrentPosition();
      form.setValue("latitude", pos.lat, { shouldValidate: true });
      form.setValue("longitude", pos.lng, { shouldValidate: true });
      toast.success("Coordenadas do endereço capturadas.");
    } catch (e) {
      if (e instanceof GeoError) toast.error(e.message);
      else toast.error("Falha ao capturar localização.");
    } finally {
      setLocating(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await apiPost<{ os: OrdemServico }>("/api/os", {
        ...values,
        denuncia_id: denunciaId ?? null,
        apoio_operacional: apoio,
        orgao_apoio: apoio ? orgaoApoio || null : null,
        orgao_apoio_outro: apoio && orgaoApoio === "outro" ? outroApoio || null : null,
        legislacao_aplicavel: selectedLeis,
        latitude: Number.isFinite(values.latitude) ? values.latitude : null,
        longitude: Number.isFinite(values.longitude) ? values.longitude : null,
      });
      toast.success(`OS ${res.os.numero_os} emitida com sucesso.`);
      router.push(`/app/gestor/os/${res.os.id}`);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Falha ao criar a OS.");
    } finally {
      setSubmitting(false);
    }
  };

  const errors = form.formState.errors;
  const origem = form.watch("origem_os");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Emitir Ordem de Serviço</h1>
        <p className="text-sm text-muted-foreground">
          Documento formal de fiscalização — fica vinculado à trilha de auditoria.
        </p>
      </div>

      {denunciaId && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          OS originada da ocorrência escalonada <strong>{denunciaId.slice(0, 8)}</strong> — requerente
          anonimizado (LGPD).
        </p>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Origem e responsáveis</CardTitle>
            <CardDescription>Identificação administrativa da OS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="origem">Origem da OS</Label>
              <Select
                value={origem}
                onValueChange={(v) => form.setValue("origem_os", v, { shouldValidate: true })}
              >
                <SelectTrigger id="origem">
                  <SelectValue placeholder="Selecione a origem…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ORIGEM_OS_LABELS) as OrigemOS[]).map((o) => (
                    <SelectItem key={o} value={o}>
                      {ORIGEM_OS_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.origem_os && <p className="text-xs text-danger">{errors.origem_os.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="requerente">Requerente</Label>
              <Input id="requerente" {...form.register("requerente")} placeholder="Ex.: Ofício 88/2025 — Câmara Municipal" />
              {errors.requerente && <p className="text-xs text-danger">{errors.requerente.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal">Fiscal responsável</Label>
              <Select onValueChange={(v) => form.setValue("fiscal_id", v)}>
                <SelectTrigger id="fiscal">
                  <SelectValue placeholder="Selecionar fiscal…" />
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
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo de resposta (dias)</Label>
              <Input
                id="prazo"
                type="number"
                min={1}
                max={365}
                {...form.register("prazo_dias", { valueAsNumber: true })}
              />
              {errors.prazo_dias && <p className="text-xs text-danger">{errors.prazo_dias.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição do serviço</Label>
              <Textarea
                id="desc"
                rows={4}
                placeholder="Descreva o objeto da vistoria: local, o que verificar, fundamentos…"
                {...form.register("servico_descricao")}
              />
              {errors.servico_descricao && (
                <p className="text-xs text-danger">{errors.servico_descricao.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Legislação aplicável</Label>
              {legislacao.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma legislação configurada.</p>
              ) : (
                <div className="space-y-1.5">
                  {legislacao.map((lei) => (
                    <label
                      key={lei}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                        selectedLeis.includes(lei) ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <Checkbox
                        checked={selectedLeis.includes(lei)}
                        onCheckedChange={() => toggleLei(lei)}
                        aria-label={`Selecionar ${lei}`}
                      />
                      <span>{lei}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Local e apoio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" {...form.register("endereco")} placeholder="Rua, número, bairro" />
              {errors.endereco && <p className="text-xs text-danger">{errors.endereco.message}</p>}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={captureLocation} disabled={locating}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {locating ? "Capturando…" : "Capturar coordenadas do endereço"}
            </Button>
            {Number.isFinite(Number(form.watch("latitude"))) && (
              <p className="text-xs text-muted-foreground">
                GPS: {Number(form.watch("latitude")).toFixed(5)}, {Number(form.watch("longitude")).toFixed(5)}
              </p>
            )}
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Apoio operacional</p>
                <p className="text-xs text-muted-foreground">Polícia Militar, Guarda Municipal ou outro órgão</p>
              </div>
              <Switch checked={apoio} onCheckedChange={setApoio} aria-label="Apoio operacional" />
            </div>
            {apoio && (
              <div className="animate-fade-in grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgao">Órgão de apoio</Label>
                  <Select value={orgaoApoio} onValueChange={(v) => setOrgaoApoio(v as OrgaoApoio)}>
                    <SelectTrigger id="orgao">
                      <SelectValue placeholder="Selecionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ORGAO_APOIO_LABELS) as OrgaoApoio[]).map((o) => (
                        <SelectItem key={o} value={o}>
                          {ORGAO_APOIO_LABELS[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {orgaoApoio === "outro" && (
                  <div className="space-y-2">
                    <Label htmlFor="outro">Qual órgão?</Label>
                    <Input id="outro" value={outroApoio} onChange={(e) => setOutroApoio(e.target.value)} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {banner && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            {banner}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
            Emitir OS
          </Button>
        </div>
      </form>
    </div>
  );
}
