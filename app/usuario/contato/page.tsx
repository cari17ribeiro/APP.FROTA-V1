'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ContatoUsuarioPage() {
  const [mensagem, setMensagem] = useState('');
  const [usuario, setUsuario] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUsuario(user.email);
    };

    fetchUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const { error } = await supabase.from('contatos_suporte').insert({
      tipo: 'outros',   // <---- tipo preenchido como "outros"
      usuario,
      mensagem,
    });

    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      setMensagem('');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-blue-600 text-center">Contato com o Admin</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow">
        <textarea
          placeholder="Mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          required
          rows={6}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
        >
          {status === 'loading' ? 'Enviando...' : 'Enviar'}
        </button>

        {status === 'success' && (
          <p className="text-green-600 text-sm mt-2">Mensagem enviada com sucesso!</p>
        )}
        {status === 'error' && (
          <p className="text-red-600 text-sm mt-2">Erro ao enviar. Tente novamente.</p>
        )}
      </form>
    </div>
  );
}
