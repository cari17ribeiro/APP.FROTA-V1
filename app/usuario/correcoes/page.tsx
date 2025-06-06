'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type ViagemPendente = {
  id: number;
  container: string;
  mensagem: string;
  comprovante_url: string;
  created_at: string;
  status: string;
};

export default function MinhasCorrecoesPage() {
  const [viagens, setViagens] = useState<ViagemPendente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchViagens() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('viagens_pendentes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar correções:', error);
      } else {
        setViagens(data || []);
      }

      setLoading(false);
    }

    fetchViagens();
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4 text-center">Minhas Correções Enviadas</h1>

      {loading ? (
        <p className="text-center text-gray-500">Carregando...</p>
      ) : viagens.length === 0 ? (
        <p className="text-center text-gray-500">Nenhuma correção enviada ainda.</p>
      ) : (
        <div className="space-y-4">
          {viagens.map((viagem) => (
            <div
              key={viagem.id}
              className="border rounded p-4 shadow-sm bg-white flex flex-col gap-2"
            >
              <p><strong>Container:</strong> {viagem.container}</p>
              {viagem.mensagem && (
                <p><strong>Mensagem:</strong> {viagem.mensagem}</p>
              )}
              <p>
                <strong>Comprovante:</strong>{' '}
                <a
                  href={viagem.comprovante_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Ver comprovante
                </a>
              </p>
              <p><strong>Data de envio:</strong> {new Date(viagem.created_at).toLocaleString()}</p>
              <p>
                <strong>Status:</strong>{' '}
                <span
                  className={
                    viagem.status === 'aprovado'
                      ? 'text-green-600 font-semibold'
                      : viagem.status === 'reprovado'
                      ? 'text-red-600 font-semibold'
                      : 'text-yellow-600 font-semibold'
                  }
                >
                  {viagem.status.toUpperCase()}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
