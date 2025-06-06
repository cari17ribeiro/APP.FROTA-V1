'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase';
export default function ResumoAdminPage() {
  const [viagens, setViagens] = useState<any[]>([])
  const [motoristas, setMotoristas] = useState<string[]>([])
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const META_FIXA = 677.86
  const [premio, setPremio] = useState<number | null>(null)
  const [resumoMensagem, setResumoMensagem] = useState('')
  const [categoriaCombustivel, setCategoriaCombustivel] = useState<string | null>(null)
  const [mediaCombustivel, setMediaCombustivel] = useState<number | null>(null)
  const [numViagens, setNumViagens] = useState<number | null>(null)

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function fetchUserAndMotoristas() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('motoristas_cadastrados')
        .select('admin')
        .eq('id', user.id)
        .single()

      if (perfil) setIsAdmin(perfil.admin ?? false)

      const { data: motoristasData } = await supabase
        .from('motoristas_cadastrados')
        .select('motorista')
        .or('admin.is.false,admin.is.null')

      if (motoristasData) {
        motoristasData.sort((a, b) => a.motorista.localeCompare(b.motorista))
        setMotoristas(motoristasData.map((m) => m.motorista))
      }
    }

    fetchUserAndMotoristas()
  }, [])

  useEffect(() => {
    fetchViagens()
  }, [motoristaSelecionado, mesSelecionado, isAdmin])

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0]
  }

  async function fetchViagens() {
    setErro('')
    setLoading(true)

    if (!isAdmin && (!motoristaSelecionado || !mesSelecionado)) {
      resetDados()
      return
    }

    if (isAdmin && !mesSelecionado) {
      resetDados()
      return
    }

    let query = supabase.from('minhas_viagens').select('*')

    if (motoristaSelecionado) {
      query = query.eq('motorista', motoristaSelecionado)
    }

    if (mesSelecionado) {
      const [ano, mesStr] = mesSelecionado.split('-')
      const mes = Number(mesStr)
      const anoNum = Number(ano)

      let inicioAno = anoNum
      let inicioMes = mes - 1
      if (inicioMes === 0) {
        inicioMes = 12
        inicioAno -= 1
      }
      const dataInicio = new Date(inicioAno, inicioMes - 1, 21)
      const dataFim = new Date(anoNum, mes - 1, 20)

      query = query
        .gte('data', formatDate(dataInicio))
        .lte('data', formatDate(dataFim))
    }

    const { data, error } = await query

    if (error) {
      setErro('Erro ao buscar viagens')
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setErro('Nenhuma viagem encontrada para o filtro selecionado.')
      resetDados()
      return
    }

    setViagens(data)

    const totalViagens = data.reduce((sum, v) => sum + (v.valor || 0), 0)
    setNumViagens(data.length)

    const { data: diasParados } = await supabase
      .from('dia_parado')
      .select('valor')
      .eq('motorista', motoristaSelecionado)
      .eq('incluso', true)

    const totalParado = diasParados?.reduce((sum, d) => sum + (d.valor || 0), 0) || 0
    const producao = totalViagens + totalParado
    const percentualMeta = producao / META_FIXA

    let premioBase = 0
    if (percentualMeta >= 1) {
      premioBase = META_FIXA + (producao - META_FIXA) * 1.5
    } else if (percentualMeta >= 0.9) {
      premioBase = producao * 0.45
    } else if (percentualMeta >= 0.8) {
      premioBase = producao * 0.40
    } else if (percentualMeta >= 0.7) {
      premioBase = producao * 0.35
    }

    const { data: dieselData } = await supabase
      .from('diesel')
      .select('media')
      .eq('motorista', motoristaSelecionado)
      .single()

    if (dieselData?.media && percentualMeta >= 1) {
      const media = dieselData.media
      setMediaCombustivel(media)

      let categoria = ''
      let fator = 1
      if (media <= 3.0) {
        categoria = 'Ruim'
        fator = 0.9
      } else if (media <= 3.1) {
        categoria = 'Regular'
        fator = 1.0
      } else if (media <= 3.29) {
        categoria = 'Bom'
        fator = 1.2
      } else {
        categoria = 'Excelente'
        fator = 1.3
      }

      setCategoriaCombustivel(categoria)
      setPremio(premioBase * fator)
      setResumoMensagem('Meta atingida!')
    } else {
      setCategoriaCombustivel(null)
      setMediaCombustivel(null)
      setPremio(premioBase > 0 ? premioBase : null)

      if (percentualMeta >= 1) {
        setResumoMensagem('Meta atingida!')
      } else if (premioBase > 0) {
        setResumoMensagem(`Receberá ${((premioBase / producao) * 100).toFixed(0)}% da produção.`)
      } else {
        setResumoMensagem(`Faltam R$ ${(META_FIXA - producao).toFixed(2)} para atingir a meta.`)
      }
    }

    setLoading(false)
  }

  function resetDados() {
    setViagens([])
    setPremio(null)
    setResumoMensagem('')
    setCategoriaCombustivel(null)
    setMediaCombustivel(null)
    setNumViagens(null)
    setLoading(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Resumo de Viagens</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select
          className="p-3 border border-gray-300 rounded-lg"
          value={motoristaSelecionado}
          onChange={(e) => setMotoristaSelecionado(e.target.value)}
        >
          <option value="">{isAdmin ? 'Todos os motoristas' : 'Selecione um motorista'}</option>
          {motoristas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <input
          type="month"
          className="p-3 border border-gray-300 rounded-lg"
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
        />
      </div>

      {motoristaSelecionado && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-100 rounded-xl shadow p-6 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-green-800 mb-2">Premiação Estimada</h2>
            <p className="text-4xl font-bold text-green-900">
              {premio !== null ? `R$ ${premio.toFixed(2)}` : 'N/A'}
            </p>
          </div>

          <div className="bg-yellow-100 rounded-xl shadow p-6 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Média de Combustível</h2>
            <p className="text-3xl font-bold text-yellow-900">
              {mediaCombustivel !== null ? `${mediaCombustivel.toFixed(2)} L/km` : 'N/A'}
            </p>
            <p className="mt-1 text-yellow-700 font-medium italic">{categoriaCombustivel}</p>
          </div>

          <div className="bg-blue-100 rounded-xl shadow p-6 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">Número de Viagens</h2>
            <p className="text-4xl font-bold text-blue-900">{numViagens}</p>
          </div>
        </div>
      )}

      {resumoMensagem && (
        <p className="text-center text-lg font-medium text-gray-700 mb-6">{resumoMensagem}</p>
      )}

      {erro && <p className="text-red-600 text-center mb-4">{erro}</p>}

      {loading ? (
        <p className="text-center">Carregando...</p>
      ) : (
        <>
          {/* Tabela (desktop) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-sm border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-2 border">Motorista</th>
                  <th className="py-2 px-2 border">Data</th>
                  <th className="py-2 px-2 border">Valor</th>
                  <th className="py-2 px-2 border">Destino</th>
                </tr>
              </thead>
              <tbody>
                {viagens.map((viagem, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2 border">{viagem.motorista}</td>
                    <td className="py-2 px-2 border">{viagem.data}</td>
                    <td className="py-2 px-2 border">
                      R$ {viagem.valor ? viagem.valor.toFixed(2) : '0.00'}
                    </td>
                    <td className="py-2 px-2 border">{viagem.destino}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="block md:hidden space-y-4">
            {viagens.map((viagem, idx) => (
              <div
                key={idx}
                className="bg-white shadow rounded-lg p-4 border border-gray-200"
              >
                <p className="text-sm">
                  <span className="font-semibold">Motorista:</span> {viagem.motorista}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Data:</span> {viagem.data}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Valor:</span>{' '}
                  R$ {viagem.valor ? viagem.valor.toFixed(2) : '0.00'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Destino:</span> {viagem.destino}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
