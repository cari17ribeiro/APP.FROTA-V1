'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const EscolherModulo = () => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const adminFlag = localStorage.getItem('isAdmin');
    if (adminFlag !== null) {
      setIsAdmin(JSON.parse(adminFlag));
    } else {
      // fallback: redireciona para login
      router.push('/');
    }
  }, []);

  const handlePremiacaoClick = () => {
    if (isAdmin) {
      router.push('/admin');
    } else {
      router.push('/usuario');
    }
  };

  const handleDiarioClick = () => {
    if (isAdmin) {
      router.push('/admin/diariodebordo');
    } else {
      router.push('/diariodebordo');
    }
  };

  if (isAdmin === null) return null; // ou um loading...

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-3xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">Escolha o Módulo</h1>
        <div className="space-y-4">
          <button
            onClick={handlePremiacaoClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-lg font-semibold"
          >
            Premiação
          </button>
          <button
            onClick={handleDiarioClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-lg font-semibold"
          >
            Diário de Bordo
          </button>
        </div>
      </div>
    </div>
  );
};

export default EscolherModulo;
