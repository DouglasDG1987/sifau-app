'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, User, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'cidadao',
    telefone: '',
    bairro: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/redirect');
      } else {
        setError(data.error || 'Erro ao criar conta');
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 py-8">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full opacity-10 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full opacity-10 blur-3xl" />
      
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 shadow-glow">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SIFAU</h1>
          <p className="text-gray-600">Crie sua conta</p>
        </div>

        <Card className="shadow-card-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Cadastro</CardTitle>
            <CardDescription>
              Entre para o sistema municipal de fiscalização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-semibold">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="nome"
                    placeholder="Seu nome completo"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-semibold">Tipo de Usuário</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione seu perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cidadao">Cidadão</SelectItem>
                    <SelectItem value="fiscal">Fiscal</SelectItem>
                    <SelectItem value="gestor">Gestor Municipal</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-sm font-semibold">Telefone (opcional)</Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro" className="text-sm font-semibold">Bairro (opcional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="bairro"
                    placeholder="Seu bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading}
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">
                  Faça login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
