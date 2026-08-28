"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api";
import { capturePhoto } from "@/services/media";
import { getCurrentPosition, GeoError } from "@/services/geolocation";
import { CATEGORIES, SUBCATEGORIES, URGENCY_LABELS, URGENCY_COLORS, type AIClassificationResult, type Profile, type UrgencyLevel } from "@/lib/types";

const schema = z.object({
  category: z.string().min(1, "Selecione a categoria."),
  subcategory: z.string().optional(),
  description: z.string().min(20, "Descreva com pelo menos 20 caracteres."),
  bairro: z.string().optional(),
  lat: z
    .number({ message: "Capture a localização." })
    .refine((v) => Number.isFinite(v) && Math.abs(v) <= 90, "Latitude inválida."),
  lng: z
    .number({ message: "Capture a localização." })
    .refine((v) => Number.isFinite(v) && Math.abs(v) <= 180, "Longitude inválida."),
});

type FormValues = z.infer<typeof schema>;

interface PhotoItem {
  dataUrl: string;
  uploadedUrl?: string;
}

export default function NewOccurrence({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [manualLocation, setManualLocation] = useState(false);
  const [ai, setAi] = useState<AIClassificationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "", description: "", bairro: profile.bairro ?? "", lat: NaN, lng: NaN },
  });

  const watchCategory = form.watch("category");
  const watchDescription = form.watch("description") ?? "";
  const subOptions = watchCategory ? SUBCATEGORIES[watchCategory] ?? [] : [];

  const addPhoto = async () => {
    try {
      setCapturing(true);
      const photo = await capturePhoto();
      setPhotos((prev) => [...prev.slice(0, 4), { dataUrl: photo.dataUrl }]);
      toast.success("Foto adicionada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível capturar a foto.");
    } finally {
      setCapturing(false);
    }
  };

  const captureLocation = async () => {
    try {
      setLocating(true);
      setBanner(null);
      const pos = await getCurrentPosition();
      form.setValue("lat", pos.lat, { shouldValidate: true });
      form.setValue("lng", pos.lng, { shouldValidate: true });
      setAccuracy(pos.accuracyM);
      if (pos.accuracyM != null && pos.accuracyM > 50) {
        setBanner(
          `Precisão baixa (${Math.round(pos.accuracyM)}m). Você pode ajustar as coordenadas manualmente abaixo.`
        );
        setManualLocation(true);
      } else {
        setManualLocation(false);
      }
      toast.success("Localização capturada.");
    } catch (e) {
      if (e instanceof GeoError) toast.error(e.message);
      else toast.error("Não foi possível capturar a localização.");
    } finally {
      setLocating(false);
    }
  };

  const runAI = async () => {
    if (watchDescription.trim().length < 20) {
      toast.warning("Descreva a ocorrência com pelo menos 20 caracteres primeiro.");
      return;
    }
    setAiLoading(true);
    setBanner(null);
    try {
      const lat = Number(form.getValues("lat"));
      const lng = Number(form.getValues("lng"));
      const res = await apiPost<{ result: AIClassificationResult }>("/api/classify", {
        description: watchDescription,
        categoryHint: form.getValues("category") || undefined,
        ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
      });
      setAi(res.result);
      if (res.result.category && !form.getValues("category")) {
        form.setValue("category", res.result.category);
      }
      toast.success(
        res.result.source === "ia"
          ? "Classificação por IA concluída."
          : "IA indisponível — classificação heurística local."
      );
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Falha ao classificar.");
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setBanner(null);
    try {
      // Upload das fotos (comprimidas no cliente)
      const mediaUrls: string[] = [];
      for (const p of photos) {
        if (p.uploadedUrl) {
          mediaUrls.push(p.uploadedUrl);
          continue;
        }
        const up = await apiPost<{ url: string }>("/api/media", { dataUrl: p.dataUrl, kind: "foto" });
        p.uploadedUrl = up.url;
        mediaUrls.push(up.url);
      }
      const res = await apiPost<{ occurrence: { id: string } }>("/api/occurrences", {
        category: ai?.category ?? values.category,
        subcategory: ai?.subcategory ?? values.subcategory ?? null,
        description: values.description,
        lat: values.lat,
        lng: values.lng,
        bairro: values.bairro || null,
        mediaUrls,
        ai,
      });
      toast.success("Ocorrência registrada! Em breve um fiscal será acionado.");
      router.push(`/app/ocorrencias/${res.occurrence.id}`);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Falha ao registrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova ocorrência</h1>
        <p className="text-sm text-muted-foreground">
          Conte o que está acontecendo — quanto mais detalhes, mais rápida a ação.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categoria</CardTitle>
            <CardDescription>Qual é o tipo de problema?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => form.setValue("category", c, { shouldValidate: true })}
                  className={cn(
                    "min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all",
                    watchCategory === c
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-border text-foreground hover:border-primary/40"
                  )}
                  aria-pressed={watchCategory === c}
                >
                  {c}
                </button>
              ))}
            </div>
            {errors.category && <p className="text-xs text-danger">{errors.category.message}</p>}

            {subOptions.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="subcat">Subcategoria</Label>
                <Select
                  value={form.watch("subcategory") ?? ""}
                  onValueChange={(v) => form.setValue("subcategory", v)}
                >
                  <SelectTrigger id="subcat">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrição</CardTitle>
            <CardDescription>Onde fica, desde quando, qual o impacto?</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              placeholder="Ex.: Buraco grande na Av. Brasil, altura do nº 1200, há cerca de 2 semanas. Carros desviam e há risco de acidente…"
              {...form.register("description")}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={errors.description ? "text-danger" : "text-muted-foreground"}>
                {errors.description?.message ?? ""}
              </span>
              <span
                className={cn(
                  "font-medium",
                  watchDescription.trim().length >= 20 ? "text-success" : "text-muted-foreground"
                )}
              >
                {watchDescription.trim().length}/20 mín.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fotos</CardTitle>
            <CardDescription>Até 5 fotos — elas são comprimidas no aparelho antes do envio.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.dataUrl} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
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
                  disabled={capturing}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {capturing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      Adicionar
                    </>
                  )}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Localização</CardTitle>
            <CardDescription>Use o GPS do aparelho para apontar o local exato.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" variant="secondary" onClick={captureLocation} disabled={locating}>
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {locating ? "Capturando…" : "Capturar localização"}
            </Button>
            {Number.isFinite(Number(form.watch("lat"))) && Number.isFinite(Number(form.watch("lng"))) && (
              <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
                <strong>Coordenadas:</strong> {Number(form.watch("lat")).toFixed(5)},{" "}
                {Number(form.watch("lng")).toFixed(5)}
                {accuracy != null && (
                  <span className={cn("ml-2", accuracy > 50 ? "font-semibold text-warning" : "text-success")}>
                    · precisão {Math.round(accuracy)}m
                  </span>
                )}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setManualLocation((v) => !v)}
              >
                Ajustar manualmente
              </Button>
            </div>
            {manualLocation && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    inputMode="decimal"
                    placeholder="-23.5505"
                    {...form.register("lat", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    inputMode="decimal"
                    placeholder="-46.6333"
                    {...form.register("lng", { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}
            {errors.lat && <p className="text-xs text-danger">{errors.lat.message}</p>}
            {errors.lng && <p className="text-xs text-danger">{errors.lng.message}</p>}
            <div className="space-y-1">
              <Label htmlFor="bairro">Bairro (opcional)</Label>
              <Input id="bairro" placeholder="Centro" {...form.register("bairro")} />
            </div>
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={runAI}
          disabled={aiLoading || watchDescription.trim().length < 20}
        >
          {aiLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Analisar com IA
          <span className="font-normal opacity-70">(mín. 20 caracteres)</span>
        </Button>

        {ai && (
          <Card className="animate-fade-in border-primary/20 bg-secondary/30">
            <CardContent className="p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> Resultado da análise
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{ai.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subcategoria</p>
                  <p className="font-medium">{ai.subcategory ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Urgência</p>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      URGENCY_COLORS[ai.urgency as UrgencyLevel]
                    )}
                  >
                    {URGENCY_LABELS[ai.urgency as UrgencyLevel]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confiança</p>
                  <p className="font-medium">{(ai.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
              <p className="mt-3 text-xs italic text-muted-foreground">{ai.rationale}</p>
              {ai.duplicate_suspected && (
                <Alert variant="warning" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Possível duplicata</AlertTitle>
                  <AlertDescription>
                    Já existe uma ocorrência parecida nas proximidades. Considere comentar na
                    ocorrência existente em vez de criar uma nova — mas você ainda pode registrar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {banner && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger"
          >
            {banner}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Registrar ocorrência
          </Button>
        </div>
      </form>
    </div>
  );
}
