'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, Save } from 'lucide-react';

interface SLARule {
  id: string;
  category: string;
  hours: number;
}

const DEFAULT_CATEGORIES = [
  'Buraco na via',
  'Poluição sonora',
  'Iluminação pública',
  'Entulho/lixo',
  'Calçada danificada',
  'Árvores',
  'Vias públicas',
  'Edificações',
  'Outros',
];

export default function SLAConfigPage() {
  const router = useRouter();
  const [rules, setRules] = useState<SLARule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/sla');
      const data = await response.json();
      if (response.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching SLA rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHoursChange = (category: string, hours: number) => {
    setRules(rules.map(rule => 
      rule.category === category ? { ...rule, hours } : rule
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/sla', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });

      if (response.ok) {
        alert('Regras de SLA atualizadas com sucesso');
      } else {
        alert('Erro ao atualizar regras de SLA');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Erro ao atualizar regras de SLA');
    } finally {
      setSaving(false);
    }
  };

  const getRuleForCategory = (category: string) => {
    return rules.find(rule => rule.category === category);
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
          <div className="flex items-center">
            <Link href="/gestor/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="ml-4 text-2xl font-bold text-gray-900">Configuração de SLA</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Regras de SLA por Categoria</CardTitle>
            <p className="text-sm text-gray-600">
              Configure o prazo em horas para cada categoria de ocorrência
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {DEFAULT_CATEGORIES.map((category) => {
              const rule = getRuleForCategory(category);
              return (
                <div key={category} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`sla-${category}`} className="sr-only">
                      Horas
                    </Label>
                    <Input
                      id={`sla-${category}`}
                      type="number"
                      min="1"
                      max="720"
                      value={rule?.hours || 72}
                      onChange={(e) => handleHoursChange(category, parseInt(e.target.value) || 72)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">horas</span>
                  </div>
                </div>
              );
            })}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Informações sobre SLA</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• O SLA é calculado automaticamente a partir da criação da ocorrência</li>
                <li>• O prazo padrão é 72 horas se não houver regra específica</li>
                <li>• Valores entre 1 e 720 horas são permitidos</li>
                <li>• Alterações afetam apenas novas ocorrências</li>
              </ul>
            </div>

            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Regras'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
