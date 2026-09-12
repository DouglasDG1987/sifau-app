'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  MapPin, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  LogOut,
  Bell,
  User,
  Search
} from 'lucide-react';

interface Occurrence {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  status: string;
  urgency_score: number;
  bairro: string;
  created_at: string;
  sla_deadline: string;
}

export default function CitizenHomePage() {
  const router = useRouter();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchOccurrences();
    fetchUser();
  }, []);

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

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      if (response.ok) {
        setUser(data.profile);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aberta: 'default',
      triada: 'secondary',
      atribuida: 'warning',
      em_vistoria: 'default',
      resolvida: 'success',
      arquivada: 'secondary',
      escalonada: 'destructive',
    };
    return colors[status] || 'secondary';
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

  const getUrgencyColor = (score: number) => {
    if (score >= 4) return 'destructive';
    if (score >= 3) return 'warning';
    if (score >= 2) return 'default';
    return 'secondary';
  };

  const getUrgencyLabel = (score: number) => {
    const labels = ['', 'Baixa', 'Média', 'Alta', 'Crítica'];
    return labels[score] || 'Desconhecida';
  };

  const getSLAStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return { text: 'SLA Estourado', color: 'destructive' };
    if (diffHours < 24) return { text: 'Crítico', color: 'warning' };
    if (diffHours < 48) return { text: 'Atenção', color: 'default' };
    return { text: 'Normal', color: 'success' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SIFAU</h1>
                <p className="text-xs text-gray-500">Portal do Cidadão</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                {user?.nome?.charAt(0) || 'U'}
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {user?.nome || 'Cidadão'}! 👋
          </h2>
          <p className="text-gray-600">
            Reporte problemas urbanos e acompanhe a resolução em tempo real
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link href="/citizen/new-occurrence" className="group">
            <Card className="hover:scale-105 transition-transform duration-300 cursor-pointer shadow-card-lg border-2 border-dashed border-blue-300 hover:border-blue-500">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center group-hover:shadow-glow transition-shadow">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Nova Ocorrência</h3>
                  <p className="text-sm text-gray-500">Reporte um problema</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="shadow-card-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total de Ocorrências</p>
                  <p className="text-3xl font-bold">{occurrences.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Resolvidas</p>
                  <p className="text-3xl font-bold">
                    {occurrences.filter(o => o.status === 'resolvida').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar ocorrências..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <select className="px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all bg-white">
            <option value="">Todos os status</option>
            <option value="aberta">Aberta</option>
            <option value="resolvida">Resolvida</option>
            <option value="em_vistoria">Em Vistoria</option>
          </select>
        </div>

        {/* Occurrences List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : occurrences.length === 0 ? (
          <Card className="shadow-card-lg border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma ocorrência ainda</h3>
              <p className="text-gray-600 mb-6">Comece reportando um problema na sua cidade</p>
              <Link href="/citizen/new-occurrence">
                <Button size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Primeira Ocorrência
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {occurrences.map((occurrence, index) => {
              const slaStatus = getSLAStatus(occurrence.sla_deadline);
              return (
                <Card 
                  key={occurrence.id} 
                  className="shadow-card hover:shadow-lg transition-shadow duration-200 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getStatusColor(occurrence.status)}>
                            {getStatusLabel(occurrence.status)}
                          </Badge>
                          <Badge variant={getUrgencyColor(occurrence.urgency_score)}>
                            {getUrgencyLabel(occurrence.urgency_score)}
                          </Badge>
                          <Badge variant={slaStatus.color}>
                            <Clock className="w-3 h-3 mr-1" />
                            {slaStatus.text}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          {occurrence.category}
                        </h3>
                        {occurrence.subcategory && (
                          <p className="text-sm text-gray-500 mb-2">{occurrence.subcategory}</p>
                        )}
                        <p className="text-gray-600 line-clamp-2">{occurrence.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>{occurrence.bairro || 'Localização não informada'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(occurrence.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
