import { supabase } from 'app/lib/supabase'

/**
 * Faz o upload de um arquivo PDF para o Supabase Storage.
 * Valida se o usuário está autenticado antes de permitir o upload.
 * @param file Arquivo PDF a ser enviado
 * @param path Caminho completo dentro do bucket (ex: 'diarios/2025-W23/nome.pdf')
 * @returns URL pública do PDF ou null em caso de erro
 */
export async function uploadPdfToStorage(file: File, path: string): Promise<string | null> {
  const bucket = 'diariodebordo';

  // Verifica se o usuário está autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Usuário não autenticado ou erro ao verificar autenticação:', userError?.message);
    return null;
  }

  // Tenta fazer o upload do arquivo PDF
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Erro ao fazer upload do PDF:', uploadError.message);
    return null;
  }

  // Gera e retorna a URL pública do arquivo
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  if (!urlData?.publicUrl) {
    console.error('Erro ao obter URL pública do PDF: URL não encontrada');
    return null;
  }

  return urlData.publicUrl;
}
