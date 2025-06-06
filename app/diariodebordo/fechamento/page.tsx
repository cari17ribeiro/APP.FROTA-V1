'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import gerarPdfDiarioDeBordo from '../../lib/pdf/gerarPdfDiarioDeBordo';

// Ativa plugin e configura semana começando no domingo
dayjs.extend(weekOfYear);
dayjs.Ls.en.weekStart = 0; // 0 = domingo

type Viagem = {
  id: string;
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

type EntregaForm = {
  assinatura: string;
  justificativa?: string;
  cavalo: string;
  carreta: string;
  horario: 'diurno' | 'noturno';
};

function useMotorista() {
  const [motorista, setMotorista] = useState<{ id: string; nome: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMotorista = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user?.email) {
          console.error('Erro ao obter usuário logado:', userError);
          return setLoading(false);
        }

        const { data, error } = await supabase
          .from('motoristas_cadastrados')
          .select('id, motorista')
          .eq('email', user.email)
          .single();

        if (error) {
          console.error('Erro ao buscar motorista:', error);
        }

        if (data?.id) {
          setMotorista({ id: data.id, nome: data.motorista });
        }
      } catch (e) {
        console.error('Erro inesperado ao buscar motorista:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchMotorista();
  }, []);

  return { motorista, loading };
}

// Função utilitária para calcular semana de domingo a sábado
function getSemanaData(date: dayjs.Dayjs) {
  const inicio = date.day(0); // domingo da semana da data
  const fim = date.day(6);    // sábado da semana da data
  const semanaNumero = inicio.week();
  const ano = inicio.year();
  const codigo = `${ano}-W${String(semanaNumero).padStart(2, '0')}`;
  return { inicio, fim, codigo };
}

export default function FechamentoSemanalPage() {
  const { motorista, loading } = useMotorista();
  const [viagensSemana, setViagensSemana] = useState<Viagem[]>([]);
  const [semanaAtual, setSemanaAtual] = useState(dayjs());
  const { register, handleSubmit, reset } = useForm<EntregaForm>();
  const [submetendo, setSubmetendo] = useState(false);
  const [entregaExistente, setEntregaExistente] = useState<boolean>(false);

  const { inicio, fim, codigo } = getSemanaData(semanaAtual);
  const dataInicio = inicio.format('YYYY-MM-DD');
  const dataFim = fim.format('YYYY-MM-DD');
  const codigoSemana = codigo;

  const carregarViagens = async () => {
    if (!motorista?.id) return;

    const { data, error } = await supabase
      .from('diariodebordo_viagens')
      .select('*')
      .eq('motorista_id', motorista.id)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data');

    if (error) {
      console.error('Erro ao buscar viagens:', error);
    }

    if (data) {
      setViagensSemana(data);
    }
  };

  const verificarEntrega = async () => {
    if (!motorista?.id) return;

    const { data, error } = await supabase
      .from('diariodebordo_entregas')
      .select('id')
      .eq('motorista_id', motorista.id)
      .eq('semana', codigoSemana)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar entrega existente:', error);
    }

    if (data?.id) {
      setEntregaExistente(true);
    }
  };

  useEffect(() => {
    if (motorista?.id) {
      carregarViagens();
      verificarEntrega();
    }
  }, [motorista, semanaAtual]);

  const onSubmit = async (formData: EntregaForm) => {
    if (!motorista?.id) {
      alert('Motorista não identificado.');
      return;
    }

    if (viagensSemana.length === 0) {
      alert('Nenhuma viagem registrada nesta semana. Nada a enviar.');
      return;
    }

    setSubmetendo(true);

    try {
      const publicUrl = await gerarPdfDiarioDeBordo({
        motoristaNome: motorista.nome,
        cavalo: formData.cavalo,
        carreta: formData.carreta,
        horario: formData.horario,
        viagens: viagensSemana,
        semana: codigoSemana,
      });

      if (!publicUrl || typeof publicUrl !== 'string') {
        throw new Error('Falha ao gerar o PDF. URL inválida ou ausente.');
      }

      const { error: insertError } = await supabase.from('diariodebordo_entregas').insert([{
        motorista_id: motorista.id,
        semana: codigoSemana,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'entregue',
        justificativa: formData.justificativa || '',
        assinatura: formData.assinatura,
        pdf_url: publicUrl,
        data_entrega: new Date().toISOString(),
      }]);

      if (insertError) {
        console.error('❌ Erro ao inserir entrega no Supabase:', insertError);
        throw insertError;
      }

      alert('Fechamento enviado com sucesso!');
      reset();
      setEntregaExistente(true);
    } catch (e: any) {
      console.error('❌ Erro inesperado durante o envio:', e);
      alert('Erro ao enviar fechamento:\n' + (e?.message || JSON.stringify(e)));
    } finally {
      setSubmetendo(false);
    }
  };

  if (loading) return <p className="p-4">Carregando...</p>;
  if (!motorista?.id) return <p className="p-4 text-red-600">Erro: motorista não identificado.</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Fechamento Semanal</h1>
      <p className="mb-2 text-gray-600">
        Semana: <strong>{codigoSemana}</strong> ({dataInicio} à {dataFim})
      </p>

      {viagensSemana.length === 0 ? (
        <p className="text-gray-500">Nenhuma viagem registrada nesta semana.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {viagensSemana.map((v) => (
            <li key={v.id} className="border p-2 rounded">
              <strong>{dayjs(v.data).format('DD/MM')}</strong> – {v.sentido.toUpperCase()} {v.origem} → {v.destino} ({v.hora_inicial} → {v.hora_final})
            </li>
          ))}
        </ul>
      )}

      {entregaExistente ? (
        <p className="text-green-700 font-semibold">Fechamento já entregue.</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border-t pt-4">
          <h2 className="text-lg font-semibold">Assinar e Enviar</h2>

          <input {...register('assinatura')} placeholder="Assinatura (nome completo)" className="border p-2 rounded w-full" required />
          <input {...register('cavalo')} placeholder="Cavalo" className="border p-2 rounded w-full" required />
          <input {...register('carreta')} placeholder="Carreta" className="border p-2 rounded w-full" required />
          <select {...register('horario')} className="border p-2 rounded w-full" required>
            <option value="">Selecione o horário</option>
            <option value="diurno">Diurno</option>
            <option value="noturno">Noturno</option>
          </select>
          <textarea {...register('justificativa')} placeholder="Justificativa (opcional)" className="border p-2 rounded w-full" />

          <button type="submit" disabled={submetendo} className="bg-blue-600 text-white px-4 py-2 rounded">
            {submetendo ? 'Enviando...' : 'Enviar Fechamento'}
          </button>
        </form>
      )}
    </div>
  );
}
