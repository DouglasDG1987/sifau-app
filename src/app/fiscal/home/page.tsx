'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, AlertTriangle, CheckCircle, LogOut, ClipboardList } from 'lucide-react';

interface Occurrence {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  status: string;
  urgency_score: number;
  created_at: string;
  sla_deadline: string;
  bairro: string;
  lat: number;
  lng: number;
}

interface FiscalStats {
  total_assigned: number;
  total_resolved: number;
  avg_resolution_hours: string;
  sla_compliance_rate: string;
}

export default function FiscalHome() {
  const router = useRouter();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [stats, setStats] = useState<FiscalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingInspections, setPendingInspections] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchOccurrences();
    fetchStats();
    checkPendingInspections();

    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      if (response.ok) {
        setUser(data.profile);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/auth/login');
    }
  };

  const fetchOccurrences = async () => {
    try {
      const response = await fetch('/api/occurrences');
      const data = await response.json();
      if (response.ok) {
        setOccurrences(data.occurrences || []);
      }
    } catch (error) {
      console.error('Error fetching occurrences:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/fiscal/stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const checkPendingInspections = () => {
    const pending = localStorage.getItem('pendingInspections');
    if (pending) {
      setPendingInspections(JSON.parse(pending));
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-blue-500';
      case 'triada': return 'bg-purple-500';
      case 'atribuida': return 'bg-yellow-500';
      case 'em_vistoria': return 'bg-orange-500';
      case 'resolvida': return 'bg-green-500';
      case 'arquivada': return 'bg-gray-500';
      case 'escalonada': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyColor = (score: number) => {
    switch (score) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-orange-500';
      case 4: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: 'Aberta',
      triada: 'Triada',
      atribuida: 'Atribuída',
      em_vistoria: 'Em Vistoria',
      resolvida: 'Resolvida',
      arquivada: 'Arquivada',
      escalonada: 'Escalonada',
    };
    return labels[status] || status;
  };

  const getUrgencyLabel = (score: number) => {
    const labels: Record<number, string> = {
      1: 'Baixa',
      2: 'Média',
      3: 'Alta',
      4: 'Crítica',
    };
    return labels[score] || 'Desconhecida';
  };

  const isSLAExceeded = (deadline: string) => {
    return new Date() > new Date(deadline);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const assignedOccurrences = occurrences.filter(
    occ => occ.status === 'atribuida' || occ.status === 'em_vistoria'
  );
  const resolvedOccurrences = occurrences.filter(occ => occ.status === 'resolvida');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SIFAU - Fiscal</h1>
              <p className="text-sm text-gray-600">Bem-vindo, {user?.nome}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <Badge variant="destructive">Offline</Badge>
              )}
              {pendingInspections.length > 0 && (
                <Badge variant="warning">{pendingInspections.length} Pendentes</Badge>
              )}
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Na Fila</p>
                  <p className="text-2xl font-bold">{assignedOccurrences.length}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolvidas</p>
                  <p className="text-2xl font-bold">{stats?.total_resolved || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">SLA Estourado</p>
                  <p className="text-2xl font-bold">
                    {assignedOccurrences.filter(occ => isSLAExceeded(occ.sla_deadline)).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cumprimento SLA</p>
                  <p className="text-2xl font-bold">{stats?.sla_compliance_rate || '0'}%</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning about automatic assignment */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-900">Atribuição Automática</h3>
              <p className="text-sm text-yellow-800">
                Você não escolhe livremente as ocorrências. O sistema atribui automaticamente para evitar cherry-picking e garantir distribuição equitativa.
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Occurrences */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Ocorrências Atribuídas</h2>
            <Link href="/fiscal/field-inspection">
              <Button>
                <ClipboardList className="h-4 w-4 mr-2" />
                Iniciar Vistoria
              </Button>
            </Link>
          </div>
          
          {assignedOccurrences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma ocorrência pendente</p>
                <p className="text-sm text-gray-500 mt-2">Você está em dia com suas atribuições</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assignedOccurrences
                .sort((a, b) => {
                  // Sort by urgency (higher first), then by SLA deadline (sooner first)
                  if (b.urgency_score !== a.urgency_score) {
                    return b.urgency_score - a.urgency_score;
                  }
                  return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
                })
                .map((occurrence) => (
                  <Card key={occurrence.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-lg">{occurrence.category}</CardTitle>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(occurrence.status)}>
                            {getStatusLabel(occurrence.status)}
                          </Badge>
                          <Badge className={getUrgencyColor(occurrence.urgency_score)}>
                            {getUrgencyLabel(occurrence.urgency_score)}
                          </Badge>
                        </div>
                      </div>
                      {occurrence.subcategory && (
                        <p className="text-sm text-gray-600">{occurrence.subcategory}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                        {occurrence.description}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          {occurrence.bairro || 'Localização não informada'}
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          Prazo: {new Date(occurrence.sla_deadline).toLocaleString('pt-BR')}
                          {isSLAExceeded(occurrence.sla_deadline) && (
                            <span className="ml-2 text-red-600 font-semibold">(SLA Estourado)</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <Link href={`/fiscal/field-inspection?occurrence=${occurrence.id}`}>
                          <Button size="sm" className="w-full">
                            Iniciar Vistoria
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Resolved Occurrences */}
        {resolvedOccurrences.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resolvidas Recentemente</h2>
            <div className="space-y-4">
              {resolvedOccurrences.slice(0, 5).map((occurrence) => (
                <Card key={occurrence.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{occurrence.category}</h3>
                        <p className="text-sm text-gray-600">{occurrence.bairro || 'Localização não informada'}</p>
                      </div>
                      <Badge className="bg-green-500">Resolvida</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
