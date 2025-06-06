'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const AlterarSenhaPage = () => {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  const handleTrocarSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      alert('As senhas não coincidem.');
      return;
    }

    setCarregando(true);

    // Atualiza a senha no Supabase Auth
    const { data, error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      alert('Erro ao atualizar senha: ' + error.message);
      setCarregando(false);
      return;
    }

    const user = data?.user;
    if (!user) {
      alert('Usuário não autenticado.');
      setCarregando(false);
      return;
    }

    // Marca no Supabase que não precisa mais trocar senha
    const { error: updateError } = await supabase
      .from('motoristas_cadastrados')
      .update({ precisa_trocar_senha: false })
      .eq('email', user.email);

    if (updateError) {
      alert('Erro ao atualizar status da senha: ' + updateError.message);
      setCarregando(false);
      return;
    }

    alert('Senha alterada com sucesso!');
    router.push('/usuario');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-6 text-center text-blue-600">Defina uma nova senha</h2>

        <input
          type="password"
          placeholder="Nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="w-full px-4 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Confirme a nova senha"
          value={confirmacaoSenha}
          onChange={(e) => setConfirmacaoSenha(e.target.value)}
          className="w-full px-4 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleTrocarSenha}
          disabled={carregando}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          {carregando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </div>
    </div>
  );
};

export default AlterarSenhaPage;
