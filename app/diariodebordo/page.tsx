'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';

function useMotoristaId() {
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMotoristaId = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        console.error('Erro ao obter usuário:', userError?.message);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('motoristas_cadastrados')
        .select('id')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Erro ao buscar motorista:', error.message);
      } else if (data?.id) {
        setMotoristaId(data.id);
      }

      setLoading(false);
    };

    fetchMotoristaId();
  }, []);

  return { motoristaId, loading };
}

type Viagem = {
  id?: string;
  motorista_id: string;
  data: string;
  sentido: 'ida' | 'volta';
  origem: string;
  km_inicial: number;
  hora_inicial: string;
  destino: string;
  hora_final: string;
  semana: string;
  status: string;
};

const opcoesLocal = [
  'BTP', 'ECOPORTO', 'DP WORLD', 'SANTOS BRASIL', 'IPA', 'CLIA', 'BK',
  'FASSINA', 'B2', 'MEDLOG', 'MARIMEX', 'COBRON', 'BRB', 'DALASTRA',
  'TRANSTEC', 'STS CONTAINER'
];

export default function DiarioDeBordoPage() {
  const { motoristaId, loading } = useMotoristaId();
  const [dataSelecionada, setDataSelecionada] = useState(dayjs().format('YYYY-MM-DD'));
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [viagemEmEdicao, setViagemEmEdicao] = useState<Viagem | null>(null);
  const { register, handleSubmit, reset } = useForm<Partial<Viagem>>();
  const router = useRouter();

  const carregarViagens = async () => {
    if (!motoristaId) return;

    const { data, error } = await supabase
      .from('diariodebordo_viagens')
      .select('*')
      .eq('motorista_id', motoristaId)
      .eq('data', dataSelecionada)
      .order('hora_inicial', { ascending: true });

    if (error) {
      console.error('Erro ao carregar viagens:', error.message);
    } else {
      setViagens(data || []);
    }
  };

  useEffect(() => {
    carregarViagens();
  }, [dataSelecionada, motoristaId]);

  const handleSalvar = async (formData: Partial<Viagem>) => {
    if (!motoristaId) return;

    const dados = {
      ...formData,
      motorista_id: motoristaId,
      data: dataSelecionada,
      semana: dayjs(dataSelecionada).startOf('week').format('YYYY-[W]WW'),
      status: 'rascunho',
    } as Viagem;

    if (viagemEmEdicao) {
      const { error } = await supabase
        .from('diariodebordo_viagens')
        .update(dados)
        .eq('id', viagemEmEdicao.id!);

      if (!error) {
        alert('Viagem atualizada!');
        setViagemEmEdicao(null);
        reset();
        carregarViagens();
      } else {
        alert('Erro ao atualizar: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('diariodebordo_viagens').insert([dados]);
      if (!error) {
        alert('Viagem salva com sucesso!');
        reset();
        carregarViagens();
      } else {
        alert(`Erro ao salvar: ${error.message}`);
      }
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja excluir esta viagem?')) return;
    const { error } = await supabase.from('diariodebordo_viagens').delete().eq('id', id);
    if (!error) carregarViagens();
    else alert('Erro ao excluir: ' + error.message);
  };

  const handleEditar = (viagem: Viagem) => {
    setViagemEmEdicao(viagem);
    reset({
      sentido: viagem.sentido,
      origem: viagem.origem,
      destino: viagem.destino,
      km_inicial: viagem.km_inicial,
      hora_inicial: viagem.hora_inicial,
      hora_final: viagem.hora_final,
    });
  };

  if (loading) return <p className="p-4">Carregando usuário...</p>;
  if (!motoristaId) return <p className="p-4 text-red-600">Erro: motorista não identificado.</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Diário de Bordo - {dayjs(dataSelecionada).format('DD/MM/YYYY')}</h1>
        <button
          onClick={() => router.push('/diariodebordo/fechamento')}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Ir para Fechamento
        </button>
      </div>

      <div className="mb-4">
        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
          className="border rounded p-2"
        />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Viagens do Dia</h2>
        {viagens.length === 0 ? (
          <p className="text-gray-500">Nenhuma viagem registrada.</p>
        ) : (
          <ul className="space-y-2">
            {(() => {
              const agrupadas: { ida?: Viagem; volta?: Viagem }[] = [];
              const usadas = new Set<number>();

              viagens.forEach((viagem, i) => {
                if (usadas.has(i)) return;

                if (viagem.sentido === 'ida') {
                  const parIndex = viagens.findIndex((v, j) =>
                    !usadas.has(j) &&
                    v.sentido === 'volta' &&
                    v.origem === viagem.destino &&
                    dayjs(v.data).isSame(viagem.data)
                  );

                  if (parIndex !== -1) {
                    usadas.add(i);
                    usadas.add(parIndex);
                    agrupadas.push({ ida: viagem, volta: viagens[parIndex] });
                  } else {
                    usadas.add(i);
                    agrupadas.push({ ida: viagem });
                  }
                } else {
                  usadas.add(i);
                  agrupadas.push({ volta: viagem });
                }
              });

              return agrupadas.map((grupo, index) => (
                <li key={index} className="border p-2 rounded space-y-1">
                  <div className="font-semibold">
                    {grupo.ida && grupo.volta ? 'IDA E VOLTA' : grupo.ida ? 'IDA' : 'VOLTA'}
                  </div>

                  {grupo.ida && (
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>Ida:</strong> {grupo.ida.origem} → {grupo.ida.destino} | KM: {grupo.ida.km_inicial} | Horário: {grupo.ida.hora_inicial}
                      </div>
                      <div className="space-x-2">
                        <button onClick={() => handleEditar(grupo.ida!)} className="text-blue-600">Editar</button>
                        <button onClick={() => handleExcluir(grupo.ida!.id!)} className="text-red-600">Excluir</button>
                      </div>
                    </div>
                  )}

                  {grupo.volta && (
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>Volta:</strong> {grupo.volta.origem} → {grupo.volta.destino} | KM: {grupo.volta.km_inicial} | Horário: {grupo.volta.hora_final}
                      </div>
                      <div className="space-x-2">
                        <button onClick={() => handleEditar(grupo.volta!)} className="text-blue-600">Editar</button>
                        <button onClick={() => handleExcluir(grupo.volta!.id!)} className="text-red-600">Excluir</button>
                      </div>
                    </div>
                  )}
                </li>
              ));
            })()}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit(handleSalvar)} className="space-y-3 border-t pt-4">
        <h2 className="text-xl font-semibold">{viagemEmEdicao ? 'Editar Viagem' : 'Adicionar Viagem'}</h2>

        <select {...register('sentido', { required: true })} defaultValue="ida" className="border p-2 rounded w-full">
          <option value="ida">Ida</option>
          <option value="volta">Volta</option>
        </select>

        <select {...register('origem', { required: true })} defaultValue="" className="border p-2 rounded w-full">
          <option value="" disabled>Selecione a origem</option>
          {opcoesLocal.map((opcao) => (
            <option key={opcao} value={opcao}>{opcao}</option>
          ))}
        </select>

        <input
          {...register('km_inicial', {
            valueAsNumber: true,
            required: 'KM Inicial é obrigatório',
            validate: (value) =>
              typeof value === 'number' && !isNaN(value) && value > 0 || 'KM deve ser maior que zero',
          })}
          type="number"
          placeholder="KM Inicial"
          className="border p-2 rounded w-full"
        />

        <input
          {...register('hora_inicial', { required: true })}
          type="time"
          placeholder="Hora Inicial"
          className="border p-2 rounded w-full"
        />

        <select {...register('destino', { required: true })} defaultValue="" className="border p-2 rounded w-full">
          <option value="" disabled>Selecione o destino</option>
          {opcoesLocal.map((opcao) => (
            <option key={opcao} value={opcao}>{opcao}</option>
          ))}
        </select>

        <input
          {...register('hora_final', { required: true })}
          type="time"
          placeholder="Hora Final"
          className="border p-2 rounded w-full"
        />

        <div className="flex gap-4">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {viagemEmEdicao ? 'Atualizar Viagem' : 'Salvar Viagem'}
          </button>
          {viagemEmEdicao && (
            <button
              type="button"
              onClick={() => {
                setViagemEmEdicao(null);
                reset();
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

