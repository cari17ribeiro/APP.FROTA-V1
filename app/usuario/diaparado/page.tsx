'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs'

export default function DiaParadoUsuario() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [motorista, setMotorista] = useState('')
  const [data, setData] = useState('')
  const [inicioParada, setInicioParada] = useState('')
  const [fimParada, setFimParada] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    async function fetchMotorista() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.error('Erro ao obter usuário:', error)
        return
      }

      setUserEmail(user.email ?? null) // ← Correção aqui

      const { data: motoristaData, error: motoristaError } = await supabase
        .from('motoristas_cadastrados')
        .select('motorista')
        .eq('email', user.email)
        .single()

      if (motoristaError) {
        console.error('Erro ao buscar motorista:', motoristaError)
        return
      }

      setMotorista(motoristaData.motorista)
    }

    fetchMotorista()
  }, [])

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
      const tempoParado = fim.diff(inicio, 'minute')

      if (tempoParado < 0) {
        setMensagem('Horário de fim da parada deve ser maior que início.')
        setLoading(false)
        return
      }

      const tempoParadoFormatado = `${Math.floor(tempoParado / 60)
        .toString()
        .padStart(2, '0')}:${(tempoParado % 60).toString().padStart(2, '0')}`

      const { error: insertError } = await supabase
        .from('dia_parado_pendentes')
        .insert([
          {
            motorista,
            data,
            inicio_parada: inicioParada,
            fim_parada: fimParada,
            tempo_parado: tempoParadoFormatado,
            status: 'pendente',
            enviado_por: userEmail,
          },
        ])

      if (insertError) throw insertError

      setMensagem('Solicitação enviada para aprovação.')
      setData('')
      setInicioParada('')
      setFimParada('')
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err)
      setMensagem('Erro ao enviar solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Solicitar Dia Parado</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Motorista</label>
          <input
            type="text"
            value={motorista}
            disabled
            className="border px-3 py-2 rounded w-full bg-gray-100 text-gray-700"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Início da Parada</label>
          <input
            type="time"
            value={inicioParada}
            onChange={(e) => setInicioParada(e.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Fim da Parada</label>
          <input
            type="time"
            value={fimParada}
            onChange={(e) => setFimParada(e.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Enviando...' : 'Enviar para Aprovação'}
        </button>
      </form>

      {mensagem && <p className="mt-4 text-center">{mensagem}</p>}
    </div>
  )
}
