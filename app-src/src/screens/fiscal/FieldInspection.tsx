"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Camera,
  ImagePlus,
  Loader2,
  MapPin,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, UrgencyBadge } from "@/components/badges";
import { SLATimer } from "@/components/SLATimer";
import { EmptyState, LoadingState } from "@/components/empty-state";
import { cn, fmtDateTime, fmtCoords } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useOnline } from "@/lib/hooks";
import { capturePhoto } from "@/services/media";
import { getCurrentPosition, GeoError } from "@/services/geolocation";
import { loadPending, savePending, removePending, addPending, type PendingInspection } from "@/services/offline";
import type { InspectionAction, Occurrence, Profile } from "@/lib/types";
import { ACTION_LABELS, ACTION_OPTIONS } from "@/lib/types";

interface Arrival {
  at: string;
  lat: number | null;
  lng: number | null;
}

export default function FieldInspection({ profile }: { profile: Profile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("o");
  const online = useOnline();

  const [queue, setQueue] = useState<Occurrence[] | null>(null);
  const [active, setActive] = useState<Occurrence | null>(null);
  const [pending, setPending] = useState<PendingInspection[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado da vistoria ativa
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [capturingArrival, setCapturingArrival] = useState(false);
  const [report, setReport] = useState("");
  const [action, setAction] = useState<InspectionAction | "">("");
  const [fineAmount, setFineAmount] = useState("");
  const [fineProcess, setFineProcess] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const loadPendingData = () => {
      setPending(loadPending());
    };
    loadPendingData();
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const d = await apiGet<{ queue: Occurrence[] }>("/api/occurrences");
      setQueue(d.queue);
      return d.queue;
    } catch {
      toast.error("Sem conexão com o servidor. Você ainda pode vistoriar se já tiver a fila carregada.");
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const q = await loadQueue();
      setLoading(false);
      if (preselectedId && q) {
        const found = q.find((o) => o.id === preselectedId);
        if (found) setActive(found);
        else toast.warning("Esta ocorrência não está mais na sua fila.");
      }
    })();
  }, [loadQueue, preselectedId]);

  const resetForm = () => {
    setArrival(null);
    setReport("");
    setAction("");
    setFineAmount("");
    setFineProcess("");
    setPhotos([]);
  };

  const startInspection = (o: Occurrence) => {
    resetForm();
    setActive(o);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const captureArrival = async () => {
    try {
      setCapturingArrival(true);
      const pos = await getCurrentPosition();
      setArrival({ at: pos.timestamp, lat: pos.lat, lng: pos.lng });
      toast.success("Chegada registrada.");
    } catch (e) {
      if (e instanceof GeoError) toast.error(e.message);
      else toast.error("Falha ao capturar a localização.");
    } finally {
      setCapturingArrival(false);
    }
  };

  const addPhoto = async () => {
    try {
      setCapturingPhoto(true);
      const p = await capturePhoto();
      setPhotos((prev) => [...prev.slice(0, 4), p.dataUrl]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao capturar foto.");
    } finally {
      setCapturingPhoto(false);
    }
  };

  const uploadPhotos = async (list: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const dataUrl of list) {
      const up = await apiPost<{ url: string }>("/api/media", { dataUrl, kind: "foto" });
      urls.push(up.url);
    }
    return urls;
  };

  const submitOnline = async (p: PendingInspection) => {
    const mediaUrls = await uploadPhotos(p.photos);
    await apiPost("/api/inspections", {
      occurrence_id: p.occurrence_id,
      arrival_at: p.arrival_at,
      arrival_lat: p.arrival_lat,
      arrival_lng: p.arrival_lng,
      report: p.report,
      action_taken: p.action_taken,
      fine_amount: p.fine_amount ? Number(p.fine_amount) : null,
      fine_process_number: p.fine_process_number || null,
      mediaUrls,
      geo: p.arrival_lat != null ? `${p.arrival_lat.toFixed(5)},${p.arrival_lng?.toFixed(5) ?? ""}` : null,
    });
  };

  const submit = async () => {
    if (!active) return;
    // Validações
    if (!arrival) {
      toast.error("Registre a chegada (geolocalização + hora) antes de finalizar.");
      return;
    }
    if (photos.length === 0) {
      toast.error("Adicione pelo menos 1 foto de depois para finalizar.");
      return;
    }
    if (!action) {
      toast.error("Selecione a ação tomada na vistoria.");
      return;
    }
    if (action === "multa" && (!fineAmount || !fineProcess)) {
      toast.error("Informe o valor da multa e o número do processo.");
      return;
    }

    const pendingItem: PendingInspection = {
      id: `${active.id}-${Date.now()}`,
      occurrence_id: active.id,
      occurrence_snapshot: {
        category: active.category,
        description: active.description,
        bairro: active.bairro,
        urgency_score: active.urgency_score,
        status: active.status,
      },
      arrival_at: arrival.at,
      arrival_lat: arrival.lat,
      arrival_lng: arrival.lng,
      report,
      action_taken: action,
      fine_amount: fineAmount,
      fine_process_number: fineProcess,
      photos,
      created_at: new Date().toISOString(),
    };

    if (!online) {
      const items = addPending(pendingItem);
      setPending(items);
      toast.info("Offline: vistoria salva no aparelho. Ela será sincronizada quando houver conexão.");
      setActive(null);
      resetForm();
      return;
    }

    setSubmitting(true);
    try {
      await submitOnline(pendingItem);
      toast.success("Vistoria registrada e ocorrência resolvida!");
      setActive(null);
      resetForm();
      loadQueue();
    } catch (e) {
      // Falha de rede no meio do envio → cai na fila offline
      const items = addPending(pendingItem);
      setPending(items);
      toast.error(
        e instanceof Error && e.message.includes("conexão")
          ? "Sem conexão — salvo no aparelho para sincronizar depois."
          : `Falha ao enviar: ${e instanceof Error ? e.message : "erro"}. Salvo localmente.`
      );
      setActive(null);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const syncAll = async () => {
    if (pending.length === 0) return;
    setSyncing(true);
    try {
      let ok = 0;
      let rest = [...pending];
      for (const p of rest) {
        try {
          await submitOnline(p);
          ok++;
          rest = removePending(p.id);
          setPending(rest);
        } catch {
          break; // sem conexão de novo — para e mantém o restante
        }
      }
      toast.success(`${ok} vistoria(s) sincronizada(s).`);
      if (rest.length > 0) toast.warning(`${rest.length} ainda aguardando conexão.`);
      loadQueue();
    } finally {
      setSyncing(false);
    }
  };

  const fineVisible = action === "multa";
  const queuedOpen = useMemo(() => (queue ?? []).filter((o) => o.status !== "resolvida"), [queue]);

  if (loading) return <LoadingState label="Carregando fila de vistoria…" rows={4} />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vistoria em campo</h1>
        <p className="text-sm text-muted-foreground">
          Modo offline-first: sem internet, seus registros ficam salvos no aparelho.
        </p>
      </div>

      {/* Indicador de conectividade */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium",
          online ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"
        )}
      >
        <span className="flex items-center gap-2">
          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {online ? "Conectado — sincronização em tempo real" : "Offline — registros salvos no aparelho"}
        </span>
        {pending.length > 0 && online && (
          <Button size="sm" variant="outline" onClick={syncAll} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar ({pending.length})
          </Button>
        )}
      </div>

      {!online && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-warning">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Você está offline. As vistorias serão salvas localmente (localStorage hoje;{" "}
            <code>@capacitor/preferences</code> no APK) e sincronizadas automaticamente quando a
            conexão voltar.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <Card className="border-warning/40">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">
              {pending.length} vistoria(s) pendente(s) de sincronização
            </p>
            {pending.map((p) => (
              <div key={p.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.occurrence_snapshot.category}</p>
                  <p className="truncate text-muted-foreground">
                    {fmtDateTime(p.created_at)} · {ACTION_LABELS[p.action_taken]} · {p.photos.length} foto(s)
                  </p>
                </div>
                <button
                  aria-label="Remover vistoria pendente"
                  className="text-muted-foreground hover:text-danger"
                  onClick={() => {
                    const rest = removePending(p.id);
                    setPending(rest);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {active ? (
        <>
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setActive(null)}>
            <ArrowLeft className="h-4 w-4" /> Voltar à fila
          </Button>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status={active.status} />
                <UrgencyBadge urgency={active.urgency_score} />
              </div>
              <CardTitle className="text-lg">{active.category}</CardTitle>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {active.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">
                {active.bairro ?? "Bairro não informado"} · {fmtCoords(active.lat, active.lng)}
              </p>
              <SLATimer deadline={active.sla_deadline} created={active.created_at} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de chegada</CardTitle>
            </CardHeader>
            <CardContent>
              {arrival ? (
                <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <div>
                    <p className="font-semibold text-success">Chegada registrada</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(arrival.at)} · {fmtCoords(arrival.lat, arrival.lng)}
                    </p>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={captureArrival} disabled={capturingArrival}>
                  {capturingArrival ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  {capturingArrival ? "Capturando…" : "Registrar chegada (GPS + hora)"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Laudo estruturado</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={5}
                placeholder="Relato técnico: o que foi constatado, medidas adotadas, prazos…"
                value={report}
                onChange={(e) => setReport(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ação tomada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACTION_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAction(a.value)}
                    className={cn(
                      "min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      action === a.value
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    )}
                    aria-pressed={action === a.value}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {fineVisible && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="fine-amount">Valor da multa (R$)</Label>
                    <Input
                      id="fine-amount"
                      inputMode="decimal"
                      placeholder="850,00"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fine-process">Nº do processo</Label>
                    <Input
                      id="fine-process"
                      placeholder="2025.04.00123"
                      value={fineProcess}
                      onChange={(e) => setFineProcess(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {action === "encaminhamento" && (
                <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
                  Encaminhamento a outro órgão — ponto de integração futura com outros sistemas
                  municipais.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Fotos de depois <span className="text-danger">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Foto de depois ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remover foto"
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={addPhoto}
                    disabled={capturingPhoto}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                  >
                    {capturingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    Foto
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Obrigatória pelo menos 1 foto para finalizar (comprimida no aparelho).
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setActive(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {online ? "Registrar vistoria" : "Salvar no aparelho"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <ShieldCheckIcon />
            Você não escolhe livremente — o sistema atribui para evitar cherry-picking.
          </div>

          {queuedOpen.length === 0 ? (
            <EmptyState
              icon={ImagePlus}
              title="Fila vazia"
              description="Nenhuma ocorrência aguardando vistoria. Quando o sistema atribuir, ela aparecerá aqui na ordem definida."
            />
          ) : (
            <div className="space-y-3">
              {queuedOpen.map((o, i) => (
                <Card
                  key={o.id}
                  onClick={() => startInspection(o)}
                  className="cursor-pointer transition-all hover:border-primary/40 active:scale-[0.99]"
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={o.status} />
                        <UrgencyBadge urgency={o.urgency_score} />
                      </div>
                      <p className="mt-1.5 text-sm font-semibold">{o.category}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{o.description}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{o.bairro ?? "Bairro não informado"}</span>
                        <SLATimer deadline={o.sla_deadline} created={o.created_at} compact />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
