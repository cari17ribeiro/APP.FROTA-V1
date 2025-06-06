'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase';

export default function CombustivelAdminPage() {
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'importar' | 'visualizar'>('importar')
  const [dadosDiesel, setDadosDiesel] = useState<
    { motorista: string; media: number; categoria: string; competencia: string }[]
  >([])
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [filtroMotorista, setFiltroMotorista] = useState('')
  const [filtroCompetencia, setFiltroCompetencia] = useState('')
  const [competencia, setCompetencia] = useState('')

  // Novo estado para mostrar/ocultar o modelo da planilha
  const [mostrarModelo, setMostrarModelo] = useState(false)

  function categorizarMedia(media: number) {
    if (media <= 3.0) return 'Abaixo da Média -10%'
    if (media > 3.0 && media <= 3.10) return 'Média sem Ganho'
    if (media > 3.10 && media <= 3.29) return 'Média Limite 20%'
    if (media > 3.29) return 'Média Desejada 30%'
    return ''
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!competencia) {
      setMensagem('Por favor, selecione a competência antes de importar.')
      return
    }

    setMensagem('')
    setLoading(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(worksheet)

      if (json.length === 0) {
        setMensagem('Planilha vazia ou inválida.')
        setLoading(false)
        return
      }

      const { data: motoristasCadastrados, error: motoristasError } = await supabase
        .from('motoristas_cadastrados')
        .select('motorista')

      if (motoristasError) throw new Error('Erro ao buscar motoristas cadastrados.')

      const nomesValidos = new Set(motoristasCadastrados.map((m) => m.motorista))

      const dadosFiltrados = json
        .filter((linha: any) => linha.motorista && linha.media != null)
        .filter((linha: any) => nomesValidos.has(linha.motorista))
        .map((linha: any) => {
          const media = parseFloat(linha.media)
          return {
            motorista: linha.motorista,
            media,
            categoria: categorizarMedia(media),
            competencia, // inclui competência no registro
          }
        })

      if (dadosFiltrados.length === 0) {
        setMensagem('Nenhum dado válido encontrado na planilha.')
        setLoading(false)
        return
      }

      // NÃO APAGAR DADOS ANTIGOS MAIS
      // const { error: deleteError } = await supabase.from('diesel').delete().neq('motorista', '')
      // if (deleteError) throw new Error('Erro ao apagar dados antigos.')

      // INSERE DADOS NOVOS SEM APAGAR OS ANTIGOS
      const { error: insertError } = await supabase.from('diesel').insert(dadosFiltrados)
      if (insertError) throw new Error('Erro ao inserir novos dados.')

      setMensagem('Importação concluída com sucesso!')
    } catch (err: any) {
      console.error(err)
      setMensagem(err.message || 'Erro ao processar a planilha.')
    } finally {
      setLoading(false)
    }
  }

  async function carregarDadosDiesel() {
    setCarregandoDados(true)
    setMensagem('')
    try {
      const { data, error } = await supabase
        .from('diesel')
        .select('motorista, media, categoria, competencia')
        .order('motorista')
        .order('competencia', { ascending: false }) // mais recente primeiro

      if (error) throw error
      setDadosDiesel(data ?? [])
    } catch (error: any) {
      setMensagem('Erro ao carregar dados da tabela diesel: ' + error.message)
    } finally {
      setCarregandoDados(false)
    }
  }

  useEffect(() => {
    if (abaAtiva === 'visualizar') {
      carregarDadosDiesel()
    }
  }, [abaAtiva])

  // Filtrar dados exibidos conforme filtro motorista e competência
  const dadosFiltrados = dadosDiesel.filter(
    (item) =>
      item.motorista.toLowerCase().includes(filtroMotorista.toLowerCase()) &&
      (filtroCompetencia ? item.competencia === filtroCompetencia : true)
  )

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Média de Combustível</h1>

      <div className="mb-4 flex border-b border-gray-300">
        <button
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${
            abaAtiva === 'importar'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setAbaAtiva('importar')}
        >
          Importar
        </button>
        <button
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${
            abaAtiva === 'visualizar'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setAbaAtiva('visualizar')}
        >
          Visualizar Dados
        </button>
      </div>

      {abaAtiva === 'importar' && (
        <div className="space-y-4">
          <label>
            Competência (mês/ano):{' '}
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              disabled={loading}
              required
            />
          </label>

          {/* Botão discreto para mostrar/esconder modelo de planilha */}
          <button
            type="button"
            onClick={() => setMostrarModelo(!mostrarModelo)}
            className="text-sm text-blue-600 hover:underline mb-2"
          >
            {mostrarModelo ? 'Ocultar modelo de planilha' : 'Mostrar modelo de planilha'}
          </button>

          {mostrarModelo && (
            <div className="p-2 mb-2 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700">
              <p>
                A planilha deve conter as colunas <strong>motorista</strong> e <strong>media</strong>{' '}
                (valores numéricos). Exemplo:
              </p>
              <table className="w-full border-collapse border border-gray-300 mt-1">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-2 py-1 text-left">motorista</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">media</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">João Silva</td>
                    <td className="border border-gray-300 px-2 py-1">3.15</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">Maria Souza</td>
                    <td className="border border-gray-300 px-2 py-1">3.05</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-1 text-xs italic text-gray-600">
                Você pode adaptar o modelo conforme necessário, mas mantenha esses nomes de colunas.
              </p>
            </div>
          )}

          <input type="file" accept=".xlsx" onChange={handleFileUpload} disabled={loading} />

          {loading && <p className="mt-2 text-blue-600">Processando...</p>}
          {mensagem && <p className="mt-2">{mensagem}</p>}
        </div>
      )}

      {abaAtiva === 'visualizar' && (
        <div>
          {carregandoDados && <p>Carregando dados...</p>}
          {mensagem && <p className="mt-2 text-red-600">{mensagem}</p>}

          {!carregandoDados && dadosDiesel.length > 0 && (
            <>
              <input
                type="text"
                placeholder="Filtrar por motorista"
                value={filtroMotorista}
                onChange={(e) => setFiltroMotorista(e.target.value)}
                className="mb-2 w-full p-1 border border-gray-300 rounded"
              />
              <input
                type="month"
                placeholder="Filtrar por competência"
                value={filtroCompetencia}
                onChange={(e) => setFiltroCompetencia(e.target.value)}
                className="mb-2 w-full p-1 border border-gray-300 rounded"
              />

              {dadosFiltrados.length === 0 ? (
                <p>Nenhum dado encontrado para o filtro aplicado.</p>
              ) : (
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-2 py-1 text-left">Motorista</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Média</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Categoria</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Competência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-300 px-2 py-1">{item.motorista}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {item.media.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">{item.categoria}</td>
                        <td className="border border-gray-300 px-2 py-1">{item.competencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {!carregandoDados && dadosDiesel.length === 0 && <p>Nenhum dado encontrado.</p>}
        </div>
      )}
    </div>
  )
}


