import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase';
import dayjs from 'dayjs';

type Viagem = {
  data: string;
  sentido: 'ida' | 'volta';
  origem: string;
  km_inicial: number;
  hora_inicial: string;
  destino: string;
  hora_final: string;
};

type GerarPdfParams = {
  motoristaNome: string;
  cavalo: string;
  carreta: string;
  horario: string;
  viagens: Viagem[];
  semana: string;
};

export default async function gerarPdfDiarioDeBordo({
  motoristaNome,
  cavalo,
  carreta,
  horario,
  viagens,
  semana,
}: GerarPdfParams): Promise<string | null> {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('DIÁRIO DE BORDO', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Motorista: ${motoristaNome}`, 14, 30);
  doc.text(`Cavalo: ${cavalo}`, 14, 36);
  doc.text(`Carreta: ${carreta}`, 14, 42);
  doc.text(`Horário: ${horario}`, 14, 48);
  doc.text(`Semana: ${semana}`, 14, 54);

  const rows = viagens.map((v) => [
    dayjs(v.data).format('DD/MM/YYYY'),
    v.sentido.toUpperCase(),
    v.origem,
    v.km_inicial.toString(),
    v.hora_inicial,
    v.destino,
    v.hora_final,
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Data', 'Sentido', 'Origem', 'KM Inicial', 'Hora Inicial', 'Destino', 'Hora Final']],
    body: rows,
  });

  const pdfBlob = doc.output('blob');

  const fileName = `diariodebordo-${semana}-${Date.now()}.pdf`;

  const { data, error } = await supabase.storage
    .from('pdfs')
    .upload(fileName, pdfBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });

  if (error) {
    console.error('Erro ao fazer upload do PDF:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);

  return urlData?.publicUrl || null;
}
