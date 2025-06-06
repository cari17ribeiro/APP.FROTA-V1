'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const LoginPage: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Buscar os dados do usuário pela tabela personalizada
    const { data: usuarioData, error: fetchError } = await supabase
      .from('motoristas_cadastrados')
      .select('email, precisa_trocar_senha, admin')
      .eq('usuario', usuario)
      .single();

    if (fetchError || !usuarioData) {
      alert('Usuário não encontrado.');
      return;
    }

    const { email, precisa_trocar_senha, admin } = usuarioData;

    // Autenticar com o Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Erro ao fazer login: ' + error.message);
      return;
    }

    if (precisa_trocar_senha) {
      router.push('/alterar-senha');
      return;
    }

    // Armazena a flag de admin para usar na próxima tela
    localStorage.setItem('isAdmin', JSON.stringify(admin));

    // Redireciona para a tela de escolha de módulo
    router.push('/escolher-modulo');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-3xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-blue-700">
          APP FROTA
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            autoComplete="username"
            autoCorrect="off"
            autoCapitalize="none"
            className="w-full px-5 py-3 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 text-gray-900 placeholder-gray-600 text-lg font-medium"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-5 py-3 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 text-gray-900 placeholder-gray-600 text-lg font-medium"
          />
          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 transition font-semibold text-lg shadow-md"
          >
            Entrar
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-700">
            Não consegue acessar?{' '}
            <a
              href="/contato"
              className="text-blue-700 hover:underline font-semibold"
            >
              Contate o admin
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
