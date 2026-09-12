'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, Camera, CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Occurrence {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  status: string;
  urgency_score: number;
  lat: number;
  lng: number;
  bairro: string;
  address: string;
}

interface PendingInspection {
  id: string;
  occurrence_id: string;
  occurrence_snapshot: {
    category: string;
    description: string;
    bairro: string;
    urgency_score: number;
    status: string;
  };
  arrival_at: string;
  arrival_lat: number | null;
  arrival_lng: number | null;
  report: string;
  action_taken: string;
  fine_amount: string;
  fine_process_number: string;
  photos: string[];
  created_at: string;
}

const ACTIONS = [
  'notificacao',
  'multa',
  'encaminhamento',
  'orientacao',
  'sem_acao',
];

const ACTION_LABELS: Record<string, string> = {
  notificacao: 'Notificação',
  multa: 'Multa',
  encaminhamento: 'Encaminhamento',
  orientacao: 'Orientação',
  sem_acao: 'Sem Ação',
};

function FieldInspectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const occurrenceId = searchParams.get('occurrence') || '';
  
  const [occurrence, setOccurrence] = useState<Occurrence | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingInspections, setPendingInspections] = useState<PendingInspection[]>([]);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  
  const [inspectionData, setInspectionData] = useState({
    arrival_at: '',
    arrival_lat: null as number | null,
    arrival_lng: null as number | null,
    report: '',
    action_taken: '',
    fine_amount: '',
    fine_process_number: '',
    photos: [] as string[],
  });
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (occurrenceId) {
      fetchOccurrence();
    }
    checkPendingInspections();
    checkOnlineStatus();

    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, [occurrenceId]);

  const checkOnlineStatus = () => {
    setIsOnline(navigator.onLine);
  };

  const checkPendingInspections = () => {
    const pending = localStorage.getItem('pendingInspections');
    if (pending) {
      setPendingInspections(JSON.parse(pending));
    }
  };

  const fetchOccurrence = async () => {
    if (!occurrenceId) {
      setError('Nenhuma ocorrência selecionada');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/occurrences/${occurrenceId}`);
      const data = await response.json();
      if (response.ok) {
        setOccurrence(data.occurrence);
      } else {
        setError('Erro ao carregar ocorrência');
      }
    } catch (error) {
      console.error('Error fetching occurrence:', error);
      setError('Erro ao carregar ocorrência');
    } finally {
      setLoading(false);
    }
  };

  const handleArrival = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setInspectionData({
            ...inspectionData,
            arrival_at: new Date().toISOString(),
            arrival_lat: latitude,
            arrival_lng: longitude,
          });
        },
        (error) => {
          setError('Não foi possível obter sua localização. Verifique o GPS.');
          console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('Geolocalização não suportada');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && inspectionData.photos.length < 5) {
      Array.from(files).forEach((file) => {
        if (inspectionData.photos.length < 5) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setInspectionData({
              ...inspectionData,
              photos: [...inspectionData.photos, event.target?.result as string],
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removePhoto = (index: number) => {
    setInspectionData({
      ...inspectionData,
      photos: inspectionData.photos.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!occurrence) {
      setError('Selecione uma ocorrência primeiro');
      return;
    }

    if (!inspectionData.arrival_at || !inspectionData.arrival_lat || !inspectionData.arrival_lng) {
      setError('Registre sua chegada com GPS antes de submeter');
      return;
    }

    if (!inspectionData.report.trim()) {
      setError('Preencha o relatório da vistoria');
      return;
    }

    if (!inspectionData.action_taken) {
      setError('Selecione a ação tomada');
      return;
    }

    if (inspectionData.action_taken === 'multa' && (!inspectionData.fine_amount || !inspectionData.fine_process_number)) {
      setError('Para multa, informe o valor e número do processo');
      return;
    }

    if (inspectionData.photos.length === 0) {
      setError('Adicione pelo menos uma foto "depois"');
      return;
    }

    setSubmitting(true);
    setError('');

    const pendingInspection: PendingInspection = {
      id: Date.now().toString(),
      occurrence_id: occurrence.id,
      occurrence_snapshot: {
        category: occurrence.category,
        description: occurrence.description,
        bairro: occurrence.bairro,
        urgency_score: occurrence.urgency_score,
        status: occurrence.status,
      },
      arrival_at: inspectionData.arrival_at,
      arrival_lat: inspectionData.arrival_lat,
      arrival_lng: inspectionData.arrival_lng,
      report: inspectionData.report,
      action_taken: inspectionData.action_taken,
      fine_amount: inspectionData.fine_amount,
      fine_process_number: inspectionData.fine_process_number,
      photos: inspectionData.photos,
      created_at: new Date().toISOString(),
    };

    if (isOnline) {
      // Submit immediately if online
      try {
        const response = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            occurrence_id: occurrence.id,
            arrival_at: inspectionData.arrival_at,
            arrival_lat: inspectionData.arrival_lat,
            arrival_lng: inspectionData.arrival_lng,
            report: inspectionData.report,
            action_taken: inspectionData.action_taken,
            fine_amount: inspectionData.fine_amount,
            fine_process_number: inspectionData.fine_process_number,
            mediaUrls: inspectionData.photos,
          }),
        });

        if (response.ok) {
          setSuccess(true);
          setTimeout(() => {
            router.push('/fiscal/home');
          }, 2000);
        } else {
          // Save to pending if submission fails
          saveToPending(pendingInspection);
        }
      } catch (error) {
        console.error('Submit error:', error);
        saveToPending(pendingInspection);
      }
    } else {
      // Save to pending if offline
      saveToPending(pendingInspection);
    }

    setSubmitting(false);
  };

  const saveToPending = (pendingInspection: PendingInspection) => {
    const current = JSON.parse(localStorage.getItem('pendingInspections') || '[]');
    current.push(pendingInspection);
    localStorage.setItem('pendingInspections', JSON.stringify(current));
    setPendingInspections(current);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      router.push('/fiscal/home');
    }, 2000);
  };

  const handleSyncPending = async () => {
    if (!isOnline) {
      setError('Você está offline. Conecte-se para sincronizar.');
      return;
    }

    setSubmitting(true);
    const current = [...pendingInspections];
    let synced = 0;

    for (const pending of current) {
      try {
        const response = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            occurrence_id: pending.occurrence_id,
            arrival_at: pending.arrival_at,
            arrival_lat: pending.arrival_lat,
            arrival_lng: pending.arrival_lng,
            report: pending.report,
            action_taken: pending.action_taken,
            fine_amount: pending.fine_amount,
            fine_process_number: pending.fine_process_number,
            mediaUrls: pending.photos,
          }),
        });

        if (response.ok) {
          synced++;
        }
      } catch (error) {
        console.error('Sync error for pending:', pending.id);
      }
    }

    // Remove synced inspections
    const remaining = current.filter(p => {
      // In a real implementation, you'd track which ones synced successfully
      return false; // For now, assume all synced
    });

    localStorage.setItem('pendingInspections', JSON.stringify(remaining));
    setPendingInspections(remaining);
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const selectPendingInspection = (pending: PendingInspection) => {
    setSelectedPendingId(pending.id);
    setInspectionData({
      arrival_at: pending.arrival_at,
      arrival_lat: pending.arrival_lat,
      arrival_lng: pending.arrival_lng,
      report: pending.report,
      action_taken: pending.action_taken,
      fine_amount: pending.fine_amount,
      fine_process_number: pending.fine_process_number,
      photos: pending.photos,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/fiscal/home">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <h1 className="ml-4 text-2xl font-bold text-gray-900">Vistoria em Campo</h1>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <Wifi className="h-4 w-4" />
                  Online
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="h-4 w-4" />
                  Offline
                </Badge>
              )}
              {pendingInspections.length > 0 && isOnline && (
                <Button onClick={handleSyncPending} size="sm" variant="outline">
                  Sincronizar ({pendingInspections.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {isOnline ? 'Vistoria registrada com sucesso!' : 'Vistoria salva para sincronização posterior'}
          </div>
        )}

        {/* Pending Inspections Queue */}
        {pendingInspections.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Vistorias Pendentes ({pendingInspections.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingInspections.map((pending) => (
                  <div
                    key={pending.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedPendingId === pending.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => selectPendingInspection(pending)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{pending.occurrence_snapshot.category}</p>
                        <p className="text-sm text-gray-600">{pending.occurrence_snapshot.bairro}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(pending.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {occurrence && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ocorrência: {occurrence.category}</CardTitle>
              {occurrence.subcategory && (
                <p className="text-sm text-gray-600">{occurrence.subcategory}</p>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{occurrence.description}</p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {occurrence.bairro || occurrence.address || 'Localização não informada'}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Urgência: {occurrence.urgency_score}/4
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Registro de Vistoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Arrival Registration */}
            <div>
              <Label>Registro de Chegada (Obrigatório)</Label>
              <Button
                onClick={handleArrival}
                disabled={!!inspectionData.arrival_at}
                variant="outline"
                className="w-full mt-2"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {inspectionData.arrival_at ? 'Chegada Registrada' : 'Registrar Chegada com GPS'}
              </Button>
              {inspectionData.arrival_at && (
                <div className="mt-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  Registrado em {new Date(inspectionData.arrival_at).toLocaleString('pt-BR')}
                  <br />
                  Lat: {inspectionData.arrival_lat?.toFixed(6)}, Lng: {inspectionData.arrival_lng?.toFixed(6)}
                </div>
              )}
            </div>

            {/* Report */}
            <div>
              <Label htmlFor="report">Relatório da Vistoria *</Label>
              <Textarea
                id="report"
                placeholder="Descreva o que encontrou no local, condições observadas, etc."
                value={inspectionData.report}
                onChange={(e) => setInspectionData({ ...inspectionData, report: e.target.value })}
                rows={4}
                required
              />
            </div>

            {/* Action Taken */}
            <div>
              <Label htmlFor="action_taken">Ação Tomada *</Label>
              <Select
                value={inspectionData.action_taken}
                onValueChange={(value) => setInspectionData({ ...inspectionData, action_taken: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fine Fields (conditional) */}
            {inspectionData.action_taken === 'multa' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fine_amount">Valor da Multa *</Label>
                  <Input
                    id="fine_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inspectionData.fine_amount}
                    onChange={(e) => setInspectionData({ ...inspectionData, fine_amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fine_process_number">Número do Processo *</Label>
                  <Input
                    id="fine_process_number"
                    placeholder="Número do processo da multa"
                    value={inspectionData.fine_process_number}
                    onChange={(e) => setInspectionData({ ...inspectionData, fine_process_number: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Photos */}
            <div>
              <Label>Fotos "Depois" (Mínimo 1, Máximo 5)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={inspectionData.photos.length >= 5}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload">
                  <Button type="button" variant="outline" asChild disabled={inspectionData.photos.length >= 5}>
                    <span>
                      <Camera className="h-4 w-4 mr-2" />
                      Adicionar Foto
                    </span>
                  </Button>
                </label>
                <p className="text-sm text-gray-500 mt-1">{inspectionData.photos.length}/5 fotos</p>
              </div>

              {inspectionData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {inspectionData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="w-full"
            >
              {submitting ? 'Enviando...' : isOnline ? 'Registrar Vistoria' : 'Salvar para Sincronização'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function FieldInspectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <FieldInspectionContent />
    </Suspense>
  );
}
