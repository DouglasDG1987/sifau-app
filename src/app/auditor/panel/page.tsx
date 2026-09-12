'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, FileText, Download, Search, Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  occurrence_id: string;
  from_status: string;
  to_status: string;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  ip_address: string;
  geo: string;
  note: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  nome: string;
  bairro: string;
  ativo: boolean;
}

export default function AuditorPanel() {
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
    fetchAuditLogs();
    fetchUsers();
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

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/occurrences?logs=1');
      const data = await response.json();
      if (response.ok) {
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin?view=users');
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'export',
          type: 'audit_trail',
          description: 'Exportação da trilha de auditoria',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Exportação concluída! SHA-256: ${data.sha256}`);
        fetchAuditLogs(); // Refresh to show new export
      } else {
        alert(data.error || 'Erro ao exportar');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Erro ao exportar');
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.changed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.occurrence_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.to_status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.to_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'cidadao': return 'bg-blue-500';
      case 'fiscal': return 'bg-green-500';
      case 'gestor': return 'bg-purple-500';
      case 'auditor': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SIFAU - Auditor</h1>
              <p className="text-sm text-gray-600">Bem-vindo, {user?.nome}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="trilha" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trilha">Trilha de Auditoria</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="os">Ordens de Serviço</TabsTrigger>
          </TabsList>

          <TabsContent value="trilha" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Trilha de Auditoria Imutável</CardTitle>
                  <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar com SHA-256
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por usuário, ocorrência ou status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="aberta">Aberta</option>
                    <option value="triada">Triada</option>
                    <option value="atribuida">Atribuída</option>
                    <option value="em_vistoria">Em Vistoria</option>
                    <option value="resolvida">Resolvida</option>
                    <option value="arquivada">Arquivada</option>
                    <option value="escalonada">Escalonada</option>
                  </select>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{log.changed_by_name || 'Usuário desconhecido'}</p>
                            <p className="text-sm text-gray-600">Ocorrência: {log.occurrence_id.slice(0, 8)}...</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {new Date(log.changed_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          {log.from_status && (
                            <>
                              <Badge className={getStatusColor(log.from_status)}>
                                {log.from_status}
                              </Badge>
                              <span className="text-gray-600">→</span>
                            </>
                          )}
                          <Badge className={getStatusColor(log.to_status)}>
                            {log.to_status}
                          </Badge>
                        </div>

                        {log.note && (
                          <p className="text-sm text-gray-600 mt-2">Nota: {log.note}</p>
                        )}

                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {log.ip_address && <span>IP: {log.ip_address}</span>}
                          {log.geo && <span>Geo: {log.geo}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum usuário encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                            {user.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.nome}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                          <Badge variant={user.ativo ? 'success' : 'destructive'}>
                            {user.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {user.bairro && (
                            <span className="text-sm text-gray-600">{user.bairro}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="os" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ordens de Serviço (Visualização)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Visualização de ordens de serviço em desenvolvimento</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Aqui você poderá visualizar todas as OS e seus autos de infração
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
