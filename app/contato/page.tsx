'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // correto, pois está dentro de /app/contato/

export default function ContatoLoginPage() {
  const [usuario, setUsuario] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('contatos_suporte').insert([
      {
        tipo: 'correcao_login',
        usuario,
        mensagem,
      },
    ]);

    if (error) {
      alert('Erro ao enviar: ' + error.message);
    } else {
      setEnviado(true);
      setUsuario('');
      setMensagem('');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-blue-600 text-center">
          Problemas para Acessar?
        </h1>
        {enviado ? (
          <div className="text-center text-green-600 font-semibold">
            Sua solicitação foi enviada com sucesso. O administrador entrará em contato.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Usuário ou e-mail"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Descreva o problema que está enfrentando"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
            >
              Enviar para o Admin
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

