'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Search, Filter } from 'lucide-react';

interface OrdemServico {
  id: string;
  numero_os: string;
  origem_os: string;
  requerente: string;
  servico_descricao: string;
  endereco: string;
  status: string;
  data_emissao: string;
  prazo_resposta: string;
  fiscal_id?: string;
}

export default function OSListPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [origemFilter, setOrigemFilter] = useState('all');

  useEffect(() => {
    fetchOrdens();
  }, []);

  const fetchOrdens = async () => {
    try {
      const response = await fetch('/api/os');
      const data = await response.json();
      if (response.ok) {
        setOrdens(data.ordens || []);
      }
    } catch (error) {
      console.error('Error fetching ordens:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrdens = ordens.filter(os => {
    const matchesSearch = 
      os.numero_os.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.requerente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.servico_descricao.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || os.status === statusFilter;
    const matchesOrigem = origemFilter === 'all' || os.origem_os === origemFilter;
    
    return matchesSearch && matchesStatus && matchesOrigem;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-blue-500';
      case 'em_vistoria': return 'bg-orange-500';
      case 'concluida': return 'bg-green-500';
      case 'cancelada': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: 'Aberta',
      em_vistoria: 'Em Vistoria',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getOrigemLabel = (origem: string) => {
    const labels: Record<string, string> = {
      preventiva: 'Preventiva',
      denuncia: 'Denúncia',
      oficio: 'Ofício',
      ci: 'CI',
      gestao: 'Gestão',
    };
    return labels[origem] || origem;
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
              <Link href="/gestor/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <h1 className="ml-4 text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
            </div>
            <Link href="/gestor/os/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova OS
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número, requerente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_vistoria">Em Vistoria</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={origemFilter} onValueChange={setOrigemFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Origens</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="denuncia">Denúncia</SelectItem>
                  <SelectItem value="oficio">Ofício</SelectItem>
                  <SelectItem value="ci">CI</SelectItem>
                  <SelectItem value="gestao">Gestão</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-end">
                <span className="text-sm text-gray-600">
                  {filteredOrdens.length} ordens encontradas
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OS List */}
        {filteredOrdens.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma ordem de serviço encontrada</p>
              <p className="text-sm text-gray-500 mt-2">Ajuste os filtros ou crie uma nova OS</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrdens.map((os) => (
              <Card key={os.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{os.numero_os}</h3>
                      <p className="text-sm text-gray-600">{os.servico_descricao}</p>
                    </div>
                    <Badge className={getStatusColor(os.status)}>
                      {getStatusLabel(os.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Requerente:</span> {os.requerente}
                    </div>
                    <div>
                      <span className="font-medium">Origem:</span> {getOrigemLabel(os.origem_os)}
                    </div>
                    <div>
                      <span className="font-medium">Endereço:</span> {os.endereco}
                    </div>
                    <div>
                      <span className="font-medium">Prazo:</span> {new Date(os.prazo_resposta).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/gestor/os/${os.id}`}>
                      <Button size="sm" variant="outline">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
