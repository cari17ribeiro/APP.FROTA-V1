'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type ViagemPendente = {
  id: number;
  user_id: string;
  email: string;
  container: string;
  origem: string;
  destino: string;
  data: string;
  valor: number | null;
  mensagem: string;
  comprovante_url: string;
  created_at: string;
  status: string;
};

export default function CorrecoesPage() {
  const [viagens, setViagens] = useState<ViagemPendente[]>([]);
  const [pagina, setPagina] = useState(1);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [valorInput, setValorInput] = useState<{ [id: number]: string }>({});
  const [mostrarInputValor, setMostrarInputValor] = useState<{ [id: number]: boolean }>({});
  const itensPorPagina = 10;

  useEffect(() => {
    fetchData();
  }, [pagina, dataInicio, dataFim]);

  async function fetchData() {
    let query = supabase
      .from('viagens_pendentes')
      .select('*', { count: 'exact' })
      .eq('status', 'pendente');

    if (dataInicio) query = query.gte('created_at', dataInicio);
    if (dataFim) query = query.lte('created_at', dataFim + 'T23:59:59');

    query = query
      .order('created_at', { ascending: false })
      .range((pagina - 1) * itensPorPagina, pagina * itensPorPagina - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar viagens:', error);
    } else {
      setViagens(data || []);
      setTotalPaginas(Math.ceil((count || 0) / itensPorPagina));
    }
  }

  async function aprovarViagem(viagem: ViagemPendente) {
    const valorStr = valorInput[viagem.id] ?? '';
    const valor = parseFloat(valorStr);

    if (isNaN(valor) || valor <= 0) {
      alert('Informe um valor válido para aprovar a viagem.');
      return;
    }

    const { error: updateError } = await supabase
      .from('viagens_pendentes')
      .update({ status: 'aprovado' })
      .eq('id', viagem.id);

    if (updateError) {
      alert('Erro ao atualizar status');
      return;
    }

    const { error: insertError } = await supabase
      .from('minhas_viagens')
      .insert([
        {
          id_viagem: crypto.randomUUID(),
          email: viagem.email,
          origem: viagem.origem,
          destino: viagem.destino,
          data: viagem.data,
          container: viagem.container,
          status: 'confirmado',
          valor: valor,
        },
      ]);

    if (insertError) {
      console.error('Erro ao inserir na tabela minhas_viagens:', insertError);
      alert('Erro ao inserir na tabela minhas_viagens');
      return;
    }

    setViagens((v) => v.filter((v) => v.id !== viagem.id));
  }

  async function atualizarStatus(id: number, status: 'aprovado' | 'reprovado') {
    const { error } = await supabase
      .from('viagens_pendentes')
      .update({ status })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status');
    } else {
      setViagens((v) => v.filter((viagem) => viagem.id !== id));
    }
  }

  function mostrarCampoValor(id: number) {
    setMostrarInputValor((prev) => ({ ...prev, [id]: true }));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">Correções de Comprovantes</h1>

      {/* Filtros por data */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <div>
          <label className="block text-sm font-medium text-gray-700">Data inicial</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data final</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {viagens.length === 0 ? (
        <p className="text-center text-gray-500">Nenhuma viagem pendente encontrada.</p>
      ) : (
        viagens.map((viagem) => (
          <div key={viagem.id} className="border rounded p-4 mb-4 shadow-sm bg-white">
            <p><strong>Email do motorista:</strong> {viagem.email}</p>
            <p><strong>Origem:</strong> {viagem.origem}</p>
            <p><strong>Destino:</strong> {viagem.destino}</p>
            <p><strong>Data:</strong> {viagem.data}</p>
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
            <p><strong>Status atual:</strong> {viagem.status}</p>

            {/* Input de valor (mostrado somente após clicar em Aprovar) */}
            {mostrarInputValor[viagem.id] && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorInput[viagem.id] || ''}
                  onChange={(e) =>
                    setValorInput((prev) => ({ ...prev, [viagem.id]: e.target.value }))
                  }
                  className="border rounded px-3 py-2 mt-1 w-40"
                />
                <button
                  onClick={() => aprovarViagem(viagem)}
                  className="ml-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Confirmar aprovação
                </button>
              </div>
            )}

            {/* Botões de ação */}
            {!mostrarInputValor[viagem.id] && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => mostrarCampoValor(viagem.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => atualizarStatus(viagem.id, 'reprovado')}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Reprovar
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* Paginação */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setPagina((p) => Math.max(p - 1, 1))}
          disabled={pagina === 1}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <p className="text-sm">Página {pagina} de {totalPaginas}</p>
        <button
          onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
          disabled={pagina === totalPaginas}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
