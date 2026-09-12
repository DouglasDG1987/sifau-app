'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/auth');
        const data = await response.json();

        if (!response.ok) {
          router.push('/auth/login');
          return;
        }

        const { profile } = data;
        
        switch (profile.role) {
          case 'cidadao':
            router.push('/citizen/home');
            break;
          case 'fiscal':
            router.push('/fiscal/home');
            break;
          case 'gestor':
            router.push('/gestor/dashboard');
            break;
          case 'auditor':
            router.push('/auditor/panel');
            break;
          default:
            router.push('/auth/login');
        }
      } catch (error) {
        console.error('Redirect error:', error);
        router.push('/auth/login');
      }
    };

    fetchProfile();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}
