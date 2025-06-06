'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const AdminPanel = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleNavigation = (path: string) => {
    router.push(`/admin/${path}`);
  };

  const checkAdmin = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      setLoading(false);
      router.push('/login');
      return;
    }

    const email = user.email ?? null;
    setUserEmail(email);

    // Verifica se o email pertence a um admin no banco de dados
    const { data: usuarioData, error: fetchError } = await supabase
      .from('motoristas_cadastrados')
      .select('admin')
      .eq('email', email)
      .single();

    if (fetchError || !usuarioData?.admin) {
      alert('Acesso negado! Apenas administradores podem acessar esta página.');
      router.push('/login');
      return;
    }

    setLoading(false);
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Painel Administrativo</h1>

        <div className="flex flex-col space-y-4">
          <button
            onClick={() => handleNavigation('correcoes')}
            className="bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 transition"
          >
            Viagens pendentes
          </button>

          <button
            onClick={() => handleNavigation('resumo')}
            className="bg-green-600 text-white py-2 px-4 rounded-xl hover:bg-green-700 transition"
          >
            Resumo de Viagens
          </button>

          <button
            onClick={() => handleNavigation('importar')}
            className="bg-purple-600 text-white py-2 px-4 rounded-xl hover:bg-purple-700 transition"
          >
            Importar Viagens
          </button>

          <button
            onClick={() => handleNavigation('diaparado')}
            className="bg-yellow-500 text-white py-2 px-4 rounded-xl hover:bg-yellow-600 transition"
          >
            Dias Parados
          </button>

          <button
            onClick={() => handleNavigation('combustivel')}
            className="bg-red-600 text-white py-2 px-4 rounded-xl hover:bg-red-700 transition"
          >
            Combustível
          </button>

          <button
            onClick={() => handleNavigation('contato')}
            className="bg-indigo-600 text-white py-2 px-4 rounded-xl hover:bg-indigo-700 transition"
          >
            Suportes Pendentes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
