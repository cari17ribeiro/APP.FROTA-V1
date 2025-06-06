'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs'

export default function DiaParadoPage() {
  const [aba, setAba] = useState<'incluir' | 'aprovar' | 'registros'>('incluir')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [motoristas, setMotoristas] = useState<string[]>([])
  const [motorista, setMotorista] = useState('')
  const [data, setData] = useState('')
  const [inicioParada, setInicioParada] = useState('')
  const [fimParada, setFimParada] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [pendentes, setPendentes] = useState<any[]>([])
  const [msgAprovacao, setMsgAprovacao] = useState('')
  const [registros, setRegistros] = useState<any[]>([])
  const [loadingRegistros, setLoadingRegistros] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: authData, error } = await supabase.auth.getUser()
      if (error || !authData.user) return

      const email = authData.user.email ?? null
      setUserEmail(email)

      const { data: motoristaData, error: motoristaError } = await supabase
        .from('motoristas_cadastrados')
        .select('admin')
        .eq('email', email)
        .single()

      setIsAdmin(motoristaData?.admin === true)

      const { data: motoristasData } = await supabase
        .from('motoristas_cadastrados')
        .select('motorista')

      setMotoristas(motoristasData?.map((m) => m.motorista) || [])
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (aba === 'aprovar') {
      const fetchPendentes = async () => {
        const { data, error } = await supabase.from('dia_parado_pendentes').select('*')
        if (!error && data) setPendentes(data)
      }
      fetchPendentes()
    } else if (aba === 'registros') {
      const fetchRegistros = async () => {
        setLoadingRegistros(true)
        const { data, error } = await supabase
          .from('dia_parado')
          .select('id, motorista, data, tempo_parado, incluso, valor')
          .order('data', { ascending: false })

        if (!error && data) setRegistros(data)
        setLoadingRegistros(false)
      }
      fetchRegistros()
    }
  }, [aba])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMensagem('')

    try {
      if (!motorista || !data || !inicioParada || !fimParada) {
        setMensagem('Preencha todos os campos.')
        setLoading(false)
        return
      }

      const inicio = dayjs(`${data}T${inicioParada}`)
      const fim = dayjs(`${data}T${fimParada}`)
      const tempoParadoMin = fim.diff(inicio, 'minute')

      if (tempoParadoMin <= 0) {
        setMensagem('Horário de fim da parada deve ser maior que início.')
        setLoading(false)
        return
      }

      const { data: viagensDia } = await supabase
        .from('minhas_viagens')
        .select('id_viagem')
        .eq('motorista', motorista)
        .eq('data', data)

      const qtdViagens = viagensDia?.length || 0

      let incluso = ''
      if (qtdViagens === 0 || tempoParadoMin >= 360) {
        incluso = 'dia parado'
      } else if (qtdViagens > 2) {
        incluso = 'viagem oficina'
      } else {
        incluso = 'meio dia parado'
      }

      const dataRef = dayjs(data)
      const inicioMes = dataRef.startOf('month').format('YYYY-MM-DD')
      const fimMes = dataRef.endOf('month').format('YYYY-MM-DD')

      const { data: valoresMes } = await supabase
        .from('minhas_viagens')
        .select('valor')
        .eq('motorista', motorista)
        .gte('data', inicioMes)
        .lte('data', fimMes)

      const somaMes = valoresMes?.reduce((sum, v) => sum + (v.valor ?? 0), 0) ?? 0

      let valor = 0
      if (incluso === 'dia parado') valor = somaMes / 22
      else if (incluso === 'meio dia parado') valor = (somaMes / 22) / 2
      else if (incluso === 'viagem oficina') valor = 7.71

      const tempoParadoStr = `${Math.floor(tempoParadoMin / 60)
        .toString()
        .padStart(2, '0')}:${(tempoParadoMin % 60).toString().padStart(2, '0')}`

      const { error: insertError } = await supabase.from('dia_parado').insert([
        {
          motorista,
          data,
          inicio_parada: inicioParada,
          fim_parada: fimParada,
          tempo_parado: tempoParadoStr,
          incluso,
          valor: parseFloat(valor.toFixed(2)),
        },
      ])

      if (insertError) throw insertError

      setMensagem('Dia parado incluído com sucesso!')
      setMotorista('')
      setData('')
      setInicioParada('')
      setFimParada('')
    } catch (err) {
      console.error(err)
      setMensagem('Erro ao incluir dia parado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAprovar(id: number, aprovado: boolean) {
    try {
      const registro = pendentes.find((d) => d.id === id)
      if (!registro) return

      if (!aprovado) {
        await supabase.from('dia_parado_pendentes').delete().eq('id', id)
        setPendentes((prev) => prev.filter((d) => d.id !== id))
        setMsgAprovacao('Registro rejeitado com sucesso!')
        return
      }

      const { motorista, data, inicio_parada, fim_parada } = registro

      const inicio = dayjs(`${data}T${inicio_parada}`)
      const fim = dayjs(`${data}T${fim_parada}`)
      const tempoParadoMin = fim.diff(inicio, 'minute')

      if (tempoParadoMin <= 0) {
        setMsgAprovacao('Erro: horário de fim menor que início.')
        return
      }

      const { data: viagensDia } = await supabase
        .from('minhas_viagens')
        .select('id_viagem')
        .eq('motorista', motorista)
        .eq('data', data)

      const qtdViagens = viagensDia?.length || 0

      let incluso = ''
      if (qtdViagens === 0 || tempoParadoMin >= 360) {
        incluso = 'dia parado'
      } else if (qtdViagens > 2) {
        incluso = 'viagem oficina'
      } else {
        incluso = 'meio dia parado'
      }

      const dataRef = dayjs(data)
      const inicioMes = dataRef.startOf('month').format('YYYY-MM-DD')
      const fimMes = dataRef.endOf('month').format('YYYY-MM-DD')

      const { data: valoresMes } = await supabase
        .from('minhas_viagens')
        .select('valor')
        .eq('motorista', motorista)
        .gte('data', inicioMes)
        .lte('data', fimMes)

      const somaMes = valoresMes?.reduce((sum, v) => sum + (v.valor ?? 0), 0) ?? 0

      let valor = 0
      if (incluso === 'dia parado') valor = somaMes / 22
      else if (incluso === 'meio dia parado') valor = (somaMes / 22) / 2
      else if (incluso === 'viagem oficina') valor = 7.71

      const tempoParadoStr = `${Math.floor(tempoParadoMin / 60)
        .toString()
        .padStart(2, '0')}:${(tempoParadoMin % 60).toString().padStart(2, '0')}`

      const { error: insertError } = await supabase.from('dia_parado').insert([
        {
          motorista,
          data,
          inicio_parada,
          fim_parada,
          tempo_parado: tempoParadoStr,
          incluso,
          valor: parseFloat(valor.toFixed(2)),
        },
      ])

      if (insertError) throw insertError

      await supabase.from('dia_parado_pendentes').delete().eq('id', id)

      setPendentes((prev) => prev.filter((d) => d.id !== id))
      setMsgAprovacao('Registro aprovado com sucesso!')
    } catch (error) {
      console.error('Erro ao processar registro:', error)
      setMsgAprovacao('Erro ao processar registro.')
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Gerenciar Dia Parado</h1>

      <nav className="mb-6 flex gap-4">
        {['incluir', 'aprovar', 'registros'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${
              aba === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setAba(tab as typeof aba)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {aba === 'incluir' && (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block font-semibold mb-1">Motorista:</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={motorista}
              onChange={(e) => setMotorista(e.target.value)}
              required
            >
              <option value="">Selecione um motorista</option>
              {motoristas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Data:</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Início da Parada:</label>
            <input
              type="time"
              value={inicioParada}
              onChange={(e) => setInicioParada(e.target.value)}
              required
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Fim da Parada:</label>
            <input
              type="time"
              value={fimParada}
              onChange={(e) => setFimParada(e.target.value)}
              required
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          {mensagem && <p className="text-red-600">{mensagem}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}

      {aba === 'aprovar' && (
        <div>
          {msgAprovacao && <p className="mb-4 text-green-600">{msgAprovacao}</p>}
          {pendentes.length === 0 && <p>Não há registros para aprovar.</p>}
          {pendentes.map((pendente) => (
            <div
              key={pendente.id}
              className="border p-4 rounded mb-4 bg-gray-50 shadow"
            >
              <p><strong>Motorista:</strong> {pendente.motorista}</p>
              <p><strong>Data:</strong> {pendente.data}</p>
              <p><strong>Início Parada:</strong> {pendente.inicio_parada}</p>
              <p><strong>Fim Parada:</strong> {pendente.fim_parada}</p>
              <p><strong>Mensagem:</strong> {pendente.mensagem}</p>
              <div className="mt-2 flex gap-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => handleAprovar(pendente.id, true)}
                >
                  Aprovar
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => handleAprovar(pendente.id, false)}
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'registros' && (
        <div>
          {loadingRegistros && <p>Carregando registros...</p>}
          {!loadingRegistros && registros.length === 0 && <p>Nenhum registro encontrado.</p>}
          {!loadingRegistros && registros.length > 0 && (
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-2 py-1">Motorista</th>
                  <th className="border px-2 py-1">Data</th>
                  <th className="border px-2 py-1">Tempo Parado</th>
                  <th className="border px-2 py-1">Incluso</th>
                  <th className="border px-2 py-1">Valor</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td className="border px-2 py-1">{r.motorista}</td>
                    <td className="border px-2 py-1">{r.data}</td>
                    <td className="border px-2 py-1">{r.tempo_parado}</td>
                    <td className="border px-2 py-1">{r.incluso}</td>
                    <td className="border px-2 py-1">R$ {r.valor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
