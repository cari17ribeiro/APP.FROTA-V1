'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';

function useMotoristaId() {
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMotoristaId = async () => {
      try {
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
      } catch (err) {
        console.error('Erro inesperado:', err);
      } finally {
        setLoading(false);
      }
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

export default function DiarioDeBordoPage() {
  const { motoristaId, loading } = useMotoristaId();
  const [dataSelecionada, setDataSelecionada] = useState(dayjs().format('YYYY-MM-DD'));
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const { register, handleSubmit, reset } = useForm<Partial<Viagem>>();

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
      return;
    }

    if (data) setViagens(data);
  };

  useEffect(() => {
    carregarViagens();
  }, [dataSelecionada, motoristaId]);

  const handleSalvar = async (formData: Partial<Viagem>) => {
    if (!motoristaId) return;

    const novaViagem: Viagem = {
      ...formData,
      motorista_id: motoristaId,
      data: dataSelecionada,
      semana: dayjs(dataSelecionada).startOf('week').format('YYYY-[W]WW'),
      status: 'rascunho',
    } as Viagem;

    const { error } = await supabase.from('diariodebordo_viagens').insert([novaViagem]);

    if (!error) {
      alert('Viagem salva com sucesso!');
      reset();
      carregarViagens();
    } else {
      console.error('Erro ao salvar:', error.message);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  if (loading) return <p className="p-4">Carregando usuário...</p>;
  if (!motoristaId) return <p className="p-4 text-red-600">Erro: motorista não identificado.</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Diário de Bordo - {dayjs(dataSelecionada).format('DD/MM/YYYY')}</h1>

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
            {viagens.map((viagem) => (
              <li key={viagem.id} className="border p-2 rounded">
                <strong>{viagem.sentido.toUpperCase()}</strong>: {viagem.origem} → {viagem.destino} | KM: {viagem.km_inicial} | {viagem.hora_inicial} → {viagem.hora_final}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit(handleSalvar)} className="space-y-3 border-t pt-4">
        <h2 className="text-xl font-semibold">Adicionar Viagem</h2>

        <select
          {...register('sentido', { required: true })}
          defaultValue="ida"
          className="border p-2 rounded w-full"
        >
          <option value="ida">Ida</option>
          <option value="volta">Volta</option>
        </select>

        <input
          {...register('origem', { required: true })}
          placeholder="Origem"
          className="border p-2 rounded w-full"
        />

        <input
          {...register('km_inicial', {
            valueAsNumber: true,
            required: 'KM Inicial é obrigatório',
            validate: (value) =>
              typeof value === 'number' && !isNaN(value) && value > 0 || 'KM deve ser um número válido e maior que zero',
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

        <input
          {...register('destino', { required: true })}
          placeholder="Destino"
          className="border p-2 rounded w-full"
        />

        <input
          {...register('hora_final', { required: true })}
          type="time"
          placeholder="Hora Final"
          className="border p-2 rounded w-full"
        />

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Salvar Viagem
        </button>
      </form>
    </div>
  );
}
