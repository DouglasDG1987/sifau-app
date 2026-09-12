'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  MapPin, 
  Camera, 
  Upload, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

const CATEGORIES = [
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

const SUBCATEGORIES: Record<string, string[]> = {
  'Buraco na via': ['Asfalto', 'Paralelepípedo', 'Terra batida'],
  'Poluição sonora': ['Barulho excessivo', 'Música alta', 'Obras'],
  'Iluminação pública': ['Luz apagada', 'Luz piscando', 'Poste quebrado'],
  'Entulho/lixo': ['Entulho', 'Lixo doméstico', 'Lixo comercial'],
  'Calçada danificada': ['Buraco', 'Desnível', 'Falta de rampa'],
  'Árvores': ['Árvore caída', 'Galho perigoso', 'Poda necessária'],
  'Vias públicas': ['Sinal quebrado', 'Placa danificada', 'Faixa desgastada'],
  'Edificações': ['Telhado', 'Fachada', 'Estrutura'],
  'Outros': ['Outro problema'],
};

export default function NewOccurrencePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    description: '',
    lat: 0,
    lng: 0,
    bairro: '',
    address: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [classification, setClassification] = useState<any>(null);
  const [classifying, setClassifying] = useState(false);

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setError('Não foi possível obter sua localização. Verifique o GPS.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('Geolocalização não suportada');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && photos.length < 5) {
      Array.from(files).forEach((file) => {
        if (photos.length < 5) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setPhotos([...photos, event.target?.result as string]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleClassify = async () => {
    if (!formData.description) {
      setError('Preencha a descrição primeiro');
      return;
    }

    setClassifying(true);
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          categoryHint: formData.category,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setClassification(data);
        setFormData({
          ...formData,
          category: data.category,
          subcategory: data.subcategory || '',
        });
      }
    } catch (error) {
      console.error('Classification error:', error);
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.description) {
      setError('Preencha categoria e descrição');
      return;
    }

    if (formData.description.length < 20) {
      setError('A descrição deve ter pelo menos 20 caracteres');
      return;
    }

    if (formData.lat === 0 || formData.lng === 0) {
      setError('Obtenha sua localização');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/occurrences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          urgency_score: classification?.urgency_score || 2,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/citizen/home');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao criar ocorrência');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/citizen/home">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Nova Ocorrência</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Ocorrência criada com sucesso! Redirecionando...</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Location Card */}
          <Card className="shadow-card-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Localização
              </CardTitle>
              <CardDescription>
                Registre onde o problema ocorreu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.lat || ''}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    placeholder="0.000000"
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.lng || ''}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    placeholder="0.000000"
                  />
                </div>
              </div>
              <Button
                onClick={handleGeolocation}
                variant="outline"
                className="w-full"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Obter Localização Atual
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bairro (opcional)</Label>
                  <Input
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Seu bairro"
                  />
                </div>
                <div>
                  <Label>Endereço (opcional)</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Card */}
          <Card className="shadow-card-lg">
            <CardHeader>
              <CardTitle>Categoria</CardTitle>
              <CardDescription>
                Selecione o tipo de problema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: '' })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.category && SUBCATEGORIES[formData.category] && (
                <div>
                  <Label>Subcategoria</Label>
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione a subcategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBCATEGORIES[formData.category].map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description Card */}
          <Card className="shadow-card-lg">
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
              <CardDescription>
                Descreva o problema com detalhes (mínimo 20 caracteres)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o problema, localização, horário, e qualquer detalhe relevante..."
                rows={5}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {formData.description.length}/20 caracteres
                </span>
                <Button
                  onClick={handleClassify}
                  variant="outline"
                  disabled={classifying || !formData.description}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {classifying ? 'Analisando...' : 'Analisar com IA'}
                </Button>
              </div>
              {classification && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-blue-900">Categoria:</span>
                    <span className="text-blue-700">{classification.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-blue-900">Urgência:</span>
                    <span className="text-blue-700">{classification.urgency_score}/4</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-blue-900">Confiança:</span>
                    <span className="text-blue-700">{(classification.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos Card */}
          <Card className="shadow-card-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Fotos
              </CardTitle>
              <CardDescription>
                Adicione fotos do problema (opcional, máximo 5)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={photos.length >= 5}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload">
                  <Button variant="outline" asChild disabled={photos.length >= 5}>
                    <span className="gap-2">
                      <Upload className="w-4 h-4" />
                      Adicionar Fotos
                    </span>
                  </Button>
                </label>
                <span className="text-sm text-gray-500 py-2">
                  {photos.length}/5 fotos
                </span>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="w-full h-14 text-base shadow-glow"
          >
            {submitting ? 'Criando ocorrência...' : 'Registrar Ocorrência'}
          </Button>
        </div>
      </main>
    </div>
  );
}
