'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Contato = {
  id: string;
  tipo: string;
  usuario: string;
  mensagem: string;
  created_at: string;
};

export default function AdminContatoPage() {
  const [abaAtiva, setAbaAtiva] = useState<'correcao_login' | 'outros'>('correcao_login');
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar contatos filtrando pelo tipo
  const fetchContatos = async (tipo: string) => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('contatos_suporte')
      .select('*')
      .eq('tipo', tipo)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setContatos([]);
    } else {
      setContatos(data ?? []);
    }
    setLoading(false);
  };

  // Buscar contatos toda vez que a aba mudar
  useEffect(() => {
    fetchContatos(abaAtiva);
  }, [abaAtiva]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Contato do Admin</h1>

      {/* Abas */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setAbaAtiva('correcao_login')}
          className={`px-4 py-2 rounded-t-lg font-semibold ${
            abaAtiva === 'correcao_login'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Contatos Correção Login
        </button>
        <button
          onClick={() => setAbaAtiva('outros')}
          className={`px-4 py-2 rounded-t-lg font-semibold ${
            abaAtiva === 'outros'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Outros Contatos
        </button>
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-b-lg shadow p-6 min-h-[300px]">
        {loading && <p>Carregando...</p>}
        {error && <p className="text-red-600">Erro: {error}</p>}
        {!loading && contatos.length === 0 && <p>Nenhum contato encontrado.</p>}

        {!loading && contatos.length > 0 && (
          <ul className="space-y-4 max-h-[400px] overflow-y-auto">
            {contatos.map(({ id, usuario, mensagem, created_at }) => (
              <li key={id} className="border rounded p-4 shadow-sm">
                <p className="font-semibold">{usuario}</p>
                <p className="text-sm text-gray-600 mb-2">{new Date(created_at).toLocaleString()}</p>
                <p>{mensagem}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
