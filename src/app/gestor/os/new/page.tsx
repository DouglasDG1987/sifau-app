'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, MapPin, Plus, Trash2 } from 'lucide-react';

export default function NewOSPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fiscais, setFiscais] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    numero_os: '',
    origem_os: 'denuncia',
    denuncia_id: '',
    requerente: '',
    fiscal_id: '',
    apoio_operacional: false,
    orgao_apoio: '',
    orgao_apoio_outro: '',
    servico_descricao: '',
    legislacao_aplicavel: [] as string[],
    endereco: '',
    latitude: 0,
    longitude: 0,
    prazo_resposta: '',
  });
  const [newLegislacao, setNewLegislacao] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchFiscais();
  }, []);

  const fetchFiscais = async () => {
    try {
      const response = await fetch('/api/os?fiscais=1');
      const data = await response.json();
      if (response.ok) {
        setFiscais(data.fiscais || []);
      }
    } catch (error) {
      console.error('Error fetching fiscais:', error);
    }
  };

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          setFormData({ ...formData, latitude, longitude });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  const addLegislacao = () => {
    if (newLegislacao.trim()) {
      setFormData({
        ...formData,
        legislacao_aplicavel: [...formData.legislacao_aplicavel, newLegislacao.trim()],
      });
      setNewLegislacao('');
    }
  };

  const removeLegislacao = (index: number) => {
    setFormData({
      ...formData,
      legislacao_aplicavel: formData.legislacao_aplicavel.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/gestor/os/list');
      } else {
        alert(data.error || 'Erro ao criar ordem de serviço');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Erro ao criar ordem de serviço');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Link href="/gestor/os/list">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="ml-4 text-2xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="numero_os">Número da OS *</Label>
                <Input
                  id="numero_os"
                  value={formData.numero_os}
                  onChange={(e) => setFormData({ ...formData, numero_os: e.target.value })}
                  placeholder="Ex: OS-2024-001"
                  required
                />
              </div>

              <div>
                <Label htmlFor="origem_os">Origem *</Label>
                <Select
                  value={formData.origem_os}
                  onValueChange={(value) => setFormData({ ...formData, origem_os: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="denuncia">Denúncia</SelectItem>
                    <SelectItem value="oficio">Ofício</SelectItem>
                    <SelectItem value="ci">CI</SelectItem>
                    <SelectItem value="gestao">Gestão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="requerente">Requerente *</Label>
                <Input
                  id="requerente"
                  value={formData.requerente}
                  onChange={(e) => setFormData({ ...formData, requerente: e.target.value })}
                  placeholder="Nome do requerente"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fiscal_id">Fiscal Responsável (opcional)</Label>
                <Select
                  value={formData.fiscal_id}
                  onValueChange={(value) => setFormData({ ...formData, fiscal_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fiscal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem fiscal atribuído</SelectItem>
                    {fiscais.map((fiscal) => (
                      <SelectItem key={fiscal.id} value={fiscal.id}>
                        {fiscal.nome} ({fiscal.bairro || 'Sem bairro'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviço e Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="servico_descricao">Descrição do Serviço *</Label>
                <Textarea
                  id="servico_descricao"
                  value={formData.servico_descricao}
                  onChange={(e) => setFormData({ ...formData, servico_descricao: e.target.value })}
                  placeholder="Descreva o serviço a ser realizado"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endereco">Endereço *</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço completo"
                  required
                />
              </div>

              <div>
                <Label>Geolocalização</Label>
                <Button
                  type="button"
                  onClick={handleLocation}
                  variant="outline"
                  className="w-full mt-2"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {location ? 'Atualizar Localização' : 'Obter Localização Atual'}
                </Button>
                {location && (
                  <div className="mt-2 text-sm text-gray-600">
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="prazo_resposta">Prazo de Resposta *</Label>
                <Input
                  id="prazo_resposta"
                  type="datetime-local"
                  value={formData.prazo_resposta}
                  onChange={(e) => setFormData({ ...formData, prazo_resposta: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Apoio Operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apoio_operacional"
                  checked={formData.apoio_operacional}
                  onCheckedChange={(checked) => setFormData({ ...formData, apoio_operacional: checked as boolean })}
                />
                <Label htmlFor="apoio_operacional">Solicitar apoio operacional</Label>
              </div>

              {formData.apoio_operacional && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="orgao_apoio">Órgão de Apoio</Label>
                    <Select
                      value={formData.orgao_apoio}
                      onValueChange={(value) => setFormData({ ...formData, orgao_apoio: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o órgão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="policia_militar">Polícia Militar</SelectItem>
                        <SelectItem value="guarda_municipal">Guarda Municipal</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.orgao_apoio === 'outro' && (
                    <div>
                      <Label htmlFor="orgao_apoio_outro">Especificar Órgão</Label>
                      <Input
                        id="orgao_apoio_outro"
                        value={formData.orgao_apoio_outro}
                        onChange={(e) => setFormData({ ...formData, orgao_apoio_outro: e.target.value })}
                        placeholder="Nome do órgão"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legislação Aplicável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newLegislacao}
                  onChange={(e) => setNewLegislacao(e.target.value)}
                  placeholder="Adicionar artigo legal ou norma"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLegislacao())}
                />
                <Button type="button" onClick={addLegislacao} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.legislacao_aplicavel.length > 0 && (
                <div className="space-y-2">
                  {formData.legislacao_aplicavel.map((leg, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{leg}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLegislacao(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Criando...' : 'Criar Ordem de Serviço'}
          </Button>
        </form>
      </main>
    </div>
  );
}
