'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

type ViagemImportada = {
  motorista: string;
  origem: string;
  destino: string;
  container: string;
  data: string;
  valor: string | number;
};

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMensagem('');
      setSucesso(false);
    }
  };

  const exportarModelo = () => {
    const modeloVazio = [{
      motorista: '',
      origem: '',
      destino: '',
      container: '',
      data: '',
      valor: '',
    }];

    const worksheet = XLSX.utils.json_to_sheet(modeloVazio);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');

    XLSX.writeFile(workbook, 'modelo_importacao_viagens.xlsx');
  };

  const handleImport = async () => {
    if (!file) {
      setMensagem('Selecione um arquivo primeiro.');
      setSucesso(false);
      return;
    }

    setCarregando(true);
    setMensagem('');
    setSucesso(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const json: ViagemImportada[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (!json || json.length === 0) {
        setMensagem('A planilha está vazia.');
        setCarregando(false);
        return;
      }

      const camposEsperados = ['motorista', 'origem', 'destino', 'container', 'data', 'valor'];
      const camposFaltando = camposEsperados.filter((campo) => !(campo in json[0]));

      if (camposFaltando.length > 0) {
        setMensagem(`Colunas faltando na planilha: ${camposFaltando.join(', ')}`);
        setCarregando(false);
        return;
      }

      const { data: motoristasCadastrados, error: erroMotoristas } = await supabase
        .from('motoristas_cadastrados')
        .select('motorista, email');

      if (erroMotoristas || !motoristasCadastrados) {
        setMensagem('Erro ao buscar motoristas cadastrados.');
        setCarregando(false);
        return;
      }

      const emailPorMotorista: Record<string, string> = {};
      for (const m of motoristasCadastrados) {
        emailPorMotorista[m.motorista] = m.email;
      }

      const dadosParaInserir = json
        .filter((linha) => emailPorMotorista[linha.motorista] && linha.valor != null && !isNaN(Number(linha.valor)))
        .map((linha) => ({
          motorista: linha.motorista,
          email: emailPorMotorista[linha.motorista],
          origem: linha.origem,
          destino: linha.destino,
          container: linha.container,
          data: linha.data,
          valor: parseFloat(linha.valor as string),
          status: 'confirmada',
        }));

      if (dadosParaInserir.length === 0) {
        setMensagem('Nenhum motorista da planilha corresponde aos cadastrados ou valores inválidos.');
        setCarregando(false);
        return;
      }

      const { error } = await supabase.from('minhas_viagens').insert(dadosParaInserir);

      if (error) {
        console.error('Erro Supabase:', error);
        setMensagem('Erro ao importar para o Supabase. Verifique os dados e o formato das datas.');
      } else {
        setMensagem('Importação concluída com sucesso!');
        setSucesso(true);
        setFile(null);
      }
    } catch (err) {
      console.error('Erro ao ler o arquivo:', err);
      setMensagem('Erro ao processar o arquivo. Verifique se é uma planilha válida.');
    }

    setCarregando(false);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Importar Viagens</h1>

      <div className="flex flex-col gap-4 mb-4">
        <button
          onClick={exportarModelo}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          Baixar Modelo
        </button>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="block"
        />

        <button
          onClick={handleImport}
          disabled={carregando}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {carregando ? 'Importando...' : 'Importar'}
        </button>
      </div>

      {mensagem && (
        <p className={`mt-4 ${sucesso ? 'text-green-600' : 'text-red-600'}`}>{mensagem}</p>
      )}
    </div>
  );
}
