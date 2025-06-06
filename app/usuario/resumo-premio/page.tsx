'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs'

const META_FIXA = 677.86

export default function ResumoPremioPage() {
  const [premio, setPremio] = useState<number | null>(null)
  const [mediaCombustivel, setMediaCombustivel] = useState<number | null>(null)
  const [categoriaCombustivel, setCategoriaCombustivel] = useState<string | null>(null)
  const [numViagens, setNumViagens] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(true)
  const [competencia, setCompetencia] = useState<string>(() => dayjs().format('YYYY-MM'))

  useEffect(() => {
    async function calcularPremio() {
      setMensagem('')
      setLoading(true)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        setMensagem('Erro ao obter usuário.')
        setLoading(false)
        return
      }
      const email = userData.user.email

      const { data: motoristaData, error: motoristaError } = await supabase
        .from('motoristas_cadastrados')
        .select('motorista')
        .eq('email', email)
        .single()

      if (motoristaError || !motoristaData) {
        setMensagem('Motorista não encontrado.')
        setLoading(false)
        return
      }

      const nomeMotorista = motoristaData.motorista

      const [ano, mes] = competencia.split('-').map(Number)
      const inicio = dayjs(`${ano}-${mes}-21`).subtract(1, 'month').format('YYYY-MM-DD')
      const fim = dayjs(`${ano}-${mes}-20`).format('YYYY-MM-DD')

      const { data: viagens, error: viagensError } = await supabase
        .from('minhas_viagens')
        .select('valor, data')
        .eq('motorista', nomeMotorista)
        .gte('data', inicio)
        .lte('data', fim)

      if (viagensError) {
        setMensagem('Erro ao buscar viagens.')
        setLoading(false)
        return
      }

      const totalViagens = viagens.reduce((sum, v) => sum + (v.valor || 0), 0)
      setNumViagens(viagens.length)

      const { data: diasParados, error: diasError } = await supabase
        .from('dia_parado')
        .select('valor, data')
        .eq('motorista', nomeMotorista)
        .eq('incluso', true)
        .gte('data', inicio)
        .lte('data', fim)

      if (diasError) {
        setMensagem('Erro ao buscar dias parados.')
        setLoading(false)
        return
      }

      const totalParado = diasParados.reduce((sum, d) => sum + (d.valor || 0), 0)

      const producao = totalViagens + totalParado
      const percentualMeta = producao / META_FIXA

      let premioFinal = 0
      let mensagemParcial = ''

      if (percentualMeta >= 1) {
        // Meta cheia – calcular diesel e aplicar fator
        const sobra = producao - META_FIXA
        let premioBase = META_FIXA + sobra * 1.5

        // Buscar média de diesel
        const { data: dieselData, error: dieselError } = await supabase
          .from('diesel')
          .select('media')
          .eq('motorista', nomeMotorista)
          .eq('competencia', competencia)
          .single()

        if (dieselError || !dieselData) {
          setMensagem('Erro ao buscar média de combustível.')
          setLoading(false)
          return
        }

        const media = dieselData.media
        setMediaCombustivel(media)

        let fator = 1
        let categoria = ''

        if (media <= 3.0) {
          fator = 0.9
          categoria = 'Ruim'
        } else if (media > 3.0 && media <= 3.1) {
          fator = 1.0
          categoria = 'Regular'
        } else if (media > 3.1 && media <= 3.29) {
          fator = 1.2
          categoria = 'Bom'
        } else if (media > 3.29) {
          fator = 1.3
          categoria = 'Excelente'
        }

        setCategoriaCombustivel(categoria)

        premioFinal = premioBase * fator
        mensagemParcial = 'Meta atingida. Prêmio ajustado com base no consumo.'
      } else if (percentualMeta >= 0.9) {
        premioFinal = producao * 0.45
        mensagemParcial = 'Meta parcial: 90% atingido. Prêmio fixo de 45% da produção.'
      } else if (percentualMeta >= 0.8) {
        premioFinal = producao * 0.40
        mensagemParcial = 'Meta parcial: 80% atingido. Prêmio fixo de 40% da produção.'
      } else if (percentualMeta >= 0.7) {
        premioFinal = producao * 0.35
        mensagemParcial = 'Meta parcial: 70% atingido. Prêmio fixo de 35% da produção.'
      } else {
        setPremio(0)
        setMensagem(`Meta não atingida. Produção abaixo de 70% (R$ ${producao.toFixed(2)}).`)
        setLoading(false)
        return
      }

      setPremio(premioFinal)
      setMensagem(mensagemParcial)
      setLoading(false)
    }

    calcularPremio()
  }, [competencia])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Resumo da Premiação</h1>

      <div className="flex justify-center mb-6">
        <label className="mr-2 font-medium">Competência:</label>
        <input
          type="month"
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      {loading && <p className="text-center text-gray-600">Calculando...</p>}

      {mensagem && <p className="text-center text-red-600 font-semibold">{mensagem}</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-100 rounded-xl shadow p-6 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-green-800 mb-2">Premiação Estimada</h2>
            <p className="text-4xl font-bold text-green-900">
              R$ {premio?.toFixed(2)}
            </p>
          </div>

          <div className="bg-yellow-100 rounded-xl shadow p-6 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Média de Combustível</h2>
            {mediaCombustivel ? (
              <>
                <p className="text-3xl font-bold text-yellow-900">
                  {mediaCombustivel.toFixed(2)} L/km
                </p>
                <p className="mt-1 text-yellow-700 font-medium italic">{categoriaCombustivel}</p>
              </>
            ) : (
              <p className="text-yellow-600 italic">Não se aplica</p>
            )}
          </div>

          <div className="bg-blue-100 rounded-xl shadow p-6 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">Número de Viagens</h2>
            <p className="text-4xl font-bold text-blue-900">{numViagens}</p>
          </div>
        </div>
      )}
    </div>
  )
}
