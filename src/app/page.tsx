import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShieldCheck, 
  MapPin, 
  FileText, 
  Eye, 
  Zap, 
  Users,
  Smartphone,
  Lock,
  BarChart3
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full opacity-10 blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <ShieldCheck className="w-4 h-4" />
              Sistema Municipal Oficial
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
              SIFAU
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-4 font-medium">
              Sistema Municipal de Fiscalização e Atendimento Urbano
            </p>
            
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              Conecte cidadãos, fiscais, gestores e auditores em uma plataforma moderna para reportar, fiscalizar e resolver problemas urbanos de forma eficiente e transparente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Entrar
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Funcionalidades por Perfil
          </h2>
          <p className="text-lg text-gray-600">
            Uma solução completa para todos os envolvidos na gestão urbana
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Cidadão Card */}
          <Card className="group hover:scale-105 transition-transform duration-300 animate-slide-up" style={{ animationDelay: '0ms' }}>
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <CardTitle>Cidadão</CardTitle>
              <CardDescription>Reporte problemas urbanos</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                  <span>Reporte com fotos e GPS</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                  <span>Classificação automática por IA</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                  <span>Acompanhamento em tempo real</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                  <span>Mapa público de problemas</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Fiscal Card */}
          <Card className="group hover:scale-105 transition-transform duration-300 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl gradient-secondary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <CardTitle>Fiscal</CardTitle>
              <CardDescription>Fiscalização em campo</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
                  <span>Atribuição automática de casos</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
                  <span>Vistorias offline-first</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
                  <span>Registro com GPS obrigatório</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
                  <span>Sincronização automática</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Gestor Card */}
          <Card className="group hover:scale-105 transition-transform duration-300 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl gradient-success flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <CardTitle>Gestor</CardTitle>
              <CardDescription>Gestão completa</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>Dashboard com KPIs</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>Ordens de serviço formais</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>Configuração de SLA</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>Ranking de fiscais</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Auditor Card */}
          <Card className="group hover:scale-105 transition-transform duration-300 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl gradient-warning flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <CardTitle>Auditor</CardTitle>
              <CardDescription>Auditoria e controle</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                  <span>Trilha de auditoria imutável</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                  <span>Exportações com hash SHA-256</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                  <span>Gestão de usuários</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                  <span>Visão completa do sistema</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tech Highlights */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tecnologia de Ponta
            </h2>
            <p className="text-lg text-gray-600">
              Construído com as melhores tecnologias do mercado
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">IA Generativa</h3>
              <p className="text-sm text-gray-600">Classificação automática com fallback heurístico</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mobile-First</h3>
              <p className="text-sm text-gray-600">App nativo com Capacitor para Android e iOS</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Segurança</h3>
              <p className="text-sm text-gray-600">Autenticação segura e trilha imutável</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Colaborativo</h3>
              <p className="text-sm text-gray-600">Quatro perfis integrados em um sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="gradient-primary py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para transformar a gestão urbana?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Comece agora e faça parte da solução
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Criar Conta Gratuita
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-600">
                Fazer Login
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">SIFAU</h3>
              <p className="text-gray-400 text-sm">
                Sistema Municipal de Fiscalização e Atendimento Urbano
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Cadastro</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <p className="text-sm text-gray-400">
                Precisa de ajuda? Entre em contato com o suporte da prefeitura.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2026 SIFAU. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
