'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

dayjs.extend(isoWeek);

export default function AdminDiarioDeBordoPage() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [semanaSelecionada, setSemanaSelecionada] = useState(getSemanaAtual());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    verificarUsuario();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      carregarEntregas();
      carregarMotoristas();
    }
  }, [semanaSelecionada, isAdmin]);

  function getSemanaAtual() {
    const hoje = dayjs();
    const primeiroDomingo = dayjs(`${hoje.year()}-01-01`).day(0);
    const semanas = Math.ceil(hoje.diff(primeiroDomingo, 'day') / 7) + 1;
    return `${hoje.year()}-W${String(semanas).padStart(2, '0')}`;
  }

  async function verificarUsuario() {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      router.push('/');
      return;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('motoristas_cadastrados')
      .select('admin')
      .eq('id', userData.user.id)
      .single();

    if (perfilError || !perfil?.admin) {
      router.push('/');
      return;
    }

    setIsAdmin(true);
    setIsLoading(false);
  }

  async function carregarEntregas() {
    const { data, error } = await supabase
      .from('diariodebordo_entregas')
      .select('*')
      .eq('semana', semanaSelecionada)
      .order('data_entrega', { ascending: false });

    if (!error) setEntregas(data);
  }

  async function carregarMotoristas() {
    const { data, error } = await supabase
      .from('motoristas_cadastrados')
      .select('*')
      .order('motorista');

    if (!error) setMotoristas(data);
  }

  const motoristasSemEntrega = motoristas.filter((m) => {
    return !entregas.find((e) => e.motorista_id === m.id);
  });

  if (isLoading) {
    return <div className="p-4 text-center">Carregando...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin - Diário de Bordo</h1>

      <label className="block mb-4">
        <span className="text-sm text-gray-600">Filtrar por semana:</span>
        <input
          type="week"
          value={semanaSelecionada}
          onChange={(e) => setSemanaSelecionada(e.target.value)}
          className="border p-2 rounded"
        />
      </label>

      <Tabs defaultValue="entregues">
        <TabsList>
          <TabsTrigger value="entregues">Entregues</TabsTrigger>
          <TabsTrigger value="naoentregaram">Não entregaram</TabsTrigger>
        </TabsList>

        <TabsContent value="entregues">
          <div className="space-y-3 mt-4">
            {entregas.length === 0 && <p className="text-gray-500">Nenhuma entrega registrada.</p>}
            {entregas.map((entrega) => (
              <Card key={entrega.id}>
                <CardContent className="p-4">
                  <p><strong>Status:</strong> {entrega.status}</p>
                  <p><strong>Assinatura:</strong> {entrega.assinatura}</p>
                  <p><strong>Justificativa:</strong> {entrega.justificativa || '—'}</p>
                  <p><strong>Data de Entrega:</strong> {format(new Date(entrega.data_entrega), 'dd/MM/yyyy HH:mm')}</p>
                  <p>
                    <strong>PDF:</strong>{' '}
                    <Link className="text-blue-600 underline" href={entrega.pdf_url} target="_blank">
                      Visualizar
                    </Link>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="naoentregaram">
          {motoristasSemEntrega.length === 0 ? (
            <p className="text-green-700 mt-4">Todos os motoristas entregaram.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {motoristasSemEntrega.map((motorista) => (
                <Card key={motorista.id} className="shadow-md border border-gray-200">
                  <CardContent className="p-4">
                    <p className="text-lg font-semibold text-gray-800">{motorista.motorista}</p>
                    <p className="text-sm text-gray-500">{motorista.usuario}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
