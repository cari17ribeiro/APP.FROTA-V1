'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

type Viagem = {
  id_viagem: number;
  destino: string;
  origem: string;
  data: string;
  container: string;
  valor?: number;
};

export default function MinhasViagens() {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Formulário de correção (sem mudanças)
  const [container, setContainer] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [data, setData] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Filtros de visualização
  const [premiacaoMes, setPremiacaoMes] = useState('');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');

  const [checklist, setChecklist] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const storedChecklist = localStorage.getItem('checklist');
    if (storedChecklist) {
      setChecklist(JSON.parse(storedChecklist));
    }
  }, []);

  const handleChecklistToggle = (id: number) => {
    const updated = { ...checklist, [id]: !checklist[id] };
    setChecklist(updated);
    localStorage.setItem('checklist', JSON.stringify(updated));
  };

  const fetchViagens = async (email: string) => {
    let query = supabase.from('minhas_viagens').select('*').eq('email', email);

    // Se o usuário escolheu filtro de mês da premiação, aplica ele
    if (premiacaoMes) {
      const [ano, mes] = premiacaoMes.split('-').map(Number);
      const dataInicio = new Date(ano, mes - 2, 21);
      const dataFim = new Date(ano, mes - 1, 20);
      const dataInicioISO = dataInicio.toISOString().split('T')[0];
      const dataFimISO = dataFim.toISOString().split('T')[0];
      query = query.gte('data', dataInicioISO).lte('data', dataFimISO);
    }
    // Caso contrário, se tiver filtro por intervalo personalizado, aplica ele
    else if (dataInicioFiltro && dataFimFiltro) {
      query = query.gte('data', dataInicioFiltro).lte('data', dataFimFiltro);
    }
    // Se nenhum filtro aplicado, traz todas as viagens do usuário

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar viagens:', error);
    } else {
      setViagens(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    const fetchUserAndViagens = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.error('Erro ao obter usuário:', error);
        setLoading(false);
        return;
      }

      const email = user.email!;
      const id = user.id;
      setUserEmail(email);
      setUserId(id);
      await fetchViagens(email);
    };

    fetchUserAndViagens();
  }, [premiacaoMes, dataInicioFiltro, dataFimFiltro]); // Recarrega viagens quando qualquer filtro mudar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!arquivo || !userEmail || !userId) {
      alert('Arquivo ou informações do usuário não encontradas.');
      return;
    }

    setEnviando(true);

    const fileExt = arquivo.name.split('.').pop();
    const filePath = `comprovantes/${uuidv4()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(filePath, arquivo);

    if (uploadError) {
      console.error('Erro ao enviar arquivo:', uploadError.message);
      alert('Erro ao enviar arquivo: ' + uploadError.message);
      setEnviando(false);
      return;
    }

    const { data: publicURLData } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(filePath);

    if (!publicURLData?.publicUrl) {
      alert('Erro ao obter URL pública');
      setEnviando(false);
      return;
    }

    const comprovanteUrl = publicURLData.publicUrl;

    const { error: insertError } = await supabase
      .from('viagens_pendentes')
      .insert([{
        email: userEmail,
        user_id: userId,
        origem,
        destino,
        data,
        container,
        mensagem,
        comprovante_url: comprovanteUrl,
        status: 'pendente',
      }]);

    if (insertError) {
      console.error('Erro ao inserir no Supabase:', insertError);
      alert('Erro ao inserir dados: ' + insertError.message);
    } else {
      setSucesso(true);
      setOrigem('');
      setDestino('');
      setData('');
      setContainer('');
      setMensagem('');
      setArquivo(null);
      alert('Enviado com sucesso!');
    }

    setEnviando(false);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg w-full max-w-6xl">

        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
          Minhas Viagens
        </h1>

        {/* Filtro por mês da premiação */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Filtrar por mês da premiação
          </label>
          <input
            type="month"
            value={premiacaoMes}
            onChange={(e) => {
              setPremiacaoMes(e.target.value);
              // Limpa filtro de intervalo ao usar filtro de premiação
              setDataInicioFiltro('');
              setDataFimFiltro('');
            }}
            className="mt-2 border px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtro por intervalo personalizado */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ou selecione um intervalo personalizado de datas
          </label>
          <div className="flex gap-4">
            <input
              type="date"
              value={dataInicioFiltro}
              onChange={(e) => {
                setDataInicioFiltro(e.target.value);
                // Limpa filtro de premiação ao usar intervalo personalizado
                setPremiacaoMes('');
              }}
              className="border px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Data Início"
              max={dataFimFiltro || undefined}
            />
            <input
              type="date"
              value={dataFimFiltro}
              onChange={(e) => {
                setDataFimFiltro(e.target.value);
                setPremiacaoMes('');
              }}
              className="border px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Data Fim"
              min={dataInicioFiltro || undefined}
            />
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto mb-4 bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition"
        >
          Imprimir / Salvar PDF
        </button>

        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-area, .print-area * {
                visibility: visible;
              }
              .print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}
        </style>

        {loading ? (
          <p className="text-center text-gray-600">Carregando...</p>
        ) : viagens.length === 0 ? (
          <p className="text-center text-gray-600">Você ainda não possui viagens registradas.</p>
        ) : (
          <div className="print-area mb-6">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto shadow-md rounded-lg">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="text-white px-4 py-2">Origem</th>
                    <th className="text-white px-4 py-2">Destino</th>
                    <th className="text-white px-4 py-2">Data</th>
                    <th className="text-white px-4 py-2">Container</th>
                    <th className="text-white px-4 py-2">Valor</th>
                    <th className="text-white px-4 py-2">Checklist</th>
                  </tr>
                </thead>
                <tbody>
                  {viagens.map((viagem) => (
                    <tr key={viagem.id_viagem} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{viagem.origem}</td>
                      <td className="px-4 py-2">{viagem.destino}</td>
                      <td className="px-4 py-2">{viagem.data}</td>
                      <td className="px-4 py-2">{viagem.container}</td>
                      <td className="px-4 py-2">R$ {viagem.valor?.toFixed(2) ?? '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={checklist[viagem.id_viagem] || false}
                          onChange={() => handleChecklistToggle(viagem.id_viagem)}
                          className="w-5 h-5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-4">
              {viagens.map((viagem) => (
                <div key={viagem.id_viagem} className="bg-white p-4 rounded-lg shadow-md">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Origem:</span>
                    <span>{viagem.origem}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Destino:</span>
                    <span>{viagem.destino}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Data:</span>
                    <span>{viagem.data}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Container:</span>
                    <span>{viagem.container}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Valor:</span>
                    <span>R$ {viagem.valor?.toFixed(2) ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-semibold text-gray-700">Checklist:</span>
                    <input
                      type="checkbox"
                      checked={checklist[viagem.id_viagem] || false}
                      onChange={() => handleChecklistToggle(viagem.id_viagem)}
                      className="w-5 h-5"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulário para enviar correção segue igual */}
        <hr className="my-6 border-t border-gray-300" />

        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">
          Faltando alguma viagem ou correção?
        </h2>
        <p className="text-center text-sm text-gray-600 mb-4">
          Preencha os campos abaixo e anexe um comprovante.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* campos do formulário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Origem</label>
              <input
                type="text"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="w-full border px-4 py-2 mt-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Destino</label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full border px-4 py-2 mt-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data da Viagem</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full border px-4 py-2 mt-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Número do Container</label>
              <input
                type="text"
                value={container}
                onChange={(e) => setContainer(e.target.value)}
                className="w-full border px-4 py-2 mt-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mensagem</label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full border px-4 py-2 mt-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Anexar comprovante</label>
            <input
              type="file"
              onChange={(e) => setArquivo(e.target.files ? e.target.files[0] : null)}
              className="mt-2"
              required
              accept="image/*,application/pdf"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="bg-blue-600 text-white py-3 w-full rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Enviar Correção'}
          </button>

          {sucesso && <p className="text-green-600 mt-4">Correção enviada com sucesso!</p>}
        </form>
      </div>
    </div>
  );
}
