'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import gerarPdfDiarioDeBordo from '../../lib/pdf/gerarPdfDiarioDeBordo';

dayjs.extend(weekOfYear);
dayjs.Ls.en.weekStart = 0;

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

type ViagemAgrupada = {
  id: string;
  data: string;
  ida?: Viagem;
  volta?: Viagem;
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

function getSemanaData(date: dayjs.Dayjs) {
  const inicio = date.day(0); // domingo
  const fim = date.day(6); // sábado
  const semanaNumero = inicio.week();
  const ano = inicio.year();
  const codigo = `${ano}-W${String(semanaNumero).padStart(2, '0')}`;
  return { inicio, fim, codigo };
}

// Função que agrupa viagens ida e volta consecutivas, mesmo dia, origem destino invertidos
function agruparIdaVolta(viagens: Viagem[]): ViagemAgrupada[] {
  const agrupadas: ViagemAgrupada[] = [];
  let i = 0;

  while (i < viagens.length) {
    const atual = viagens[i];
    const proxima = viagens[i + 1];

    if (
      proxima &&
      atual.data === proxima.data &&
      atual.sentido === 'ida' &&
      proxima.sentido === 'volta' &&
      atual.destino === proxima.origem
    ) {
      agrupadas.push({
        id: `${atual.id}-${proxima.id}`,
        data: atual.data,
        ida: atual,
        volta: proxima,
      });
      i += 2;
    } else {
      agrupadas.push({
        id: atual.id,
        data: atual.data,
        [atual.sentido]: atual,
      });
      i += 1;
    }
  }

  return agrupadas;
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
      .order('data')
      .order('hora_inicial');

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
      const viagensAgrupadas = agruparIdaVolta(viagensSemana);

      const publicUrl = await gerarPdfDiarioDeBordo({
        motoristaNome: motorista.nome,
        cavalo: formData.cavalo,
        carreta: formData.carreta,
        horario: formData.horario,
        viagens: viagensAgrupadas,
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
        console.error('Erro ao inserir entrega:', insertError);
        throw insertError;
      }

      alert('Fechamento enviado com sucesso!');
      reset();
      setEntregaExistente(true);
    } catch (e: any) {
      alert('Erro ao enviar fechamento:\n' + (e?.message || JSON.stringify(e)));
    } finally {
      setSubmetendo(false);
    }
  };

  const viagensAgrupadasParaDisplay = agruparIdaVolta(viagensSemana);

  if (loading) return <p className="p-4">Carregando...</p>;
  if (!motorista?.id) return <p className="p-4 text-red-600">Erro: motorista não identificado.</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Fechamento Semanal</h1>
      <p className="mb-2 text-gray-600">
        Semana: <strong>{codigoSemana}</strong> ({dataInicio} à {dataFim})
      </p>

      {viagensAgrupadasParaDisplay.length === 0 ? (
        <p className="text-gray-500">Nenhuma viagem registrada nesta semana.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {viagensAgrupadasParaDisplay.map((v) => (
            <li key={v.id} className="border p-2 rounded text-sm">
              <strong className="block mb-1">{dayjs(v.data).format('DD/MM')}</strong>
              {v.ida && (
                <div className="mb-1">
                  <span className="font-medium">IDA:</span> {v.ida.origem} → {v.ida.destino} ({v.ida.hora_inicial} → {v.ida.hora_final})
                </div>
              )}
              {v.volta && (
                <div>
                  <span className="font-medium">VOLTA:</span> {v.volta.origem} → {v.volta.destino} ({v.volta.hora_inicial} → {v.volta.hora_final})
                </div>
              )}
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

          <select {...register('cavalo')} className="border p-2 rounded w-full" required>
            <option value="">Selecione o cavalo</option>
            {[
              '545-GHP3H55','546-GJF2I56','547-GDU7E57','548-FCV6F38','549-GEI8I14',
              '550-GGV9A18','551-GFD9J51','552-GFH9D62','553-GIV6G23','554-GHQ0D14',
              '555-GEJ6A35','556-FOS1B66','557-GGA9C77','558-GJH4B86','559-GBH5I34',
              '560-CUJ0B97','561-FWY9G01','563-GJA9B93','565-GHX6F41','566-FWT4C36',
              '567-GJR7B23','568-GKC5E03','569-GGL2A45','570-SSS3C03','571-TKG4E35',
              '572-TKO4A72','573-TLY2G33'
            ].map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select {...register('carreta')} className="border p-2 rounded w-full" required>
            <option value="">Selecione a carreta</option>
            {[
              'GJL4D24','GHL5D92','GIO3H85','GEG7C37','GJL6E57','GKF8B05','GED6H53','GHW4G37',
              'GKH2G71','GJM2H72','GKH2E42','GBW2E56','GJM1E73','GCK7C81','GFP0I35','TJP2I51',
              'TJL3E02','TJV7A54','TJI3F42','TJO3E75','TJU0A37','TJV1E31','TJV1E44','TJJ1F97',
              'TJV5J41','TJJ2D36','TJL2C26','TJS0B17'
            ].map(c => <option key={c} value={c}>{c}</option>)}
          </select>

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
