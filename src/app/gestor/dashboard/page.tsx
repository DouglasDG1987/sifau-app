'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Clock, AlertTriangle, CheckCircle, Users, FileText, LogOut, Settings } from 'lucide-react';

interface Stats {
  total: number;
  resolved: number;
  inProgress: number;
  slaExceeded: number;
}

interface FiscalRanking {
  fiscal_id: string;
  total_assigned: number;
  total_resolved: number;
  avg_resolution_hours: string;
  sla_compliance_rate: string;
  last_assigned_at: string;
}

export default function GestorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<FiscalRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
    fetchStats();
    fetchRanking();
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

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/occurrences?view=overview');
      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async () => {
    try {
      const response = await fetch('/api/occurrences?view=ranking');
      const data = await response.json();
      if (response.ok) {
        setRanking(data.ranking || []);
      }
    } catch (error) {
      console.error('Error fetching ranking:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const slaComplianceRate = stats && stats.total > 0 
    ? ((stats.total - stats.slaExceeded) / stats.total * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SIFAU - Gestor Municipal</h1>
              <p className="text-sm text-gray-600">Bem-vindo, {user?.nome}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/gestor/os/list">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Ordens de Serviço
                </Button>
              </Link>
              <Link href="/gestor/sla">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar SLA
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Ocorrências</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolvidas</p>
                  <p className="text-2xl font-bold">{stats?.resolved || 0}</p>
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
                  <p className="text-2xl font-bold">{stats?.slaExceeded || 0}</p>
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
                  <p className="text-2xl font-bold">{slaComplianceRate}%</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="panorama" className="space-y-6">
          <TabsList>
            <TabsTrigger value="panorama">Panorama</TabsTrigger>
            <TabsTrigger value="fiscais">Fiscais</TabsTrigger>
            <TabsTrigger value="escaladas">Escalonadas</TabsTrigger>
          </TabsList>

          <TabsContent value="panorama" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Status das Ocorrências</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Em Andamento</span>
                        <Badge className="bg-blue-500">{stats?.inProgress || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Resolvidas</span>
                        <Badge className="bg-green-500">{stats?.resolved || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">SLA Estourado</span>
                        <Badge className="bg-red-500">{stats?.slaExceeded || 0}</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Ações Rápidas</h3>
                    <div className="space-y-2">
                      <Link href="/gestor/os/new">
                        <Button className="w-full" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Nova Ordem de Serviço
                        </Button>
                      </Link>
                      <Link href="/gestor/sla">
                        <Button className="w-full" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar SLA
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiscais" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Fiscais</CardTitle>
              </CardHeader>
              <CardContent>
                {ranking.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">Nenhum fiscal com estatísticas ainda</p>
                ) : (
                  <div className="space-y-4">
                    {ranking.map((fiscal, index) => (
                      <div key={fiscal.fiscal_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">Fiscal #{fiscal.fiscal_id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600">
                              {fiscal.total_resolved}/{fiscal.total_assigned} resolvidas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{fiscal.sla_compliance_rate}% SLA</p>
                          <p className="text-sm text-gray-600">
                            {fiscal.avg_resolution_hours}h média
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escaladas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Casos Escalonados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                  <p className="text-gray-600">Funcionalidade de casos escalonados em desenvolvimento</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Casos que requerem intervenção manual aparecerão aqui
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
